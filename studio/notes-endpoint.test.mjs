// studio/notes-endpoint.test.mjs — the studio's write door on tools/serve.mjs (contract 5). Runs the real
// tools/serve.mjs, from a copy in a temporary folder that holds only what it needs (review/, studio/motion/
// and crew/notes.mjs), so nothing here touches the repo's own review folders:
//   node --test studio/notes-endpoint.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
let root, outside, server, notesLib, start;

// Every file under a folder, relative, with its contents' length and time: what changed is what was written.
function tree(dir) {
  const out = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(p);
      else { const s = fs.statSync(p); out.set(path.relative(dir, p).split(path.sep).join('/'), `${s.size}:${s.mtimeMs}`); }
    }
  };
  walk(dir);
  return out;
}
const changed = (a, b) => [...b.keys()].filter((k) => a.get(k) !== b.get(k)).concat([...a.keys()].filter((k) => !b.has(k))).sort();

async function post(route, body, { raw = false } = {}) {
  const r = await fetch(`${server.origin}/__studio/${route}`, { method: 'POST', body: raw ? body : JSON.stringify(body) });
  let json = null;
  try { json = await r.json(); } catch { /* not JSON: the test says so */ }
  return { code: r.status, json };
}
// A request by hand, for bodies fetch won't send as they are (a length header, or chunks with none).
function postRaw(route, chunks, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${server.origin}/__studio/${route}`, { method: 'POST', headers }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { data += d; });
      res.on('end', () => { let json = null; try { json = JSON.parse(data); } catch { /* reported below */ } resolve({ code: res.statusCode, json }); });
    });
    req.on('error', reject);
    for (const c of chunks) req.write(c);
    req.end();
  });
}
const read = (rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, ...rel.split('/')));

before(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-endpoint-'));
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-outside-'));
  for (const rel of ['tools/serve.mjs', 'studio/notes-endpoint.mjs', 'crew/notes.mjs', 'studio/motion/zombie/shambler.json']) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), path.join(root, rel));
  }
  // A folder the renderer made: meta.json, latest.txt at v2, the stub and one note already answered.
  const gd = path.join(root, 'review', 'guardian-drag');
  fs.mkdirSync(path.join(gd, 'v2'), { recursive: true });
  fs.writeFileSync(path.join(gd, 'meta.json'), JSON.stringify({ asset: 'guardian-drag', owner: 'claude', rig: 'guardian', clip: 'drag' }, null, 2));
  fs.writeFileSync(path.join(gd, 'latest.txt'), 'v2\n');
  notesLib = await import(pathToFileURL(path.join(root, 'crew', 'notes.mjs')).href);
  fs.writeFileSync(path.join(gd, 'notes.md'), notesLib.notesStub('guardian-drag', 'v1', '2026-09-27') + '\n## 2026-09-27 · Jerry · v1\nFloaty.\n\n> claude · v2 · 2026-09-27: digs in\n');
  const { serve } = await import(pathToFileURL(path.join(root, 'tools', 'serve.mjs')).href);
  server = await serve(root, 0);
  start = tree(root);
});
after(async () => {
  if (server) await server.close();
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test('ping says the routes, so a page knows it can save before it tries', async () => {
  const r = await post('ping', {});
  assert.equal(r.code, 200);
  assert.deepEqual(r.json.routes, ['note', 'scene', 'ping']);
  assert.equal(r.json.limits.snapshot, 3 * 1024 * 1024);
});

test('a note on a new asset makes its folder: meta.json, latest.txt, the stub, the note and the picture', async () => {
  const r = await post('note', {
    asset: 'motion-zombie-test', text: 'He gets up too fast.\n## not a heading\n> not an answer', context: 'zombie/test v3; last: Shotgun, close',
    snapshot: PNG1, meta: { kind: 'motion', owner: 'grokbot', rig: 'zombie', motion: 'zombie/test', version: 3 }
  });
  assert.equal(r.code, 200, JSON.stringify(r.json));
  assert.equal(r.json.ok, true);
  assert.equal(r.json.file, 'review/motion-zombie-test/notes.md');
  assert.equal(r.json.owner, 'grokbot');
  assert.equal(r.json.version, 'v3');
  assert.equal(r.json.created, true);
  assert.match(r.json.picture, /^review\/motion-zombie-test\/v3\/lab-\d{8}-\d{6}\.png$/);
  const meta = JSON.parse(read('review/motion-zombie-test/meta.json'));
  assert.equal(meta.asset, 'motion-zombie-test');
  assert.equal(meta.kind, 'motion');
  assert.equal(meta.motion, 'zombie/test');
  assert.equal(read('review/motion-zombie-test/latest.txt').trim(), 'v3');
  const png = fs.readFileSync(path.join(root, ...r.json.picture.split('/')));
  assert.deepEqual([...png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  const md = read('review/motion-zombie-test/notes.md');
  assert.match(md, /^# Notes on motion-zombie-test/);
  assert.match(md, /## \d{4}-\d{2}-\d{2} · Jerry · v3 · lab\nHe gets up too fast\.\nnot a heading\nnot an answer\n\(In the lab: zombie\/test v3; last: Shotgun, close\)\n!\[What the lab showed\]\(v3\/lab-\d{8}-\d{6}\.png\)\n/);
  // What crew.mjs and the panel make of it: one note, waiting, on v3.
  const notes = notesLib.parseNotes(md);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].version, 'v3');
  assert.equal(notesLib.reviewState(notes, 'v3').state, 'waiting');
});

test('the next note goes on top, into the folder as it is (no meta needed now)', async () => {
  const r = await post('note', { asset: 'motion-zombie-test', text: 'good', snapshot: PNG1 });
  assert.equal(r.code, 200, JSON.stringify(r.json));
  assert.equal(r.json.created, false);
  assert.equal(r.json.version, 'v3');
  const notes = notesLib.parseNotes(read('review/motion-zombie-test/notes.md'));
  assert.equal(notes.length, 2);
  assert.equal(notes[0].text.split(' ')[0], 'good');
  assert.equal(notes[0].approved, true);
  // Two pictures in the same second each keep their own file.
  assert.equal(fs.readdirSync(path.join(root, 'review', 'motion-zombie-test', 'v3')).filter((f) => f.endsWith('.png')).length, 2);
});

test("a folder the renderer made takes a note with no meta, at latest.txt's version, under the stub", async () => {
  const r = await post('note', { asset: 'guardian-drag', text: 'Still floaty at the end.' });
  assert.equal(r.code, 200, JSON.stringify(r.json));
  assert.equal(r.json.owner, 'claude');
  assert.equal(r.json.version, 'v2');
  assert.equal(r.json.picture, undefined);
  const md = read('review/guardian-drag/notes.md');
  assert.ok(md.indexOf('Still floaty') < md.indexOf('Floaty.'), 'newest at the top');
  assert.ok(md.indexOf('Still floaty') > md.indexOf('-->'), 'under the stub');
  const notes = notesLib.parseNotes(md);
  assert.deepEqual(notes.map((n) => [n.version, n.state]), [['v2', 'waiting'], ['v1', 'answered']]);
});

test('a note on a newer version than latest.txt moves it up; an older one never moves it back', async () => {
  let r = await post('note', { asset: 'guardian-drag', text: 'On v4 now.', snapshot: PNG1, meta: { kind: 'model', version: 4 } });
  assert.equal(r.code, 200, JSON.stringify(r.json));
  assert.equal(r.json.version, 'v4');
  assert.equal(read('review/guardian-drag/latest.txt').trim(), 'v4');
  assert.match(r.json.picture, /^review\/guardian-drag\/v4\//);
  // meta.json is the folder's own: a note's meta doesn't rewrite it.
  assert.equal(JSON.parse(read('review/guardian-drag/meta.json')).kind, undefined);
  r = await post('note', { asset: 'guardian-drag', text: 'Looking at an old one.', meta: { kind: 'model', version: 1 } });
  assert.equal(r.json.version, 'v4');
  assert.equal(read('review/guardian-drag/latest.txt').trim(), 'v4');
});

test("the lab's first form, { preset, text, context }, still works: asset motion-<rig>-<name>", async () => {
  const r = await post('note', { preset: 'zombie/shambler', text: 'The brute should rock back more.', context: 'zombie/shambler v1' });
  assert.equal(r.code, 200, JSON.stringify(r.json));
  assert.equal(r.json.asset, 'motion-zombie-shambler');
  assert.equal(r.json.file, 'review/motion-zombie-shambler/notes.md');
  const preset = JSON.parse(read('studio/motion/zombie/shambler.json'));
  assert.equal(r.json.owner, preset.owner || 'grokbot');
  assert.equal(r.json.version, 'v' + (preset.version || 1));
  const meta = JSON.parse(read('review/motion-zombie-shambler/meta.json'));
  assert.deepEqual([meta.kind, meta.motion, meta.file, meta.look], ['motion', 'zombie/shambler', 'studio/motion/zombie/shambler.json', 'studio/motion-lab.html?preset=zombie/shambler']);
  assert.match(read('review/motion-zombie-shambler/notes.md'), /· Jerry · v\d+ · lab\nThe brute should rock back more\.\n\(In the lab: zombie\/shambler v1\)\n/);
  const miss = await post('note', { preset: 'zombie/nobody', text: 'x' });
  assert.equal(miss.code, 404);
  assert.match(miss.json.error, /no preset zombie\/nobody/);
});

test('Save as scene writes studio/scenes/lab-<name>.json with its own name, and says how to render it', async () => {
  const json = { format: 'dw-scene/1', name: 'whatever', length: 3, actors: { a: { rig: 'zombie', at: [0, 0, 0], clips: [[0, 'zombie/idle']], motion: 'zombie/shambler', hits: [[0.5, { at: 'chest', dir: [0, 0, -1], power: 6.5, kind: 'pellet' }]] } } };
  let r = await post('scene', { name: 'shambler-close', json });
  assert.equal(r.code, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json, { ok: true, name: 'lab-shambler-close', file: 'studio/scenes/lab-shambler-close.json', replaced: false, render: 'node tools/studio.mjs scene studio/scenes/lab-shambler-close.json' });
  const saved = JSON.parse(read('studio/scenes/lab-shambler-close.json'));
  assert.equal(saved.name, 'lab-shambler-close');
  assert.deepEqual(saved.actors, json.actors);
  r = await post('scene', { name: 'shambler-close', json });
  assert.equal(r.json.replaced, true);
});

test('every refusal is a 4xx with a sentence, and writes nothing', async () => {
  // A folder the note can't use as it stands, and a link that leads out of review/.
  fs.mkdirSync(path.join(root, 'review', 'bad-latest'), { recursive: true });
  fs.writeFileSync(path.join(root, 'review', 'bad-latest', 'meta.json'), '{"asset":"bad-latest","owner":"claude"}');
  fs.writeFileSync(path.join(root, 'review', 'bad-latest', 'latest.txt'), '../../escaped\n');
  fs.writeFileSync(path.join(root, 'review', 'a-file'), 'not a folder');
  let linked = false;
  try { fs.symlinkSync(outside, path.join(root, 'review', 'escape'), 'junction'); linked = true; } catch { /* Windows without the right to make links */ }
  if (process.platform !== 'win32') assert.ok(linked, 'the link case must run here');
  const meta = { kind: 'motion' };
  const cases = [
    ['not JSON', 'note', '{"asset": "x"', 400, /not JSON/, true],
    ['an array', 'note', '[1, 2]', 400, /JSON object/, true],
    ['no route', 'nope', {}, 404, /no studio route/],
    ['a route that climbs', '..%2f..%2fnotes', {}, 404, /no studio route/],
    ['asset with a slash', 'note', { asset: 'a/b', text: 'x', meta }, 400, /"asset" is the review folder's name/],
    ['asset that climbs', 'note', { asset: '../x', text: 'x', meta }, 400, /"asset"/],
    ['asset with a backslash', 'note', { asset: '..\\x', text: 'x', meta }, 400, /"asset"/],
    ['asset with capitals', 'note', { asset: 'Motion-X', text: 'x', meta }, 400, /"asset"/],
    ['asset of one letter', 'note', { asset: 'a', text: 'x', meta }, 400, /"asset"/],
    ['asset too long', 'note', { asset: 'a'.repeat(65), text: 'x', meta }, 400, /"asset"/],
    ['asset with a dot', 'note', { asset: 'a.b', text: 'x', meta }, 400, /"asset"/],
    ['asset starting with a dash', 'note', { asset: '-ab', text: 'x', meta }, 400, /"asset"/],
    ['asset not a string', 'note', { asset: 12, text: 'x', meta }, 400, /"asset"/],
    ['a Windows device name', 'note', { asset: 'con', text: 'x', meta }, 400, /Windows/],
    ['another one', 'note', { asset: 'lpt1', text: 'x', meta }, 400, /Windows/],
    ['no text', 'note', { asset: 'fresh', meta }, 400, /"text" is the note/],
    ['blank text', 'note', { asset: 'fresh', text: '  \n ', meta }, 400, /empty/],
    ['text that is only marks', 'note', { asset: 'fresh', text: '## >', meta }, 400, /nothing left/],
    ['text too long', 'note', { asset: 'fresh', text: 'x'.repeat(8001), meta }, 413, /over 8000/],
    ['context not text', 'note', { asset: 'fresh', text: 'x', context: { a: 1 }, meta }, 400, /"context"/],
    ['context too long', 'note', { asset: 'fresh', text: 'x', context: 'x'.repeat(2001), meta }, 413, /"context" is over/],
    ['a new folder with no meta', 'note', { asset: 'fresh', text: 'x' }, 400, /is new, so the note needs "meta"/],
    ['meta of the wrong kind', 'note', { asset: 'fresh', text: 'x', meta: { kind: 'sound' } }, 400, /meta\.kind/],
    ['meta with a stranger as owner', 'note', { asset: 'fresh', text: 'x', meta: { kind: 'model', owner: 'bob' } }, 400, /meta\.owner/],
    ['meta with version 0', 'note', { asset: 'fresh', text: 'x', meta: { kind: 'model', version: 0 } }, 400, /meta\.version/],
    ['meta as a list', 'note', { asset: 'fresh', text: 'x', meta: ['motion'] }, 400, /needs "meta"/],
    ['a JPEG snapshot', 'note', { asset: 'fresh', text: 'x', meta, snapshot: 'data:image/jpeg;base64,AAAA' }, 400, /PNG as a data URL/],
    ['a snapshot that is not base64', 'note', { asset: 'fresh', text: 'x', meta, snapshot: 'data:image/png;base64,@@@@' }, 400, /not base64/],
    ['a snapshot that is not a PNG', 'note', { asset: 'fresh', text: 'x', meta, snapshot: 'data:image/png;base64,' + Buffer.from('GIF89a, honestly, not a png at all').toString('base64') }, 400, /not a PNG/],
    ['a snapshot over 3 MB', 'note', { asset: 'fresh', text: 'x', meta, snapshot: 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024) }, 413, /over 3 MB/],
    ['a folder that is a file', 'note', { asset: 'a-file', text: 'x', meta }, 409, /is a file/],
    ["a latest.txt that isn't a version", 'note', { asset: 'bad-latest', text: 'x', snapshot: PNG1 }, 409, /not a version like v2/],
    ['an old-form preset with a path in it', 'note', { preset: '../../etc/passwd', text: 'x' }, 400, /"preset" is "rig\/name"/],
    ['a scene with a bad name', 'scene', { name: '../x', json: { format: 'dw-scene/1', actors: { a: {} } } }, 400, /"name"/],
    ['a scene name with capitals', 'scene', { name: 'Lab', json: { format: 'dw-scene/1', actors: { a: {} } } }, 400, /"name"/],
    ['a scene name too long', 'scene', { name: 'x'.repeat(41), json: { format: 'dw-scene/1', actors: { a: {} } } }, 400, /"name"/],
    ['a scene with no json', 'scene', { name: 'ok' }, 400, /"json" is the scene/],
    ['a scene of the wrong format', 'scene', { name: 'ok', json: { format: 'dw-clip/1', actors: { a: {} } } }, 400, /json\.format/],
    ['a scene with nobody in it', 'scene', { name: 'ok', json: { format: 'dw-scene/1', actors: {} } }, 400, /json\.actors/]
  ];
  if (linked) cases.push(['a folder that is a link out of review/', 'note', { asset: 'escape', text: 'x', snapshot: PNG1 }, 403, /leads outside review/]);
  const was = tree(root);
  for (const [what, route, body, code, error, raw] of cases) {
    const r = await post(route, body, { raw });
    assert.equal(r.code, code, `${what}: ${JSON.stringify(r.json)}`);
    assert.equal(r.json && r.json.ok, false, what);
    assert.match(r.json.error, error, what);
  }
  assert.deepEqual(changed(was, tree(root)), [], 'a refusal wrote something');
  assert.deepEqual(fs.readdirSync(outside), [], 'something was written through the link');
  assert.ok(!exists('review/fresh'));
});

test('a body bigger than the cap is refused with a reply, said up front or not', async () => {
  const big = JSON.stringify({ asset: 'huge', text: 'x'.repeat(3 * 1024 * 1024 + 70 * 1024), meta: { kind: 'motion' } });
  let r = await postRaw('note', [big], { 'Content-Length': Buffer.byteLength(big) });
  assert.equal(r.code, 413);
  assert.match(r.json.error, /request is over/);
  // Chunked, with no length: it's drained, then refused.
  const chunk = 'x'.repeat(256 * 1024);
  r = await postRaw('scene', Array.from({ length: 5 }, () => chunk));
  assert.equal(r.code, 413);
  assert.ok(!exists('review/huge'));
});

test('a broken meta.json is the server\'s problem, said as one', async () => {
  fs.mkdirSync(path.join(root, 'review', 'broken-meta'), { recursive: true });
  fs.writeFileSync(path.join(root, 'review', 'broken-meta', 'meta.json'), '{ nope');
  const r = await post('note', { asset: 'broken-meta', text: 'x' });
  assert.equal(r.code, 500);
  assert.match(r.json.error, /meta\.json is not JSON/);
  assert.ok(!exists('review/broken-meta/notes.md'));
});

test('a GET under /__studio/ is not a write; the files are still served', async () => {
  const r = await fetch(`${server.origin}/__studio/note`);
  assert.equal(r.status, 404);
  await r.text();
  const s = await fetch(`${server.origin}/studio/notes-endpoint.mjs`);
  assert.equal(s.status, 200);
  await s.text();
});

test('everything written went into review/ or studio/scenes/lab-*.json', () => {
  const allowed = /^(review\/[a-z0-9][a-z0-9-]{1,63}\/(meta\.json|latest\.txt|notes\.md|v\d+\/lab-\d{8}-\d{6}(-\d+)?\.png)|studio\/scenes\/lab-[a-z0-9-]{1,40}\.json)$/;
  // The files the tests themselves put there to be refused are theirs, not the server's.
  const planted = /^review\/(bad-latest|a-file|broken-meta)\b/;
  const written = changed(start, tree(root)).filter((f) => !planted.test(f));
  assert.ok(written.length >= 8, written.join(', '));
  for (const f of written) assert.match(f, allowed);
});

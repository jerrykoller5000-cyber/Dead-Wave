// studio/render-sheet.test.mjs — the review folders studio/render-sheet.mjs writes (docs/drafts/modellab.md).
// No browser: the version rules and the folder's page, on folders made in a temporary directory.
//   node --import ./studio/node-three.mjs --test studio/render-sheet.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planVersion, writeReviewPage, resolveModel, parseArgs, versionsIn, notesOn } from './render-sheet.mjs';
import { models } from './models/index.js';
import { notesStub } from '../crew/notes.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dw-render-sheet-'));
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
// A review folder at `latest`, whose versions each hold the model file as `bytes[v]`.
function folder(dir, latest, versions) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [v, bytes] of Object.entries(versions)) {
    fs.mkdirSync(path.join(dir, v), { recursive: true });
    if (bytes !== null) {
      fs.writeFileSync(path.join(dir, v, 'model.json'), bytes);
      fs.writeFileSync(path.join(dir, v, 'sheet.png'), PNG);
    }
  }
  if (latest) fs.writeFileSync(path.join(dir, 'latest.txt'), latest + '\n');
  fs.writeFileSync(path.join(dir, 'notes.md'), notesStub('model-t', latest || 'v1', '2026-09-26'));
}

test('a version is the model file\'s "version": new, unchanged, bumped, or changed without a bump', () => {
  const json = { name: 't', version: 1 }, a = Buffer.from('{"a":1}'), b = Buffer.from('{"a":2}');
  const dir = path.join(tmp(), 'model-t');
  // No folder yet: the file's version.
  assert.deepEqual(planVersion(dir, a, json), { action: 'new', version: 'v1' });
  assert.deepEqual(planVersion(dir, a, { version: 3 }), { action: 'new', version: 'v3' });
  folder(dir, 'v1', { v1: a });
  // The same file: nothing, unless forced or redrawn.
  assert.equal(planVersion(dir, a, json).action, 'skip');
  assert.deepEqual(planVersion(dir, a, json, { force: true }), { action: 'new', version: 'v2' });
  assert.deepEqual(planVersion(dir, a, json, { redraw: true }), { action: 'redraw', version: 'v1' });
  // Changed and bumped: the new version. Changed and not bumped: refused, with the reason.
  assert.deepEqual(planVersion(dir, b, { version: 2 }), { action: 'new', version: 'v2' });
  const no = planVersion(dir, b, json);
  assert.equal(no.action, 'refuse');
  assert.match(no.why, /still says "version": 1\. Bump it to 2/);
  assert.deepEqual(planVersion(dir, b, json, { force: true }), { action: 'new', version: 'v2' });
  assert.equal(planVersion(dir, b, json, { redraw: true }).action, 'refuse', 'a changed file is a new version, not a redraw');
});

test('a sheet Jerry has written about stays as he saw it; one he hasn\'t can be drawn again', () => {
  const a = Buffer.from('{"a":1}'), dir = path.join(tmp(), 'model-t');
  folder(dir, 'v1', { v1: a });
  assert.equal(notesOn(dir, 'v1'), false, 'the stub\'s example note is inside its comment');
  fs.appendFileSync(path.join(dir, 'notes.md'), '\n## 2026-09-27 · Jerry · v1\nThe lamp is too small.\n');
  assert.equal(notesOn(dir, 'v1'), true);
  const r = planVersion(dir, a, { version: 1 }, { redraw: true });
  assert.equal(r.action, 'refuse');
  assert.match(r.why, /Jerry has a note on v1/);
  assert.equal(planVersion(dir, a, { version: 1 }, { redraw: true, force: true }).action, 'redraw');
});

test('a version a note made first (no sheet yet) is filled in, not skipped over', () => {
  const a = Buffer.from('{"a":1}'), b = Buffer.from('{"a":2}'), dir = path.join(tmp(), 'model-t');
  // The lab's note on version 2 moved latest.txt to v2 and left its picture in v2/.
  folder(dir, 'v2', { v1: a, v2: null });
  fs.writeFileSync(path.join(dir, 'v2', 'lab-20260926-120000.png'), PNG);
  assert.deepEqual(planVersion(dir, b, { version: 2 }), { action: 'fill', version: 'v2' });
  assert.deepEqual(planVersion(dir, b, { version: 3 }), { action: 'new', version: 'v3' });
  assert.deepEqual(versionsIn(dir), ['v1', 'v2']);
});

test('the folder\'s page shows the latest sheet beside the one before, what changed, and the notes', () => {
  const dir = path.join(tmp(), 'model-t');
  const one = { format: 'dw-model/1', name: 't', version: 1, materials: { a: { color: '#aa0000' } }, parts: [{ name: 'box', shape: 'box', size: [1, 1, 1], material: 'a' }] };
  const two = { ...one, version: 2, parts: [...one.parts, { name: 'lid', shape: 'box', size: [1, 0.1, 1], material: 'a' }] };
  folder(dir, 'v2', { v1: JSON.stringify(one), v2: JSON.stringify(two) });
  const stats = (v, draws) => JSON.stringify({ version: v, draws, triangles: 12 * draws, budget: { draws: 4, triangles: 100 }, over: false, bounds: { min: [0, 0, 0], max: [1, 1.1, 1], size: [1, 1.1, 1] } });
  fs.writeFileSync(path.join(dir, 'v1', 'stats.json'), stats('v1', 1));
  fs.writeFileSync(path.join(dir, 'v2', 'stats.json'), stats('v2', 2));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ asset: 'model-t', kind: 'model', ref: 'prop/t', owner: 'claude', file: 'studio/models/prop/t.json', look: 'studio/model-lab.html?model=prop/t' }));
  fs.appendFileSync(path.join(dir, 'notes.md'), '\n## 2026-09-27 · Jerry · v1 · lab\nIt needs a lid.\n![What the lab showed](v1/lab-20260927-101500.png)\n\n> claude · v2 · 2026-09-27: a lid, 0.1 m thick.\n');
  const page = fs.readFileSync(writeReviewPage(dir, 'model-t'), 'utf8');
  assert.match(page, /<h1>v2<\/h1>/);
  assert.match(page, /class="pair"/);
  const i2 = page.indexOf('src="v2/sheet.png"'), i1 = page.indexOf('src="v1/sheet.png"');
  assert.ok(i2 > 0 && i1 > i2, 'the latest first, the one before beside it');
  assert.match(page, /2 of 4 draws · 24 of 100 triangles/);
  assert.match(page, /What changed from v1 to v2/);
  assert.match(page, /parts added: lid/);
  assert.match(page, /It needs a lid\./);
  assert.match(page, /<img class="lab" src="v1\/lab-20260927-101500\.png"/);
  assert.match(page, /<blockquote>claude · v2 · 2026-09-27: a lid, 0\.1 m thick\.<\/blockquote>/);
  // The lab as Open Model Lab.bat serves it: the page itself opens from the disk, where a module page can't.
  assert.match(page, /href="http:\/\/127\.0\.0\.1:8973\/studio\/model-lab\.html\?model=prop\/t"/);
  assert.ok(!/<script/i.test(page), 'plain HTML: it opens from the disk');
});

test('a model is "kind/name" or a file inside the game folder', () => {
  const r = resolveModel('prop/fuel-drum');
  assert.equal(r.listed, true);
  assert.equal(r.file, 'studio/models/prop/fuel-drum.json');
  assert.deepEqual(JSON.parse(r.bytes.toString('utf8')), models.json('prop/fuel-drum'));
  assert.throws(() => resolveModel('prop/nothing'), /no model "prop\/nothing"/);
  const root = tmp(), f = path.join(root, 'drafts', 'thing.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ name: 'thing', kind: 'prop' }));
  const d = resolveModel(f, root);
  assert.deepEqual([d.ref, d.file, d.listed], ['prop/thing', 'drafts/thing.json', false]);
  const outside = path.join(tmp(), 'x.json');
  fs.writeFileSync(outside, '{}');
  assert.throws(() => resolveModel(outside, root), /must be inside the game folder/);
});

test('the command line: flags, values, and a value missing', () => {
  assert.deepEqual(parseArgs(['creature/spider', '--asset', 'spider-6', '--force']), { pos: ['creature/spider'], opt: { asset: 'spider-6', force: true } });
  assert.deepEqual(parseArgs(['--all', '--redraw']), { pos: [], opt: { all: true, redraw: true } });
  assert.throws(() => parseArgs(['x', '--out']), /--out needs a value/);
});

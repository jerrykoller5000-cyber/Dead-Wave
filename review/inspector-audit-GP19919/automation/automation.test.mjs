import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve } from '../../../tools/serve.mjs';
import { startInspectorServer, ensureInspectorServer, probeInspector, serverFiles } from '../../../tools/inspector-launch.mjs';
import { createCameraRequestHandler, report, Engine, cameraSessionFiles, shotReq } from '../../../tools/camera.mjs';
import { install as installCameraRig } from '../../../tools/camera-rig.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dead-wave-inspector-audit-'));
fs.mkdirSync(path.join(root, 'studio', 'motion', 'zombie'), { recursive: true });
fs.writeFileSync(path.join(root, 'studio', 'motion', 'zombie', 'shambler.json'), JSON.stringify({ owner: 'grokbot', version: 2, rig: 'zombie' }));
fs.writeFileSync(path.join(root, 'index.html'), '<title>fixture</title>');
fs.writeFileSync(path.join(root, 'video.mp4'), '0123456789');
fs.writeFileSync(path.join(root, 'empty.txt'), '');
const fixture = await serve(root, 0);
const jobs = [], cameraServer = http.createServer(createCameraRequestHandler({ run: async (j) => { jobs.push(j); return { ok: true, value: j.code }; } }));
await new Promise((resolve) => cameraServer.listen(0, '127.0.0.1', resolve));
const camUrl = 'http://127.0.0.1:' + cameraServer.address().port;
const post = (route, body, extra = {}, base = fixture.origin) => fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const note = { asset: 'inspect-marine', subject: 'marine', name: 'Marine', owner: 'claude', text: 'audit fixture note', image: 'data:image/png;base64,AA==' };

test('launcher proves the server belongs to this checkout', async () => {
  assert.equal((await probeInspector(fixture.port, root)).root, root);
  assert.equal(await probeInspector(fixture.port, path.join(root, 'another-checkout')), null);
  assert.equal(await probeInspector(0, root), null);
  assert.notEqual(serverFiles(root).state, serverFiles(path.join(root, 'other')).state);
});
test('launcher refuses an old server fingerprint without stopping it', async () => {
  const old = http.createServer((req, res) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, service: 'dead-wave-inspector', version: 1, root, pid: process.pid, fingerprint: 'previous-version' })));
  await new Promise((resolve) => old.listen(0, '127.0.0.1', resolve));
  try { assert.equal(await probeInspector(old.address().port, root), null); assert.equal((await fetch('http://127.0.0.1:' + old.address().port)).status, 200); }
  finally { await new Promise((resolve) => old.close(resolve)); }
});
test('static server preserves full response, cache and MIME contracts', async () => {
  const r = await fetch(fixture.origin + '/video.mp4'); assert.equal(r.status, 200); assert.equal(await r.text(), '0123456789');
  assert.equal(r.headers.get('content-length'), '10'); assert.equal(r.headers.get('content-type'), 'video/mp4'); assert.equal(r.headers.get('cache-control'), 'no-store'); assert.equal(r.headers.get('accept-ranges'), 'bytes');
});
for (const [range, body, contentRange] of [['bytes=2-5', '2345', 'bytes 2-5/10'], ['bytes=7-', '789', 'bytes 7-9/10'], ['bytes=-3', '789', 'bytes 7-9/10'], ['bytes=0-999', '0123456789', 'bytes 0-9/10'], ['bytes=-999', '0123456789', 'bytes 0-9/10']]) test('static byte range ' + range, async () => {
  const r = await fetch(fixture.origin + '/video.mp4', { headers: { range } }); assert.equal(r.status, 206); assert.equal(await r.text(), body); assert.equal(r.headers.get('content-range'), contentRange); assert.equal(Number(r.headers.get('content-length')), body.length);
});
for (const range of ['bytes=10-', 'bytes=5-2', 'bytes=-0', 'bytes=-', 'bytes=0-2,4-5', 'bytes=9999999999999999999999-', 'wrong=0-1']) test('static invalid byte range ' + range + ' returns 416', async () => {
  const r = await fetch(fixture.origin + '/video.mp4', { headers: { range } }); assert.equal(r.status, 416); assert.equal(r.headers.get('content-range'), 'bytes */10'); assert.equal(await r.text(), '');
});
test('HEAD and empty files have correct lengths without reading a body', async () => {
  const head = await fetch(fixture.origin + '/video.mp4', { method: 'HEAD', headers: { range: 'bytes=1-2' } }); assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), '10'); assert.equal(await head.text(), '');
  const empty = await fetch(fixture.origin + '/empty.txt'); assert.equal(empty.status, 200); assert.equal(empty.headers.get('content-length'), '0'); assert.equal(await empty.text(), '');
  assert.equal((await fetch(fixture.origin + '/empty.txt', { headers: { range: 'bytes=0-' } })).status, 416);
});
test('range requests preserve root containment and missing-file responses', async () => {
  assert.equal((await fetch(fixture.origin + '/missing.mp4', { headers: { range: 'bytes=0-5' } })).status, 404);
  assert.equal((await fetch(fixture.origin + '/%2e%2e%5cescape', { headers: { range: 'bytes=0-5' } })).status, 403);
});
test('a slow foreign listener cannot hold the readiness probe indefinitely', async () => {
  const drip = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' }); res.write('{');
    const timer = setInterval(() => res.write(' '), 15); res.on('close', () => clearInterval(timer));
  });
  await new Promise((resolve) => drip.listen(0, '127.0.0.1', resolve));
  try { const start = Date.now(); assert.equal(await probeInspector(drip.address().port, root, 80), null); assert.equal(Date.now() - start < 1000, true); }
  finally { drip.closeAllConnections(); await new Promise((resolve) => drip.close(resolve)); }
});
test('occupied foreign port remains alive and inspector chooses a free port', async () => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'dead-wave-inspector-other-'));
  const foreign = await serve(other, 0);
  let owned;
  try {
    owned = await startInspectorServer(root, foreign.port);
    assert.notEqual(owned.port, foreign.port);
    assert.equal((await probeInspector(foreign.port, other)).root, other);
    assert.equal((await probeInspector(owned.port, root)).root, root);
    const reused = await ensureInspectorServer({ root, port: foreign.port });
    assert.equal(reused.reused, true);
    assert.equal(reused.port, owned.port);
  } finally { if (owned) await owned.close(); await foreign.close(); }
});
test('launcher starts a hidden owned server, waits for readiness and reuses it', async () => {
  const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'dead-wave-inspector-child-'));
  fs.writeFileSync(path.join(fresh, 'index.html'), 'child fixture');
  let child;
  try {
    // The preferred port is occupied by another checkout: launching must preserve that listener.
    child = await ensureInspectorServer({ root: fresh, port: fixture.port });
    assert.equal(child.reused, false); assert.notEqual(child.port, fixture.port);
    assert.equal(child.root, fresh); assert.equal(Number.isInteger(child.pid) && child.pid !== process.pid, true);
    assert.equal(await (await fetch(child.origin + '/index.html')).text(), 'child fixture');
    const again = await ensureInspectorServer({ root: fresh, port: fixture.port });
    assert.equal(again.reused, true); assert.equal(again.pid, child.pid);
    assert.equal((await probeInspector(fixture.port, root)).root, root);
  } finally {
    // Terminate only the verified child this test created, never the occupied foreign listener.
    if (child && !child.reused && child.root === fresh && Number.isInteger(child.pid) && child.pid !== process.pid) process.kill(child.pid);
  }
});
for (const route of ['/__inspect/note', '/__studio/note']) {
  for (const bad of ['null', '[]', 'false', '{']) test(route + ' rejects malformed/non-object JSON without crashing', async () => {
    const r = await post(route, bad); assert.equal(r.status, 400); assert.equal((await r.json()).ok, false);
    assert.equal((await fetch(fixture.origin + '/__inspect/health')).status, 200);
  });
  test(route + ' blocks cross-origin and non-JSON requests', async () => {
    assert.equal((await post(route, {}, { origin: 'https://example.invalid' })).status, 403);
    assert.equal((await post(route, {}, { 'content-type': 'text/plain' })).status, 403);
    assert.equal((await post(route, {}, { 'content-type': 'application/jsonp' })).status, 403);
    assert.equal((await post(route, {}, { host: 'evil.invalid', origin: 'http://evil.invalid' })).status, 403);
  });
}
test('motion-lab UTF-8 byte limit returns 413', async () => {
  const r = await post('/__studio/note', { preset: 'zombie/shambler', text: '🟦'.repeat(5000) });
  assert.equal(r.status, 413); assert.equal((await r.json()).ok, false);
});
test('legacy motion-lab note contract and unicode survive', async () => {
  const r = await post('/__studio/note', { preset: 'zombie/shambler', text: 'hips · hands → smooth', context: 'walk × 0.25' });
  assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.owner, 'grokbot'); assert.equal(j.version, 'v2');
  assert.match(fs.readFileSync(path.join(root, j.file), 'utf8'), /hips · hands → smooth/);
});
test('same-second inspector notes keep distinct pictures and both entries', async () => {
  const a = await (await post('/__inspect/note', { ...note, text: 'first picture' })).json();
  const b = await (await post('/__inspect/note', { ...note, text: 'second picture' })).json();
  assert.equal(a.ok, true); assert.equal(b.ok, true); assert.notEqual(a.picture, b.picture);
  assert.equal(fs.existsSync(path.join(root, a.picture)), true); assert.equal(fs.existsSync(path.join(root, b.picture)), true);
  const contents = fs.readFileSync(path.join(root, a.file), 'utf8'); assert.match(contents, /first picture/); assert.match(contents, /second picture/);
});
test('inspector path traversal cannot write a review note', async () => {
  assert.equal((await post('/__inspect/note', { ...note, asset: 'inspect-../../escape' })).status, 400);
});
test('filesystem failures are returned without terminating the static server', async () => {
  const fileRoot = path.join(root, 'a-file'); fs.writeFileSync(fileRoot, 'fixture');
  const broken = await serve(fileRoot, 0);
  try { assert.equal((await post('/__inspect/note', note, {}, broken.origin)).status, 500); assert.equal((await fetch(broken.origin + '/__inspect/health')).status, 200); }
  finally { await broken.close(); }
});
test('camera blocks cross-origin/non-JSON jobs before eval', async () => {
  assert.equal((await post('/', { cmd: 'eval', code: 'ignored' }, { origin: 'https://example.invalid' }, camUrl)).status, 403);
  assert.equal((await post('/', { cmd: 'eval', code: 'ignored' }, { 'content-type': 'text/plain' }, camUrl)).status, 403);
  assert.equal(jobs.length, 0);
});
test('camera rejects oversized jobs and accepts CLI JSON with unicode', async () => {
  assert.equal((await post('/', { cmd: 'eval', code: 'x'.repeat(1024 * 1024) }, {}, camUrl)).status, 413);
  const r = await post('/', { cmd: 'eval', code: 'hips · hands → smooth' }, {}, camUrl);
  assert.equal((await r.json()).value, 'hips · hands → smooth'); assert.equal(jobs.length, 1);
});
test('camera non-object jobs return errors without executing', async () => {
  const r = await post('/', 'null', {}, camUrl); assert.equal((await r.json()).ok, false); assert.equal(jobs.length, 1);
});
test('failed check and batch reports give a nonzero CLI exit code', () => {
  const prior = process.exitCode;
  try { process.exitCode = 0; report({ ok: false, check: { subjects: 1, broken: ['fixture'] } }); assert.equal(process.exitCode, 1); }
  finally { process.exitCode = prior; }
});
test('camera includes contact-sheet failures in the batch failure result', async () => {
  const engine = new Engine();
  engine.expand = async () => [{ target: 'fixture' }];
  engine.shoot = async () => ({ file: 'fixture.png', thumb: 'fixture' });
  engine.sheet = async () => { throw new Error('fixture sheet failed'); };
  const r = await engine._run({ cmd: 'batch', sheet: true });
  assert.equal(r.ok, false); assert.equal(r.sheet.error, 'fixture sheet failed');
});
test('camera rejects turnarounds and sheet dimensions that could hang or exhaust memory', async () => {
  const engine = new Engine();
  await assert.rejects(engine._run({ cmd: 'turnaround', n: Infinity }), /integer from 2 to 72/);
  await assert.rejects(engine.sheet([], { cols: -1 }, []), /cols/);
  await assert.rejects(engine.sheet([], { tile: 0 }, []), /tile/);
});
test('camera never reports an empty model check as success', async () => {
  const engine = new Engine(); engine.mode = 'inspect'; engine.page = { evaluate: async () => ({ results: [] }) };
  await assert.rejects(engine._run({ cmd: 'check', only: 'typo' }), /no subjects matched/);
});
test('separate checkouts never overwrite the camera session/log files', () => {
  assert.notEqual(cameraSessionFiles(root).session, cameraSessionFiles(root + '-other').session);
  assert.notEqual(cameraSessionFiles(root).log, cameraSessionFiles(root + '-other').log);
  assert.deepEqual(cameraSessionFiles(root), cameraSessionFiles(root));
});
test('framing the same live inspector subject preserves its move unless reset is requested', async () => {
  const before = globalThis.window; let shown = 0;
  const current = { id: 'marine', name: 'Marine', center: { x: 0, y: 1, z: 0 }, size: { x: 1, y: 2, z: 1 }, yaw: 0, variant: null };
  class Vector3 { constructor() {} } class Box3 { constructor() {} }
  globalThis.window = { TT: { THREE: { Vector3, Box3 }, sampleHeight: () => 0 }, DWInspect: { ready: true, has: (id) => id === 'marine', list: () => [{ id: 'marine', kind: 'marine' }], current: () => current, show: async () => { shown++; return current; } } };
  try {
    const rig = installCameraRig(); await rig.target('marine'); assert.equal(shown, 0);
    await rig.target('marine', { reset: true }); assert.equal(shown, 1);
  } finally { globalThis.window = before; }
});
test('legacy weapon suppressor targets retain their attachment in inspector mode', async () => {
  const before = globalThis.window, controls = [];
  const current = { id: 'weapon.m4', name: 'M4', center: { x: 0, y: 1, z: 0 }, size: { x: 1, y: 2, z: 1 } };
  class Vector3 {} class Box3 {}
  globalThis.window = { TT: { THREE: { Vector3, Box3 }, sampleHeight: () => 0 }, DWInspect: {
    ready: true, has: (id) => id === 'weapon.m4', list: () => [{ id: 'weapon.m4', kind: 'model' }],
    current: () => current, show: async () => current, model: { set: (id, value) => controls.push([id, value]) }
  } };
  try { await installCameraRig().target('weapon:m4:can'); assert.deepEqual(controls, [['suppressor', true]]); }
  finally { globalThis.window = before; }
});
test('--from retains the inspector recipe and camera without reselecting the target', () => {
  const file = path.join(root, 'frame.json'), inspect = { schema: 'dw-inspector-session', schemaVersion: 1, subject: { id: 'marine' } };
  const cam = { x: 1, y: 2, z: 3, tx: 0, ty: 1, tz: 0, fov: 35 };
  fs.writeFileSync(file, JSON.stringify({ target: 'marine', inspect, cam, size: [1280, 720] }));
  const request = shotReq(null, { from: file }); assert.deepEqual(request.inspect, inspect); assert.deepEqual(request.cam, cam); assert.equal(request.target, undefined);
  assert.equal(shotReq('weapon.m4', { from: file }).target, 'weapon.m4');
});
test('inspector PNG, thumbnail and versioned recipe share one held frame', async () => {
  const engine = new Engine(), calls = [], inspect = { schema: 'dw-inspector-session', schemaVersion: 1, subject: { id: 'marine' } };
  const camera = { x: 1, y: 2, z: 3, tx: 0, ty: 1, tz: 0, fov: 35 };
  const file = path.join(root, 'captured.png'); engine.mode = 'inspect'; engine.cur = engine.size;
  engine.page = {
    evaluate: async (code) => { if (code.includes('canvasWidth')) return { width: engine.size[0], height: engine.size[1], canvasWidth: engine.size[0], canvasHeight: engine.size[1] }; calls.push(code); if (code.startsWith('CamRig.aim')) return { target: 'Marine', cam: camera }; if (code.includes('DWInspect.session()')) return inspect; return true; },
    screenshot: async (out) => { calls.push('png'); fs.writeFileSync(out, Buffer.from('fixture')); },
    send: async () => { calls.push('thumb'); return { data: 'fixture' }; }
  };
  await engine.shoot({ inspect, cam: camera, thumb: true, out: file });
  assert.equal(calls.filter((code) => code === 'DWInspect.still(true)').length, 1);
  assert.equal(calls.filter((code) => code === 'DWInspect.still(false)').length, 1);
  assert.equal(calls[0].startsWith('DWInspect.restore'), true);
  assert.equal(calls.indexOf('thumb') < calls.indexOf('DWInspect.still(false)'), true);
  const meta = JSON.parse(fs.readFileSync(file.replace('.png', '.json'), 'utf8'));
  assert.equal(meta.schemaVersion, 2); assert.equal(meta.schema, 'dw-camera-shot'); assert.deepEqual(meta.inspect, inspect); assert.deepEqual(meta.cam, camera);
});
test.after(async () => { await fixture.close(); await new Promise((resolve) => cameraServer.close(resolve)); });

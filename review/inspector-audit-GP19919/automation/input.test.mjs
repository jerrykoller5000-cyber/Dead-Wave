import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, shotReq, createCameraRequestHandler } from '../../../tools/camera.mjs';
import http from 'node:http';
const camera = { x: 100000000, y: 2, z: 3, tx: 99999999, ty: 1, tz: 0, fov: 35 };

test('constructor accepts supported array/string viewports and the exact pixel budget', () => {
  assert.deepEqual(new Engine({ size: [1280, 720] }).size, [1280, 720]);
  assert.deepEqual(new Engine({ size: '8192x3906' }).size, [8192, 3906]);
  assert.deepEqual(new Engine({ size: '64x64' }).size, [64, 64]);
});
for (const size of ['0x0', '90000x90000', '8192x8192', [0, 900], [900, 0], [1600.5, 900], [null, 900], [Infinity, 900], [NaN, 900], [900], [900, 900, 900], true]) test('constructor rejects invalid viewport ' + JSON.stringify(size), () => {
  assert.throws(() => new Engine({ size }), /size|viewport|finite/);
});
test('CLI rejects nonfinite framing before JSON can convert it to null', () => {
  for (const [key, value] of [['yaw', 'NaN'], ['pitch', 'Infinity'], ['dist', Infinity], ['height', NaN], ['lookY', 'nope'], ['fov', 'NaN'], ['zoom', 'Infinity'], ['time', 'Infinity']])
    assert.throws(() => shotReq('marine', { [key]: value }), /finite|time/);
});
test('CLI rejects invalid viewport, camera coordinates, FOV and pitch', () => {
  for (const opt of [{ size: '0x0' }, { size: [8192, 8192] }, { cam: '1,2' }, { cam: 'NaN,2,3' }, { cam: '1,2,3', look: '0,0' }, { cam: '1,2,3', fov: '0' }, { pitch: '90' }, { cam: NaN }, { pan: '1' }])
    assert.throws(() => shotReq('marine', opt), /viewport|numbers|finite|fov|pitch/);
});
test('valid negative angles and large world coordinates survive CLI normalization', () => {
  const req = shotReq('marine', { yaw: '-450', pitch: '-89', cam: '100000000,2,3', look: '99999999,1,0', fov: '35', pan: '-1.5,2', height: '-3' });
  assert.equal(req.yaw, -450); assert.equal(req.pitch, -89); assert.deepEqual(req.cam, camera); assert.deepEqual(req.move.pan, [-1.5, 2]);
});
for (const fields of [{ size: [0, 900] }, { size: [8192, 8192] }, { pitch: 90 }, { yaw: null }, { dist: 0 }, { fov: Infinity }, { cam: { ...camera, tx: NaN } }, { cam: { ...camera, fov: null } }, { move: { zoom: 0 } }, { move: { fov: 'NaN' } }, { move: { fov: 0 } }, { move: { pan: [1, null] } }]) test('HTTP/Engine shot rejects invalid framing before viewport allocation ' + JSON.stringify(fields), async () => {
  const engine = new Engine(); let allocated = 0, evaluated = 0;
  engine.page = { setViewport: async () => { allocated++; }, evaluate: async () => { evaluated++; } };
  await assert.rejects(engine.shoot({ target: 'marine', ...fields }), /viewport|finite|pitch|dist|fov|zoom/);
  assert.equal(allocated, 0); assert.equal(evaluated, 0);
});
test('HTTP daemon invalid viewport fails without touching browser allocation', async () => {
  const engine = new Engine(); let allocated = 0; engine.page = { setViewport: async () => { allocated++; } };
  const server = http.createServer(createCameraRequestHandler(engine));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cmd: 'shot', target: 'marine', size: [100000, 100000] }) });
    const result = await response.json(); assert.equal(result.ok, false); assert.match(result.error, /viewport/); assert.equal(allocated, 0);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
test('check passes explicit zero dimensions through to strict API validation', async () => {
  const engine = new Engine(); engine.mode = 'inspect'; let source;
  engine.page = { evaluate: async (code) => { source = code; throw Error('API rejected zero'); } };
  await assert.rejects(engine._run({ cmd: 'check', cols: 0, tile: 0 }), /API rejected zero/);
  assert.match(source, /"cols":0/); assert.match(source, /"tile":0/);
});

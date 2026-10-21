// world/training-build-wear.test.mjs - GB-162: the build room's wear is there, under the build grid, out of the way.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { TRAINING, buildTrainingGround } from './training.js';
import { BUILD_WEAR, dressBuildWear } from './training-build-wear.js';

test('every kind Jerry asked for is built, and the place still builds the same', () => {
  const tg = buildTrainingGround(T);
  const p = new Set(tg.buildWear.parts);
  for (const k of ['build-floor', 'build-wall-west', 'build-wall-east', 'build-wall-south', 'build-wall-north-w', 'build-wall-north-e', 'build-web']) assert.ok(p.has(k), k);
  assert.ok(tg.buildWear.parts.filter((x) => x === 'build-web').length >= 4, 'a few webs');
  assert.equal(tg.buildWear.mounts.length, 4, 'marks follow the four wall miniguns');
  assert.equal(tg.walk.length, 3);
  assert.ok(tg.build.gateCells.length > 0);
});

test('under the build grid, inside the room, nothing hanging over the range', () => {
  assert.ok(BUILD_WEAR.FLOOR_Y < 0.006, 'the floor sheet sits under the grid paint and hazard stripes');
  const B = TRAINING.BUILD;
  for (const [x, z, s] of BUILD_WEAR.KILL) assert.ok(x - s > B.minX - 3 && x + s < B.maxX + 3 && z > B.minZ && z < B.maxZ, 'kill zone in the room');
  assert.ok(BUILD_WEAR.WALL_H < 6);
});

test('every canvas draws (a stand-in 2D context), with plenty of minigun holes', () => {
  const grad = { addColorStop() {} };
  const mk = () => new Proxy({}, { get: (o, k) => (k in o ? o[k] : /^create(Radial|Linear)Gradient$/.test(k) ? () => grad : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
  const ctxs = [];
  const texture = (w, h, draw) => { assert.ok(w > 0 && h > 0 && w <= 2048 && h <= 2048, w + 'x' + h); const c = mk(); draw(c, w, h); ctxs.push(c); return {}; };
  const obj = () => ({ position: { set() {} }, rotation: { set() {}, x: 0, y: 0, z: 0 } });
  const geo = class { constructor() { this.attributes = {}; } };
  const B = TRAINING.BUILD;
  const w = dressBuildWear({ PlaneGeometry: geo, DoubleSide: 2 }, { B, D: TRAINING.DOOR, gate: { x: (B.minX + B.maxX) / 2, z: B.maxZ - 1.4 }, add: obj, std: () => ({}), texture });
  assert.equal(ctxs.length, 7, 'floor, five wall sheets, webs');
  assert.ok(ctxs[0].__holes > 150 && ctxs[0].__holes < 600, 'the floor riddled (' + ctxs[0].__holes + ' holes)');
  assert.equal(w.decals.length, w.parts.length);
});

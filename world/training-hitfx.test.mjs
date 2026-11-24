// world/training-hitfx.test.mjs - CG-7 step 4 (Jerry D-237 #11): bits off what a round hits, by material; pooled, capped,
// nothing drawn or run at rest, nothing under the floor, everything gone on clear().
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { HITFX, createTrainingHitFx, kindOfSolid, kindOfHit } from './training-hitfx.js';
import { buildTrainingGround } from './training.js';
import { FIRING_LINE } from './training-firing-line.js';

const O = { x: 0, y: -200, z: -640 };
const mk = () => { const parent = new T.Group(); return { parent, fx: createTrainingHitFx(T, { parent, origin: O }) }; };

test('every material makes its bits; at rest nothing is drawn and nothing runs', () => {
  const { parent, fx } = mk();
  assert.equal(parent.children.length, 3, 'three pooled meshes');
  assert.equal(fx.prime(true), 3, 'primed: each mesh drawn once at the warm-up'); for (const m of fx.meshes) assert.equal(m.visible, true);
  fx.prime(false);
  assert.equal(fx.update(1 / 60), 0); for (const m of fx.meshes) assert.equal(m.visible, false);
  for (const k of Object.keys(HITFX.kinds)) {
    const n = fx.spawn(k, { x: -7, y: -198.6, z: -640 }, { x: 1, y: 0, z: 0 }, { x: -1, y: -0.1, z: 0.2 });
    assert.ok(n >= 5, k + ': ' + n);
  }
  assert.ok(fx.update(1 / 60) > 30);
  assert.equal(fx.meshes[1].visible, true, 'sparks drawn');
  for (let i = 0; i < 60 * 3; i++) fx.update(1 / 60);
  assert.equal(fx.count(), 0, 'all gone after their lives');
  assert.equal(fx.update(1 / 60), 0); for (const m of fx.meshes) assert.equal(m.visible, false, 'hidden at rest');
});

test('capped: a long burst never goes past HITFX.max; nothing under the floor', () => {
  const { fx } = mk();
  for (let k = 0; k < 60; k++) fx.spawn('concrete', { x: -7, y: -199.95, z: -640 }, { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0.3 });
  assert.ok(fx.update(1 / 60) <= HITFX.max);
  let low = Infinity;
  for (let i = 0; i < 40; i++) { fx.update(1 / 60); const P = fx.meshes[0].geometry.attributes.position.array; const n = fx.meshes[0].geometry.drawRange ? fx.meshes[0].geometry.drawRange.count : P.length / 3; for (let v = 0; v < n; v++) low = Math.min(low, P[v * 3 + 1]); }
  assert.ok(low > -0.01, 'lowest vertex ' + low.toFixed(4) + ' (room floor at 0)');
  fx.clear(); assert.equal(fx.count(), 0); for (const m of fx.meshes) assert.equal(m.visible, false);
});

test('material by solid: steel, concrete, wood, the kit props; solid.fx wins', () => {
  assert.equal(kindOfSolid({ metal: true, prop: true }), 'steel');
  assert.equal(kindOfSolid({ target: 2 }), 'steel');
  assert.equal(kindOfSolid({ wall: true, surface: {} }), 'concrete');
  assert.equal(kindOfSolid({ column: true }), 'concrete');
  assert.equal(kindOfSolid({ prop: true }), 'concrete', 'an unknown prop: plain chips');
  const withMesh = (mesh) => { const b = { prop: true }; Object.defineProperty(b, 'mesh', { value: mesh, enumerable: false }); return b; };
  assert.equal(kindOfSolid(withMesh({ userData: { fx: 'sand' } })), 'sand', 'the mesh says (training-wear swatches)');
  assert.equal(kindOfSolid(withMesh({ userData: {}, material: { metalness: 0.6 } })), 'steel', 'a metal material');
  assert.equal(kindOfSolid(withMesh({ userData: {}, material: { metalness: 0.1 } })), 'concrete');
  assert.equal(kindOfSolid({ prop: true, kitProp: 'mug' }), 'china');
  assert.equal(kindOfSolid({ prop: true, kitProp: 'clipboard' }), 'paper');
  assert.equal(kindOfSolid({ prop: true, fx: 'glass' }), 'glass');
  assert.equal(kindOfSolid(null), 'concrete');
});

test('dust is soft round cards, not faceted blobs (Director 22 Nov): one card facing the camera, else three crossed', () => {
  const { fx } = mk(), dust = fx.meshes[2];
  assert.ok(dust.geometry.attributes.uv, 'the cards carry uvs');
  if (T.DataTexture) assert.ok(dust.material.map, 'a radial-alpha puff texture');
  fx.spawn('concrete', { x: -7, y: -198.6, z: -640 }, { x: 1, y: 0, z: 0 }, null);
  const cam = new T.PerspectiveCamera(60, 1, 0.1, 100); cam.position.set(2, 1, 3); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(true);
  fx.update(1 / 60, cam);
  const P = dust.geometry.attributes.position.array, e = cam.matrixWorld.elements, fwd = [e[8], e[9], e[10]];
  const n = dust.geometry.drawRange ? dust.geometry.drawRange.count : 0; assert.ok(n >= 24, 'puffs drawn (' + n + ')');
  for (let b = 0; b < n / 24; b++) {   // the first card's 6 corners lie square to the view; the rest of its 24 have no area
    const o = b * 72, d = (k) => (P[o + k * 3] - P[o]) * fwd[0] + (P[o + k * 3 + 1] - P[o + 1]) * fwd[1] + (P[o + k * 3 + 2] - P[o + 2]) * fwd[2];
    for (let k = 1; k < 6; k++) assert.ok(Math.abs(d(k)) < 1e-6, 'facing the camera');
    for (let k = 7; k < 24; k++) for (let j = 0; j < 3; j++) assert.equal(P[o + k * 3 + j], P[o + 6 * 3 + j], 'no area');
  }
  fx.update(1 / 60);   // no camera: three crossed cards
  let spread = 0; for (let k = 6; k < 18; k++) spread = Math.max(spread, Math.abs(P[k * 3] - P[18 * 3]));
  assert.ok(spread > 0, 'crossed cards without a camera');
});

test('prime: without a warm-up call the first frame draws each mesh once (one bit with no size), the second hides them', () => {
  const { fx } = mk();
  fx.update(1 / 60); for (const m of fx.meshes) { assert.equal(m.visible, true); assert.equal(m.geometry.drawRange.count, 24); }
  const P = fx.meshes[0].geometry.attributes.position.array; for (let k = 3; k < 72; k++) assert.equal(P[k], P[k % 3], 'no size');
  fx.update(1 / 60); for (const m of fx.meshes) assert.equal(m.visible, false, 'hidden after: 0 draws at rest');
});

test('CG-7 s3: the firing bench says what each face is: the mat rubber, the kick panel paint, the nosing and the strip steel', () => {
  const tg = buildTrainingGround(T), G = tg.origin, F = FIRING_LINE;
  const bench = tg.solids.find((s) => s.firingLine && !s.firingFence && !s.firingFrame);
  assert.ok(bench, 'the bench box');
  const at = (y, z, n) => kindOfHit({ solid: bench, point: { x: G.x, y: G.y + y, z: G.z + z }, normal: n });
  const up = { x: 0, y: 1, z: 0 }, front = { x: 0, y: 0, z: -1 };
  assert.equal(at(F.top, 0.5, up), 'rubber', 'the mat');
  assert.equal(at(F.top, F.front + 0.01, up), 'steel', 'the nosing / hazard strip on top');
  assert.equal(at(0.4, F.front, front), 'paint', 'the kick panel');
  assert.equal(at(0.83, F.front, front), 'steel', 'the nosing face');
  assert.equal(kindOfSolid(bench), 'steel', 'the box alone (no face) still reads steel, as before');
  assert.equal(kindOfHit({ solid: { wall: true }, point: { x: 0, y: 0, z: 0 }, normal: up }), 'concrete', 'other solids unchanged');
  const { fx } = mk();
  for (const k of ['rubber', 'paint']) assert.ok(fx.spawn(k, { x: -7, y: -198.6, z: -640 }, up, null) >= 8, k);
  assert.ok(!HITFX.kinds.rubber[0].glow && HITFX.kinds.paint.some((r) => r.glow), 'rubber never sparks; the paint does (steel under it)');
});

test('AH-12: extended material recipes and directional spawnJet work within HITFX.max', () => {
  const { fx } = mk();
  const up = { x: 0, y: 1, z: 0 };
  for (const k of ['amberGlass', 'phosphor', 'coffee', 'water', 'saline', 'electronics', 'gas', 'brass', 'chalk', 'burlap', 'ember']) {
    assert.ok(HITFX.kinds[k], k + ' recipe exists');
    assert.ok(fx.spawn(k, { x: -7, y: -198.6, z: -640 }, up, null) >= 4, k + ' spawns particles');
  }
  assert.equal(kindOfSolid({ prop: true, kitProp: 'medMug' }), 'china');
  assert.equal(kindOfSolid({ prop: true, kitProp: 'sharpsBin' }), 'plastic');
  assert.equal(kindOfSolid({ prop: true, kitProp: 'markers' }), 'chalk');
  assert.equal(kindOfSolid({ prop: true, kitProp: 'brassBucket' }), 'brass');
  fx.clear();
  const jetN = fx.spawnJet('gas', { x: -42, y: -199.4, z: -649 }, { x: 1, y: 0.2, z: 0.4 }, 1.2);
  assert.ok(jetN >= 4 && fx.update(1 / 60) >= 4, 'spawnJet emits directional jet puffs');
  fx.clear();
  assert.equal(fx.count(), 0);
});

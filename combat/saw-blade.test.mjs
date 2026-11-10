import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bladeColumn, bladePoint, bladeBox, trainingBladeHits, bladeHeading, SAW_SLOP } from './saw-blade.js';

// A saw held low in front of him: rear sprocket 0.1 m ahead of the eye, nose 0.9 m ahead, hip height, 7 cm chain radius.
const bl = { ax: 0, ay: 1.0, az: 0.1, bx: 0, by: 1.0, bz: 0.9, r: 0.07 };
const zombie = (x, z, r = 0.4, h = 1.7) => bladeColumn(bl, x, z, r, 0, h);

test('a body the blade is inside is cut; the old cone\'s 2.5 m out on the aim is not', () => {
  assert.equal(zombie(0, 0.7), true);
  assert.equal(zombie(0, 2.5), false);
});

test('the nose reaches its radius plus the body\'s and the slop, and no further', () => {
  const gap = 0.4 + 0.07 + SAW_SLOP;
  assert.equal(zombie(0, 0.9 + gap - 0.02), true);
  assert.equal(zombie(0, 0.9 + gap + 0.02), false);
});

test('beside the bar the same: a body off to the side is cut only inside the reach', () => {
  const gap = 0.4 + 0.07 + SAW_SLOP;
  assert.equal(zombie(gap - 0.02, 0.5), true);
  assert.equal(zombie(gap + 0.02, 0.5), false);
  assert.equal(zombie(-(gap - 0.02), 0.5), true);
});

test('behind the sprocket: a body behind him is not cut', () => {
  assert.equal(zombie(0, -1.0), false);
  assert.equal(zombie(0, -0.6), false);
});

test('height counts: the blade at hip height passes over a prone body and under a canopy', () => {
  assert.equal(bladeColumn(bl, 0, 0.6, 0.4, 0, 1.7), true);
  assert.equal(bladeColumn(bl, 0, 0.6, 0.4, 0, 0.3), false);   // a crawler's 0.3 m back is below the chain (bl.ay - r - slop = 0.81)
  assert.equal(bladeColumn(bl, 0, 0.6, 0.4, 1.4, 3.0), false);
  assert.equal(bladeColumn(bl, 0, 0.6, 0.4, 0, 0.82), true);   // 0.01 m inside the limit
});

test('a slanted blade is clipped to the body\'s height before it is measured', () => {
  // the chain points down at 45 degrees toward a short body in front of it
  const sl = { ax: 0, ay: 1.4, az: 0, bx: 0, by: 0.4, bz: 1.0, r: 0.05 };
  assert.equal(bladeColumn(sl, 0, 1.0, 0.3, 0, 0.5), true);     // the nose is down at the body's top
  assert.equal(bladeColumn(sl, 0, 0.2, 0.3, 0, 0.5), false);    // the part of the bar near the body is 1 m up
});

test('the contact is on the blade, the nearest point to the body', () => {
  const out = {};
  assert.equal(bladeColumn(bl, 0.3, 0.5, 0.2, 0, 1.7, out), true);
  assert.ok(Math.abs(out.z - 0.5) < 1e-9 && out.x === 0 && out.y === 1.0);
  assert.ok(out.d < 0);
});

test('a bug or a rabbit is cut only at the chain', () => {
  assert.equal(bladePoint(bl, 0, 0.0, 0.5, 0.2), false);       // on the ground under the bar
  assert.equal(bladePoint(bl, 0, 0.9, 0.5, 0.2), true);
  assert.equal(bladePoint(bl, 0, 0.9, 2.5, 0.2), false);
});

test('a plate is cut when the blade reaches its box', () => {
  const box = { minX: -0.5, maxX: 0.5, minY: 0.4, maxY: 1.6, minZ: 1.0, maxZ: 1.05 };
  const out = {};
  assert.equal(bladeBox(bl, box, out), true);                   // the nose is 0.1 m short of the plate
  assert.ok(Math.abs(out.z - 1.0) < 1e-9);
  assert.equal(bladeBox({ ...bl, bz: 0.5 }, box, out), false);
});

test('the Training Ground: a plate behind a wall or another plate is not cut; the nearest comes first', () => {
  const tg = { targets: [
    { state: 'up', box: { minX: -0.5, maxX: 0.5, minY: 0.4, maxY: 1.6, minZ: 1.0, maxZ: 1.05 } },
    { state: 'up', box: { minX: -0.5, maxX: 0.5, minY: 0.4, maxY: 1.6, minZ: 0.9, maxZ: 0.95 } },
    { state: 'down', box: { minX: -0.5, maxX: 0.5, minY: 0.4, maxY: 1.6, minZ: 0.95, maxZ: 1.0 } },
  ] };
  const clear = () => null;
  let hits = trainingBladeHits(tg, bl, { x: 0, y: 0.9, z: 0 }, clear);
  assert.deepEqual(hits.map((h) => h.index), [1, 0]);
  const blocked = (_tg, _from, to) => (to.z > 0.95 ? { solid: { target: 1 } } : null);   // plate 1 shadows plate 0
  hits = trainingBladeHits(tg, bl, { x: 0, y: 0.9, z: 0 }, blocked);
  assert.deepEqual(hits.map((h) => h.index), [1]);
  assert.deepEqual(trainingBladeHits(tg, bl, { x: 0, y: 0.9, z: 0 }, clear, 1).map((h) => h.index), [1]);
});

test('the heading is the blade on the ground, or the aim when it points up or down', () => {
  const o = {};
  assert.deepEqual(bladeHeading(bl, 1, 0, o), { x: 0, z: 1 });
  const up = { ax: 0, ay: 0, az: 0, bx: 0.05, by: 1, bz: 0.05, r: 0.07 };
  assert.deepEqual(bladeHeading(up, 0.6, 0.8, o), { x: 0.6, z: 0.8 });
});

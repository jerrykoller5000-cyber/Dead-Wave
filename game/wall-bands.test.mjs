import test from 'node:test';
import assert from 'node:assert/strict';
import { hqRingPoints, ringTrailGaps, ringWaterGaps, makeWallBand, resolveWallBand } from './wall-bands.js';

test('ring gaps follow every crossing and only the crossings', () => {
  const paths = [Object.assign([{ x: 0, z: 0 }, { x: 90, z: 0 }], { hw: 0.85 }),
    Object.assign([{ x: 0, z: 0 }, { x: 0, z: -90 }], { hw: 1.7 })];
  const gaps = ringTrailGaps(paths);
  assert.equal(gaps.length, 2);
  assert.deepEqual(gaps.map((g) => g.halfWidth), [1.85, 2.7]);
  const band = makeWallBand({ pts: hqRingPoints(), gaps });
  assert.ok(band.solids.length > 300 && band.solids.length < 480);
  assert.equal(band.isGap(60, 0, 0), true);
  assert.equal(band.isGap(0, -60, band.length * 0.75), true);
  assert.equal(band.isGap(0, 60, band.length * 0.25), false);
  assert.equal(ringTrailGaps([[{ x: 60, z: 8 }, { x: 60, z: 12 }]]).length, 0,
    'a trail that only runs outside the band does not cut it');
  assert.equal(ringTrailGaps([[{ x: -90, z: 0 }, { x: 90, z: 0 }]]).length, 1,
    'a long segment crossing the ring is detected even without inner vertices');
});

test('the wall blocks a crossing away from a trail and leaves the trail walkable', () => {
  const path = Object.assign([{ x: 0, z: 0 }, { x: 90, z: 0 }], { hw: 0.85 });
  const band = makeWallBand({ pts: hqRingPoints(), gaps: ringTrailGaps([path]) });
  const blocked = (x, z, bodyR = 0.35) => band.solids.some((s) => Math.hypot(x - s.x, z - s.z) < s.radius + bodyR);
  for (let r = 58.5; r <= 61.5; r += 0.25) assert.equal(blocked(0, r), true, `closed at ${r}`);
  for (let r = 57; r <= 63; r += 0.25) assert.equal(blocked(r, 0), false, `open at ${r}`);
  band.radius = 60;
  const pushed = resolveWallBand(band, 0, 60);
  assert.ok(Math.abs(pushed.x) < 0.1 && Math.abs(pushed.z - 60) < 2.5,
    'collision pushes across the band, not along it');
  assert.deepEqual(resolveWallBand(band, 60, 0), { x: 60, z: 0 });
  for (let degree = 0; degree < 360; degree++) {
    const a = degree * Math.PI / 180, at = a * 60;
    if (!band.isGap(60 * Math.cos(a), 60 * Math.sin(a), at, 2.35))
      assert.equal(blocked(60 * Math.cos(a), 60 * Math.sin(a)), true,
      `no leak at closed angle ${degree}`);
  }
});

test('oblique trails and river banks leave passable openings without wrapping errors', () => {
  const trail = Object.assign([{ x: 20, z: 0 }, { x: 95, z: 38 }], { hw: 0.85 });
  const gaps = ringTrailGaps([trail]);
  assert.equal(gaps.length, 1);
  const water = ringWaterGaps(60, 4, (x, z) => x > 58 && Math.abs(z) < 5);
  assert.equal(water.length, 1);
  const band = makeWallBand({ pts: hqRingPoints(), gaps: [...gaps, ...water] });
  band.radius = 60;
  const x = 57.5, z = 19;
  assert.deepEqual(resolveWallBand(band, x, z), { x, z });
});

test('an oblique trail remains clear across the full band depth', () => {
  const a = { x: 42.6, z: -36.4 }, b = { x: 20.4, z: -63 };
  const path = Object.assign([a, b], { hw: 1.15 });
  const band = makeWallBand({ pts: hqRingPoints(), gaps: ringTrailGaps([path]) });
  band.radius = 60;
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  const nx = -dz / len, nz = dx / len;
  for (let t = 0; t <= 1; t += 0.02) for (const side of [-0.8, 0, 0.8]) {
    const x = a.x + dx * t + nx * side, z = a.z + dz * t + nz * side;
    if (Math.hypot(x, z) < 57.5 || Math.hypot(x, z) > 62.5) continue;
    const p = resolveWallBand(band, x, z);
    assert.ok(Math.hypot(p.x - x, p.z - z) < 1e-6, `trail corridor blocked at ${t.toFixed(2)} / ${side}`);
  }
});

test('the same primitive handles a straight polyline and authored corridor', () => {
  const gap = { id: 'service-track', kind: 'trail',
    pts: [{ x: 0, z: -10 }, { x: 0, z: 10 }], halfWidth: 1.5 };
  const band = makeWallBand({ pts: [{ x: -10, z: 0 }, { x: 10, z: 0 }], width: 4,
    gaps: [gap], spacing: 0.8 });
  assert.equal(band.solids.some((s) => Math.abs(s.x) < 3.85), false);
  assert.deepEqual(resolveWallBand(band, 0, 0), { x: 0, z: 0 });
  const pushed = resolveWallBand(band, 6, 0);
  assert.ok(Math.abs(pushed.x - 6) < 1e-6 && Math.abs(pushed.z) >= 2.35);
});

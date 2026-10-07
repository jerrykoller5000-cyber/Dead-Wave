// GB-134: the throw speeds for a charge, and the flight the arc draws.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THROW, throwSpeed, flyArc, arcDots } from './arcs.js';

const flat = () => 0;
const rangeOf = (s, sy = 1.6) => { const r = flyArc({ sx: 0, sy, sz: 0, vx: s.h, vy: s.vy, vz: 0, ground: flat, tMax: 5 }); return r.hit.x; };

test('a tap lobs short, 3 s throws furthest, and it grows in between', () => {
  const tap = throwSpeed(0), full = throwSpeed(3), over = throwSpeed(9);
  assert.deepEqual([tap.h, tap.vy], [THROW.LOB.h, THROW.LOB.vy]);
  assert.deepEqual([full.h, full.vy], [THROW.FAR.h, THROW.FAR.vy]);
  assert.deepEqual([over.h, over.vy], [full.h, full.vy], 'held past 3 s: still the longest');
  let last = -1;
  for (let s = 0; s <= 3.0001; s += 0.25) { const r = rangeOf(throwSpeed(s)); assert.ok(r > last, 'longer at ' + s + ' s'); last = r; }
  assert.ok(rangeOf(tap) > 2 && rangeOf(tap) < 4.5, 'a tap is a lob: ' + rangeOf(tap).toFixed(1) + ' m');
  assert.ok(rangeOf(full) > 17 && rangeOf(full) < 22, 'the longest throw: ' + rangeOf(full).toFixed(1) + ' m');
  assert.ok(rangeOf(full) > rangeOf(THROW.OLD), 'further than the old fixed throw');
  assert.equal(throwSpeed(NaN).h, THROW.LOB.h);
});

test('the flight lands on the flat where the motion says, and on a hill sooner', () => {
  const r = flyArc({ sx: 0, sy: 1.6, sz: 0, vx: 10, vy: 5, vz: 0, ground: flat, g: 16, dt: 1 / 240, tMax: 5 });
  // y = 1.6 + 5t - 8t^2 = 0.12 -> t = (5 + sqrt(25 + 47.36)) / 16
  const t = (5 + Math.sqrt(25 + 4 * 8 * 1.48)) / 16;
  assert.equal(r.hit.kind, 'ground');
  assert.ok(Math.abs(r.hit.x - 10 * t) < 0.15, r.hit.x.toFixed(2) + ' vs ' + (10 * t).toFixed(2));
  const hill = (x) => (x > 6 ? (x - 6) * 1.2 : 0);
  const h = flyArc({ sx: 0, sy: 1.6, sz: 0, vx: 10, vy: 5, vz: 0, ground: hill, tMax: 5 });
  assert.equal(h.hit.kind, 'ground');
  assert.ok(h.hit.x < r.hit.x - 1 && h.hit.x > 6, 'the rising ground cuts it at ' + h.hit.x.toFixed(2));
  assert.ok(Math.abs(h.hit.y - (hill(h.hit.x) + 0.12)) < 1e-9, 'on the ground');
});

test('a wall takes it, and the fuse ends it', () => {
  const wall = (ax, ay, az, bx) => (ax < 5 && bx >= 5 ? (5 - ax) / (bx - ax) : null);
  const w = flyArc({ sx: 0, sy: 1.6, sz: 0, vx: 12, vy: 6, vz: 0, ground: flat, solid: wall, tMax: 5 });
  assert.equal(w.hit.kind, 'solid');
  assert.ok(Math.abs(w.hit.x - 5) < 1e-9 && w.pts[w.pts.length - 1].x === w.hit.x);
  const f = flyArc({ sx: 0, sy: 50, sz: 0, vx: 1, vy: 0, vz: 0, ground: flat, tMax: 1 });
  assert.equal(f.hit.kind, 'fuse');
  assert.ok(Math.abs(f.hit.t - 1) < 1e-9);
});

test('the dots run evenly to where it lands', () => {
  const r = flyArc({ sx: 0, sy: 1.6, sz: 0, vx: 12, vy: 6, vz: 0, ground: flat, tMax: 5 });
  const d = arcDots(r.pts, 18);
  assert.equal(d.length, 18);
  assert.deepEqual(d[17], r.pts[r.pts.length - 1]);
  for (let i = 1; i < d.length; i++) assert.ok(d[i].x > d[i - 1].x);
  assert.deepEqual(arcDots([{ x: 0, y: 0, z: 0 }], 5), []);
});
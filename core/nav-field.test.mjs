// CU-210: the valley field routes through one gap, a blocked gap stays shut,
// and opening it restores the route. Node only; it does not start the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeNavField, buildNavField, markNavCircle, navDir, navIndex, paintNavSegment } from './nav-field.js';

const GAP = { x: 18, z: 0 };

function ringField(openGap) {
  const n = 64;
  const F = makeNavField(n, -40, -40);
  F.cost.fill(1);
  for (let k = 0; k < F.blocked.length; k++) {
    const i = k % n, j = (k / n) | 0;
    const x = F.ox + (i + 0.5) * F.cell;
    const z = F.oz + (j + 0.5) * F.cell;
    const r = Math.hypot(x, z);
    if (Math.abs(r - 18) > 1.5) continue;
    const ang = Math.atan2(z, x);
    if (openGap && Math.abs(ang) < 0.22) continue;
    F.blocked[k] = 1;
  }
  buildNavField(F, 0, 0, 2);
  return F;
}

function walk(F, x, z) {
  const path = [{ x, z }];
  const out = { x: 0, z: 0 };
  let crossed = false;
  let nearest = Infinity;
  for (let s = 0; s < 800; s++) {
    if (Math.hypot(x, z) < 3) return { arrived: true, path, crossed, nearest };
    const k = navIndex(F, x, z);
    if (k >= 0 && F.blocked[k]) crossed = true;
    nearest = Math.min(nearest, Math.hypot(x - GAP.x, z - GAP.z));
    if (!navDir(F, x, z, out)) return { arrived: false, path, crossed, nearest, stuck: true };
    x += out.x * 0.55;
    z += out.z * 0.55;
    path.push({ x, z });
  }
  return { arrived: Math.hypot(x, z) < 3, path, crossed, nearest };
}

test('a walker outside a ring reaches the centre through the one gap', () => {
  const F = ringField(true);
  const start = navIndex(F, 0, 26);
  assert.notEqual(F.dist[start], Infinity);
  const w = walk(F, 0, 26);
  assert.equal(w.arrived, true);
  assert.equal(w.crossed, false);
  assert.ok(w.nearest < 2.5, 'passed the gap (' + w.nearest.toFixed(2) + ' m)');
});

test('blocking the gap leaves no route, and opening it restores one', () => {
  const shut = ringField(false);
  const start = navIndex(shut, 0, 26);
  assert.equal(shut.dist[start], Infinity);
  assert.equal(navDir(shut, 0, 26, { x: 0, z: 0 }), false);
  const open = ringField(true);
  assert.notEqual(open.dist[navIndex(open, 0, 26)], Infinity);
  assert.equal(walk(open, 0, 26).arrived, true);
});

test('a blocked-cells circle can seal the gap', () => {
  const F = ringField(true);
  markNavCircle(F, GAP.x, GAP.z, 5);
  buildNavField(F, 0, 0, 2);
  assert.equal(F.dist[navIndex(F, 0, 26)], Infinity);
});

test('a trail costs less than the woods beside it', () => {
  const F = makeNavField(32, -2, -2);
  F.cost.fill(1.6);
  paintNavSegment(F, 0, 0, 20, 0, 2, 0.6);
  buildNavField(F, 0, 0, 1.2);
  const trail = F.dist[navIndex(F, 12, 0)];
  const woods = F.dist[navIndex(F, 12, 6)];
  assert.ok(trail < woods, 'trail ' + trail + ' woods ' + woods);
  assert.ok(F.cost[navIndex(F, 12, 0)] < 0.7);
  assert.ok(F.cost[navIndex(F, 12, 6)] > 1.5);
});

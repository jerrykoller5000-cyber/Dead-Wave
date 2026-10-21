// node --import ./studio/node-three.mjs --test core/geometry.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { slab, lathe, triangulate, curve } from './geometry.js';

const bounds = (geo) => {
  const P = geo.attributes.position.array, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); }
  return { lo, hi };
};
const near = (a, b, e = 1e-4) => Math.abs(a - b) < e;
// Every triangle faces the way its normals say, and every normal is unit length.
const facesOut = (geo) => {
  const P = geo.attributes.position.array, N = geo.attributes.normal.array;
  for (let t = 0; t < P.length; t += 9) {
    const ux = P[t + 3] - P[t], uy = P[t + 4] - P[t + 1], uz = P[t + 5] - P[t + 2], vx = P[t + 6] - P[t], vy = P[t + 7] - P[t + 1], vz = P[t + 8] - P[t + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const sx = N[t] + N[t + 3] + N[t + 6], sy = N[t + 1] + N[t + 4] + N[t + 7], sz = N[t + 2] + N[t + 5] + N[t + 8];
    if (fx * sx + fy * sy + fz * sz < 0) return false;
    for (let k = 0; k < 9; k += 3) if (!near(Math.hypot(N[t + k], N[t + k + 1], N[t + k + 2]), 1, 1e-3)) return false;
  }
  return true;
};

test('a slab keeps its outline and its width, either way round', () => {
  for (const pts of [[[0, 0], [0.3, 0], [0.3, 0.1], [0, 0.1]], [[0, 0.1], [0.3, 0.1], [0.3, 0], [0, 0]]]) {
    const g = slab(pts, 0.06, 0.008, 2);
    const { lo, hi } = bounds(g);
    assert.ok(near(lo[0], -0.03) && near(hi[0], 0.03), 'width ' + lo[0] + '..' + hi[0]);
    assert.ok(near(lo[2], 0) && near(hi[2], 0.3) && near(lo[1], 0) && near(hi[1], 0.1), 'outline');
    assert.ok(facesOut(g), 'faces out');
    assert.equal(g.attributes.uv.count, g.attributes.position.count);
  }
});

test('a concave outline (a pistol grip) is capped whole', () => {
  const pts = [[0, 0], [0.1, 0], [0.1, -0.02], [0.03, -0.02], [0.0, -0.18], [-0.05, -0.18], [-0.03, -0.02], [-0.06, -0.02], [-0.06, 0]];
  assert.equal(triangulate(pts.slice().reverse()).length, pts.length - 2);
  assert.ok(facesOut(slab(pts, 0.05, 0.006, 2)));
  // With a hair of bevel the cap is the outline's whole area: nothing is left open.
  const g = slab(pts, 0.05, 0.0005, 2);
  const P = g.attributes.position.array, N = g.attributes.normal.array;
  let cap = 0;
  for (let t = 0; t < P.length; t += 9) {
    if (!(N[t] > 0.999 && N[t + 3] > 0.999 && N[t + 6] > 0.999)) continue;
    cap += Math.abs((P[t + 5] - P[t + 2]) * (P[t + 7] - P[t + 1]) - (P[t + 8] - P[t + 2]) * (P[t + 4] - P[t + 1])) / 2;
  }
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  area = Math.abs(area) / 2;
  assert.ok(cap > area * 0.95 && cap <= area, 'cap ' + cap.toFixed(5) + ' of ' + area.toFixed(5));
});

test('a lathe turns its profile round z, hard where a point repeats', () => {
  const g = lathe([[0, 0], [0.02, 0], [0.02, 0.3], [0.02, 0.3], [0.03, 0.3], [0.03, 0.35], [0, 0.35]], 12);
  const { lo, hi } = bounds(g);
  assert.ok(near(lo[2], 0) && near(hi[2], 0.35), 'length');
  assert.ok(near(hi[0], 0.03, 1e-3) && near(lo[1], -0.03, 2e-3), 'radius');
  assert.ok(facesOut(g));
  const flat = lathe([[0.04, 0], [0.04, 0.2]], 8, Math.PI / 8);
  assert.ok(near(bounds(flat).hi[1], 0.04 * Math.cos(Math.PI / 8), 1e-4), 'an octagon turned flat on top');
});

test('curve keeps both ends', () => {
  const c = curve([0, 0], [1, 1], [2, 0], 4);
  assert.equal(c.length, 5);
  assert.deepEqual(c[0], [0, 0]);
  assert.deepEqual(c[4], [2, 0]);
});

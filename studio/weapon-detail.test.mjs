// node --import ./studio/node-three.mjs --test studio/weapon-detail.test.mjs
// CB-316: the shared detail helpers make closed, outward-facing, correctly sized parts; the fasteners are one draw.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { weaponDetail, chamferBoxGeometry, plateGeometry, serrationGeometry, fastenerGeometry, DETAIL_BED } from './weapon-detail.js';

const ctx = { THREE };
const bounds = (geo) => {
  const P = geo.attributes.position.array, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i + k]); hi[k] = Math.max(hi[k], P[i + k]); }
  return { lo, hi, size: hi.map((h, k) => h - lo[k]) };
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
// Closed: every edge is used by exactly two triangles, once in each direction (a consistently wound solid).
function closed(geo) {
  const P = geo.attributes.position.array, key = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]].map((v) => Math.round(v * 1e7)).join(',');
  const edges = new Map();
  for (let t = 0; t < P.length / 9; t++) for (let k = 0; k < 3; k++) {
    const a = key(t * 3 + k), b = key(t * 3 + (k + 1) % 3);
    if (a === b) continue;
    edges.set(a + '>' + b, (edges.get(a + '>' + b) || 0) + 1);
  }
  let bad = 0;
  for (const [e, n] of edges) { const [a, b] = e.split('>'); if (n !== 1 || edges.get(b + '>' + a) !== 1) bad++; }
  return bad;
}
// Each triangle's stored normal is unit length and agrees with its winding.
function wound(geo) {
  const P = geo.attributes.position.array, N = geo.attributes.normal.array;
  let bad = 0;
  for (let t = 0; t < P.length / 9; t++) {
    const o = t * 9, ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2], vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (Math.hypot(nx, ny, nz) < 1e-14) continue;
    if (nx * N[o] + ny * N[o + 1] + nz * N[o + 2] <= 0 || !near(Math.hypot(N[o], N[o + 1], N[o + 2]), 1, 1e-4)) bad++;
  }
  return bad;
}

test('chamfered box: the asked size, closed, chamfers on every edge, cached', () => {
  const g = chamferBoxGeometry(THREE, 0.03, 0.012, 0.08, 0.0012);
  const b = bounds(g);
  assert.ok(near(b.size[0], 0.03) && near(b.size[1], 0.012) && near(b.size[2], 0.08), JSON.stringify(b.size));
  assert.equal(g.attributes.position.count, (6 * 2 + 12 * 2 + 8) * 3);
  assert.equal(closed(g), 0); assert.equal(wound(g), 0);
  // every normal points out of the box (it is convex and centred)
  const P = g.attributes.position.array, N = g.attributes.normal.array;
  for (let i = 0; i < P.length; i += 9) assert.ok((P[i] + P[i + 3] + P[i + 6]) * N[i] + (P[i + 1] + P[i + 4] + P[i + 7]) * N[i + 1] + (P[i + 2] + P[i + 5] + P[i + 8]) * N[i + 2] > 0);
  assert.equal(chamferBoxGeometry(THREE, 0.03, 0.012, 0.08, 0.0012), g, 'the same box is built once');
  assert.ok(g.attributes.uv && g.attributes.uv.count === g.attributes.position.count, 'uv for the camo');
});

test('plate: outline on the face, thickness along the axis, closed and outward for each axis', () => {
  const outline = [[-0.02, 0], [0.02, 0], [0.024, 0.01], [0.0, 0.016], [-0.02, 0.012]];
  for (const axis of ['x', 'y', 'z']) {
    const g = plateGeometry(THREE, outline, 0.002, 0.0005, axis);
    const b = bounds(g), k = { x: 0, y: 1, z: 2 }[axis];
    assert.ok(near(b.size[k], 0.002), axis + ' thickness ' + b.size[k]);
    const across = [0, 1, 2].filter((i) => i !== k).map((i) => b.size[i]).sort((p, q) => p - q);
    assert.ok(near(across[1], 0.044, 1e-6) && near(across[0], 0.016, 1e-6), axis + ' extent ' + across);
    assert.equal(closed(g), 0, axis + ' closed'); assert.equal(wound(g), 0, axis + ' wound');
  }
});

test('serrations: the row is count x pitch long, the ridges depth above the floors, seated into the face, closed', () => {
  for (const profile of ['v', 'square', 'round']) {
    const g = serrationGeometry(THREE, 9, 0.003, 0.016, 0.0008, profile);
    const b = bounds(g);
    assert.ok(near(b.size[2], 0.027) && near(b.size[0], 0.016), profile + ' ' + b.size);
    assert.ok(near(b.lo[1], -DETAIL_BED) && near(b.hi[1], 0.00005 + 0.0008), profile + ' height ' + b.lo[1] + '..' + b.hi[1]);
    assert.equal(closed(g), 0, profile + ' closed'); assert.equal(wound(g), 0, profile + ' wound');
    // the top really is grooved: along the middle line, points at the floor and at the ridge
    const P = g.attributes.position.array, ys = new Set();
    for (let i = 0; i < P.length; i += 3) if (P[i + 1] > 0) ys.add(Math.round(P[i + 1] * 1e6));
    assert.ok(ys.has(Math.round(0.00005 * 1e6)) && ys.has(Math.round(0.00085 * 1e6)), profile + ' floors and ridges');
  }
});

test('fastener heads: each kind closed and wound, proud 0.45 r (pin 0.25 r), seated 0.4 r', () => {
  for (const kind of ['slot', 'cross', 'hex', 'torx', 'button', 'pin']) {
    const g = fastenerGeometry(THREE, kind, 0.4), b = bounds(g);
    assert.ok(near(b.lo[1], -0.4), kind + ' seat ' + b.lo[1]);
    const proud = kind === 'pin' ? 0.25 : kind === 'button' ? 0.45 + 0.12 : 0.45;
    assert.ok(near(b.hi[1], proud, 1e-6), kind + ' proud ' + b.hi[1]);
    assert.ok(near(b.size[0], 2, 1e-6) && near(b.size[2], 2, 1e-6), kind + ' radius');
    assert.equal(closed(g), 0, kind + ' closed'); assert.equal(wound(g), 0, kind + ' wound');
  }
});

test('fasteners and pins: one Mesh a call, the heads baked at their size, each on its face along its normal', () => {
  const W = weaponDetail(ctx), gun = new THREE.Group(), mat = new THREE.MeshStandardMaterial();
  const items = [
    { x: 0.0125, y: 0.03, z: 0.01, axis: 'x', side: 1, r: 0.0018 },
    { x: -0.0125, y: 0.03, z: 0.01, axis: 'x', side: -1, r: 0.0018 },
    { x: 0, y: 0.05, z: -0.02, axis: 'y', side: 1, r: 0.0015, turn: 0.4 },
    { x: 0, y: 0.02, z: 0.09, axis: 'z', side: 1, r: 0.002 }
  ];
  const heads = W.fasteners(gun, mat, 'torx', items);
  assert.equal(gun.children.length, 1, 'one draw for four screws');
  assert.ok(heads.isMesh && !heads.isInstancedMesh, 'a plain mesh: nothing unit-sized for a copy to lose');
  assert.equal(heads.userData.weaponDetail.kind, 'torx');
  assert.ok(heads.scale.x === 1 && heads.position.lengthSq() === 0, 'the heads are in the geometry');
  const unit = fastenerGeometry(THREE, 'torx', 0.4).attributes.position.count, P = heads.geometry.attributes.position;
  assert.equal(P.count, unit * items.length);
  items.forEach((it, k) => {
    const n = new THREE.Vector3(...{ x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[it.axis]).multiplyScalar(it.side);
    const at = new THREE.Vector3(it.x, it.y, it.z), p = new THREE.Vector3();
    let hi = -Infinity, lo = Infinity, rad = 0;
    for (let i = k * unit; i < (k + 1) * unit; i++) {
      p.fromBufferAttribute(P, i).sub(at); const h = p.dot(n); hi = Math.max(hi, h); lo = Math.min(lo, h);
      rad = Math.max(rad, p.addScaledVector(n, -h).length());
    }
    assert.ok(near(hi, 0.45 * it.r, 1e-6), k + ' proud ' + hi);
    assert.ok(lo <= -DETAIL_BED + 1e-6, k + ' seated ' + lo);
    assert.ok(near(rad, it.r, 1e-6), k + ' radius ' + rad);
  });
  const one = W.fasteners(gun, mat, 'slot', [items[0]]);
  assert.ok(one.isMesh && one.geometry === fastenerGeometry(THREE, 'slot', 0.4) && near(one.scale.x, 0.0018), 'a lone head: the unit head, scaled');
  one.updateMatrix(); const top = new THREE.Vector3(0, 0.45, 0).applyMatrix4(one.matrix);
  assert.ok(near(top.x, 0.0125 + 0.45 * 0.0018, 1e-6), 'the lone head proud on its face');
  const pins = W.pins(gun, mat, [{ x: 0, y: 0.02, z: -0.05, axis: 'x', span: 0.025, r: 0.0015 }, { x: 0, y: 0.01, z: -0.03, axis: 'x', span: 0.025, r: 0.0015 }]);
  const pb = new THREE.Box3().setFromObject(pins);
  assert.ok(near(pb.max.x, 0.0125 + 0.25 * 0.0015, 1e-6) && near(pb.min.x, -0.0125 - 0.25 * 0.0015, 1e-6), 'both ends of two pins, one mesh ' + pb.min.x + '..' + pb.max.x);
});

test('chamferBox, plate and serrations land on the parent where asked', () => {
  const W = weaponDetail(ctx), gun = new THREE.Group(), mat = new THREE.MeshStandardMaterial();
  const box = W.chamferBox(gun, 0.03, 0.012, 0.08, 0.001, mat, 0.01, 0.02, 0.03);
  assert.deepEqual(box.position.toArray(), [0.01, 0.02, 0.03]);
  const s = W.serrations(gun, mat, { x: 0.0126, y: 0.06, z: -0.1, axis: 'x', side: 1, along: 'z', count: 9, pitch: 0.003, w: 0.016, depth: 0.0008 });
  gun.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(s);
  assert.ok(near(b.max.x, 0.0126 + 0.00085, 1e-7) && near(b.min.x, 0.0126 - DETAIL_BED, 1e-7), 'out of the +x face ' + b.min.x + '..' + b.max.x);
  assert.ok(near(b.max.z - b.min.z, 0.027, 1e-7) && near(b.max.y - b.min.y, 0.016, 1e-7), 'the row along z, the grooves across y');
  const p = W.plate(gun, [[-0.01, -0.005], [0.01, -0.005], [0.01, 0.005], [-0.01, 0.005]], 0.002, 0.0004, mat, { axis: 'x', x: 0.013, y: 0.04, z: 0 });
  gun.updateMatrixWorld(true);
  const pb = new THREE.Box3().setFromObject(p);
  assert.ok(near(pb.max.x - pb.min.x, 0.002, 1e-7) && near(pb.max.z - pb.min.z, 0.02, 1e-7) && near(pb.max.y - pb.min.y, 0.01, 1e-7));
});

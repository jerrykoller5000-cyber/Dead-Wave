// CL-309 (D-121): the shared detail helpers attach what they build (J14: nothing floats), at real sizes.
//   node --import ./studio/node-three.mjs --test studio/gun-detail.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { gunDetail, floatingParts } from './gun-detail.js';

const ctx = { THREE };
const slab = (w, h, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial()); return m; };
const box = (o) => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };

test('a screw on each face sinks its base into the parent and stands its head proud', () => {
  const D = gunDetail(ctx);
  for (const [axis, side] of [['x', 1], ['x', -1], ['y', 1], ['y', -1], ['z', 1], ['z', -1]]) {
    const gun = new THREE.Group(); const body = slab(0.06, 0.08, 0.2); gun.add(body);
    const n = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[axis], half = { x: 0.03, y: 0.04, z: 0.1 }[axis];
    const s = D.screw(gun, n[0] * side * half, n[1] * side * half, n[2] * side * half, { axis, side });
    const b = box(s), bb = box(body);
    const lo = axis === 'x' ? b.min.x : axis === 'y' ? b.min.y : b.min.z, hi = axis === 'x' ? b.max.x : axis === 'y' ? b.max.y : b.max.z;
    const face = side > 0 ? (axis === 'x' ? bb.max.x : axis === 'y' ? bb.max.y : bb.max.z) : (axis === 'x' ? bb.min.x : axis === 'y' ? bb.min.y : bb.min.z);
    if (side > 0) { assert.ok(lo < face - 0.0004, axis + '+ sinks (' + (face - lo) + ')'); assert.ok(hi > face + 0.0012, axis + '+ proud'); }
    else { assert.ok(hi > face + 0.0004, axis + '- sinks'); assert.ok(lo < face - 0.0012, axis + '- proud'); }
    assert.equal(floatingParts(THREE, gun).length, 0, axis + side + ' nothing floats');
  }
});

test('ribs, vents, a groove, a rivet and a pin all touch their parent', () => {
  const D = gunDetail(ctx);
  const gun = new THREE.Group(); const body = slab(0.06, 0.08, 0.2); gun.add(body);
  const ribs = D.ribs(gun, { x: 0.03, y: 0.02, z: -0.05, axis: 'x', side: 1, along: 'z', count: 8, pitch: 0.004, w: 0.02 });
  assert.equal(ribs.children.length, 8);
  const rb = box(ribs);
  assert.ok(rb.max.x > 0.031 && rb.min.x < 0.0298, 'ribs proud and sunk (' + rb.min.x + '..' + rb.max.x + ')');
  const vents = D.vents(gun, { x: 0, y: 0.04, z: 0.05, axis: 'y', along: 'z', count: 5, pitch: 0.012, w: 0.01, len: 0.006 });
  const vb = box(vents);
  assert.ok(vb.max.y < 0.04 && vb.min.y > 0.036, 'vents cut into the face, not proud (' + vb.max.y + ')');
  D.groove(gun, { x: 0, y: 0.04, z: 0, axis: 'y', along: 'z', len: 0.18 });
  D.rivet(gun, -0.03, 0, 0.06, { axis: 'x', side: -1 });
  D.pin(gun, 0, -0.01, -0.08, { axis: 'x', len: 0.06 });
  assert.equal(floatingParts(THREE, gun).length, 0, 'nothing floats');
  const pin = gun.children[gun.children.length - 1], pb = box(pin);
  assert.ok(pb.min.x < -0.0303 && pb.max.x > 0.0303, 'the pin stands proud both sides');
});

test('floatingParts catches a screw 2 mm off the face', () => {
  const gun = new THREE.Group(); gun.add(slab(0.06, 0.08, 0.2));
  const barrel = slab(0.02, 0.02, 0.3); barrel.position.z = 0.2; gun.add(barrel);   // touches the body, as a gun's parts do
  const loose = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.0016, 12), new THREE.MeshStandardMaterial());
  loose.rotation.z = Math.PI / 2; loose.position.set(0.0328, 0, 0); gun.add(loose);
  assert.equal(floatingParts(THREE, gun).length, 1);
});

test('a row places count parts pitch apart along the axis', () => {
  const D = gunDetail(ctx);
  const gun = new THREE.Group(); gun.add(slab(0.06, 0.08, 0.2));
  const out = D.row(3, 0.02, 'z', 0.03, 0, 0, (x, y, z) => D.screw(gun, x, y, z, { axis: 'x', side: 1 }));
  assert.equal(out.length, 3);
  assert.ok(Math.abs(out[0].position.z - (-0.02)) < 1e-9 && Math.abs(out[2].position.z - 0.02) < 1e-9);
});

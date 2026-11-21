// CB-369: node --test core/static-batch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import { staticBatchTree } from './static-batch.js';

globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => null }) };
const { makeVaultModel } = await import('../studio/relay-vault-model.js');

// Every drawn triangle in world space, by material and shadow flags, as moments with a tolerance: the count, the sum
// of centroids and of their squares, and the sum of area vectors (winding) and of area vector x centroid.
function tris(root, { shadow = false } = {}) {
  root.updateMatrixWorld(true);
  const out = new Map(), A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
  root.traverseVisible((m) => {
    if (!m.isMesh) return;
    if (shadow && !m.castShadow) return;
    const g = m.geometry, P = g.attributes.position, idx = g.index, n = idx ? idx.count : P.count;
    const flip = m.matrixWorld.determinant() < 0;
    const key = (m.material.userData.ord ?? m.material.uuid) + (shadow ? '' : '|' + m.castShadow + '|' + m.receiveShadow);
    if (!out.has(key)) out.set(key, new Array(20).fill(0));
    const s = out.get(key);
    for (let k = 0; k < n; k += 3) {
      const ids = [0, 1, 2].map((j) => (idx ? idx.getX(k + j) : k + j));
      if (flip) ids.reverse();
      A.fromBufferAttribute(P, ids[0]).applyMatrix4(m.matrixWorld); B.fromBufferAttribute(P, ids[1]).applyMatrix4(m.matrixWorld); C.fromBufferAttribute(P, ids[2]).applyMatrix4(m.matrixWorld);
      const cx = (A.x + B.x + C.x) / 3, cy = (A.y + B.y + C.y) / 3, cz = (A.z + B.z + C.z) / 3;
      e1.subVectors(B, A); e2.subVectors(C, A); e1.cross(e2);
      s[0]++; s[1] += cx; s[2] += cy; s[3] += cz; s[4] += cx * cx; s[5] += cy * cy; s[6] += cz * cz;
      s[7] += e1.x; s[8] += e1.y; s[9] += e1.z; s[10] += e1.x * cx; s[11] += e1.y * cy; s[12] += e1.z * cz; s[13] += e1.length();
    }
    // shading: world normals (and normal x position) and uvs, per vertex used
    const N = g.attributes.normal, U = g.attributes.uv, nm = new T.Matrix3().getNormalMatrix(m.matrixWorld);
    for (let k = 0; k < n; k++) {
      const i = idx ? idx.getX(k) : k;
      A.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); B.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
      s[14] += A.x; s[15] += A.y; s[16] += A.z; s[17] += A.dot(B);
      if (U) { s[18] += U.getX(i); s[19] += U.getY(i); }
    }
  });
  return out;
}
const countMeshes = (root, shadow = false) => { let n = 0; root.traverseVisible((m) => { if (m.isMesh && (!shadow || m.castShadow)) n++; }); return n; };
const same = (a, b) => { assert.deepEqual([...a.keys()].sort(), [...b.keys()].sort()); for (const [k, v] of a) { const w = b.get(k); v.forEach((x, i) => assert.ok(Math.abs(x - w[i]) <= 1e-6 * Math.max(1, Math.abs(x)) * Math.max(1, v[0]), `set ${k} moment ${i}: ${x} vs ${w[i]}`)); } };

function vault() {
  const V = makeVaultModel({ THREE: T, makeKatana: () => { const k = new T.Group(); k.add(new T.Mesh(new T.BoxGeometry(1, 0.02, 0.02), new T.MeshStandardMaterial())); k.add(new T.Mesh(new T.BoxGeometry(0.2, 0.03, 0.03), new T.MeshStandardMaterial())); return k; } });
  V.group.position.set(12, 3, -7); V.group.rotation.y = 0.7;
  let n = 0; V.group.traverse((m) => { if (m.isMesh && m.material.userData.ord == null) m.material.userData.ord = 'm' + n++; });
  return V;
}

test('the relay vault draws the same triangles in far fewer meshes, in every state', () => {
  const A = vault(), B = vault();
  const before = countMeshes(B.group), beforeSh = countMeshes(B.group, true);
  const r = staticBatchTree(T, B.group, { skip: new Set([B.rewards.katanaStand.userData.katana]) });
  const after = countMeshes(B.group), afterSh = countMeshes(B.group, true);
  console.log(`vault meshes drawn ${before} -> ${after}, shadow casters ${beforeSh} -> ${afterSh}; merged ${r.removed} into ${r.merged}`);
  assert.ok(after <= before * 0.45, `main draws ${before} -> ${after}`);
  assert.ok(afterSh <= beforeSh * 0.45, `shadow draws ${beforeSh} -> ${afterSh}`);
  const states = [
    () => {},
    (V) => V.setCutaway(true),
    (V) => { V.setCutaway(false); V.setDoor(0.6); V.setLift(0.3); },
    (V) => { V.setDoor(1); V.setLift(1); V.rewards.crate.visible = true; V.rewards.rack.visible = V.rewards.case.visible = true; },
    (V) => { V.rewards.crate.visible = false; V.rewards.katanaStand.visible = true; V.setCutaway(true); }
  ];
  for (const s of states) { s(A); s(B); same(tris(A.group), tris(B.group)); same(tris(A.group, { shadow: true }), tris(B.group, { shadow: true })); }
  // the api's groups are still the same objects in the same places
  for (const k of ['door', 'lift', 'roof', 'front', 'walls']) assert.ok(B[k].parent, k);
  assert.ok(B.rewards.katanaStand.userData.katana.parent === B.rewards.katanaStand);
});

test('mirrored, non-indexed and lone parts', () => {
  const m = new T.MeshStandardMaterial(), g = new T.Group();
  const a = new T.Mesh(new T.BoxGeometry(1, 1, 1), m); a.position.x = 2; g.add(a);
  const b = new T.Mesh(new T.BoxGeometry(1, 2, 1).toNonIndexed(), m); b.scale.x = -1; b.rotation.z = 0.3; g.add(b);
  const c = new T.Mesh(new T.SphereGeometry(1, 6, 4), new T.MeshStandardMaterial()); g.add(c);   // alone in its set: stays
  const s = new T.Mesh(new T.BoxGeometry(1, 1, 1), m); s.castShadow = true; g.add(s);   // other shadow flag: alone, stays
  const ref = g.clone(true);
  const r = staticBatchTree(T, g);
  assert.equal(r.merged, 1); assert.equal(r.removed, 2);
  assert.equal(g.children.length, 3);
  assert.ok(g.children.includes(c) && g.children.includes(s));
  same(tris(ref), tris(g));
  // a frozen merged mesh still follows its group
  g.position.set(1, 2, 3); ref.position.set(1, 2, 3); same(tris(ref), tris(g));
});

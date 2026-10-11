// CL-140: node --test core/skin-merge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import { skinMergeGroup, skinUnmerge, skinSignature } from './skin-merge.js';

function rig() {
  const g = new T.Group(); g.position.set(3, 0, -2);
  const fur = new T.MeshStandardMaterial({ color: 0x804020 }), belly = new T.MeshStandardMaterial({ color: 0xffeedd });
  const body = new T.Mesh(new T.SphereGeometry(0.1, 7, 6), fur); body.scale.set(1, 0.9, 1.3); g.add(body);
  const head = new T.Mesh(new T.SphereGeometry(0.06, 6, 5), fur); head.position.set(0, 0.06, 0.12); g.add(head);
  const chest = new T.Mesh(new T.SphereGeometry(0.07, 6, 5), belly); chest.position.set(0, -0.03, 0.03); g.add(chest);
  const pivot = new T.Group(); pivot.position.set(0.03, 0.1, 0.1); g.add(pivot);
  const ear = new T.Mesh(new T.CapsuleGeometry(0.02, 0.08, 3, 6), fur); ear.position.y = 0.05; pivot.add(ear);
  const glow = new T.Mesh(new T.SphereGeometry(0.01, 4, 3), new T.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 })); g.add(glow);
  return { g, body, head, chest, pivot, ear, glow };
}
const worldPts = (mesh) => { mesh.updateMatrixWorld(true); const P = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry).attributes.position, out = []; const v = new T.Vector3(); for (let i = 0; i < P.count; i++) out.push(v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld).clone()); return out; };
const skinPts = (skin) => { skin.updateMatrixWorld(true); skin.skeleton.update(); const P = skin.geometry.attributes.position, out = []; const v = new T.Vector3(); for (let i = 0; i < P.count; i++) { skin.getVertexPosition(i, v); out.push(v.applyMatrix4(skin.matrixWorld).clone()); } return out; };
const near = (a, b) => a.distanceTo(b) < 1e-5;

test('parts become one mesh per material set; the glowing part is left alone', () => {
  const R = rig(); const scene = new T.Scene(); scene.add(R.g);
  const out = skinMergeGroup(T, R.g, { name: 'test-skin' });
  assert.ok(out && out.meshes.length === 1, 'fur and belly share textures (none) so they are one mesh');
  assert.equal(out.parts.length, 4);
  assert.equal(R.glow.visible, true); assert.equal(R.body.visible, false); assert.equal(R.body.userData.skinSrc, true);
  assert.ok(out.meshes[0].material.vertexColors);
});

test('the merged body is where the parts are, with the group moved and the ear pivot turned', () => {
  for (const bones of ['parent', 'self']) {
    const R = rig(); const scene = new T.Scene(); scene.add(R.g);
    const out = skinMergeGroup(T, R.g, { bones });
    const skin = out.meshes[0];
    R.g.position.set(-5, 1, 7); R.g.rotation.y = 1.1; R.pivot.rotation.x = -0.8; R.pivot.rotation.z = 0.3;
    if (bones === 'self') R.head.position.z += 0.05;
    scene.updateMatrixWorld(true);
    const sp = skinPts(skin);
    let k = 0, worst = 0;
    for (const part of out.parts) { for (const p of worldPts(part)) { worst = Math.max(worst, p.distanceTo(sp[k++])); } }
    assert.equal(k, sp.length);
    assert.ok(worst < 1e-4, bones + ': worst error ' + worst);
  }
});

test('with parent bones a part that moves on its own is not followed; with self bones it is', () => {
  const R = rig(); new T.Scene().add(R.g);
  const out = skinMergeGroup(T, R.g, { bones: 'parent' });
  R.head.position.z += 0.1; R.g.updateMatrixWorld(true);
  const sp = skinPts(out.meshes[0]); const hp = worldPts(R.head);
  const off = out.parts.indexOf(R.head); let start = 0; for (let i = 0; i < off; i++) { const ge = out.parts[i].geometry; start += ge.index ? ge.index.count : ge.attributes.position.count; }
  assert.ok(!near(hp[0], sp[start]), 'parent bones: the head moved alone, the skin did not');
});

test('a shadow-only proxy answers only to the shadow camera, and the parts stop casting', () => {
  const R = rig(); new T.Scene().add(R.g);
  R.body.castShadow = true; R.head.castShadow = true;
  const cam = new T.OrthographicCamera(), view = new T.PerspectiveCamera();
  const out = skinMergeGroup(T, R.g, { shadowOnly: true, bones: 'self', shadowCamera: cam, name: 'shadow' });
  assert.equal(out.meshes.length, 1);
  const s = out.meshes[0];
  assert.equal(s.layers.test(cam.layers), true); assert.equal(s.layers.test(view.layers), false);
  assert.equal(R.body.castShadow, false); assert.equal(R.body.visible, true, 'the part still draws itself');
  assert.ok(s.castShadow);
  assert.equal(out.parts.length, 5, 'the glowing part casts a shadow too');
  skinUnmerge(R.g);
  assert.equal(R.body.castShadow, true); assert.equal(R.g.children.includes(s), false);
});

test('the signature changes when a part is hidden or shown', () => {
  const R = rig();
  const a = skinSignature(R.g); R.head.visible = false; const b = skinSignature(R.g); R.head.visible = true; const c = skinSignature(R.g);
  assert.notEqual(a, b); assert.equal(a, c);
});

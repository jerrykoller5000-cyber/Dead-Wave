import assert from 'node:assert/strict';
import * as THREE from '../../../vendor/three/three.core.js';
import { createClock, createRecorder } from '../../../studio/inspector/timeline.js';
import { createOrbit } from '../../../studio/inspector/orbit.js';
import { createStage } from '../../../studio/inspector/stage.js';
import { countInfo, createResourceScope, marineSubject, modelSubject, zombieSubject } from '../../../studio/inspector/subjects.js';

let passed = 0;
const test = async (name, run) => { await run(); passed++; console.log('PASS ' + name); };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, a + ' != ' + b);
const disposed = (r) => { let n = 0; r.addEventListener('dispose', () => n++); return () => n; };
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, strokeRect() {} }) }) };

await test('clock pauses and runs exactly six 60 Hz steps', () => {
  const c = createClock(); c.pause(); assert.equal(c.held(), true); c.step(6);
  for (let i = 0; i < 6; i++) near(c.scale(0.045), 1 / 60);
  near(c.gameTime, 0.1); assert.equal(c.held(), true);
});
await test('zero steps does not unexpectedly advance time', () => { const c = createClock(); c.step(0); assert.equal(c.held(), true); });
await test('clock rejects non-finite and negative input without mutating state', () => {
  const c = createClock(); for (const v of [NaN, Infinity, -1]) assert.throws(() => c.scale(v), RangeError);
  for (const v of [NaN, Infinity, -1, 0]) assert.throws(() => c.speed(v), RangeError);
  for (const v of [NaN, Infinity, -1, 1.5, 3601]) assert.throws(() => c.step(v), RangeError);
  assert.equal(c.gameTime, 0); assert.equal(c.speed(), 1);
});
await test('clock speed agrees with the documented 0.05x to 2x range', () => {
  const c = createClock(); near(c.speed(0.001), 0.05); near(c.speed(9), 2); near(c.speed(0.25), 0.25);
});
await test('rewind restores pose and the present', () => {
  const rig = new THREE.Group(), child = new THREE.Group(); rig.add(child);
  const r = createRecorder(); r.reset(rig); child.position.x = 1; r.record(1); child.position.x = 2; r.record(2);
  assert.equal(r.show(1), 1); near(child.position.x, 1); assert.equal(r.scrubbing, true); r.live(); near(child.position.x, 2);
});
await test('rewind survives gun-style reparenting and restores both hierarchies', () => {
  const rig = new THREE.Group(), left = new THREE.Group(), right = new THREE.Group(), gun = new THREE.Group();
  rig.add(left, right); left.add(gun); const r = createRecorder(); r.reset(rig); r.record(1);
  right.add(gun); r.record(2); assert.equal(r.frames, 2); r.show(1); assert.equal(gun.parent, left); r.live(); assert.equal(gun.parent, right);
  rig.add(left); r.record(3); assert.equal(r.frames, 3);
});
await test('rewind ignores an entire opted-out subtree', () => {
  const rig = new THREE.Group(), ignored = new THREE.Group(); ignored.userData.dwiIgnore = true; ignored.add(new THREE.Group()); rig.add(ignored);
  const r = createRecorder(); r.reset(rig); r.record(1); assert.equal(r.info().nodes, 1);
});
await test('rewind capacity respects a small explicit budget and maxFrames', () => {
  const rig = new THREE.Group(); rig.add(new THREE.Group()); const r = createRecorder({ budgetMB: 0.001, maxFrames: 3 }); r.reset(rig);
  for (let i = 0; i < 6; i++) r.record(i); assert.equal(r.info().capacity, 3); assert.equal(r.frames, 3); assert.ok(r.info().mb <= 0.001);
});
await test('rewind rejects impossible budgets and non-finite frames', () => {
  for (const v of [NaN, Infinity, 0, -1, 513]) assert.throws(() => createRecorder({ budgetMB: v }), RangeError);
  for (const v of [NaN, 0, 0.5, 3601]) assert.throws(() => createRecorder({ maxFrames: v }), RangeError);
  const rig = new THREE.Group(), r = createRecorder(); r.reset(rig); assert.throws(() => r.record(NaN), RangeError); r.record(1);
  assert.throws(() => r.show(Infinity), RangeError); assert.throws(() => r.timeAt(NaN), RangeError); assert.equal(r.timeAt(0.1), 1);
});

function context() {
  const scene = new THREE.Scene(), T = { weaponMeshes: {} }, camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 150);
  let places = 0, view = null, viewSets = 0;
  const host = { scene, camera, THREE, sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), ambientFill: new THREE.AmbientLight(), moon: new THREE.DirectionalLight(),
    training: () => ({ tg: { group: new THREE.Group() } }), placePlayer: () => places++, builders: {} };
  T.renderer = { domElement: { clientWidth: 1280, clientHeight: 720 } }; T.camera = camera;
  T.getShotView = () => view; T.setShotView = (v) => { view = v; viewSets++; };
  const ix = { THREE, T, host, ctx: {}, drive: false, subject: null };
  return { ix, places: () => places, viewSets: () => viewSets };
}
await test('subject disposal releases new geometry, material and texture exactly once', () => {
  const { ix } = context(), scope = createResourceScope(ix), root = new THREE.Group();
  const g = new THREE.BoxGeometry(), t = new THREE.Texture(), m = new THREE.MeshBasicMaterial({ map: t });
  const dg = disposed(g), dt = disposed(t), dm = disposed(m); root.add(new THREE.Mesh(g, m)); ix.host.scene.add(root);
  scope.release(root); scope.release(root); assert.equal(dg(), 1); assert.equal(dt(), 1); assert.equal(dm(), 1); assert.equal(root.parent, null);
});
await test('subject disposal preserves detached game weapon resources', () => {
  const { ix } = context(), g = new THREE.BoxGeometry(), m = new THREE.MeshBasicMaterial(), t = new THREE.Texture(); m.map = t;
  ix.T.weaponMeshes.m4 = new THREE.Mesh(g, m); const dg = disposed(g), dm = disposed(m), dt = disposed(t);
  const scope = createResourceScope(ix), root = new THREE.Group(); root.add(new THREE.Mesh(g, m)); ix.host.scene.add(root); scope.release(root);
  assert.equal(dg(), 0); assert.equal(dm(), 0); assert.equal(dt(), 0);
});
await test('subject disposal respects explicit shared geometry and shared material maps', () => {
  const { ix } = context(), scope = createResourceScope(ix), g = new THREE.BoxGeometry(), m = new THREE.MeshBasicMaterial(), t = new THREE.Texture();
  g.userData.shared = true; m.userData.shared = true; m.map = t;
  const dg = disposed(g), dm = disposed(m), dt = disposed(t); const root = new THREE.Mesh(g, m); ix.host.scene.add(root); scope.release(root);
  assert.equal(dg(), 0); assert.equal(dm(), 0); assert.equal(dt(), 0);
});
await test('subject disposal preserves unattached materials from the game weapon context', () => {
  const { ix } = context(), m = new THREE.MeshBasicMaterial(), t = new THREE.Texture(); m.map = t; ix.host.builders.weaponContext = () => ({ gunBody: m });
  const scope = createResourceScope(ix), dm = disposed(m), dt = disposed(t); const root = new THREE.Mesh(new THREE.BoxGeometry(), m); ix.host.scene.add(root); scope.release(root);
  assert.equal(dm(), 0); assert.equal(dt(), 0);
});
await test('subject disposal preserves resources borrowed by a concurrently accepted model', () => {
  const { ix } = context(), scope = createResourceScope(ix), g = new THREE.BoxGeometry(), m = new THREE.MeshBasicMaterial(), dg = disposed(g), dm = disposed(m);
  const root = new THREE.Group(); root.add(new THREE.Mesh(g, m)); ix.host.scene.add(root, new THREE.Mesh(g, m)); scope.release(root);
  assert.equal(dg(), 0); assert.equal(dm(), 0);
});
await test('superseded async builders cannot relocate the marine or attach a stale model', async () => {
  const { ix, places } = context(); ix.stage = { center: { x: 10, y: 0, z: 20 }, measure: () => null };
  const g = new THREE.BoxGeometry(), dg = disposed(g), root = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  const result = await modelSubject(ix, { id: 'late', build: async () => root }, null, { isCurrent: () => false });
  assert.equal(result, null); assert.equal(places(), 0); assert.equal(ix.host.scene.children.length, 0); assert.equal(dg(), 1);
});
await test('failing model control initialization releases its resources', async () => {
  const { ix, places } = context(); ix.stage = { center: { x: 0, y: 0, z: 0 }, measure: () => null };
  const g = new THREE.BoxGeometry(), dg = disposed(g);
  await assert.rejects(() => modelSubject(ix, { id: 'bad', build: () => new THREE.Mesh(g, new THREE.MeshBasicMaterial()), controls: () => { throw Error('bad controls'); } }));
  assert.equal(ix.host.scene.children.length, 0); assert.equal(places(), 0); assert.equal(dg(), 1);
});
await test('failing model measurements release the already attached holder', async () => {
  const { ix } = context(); ix.stage = { center: { x: 0, y: 0, z: 0 }, measure: () => { throw Error('bad bounds'); } };
  const g = new THREE.BoxGeometry(), dg = disposed(g);
  await assert.rejects(() => modelSubject(ix, { id: 'bad', build: () => new THREE.Mesh(g, new THREE.MeshBasicMaterial()) }));
  assert.equal(ix.host.scene.children.length, 0); assert.equal(dg(), 1);
});
await test('statue respawn releases old resources while live zombies stay in the game pool', () => {
  const { ix } = context(); ix.stage = { center: { x: 0, y: 0, z: 0 } }; ix.T.clearZombies = () => {};
  const counts = []; ix.host.builders.zombie = () => { const g = new THREE.BoxGeometry(); counts.push(disposed(g)); return new THREE.Mesh(g, new THREE.MeshBasicMaterial()); };
  const s = zombieSubject(ix, { typeKey: 'shambler' }, 'statue'); s.respawn(); assert.equal(counts[0](), 1); s.dispose(); assert.equal(counts[1](), 1);
});

await test('camera rejects invalid settings without poisoning its existing view', () => {
  const { ix } = context(), o = createOrbit(ix); const before = o.state();
  for (const v of [NaN, Infinity]) assert.throws(() => o.set({ dist: v }), RangeError);
  assert.throws(() => o.view({ yaw: Infinity }), RangeError); assert.throws(() => o.view({ fov: 179 }), RangeError); assert.throws(() => o.view(null), TypeError);
  assert.deepEqual(o.state(), before);
});
await test('drive mode leaves the game camera released until inspection resumes', () => {
  const { ix, viewSets } = context(), o = createOrbit(ix); o.frame(); o.release(); const before = viewSets(); ix.drive = true; o.frame(); assert.equal(viewSets(), before);
  ix.drive = false; o.view('front', { instant: true }); o.frame(); assert.equal(viewSets(), before + 1);
});
await test('selecting a view restores following after an external tool camera', () => {
  const { ix } = context(); let x = 0; ix.subject = { live: true, entry: {}, focus: () => ({ center: { x, y: 1, z: 0 }, size: { x: 1, y: 2, z: 1 } }) };
  const o = createOrbit(ix); o.view('front', { instant: true }); o.frame(); ix.T.setShotView({ x: 0, y: 1, z: 5, tx: 0, ty: 1, tz: 0 }); o.frame(); assert.equal(o.follow(), false);
  o.view('front', { instant: true }); assert.equal(o.follow(), true); x = 2; o.frame(); near(o.state().tx, 2);
});

await test('bounds include InstancedMesh instance transforms', () => {
  const { ix } = context(), stage = createStage(ix), mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), 2);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 0, 0)); mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(10, 0, 0));
  const b = stage.measure(mesh); near(b.size.x, 11); near(b.max.x, 10.5); stage.dispose();
});
await test('bounds refresh after the vertex buffer changes', () => {
  const { ix } = context(), stage = createStage(ix), mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  near(stage.measure(mesh).size.x, 1); const p = mesh.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * 3); p.needsUpdate = true;
  near(stage.measure(mesh).size.x, 3); stage.dispose();
});
await test('bounds do not resurrect hidden or NaN geometry', () => {
  const { ix } = context(), stage = createStage(ix), root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()); root.add(mesh); mesh.visible = false;
  assert.equal(stage.measure(root), null); mesh.visible = true; mesh.position.z = NaN; assert.equal(stage.measure(root), null); stage.dispose();
});
await test('bounds and visible statistics exclude shadow-only skins without CPU-skinning them', () => {
  const { ix } = context(), stage = createStage(ix), root = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial());
  body.position.set(2, 1, -3); root.add(body);
  const shadow = new THREE.SkinnedMesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial()); let skinned = 0;
  shadow.name = 'marine-shadow'; shadow.layers.test = () => false; shadow.computeBoundingBox = () => { skinned++; shadow.boundingBox = new THREE.Box3(new THREE.Vector3(-50, -50, -50), new THREE.Vector3(50, 50, 50)); }; root.add(shadow);
  const b = stage.measure(root); assert.equal(skinned, 0); near(b.min.x, 1.5); near(b.max.y, 2); near(b.size.z, 1);
  const info = countInfo(root, ix.host.camera); assert.equal(info.meshes, 1); assert.equal(info.tris, 12); assert.equal(countInfo(root).meshes, 2); stage.dispose();
});
await test('visible skinned geometry still measures its actual moved bones', () => {
  const { ix } = context(), stage = createStage(ix), geometry = new THREE.BoxGeometry(1, 1, 1), count = geometry.attributes.position.count;
  const indices = new Uint16Array(count * 4), weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4)); geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial()), bone = new THREE.Bone(); mesh.add(bone); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton([bone]));
  near(stage.measure(mesh).center.x, 0); bone.position.x = 3; const moved = stage.measure(mesh); near(moved.min.x, 2.5); near(moved.max.x, 3.5); stage.dispose();
});
await test('pose bounds include all eight transformed corners and cache unchanged local geometry', () => {
  const { ix } = context(), stage = createStage(ix), root = new THREE.Group(), geometry = new THREE.BoxGeometry(0.8, 1.8, 0.6), mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.position.set(0.3, 0.9, -0.1); root.add(mesh); root.position.set(4, 0.7, -2); root.rotation.set(0.8, 0.3, -0.6);
  let boxes = 0; const compute = geometry.computeBoundingBox.bind(geometry); geometry.computeBoundingBox = () => { boxes++; compute(); };
  const b = stage.measure(root); for (const x of [-0.4, 0.4]) for (const y of [-0.9, 0.9]) for (const z of [-0.3, 0.3]) {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld); assert.ok(p.x >= b.min.x - 1e-7 && p.x <= b.max.x + 1e-7); assert.ok(p.y >= b.min.y - 1e-7 && p.y <= b.max.y + 1e-7); assert.ok(p.z >= b.min.z - 1e-7 && p.z <= b.max.z + 1e-7);
  }
  stage.measure(root); assert.equal(boxes, 1); root.rotation.x += 0.6; assert.notEqual(stage.measure(root).size.y, b.size.y); assert.equal(boxes, 1); stage.dispose();
});
await test('axes use the model world position and orientation inside its stage holder', () => {
  const { ix } = context(), stage = createStage(ix); ix.stage = stage; stage.placeAt(10, 0, -20); ix.orbit = { cam: () => ({ x: 10, y: 2, z: -15 }) };
  const holder = new THREE.Group(), root = new THREE.Group(); holder.position.set(10, 0, -20); holder.rotation.y = 0.5; root.position.set(0, 1, 2); holder.add(root); ix.host.scene.add(holder);
  ix.subject = { origin: () => root, focus: () => ({ center: { x: 10, y: 1, z: -20 }, size: { x: 1, y: 2, z: 1 } }) };
  stage.overlays.set('axes', true); stage.frame(0, ix.subject.focus()); const axes = stage.overlay.children.find((o) => o.visible && o.isLineSegments && o.geometry.attributes.color);
  const p = root.getWorldPosition(new THREE.Vector3()); near(axes.position.x, p.x - 10); near(axes.position.y, p.y); near(axes.position.z, p.z + 20); near(axes.quaternion.angleTo(root.getWorldQuaternion(new THREE.Quaternion())), 0); stage.dispose();
});
await test('stage teardown releases overlays, floor materials and hidden grid texture', () => {
  const { ix } = context(), stage = createStage(ix); ix.host.scene.add(stage.group);
  const floor = stage.group.getObjectByName('inspector-floor'), grid = floor.material.map, textureDisposes = disposed(grid), materialDisposes = disposed(floor.material);
  const overlayGeo = stage.overlay.children[0].geometry, overlayDisposes = disposed(overlayGeo); stage.grid(false); stage.dispose(); stage.dispose();
  assert.equal(textureDisposes(), 1); assert.equal(materialDisposes(), 1); assert.equal(overlayDisposes(), 1); assert.equal(stage.group.parent, null);
});
await test('point and line geometry do not inflate the triangle count', () => {
  const root = new THREE.Group(), geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
  root.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial()), new THREE.Points(geometry, new THREE.PointsMaterial()));
  const info = countInfo(root); assert.equal(info.tris, 0); assert.equal(info.points, 2); assert.equal(info.segments, 1); assert.equal(info.drawables, 2);
});

function marineContext() {
  const { ix } = context(), P = new THREE.Group(), marine = new THREE.Group(); P.add(marine); ix.host.scene.add(P); ix.T.player = P; ix.T.marine = marine;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.6), new THREE.MeshBasicMaterial()); body.position.y = 0.9; marine.add(body);
  const positions = { headG: [0, 1.22, 0], torsoG: [0, 0.7, 0], gripL: [-0.2, 0.88, 0.24], gripR: [0.2, 0.88, 0.24], ankleLG: [-0.13, 0.1, 0], ankleRG: [0.13, 0.1, 0], kneeLG: [-0.13, 0.35, 0], kneeRG: [0.13, 0.35, 0] };
  for (const [k, p] of Object.entries(positions)) { const g = new THREE.Group(); g.position.set(...p); marine.add(g); marine.userData[k] = g; }
  let measurements = 0; ix.stage = { center: { x: 0, y: 0, z: 0 }, measure: (o) => { measurements++; const box = new THREE.Box3().setFromObject(o); const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()); return { center: { ...center }, size: { ...size }, min: { ...box.min }, max: { ...box.max } }; } };
  ix.subject = marineSubject(ix, { id: 'marine', kind: 'marine' });
  return { ix, P, marine, measurements: () => measurements };
}
await test('marine focus fits the real prone rig instead of a fixed upright box', () => {
  const { ix, P } = marineContext(); const upright = ix.subject.focus(true); near(upright.size.y, 1.8); P.rotation.x = Math.PI / 2;
  const prone = ix.subject.focus(true); near(prone.size.y, 0.6); near(prone.size.z, 1.8); near(prone.center.y, 0);
  const o = createOrbit(ix); o.view('full', { instant: true }); near(o.state().ty, prone.center.y); assert.ok(o.state().dist >= 3.1);
});
await test('marine bounds measurement is throttled while joint centers follow every frame', () => {
  const previous = globalThis.performance; let now = 0; globalThis.performance = { now: () => now };
  try {
    const { ix, P, measurements } = marineContext(); const f = ix.subject.focus(); for (let i = 0; i < 20; i++) ix.subject.focus(); assert.equal(measurements(), 1);
    P.position.y = 2; near(ix.subject.focus().center.y, f.center.y + 2); assert.equal(measurements(), 1);
    now = 101; ix.subject.focus(); assert.equal(measurements(), 2); ix.subject.focus(true); assert.equal(measurements(), 3);
  } finally { globalThis.performance = previous; }
});
await test('head and hands bookmarks follow posed world joints during a dive', () => {
  const { ix, P, marine } = marineContext(), o = createOrbit(ix); o.view('head', { instant: true }); o.frame();
  P.rotation.x = Math.PI / 2; P.position.set(2, 0.4, -3); o.frame(); const head = marine.userData.headG.localToWorld(new THREE.Vector3(0, 0.22, 0.04));
  near(o.state().tx, head.x); near(o.state().ty, head.y); near(o.state().tz, head.z);
  o.view('hands', { instant: true }); const left = marine.userData.gripL.getWorldPosition(new THREE.Vector3()), right = marine.userData.gripR.getWorldPosition(new THREE.Vector3());
  near(o.state().tx, (left.x + right.x) / 2); near(o.state().ty, (left.y + right.y) / 2); near(o.state().tz, (left.z + right.z) / 2);
});
await test('hands bookmark widens for separated grips without per-frame breathing zoom', () => {
  const { ix, marine } = marineContext(); marine.userData.gripL.position.x = -1; marine.userData.gripR.position.x = 1;
  const o = createOrbit(ix); o.view('hands', { instant: true }); const distance = o.state().dist; assert.ok(distance > 0.85);
  marine.userData.gripL.position.y += 0.02; o.frame(); near(o.state().dist, distance);
});
await test('follow state retains an anatomical bookmark through sheet-style camera changes', () => {
  const { ix, marine } = marineContext(), o = createOrbit(ix); o.view('head', { instant: true }); const state = o.followState();
  o.view({ yaw: 180, pitch: 12 }, { instant: true }); assert.equal(o.followState().bookmark, null); o.restoreFollow(state); assert.equal(o.followState().bookmark, 'head');
  marine.userData.headG.position.x = 0.4; o.frame(); near(o.state().tx, 0.4);
});
await test('a corrupt joint transform cannot poison the camera bookmark', () => {
  const { ix, marine } = marineContext(); marine.userData.headG.quaternion.x = NaN; const o = createOrbit(ix); o.view('head', { instant: true });
  assert.ok(['tx', 'ty', 'tz', 'az', 'el', 'dist'].every((k) => Number.isFinite(o.state()[k])));
});
await test('restored turntable yaw updates its internal spin before the next tick', async () => {
  const { ix } = context(); ix.stage = { center: { x: 0, y: 0, z: 0 }, measure: () => null };
  const s = await modelSubject(ix, { id: 'turntable', build: () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()) });
  s.turntable = 0.5; s.setYaw(1.2); s.update(0.1); near(s.holder.rotation.y, 1.25); assert.throws(() => s.setYaw(NaN)); near(s.holder.rotation.y, 1.25); s.dispose();
});

console.log('RESULT ' + passed + ' runtime checks passed');

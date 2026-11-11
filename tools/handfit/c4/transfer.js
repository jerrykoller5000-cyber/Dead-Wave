// CD-1 pass 2: a hand set on a grip the way it sits on another gun's grip (the launcher's firing hand from the pistol's:
// both grips are the same moulding, gripShape/shapedGrip, raked 0.3). Each grip's frame from its own numbers (the top of
// its centre line, up its axis, forward to the front strap), in the world and metric (the gun's scale taken out); the
// hand's place on the first grip carried onto the second; then applied (info.tune) and iterated as apply7 does.
// placeholders: FROM KEY SD FG TG (grip: [cz, cy, h, d, rake, vmid]) DY (mm along the axis, + up) POSE EXPORT
const from = '%FROM%', key = '%KEY%', sd = '%SD%', FG = %FG%, TG = %TG%, DY = %DY% / 1000;
const THREE = T.THREE || window.THREE;
const settle = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 30); };
const __mi = T.marineIdleDbg && T.marineIdleDbg();
const hold = async (k) => { __mi && __mi.reset && __mi.reset(); vm().info.tune = {}; vm().retune(); T.flightHold(false); await __take(k); T.player.position.copy(window.__home); T.flightHold(true); T.setOtsAimDbg && T.setOtsAimDbg(0, -0.25);
  for (let i = 0; i < 240 && !(vm().info.active && vm().info.key === k && vm().info.raise > 0.999); i++) T.stepFrame(1 / 60);
  settle(45); __mi && __mi.reset && __mi.reset(); settle(2); vm().root.updateMatrixWorld(true); };
// the grip's frame in the world, rigid and metric: origin the top of the centre line, y up the axis, z to the front strap
const gripFrame = (W, g) => {
  const [cz, cy, h, d, rake, vm0] = g, sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08, vv = vm0 * k;
  const o = new THREE.Vector3(0, cy + 0.5 * h * cr - vv * sr, cz + 0.5 * h * sr + vv * cr).applyMatrix4(W);
  const up = new THREE.Vector3(0, cr, sr).transformDirection(W), fw = new THREE.Vector3(0, -sr, cr).transformDirection(W);
  const sx = new THREE.Vector3().crossVectors(up, fw).normalize();
  return new THREE.Matrix4().makeBasis(sx, up, fw).setPosition(o);
};
const rigid = (M) => { const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); M.decompose(p, q, s); return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)); };
// the first grip's relation: measured here (MODE 'rel': take that gun, return the hand on its grip and stop), or given (REL)
const MODE = '%MODE%', RELIN = %REL%;
let V, Rel, fromInfo = null;
if (MODE === 'rel') {
  await hold(from); V = vm();
  const Gp = gripFrame(V.gun.root.matrixWorld, FG), Hp = V.arms[sd].meshes.glove.matrixWorld.clone();   // as drawn (fakethree's decompose and scale reads are no-ops)
  Rel = new THREE.Matrix4().copy(Gp).invert().multiply(Hp);
  return { from, rel: Rel.elements.map((x) => +x.toFixed(6)), det: V.gun.root.matrixWorld.determinant(), hdet: Hp.determinant() };
}
Rel = new THREE.Matrix4().fromArray(RELIN);
await hold(key);
V = vm(); const A = V.arms[sd], L = A.layout;
const Gl = gripFrame(V.gun.root.matrixWorld, TG).multiply(new THREE.Matrix4().makeTranslation(0, DY, 0));
const Hw = new THREE.Matrix4().copy(Gl).multiply(Rel);   // the glove's wanted world matrix
const Gi = new THREE.Matrix4().copy(V.gun.root.matrixWorld).invert();
const Atgt = Gi.clone().multiply(Hw);
const measure = () => { V.root.updateMatrixWorld(true); return new THREE.Matrix4().copy(V.gun.root.matrixWorld).invert().multiply(A.meshes.glove.matrixWorld); };
const grip = new THREE.Vector3(L.grip[0], L.grip[1], L.grip[2]), want = grip.clone().applyMatrix4(Atgt);
const dirOf = (M, v) => new THREE.Vector3(v[0], v[1], v[2]).transformDirection(M);
const tune = V.info.tune[key] = V.info.tune[key] || {};
const fit0 = (window.__VMFIT || null);
const POSE = %POSE%;
if (POSE) tune[sd === 'r' ? 'poseR' : 'poseL'] = POSE;
let bx = dirOf(Atgt, [1, 0, 0]), by = dirOf(Atgt, [0, 1, 0]), p = want.clone();
const log = [];
for (let it = 0; it < 4; it++) {
  tune[sd] = { basis: { x: bx.toArray(), y: by.toArray() }, p: p.toArray() };
  V.retune(); settle(20); window.gc && window.gc();
  const Acur = measure(), cur = grip.clone().applyMatrix4(Acur);
  const ex = dirOf(Acur, [1, 0, 0]), ey = dirOf(Acur, [0, 1, 0]), tx = dirOf(Atgt, [1, 0, 0]), ty = dirOf(Atgt, [0, 1, 0]);
  const angErr = Math.acos(Math.min(1, ex.dot(tx))) + Math.acos(Math.min(1, ey.dot(ty))), posErr = cur.distanceTo(want);
  log.push([+(posErr * 1000).toFixed(2), +angErr.toFixed(4)]);
  if (posErr < 0.0002 && angErr < 0.004) break;
  const Mc = new THREE.Matrix4().makeBasis(ex, ey, new THREE.Vector3().crossVectors(ex, ey).normalize()), Mt = new THREE.Matrix4().makeBasis(tx, ty, new THREE.Vector3().crossVectors(tx, ty).normalize());
  const Dq = new THREE.Quaternion().setFromRotationMatrix(Mt.clone().multiply(Mc.clone().invert()));
  bx.applyQuaternion(Dq).normalize(); by.applyQuaternion(Dq).normalize();
  p.add(want.clone().sub(cur));
}
const r5 = (v) => v.map((x) => +x.toFixed(5));
const init = { basis: { x: r5(bx.toArray()), y: r5(by.toArray()) }, p: r5(p.toArray()), pose: tune[sd === 'r' ? 'poseR' : 'poseL'] || null };
%EXPORT%
if (__exp && __exp.__file) { const f = {}; for (const [k, val] of Object.entries(__exp.__file)) f[key + '-' + sd + '-init.json'] = val; __exp.__file = f; }
return { ...__exp, init, iters: log, fromInfo, det: V.gun.root.matrixWorld.determinant() };

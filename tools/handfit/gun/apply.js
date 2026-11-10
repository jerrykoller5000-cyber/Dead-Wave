const key = '%KEY%', sd = '%SD%', RES = %RES%;
const THREE = T.THREE || window.THREE;
const settle = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 30); };
const __mi = T.marineIdleDbg && T.marineIdleDbg(); __mi && __mi.reset && __mi.reset();
vm().info.tune = {}; vm().retune(); T.flightHold(false); await __take(key); T.player.position.copy(window.__home); T.flightHold(true); T.setOtsAimDbg && T.setOtsAimDbg(0, -0.25);
for (let i = 0; i < 240 && !(vm().info.active && vm().info.key === key && vm().info.raise > 0.999); i++) T.stepFrame(1 / 60);
settle(45); __mi && __mi.reset && __mi.reset(); settle(2);
const V = vm(), A = V.arms[sd], L = A.layout, s = L.side;
const measure = () => { V.root.updateMatrixWorld(true); return new THREE.Matrix4().copy(V.gun.root.matrixWorld).invert().multiply(A.meshes.glove.matrixWorld); };
const Aold = measure();
// the solve's move, in the hand's layout: h -> Ms R Ms (h - O) - Ms R (C + D) + Ms C + O
const [a, b, c] = [RES.turn[0] || 0, RES.turn[1] || 0, RES.turn[2] || 0], D = RES.move.map((v) => v / 1000), C = [0, -0.271, 0.008];
const R1 = [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]], R2 = [[Math.cos(b), Math.sin(b), 0], [-Math.sin(b), Math.cos(b), 0], [0, 0, 1]], R3 = [[1, 0, 0], [0, Math.cos(c), Math.sin(c)], [0, -Math.sin(c), Math.cos(c)]];
const mm = (X, Y) => X.map((r) => [0, 1, 2].map((j) => r[0] * Y[0][j] + r[1] * Y[1][j] + r[2] * Y[2][j])), mv = (X, v) => X.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const R = mm(R3, mm(R2, R1)), Ms = [[s, 0, 0], [0, 1, 0], [0, 0, 1]], Lin = mm(Ms, mm(R, Ms)), O = [L.ox, 0, L.gz];
const t1 = mv(Lin, O), t2 = mv(mm(Ms, R), [C[0] + D[0], C[1] + D[1], C[2] + D[2]]), t3 = mv(Ms, C), tr = [0, 1, 2].map((k) => -t1[k] - t2[k] + t3[k] + O[k]);
const N = new THREE.Matrix4().set(Lin[0][0], Lin[0][1], Lin[0][2], tr[0], Lin[1][0], Lin[1][1], Lin[1][2], tr[1], Lin[2][0], Lin[2][1], Lin[2][2], tr[2], 0, 0, 0, 1);
const Atgt = Aold.clone().multiply(N);
const grip = new THREE.Vector3(L.grip[0], L.grip[1], L.grip[2]), want = grip.clone().applyMatrix4(Atgt);
const dirOf = (M, v) => new THREE.Vector3(v[0], v[1], v[2]).transformDirection(M);
const tune = V.info.tune[key] = V.info.tune[key] || {};
tune[sd === 'r' ? 'poseR' : 'poseL'] = RES.pose;
let bx = dirOf(Atgt, [1, 0, 0]), by = dirOf(Atgt, [0, 1, 0]), p = want.clone();
const log = [];
for (let it = 0; it < 5; it++) {
  tune[sd] = { basis: { x: bx.toArray(), y: by.toArray() }, p: p.toArray() };
  V.retune(); settle(50);
  const Acur = measure(), cur = grip.clone().applyMatrix4(Acur);
  const ex = dirOf(Acur, [1, 0, 0]), ey = dirOf(Acur, [0, 1, 0]), tx = dirOf(Atgt, [1, 0, 0]), ty = dirOf(Atgt, [0, 1, 0]);
  const angErr = Math.acos(Math.min(1, ex.dot(tx))) + Math.acos(Math.min(1, ey.dot(ty))), posErr = cur.distanceTo(want);
  log.push([+(posErr * 1000).toFixed(2), +angErr.toFixed(4)]);
  if (posErr < 0.0002 && angErr < 0.004) break;
  // the turn still missing, in the gun's space: from the drawn axes to the wanted ones
  const Mc = new THREE.Matrix4().makeBasis(ex, ey, new THREE.Vector3().crossVectors(ex, ey).normalize()), Mt = new THREE.Matrix4().makeBasis(tx, ty, new THREE.Vector3().crossVectors(tx, ty).normalize());
  const Dq = new THREE.Quaternion().setFromRotationMatrix(Mt.clone().multiply(Mc.clone().transpose()));
  bx.applyQuaternion(Dq).normalize(); by.applyQuaternion(Dq).normalize();
  p.add(want.clone().sub(cur));
}
const r5 = (v) => v.map((x) => +x.toFixed(5));
const out = { key, sd, final: { basis: { x: r5(bx.toArray()), y: r5(by.toArray()) }, p: r5(p.toArray()), pose: RES.pose }, iters: log, authored: (() => { const S = (window.__VMS || null); return null; })() };
return out;

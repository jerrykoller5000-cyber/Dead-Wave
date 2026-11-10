// CD-1 (c): a support hand set round the handguard (a wrap, not a cradle): the hand's grip channel turned onto the bore,
// its palm kept on the side it cradles from, the channel put on the handguard's axis at the hand's place along the gun;
// then the gun and hands exported for the field and the solve. %KEY% %SD% %CURL%
const key = '%KEY%', sd = '%SD%', CURL = %CURL%;
const THREE = T.THREE || window.THREE;
const settle = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 30); };
const __mi = T.marineIdleDbg && T.marineIdleDbg(); __mi && __mi.reset && __mi.reset();
vm().info.tune = {}; vm().retune(); T.flightHold(false); await __take(key); T.player.position.copy(window.__home); T.flightHold(true); T.setOtsAimDbg && T.setOtsAimDbg(0, -0.25);
for (let i = 0; i < 240 && !(vm().info.active && vm().info.key === key && vm().info.raise > 0.999); i++) T.stepFrame(1 / 60);
settle(45); __mi && __mi.reset && __mi.reset(); settle(2);
const V = vm(), A = V.arms[sd], L = A.layout;
V.root.updateMatrixWorld(true);
const Gi = new THREE.Matrix4().copy(V.gun.root.matrixWorld).invert();
const Aold = Gi.clone().multiply(A.meshes.glove.matrixWorld);
const dirOf = (M, v) => new THREE.Vector3(v[0], v[1], v[2]).transformDirection(M);
const bx = dirOf(Aold, [1, 0, 0]), by = dirOf(Aold, [0, 1, 0]), bz = dirOf(Aold, [0, 0, 1]);
const p0 = new THREE.Vector3(L.grip[0], L.grip[1], L.grip[2]).applyMatrix4(Aold);
// CD-1: the hand round one part (a grip or a handle): the part's long axis (its vertices' principal axis, gun space), the
// channel turned onto it, the palm kept on its side, the channel on the part's section at the hand's place along it
const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
const meshes = []; V.gun.root.traverse((m) => { if (m.isMesh && m.geometry && m.geometry.attributes.position && vis(m)) meshes.push(m); });
const PM = meshes[%PART%], M = new THREE.Matrix4().copy(Gi).multiply(PM.matrixWorld), pa = PM.geometry.attributes.position, P = [];
for (let i = 0; i < pa.count; i++) { const u = new THREE.Vector3().fromBufferAttribute(pa, i).applyMatrix4(M); if (u.distanceTo(p0) < %NEAR%) P.push(u); }   // only the part near the hand (a part may be a grip and more)
const mu = P.reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(P.length);
const Cv = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (const q of P) { const d = [q.x - mu.x, q.y - mu.y, q.z - mu.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) Cv[i][j] += d[i] * d[j]; }
let ax = new THREE.Vector3(1, 1, 1).normalize(); for (let it = 0; it < 60; it++) { ax = new THREE.Vector3(Cv[0][0] * ax.x + Cv[0][1] * ax.y + Cv[0][2] * ax.z, Cv[1][0] * ax.x + Cv[1][1] * ax.y + Cv[1][2] * ax.z, Cv[2][0] * ax.x + Cv[2][1] * ax.y + Cv[2][2] * ax.z).normalize(); }
if (ax.dot(bx) < 0) ax.negate();
const q = new THREE.Quaternion().setFromUnitVectors(bx.clone().normalize(), ax);
const nx = bx.clone().applyQuaternion(q).normalize(), ny = by.clone().applyQuaternion(q), nz = bz.clone().applyQuaternion(q);
ny.addScaledVector(nx, -ny.dot(nx)).normalize(); nz.addScaledVector(nx, -nz.dot(nx)).normalize();
const wv = new THREE.Vector3().crossVectors(nx, nz).normalize();
const s0 = p0.clone().sub(mu).dot(ax); let z0 = 1e9, z1 = -1e9, w0 = 1e9, w1 = -1e9, n = 0;
for (const v of P) { const d = v.clone().sub(mu); const a = d.dot(nz), b = d.dot(wv); z0 = Math.min(z0, a); z1 = Math.max(z1, a); w0 = Math.min(w0, b); w1 = Math.max(w1, b); n++; }
if (!n) { z0 = z1 = w0 = w1 = 0; }
const ctr = mu.clone().addScaledVector(ax, s0).addScaledVector(nz, (z0 + z1) / 2).addScaledVector(wv, (w0 + w1) / 2), rn = (z1 - z0) / 2;
const p = ctr.clone().addScaledVector(nz, -(rn - 0.013));
const sect = { n, rn: +rn.toFixed(4), rw: +((w1 - w0) / 2).toFixed(4), turned: +Math.acos(Math.min(1, ax.dot(bx.clone().normalize()))).toFixed(3), axis: ax.toArray().map((x) => +x.toFixed(3)) };
const tune = V.info.tune[key] = V.info.tune[key] || {};
const fist = { f: [[1.412, 0.938, 0.84, 0], [1.495, 1.013, 0.943, 0], [1.425, 1.0, 0.899, 0], [1.212, 0.725, 0.693, 0]], t: [0.038, 0.563, 0.812, 0.863, 0.55, 0.337] };
const pose = { f: fist.f.map((r) => r.map((a, j) => (j < 3 ? +(a * CURL).toFixed(3) : 0))), t: fist.t.slice() };
tune[sd === 'r' ? 'poseR' : 'poseL'] = pose;
tune[sd] = { basis: { x: nx.toArray(), y: ny.toArray() }, p: p.toArray() };
V.retune(); settle(50);
const r5 = (a) => a.map((x) => +x.toFixed(5));
const init = { basis: { x: r5(nx.toArray()), y: r5(ny.toArray()) }, p: r5(p.toArray()), pose };
%EXPORT%
if (__exp && __exp.__file) { const f = {}; for (const [k, val] of Object.entries(__exp.__file)) f[key + '-' + sd + '-init.json'] = val; __exp.__file = f; }
return { ...__exp, init, sect };

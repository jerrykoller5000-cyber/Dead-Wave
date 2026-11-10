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
// the handguard's section at the hand's place along the bore (gun space, +z the bore)
const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
const v = new THREE.Vector3(), M = new THREE.Matrix4(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
V.gun.root.traverse((m) => { if (!m.isMesh || !m.geometry || !m.geometry.attributes.position || !vis(m)) return; M.copy(Gi).multiply(m.matrixWorld); const pa = m.geometry.attributes.position;
  for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(M); if (Math.abs(v.z - p0.z) > 0.012) continue; if (Math.hypot(v.x - p0.x, v.y - p0.y) > 0.09) continue; x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); n++; } });
const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
// turn the channel onto the bore (the nearer sign), the least turn
const bore = new THREE.Vector3(0, 0, bx.z >= 0 ? 1 : -1);
const q = new THREE.Quaternion().setFromUnitVectors(bx.clone().normalize(), bore);
const nx = bx.clone().applyQuaternion(q).normalize(), ny = by.clone().applyQuaternion(q), nz = bz.clone().applyQuaternion(q);
ny.addScaledVector(nx, -ny.dot(nx)).normalize(); nz.addScaledVector(nx, -nz.dot(nx)).normalize();
// the palm's distance from the axis along its normal, the channel 13 mm from a 26 mm bar's centre in the fist
const rn = Math.abs(nz.x) * rx + Math.abs(nz.y) * ry;
const p = new THREE.Vector3(cx, cy, p0.z).addScaledVector(nz, -(rn - 0.013));
const tune = V.info.tune[key] = V.info.tune[key] || {};
const fist = { f: [[1.412, 0.938, 0.84, 0], [1.495, 1.013, 0.943, 0], [1.425, 1.0, 0.899, 0], [1.212, 0.725, 0.693, 0]], t: [0.038, 0.563, 0.812, 0.863, 0.55, 0.337] };
const pose = { f: fist.f.map((r) => r.map((a, j) => (j < 3 ? +(a * CURL).toFixed(3) : 0))), t: fist.t.slice() };
tune[sd === 'r' ? 'poseR' : 'poseL'] = pose;
tune[sd] = { basis: { x: nx.toArray(), y: ny.toArray() }, p: p.toArray() };
V.retune(); settle(50);
const r5 = (a) => a.map((x) => +x.toFixed(5));
const init = { basis: { x: r5(nx.toArray()), y: r5(ny.toArray()) }, p: r5(p.toArray()), pose };
const sect = { cx: +cx.toFixed(4), cy: +cy.toFixed(4), rx: +rx.toFixed(4), ry: +ry.toFixed(4), n, turned: +Math.acos(Math.min(1, Math.abs(bx.z))).toFixed(3) };
%EXPORT%
if (__exp && __exp.__file) { const f = {}; for (const [k, val] of Object.entries(__exp.__file)) f[key + '-' + sd + '-init.json'] = val; __exp.__file = f; }
return { ...__exp, init, sect };

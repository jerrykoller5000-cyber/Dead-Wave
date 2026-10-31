const n = document.getElementById('playerName'); if (n) n.value = 'Probe';
document.getElementById('modeHunt').click();
for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
await wait(1500); T.runDevCommand('godmode'); T.grantAllWeapons && T.grantAllWeapons();
const THREE = T.THREE, out = {};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
for (const W of ['m4', 'ak', 'sniper', 'aa12', 'uzi', 'pistol']) {
  const gun = T.weaponMeshes[W], ud = gun.userData;
  if (!ud.mag) { out[W] = 'no mag'; continue; }
  gun.updateMatrixWorld(true);
  const gunInv = new THREE.Matrix4().copy(gun.matrixWorld).invert();
  // the magazine's own vertices in the gun's space
  const MV = [];
  ud.mag.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const m = new THREE.Matrix4().multiplyMatrices(gunInv, o.matrixWorld), pa = o.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) MV.push(V(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m)); });
  let mLo = V(1e9,1e9,1e9), mHi = V(-1e9,-1e9,-1e9);
  for (const q of MV) { mLo.min(q); mHi.max(q); }
  // the body, as triangles, magazine left out
  const skip = new Set([ud.mag, ud.suppressor, ud.flash, ud.flashLight, ud.laser, ud.heavyLook].filter(Boolean));
  const tris = [];
  const walk = (o) => { if (skip.has(o) || o.visible === false) return;
    if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
      const m = new THREE.Matrix4().multiplyMatrices(gunInv, o.matrixWorld), pa = o.geometry.attributes.position, idx = o.geometry.index, P = [];
      for (let i = 0; i < pa.count; i++) P.push(V(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m));
      const nn = idx ? idx.count : pa.count, gi = (i) => (idx ? (idx.getX ? idx.getX(i) : idx.array[i]) : i);
      for (let i = 0; i + 2 < nn; i += 3) tris.push([P[gi(i)], P[gi(i + 1)], P[gi(i + 2)]]); }
    for (const c of o.children) walk(c); };
  for (const c of gun.children) walk(c);
  // the well's opening: a slice of the body 4 mm above the magazine's top face, round its footprint
  const cx = (mLo.x + mHi.x) / 2, cz = (mLo.z + mHi.z) / 2;
  const rows = [];
  for (const dy of [0.004, 0.010, 0.020, 0.035, 0.050]) {
    const y = mHi.y + dy, pts = [];
    for (const t of tris) for (let e = 0; e < 3; e++) { const a = t[e], b = t[(e + 1) % 3];
      if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
      const u = (y - a.y) / (b.y - a.y), x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
      if (Math.abs(x - cx) < 0.07 && Math.abs(z - cz) < 0.09) pts.push([x, z]); }
    if (!pts.length) { rows.push({ dy, none: true }); continue; }
    rows.push({ dy, across: +((Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]))) * 1000).toFixed(1),
      depth: +((Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]))) * 1000).toFixed(1) });
  }
  out[W] = { magAcross: +((mHi.x - mLo.x) * 1000).toFixed(1), magDeep: +((mHi.z - mLo.z) * 1000).toFixed(1),
    magTop: +(mHi.y * 1000).toFixed(1), slices: rows };
}
return JSON.stringify(out, null, 1);
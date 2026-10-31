const n = document.getElementById('playerName'); if (n) n.value = 'Probe';
document.getElementById('modeHunt').click();
for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
await wait(1500); T.runDevCommand('godmode'); T.grantAllWeapons && T.grantAllWeapons();
const THREE = T.THREE;
const gun = T.weaponMeshes.uzi, ud = gun.userData;
gun.updateMatrixWorld(true);
const cz = -0.030, cy = -0.1, h = 0.16, d = 0.12, rake = 0.22;
const P = [[-0.04, 0.014], [0.12, 0.026], [0.36, 0.020], [0.62, 0.028], [0.86, 0.020], [1.0, 0.006], [1.02, -0.010], [0.90, -0.028], [0.60, -0.034], [0.30, -0.024], [0.08, -0.016], [-0.04, -0.028], [-0.07, -0.006]];
const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
const poly = P.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; });
const inside = (z, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) c = !c; } return c; };
const edge = (z, y) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((z - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))); m = Math.min(m, Math.hypot(z - ax - ex * t, y - ay - ey * t)); } return m; };
const HW = 0.039, R = 0.010;
const halfW = (m) => HW - (m >= R ? 0 : R - Math.sqrt(Math.max(0, R * R - (R - m) * (R - m))));
const uv2 = (z, y) => { const dz = z - cz, dy = y - cy; return [-(dz * sr + dy * cr) / h + 0.5, (dz * cr - dy * sr) / k]; };
const yTop = Math.max(...poly.map((p) => p[1])), yBot = Math.min(...poly.map((p) => p[1]));
const gunInv = new THREE.Matrix4().copy(gun.matrixWorld).invert(), v = new THREE.Vector3();
const V = [];
ud.mag.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
  const m = new THREE.Matrix4().multiplyMatrices(gunInv, o.matrixWorld), pa = o.geometry.attributes.position;
  for (let i = 0; i < pa.count; i++) V.push(v.clone().fromBufferAttribute(pa, i).applyMatrix4(m)); });
let lo = 1e9, hiZ = -1e9, loZ = 1e9, hiX = -1e9, loX = 1e9;
for (const q of V) { lo = Math.min(lo, q.y); hiZ = Math.max(hiZ, q.z); loZ = Math.min(loZ, q.z); hiX = Math.max(hiX, q.x); loX = Math.min(loX, q.x); }
const inGrip = V.filter((q) => q.y >= yBot && q.y <= yTop);
let worst = 1e9, worstSide = 1e9, cnt = 0, at = null;
for (const q of inGrip) {
  const u0 = uv2(q.z, q.y)[0];
  if (u0 < 0.02 || u0 > 0.98) continue;
  cnt++;
  const m = inside(q.z, q.y) ? edge(q.z, q.y) : -edge(q.z, q.y);
  const side = halfW(Math.max(0, m)) - Math.abs(q.x);
  if (m < worst) { worst = m; at = { u: +u0.toFixed(3), z: +(q.z * 1000).toFixed(1), y: +(q.y * 1000).toFixed(1), x: +(q.x * 1000).toFixed(1) }; }
  if (side < worstSide) worstSide = side;
}
return JSON.stringify({ note: 'mm', vertices: V.length, inGrip: cnt,
  magAcross: +((hiX - loX) * 1000).toFixed(1), magDeep: +((hiZ - loZ) * 1000).toFixed(1),
  magBottomMm: +(lo * 1000).toFixed(1), gripBottomMm: +(yBot * 1000).toFixed(1), gripTopMm: +(yTop * 1000).toFixed(1),
  marginToOutlineMm: +(worst * 1000).toFixed(2), roomToSideMm: +(worstSide * 1000).toFixed(2), tightest: at }, null, 1);
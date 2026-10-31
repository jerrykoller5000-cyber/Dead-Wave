// fit4.mjs - GB-260: how wide and deep the Uzi's stick can be where it passes through the grip.
// Only the part between the grip's mouth and its bottom is constrained (the rest hangs out below, free).
const shapedGrip = (cz, cy, h, d, rake, pts) => { const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; }); };
const cz = -0.030, cy = -0.1, h = 0.16, d = 0.12, rake = 0.22;
const P = [[-0.04, 0.014], [0.12, 0.026], [0.36, 0.020], [0.62, 0.028], [0.86, 0.020], [1.0, 0.006], [1.02, -0.010], [0.90, -0.028], [0.60, -0.034], [0.30, -0.024], [0.08, -0.016], [-0.04, -0.028], [-0.07, -0.006]];
const poly = shapedGrip(cz, cy, h, d, rake, P);
const inside = (z, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) c = !c; } return c; };
const edge = (z, y) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((z - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))); m = Math.min(m, Math.hypot(z - ax - ex * t, y - ay - ey * t)); } return m; };
const HW = 0.039, R = 0.010;   // the grip is 78 mm across with a 10 mm bevel
const halfW = (m) => HW - (m >= R ? 0 : R - Math.sqrt(Math.max(0, R * R - (R - m) * (R - m))));
const uv = (z, y) => { const sr = Math.sin(rake), cr = Math.cos(rake); const dz = z - cz, dy = y - cy; return [-(dz * sr + dy * cr) / h + 0.5, (dz * cr - dy * sr) / (d / 0.08)]; };
const gz = -0.0435, gy = -0.205;   // the magazine group; the stick adds its own 0.22 rake on top (total 0.44)
const STICK = 0.22;
console.log('where the stick sits in the grip: u 0 = the grip top, u 1 = its bottom');
function probe(zHalf, yLo, yHi, wHalf) {
  let outZ = 0, outX = 0, uMin = 9, uMax = -9, worst = null;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 12; j++) {
    const zl = -zHalf + 2 * zHalf * i / 8, yl = yLo + (yHi - yLo) * j / 12;
    // stick's own rotation, then the group's
    const sy = yl * Math.cos(STICK) - zl * Math.sin(STICK), sz = yl * Math.sin(STICK) + zl * Math.cos(STICK);
    const z = gz + sy * Math.sin(rake) + sz * Math.cos(rake), y = gy + sy * Math.cos(rake) - sz * Math.sin(rake);
    const [u] = uv(z, y);
    if (u < 0.02 || u > 0.96) continue;   // outside the grip's own length: free
    uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
    const m = inside(z, y) ? edge(z, y) : -edge(z, y);
    const pz = Math.max(0, 0.001 - m), px = Math.max(0, wHalf - (halfW(Math.max(0, m)) - 0.0005));
    if (pz > outZ) { outZ = pz; worst = ['z', (u).toFixed(2), (m * 1000).toFixed(1)]; }
    if (px > outX) { outX = px; worst = ['x', (u).toFixed(2), (halfW(Math.max(0, m)) * 1000).toFixed(1)]; }
  }
  return { outZ, outX, uMin, uMax, worst };
}
const show = (name, zHalf, yLo, yHi, wHalf) => { const r = probe(zHalf, yLo, yHi, wHalf);
  const bad = r.outZ > 0 || r.outX > 0;
  console.log(name.padEnd(36) + (bad ? 'FAIL' : 'PASS') + '   z out ' + (r.outZ * 1000).toFixed(1) + ' mm, x out ' + (r.outX * 1000).toFixed(1) +
    ' mm   (in the grip: u ' + r.uMin.toFixed(2) + '..' + r.uMax.toFixed(2) + (r.worst ? ', worst ' + r.worst.join(' ') : '') + ')'); };
console.log('== the Uzi stick through the grip');
show('  now: 36 wide x 44 deep', 0.022, -0.109, 0.115, 0.018);
for (const [w, dd] of [[48, 54], [52, 60], [56, 64], [60, 68], [64, 72]]) show('  ' + w + ' wide x ' + dd + ' deep', dd / 2000, -0.109, 0.115, w / 2000);
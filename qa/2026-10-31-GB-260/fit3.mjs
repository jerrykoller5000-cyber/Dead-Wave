// fit3.mjs - GB-260: the pistol and the Uzi magazine sizes proposed, checked against t242's rules exactly.
const shapedGrip = (cz, cy, h, d, rake, pts) => { const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; }); };
function grip(cz, cy, h, d, rake, P, HW, R) {
  const poly = shapedGrip(cz, cy, h, d, rake, P);
  const inside = (z, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) c = !c; } return c; };
  const edge = (z, y) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((z - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))); m = Math.min(m, Math.hypot(z - ax - ex * t, y - ay - ey * t)); } return m; };
  const halfW = (m) => HW - (m >= R ? 0 : R - Math.sqrt(Math.max(0, R * R - (R - m) * (R - m))));
  const uv = (z, y) => { const sr = Math.sin(rake), cr = Math.cos(rake); const dz = z - cz, dy = y - cy; return [-(dz * sr + dy * cr) / h + 0.5, (dz * cr - dy * sr) / (d / 0.08)]; };
  return { inside, edge, halfW, uv, rake, h };
}
// t242's own check for one point set: inside the outline, and inside the grip's rounded sides
function check(g, gz, gy, zHalf, yLo, yHi, wHalf) {
  const pts = [];
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
    const zl = -zHalf + 2 * zHalf * i / 4, yl = yLo + (yHi - yLo) * j / 4;
    const z = gz + yl * Math.sin(g.rake) + zl * Math.cos(g.rake), y = gy + yl * Math.cos(g.rake) - zl * Math.sin(g.rake);
    pts.push([z, y]);
  }
  let poke = -1e9, low = -1e9, worst = null, wmin = 1e9;
  for (const [z, y] of pts) {
    const [u] = g.uv(z, y); low = Math.max(low, (u - 1) * g.h);
    if (u > 0.985) continue;
    const m = g.inside(z, y) ? g.edge(z, y) : -g.edge(z, y);
    const pk = Math.max(0.001 - m, wHalf - (g.halfW(Math.max(0, m)) - 0.0005));
    wmin = Math.min(wmin, g.halfW(Math.max(0, m)));
    if (pk > poke) { poke = pk; worst = [(z * 1000).toFixed(1), (y * 1000).toFixed(1), (m * 1000).toFixed(1)]; }
  }
  return { poke, low, worst, wmin };
}
const P = [[0.00, 0.026], [0.08, 0.032], [0.20, 0.030], [0.30, 0.035], [0.42, 0.029], [0.54, 0.034], [0.68, 0.030], [0.84, 0.031], [0.96, 0.029], [1.00, 0.024], [1.00, -0.026], [0.96, -0.030], [0.70, -0.031], [0.40, -0.030], [0.18, -0.029], [0.08, -0.033], [0.05, -0.024]];
const pistol = grip(-0.02, -0.08, 0.18, 0.1, 0.3, P, 0.026, 0.009);
const show = (name, g, gz, gy, zHalf, yLo, yHi, wHalf) => { const r = check(g, gz, gy, zHalf, yLo, yHi, wHalf);
  console.log(name.padEnd(40) + (r.poke <= 0 ? 'PASS' : 'FAIL ' + (r.poke * 1000).toFixed(1) + ' mm out') +
    '   room to the grip side ' + ((r.wmin - wHalf) * 1000).toFixed(1) + ' mm, baseplate ' + (r.low * 1000).toFixed(1) + ' mm below'); };
console.log('== pistol body (group z -25.5, y -87.7, rake 0.30, 162 mm long)');
show('  now: 28 wide x 20 deep', pistol, -0.0255, -0.0877, 0.010, -0.081, 0.081, 0.014);
show('  proposed: 40 wide x 46 deep', pistol, -0.0255, -0.0877, 0.023, -0.081, 0.081, 0.020);
show('  40 wide x 52 deep', pistol, -0.0255, -0.0877, 0.026, -0.081, 0.081, 0.020);
show('  42 wide x 50 deep', pistol, -0.0255, -0.0877, 0.025, -0.081, 0.081, 0.021);
console.log('== uzi stick (group z -43.5, y -205, rake 0.22, 224 mm long; grip 78 wide x 120 deep, 10 mm bevel)');
const UZP = [[-0.04, 0.014], [0.12, 0.026], [0.36, 0.020], [0.62, 0.028], [0.86, 0.020], [1.0, 0.006], [1.02, -0.010], [0.90, -0.028], [0.60, -0.034], [0.30, -0.024], [0.08, -0.016], [-0.04, -0.028], [-0.07, -0.006]];
const uzi = grip(-0.030, -0.1, 0.16, 0.12, 0.22, UZP, 0.039, 0.010);
show('  now: 36 wide x 44 deep', uzi, -0.0435, -0.205, 0.022, -0.109, 0.115, 0.018);
show('  proposed: 48 wide x 54 deep', uzi, -0.0435, -0.205, 0.027, -0.109, 0.115, 0.024);
show('  52 wide x 60 deep', uzi, -0.0435, -0.205, 0.030, -0.109, 0.115, 0.026);
show('  56 wide x 64 deep', uzi, -0.0435, -0.205, 0.032, -0.109, 0.115, 0.028);
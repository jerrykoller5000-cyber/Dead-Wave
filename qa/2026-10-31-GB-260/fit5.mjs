// fit5.mjs - GB-260: candidate magazine cross-sections against each grip, using t242's pistol rule and a
// same-shaped rule for the Uzi (inside the grip outline and inside its rounded sides by half a millimetre).
const shapedGrip = (cz, cy, h, d, rake, pts) => { const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; }); };
function mk(cz, cy, h, d, rake, P, HW, R) {
  const poly = shapedGrip(cz, cy, h, d, rake, P);
  const inside = (z, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) c = !c; } return c; };
  const edge = (z, y) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((z - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))); m = Math.min(m, Math.hypot(z - ax - ex * t, y - ay - ey * t)); } return m; };
  const halfW = (m) => HW - (m >= R ? 0 : R - Math.sqrt(Math.max(0, R * R - (R - m) * (R - m))));
  const uv = (z, y) => { const sr = Math.sin(rake), cr = Math.cos(rake); const dz = z - cz, dy = y - cy; return [-(dz * sr + dy * cr) / h + 0.5, (dz * cr - dy * sr) / (d / 0.08)]; };
  return { inside, edge, halfW, uv, rake, h };
}
// A body [zHalf, yLo, yHi, wHalf] sitting at group (gz, gy) with the grip's rake; an inner twist adds to it.
function test(g, gz, gy, zHalf, yLo, yHi, wHalf, twist = 0) {
  let poke = -1e9, low = -1e9, minSideGap = 1e9, where = '';
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 10; j++) {
    const zl = -zHalf + 2 * zHalf * i / 6, yl = yLo + (yHi - yLo) * j / 10;
    const sy = yl * Math.cos(twist) - zl * Math.sin(twist), sz = yl * Math.sin(twist) + zl * Math.cos(twist);
    const z = gz + sy * Math.sin(g.rake) + sz * Math.cos(g.rake), y = gy + sy * Math.cos(g.rake) - sz * Math.sin(g.rake);
    const [u] = g.uv(z, y); low = Math.max(low, (u - 1) * g.h);
    if (u > 0.985) continue;                     // below the grip's bottom: free (t242 skips these too)
    const m = g.inside(z, y) ? g.edge(z, y) : -g.edge(z, y);
    const gap = g.halfW(Math.max(0, m)) - wHalf;
    minSideGap = Math.min(minSideGap, gap);
    const pk = Math.max(0.001 - m, -gap + 0.0005);
    if (pk > poke) { poke = pk; where = 'u ' + u.toFixed(2) + ' z-edge ' + (m * 1000).toFixed(1) + ' side-gap ' + (gap * 1000).toFixed(1); }
  }
  return { poke, low, minSideGap, where };
}
const PP = [[0.00, 0.026], [0.08, 0.032], [0.20, 0.030], [0.30, 0.035], [0.42, 0.029], [0.54, 0.034], [0.68, 0.030], [0.84, 0.031], [0.96, 0.029], [1.00, 0.024], [1.00, -0.026], [0.96, -0.030], [0.70, -0.031], [0.40, -0.030], [0.18, -0.029], [0.08, -0.033], [0.05, -0.024]];
const pistol = mk(-0.02, -0.08, 0.18, 0.1, 0.3, PP, 0.026, 0.009);
const UP = [[-0.04, 0.014], [0.12, 0.026], [0.36, 0.020], [0.62, 0.028], [0.86, 0.020], [1.0, 0.006], [1.02, -0.010], [0.90, -0.028], [0.60, -0.034], [0.30, -0.024], [0.08, -0.016], [-0.04, -0.028], [-0.07, -0.006]];
const uzi = mk(-0.030, -0.1, 0.16, 0.12, 0.22, UP, 0.039, 0.010);
const line = (name, g, gz, gy, zHalf, yLo, yHi, wHalf, twist) => { const r = test(g, gz, gy, zHalf, yLo, yHi, wHalf, twist);
  console.log(name.padEnd(30) + (r.poke <= 0 ? 'PASS' : 'FAIL ' + (r.poke * 1000).toFixed(1) + ' out') +
    '   side gap ' + (r.minSideGap * 1000).toFixed(1) + ' mm   baseplate ' + (r.low * 1000).toFixed(1) + ' mm below' + (r.poke > 0 ? '   ' + r.where : '')); };
console.log('== pistol (52 mm across inside, 0.30 rake, 162 mm body, group z -25.5 y -87.7)');
line('  before: 28 x 20', pistol, -0.0255, -0.0877, 0.010, -0.081, 0.081, 0.014);
line('  now: 40 x 46', pistol, -0.0255, -0.0877, 0.020, -0.081, 0.081, 0.023);
line('  candidate 44 x 52', pistol, -0.0255, -0.0877, 0.026, -0.081, 0.081, 0.022);
line('  candidate 44 x 56', pistol, -0.0255, -0.0877, 0.028, -0.081, 0.081, 0.022);
line('  candidate 46 x 56', pistol, -0.0255, -0.0877, 0.028, -0.081, 0.081, 0.023);
console.log('== uzi (78 mm across inside, 0.22 rake, 224 mm stick, group z -43.5 y -205, stick twist 0.22)');
line('  before: 36 x 44', uzi, -0.0435, -0.205, 0.018, -0.109, 0.115, 0.022, 0.22);
line('  candidate 44 x 50', uzi, -0.0435, -0.205, 0.025, -0.109, 0.115, 0.022, 0.22);
line('  candidate 46 x 52', uzi, -0.0435, -0.205, 0.026, -0.109, 0.115, 0.023, 0.22);
line('  candidate 48 x 56', uzi, -0.0435, -0.205, 0.028, -0.109, 0.115, 0.024, 0.22);
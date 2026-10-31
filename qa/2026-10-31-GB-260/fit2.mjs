// fit2.mjs - GB-260: does a proposed pistol magazine fit its grip? Mirrors tools/tests/t242.js exactly.
// (z,y) profile in the magazine's own space, rotated by the grip's rake, at the magazine group's offset.
const shapedGrip = (cz, cy, h, d, rake, pts) => { const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; }); };
const cz = -0.02, cy = -0.08, h = 0.18, d = 0.1, rake = 0.3;
const P = [[0.00, 0.026], [0.08, 0.032], [0.20, 0.030], [0.30, 0.035], [0.42, 0.029], [0.54, 0.034], [0.68, 0.030], [0.84, 0.031], [0.96, 0.029], [1.00, 0.024], [1.00, -0.026], [0.96, -0.030], [0.70, -0.031], [0.40, -0.030], [0.18, -0.029], [0.08, -0.033], [0.05, -0.024]];
const poly = shapedGrip(cz, cy, h, d, rake, P);
const inside = (z, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) c = !c; } return c; };
const edge = (z, y) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((z - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))); m = Math.min(m, Math.hypot(z - ax - ex * t, y - ay - ey * t)); } return m; };
const R = 0.009, HW = 0.026;   // GB-180: the grip is 52 mm wide, 9 mm bevel (t242's numbers)
const halfW = (m) => HW - (m >= R ? 0 : R - Math.sqrt(R * R - (R - m) * (R - m)));
const uv = (z, y) => { const sr = Math.sin(rake), cr = Math.cos(rake); const dz = z - cz, dy = y - cy; return [-(dz * sr + dy * cr) / h + 0.5, (dz * cr - dy * sr) / (d / 0.08)]; };
// the magazine group's offset (studio/weapon-sidearms.js: K.group(0, -0.0877, -0.0255)) and the body's [z,y] profile
const gz = -0.0255, gy = -0.0877;
function test(zHalf, yLo, yHi, wHalf) {
  const pts = [];
  for (const zl of [-zHalf, 0, zHalf]) for (const yl of [yLo, (yLo + yHi) / 2, yHi]) {
    const z = gz + yl * Math.sin(rake) + zl * Math.cos(rake), y = gy + yl * Math.cos(rake) - zl * Math.sin(rake);
    pts.push([z, y, zl === 0 && yl === (yLo + yHi) / 2]);
  }
  let poke = -1e9, worst = null, low = -1e9;
  for (const [z, y] of pts) {
    const [u, v] = uv(z, y); low = Math.max(low, (u - 1) * h);
    if (u > 0.985) continue;
    const m = inside(z, y) ? edge(z, y) : -edge(z, y);
    const pk = Math.max(0.001 - m, wHalf - (halfW(Math.max(0, m)) - 0.0005), 0);
    if (pk > poke) { poke = pk; worst = [(z * 1000).toFixed(1), (y * 1000).toFixed(1), (m * 1000).toFixed(1)]; }
  }
  return { poke, worst, low };
}
const show = (name, zHalf, yLo, yHi, wHalf) => { const r = test(zHalf, yLo, yHi, wHalf);
  console.log(name.padEnd(38) + (r.poke <= 0 ? 'PASS' : 'FAIL') + '  worst ' + (r.poke * 1000).toFixed(1) + ' mm' +
    (r.worst ? ' at z ' + r.worst[0] + ' y ' + r.worst[1] + ' (edge ' + r.worst[2] + ' mm)' : '') +
    '  baseplate ' + (r.low * 1000).toFixed(1) + ' mm below the grip (t242 wants 0..15)'); };
console.log('== the magazine as built now (28 wide, 20 deep, 162 long, group z -25.5 y -87.7)');
show('  as built', 0.010, -0.081, 0.081, 0.014);
console.log('== proposed (fill the well): width and depth, same 162 mm body');
for (const [zw, zh] of [[0.009, 0.014], [0.011, 0.016], [0.011, 0.019], [0.011, 0.022], [0.011, 0.024]]) {
  show('  ' + (zh * 2000).toFixed(0) + ' mm deep, ' + (zw * 2000).toFixed(0) + ' mm wide', zw, -0.081, 0.081, zw);
}
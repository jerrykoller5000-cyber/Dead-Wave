// why2.mjs - GB-260: which bevel makes the wider pistol body fit where the old one did. t242's own check.
const shapedGrip = (cz, cy, h, d, rake, pts) => { const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; }); };
const cz = -0.02, cy = -0.08, h = 0.18, d = 0.1, rake = 0.3;
const P = [[0.00, 0.026], [0.08, 0.032], [0.20, 0.030], [0.30, 0.035], [0.42, 0.029], [0.54, 0.034], [0.68, 0.030], [0.84, 0.031], [0.96, 0.029], [1.00, 0.024], [1.00, -0.026], [0.96, -0.030], [0.70, -0.031], [0.40, -0.030], [0.18, -0.029], [0.08, -0.033], [0.05, -0.024]];
const poly = shapedGrip(cz, cy, h, d, rake, P);
const inside = (z, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) c = !c; } return c; };
const edge = (z, y) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((z - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))); m = Math.min(m, Math.hypot(z - ax - ex * t, y - ay - ey * t)); } return m; };
const R = 0.009, HW = 0.026;
const halfW = (m) => HW - (m >= R ? 0 : R - Math.sqrt(Math.max(0, R * R - (R - m) * (R - m))));
const uv = (z, y) => { const sr = Math.sin(rake), cr = Math.cos(rake); const dz = z - cz, dy = y - cy; return [-(dz * sr + dy * cr) / h + 0.5, (dz * cr - dy * sr) / (d / 0.08)]; };
const gz = -0.0255, gy = -0.0877, yTopL = 0.081, yBotL = -0.081, SCALE = 1.48;
const feed = yTopL, yLo = feed + (yBotL - feed) * SCALE;
// A bevelled slab's cross-section is the outline pulled in by the bevel at the sides: its widest points are at the
// middle. The vertices t242 sees are the outline points and the inset ones. Model that: the outline is valid where
// the grip still holds the inset width, i.e. the slab's half-width applies at (edge - bevel) inside the outline.
function poke(zHalf, bevel) {
  let worst = -1e9, at = null;
  for (let i = 0; i <= 40; i++) for (let j = 0; j <= 60; j++) {
    const zl = -zHalf + 2 * zHalf * i / 40, yl = yLo + (yTopL - yLo) * j / 60;
    const z = gz + yl * Math.sin(rake) + zl * Math.cos(rake), y = gy + yl * Math.cos(rake) - zl * Math.sin(rake);
    const [u, v] = uv(z, y);
    if (u > 0.985) continue;
    // the bevel insets the profile by `bevel` at the outer ring; compare against the inset line
    const m = inside(z, y) ? edge(z, y) : -edge(z, y);
    const room = halfW(Math.max(0, m - bevel)) - 0.0005;
    const pk = Math.max((bevel > 0 ? 0.001 : 0.001) - m, zHalf - room);
    if (pk > worst) { worst = pk; at = { u: +u.toFixed(3), edge: +(m*1000).toFixed(1), room: +(room*1000).toFixed(1) }; }
  }
  return { worst, at };
}
for (const [label, zHalf, bev] of [['old 28 mm, bevel 3', 0.014, 0.003], ['now 40 mm, bevel 4', 0.023, 0.004],
  ['40 mm, bevel 3', 0.023, 0.003], ['40 mm, bevel 2', 0.023, 0.002], ['40 mm, bevel 2.5', 0.023, 0.0025],
  ['36 mm, bevel 3', 0.021, 0.003], ['34 mm, bevel 3', 0.020, 0.003]]) {
  const r = poke(zHalf, bev);
  console.log(label.padEnd(22) + (r.worst <= 0 ? 'PASS' : 'FAIL') + '  worst ' + (r.worst * 1000).toFixed(2) + ' mm  ' + JSON.stringify(r.at));
}
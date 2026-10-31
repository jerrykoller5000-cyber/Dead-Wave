// why.mjs - GB-260: reproduce t242's extended-mag failure at the point it names (u 0.194), pure maths.
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
// The extended magazine: gunExtLook scales the body 1.48x down its own axis about the feed top; the slab is centred
// on the group, so in t242's frame the body's own y-range grows by 1.48 about (its centre adjusted by feedY).
// t242 reads the real vertices, so reproduce the body's rectangle scaled about its top.
const gz = -0.0255, gy = -0.0877;
const zHalf = 0.023, yTopL = 0.081, yBotL = -0.081, SCALE = 1.48;
// feedY is the body's top in the shape group; the stretch holds that fixed, so y' = feedY + (y - feedY)*scale
const feed = yTopL;
const yLo = feed + (yBotL - feed) * SCALE;
console.log('body y in the magazine group: ' + (yBotL*1000).toFixed(1) + ' .. ' + (yTopL*1000).toFixed(1) +
  '  extended: ' + (yLo*1000).toFixed(1) + ' .. ' + (yTopL*1000).toFixed(1));
let worst = -1e9, at = null;
for (let i = 0; i <= 40; i++) for (let j = 0; j <= 60; j++) {
  const zl = -zHalf + 2 * zHalf * i / 40, yl = yLo + (yTopL - yLo) * j / 60;
  const z = gz + yl * Math.sin(rake) + zl * Math.cos(rake), y = gy + yl * Math.cos(rake) - zl * Math.sin(rake);
  const [u, v] = uv(z, y);
  if (u > 0.985) continue;
  const m = inside(z, y) ? edge(z, y) : -edge(z, y);
  const pk = Math.max(0.001 - m, zHalf - (halfW(Math.max(0, m)) - 0.0005));
  if (pk > worst) { worst = pk; at = { u: +u.toFixed(3), v: +(v * 0.1 * 1000).toFixed(1), z: +(z*1000).toFixed(1), y: +(y*1000).toFixed(1), edge: +(m*1000).toFixed(1), sideRoom: +(halfW(Math.max(0,m))*1000).toFixed(1) }; }
}
console.log('worst poke ' + (worst * 1000).toFixed(2) + ' mm at ' + JSON.stringify(at));
// The same sweep for the body as BEFORE GB-260 (28 mm wide), extended, for comparison
const zHalfOld = 0.014;
let worstOld = -1e9, atOld = null;
for (let i = 0; i <= 40; i++) for (let j = 0; j <= 60; j++) {
  const zl = -zHalfOld + 2 * zHalfOld * i / 40, yl = yLo + (yTopL - yLo) * j / 60;
  const z = gz + yl * Math.sin(rake) + zl * Math.cos(rake), y = gy + yl * Math.cos(rake) - zl * Math.sin(rake);
  const [u, v] = uv(z, y);
  if (u > 0.985) continue;
  const m = inside(z, y) ? edge(z, y) : -edge(z, y);
  const pk = Math.max(0.001 - m, zHalfOld - (halfW(Math.max(0, m)) - 0.0005));
  if (pk > worstOld) { worstOld = pk; atOld = { u: +u.toFixed(3), edge: +(m*1000).toFixed(1) }; }
}
console.log('the 28 mm body, extended: worst poke ' + (worstOld * 1000).toFixed(2) + ' mm at ' + JSON.stringify(atOld));
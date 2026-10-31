// fit.mjs - GB-260: how much magazine each grip actually holds. Pure maths, no game, no slot.
// The outlines are copied from studio/weapon-sidearms.js (the pistol's and the Uzi's shapedGrip calls). The check
// is t242's: every corner of the body's profile inside the outline, and how far inside it sits.
const shapedGrip = (cz, cy, h, d, rake, pts) => { const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  return pts.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; }); };
function mkGrip(cz, cy, h, d, rake, pts) {
  const poly = shapedGrip(cz, cy, h, d, rake, pts);
  const inside = (z, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [zi, yi] = poly[i], [zj, yj] = poly[j]; if ((yi > y) !== (yj > y) && z < (zj - zi) * (y - yi) / (yj - yi) + zi) c = !c; } return c; };
  const edge = (z, y) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((z - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey))); m = Math.min(m, Math.hypot(z - ax - ex * t, y - ay - ey * t)); } return m; };
  return { poly, inside, edge };
}
const pistol = mkGrip(-0.02, -0.08, 0.18, 0.1, 0.3, [[0.00, 0.026], [0.08, 0.032], [0.20, 0.030], [0.30, 0.035], [0.42, 0.029], [0.54, 0.034], [0.68, 0.030], [0.84, 0.031], [0.96, 0.029], [1.00, 0.024], [1.00, -0.026], [0.96, -0.030], [0.70, -0.031], [0.40, -0.030], [0.18, -0.029], [0.08, -0.033], [0.05, -0.024]]);
const uziG = mkGrip(-0.030, -0.1, 0.16, 0.12, 0.22, [[-0.04, 0.014], [0.12, 0.026], [0.36, 0.020], [0.62, 0.028], [0.86, 0.020], [1.0, 0.006], [1.02, -0.010], [0.90, -0.028], [0.60, -0.034], [0.30, -0.024], [0.08, -0.016], [-0.04, -0.028], [-0.07, -0.006]]);
// THREE's rotation about x for a profile point [zl, yl]:  y' = yl cos - zl sin ; z' = yl sin + zl cos.
const place = (z0, y0, rake, prof) => { const cr = Math.cos(rake), sr = Math.sin(rake);
  return prof.map(([zl, yl]) => [z0 + yl * sr + zl * cr, y0 + yl * cr - zl * sr]); };
const worstOf = (g, pts) => { let m = 1e9; for (const [z, y] of pts) { const e = g.edge(z, y); m = Math.min(m, g.inside(z, y) ? e : -e); } return m; };
const rect = (L, D) => [[-D / 2, -L / 2], [D / 2, -L / 2], [D / 2, L / 2], [-D / 2, L / 2], [0, L / 2], [0, -L / 2]];
const report = (name, g, z0, y0, rake, prof) => { const w = worstOf(g, place(z0, y0, rake, prof));
  console.log(name.padEnd(42) + (w >= 0 ? 'INSIDE  ' : 'OUTSIDE ') + (w * 1000).toFixed(1).padStart(6) + ' mm'); return w; };
// ---- the pistol: body 162 mm long, 20 mm front to back, on the grip's own centre line -------------------------
const PZ = -0.0255, PY = -0.0877, PR = 0.3, PL = 0.162;
console.log('== pistol, the body as built (20 mm deep x 162 mm long)');
report('  as built', pistol, PZ, PY, PR, rect(PL, 0.020));
console.log('== pistol, deeper bodies on the same centre line (the grip is 80-85 mm deep inside)');
for (const D of [0.020, 0.026, 0.030, 0.034, 0.038, 0.042, 0.046, 0.050]) report('  ' + (D * 1000).toFixed(0) + ' mm deep', pistol, PZ, PY, PR, rect(PL, D));
let best = { D: 0, z: 0 };
for (let D = 0.020; D <= 0.062; D += 0.0005) for (let z = -0.060; z <= -0.005; z += 0.0005) {
  const w = worstOf(pistol, place(z, PY, PR, rect(PL, D))); if (w > 0.001 && D > best.D) best = { D, z }; }
console.log('  deepest with 1 mm clear, anywhere on the axis: ' + (best.D * 1000).toFixed(1) + ' mm at z ' + (best.z * 1000).toFixed(1) + ' mm');
// ---- the Uzi: the stick is 224 mm long, 44 mm front to back ------------------------------------------------
const UZ = -0.0435, UY = -0.205, UR = 0.22, UL = 0.224;
console.log('== uzi, the stick as built (44 mm deep x 224 mm long)');
report('  as built', uziG, UZ, UY, UR, rect(UL, 0.044));
for (const D of [0.044, 0.052, 0.060, 0.068, 0.076, 0.084]) report('  ' + (D * 1000).toFixed(0) + ' mm deep', uziG, UZ, UY, UR, rect(UL, D));
let bestU = { D: 0, z: 0 };
for (let D = 0.040; D <= 0.095; D += 0.0005) for (let z = -0.10; z <= -0.005; z += 0.0005) {
  const w = worstOf(uziG, place(z, UY, UR, rect(UL, D))); if (w > 0.001 && D > bestU.D) bestU = { D, z }; }
console.log('  deepest with 1 mm clear, anywhere on the axis: ' + (bestU.D * 1000).toFixed(1) + ' mm at z ' + (bestU.z * 1000).toFixed(1) + ' mm');
// ---- what the grip's inside actually offers, by height ------------------------------------------------------
for (const [name, g] of [['pistol', pistol], ['uzi', uziG]]) {
  const rows = [];
  for (let y = -0.02; y > -0.19; y -= 0.02) { const zs = []; for (let z = -0.22; z < 0.06; z += 0.0005) if (g.inside(z, y)) zs.push(z);
    if (zs.length) rows.push((y * 1000).toFixed(0) + ':' + ((Math.max(...zs) - Math.min(...zs)) * 1000).toFixed(0)); }
  console.log(name + ' inside depth by height (mm): ' + rows.join('  '));
}
// idxmove.mjs <grid base> '<pose>' '<TGT>' : the hand moved on a grid (mm, the hand's frame) x the index over a grid:
// the moves where the rest of the hand stays clean (field, keep-out) and the index can be clean with its pad nearest TGT.
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const G = loadGrid(process.argv[2]); const pose0 = JSON.parse(process.argv[3]); const TG = JSON.parse(process.argv[4]);
const KG = process.env.KOGRID ? loadGrid(process.env.KOGRID) : null; const ST = +(process.env.ST || 3), MV = +(process.env.MV || 9);
const L = M.handLayout(1, 0, 0), C = [0, L.gripY, 0.008];
const B2 = (process.env.B2 || '0').split(',').map(Number), A1 = (process.env.A1 || '0').split(',').map(Number);
const xf = (x, y, z, d, a, b2) => { let px = x - d[0] - C[0], py = y - d[1] - C[1], pz = z - d[2] - C[2]; const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b2), sb = Math.sin(b2); const qx = ca * px + sa * pz, qz = -sa * px + ca * pz; return [cb * qx + sb * py + C[0], -sb * qx + cb * py + C[1], qz + C[2]]; };
const R = (a, b, s) => { const r = []; for (let v = a; v <= b + 1e-9; v += s) r.push(+v.toFixed(3)); return r; };
const P0 = M.handPosed(pose0, M.GLOVE_INFLATE); const rest = [];
for (let v = 0; v < P0.n; v++) if (P0.b0[v] < 1 || P0.b0[v] > 3) rest.push([P0.p[v * 3], P0.p[v * 3 + 1], P0.p[v * 3 + 2], P0.b0[v]]);
const idx = [];
for (const mcp of R(-0.3, 1.2, 0.15)) for (const pip of R(0, 1.8, 0.2)) for (const dip of R(0, 1.4, 0.2)) for (const sp of R(-0.35, 0.35, 0.175)) {
  if (dip > pip + 0.2) continue; const pose = JSON.parse(JSON.stringify(pose0)); pose.f[0] = [mcp, pip, dip, sp];
  const P = M.handPosed(pose, M.GLOVE_INFLATE); const V = [], Tp = [];
  for (let v = 0; v < P.n; v++) { const b = P.b0[v]; if (b >= 1 && b <= 3) { if (v % 2 === 0) V.push(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); if (b === 3) Tp.push(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); } }
  idx.push({ f0: [mcp, pip, dip, sp], V, Tp });
}
const res = [];
for (const b2 of B2) for (const a1 of A1) for (const dx of R(-MV, MV, ST)) for (const dy of R(-MV, MV, ST)) for (const dz of R(-MV, MV, ST)) {
  const d = [dx / 1000, dy / 1000, dz / 1000]; let worst = 1, kw = 1;
  for (const [x0, y0, z0, b] of rest) { const [x, y, z] = xf(x0, y0, z0, d, a1, b2); const f = G.d(x, y, z); if (f < worst) worst = f; if (KG) { const k = KG.d(x, y, z); if (k < kw) kw = k; } }
  if (worst < -0.0006 || kw < -0.0002) continue;
  let best = null;
  for (const I of idx) { let m = 1; for (let i = 0; i < I.V.length; i += 3) { const [x, y, z] = xf(I.V[i], I.V[i + 1], I.V[i + 2], d, a1, b2); const f = G.d(x, y, z); if (f < m) { m = f; if (m < 0.0003) break; } }
    if (m < 0.0003) continue; let t = 1; for (let i = 0; i < I.Tp.length; i += 3) { const [x, y, z] = xf(I.Tp[i], I.Tp[i + 1], I.Tp[i + 2], d, a1, b2); const e = Math.hypot(x - TG[0], y - TG[1], z - TG[2]); if (e < t) t = e; }
    if (!best || t < best.tgd) best = { f0: I.f0, tgd: +(t * 1000).toFixed(1), clr: +(m * 1000).toFixed(2) }; }
  if (best) res.push({ b2, a1, move: [dx, dy, dz], rest: +(worst * 1000).toFixed(2), ko: +(kw * 1000).toFixed(2), ...best });
}
res.sort((a, b) => a.tgd - b.tgd); console.log('moves ok', res.length); for (const r of res.slice(0, 15)) console.log(JSON.stringify(r));

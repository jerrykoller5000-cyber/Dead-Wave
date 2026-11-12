// idxmove4.mjs (CD-1, fresh Claude 1, 12 Nov): idxmove3 with the index knuckle (MCP, bone 1's origin) held near MCPT (gun mm, needs C2G) within MCPR mm; the rows sorted by pad distance + MCPW * knuckle distance.
// idxmove3.mjs <grid base> '<pose>' '<TGT>' (CD-1 fixes 5, Claude 1): idxmove with turns about all three hand axes through the
// grip channel (A1 about y = the roll round the grip, B2 about z, C3 about x), the rest of the hand allowed the glove's give
// (PALM: the deepest the palm may press, m; REST: the other bones; KO: the keep-out) and the index over a grid: the moves where
// the index can be clean (CLR) with its tip nearest TGT. Env: MV, ST (mm), A1, B2, C3 (rad lists), KOGRID, TOP.
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const G = loadGrid(process.argv[2]); const pose0 = JSON.parse(process.argv[3]); const TG = JSON.parse(process.argv[4]); const A = process.env.C2G ? JSON.parse(process.env.C2G) : null;   // TG in gun mm when C2G (canonical -> gun mm) is given
const toG = (p) => A ? [A[0]*p[0]+A[1]*p[1]+A[2]*p[2]+A[3], A[4]*p[0]+A[5]*p[1]+A[6]*p[2]+A[7], A[8]*p[0]+A[9]*p[1]+A[10]*p[2]+A[11]] : p;
const KG = process.env.KOGRID ? loadGrid(process.env.KOGRID) : null; const ST = +(process.env.ST || 3), MV = +(process.env.MV || 9);
const PALM = +(process.env.PALM || -0.0045), REST = +(process.env.REST || -0.0008), KO = +(process.env.KO || -0.0002), CLR = +(process.env.CLR || 0.0003);
const C = [0, -0.271, 0.008]; const KTH = +(process.env.KTH || 3);
import { padOf } from '../c4/pad.mjs';
const L3 = (s) => (s || '0').split(',').map(Number);
const A1 = L3(process.env.A1), B2 = L3(process.env.B2), C3 = L3(process.env.C3);
const mk = (d, a, b, c) => { const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  return (x, y, z) => { let px = x - C[0], py = y - C[1], pz = z - C[2];
    let qx = ca * px + sa * pz, qz = -sa * px + ca * pz, qy = py;           // about y
    let rx = cb * qx + sb * qy, ry = -sb * qx + cb * qy; qx = rx; qy = ry;   // about z
    ry = cc * qy + sc * qz; let rz = -sc * qy + cc * qz; qy = ry; qz = rz;    // about x
    return [qx + C[0] + d[0], qy + C[1] + d[1], qz + C[2] + d[2]]; }; };
const R = (a, b, s) => { const r = []; for (let v = a; v <= b + 1e-9; v += s) r.push(+v.toFixed(4)); return r; };
const P0 = M.handPosed(pose0, M.GLOVE_INFLATE); const rest = [];
const MCPT = process.env.MCPT ? JSON.parse(process.env.MCPT) : null, MCPR = +(process.env.MCPR || 1e9), MCPW = +(process.env.MCPW || 0.5);
const _B = M._bf(M.handLayout(1, 0, 0), pose0); const MC0 = [_B[1][3], _B[1][7], _B[1][11]];
for (let v = 0; v < P0.n; v++) if (P0.b0[v] < 1 || P0.b0[v] > 3) rest.push([P0.p[v * 3], P0.p[v * 3 + 1], P0.p[v * 3 + 2], P0.b0[v]]);
const idx = [];
for (const mcp of R(+(process.env.MCPMIN || -0.3), 1.35, 0.15)) for (const pip of R(+(process.env.PIPMIN || 0), +(process.env.PIPMAX || 1.8), +(process.env.PIPST || 0.2))) for (const dip of R(+(process.env.DIPMIN || 0), 1.4, 0.2)) for (const sp of R(-0.35, 0.35, 0.175)) {
  if (dip > pip + 0.2) continue; const pose = JSON.parse(JSON.stringify(pose0)); pose.f[0] = [mcp, pip, dip, sp];
  const P = M.handPosed(pose, M.GLOVE_INFLATE); const V = [], Tp = [];
  for (let v = 0; v < P.n; v++) { const b = P.b0[v]; if (b >= 1 && b <= 3) { if (v % 2 === 0) V.push(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); if (b === 3) Tp.push(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); } }
  idx.push({ f0: [mcp, pip, dip, sp], V, Tp: padOf(pose).pad });
}
const res = []; let nOk = 0;
const FIX = process.env.FIX ? JSON.parse(process.env.FIX) : null;   // one placement {a1, b2, c3, move}
const MOVES = FIX ? [[FIX.a1 || 0, FIX.b2 || 0, FIX.c3 || 0, ...FIX.move]] : [];
if (!FIX) for (const a1 of A1) for (const b2 of B2) for (const c3 of C3) for (const dx of R(-MV, MV, ST)) for (const dy of R(-MV, MV, ST)) for (const dz of R(-MV, MV, ST)) MOVES.push([a1, b2, c3, dx, dy, dz]);
for (const [a1, b2, c3, dx, dy, dz] of MOVES) {
  const xf = mk([dx / 1000, dy / 1000, dz / 1000], a1, b2, c3); const pa = [], ra = []; let kw = 1, bad = false;
  const mg = toG(xf(...MC0)); const md = MCPT ? Math.hypot(mg[0] - MCPT[0], mg[1] - MCPT[1], mg[2] - MCPT[2]) : 0; if (md > MCPR) continue;
  for (const [x0, y0, z0, b] of rest) { const [x, y, z] = xf(x0, y0, z0); const f = G.d(x, y, z);
    if (f < -0.0002) (b === 0 ? pa : ra).push(f);
    if (KG) { const k = KG.d(x, y, z); if (k < kw) kw = k; }
    if (pa.length > 400 || ra.length > 400 || kw < KO) { bad = true; break; } }
  if (bad) continue; pa.sort((a, b) => a - b); ra.sort((a, b) => a - b);
  const palm = pa.length > KTH ? pa[KTH] : 0, worst = ra.length > KTH ? ra[KTH] : 0;
  if (palm < PALM || worst < REST) continue;
  if (bad) continue; nOk++;
  let best = null;
  for (const I of idx) { let t = 1e9; for (let i = 0; i < I.Tp.length; i += 3) { const [x, y, z] = toG(xf(I.Tp[i], I.Tp[i + 1], I.Tp[i + 2])); const e = Math.hypot(x - TG[0], y - TG[1], z - TG[2]); if (e < t) t = e; }
    if (best && t >= best.t) continue;
    let m = 1; for (let i = 0; i < I.V.length; i += 3) { const [x, y, z] = xf(I.V[i], I.V[i + 1], I.V[i + 2]); const f = G.d(x, y, z); if (f < m) { m = f; if (m < CLR) break; } }
    if (m < CLR) continue; best = { f0: I.f0, t, tgd: +(A ? t : t * 1000).toFixed(1), pad: toG(xf(...I.Tp)).map((v) => +(A ? v : v * 1000).toFixed(1)), clr: +(m * 1000).toFixed(2) }; }
  if (best) { delete best.t; best.mcp = mg.map((v) => +v.toFixed(1)); best.md = +md.toFixed(1); best.score = +(best.tgd + MCPW * md).toFixed(1); res.push({ a1, b2, c3, move: [dx, dy, dz], palm: +(palm * 1000).toFixed(2), rest: +(worst * 1000).toFixed(2), ko: +(kw * 1000).toFixed(2), ...best }); }
}
res.sort((a, b) => a.score - b.score); console.log('moves ok', nOk, 'with index', res.length); for (const r of res.slice(0, +(process.env.TOP || 15))) console.log(JSON.stringify(r));

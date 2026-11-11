// idxgrid.mjs <grid base> '<pose>' '<TGT>' : the index alone over a grid (the hand fixed): the cleanest index poses near the trigger
// prints the best few by (index clear first, then the pad's distance to TGT). CD-1 fixes 4 (Claude 1).
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const G = loadGrid(process.argv[2]); const pose0 = JSON.parse(process.argv[3]); const TG = JSON.parse(process.argv[4]);
const KG = process.env.KOGRID ? loadGrid(process.env.KOGRID) : null;
const out = [];
const R = (a, b, s) => { const r = []; for (let v = a; v <= b + 1e-9; v += s) r.push(+v.toFixed(3)); return r; };
for (const mcp of R(-0.3, 1.2, 0.15)) for (const pip of R(0, 1.8, 0.2)) for (const dip of R(0, 1.4, 0.2)) for (const sp of R(-0.35, 0.35, 0.1)) {
  if (dip > pip + 0.2) continue;
  const pose = JSON.parse(JSON.stringify(pose0)); pose.f[0] = [mcp, pip, dip, sp];
  const P = M.handPosed(pose, M.GLOVE_INFLATE); let dmin = 1, tgd = 1, other = 1;
  for (let v = 0; v < P.n; v++) { const b = P.b0[v]; const x = P.p[v * 3], y = P.p[v * 3 + 1], z = P.p[v * 3 + 2];
    if (b >= 1 && b <= 3) { const d = G.d(x, y, z); if (d < dmin) dmin = d; if (b === 3) { const e = Math.hypot(x - TG[0], y - TG[1], z - TG[2]); if (e < tgd) tgd = e; } }
    else if (b >= 4 && b <= 6 && process.env.MID) { const d = G.d(x, y, z); if (d < other) other = d; } }
  out.push({ f0: [mcp, pip, dip, sp], dmin: +(dmin * 1000).toFixed(2), tgd: +(tgd * 1000).toFixed(1) });
}
const clean = out.filter((o) => o.dmin >= +(process.env.CLR || 0.3)).sort((a, b) => a.tgd - b.tgd);
console.log('clean', clean.length, 'of', out.length);
for (const o of clean.slice(0, 12)) console.log(JSON.stringify(o));
const all = out.sort((a, b) => b.dmin - a.dmin).slice(0, 3); console.log('most clear', JSON.stringify(all));

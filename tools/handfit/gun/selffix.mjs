// a fitted pose nudged until no gloved part of the hand is 0.4 mm into another (rule 1), the gun no worse (its grid)
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const [base] = process.argv.slice(2), G = loadGrid(base); let p = JSON.parse(JSON.stringify(G.H.hand.pose));
const GL = M.GLOVE_INFLATE, p0 = JSON.parse(JSON.stringify(p));
const gunMin = (q) => { const P = M.handPosed(q, GL); let m = 1; for (let v = 0; v < P.n; v++) m = Math.min(m, G.d(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2])); return m * 1000; };
const g0 = gunMin(p);
const cost = (q) => { const r = M.handClipReport(q, 0.0004, false, GL), gm = gunMin(q); let dev = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) dev += (q.f[i][j] - p0.f[i][j]) ** 2; return { c: Math.max(0, r.max - 0.38) ** 2 * 20 + Math.max(0, g0 - gm) ** 2 * 5 + dev * 5, r, gm }; };
let best = cost(p);
console.log('start self', best.r.max, JSON.stringify(best.r.pairs), 'gun', best.gm.toFixed(2));
for (const st of [0.04, 0.02, 0.01]) { let imp = true, it = 0; while (imp && it++ < 20) { imp = false; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (const sg of [-1, 1]) { const q = JSON.parse(JSON.stringify(p)); q.f[i][j] = +(q.f[i][j] + sg * st).toFixed(4); const e = cost(q); if (e.c < best.c - 1e-6) { p = q; best = e; imp = true; } } } }
console.log('end self', best.r.max, JSON.stringify(best.r.pairs), 'gun', best.gm.toFixed(2), 'was', g0.toFixed(2));
console.log('POSE ' + JSON.stringify(p));

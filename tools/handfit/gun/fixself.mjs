// every fitted pose in game/viewmodel-fit.js that has a gloved or bare part of the hand into another past 0.45 mm: nudged
// (its fingers only) until clean, the gun no worse on its field (out4/<gun>-<side>); written back in place
import fs from 'node:fs';
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const FILE = '/home/claude/gs306/game/viewmodel-fit.js', GDIR = process.argv[2] || 'out4';
let src = fs.readFileSync(FILE, 'utf8');
const FIT = (await import(FILE + '?' + Date.now())).VM_FIT, GL = M.GLOVE_INFLATE;
const selfMax = (q) => Math.max(M.handClipReport(q, 0.0004, false, GL).max, M.handClipReport(q, 0.0004, false, 0).max);
for (const [key, f] of Object.entries(FIT)) for (const sd of ['r', 'l']) {
  if (!f[sd]) continue; const p0 = f[sd].pose, s0 = selfMax(p0);
  if (s0 <= 0.45) continue;
  const base = GDIR + '/' + key + '-' + sd; const G = fs.existsSync(base + '.bin') ? loadGrid(base) : null;
  const gunMin = (q) => { if (!G) return 0; const P = M.handPosed(q, GL); let m = 1; for (let v = 0; v < P.n; v++) m = Math.min(m, G.d(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2])); return m * 1000; };
  const g0 = gunMin(p0);
  const cost = (q) => { const sm = selfMax(q), gm = gunMin(q); let dev = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) dev += (q.f[i][j] - p0.f[i][j]) ** 2; return { c: Math.max(0, sm - 0.38) ** 2 * 20 + Math.max(0, g0 - gm) ** 2 * 5 + dev * 5, sm, gm }; };
  let p = JSON.parse(JSON.stringify(p0)), best = cost(p);
  for (const st of [0.04, 0.02, 0.01]) { let imp = true, it = 0; while (imp && it++ < 20) { imp = false; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (const sg of [-1, 1]) { const q = JSON.parse(JSON.stringify(p)); q.f[i][j] = +(q.f[i][j] + sg * st).toFixed(4); const e = cost(q); if (e.c < best.c - 1e-6) { p = q; best = e; imp = true; } } } }
  console.log(key, sd, 'self', s0, '->', best.sm, 'gun', g0.toFixed(2), '->', best.gm.toFixed(2));
  const a = JSON.stringify(p0, null, 0).replace(/,/g, ', ').replace(/:/g, ': ');
  const old = JSON.stringify(p0).replace(/,/g, ', ').replace(/:/g, ': '), neu = JSON.stringify(p).replace(/,/g, ', ').replace(/:/g, ': ');
  if (src.includes(old)) src = src.replace(old, neu); else console.log('  (not found in the file text)');
}
fs.writeFileSync(FILE, src);

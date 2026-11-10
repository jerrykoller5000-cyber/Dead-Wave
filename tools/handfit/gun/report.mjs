// every gun x hand: the gloved hand (as the game draws it, its exported pose) against the gun: per bone the closest (mm)
import fs from 'node:fs';
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const NAMES = ['palm', 'i1', 'i2', 'i3', 'm1', 'm2', 'm3', 'r1', 'r2', 'r3', 'l1', 'l2', 'l3', 't0', 't1', 't2'];
for (const f of fs.readdirSync('out').filter((f) => f.endsWith('.bin')).sort()) {
  const base = 'out/' + f.replace(/\.bin$/, ''), G = loadGrid(base), pose = G.H.hand.pose;
  const P = M.handPosed(pose, M.GLOVE_INFLATE), byB = new Array(16).fill(1);
  for (let v = 0; v < P.n; v++) { const d = G.d(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); if (d < byB[P.b0[v]]) byB[P.b0[v]] = d; }
  const self = M.handClipReport(pose, 0.0005, false, M.GLOVE_INFLATE);
  const worst = Math.min(...byB) * 1000;
  console.log(f.replace('.bin', '').padEnd(12), 'into gun', worst.toFixed(1).padStart(6), 'mm | self', String(self.max).padStart(5), '|', byB.map((d, k) => NAMES[k] + ' ' + (d * 1000).toFixed(1)).join('  '));
}

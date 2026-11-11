// fieldchk.mjs <grid base> <canon pts json file>: min field per bone label
import { loadGrid } from '/home/claude/handfit-work/gun/grid.mjs'; import fs from 'node:fs';
const G = loadGrid(process.argv[2]); const J = JSON.parse(fs.readFileSync(process.argv[3]));
const m = {}; for (let i = 0; i < J.p.length; i++) { const [x, y, z] = J.p[i]; const d = G.d(x, y, z); const b = J.b[i]; if (!(b in m) || d < m[b]) m[b] = d; }
console.log(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +(v * 1000).toFixed(1)])));

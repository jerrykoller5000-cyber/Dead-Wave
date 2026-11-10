import * as M from './mh-tool.mjs';
const L = M.handLayout(1, 0, 0); const [pose, r, bz, dy] = [JSON.parse(process.argv[2]), +process.argv[3], +process.argv[4], +process.argv[5]];
const P = M.handPosed(pose), byB = new Array(16).fill(1);
for (let v = 0; v < P.n; v++) { const d = Math.hypot(P.p[v * 3 + 1] - (L.gripY + dy), P.p[v * 3 + 2] - bz) - r; if (d < byB[P.b0[v]]) byB[P.b0[v]] = d; }
const R = M.handClipReport(pose);
console.log('bar', JSON.stringify(byB.map((d) => +(d * 1000).toFixed(2))), 'self', R.max, JSON.stringify(R.pairs));

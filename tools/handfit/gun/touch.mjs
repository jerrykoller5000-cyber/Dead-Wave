import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const name = process.argv[2], G = loadGrid('out/' + name), pose = G.H.hand.pose, side = name.endsWith('-r') ? 'r' : 'l';
const P = M.handPosed(pose, M.GLOVE_INFLATE), byB = new Array(16).fill(1);
for (let v = 0; v < P.n; v++) { const d = G.d(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); if (d < byB[P.b0[v]]) byB[P.b0[v]] = d; }
const touch = side === 'r' && !/chainsaw|minigun|flamer|launcher/.test(name) ? [0, 4, 5, 6, 7, 8, 9, 10, 11, 12] : byB.map((d, b) => (d < 0.003 ? b : -1)).filter((b) => b >= 0 && b !== 13);
console.log(JSON.stringify(touch));

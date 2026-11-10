import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const [base, resArg] = process.argv.slice(2); const R = JSON.parse(resArg); const G = loadGrid(base);
const P = M.handPosed(R.pose, M.GLOVE_INFLATE), C = [0, -0.271, 0.008];
const [dx, dy, dz] = R.move.map((v) => v / 1000), [a, b2] = R.turn, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b2), sb = Math.sin(b2);
const worst = {};
for (let v = 0; v < P.n; v++) {
  let px = P.p[v * 3] - dx - C[0], py = P.p[v * 3 + 1] - dy - C[1], pz = P.p[v * 3 + 2] - dz - C[2];
  const qx = ca * px + sa * pz, qz = -sa * px + ca * pz, rx = cb * qx + sb * py, ry = -sb * qx + cb * py;
  const g = [rx + C[0], ry + C[1], qz + C[2]], d = G.d(...g), b = P.b0[v];
  if (!worst[b] || d < worst[b].d) worst[b] = { d, g, u: v };
}
for (const b of [0, 2, 4, 13, 14]) console.log(b, (worst[b].d * 1000).toFixed(1), JSON.stringify(worst[b].g.map((x) => +x.toFixed(4))));

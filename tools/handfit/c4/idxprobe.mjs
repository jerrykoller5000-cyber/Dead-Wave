// idxprobe.mjs <grid> <c2g file> '<pose>' '<move json>' (CD-1 fixes 5): index configs whose pad lands near the trigger's face
// (PADBOX gun mm [x0,x1,y0,y1,z0,z1]); for the best few: each index bone's deepest point in the gun and where (gun mm)
import fs from 'node:fs';
import { loadGrid } from '../gun/grid.mjs';
import * as M from '../hand/mh-tool.mjs';
import { padOf } from './pad.mjs';
const G = loadGrid(process.argv[2]); const A = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); const pose0 = JSON.parse(process.argv[4]);
const MV = process.argv[5] ? JSON.parse(process.argv[5]) : { a1: 0, b2: 0, c3: 0, move: [0, 0, 0] };
const PB = JSON.parse(process.env.PADBOX || '[-4,4,-36,-26,36,46]');
const toG = (p) => [A[0]*p[0]+A[1]*p[1]+A[2]*p[2]+A[3], A[4]*p[0]+A[5]*p[1]+A[6]*p[2]+A[7], A[8]*p[0]+A[9]*p[1]+A[10]*p[2]+A[11]];
const C = [0, -0.271, 0.008]; const { a1, b2, c3 } = MV; const d = MV.move.map((v) => v / 1000);
const xf = (x, y, z) => { const ca = Math.cos(a1), sa = Math.sin(a1), cb = Math.cos(b2), sb = Math.sin(b2), cc = Math.cos(c3), sc = Math.sin(c3); let px = x - C[0], py = y - C[1], pz = z - C[2]; let qx = ca * px + sa * pz, qz = -sa * px + ca * pz, qy = py; let rx = cb * qx + sb * qy, ry = -sb * qx + cb * qy; qx = rx; qy = ry; ry = cc * qy + sc * qz; const rz = -sc * qy + cc * qz; return [qx + C[0] + d[0], ry + C[1] + d[1], rz + C[2] + d[2]]; };
const R = (a, b, s) => { const r = []; for (let v = a; v <= b + 1e-9; v += s) r.push(+v.toFixed(3)); return r; };
const out = [];
for (const mcp of R(-0.3, 1.5, 0.1)) for (const pip of R(0, 1.9, 0.1)) for (const dip of R(0, 1.4, 0.2)) for (const sp of R(-0.35, 0.35, 0.175)) {
  const pose = JSON.parse(JSON.stringify(pose0)); pose.f[0] = [mcp, pip, dip, sp]; const pd = toG(xf(...padOf(pose).pad));
  if (pd[0] < PB[0] || pd[0] > PB[1] || pd[1] < PB[2] || pd[1] > PB[3] || pd[2] < PB[4] || pd[2] > PB[5]) continue;
  const P = M.handPosed(pose, M.GLOVE_INFLATE); const w = { 1: [1], 2: [1], 3: [1] };
  for (let v = 0; v < P.n; v++) { const b = P.b0[v]; if (b < 1 || b > 3) continue; const c = xf(P.p[v*3], P.p[v*3+1], P.p[v*3+2]); const f = G.d(...c); if (f < w[b][0]) w[b] = [f, toG(c)]; }
  const worst = Math.min(w[1][0], w[2][0], w[3][0]); out.push({ f0: [mcp, pip, dip, sp], pad: pd.map((v) => +v.toFixed(1)), worst: +(worst * 1000).toFixed(2), by: [1, 2, 3].map((b) => [+(w[b][0] * 1000).toFixed(1), w[b][1] ? w[b][1].map((v) => +v.toFixed(0)) : null]) });
}
out.sort((a, b) => b.worst - a.worst); console.log('n', out.length); for (const o of out.slice(0, +(process.env.TOP || 8))) console.log(JSON.stringify(o));

// topmap.mjs <grid> <c2g json file> '<pose>' <gun y mm> [move json {a1,b2,c3,move}] (CD-1 fixes 5): an ascii map seen from above at a
// height in the gun (x across, 2 mm; z along the bore, 3 mm, forward up): '#' inside the gun, '.' within 1 mm; the glove's bones
// within 2 mm of that height: P palm, 1 2 3 the index, m middle, r ring, t thumb.
import fs from 'node:fs';
import { loadGrid } from '../gun/grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const G = loadGrid(process.argv[2]); const A = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); const pose = JSON.parse(process.argv[4]); const Y = +process.argv[5];
const MV = process.argv[6] ? JSON.parse(process.argv[6]) : { a1: 0, b2: 0, c3: 0, move: [0, 0, 0] };
const R = [[A[0], A[1], A[2]], [A[4], A[5], A[6]], [A[8], A[9], A[10]]], t = [A[3], A[7], A[11]];
const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const inv = (m) => { const d = det(m); return [[(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / d, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / d, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / d], [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / d, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / d, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / d], [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) / d, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / d, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / d]]; };
const Ri = inv(R); const g2c = (g) => { const q = [g[0] - t[0], g[1] - t[1], g[2] - t[2]]; return [0, 1, 2].map((i) => Ri[i][0] * q[0] + Ri[i][1] * q[1] + Ri[i][2] * q[2]); };
const C = [0, -0.271, 0.008]; const { a1, b2, c3 } = MV; const d = MV.move.map((v) => v / 1000);
const xf = (x, y, z) => { const ca = Math.cos(a1), sa = Math.sin(a1), cb = Math.cos(b2), sb = Math.sin(b2), cc = Math.cos(c3), sc = Math.sin(c3); let px = x - C[0], py = y - C[1], pz = z - C[2]; let qx = ca * px + sa * pz, qz = -sa * px + ca * pz, qy = py; let rx = cb * qx + sb * qy, ry = -sb * qx + cb * qy; qx = rx; qy = ry; ry = cc * qy + sc * qz; const rz = -sc * qy + cc * qz; return [qx + C[0] + d[0], ry + C[1] + d[1], rz + C[2] + d[2]]; };
const P = M.handPosed(pose, M.GLOVE_INFLATE); const lab = { 0: 'P', 1: '1', 2: '2', 3: '3', 4: 'm', 5: 'm', 6: 'm', 7: 'r', 8: 'r', 9: 'r', 13: 't', 14: 't', 15: 't' };
const grid = new Map();
for (let v = 0; v < P.n; v++) { const c = xf(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); const g = [0, 1, 2].map((i) => R[i][0] * c[0] + R[i][1] * c[1] + R[i][2] * c[2] + t[i]);
  if (Math.abs(g[1] - Y) > 2.5) continue; const k = Math.round(g[0] / 2) + ',' + Math.round(g[2] / 3); const L = lab[P.b0[v]] || 'o'; if (!grid.has(k) || L === '3' || L === '2') grid.set(k, L); }
for (let z = +(process.env.Z1 || 70); z >= +(process.env.Z0 || -60); z -= 3) { let s = String(z).padStart(4) + ' ';
  for (let x = +(process.env.X0 || -40); x <= +(process.env.X1 || 80); x += 2) { const k = Math.round(x / 2) + ',' + Math.round(z / 3); if (grid.has(k)) { s += grid.get(k); continue; } const f = G.d(...g2c([x, Y, z])); s += f < 0 ? '#' : f < 0.001 ? '.' : ' '; }
  console.log(s); }
console.log('     x: -40 ... 80 (2 mm), | at x=0 is col ' + (20));

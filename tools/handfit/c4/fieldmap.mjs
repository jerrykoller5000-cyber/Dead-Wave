// fieldmap.mjs <grid base> <c2g json file> <gun y mm> (CD-1, 12 Nov): a field (sdf_c5) as an ascii map at one gun height, to compare with parmap.py (the test's parity)
import { loadGrid } from '/home/claude/gs306/tools/handfit/gun/grid.mjs';
import fs from 'node:fs';
const G = loadGrid(process.argv[2]); const A = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
// A: canonical m -> gun mm, 3x4 row-major. invert
const M = [[A[0],A[1],A[2]],[A[4],A[5],A[6]],[A[8],A[9],A[10]]], t = [A[3],A[7],A[11]];
const det = M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) - M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) + M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
const inv = [[ (M[1][1]*M[2][2]-M[1][2]*M[2][1])/det, -(M[0][1]*M[2][2]-M[0][2]*M[2][1])/det, (M[0][1]*M[1][2]-M[0][2]*M[1][1])/det],
 [-(M[1][0]*M[2][2]-M[1][2]*M[2][0])/det, (M[0][0]*M[2][2]-M[0][2]*M[2][0])/det, -(M[0][0]*M[1][2]-M[0][2]*M[1][0])/det],
 [ (M[1][0]*M[2][1]-M[1][1]*M[2][0])/det, -(M[0][0]*M[2][1]-M[0][1]*M[2][0])/det, (M[0][0]*M[1][1]-M[0][1]*M[1][0])/det]];
const g2c = p => { const d = [p[0]-t[0], p[1]-t[1], p[2]-t[2]]; return inv.map(r => r[0]*d[0]+r[1]*d[1]+r[2]*d[2]); };
const y = +process.argv[4];
console.log('y', y, 'rows z (fwd up), cols x', process.env.X0 || -20, '..', process.env.X1 || 40, 'step 2; # in, + <1.5mm, . clear');
for (let z = 10; z >= -90; z -= 3) { let s = String(z).padStart(4) + ' ';
  for (let x = +(process.env.X0 || -20); x <= +(process.env.X1 || 40); x += 2) { const c = g2c([x, y, z]); const v = G.d(c[0], c[1], c[2]); const mm = v * 1000 / 1; s += v < 0 ? '#' : (mm < 1.5 ? '+' : '.'); }
  console.log(s); }

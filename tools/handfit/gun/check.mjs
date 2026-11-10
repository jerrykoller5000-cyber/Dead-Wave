// the hand in the game against the gun: how deep each bone goes in, and the canonical hand matched with handPosed
import fs from 'node:fs';
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const [base, poseArg] = process.argv.slice(2);
const G = loadGrid(base);
const pose = poseArg ? JSON.parse(poseArg) : G.H.hand.pose;
const P = M.handPosed(pose);
// the exported hand (canonical) vs handPosed: nearest-neighbour match on the first n
const buf = fs.readFileSync(base + '-hand.npy'); const hdr = buf.readUInt16LE(8) + 10; const Hc = new Float32Array(buf.buffer.slice(buf.byteOffset + hdr));
let maxd = 0; const n = Math.min(P.n, Hc.length / 3);
for (let v = 0; v < n; v += 7) { let best = 1; for (let u = 0; u < Hc.length / 3; u += 1) { const d = Math.hypot(P.p[v * 3] - Hc[u * 3], P.p[v * 3 + 1] - Hc[u * 3 + 1], P.p[v * 3 + 2] - Hc[u * 3 + 2]); if (d < best) best = d; } if (best > maxd) maxd = best; }
const byB = new Array(16).fill(1);
for (let v = 0; v < P.n; v++) { const d = G.d(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); if (d < byB[P.b0[v]]) byB[P.b0[v]] = d; }
console.log('match (mm, handPosed vs the game)', (maxd * 1000).toFixed(2), 'poses', JSON.stringify(pose));
console.log('per bone, closest to the gun (mm; below 0 inside):', JSON.stringify(byB.map((d) => +(d * 1000).toFixed(1))));

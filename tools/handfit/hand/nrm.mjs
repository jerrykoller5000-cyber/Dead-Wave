import { readFileSync } from 'node:fs';
const src = readFileSync('/home/claude/gs306/studio/marine-hand.js', 'utf8') + '\nexport { handLayout as _hl, boneFrames as _bf, handSurface as _hs, BUILD as _B };';
const M = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const L = M._hl(1, 0, 0), S = M._hs(L, M._bf(L, M._B), true), B = S.B;
// back of the hand: z < mcpZ - 0.008, y between -0.24 and -0.27, |x| < 0.03
const nb = new Map(); for (let t = 0; t < B.idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = B.idx[t + e], b = B.idx[t + (e + 1) % 3]; if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b); }
let sum = 0, cnt = 0, mx = 0;
for (let v = 0; v < B.p.length / 3; v++) {
  const x = B.p[v*3], y = B.p[v*3+1], z = B.p[v*3+2];
  if (!(z < L.mcpZ - 0.008 && y < -0.235 && y > -0.265 && Math.abs(x) < 0.025)) continue;
  for (const w of nb.get(v) || []) { const d = B.n[v*3]*B.n[w*3] + B.n[v*3+1]*B.n[w*3+1] + B.n[v*3+2]*B.n[w*3+2]; const ang = Math.acos(Math.min(1, d)) * 180 / Math.PI; sum += ang; cnt++; mx = Math.max(mx, ang); }
}
console.log('neighbour normal angle on the back: mean', (sum / cnt).toFixed(2), 'max', mx.toFixed(2), 'n', cnt);
// how far are vertices off the surface

// local search on a pose's thumb (and optionally fingers) to remove self-clips, keeping it close to the start
import * as M from './mh-tool.mjs';
const name = process.argv[2], P0 = JSON.parse(JSON.stringify(M.HAND_POSES[name]));
const J = M._J;
const clip = (p) => M.handClipReport(p, 0.0002);
const cost = (p) => { const r = clip(p); let d = 0; for (let k = 0; k < 5; k++) d += (p.t[k] - P0.t[k]) ** 2; return { c: Math.max(0, r.max - 0.25) ** 2 * 4 + r.count * 0.01 + d * 2, r }; };
let p = JSON.parse(JSON.stringify(P0)), best = cost(p);
console.log('start', JSON.stringify(best.r));
for (let step of [0.1, 0.05, 0.025]) {
  let improved = true;
  while (improved) {
    improved = false;
    for (let k = 0; k < 5; k++) for (const sg of [-1, 1]) {
      const q = JSON.parse(JSON.stringify(p)); q.t[k] = +(q.t[k] + sg * step).toFixed(3);
      const e = cost(q); if (e.c < best.c - 1e-6) { p = q; best = e; improved = true; }
    }
  }
  console.log('step', step, JSON.stringify(p.t), JSON.stringify(best.r));
}

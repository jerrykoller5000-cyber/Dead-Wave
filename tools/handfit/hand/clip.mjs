import * as M from '/home/claude/gs306/studio/marine-hand.js';
const P = M.HAND_POSES;
for (const [k, p] of Object.entries(P)) { const t0 = performance.now(); const r = M.handClipReport(p); console.log(k, JSON.stringify(r), (performance.now() - t0).toFixed(0) + 'ms'); }

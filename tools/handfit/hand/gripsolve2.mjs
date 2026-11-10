// CL-334 h: the grip solver on the real surface (handPosed, handClipReport). A pose round a bar (radius r, through the
// grip channel, its height above the palm free to settle): every finger bone touching the bar (closest approach 0..0.3 mm),
// nothing of the hand inside it deeper than 0.3 mm, no part of the hand into another deeper than 0.4 mm, the end joints
// following the middle ones (0.5 to 0.9), the thumb's end bone on the index's or middle finger's middle bone; as near the
// start as that allows.
import * as M from './mh-tool.mjs';
const J = M._J, L = M.handLayout(1, 0, 0);
const r = +(process.argv[2] || 0.013);
const start = JSON.parse(process.argv[3]); while (start.t.length < 6) start.t.push(0);
const fixZ = process.argv[4] ? +process.argv[4] : null;
// x: [12 finger values (a, b, c per finger), 6 thumb, bar z]
const pack = (p, z) => [...p.f.flatMap((q) => q.slice(0, 3)), ...p.t, z, 0];
const unpack = (x) => ({ f: [0, 1, 2, 3].map((i) => [x[i * 3], x[i * 3 + 1], x[i * 3 + 2], start.f[i][3]]), t: x.slice(12, 18) });
const LIM = [...[0, 1, 2, 3].flatMap(() => [J.mcp, J.pip, J.dip]), [-0.2, 1.6], [-1.6, 1.4], [-0.2, 1.4], J.cmcRoll, J.tMcp, J.cmcAbd, [-0.01, 0.03], [-0.004, 0.004]];
const clampX = (x) => x.map((v, k) => Math.max(LIM[k][0], Math.min(LIM[k][1], v)));
const x0 = pack(start, fixZ ?? 0.008);
function cost(x) {
  const pose = unpack(x), bz = x[18], by = L.gripY + x[19];
  const GL = +(process.env.GLOVE || 0);
  const P = M.handPosed(pose, GL), byB = new Float64Array(16).fill(1);
  for (let v = 0; v < P.n; v++) { const d = Math.hypot(P.p[v * 3 + 1] - by, P.p[v * 3 + 2] - bz) - r; if (d < byB[P.b0[v]]) byB[P.b0[v]] = d; }
  const mm = (d) => d * 1000;
  let bar = 0, gap = 0;
  for (let b = 0; b < 16; b++) { const d = mm(byB[b]); if (d < -0.2) bar += (d + 0.2) ** 2; }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const d = mm(byB[1 + i * 3 + j]); gap += (j === 2 ? 0.5 : 1) * Math.max(0, d - 0.3) ** 2; }
  gap += 0.3 * Math.max(0, mm(byB[0]) - 0.3) ** 2;   // the palm on the bar
  const R = M.handClipReport(pose, 0.0005, true, GL);
  let self = 0; for (const k in R.nearBone) { const d = R.nearBone[k]; if (d < -0.4) self += (d + 0.4) ** 2; }
  const n15 = Math.min(R.nearBone['15>2'] ?? 6, R.nearBone['15>5'] ?? 6);
  const thumb = process.env.FREEZE_T ? 0 : Math.max(0, n15 - 0.4) ** 2;
  let coup = 0; for (let i = 0; i < 4; i++) { const b = x[i * 3 + 1], c = x[i * 3 + 2]; coup += Math.max(0, 0.5 * b - c) ** 2 + Math.max(0, c - 0.9 * b) ** 2; }
  let dev = 0; for (let k = 0; k < 18; k++) dev += (x[k] - x0[k]) ** 2;
  return { c: bar * 10 + gap + self * 4 + thumb + coup * 50 + dev * 0.05, bar, gap, self, thumb, coup, byB: Array.from(byB, (d) => +mm(d).toFixed(1)), R };
}
let x = clampX(x0.slice()), best = cost(x);
const show = (tag) => console.log(tag, best.c.toFixed(3), 'bar', best.bar.toFixed(2), 'gap', best.gap.toFixed(2), 'self', best.self.toFixed(2), 'thumb', best.thumb.toFixed(2), 'coup', best.coup.toFixed(3), 'max', best.R.max, 'z', x[18].toFixed(4), 'dy', x[19].toFixed(4), JSON.stringify(best.byB));
show('start');
const nv = 20, FT = !!process.env.FREEZE_T;
for (const step of [0.1, 0.05, 0.025, 0.0125]) {
  let improved = true, n = 0;
  while (improved && n++ < 30) {
    improved = false;
    for (let k = 0; k < nv; k++) for (const sg of [-1, 1]) {
      if (FT && k >= 12 && k < 18) continue; if (fixZ != null && k === 18) continue;
      const q = x.slice(); q[k] += sg * (k >= 18 ? step * 0.01 : step); const qc = clampX(q);
      const e = cost(qc); if (e.c < best.c - 1e-6) { x = qc; best = e; improved = true; }
    }
    // the joints of one finger together, and the thumb's coupled pairs
    for (let i = 0; i < 4; i++) for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const q = x.slice(); q[i * 3 + a] += sa * step; q[i * 3 + b] += sb * step; const qc = clampX(q);
      const e = cost(qc); if (e.c < best.c - 1e-6) { x = qc; best = e; improved = true; }
    }
    if (!FT) for (const [a, b] of [[12, 17], [16, 17], [12, 16], [14, 16], [13, 17], [12, 13], [15, 17]]) for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const q = x.slice(); q[a] += sa * step; q[b] += sb * step; const qc = clampX(q);
      const e = cost(qc); if (e.c < best.c - 1e-6) { x = qc; best = e; improved = true; }
    }
  }
  show('step ' + step);
}
const pose = unpack(x);
console.log('NEAR', JSON.stringify(best.R.nearBone));
console.log('POSE ' + JSON.stringify({ f: pose.f.map((q) => q.map((v) => +v.toFixed(3))), t: pose.t.map((v) => +v.toFixed(3)) }), 'barZ', x[18].toFixed(4), 'barDY', x[19].toFixed(4));

// The fist's thumb: over the bar (never through), its pad on the backs of the index and middle fingers' middle bones (in
// contact: closest approach between -0.5 and +0.5 mm), no self-clip deeper than 0.5 mm (handClipReport, the real surface).
import * as M from './mh-tool.mjs';
const L = M.handLayout(1, 0, 0), J = M._J;
const BAR = { y: L.gripY, z: L.mcpZ + 0.008, r: +(process.argv[2] || 0.013) };
const fr = (Mx, k, x, y, z) => { const m = Mx[k]; return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]]; };
const TP = M._tp(L.thumb), Tl = L.thumb.len, Ttot = Tl[0] + Tl[1] + Tl[2];
const P0 = JSON.parse(JSON.stringify(M.HAND_POSES.fist)); while (P0.t.length < 6) P0.t.push(0);
function barGap(t) {
  const Mx = M._bf(L, { f: P0.f, t });
  let g = 1;
  for (const [k, u, uu] of [[13, Tl[0] * 0.7, Tl[0] * 0.7], [13, Tl[0] * 0.95, Tl[0] * 0.95], [14, Tl[1] * 0.5, Tl[0] + Tl[1] * 0.5], [15, Tl[2] * 0.4, Tl[0] + Tl[1] + Tl[2] * 0.4]]) {
    const p = fr(Mx, k, 0, -u, TP(uu, Ttot).rf); g = Math.min(g, Math.hypot(p[1] - BAR.y, p[2] - BAR.z) - BAR.r);
  }
  return g;
}
function cost(t) {
  const p = { f: P0.f, t }, r = M.handClipReport(p, 0.0005);
  const nI = r.near['thumb>index'] ?? 6, nM = r.near['thumb>middle'] ?? 6, g = barGap(t) * 1000;
  const pen = Math.max(0, -nI - 0.5) ** 2 + Math.max(0, -nM - 0.5) ** 2 + Math.max(0, -(r.near['index>thumb'] ?? 6) - 0.5) ** 2 + Math.max(0, -(r.near['middle>thumb'] ?? 6) - 0.5) ** 2;
  const gap = Math.max(0, nI - 0.3) ** 2 + 0.5 * Math.max(0, nM - 0.8) ** 2;
  const bar = Math.max(0, -g - 0.3) ** 2;
  let d = 0; for (let k = 0; k < 6; k++) d += (t[k] - P0.t[k]) ** 2;
  return { c: pen * 4 + gap * 1 + bar * 4 + d * 0.5 + r.count * 0.002, r, g: +g.toFixed(2), nI, nM };
}
let t = (process.argv[3] ? JSON.parse(process.argv[3]) : P0.t).slice(), best = cost(t);
console.log('start', JSON.stringify(t), best.c.toFixed(3), JSON.stringify({ near: best.r.near, bar: best.g }));
for (const step of [0.1, 0.05, 0.025, 0.0125]) {
  let improved = true;
  while (improved) {
    improved = false;
    for (let k = 0; k < 6; k++) for (const sg of [-1, 1]) {
      const q = t.slice(); q[k] = +(q[k] + sg * step).toFixed(4);
      const e = cost(q); if (e.c < best.c - 1e-6) { t = q; best = e; improved = true; }
    }
    // pairs (curl with swing, curl with IP)
    for (const [a, b] of [[0, 1], [0, 2], [1, 2], [2, 3], [0, 3], [0, 5], [5, 4], [5, 1], [5, 2]]) for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const q = t.slice(); q[a] = +(q[a] + sa * step).toFixed(4); q[b] = +(q[b] + sb * step).toFixed(4);
      const e = cost(q); if (e.c < best.c - 1e-6) { t = q; best = e; improved = true; }
    }
  }
  console.log('step', step, JSON.stringify(t), best.c.toFixed(3), 'thumb>index', best.nI, 'thumb>middle', best.nM, 'bar', best.g, 'max', best.r.max);
}
console.log('NEAR', JSON.stringify(best.r.near));
console.log('T ' + JSON.stringify(t));

// A pose's thumb re-solved on the real surface: its end bone's pad (15) touching the backs of the index's and middle
// finger's middle bones (2, 5), nothing deeper than 0.5 mm anywhere, as near the start as that allows.
import * as M from './mh-tool.mjs';
const P0 = JSON.parse(process.argv[2]); while (P0.t.length < 6) P0.t.push(0);
const want = JSON.parse(process.argv[3] || '{"15>2":0.3,"15>5":0.6}');   // bone pairs to bring into contact (mm, the gap allowed)
const N = (r, k) => (k in r.nearBone ? r.nearBone[k] : 6);
function cost(t) {
  const r = M.handClipReport({ f: P0.f, t }, 0.0005, true);
  let pen = 0; for (const k in r.nearBone) { const d = r.nearBone[k]; if (d < -0.4) pen += (d + 0.4) ** 2; }
  let gap = 0; for (const k in want) gap += Math.max(0, N(r, k) - want[k]) ** 2;
  let dev = 0; for (let k = 0; k < 6; k++) dev += (t[k] - P0.t[k]) ** 2;
  return { c: pen * 4 + gap + dev * 0.3, r, pen, gap };
}
function local(t0) {
  let t = t0.slice(), best = cost(t);
  for (const step of [0.1, 0.05, 0.025, 0.0125]) {
    let improved = true, n = 0;
    while (improved && n++ < 40) {
      improved = false;
      for (let k = 0; k < 6; k++) for (const sg of [-1, 1]) {
        const q = t.slice(); q[k] = +(q[k] + sg * step).toFixed(4); const e = cost(q); if (e.c < best.c - 1e-6) { t = q; best = e; improved = true; }
      }
      for (const [a, b] of [[0, 5], [4, 5], [0, 4], [2, 4], [1, 5], [0, 1], [3, 5]]) for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
        const q = t.slice(); q[a] = +(q[a] + sa * step).toFixed(4); q[b] = +(q[b] + sb * step).toFixed(4); const e = cost(q); if (e.c < best.c - 1e-6) { t = q; best = e; improved = true; }
      }
    }
  }
  return { t, best };
}
let top = null;
const starts = [P0.t];
for (const a5 of [0.1, 0.2, 0.3]) for (const m4 of [-0.1, 0.1, 0.3]) starts.push([P0.t[0], P0.t[1], P0.t[2], P0.t[3], m4, a5]);
for (const s of starts) {
  const o = local(s);
  const sel = {}; for (const k in o.best.r.nearBone) if (o.best.r.nearBone[k] < 1.5 && (k.startsWith('15') || k.startsWith('14') || k.endsWith('>14') || k.endsWith('>15'))) sel[k] = o.best.r.nearBone[k];
  console.log(JSON.stringify(o.t), o.best.c.toFixed(3), 'pen', o.best.pen.toFixed(3), 'gap', o.best.gap.toFixed(3), 'max', o.best.r.max, JSON.stringify(sel));
  if (!top || o.best.c < top.best.c) top = o;
}
console.log('T ' + JSON.stringify(top.t));

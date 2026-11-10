// The thumb over fixed fingers on a bar: a grid over the thumb's six values, fast (only the thumb against the fingers and
// the bar), then the best few checked with the full handClipReport. Targets: its end bone (15) on the index's or middle
// finger's middle bone (2, 5) touching (0..0.4 mm), its first phalanx (14) on the bar or the index's side, nothing deeper
// than 0.4 mm into anything.
import * as M from './mh-tool.mjs';
const L = M.handLayout(1, 0, 0), Rb = M._bf(L, M._BUILD), H = M._hf(L, Rb), B = M._hs(L, Rb, true).B, ap = M._ap, mul = M._mul, inv = M._inv;
const r = +(process.argv[2] || 0.013), F = JSON.parse(process.argv[3]), bz = +(process.argv[4] || 0.008);
const PART = (b) => b === 0 ? -1 : b >= 13 ? 4 : Math.floor((b - 1) / 3);
const n = B.p.length / 3, segOf = (g, k) => { let c0 = 0; for (let j = 0; j < k; j++) c0 += g.lens[j]; return [c0, c0 + g.lens[k]]; };
const thumbV = [], fingV = [];
for (let v = 0; v < n; v++) { const a = PART(B.b0[v]); if (a < 0) continue; const u = -H.digits[a].local(B.p[v * 3], B.p[v * 3 + 1], B.p[v * 3 + 2])[1]; if (u < 0.015) continue; (a === 4 ? thumbV : fingV).push(v); }
const GL = +(process.env.GLOVE || 0);
const gAt = (v) => { const b = B.b0[v]; if (!GL || b < 1 || b > 12) return GL; const M = Rb[b], lat = B.n[v * 3] * M[0] + B.n[v * 3 + 1] * M[4] + B.n[v * 3 + 2] * M[8]; return GL * (1 - 0.75 * lat * lat); };
const posed = (S, v) => { const g = gAt(v), rx = B.p[v * 3] + B.n[v * 3] * g, ry = B.p[v * 3 + 1] + B.n[v * 3 + 1] * g, rz = B.p[v * 3 + 2] + B.n[v * 3 + 2] * g, w = B.w1[v]; let q = ap(S[B.b0[v]], rx, ry, rz); if (w > 0) { const o = ap(S[B.b1[v]], rx, ry, rz); q = [q[0] * (1 - w) + o[0] * w, q[1] * (1 - w) + o[1] * w, q[2] * (1 - w) + o[2] * w]; } return q; };
const into = (g, Si, p, k) => { const bone = g.bones[k], q = ap(Si[bone], p[0], p[1], p[2]), u = -g.local(q[0], q[1], q[2])[1], [u0, u1] = segOf(g, k); if (u < u0 - 0.001 || u > (k === 2 ? u1 + 0.003 : u1 + 0.001) || u < 0.012) return 1; return g.d(q[0], q[1], q[2]); };
// the fingers posed once
const S0 = M._bf(L, { f: F, t: [0, 0, 0, 0, 0, 0] }).map((m, k) => mul(m, inv(Rb[k]))), Si0 = S0.map(inv);
const fingP = fingV.map((v) => posed(S0, v));
const W = JSON.parse(process.argv[5] || '{"tipX":[0,16],"tipY":[-296,-276],"ipX":30}');
function place(Mp) {
  const o = (k, u) => { const m = Mp[k]; return [m[1] * -u + m[3], m[5] * -u + m[7], m[9] * -u + m[11]].map((x) => x * 1000); };
  const tip = o(15, L.thumb.len[2]), ip = o(15, 0), out = (v, [a, b]) => v < a ? a - v : v > b ? v - b : 0;
  return { e: out(tip[0], W.tipX) ** 2 + out(tip[1], W.tipY) ** 2 + Math.max(0, W.ipX - ip[0]) ** 2, tip, ip };
}
function evalT(t, quick) {
  const Mp0 = M._bf(L, { f: F, t }), pl = place(Mp0);
  if (quick && pl.e > 100) return { c: 1e9 };
  const Mp = Mp0, S = Mp.map((m, k) => mul(m, inv(Rb[k]))), Si = S.map(inv);
  const near = {}; const put = (k, d) => { if (!(k in near) || d < near[k]) near[k] = d; };
  let bar14 = 1, barMin = 1;
  for (const v of thumbV) {
    const p = posed(S, v), b = B.b0[v];
    const db = Math.hypot(p[1] - (L.gripY + +(process.env.BARDY || 0)), p[2] - bz) - r; if (db < barMin) barMin = db; if (b === 14 && db < bar14) bar14 = db;
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const d = into(H.digits[i], Si0, p, k) - GL; if (d < 0.006) put(b + '>' + (1 + i * 3 + k), d); }
    const dp = H.palmD(p[0], p[1], p[2]) - GL; if (dp < 0.006) put(b + '>0', dp);
  }
  const gT = H.digits[4];
  for (let j = 0; j < fingV.length; j++) { const p = fingP[j], b = B.b0[fingV[j]], gv = gAt(fingV[j]); for (let k = 0; k < 3; k++) { const d = into(gT, Si, p, k) - gv; if (d < 0.006) put(b + '>' + (13 + k), d); } }
  const TH = +(process.env.TH || 0.4), W14 = +(process.env.W14 || 0.3);
  let pen = 0, worst = 0; for (const k in near) { const d = near[k] * 1000; if (d < -TH) pen += (d + TH) ** 2; worst = Math.min(worst, d); }
  const barPen = Math.max(0, -barMin * 1000 - 0.3) ** 2;
  const n15 = Math.min(near['15>2'] ?? 0.006, near['15>5'] ?? 0.006) * 1000;
  const c15 = Math.max(0, n15 - 0.4) ** 2;
  const n14 = Math.min(bar14, near['14>1'] ?? 1, near['14>2'] ?? 1) * 1000;
  const c14 = Math.max(0, n14 - 0.5) ** 2;
  return { c: pen * 4 + barPen * 4 + c15 + W14 * c14 + 0.2 * pl.e, place: pl.e.toFixed(1), tip: pl.tip.map((x) => +x.toFixed(1)), ip: pl.ip.map((x) => +x.toFixed(1)), pen, worst: +worst.toFixed(2), n15: +n15.toFixed(2), n14: +n14.toFixed(2), bar: +(barMin * 1000).toFixed(2), near };
}
const R = (a, b, st) => { const o = []; for (let x = a; x <= b + 1e-9; x += st) o.push(+x.toFixed(3)); return o; };
const t0 = Date.now(); let cnt = 0; const top = [];
if (process.env.STARTS) { for (const t of JSON.parse(process.env.STARTS)) top.push({ t, ...evalT(t) }); } else
for (const c of R(0, 1.4, 0.15)) for (const sw of R(-0.8, 0.6, 0.2)) for (const a5 of R(-0.1, 0.8, 0.15)) for (const ip of [0.3, 0.6, 0.9, 1.2]) for (const rl of [-0.2, 0.15, 0.5, 0.85]) for (const m4 of [-0.1, 0.2, 0.5, 0.8]) {
  const t = [c, sw, ip, rl, m4, a5], e = evalT(t, true); if (e.c >= 1e9) continue; cnt++;
  top.push({ t, ...e }); if (top.length > 400) { top.sort((a, b) => a.c - b.c); top.length = 40; }
}
top.sort((a, b) => a.c - b.c);
console.log('evals', cnt, ((Date.now() - t0) / 1000).toFixed(1) + 's');
// refine the best 8 locally
function refine(t) {
  let best = evalT(t);
  for (const step of [0.05, 0.025, 0.0125]) { let imp = true, it = 0; while (imp && it++ < 30) { imp = false; for (let k = 0; k < 6; k++) for (const sg of [-1, 1]) { const q = t.slice(); q[k] = +(q[k] + sg * step).toFixed(4); const e = evalT(q); if (e.c < best.c - 1e-7) { t = q; best = e; imp = true; } } } }
  return { t, ...best };
}
const fin = top.slice(0, 8).map((o) => refine(o.t)).sort((a, b) => a.c - b.c);
for (const o of fin) console.log(JSON.stringify(o.t), 'c', o.c.toFixed(3), 'worst', o.worst, 'n15', o.n15, 'n14', o.n14, 'bar', o.bar, 'place', o.place, 'tip', JSON.stringify(o.tip), 'ip', JSON.stringify(o.ip));
const b = fin[0]; const full = M.handClipReport({ f: F, t: b.t }, 0.0005, true, GL); const bare = M.handClipReport({ f: F, t: b.t }, 0.0005, true);
console.log('BARE', JSON.stringify({ max: bare.max, pairs: bare.pairs }), 'n15', bare.nearBone['15>2'], bare.nearBone['15>5']);
console.log('FULL', JSON.stringify({ max: full.max, pairs: full.pairs }));
console.log('T ' + JSON.stringify(b.t));

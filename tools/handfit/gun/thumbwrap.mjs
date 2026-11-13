// thumbwrap.mjs (CD-13, Claude 1, 13 Nov): thumbgun.mjs with BOTH end bones (14 and 15) resting on the gun (J151 note 3: the thumb's top half wraps), RW the weight, DW the start-pose weight.
// The thumb alone, the fingers and the hand's place fixed (a gungrip result): a grid over its six values, fast (only the
// thumb's vertices posed), gloved: nothing of it into the gun deeper than 0.2 mm or into the fingers deeper than 0.35,
// its end bones (14, 15) resting on the gun (closest 0..0.4 mm), near its start. Then the best few refined.
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const [base, resArg] = process.argv.slice(2); const RES = JSON.parse(resArg), G = loadGrid(base);
const L = M.handLayout(1, 0, 0), Rb = M._bf(L, M._BUILD), H = M._hf(L, Rb), B = M._hs(L, Rb, true).B, ap = M._ap, mul = M._mul, inv = M._inv, GL = M.GLOVE_INFLATE;
const F = RES.pose.f, T0 = RES.pose.t.slice(); while (T0.length < 6) T0.push(0);
const C = [0, L.gripY, 0.008], [dx, dy, dz] = RES.move.map((v) => v / 1000), [ta, tb] = RES.turn, ca = Math.cos(ta), sa = Math.sin(ta), cb = Math.cos(tb), sb = Math.sin(tb);
const gunD = (p) => { let px = p[0] - dx - C[0], py = p[1] - dy - C[1], pz = p[2] - dz - C[2]; const qx = ca * px + sa * pz, qz = -sa * px + ca * pz, rx = cb * qx + sb * py, ry = -sb * qx + cb * py; return G.d(rx + C[0], ry + C[1], qz + C[2]); };
const PART = (b) => b === 0 ? -1 : b >= 13 ? 4 : Math.floor((b - 1) / 3);
const n = B.p.length / 3, segOf = (g, k) => { let c0 = 0; for (let j = 0; j < k; j++) c0 += g.lens[j]; return [c0, c0 + g.lens[k]]; };
const gAt = (v) => { const b = B.b0[v]; if (b < 1 || b > 12) return GL; const Mm = Rb[b], lat = B.n[v * 3] * Mm[0] + B.n[v * 3 + 1] * Mm[4] + B.n[v * 3 + 2] * Mm[8]; return GL * (1 - 0.75 * lat * lat); };
const thumbV = [], fingV = [];
for (let v = 0; v < n; v++) { const a = PART(B.b0[v]); if (a === 4) thumbV.push(v); else if (a >= 0) { const u = -H.digits[a].local(B.p[v * 3], B.p[v * 3 + 1], B.p[v * 3 + 2])[1]; if (u >= 0.015) fingV.push(v); } }
const posed = (S, v) => { const g = gAt(v), rx = B.p[v * 3] + B.n[v * 3] * g, ry = B.p[v * 3 + 1] + B.n[v * 3 + 1] * g, rz = B.p[v * 3 + 2] + B.n[v * 3 + 2] * g, w = B.w1[v]; let q = ap(S[B.b0[v]], rx, ry, rz); if (w > 0) { const o = ap(S[B.b1[v]], rx, ry, rz); q = [q[0] * (1 - w) + o[0] * w, q[1] * (1 - w) + o[1] * w, q[2] * (1 - w) + o[2] * w]; } return q; };
const into = (g, Si, p, k) => { const bone = g.bones[k], q = ap(Si[bone], p[0], p[1], p[2]), u = -g.local(q[0], q[1], q[2])[1], [u0, u1] = segOf(g, k); if (u < u0 - 0.001 || u > (k === 2 ? u1 + 0.003 : u1 + 0.001) || u < 0.012) return 1; return g.d(q[0], q[1], q[2]); };
const S0 = M._bf(L, { f: F, t: [0, 0, 0, 0, 0, 0] }).map((m, k) => mul(m, inv(Rb[k]))), Si0 = S0.map(inv);
const fingP = fingV.map((v) => posed(S0, v));
const TB = [0, 0, 0];   // the thumb's bones' closest to the gun
function evalT(t) {
  const S = M._bf(L, { f: F, t }).map((m, k) => mul(m, inv(Rb[k]))), Si = S.map(inv);
  let pen = 0, gpen = 0, worst = 0, gworst = 1; TB[0] = TB[1] = TB[2] = 1;
  for (const v of thumbV) {
    const p = posed(S, v), b = B.b0[v];
    const dg = gunD(p); if (dg < TB[b - 13]) TB[b - 13] = dg;
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const d = (into(H.digits[i], Si0, p, k) - GL) * 1000; if (d < -0.35) pen += (d + 0.35) ** 2; if (d < worst) worst = d; }
  }
  const gT = H.digits[4];
  for (let j = 0; j < fingV.length; j++) { const p = fingP[j], gv = gAt(fingV[j]); for (let k = 0; k < 3; k++) { const d = (into(gT, Si, p, k) - gv) * 1000; if (d < -0.35) pen += (d + 0.35) ** 2; if (d < worst) worst = d; } }
  for (let k = 0; k < 3; k++) { const d = TB[k] * 1000; if (d < -0.2) gpen += (d + 0.2) ** 2; gworst = Math.min(gworst, d); }
  const rest = Math.max(0, TB[1] * 1000 - 0.4) ** 2 + Math.max(0, TB[2] * 1000 - 0.4) ** 2 + (+process.env.R0 || 0) * Math.max(0, TB[0] * 1000 - 0.4) ** 2;
  let dev = 0; for (let k = 0; k < 6; k++) dev += (t[k] - T0[k]) ** 2;
  return { c: pen * 4 + gpen * 10 + (+process.env.RW || 0.3) * rest + dev * (+process.env.DW || 0.5), worst: +worst.toFixed(2), gun: TB.map((d) => +(d * 1000).toFixed(1)) };
}
const R = (a, b, st) => { const o = []; for (let x = a; x <= b + 1e-9; x += st) o.push(+x.toFixed(3)); return o; };
const top = []; const t0 = Date.now();
for (const c of R(-0.1, 1.5, 0.2)) for (const sw of R(-1.6, 1.2, 0.35)) for (const a5 of R(-0.1, 0.8, 0.3)) for (const ip of [0, 0.4, 0.8, 1.2]) for (const rl of [-0.3, 0.2, 0.7]) for (const m4 of [-0.1, 0.3, 0.7]) {
  const t = [c, sw, ip, rl, m4, a5], e = evalT(t); top.push({ t, ...e }); if (top.length > 300) { top.sort((a, b) => a.c - b.c); top.length = 30; }
}
top.push({ t: T0, ...evalT(T0) });
top.sort((a, b) => a.c - b.c);
console.log('grid', ((Date.now() - t0) / 1000).toFixed(0) + 's', 'start', JSON.stringify(evalT(T0)));
const refine = (t) => { let best = evalT(t); for (const st of [0.1, 0.05, 0.025]) { let imp = true, it = 0; while (imp && it++ < 25) { imp = false; for (let k = 0; k < 6; k++) for (const sg of [-1, 1]) { const q = t.slice(); q[k] = +(q[k] + sg * st).toFixed(4); const e = evalT(q); if (e.c < best.c - 1e-7) { t = q; best = e; imp = true; } } } } return { t, ...best }; };
const fin = top.slice(0, 6).map((o) => refine(o.t)).sort((a, b) => a.c - b.c);
for (const o of fin) console.log(JSON.stringify(o.t), 'c', o.c.toFixed(2), 'self', o.worst, 'gun', JSON.stringify(o.gun));
const pose = { f: F, t: fin[0].t };
const full = M.handClipReport(pose, 0.0005, false, GL);
console.log('FULL self', full.max, JSON.stringify(full.pairs));
console.log('RESULT ' + JSON.stringify({ ...RES, pose: { f: F, t: fin[0].t.map((v) => +v.toFixed(3)) } }));

// thumbside.mjs (CD-1, Claude 1, 11 Nov): thumbgun.mjs with the thumb put on the far side of a bar from the fingers (J115: the
// support thumb round the handguard's other side, not curled against the index). node thumbside.mjs <grid base> '<RES>' <export> <part>
// The bar's axis and the side from the export (the part's vertices within 5 cm of the palm, in the hand's frame); the thumb's tip
// (bone 15) wanted on the side away from the fingers' tips, resting on the bar; the rest as thumbgun.mjs.
import fs from 'node:fs';
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const [base, resArg] = process.argv.slice(2); const RES = JSON.parse(resArg), G = loadGrid(base);
const L = M.handLayout(1, 0, 0), Rb = M._bf(L, M._BUILD), H = M._hf(L, Rb), B = M._hs(L, Rb, true).B, ap = M._ap, mul = M._mul, inv = M._inv, GL = M.GLOVE_INFLATE;
const F = RES.pose.f, T0 = RES.pose.t.slice(); while (T0.length < 6) T0.push(0);
const C = [0, L.gripY, 0.008], [dx, dy, dz] = RES.move.map((v) => v / 1000), [ta, tb] = RES.turn, ca = Math.cos(ta), sa = Math.sin(ta), cb = Math.cos(tb), sb = Math.sin(tb);
const c3 = Math.cos((RES.turn[2] || 0)), s3 = Math.sin((RES.turn[2] || 0));
const toG = (p) => { let px = p[0] - dx - C[0], py = p[1] - dy - C[1], pz = p[2] - dz - C[2]; const qx = ca * px + sa * pz, qz = -sa * px + ca * pz, rx = cb * qx + sb * py, ry0 = -sb * qx + cb * py; return [rx + C[0], c3 * ry0 + s3 * qz + C[1], -s3 * ry0 + c3 * qz + C[2]]; };
const gunD = (p) => { const q = toG(p); return G.d(q[0], q[1], q[2]); };
const PART = (b) => b === 0 ? -1 : b >= 13 ? 4 : Math.floor((b - 1) / 3);
const n = B.p.length / 3, segOf = (g, k) => { let c0 = 0; for (let j = 0; j < k; j++) c0 += g.lens[j]; return [c0, c0 + g.lens[k]]; };
const gAt = (v) => { const b = B.b0[v]; if (b < 1 || b > 12) return GL; const Mm = Rb[b], lat = B.n[v * 3] * Mm[0] + B.n[v * 3 + 1] * Mm[4] + B.n[v * 3 + 2] * Mm[8]; return GL * (1 - 0.75 * lat * lat); };
const thumbV = [], fingV = [];
for (let v = 0; v < n; v++) { const a = PART(B.b0[v]); if (a === 4) thumbV.push(v); else if (a >= 0) { const u = -H.digits[a].local(B.p[v * 3], B.p[v * 3 + 1], B.p[v * 3 + 2])[1]; if (u >= 0.015) fingV.push(v); } }
const posed = (S, v) => { const g = gAt(v), rx = B.p[v * 3] + B.n[v * 3] * g, ry = B.p[v * 3 + 1] + B.n[v * 3 + 1] * g, rz = B.p[v * 3 + 2] + B.n[v * 3 + 2] * g, w = B.w1[v]; let q = ap(S[B.b0[v]], rx, ry, rz); if (w > 0) { const o = ap(S[B.b1[v]], rx, ry, rz); q = [q[0] * (1 - w) + o[0] * w, q[1] * (1 - w) + o[1] * w, q[2] * (1 - w) + o[2] * w]; } return q; };
const into = (g, Si, p, k) => { const bone = g.bones[k], q = ap(Si[bone], p[0], p[1], p[2]), u = -g.local(q[0], q[1], q[2])[1], [u0, u1] = segOf(g, k); if (u < u0 - 0.001 || u > (k === 2 ? u1 + 0.003 : u1 + 0.001) || u < 0.012) return 1; return g.d(q[0], q[1], q[2]); };
const S0 = M._bf(L, { f: F, t: [0, 0, 0, 0, 0, 0] }).map((m, k) => mul(m, inv(Rb[k]))), Si0 = S0.map(inv);
const fingP = fingV.map((v) => posed(S0, v));
const TB = [0, 0, 0];
// the bar (thumbside): its vertices near the palm in the hand's frame, its axis, the fingers' side
const EX = JSON.parse(fs.readFileSync(process.argv[4], 'utf8')), PI = +process.argv[5], SD = base.endsWith('-l') ? 'l' : 'r', HH = EX.hands[SD];
const mw = HH.mw, A4 = [[mw[0], mw[4], mw[8], mw[12]], [mw[1], mw[5], mw[9], mw[13]], [mw[2], mw[6], mw[10], mw[14]], [0, 0, 0, 1]];
const Ai = (() => { const Am = A4.map((r) => r.slice()), I = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]; for (let c = 0; c < 4; c++) { let q = c; for (let r = c + 1; r < 4; r++) if (Math.abs(Am[r][c]) > Math.abs(Am[q][c])) q = r; [Am[c], Am[q]] = [Am[q], Am[c]]; [I[c], I[q]] = [I[q], I[c]]; const v = Am[c][c]; for (let k = 0; k < 4; k++) { Am[c][k] /= v; I[c][k] /= v; } for (let r = 0; r < 4; r++) if (r !== c) { const f = Am[r][c]; for (let k = 0; k < 4; k++) { Am[r][k] -= f * Am[c][k]; I[r][k] -= f * I[c][k]; } } } return I; })();
const canP = (x, y, z) => { const l = [0, 1, 2].map((i) => Ai[i][0] * x + Ai[i][1] * y + Ai[i][2] * z + Ai[i][3]); return [HH.side * (l[0] - HH.ox), l[1], l[2] - HH.gz]; };
const bb = Buffer.from(EX.parts[PI].b64, 'base64'), fa = new Float32Array(bb.buffer, bb.byteOffset, bb.length / 4);
const BAR = []; for (let i = 0; i < fa.length; i += 3) { const q = canP(fa[i], fa[i + 1], fa[i + 2]); if (Math.hypot(q[0] - C[0], q[1] - C[1], q[2] - C[2]) < +(process.env.BARR || 0.07)) BAR.push(q); }
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], nrm = (u) => { const l = Math.hypot(...u); return u.map((x) => x / l); };
const bo = [0, 1, 2].map((k) => BAR.reduce((s2, q) => s2 + q[k], 0) / BAR.length);
let ba = [1, 0, 0]; { const Cv = [[0,0,0],[0,0,0],[0,0,0]]; for (const q of BAR) { const d = sub(q, bo); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) Cv[i][j] += d[i] * d[j]; } for (let it = 0; it < 60; it++) ba = nrm([0, 1, 2].map((i) => dot(Cv[i], ba))); }
const tipsF = []; for (let j = 0; j < fingV.length; j++) if ([3, 6, 9, 12].includes(B.b0[fingV[j]])) tipsF.push(toG(fingP[j]));
const fm = [0, 1, 2].map((k) => tipsF.reduce((s2, q) => s2 + q[k], 0) / tipsF.length);
let bn = process.env.SIDEV ? JSON.parse(process.env.SIDEV) : sub(fm, bo).map((x) => -x); bn = nrm(sub(bn, ba.map((x) => x * dot(bn, ba))));   // SIDEV: a given side (the eye's left, in the hand's frame); else away from the fingers' tips
const BR = Math.max(...BAR.map((q) => dot(sub(q, bo), bn)));
const WANT = +(process.env.WANT || 0.35);
console.log('bar', BAR.length, 'verts; axis', ba.map((x) => +x.toFixed(3)), 'thumb side', bn.map((x) => +x.toFixed(3)), 'm', [ba[1] * bn[2] - ba[2] * bn[1], ba[2] * bn[0] - ba[0] * bn[2], ba[0] * bn[1] - ba[1] * bn[0]].map((x) => +x.toFixed(3)), 'reach', (BR * 1000).toFixed(1), 'mm');
const TIP = [0, 0, 0];
if (process.env.WHERE) { const bm = [ba[1] * bn[2] - ba[2] * bn[1], ba[2] * bn[0] - ba[0] * bn[2], ba[0] * bn[1] - ba[1] * bn[0]];
  const S1 = M._bf(L, { f: F, t: T0 }).map((m, k) => mul(m, inv(Rb[k]))); const acc = {};
  for (let v = 0; v < n; v++) { const b = B.b0[v]; const q = toG(posed(S1, v)); (acc[b] = acc[b] || []).push(q); }
  const brd = (q) => { const d = sub(q, bo); return [dot(d, ba), dot(d, bn), dot(d, bm)].map((x) => +(x * 1000).toFixed(1)); };
  const ext = BAR.map(brd); console.log('bar extent along (axis, thumb side, m):', [0, 1, 2].map((k) => [Math.min(...ext.map((e) => e[k])), Math.max(...ext.map((e) => e[k]))]));
  for (const [b, nm] of [[0, 'palm'], [3, 'index tip'], [6, 'middle tip'], [12, 'little tip'], [13, 'thumb 1'], [14, 'thumb 2'], [15, 'thumb 3']]) { const A = acc[b]; const m = [0, 1, 2].map((k) => A.reduce((s2, q) => s2 + q[k], 0) / A.length); console.log(nm.padEnd(10), brd(m)); }
  // a slice of the bar across the palm (axis within 8 mm): its outline in (side, m)
  const sl = ext.filter((e) => Math.abs(e[0] - brd([0, 1, 2].map((k) => acc[0].reduce((s2, q) => s2 + q[k], 0) / acc[0].length))[0]) < 8);
  console.log('slice side range', Math.min(...sl.map((e) => e[1])), Math.max(...sl.map((e) => e[1])), 'm range', Math.min(...sl.map((e) => e[2])), Math.max(...sl.map((e) => e[2])));
  process.exit(0); }   // the thumb's bones' closest to the gun
function evalT(t) {
  const S = M._bf(L, { f: F, t }).map((m, k) => mul(m, inv(Rb[k]))), Si = S.map(inv);
  let pen = 0, gpen = 0, worst = 0, gworst = 1; TB[0] = TB[1] = TB[2] = 1; TIP[0] = TIP[1] = TIP[2] = TIP[3] = 0;
  for (const v of thumbV) {
    const p = posed(S, v), b = B.b0[v]; if (b === 15) { const pg = toG(p); TIP[0] += pg[0]; TIP[1] += pg[1]; TIP[2] += pg[2]; TIP[3] = (TIP[3] || 0) + 1; }
    const dg = gunD(p); if (dg < TB[b - 13]) TB[b - 13] = dg;
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const d = (into(H.digits[i], Si0, p, k) - GL) * 1000; if (d < -0.35) pen += (d + 0.35) ** 2; if (d < worst) worst = d; }
  }
  const gT = H.digits[4];
  for (let j = 0; j < fingV.length; j++) { const p = fingP[j], gv = gAt(fingV[j]); for (let k = 0; k < 3; k++) { const d = (into(gT, Si, p, k) - gv) * 1000; if (d < -0.35) pen += (d + 0.35) ** 2; if (d < worst) worst = d; } }
  for (let k = 0; k < 3; k++) { const d = TB[k] * 1000; if (d < -0.2) gpen += (d + 0.2) ** 2; gworst = Math.min(gworst, d); }
  const rest = Math.max(0, Math.min(TB[1], TB[2]) * 1000 - 0.4) ** 2;
  let dev = 0; for (let k = 0; k < 6; k++) dev += (t[k] - T0[k]) ** 2;
  const tq = [TIP[0] / TIP[3], TIP[1] / TIP[3], TIP[2] / TIP[3]], sideD = dot(sub(tq, bo), bn), bmv = [ba[1] * bn[2] - ba[2] * bn[1], ba[2] * bn[0] - ba[0] * bn[2], ba[0] * bn[1] - ba[1] * bn[0]], mD = dot(sub(tq, bo), bmv), side = Math.max(0, WANT * BR - sideD) * 1000 + (process.env.MWANT ? Math.max(0, +process.env.MWANT / 1000 - mD) * 1000 : 0);
  return { side: +(sideD * 1000).toFixed(1), m: +(mD * 1000).toFixed(1), c: pen * 4 + gpen * +(process.env.GW || 10) + 0.3 * rest + dev * +(process.env.DEV || 0.05) + side * side * 0.5, worst: +worst.toFixed(2), gun: TB.map((d) => +(d * 1000).toFixed(1)) };
}
const R = (a, b, st) => { const o = []; for (let x = a; x <= b + 1e-9; x += st) o.push(+x.toFixed(3)); return o; };
const top = []; const t0 = Date.now();
for (const c of R(-0.1, 1.5, 0.2)) for (const sw of R(-1.6, 1.2, 0.35)) for (const a5 of R(-0.1, 0.8, 0.3)) for (const ip of [0, 0.4, 0.8, 1.2]) for (const rl of [-0.3, 0.2, 0.7]) for (const m4 of [-0.1, 0.3, 0.7]) {
  const t = [c, sw, ip, rl, m4, a5], e = evalT(t); top.push({ t, ...e }); if (top.length > 300) { top.sort((a, b) => a.c - b.c); top.length = 30; }
}
if (process.env.RAND) { let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const lo = [-0.2, -1.6, -0.2, -0.3, -0.1, -0.6], hi = [1.5, 1.4, 1.4, 1.0, 1.0, 0.9];
  for (let i = 0; i < +process.env.RAND; i++) { const t = lo.map((l, k) => +(l + (hi[k] - l) * rnd()).toFixed(3)); const e = evalT(t); top.push({ t, ...e }); if (top.length > 300) { top.sort((a, b) => a.c - b.c); top.length = 30; } } }
top.push({ t: T0, ...evalT(T0) });
top.sort((a, b) => a.c - b.c);
console.log('grid', ((Date.now() - t0) / 1000).toFixed(0) + 's', 'start', JSON.stringify(evalT(T0)));
const refine = (t) => { let best = evalT(t); for (const st of [0.1, 0.05, 0.025]) { let imp = true, it = 0; while (imp && it++ < 25) { imp = false; for (let k = 0; k < 6; k++) for (const sg of [-1, 1]) { const q = t.slice(); q[k] = +(q[k] + sg * st).toFixed(4); const e = evalT(q); if (e.c < best.c - 1e-7) { t = q; best = e; imp = true; } } } } return { t, ...best }; };
const fin = top.slice(0, +(process.env.NFIN || 6)).map((o) => refine(o.t)).sort((a, b) => a.c - b.c);
for (const o of fin) console.log(JSON.stringify(o.t), 'c', o.c.toFixed(2), 'self', o.worst, 'gun', JSON.stringify(o.gun), 'side', o.side, 'm', o.m, 'want', (WANT * BR * 1000).toFixed(1));
const pose = { f: F, t: fin[0].t };
const full = M.handClipReport(pose, 0.0005, false, GL);
console.log('FULL self', full.max, JSON.stringify(full.pairs));
console.log('RESULT ' + JSON.stringify({ ...RES, pose: { f: F, t: fin[0].t.map((v) => +v.toFixed(3)) } }));

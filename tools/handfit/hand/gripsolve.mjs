// CL-334 f: the grip solver on a bar: each finger's three joints so each bone's pad touches the bar (no gap, never
// through), inside the limits, the tips kept out of the palm; then the thumb wrapped round the bar with its pad across the
// backs of the index and middle fingers' middle bones. Capsules a bone (the sections' depths from the profiles).

import * as M from './mh-tool.mjs';

const L = M.handLayout(1, 0, 0.07), J = M._J;
const BAR = { y: L.gripY, z: 0.07 + 0.008, r: +(process.argv[2] || 0.013) };
const fr = (Mx, k, x, y, z) => { const m = Mx[k]; return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]]; };
const dirOf = (Mx, k, x, y, z) => { const m = Mx[k]; return [m[0] * x + m[1] * y + m[2] * z, m[4] * x + m[5] * y + m[6] * z, m[8] * x + m[9] * y + m[10] * z]; };
// the bar's surface distance of a point offset from a bone's axis toward the bone's palm side by its pad depth
function padGap(Mx, k, u, rf) {   // u: along the bone (m); the point on the pad
  const p = fr(Mx, k, 0, -u, rf);
  return Math.hypot(p[1] - BAR.y, p[2] - BAR.z) - BAR.r;
}
// the palm's front: z of the palm's face at height y (a plane fit near the bar: the face at mcpZ + 0.0125), only between the wrist and the knuckles
const palmFront = L.mcpZ + 0.0125;
function solveFinger(i, pose) {
  const f = L.fingers[i], P = M._fp(f), lens = f.len, tot = lens[0] + lens[1] + lens[2];
  const rfAt = (u) => P(u, tot).rf;
  let best = null;
  for (let a = 0; a <= J.mcp[1] + 1e-9; a += 0.025) for (let b = 0; b <= J.pip[1] + 1e-9; b += 0.025) {
    // the end joint follows the middle one (they move together in a real finger: about two thirds)
    for (const kd of [0.55, 0.65, 0.75, 0.85]) {
      const c = Math.min(J.dip[1], b * kd);
      pose.f[i] = [a, b, c, 0];
      const Mx = M._bf(L, pose), k0 = 1 + i * 3;
      let gap = 0, pen = 0;
      const samples = [[k0, lens[0] * 0.35, lens[0] * 0.35], [k0, lens[0] * 0.75, lens[0] * 0.75], [k0 + 1, lens[1] * 0.5, lens[0] + lens[1] * 0.5], [k0 + 2, lens[2] * 0.45, lens[0] + lens[1] + lens[2] * 0.45]];
      const gaps = samples.map(([k, u, uu]) => padGap(Mx, k, u, rfAt(uu)));
      for (const g of gaps) { if (g < 0) pen = Math.max(pen, -g); }
      // all of the finger along the bar: the worst gap of the first three samples (the tip may leave the bar for the palm)
      gap = Math.max(0, gaps[0], gaps[1], gaps[2]) + 0.5 * Math.max(0, gaps[3]);
      // the tip out of the palm
      const tip = fr(Mx, k0 + 2, 0, -lens[2], 0), tipR = P(tot, tot).rf;
      const inPalm = tip[1] > L.mcpY && tip[1] < L.wristY ? Math.max(0, palmFront - (tip[2] - tipR)) : 0;
      // the nail side of the tip clear of the bar too
      const score = gap * gap * 4e4 + pen * pen * 4e6 + inPalm * inPalm * 4e6 + 0.02 * (a + b);
      if (!best || score < best.score) best = { score, f: [a, b, c, 0], gaps: gaps.map((g) => +(g * 1000).toFixed(1)), pen: +(pen * 1000).toFixed(2), inPalm: +(inPalm * 1000).toFixed(2) };
    }
  }
  pose.f[i] = best.f;
  return best;
}
const pose = { f: [[1, 1, 0.7, 0], [1, 1, 0.7, 0], [1, 1, 0.7, 0], [1, 1, 0.7, 0]], t: [0.8, 0, 0.3, 0, 0] };
const out = {};
for (let i = 0; i < 4; i++) out[L.fingers[i].name] = solveFinger(i, pose);
// the thumb: wrapped round the bar (its first phalanx's pad on the bar), its end bone's pad across the back of the index
// (and middle) finger's middle bone, never through the bar or the fingers
const TP = M._tp(L.thumb), Tl = L.thumb.len, Ttot = Tl[0] + Tl[1] + Tl[2];
function thumbScore(t) {
  pose.t = t; const Mx = M._bf(L, pose);
  const fI = L.fingers[0], fMd = L.fingers[1], PI = M._fp(fI), PM = M._fp(fMd);
  // the backs of the index and middle fingers' middle bones (their dorsal surface, half way along)
  const backI = fr(Mx, 2, 0, -fI.len[1] * 0.55, -PI(fI.len[0] + fI.len[1] * 0.55, 1).rb), backM = fr(Mx, 5, 0, -fMd.len[1] * 0.55, -PM(fMd.len[0] + fMd.len[1] * 0.55, 1).rb);
  const nI = dirOf(Mx, 2, 0, 0, -1), nM = dirOf(Mx, 5, 0, 0, -1);
  const rP = TP(Tl[0] + Tl[1] + Tl[2] * 0.5, Ttot).rf;
  // where we want them: the thumb's end joint (IP) over the index's back, the pad of its end bone over the middle finger's
  const wantIP = backI.map((q, k) => q + nI[k] * (TP(Tl[0] + Tl[1], Ttot).rf + 0.002));
  const wantPad = backM.map((q, k) => q + nM[k] * rP);
  const ip = fr(Mx, 15, 0, 0, 0), pad = fr(Mx, 15, 0, -Tl[2] * 0.6, rP * 0);
  const dIP = Math.hypot(ip[0] - wantIP[0], ip[1] - wantIP[1], ip[2] - wantIP[2]), dPad = Math.hypot(pad[0] - wantPad[0], pad[1] - wantPad[1], pad[2] - wantPad[2]);
  // never through the bar (the metacarpal's and the first phalanx's pads) nor into the fingers' backs
  const g1 = Math.hypot(...[1, 2].map((a) => fr(Mx, 14, 0, -Tl[1] * 0.5, TP(Tl[0] + Tl[1] * 0.5, Ttot).rf)[a] - [0, BAR.y, BAR.z][a])) - BAR.r;
  const g0 = Math.hypot(...[1, 2].map((a) => fr(Mx, 13, 0, -Tl[0] * 0.85, TP(Tl[0] * 0.85, Ttot).rf)[a] - [0, BAR.y, BAR.z][a])) - BAR.r;
  const padPt = fr(Mx, 15, 0, -Tl[2] * 0.5, rP);
  const sI = (padPt[0] - backI[0]) * nI[0] + (padPt[1] - backI[1]) * nI[1] + (padPt[2] - backI[2]) * nI[2];
  const sM = (padPt[0] - backM[0]) * nM[0] + (padPt[1] - backM[1]) * nM[1] + (padPt[2] - backM[2]) * nM[2];
  const pen = Math.max(0, -g1, -g0, -Math.min(sI, sM));
  return { s: dIP * dIP * 1e4 + dPad * dPad * 1e4 + pen * pen * 4e6 + Math.max(0, g1) ** 2 * 5e3, g1, g0, along: Math.min(sI, sM), lateral: dPad, cross: dIP };
}
let bt = null;
const R = (a, b, st) => { const o = []; for (let x = a; x <= b + 1e-9; x += st) o.push(+x.toFixed(3)); return o; };
for (const c of R(0, 1.6, 0.1)) for (const sw of R(-0.8, 0.6, 0.1)) for (const ip of R(0, 1.2, 0.1)) for (const rl of R(-0.4, 0.5, 0.15)) for (const me of R(-0.4, 0.5, 0.15)) {
  const t = [c, sw, ip, rl, me], e = thumbScore(t);
  if (!bt || e.s < bt.s) bt = { ...e, t };
}
out.thumb = { t: bt.t, g1: +(bt.g1 * 1000).toFixed(1), g0: +(bt.g0 * 1000).toFixed(1), along: +(bt.along * 1000).toFixed(1), lateral: +(bt.lateral * 1000).toFixed(1), cross: +bt.cross.toFixed(2) };
pose.t = bt.t;
console.log(JSON.stringify(out));
console.log('POSE ' + JSON.stringify({ f: pose.f.map((q) => q.map((x) => +x.toFixed(3))), t: pose.t }));

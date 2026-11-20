// CE-12 (cloud): fit the support hand's open wrap round a box (a magazine, a drum, the slide) in the canonical RIGHT hand's
// space (studio/marine-hand.js handPosed, gloved). Box: length along hand x from x0 for len, cross-section w x d rotated th
// about x, its middle at (cy, cz). Each finger and the thumb close until they touch (<= 0.3 mm in); the box is pushed onto the
// palm. Prints the best placements by contact at the palm, the webbing and the thumb. See README.md here.
const H = await import(new URL('../../../studio/marine-hand.js', import.meta.url).href);
const args = JSON.parse(process.argv[2]);
const S = 1 / 1.18;   // HAND_SCALE: game mm -> hand units
const W = args.w * S / 1000, D = args.d * S / 1000, LEN = args.len * S / 1000, X0 = args.x0 ?? -0.045;
const open = args.open || { f: [[0.1, 0.1, 0.05, 0.03], [0.1, 0.1, 0.05, 0], [0.1, 0.1, 0.05, -0.02], [0.1, 0.1, 0.05, -0.05]], t: [0, 0.55, 0, 0, 0, 0] };
const THUMBS = args.thumbs || [[0.038, 0.563, 0.812, 0.863, 0.55, 0.337], [0.45, 0.15, 0.35, 0.9, 0.25, 0.25], [0.8, 0.3, 0.2, 1, 0.5, 0.9], [0, 0.55, 0.3, 0.3, 0, 0.9], [0.3, -0.3, 0.4, 0.6, 0.3, 0.6]];
let shutT = THUMBS[0];
const shut = args.shut || H.HAND_POSES.fist;
const TOL = 0.0003;
function boxDepth(p, i, b) {   // + inside (m), - outside distance
  const x = p[i * 3] - b.cx, y = p[i * 3 + 1] - b.cy, z = p[i * 3 + 2] - b.cz;
  let lx, ly, lz;
  if (b.A) { const A = b.A; lx = x * A[0][0] + y * A[0][1] + z * A[0][2]; ly = x * A[1][0] + y * A[1][1] + z * A[1][2]; lz = x * A[2][0] + y * A[2][1] + z * A[2][2]; }
  else { lx = x; ly = y * b.c + z * b.s; lz = -y * b.s + z * b.c; }   // into the box's axes
  const hx = b.hx, hy = b.hy, hz = b.hz;
  const dx = Math.abs(lx) - hx, dy = Math.abs(ly) - hy, dz = Math.abs(lz) - hz;
  if (dx < 0 && dy < 0 && dz < 0) return -Math.max(dx, dy, dz);
  return -Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
}
const groupOf = (P, v) => { const b = P.b0[v]; return b === 0 ? 'palm' : b === 13 ? 'web' : b > 13 ? 'thumb' : 'f' + Math.floor((b - 1) / 3); };
function measure(pose, b) {
  const P = H.handPosed(pose, H.GLOVE_INFLATE), G = {};
  for (let v = 0; v < P.n; v++) { const g = groupOf(P, v), d = boxDepth(P.p, v, b); if (!(g in G) || d > G[g]) G[g] = d; }
  return G;
}
const lerp = (a, b, k) => a + (b - a) * k;
function poseAt(cf, ct) {   // cf: per finger closure, ct: the thumb's
  return { f: shut.f.map((r, i) => r.map((x, j) => lerp(open.f[i][j] || 0, x, cf[i]))), t: shutT.map((x, j) => lerp(open.t[j] || 0, x, ct)) };
}
function close(b) {
  const cf = [0, 0, 0, 0]; let ct = 0;
  // fingers one by one (each finger's own vertices move only with it), then the thumb
  for (let i = 0; i < 5; i++) {
    let lo = 0, hi = 1;
    const at = (c) => { const f = cf.slice(); let t = ct; if (i < 4) f[i] = c; else t = c; const G = measure(poseAt(f, t), b); return G[i < 4 ? 'f' + i : 'thumb']; };
    if (at(0) > TOL) { if (i < 4) cf[i] = 0; else ct = 0; continue; }
    if (at(1) <= TOL) { lo = 1; } else for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; if (at(m) <= TOL) lo = m; else hi = m; }
    if (i < 4) cf[i] = lo; else ct = lo;
  }
  return { cf, ct, G: measure(poseAt(cf, ct), b) };
}
const mkU = (ph, cx, cy, cz) => { const c = Math.cos(ph), s = Math.sin(ph); return { cx, cy, cz, hx: W / 2, hy: LEN / 2, hz: D / 2, A: [[c, s, 0], [0, 0, 1], [s, -c, 0]], th: ph }; };
const mk = (th, cy, cz, x0 = X0) => ({ cx: x0 + LEN / 2, cy, cz, c: Math.cos(th), s: Math.sin(th), hx: LEN / 2, hy: W / 2, hz: D / 2, th });
const res = [];
if (args.under) {
  for (const phd of args.ph || [0]) for (let ti = 0; ti < THUMBS.length; ti++) for (const cx of args.cxs || [0]) for (let cy = args.y0; cy <= args.y1 + 1e-9; cy += args.dy) {
    shutT = THUMBS[ti]; const ph = phd * Math.PI / 180;
    let lo = -0.02, hi = 0.25; const palmAt = (cz) => Math.max(...Object.values(measure(open, mkU(ph, cx, cy, cz))));
    if (palmAt(hi) > TOL) continue;
    for (let k = 0; k < 13; k++) { const m = (lo + hi) / 2; if (palmAt(m) > TOL) lo = m; else hi = m; }
    const b = mkU(ph, cx, cy, hi), r = close(b), G = r.G, inMax = Math.max(...Object.values(G)), mm = (x) => +(x * 1000).toFixed(1);
    const fs = ['f0', 'f1', 'f2', 'f3'].map((k) => -G[k]).sort((a, b) => a - b), need = args.fingers ?? 2, touch = fs.filter((x) => x < 0.0015).length;
    const score = Math.max(-G.palm, -G.web, -G.thumb, need ? fs[need - 1] : -1) + (inMax > 0.0006 ? 1 + inMax : 0);
    res.push({ under: 1, phd, ti, cx, cy: +cy.toFixed(3), cz: +hi.toFixed(4), score: mm(score), inMax: mm(inMax), touch, G: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, mm(v)])), cf: r.cf.map((x) => +x.toFixed(2)), ct: +r.ct.toFixed(2) });
  }
}
const ths = args.th || [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const x0s = args.x0s || [X0];
if (!args.under) for (const x0 of x0s) for (const thd of ths) for (let ti = 0; ti < THUMBS.length; ti++) {
  shutT = THUMBS[ti];
  const th = thd * Math.PI / 180;
  for (let cy = args.y0 ?? -0.30; cy <= (args.y1 ?? -0.22) + 1e-9; cy += args.dy ?? 0.01) {
    let lo = -0.02, hi = 0.12;
    const palmAt = (cz) => measure(open, mk(th, cy, cz, x0)).palm;
    if (palmAt(hi) > TOL) continue;
    for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (palmAt(m) > TOL) lo = m; else hi = m; }
    const b = mk(th, cy, hi, x0), r = close(b), G = r.G;
    const inMax = Math.max(...Object.values(G));
    const mm = (x) => +(x * 1000).toFixed(1);
    const touch = ['f0', 'f1', 'f2', 'f3'].filter((k) => G[k] > -0.0015).length;
    const fs = ['f0', 'f1', 'f2', 'f3'].map((k) => -G[k]).sort((a, b) => a - b), need = args.fingers ?? 2;
    const score = Math.max(-G.palm, -G.web, -G.thumb, need ? fs[need - 1] : -1) + (inMax > 0.0006 ? 1 + inMax : 0) - touch * 0.0002;
    res.push({ x0, thd, ti, cy: +cy.toFixed(3), cz: +hi.toFixed(4), score: mm(score), inMax: mm(inMax), touch, G: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, mm(v)])), cf: r.cf.map((x) => +x.toFixed(2)), ct: +r.ct.toFixed(2) });
  }
}
res.sort((a, b) => a.score - b.score);
for (const r of res.slice(0, args.top || 12)) console.log(JSON.stringify(r));

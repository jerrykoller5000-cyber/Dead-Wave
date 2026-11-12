// gungrip4.mjs (CD-1, fresh Claude 1, 12 Nov): gungrip3 + MCPT '[x,y,z]' (field space, m): the index knuckle (bone 1's origin) pulled toward it
// beyond MCPR mm with weight MCPW; IDXD: an extra pull of the index's pose toward a natural trigger curl (IDX0) with weight IDXW.
// CL-334 h: a hand's pose (and a small move of the hand on the gun) solved against the gun's surface (sdf.py's grid, in
// the hand's canonical space), gloved: no part of the hand into the gun deeper than 0.2 mm (J126 rule 2), none into
// another part of the hand (rule 1), the bones named in TOUCH touching the gun (closest within 0.3 mm), the end joints
// following the middle ones, near the start pose and the start place.
// node gungrip.mjs <grid base> '<start pose>' '<touch bones json>' [maxMove mm]
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const [base, poseArg, touchArg, mvArg] = process.argv.slice(2);
const G = loadGrid(base), J = M._J, GL = M.GLOVE_INFLATE;
const start = JSON.parse(poseArg); while (start.t.length < 6) start.t.push(0);
const TOUCH = JSON.parse(touchArg || '[0,4,5,6,7,8,9,10,11,12]'), MV = (+mvArg || 4) / 1000;
const FREE = process.env.FREE ? JSON.parse(process.env.FREE) : null;   // which x indices may move (default all)
const L = M.handLayout(1, 0, 0), C = [0, L.gripY, 0.008];   // the grip channel: the move's and the turn's centre
const pack = (p) => [...p.f.flatMap((q) => q.slice(0, 3)), ...p.t.slice(0, 6), 0, 0, 0, 0, 0, ...p.f.map((q) => q[3] || 0), 0];   // + a turn about x (27)   // + dx dy dz (m), turns about y and z, the spreads
const unpack = (x) => ({ f: [0, 1, 2, 3].map((i) => [x[i * 3], x[i * 3 + 1], x[i * 3 + 2], x[23 + i]]), t: x.slice(12, 18) });
const LIM = [...[0, 1, 2, 3].flatMap(() => [J.mcp, J.pip, J.dip]), [-0.2, 1.6], [-1.6, 1.4], [-0.2, 1.4], J.cmcRoll, J.tMcp, J.cmcAbd, [-MV, MV], [-MV, MV], [-MV, MV], [-(+process.env.AL || 0.3), +(process.env.AL || 0.3)], [-(+process.env.B2L || 0.3), +(process.env.B2L || 0.3)], J.spread, J.spread, J.spread, J.spread, [-(+process.env.XT || 0.3), +process.env.XT || 0.3]];   // XT (CD-1 pass 2): a wider turn about x where the twist's limit holds it
const clampX = (x) => x.map((v, k) => Math.max(LIM[k][0], Math.min(LIM[k][1], v)));
const x0 = clampX(pack(start));
if (process.env.START) { const S = JSON.parse(process.env.START); x0[18] = S.move[0] / 1000; x0[19] = S.move[1] / 1000; x0[20] = S.move[2] / 1000; x0[21] = S.turn[0] || 0; x0[22] = S.turn[1] || 0; x0[27] = process.env.NOX ? 0 : (S.turn[2] || 0); }
const m0 = x0.slice(18, 23).concat([x0[27]]);
// CD-1 pass 2: KOGRID, a second field (keep-outs: a trigger guard's opening) for every bone but the index's; TGT
// '[x,y,z]' (the field's space, metres), the trigger's face for the index's pad (bone 3), pulled with weight TGW
const KG = process.env.KOGRID ? loadGrid(process.env.KOGRID) : null, TG = process.env.TGT ? JSON.parse(process.env.TGT) : null, TGW = +process.env.TGW || 0.5;
const SKIPB = process.env.SKIPB ? JSON.parse(process.env.SKIPB) : [];   // CD-1 fixes 4: bones left out of the gun's cost (an index Claude 5's VM_TRIGGER poses)
const MCPT = process.env.MCPT ? JSON.parse(process.env.MCPT) : null, MCPR = +(process.env.MCPR || 5), MCPW = +(process.env.MCPW || 0.2);
const THT = process.env.THT ? JSON.parse(process.env.THT) : null, THW = +(process.env.THW || 1), THDIR = process.env.THDIR ? JSON.parse(process.env.THDIR) : null, THDW = +(process.env.THDW || 20);
const THM = process.env.THM ? JSON.parse(process.env.THM) : null, THMW = +(process.env.THMW || 0.5);
const IDX0 = process.env.IDX0 ? JSON.parse(process.env.IDX0) : null, IDXW = +(process.env.IDXW || 0);
const NAMES = ['palm', 'i1', 'i2', 'i3', 'm1', 'm2', 'm3', 'r1', 'r2', 'r3', 'l1', 'l2', 'l3', 't0', 't1', 't2'];
function cost(x, full) {
  const pose = unpack(x), P = M.handPosed(pose, GL), byB = new Float64Array(16).fill(1), byK = new Float64Array(16).fill(1); let tgd = 1;
  const [dx, dy, dz, a, b2] = x.slice(18), ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b2), sb = Math.sin(b2), c3 = Math.cos(x[27]), s3 = Math.sin(x[27]);
  for (let v = 0; v < P.n; v++) {
    // the hand moved by (dx, dy, dz) and turned (a about its length, b2 about the palm's normal) at the grip channel = the gun the other way
    let px = P.p[v * 3] - dx - C[0], py = P.p[v * 3 + 1] - dy - C[1], pz = P.p[v * 3 + 2] - dz - C[2];
    const qx = ca * px + sa * pz, qz = -sa * px + ca * pz;
    const rx = cb * qx + sb * py, ry0 = -sb * qx + cb * py;
    const ry = c3 * ry0 + s3 * qz, rz = -s3 * ry0 + c3 * qz;
    const d = G.d(rx + C[0], ry + C[1], rz + C[2]); if (d < byB[P.b0[v]]) byB[P.b0[v]] = d;
    if (KG && (P.b0[v] < 1 || P.b0[v] > 3)) { const k = KG.d(rx + C[0], ry + C[1], rz + C[2]); if (k < byK[P.b0[v]]) byK[P.b0[v]] = k; }
    if (TG && P.b0[v] === 3) { const e = Math.hypot(rx + C[0] - TG[0], ry + C[1] - TG[1], rz + C[2] - TG[2]); if (e < tgd) tgd = e; }
  }
  const mm = (d) => d * 1000;
  let mcpc = 0, mcpd = 0; if (MCPT) { const Bf = M._bf(L, pose)[1]; let px = Bf[3] - dx - C[0], py = Bf[7] - dy - C[1], pz = Bf[11] - dz - C[2];
    const qx = ca * px + sa * pz, qz = -sa * px + ca * pz; const rx = cb * qx + sb * py, ry0 = -sb * qx + cb * py; const ry = c3 * ry0 + s3 * qz, rz = -s3 * ry0 + c3 * qz;
    mcpd = Math.hypot(rx + C[0] - MCPT[0], ry + C[1] - MCPT[1], rz + C[2] - MCPT[2]); mcpc = MCPW * Math.max(0, mm(mcpd) - MCPR) ** 2; }
  let thc = 0, thd = 0, tha = 0; if (THT || THDIR || THM) { const Bt = M._bf(L, pose)[15], TLn = L.thumb.len[2];
    const tr = (p) => { let px = p[0] - dx - C[0], py = p[1] - dy - C[1], pz = p[2] - dz - C[2]; const qx = ca * px + sa * pz, qz = -sa * px + ca * pz; const rx = cb * qx + sb * py, ry0 = -sb * qx + cb * py; const ry = c3 * ry0 + s3 * qz, rz = -s3 * ry0 + c3 * qz; return [rx + C[0], ry + C[1], rz + C[2]]; };
    const ap3 = (m, x, y, z) => [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
    const a1 = tr(ap3(Bt, 0, -TLn, 0)), a0 = tr([Bt[3], Bt[7], Bt[11]]);
    if (THM) { const dm = Math.hypot(a0[0] - THM[0], a0[1] - THM[1], a0[2] - THM[2]); thc += THMW * Math.max(0, mm(dm) - 3) ** 2; }
    if (THT) { thd = Math.hypot(a1[0] - THT[0], a1[1] - THT[1], a1[2] - THT[2]); thc += THW * Math.max(0, mm(thd) - 2) ** 2; }
    if (THDIR) { const v = [a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]], n = Math.hypot(...v); tha = Math.acos(Math.max(-1, Math.min(1, (v[0] * THDIR[0] + v[1] * THDIR[1] + v[2] * THDIR[2]) / n))); thc += THDW * tha * tha; } }
  let idxc = 0; if (IDX0) for (let k = 0; k < 3; k++) idxc += IDXW * (x[k] - IDX0[k]) ** 2;
  let gun = 0, gap = 0;
  for (let b = 0; b < 16; b++) { if (SKIPB.includes(b)) continue; const d = mm(byB[b]); const gm = +(process.env.GMARG || -0.2); if (d < gm) gun += (d - gm) ** 2; }
  for (const b of TOUCH) gap += Math.max(0, mm(byB[b]) - 0.3) ** 2;
  let ko = 0; if (KG) for (let b = 0; b < 16; b++) { const d = mm(byK[b]); if (d < -0.2) ko += (d + 0.2) ** 2; }
  const tgt = TG ? TGW * Math.max(0, mm(tgd) - 0.5) ** 2 : 0;
  const R = M.handClipReport(pose, 0.0005, true, GL);
  let self = 0; for (const k in R.nearBone) { const d = R.nearBone[k]; if (d < -0.35) self += (d + 0.35) ** 2; }
  let coup = 0; for (let i = 0; i < 4; i++) { const b = x[i * 3 + 1], c = x[i * 3 + 2]; if (TOUCH.includes(1 + i * 3 + 1)) coup += Math.max(0, 0.5 * b - c) ** 2 + Math.max(0, c - 0.95 * b) ** 2; }
  let dev = 0; for (let k = 0; k < 18; k++) dev += (x[k] - x0[k]) ** 2; for (let k = 23; k < 27; k++) dev += 2 * (x[k] - x0[k]) ** 2;
  const move = (x[18] ** 2 + x[19] ** 2 + x[20] ** 2) * 1e6 * 0.05 + (x[21] ** 2 + x[22] ** 2 + x[27] ** 2) * 20 + ((x[18] - m0[0]) ** 2 + (x[19] - m0[1]) ** 2 + (x[20] - m0[2]) ** 2) * 1e6 * 0.05;
  const c = ko * 10 + tgt + gun * 10 + gap + self * 6 + coup * 30 + dev * 0.15 + move + mcpc + idxc + thc;
  return full ? { c, ko: +ko.toFixed(2), tgd: +mm(tgd).toFixed(1), mcpd: +mm(mcpd).toFixed(1), thd: +mm(thd).toFixed(1), tha: +(tha * 57.3).toFixed(0), gun, gap, self, coup, dev, move, byB: Array.from(byB, (d) => +mm(d).toFixed(1)), R } : { c };
}
let x = x0.slice(), best = cost(x, true);
if (process.env.SCAN) {   // the place first: a grid over the move and the turns with the start pose
  let bs = best;
  const SR = process.env.SCANR ? JSON.parse(process.env.SCANR) : { x: [-10, -6, -3, 0, 3], z: [-2, 0, 2, 4], y: [-3, 0, 3] };
  for (const dx of SR.x) for (const dz of SR.z) for (const dy of SR.y) for (const a of [-0.2, -0.1, 0, 0.1, 0.2]) for (const b2 of (process.env.B2S ? process.env.B2S.split(",").map(Number) : [-0.25, -0.12, 0, 0.12])) for (const a3 of (process.env.NOX ? [0] : process.env.XT ? [-0.5, -0.35, -0.2, 0, 0.2, 0.35, 0.5].filter((v) => Math.abs(v) <= +process.env.XT) : [-0.2, 0, 0.2])) {   // NOX (CD-1 pass 2): no turn about the hand's x: the game's twist (twistToward) sets that roll from the elbow
    const q = x0.slice(); q[18] = dx / 1000; q[19] = dy / 1000; q[20] = dz / 1000; q[21] = a; q[22] = b2; q[27] = a3; const qc = clampX(q); const e = cost(qc); if (e.c < bs.c) { bs = e; x = qc; }
  }
  best = cost(x, true);
}
const show = (tag, e) => console.log(tag, e.c.toFixed(2), 'ko', e.ko, 'tgd', e.tgd, 'mcpd', e.mcpd, 'thd', e.thd, 'tha', e.tha, 'gun', e.gun.toFixed(2), 'gap', e.gap.toFixed(2), 'self', e.self.toFixed(2), 'move', JSON.stringify(x.slice(18, 21).map((v) => +(v * 1000).toFixed(1))), 'turn', x[21].toFixed(3), x[22].toFixed(3), x[27].toFixed(3), '|', e.byB.map((d, k) => NAMES[k] + ' ' + d).join(' '));
show('start', best);
const free = (k) => (!process.env.NOX || k !== 27) && (!FREE || FREE.includes(k));
const pairs = [];
for (let i = 0; i < 4; i++) pairs.push([i * 3, i * 3 + 1], [i * 3 + 1, i * 3 + 2], [i * 3, i * 3 + 2]);
pairs.push([12, 17], [16, 17], [12, 16], [14, 16], [13, 17], [12, 13], [15, 17], [18, 19], [18, 20], [19, 20], [18, 22], [20, 21], [23, 24], [24, 25], [25, 26]);
const sc = (k) => (k >= 18 && k < 21 ? 0.01 : 1);
for (const step of [0.1, 0.05, 0.025, 0.0125]) {
  let improved = true, n = 0;
  while (improved && n++ < 25) {
    improved = false;
    for (let k = 0; k < 28; k++) { if (!free(k)) continue; for (const sg of [-1, 1]) {
      const q = x.slice(); q[k] += sg * step * sc(k); const qc = clampX(q); const e = cost(qc); if (e.c < best.c - 1e-6) { x = qc; best = cost(x, true); improved = true; }
    } }
    for (const [a, b] of pairs) { if (!free(a) || !free(b)) continue; for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const q = x.slice(); q[a] += sa * step * sc(a); q[b] += sb * step * sc(b); const qc = clampX(q); const e = cost(qc); if (e.c < best.c - 1e-6) { x = qc; best = cost(x, true); improved = true; }
    } }
  }
  show('step ' + step, best);
}
const pose = unpack(x);
console.log('SELF', best.R.max, JSON.stringify(best.R.pairs));
console.log('RESULT ' + JSON.stringify({ pose: { f: pose.f.map((q) => q.map((v) => +v.toFixed(3))), t: pose.t.map((v) => +v.toFixed(3)) }, move: x.slice(18, 21).map((v) => +(v * 1000).toFixed(2)), turn: [+x[21].toFixed(4), +x[22].toFixed(4), +x[27].toFixed(4)], byB: best.byB, self: best.R.max, ko: best.ko, tgd: best.tgd, mcpd: best.mcpd, thd: best.thd, tha: best.tha }));

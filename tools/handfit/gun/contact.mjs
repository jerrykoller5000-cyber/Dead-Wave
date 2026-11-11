// The hold's give: the gloved (and the bare) hand's surface pushed out of the gun where it presses in, as flesh gives, a
// smooth dent (each push spread over its neighbours, sigma 3 mm), until no vertex is inside the gun (closer than CLEAR).
// node contact.mjs <grid base> '<pose>' [move/turn json]  ->  JSON { glove: {idx, d}, bare: {idx, d}, before, after }
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const [base, poseArg, mvArg] = process.argv.slice(2);
const G = loadGrid(base), pose = JSON.parse(poseArg), MV = mvArg ? JSON.parse(mvArg) : null;
const SKIPB = process.env.SKIPB ? JSON.parse(process.env.SKIPB) : [];   // CD-1 fixes 4: bones whose vertices never give (an index Claude 5's VM_TRIGGER poses)
const CLEAR = +process.env.CLEAR || 0.0003, SIG = 0.003, C = [0, -0.271, 0.008];
let gd = G.d;
if (MV) {   // the solve's place (the gun moved and turned in the hand's space), for a check before the game has it
  const [dx, dy, dz] = MV.move.map((v) => v / 1000), [a, b, c] = [MV.turn[0] || 0, MV.turn[1] || 0, MV.turn[2] || 0];
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), c3 = Math.cos(c), s3 = Math.sin(c);
  gd = (x, y, z) => { const px = x - dx - C[0], py = y - dy - C[1], pz = z - dz - C[2]; const qx = ca * px + sa * pz, qz = -sa * px + ca * pz; const rx = cb * qx + sb * py, ry0 = -sb * qx + cb * py; const ry = c3 * ry0 + s3 * qz, rz = -s3 * ry0 + c3 * qz; return G.d(rx + C[0], ry + C[1], rz + C[2]); };
}
const grad = (x, y, z) => { const h = 0.0004; const g = [gd(x + h, y, z) - gd(x - h, y, z), gd(x, y + h, z) - gd(x, y - h, z), gd(x, y, z + h) - gd(x, y, z - h)]; const l = Math.hypot(...g) || 1; return g.map((v) => v / l); };
function give(P) {
  const n = P.n, D = new Float64Array(n * 3);
  const at = (v) => [P.p[v * 3] + D[v * 3], P.p[v * 3 + 1] + D[v * 3 + 1], P.p[v * 3 + 2] + D[v * 3 + 2]];
  // the neighbours by a hash on the posed surface
  const cell = SIG * 2, H = new Map(), key = (x, y, z) => Math.floor(x / cell) + ',' + Math.floor(y / cell) + ',' + Math.floor(z / cell);
  for (let v = 0; v < n; v++) { const k = key(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); (H.get(k) || H.set(k, []).get(k)).push(v); }
  const near = (v) => { const x = P.p[v * 3], y = P.p[v * 3 + 1], z = P.p[v * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell), out = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const L = H.get((cx + i) + ',' + (cy + j) + ',' + (cz + k)); if (L) for (const u of L) out.push(u); } return out; };
  let before = 0; for (let v = 0; v < n; v++) before = Math.min(before, gd(...at(v)));
  // a smooth field kept out of the gun: project the vertices inside onto the surface (plus CLEAR), then smooth the field
  // over the surface (Gaussian, SIG), again and again; the last pass projects only
  const NB = []; for (let v = 0; v < n; v++) { const L = []; for (const u of near(v)) { const dd = (P.p[u * 3] - P.p[v * 3]) ** 2 + (P.p[u * 3 + 1] - P.p[v * 3 + 1]) ** 2 + (P.p[u * 3 + 2] - P.p[v * 3 + 2]) ** 2, w = Math.exp(-dd / (2 * SIG * SIG)); if (w > 0.05) L.push(u, w); } NB.push(L); }
  const project = () => { let m = 0; for (let v = 0; v < n; v++) { if (SKIPB.length && P.b0 && SKIPB.includes(P.b0[v])) continue; const p = at(v), d = gd(...p); if (d < CLEAR) { const g = grad(...p), e = CLEAR - d + 0.00002; D[v * 3] += g[0] * e; D[v * 3 + 1] += g[1] * e; D[v * 3 + 2] += g[2] * e; m++; } } return m; };
  const live = new Uint8Array(n);
  for (let it = 0; it < 30; it++) {
    if (!project() && it > 0) break;
    for (let v = 0; v < n; v++) if (D[v * 3] || D[v * 3 + 1] || D[v * 3 + 2]) live[v] = 1;
    const E = new Float64Array(n * 3);
    for (let v = 0; v < n; v++) { const L = NB[v]; let sw = 0, x = 0, y = 0, z = 0, any = false; for (let i = 0; i < L.length; i += 2) { const u = L[i], w = L[i + 1]; if (live[u]) any = true; sw += w; x += D[u * 3] * w; y += D[u * 3 + 1] * w; z += D[u * 3 + 2] * w; } if (any) { E[v * 3] = x / sw; E[v * 3 + 1] = y / sw; E[v * 3 + 2] = z / sw; } }
    D.set(E);
  }
  for (let k = 0; k < 4; k++) if (!project()) break;
  let after = 0; for (let v = 0; v < n; v++) after = Math.min(after, gd(...at(v)));
  const idx = [], d = []; let maxD = 0;
  for (let v = 0; v < n; v++) { const m = Math.hypot(D[v * 3], D[v * 3 + 1], D[v * 3 + 2]); if (m > 0.00008) { idx.push(v); d.push(...[D[v * 3], D[v * 3 + 1], D[v * 3 + 2]].map((x) => +x.toFixed(6))); maxD = Math.max(maxD, m); } }
  return { idx, d, before: +(before * 1000).toFixed(2), after: +(after * 1000).toFixed(2), maxGive: +(maxD * 1000).toFixed(2), n: idx.length };
}
const glove = give(M.handPosed(pose, M.GLOVE_INFLATE)), bare = give(M.handPosed(pose, 0)), pads = give(M.handPosedPart(pose, 'pads'));
const sum = (k) => JSON.stringify({ before: k.before, after: k.after, maxGive: k.maxGive, n: k.n });
console.log('glove', sum(glove), 'bare', sum(bare), 'pads', sum(pads));
if (process.env.OUT) (await import('node:fs')).writeFileSync(process.env.OUT, JSON.stringify({ pose, glove: { idx: glove.idx, d: glove.d }, bare: { idx: bare.idx, d: bare.d }, pads: { idx: pads.idx, d: pads.d } }));

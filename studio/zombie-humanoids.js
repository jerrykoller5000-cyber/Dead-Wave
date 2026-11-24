// studio/zombie-humanoids.js — CC-355 (Claude 3, J154 Zombie Pass 1, D-184): the humanoid zombies to the marine's
// fidelity. ONE humanoid body shared by shambler, feral, military, drowned, screamer and bomber (the Director's pick (b),
// 15 Nov), then one named section per type for its head, clothes, gear and decay (HUMANOID.<type> = its parameters,
// SECTIONS.<type> = its sculpt).
//
// Where it runs: one call inside applyZombieConcept (studio/zombie-concepts.js, ChatGPT's), after the type branches and
// before audit / batchGlow / batchSurfaces. For the six types it strips the base body surfaces from the existing bones
// (eyes and glowing parts kept) and builds the new body on the SAME bones and pivots, so the skeleton, the hit volumes,
// the AI, combat and every animation are unchanged, and the result is batched, cached and skinned exactly as before:
// one draw, one material per body.
//
// The body: continuous lofts with real cross-sections (superellipse rings carved with anatomy: deltoid, pectorals, rib
// cage, scapulae, spine, hip, knee, calf, tendons), clothes as shells with real thickness (an outer surface plus a rim
// down to the skin at every edge), colour painted by splitting each loft's own triangles (no stickers on the surface).
//
// GORE-READY (Pass 3): every piece is built on exactly one bone and each vertex is weighted 1 to it, so a cut at a
// joint is clean. Cut points: NECK (head | torso), SHOULDER (armL/armR | torso), ELBOW (elbowG | arm), HIP (legL/legR |
// hips), KNEE (shinG | leg), ANKLE (the shambler-ankle group | shinG: leather/sole/below -.365, prepareShamblerFeet),
// WAIST (torso | hips). Each loft is closed at both ends, so a severed part never shows a hole; the gore pass adds the
// stump and the wound.
//
// Variation (GP-20146, ChatGPT): the cached template is the NEUTRAL default (no look). Every optional feature is its own
// mesh tagged userData.zombieFeature: {kind:'tooth',slot 0..17}, {kind:'wound',bit} (the carved, painted wound) with its
// {kind:'woundless',bit} twin (the same patch of skin uncarved), {kind:'hair',slot 0..3}, {kind:'cranium'}. Post-cache,
// the look record hides one twin or the other, missing teeth and hair regions; colour and size are ChatGPT's post-cache
// attributes. refineHumanoid(..., look) with a look builds that individual directly (the cloud review sheets do this).
//
// CC-359 step 2 (Claude 3, 19 Nov 2026) REVIEW COPY (review/CC-359/v5): the SHAMBLER v5 = Antigravity's AG-357 pass-7 body
// (Jerry: "Yes shambler is done", D-213) as geometry on the game's own bones (zombie-shambler-v5.js, the port). The bones
// follow the Director's 06:55Z picks (shorter arms, the head bone at the neck base, rig.head 1, the game's L/R names) plus
// one more pivot asked for in this step's request (the torso pivot at the waist, rig.torsoY). Every other type: unchanged.
// A/B: index.html?shamblerV5=0 builds the live (v4) shambler from this same file.
// CC-359 step 3 (review/CC-359/v6): the paint, AG's one atlas (zombie-atlas.js), and the shoulder/elbow seams blended (zombie-shambler-v5.js).
import { buildShamblerV5 } from './zombie-shambler-v5.js';
import { shamblerAtlas, cc359AtlasZone, cc359AtlasUV } from './zombie-atlas.js';   // CC-359 step 3: AG's paint (one atlas)
export const HUMANOID_TYPES = Object.freeze(['shambler', 'feral', 'military', 'drowned', 'screamer', 'bomber']);

const TAU = Math.PI * 2;
const angd = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const G = (x) => Math.exp(-x * x);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// bump weight of a gaussian bump {t, y, at, ay} at (theta, y)
const bw = (b, t, y) => G(angd(t, b.t) / b.at) * G((y - b.y) / b.ay);
function hash3(i, j, k, seed) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
// value noise on a 3D point, 0..1
export function noise3(x, y, z, seed = 1) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, h = (a, b, c) => hash3(i + a, j + b, k + c, seed);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), sx), L(h(0, 1, 0), h(1, 1, 0), sx), sy), L(L(h(0, 0, 1), h(1, 0, 1), sx), L(h(0, 1, 1), h(1, 1, 1), sx), sy), sz);
}
const fbm = (x, y, z, seed) => .6 * noise3(x, y, z, seed) + .3 * noise3(x * 2.1, y * 2.1, z * 2.1, seed + 7) + .1 * noise3(x * 4.3, y * 4.3, z * 4.3, seed + 13);

// ---- geometry core ---------------------------------------------------------------------------------------------------
// tube(): a loft through keys [{y, w, d, cx, cz, p}] (half-width, half-depth, centre, superellipse power), n sides, sub
// rows per key span, carved by gaussian bumps [{t, y, at, ay, a}] and an optional field(t, y, x, z) (radial offset along
// the ring normal). theta 0 = front (+z), +PI/2 = +x. axis 'z' lofts along z (the ring's 'y' becomes z, its depth y).
// paint: [{m, f(t, y, x, z)}]: a triangle whose centre passes f takes m (first match), else the base material.
// variants: [{bit, region(t, y), bumps, paint}]: inside region, two meshes: the carved+painted one {kind:'wound',bit}
// and the plain one {kind:'woundless',bit}. Returns {meshes, at(t, y) -> {p, n} (unit-scale, bone-local), rows}.
const warpT = (u, k) => TAU * u - k * Math.sin(TAU * u);
const unwarp = (t, k) => { let u = (((t / TAU) % 1) + 1) % 1; for (let i = 0; i < 6; i++) u -= (warpT(u, k) - (((t % TAU) + TAU) % TAU)) / (TAU * (1 - k * Math.cos(TAU * u))); return ((u % 1) + 1) % 1; };
function tubeData(spec, withVariants) {
  const { keys, n = 24, sub = 2, bumps = [], field = null, warp = 0 } = spec;
  const K = keys.map((k) => [k.y, k.w, k.d, k.cx || 0, k.cz || 0, k.p || 2]);
  const cr = (a, b, c, d, t) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const R = [];
  for (let j = 0; j < K.length - 1; j++) for (let k = 0; k < sub; k++) {
    const t = k / sub, row = [];
    for (let q = 0; q < 6; q++) {
      const a = K[Math.max(0, j - 1)][q], b = K[j][q], c = K[j + 1][q], d = K[Math.min(K.length - 1, j + 2)][q];
      let v = q === 0 ? b + (c - b) * t : cr(a, b, c, d, t);
      if (q === 1 || q === 2 || q === 5) v = clamp(v, Math.min(b, c) * .97, Math.max(b, c) * 1.03);
      row.push(v);
    }
    R.push(row);
  }
  R.push(K.at(-1));
  const allBumps = withVariants ? [...bumps, ...(spec.variants || []).flatMap((v) => v.bumps || [])] : bumps;
  const pts = [];
  for (const [y, w, d, cx, cz, p] of R) {
    const row = [];
    for (let i = 0; i < n; i++) {
      const t = warpT(i / n, warp), st = Math.sin(t), ct = Math.cos(t), e = 2 / p;
      const bx = w * Math.sign(st) * Math.abs(st) ** e, bz = d * Math.sign(ct) * Math.abs(ct) ** e;
      let nx = Math.sign(bx) * Math.abs(bx / w) ** (p - 1) / w, nz = Math.sign(bz) * Math.abs(bz / d) ** (p - 1) / d;
      const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      let r = 0; for (const b of allBumps) r += b.a * bw(b, t, y);
      if (field) r += field(t, y, cx + bx, cz + bz);
      row.push([cx + bx + nx * r, y, cz + bz + nz * r]);
    }
    pts.push(row);
  }
  return { pts, ys: R.map((r) => r[0]), n };
}
function tube(A, T, s, p, m, spec) {
  const caps = spec.caps || [true, true], swap = spec.axis === 'z';
  const D = tubeData(spec, true), D0 = spec.variants?.length ? tubeData(spec, false) : null;
  const { n } = D, rows = D.pts.length, wk = spec.warp || 0, TH = (i) => warpT(i / n, wk);
  const build = (data) => {
    const pos = [];
    for (const row of data.pts) for (const [x, y, z] of row) pos.push(x * s, (swap ? z : y) * s, (swap ? y : z) * s);
    const cap = (row, dy) => { let x = 0, z = 0; for (const q of row) { x += q[0]; z += q[2]; } x /= n; z /= n; pos.push(x * s, (swap ? z : row[0][1] + dy) * s, (swap ? row[0][1] + dy : z) * s); };
    cap(data.pts[0], -(spec.capBulge?.[0] ?? .01)); cap(data.pts[rows - 1], spec.capBulge?.[1] ?? .01);
    return pos;
  };
  const pos = build(D), pos0 = D0 ? build(D0) : null, c0 = rows * n, c1 = c0 + 1;
  // triangles with the (theta, y) of their centre
  const tris = [];
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + (i + 1) % n, t = warpT((i + .5) / n, wk), y = (D.ys[j] + D.ys[j + 1]) / 2;
    tris.push([a, b, a + n, t, y], [b, b + n, a + n, t, y]);
  }
  if (caps[0]) for (let i = 0; i < n; i++) tris.push([c0, (i + 1) % n, i, TH(i + .5), D.ys[0]]);
  if (caps[1]) for (let i = 0; i < n; i++) { const a = (rows - 1) * n; tris.push([c1, a + i, a + (i + 1) % n, TH(i + .5), D.ys[rows - 1]]); }
  // orientation: closed tube, signed volume must be positive (outward faces)
  let vol = 0; const P = (k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
  for (const [a, b, c] of tris) { const A0 = P(a), B0 = P(b), C0 = P(c); vol += A0[0] * (B0[1] * C0[2] - B0[2] * C0[1]) - A0[1] * (B0[0] * C0[2] - B0[2] * C0[0]) + A0[2] * (B0[0] * C0[1] - B0[1] * C0[0]); }
  if (vol < 0) for (const t of tris) { const x = t[1]; t[1] = t[2]; t[2] = x; }
  const xyz = (t, y) => { const i = Math.round(unwarp(t, wk) * n) % n, j = Math.max(0, D.ys.findIndex((v) => v >= y)); const q = D.pts[j][i]; return q; };
  const pick = (t, y, paint) => { if (!paint) return null; const q = xyz(t, y); for (const P1 of paint) if (P1.f(t, y, q[0], q[2])) return P1.m; return null; };
  const groups = new Map(); const add = (key, mat, src, tri, tag) => { const k = key + '|' + mat.uuid; if (!groups.has(k)) groups.set(k, { mat, src, tag, idx: [] }); groups.get(k).idx.push(tri[0], tri[1], tri[2]); };
  for (const tri of tris) {
    const [, , , t, y] = tri, v = (spec.variants || []).find((V) => V.region(t, y));
    if (v) {
      add('w' + v.bit, pick(t, y, [...(v.paint || []), ...(spec.paint || [])]) || m, 'A', tri, { kind: 'wound', bit: v.bit });
      add('n' + v.bit, pick(t, y, spec.paint) || m, 'B', tri, { kind: 'woundless', bit: v.bit });
    } else add('base', pick(t, y, spec.paint) || m, 'A', tri, spec.tag || null);
  }
  const mk = (arr) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); return g; };
  const all = (arr) => { const g = mk(arr); g.setIndex(tris.flatMap((t) => [t[0], t[1], t[2]])); g.computeVertexNormals(); return g.getAttribute('normal'); };
  const NA = all(pos), NB = pos0 ? all(pos0) : null, PA = new T.Float32BufferAttribute(pos, 3), PB = pos0 ? new T.Float32BufferAttribute(pos0, 3) : null;
  // s22 vpaint (per-vertex colour, ChatGPT's batchSurfaces 88d4ad4c multiplies it with the material colour): smooth layers
  // [{m, w(t, y, x, z) -> 0..1}] lerped over the base colour at every vertex, so a socket / mouth / wound shade fades over
  // the loft's own vertices instead of stepping triangle by triangle. The base material's triangles move to one
  // vertex-coloured twin of it (same colour, same GP-20146 role), carrying the ratio paint/base per channel.
  const vlay = spec.vpaint || [], vwound = (spec.variants || []).flatMap((v) => v.vpaint || []);
  let mv = null, CA = null, CB = null;
  if (vlay.length || vwound.length) {
    const base = m.color, colours = (data, layers) => {
      const out = new Float32Array(rows * n * 3 + 6).fill(1), c = new T.Color();
      for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
        const t = warpT(i / n, wk), y = data.ys ? data.ys[j] : D.ys[j], q = data.pts[j][i];
        c.copy(base); for (const L of layers) { const w = clamp(L.w(t, y, q[0], q[2]), 0, 1); if (w > 0) c.lerp(L.m.color, w); }
        const k = (j * n + i) * 3; out[k] = c.r / Math.max(1e-4, base.r); out[k + 1] = c.g / Math.max(1e-4, base.g); out[k + 2] = c.b / Math.max(1e-4, base.b);
      }
      return new T.Float32BufferAttribute(out, 3);
    };
    CA = colours(D, [...vlay, ...vwound]); CB = D0 ? colours(D0, vlay) : null;
    mv = A.mat(base.getHex(), false, m.metalness || 0, m.userData.surface || 'skin'); mv.vertexColors = true;
    for (const key of ['zombieColorRole', 'zombieColorBase']) if (m.userData[key] != null) mv.userData[key] = m.userData[key];
  }
  const meshes = [];
  for (const gr of groups.values()) {
    const geo = new T.BufferGeometry(); geo.setAttribute('position', gr.src === 'A' ? PA : PB); geo.setAttribute('normal', gr.src === 'A' ? NA : NB); geo.setIndex(gr.idx);
    const vc = mv && gr.mat === m; if (vc) geo.setAttribute('color', gr.src === 'A' ? CA : CB);
    const o = A.put(p, geo, vc ? mv : gr.mat); o.userData.cc355 = true; if (gr.tag) o.userData.zombieFeature = { ...gr.tag }; meshes.push(o);
  }
  // GP-20146 (ChatGPT): the loft's exact cap planes, bone-local, on every chunk of this one loft (paint/variant alike).
  const ky0 = spec.keys[0].y * s, ky1 = spec.keys[spec.keys.length - 1].y * s, caps0 = { axis: spec.axis || 'y', min: Math.min(ky0, ky1), max: Math.max(ky0, ky1) };
  for (const o of meshes) o.userData.zombieMorphCaps = { ...caps0 };
  // evaluator on the carved surface: bilinear in (theta, y)
  const at = (t, y) => {
    const fi = (unwarp(t, wk) * n) % n, i0 = Math.floor(fi), i1 = (i0 + 1) % n, ft = fi - i0;
    let j = D.ys.findIndex((v) => v >= y); if (j < 0) j = rows - 1; if (j === 0) j = 1;
    const j0 = j - 1, fy = clamp((y - D.ys[j0]) / (D.ys[j] - D.ys[j0] || 1), 0, 1);
    const L = (k) => { const a = j0 * n, b = j * n; const v = (q, arr) => [arr.getX(q), arr.getY(q), arr.getZ(q)];
      const mix = (u, w, f) => u.map((x, z) => x + (w[z] - x) * f);
      return mix(mix(v(a + i0, k), v(a + i1, k), ft), mix(v(b + i0, k), v(b + i1, k), ft), fy); };
    const q = L(PA).map((x) => x / s), nn = L(NA);
    const P0 = new T.Vector3(q[0], q[1], q[2]), N0 = new T.Vector3(nn[0], nn[1], nn[2]).normalize();
    return { p: P0, n: N0 };
  };
  return { meshes, at, D, n, warp: wk };
}
// shell(): cloth over a tube: outer surface `off(t, y)` out from it between lo(t) and hi(t), plus a rim band at both
// edges that turns in under the surface: that edge is the cloth's thickness (D-181: layering you can see).
function shell(A, T, s, p, m, base, o) {
  const { n } = base, rows = o.rows || 12, lo = o.lo, hi = o.hi, off = o.off, rimIn = o.rimIn ?? .006;
  const grid = [], inner = [];
  for (let r = 0; r <= rows; r++) {
    const row = [], irow = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * TAU, y = lo(t) + (hi(t) - lo(t)) * r / rows, h = base.at(t, y), d = off(t, y);
      row.push(h.p.clone().addScaledVector(h.n, d)); irow.push(h.p.clone().addScaledVector(h.n, -rimIn));
    }
    grid.push(row); inner.push(irow);
  }
  const pos = [], idx = [], tt = [];
  for (const row of grid) for (const v of row) pos.push(v.x * s, v.y * s, v.z * s);
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const a = r * n + i, b = r * n + (i + 1) % n, t = (i + .5) / n * TAU, yy = (grid[r][i].y + grid[r + 1][i].y) / 2;
    tt.push([a, b, a + n, t, yy, r], [b, b + n, a + n, t, yy, r]);
  }
  // outward check against the base normal at one sample
  const chk = () => { const [a, b, c] = tt[0], V = (k) => new T.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); const N = V(b).sub(V(a)).cross(V(c).sub(V(a))); return N.dot(base.at(tt[0][3], tt[0][4]).n) > 0; };
  if (!chk()) for (const t of tt) { const x = t[1]; t[1] = t[2]; t[2] = x; }
  const groups = new Map();
  for (const t of tt) {
    let mat = m; if (o.paint) { const v = grid[t[5]][Math.floor(t[3] / TAU * n) % n]; for (const P1 of o.paint) if (P1.f(t[3], t[4], v.x, v.z)) { mat = P1.m; break; } }
    const key = (o.tagFor?.(t[3], t[4]) ? 'T' + JSON.stringify(o.tagFor(t[3], t[4])) : '') + mat.uuid;
    if (!groups.has(key)) groups.set(key, { mat, tag: o.tagFor?.(t[3], t[4]) || null, idx: [] }); groups.get(key).idx.push(t[0], t[1], t[2]);
  }
  const G0 = new T.BufferGeometry(); G0.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); G0.setIndex(tt.flatMap((t) => t.slice(0, 3))); G0.computeVertexNormals();
  const out = [];
  for (const g of groups.values()) { const geo = new T.BufferGeometry(); geo.setAttribute('position', G0.getAttribute('position')); geo.setAttribute('normal', G0.getAttribute('normal')); geo.setIndex(g.idx); const q = A.put(p, geo, g.mat); q.userData.cc355 = true; if (g.tag) q.userData.zombieFeature = g.tag; out.push(q); }
  // the rims: outer edge -> under the skin, flat-shaded (their own vertices)
  for (const [r, dir] of [[0, -1], [rows, 1]]) {
    if (o.rim && !o.rim[r ? 1 : 0]) continue;
    const rp = [];
    for (let i = 0; i < n; i++) { const i2 = (i + 1) % n, a = grid[r][i], b = grid[r][i2], c = inner[r][i], d = inner[r][i2]; for (const v of [a, c, b, b, c, d]) rp.push(v.x * s, v.y * s, v.z * s); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(rp, 3));
    // the rim faces away from the cloth (down at the hem, up at the top edge)
    const V = (k) => new T.Vector3(rp[k * 3], rp[k * 3 + 1], rp[k * 3 + 2]), N = V(1).sub(V(0)).cross(V(2).sub(V(0)));
    const away = grid[r][0].clone().sub(grid[r === 0 ? 1 : rows - 1][0]);
    if (N.dot(away) < 0) for (let k = 0; k < rp.length; k += 9) for (let q = 0; q < 3; q++) { const x = rp[k + 3 + q]; rp[k + 3 + q] = rp[k + 6 + q]; rp[k + 6 + q] = x; }
    geo.setAttribute('position', new T.Float32BufferAttribute(rp, 3)); geo.computeVertexNormals();
    const q = A.put(p, geo, o.rimMat || m); q.userData.cc355 = true; out.push(q);
  }
  return out;
}
// cord(): a round tube along points with per-point radius (fingers, tendons, veins, strands), capped
function cord(A, T, s, p, m, pts, radii, n = 6, tag = null) {
  const P = pts.map((q) => new T.Vector3(q[0], q[1], q[2])), pos = [], idx = [];
  const D0 = P[1].clone().sub(P[0]).normalize(); let N = new T.Vector3(0, 1, 0); if (Math.abs(N.dot(D0)) > .9) N.set(1, 0, 0); N.sub(D0.clone().multiplyScalar(N.dot(D0))).normalize();
  for (let j = 0; j < P.length; j++) {
    const D = (j < P.length - 1 ? P[j + 1].clone().sub(P[j]) : P[j].clone().sub(P[j - 1])).normalize();
    N.sub(D.clone().multiplyScalar(N.dot(D))).normalize(); const B = D.clone().cross(N).normalize(), r = radii[Math.min(j, radii.length - 1)];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, V = P[j].clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r); pos.push(V.x * s, V.y * s, V.z * s); }
  }
  for (let j = 0; j < P.length - 1; j++) for (let i = 0; i < n; i++) { const a = j * n + i, b = j * n + (i + 1) % n; idx.push(a, a + n, b, b, a + n, b + n); }
  const c0 = pos.length / 3; const e0 = P[0].clone().addScaledVector(P[0].clone().sub(P[1]).normalize(), radii[0] * .5); pos.push(e0.x * s, e0.y * s, e0.z * s);
  const c1 = c0 + 1, last = P.at(-1).clone().addScaledVector(P.at(-1).clone().sub(P.at(-2)).normalize(), radii.at(-1) * .6); pos.push(last.x * s, last.y * s, last.z * s);
  for (let i = 0; i < n; i++) { const a = i, b = (i + 1) % n, L = (P.length - 1) * n; idx.push(c0, b, a, c1, L + a, L + b); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  // orientation by signed volume
  let vol = 0; for (let k = 0; k < idx.length; k += 3) { const a = idx[k] * 3, b = idx[k + 1] * 3, c = idx[k + 2] * 3; vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]); }
  // signed volume about the origin is only meaningful for a closed mesh: compare with the volume about the centroid
  const cen = P.reduce((a, b) => a.add(b), new T.Vector3()).multiplyScalar(s / P.length); let v2 = 0;
  for (let k = 0; k < idx.length; k += 3) { const Q = (q) => new T.Vector3(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]).sub(cen); const a = Q(idx[k]), b = Q(idx[k + 1]), c = Q(idx[k + 2]); v2 += a.dot(b.cross(c)); }
  void vol; if (v2 < 0) for (let k = 0; k < idx.length; k += 3) { const x = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = x; }
  geo.setIndex(idx); geo.computeVertexNormals();
  const o = A.put(p, geo, m); o.userData.cc355 = true; if (tag) o.userData.zombieFeature = { ...tag }; return o;
}
// a flattened ellipsoid lying on a surface hit {p, n}: w across, h along, d out; lift (+ out, - in)
function blob(A, T, s, p, m, hit, w, h, d, spin = 0, lift = 0, tag = null, seg = null) {
  if (!hit) return null;
  const big = w > .06 || h > .06, o = A.put(p, new T.SphereGeometry(1, seg?.[0] || (big ? 10 : 7), seg?.[1] || (big ? 6 : 4)), m);
  const n = hit.n.clone().normalize(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), n);
  q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), spin));
  o.quaternion.copy(q); o.position.copy(hit.p.clone().addScaledVector(n, lift)).multiplyScalar(s);
  o.scale.set(w * s / 2, h * s / 2, d * s / 2); o.userData.cc355 = true; if (tag) o.userData.zombieFeature = { ...tag }; return o;
}
// plank(): a curved board lying on a tube between thetas [t0, t1] and heights [y0, y1], `off` out from it and `th` thick:
// its face follows the body under it (a board strapped round a belly), with flat-shaded ends and edges (its thickness)
function plank(A, T, s, p, m, tb, t0, t1, y0, y1, off, th, nu = 10, nv = 3, edgeMat = null, lift = null, studs = []) {
  const P = (u, v, d) => { const t = t0 + (t1 - t0) * u, y = y0 + (y1 - y0) * v, h = tb.at(t, y); return h.p.clone().addScaledVector(h.n, d + (lift ? lift(u, v) : 0)); };
  const pos = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const q = P(i / nu, j / nv, off); pos.push(q.x * s, q.y * s, q.z * s); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  const mid = tb.at((t0 + t1) / 2, (y0 + y1) / 2), V = (k) => new T.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
  if (V(idx[1]).sub(V(idx[0])).cross(V(idx[2]).sub(V(idx[0]))).dot(mid.n) < 0) for (let k = 0; k < idx.length; k += 3) { const x = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = x; }
  geo.setIndex(idx); geo.computeVertexNormals();
  const out = [A.put(p, geo, m)];
  // the edges: a band round the board's outline from the face down to `off - th`
  const ring = [];
  for (let i = 0; i <= nu; i++) ring.push([i / nu, 0]); for (let j = 1; j <= nv; j++) ring.push([1, j / nv]);
  for (let i = nu - 1; i >= 0; i--) ring.push([i / nu, 1]); for (let j = nv - 1; j >= 1; j--) ring.push([0, j / nv]);
  const ep = [], c0 = P(.5, .5, off);
  for (let k = 0; k < ring.length; k++) {
    const [u0, v0] = ring[k], [u1, v1] = ring[(k + 1) % ring.length], a = P(u0, v0, off), b = P(u1, v1, off), c = P(u0, v0, off - th), d = P(u1, v1, off - th);
    const n = b.clone().sub(a).cross(c.clone().sub(a)), away = a.clone().add(b).multiplyScalar(.5).sub(c0);
    for (const q of n.dot(away) >= 0 ? [a, b, c, b, d, c] : [a, c, b, b, c, d]) ep.push(q.x * s, q.y * s, q.z * s);
  }
  // studs (rivet heads) on the face: low domes in the edge mesh itself (one part with the board, so nothing is seated in it)
  for (const [u, v, r = .006] of studs) {
    const c = P(u, v, off - .001), h = tb.at(t0 + (t1 - t0) * u, y0 + (y1 - y0) * v), n = h.n.clone().normalize(), top = c.clone().addScaledVector(n, .0065);
    const e1 = new T.Vector3(0, 1, 0).cross(n).normalize(), e2 = n.clone().cross(e1);
    const ringP = Array.from({ length: 7 }, (_, k) => { const a = k / 7 * TAU; return c.clone().addScaledVector(e1, Math.cos(a) * r).addScaledVector(e2, Math.sin(a) * r); });
    for (let k = 0; k < 7; k++) { const a = ringP[k], b = ringP[(k + 1) % 7], nn = b.clone().sub(a).cross(top.clone().sub(a)); for (const q of nn.dot(n) >= 0 ? [a, b, top] : [a, top, b]) ep.push(q.x * s, q.y * s, q.z * s); }
  }
  const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(ep, 3)); eg.computeVertexNormals(); out.push(A.put(p, eg, edgeMat || m));
  for (const o of out) o.userData.cc355 = true;
  return out;
}
// a cord laid on a tube surface through (theta, y) points, lifted off it
const onTube = (tb, pts, lift) => pts.map(([t, y]) => { const h = tb.at(t, y); return h.p.addScaledVector(h.n, lift).toArray(); });

// ---- the shared humanoid body ------------------------------------------------------------------------------------------
// B: the type's body params (see HUMANOID.<type>.body). Builds on hips, torso, arms, elbows, legs, shins; returns the
// lofts so a section can lay its clothes and details on them.
function stripBase(g) {
  const u = g.userData, eyes = new Set(u.eyes || []), bs = [u.hips, u.torso, u.head];
  for (const S of ['L', 'R']) { const a = u['arm' + S + 'G'], l = u['leg' + S + 'G']; bs.push(a, a.userData.elbowG, l, l.userData.shinG); }
  for (const b of bs) for (const m of [...b.children]) if (m.isMesh && !eyes.has(m) && !(m.material?.emissive && m.material.emissive.getHex() !== 0)) m.removeFromParent();
}
function body(A, T, g, s, B, M, V) {
  const u = g.userData, { hips, torso, armLG, legLG } = u, W = B.w, Dp = B.d, mu = B.muscle, seed = B.seed || 1;
  const hz = u.head.position.z / s, sx = Math.abs(armLG.position.x) / s, sy = armLG.position.y / s, tY = torso.position.y / s, lx = Math.abs(legLG.position.x) / s;
  const out = {}, ai = 0, sxe = sx;   // s27 (J158): armIn retired: the joint itself sits at the ribcage's top-outer corner now (humanoidPivots)
  const cW = chestHalf(B), trap = B.trap || 0;
  // s27 (J158): the side view: the chest and upper back round out, the lumbar curve goes in, the belly hangs
  const profile = (t, y) => { const c = Math.cos(t), f = Math.max(0, c) ** 2, k = Math.max(0, -c) ** 2;
    return f * (.02 * (B.chest + .4) * G((y - .26) / .085) - .006 * G((y - .12) / .04) + .008 * Math.max(0, B.belly) * G((y - .02) / .07))
      + k * (.02 * G((y - sy + .04) / .08) - .009 * G((y - .03) / .06)); };
  // decay mottling and lividity: painted from the loft's own triangles (no decals)
  const mottle = (t, y, x, z) => fbm(x * 11 + 3, y * 11, z * 11, seed) > .64;
  const skinPaint = [{ m: M.decay, f: mottle }, { m: M.skinMid, f: (t, y, x, z) => fbm(x * 8, y * 8 + 9, z * 8, seed + 3) > .62 }];
  // TORSO: waist to neck; the shoulder line reaches the arm pivots, the trapezius slopes into a short thick neck
  const ribs = B.ribs, tb = [
    // pectorals, the sternum groove, clavicles, the lower ribs' flare, the belly, the obliques over the hip
    ...[-1, 1].flatMap((k) => [{ t: k * .55, y: .345, at: .42, ay: .055, a: .018 * B.chest }, { t: k * .5, y: .447, at: .55, ay: .012, a: .007 },
      { t: k * 1.25, y: .2, at: .35, ay: .07, a: .008 }, { t: k * 1.35, y: .0, at: .3, ay: .05, a: .007 },
      // scapulae and the erector muscles beside the spine; the lats wrap the back under the arms
      { t: k * (Math.PI - .55), y: .36, at: .35, ay: .07, a: .016 }, { t: k * (Math.PI - .2), y: .12, at: .14, ay: .14, a: .009 },
      { t: k * 1.85, y: .32, at: .3, ay: .09, a: .01 },
      // the sternocleidomastoid running up the neck, and the trapezius ridge
      { t: k * .55, y: .52, at: .3, ay: .03, a: .007 }, { t: k * 1.4, y: .47, at: .4, ay: .025, a: .006 }]),
    { t: 0, y: .3, at: .12, ay: .09, a: -.006 }, { t: Math.PI, y: .25, at: .1, ay: .3, a: -.008 }, { t: 0, y: .08, at: .7, ay: .06, a: .012 * B.belly }];
  const ribField = (t, y) => { // visible ribs: bars sloping down to the front, strongest on the flanks
    if (!ribs || y < .1 || y > .36) return 0; const front = Math.cos(t), flank = G((Math.abs(angd(t, 0)) - 1.15) / .55);
    const ph = (y - .055 * front - .1) / .036; return ribs * .0045 * flank * Math.max(0, Math.cos(ph * TAU)) * G((y - .24) / .1);
  };
  const spine = (t, y) => B.spine ? B.spine * .006 * G(angd(t, Math.PI) / .09) * Math.max(0, Math.cos((y - .02) / .042 * TAU)) * (y > -.05 && y < .5 ? 1 : 0) : 0;
  out.torso = tube(A, T, s, torso, M.skin, {
    n: 28, sub: 2, warp: .3, bumps: tb, field: (t, y, x, z) => ribField(t, y) + spine(t, y) + profile(t, y) + (B.torsoField ? B.torsoField(t, y, x, z) : 0), paint: B.torsoVPaint ? [] : skinPaint, vpaint: B.torsoVPaint, variants: V.torso,
    keys: [{ y: -.1, w: .146 * W, d: .116 * Dp, cz: .004 }, { y: .0, w: .15 * W, d: .12 * Dp, cz: .008 }, { y: .1, w: .156 * W, d: .126 * Dp, cz: .008 },
      { y: .19, w: cW * .97, d: .134 * Dp, cz: .008, p: 2.2 }, { y: .26, w: cW, d: .14 * Dp, cz: .01, p: 2.3 }, { y: sy - .05, w: cW * .99, d: .136 * Dp, cz: .004, p: 2.4 },
      // s27 (J158): the shoulder: the ribcage's top-outer corner over the joint, the acromion just above it, then the
      // trapezius sloping up and in to the neck in one line (the deltoid on the arm caps the joint from outside)
      { y: sy - .012, w: sx - .03, d: .118 * Dp, p: 2.3, cz: -.004 }, { y: sy + .022, w: sx - .046, d: .1 * Dp, p: 2.1, cz: -.01 },
      { y: sy + .055, w: (sx - .046) * .62 + .045 + trap * .018, d: .086 + trap * .012, p: 2.05, cz: -.014 + hz * .08 },
      { y: sy + .09, w: (sx - .046) * .3 + .06 + trap * .014, d: .078 + trap * .008, cz: -.014 + hz * .15, p: 2.05 },
      { y: Math.max(sy + .125, .515), w: .08 + trap * .006, d: .072, cz: -.005 + hz * .5 }, { y: .55, w: .066, d: .064, cz: .005 + hz * .75 }, { y: .58, w: .055, d: .055, cz: .01 + hz * .9 }]
  });
  // PELVIS (hips): built as the trousers' seat directly (a section can swap its material); glutes, iliac crest
  out.pelvis = tube(A, T, s, hips, B.pelvisMat || M.cloth, {
    n: 26, sub: 2, paint: B.pelvisPaint,
    bumps: [-1, 1].flatMap((k) => [{ t: k * (Math.PI - .5), y: .03, at: .45, ay: .08, a: .022 }, { t: k * 1.2, y: .15, at: .3, ay: .04, a: .006 }]),
    field: B.pelvisField || (B.clothField ? (t, y, x, z) => B.clothField(t, y, x, z, 1) : null),
    // s27 (J158): sized from the hip joints (lx) so the thighs leave from INSIDE its sides: the widest ring at the
    // greater trochanter (lx + the thigh's top + a little), the iliac crest above it, in to the waist; B.hip widens a woman's
    keys: [{ y: -.05, w: .05, d: .055, cz: -.012 }, { y: -.02, w: (lx + .07) * (B.hip || 1), d: .104 * Dp, cz: -.006 }, { y: .035, w: (lx + .094) * (B.hip || 1), d: .126 * Dp, p: 2.3 },
      { y: .12, w: (lx + .084) * (B.hip || 1), d: .13 * Dp, cz: .004, p: 2.25 }, { y: .2, w: .158 * W * (1 + ((B.hip || 1) - 1) * .5), d: .124 * Dp, cz: .006 }, { y: .245, w: .15 * W, d: .12 * Dp, cz: .006 }]
  });
  for (const side of [-1, 1]) {
    const arm = side < 0 ? armLG : u.armRG, el = arm.userData.elbowG, leg = side < 0 ? legLG : u.legRG, shin = leg.userData.shinG, S = side < 0 ? 'L' : 'R';
    const o = side * Math.PI / 2; // the outside of this limb
    // UPPER ARM: the deltoid cap over the joint, biceps in front, triceps behind, narrowing to the elbow
    out['arm' + S] = tube(A, T, s, arm, M.skin, {
      n: 18, sub: 2, paint: skinPaint, variants: V['arm' + S],
      bumps: [{ t: o, y: -.025, at: 1.0, ay: .06, a: .013 * mu }, { t: o * .5, y: -.05, at: .5, ay: .05, a: .006 * mu }, { t: 0, y: -.17, at: .6, ay: .06, a: .008 * mu },
        { t: Math.PI, y: -.13, at: .7, ay: .08, a: .011 * mu }, { t: -o * .9, y: -.2, at: .4, ay: .1, a: -.004 }],
      keys: [{ y: -.365, w: .04 * mu, d: .043 * mu }, { y: -.3, w: .042 * mu, d: .046 * mu }, { y: -.2, w: .047 * mu, d: .052 * mu, cx: side * .002 },
        { y: -.1, w: .054 * mu, d: .057 * mu, cx: side * .004 }, { y: -.03, w: .06 * mu, d: .06 * mu, cx: side * .004 }, { y: .012, w: .057 * mu, d: .057 * mu, cx: -side * .004 }, { y: .032, w: .046, d: .05, cx: -side * .014 }, { y: .047, w: .03, d: .036, cx: -side * .022 }, { y: .056, w: .012, d: .016, cx: -side * .028 }].map((q) => ({ ...q, cx: (q.cx || 0) - side * ai * clamp((q.y + .25) / .3, 0, 1) }))
    });
    // FOREARM: the elbow point behind, the flexor and brachioradialis mass high, tapering to a flat wrist
    out['fore' + S] = tube(A, T, s, el, M.skin, {
      n: 18, sub: 2, paint: skinPaint, field: B.foreField, variants: V['fore' + S],
      bumps: [{ t: Math.PI, y: .005, at: .38, ay: .022, a: .02 }, { t: Math.PI + side * .5, y: -.02, at: .3, ay: .02, a: .006 }, { t: o * .55, y: -.075, at: .62, ay: .055, a: .019 * mu }, { t: -o * .5, y: -.095, at: .62, ay: .06, a: .012 * mu }, { t: 0, y: -.085, at: .3, ay: .05, a: .006 * mu },
        { t: 0, y: -.28, at: .3, ay: .03, a: .003 }],
      keys: [{ y: -.322, w: .032 * mu, d: .02 }, { y: -.29, w: .031 * mu, d: .021 }, { y: -.22, w: .036 * mu, d: .028 * mu }, { y: -.14, w: .046 * mu, d: .039 * mu },
        { y: -.07, w: .053 * mu, d: .047 * mu }, { y: -.01, w: .05 * mu, d: .05 * mu, cz: -.005 }, { y: .04, w: .04, d: .04, cz: -.008 }]
    });
    // HAND: palm, knuckles, four fingers in three joints curling forward, the thumb; nails at the tips
    const hw = B.hand;
    out['palm' + S] = tube(A, T, s, el, M.skin, {
      n: 16, sub: 2, field: B.palmField, paint: [{ m: M.skinDark, f: (t, y) => y < -.39 && Math.cos(t) < -.2 }],
      bumps: [{ t: 0, y: -.395, at: 1.1, ay: .008, a: .004 }, { t: o, y: -.35, at: .5, ay: .03, a: .006 }],
      keys: [{ y: -.405, w: .043 * hw, d: .017, cz: .006, p: 2.6 }, { y: -.37, w: .047 * hw, d: .021, cz: .004, p: 2.6 }, { y: -.335, w: .041 * hw, d: .022, p: 2.4 }, { y: -.3, w: .032, d: .021 }]
    });
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * .0235 * hw, L = [.85, 1, .97, .78][f] * B.finger, curl = B.curl, r = .0095 * hw;
      const p0 = [x, -.4, .006], p1 = [x * 1.04, -.4 - .042 * L, .008 + .01 * curl], p2 = [x * 1.06, -.4 - .072 * L, .022 + .03 * curl], p3 = [x * 1.06, -.4 - .09 * L, .04 + .05 * curl];
      cord(A, T, s, el, M.skin, [p0, p1, p2, p3], [r * 1.05, r * .95, r * .85, r * .72], 5);
      (out['tips' + S] ||= []).push({ p: p3, d: [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]], r });
      if (B.nails) blob(A, T, s, el, M.nail, { p: new T.Vector3(p3[0], p3[1] + .004, p3[2] - .002), n: new T.Vector3(0, -.3, -1).normalize() }, .013 * hw, .012, .004, 0, -.003);
      cord(A, T, s, el, M.skinDark, [[x, -.33, -.016], [x * 1.02, -.37, -.019], [x * 1.04, -.4, -.012]], [.003, .0035, .003], 4); // the tendons on the back of the hand
    }
    out['thumb' + S] = { p: [side * .04 * hw, -.405, .06], d: [-side * .01, -.025, .015] };
    cord(A, T, s, el, M.skin, [[side * .028 * hw, -.315, .01], [side * .046 * hw, -.35, .026], [side * .05 * hw, -.38, .045], [side * .04 * hw, -.405, .06]], [.013, .011, .009, .0075], 7);
    // THIGH (leg): built as the trouser leg (a section can swap its material): quadriceps, the teardrop over the
    // knee inside, hamstrings, adductors; rounded at the knee
    const inn = -side * Math.PI / 2;
    out['thigh' + S] = tube(A, T, s, leg, B.thighMat || M.cloth, {
      n: 20, sub: 2, paint: B.thighPaint, vpaint: B.thighVPaint,
      bumps: [{ t: 0, y: -.14, at: .6, ay: .12, a: .011 * mu }, { t: inn * .6, y: -.31, at: .35, ay: .04, a: .009 }, { t: -inn, y: -.17, at: .5, ay: .12, a: .006 },
        { t: Math.PI, y: -.15, at: .7, ay: .12, a: .01 }, { t: inn, y: -.03, at: .45, ay: .08, a: .008 }],
      field: B.clothField ? (t, y, x, z) => B.clothField(t, y, x, z, 2 + side) : null,
      keys: [{ y: -.425, w: .056, d: .06, cz: .004 }, { y: -.38, w: .064, d: .07, cz: .006 }, { y: -.3, w: .075 * mu, d: .082 * mu, cz: .004 }, { y: -.18, w: .088 * mu, d: .097 * mu },
        { y: -.06, w: .1 * mu, d: .108 * mu, cz: -.004 }, { y: .03, w: .096, d: .108, cz: -.008 }, ...(B.thighCut ? [{ y: .062, w: .084, d: .094, cz: -.008 }, { y: .078, w: .05, d: .058, cz: -.008 }] : [{ y: .11, w: .085, d: .095, cz: -.008 }]),
        ...(B.thighDome ? [{ y: .12, w: .066, d: .074, cz: -.008 }, { y: .131, w: .04, d: .046, cz: -.008 }] : [])]
        // s29 B.thighK (bomber): heavy thighs, fullest at the top, back to the knee's own size
        .map((q) => B.thighK ? { ...q, w: q.w * (1 + (B.thighK - 1) * clamp((q.y + (B.thighLow || .36)) / .3, 0, 1)), d: q.d * (1 + (B.thighK - 1) * .8 * clamp((q.y + (B.thighLow || .36)) / .3, 0, 1)) } : q)
        // s24 B.kneeIn (screamer): the thigh drawn in toward the knee (closes the gap between her knees)
        .map((q) => B.kneeIn ? { ...q, cx: (q.cx || 0) - side * B.kneeIn * clamp((-.12 - q.y) / .3, 0, 1) } : q)
    });
    // SHIN: the kneecap and its tendon, the calf behind, the tibia's front edge, the ankle; down into the boot
    out['shin' + S] = tube(A, T, s, shin, M.skin, {
      n: 18, sub: 2, paint: B.shinVPaint ? [] : [...(B.shinPaint || []), ...skinPaint], vpaint: B.shinVPaint,
      bumps: [{ t: 0, y: -.005, at: .45, ay: .03, a: .012 }, { t: 0, y: -.06, at: .2, ay: .025, a: .004 }, { t: Math.PI - side * .35, y: -.11, at: .45, ay: .06, a: .013 * mu },
        { t: Math.PI + side * .4, y: -.13, at: .4, ay: .06, a: .01 * mu }, { t: 0, y: -.18, at: .14, ay: .12, a: .004 }, { t: o, y: -.335, at: .35, ay: .015, a: .005 }, { t: inn, y: -.33, at: .35, ay: .015, a: .006 }],
      keys: [{ y: -.375, w: .036, d: .04, cz: .004 }, { y: -.34, w: .034, d: .038, cz: .004 }, { y: -.28, w: .037, d: .041, cz: -.002 }, { y: -.2, w: .047 * mu, d: .054 * mu, cz: -.006 },
        { y: -.12, w: .056 * mu, d: .066 * mu, cz: -.008 }, { y: -.05, w: .055, d: .062, cz: -.002 }, { y: .005, w: .06, d: .064, cz: .008 }, { y: .055, w: .054, d: .058, cz: .004 }]
        // s24 B.shinK / B.kneeIn (screamer): a fuller calf and shin (her legs leaked aims to the ground between them), the
        // top of the shin drawn in under the knee and back out to the ankle (feet unchanged)
        .map((q) => ({ ...q, ...(B.shinK && q.y > -.3 && q.y < -.02 ? { w: q.w * (1 + (B.shinK - 1) * clamp((q.y + .3) / .12, 0, 1)), d: q.d * (1 + (B.shinK - 1) * clamp((q.y + .3) / .12, 0, 1)) } : {}), cx: (q.cx || 0) - side * (B.kneeIn || 0) * clamp((q.y + .3) / .3, 0, 1) }))
    });
    void lx; void tY;
  }
  // limb roles for the game (the animation and gore code look these up)
  armLG.userData.upper = out.armL.meshes[0]; u.armRG.userData.upper = out.armR.meshes[0];
  legLG.userData.thigh = out.thighL.meshes[0]; u.legRG.userData.thigh = out.thighR.meshes[0];
  torso.userData.bodyMat = M.skin;
  return out;
}

// A boot on the shin bone: shaft (a shell with a rim over the ankle), the foot loft along z, a sole, the toe cap and laces.
// Colours stay the concept's leather 0x594834 and sole 0x27251f: prepareShamblerFeet moves those to the ankle bone.
function boot(A, T, s, shin, M, side, o = {}) {
  const lean = side * .004;
  tube(A, T, s, shin, M.leather, { n: 16, sub: 1, keys: [{ y: -.365, w: .05, d: .058, cz: .012 }, { y: -.3, w: .049, d: .055, cz: .004 }, { y: -.25, w: .051, d: .056 }, { y: -.215, w: .053, d: .058 }],
    bumps: [{ t: 0, y: -.26, at: .3, ay: .03, a: .004 }], capBulge: [0, .004] });
  // the shaft's rolled top: its thickness
  cord(A, T, s, shin, M.leather, Array.from({ length: 11 }, (_, i) => { const a = i / 10 * TAU; return [Math.sin(a) * .054, -.215, Math.cos(a) * .059]; }), [.006], 6);
  // CC-355 (t93): a rocker: heel and toe lifted off the ground line so a pitched foot mid-stride doesn't dig in
  const k = [{ y: -.075, w: .036, d: .028, cz: -.382 }, { y: -.06, w: .05, d: .042, cz: -.373 }, { y: -.02, w: .055, d: .048, cz: -.372 }, { y: .04, w: .057, d: .044, cz: -.379 },
    { y: .1, w: .061, d: .034, cz: -.388 }, { y: .15, w: .057, d: .028, cz: -.388 }, { y: .185, w: .045, d: .022, cz: -.39 }, { y: .2, w: .028, d: .014, cz: -.392 }];
  tube(A, T, s, shin, M.leather, { axis: 'z', n: 14, sub: 2, keys: k.map((q) => ({ ...q, cx: lean, p: 2.4 })), bumps: [{ t: Math.PI, y: .05, at: .9, ay: .2, a: -.004 }], capBulge: [.004, .004] });
  // the sole: a flat, slightly wider slab with its heel
  tube(A, T, s, shin, M.sole, { axis: 'z', n: 12, sub: 1, capBulge: [0, 0], keys: [{ y: -.082, w: .042, d: .007, cz: -.402, p: 4 }, { y: -.06, w: .055, d: .0075, cz: -.406, p: 4 },
    { y: .1, w: .064, d: .0065, cz: -.41, p: 4 }, { y: .19, w: .05, d: .006, cz: -.405, p: 4 }, { y: .207, w: .03, d: .005, cz: -.402, p: 4 }].map((q) => ({ ...q, cx: lean })) });
  // laces across the tongue
  for (let j = 0; j < 3; j++) { const y = -.24 - j * .036, z = .055 + (j > 1 ? .01 * (j - 1) : 0), e = j > 1 ? .006 : 0; const mid = (a, b) => (e ? [a, [0, y - .006, z + .002], b] : [a, b]); cord(A, T, s, shin, M.sole, mid([-.022, y, z - e], [.022, y - .012, z + .004 - e]), [.0028], 4); cord(A, T, s, shin, M.sole, mid([.022, y, z - e], [-.022, y - .012, z + .004 - e]), [.0028], 4); }   // J159 (D-191): the lowest pair bends over the tongue (it stood 6 mm off)
  // CC-355 (zombie-seating): the toe scuff patch is gone: it lay wholly inside the boot (39/39), never seen
  void o;
}

// A wound with depth on a tube's carved hollow: the dark wet core, torn flesh round it, a ragged dark edge with a few lifted
// skin flaps, strings of tissue across. Everything is tagged with the wound's bit.
function woundDetail(A, T, s, p, tb, t0, y0, w, h, M, bit, o = {}) {
  const tag = { kind: 'wound', bit }, c = tb.at(t0, y0);
  blob(A, T, s, p, M.deep, c, w * .42, h * .42, .01, o.spin || 0, -.004, tag);
  // the torn rim: lifted flaps of skin round the hole, each bent in toward it
  const flaps = o.flaps ?? 7;
  for (let i = 0; i < flaps; i++) {
    const a = i / flaps * TAU + (o.spin || 0), k = 1 + .25 * Math.sin(i * 2.7 + 1.1), du = Math.cos(a) * w * .5 * k, dv = Math.sin(a) * h * .5 * k;
    const R = (c.p.length() || 1), t1 = t0 + du / Math.max(.03, Math.hypot(c.p.x, c.p.z) || R), h1 = tb.at(t1, y0 + dv), h2 = tb.at(t0 + (t1 - t0) * .62, y0 + dv * .62);
    cord(A, T, s, p, M.edge, [h1.p.clone().addScaledVector(h1.n, .0025).toArray(), h2.p.clone().addScaledVector(h2.n, .001).toArray()], [.0042, .0016], 4, tag);
  }
  for (let i = 0; i < (o.strings ?? 2); i++) {
    const a = i * 2.4 + .6, du = Math.cos(a) * w * .38, dv = Math.sin(a) * h * .38, rr = Math.max(.03, Math.hypot(c.p.x, c.p.z));
    const h1 = tb.at(t0 + du / rr, y0 + dv), h2 = tb.at(t0 - du / rr * .6, y0 - dv * .6);
    cord(A, T, s, p, M.flesh, [h1.p.toArray(), c.p.clone().addScaledVector(c.n, -.006).toArray(), h2.p.toArray()], [.0022, .0016, .0022], 4, tag);
  }
}
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// s22: the same carved wound with its rings as per-vertex paint (soft edges that follow the ragged field, no steps)
function woundVariantV(bit, t0, y0, at, ay, depth, M, seed) {
  const W0 = woundVariant(bit, t0, y0, at, ay, depth, M, seed), b = { t: t0, y: y0, at, ay }, w = (t, y) => bw(b, t, y), rag = (t, y) => .12 * (noise3(t * 6, y * 60, 1, seed) - .5);
  return { ...W0, paint: [], vpaint: [{ m: M.bruise, w: (t, y) => .85 * sstep(.03, .14, w(t, y) + rag(t, y) * 2) }, { m: M.edge, w: (t, y) => sstep(.17, .28, w(t, y) + rag(t, y)) },
    { m: M.flesh, w: (t, y) => sstep(.33, .45, w(t, y) + rag(t, y)) }, { m: M.deep, w: (t, y) => sstep(.56, .7, w(t, y) + rag(t, y)) }] };
}
// a carved wound: the hollow, its painted rings (core, flesh, dark torn edge, bruised halo) as a tube variant
function woundVariant(bit, t0, y0, at, ay, depth, M, seed) {
  const b = { t: t0, y: y0, at, ay }, w = (t, y) => bw(b, t, y), rag = (t, y) => .12 * (noise3(t * 6, y * 60, 1, seed) - .5);
  return { bit, region: (t, y) => w(t, y) > .02, bumps: [{ ...b, a: -depth }, { t: t0, y: y0, at: at * 1.5, ay: ay * 1.5, a: depth * .18 }],
    paint: [{ m: M.deep, f: (t, y) => w(t, y) + rag(t, y) > .62 }, { m: M.flesh, f: (t, y) => w(t, y) + rag(t, y) > .38 }, { m: M.edge, f: (t, y) => w(t, y) + rag(t, y) > .22 },
      { m: M.bruise, f: (t, y) => w(t, y) + rag(t, y) * 2 > .07 }] };
}

// ---- the humanoid head --------------------------------------------------------------------------------------------------
// One carved skull-and-face loft on the head bone: sockets sunk under a heavy brow (the eyes glow from inside them), high
// cheekbones over hollow cheeks, a rotten nose, the jaw hanging open on a dark gape with lips drawn back off real teeth,
// ears, hair as a shell that breaks the scalp in ragged patches. Its width / depth / jaw / teeth use GP-20146's look
// record fields (headWidth, headDepth, jawWidth, teethMask) so the dropped skull matches.
function humanHead(A, T, g, s, H, M, seed) {
  const u = g.userData, head = u.head, w = H.w, D = H.depth, J = H.jaw, gp = H.gape;
  const sock = [-1, 1].map((k) => ({ t: k * .42, y: .04, at: .23, ay: .025 })), mouth = { t: 0, y: -.083 - gp * .5, at: .45, ay: .011 + gp * .42 };
  const bumps = [
    ...sock.map((b) => ({ ...b, a: -.034 * H.sunk })),
    ...[-1, 1].flatMap((k) => [{ t: k * .27, y: .064, at: .2, ay: .011, a: .013 * H.brow }, { t: k * .56, y: .079, at: .22, ay: .012, a: .011 * H.brow }, { t: k * 1.12, y: .07, at: .26, ay: .04, a: -.011 },
      { t: k * .78, y: -.004, at: .22, ay: .017, a: .011 }, { t: k * .66, y: -.058, at: .25, ay: .028, a: -.015 * H.hollow },
      { t: k * 1.1, y: -.105 - gp * .55, at: .25, ay: .03, a: .007 }, { t: k * .52, y: .015, at: .12, ay: .02, a: -.006 }]),
    { t: 0, y: .06, at: .1, ay: .014, a: .004 * H.brow }, { t: 0, y: .085, at: .05, ay: .02, a: -.003 }, { t: 0, y: .022, at: .085, ay: .028, a: .012 }, { t: 0, y: -.018, at: .1, ay: .014, a: .022 * (1 - H.nose) },
    { t: 0, y: -.032, at: .075, ay: .011, a: -.008 * H.nose }, { ...mouth, a: -.034 }, { t: 0, y: -.066, at: .36, ay: .006, a: .0035 },
    { t: 0, y: -.13 - gp, at: .3, ay: .016, a: .008 }, { t: Math.PI, y: .05, at: .8, ay: .06, a: .008 }];
  // the jaw rings drop with the gape; the lower face is drawn up (x.82) so the chin stays inside the headshot core
  // (game/zombie-headshots.js headCore: head-local y >= -.18): a hit on the jaw still counts as the head
  // CC-355 t222: the crown is drawn down (x.78 above y .1) so the skull and its hair stay inside the headshot core's top
  // (headCore y <= .21): a round or the reticle on the crown counts as the head, as on the old heads
  const Rt = (y) => y > .1 ? .1 + (y - .1) * (H.top ?? .78) : y;
  const R = (y, k) => y < -.07 ? -.07 + (y + .07) * (y > -.165 ? .82 : 1) - gp * clamp((-.07 - y) / .04, 0, 1) : y;
  const keys = [[-.2, .3, .045, -.02], [-.17, .4 * J, .06, 0], [-.153, .5 * J, .085, .026], [-.13, .62 * J, .1, .02], [-.095, .78 * J, .112, .004], [-.075, .84, .118, -.004], [-.06, .88, .122, -.01],
    [-.02, .95, .128, -.02], [.012, .98, .131, -.024], [.026, .99, .132, -.026], [.04, 1, .134, -.028], [.052, 1, .136, -.029], [.066, 1, .137, -.03], [.1, .99, .14, -.034], [.155, .9, .13, -.04], [.198, .66, .1, -.045], [.222, .3, .05, -.045], ...(H.crown ? [[.232, .12, .02, -.045]] : [])]
    .map(([y, ww, d, cz]) => ({ y: R(Rt(y * H.h)), w: ww * w, d: d * D, cz, p: y > -.08 && y < .15 ? 2.25 : 2 }));
  const socketW = (t, y) => Math.max(bw(sock[0], t, y), bw(sock[1], t, y)), mouthW = (t, y) => bw(mouth, t, y);
  const eyeE = (x, y, k) => Math.hypot((Math.abs(x) - .06) / (.029 * k), (y - .04 + .008 * (Math.abs(x) - .06) / .03) / (.019 * k));
  const mouthE = (x, y, k) => Math.hypot(x / (.047 * k), (y + .083 + gp * .5) / ((.011 + gp * .42) * k));
  const tag = (bit) => H.wounds[bit];
  // s24 H.jawPiece (screamer; ChatGPT's jaw contract (a), 16 Nov): game/screamer-appearance.js hangs every head surface in
  // the flat colours b4a592 / 664036 / c7bd9f on her jaw joint (hinge head-local (0, -.10, .06)) and swings it -.08..+.36
  // rad with the scream. The loft below a seam is that piece: the seam runs through the middle of the gape at the front,
  // rises to the hinge's height where the cheek passes the hinge (theta ~ +-1.03: zero travel there) and goes round the
  // back at that height. Its triangles are painted flat jaw skin, the lower half of the gape and the lower lip flat jaw
  // lip, the lower teeth (and the tongue bed) jaw teeth / lip, so the pass moves exactly the lower jaw. Static dark cheek
  // walls and a skin band inside the seam back the gap it opens. The face fades to the jaw's shade at the seam (the pass
  // greys both by luminance, so a mismatch there would draw a mask line).
  // (v2: the seam runs along the bottom of the gape, just above the lower teeth, so the dark recess keeps its smooth
  // per-vertex shading on the skull and the jaw carries only a thin lip rim, the lower teeth and the chin)
  const JP = !!H.jawPiece, yM = -.083 - gp * .5 - (.011 + gp * .42) * .82;
  const seamY = (t) => { const a = Math.abs(angd(t, 0)); return a <= .38 ? yM : a >= 1.03 ? -.1 : yM + (-.1 - yM) * sstep(.38, 1.03, a); };
  const JM = JP ? { skin: A.mat(0xb4a592, false, 0, 'skin'), lip: A.mat(0x664036, false, 0, 'wet'), teeth: A.mat(0xc7bd9f, false, 0, 'bone') } : null;
  const jawPaint = JP ? [{ m: JM.lip, f: (t, y, x) => y < seamY(t) && Math.cos(t) > .5 && mouthE(x, y, 1.13) < 1 }, { m: JM.skin, f: (t, y) => y < seamY(t) }] : [];
  const jawMatch = JP ? { color: new T.Color(0xb4a593) } : null;   // one step off the jaw's colour: the pass must not take it
  const variants = [];
  const vc = !!H.vcol, WV = vc ? woundVariantV : woundVariant;
  if (tag(8)) { const c = H.cheek; variants.push(WV(8, c.side * .62, -.07, .13, .02, .016, M, seed + 5)); }
  if (tag(16)) { const p = { ...H.scalp, y: Rt(H.scalp.y) }, sb = { t: p.t, y: p.y, at: .26, ay: .014 }, rg = (t, y) => .15 * (noise3(t * 9, y * 90, 3, seed) - .5); variants.push(vc ? { ...woundVariantV(16, p.t, p.y, .26, .014, .006, M, seed + 6), vpaint: [{ m: M.edge, w: (t, y) => sstep(.3, .44, bw(sb, t, y) + rg(t, y)) }, { m: M.bone, w: (t, y) => sstep(.52, .66, bw(sb, t, y) + rg(t, y)) }] }
    : { ...woundVariant(16, p.t, p.y, .26, .014, .006, M, seed + 6), paint: [{ m: M.bone, f: (t, y) => bw(sb, t, y) + rg(t, y) > .6 }, { m: M.edge, f: (t, y) => bw(sb, t, y) + rg(t, y) > .38 }] }); }
  if (tag(32)) { const k = H.lipSide; variants.push({ bit: 32, region: (t, y) => Math.abs(angd(t, k * .2)) < .3 && y < -.07 - gp * .5 && y > -.16 - gp, bumps: [{ t: k * .2, y: -.1 - gp, at: .2, ay: .012, a: -.006 }],
    ...(vc ? { paint: [], vpaint: [{ m: M.edge, w: (t, y) => (1 - sstep(.12, .24, Math.abs(angd(t, k * .2)))) * (1 - sstep(.004, .013, Math.abs(y - (-.103 - gp)))) }] }
      : { paint: [{ m: M.edge, f: (t, y) => Math.abs(angd(t, k * .2)) < .2 && Math.abs(y - (-.103 - gp)) < .01 }] }) }); }
  // H.feather (drowned, feral): a finer face loft and soft rings between the socket/lid/mouth shades and the skin, so the
  // painted patches read round and feathered at close range instead of as stepped boxes
  const fe = !!H.feather, shade = (to, k) => { const m = A.mat(M.skin.color.clone().lerp(to.color, k).getHex(), false, 0, 'skin'); m.userData.zombieColorRole = 'skin'; m.userData.zombieColorBase = M.skinMid.userData?.zombieColorBase ?? M.skin.color.getHex(); return m; };
  const soft = fe ? [{ m: shade(M.lid, .55), f: (t, y, x) => Math.cos(t) > .5 && eyeE(x, y, 1.62) < 1 }, { m: shade(M.lid, .25), f: (t, y, x) => Math.cos(t) > .5 && eyeE(x, y, 1.9) < 1 }] : [];
  // s22 H.vcol (feral, drowned): the face's shades as per-vertex paint over the loft (sockets, lids, mouth and gums, the
  // dark round the mouth, decay mottling), each a smooth field gated to the face: no triangle steps, no boxes
  const front = (t) => sstep(.35, .62, Math.cos(t));
  const facePaint = [
    { m: M.decay, w: (t, y, x, z) => .9 * sstep(.62, .8, fbm(x * 16 + 5, y * 16, z * 16, seed)) },
    { m: M.skinDark, w: (t, y) => .8 * sstep(.14, .42, mouthW(t, y)) },
    ...(JP ? [{ m: jawMatch, w: (t, y) => y < seamY(t) ? 0 : .95 * (1 - sstep(0, .04, y - seamY(t))) }] : []),
    { m: shade(M.lid, .5), w: (t, y, x) => front(t) * (1 - sstep(1.2, 2.3, eyeE(x, y, 1))) },
    { m: M.lid, w: (t, y, x) => front(t) * (1 - sstep(1.1, 1.75, eyeE(x, y, 1))) },
    { m: M.socket, w: (t, y, x) => front(t) * (1 - sstep(.95, 1.42, eyeE(x, y, 1))) },
    { m: M.gum, w: (t, y, x) => .8 * front(t) * (1 - sstep(1.0, 1.28, mouthE(x, y, 1.13))) },
    { m: M.mouth, w: (t, y, x) => front(t) * (1 - sstep(.95, 1.3, mouthE(x, y, 1))) }];
  const hd = tube(A, T, s, head, M.skin, {
    n: vc ? (H.faceN || (fe ? 40 : 48)) : fe ? 40 : 36, sub: 3, warp: .7, bumps, variants, tag: { kind: 'cranium' }, ...(vc ? { vpaint: facePaint } : {}),
    paint: vc ? jawPaint : [...jawPaint, { m: M.socket, f: (t, y, x) => Math.cos(t) > .5 && eyeE(x, y, fe ? .92 : 1) < 1 }, { m: M.mouth, f: (t, y, x) => Math.cos(t) > .5 && mouthE(x, y, 1) < 1 }, { m: M.gum, f: (t, y, x) => Math.cos(t) > .5 && mouthE(x, y, 1.13) < 1 },
      { m: M.lid, f: (t, y, x) => Math.cos(t) > .5 && eyeE(x, y, fe ? 1.3 : 1.35) < 1 }, { m: M.skinDark, f: (t, y, x, z) => mouthW(t, y) > (fe ? .2 : .12) || (!fe && y < -.12 - gp && fbm(x * 30, y * 30, z * 30, seed) > .5) },
      ...soft, { m: M.decay, f: (t, y, x, z) => fbm(x * 16 + 5, y * 16, z * 16, seed) > .7 }],
    keys
  });
  // the eyes, re-seated deep in the sockets: their glow framed by the dark of the socket reads at fighting distance
  for (const eye of u.eyes || []) {
    const side = Math.sign(eye.position.x) || 1, so = hd.at(side * .42, .04);
    eye.position.copy(so.p.clone().addScaledVector(so.n, -.004)).multiplyScalar(s); eye.scale.set(...(H.eyeScale || [.6, .42, .3]));
  }
  // heavy lids sagging over them: the menace (half-closed and low)
  for (const side of [-1, 1]) {
    cord(A, T, s, head, M.skin, onTube(hd, [[side * .26, .047], [side * .42, .056], [side * .6, .055]], -.003), [.006, .0095, .006], 6);
  }
  // teeth: 10 upper on the lip line, 8 lower on the dropped jaw; each its own mesh tagged with its slot (missing = hidden)
  const tooth = (t, y, h, up, slot, dark) => {
    const fang = H.fangs && [1, 2, 7, 8, 11, 16].includes(slot); if (H.fangs) h *= fang ? 1.7 : 1.25;
    const tip = H.fangs ? .0012 : .0042, at = hd.at(t, y), o = A.put(head, up ? new T.CylinderGeometry(tip * s, .0058 * s, h * s, 5, 1) : new T.CylinderGeometry(.0058 * s, tip * s, h * s, 5, 1), JP && !up ? JM.teeth : dark ? M.toothDark : M.teeth);
    const N = at.n.clone(); o.position.copy(at.p.clone().addScaledVector(N, -.0045).add(new T.Vector3(0, up ? -h * .45 : h * .45, 0))).multiplyScalar(s);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, up ? 1 : -1, 0).addScaledVector(N, up ? -.15 : .15).normalize());
    o.rotateY(slot * 1.7); o.scale.set(1, 1, .75); o.userData.cc355 = true; o.userData.zombieFeature = { kind: 'tooth', slot };
  };
  for (let k = 0; k < 10; k++) if (H.teeth[k]) tooth((k - 4.5) * .066, -.071, .02 + (k % 4 === 1 ? .006 : 0) + (k === 4 || k === 5 ? .003 : 0), true, k, k % 3 === 2);
  for (let k = 0; k < 8; k++) if (H.lowerTeeth[k]) tooth((k - 3.5) * .07, -.096 - gp * .95, .016 + (k % 3 === 0 ? .004 : 0), false, 10 + k, k % 3 === 1);
  // the gape: a dark recess filling the carved mouth, a tongue lying in its floor
  blob(A, T, s, head, M.mouth, hd.at(0, -.083 - gp * .5), .17, .02 + gp * .9, .04, 0, -.02);
  // CC-355 (zombie-seating): the tongue rests on the floor of the gape, its top showing (it was buried in the head, 36/39)
  // s22 vcol: the face loft is one closed surface (no paint holes), so the tongue sits ON the gape floor, smaller, its back
  // half in the dark recess (the lower teeth stay bared in front of it)
  if (vc) blob(A, T, s, head, JP ? JM.lip : M.tongue, hd.at(0, -.09 - gp * .7), .056, .028, .016, 0, H.tongueLift ?? .0005);
  else blob(A, T, s, head, M.tongue, hd.at(0, -.094 - gp * .75), .07, .035, .02, 0, H.tongueLift ?? -.005);
  if (JP) {
    // the gap's backing (static): a dark wall inside each cheek from the mouth corner to the hinge, and a skin band just
    // inside the seam round the back (closing to -.08 rad drops the jaw's back edge ~1.5 cm, opening lifts it under the skull)
    for (const side of [-1, 1]) for (const [a, w2] of [[.55, .05], [.8, .04]]) blob(A, T, s, head, M.socket, hd.at(side * a, seamY(a) - .006), w2, .04, .016, 0, -.019);
    blob(A, T, s, head, M.socket, hd.at(0, yM - .01), .1, .03, .02, 0, -.034);
    const pos = [], idx = [], nt = 30, ny = 4, t0 = .95, t1 = TAU - .95;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nt; i++) { const t = t0 + (t1 - t0) * i / nt, h = hd.at(t, seamY(t) - .032 + .058 * j / ny), q = h.p.addScaledVector(h.n, -.0045); pos.push(q.x * s, q.y * s, q.z * s); }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nt; i++) { const a = j * (nt + 1) + i, c = a + nt + 1; idx.push(a, a + 1, c, a + 1, c + 1, c); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    { const mid = (ny >> 1) * (nt + 1) + (nt >> 1), N = geo.getAttribute('normal'), out = hd.at(Math.PI, seamY(Math.PI)).n; if (N.getX(mid) * out.x + N.getY(mid) * out.y + N.getZ(mid) * out.z < 0) { for (let k = 0; k < idx.length; k += 3) { const x = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = x; } geo.setIndex(idx); geo.computeVertexNormals(); } }
    const band = A.put(head, geo, M.skinDark); band.userData.cc355 = true;
  }
  // the torn cheek: open to the molars
  if (tag(8)) {
    const c = H.cheek, t0 = c.side * .62, wt = { kind: 'wound', bit: 8 };
    // CC-355 (zombie-seating): the molars stand in the torn cheek's hollow (they were sunk in it, 32/40)
    for (let i = 0; i < 3; i++) blob(A, T, s, head, M.teeth, hd.at(t0 - c.side * (.05 - i * .045), -.074), .009, .011, .009, 0, H.molarLift ?? .0015, wt);
    woundDetail(A, T, s, head, hd, t0, -.07, .045, .03, M, 8, { flaps: 6, strings: 1 });
  }
  if (tag(16)) { const p = { ...H.scalp, y: Rt(H.scalp.y) }; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, q = hd.at(p.t + Math.cos(a) * .25, p.y + Math.sin(a) * .016); cord(A, T, s, head, M.edge, [q.p.clone().addScaledVector(q.n, .002).toArray(), hd.at(p.t + Math.cos(a) * .15, p.y + Math.sin(a) * .01).p.toArray()], [.004, .0015], 4, { kind: 'wound', bit: 16 }); } }
  // ears: a shell with its rim and a dark hollow, lower than the eyes; a lost ear leaves a torn hole
  for (const side of [-1, 1]) {
    const es = H.ears[side < 0 ? 0 : 1], ep = hd.at(side * 1.62, -.005);
    if (es > 0) {
      const N = ep.n.clone().add(new T.Vector3(0, 0, -.5)).normalize(), at = { p: ep.p.clone().addScaledVector(ep.n, .006), n: N };
      blob(A, T, s, head, M.skin, at, .034 * es, .062 * es, .022, 0, .004);
      blob(A, T, s, head, M.socket, at, .018 * es, .032 * es, .008, 0, .012);
      cord(A, T, s, head, M.skinDark, Array.from({ length: 8 }, (_, i) => { const a = -1.4 + i / 7 * 3.4; return at.p.clone().add(new T.Vector3(0, Math.sin(a) * .029 * es, -Math.cos(a) * .015 * es)).addScaledVector(N, .012).toArray(); }), [.0042], 5);
    } else { blob(A, T, s, head, M.deep, ep, .026, .036, .012, 0, -.004); blob(A, T, s, head, M.edge, ep, .036, .046, .008, 0, -.005); }
  }
  // hair: a shell over the scalp whose height follows a ragged noise field; where it falls under the scalp it vanishes,
  // so the bald patches have torn organic edges. Four regions, each tagged (a look's hairStyle hides some).
  if (H.hair > 0) {
    const hs = H.hairSeed, region = (t, y) => (y > Rt(.17) ? 0 : Math.abs(angd(t, Math.PI)) < 1.2 ? 3 : t > 0 && t < Math.PI ? 2 : 1);
    const height = (t, y) => { const q = hd.at(t, y).p, front = Math.cos(t), line = .13 + .05 * Math.max(0, front) - .1 * Math.max(0, -front);
      return (H.longHair ? .022 : .012) * (fbm(q.x * (H.longHair ? 15 : 22), q.y * (H.longHair ? 15 : 22), q.z * (H.longHair ? 15 : 22), hs) - (H.longHair ? .42 : .3)) / .7 * clamp((y - line) / .02, 0, 1) - .003 + .002 * noise3(q.x * 90, q.y * 25, q.z * 90, hs + 3); };
    // the shell starts above the brow at the front (its rows must never chord across the carved sockets)
    const hline = (t) => .13 + .05 * Math.max(0, Math.cos(t)) - .1 * Math.max(0, -Math.cos(t));   // hairTrim: no shell rows below the hairline (their edge drew a dark line down the cheek)
    shell(A, T, s, head, M.hair, hd, { lo: (t) => Math.max(.0 + .095 * Math.max(0, Math.cos(t)) ** 2, H.hairTrim ? hline(t) - .012 : -1), hi: () => Rt((H.crown ? .234 : .2225) * H.h), rows: 12, off: height, rimIn: 0, rim: [false, false], tagFor: (t, y) => ({ kind: 'hair', slot: region(t, y) }) });
    // a few long greasy strands lying down the back and the temples
    for (let i = 0; i < H.strands; i++) {
      const t0 = (hash3(i, hs, 3, 9) - .5) * (H.longHair ? (H.hairTrim ? 1.9 : 3.4) : 2) + Math.PI, y0 = Rt(.16 + .04 * hash3(i, 2, hs, 9)), ln = (H.longHair ? .16 + .14 * hash3(i, 5, hs, 1) : .08 + .07 * hash3(i, 5, hs, 1)) * (H.strandLength || 1);
      cord(A, T, s, head, M.hair, onTube(hd, [[t0, y0], [t0 + .05, y0 - ln * .35], [t0 + .03, y0 - ln * .7], [t0 + .01, y0 - ln]], .0035 + (H.longHair ? .004 : 0)), H.longHair ? [.006, .005, .004, .002] : [.0035, .003, .0025, .0018], 4, { kind: 'hair', slot: region(t0, y0) });
    }
  }
  head.userData.cc355CrownY = R(Rt((H.crown ? .232 : .222) * H.h)) * s;
  return hd;
}

// ---- s27 (J158 / D-190): the shared body's skeleton proportions ----------------------------------------------------------
// The chest's half-width (W scales it), and where the joints go for that body: the shoulder joint at the ribcage's
// top-outer corner (the upper arm then hangs against the ribs), ~23 cm under the head's centre (it was 16: the shoulder
// sat level with the neck), the hip joints ~10 cm either side of the middle (the pelvis is built around them), and the
// arms' rest roll small (hanging, not an A-pose). Per type HUMANOID.<type>.rig: { armY, roll, legX } override.
export function chestHalf(B) { return .158 * B.w; }
export function humanoidRig(k) {
  const P = HUMANOID[k]; if (!P) return null; const B = P.body, R = P.rig || {};
  return { armX: chestHalf(B) + .04 * B.muscle + (R.armOut || 0), armY: R.armY ?? .355, roll: R.roll ?? .07, legX: R.legX ?? .1, head: R.head ?? .76,
    // CC-359 (v5 shambler only): the elbow under the shoulder, the torso pivot (hips-local), the head pivot and the arms' z (torso-local)
    upper: R.upper ?? null, torsoY: R.torsoY ?? null, headAt: R.headAt ?? null, armZ: R.armZ ?? null };
}
// Called by applyZombieConcept BEFORE its cache (both paths: the template and every zombie built from it), after the
// concept's own spacing: for a LIVE humanoid type it puts the shoulders and hips where this body needs them (the bones,
// their names and their order are unchanged; only the arm and leg pivots' x, the arms' height and the rest roll move).
// The random shoulder drop of index.html (a shambler's one low shoulder) is kept: the height moves by a delta.
export function humanoidPivots(T, g, s, k) {
  if (!SECTIONS[k] || !LIVE.has(k)) return false;
  const u = g.userData, r = humanoidRig(k);
  for (const [arm, side] of [[u.armLG, -1], [u.armRG, 1]]) { arm.position.x = side * r.armX * s; arm.position.y += (r.armY - .42) * s; arm.rotation.z = side * r.roll; }
  for (const [leg, side] of [[u.legLG, -1], [u.legRG, 1]]) leg.position.x = side * r.legX * s;
  // CC-359 v5 (shambler): the torso turns at the waist (AG's pivot): the torso bone moves down, everything on it moves up by
  // the same amount (rest pose identical, only the bend changes); the elbow sits .295 under the shoulder (Director pick 1)
  if (r.torsoY != null) { const d = u.torso.position.y - r.torsoY * s; u.torso.position.y -= d; for (const c of u.torso.children) if (c !== u.armLG && c !== u.armRG && c !== u.head) c.position.y += d; }   // the arms (armY) and the head (headAt) are placed in the new frame
  if (r.upper != null) for (const arm of [u.armLG, u.armRG]) if (arm.userData.elbowG) arm.userData.elbowG.position.y = -r.upper * s;
  if (r.armZ != null) for (const arm of [u.armLG, u.armRG]) arm.position.z = r.armZ * s;
  // the head bone at the base of the neck (Director pick 2): its children (the eyes) keep their place on the body
  if (r.headAt) { const h = u.head, to = new T.Vector3(r.headAt[0] * s, r.headAt[1] * s, r.headAt[2] * s), d = h.position.clone().sub(to); h.position.copy(to); for (const c of h.children) c.position.add(d.clone().divideScalar(h.scale.x || 1)); h.userData.cc359NeckJoin = [-.05, .05, .11]; u.torso.userData.cc359ShoulderJoin = [-.20, .10, .22, .55]; }   // CC-362 (review): the shoulders' skin blend: [low, high, radius, fade start] (zombie-joins reads it: asked of its owner); radius .22 (was .15) and the radial fade from .55 (was .70) so it is wider than AG's ~5 cm back triangles (the tears)   // the neck's skin blend round the new pivot (combat/zombie-joins.js reads it: asked of its owner). CC-359 step 3: low -.05 (was -.10): it starts above the yoke's rim (1.39 m), which stays on the torso; at -.10 the head's counter-turn lifted the rim off the back (a ledge)
  // the head: it was ~5 heads tall (the skull .36 m crown to chin, .33 m wide with the ears: 1.6x the marine's); at .76 the
  // body is ~6.8 heads and the shoulders ~2 head-widths. The head bone carries it (its eyes, the screamer's jaw hinge).
  u.head.scale.setScalar(r.head);
  return true;
}

// ---- the types' parameters (defaults; a look record overrides any key) ---------------------------------------------------
export const HUMANOID = {
  shambler: {
    body: { w: 1, d: 1, chest: .8, belly: .7, ribs: .7, muscle: .92, hand: 1, finger: 1, curl: .7, nails: true, seed: 11 },
    wounds: { 1: true, 2: true, 4: true },                                // neck bite, right forearm bite, belly gash
    bite: { t: -.62, y: .505 }, armBite: { side: 1, t: 0, y: -.16 }, belly: { t: .3, y: .015 },
    shirtHem: [.055, .03], tears: [[.95, .17], [-1.3, .25], [-2.6, .12], [2.3, .1]],   // [theta, how high the rip runs]
    trouserHem: [-.18, -.06],                                              // left leg torn mid-calf, right just under the knee
    head: {
      w: .148, h: 1, depth: 1, jaw: 1, brow: 1.15, sunk: 1.1, hollow: 1, gape: .042, nose: .7,
      teeth: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1], lowerTeeth: [1, 0, 1, 1, 1, 1, 0, 1],
      wounds: { 8: true, 16: true, 32: true }, cheek: { side: 1 }, scalp: { t: .35, y: .195 }, lipSide: -1,
      hair: 1, hairSeed: 3, strands: 9, ears: [1, .6]
    },
    veins: 7, dirt: .55, wear: .5
  }
};

HUMANOID.feral = {
  body: { w: .8, d: .84, chest: .45, belly: -.6, ribs: 1.7, spine: 1, muscle: .92, hand: 1.05, finger: 1.18, curl: 1.15, nails: false, seed: 23, wrap: true, armIn: .075, thighCut: true },
  wounds: { 1: true, 2: true, 4: false }, bite: { t: .6, y: .5 }, armBite: { side: -1, t: 0, y: -.12 }, belly: { t: -.3, y: .03 },
  shortsHem: [-.2, -.14], scratches: [[-.35, .3], [.9, .18]],
  head: {
    w: .14, h: 1, depth: 1.02, jaw: .96, brow: 1.3, sunk: 1.15, hollow: 1.5, gape: .058, nose: .95, crown: true, eyeScale: [.78, .56, .3],
    teeth: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1], lowerTeeth: [1, 1, 1, 0, 1, 1, 1, 1], fangs: true,
    wounds: { 8: false, 16: true, 32: false }, cheek: { side: -1 }, scalp: { t: -.6, y: .19 }, lipSide: 1,
    hair: 1, hairSeed: 41, strands: 28, strandLength: .84, longHair: true, hairTrim: true, ears: [.75, 0], feather: true, vcol: true, tongueLift: .0025
  },
  veins: 9, dirt: .85, wear: .9
};

HUMANOID.military = {
  // v3: the shoulder wraps the arm's cap (wrap/armIn, as the feral's, with a soldier's trapezius) so the sleeve runs on from
  // the blouse's shoulder instead of sitting on it as a ball; fuller arms under the rolled sleeves
  body: { w: 1.17, d: 1.28, chest: 1.1, belly: .15, ribs: .2, muscle: 1.1, hand: 1.04, finger: 1, curl: .8, nails: true, seed: 37, wrap: true, armIn: .05, trap: 1 },
  wounds: { 1: true, 2: true, 4: false }, bite: { t: .7, y: .49 }, armBite: { side: -1, t: .4, y: -.15 }, belly: { t: .3, y: .015 },
  sleeve: [-.23, -.25], neckOpen: .045,
  head: {
    w: .15, h: 1, depth: 1, jaw: 1.06, brow: 1.55, sunk: 1.1, hollow: 1.35, gape: .062, nose: .9,
    teeth: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], lowerTeeth: [1, 1, 1, 1, 1, 1, 1, 1], eyeScale: [.7, .5, .3],
    wounds: { 8: true, 16: false, 32: false }, cheek: { side: 1 }, scalp: { t: .35, y: .195 }, lipSide: 1,
    hair: 0, hairSeed: 7, strands: 0, ears: [1, 1]
  },
  veins: 5, dirt: .45, wear: .35
};

HUMANOID.drowned = {
  // v2: bloated in the trunk (bloat: waist and flanks swollen, the chest sagging), the shoulders sloped over the arm's cap
  // (the feral's wrap and armIn: no square yoke)
  body: { w: 1.2, d: 1.24, chest: .3, belly: 2.6, ribs: 0, muscle: 1.16, hand: 1.14, finger: 1.15, curl: .55, nails: true, seed: 53, wrap: true, armIn: .055, bloat: 1 },
  wounds: { 1: true, 2: true, 4: false }, bite: { t: -.5, y: .5 }, armBite: { side: 1, t: .5, y: -.12 }, belly: { t: .3, y: .015 },
  trouserHem: [-.12, -.2],
  head: {
    w: .162, h: 1, depth: 1.05, jaw: 1.12, brow: .9, sunk: .9, hollow: -.7, gape: .048, nose: .55,
    teeth: [1, 0, 1, 1, 1, 1, 1, 0, 1, 1], lowerTeeth: [0, 1, 1, 1, 1, 1, 1, 0], eyeScale: [.66, .48, .3],
    wounds: { 8: true, 16: false, 32: true }, cheek: { side: 1 }, scalp: { t: .35, y: .195 }, lipSide: -1,
    hair: 1, hairSeed: 61, strands: 14, ears: [1, .8], tongueLift: -.0065, feather: true
  },
  veins: 4, dirt: .3, wear: .7
};

HUMANOID.screamer = {
  // s22 first build: the banshee. Tall, starved and narrow, a woman in a torn hospital shift, barefoot; the jaw unhinged
  // and hanging open to the throat (her scream), the neck's cords standing from the jaw to the collarbones, long wet hair
  // hanging over the face. (game/screamer-appearance.js greys her and hinges the tongue on its jaw group in the game.)
  body: { w: .8, d: .8, chest: .5, belly: -.55, ribs: 1.5, spine: .8, muscle: .8, hand: 1.02, finger: 1.24, curl: .95, nails: true, seed: 71, wrap: true, armIn: .07, shinK: 1.28, kneeIn: .028 },
  wounds: { 1: true, 2: false, 4: false }, bite: { t: .55, y: .5 }, armBite: { side: 1, t: 0, y: -.14 }, belly: { t: .3, y: .015 },
  shiftHem: [-.1, -.13], tears: [[.7, .1], [-2.4, .14], [2.9, .08]],
  head: {
    w: .136, h: 1.03, depth: .98, jaw: .88, brow: .75, sunk: 1.4, hollow: 1.8, gape: .085, nose: .85, eyeScale: [.66, .5, .3],
    teeth: [1, 1, 0, 1, 1, 1, 1, 0, 1, 1], lowerTeeth: [1, 1, 1, 0, 1, 1, 1, 1],
    wounds: { 8: false, 16: false, 32: true }, cheek: { side: 1 }, scalp: { t: .35, y: .195 }, lipSide: 1,
    hair: 1, hairSeed: 83, strands: 40, longHair: true, hairTrim: true, ears: [.85, .85], feather: true, vcol: true, jawPiece: true
  },
  veins: 6, dirt: .5, wear: .85
};

// s27 (J158): the per-type skeleton choices (see humanoidRig), each deliberate: the feral's longer reach comes from his
// hunch and his hands; the drowned's arms hang a little out over the bloated trunk; the screamer is a woman: narrow
// shoulders, a pelvis wider than her waist (hip)
HUMANOID.feral.rig = { legX: .104, roll: .09, head: .78 };
HUMANOID.military.rig = { legX: .106 };
// CC-359 v5 (Director 06:55Z: picks 1-4; torsoY asked in step 2): the bones where AG-357 pass 7 has them, in the game's own
// frames (AG hips-space + .025 m up, so AG's hip joints land on the game's at -.02 under the hips bone): torso pivot .110
// over the hips (was .28), shoulders .454 over it (+-.186 out, .01 back), elbow .295 under the shoulder (was .34), head bone
// at the neck base (.494 over the torso, .02 forward), head scale 1 (the skull at its true size), hips .103 out.
const SHAMBLER_V5_RIG = { legX: .103, armOut: .186 - (.158 + .04 * .92), armY: .454, armZ: -.01, roll: .07, upper: .295, torsoY: .110, headAt: [0, .494, .02], head: 1 };
let shamblerV5 = true;
try { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('shamblerV5') : null; if (q === '0') shamblerV5 = false; } catch { }
export function setShamblerV5(on) { shamblerV5 = !!on; HUMANOID.shambler.rig = shamblerV5 ? SHAMBLER_V5_RIG : undefined; }
setShamblerV5(shamblerV5);
HUMANOID.drowned.rig = { legX: .108, roll: .12 };
HUMANOID.screamer.rig = { legX: .096, head: .74 }; HUMANOID.screamer.body.hip = 1.04;

// s29 (J154 / D-190, review only): the BOMBER on the shared body. A heavy man swollen past his clothes: the gut (the
// bomb) hangs forward and down over his belt, the flanks roll out, the back and the nape are padded, a thick short neck,
// heavy thighs that meet at the crotch, fat arms that hang out over the gut's sides (they can't close on the ribs), a
// puffed face. The gut stays ONE mesh on its own material (u.pulseMats[0]: ChatGPT's game/bomber-*.js pulse, jiggle and
// trace veins on it) and one vein carrier on u.pulseMats[1]; the acid blisters ride his upper back.
HUMANOID.bomber = {
  body: { w: 1.46, d: 1.5, chest: .7, belly: 1.2, ribs: 0, muscle: 1.3, hand: 1.12, finger: 1.02, curl: .6, nails: true, seed: 97, wrap: true, trap: 2, bloat: 1, hip: 1.22, thighK: 1.5, thighLow: .47 },
  wounds: { 1: true, 2: false, 4: false }, bite: { t: -.6, y: .5 }, armBite: { side: 1, t: 0, y: -.14 }, belly: { t: .3, y: .015 },
  trouserHem: [-.2, -.16], vestHem: [.24, .03],
  head: {
    w: .166, h: .98, depth: 1.04, jaw: 1.2, brow: .85, sunk: .85, hollow: -1.4, gape: .03, nose: .75, eyeScale: [.6, .44, .3],
    teeth: [1, 0, 1, 1, 1, 1, 1, 0, 1, 1], lowerTeeth: [1, 1, 0, 1, 1, 1, 1, 1],
    wounds: { 8: false, 16: false, 32: true }, cheek: { side: 1 }, scalp: { t: .35, y: .195 }, lipSide: 1,
    hair: 1, hairSeed: 101, strands: 4, ears: [1, 1]
  },
  veins: 0, dirt: .5, wear: .7,
  fat: 1,   // s31 (J160): the FAT build, about halfway between the old concept and s29's A: a pear, the belly a low forward apron (0 = s30's body)
  gut: 'burst'   // s30 VARIANT B (review): the gut further forward and down, taut, traced veins and acid blisters on it ('about to burst'); 'heavy' = s29's A
};
// the arms hang out over the gut's flanks (roll .2, the joint 3 cm out); the hips a little wider for the thighs' bulk
HUMANOID.bomber.rig = { legX: .14, roll: .27, armOut: .045, head: .8 };   // s31: a wider stance under the apron, the arms pushed out by the trunk (s30: .115 / .2 / .03)

// ---- the sections --------------------------------------------------------------------------------------------------------
const SECTIONS = {
  // FERAL: starved and fast. Bare to the waist, ribs and spine through the skin, a pair of shorts cut from what were
  // trousers, bare clawed feet and hands, long matted hair, a snarl with every tooth bared, claw scratches across him.
  feral(A, T, g, s, P, M) {
    const u = g.userData, { hips, torso } = u, seed = P.body.seed, W = P.wounds, dirt = P.dirt;
    const V = {};
    if (W[1]) V.torso = [woundVariant(1, P.bite.t, P.bite.y, .34, .03, .02, M, seed + 1)];
    if (W[4]) (V.torso ||= []).push(woundVariant(4, P.belly.t, P.belly.y, .42, .011, .016, M, seed + 2));
    if (W[2]) { const k = 'fore' + (P.armBite.side < 0 ? 'L' : 'R'); V[k] = [woundVariant(2, P.armBite.t, P.armBite.y, .55, .028, .012, M, seed + 3)]; }
    // claw scratches: three parallel carved grooves, painted raw
    const scr = (t, y) => P.scratches.reduce((a, [t0, y0]) => { const dt = angd(t, t0), v = y - y0 + dt * .12; return Math.abs(dt) < .45 ? Math.max(a, ...[-1, 0, 1].map((k) => G((v - k * .018) / .0035))) : a; }, 0);
    const grime = (t, y, x, z) => sstep(1.05 - dirt * .5, 1.26 - dirt * .5, fbm(x * 10, y * 10, z * 10, seed + 9));
    const legGrime = [{ m: M.dirt, w: (t, y, x, z) => .66 * grime(t, y, x, z) }];
    const shinGrime = [{ m: M.dirt, w: (t, y, x, z) => .65 * sstep(-.10, .18, -.15 - y)
      * sstep(.62, .90, fbm(x * 15, y * 12, z * 15, seed + 9) + (-.15 - y) * 1.5) }];
    const B = body(A, T, g, s, { ...P.body, thighMat: M.skin, pelvisMat: M.cloth,
      thighPaint: [{ m: M.cloth, f: (t, y) => y > 0 }], thighVPaint: legGrime, shinVPaint: shinGrime,
      pelvisField: (t, y) => -.006 * Math.max(0, -Math.cos(t)) * G((y - .035) / .064),
      foreField: (t, y) => -.006 * G(angd(t, Math.PI) / .50) * G((y - .008) / .034),
      palmField: (t, y) => -.003 * G((y + .32) / .031) * (.45 + .55 * Math.abs(Math.sin(t))),
      torsoField: (t, y) => -.004 * scr(t, y), torsoVPaint: [{ m: M.flesh, w: (t, y) => .72 * scr(t, y) }] }, M, V);
    // the shorts: the seat is cloth (pelvis loft); a shell on each thigh with a ragged cut hem and threads
    for (const side of [-1, 1]) {
      const S = side < 0 ? 'L' : 'R', leg = side < 0 ? u.legLG : u.legRG, th = B['thigh' + S], h0 = P.shortsHem[side < 0 ? 0 : 1];
      const hem = (t) => h0 + .038 * (noise3(Math.cos(t) * 5, Math.sin(t) * 5, side, seed + 30) - .5) * 2
        + .062 * Math.max(0, Math.cos(t * 3 + side)) ** 4 + .029 * Math.max(0, Math.cos(t * 7 - side)) ** 6;
      shell(A, T, s, leg, M.cloth, th, { lo: hem, hi: () => .055, rows: 9, rim: [true, false], off: (t, y) => .0035 + .0022 * (1 - clamp((y - hem(t)) / .08, 0, 1)) ** 2 + .002 * noise3(t * 3, y * 30, side, seed), rimIn: .0025, rimMat: M.clothDark,
        paint: [{ m: M.clothDark, f: (t, y) => y < hem(t) + .025 }, { m: M.clothMid, f: (t, y, x, z) => fbm(x * 9, y * 9, z * 9, seed + 5) > .6 }] });
      // CC-355 (zombie-seating): the threads hang from the hem's edge down onto the thigh (they floated 2-4 mm off it)
      for (let i = 0; i < 6; i++) { const t = side * (i * 1.03 + .3), y = hem(t); cord(A, T, s, leg, M.clothDark, [[t, y + .004, .005], [t + .035, y - .014 - .009 * (i % 3), .0018]].map(([t1, y1, l]) => { const h = th.at(t1, y1); return h.p.addScaledVector(h.n, l).toArray(); }), [.0018, .0009], 3); }
      // a bare foot on the shin bone: heel, arch, the ball and five toes with dark claws (below the ankle cut)
      const shin = leg.userData.shinG;
      // The buried socket keeps the bare foot and shin seated at the existing ankle pivot.
      tube(A, T, s, shin, M.skin, { n: 14, sub: 1, caps: [false, false],
        keys: [{ y: -.338, w: .033, d: .039, cz: .004 }, { y: -.238, w: .032, d: .034, cz: .001 }] });
      tube(A, T, s, shin, M.skin, { axis: 'z', n: 14, sub: 2, paint: [{ m: M.dirt, f: (t, y) => Math.cos(t) < -.2 || y > .08 }],
        keys: [{ y: -.06, w: .032, d: .03, cz: -.385 }, { y: -.035, w: .04, d: .036, cz: -.378 }, { y: .01, w: .04, d: .035, cz: -.375 }, { y: .06, w: .046, d: .026, cz: -.392 },
          { y: .1, w: .05, d: .019, cz: -.4 }, { y: .118, w: .044, d: .014, cz: -.404 }].map((q) => ({ ...q, cx: side * .004 })), capBulge: [.004, .002] });
      for (let k = 0; k < 5; k++) {
        const x = side * (-.034 + k * .017) * (k === 0 ? 1.05 : 1), L = [.034, .03, .027, .023, .019][k], r = [.0085, .0065, .006, .0055, .005][k], z0 = .105 - k * .004;
        cord(A, T, s, shin, M.skin, [[x, -.402, z0], [x * 1.04, -.404, z0 + L * .55], [x * 1.06, -.41, z0 + L]], [r, r * .9, r * .75], 5);
        cord(A, T, s, shin, M.claw, [[x * 1.06, -.408, z0 + L - .003], [x * 1.07, -.412, z0 + L + .008], [x * 1.06, -.4165, z0 + L + .012]], [r * .7, r * .45, .001], 4);
      }
      // wiry: the flexor tendons standing at the wrist, the Achilles and the shin's edge under the skin
      const fo = B['fore' + S], sn = B['shin' + S];
      for (const dt of [-.32, 0, .3]) cord(A, T, s, (side < 0 ? u.armLG : u.armRG).userData.elbowG, M.skinMid, onTube(fo, [[dt, -.305], [dt * 1.1, -.24], [dt * 1.2, -.16]], -.0008), [.0026, .0034, .0016], 4);
      if (sn) { cord(A, T, s, shin, M.skinMid, onTube(sn, [[Math.PI, -.37], [Math.PI, -.3], [Math.PI, -.22]], -.001), [.0055, .0045, .003], 5);
        cord(A, T, s, shin, M.skinMid, onTube(sn, [[-side * .25, -.3], [-side * .2, -.15], [-side * .18, -.04]], -.0012), [.0028, .0034, .002], 4); }
      // claws: long dark horny nails off every fingertip and the thumb
      const el = (side < 0 ? u.armLG : u.armRG).userData.elbowG;
      for (const tp of [...B['tips' + S], B['thumb' + S]]) {
        const d = new T.Vector3(...tp.d).normalize(), tip = new T.Vector3(...tp.p), a0 = tip.clone().addScaledVector(d, -.003), a1 = tip.clone().addScaledVector(d, .020).add(new T.Vector3(0, -.004, .005)), a2 = tip.clone().addScaledVector(d, .035).add(new T.Vector3(0, -.011, .014));
        cord(A, T, s, el, M.claw, [a0.toArray(), a1.toArray(), a2.toArray()], [.0055, .0037, .0008], 5);
      }
    }
    // the bite and its veins; tendons standing in the neck
    const tb = B.torso, bite = P.bite;
    if (W[1]) {
      woundDetail(A, T, s, torso, tb, bite.t, bite.y, .065, .06, M, 1, { flaps: 8, strings: 3, spin: .4 });
      for (let i = 0; i < P.veins; i++) { const a = i * 2.4 + .3, t1 = bite.t + Math.cos(a) * .3, y1 = bite.y + Math.sin(a) * .04;
        cord(A, T, s, torso, M.vein, onTube(tb, [[bite.t + Math.cos(a) * .2, bite.y + Math.sin(a) * .026], [t1, y1 - .01], [t1 + Math.cos(a + .6) * .14, y1 + Math.sin(a + .6) * .03 - .04]], .0008), [.0026, .002, .0012], 4, { kind: 'wound', bit: 1 }); }
    }
    if (W[4]) woundDetail(A, T, s, torso, tb, P.belly.t, P.belly.y, .12, .02, M, 4, { flaps: 6, strings: 1, spin: .1 });
    if (W[2]) { const ab = P.armBite, el = (ab.side < 0 ? u.armLG : u.armRG).userData.elbowG; woundDetail(A, T, s, el, B['fore' + (ab.side < 0 ? 'L' : 'R')], ab.t, ab.y, .045, .055, M, 2, { flaps: 6, strings: 2 }); }
    for (const side of [-1, 1]) cord(A, T, s, torso, M.skinDark, onTube(tb, [[side * .5, .55], [side * .42, .5], [side * .2, .45]], .001), [.006, .007, .004], 5);
    // a rope belt holding the shorts up
    const pv = B.pelvis; cord(A, T, s, hips, M.rope, Array.from({ length: 17 }, (_, i) => { const t = i / 16 * TAU, h = pv.at(t, .208 + .008 * Math.sin(t) + .004 * Math.sin(t * 3)); return h.p.addScaledVector(h.n, .003).toArray(); }), [.006], 5);
    humanHead(A, T, g, s, P.head, M, seed + 40);
  },

  // MILITARY: a soldier, days dead. Combat blouse (sleeves rolled to the elbow) and trousers bloused over the boots, in the
  // three uniform tones game/military-appearance.js turns into the camo (it adds the helmet and the plate carrier on top);
  // a rigger's belt, knee pads, the bite at the collar, a torn cheek, a soldier's cropped head under the helmet.
  military(A, T, g, s, P, M) {
    const u = g.userData, { hips, torso } = u, seed = P.body.seed, W = P.wounds, dirt = P.dirt;
    // the uniform tones: the exact colours prepareMilitaryAppearance swaps for the camo (no colour role: the camo owns them)
    const U = [0x626448, 0x8a805a, 0x3c4633].map((c) => A.mat(c, false, 0, 'cloth')), [u0, u1, u2] = U;
    const clothField = (t, y, x, z, k) => .003 * (fbm(x * 14, y * 7, z * 14, seed + k) - .5) + .002 * Math.sin(y * 60 + Math.sin(t * 3) * 2);
    const V = {};
    if (W[1]) V.torso = [woundVariant(1, P.bite.t, P.bite.y, .34, .03, .02, M, seed + 1)];
    if (W[2]) { const k = 'fore' + (P.armBite.side < 0 ? 'L' : 'R'); V[k] = [woundVariant(2, P.armBite.t, P.armBite.y, .55, .028, .012, M, seed + 3)]; }
    const B = body(A, T, g, s, { ...P.body, clothField, thighMat: u0, pelvisMat: u0, pelvisPaint: [{ m: u2, f: (t, y) => Math.abs(Math.abs(angd(t, Math.PI)) - .48) < .2 && y > .03 && y < .14 }],
      thighPaint: [{ m: u1, f: (t, y, x, z) => fbm(x * 6, y * 6, z * 6, seed + 5) > .7 }] }, M, V);
    // the blouse: a shell over the torso from below the belt line to an open collar; the collar's points turned down
    const bite = P.bite, neck = (t) => .505 - P.neckOpen * Math.max(0, Math.cos(t)) ** 3 - (W[1] ? .03 * G(angd(t, bite.t) / .4) : 0);
    shell(A, T, s, torso, u0, B.torso, {
      lo: () => -.07, hi: neck, rows: 16, rim: [false, true], rimIn: .004, rimMat: u2,
      off: (t, y) => .008 + .003 * fbm(Math.cos(t) * 5, y * 12, Math.sin(t) * 5, seed + 21) + .003 * G((y - .06) / .05),
      paint: [{ m: M.bloodDry, f: (t, y) => W[1] && Math.abs(angd(t, bite.t)) < .35 && y > neck(t) - .06 }, { m: u2, f: (t, y) => y > neck(t) - .01 },
        { m: u1, f: (t, y, x, z) => fbm(x * 6, y * 6, z * 6, seed + 6) > .7 }]
    });
    const tb = B.torso;
    // the button placket and two chest pockets with their flaps (the carrier covers them from the front; they show at the sides)
    cord(A, T, s, torso, u2, onTube(tb, [[0, .48], [0, .25], [0, -.04]], .011), [.005], 4);
    for (const side of [-1, 1]) {
      blob(A, T, s, torso, u0, { p: tb.at(side * .52, .33).p.clone().addScaledVector(tb.at(side * .52, .33).n, .012), n: tb.at(side * .52, .33).n }, .07, .075, .008, 0, 0);
      blob(A, T, s, torso, u2, { p: tb.at(side * .52, .37).p.clone().addScaledVector(tb.at(side * .52, .37).n, .013), n: tb.at(side * .52, .37).n }, .072, .026, .006, 0, 0);   // J159: the flap on the pocket (it stood 7-8 mm off; s30: .015 -> .013, it was 4.1-4.4 mm off at scale 1, 5.3-5.7 at 1.3)
      // the collar points
      cord(A, T, s, torso, u2, onTube(tb, [[side * .55, neck(side * .55) + .005], [side * .32, neck(side * .32) - .03], [side * .18, neck(side * .18) - .05]], .013), [.01, .008, .003], 4);
    }
    // sleeves rolled above the elbow: a shell on the upper arm and its thick rolled cuff
    for (const side of [-1, 1]) {
      const S = side < 0 ? 'L' : 'R', arm = side < 0 ? u.armLG : u.armRG, ab = B['arm' + S], lo = P.sleeve[side < 0 ? 0 : 1];
      shell(A, T, s, arm, u0, ab, { lo: () => lo, hi: () => .05, rows: 9,   // s27: the arm's cap now ends at .056 (was .112); its lower rim lay wholly inside the cuff (seating)
      rim: [false, false], rimIn: .003, rimMat: u2, off: (t, y) => .005 + .0015 * noise3(t * 3, y * 20, side, seed + 40),
        paint: [{ m: u1, f: (t, y, x, z) => fbm(x * 6, y * 6, z * 6, seed + 7) > .7 }] });
      // the rolled cuff: a flat folded band a little proud of the sleeve, with its two edges
      shell(A, T, s, arm, u1, ab, { lo: () => lo - .004, hi: () => lo + .03, rows: 3, rim: [true, true], rimIn: .002, rimMat: u2, off: (t, y) => .011 + .0015 * noise3(t * 4, y * 40, side, seed + 41) });
    }
    // the rigger's belt, its buckle and a pouch at the hip
    const pv = B.pelvis;
    const bw0 = P.body.w, bd0 = P.body.d; tube(A, T, s, hips, M.belt, { n: 32, sub: 1, keys: [{ y: .18, w: .19 * bw0 + .012, d: .14 * bd0 + .01, cz: .006 }, { y: .23, w: .186 * bw0 + .012, d: .138 * bd0 + .01, cz: .006 }], capBulge: [-.03, -.03] });
    const bk = pv.at(0, .205); blob(A, T, s, hips, M.metal, { p: bk.p.clone().addScaledVector(bk.n, .029), n: bk.n }, .06, .036, .012, 0, 0);   // on the belt's face (seating: it was inside the belt)
    const hp = pv.at(1.9, .135); blob(A, T, s, hips, u2, { p: hp.p.clone().addScaledVector(hp.n, .02), n: hp.n }, .08, .1, .03, 0, 0);   // J159: the pouch hangs from the belt against the hip (it floated 9 mm off)
    // trousers: cargo pockets on the thighs, knee pads, legs bloused over the boot tops
    for (const side of [-1, 1]) {
      const S = side < 0 ? 'L' : 'R', leg = side < 0 ? u.legLG : u.legRG, shin = leg.userData.shinG, th = B['thigh' + S], sh = B['shin' + S];
      const cp = th.at(side * 1.45, -.2); blob(A, T, s, leg, u0, { p: cp.p.clone().addScaledVector(cp.n, .01), n: cp.n }, .1, .13, .016, 0, 0);   // J159: on the thigh (it stood 8 mm off)
      const cf = th.at(side * 1.45, -.135); blob(A, T, s, leg, u2, { p: cf.p.clone().addScaledVector(cf.n, .017), n: cf.n }, .104, .03, .008, 0, 0);   // s30: the cargo flap .02 -> .017 (4.2 mm off at scale 1, 5.5 at 1.3)
      shell(A, T, s, shin, u0, sh, { lo: () => -.2, hi: () => .06, rows: 9, rim: [true, false], rimIn: .004, rimMat: u2,
        off: (t, y) => .012 + .012 * G((y + .19) / .03) + .003 * noise3(t * 3, y * 30, side, seed) });
      const kp = sh.at(0, .02); blob(A, T, s, shin, M.belt, { p: kp.p.clone().addScaledVector(kp.n, .03), n: kp.n }, .1, .1, .03, 0, 0);
      boot(A, T, s, shin, M, side, { scuff: false });
    }
    // the bite at the collar and its veins; the forearm bite under the rolled sleeve
    if (W[1]) {
      woundDetail(A, T, s, torso, tb, bite.t, bite.y, .06, .055, M, 1, { flaps: 7, strings: 2, spin: .3 });
      for (let i = 0; i < P.veins; i++) { const a = i * 2.4 + .3, t1 = bite.t + Math.cos(a) * .25, y1 = bite.y + Math.sin(a) * .03;
        cord(A, T, s, torso, M.vein, onTube(tb, [[bite.t + Math.cos(a) * .18, bite.y + Math.sin(a) * .024], [t1, y1 - .008]], .0008), [.0024, .0012], 4, { kind: 'wound', bit: 1 }); }
    }
    if (W[2]) { const ab = P.armBite, el = (ab.side < 0 ? u.armLG : u.armRG).userData.elbowG; woundDetail(A, T, s, el, B['fore' + (ab.side < 0 ? 'L' : 'R')], ab.t, ab.y, .045, .05, M, 2, { flaps: 6, strings: 2 }); }
    humanHead(A, T, g, s, P.head, M, seed + 40);
    // fit signals for game/military-appearance.js (ChatGPT): the crown's height and the blouse's outside surface, in the
    // scaled bone-local frames of the neutral template (theta 0 = front, PI = back; y and p scaled; s given once)
    u.head.userData.cc355Crown = u.head.userData.cc355CrownY;
    u.torso.userData.cc355Scale = s;
    u.torso.userData.cc355TorsoAt = (t, y) => { const h = tb.at(t, y / s), off = .008 + .003 * G((y / s - .06) / .05) + .0015; return { p: h.p.clone().addScaledVector(h.n, off).multiplyScalar(s), n: h.n.clone() }; };
  },

  // DROWNED: a man pulled up from the water: bloated and waterlogged, the skin pruned, puffy-faced, wet hair plastered
  // down; still roped to the rusted ballast plate that took him under (leather straps over the shoulders); weed trailing
  // from his shoulders and head; barnacles grown on the forearm and the scalp; sodden trousers torn at the shins.
  drowned(A, T, g, s, P, M) {
    const u = g.userData, { hips, torso } = u, seed = P.body.seed, W = P.wounds;
    const prune = (t, y, x, z) => .0016 * (fbm(x * 38, y * 38, z * 38, seed + 2) - .5) + .0012 * Math.sin(x * 160 + fbm(x * 8, y * 8, z * 8, seed) * 6);
    const clothField = (t, y, x, z, k) => .004 * (fbm(x * 12, y * 6, z * 12, seed + k) - .5) + .003 * Math.sin(y * 55 + Math.sin(t * 3) * 2) * G((y + .3) / .1);
    const V = {};
    if (W[1]) V.torso = [woundVariant(1, P.bite.t, P.bite.y, .34, .03, .02, M, seed + 1)];
    if (W[2]) { const k = 'fore' + (P.armBite.side < 0 ? 'L' : 'R'); V[k] = [woundVariant(2, P.armBite.t, P.armBite.y, .55, .028, .012, M, seed + 3)]; }
    const wet = [{ m: M.clothDark, f: (t, y, x, z) => fbm(x * 7, y * 7, z * 7, seed + 4) > .55 }];
    // bloat: the trunk swollen with water: the waist and flanks most (the belly rolls out over the belt), the chest sagging
    // (the pectorals hang lower and flatter, a fold under them), the back rounded
    const bl = P.body.bloat || 0, bloat = (t, y) => {
      const fl = Math.abs(Math.sin(t)), front = Math.max(0, Math.cos(t)), back = Math.max(0, -Math.cos(t));
      return bl * (.045 * G((y - .06) / .15) * (1 + .7 * fl) + .016 * front * G((y + .02) / .07) + .012 * back * G((y - .3) / .12)
        + [-1, 1].reduce((a, k) => a + .02 * G(angd(t, k * .6) / .42) * G((y - .275) / .05) - .008 * G(angd(t, k * .6) / .5) * G((y - .225) / .012), 0)
        - .006 * front * G((y - .37) / .03));
    };
    const B = body(A, T, g, s, { ...P.body, clothField, torsoField: (t, y, x, z) => prune(t, y, x, z) + bloat(t, y), pelvisPaint: wet, thighPaint: wet }, M, V);
    const tb = B.torso, pv = B.pelvis;
    // the ballast plate: four rusted slats on the chest, riveted, roped on with two leather straps over the shoulders
    // the boards: waterlogged wood (not metal: no flashlight glare at night), their sawn edges darker (made here: the palette stays as the other types use it)
    const wood = A.mat(0x6f4b33, false, 0, 'leather'), rustDark = A.mat(0x4a3324, false, 0, 'leather');
    // v2: four wide boards (each a plank that follows the swollen chest and belly, with its thickness), riveted at the ends
    for (let i = 0; i < 4; i++) {
      const y = .335 - i * .072, half = .78 + (i % 2) * .05, sk = (i % 2 ? 1 : -1) * .05, lift = (u) => .002 * Math.sin(u * 9 + i);
      const su = .1 / (2 * half);   // the rivets: two at each end, on the face
      plank(A, T, s, torso, wood, tb, -half + sk, half + sk, y - .03, y + .03, .022, .016, 12, 3, rustDark, lift, [[su, .27], [su, .73], [1 - su, .27], [1 - su, .73]]);
    }
    for (const side of [-1, 1]) {
      // v2: the straps run over the boards (lifted clear of them), then over the shoulder and down the back
      cord(A, T, s, torso, M.leather, [[side * .5, .1, .043], [side * .52, .3, .043], [side * .55, .42, .03], [side * 1.2, .5, .014], [side * (Math.PI - .5), .42, .012], [side * (Math.PI - .4), .2, .012]].map(([t, y, l]) => { const h = tb.at(t, y); return h.p.addScaledVector(h.n, l).toArray(); }), [.012], 5);
    }
    cord(A, T, s, torso, M.leather, Array.from({ length: 17 }, (_, i) => { const h = tb.at(i / 16 * TAU, .09); return h.p.addScaledVector(h.n, .012).toArray(); }), [.011], 5);
    // weed: long dark strands rooted on the shoulders and the upper back, hanging down it
    for (let i = 0; i < 9; i++) {
      const t0 = Math.PI + (i - 4) * .27, y0 = .46 - (i % 3) * .05, len = .25 + .12 * hash3(i, seed, 2, 5);
      cord(A, T, s, torso, M.moss, onTube(tb, [[t0, y0], [t0 + .08, y0 - len * .4], [t0 - .05, y0 - len * .75], [t0 + .03, y0 - len]], .008 + .004 * (i % 2)), [.008, .007, .005, .002], 4);
    }
    // sodden trousers: a rope belt, the legs torn at the shins, boots
    cord(A, T, s, hips, M.rope, Array.from({ length: 17 }, (_, i) => { const h = pv.at(i / 16 * TAU, .215); return h.p.addScaledVector(h.n, .006).toArray(); }), [.008], 5);
    for (const side of [-1, 1]) {
      const S = side < 0 ? 'L' : 'R', leg = side < 0 ? u.legLG : u.legRG, shin = leg.userData.shinG, sh = B['shin' + S];
      const h0 = P.trouserHem[side < 0 ? 0 : 1], them = (t) => h0 + .05 * (noise3(Math.cos(t) * 4, Math.sin(t) * 4, side, seed + 30) - .5) * 2 - .05 * Math.max(0, Math.cos(t * 2 + side));
      shell(A, T, s, shin, M.cloth, sh, { lo: them, hi: () => .06, rows: 8, off: (t, y) => .01 + .005 * (1 - clamp((y - them(t)) / .06, 0, 1)) + .003 * noise3(t * 3, y * 30, side, seed), rimIn: .004, rimMat: M.clothDark,
        paint: [{ m: M.clothDark, f: (t, y) => y < them(t) + .02 }] });
      for (let i = 0; i < 4; i++) { const t = side * (i * 1.6 + .5), y = them(t); cord(A, T, s, shin, M.moss, [[t, y + .004, .012], [t + .03, Math.min(y, them(t + .03)) - .02 - .006 * i, .006], [t + .05, Math.min(y, them(t + .05)) - .04 - .012 * i, .003]].map(([q, v, l]) => onTube(sh, [[q, v]], l)[0]), [.003, .0022, .0015], 3); }   // J159 (D-191): rooted in the hem, lying on the shin (they hung 6-17 mm off it)
      boot(A, T, s, shin, M, side, { scuff: false });
    }
    // barnacles: pale cones with dark mouths on the left forearm and the crown
    const fl = B.foreL, elL = u.armLG.userData.elbowG;
    for (let i = 0; i < 6; i++) { const h = fl.at(-.9 + i * .22, -.05 - (i % 3) * .05); blob(A, T, s, elL, M.bone, { p: h.p.clone().addScaledVector(h.n, .006), n: h.n }, .012, .012, .009, 0, 0); blob(A, T, s, elL, M.deep, { p: h.p.clone().addScaledVector(h.n, .014), n: h.n }, .005, .005, .003, 0, 0); }
    if (W[1]) woundDetail(A, T, s, torso, tb, P.bite.t, P.bite.y, .06, .055, M, 1, { flaps: 6, strings: 2, spin: -.3 });
    if (W[2]) { const ab = P.armBite, el = (ab.side < 0 ? u.armLG : u.armRG).userData.elbowG; woundDetail(A, T, s, el, B['fore' + (ab.side < 0 ? 'L' : 'R')], ab.t, ab.y, .045, .05, M, 2, { flaps: 5, strings: 2 }); }
    const hd = humanHead(A, T, g, s, P.head, M, seed + 40);
    // weed caught in the wet hair, and two barnacles on the scalp
    if (hd) for (let i = 0; i < 4; i++) { const t0 = (i % 2 ? 1 : -1) * (.9 + .3 * i), y0 = .17; cord(A, T, s, u.head, M.moss, onTube(hd, [[t0, y0], [t0 * 1.1, y0 - .08], [t0 * 1.15, y0 - .16 - .03 * i]], .012), [.006, .005, .002], 4); }
    if (hd) for (const t0 of [-.6, 2.3]) { const h = hd.at(t0, .16); blob(A, T, s, u.head, M.bone, { p: h.p.clone().addScaledVector(h.n, .006), n: h.n }, .014, .014, .01, 0, 0); blob(A, T, s, u.head, M.deep, { p: h.p.clone().addScaledVector(h.n, .016), n: h.n }, .006, .006, .003, 0, 0); }
  },

  // SCREAMER (s22 first build): see HUMANOID.screamer. The shift is a shell on the torso (scoop neck, sleeveless, ragged
  // hem and rips) whose cloth carries on as the pelvis loft and a short ragged skirt edge on each thigh; bare legs and feet.
  screamer(A, T, g, s, P, M) {
    const u = g.userData, { hips, torso } = u, seed = P.body.seed, W = P.wounds, dirt = P.dirt;
    // s23 (Director FIX 1, the mask seam): game/screamer-appearance.js greys every surface on the head by its luminance
    // (v = .55 x mean(rgb) -> .85v, v, .93v) but only darkens the body (x .46 / .48 / .50, the hue kept), so a tan neck
    // and arms met a grey face at the jaw line. The body's skin-role materials are pre-set here to the face formula's
    // result divided by the body factor: after the pass, any skin shade on the body = the same shade on the face. The head
    // keeps the shared palette (Mh); the neck stub is on the torso, so it takes the body's.
    const Mh = M; M = screamerBodySkin(M);
    const V = {};
    if (W[1]) V.torso = [woundVariant(1, P.bite.t, P.bite.y, .3, .028, .016, M, seed + 1)];
    // s23: with her skin now the face's grey, a grey shift vanished into it: a faded hospital blue (cold, darker than the
    // skin after the pass's body darkening) keeps the gown reading as cloth in all four lights
    const gownC = A.mat(0x6f88a3, false, 0, 'cloth'), gownDark = A.mat(0x4a5b6e, false, 0, 'cloth'), gownStain = A.mat(0x6b6450, false, 0, 'cloth');
    for (const m of [gownC, gownDark, gownStain]) { m.userData.zombieColorRole = 'cloth-secondary'; m.userData.zombieColorBase = 0x6f88a3; }
    const grime = (k) => [{ m: gownStain, f: (t, y, x, z) => fbm(x * 9, y * 9, z * 9, seed + k) > 1 - dirt * .42 }, { m: gownDark, f: (t, y, x, z) => fbm(x * 6, y * 6, z * 6, seed + k + 3) > .66 }];
    const B = body(A, T, g, s, { ...P.body, thighMat: M.cloth, pelvisMat: M.cloth, pelvisPaint: [{ m: M.clothMid, f: (t, y, x, z) => fbm(x * 7, y * 7, z * 7, seed + 4) > .7 }], thighPaint: [{ m: M.clothMid, f: (t, y, x, z) => fbm(x * 7, y * 7, z * 7, seed + 5) > .7 }],
      shinPaint: [{ m: M.dirt, f: (t, y, x, z) => y < -.2 && fbm(x * 18, y * 12, z * 18, seed + 9) + (-.2 - y) * 2 > 1 - dirt * .6 }] }, M, V);
    const tb = B.torso, bite = P.bite;
    // the shift: hem ragged at the hips, three rips run up from it, a low scoop neck (collarbones and throat bare)
    const hem = (t) => { let y = P.shiftHem[0] + .035 * (noise3(Math.cos(t) * 3, Math.sin(t) * 3, 0, seed + 11) - .5) * 2; for (const [tt, hh] of P.tears) y += hh * P.wear * 2 * Math.max(0, 1 - Math.abs(angd(t, tt)) / .14) ** 1.5; return Math.max(y, .0); };
    const neck = (t) => .47 - .075 * Math.max(0, Math.cos(t)) ** 2 - (W[1] ? .04 * G(angd(t, bite.t) / .4) : 0);
    shell(A, T, s, torso, gownC, tb, {
      lo: hem, hi: neck, rows: 15, off: (t, y) => .005 + .003 * fbm(Math.cos(t) * 5, y * 12, Math.sin(t) * 5, seed + 21) + .003 * G((y - .12) / .06) * (Math.cos(t * 6) * .5 + .5),
      rimIn: .004, rimMat: gownDark, paint: [{ m: M.bloodDry, f: (t, y) => W[1] && Math.abs(angd(t, bite.t)) < .45 && y > neck(t) - .06 }, { m: gownStain, f: (t, y, x, z) => fbm(x * 4, y * 4, z * 4, seed + 6) > .74 }, { m: gownDark, f: (t, y) => y > neck(t) - .01 || y < hem(t) + .02 }]
    });
    // shoulder straps of the shift over the trapezius
    for (const side of [-1, 1]) cord(A, T, s, torso, gownC, [[side * .62, .42, .006], [side * .95, .49, .006], [side * 1.6, .47, .006], [side * (Math.PI - .7), .41, .006]].map(([t, y, l]) => { const h = tb.at(t, y); return h.p.addScaledVector(h.n, l).toArray(); }), [.011], 5);
    // dark leggings torn off at mid-shin (a shell on the shin with a ragged hem and threads), bare feet below
    for (const side of [-1, 1]) {
      const S = side < 0 ? 'L' : 'R', leg = side < 0 ? u.legLG : u.legRG, shin = leg.userData.shinG, sh = B['shin' + S];
      const h0 = side < 0 ? -.17 : -.12, them = (t) => h0 + .04 * (noise3(Math.cos(t) * 4, Math.sin(t) * 4, side, seed + 30) - .5) * 2 - .04 * Math.max(0, Math.cos(t * 2 + side));
      shell(A, T, s, shin, M.cloth, sh, { lo: them, hi: () => .06, rows: 8, off: (t, y) => .006 + .003 * (1 - clamp((y - them(t)) / .06, 0, 1)) + .002 * noise3(t * 3, y * 30, side, seed), rimIn: .003, rimMat: M.clothDark,
        paint: [{ m: M.clothDark, f: (t, y) => y < them(t) + .015 }] });
      for (let i = 0; i < 4; i++) { const t = side * (i * 1.6 + .8), y = them(t); cord(A, T, s, shin, M.clothDark, [[t, y, .008], [t + .05, Math.min(y, them(t + .05)) - .03 - .01 * i, .0018]].map(([q, v, l]) => onTube(sh, [[q, v]], l)[0]), [.0018, .001], 3); }   // J159 (D-191): the threads lie on the shin (one hung 8 mm off)
      // a bare foot: heel, arch, ball, five long toes with broken nails (below the ankle cut)
      tube(A, T, s, shin, M.skin, { axis: 'z', n: 14, sub: 2, paint: [{ m: M.dirt, f: (t, y) => Math.cos(t) < -.2 || y > .085 }],
        keys: [{ y: -.06, w: .029, d: .028, cz: -.385 }, { y: -.035, w: .036, d: .033, cz: -.378 }, { y: .01, w: .036, d: .032, cz: -.375 }, { y: .06, w: .042, d: .024, cz: -.392 },
          { y: .1, w: .046, d: .017, cz: -.4 }, { y: .118, w: .04, d: .013, cz: -.404 }].map((q) => ({ ...q, cx: side * .004 })), capBulge: [.004, .002] });
      for (let k = 0; k < 5; k++) {
        const x = side * (-.031 + k * .0155), L = [.034, .031, .028, .024, .02][k], r = [.0078, .006, .0055, .005, .0046][k], z0 = .105 - k * .004;
        cord(A, T, s, shin, M.skin, [[x, -.402, z0], [x * 1.04, -.405, z0 + L * .55], [x * 1.05, -.41, z0 + L]], [r, r * .9, r * .75], 5);
        blob(A, T, s, shin, M.nail, { p: new T.Vector3(x * 1.05, -.4045, z0 + L - .002), n: new T.Vector3(0, 1, .25).normalize() }, r * 1.3, r * 1.1, .0018, 0, 0);
      }
      // the wrist's tendons and the shin's edge standing under the starved skin
      const fo = B['fore' + S], sn = B['shin' + S];
      for (const dt of [-.3, 0, .28]) cord(A, T, s, (side < 0 ? u.armLG : u.armRG).userData.elbowG, M.skinMid, onTube(fo, [[dt, -.305], [dt * 1.1, -.24], [dt * 1.2, -.16]], -.0008), [.0024, .0032, .0015], 4);
      if (sn) cord(A, T, s, shin, M.skinMid, onTube(sn, [[-side * .25, -.3], [-side * .2, -.15], [-side * .18, -.04]], -.0012), [.0026, .0032, .002], 4);
    }
    // the bite at the shoulder of the neck, and its veins
    if (W[1]) {
      woundDetail(A, T, s, torso, tb, bite.t, bite.y, .055, .05, M, 1, { flaps: 7, strings: 2, spin: .3 });
      for (let i = 0; i < P.veins; i++) { const a = i * 2.4 + .3, t1 = bite.t + Math.cos(a) * .28, y1 = bite.y + Math.sin(a) * .035;
        cord(A, T, s, torso, M.vein, onTube(tb, [[bite.t + Math.cos(a) * .18, bite.y + Math.sin(a) * .024], [t1, y1 - .01], [t1 + Math.cos(a + .6) * .12, y1 + Math.sin(a + .6) * .03 - .04]], .0008), [.0024, .0018, .0011], 4, { kind: 'wound', bit: 1 }); }
    }
    // the throat: two long cords (the sternocleidomastoids) from behind the jaw to the notch, standing out with the scream
    for (const side of [-1, 1]) cord(A, T, s, torso, M.skinMid, onTube(tb, [[side * 1.05, .53], [side * .6, .5], [side * .18, .455]], .0015), [.0075, .0085, .006], 6);
    const hd = humanHead(A, T, g, s, P.head, Mh, seed + 40);
    // long wet hair hanging forward over the face's sides (clear of the cheeks), rooted at the front of the scalp
    if (hd) for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1, t0 = side * (.62 + .21 * hash3(i, seed, 1, 7) + .09 * Math.floor(i / 2)), y0 = .14 - .02 * hash3(i, seed, 2, 7), ln = .17 + .14 * hash3(i, seed, 4, 2), sw = .05 * (hash3(i, seed, 5, 3) - .3);
      cord(A, T, s, u.head, M.hair, onTube(hd, [[t0, y0], [t0 + side * .07 + sw, y0 - ln * .3], [t0 + side * .1 - sw, y0 - ln * .65], [t0 + side * .09 + sw, y0 - ln]], .008 + .003 * (i % 3)), [.0042, .0036, .003, .0012], 4, { kind: 'hair', slot: side < 0 ? 1 : 2 });
    }
    // the tongue lolling out over the dropped jaw and down past the chin, in game/screamer-appearance.js's two tongue
    // colours (its pass hangs exactly those surfaces on her tongue joint under the jaw hinge, and keeps them bright)
    if (hd) {
      const gp = P.head.gape, tg = A.mat(0xae6671, false, 0, 'wet'), tip = A.mat(0xd89299, false, 0, 'wet');
      const q = (y, l, dx = 0) => { const h = hd.at(dx, y); return h.p.addScaledVector(h.n, l).toArray(); };
      const pts = [q(-.088 - gp * .6, -.012), q(-.1 - gp * .9, .012, .02), q(-.13 - gp, .028, .04), q(-.17 - gp, .03, .03), q(-.2 - gp, .022, .0)];
      cord(A, T, s, u.head, tg, pts, [.016, .017, .015, .012, .007], 7);
      cord(A, T, s, u.head, tip, pts.slice(1).map(([x, y, z]) => [x, y, z + .009]), [.005, .006, .005, .003], 5);
    }
  },

  // SHAMBLER: the ordinary dead. A man in a torn vest top, work trousers torn at the shins, a belt and work boots; the
  // bite in the neck that killed him, grey-green decay, swollen veins, a gash across the belly, a scalp torn to the bone.
  // BOMBER (s29, review only): see HUMANOID.bomber.
  bomber(A, T, g, s, P, M) {
    const u = g.userData, { hips, torso } = u, seed = P.body.seed, W = P.wounds, dirt = P.dirt, eyes = new Set(u.eyes || []);
    const pulse = u.pulseMats || [];
    // the concept's own gut sphere and back blisters stay through stripBase (emissive); this body draws its own
    for (const b of [hips, torso]) for (const m of [...b.children]) if (m.isMesh && !eyes.has(m) && pulse.includes(m.material)) m.removeFromParent();
    const gutMat = pulse[0] || M.skin, veinMat = pulse[1] || M.vein;
    const clothField = (t, y, x, z, k) => .004 * (fbm(x * 14, y * 7, z * 14, seed + k) - .5) + .0025 * Math.sin(y * 70 + Math.sin(t * 3) * 2) * G((y + .36) / .08);
    const V = {};
    if (W[1]) V.torso = [woundVariant(1, P.bite.t, P.bite.y, .34, .03, .02, M, seed + 1)];
    // the trunk's fat: the flanks and love handles roll out over the belt, the lower back padded, the chest heavy and
    // hanging, the nape's hump and a thick neck (a double chin under the jaw in front)
    const fat = (t, y) => {
      const fl = Math.abs(Math.sin(t)), front = Math.max(0, Math.cos(t)), back = Math.max(0, -Math.cos(t));
      const F = P.fat || 0;   // s31: the flanks roll out twice as far and lower, back rolls over the belt line, the chest heavier and lower (it rests on the belly), the neck buried
      return (.055 + .05 * F) * fl * G((y - .06 + .03 * F) / .22) + (.025 + .03 * F) * fl * G((y + .03) / .08) + .022 * G((y - .1) / .2) + (.018 + .03 * F) * back * G((y - .1) / .12) + (.02 + .02 * F) * back * G((y - .47) / .06)
        + F * .022 * G(angd(t, Math.PI) / 1.5) * (G((y - .2) / .028) - .5 * G((y - .155) / .012))
        + [-1, 1].reduce((a, k) => a + (.022 + .03 * F) * G(angd(t, k * .6) / .45) * G((y - .27 + .025 * F) / .06) - .009 * G(angd(t, k * .6) / .5) * G((y - .215 + .04 * F) / .014), 0)
        + (.016 + .05 * F) * G((y - .535) / (.04 + .02 * F)) + (.02 + .02 * F) * front * G((y - .57) / .025) + F * .035 * fl * G((y - .49) / .05) + F * .03 * back * G((y - .36) / .1);
    };
    const shinPaint = [{ m: M.dirt, f: (t, y, x, z) => y < -.12 && fbm(x * 18, y * 12, z * 18, seed + 9) + (-.12 - y) * 1.5 > 1 - dirt * .6 }];
    const B = body(A, T, g, s, { ...P.body, clothField, shinPaint, torsoField: (t, y) => fat(t, y),
      pelvisPaint: [{ m: M.clothMid, f: (t, y, x, z) => fbm(x * 9, y * 9, z * 9, seed + 4) > .66 }],
      thighPaint: [{ m: M.clothMid, f: (t, y, x, z) => fbm(x * 9, y * 9, z * 9, seed + 5) > .64 || y < -.36 }] }, M, V);
    const tb = B.torso, pv = B.pelvis;
    // THE GUT: one loft hanging forward and down from under the chest over the belt, its back half inside the trunk;
    // the navel sunk, a crease where it folds over the waistband
    // s30 B ('burst'): the same gut pushed ~10 cm further forward and 6 cm lower, round and tight (no fold over the belt:
    // the skin is stretched smooth), the navel turned out; its keys' ends feed the morph caps below
    const BURST = P.gut === 'burst', NY = P.fat ? -.1 : -.05;   // the navel's height on the gut
    const gutKeys = BURST
      // a taut ball: an ellipsoid (centre y -.05, z .3; .23 tall, .29 wide, .3 deep) whose back half sits inside the trunk,
      // tied in under the chest by a short neck; rings spaced by angle, so the bottom and the top close round, not flat
      ? (P.fat
        // s31: the apron. An egg, fullest LOW (its widest ring at y -.1, below the navel), hanging over the belt and the crotch to the top of
        // the thighs, wider than the chest and the deepest point of the body; tied in under the sagging chest
        ? [...Array.from({ length: 12 }, (_, i) => { const a = Math.PI * (1 - (i + .5) / 13.5), c = Math.cos(a), r = Math.max(.12, Math.sin(a)) ** (c > 0 ? 1.25 : .8);
            return { y: -.1 + (c > 0 ? .31 : .2) * c, w: .4 * r, d: .36 * r, cz: .262 - .09 * Math.max(0, c) + .02 * Math.max(0, -c) }; }),
          { y: .25, w: .1, d: .07, cz: .15 }, { y: .285, w: .045, d: .03, cz: .1 }]
        : [...Array.from({ length: 10 }, (_, i) => { const a = Math.PI * (1 - (i + .5) / 11.5), c = Math.cos(a), r = Math.max(.12, Math.sin(a)); return { y: -.05 + .23 * c, w: .29 * r, d: .3 * r, cz: .3 - .03 * Math.max(0, c) }; }),
        { y: .215, w: .1, d: .085, cz: .15 }, { y: .25, w: .045, d: .035, cz: .09 }])
      : [{ y: -.155, w: .05, d: .04, cz: .12 }, { y: -.135, w: .15, d: .12, cz: .165 }, { y: -.08, w: .235, d: .2, cz: .185 }, { y: -.01, w: .255, d: .235, cz: .19 },
        { y: .07, w: .255, d: .235, cz: .18 }, { y: .15, w: .24, d: .21, cz: .155 }, { y: .22, w: .205, d: .17, cz: .125 }, { y: .27, w: .145, d: .12, cz: .085 }, { y: .31, w: .06, d: .045, cz: .055 }];
    const gut = tube(A, T, s, torso, gutMat, {
      n: BURST ? (P.fat ? 34 : 30) : 26, sub: 2, warp: .2,   // no paint: a painted loft gets a vertex-colour copy of its material, and the game finds the gut by its own
      bumps: BURST ? [{ t: 0, y: NY, at: .09, ay: .016, a: .016 }, { t: 0, y: NY, at: .18, ay: .03, a: -.007 }]   // the navel pushed out, a shallow ring round it
        : [{ t: 0, y: .0, at: .16, ay: .02, a: -.014 }, { t: 0, y: -.105, at: 1.4, ay: .015, a: -.008 }],
      keys: gutKeys
    });
    gut.meshes.forEach((m) => { m.name = 'bomber-gut'; m.userData.zombieFeature = { kind: 'gut' }; });
    // the vein carrier (game/bomber-appearance.js re-traces it over the gut's surface): one short vein lying on the skin
    cord(A, T, s, torso, veinMat, onTube(gut, [[-.3, .2], [-.25, .1], [-.32, .0], [-.28, -.08]], .0005), [.004, .0035, .003, .002], 4);
    if (BURST) {
      // s30 B: what tells 'about to burst' from 20 m. Everything here is built on the torso at the gut's surface, then moved
      // under the gut mesh (as game/bomber-appearance.js does with its traced veins) so it rides the gut's pulse and jiggle.
      const belly = gut.meshes[0], k = .3 * s, c = new T.Vector3(0, .075 * s, .18 * s), before = new Set(torso.children);   // the gut's unit frame (below)
      // the traced veins: dark trunks climbing out from under the gut over its dome, forking toward the navel
      const VEINS = [
        [[-.95, -.17], [-.75, -.1], [-.55, -.04], [-.38, .02], [-.22, .1], [-.12, .2]], [[.95, -.17], [.75, -.1], [.55, -.04], [.38, .02], [.22, .1], [.12, .2]],
        [[-.55, -.04], [-.42, -.1], [-.24, -.13], [-.1, -.1]], [[.55, -.04], [.42, -.1], [.24, -.13], [.1, -.1]],
        [[-.38, .02], [-.5, .1], [-.6, .17]], [[.38, .02], [.5, .1], [.62, .16]], [[-.22, .1], [-.08, .07], [-.03, -.02]], [[.22, .1], [.1, .12], [.05, .2]],
        [[-1.15, .05], [-.95, .0], [-.8, -.05]], [[1.15, .05], [.95, .0], [.8, -.05]]];
      const veinDark = A.mat(0x3d1e34, false, 0, 'wet');   // purple-black: they stand out of the stretched green skin
      VEINS.forEach((path, i) => { const r0 = i < 2 ? .0085 : i < 4 ? .0065 : .005; cord(A, T, s, torso, veinDark, onTube(gut, path, r0 * .55), path.map((_, j) => r0 * (1 - .55 * j / (path.length - 1))), 5); });
      // the acid blisters: swollen yellow sacs pushing out of the stretched skin, a bruised rim round each (two split and weeping)
      const sac = A.mat(0xb8d02e, true, 0, 'wet'); sac.emissiveIntensity = .8;   // acid: the concept's own glowing sacs (lit from inside, not lamps), now on the gut
      const SACS = [[-.5, -.06, .05], [.35, -.14, .058], [.62, .1, .042], [-.2, .12, .036], [.08, -.2, .032], [-.8, .06, .04], [.85, -.12, .036], [-.04, .2, .026], [-.36, -.2, .03], [1.05, .05, .03], [-1.05, -.1, .032]];
      SACS.forEach(([t0, y0, r], i) => { const h = gut.at(t0, y0);
        blob(A, T, s, torso, M.bruise, { p: h.p.clone().addScaledVector(h.n, .0015), n: h.n }, r * 2.6, r * 2.6, r * .7, i, 0);
        blob(A, T, s, torso, sac, { p: h.p.clone().addScaledVector(h.n, r * .25), n: h.n }, r * 2, r * 2.1, r * 1.9, i, 0);
        // s32 (J159): the weeping split lies ON the sac's dome (the sac is r x 1.05 r x .95 r, its centre .25 r off the skin); at a fixed lift it was buried inside the big sac
        if (i === 1 || i === 3) cord(A, T, s, torso, M.flesh, [[t0 - .05, y0 + .01, .95], [t0, y0 - .002, 1.17], [t0 + .045, y0 + .006, 1]].map(([q, v, l]) => onTube(gut, [[q, v]], r * l)[0]), [.003, .004, .003], 4); });
      // stretch tears: thin raw splits radiating from the navel where the skin can't give any more
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + .3, L = .07 + .03 * (i % 3);
        cord(A, T, s, torso, M.flesh, onTube(gut, [[Math.sin(a) * .07, NY + Math.cos(a) * .016], [Math.sin(a) * (.07 + L * 1.4), NY + Math.cos(a) * (.016 + L * .4)], [Math.sin(a) * (.07 + L * 2.6), NY + Math.cos(a) * (.016 + L * .7)]], .002), [.0045, .0035, .0015], 4); }
      // into the gut's unit frame, merged into ONE mesh per material (4 draws, not 40: D-189, the bodies are CPU-bound)
      const byMat = new Map();
      for (const o of [...torso.children]) if (!before.has(o)) {
        torso.remove(o); o.position.sub(c).divideScalar(k); o.scale.divideScalar(k); o.updateMatrix();
        const q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); q.applyMatrix4(o.matrix);
        if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(q);
      }
      for (const [mat, list] of byMat) {
        const n = list.reduce((a, q) => a + q.attributes.position.count, 0), P = new Float32Array(n * 3), N = new Float32Array(n * 3); let at = 0;
        for (const q of list) { if (!q.attributes.normal) q.computeVertexNormals(); P.set(q.attributes.position.array, at * 3); N.set(q.attributes.normal.array, at * 3); at += q.attributes.position.count; }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
        geo.computeBoundingBox(); geo.computeBoundingSphere();
        const o = new T.Mesh(geo, mat); o.name = 'bomber-burst'; o.castShadow = false; o.userData.cc355 = true; belly.add(o);
      }
    }
    // the gut in the concept belly's frame (a unit-sized geometry under a scaled mesh): game/bomber-appearance.js traces its
    // veins over it on that unit scale and game/bomber-behavior.js jiggles its scale
    for (const m of gut.meshes) {
      const geo = m.geometry, k = .3 * s, c = new T.Vector3(0, .075 * s, .18 * s);
      const pa = geo.attributes.position;   // the loft's chunks share one position array: move it once
      if (!pa.userData?.cc355Unit) { geo.translate(-c.x, -c.y, -c.z); geo.scale(1 / k, 1 / k, 1 / k); (pa.userData ||= {}).cc355Unit = true; }
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      m.position.copy(c); m.scale.setScalar(k);
      if (m.userData.zombieMorphCaps) m.userData.zombieMorphCaps = { axis: 'y', min: (gutKeys[0].y * s - c.y) / k, max: (gutKeys.at(-1).y * s - c.y) / k };
    }
    // a sweat-black vest rolled up over the chest above the gut (a shell: its hem rides on the gut's top)
    const vh = (t) => P.vestHem[0] + P.vestHem[1] * (noise3(Math.cos(t) * 3, Math.sin(t) * 3, 0, seed + 11) - .5) * 2 - .07 * Math.max(0, -Math.cos(t)) ** 2;
    const neck = (t) => .5 - .03 * Math.max(0, Math.cos(t)) ** 2 - (W[1] ? .05 * G(angd(t, P.bite.t) / .45) : 0);
    shell(A, T, s, torso, M.shirt, tb, { lo: vh, hi: neck, rows: 10, off: (t, y) => .006 + .006 * G((y - vh(t) - .015) / .02) + .002 * fbm(Math.cos(t) * 5, y * 12, Math.sin(t) * 5, seed + 21),
      rimIn: .004, rimMat: M.shirtHem, paint: [{ m: M.grime, f: (t, y, x, z) => fbm(x * 7, y * 7, z * 7, seed + 7) > 1 - dirt * .5 }, { m: M.shirtHem, f: (t, y) => y > neck(t) - .012 }] });
    // the acid blisters on the upper back: swollen yellow sacs sunk in the skin, a dark rim round each
    const sac = A.mat(0xc4c573, false, 0, 'wet');
    for (let i = 0; i < 7; i++) {
      const t0 = Math.PI + (i - 3) * .32 + .05 * Math.sin(i * 7), y0 = .3 + .07 * ((i * 3) % 4) / 3, h = tb.at(t0, y0), r = .03 + .012 * (i % 3);
      blob(A, T, s, torso, M.bruise, { p: h.p.clone().addScaledVector(h.n, .002), n: h.n }, r * 2.5, r * 2.5, r * .9, i, 0);
      blob(A, T, s, torso, sac, { p: h.p.clone().addScaledVector(h.n, .004), n: h.n }, r * 2, r * 2.1, r * 1.5, i, 0);
    }
    // the trousers: belt under the gut, loops, back pockets; the legs torn at the shins; boots
    const beltT = tube(A, T, s, hips, M.belt, { n: 32, sub: 1, keys: [{ y: .19, w: pv.at(Math.PI / 2, .19).p.x + .006, d: .137 * P.body.d + .01, cz: .006 }, { y: .236, w: pv.at(Math.PI / 2, .236).p.x + .006, d: .135 * P.body.d + .01, cz: .006 }], capBulge: [-.03, -.03] });
    // s32 (J159): the belt loops sit ON the belt (its own surface, the cord half in it); on the fat pelvis they stood 5.5-7.5 mm off it
    for (const t of [-1.3, -.7, .7, 1.3, Math.PI - .5, Math.PI + .5]) cord(A, T, s, hips, M.clothDark, onTube(beltT, [[t, .238], [t, .192]], .002), [.005], 4);
    for (const side of [-1, 1]) {
      cord(A, T, s, hips, M.cloth, onTube(pv, [[side * (Math.PI - .7), .14], [side * (Math.PI - .45), .145], [side * (Math.PI - .2), .14]], .006), [.0035], 4);
      const S = side < 0 ? 'L' : 'R', leg = side < 0 ? u.legLG : u.legRG, shin = leg.userData.shinG, th = B['thigh' + S], sh = B['shin' + S];
      cord(A, T, s, leg, M.clothDark, onTube(th, [[side * Math.PI / 2, .05], [side * Math.PI / 2, -.15], [side * Math.PI / 2, -.4]], .003), [.003], 4);
      const h0 = P.trouserHem[side < 0 ? 0 : 1], them = (t) => h0 + .045 * (noise3(Math.cos(t) * 4, Math.sin(t) * 4, side, seed + 30) - .5) * 2 - .05 * Math.max(0, Math.cos(t * 2 + side));
      shell(A, T, s, shin, M.cloth, sh, { lo: them, hi: () => .06, rows: 8, off: (t, y) => .012 + .006 * (1 - clamp((y - them(t)) / .06, 0, 1)) + .003 * noise3(t * 3, y * 30, side, seed), rimIn: .004, rimMat: M.clothDark,
        paint: [{ m: M.clothDark, f: (t, y) => y < them(t) + .02 }] });
      boot(A, T, s, shin, M, side, { scuff: true });
    }
    if (W[1]) woundDetail(A, T, s, torso, tb, P.bite.t, P.bite.y, .065, .06, M, 1, { flaps: 8, strings: 3, spin: -.4 });
    humanHead(A, T, g, s, P.head, M, seed + 40);
  },

  shambler(A, T, g, s, P, M) {
    if (shamblerV5) return shamblerV5Section(A, T, g, s, P, M);
    const u = g.userData, { hips, torso } = u, seed = P.body.seed, W = P.wounds;
    const clothField = (t, y, x, z, k) => .004 * (fbm(x * 14, y * 7, z * 14, seed + k) - .5) + .0025 * Math.sin(y * 70 + Math.sin(t * 3) * 2) * G((y + .36) / .08);
    // carved wounds on the body's lofts
    const V = {};
    if (W[1]) V.torso = [woundVariant(1, P.bite.t, P.bite.y, .34, .03, .02, M, seed + 1)];
    if (W[4]) (V.torso ||= []).push(woundVariant(4, P.belly.t, P.belly.y, .42, .011, .016, M, seed + 2));
    if (W[2]) { const k = 'fore' + (P.armBite.side < 0 ? 'L' : 'R'); V[k] = [woundVariant(2, P.armBite.t, P.armBite.y, .55, .028, .012, M, seed + 3)]; }
    const dirt = P.dirt, shinPaint = [{ m: M.dirt, f: (t, y, x, z) => y < -.12 && fbm(x * 18, y * 12, z * 18, seed + 9) + (-.12 - y) * 1.5 > 1 - dirt * .6 }];
    const B = body(A, T, g, s, { ...P.body, clothField, shinPaint, pelvisPaint: [{ m: M.clothDark, f: (t, y) => Math.abs(Math.abs(angd(t, Math.PI)) - .48) < .2 && y > .03 && y < .14 }, { m: M.clothMid, f: (t, y, x, z) => fbm(x * 9, y * 9, z * 9, seed + 4) > .66 }],
      thighPaint: [{ m: M.clothMid, f: (t, y, x, z) => fbm(x * 9, y * 9, z * 9, seed + 5) > .64 || y < -.36 }] }, M, V);
    // the vest top: a shell on the torso with a ragged hem and rips, a crew neck with its band, sweat and blood soaked in
    const bite = P.bite, hem = (t) => {
      let y = P.shirtHem[0] + P.shirtHem[1] * (noise3(Math.cos(t) * 3, Math.sin(t) * 3, 0, seed + 11) - .5) * 2;
      for (const [tt, hh] of P.tears) y += hh * P.wear * 2 * Math.max(0, 1 - Math.abs(angd(t, tt)) / .16) ** 1.5;
      return y;
    };
    const neck = (t) => .5 - .028 * Math.max(0, Math.cos(t)) ** 2 - (W[1] ? .055 * G(angd(t, bite.t) / .45) : 0);
    const stain = (t, y, x, z) => W[1] && y < bite.y && [[0, .07, .2], [.11, .03, .13], [-.1, .025, .09], [.2, .02, .06]].some(([dt, w, ln]) => Math.abs(angd(t, bite.t + dt + (y - bite.y) * .4)) < w * (1 - (bite.y - y) / ln * .6) + .03 * (noise3(x * 30, y * 20, z * 30, seed) - .5) && y > bite.y - ln);
    shell(A, T, s, torso, M.shirt, B.torso, {
      lo: hem, hi: neck, rows: 15, off: (t, y) => .006 + .003 * fbm(Math.cos(t) * 5, y * 12, Math.sin(t) * 5, seed + 21) + .004 * G((y - .1) / .05) * (Math.cos(t * 5) * .5 + .5),
      rimIn: .004, rimMat: M.shirtHem,
      paint: [{ m: M.blood, f: stain }, { m: M.bloodDry, f: (t, y, x, z) => stain(t, y + .03, x, z) || (W[1] && Math.abs(angd(t, bite.t)) < .5 && y > neck(t) - .03) },
        { m: M.grime, f: (t, y, x, z) => (y < hem(t) + .045 && fbm(x * 20, y * 20, z * 20, seed + 6) > .45) || fbm(x * 7, y * 7, z * 7, seed + 7) > 1 - dirt * .45 },
        { m: M.shirtHem, f: (t, y) => y > neck(t) - .012 }]
    });
    // the trousers: the waistband's thickness, a belt with its buckle, loops, fly, back pockets
    const pv = B.pelvis;
    tube(A, T, s, hips, M.belt, { n: 32, sub: 1, keys: [{ y: .19, w: .186, d: .137, cz: .006 }, { y: .236, w: .182, d: .135, cz: .006 }], capBulge: [-.03, -.03] });
    const bk = pv.at(0, .213); blob(A, T, s, hips, M.metal, { p: bk.p.clone().addScaledVector(bk.n, .011), n: bk.n }, .05, .04, .012, 0, 0);
    blob(A, T, s, hips, M.belt, { p: bk.p.clone().addScaledVector(bk.n, .011), n: bk.n }, .03, .022, .01, 0, .004);
    for (const t of [-1.3, -.7, .7, 1.3, Math.PI - .5, Math.PI + .5]) cord(A, T, s, hips, M.clothDark, onTube(pv, [[t, .24], [t, .2]], .013), [.005], 4);
    cord(A, T, s, hips, M.clothDark, onTube(pv, [[.04, .17], [.06, .09], [.02, .02]], .003), [.0035], 4);
    for (const side of [-1, 1]) {
      cord(A, T, s, hips, M.cloth, onTube(pv, [[side * (Math.PI - .7), .14], [side * (Math.PI - .45), .145], [side * (Math.PI - .2), .14]], .006), [.0035], 4);
      cord(A, T, s, hips, M.clothDark, onTube(pv, [[side * .9, .19], [side * 1.15, .1]], .004), [.003], 4); // the front pocket's edge
    }
    // the trouser legs: seams down the outside, the hems on the shins as shells with a ragged torn edge and threads
    for (const side of [-1, 1]) {
      const S = side < 0 ? 'L' : 'R', leg = side < 0 ? u.legLG : u.legRG, shin = leg.userData.shinG, th = B['thigh' + S], sh = B['shin' + S];
      cord(A, T, s, leg, M.clothDark, onTube(th, [[side * Math.PI / 2, .05], [side * Math.PI / 2, -.15], [side * Math.PI / 2, -.4]], .003), [.003], 4);
      const h0 = P.trouserHem[side < 0 ? 0 : 1], them = (t) => h0 + .045 * (noise3(Math.cos(t) * 4, Math.sin(t) * 4, side, seed + 30) - .5) * 2 - .05 * Math.max(0, Math.cos(t * 2 + side));
      const hemOff = (t, y) => .012 + .006 * (1 - clamp((y - them(t)) / .06, 0, 1)) + .003 * noise3(t * 3, y * 30, side, seed);
      shell(A, T, s, shin, M.cloth, sh, { lo: them, hi: () => .06, rows: 8, off: hemOff, rimIn: .004, rimMat: M.clothDark,
        paint: [{ m: M.clothDark, f: (t, y) => y < them(t) + .02 }] });
      // s32 (J159, ChatGPT GP-20146): each frayed thread's root sits ON the hem's own cloth (the cord half in it); the free end hangs as before.
      // s33 (ChatGPT's posed probe: one left thread rooted on the boot's rolled top, 17.7 mm from the cloth): the root is now the hem's own
      // corner vertex, the shell's bottom row at its nearest column (that row is a polygon through the columns: between them the ragged
      // them() curve can dip 10+ mm under the cloth's real edge, which is what left that thread on the boot).
      for (let i = 0; i < 4; i++) { const n = sh.n, c = ((Math.round(side * (i * 1.6 + .5) / TAU * n) % n) + n) % n, t = c / n * TAU, y = them(t);
        cord(A, T, s, shin, M.clothDark, [[t, y, hemOff(t, y)], [t + .05, y - .02 - .01 * i, .014]].map(([q, v, l]) => onTube(sh, [[q, v]], l)[0]), [.002, .0012], 3); }
      boot(A, T, s, shin, M, side, { scuff: true });
    }
    // the bite's tissue, veins swollen dark round it and down the chest, tendons standing on the neck
    const tb = B.torso;
    if (W[1]) {
      woundDetail(A, T, s, torso, tb, bite.t, bite.y, .065, .06, M, 1, { flaps: 8, strings: 3, spin: -.4 });
      for (let i = 0; i < P.veins; i++) {
        const a = i * 2.4 + .3, r0 = .05, t1 = bite.t + Math.cos(a) * .3, y1 = bite.y + Math.sin(a) * .04;
        cord(A, T, s, torso, M.vein, onTube(tb, [[bite.t + Math.cos(a) * .2, bite.y + Math.sin(a) * .026], [t1, y1 - .01], [t1 + Math.cos(a + .6) * .14, y1 + Math.sin(a + .6) * .03 - .03 - r0 * .2]], .0008), [.0026, .002, .0012], 4, { kind: 'wound', bit: 1 });
      }
    }
    if (W[4]) woundDetail(A, T, s, torso, tb, P.belly.t, P.belly.y, .12, .02, M, 4, { flaps: 6, strings: 1, spin: .1 });
    if (W[2]) { const ab = P.armBite, el = (ab.side < 0 ? u.armLG : u.armRG).userData.elbowG; woundDetail(A, T, s, el, B['fore' + (ab.side < 0 ? 'L' : 'R')], ab.t, ab.y, .045, .055, M, 2, { flaps: 6, strings: 2 }); }
    // -- the head
    humanHead(A, T, g, s, P.head, M, seed + 40);
  }
};

// ---- CC-359 v5: the signed-off shambler (AG-357 pass 7) on the game's bones ----------------------------------------------
// AG's body is built once (zombie-shambler-v5.js), every bone at rotation 0; each of its pieces goes onto the game bone that
// carries the same part of the body, by POSITION (AG's +x 'L' side is the game's armRG/legRG: the game's names, pick 4).
// Re-homed in the rest pose: AG hips-space x s, + .025 s up (AG's hip joints on the game's), minus the game bone's own
// place in hips-space (positions only: the bones' rest rotations, the hunch and the arms' droop, then turn the pieces like
// any animation). So the body at rest is AG's shape exactly; only the turning centres are the game's (all within 2 cm of
// AG's after the v5 rig, except the knee: the game's thigh is 2 cm shorter, legs B owns that, D-197).
// Not yet (later steps): the feature tags (tooth slots, wound twins, hair regions: step 2b), the atlas (step 3: AG's colours
// ride in the vertex colours here), LOD1/shadow (Claude 2). The moving jaw: s42 below (u.shamblerJaw, review).
let v5Template = null;
function shamblerV5Section(A, T, g, s, P, M) {
  const u = g.userData, AG = v5Template || (v5Template = buildShamblerV5(T, { lod: 0 }));
  const ab = AG.bones, agHips = ab.hips.getWorldPosition(new T.Vector3());
  // the game's bone for each AG bone (by side: AG 'L' is at +x = the game's R)
  const elbow = (a) => a.userData.elbowG, shin = (l) => l.userData.shinG;
  // a game bone's rest place in hips-space (positions and scales only)
  const restAt = (b) => { const v = new T.Vector3(); for (let o = b; o && o !== u.hips; o = o.parent) { v.multiply(o.scale).add(o.position); } return v; };
  // CC-359 s42 (review): the moving jaw. AG's jaw group (its hinge, head-local (0, .232, -.004): the lower face cut from the skull
  // shell at the seam, the lower gums, teeth and the jaw's inside) goes onto its OWN joint, u.shamblerJaw, a child of the head
  // bone at AG's hinge. At rotation 0 it is the head exactly. ChatGPT's joins line blends it with the head round the hinge;
  // Claude 5 swings it (rotation.x: + opens). Not u.jaw: index.html swings any u.jaw by its own rule.
  const jawG = u.shamblerJaw || new T.Group(); jawG.name = 'shambler-jaw';   // one joint, even if this body is built again
  { AG.root.updateMatrixWorld(true); const h = ab.jaw.getWorldPosition(new T.Vector3()).applyMatrix4(new T.Matrix4().copy(AG.root.matrixWorld).invert());
    h.sub(agHips).multiplyScalar(s); h.y += .025 * s; h.sub(restAt(u.head)).divideScalar(u.head.scale.x || 1); jawG.position.copy(h); }
  if (jawG.parent !== u.head) u.head.add(jawG); u.shamblerJaw = jawG;
  const map = new Map([[ab.hips, u.hips], [ab.torso, u.torso], [ab.head, u.head], [ab.jaw, jawG], [ab.armL, u.armRG], [ab.armR, u.armLG],
    [ab.elbowL, elbow(u.armRG)], [ab.elbowR, elbow(u.armLG)], [ab.legL, u.legRG], [ab.legR, u.legLG], [ab.shinL, shin(u.legRG)], [ab.shinR, shin(u.legLG)],
    [ab.ankleL, shin(u.legRG)], [ab.ankleR, shin(u.legLG)]]);
  const boots = new Set([ab.ankleL, ab.ankleR]);
  const agBoneOf = (o) => { for (let n = o; n; n = n.parent) if (map.has(n)) return n; return null; };
  // CC-359 step 3: every piece paints from ONE shared atlas (AG's FINAL ATLAS 512: hair, blood, skin, cloth, leather), one material,
  // so the game's merge makes ONE skinned draw. Each piece's own 0..1 UVs go into its zone's rect (AG's atlasZoneForMesh); the
  // UVs ride the geometry and material.userData.cc359Atlas tells batchSurfaces to keep them (zombie-concepts.js: asked of its owner).
  const AT = shamblerAtlas(T, { size: 512 });
  let atlasMat = null; const mat = (name) => {
    if (atlasMat) return atlasMat;
    const m = A.mat(0xffffff, false, 0, 'skin'); Object.assign(m, AT.options); m.vertexColors = true; m.roughness = 1; m.metalness = 1;
    if (!AT.options.roughnessMap) { m.roughness = .82; m.metalness = .02; }   // no textures (node tests): AG's plain step-1 response
    m.userData.cc359Atlas = { size: AT.size, ms: AT.ms }; m.name = 'cc359-shambler-atlas'; return (atlasMat = m);
  };
  const inv = new T.Matrix4().copy(AG.root.matrixWorld).invert(), Mx = new T.Matrix4(), first = new Map();
  const place = (geo, agB, gb, name) => {   // geo in AG root space -> on game bone gb
    const off = restAt(gb); geo.translate(-agHips.x, -agHips.y, -agHips.z); geo.scale(s, s, s); geo.translate(-off.x, .025 * s - off.y, -off.z);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) geo.deleteAttribute(k);
    const sc = gb.scale.x || 1; if (sc !== 1) geo.scale(1 / sc, 1 / sc, 1 / sc);
    const zone = cc359AtlasZone(name), uv = geo.attributes.uv; geo.setAttribute('uv', new T.Float32BufferAttribute(cc359AtlasUV(uv, geo.attributes.position.count, AT.rects[zone] || AT.rects.skin), 2));
    const m = A.put(gb, geo, mat(name)); m.name = 'v5 ' + name; m.userData.cc355 = true; m.userData.cc359v5 = name; m.userData.cc359Zone = zone;
    if (name === 'shambler-skull-cranium' || name === 'shambler-lower-jaw') m.userData.cc359JawSkin = true;   // CC-359 jaw (review): the skin pieces the jaw's joins rule may bend (the shell + the jaw's piece of it; not teeth/gums/cavities); zombie-concepts' batchSurfaces turns it into geometry.userData.cc359JawSkinMask (GP-20162)
    if (boots.has(agB)) m.userData.bootAttachment = true;      // prepareShamblerFeet moves these to the ankle (not by colour)
    if (!first.has(gb)) first.set(gb, m);
  };
  // AG's neck piece runs down over the collarbones and traps (a yoke). It rides the TORSO bone whole; the neck's skin blend
  // (head.userData.cc359NeckJoin, read by combat/zombie-joins.js: asked of its owner) carries its upper part with the head by
  // height, the same for the neck and the skull's base, so the neck bends like a neck and no cut line opens. (On the head
  // bone the yoke lifted off the chest; split at a height, the cut opened past the blend's reach at the shoulders.)
  AG.root.traverse((o) => {
    if (!o.isMesh || o.material === AG.eyeMat) return;          // AG's eyes: the game keeps its own glowing eyes (moved below)
    const agB = agBoneOf(o), gb = map.get(agB); if (!gb) return;
    const geo = o.geometry.clone(); Mx.multiplyMatrices(inv, o.matrixWorld); geo.applyMatrix4(Mx);   // AG root space
    if (agB === ab.head && /neck-skin/.test(o.name)) { place(geo, ab.torso, u.torso, o.name); return; }
    place(geo, agB, gb, o.name);
  });
  // the glowing eyes in AG's sockets (AG: radius 1 cm at head-local +-.035, .302, .118)
  const eyeAt = (x) => { const v = new T.Vector3(x, .302, .118); return v; };
  for (const eye of u.eyes || []) { const side = Math.sign(eye.position.x) || 1, q = eyeAt(side * .035); eye.position.set(q.x * s, q.y * s, q.z * s).divideScalar(u.head.scale.x || 1); eye.scale.setScalar(.0105 / .045); }
  // roles the game looks up
  for (const a of [u.armLG, u.armRG]) if (first.get(a)) a.userData.upper = first.get(a);
  for (const l of [u.legLG, u.legRG]) if (first.get(l)) l.userData.thigh = first.get(l);
  u.torso.userData.bodyMat = mat('torso-skin');
  u.cc359Atlas = { size: AT.size, ms: AT.ms, bytes: AT.bytes };
  u.head.userData.cc355CrownY = (1.8503 - 1.4321) * s;   // AG's crown over its head bone (pass 7)
}

// CC-359 step 4: the shambler's LOD1 (AG's lod 1 build: same loft keys, ~7.8k tris) as plain pieces for the LOD1 skin
// (Claude 2's skinZombieMesh: a second SkinnedMesh on the SAME bones and the same atlas material). Nothing calls this at the
// build, so LOD0 and every test stay as they are. Same mapping as shamblerV5Section (AG 'L' = the game's R, the neck yoke on
// the torso, the eyes left out). Returns [{ bone, geometry (bone-local, position/normal/color/uv in the atlas), name, zone,
// boot }]; boot pieces ride the shin here: prepareShamblerFeet's ankle move must be applied to them too.
let v5Lod1 = null;
export function shamblerLod1Parts(T, g, s = 1) {
  const u = g.userData, AG = v5Lod1 || (v5Lod1 = buildShamblerV5(T, { lod: 1 })), ab = AG.bones;
  const agHips = ab.hips.getWorldPosition(new T.Vector3()), elbow = (a) => a.userData.elbowG, shin = (l) => l.userData.shinG;
  const map = new Map([[ab.hips, u.hips], [ab.torso, u.torso], [ab.head, u.head], [ab.jaw, u.shamblerJaw || u.head], [ab.armL, u.armRG], [ab.armR, u.armLG],
    [ab.elbowL, elbow(u.armRG)], [ab.elbowR, elbow(u.armLG)], [ab.legL, u.legRG], [ab.legR, u.legLG], [ab.shinL, shin(u.legRG)], [ab.shinR, shin(u.legLG)],
    [ab.ankleL, shin(u.legRG)], [ab.ankleR, shin(u.legLG)]]);
  const boots = new Set([ab.ankleL, ab.ankleR]), AT = shamblerAtlas(T, { size: 512 });
  const restAt = (b) => { const v = new T.Vector3(); for (let o = b; o && o !== u.hips; o = o.parent) { v.multiply(o.scale).add(o.position); } return v; };
  const agBoneOf = (o) => { for (let n = o; n; n = n.parent) if (map.has(n)) return n; return null; };
  const inv = new T.Matrix4().copy(AG.root.matrixWorld).invert(), Mx = new T.Matrix4(), out = [];
  AG.root.updateMatrixWorld(true);
  AG.root.traverse((o) => {
    if (!o.isMesh || o.material === AG.eyeMat) return;
    let agB = agBoneOf(o); const gb0 = map.get(agB); if (!gb0) return;
    const geo = o.geometry.clone(); Mx.multiplyMatrices(inv, o.matrixWorld); geo.applyMatrix4(Mx);
    let gb = gb0; if (agB === ab.head && /neck-skin/.test(o.name)) { agB = ab.torso; gb = u.torso; }
    const off = restAt(gb); geo.translate(-agHips.x, -agHips.y, -agHips.z); geo.scale(s, s, s); geo.translate(-off.x, .025 * s - off.y, -off.z);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) geo.deleteAttribute(k);
    const sc = gb.scale.x || 1; if (sc !== 1) geo.scale(1 / sc, 1 / sc, 1 / sc);
    const zone = cc359AtlasZone(o.name), uv = geo.attributes.uv; geo.setAttribute('uv', new T.Float32BufferAttribute(cc359AtlasUV(uv, geo.attributes.position.count, AT.rects[zone] || AT.rects.skin), 2));
    out.push({ bone: gb, geometry: geo, name: o.name, zone, boot: boots.has(agB) });
  });
  return out;
}

// SCREAMER body skin (s23): see SECTIONS.screamer. Skin-role materials (and the concept's own skin) are cloned with the
// colour c' = mean(c) x (.55 x .85 / .46, .55 / .48, .55 x .93 / .50), so the game's body darkening lands on the face's grey.
const SCREAM_FACE = [.55 * .85 / .46, .55 / .48, .55 * .93 / .5];
function screamerBodySkin(M) {
  const out = {}, done = new Map();
  for (const [k, m] of Object.entries(M)) {
    if (!m?.isMaterial || !(m === M.skin || m.userData?.zombieColorRole === 'skin')) { out[k] = m; continue; }
    if (!done.has(m)) { const c = m.clone(), q = m.color, v = (q.r + q.g + q.b) / 3; c.color.setRGB(Math.min(1, v * SCREAM_FACE[0]), Math.min(1, v * SCREAM_FACE[1]), Math.min(1, v * SCREAM_FACE[2])); done.set(m, c); }
    out[k] = done.get(m);
  }
  return out;
}

// The materials a section draws with: the concept's own (M) plus those made here (they batch to vertex colour like the
// rest). With a look (cloud sheets), skinTint / decayTint / clothTint / clothSecondaryTint colour this individual.
function palette(A, T, M, look) {
  // every material made here carries its colour role for GP-20146's post-cache tint (userData.zombieColorRole, and
  // zombieColorBase = the hex of its family's main material, so a shade keeps its ratio to the tinted base)
  const c = (hex) => new T.Color(hex), mk = (col, surface, metal = 0, role = null, base = null) => {
    const m = A.mat(col, false, metal, surface); if (role) { m.userData.zombieColorRole = role; m.userData.zombieColorBase = base; } return m; };
  const skinC = look?.skinTint != null ? c(look.skinTint) : M.skin.color.clone(), SK = M.skin.color.getHex(), BL = 0x4a1d18;
  const skin = look?.skinTint != null ? mk(skinC.getHex(), M.skin.userData.surface || 'skin', 0, 'skin', SK) : M.skin;
  const decayC = c(look?.decayTint ?? 0x6a7259), cloth = look?.clothTint != null ? mk(look.clothTint, 'cloth', 0, 'cloth-primary', M.cloth.color.getHex()) : M.cloth, CL = M.cloth.color.getHex();
  // the vest reads apart from the skin: a dirty grey-beige by default, the look's secondary cloth lifted toward it
  const SH = 0x7d8072, shirtC = look?.clothSecondaryTint != null ? c(look.clothSecondaryTint).multiplyScalar(1.5).lerp(c(SH), .35) : c(SH);
  // value separation: the vest stays at least .2 in luminance below the skin (darker, so it reads as cloth in every light)
  { const L = (q) => .2126 * q.r + .7152 * q.g + .0722 * q.b, ls = L(skinC), lc = L(shirtC); if (lc > ls - .2) shirtC.multiplyScalar(Math.max(.25, (ls - .2) / Math.max(.01, lc))); }
  const shirt = mk(shirtC.getHex(), 'cloth', 0, 'cloth-secondary', SH), bloodC = look?.bloodTint ?? 0x3d1a14;
  const S = (col, sf = 'skin') => mk(col, sf, 0, 'skin', SK), Bd = (col, sf = 'skin') => mk(col, sf, 0, 'blood', BL);
  const clothShade = (k) => mk((cloth.color || M.cloth.color).clone().multiplyScalar(k).getHex(), 'cloth', 0, 'cloth-primary', CL);
  return {
    ...M, skin, cloth, shirt,
    decay: S(skinC.clone().lerp(decayC, .12).getHex()), skinMid: S(skinC.clone().multiplyScalar(.955).getHex()), skinDark: S(skinC.clone().multiplyScalar(.74).getHex()),
    socket: S(0x1f1714), lid: S(skinC.clone().lerp(c(0x4a3a3c), .3).getHex()), gum: Bd(0x3a2220), tongue: Bd(0x3a2224, 'wet'),
    deep: Bd(0x140a0a), flesh: Bd(0x5a2420), edge: S(skinC.clone().lerp(c(0x2a1c18), .62).getHex()),
    bruise: S(skinC.clone().lerp(c(0x4b3a4a), .38).getHex()),
    blood: mk(bloodC, 'cloth', 0, 'blood', BL), bloodDry: mk(shirtC.clone().lerp(c(0x5a3426), .55).getHex(), 'cloth', 0, 'cloth-secondary', SH),
    vein: S(skinC.clone().lerp(c(0x2c3c40), .58).getHex()), toothDark: mk(0x9a8a62, 'bone', 0, 'bone', 0xd8cfb4), nail: mk(0x8f8670, 'bone', 0, 'bone', 0xd8cfb4),
    bone: mk(0xd8cfb4, 'bone', 0, 'bone', 0xd8cfb4), dirt: S(skinC.clone().lerp(c(0x3d3428), .6).getHex()), grime: mk(shirtC.clone().lerp(c(0x5a4a36), .5).getHex(), 'cloth', 0, 'cloth-secondary', SH),
    shirtHem: mk(shirtC.clone().multiplyScalar(.8).getHex(), 'cloth', 0, 'cloth-secondary', SH), clothDark: clothShade(.72), clothMid: clothShade(.88),
    // neutral (untinted): belt, buckle, boots; the sole is its own material in the concept's sole colour (not hair)
    claw: mk(0x2b2620, 'bone'), rope: mk(0x6a5d48, 'cloth'), belt: mk(0x3b2c1f, 'leather'), metal: mk(0x6b6a60, 'metal', .4), sole: mk(0x27251f, 'root'), leatherWorn: mk(0x6e5a44, 'leather')
  };
}

// GP-20146's look record (makeZombieLook(type, seed)) -> this type's params. woundMask bits (humanoids): 1 neck bite,
// 2 forearm bite, 4 belly gash, 8 torn cheek, 16 scalp to bone, 32 torn lower lip; teethMask: bit i = upper tooth i
// (0-9), bit 10+i = lower tooth i (0-7); hairStyle 0-7 (0 bald); headWidth / headDepth / jawWidth (about 0.92-1.08);
// limbBuild, chestBuild, bellyBuild; dirt, wear 0..1; bloodTint. Missing fields keep the defaults.
const bit = (m, b) => ((m >>> 0) & b) !== 0;
export function humanoidParams(k, look) {
  const D = HUMANOID[k]; if (!D) return null;
  const P = JSON.parse(JSON.stringify(D)); if (!look) return P;
  const H = P.head;
  if (look.headWidth) H.w = D.head.w * look.headWidth;
  if (look.headDepth) H.depth = D.head.depth * look.headDepth;
  if (look.jawWidth) H.jaw = D.head.jaw * look.jawWidth;
  if (look.teethMask != null) { H.teeth = H.teeth.map((_, i) => bit(look.teethMask, 1 << i) ? 1 : 0); H.lowerTeeth = H.lowerTeeth.map((_, i) => bit(look.teethMask, 1 << (10 + i)) ? 1 : 0); }
  if (look.hairStyle != null) { H.hair = look.hairStyle ? 1 : 0; H.hairSeed = 3 + look.hairStyle * 17; H.strands = look.hairStyle ? 3 + look.hairStyle : 0; }
  if (look.limbBuild) P.body.muscle = D.body.muscle * look.limbBuild;
  if (look.chestBuild) P.body.chest = D.body.chest * look.chestBuild;
  if (look.bellyBuild) P.body.belly = D.body.belly * look.bellyBuild;
  if (look.seed != null) P.body.seed = 11 + (look.seed % 997);
  if (look.woundMask != null) { const w = look.woundMask; for (const b of [1, 2, 4]) P.wounds[b] = bit(w, b); for (const b of [8, 16, 32]) H.wounds[b] = bit(w, b); }
  if (look.dirt != null) P.dirt = look.dirt;
  if (look.wear != null) P.wear = look.wear;
  return P;
}

// Wound / woundless twins: ChatGPT's post-cache step (GP-20146) picks one of each pair. Until it is live (and whenever
// a look is given directly) only the selected alternative is kept, so no skin is ever drawn twice.
let keepPairs = false;
export function setHumanoidPairs(on) { keepPairs = !!on; }
// Only the types the Director has approved switch to the new body in the game; the others keep the concept body until
// their own sheet is approved (review builds open them with setHumanoidTypes).
const LIVE = new Set(['shambler', 'feral', 'screamer', 'military', 'bomber']);   // CC-355: feral v4 lit after the D-186 play build (Director approved feral s21; shambler re-lit 21:41Z after the t222 crown fix); screamer s22-s24 (jaw piece + legs, Director approved 16 Nov) lands after feral + faces
export function setHumanoidTypes(list) { LIVE.clear(); for (const k of list) LIVE.add(k); }
// A/B and review switch: index.html?humanoids=shambler,feral (or ?humanoids= for none) overrides LIVE for that page only.
try { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('humanoids') : null; if (q !== null) setHumanoidTypes(q.split(',').map((x) => x.trim()).filter((x) => HUMANOID_TYPES.includes(x))); } catch { }
export function refineHumanoid(A, T, g, s, k, M, look = null) {
  const section = SECTIONS[k];
  if (!section || !LIVE.has(k)) return false;
  stripBase(g);
  section(A, T, g, s, humanoidParams(k, look), palette(A, T, M, look));
  if (!keepPairs || look) { const dead = []; g.traverse((o) => { if (o.isMesh && o.userData.zombieFeature?.kind === 'woundless') dead.push(o); }); for (const o of dead) o.removeFromParent(); }
  return true;
}
// stable exports for other zombie modules (ChatGPT 2's specials may use them)
export { tube as humanoidTube, shell as humanoidShell, cord as humanoidCord };

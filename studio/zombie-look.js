// CC-366 (Jerry D-237 item 7, 21 Nov 2026): every zombie its own look. Jerry: "fighting a bunch of clones ... look and act
// just different enough from each other to feel like you are fighting individuals". REVIEW COPY (review/CC-366), not landed.
//
// Every body of a kind is a copy of one cached template (GP-20146), so they all wore the same colours, shirt, hair, teeth and
// wounds. This gives each body ONE seeded look, applied once when the body is built, to its own merged skin (skinZombieMesh
// already gives every body its own vertex buffers): no new draws, no new materials, no per-frame cost.
//
//   const look = makeZombieLook(kind, seed)       // a plain record; the same seed always gives the same look
//   applyZombieLook(THREE, g, kind, look)         // after skinZombieMesh(g): colours by zone, cut-outs, build; returns a report
//
// The seed: g.userData.lookSeed (a 32-bit number given when the body is made). Claude 5's CE-24 motion traits read the same
// seed, so a body's look and its walk come from one number.
//
// Shambler (step 1). The v5 body paints from one atlas: each vertex's zone is read from its atlas UV (tank top, trousers,
// head, neck, skin, boots, teeth, hair cards). Per body:
//   - shirt colour from a worn palette (or shirtless: the tank's triangles collapse to points; the closed torso skin is under it)
//   - rips in the shirt (patches of the tank collapse, so the skin shows through)
//   - trouser colour from a worn palette; dirt on the legs
//   - skin tone from very pale to very dark, and dead tints (grey-green, sallow, blue-grey, ruddy)
//   - hair: bald (the scalp paint lifted to the skin, the hair cards gone), the template's thin tufts, or a full head of hair
//     (the top and back of the scalp painted, the cards too), in black, browns, grey, white, ginger or dirty blond
//   - missing teeth (tooth slots collapse); rarely no lower jaw at all (the jaw joint's skin collapses)
//   - one-sided wounds painted on the skin (a bite, a gash, a torn cheek), blood run onto the shirt
//   - build: thin, average or heavy (the belly and waist reshaped in the bind pose, plus mesh.userData.variant.width, which
//     spawnZombie applies); height stays the game's own +-7%
// A collapsed triangle has its three corners at one point with the same skinning, so it never draws anything and never
// stretches. Nothing is added: the vertex count stays the same. Every shape change is a function of the vertex's own
// position and skin weights only, so corners shared by two triangles always move together (no cracks).
//
// s49 (Director 00:28Z push): more hair/bald and skin-tone spread so they read apart at 8 m; a few heavier/thinner builds.
// Speed (Claude 2's bar: a body build must not hitch): everything that is the same for every body of a template (zones,
// triangle lists, tooth slots, hair mask, wound candidates, per-bone vertex lists, the template's colour means) is worked out
// ONCE per template layout and cached; a body then only writes its own colours/cut-outs on the raw typed arrays.

import { shamblerAtlas } from './zombie-atlas.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function lookRandom(seed) {   // mulberry32
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function newLookSeed() { return (Math.random() * 4294967296) >>> 0; }

// Worn palettes (all under the 45% saturation cap; worked out against the template's own colours as multipliers).
const SHIRTS = [0x4f5238 /* the template's olive */, 0x8c887b, 0x3c4554, 0x6d4b37, 0x6c3b34, 0x7a6a3c, 0x3a3a3b, 0x5c6878, 0x7b7466, 0x4c5a4a, 0x9a958a, 0x2b2f36];
const PANTS = [0x4a3a2c /* brown */, 0x3d4a5e, 0x776b50, 0x2d2c2b, 0x56544f, 0x474a31, 0x5a4636, 0x2f3b52];
// skin: multipliers on the template skin (r, g, b), from very pale to very dark, then the dead tints. [mult, weight]
const SKINS = [
  [[1, 1, 1], 1], [[1.32, 1.3, 1.26], 1.2] /* very pale */, [[1.2, 1.17, 1.12], 1] /* pale */, [[1.16, 0.92, 0.88], 0.8] /* ruddy */,
  [[0.84, 0.98, 0.84], 0.8] /* grey-green */, [[1.1, 1.02, 0.72], 0.8] /* sallow */, [[0.8, 0.88, 1.04], 0.8] /* blue-grey */,
  [[0.84, 0.72, 0.6], 1] /* tan */, [[0.66, 0.55, 0.47], 1.1] /* brown */, [[0.48, 0.39, 0.34], 1.1] /* dark brown */,
  [[0.34, 0.28, 0.25], 1] /* very dark */, [[0.92, 0.84, 0.92], 0.6] /* lilac-grey */,
];
// hair colours as linear targets (what the scalp should read as under white light)
const HAIR_COLS = [[0.018, 0.015, 0.013] /* black */, [0.035, 0.024, 0.016] /* dark brown */, [0.075, 0.048, 0.028] /* brown */,
  [0.2, 0.19, 0.18] /* grey */, [0.42, 0.41, 0.39] /* white */, [0.16, 0.06, 0.025] /* ginger */, [0.24, 0.18, 0.09] /* dirty blond */,
  [0.026, 0.022, 0.02] /* black */, [0.12, 0.115, 0.11] /* salt and pepper */];

function pickW(r, list) { let t = 0; for (const [, w] of list) t += w; let x = r() * t; for (const [v, w] of list) { if ((x -= w) <= 0) return v; } return list[0][0]; }

export function makeZombieLook(kind, seed) {
  const r = lookRandom(seed ^ 0x9e3779b9), pick = (a) => a[Math.floor(r() * a.length) % a.length];
  const look = { kind, seed: seed >>> 0 };
  look.shirt = r() < 0.12 ? null : pick(SHIRTS);          // null = shirtless
  look.rips = look.shirt == null ? 0 : (r() < 0.35 ? 0 : 0.25 + r() * 0.75);
  look.pants = pick(PANTS);
  const sk = pickW(r, SKINS), lit = 0.9 + r() * 0.2;
  look.skin = sk.map((v) => v * lit);
  const hr = r();
  look.hairStyle = hr < 0.32 ? 'bald' : hr < 0.52 ? 'thin' : 'full';
  look.hairCol = look.hairStyle === 'bald' ? null : pick(HAIR_COLS);
  look.hairLine = r();                                      // how low the full hair comes (front and back)
  look.teethGone = r() < 0.25 ? 0 : 0.15 + r() * 0.55;     // share of tooth slots missing
  look.noJaw = r() < 0.07;
  look.wounds = [];
  const nW = r() < 0.2 ? 0 : r() < 0.6 ? 1 : 2;
  const SPOTS = ['neck', 'shoulder', 'forearm', 'cheek', 'chest', 'thigh'];
  for (let i = 0; i < nW; i++) look.wounds.push({ at: pick(SPOTS), side: r() < 0.5 ? -1 : 1, size: 0.8 + r() * 0.6, u: r(), v: r() });
  look.dirt = r();
  const br = r();
  look.buildType = br < 0.2 ? 'thin' : br > 0.8 ? 'heavy' : 'average';
  look.build = look.buildType === 'thin' ? 0.86 + r() * 0.05 : look.buildType === 'heavy' ? 1.1 + r() * 0.06 : 0.94 + r() * 0.12;
  look.belly = look.buildType === 'heavy' ? 0.7 + r() * 0.3 : look.buildType === 'thin' ? -(0.6 + r() * 0.4) : (r() - 0.5) * 0.3;
  look.height = 0.94 + r() * 0.12;
  look.n = r();
  return look;
}

// ---- the atlas zones ------------------------------------------------------------------------------------------------
const ZN = ['none', 'head', 'tank', 'neck', 'skin', 'boot', 'pants', 'cavity', 'teeth', 'metal', 'hair'];
const Z = Object.fromEntries(ZN.map((n, i) => [n, i]));
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const texMeans = new WeakMap();
function zoneTexMean(map, rects) {   // the atlas colour's mean per zone (linear), so a target colour can be hit as a multiplier
  if (!map || !map.image || !map.image.data) return {};
  let m = texMeans.get(map); if (m) return m;
  m = {}; const { data, width: W, height: H } = map.image;
  for (const [name, q] of Object.entries(rects)) {
    let r = 0, g = 0, b = 0, n = 0;
    const x0 = Math.floor(q.u0 * W), x1 = Math.ceil(q.u1 * W), y0 = Math.floor(q.v0 * H), y1 = Math.ceil(q.v1 * H);   // DataTexture rows bottom-up = v
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * W + x) * 4; r += toLin(data[i]); g += toLin(data[i + 1]); b += toLin(data[i + 2]); n++; }
    m[name] = n ? [r / n, g / n, b / n] : [1, 1, 1];
  }
  texMeans.set(map, m);
  return m;
}
const hexLin = (h, T) => { const c = new T.Color(h); return [c.r, c.g, c.b]; };   // three's Color from hex is linear (ColorManagement)

// cheap smooth noise for rips, hairlines and wound edges (no closures: it runs for thousands of vertices per body)
function nh(i, j, k, s) { let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1440662683) + Math.imul(s, 2654435761); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
// a cheaper smooth wobble (three seeded sines) for the dirt, the hairline and the wound edges
function snoise(x, y, z, s) {
  const a = ((s * 0.6180339887) % 1) * 6.2832;
  return 0.5 + (Math.sin(x + y * 0.31 + a) + Math.sin(y * 1.13 - z * 0.7 + a * 1.7) + Math.sin(z * 0.93 + x * 0.57 + a * 2.3)) / 6;
}
function vnoise(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const a0 = nh(xi, yi, zi, s), a1 = nh(xi + 1, yi, zi, s), a2 = nh(xi, yi + 1, zi, s), a3 = nh(xi + 1, yi + 1, zi, s);
  const b0 = nh(xi, yi, zi + 1, s), b1 = nh(xi + 1, yi, zi + 1, s), b2 = nh(xi, yi + 1, zi + 1, s), b3 = nh(xi + 1, yi + 1, zi + 1, s);
  const ya = (a0 + (a1 - a0) * u) + ((a2 + (a3 - a2) * u) - (a0 + (a1 - a0) * u)) * v;
  const yb = (b0 + (b1 - b0) * u) + ((b2 + (b3 - b2) * u) - (b0 + (b1 - b0) * u)) * v;
  return ya + (yb - ya) * w;
}

function skinOf(g) { let s = null; g.traverse((o) => { if (!s && o.isSkinnedMesh && o.userData.zombieSkin && o.geometry.attributes.uv) s = o; }); return s; }

// ---- the per-template layout (worked out once, shared by every body of that template) ---------------------------------
const layouts = new Map();
const NF = 4;   // s50: seeded noise variants per template
export function lookLayoutCount() { return layouts.size; }
function layoutKey(geo) {   // UVs and skin indices only: the bind pose differs per body (the game's tilt/lean are baked in)
  const U = geo.attributes.uv.array, SI = geo.attributes.skinIndex.array, n = geo.attributes.position.count;
  let h = n | 0;
  for (let k = 0; k < 97; k++) { const i = Math.floor((k * n) / 97); h = (Math.imul(h, 31) + Math.round(U[i * 2] * 8192) * 7 + Math.round(U[i * 2 + 1] * 8192) + SI[i * 4] * 131) | 0; }
  return n + ':' + h;
}
function buildLayout(T, skin, atlas, u) {
  const geo = skin.geometry, A = geo.attributes, n = A.position.count;
  const P = A.position.array, Ua = A.uv.array, Ca = A.color.array, cs = A.color.itemSize;
  const SI = A.skinIndex.array, SW = A.skinWeight.array;
  const rects = atlas.rects, zl = Object.entries(rects).map(([name, q]) => [Z[name] ?? 0, q]);
  const zone = new Uint8Array(n), bone = new Int16Array(n);
  const counts = new Int32Array(ZN.length);
  for (let i = 0; i < n; i++) {
    const uu = Ua[i * 2], vv = Ua[i * 2 + 1];
    let zc = 0; for (const [c, q] of zl) if (uu >= q.u0 - 1e-4 && uu <= q.u1 + 1e-4 && vv >= q.v0 - 1e-4 && vv <= q.v1 + 1e-4) { zc = c; break; }
    zone[i] = zc; counts[zc]++;
    bone[i] = SW[i * 4] >= 0.5 ? SI[i * 4] : -1;
  }
  const lists = ZN.map((_, c) => new Int32Array(counts[c]));
  const fill = new Int32Array(ZN.length);
  for (let i = 0; i < n; i++) lists[zone[i]][fill[zone[i]]++] = i;
  const tris = n / 3 | 0, triLists = {};
  for (const name of ['tank', 'teeth', 'hair']) { const a = []; for (let t = 0; t < tris; t++) if (zone[t * 3] === Z[name]) a.push(t); triLists[name] = Int32Array.from(a); }
  // the template's own colour mean per zone (every body of the template starts from these)
  const cmean = {};
  for (const name of ['tank', 'pants', 'neck', 'head']) { const L = lists[Z[name]]; let r = 0, g = 0, b = 0; for (const i of L) { r += Ca[i * cs]; g += Ca[i * cs + 1]; b += Ca[i * cs + 2]; } cmean[name] = L.length ? [r / L.length, g / L.length, b / L.length] : null; }
  // the template's scalp paint: how much of each head vertex is hair paint. The hair is painted in the atlas's head tile
  // (and a little in the vertex colours), so each head vertex reads its texel (3x3 mean) at its UV. Shared by every body of
  // the template; which of them are on the scalp is per body (bodyShape).
  const nk = cmean.neck || [0.3, 0.25, 0.2], Ls = 0.2126 * nk[0] + 0.7152 * nk[1] + 0.0722 * nk[2];
  const head = lists[Z.head], hn = head.length;
  const headK = new Float32Array(hn), headTex = new Float32Array(hn * 3).fill(1);
  const map = atlas.options && atlas.options.map, img = map && map.image;
  let ref = [1, 1, 1];
  if (img && img.data) {
    const { data, width: W, height: Hh } = img, lum = new Float32Array(hn);
    for (let k = 0; k < hn; k++) {
      const i = head[k], x = Math.min(W - 2, Math.max(1, Math.floor(Ua[i * 2] * W))), y = Math.min(Hh - 2, Math.max(1, Math.floor(Ua[i * 2 + 1] * Hh)));
      let r = 0, g = 0, b = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = ((y + dy) * W + x + dx) * 4; r += toLin(data[o]); g += toLin(data[o + 1]); b += toLin(data[o + 2]); }
      headTex[k * 3] = r / 9; headTex[k * 3 + 1] = g / 9; headTex[k * 3 + 2] = b / 9;
      lum[k] = 0.2126 * headTex[k * 3] + 0.7152 * headTex[k * 3 + 1] + 0.0722 * headTex[k * 3 + 2];
    }
    // the skin's own texel: the mean of the brighter 60% of the head (the face and scalp skin, not the paint)
    const sorted = Float32Array.from(lum).sort(), cut = sorted[Math.floor(hn * 0.4)] || 0;
    let r = 0, g = 0, b = 0, c = 0; for (let k = 0; k < hn; k++) if (lum[k] >= cut) { r += headTex[k * 3]; g += headTex[k * 3 + 1]; b += headTex[k * 3 + 2]; c++; }
    if (c) ref = [r / c, g / c, b / c];
    const refL = 0.2126 * ref[0] + 0.7152 * ref[1] + 0.0722 * ref[2];
    for (let k = 0; k < hn; k++) headK[k] = clamp((refL * 0.75 - lum[k]) / Math.max(0.005, refL * 0.45), 0, 1);
  }
  for (let k = 0; k < hn; k++) { const i = head[k], L = 0.2126 * Ca[i * cs] + 0.7152 * Ca[i * cs + 1] + 0.0722 * Ca[i * cs + 2]; headK[k] = Math.max(headK[k], clamp((Ls * 0.8 - L) / Math.max(0.01, Ls * 0.5), 0, 1)); }
  // vertices per dominant bone (for wounds)
  const byBone = new Map();
  for (let i = 0; i < n; i++) { const b = bone[i]; let a = byBone.get(b); if (!a) byBone.set(b, a = []); a.push(i); }
  for (const [b, a] of byBone) byBone.set(b, Int32Array.from(a));
  // s50: each bone's vertices in height order (1 cm bins, a counting sort: no comparator), for the wounds' band walk
  const byBoneY = new Map();
  for (const [b, L] of byBone) {
    let lo = Infinity, hi = -Infinity; for (let k = 0; k < L.length; k++) { const y = P[L[k] * 3 + 1]; if (y < lo) lo = y; if (y > hi) hi = y; }
    const nb = Math.max(1, Math.ceil((hi - lo) / 0.01) + 1), cnt = new Int32Array(nb + 1);
    for (let k = 0; k < L.length; k++) cnt[1 + Math.min(nb - 1, ((P[L[k] * 3 + 1] - lo) / 0.01) | 0)]++;
    for (let q = 0; q < nb; q++) cnt[q + 1] += cnt[q];
    const idx = new Int32Array(L.length), y = new Float32Array(L.length), at = cnt.slice(0, nb);
    for (let k = 0; k < L.length; k++) { const c = Math.min(nb - 1, ((P[L[k] * 3 + 1] - lo) / 0.01) | 0), o = at[c]++; idx[o] = L[k]; y[o] = lo + c * 0.01; }
    byBoneY.set(b, { idx, y });
  }
  // how much each vertex follows the body's trunk (torso/hips bones): for the belly and waist reshaping
  const bones = skin.skeleton ? skin.skeleton.bones : [];
  const trunkSet = new Set([u.torso, u.hips, u.pelvis, u.body].filter(Boolean).map((o) => bones.indexOf(o)).filter((i) => i >= 0));
  const trunkW = new Float32Array(n);
  if (trunkSet.size) for (let i = 0; i < n; i++) { let w = 0; for (let j = 0; j < 4; j++) if (trunkSet.has(SI[i * 4 + j])) w += SW[i * 4 + j]; trunkW[i] = w; }
  const trunkV = []; for (let i = 0; i < n; i++) if (trunkW[i] >= 0.05) trunkV.push(i);
  // s50 (speed, ChatGPT GP-20226: spawn frames over 33 ms 22 -> 52): the noise fields are worked out ONCE per template, in
  // NF seeded variants; a body picks one (and a little of a second) instead of running the noise on thousands of vertices.
  const tank = triLists.tank, ripN = [];
  for (let f = 0; f < NF; f++) { const a = new Float32Array(tank.length); for (let k = 0; k < tank.length; k++) { const p = tank[k] * 9, x = P[p], y = P[p + 1], z = P[p + 2];
    a[k] = vnoise(x * 11 + 3, y * 7, z * 11, 77 + f * 101) * 0.65 + vnoise(x * 29, y * 23, z * 29, 78 + f * 101) * 0.35; } ripN.push(a); }
  const legs = [...lists[Z.pants], ...lists[Z.boot]], dirtN = [], capN = [];
  for (let f = 0; f < NF; f++) { const a = new Float32Array(legs.length); for (let k = 0; k < legs.length; k++) { const i = legs[k]; a[k] = snoise(P[i * 3] * 20, P[i * 3 + 1] * 20, P[i * 3 + 2] * 20, 5 + f * 37); } dirtN.push(a); }
  for (let f = 0; f < NF; f++) { const a = new Float32Array(hn); for (let k = 0; k < hn; k++) { const i = head[k]; a[k] = snoise(P[i * 3] * 40, P[i * 3 + 1] * 40, P[i * 3 + 2] * 40, 9 + f * 53) - 0.5; } capN.push(a); }
  // per-body scratch (applyZombieLook runs to the end in one go, so one set per template is enough): no garbage per body
  const scratch = { hairV: new Int32Array(hn), hairK: new Float32Array(hn), capV: new Int32Array(hn), capY: new Float32Array(hn), capF: new Float32Array(hn),
    slotOf: new Int32Array(triLists.teeth.length), cutMark: new Uint8Array(tris), cutList: new Int32Array(tris) };
  return { n, zone, bone, lists, triLists, cmean, headK, headTex, headRef: ref, byBone, trunkW, trunkV: Int32Array.from(trunkV), trunk: trunkSet.size,
    ripN, legs: Int32Array.from(legs), dirtN, capN, byBoneY, scratch };
}
// What depends on this body's own bind pose (the game bakes each body's tilt and lean in before the skin): bounds, the
// scalp, the hair cap, the tooth slots.
function bodyShape(Lo, P) {
  const n = Lo.n, lists = Lo.lists;
  // the body's height: the boots are its lowest point, the head (or the hair) its highest (s50: these lists, not all 108k)
  let y0 = Infinity, y1 = -Infinity;
  const ends = [lists[Z.boot], lists[Z.head], lists[Z.hair]];
  if (ends[0].length && ends[1].length) { for (const L of ends) for (let k = 0; k < L.length; k++) { const y = P[L[k] * 3 + 1]; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  else for (let i = 1; i < n * 3; i += 3) { const y = P[i]; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const H = y1 - y0;
  const head = lists[Z.head];
  let hb = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (const i of head) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; if (x < hb[0]) hb[0] = x; if (x > hb[1]) hb[1] = x; if (y < hb[2]) hb[2] = y; if (y > hb[3]) hb[3] = y; if (z < hb[4]) hb[4] = z; if (z > hb[5]) hb[5] = z; }
  const S = Lo.scratch, hairV = S.hairV, hairK = S.hairK, capV = S.capV, capY = S.capY, capF = S.capF;
  let nHair = 0, nCap = 0;
  const hcz = (hb[4] + hb[5]) / 2, hh = Math.max(0.01, hb[3] - hb[2]), hd = Math.max(0.01, (hb[5] - hb[4]) / 2), ys = y0 + H * 0.905;
  for (let k = 0; k < head.length; k++) {
    const i = head[k], yy = P[i * 3 + 1];
    const y = (yy - hb[2]) / hh; if (y < 0.45) continue;
    const f = (P[i * 3 + 2] - hcz) / hd;
    // the scalp paint, by the place on this head (a bowed head sits lower in the body, s49)
    if (Lo.headK[k] > 0 && (yy >= ys || y > 0.66) && (f < 0.4 || y > 0.8)) { hairV[nHair] = k; hairK[nHair++] = Lo.headK[k]; }
    capV[nCap] = k; capY[nCap] = y; capF[nCap++] = f;
  }
  const tt = Lo.triLists.teeth;
  let ty = 0; for (const i of lists[Z.teeth]) ty += P[i * 3 + 1]; ty /= lists[Z.teeth].length || 1;
  const slotOf = S.slotOf;
  for (let k = 0; k < tt.length; k++) { const a = tt[k] * 3, cx = (P[a * 3] + P[a * 3 + 3] + P[a * 3 + 6]) / 3, cy = (P[a * 3 + 1] + P[a * 3 + 4] + P[a * 3 + 7]) / 3; slotOf[k] = Math.round(cx / 0.0075) * 2 + (cy > ty ? 1 : 0); }
  return { y0, H, hairV, hairK, nHair, capV, capY, capF, nCap, slotOf };
}

// 6. one wound's paint over one bone's height band, in its own function (s50: the compiler keeps the hot loop fast). Returns
// how many vertices it painted (the dark middle and the raw ring).
function paintWound(sb, P, N, Ca, cs, zone, ox, oy, oz, nx0, ny0, nz0, R, ky, runs, s, deep, red, bruise, blood) {
  const yLo = oy - R * 5.5 - 0.16, yHi = oy + R * 2.5 + 0.16;   // the band (+1 cm for the bins); the walk starts by halving
  const Y = sb.y, I = sb.idx, zT = Z.teeth, zB = Z.boot, zM = Z.metal, zC = Z.cavity, zH = Z.hair, zK = Z.tank, zP = Z.pants;
  let lo = 0, hi = Y.length; while (lo < hi) { const m = (lo + hi) >> 1; if (Y[m] < yLo) lo = m + 1; else hi = m; }
  const R2 = R * R * 25;
  let painted = 0;
  const lerp = (i, c, k) => { const o = i * cs; Ca[o] += (c[0] - Ca[o]) * k; Ca[o + 1] += (c[1] - Ca[o + 1]) * k; Ca[o + 2] += (c[2] - Ca[o + 2]) * k; };
  for (let q = lo; q < Y.length && Y[q] <= yHi; q++) {
    const i = I[q], zz = zone[i]; if (zz === zT || zz === zB || zz === zM || zz === zC || zz === zH) continue;
    const dx = P[i * 3] - ox, dy = P[i * 3 + 1] - oy, dz = P[i * 3 + 2] - oz, h2 = dx * dx + dz * dz;
    if (h2 > R2 || dy > R * 2.5 || dy < -R * 5.5) continue;   // far from it
    if (N[i * 3] * nx0 + N[i * 3 + 1] * ny0 + N[i * 3 + 2] * nz0 < 0.15) continue;   // only the side it is on
    const d = Math.sqrt(h2 + dy * dy * ky), dh = Math.sqrt(h2);
    if (d > R * 2.2 && !(runs && dy < 0 && dy > -R * 5 && dh < R * 0.5)) continue;
    const e = R * (0.75 + 0.5 * snoise(P[i * 3] * 60, P[i * 3 + 1] * 60, P[i * 3 + 2] * 60, s + 31));
    if (d < e * 0.45) { lerp(i, deep, 0.92); painted++; }
    else if (d < e) { lerp(i, red, 0.85 * (1 - (d - e * 0.45) / (e * 0.55)) + 0.15); painted++; }
    else if (d < e * 1.7 && zz !== zK && zz !== zP) lerp(i, bruise, 0.4 * (1 - (d - e) / (e * 0.7)));
    else if (runs && dy < 0 && dy > -R * 5 && dh < R * 0.4 * (1 + dy / (R * 5)) + 0.006 * Math.sin(dy * 40)) lerp(i, blood, 0.7);
  }
  return painted;
}

// Which vertices a wound on these bones and zones may start on: the same for every body of a template (s50: worked out
// once, with the layout).
function woundBase(Lo, bones, zones) {
  let zm = 0; for (const zz of zones) zm |= 1 << zz;
  const wc = Lo.woundCache || (Lo.woundCache = new Map()), key = bones.join(',') + '|' + zm;
  let base = wc.get(key);
  if (!base) {
    const zone = Lo.zone, a = [], z0 = [];
    for (const b of bones) for (const i of (Lo.byBone.get(b) || [])) if ((zm >> zone[i]) & 1 && i % 3 === 0) a.push(i);
    for (const i of (Lo.byBone.get(bones[0]) || [])) if ((zm >> zone[i]) & 1) z0.push(i);
    base = { cand: Int32Array.from(a), zone0: Int32Array.from(z0), tmp: new Int32Array(a.length) };
    wc.set(key, base);
  }
  return base;
}

// 7. the belly and waist, in its own function (s50: the compiler keeps a small hot loop fast)
function shapeBelly(P, TV, tw, y0, H, b) {
  const hMid = 0.6, hHalf = 0.14;   // the waist and belly band, as a share of the body's height
  // the trunk's own middle in the band (the whole body's box is pulled forward by the reaching arms)
  let cx = 0, cz = 0, cw = 0;
  for (let k = 0; k < TV.length; k++) { const i = TV[k], q = ((P[i * 3 + 1] - y0) / H - hMid) / hHalf; if (q <= -1 || q >= 1) continue; const w = tw[i]; cx += P[i * 3] * w; cz += P[i * 3 + 2] * w; cw += w; }
  if (!(cw > 0)) return;
  cx /= cw; cz /= cw;
  const kx = b > 0 ? 0.1 : 0.09, kf = b > 0 ? 0.85 : 0.35;
  for (let k = 0; k < TV.length; k++) {
    const i = TV[k], w = tw[i];
    const h = (P[i * 3 + 1] - y0) / H, q = (h - hMid) / hHalf; if (q <= -1 || q >= 1) continue;
    const band = w * (1 - q * q) * (1 - q * q) * (q < 0 ? 1 : 1 - q * 0.35);   // the belly sits a little low
    const x = P[i * 3] - cx, z = P[i * 3 + 2] - cz;
    P[i * 3] = cx + x * (1 + kx * b * band);
    P[i * 3 + 2] = cz + z * (1 + 0.05 * b * band) + (z > 0 ? z : 0) * kf * b * band;
  }
}

export function applyZombieLook(T, g, kind, look, opts = {}) {
  const u = g.userData;
  if (!look || u.zombieLook) return null;
  if (kind !== 'shambler') return null;   // step 1: the shambler only
  const skin = skinOf(g);
  const atlas = opts.atlas || shamblerAtlas(T, { size: 512 });   // the shambler's shared atlas (built once per page)
  if (!skin || !atlas) return null;
  const geo = skin.geometry, A = geo.attributes;
  if (!A.color || !A.skinIndex || !A.skinWeight || A.position.isInterleavedBufferAttribute || A.color.isInterleavedBufferAttribute || A.position.itemSize !== 3) return null;
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const key = layoutKey(geo);
  let Lo = layouts.get(key);
  const fresh = !Lo;
  if (!Lo) {
    Lo = buildLayout(T, skin, atlas, u); if (layouts.size > 16) layouts.clear(); layouts.set(key, Lo);
    // s50: every wound spot's start list now, with the layout (the first body, at the loading pool), not at a spawn
    const bs = skin.skeleton ? skin.skeleton.bones : [], bx = (o) => (o ? bs.indexOf(o) : -1);
    for (const side of [-1, 1]) { const arm = side < 0 ? u.armLG : u.armRG, leg = side < 0 ? u.legLG : u.legRG;
      for (const [b, zs] of [[[bx(u.torso), bx(u.head)], [Z.neck]], [[bx(arm)], [Z.skin]], [[bx(arm && arm.userData.elbowG)], [Z.skin]], [[bx(u.head)], [Z.head]],
        [[bx(u.torso)], [Z.skin]], [[bx(u.torso)], [Z.tank]], [[bx(leg)], [Z.pants]]]) if (b[0] >= 0) woundBase(Lo, b, zs); }
  }
  const t1 = typeof performance !== 'undefined' ? performance.now() : 0;
  const n = Lo.n, P = A.position.array, Ca = A.color.array, cs = A.color.itemSize, SI = A.skinIndex.array, SW = A.skinWeight.array;
  const zone = Lo.zone, lists = Lo.lists;
  const tex = zoneTexMean(atlas.options && atlas.options.map, atlas.rects);
  const report = { kind, seed: look.seed, collapsed: 0, layout: fresh ? 'built' : 'cached' };
  const mulList = (list, f) => { const a = f[0], b = f[1], c = f[2]; for (let k = 0; k < list.length; k++) { const o = list[k] * cs; Ca[o] *= a; Ca[o + 1] *= b; Ca[o + 2] *= c; } };
  const mulV = (i, f) => { const o = i * cs; Ca[o] *= f[0]; Ca[o + 1] *= f[1]; Ca[o + 2] *= f[2]; };
  const lerpTo = (i, c, k) => { const o = i * cs; Ca[o] += (c[0] - Ca[o]) * k; Ca[o + 1] += (c[1] - Ca[o + 1]) * k; Ca[o + 2] += (c[2] - Ca[o + 2]) * k; };
  const ratioTo = (name, hex) => { const m = Lo.cmean[name], t = tex[name] || [1, 1, 1], q = hexLin(hex, T); if (!m) return null;
    const L = 0.2126 * q[0] + 0.7152 * q[1] + 0.0722 * q[2], w = q.map((v) => v + (L - v) * 0.2);
    return w.map((v, j) => clamp(v / Math.max(0.004, m[j] * t[j]), 0.15, 4)); };
  const mark = Lo.scratch.cutMark, cutList = Lo.scratch.cutList; let nCut = 0;
  const collapse = (tri) => {
    if (mark[tri]) return;
    mark[tri] = 1; cutList[nCut++] = tri;
    const a = tri * 3, p = a * 3, s4 = a * 4;
    for (let j = 1; j < 3; j++) { P[p + j * 3] = P[p]; P[p + j * 3 + 1] = P[p + 1]; P[p + j * 3 + 2] = P[p + 2]; for (let q = 0; q < 4; q++) { SI[s4 + j * 4 + q] = SI[s4 + q]; SW[s4 + j * 4 + q] = SW[s4 + q]; } }
  };
  const B = bodyShape(Lo, P), y0 = B.y0, H = B.H, s = look.seed & 0xffff;
  const skinTint = look.skin;

  // 1. the skin tone: skin, head and neck zones
  mulList(lists[Z.skin], skinTint); mulList(lists[Z.head], skinTint); mulList(lists[Z.neck], skinTint);
  // 2. the hair
  {
    const style = look.hairStyle || (look.hair === null ? 'bald' : 'thin');
    const tHair = tex.hair || [1, 1, 1];
    const hc = look.hairCol;
    const head = lists[Z.head], HT = Lo.headTex, ref = Lo.headRef;
    // the vertex colour that makes head vertex k (head-list index) read as colour c: c over its own texel
    const hairAt = (k, c, out) => { for (let j = 0; j < 3; j++) out[j] = clamp(c[j] / Math.max(0.004, HT[k * 3 + j]), 0, 6); return out; };
    const tmp = [0, 0, 0];
    if (style === 'bald') {
      // lift the paint to this body's own skin: its vertex colour times the skin texel over this texel
      for (let q = 0; q < B.nHair; q++) { const k = B.hairV[q], i = head[k], o = i * cs;
        for (let j = 0; j < 3; j++) tmp[j] = Ca[o + j] * clamp(ref[j] / Math.max(0.004, HT[k * 3 + j]), 1, 6) * 0.94;
        lerpTo(i, tmp, Math.min(1, B.hairK[q] * 1.6)); }
      for (const t of Lo.triLists.hair) collapse(t);
    } else {
      for (let q = 0; q < B.nHair; q++) { const k = B.hairV[q]; lerpTo(head[k], hairAt(k, hc, tmp), Math.min(1, B.hairK[q] * 1.3)); }
      const wc = hc.map((v, j) => clamp(v / Math.max(0.004, tHair[j]), 0, 4));
      for (const i of lists[Z.hair]) lerpTo(i, wc, 0.85);
      if (style === 'full') {
        // a cap: the top of the head, lower at the back, a hairline above the brow; a soft ragged edge
        const front = 0.78 - look.hairLine * 0.06, back = 0.5 + (1 - look.hairLine) * 0.12;
        let capN = 0;
        const CN = Lo.capN[s % NF];
        for (let q = 0; q < B.nCap; q++) {
          const k = B.capV[q], i = head[k], f = B.capF[q], y = B.capY[q];
          const line = f > 0 ? front + f * 0.08 : front + (back - front) * Math.min(1, -f * 1.2);
          const e = line + CN[k] * 0.06;
          const kk = clamp((y - e) / 0.04, 0, 1);
          if (kk > 0) { lerpTo(i, hairAt(k, hc, tmp), kk * 0.92); capN++; }
        }
        report.capVerts = capN;
      }
    }
    report.hair = style + (hc ? ' ' + hc.map((v) => v.toFixed(3)).join(',') : '');
  }
  // 3. the shirt: colour, rips, or none
  const tank = Lo.triLists.tank;
  if (look.shirt == null) { for (const t of tank) collapse(t); report.shirt = 'none'; }
  else {
    const f = ratioTo('tank', look.shirt); if (f) mulList(lists[Z.tank], f);
    if (look.rips > 0) {
      const cut = 0.9 - look.rips * 0.2, fa = s % NF, fb = (fa + 1 + ((s >> 4) % (NF - 1))) % NF, wb = ((s >> 8) & 255) / 255 * 0.3;
      const RA = Lo.ripN[fa], RB = Lo.ripN[fb];
      for (let k = 0; k < tank.length; k++) if (RA[k] + (RB[k] - 0.5) * wb > cut) collapse(tank[k]);
    }
    report.shirt = '#' + look.shirt.toString(16);
  }
  // 4. the trousers, and dirt on the legs
  { const f = ratioTo('pants', look.pants); if (f) mulList(lists[Z.pants], f);
    const d = look.dirt * 0.45;
    const LG = Lo.legs, DN = Lo.dirtN[(s >> 2) % NF];
    if (d > 0.02) for (let q = 0; q < LG.length; q++) { const i = LG[q], h = (P[i * 3 + 1] - y0) / H; if (h > 0.4) continue;
      const k = d * clamp((0.4 - h) / 0.3, 0, 1) * (0.5 + DN[q]); const o = i * cs; Ca[o] *= 1 - k * 0.55; Ca[o + 1] *= 1 - k * 0.6; Ca[o + 2] *= 1 - k * 0.7; } }
  // 5. teeth (slots by x along the arch, upper and lower) and, rarely, the whole lower jaw
  const bones = skin.skeleton ? skin.skeleton.bones : [];
  const jawIdx = u.shamblerJaw ? bones.indexOf(u.shamblerJaw) : -1;
  if (look.noJaw && jawIdx >= 0) {
    const L = Lo.byBone.get(jawIdx) || [];
    const seen = new Set();
    for (const i of L) { const t = i / 3 | 0; if (seen.has(t)) continue; seen.add(t); const a = t * 3; if (SI[a * 4] === jawIdx && SW[a * 4] > 0.5 && SI[(a + 1) * 4] === jawIdx && SI[(a + 2) * 4] === jawIdx) collapse(t); }
    report.jaw = 'gone';
  }
  if (look.teethGone > 0) {
    const r = lookRandom(look.seed ^ 0x51ed), slots = new Map(), tt = Lo.triLists.teeth;
    for (let k = 0; k < tt.length; k++) { const key = B.slotOf[k]; if (!slots.has(key)) slots.set(key, r() < look.teethGone); if (slots.get(key)) collapse(tt[k]); }
    report.teethSlots = [...slots.values()].filter(Boolean).length + '/' + slots.size;
  }
  // 6. wounds, painted on the skin on one side: a dark wet middle, a raw red ring, a bruise round it; neck and chest
  //    wounds run blood down onto the shirt
  const red = hexLin(0x6a1a12, T), deep = hexLin(0x1a0706, T), bruise = hexLin(0x3b2a34, T), blood = hexLin(0x3a1210, T);
  const N = A.normal.array, bone = Lo.bone;
  const bi = (o) => (o ? bones.indexOf(o) : -1);
  const armOf = (side) => (side < 0 ? u.armLG : u.armRG), legOf = (side) => (side < 0 ? u.legLG : u.legRG);   // the game's armLG is at -x
  const tankZ = Z.tank;
  for (const w of look.wounds) {
    const side = w.side, at = w.at, r = lookRandom(look.seed ^ Math.floor(w.u * 1e6));
    const arm = armOf(side), leg = legOf(side);
    const where = {
      neck: { bones: [bi(u.torso), bi(u.head)], zones: [Z.neck], face: [side, 0, 0.6], R: 0.06 },
      shoulder: { bones: [bi(arm)], zones: [Z.skin], face: [side, 0.3, 0.3], R: 0.08 },
      forearm: { bones: [bi(arm && arm.userData.elbowG)], zones: [Z.skin], face: [side * 0.6, 0, 0.8], R: 0.07 },
      cheek: { bones: [bi(u.head)], zones: [Z.head], face: [side, -0.2, 0.5], R: 0.05, below: 0.5 },
      chest: { bones: [bi(u.torso)], zones: look.shirt == null ? [Z.skin] : [Z.tank], face: [side * 0.3, 0, 1], R: 0.08 },
      thigh: { bones: [bi(leg)], zones: [Z.pants], face: [side * 0.4, 0, 1], R: 0.08 },
    }[at];
    if (!where || where.bones[0] < 0) continue;
    let cand;
    {
      const f = where.face, fl = Math.hypot(f[0], f[1], f[2]), fx = f[0] / fl, fy = f[1] / fl, fz = f[2] / fl;
      const base = woundBase(Lo, where.bones, where.zones);
      let ylo = Infinity, yhi = -Infinity;
      if (where.below) for (const i of base.zone0) { const y = P[i * 3 + 1]; if (y < ylo) ylo = y; if (y > yhi) yhi = y; }
      const yCap = ylo + (yhi - ylo) * (where.below || 0);
      let nc = 0;
      for (const i of base.cand) {
        if (N[i * 3] * fx + N[i * 3 + 1] * fy + N[i * 3 + 2] * fz < 0.72) continue;
        if (where.below && P[i * 3 + 1] > yCap) continue;
        base.tmp[nc++] = i;
      }
      cand = base.tmp.subarray(0, nc);
    }
    if (!cand.length) { (report.wounds ||= []).push(at + ' none'); continue; }
    const best = cand[Math.floor(r() * cand.length) % cand.length];
    const ox = P[best * 3], oy = P[best * 3 + 1], oz = P[best * 3 + 2], nx0 = N[best * 3], ny0 = N[best * 3 + 1], nz0 = N[best * 3 + 2];
    const R = where.R * w.size, b0 = bone[best];
    const runs = at === 'neck' || at === 'chest' || at === 'shoulder';
    let painted = 0;
    const onB = new Set([b0, ...where.bones]);
    // s50: each bone's vertices sorted by height once per template; a wound only walks its own band (+-15 cm for this
    // body's own lean, which the game bakes in)
    for (const b of onB) { const sb = Lo.byBoneY.get(b); if (sb) painted += paintWound(sb, P, N, Ca, cs, zone, ox, oy, oz, nx0, ny0, nz0, R, at === 'forearm' ? 0.55 : 1.2, runs, s, deep, red, bruise, blood); }
    (report.wounds ||= []).push(at + (side < 0 ? ' -x' : ' +x') + ' ' + painted);
  }
  // 7. build: the belly and waist (bind pose, trunk-weighted, a smooth function of the position only: no cracks), then the
  //    width (spawnZombie applies mesh.userData.variant as the body's scale). Height is left to the game's own variant.
  if (Lo.trunk && Math.abs(look.belly || 0) > 0.02) {
    const b = look.belly;
    // s50: only the trunk vertices near the band (worked out once per template, with room for each body's own lean)
    if (!Lo.bandV) { const a = []; for (const i of Lo.trunkV) { const h = (P[i * 3 + 1] - y0) / H; if (h > 0.6 - 0.14 - 0.05 && h < 0.6 + 0.14 + 0.05) a.push(i); } Lo.bandV = Int32Array.from(a); }
    shapeBelly(P, Lo.bandV, Lo.trunkW, y0, H, b);
    report.belly = +b.toFixed(2);
  }
  // 8. s50 (ChatGPT GP-20226, tcc366 1920 mismatched): keep every cut-out a point with one skinning for good.
  //  - the belly moves each corner by its own trunk weight, so a cut triangle in the waist band came apart (a sliver):
  //    its corners go back onto the first corner after the reshaping;
  //  - the joins (combat/zombie-joins.js) keep a copy of the bind skinning, taken before the look, and write it back on every
  //    pool reset and dismemberment (refreshZombieJoinLoss): the look's skin copy goes into that copy too, owners included.
  const jb = skin.userData.joinBlend, JI = jb && jb.indices, JW = jb && jb.weights, JO = jb && jb.owners;
  const jbOk = !!(JI && JW && JO && JI.length === n * 4 && JW.length === n * 4 && JO.length === n);
  for (let c = 0; c < nCut; c++) {
    const tri = cutList[c], a = tri * 3, p = a * 3, s4 = a * 4;
    for (let j = 1; j < 3; j++) {
      P[p + j * 3] = P[p]; P[p + j * 3 + 1] = P[p + 1]; P[p + j * 3 + 2] = P[p + 2];
      if (jbOk) { JO[a + j] = JO[a]; for (let q = 0; q < 4; q++) { JI[s4 + j * 4 + q] = JI[s4 + q]; JW[s4 + j * 4 + q] = JW[s4 + q]; } }
    }
    mark[tri] = 0;
  }
  report.collapsed = nCut; report.H = +H.toFixed(4);
  if (jb) report.joins = jbOk ? 'kept' : 'size?';
  A.color.needsUpdate = true; A.position.needsUpdate = true; A.skinIndex.needsUpdate = true; A.skinWeight.needsUpdate = true;
  // no new bounding sphere (3 ms on 108k vertices): cut-outs only shrink the body, and the belly adds at most ~4 cm
  if (geo.boundingSphere && (look.belly || 0) > 0.02) geo.boundingSphere.radius += 0.05;
  if (u.variant) u.variant.width = look.build;
  u.zombieLook = look;
  if (typeof performance !== 'undefined') { const t2 = performance.now(); report.ms = +(t2 - t0).toFixed(2); report.msLayout = +(t1 - t0).toFixed(2); report.msBody = +(t2 - t1).toFixed(2); }
  report.build = look.buildType + ' ' + look.build.toFixed(2);
  return report;
}

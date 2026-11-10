// CC-340 (Claude 3; Jerry, 10 Nov, J125: "refine the anatomical fidelity of our player model. And the head.").
// The marine's head and neck as one surface, from a skull measured in metres: a man's head about 22 cm from chin to
// crown and 16 cm across on his 1.58 m body (the old head was 26.5 cm and 23.5 cm: 5.8 heads to his height, a man
// is about 7.2-7.5), on a neck of the size a neck is, set forward on it and tilted as one is.
//
// How it is built. Every ring of the surface is [y, W, F, B, pf, pb, lift] in metres above the head's pivot (the base
// of the neck): half its width, how far it reaches forward and back, how blunt it is in front and behind (the old
// rings' 0.55 and 0.8; 1 is an ellipse), and how far its sides rise above its front (the jaw line runs up from the
// chin to the angle of the jaw). The rings are joined by a Catmull-Rom curve, and the face is carved into them as
// soft displacements: the brow and its ridge, the sockets, the nose, the cheekbones, the lips, the chin, the
// sternocleidomastoid and the larynx. The rings above the eyes are ui/marine-face.js's HEAD_RINGS, unchanged, so
// the hats, the helmet, the hair and the eyewear, all fitted to that skull, still fit it.
//
// Space. makeMarine scales the head group by HEAD_GROUP_SCALE (index.html); everything here is authored in metres and
// handed over in that group's own space (toLocal). Anything built in metres inside the group (the eyes) sits in a
// child group scaled by the inverse (worldGroup), so a sphere stays a sphere.
export const HEAD_GROUP_SCALE = [.64, .88, .73];
const [SX, SY, SZ] = HEAD_GROUP_SCALE;
export const PIVOT_Y = 1.22;   // makeMarine's HEAD_PIVOT_Y; the old rings' heights are marine heights
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (d, r) => Math.exp(-(d / r) * (d / r));

// The old skull, above the eyes, as ui/marine-face.js has it ([marine height, half width, front, back]).
const CRANIUM = [
  [1.402, .124, .151, .122], [1.428, .125, .150, .124], [1.455, .125, .148, .125],
  [1.481, .122, .140, .123], [1.50, .118, .13, .12], [1.521, .104, .115, .107],
  [1.534, .085, .094, .087], [1.544, .045, .050, .046], [1.548, .001, .001, .001]
].map(([y, w, f, b]) => [(y - PIVOT_Y) * SY, w * SX, f * SZ, b * SZ, .55, .8, 0]);
// From inside the collar to the cheekbones, in metres (the neck ~35 cm round; the jaw ~12 cm across at its angle).
const LOWER = [
  [-.06, .074, .070, .068, 1, 1, 0],
  [-.03, .066, .063, .061, 1, 1, 0],
  [0, .060, .058, .057, 1, 1, 0],
  [.022, .055, .054, .0525, 1, 1, 0],
  [.040, .0545, .056, .0515, 1, 1, 0],     // the larynx's height
  [.050, .056, .060, .0525, .95, 1, .016],  // the throat under the jaw; the sides rise to the jaw's angle
  [.056, .060, .077, .054, .9, .98, .022],  // under the chin
  [.062, .0618, .089, .0555, .85, .95, .024],// the jaw's lower edge: chin in front, the angle at the side
  [.075, .0640, .097, .060, .8, .9, .014],  // the chin; the nape behind
  [.092, .0690, .1005, .069, .75, .86, .005],// under the lower lip
  [.108, .0732, .1025, .0785, .7, .83, 0],  // the mouth's corners; the occiput's lower edge behind
  [.122, .0763, .1042, .0845, .66, .81, 0],
  [.137, .0785, .1062, .0878, .61, .8, 0],  // the nose's base
  [.152, .0794, .1085, .0889, .57, .8, 0]   // the cheekbones
];
const RINGS = [...LOWER, ...CRANIUM];

// The balaclava's rings: the same, but its cloth spans from the chin to the throat instead of following the jaw in.
const RINGS_CLOTH = RINGS.map((r) => r[0] === .040 ? [r[0], r[1], .0615, ...r.slice(3)] : r[0] === .050 ? [r[0], r[1], .0705, ...r.slice(3)] : r[0] === .056 ? [r[0], r[1], .0830, ...r.slice(3)] : r[0] === .022 ? [r[0], r[1], .0565, ...r.slice(3)] : r);
const FIRST_CRANIUM = LOWER.length;
function ringParams(u, cloth = false) {
  const R = cloth ? RINGS_CLOTH : RINGS, n = R.length, i = Math.max(0, Math.min(n - 2, Math.floor(u))), t = Math.max(0, Math.min(1, u - i));
  const p0 = R[Math.max(0, i - 1)], p1 = R[i], p2 = R[i + 1], p3 = R[Math.min(n - 1, i + 2)], out = new Array(7);
  for (let c = 0; c < 7; c++) {
    const a = p0[c], b = p1[c], cc = p2[c], d = p3[c];
    out[c] = .5 * ((2 * b) + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (-a + 3 * b - 3 * cc + d) * t * t * t);
  }
  return out;
}
// The undisplaced ring point at angle a (0 straight ahead, +pi/2 his left side) on row u.
function ringPoint(a, u, cloth = false) {
  const [y, W, F, B, pf, pb, lift] = ringParams(u, cloth), s = Math.sin(a), c = Math.cos(a);
  const side = 1 - Math.abs(c) ** 1.5;
  return [W * s, y + lift * side, c >= 0 ? F * c ** pf : -B * (-c) ** pb];
}

// The face, carved in. Front features displace along z; the eyes' centres are EYE (metres from the pivot).
export const EYE = { x: .0345, y: .1755, r: .0112, z: null };
const NOSE = [   // [y, how far it stands off the face, half width]: root at the brows, tip, base 5.5 cm below the root
  [.130, 0, .011], [.1335, .0075, .0135], [.1375, .0148, .0152], [.1415, .0172, .0138], [.146, .0165, .0118],
  [.154, .0138, .0102], [.162, .0108, .0094], [.170, .0080, .0089], [.178, .0052, .0087], [.185, .0026, .0092], [.192, 0, .0108]
];
function noseAt(y) {
  const N = NOSE; if (y <= N[0][0] || y >= N[N.length - 1][0]) return [0, .01];
  let i = 1; while (N[i][0] < y) i++;
  const a = N[i - 1], b = N[i], t = (y - a[0]) / (b[0] - a[0]), k = t * t * (3 - 2 * t);
  return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
// The eye's opening: the lids' margins, as heights over the eye's centre across its width (dx in metres, + outward).
export function lidMargin(dx, upper) {
  const half = .0106, t = Math.max(-1, Math.min(1, dx / half)), arch = Math.max(0, 1 - t * t) ** .62;
  return upper ? -.0004 + .0046 * arch * (1 - .12 * t) + .0012 * t : -.0004 - .0034 * arch * (1 + .1 * t) + .0009 * t;
}
// Displacement of the skin at the point (x, y, z) facing angle a. cloth: the balaclava's version (it bridges hollows
// and tents over the nose instead of following it in).
function carve(x, y, a, cloth, z0 = 0) {
  const front = Math.max(0, Math.cos(a)), ax = Math.abs(x);
  let dz = 0, dr = 0;
  // the nose; under cloth it tents: the fabric falls from the tip straight to the lip and spreads to the cheeks
  {
    let [h, w] = noseAt(y);
    if (cloth) {
      const tip = .0195, below = y < .1415 ? sstep(.106, .1415, y) : 1;
      if (y < .1415) h = Math.max(h, tip * (.22 + .78 * below)); w = Math.max(w, .013) * (1 + .55 * (y < .15 ? 1 - sstep(.115, .15, y) : 0)) + .006;
    }
    const u = ax / w; if (u < 1) dz += cloth ? h * (1 - u * u) ** 1.1 : h * (1 - sstep(.18, 1, u)) ** 1.15;
    if (!cloth) dz += .0032 * gauss(y - .1425, .0042) * gauss(ax, .0085);   // the tip's rounded end
    if (!cloth) dz += .0038 * gauss(ax - .0118, .0045) * gauss(y - .138, .0046);   // the alae
  }
  // the brow ridge and the glabella (strongest over the inner half of each eye), the forehead's gentle front
  dz += .0034 * gauss(y - .191, .0085) * (1 - sstep(.045, .062, ax)) + .0012 * gauss(y - .186, .006) * gauss(ax, .012);
  // the socket: a soft hollow under the brow round each eye (the eyes themselves come last, below)
  if (!cloth) dz -= .0035 * gauss(ax - EYE.x, .017) * gauss(y - EYE.y - .002, .012);
  // the cheekbones (out and forward, under the outer corner of each eye) and the hollow below them
  dr += .0030 * gauss(y - .149, .014) * gauss(a * Math.sign(x || 1) - .95, .38);
  if (!cloth) dr -= .0008 * gauss(y - .122, .016) * gauss(Math.abs(a) - 1.0, .35);
  dr += .0028 * gauss(y - .072, .010) * gauss(Math.abs(a) - 1.72, .28);   // the angle of the jaw
  // the lips (the upper over the lower), the line between them, the groove under the lower and the chin
  if (!cloth) {
    const mu = Math.max(0, 1 - (ax / .025) ** 2) ** .8, ml = Math.max(0, 1 - (ax / .022) ** 2) ** 1.1;
    const bow = .0009 * gauss(ax - .0055, .003) - .0006 * gauss(ax, .0022);   // the cupid's bow
    dz += mu * .0030 * gauss(y - .1142 - bow, .0034) + ml * .0035 * gauss(y - .1036, .0032) - (mu > 0 ? .0016 * gauss(y - .1088, .0008) * Math.min(1, mu * 3) : 0);
    dz -= .0026 * gauss(y - .0935, .0042) * (1 - sstep(.012, .024, ax));
    dz -= .0016 * gauss(ax - .0225, .006) * gauss(y - .123, .011);   // the nasolabial hollow beside the nose
  }
  dz += .0062 * gauss(y - .077, .009) * (1 - sstep(.013, .028, ax));   // the chin
  // the neck: the larynx and the two sternocleidomastoids, from behind each ear down to the top of the breastbone
  dz += (cloth ? .0034 : .0042) * gauss(y - .041, .011) * gauss(x, .009);
  {
    const t = Math.max(0, Math.min(1, (y + .02) / .12));          // 0 at the breastbone, 1 under the ear
    const ma = .35 + 1.65 * t;                                    // the muscle's angle round the neck
    dr += (cloth ? .0012 : .0026) * gauss(Math.abs(a) - ma, .22) * (y > -.03 && y < .1 ? Math.sin(Math.PI * t) ** .5 : 0);
  }
  // CC-340: under the nose the fabric bridges toward the chin instead of sinking into the lip and the groove under it
  // (that hollow faced down and read as a dark smudge over the mouth from the front): about half the hollow filled
  if (cloth) dz += .0056 * gauss(y - .101, .017) * Math.max(0, 1 - (ax / .026) ** 2) ** 1.1;
  dz *= front ** .5;
  // the eyes: within the opening the skin stands behind the eyeball; round it the lids lie on the eyeball, a lid's
  // thickness off it, and blend out into the socket. So the lids close round the eye as lids do.
  if (!cloth && EYE.z != null) {
    const dx = ax - EYE.x, dy = y - EYE.y, d = Math.hypot(dx, dy * 1.1), r = EYE.r;
    const w = (1 - sstep(r * .8, r + .0068, d)) * sstep(.55, .75, front);
    if (w > 0) {
      const dd = Math.min(d, r * .999), zEye = EYE.z + Math.sqrt(r * r - dd * dd);
      const up = lidMargin(dx, true), lo = lidMargin(dx, false), m = (up + lo) / 2;
      const v = dy > m ? (dy - m) / Math.max(.0006, up - m) : (m - dy) / Math.max(.0006, m - lo);
      const q = v * v + (dx / .0108) ** 8;
      const lid = zEye + .0012 + .0006 * gauss(dy - up - .0012, .0012);     // the upper lid's rolled edge
      const target = lid + (zEye - .003 - lid) * (1 - sstep(.72, 1.0, q));
      dz += (target - (z0 + dz)) * w;
    }
  }
  return [dz, dr];
}

// The surface point (metres from the pivot) at angle a and row u. cloth: the balaclava's surface (before its offset).
export function skinPoint(a, u, cloth = false) {
  const p = ringPoint(a, u, cloth);
  const [dz, dr] = carve(p[0], p[1], a, cloth, p[2]);
  // the radial push follows the ring's own outward direction in the horizontal plane
  const e = 1e-3, p0 = ringPoint(a - e, u, cloth), p1 = ringPoint(a + e, u, cloth);
  let nx = p1[2] - p0[2], nz = -(p1[0] - p0[0]); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
  if (nx * p[0] + nz * p[2] < 0) { nx = -nx; nz = -nz; }
  return [p[0] + nx * dr, p[1], p[2] + nz * dr + dz];
}
export const ROWS = RINGS.length - 1;
{ // the eye's centre: where the cornea's apex sits 4.5 mm behind the face (under the brow), as eyes are set
  let lo = 0, hi = ROWS; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (ringPoint(0, m)[1] < EYE.y) lo = m; else hi = m; }
  const W = ringParams(lo)[1], a = Math.asin(EYE.x / W), p = ringPoint(a, lo), [dz] = carve(p[0], p[1], a, false, p[2]);
  EYE.z = p[2] + dz - .0045 - EYE.r;
}   // u runs 0..ROWS (the crown's pole)
// The row u at which the surface at angle a is at height y (the rows rise steadily at every angle).
export function rowAt(a, y, cloth = false) {
  let lo = 0, hi = ROWS;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (ringPoint(a, m, cloth)[1] < y) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const toLocal = (p) => [p[0] / SX, p[1] / SY, p[2] / SZ];
// A point d metres off the skin (out along the ring's own outward direction), at angle a, height y; up lifts it.
export function offSkin(a, y, d = 0, up = 0, cloth = false) {
  const u = rowAt(a, y, cloth), p = skinPoint(a, u, cloth), e = 2e-3, p0 = skinPoint(a - e, u, cloth), p1 = skinPoint(a + e, u, cloth);
  let nx = p1[2] - p0[2], nz = -(p1[0] - p0[0]); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
  if (nx * p[0] + nz * p[2] < 0) { nx = -nx; nz = -nz; }
  return [p[0] + nx * d, p[1] + up, p[2] + nz * d];
}
// Columns crowd the front (the face), rows crowd the face's heights: about 2.5 mm apart where the features are.
export function columnAngles(n, k = 1.15) { const out = []; for (let j = 0; j <= n; j++) { const t = -1 + 2 * j / n; out.push(Math.PI * (t + k * t ** 3) / (1 + k)); } return out; }
// k: how much coarser (CC-340: a survivor's lighter head uses about 2.4)
export function rowSteps(yLo = -.06, yHi = .2895, k = 1) {
  const out = [], a = 0; let y = yLo;
  while (y < yHi) { out.push(rowAt(a, y)); y += k * ((y > .164 && y < .186) ? .0017 : (y > .045 && y < .2) ? .0031 : y < .045 ? .009 : .0055); }
  out.push(ROWS); return out;
}
// The front of the face: how far forward the skin is at (x, y), metres (what the eyes, brows and lips sit on).
export function faceZ(x, y) {
  const W = ringParams(rowAt(0, y))[1], a = Math.asin(Math.max(-.999, Math.min(.999, x / W)));
  // refine the angle so the displaced point lands on x
  let aa = a; for (let k = 0; k < 4; k++) { const p = skinPoint(aa, rowAt(aa, y)); aa += (x - p[0]) / Math.max(.02, W * Math.cos(aa)); }
  return skinPoint(aa, rowAt(aa, y))[2];
}
// The side of the head: the skin's x (his left, +) at height y, depth z (what the ears sit on).
export function sideX(y, z, sign = 1) {
  let lo = .05, hi = Math.PI - .05;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, p = skinPoint(m, rowAt(m, y)); if (p[2] > z) lo = m; else hi = m; }
  const m = (lo + hi) / 2; return sign * skinPoint(m, rowAt(m, y))[0];
}

// A grid over the surface, handed over in the head group's space. rows: the u of each row; cols: the angles;
// lift(a, u, p): how far out along the normal to set the point (metres); keep(a,u): which quads to keep.
export function surfaceGeometry(T, { rows, cols, cloth = false, lift = null, keep = null, weld = true }) {
  const rowsOf = typeof rows === 'function' ? rows : () => rows, colRows = cols.map((a) => rowsOf(a));
  const R = colRows[0].length, C = cols.length, P = new Float32Array(R * C * 3), uv = new Float32Array(R * C * 2);
  const pts = [];
  for (let r = 0; r < R; r++) for (let j = 0; j < C; j++) { const p = skinPoint(cols[j], colRows[j][r], cloth); pts.push(p); }
  // normals in metres (for the lift), from the grid's neighbours
  const at = (r, j) => pts[Math.max(0, Math.min(R - 1, r)) * C + ((j + C - 1) % (C - 1))];
  for (let r = 0; r < R; r++) for (let j = 0; j < C; j++) {
    const i = r * C + j, p = pts[i];
    let o = p;
    if (lift) {
      const jl = j === 0 ? C - 2 : j - 1, jr = j === C - 1 ? 1 : j + 1;
      const a = at(r, jl), b = at(r, jr), c = at(r + 1, j), d = at(r - 1, j);
      const tx = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ty = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
      let n = [ty[1] * tx[2] - ty[2] * tx[1], ty[2] * tx[0] - ty[0] * tx[2], ty[0] * tx[1] - ty[1] * tx[0]];
      let l = Math.hypot(...n); if (l < 1e-9) n = [0, 1, 0], l = 1;
      n = n.map((v) => v / l); if (n[0] * p[0] + n[2] * p[2] + n[1] * (p[1] - .12) * .3 < 0) n = n.map((v) => -v);
      const s = lift(cols[j], colRows[j][r], p); o = [p[0] + n[0] * s, p[1] + n[1] * s, p[2] + n[2] * s];
    }
    const q = toLocal(o); P.set(q, i * 3); uv[i * 2] = j / (C - 1); uv[i * 2 + 1] = (o[1] + .1) * 3.4;
  }
  const ix = [];
  for (let r = 0; r < R - 1; r++) for (let j = 0; j < C - 1; j++) {
    if (keep && !keep((cols[j] + cols[j + 1]) / 2, (colRows[j][r] + colRows[j][r + 1]) / 2)) continue;
    const a = r * C + j, b = a + C; ix.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(ix); g.computeVertexNormals();
  if (weld) {   // the first and last column meet at the back: one normal for both
    const N = g.attributes.normal;
    for (let r = 0; r < R; r++) {
      const a = r * C, b = a + C - 1, x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1;
      N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l);
    }
    if (colRows[0][R - 1] >= ROWS - 1e-6) for (let j = 0; j < C; j++) N.setXYZ((R - 1) * C + j, 0, 1, 0);
  }
  g.computeBoundingSphere();
  return g;
}
// A group inside the head group in which one unit is one metre again (for round things: the eyes).
export function worldGroup(T) { const g = new T.Group(); g.scale.set(1 / SX, 1 / SY, 1 / SZ); g.name = 'head-metres'; return g; }

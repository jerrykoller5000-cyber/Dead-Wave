// CL-334 (J101, Jerry 10 Nov: "we need a much better and more detailed hand model. I don't really care how long it
// takes"): the marine's hand, rebuilt. GB-152's hand was a box palm and lofted six-sided finger pieces, one rigid piece
// a bone, and a two-piece thumb hung from the palm's side like a fifth finger: it could not lie forward along a pistol's
// frame (J98), and its joints showed as gaps. This one is one smooth skin a material:
//  - a palm shaped as a hand is: the heel and the thenar and hypothenar mounds, the hollow, the knuckle heads across the
//    back, the knuckle line arched;
//  - four fingers of three phalanges each, one continuous tube a finger bent smoothly at every joint (two-bone blending),
//    the joints a little wider on the back, the pads fuller on the palm side, rounded tips, nails on the bare hand;
//  - a thumb of three bones from a saddle joint at the wrist's corner (its metacarpal inside the thenar mound, which moves
//    with it): it opposes, swings across the palm, and lies forward.
// The glove is the same hand a little fuller with its cuff, and the knuckle guard and finger pads in the pad material.
//
// Hand space is GB-152's: the elbow's space at rest, +y toward the elbow, the fingers hanging along -y when straight, the
// palm facing +z, so the fingers curl toward +z round whatever runs along x through the fist (the wrist's userData.grip).
// side +1 is the right hand, -1 the left. The index finger and the thumb are on the +x*side edge.
//
// One mesh a material a hand, deformed on the CPU when the pose changes (no draw calls over GB-152's, no skinning
// support needed from the renderer). rig.set(pose), rig.update(), rig.point(name) as before.
//
// A pose: f = per finger [knuckle (MCP) curl, middle joint (PIP) curl, end joint (DIP) curl, spread];
// t = the thumb's [curl toward the palm, swing out from the index edge (+) or across the palm (-), end joint curl,
// roll (opposition, extra to what the curl brings), knuckle (MCP) curl extra, out in front of the palm extra (CL-334 h)].
// t[3], t[4] and t[5] may be left out (0).

import { HAND_BAKE } from './marine-hand-bake.js';   // CL-334 c: the first-person surface, built ahead (tools/hand-bake.mjs)

export const FINGERS = ['index', 'middle', 'ring', 'little'];
export const HAND_POSES = {
  open:    { f: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], t: [0, 0.35, 0] },
  relaxed: { f: [[0.3, 0.45, 0.25, 0.04], [0.38, 0.55, 0.3, 0], [0.46, 0.62, 0.32, -0.04], [0.55, 0.7, 0.36, -0.08]], t: [0.35, 0.25, 0.2] },
  // GB-169 (Jerry): empty hands hang relaxed, the fingers gently curled and more so toward the little finger, the thumb
  // resting forward along the index.
  hang:    { f: [[0.28, 0.38, 0.22, 0.03], [0.36, 0.48, 0.28, 0], [0.46, 0.6, 0.34, -0.03], [0.58, 0.72, 0.4, -0.07]], t: [0.25, 0.12, 0.18] },
  // CL-334 f (Jerry: "the four fingers do not make total contact with the item he is gripping"; "That thumb placement still
  // needs work"): solved on the 2.6 cm bar through the grip channel (the grip solver, docs/fps/hand.md): every finger's
  // bones on the bar, the end joint following the middle one, the tips clear of the palm; the thumb wrapped round the
  // bar, across the backs of the index and middle fingers' middle bones, as a power grip's is
  // CL-334 h (Jerry, J126 rule 1: "No one part of the hand may clip through another part of the hand"): re-solved on the
  // real surface (handPosed, handClipReport; the solver in docs/fps/hand.md). Round 6's thumb crossed the index in its own
  // plane, 9 mm through the index's end bones. Now its root swings out past the index (t[1] +) and forward (t[5]), it wraps
  // round the bar's end, and its pad lies on the index's middle bone, touching; nothing of the hand into another part by
  // more than half a millimetre, bare or gloved (the glove is what he wears). Every gloved finger bone on the bar within a
  // millimetre (the bar 2.4 mm nearer the knuckles than the grip channel), the end joints following the middle ones.
  fist:    { f: [[1.412, 0.938, 0.84, 0], [1.495, 1.013, 0.943, 0], [1.425, 1.0, 0.899, 0], [1.212, 0.725, 0.693, 0]], t: [0.038, 0.563, 0.812, 0.863, 0.55, 0.337] },
  point:   { f: [[0.1, 0.1, 0.05, 0.05], [1.495, 1.013, 0.943, 0], [1.425, 1.0, 0.899, 0], [1.212, 0.725, 0.693, 0]], t: [0.038, 0.563, 0.812, 0.863, 0.55, 0.337] }
};
const NT = 6;   // thumb values kept in a pose (CL-334 h: t[5])
export function copyPose(p, out = { f: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], t: [0, 0, 0, 0, 0, 0] }) {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out.f[i][j] = p.f[i][j] || 0;
  for (let j = 0; j < NT; j++) out.t[j] = p.t[j] || 0;
  return out;
}
// out = a + (b - a) * k, joint by joint. CL-334 h (J126 rule 1): a hand closing round something wraps its fingers first and
// its thumb last, and opening lets go with the thumb first (a straight blend swept the closing index's tip through the
// thumb's pad, 4.6 mm, on the way into the fist). So the thumb's k is eased by how much the fingers close or open: k^e
// closing, 1 - (1 - k)^e opening, e from 1 (the fingers about the same) to 4 (a whole fist's worth).
export function lerpPose(a, b, k, out) {
  out = out || copyPose(a);
  let dc = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = a.f[i][j] || 0, y = b.f[i][j] || 0; out.f[i][j] = x + (y - x) * k; if (j < 3) dc += y - x; }
  const e = 1 + 3 * Math.min(1, Math.abs(dc) / 6), kt = dc >= 0 ? Math.pow(k, e) : 1 - Math.pow(1 - k, e);
  for (let j = 0; j < NT; j++) out.t[j] = (a.t[j] || 0) + ((b.t[j] || 0) - (a.t[j] || 0)) * kt;
  return out;
}

// ---- the build -----------------------------------------------------------------------------------------------------
// handLayout(s, ox, gz): the hand for side s, its palm's middle at x = ox, its front (palm side) round z = gz.
export function handLayout(s, ox, gz) {
  const mcpZ = gz - 0.02;
  // The knuckles on an arch: the middle one furthest from the wrist, the little one well back.
  // CL-334 e (Jerry's references: a hand's palm is about as long as its middle finger, and longer than it is wide; ours
  // was short and wide with long fingers, the blocky look): the knuckles 9 mm further from the wrist, the palm a little
  // narrower, the fingers a little shorter and slimmer, the hand as long overall
  const fingers = FINGERS.map((name, i) => {
    const x = ox + s * [0.0256, 0.0077, -0.0100, -0.0259][i];
    const y = [-0.2915, -0.2940, -0.2920, -0.2860][i];
    return {
      name, x, y, z: mcpZ,
      len: [[0.0349, 0.0219, 0.0177], [0.0377, 0.0246, 0.0186], [0.0358, 0.0233, 0.0177], [0.0284, 0.0177, 0.0153]][i],
      w: [0.0177, 0.0182, 0.0171, 0.0150][i], d: [0.0163, 0.0167, 0.0160, 0.0143][i],
      splay: [0.06, 0.0, -0.05, -0.13][i]   // radians out from the middle finger's line, at rest
    };
  });
  // The thumb's saddle joint at the palm's radial corner by the wrist, its metacarpal running down, out and forward.
  const thumb = {
    // CL-334 c (Jerry: "The thumb being insanely long and the top of it being fatter and wider than the base"): its root
    // higher by the wrist, its metacarpal shorter and more of it in the thenar, the phalanges shorter, and every part
    // tapering from the base to the tip
    // CL-334 f: the root a little further from the wrist (the trapezium is in the second row of the wrist's bones), with
    // the longer palm, so the thumb reaches across the fingers in a grip
    x: ox + s * 0.0228, y: -0.2320, z: mcpZ + 0.0060,
    dir: [s * 0.40, -0.78, 0.48], pad: [-s * 0.70, -0.05, 0.71],
    // CL-334 d (Jerry: "thicker and wider base thumb"): the metacarpal fuller, so the thumb leaves the hand broad
    len: [0.042, 0.0285, 0.0230], w: [0.0285, 0.0205, 0.0178], d: [0.0250, 0.0178, 0.0148]
  };
  return { s, ox, gz, mcpY: -0.293, mcpZ, fingers, thumb, wristY: -0.214, gripY: -0.271 };
}

// Rigid transforms as 3x4 row-major arrays [r00 r01 r02 tx r10 ...].
const I3 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; }
function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]; }
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]; }
function trans(x, y, z) { return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]; }
function mul(A, B) {
  const o = new Array(12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) o[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c];
    o[r * 4 + 3] = A[r * 4] * B[3] + A[r * 4 + 1] * B[7] + A[r * 4 + 2] * B[11] + A[r * 4 + 3];
  }
  return o;
}
function inv(A) {   // rigid: transpose the rotation
  const R = [A[0], A[4], A[8], 0, A[1], A[5], A[9], 0, A[2], A[6], A[10], 0];
  R[3] = -(R[0] * A[3] + R[1] * A[7] + R[2] * A[11]); R[7] = -(R[4] * A[3] + R[5] * A[7] + R[6] * A[11]); R[11] = -(R[8] * A[3] + R[9] * A[7] + R[10] * A[11]);
  return R;
}
const ap = (M, x, y, z) => [M[0] * x + M[1] * y + M[2] * z + M[3], M[4] * x + M[5] * y + M[6] * z + M[7], M[8] * x + M[9] * y + M[10] * z + M[11]];
const av = (M, x, y, z) => [M[0] * x + M[1] * y + M[2] * z, M[4] * x + M[5] * y + M[6] * z, M[8] * x + M[9] * y + M[10] * z];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (x, w) => Math.exp(-(x * x) / (w * w));

// The joints: 0 the palm; 1 + i*3 + j finger i's phalanx j (0 the proximal); 13 the thumb's metacarpal, 14 its proximal
// phalanx, 15 its distal. Each with its parent and its pivot (hand space, at rest).
const THUMB0 = 13, NJ = 16;
// The thumb's rest frame: local -y along the metacarpal, +z its pad side.
function thumbRest(T) {
  const d = norm(T.dir), ly = [-d[0], -d[1], -d[2]];
  let lz = T.pad; lz = norm([lz[0] - dot(lz, ly) * ly[0], lz[1] - dot(lz, ly) * ly[1], lz[2] - dot(lz, ly) * ly[2]]);
  const lx = cross(ly, lz);
  return [lx[0], ly[0], lz[0], T.x, lx[1], ly[1], lz[1], T.y, lx[2], ly[2], lz[2], T.z];
}
// Each bone's frame (hand space) for a pose.
// CL-334 d (Jerry, 10 Nov: "set realistic joint and rotation limits for fingers ... this thumb bends at an impossible angle
// and clips through"): every joint stops where a hand's does, whatever a pose asks (radians). The fingers: the knuckle
// (MCP) from a little back to 90 degrees, the middle joint (PIP) to about 110, the end joint (DIP) to about 80, the
// spread 20 either way. The thumb: its root (CMC) swings and flexes about 45 degrees and turns its pad to the fingers
// about as far, its knuckle (MCP) bends to about 57, its end joint (IP) to about 80 (and a little back).
export const JOINT_LIMITS = {
  mcp: [-0.30, 1.57], pip: [0, 1.92], dip: [-0.08, 1.40], spread: [-0.35, 0.35],
  // the thumb's root (CMC), a saddle: across the palm (-) or out from the index (+) in the palm's plane; out in front of the
  // palm (palmar abduction); the turn of its pad toward the fingers (pronation) that comes with opposing
  cmcSwing: [-0.65, 0.55], cmcAbd: [-0.10, 0.90], cmcRoll: [-0.30, 1.00], tMcp: [-0.10, 1.00], tIp: [-0.17, 1.40]
};
// A rotation of angle a about the unit axis k (Rodrigues), as a 3x4.
function rotAxis(k, a) {
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c, [x, y, z] = k;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0, t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0, t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0];
}
const lim = (v, r) => Math.max(r[0], Math.min(r[1], v || 0));
function boneFrames(L, p) {
  const s = L.s, M = new Array(NJ), J = JOINT_LIMITS;
  M[0] = I3();
  for (let i = 0; i < 4; i++) {
    const f = L.fingers[i], fp = p.f[i];
    let B = mul(trans(f.x, f.y, f.z), mul(rotZ(s * (f.splay + lim(fp[3], J.spread))), rotX(-lim(fp[0], J.mcp))));
    M[1 + i * 3] = B;
    B = mul(mul(B, trans(0, -f.len[0], 0)), rotX(-lim(fp[1], J.pip))); M[2 + i * 3] = B;
    B = mul(mul(B, trans(0, -f.len[1], 0)), rotX(-lim(fp[2], J.dip))); M[3 + i * 3] = B;
  }
  const t = p.t, T = L.thumb, curl = t[0] || 0;
  // CL-334 f (Jerry, 10 Nov: "something off about the way the thumb either bends or rotates ... at the bottom thumb joint
  // attached to the hand"): the root is a saddle on the palm's own axes, about its pivot by the wrist: across the palm or
  // out from the index in the palm's plane (about the palm's normal), and out in front of the palm (about the line across
  // the metacarpal, parallel to the palm); then the metacarpal turns its pad toward the fingers as it opposes. Curl (t[0])
  // is opposition: out in front, across, and the turn together, as a thumb's are; t[1] the swing in the palm's plane, t[3]
  // more or less of the turn, t[4] more or less of the knuckle's bend, t[5] more or less out in front (CL-334 h: so a thumb
  // over a grip can ride on the fingers' backs, not through them). (Before, both turns were about the thumb's own axes,
  // so its base swung and twisted at once.)
  const dir = norm(T.dir), kAbd = norm(cross(dir, [0, 0, 1])), piv = [T.x, T.y, T.z];
  const Rh = mul(rotZ(s * lim((t[1] || 0) * 0.85 - 0.42 * curl, J.cmcSwing)), rotAxis(kAbd, lim(0.55 * curl + (t[5] || 0), J.cmcAbd)));
  const Rp = mul(trans(piv[0], piv[1], piv[2]), mul(Rh, trans(-piv[0], -piv[1], -piv[2])));
  let B = mul(mul(Rp, thumbRest(T)), rotY(-s * lim(0.62 * curl + (t[3] || 0), J.cmcRoll))); M[THUMB0] = B;
  B = mul(mul(B, trans(0, -T.len[0], 0)), rotX(-lim(curl * 0.45 + (t[4] || 0), J.tMcp))); M[THUMB0 + 1] = B;
  B = mul(mul(B, trans(0, -T.len[1], 0)), rotX(-lim((t[2] || 0) * 1.1, J.tIp))); M[THUMB0 + 2] = B;
  return M;
}
const ZERO = { f: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], t: [0, 0, 0, 0, 0] };
function jointTable(L) {
  const R = boneFrames(L, ZERO), J = [];
  for (let k = 0; k < NJ; k++) {
    const parent = k === 0 ? -1 : k === THUMB0 ? 0 : (k <= 12 ? ((k - 1) % 3 === 0 ? 0 : k - 1) : k - 1);
    J.push({ parent, pivot: [R[k][3], R[k][7], R[k][11]] });
  }
  return J;
}

// A mesh under construction: positions (hand space at rest), normals, two bones a vertex and the second's weight.
function newBuf() { return { p: [], n: [], b0: [], b1: [], w1: [], idx: [] }; }
function addV(B, p, n, b0, b1 = b0, w1 = 0) {
  if (w1 > 0.5) { const t = b0; b0 = b1; b1 = t; w1 = 1 - w1; }
  B.p.push(p[0], p[1], p[2]); B.n.push(n[0], n[1], n[2]); B.b0.push(b0); B.b1.push(b1); B.w1.push(w1);
  return B.p.length / 3 - 1;
}
// Rings (each a list of vertex ids, same count) joined into a tube; caps optional (a centre vertex each).
function joinRings(B, rings, closeFirst = null, closeLast = null) {
  const n = rings[0].length;
  for (let r = 0; r + 1 < rings.length; r++) for (let j = 0; j < n; j++) {
    const a = rings[r][j], b = rings[r][(j + 1) % n], c = rings[r + 1][j], d = rings[r + 1][(j + 1) % n];
    B.idx.push(a, c, b, b, c, d);
  }
  if (closeFirst != null) { const R = rings[0]; for (let j = 0; j < n; j++) B.idx.push(closeFirst, R[j], R[(j + 1) % n]); }
  if (closeLast != null) { const R = rings[rings.length - 1]; for (let j = 0; j < n; j++) B.idx.push(closeLast, R[(j + 1) % n], R[j]); }
}
// A superellipse section point: angle a (0 = +z, the palm side; pi/2 = +x), half sizes rx, rz, exponent e (<1 squarer).
function sect(a, rx, rzFront, rzBack, e, eb = e) {
  rx = Math.max(rx, 1e-5); rzFront = Math.max(rzFront, 1e-5); rzBack = Math.max(rzBack, 1e-5);
  const sa = Math.sin(a), ca = Math.cos(a);
  if (ca < 0) e = eb;   // the back half its own squareness (a finger's back is flatter than its pads)
  const x = Math.sign(sa) * Math.abs(sa) ** e * rx, z = Math.sign(ca) * Math.abs(ca) ** e * (ca >= 0 ? rzFront : rzBack);
  // the normal of a superellipse, near enough: the gradient of |x/rx|^(2/e) + |z/rz|^(2/e)
  const rz = ca >= 0 ? rzFront : rzBack, q = 2 / e;
  const nx = Math.sign(x) * Math.abs(x / rx) ** (q - 1) / rx, nz = Math.sign(z) * Math.abs(z / rz) ** (q - 1) / rz;
  const l = Math.hypot(nx, nz) || 1;
  return { x, z, nx: nx / l, nz: nz / l };
}

// A digit: a tube along a bone chain. frames: the chain's bones' rest frames; prof(u, total) gives { rx, rf, rb, e, eb }
// (half width, front and back half depths, the front's and back's squareness) at distance u from the root along the
// chain. The root ring starts `inset` before the first joint (inside the palm), blended to `rootBone`.
// digitSurf: the surface at (u, a) in the frame of the bone u lies on: { seg, local [x, y, z], n [x, y, z] }. The tip is
// a dome of rings closing to a point, set a little toward the nail.
function digitSurf(lens, prof, DOME, u, a, inflate = 0) {
  const total = lens.reduce((x, y) => x + y, 0), domeStart = total - DOME;
  let seg = 0, c0 = 0; while (seg < lens.length - 1 && u > c0 + lens[seg]) { c0 += lens[seg]; seg++; }
  const local = u - c0;
  const dome = u > domeStart ? Math.min(1, (u - domeStart) / (DOME + 0.0014)) : 0;
  const shrink = dome > 0 ? Math.sqrt(Math.max(0, 1 - dome * dome)) : 1;
  const P = prof(u, total);
  const q = sect(a, P.rx * shrink + inflate, P.rf * shrink + inflate, P.rb * shrink + inflate, P.e || 0.82, P.eb || P.e || 0.82);
  const zOff = dome > 0 ? -P.rb * 0.25 * dome : 0;
  return { seg, local: [q.x, -local, q.z + zOff], n: [q.nx * shrink, -dome * 0.9, q.nz * shrink] };
}
function digit(B, frames, bones, lens, prof, opts) {
  const { n, rootBone, inset, blend, inflate = 0 } = opts;
  const total = lens.reduce((a, b) => a + b, 0), us = [];
  const step = opts.step;
  const DOME = opts.dome || 0.0085;
  for (let u = -inset; u < total - DOME; u += step) us.push(u);
  const domeStart = total - DOME;
  for (let k = 0; k <= 6; k++) us.push(domeStart + (k / 6) * (DOME + 0.0014));
  const rings = [];
  const cumul = [0]; for (const l of lens) cumul.push(cumul[cumul.length - 1] + l);
  for (const u of us) {
    // which bone, and the blend across each joint
    let seg = 0; while (seg < lens.length - 1 && u > cumul[seg + 1]) seg++;
    const local = u - cumul[seg];
    const F = frames[seg];
    let b0 = bones[seg], b1 = b0, w1 = 0;
    const bl = blend[seg] || 0.004;
    if (seg === 0 && u < bl) { b1 = rootBone; w1 = 1 - smooth(-bl, bl, u); }
    else if (seg > 0 && local < bl) { b1 = bones[seg - 1]; w1 = 1 - smooth(-bl, bl, local); }
    if (seg < lens.length - 1 && local > lens[seg] - bl) { b1 = bones[seg + 1]; w1 = smooth(-bl, bl, local - lens[seg]); }
    const ring = [];
    for (let j = 0; j < n; j++) {
      const S = digitSurf(lens, prof, DOME, u, (j / n) * Math.PI * 2, inflate);
      ring.push(addV(B, ap(F, ...S.local), norm(av(F, ...S.n)), b0, b1, w1));
    }
    rings.push(ring);
  }
  // close the root (it is inside the palm) and the tip
  const tipF = frames[lens.length - 1], tl = lens[lens.length - 1];
  const tipC = addV(B, ap(tipF, 0, -(tl + 0.0013), -prof(total, total).rb * 0.25), norm(av(tipF, 0, -1, 0)), bones[lens.length - 1]);
  const r0 = rings[0], c0 = [0, 0, 0]; for (const v of r0) for (let k = 0; k < 3; k++) c0[k] += B.p[v * 3 + k] / r0.length;
  const rootC = addV(B, c0, norm(av(frames[0], 0, 1, 0)), bones[0], rootBone, 1);
  joinRings(B, rings, rootC, tipC);
  return rings;
}
// A nail on a digit's last bone: a thin shell lying on the back of the end phalanx (it follows the surface, so it is part
// of the finger in any pose), from an arched cuticle to the free edge at the tip, curved across, a hair proud of the skin,
// with its rim down to the skin. uA, uB: where it starts and ends along the chain; half: its half angle round the finger.
function nail(B, F, bone, lens, prof, DOME, uA, uB, half, lift, inflate = 0, arch = 0.0016, narrow = 0.18, both = false, onto = null) {
  const nu = 6, na = 6, top = [], low = [];
  for (let i = 0; i <= nu; i++) {
    const rt = [], rl = [];
    for (let j = 0; j <= na; j++) {
      const k = j / na * 2 - 1;                                  // -1..1 across
      const u0 = uA + arch * k * k;                              // the cuticle's arch: the corners further out
      const u = u0 + (uB - u0) * (i / nu);
      const a = Math.PI + k * half * (1 - narrow * (i / nu) ** 2); // a little narrower to the free edge
      const S = digitSurf(lens, prof, DOME, u, a, inflate);
      const edge = Math.min(1, (1 - Math.abs(k)) * 4, (i / nu) * 6, both ? (nu - i) / nu * 6 : 1); // lower at the sides and the cuticle (a patch: both ends)
      const h = lift * (0.35 + 0.65 * edge);
      let q = ap(F, ...S.local), n = norm(av(F, ...S.n)), w = [bone, bone, 0];
      if (onto) { q = toSurface(onto.d, q, inflate); n = onto.grad(...q); w = onto.skin(...q); }
      rt.push(addV(B, [q[0] + n[0] * h, q[1] + n[1] * h, q[2] + n[2] * h], n, ...w));
      rl.push(i === 0 || i === nu || j === 0 || j === na ? addV(B, [q[0] - n[0] * 0.0001, q[1] - n[1] * 0.0001, q[2] - n[2] * 0.0001], n, ...w) : -1);
    }
    top.push(rt); low.push(rl);
  }
  shellFaces(B, top, low, nu, na);
}

// palmAt: the palm's surface at height y and angle a round it (0 the palm's face, pi the back): { P, v, xs }.
function palmAt(L, y, a, inflate) {
  const s = L.s, ox = L.ox, cz = L.mcpZ;
  const v = (L.wristY - y) / (L.wristY - L.mcpY);   // 0 at the wrist, 1 at the knuckles
  const hw = 0.0262 + 0.0113 * smooth(0, 0.75, v);   // half width: wrist 5.2 cm, knuckles 7.5 cm (8.9 cm as built, x1.18)
  // CL-334 b: past the knuckle heads the palm rolls over into the fingers (it ended in a flat lip, a mitten's edge)
  // the back of the hand, coming down past the knuckle heads to the fingers' backs (no lip over them)
  const back = (0.0125 + 0.0018 * Math.sin(Math.min(1, v) * Math.PI)) * (1 - 0.40 * smooth(0.86, 1.0, v));
  // the heel fuller, the hollow; toward the fingers the palm's face comes down to theirs (no ledge where they start)
  const front = (0.0115 + 0.0035 * (1 - v) - 0.0012 * gauss(v - 0.55, 0.25)) * (1 - 0.30 * smooth(0.82, 1.04, v));
  const q = sect(a, hw + inflate, front + inflate, back + inflate, 0.72, 0.8);
  let x = q.x, z = q.z;
  const xs = s * x / hw;   // +1 the radial (thumb) edge, -1 the ulnar
  // CL-334 d (Jerry's references: the thumb leaves the hand broad, from a big thenar, with a web to the index): the
  // radial edge fuller between the thumb's root and the index knuckle (the first web and its muscle, front and back)
  if (xs > 0.3) x += s * 0.0042 * smooth(0.3, 1.0, xs) * gauss(v - 0.55, 0.22);
  if (z > 0) {
    // the thenar (thumb) mound: radial, by the wrist, a third of the palm; the hypothenar: ulnar, longer
    z += 0.0100 * gauss(xs - 0.45, 0.5) * gauss(v - 0.32, 0.36) * (z / (front + inflate));
    z += 0.0040 * gauss(xs + 0.62, 0.35) * gauss(v - 0.4, 0.45) * (z / (front + inflate));
    // the pads under the knuckles, soft
    z += 0.0012 * gauss(v - 0.9, 0.07) * (z / (front + inflate));
  } else {
    // the back's arch: highest over the index and middle bones, lower to the little finger's edge
    z *= 1 + 0.08 * gauss(xs - 0.2, 0.6) - 0.10 * smooth(0.2, 1.0, -xs);
    for (const f of L.fingers) {
      // the knuckle heads across the back
      z -= 0.0026 * gauss(x - (f.x - ox), 0.0066) * gauss(v - 0.95, 0.06);
      // the extensor tendons, fanning from the wrist to each knuckle, faint
      const xl = (f.x - ox) * (0.45 + 0.55 * Math.min(1, v / 0.96));
      z -= 0.0006 * gauss(x - xl, 0.0034) * smooth(0.25, 0.7, v) * (1 - smooth(0.88, 0.97, v));
    }
  }
  // the knuckle line's arch: the corners drawn back toward the wrist
  const yy = y + (v > 0.7 ? 0.0055 * (v - 0.7) / 0.3 * (Math.abs(xs) ** 2.2) : 0);
  return { P: [ox + x, yy, cz + z], v, xs };
}
// The palm (and the back of the hand): rings from the wrist to just past the knuckles. Bone 0, except the thenar mound,
// which goes with the thumb's metacarpal. Normals come from the finished surface (geoNormals).
function palm(B, L, n, inflate, frames0) {
  const T = L.thumb, ys = [];
  for (let y = L.wristY + 0.004; y >= L.mcpY - 0.0045; y -= 0.0052) ys.push(y);
  const rings = [];
  const tFrame = frames0[THUMB0], tAxis = [-tFrame[1], -tFrame[5], -tFrame[9]], tO = [tFrame[3], tFrame[7], tFrame[11]];
  for (const y of ys) {
    const ring = [];
    for (let j = 0; j < n; j++) {
      const { P, v } = palmAt(L, y, (j / n) * Math.PI * 2, inflate);
      // the thenar goes with the thumb: weight by the distance to the metacarpal's line
      let b1 = 0, w1 = 0;
      if (L.s * (P[0] - L.ox) > 0 && v < 0.85) {
        const rel = [P[0] - tO[0], P[1] - tO[1], P[2] - tO[2]], along = dot(rel, tAxis);
        if (along > -0.008 && along < T.len[0] + 0.004) {
          const perp = Math.hypot(rel[0] - along * tAxis[0], rel[1] - along * tAxis[1], rel[2] - along * tAxis[2]);
          w1 = 0.85 * (1 - smooth(0.009, 0.020, perp)) * (1 - smooth(T.len[0] - 0.01, T.len[0] + 0.004, along));
          if (w1 > 0.02) b1 = THUMB0; else w1 = 0;
        }
      }
      ring.push(addV(B, P, [0, 0, 1], 0, b1, w1));
    }
    rings.push(ring);
  }
  const first = rings[0], last = rings[rings.length - 1];
  const cen = (r) => { const c = [0, 0, 0]; for (const v of r) for (let k = 0; k < 3; k++) c[k] += B.p[v * 3 + k] / r.length; return c; };
  joinRings(B, rings, addV(B, cen(first), [0, 1, 0], 0), addV(B, cen(last), [0, -1, 0], 0));
}
// The glove's knuckle guard: a moulded piece lying on the back of the hand over the knuckle heads, a bump over each, its
// edges rounded down to the glove (bone 0).
function knuckleGuard(B, L, inflate, onto = null, hi = true) {
  const ox = L.ox, cz = L.mcpZ, nu = hi ? 8 : 3, na = hi ? 18 : 8, A = 0.95, v0 = 0.80, v1 = 0.985;
  const yAt = (v) => L.wristY - v * (L.wristY - L.mcpY);
  const top = [], low = [];
  for (let i = 0; i <= nu; i++) {
    const v = v0 + (v1 - v0) * i / nu, rt = [], rl = [];
    for (let j = 0; j <= na; j++) {
      const k = j / na * 2 - 1, a = Math.PI + k * A, y = yAt(v);
      const P = palmAt(L, y, a, inflate).P, Pa = palmAt(L, y, a + 0.01, inflate).P, Py = palmAt(L, y - 0.0005, a, inflate).P;
      let n = norm(cross([Pa[0] - P[0], Pa[1] - P[1], Pa[2] - P[2]], [Py[0] - P[0], Py[1] - P[1], Py[2] - P[2]]));
      if (n[0] * (P[0] - ox) + n[2] * (P[2] - cz) < 0) n = [-n[0], -n[1], -n[2]];
      let w = [0, 0, 0];
      if (onto) { const q = toSurface(onto.d, P, inflate); P[0] = q[0]; P[1] = q[1]; P[2] = q[2]; n = onto.grad(...q); w = onto.skin(...q); }
      let bump = 0; for (const f of L.fingers) bump += gauss(P[0] - f.x, 0.0056);
      const edge = Math.min(1, (1 - Math.abs(k)) * 5, Math.min(i, nu - i) / nu * 6);
      const th = (0.0016 + 0.0011 * Math.min(1, bump) * gauss(v - 0.95, 0.06)) * (0.25 + 0.75 * edge);
      rt.push(addV(B, [P[0] + n[0] * th, P[1] + n[1] * th, P[2] + n[2] * th], n, ...w));
      rl.push(i === 0 || i === nu || j === 0 || j === na ? addV(B, [P[0] - n[0] * 0.0002, P[1] - n[1] * 0.0002, P[2] - n[2] * 0.0002], n, ...w) : -1);
    }
    top.push(rt); low.push(rl);
  }
  shellFaces(B, top, low, nu, na);
}
// A shell's faces: its top (rows i, columns j; the winding of a digit's rings) and its rim down to the surface, both ways.
function shellFaces(B, top, low, nu, na, flip = false) {
  for (let i = 0; i < nu; i++) for (let j = 0; j < na; j++) {
    const a = top[i][j], b = top[i][j + 1], c = top[i + 1][j], d = top[i + 1][j + 1];
    if (flip) B.idx.push(a, b, c, b, d, c); else B.idx.push(a, c, b, b, c, d);
  }
  const rimT = [], rimL = [];
  for (let j = 0; j <= na; j++) { rimT.push(top[0][j]); rimL.push(low[0][j]); }
  for (let i = 1; i <= nu; i++) { rimT.push(top[i][na]); rimL.push(low[i][na]); }
  for (let j = na - 1; j >= 0; j--) { rimT.push(top[nu][j]); rimL.push(low[nu][j]); }
  for (let i = nu - 1; i >= 1; i--) { rimT.push(top[i][0]); rimL.push(low[i][0]); }
  for (let k = 0; k < rimT.length; k++) {
    const a = rimT[k], b = rimT[(k + 1) % rimT.length], c = rimL[k], d = rimL[(k + 1) % rimL.length];
    B.idx.push(a, c, b, b, c, d, a, b, c, b, d, c);
  }
}
// Vertex normals from the finished faces (area-weighted), so every bump and joint shades as it is shaped. The rims'
// two-way faces cancel out.
function geoNormals(B) {
  const n = B.p.length / 3, N = new Float64Array(n * 3), P = B.p, I = B.idx;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const f = cross(e1, e2);
    for (const v of [a, b, c]) { N[v] += f[0]; N[v + 1] += f[1]; N[v + 2] += f[2]; }
  }
  for (let v = 0; v < n; v++) {
    const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
    if (l > 1e-14) { B.n[v * 3] = N[v * 3] / l; B.n[v * 3 + 1] = N[v * 3 + 1] / l; B.n[v * 3 + 2] = N[v * 3 + 2] / l; }
  }
}

// A finger's section along its length u (from the knuckle): half width, front (pad) and back half depths, squareness.
// The joints wider, and raised on the back over the bones' heads; the shafts between them a little slimmer; the pads full
// between the creases on the palm side; the end phalanx's pulp spreading to a spatulate tip under a flatter nail.
function fingerProf(f) {
  const [l0, l1, l2] = f.len, j1 = l0, j2 = l0 + l1, W = f.w / 2, D = f.d / 2;
  return (u, total) => {
    const t = Math.max(0, u) / total;
    const taper = 1 - 0.15 * t - 0.07 * t * t;
    const jw = 0.085 * gauss(u - j1, 0.0042) + 0.06 * gauss(u - j2, 0.0034);
    const jb = 0.15 * gauss(u - j1 + 0.0006, 0.0036) + 0.10 * gauss(u - j2 + 0.0005, 0.0029) + 0.09 * gauss(u, 0.006);
    const waist = 0.035 * gauss(u - (j1 + l1 * 0.5), l1 * 0.28) + 0.03 * gauss(u - l0 * 0.55, l0 * 0.28);
    const pad = 0.06 * gauss(u - l0 * 0.5, l0 * 0.3) + 0.08 * gauss(u - (j1 + l1 * 0.5), l1 * 0.3) + 0.15 * gauss(u - (j2 + l2 * 0.6), l2 * 0.32);
    const crease = 0.09 * gauss(u - j1, 0.0022) + 0.08 * gauss(u - j2, 0.0018);
    const pulp = 0.05 * gauss(u - (j2 + l2 * 0.62), l2 * 0.3);
    const flat = smooth(j2 + l2 * 0.25, j2 + l2 * 0.6, u);   // under the nail
    const root = u < 0 ? 1.04 : 1;
    return { rx: W * taper * (1 + jw - waist + pulp) * root, rf: D * taper * (1 + pad - crease), rb: D * taper * (0.9 + jb - waist * 0.5 - 0.07 * flat), e: 0.9, eb: 0.76 - 0.08 * flat };
  };
}
function thumbProf(T) {
  const [l0, l1, l2] = T.len, j1 = l0, j2 = l0 + l1;
  // every section narrower than the one before it: the metacarpal thick in the thenar, the tip the slimmest, its pad a
  // little full under the nail
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  return (u, total) => {
    const W = u < j1 ? lerp(T.w[0], T.w[1] * 1.04, u / l0) : u < j2 ? lerp(T.w[1], T.w[2] * 1.03, (u - j1) / l1) : T.w[2] * (1 - 0.10 * (u - j2) / l2);
    const D = u < j1 ? lerp(T.d[0], T.d[1] * 1.04, u / l0) : u < j2 ? lerp(T.d[1], T.d[2] * 1.03, (u - j1) / l1) : T.d[2] * (1 - 0.06 * (u - j2) / l2);
    const knuckle = gauss(u - j1, 0.006) * 0.08 + gauss(u - j2, 0.0045) * 0.07;
    const pad = gauss(u - (j2 + l2 * 0.5), l2 * 0.35) * 0.10 + gauss(u - (j1 + l1 * 0.5), l1 * 0.3) * 0.05;
    const crease = gauss(u - j2, 0.002) * 0.07;
    const flat = smooth(j2 + l2 * 0.25, j2 + l2 * 0.6, u);
    return { rx: W / 2 * (1 + knuckle * 0.5), rf: D / 2 * (1 + pad - crease), rb: D / 2 * (0.9 + knuckle - 0.07 * flat), e: 0.9, eb: 0.78 - 0.08 * flat };
  };
}

// ---- CL-334 c: the hand as one surface ------------------------------------------------------------------------------
// Jerry (10 Nov, on the first sheets): "The transitions between fingers, the fingernails. The thumb being insanely long".
// Tubes pushed into a palm always show a crease or a lip where they meet. So the hand is one closed surface: a distance
// field (the palm's shape, each digit's swept section, each digit blended into the palm with a fillet, the digits never
// into each other), meshed once on a grid (surface nets), each vertex pulled onto the surface, its normal the field's
// gradient. Each vertex is skinned to two bones by where it lies (the digit it is on and how far along, the palm, the
// thenar with the thumb), as the tubes were. Built in a pose with the fingers spread and the thumb out (BUILD) so the grid
// tells the fingers apart; the webs between them come out of the fillets. One build per hand shape, cached.
const BUILD = { f: [[0, 0, 0, 0.10], [0, 0, 0, 0], [0, 0, 0, -0.10], [0, 0, 0, -0.17]], t: [0, 0.3, 0, 0, 0] };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
// A superellipse's radius in a direction (sa = |sin|, ca = |cos| of the angle from its z axis).
function seRadius(sa, ca, rx, rz, e) {
  const q = 2 / e, t = (sa / rx) ** q + (ca / rz) ** q;
  return t > 1e-30 ? t ** (-e / 2) : rx;
}
// A digit's field: its swept section along the straight chain of its bones in the build pose (F, the first bone's frame).
function digitField(F, lens, prof, DOME, inset) {
  const Fi = inv(F), total = lens.reduce((a, b) => a + b, 0), domeStart = total - DOME, dLen = DOME + 0.0014, uEnd = domeStart + dLen;
  let rMax = 0; for (let u = -inset; u <= total; u += 0.001) { const P = prof(u, total); rMax = Math.max(rMax, P.rx, P.rf, P.rb); }
  const local = (x, y, z) => [Fi[0] * x + Fi[1] * y + Fi[2] * z + Fi[3], Fi[4] * x + Fi[5] * y + Fi[6] * z + Fi[7], Fi[8] * x + Fi[9] * y + Fi[10] * z + Fi[11]];
  const d = (x, y, z) => {
    const lx = Fi[0] * x + Fi[1] * y + Fi[2] * z + Fi[3], ly = Fi[4] * x + Fi[5] * y + Fi[6] * z + Fi[7], lz = Fi[8] * x + Fi[9] * y + Fi[10] * z + Fi[11];
    const u = -ly, rr = Math.hypot(lx, lz);
    // far away, a cheap bound (well outside the reach of any blend into the palm, or it shows as a seam: round 4's zip)
    if (rr > rMax + 0.035 || u < -inset - 0.035 || u > uEnd + 0.035) return Math.max(rr - rMax, -inset - u, u - uEnd);
    const uc = Math.max(-inset, Math.min(uEnd, u));
    const P = prof(uc, total);
    const dome = uc > domeStart ? Math.min(1, (uc - domeStart) / dLen) : 0;
    const shrink = dome > 0 ? Math.sqrt(Math.max(0, 1 - dome * dome)) : 1;
    const zc = lz + (dome > 0 ? P.rb * 0.25 * dome : 0);
    const h = Math.hypot(lx, zc);
    let dd = h;
    if (shrink > 1e-4 && h > 1e-9) {
      const ca = zc / h, front = ca >= 0;
      dd = h - seRadius(Math.abs(lx) / h, Math.abs(ca), P.rx * shrink, (front ? P.rf : P.rb) * shrink, front ? P.e : (P.eb || P.e));
    } else if (shrink > 1e-4) dd = -Math.min(P.rx, P.rf, P.rb) * shrink;
    return Math.max(dd, -inset - u, u - uEnd);
  };
  return { d, local, total, inset };
}
// The palm's field: palmAt's sections tabled by height and angle round the palm's middle; the wrist's end cut (it is in
// the sleeve), the far end rounded off past the knuckles.
function palmField(L) {
  const ox = L.ox, cz = L.mcpZ, yTop = L.wristY + 0.004, yEnd = L.mcpY - 0.0045;
  const y0 = yTop + 0.003, y1 = yEnd - 0.004, DY = 0.0007, NY = Math.ceil((y0 - y1) / DY) + 2, NT = 180, NA = 240;
  const tab = new Float32Array(NY * NT);
  for (let r = 0; r < NY; r++) {
    // the section's polar radius at each bin's angle, interpolated between the samples either side (the samples run
    // round in order: the section is star-shaped round the palm's middle)
    const y = y0 - r * DY, acc = new Float64Array(NT), th = new Float64Array(NA + 1), rad = new Float64Array(NA + 1);
    for (let k = 0; k <= NA; k++) {
      const { P } = palmAt(L, y, (k / NA) * Math.PI * 2, 0);
      const dx = P[0] - ox, dz = P[2] - cz;
      th[k] = Math.atan2(dx, dz); rad[k] = Math.hypot(dx, dz);
      if (k > 0) while (th[k] < th[k - 1] - Math.PI) th[k] += 2 * Math.PI;
      if (k > 0) while (th[k] > th[k - 1] + Math.PI) th[k] -= 2 * Math.PI;
    }
    const dir = th[NA] > th[0] ? 1 : -1;
    for (let bi = 0; bi < NT; bi++) {
      let want = -Math.PI + (bi / NT) * 2 * Math.PI;
      // into the run's range
      const lo = Math.min(th[0], th[NA]); while (want < lo) want += 2 * Math.PI; while (want >= lo + 2 * Math.PI) want -= 2 * Math.PI;
      let k = 0; while (k < NA && !((th[k] - want) * dir <= 0 && (th[k + 1] - want) * dir > 0)) k++;
      if (k >= NA) k = NA - 1;
      const t = (want - th[k]) / ((th[k + 1] - th[k]) || 1e-9);
      acc[bi] = rad[k] + (rad[k + 1] - rad[k]) * Math.max(0, Math.min(1, t));
    }
    // a light blur round the section (the polar bins are noisy where the mounds turn)
    for (let pass = 0; pass < 1; pass++) { const c = Float64Array.from(acc); for (let b = 0; b < NT; b++) acc[b] = (c[(b - 1 + NT) % NT] + 2 * c[b] + c[(b + 1) % NT]) / 4; }
    for (let b = 0; b < NT; b++) tab[r * NT + b] = acc[b];
  }
  for (let pass = 0; pass < 2; pass++) {   // and along the height
    const c = Float32Array.from(tab);
    for (let r = 1; r < NY - 1; r++) for (let b = 0; b < NT; b++) tab[r * NT + b] = (c[(r - 1) * NT + b] + 2 * c[r * NT + b] + c[(r + 1) * NT + b]) / 4;
  }
  // Catmull-Rom across both (linear left streaks in the shading at the bins' edges)
  const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const look = (yr, th) => {
    let fr = (y0 - yr) / DY; fr = Math.max(1, Math.min(NY - 2.001, fr)); const r0 = fr | 0, tr = fr - r0;
    const ft = (th + Math.PI) / (2 * Math.PI) * NT, b0 = Math.floor(ft), tb = ft - b0;
    const row = (r) => { const o = r * NT, i = (k) => tab[o + ((((b0 + k) % NT) + NT) % NT)]; return cr(i(-1), i(0), i(1), i(2), tb); };
    return cr(row(r0 - 1), row(r0), row(r0 + 1), row(r0 + 2), tr);
  };
  const yrOf = (x, y) => {
    const v = (L.wristY - y) / (L.wristY - L.mcpY), hw = 0.0262 + 0.0113 * smooth(0, 0.75, v), xs = Math.min(1, Math.abs(x - ox) / hw);
    return y - (v > 0.7 ? 0.0055 * (v - 0.7) / 0.3 * xs ** 2.2 : 0);   // palmAt's arched knuckle line, undone
  };
  const f = (x, y, z) => {
    const dx = x - ox, dz = z - cz, yr = yrOf(x, y);
    let d = Math.hypot(dx, dz) - look(yr, Math.atan2(dx, dz));
    d = smax(d, yr - yTop, 0.002);
    return smax(d, yEnd - yr, 0.007);
  };
  // CL-334 g: the palm's surface coordinates for its detail map: q, the distance round the section from its ulnar side
  // (through the palm's face, the radial side, the back) over its length P, and v, from the wrist to the knuckles
  const BU = NT / 4, arcT = new Float32Array(NY * (NT + 1)), perim = new Float32Array(NY);
  for (let r = 0; r < NY; r++) {
    let acc = 0, px = null, pz = null;
    for (let k = 0; k <= NT; k++) {
      const b = (BU + k) % NT, th = -Math.PI + (b / NT) * 2 * Math.PI, rr = tab[r * NT + b], qx = rr * Math.sin(th), qz = rr * Math.cos(th);
      if (px != null) acc += Math.hypot(qx - px, qz - pz);
      arcT[r * (NT + 1) + k] = acc; px = qx; pz = qz;
    }
    perim[r] = acc;
  }
  f.arc = (x, y, z) => {
    const yr = yrOf(x, y), v = (L.wristY - yr) / (L.wristY - L.mcpY);
    let fr = (y0 - yr) / DY; fr = Math.max(0, Math.min(NY - 1.001, fr)); const r0 = fr | 0, tr = fr - r0;
    const th = Math.atan2(x - ox, z - cz), fb = (th + Math.PI) / (2 * Math.PI) * NT;
    let k = fb - BU; while (k < 0) k += NT; while (k >= NT) k -= NT;
    const k0 = Math.floor(k), tk = k - k0;
    const at = (r) => { const o = r * (NT + 1); return { a: arcT[o + k0] + (arcT[o + k0 + 1] - arcT[o + k0]) * tk, P: perim[r], face: arcT[o + NT / 4], back: arcT[o + NT / 2 + NT / 4] }; };
    const A = at(r0), B = at(Math.min(NY - 1, r0 + 1)), mix = (p, q) => p + (q - p) * tr;
    const P = mix(A.P, B.P);
    return { q: mix(A.a, B.a) / P, v, P, sFace: mix(A.a, B.a) - mix(A.face, B.face), sBack: mix(A.a, B.a) - mix(A.back, B.back) };
  };
  f.rowAt = (v) => {   // P and where the face's and the back's middles are (q), at height v (the painter's)
    const y = L.wristY - v * (L.wristY - L.mcpY);
    let fr = (y0 - y) / DY; fr = Math.max(0, Math.min(NY - 1, Math.round(fr)));
    const o = fr * (NT + 1), P = perim[fr];
    return { P, qFace: arcT[o + NT / 4] / P, qBack: arcT[o + NT / 2 + NT / 4] / P };
  };
  return f;
}
// The whole hand's field, with what the skinning needs: the palm's field and the digits'.
function handField(L, Rb) {
  const palmD = palmField(L), digits = [];
  L.fingers.forEach((f, i) => digits.push(Object.assign(digitField(Rb[1 + i * 3], f.len, fingerProf(f), 0.0085, 0.009),
    { k: 0.0042, bones: [1 + i * 3, 2 + i * 3, 3 + i * 3], blend: [0.0045, 0.0045, 0.0035], lens: f.len })));
  const T = L.thumb;
  digits.push(Object.assign(digitField(Rb[THUMB0], T.len, thumbProf(T), 0.0085, 0.004),
    { k: 0.019, bones: [THUMB0, THUMB0 + 1, THUMB0 + 2], blend: [0.012, 0.006, 0.0045], lens: T.len, thumb: true }));
  const d = (x, y, z) => { const p = palmD(x, y, z); let m = p; for (const g of digits) m = Math.min(m, smin(p, g.d(x, y, z), g.k)); return m; };
  return { d, palmD, digits };
}
// The field's gradient (central differences) and a point pulled onto the surface d = off.
function fieldGrad(f, x, y, z, e = 0.0004) {
  const a = f(x + e, y - e, z - e), b = f(x - e, y - e, z + e), c = f(x - e, y + e, z - e), d = f(x + e, y + e, z + e);
  return norm([a - b - c + d, -a - b + c + d, -a + b - c + d]);
}
function toSurface(f, p, off = 0, it = 4) {
  let [x, y, z] = p;
  for (let k = 0; k < it; k++) {
    const d = f(x, y, z) - off; if (Math.abs(d) < 2e-6) break;
    const g = fieldGrad(f, x, y, z); x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
  }
  return [x, y, z];
}
// Where a rest point is skinned: [b0, b1, w1] (two bones). CL-334 d: every influence is a continuous field and the two
// strongest are kept, so no seam opens where one rule hands over to another (round 4's zip round the thumb's root):
// each digit by how much the point is on it rather than on the palm (and past its root), shared between the two bones of
// its chain the point lies across; the thenar with the thumb's metacarpal by its distance from that bone's line; the palm
// whatever is left.
function handSkinAt(H, L, Rb, x, y, z) {
  const p = H.palmD(x, y, z), inf = [];
  let sum = 0, bd = 1e9;
  const ds = H.digits.map((g) => { const d = g.d(x, y, z); bd = Math.min(bd, d); return d; });
  H.digits.forEach((g, gi) => {
    const d = ds[gi];
    // a digit counts where it is the nearest (or as near, give or take 4 mm: the webs between them) and nearer than the palm
    const near = 1 - smooth(0, 0.004, d - bd);
    const loc = g.local(x, y, z), u = -loc[1], lens = g.lens;
    let on = near * smooth(-0.0035, 0.0035, p - d) * smooth(-g.blend[0], g.blend[0], u);
    if (g.thumb) {
      // the thenar goes with the thumb's metacarpal: by the distance to its line (palm())
      const tF = Rb[THUMB0], tAxis = [-tF[1], -tF[5], -tF[9]], rel = [x - tF[3], y - tF[7], z - tF[11]], along = dot(rel, tAxis), T = L.thumb;
      const perp = Math.hypot(rel[0] - along * tAxis[0], rel[1] - along * tAxis[1], rel[2] - along * tAxis[2]);
      const wt = 0.9 * (1 - smooth(0.006, 0.030, perp)) * smooth(-0.014, 0.010, along) * (1 - smooth(T.len[0] - 0.012, T.len[0] + 0.008, along));
      on = Math.max(on, wt);
    }
    if (on < 1e-4) return;
    // along the digit: which bone, and the blend across its joints
    let seg = 0, c0 = 0; while (seg < 2 && u > c0 + lens[seg]) { c0 += lens[seg]; seg++; }
    const local = u - c0, bl = g.blend[seg];
    let b1 = g.bones[seg], t = 0;
    if (seg > 0 && local < bl) { b1 = g.bones[seg - 1]; t = 1 - smooth(-bl, bl, local); }
    else if (seg < 2 && local > lens[seg] - bl) { b1 = g.bones[seg + 1]; t = smooth(-bl, bl, local - lens[seg]); }
    inf.push([g.bones[seg], on * (1 - t)]); if (t > 0) inf.push([b1, on * t]);
    sum += on;
  });
  inf.push([0, Math.max(0, 1 - sum)]);
  // the same bone from two digits (none) or the palm twice: merge, then the two strongest
  const m = new Map(); for (const [b, w] of inf) m.set(b, (m.get(b) || 0) + w);
  const top = [...m].sort((A, B) => B[1] - A[1]);
  const w0 = top[0][1], w1 = top[1] ? top[1][1] : 0, tot = w0 + w1 || 1;
  return [top[0][0], top[1] ? top[1][0] : top[0][0], w1 / tot];
}
// Surface nets over the field's box: one vertex a cell the surface crosses (the mean of its edges' crossings), a quad for
// each grid edge it crosses, wound outward.
function surfaceNets(f, lo, hi, h) {
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const V = new Float32Array(nx * ny * nz), at = (i, j, k) => (k * ny + j) * nx + i;
  // a coarse pass first (every 4th node); a fine node is worked out only near the surface
  const S4 = 4, cx = Math.ceil((nx - 1) / S4) + 1, cy = Math.ceil((ny - 1) / S4) + 1, cz = Math.ceil((nz - 1) / S4) + 1, Cv = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) Cv[(k * cy + j) * cx + i] = f(lo[0] + i * S4 * h, lo[1] + j * S4 * h, lo[2] + k * S4 * h);
  const far = 1.6 * S4 * h;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const dc = Cv[(Math.round(k / S4) * cy + Math.round(j / S4)) * cx + Math.round(i / S4)];
    V[at(i, j, k)] = Math.abs(dc) > far ? dc : f(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
  }
  const cv = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), ca = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
  const P = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const val = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { val[c] = V[at(i + C[c][0], j + C[c][1], k + C[c][2])]; if (val[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((val[a] < 0) === (val[b] < 0)) continue;
      const t = val[a] / (val[a] - val[b]);
      sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; n++;
    }
    cv[ca(i, j, k)] = P.length / 3;
    P.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  const Q = [];
  const quad = (a, b, c, d, out) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; Q.push(out ? [a, b, c, d] : [a, d, c, b]); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {   // x edges
    const a = V[at(i, j, k)] < 0, b = V[at(i + 1, j, k)] < 0; if (a === b) continue;
    quad(cv[ca(i, j - 1, k - 1)], cv[ca(i, j, k - 1)], cv[ca(i, j, k)], cv[ca(i, j - 1, k)], a);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {   // y edges
    const a = V[at(i, j, k)] < 0, b = V[at(i, j + 1, k)] < 0; if (a === b) continue;
    quad(cv[ca(i - 1, j, k - 1)], cv[ca(i - 1, j, k)], cv[ca(i, j, k)], cv[ca(i, j, k - 1)], a);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {   // z edges
    const a = V[at(i, j, k)] < 0, b = V[at(i, j, k + 1)] < 0; if (a === b) continue;
    quad(cv[ca(i - 1, j - 1, k)], cv[ca(i, j - 1, k)], cv[ca(i, j, k)], cv[ca(i - 1, j, k)], a);
  }
  return { P, Q };
}
// ---- CL-334 g: the detail map's layout (round 6: "A highly highly detailed one") ---------------------------------------
// The surface is cut into six charts for its detail maps (studio/marine-hand-detail-*.png, painted by tools/hand-bake.mjs):
// the palm and the back of the hand as one (round the section from its ulnar side, wrist to knuckles), and each digit (round
// it from its side, root to tip). Each chart has a gutter either side where its pattern runs on, so a triangle across its
// seam reads on past the edge. The maps are in the second UV channel; the first stays the camo's box projection.
export const DETAIL_ATLAS = { W: 2048, H: 1024, gutter: 0.08, vPad: 0.01,
  charts: [{ x0: 0.0, w: 0.5 }, { x0: 0.5, w: 0.1 }, { x0: 0.6, w: 0.1 }, { x0: 0.7, w: 0.1 }, { x0: 0.8, w: 0.1 }, { x0: 0.9, w: 0.1 }] };
// palm v runs -0.05 .. 1.1 down the chart; a digit's u from -inset to its tip
const PALM_V = [-0.05, 1.1];
function chartUV(H, c, x, y, z) {
  if (c === 0) { const a = H.palmD.arc(x, y, z); return [a.q, (a.v - PALM_V[0]) / (PALM_V[1] - PALM_V[0])]; }
  const g = H.digits[c - 1], loc = g.local(x, y, z), u = -loc[1], th = Math.atan2(loc[0], loc[2]);
  let U = (th + Math.PI / 2) / (2 * Math.PI); U -= Math.floor(U);
  return [U, (u + g.inset) / (g.total + g.inset + 0.0014)];
}
function atlasXY(c, U, V) {
  const A = DETAIL_ATLAS, ch = A.charts[c], wi = ch.w * (1 - 2 * A.gutter);
  return [ch.x0 + ch.w * A.gutter + U * wi, A.vPad + V * (1 - 2 * A.vPad)];
}
// which chart a point is on: a digit where it is on the digit (past its root, nearer than the palm), else the palm
function chartOf(H, x, y, z) {
  const p = H.palmD(x, y, z);
  let bi = -1, bd = 1e9; H.digits.forEach((g, i) => { const d = g.d(x, y, z); if (d < bd) { bd = d; bi = i; } });
  const g = H.digits[bi], u = -g.local(x, y, z)[1];
  const on = smooth(-0.0035, 0.0035, p - bd) * smooth(-0.004, 0.006, u);
  return on > 0.5 ? bi + 1 : 0;
}

// The skin as one surface for a hand layout: { p, n, b0, b1, w1, idx } at the build pose, and the field (for the nails, the
// patches and the guard). Cached by its shape (side, place, detail).
const SURF = new Map();
function handSurface(L, Rb, hi) {
  const key = [L.s, L.ox, L.gz, hi ? 'h' : 'm'].join('|');
  if (SURF.has(key)) return SURF.get(key);
  // the shape is the same at any place (ox, gz) and the left is the right's mirror: build the right at 0, 0 once
  if (L.s !== 1 || L.ox !== 0 || L.gz !== 0) {
    const L0 = handLayout(1, 0, 0), C = handSurface(L0, boneFrames(L0, BUILD), hi), o = C.B, B = newBuf(), m = L.s;
    for (let v = 0; v < o.p.length / 3; v++) {
      B.p.push(o.p[v * 3] * m + L.ox, o.p[v * 3 + 1], o.p[v * 3 + 2] + L.gz); B.n.push(o.n[v * 3] * m, o.n[v * 3 + 1], o.n[v * 3 + 2]);
      B.b0.push(o.b0[v]); B.b1.push(o.b1[v]); B.w1.push(o.w1[v]);
    }
    for (let t = 0; t < o.idx.length; t += 3) if (m > 0) B.idx.push(o.idx[t], o.idx[t + 1], o.idx[t + 2]); else B.idx.push(o.idx[t], o.idx[t + 2], o.idx[t + 1]);
    if (o.uv1) B.uv1 = o.uv1.slice();   // the same place on the map (the left hand's maps mirror with it)
    B.keepN = true;
    const out = { B, onto: ontoFor(L, C.onto) };
    SURF.set(key, out);
    return out;
  }
  // the field only when it is needed (no bake, or the extras built here)
  const field = () => FIELD0 || (FIELD0 = handField(L, Rb)), h = hi ? 0.0030 : 0.0042;
  const ontoC = { d: (x, y, z) => field().d(x, y, z), grad: (x, y, z) => fieldGrad(field().d, x, y, z), skin: (x, y, z) => handSkinAt(field(), L, Rb, x, y, z) };
  if (hi && !handSurface.noBake) {
    const B = unbake(HAND_BAKE, 'main');
    if (B) { const out = { B, onto: ontoC }; SURF.set(key, out); return out; }
  }
  const H = field();
  // the box: the palm's and every digit's reach in the build pose
  const lo = [L.ox - 0.05, L.mcpY - 0.0145, L.mcpZ - 0.03], hi2 = [L.ox + 0.05, L.wristY + 0.012, L.mcpZ + 0.035];
  for (const g of H.digits) {
    const F = Rb[g.bones[0]];
    for (let u = 0; u <= g.total + 0.002; u += 0.004) { const q = ap(F, 0, -u, 0); for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], q[a] - 0.016); hi2[a] = Math.max(hi2[a], q[a] + 0.016); } }
  }
  const { P, Q } = surfaceNets(H.d, lo, hi2, h);
  const nv = P.length / 3;
  // relax a little (the nets' vertices sit unevenly), then onto the surface
  const nb = Array.from({ length: nv }, () => new Set());
  for (const q of Q) for (let e = 0; e < 4; e++) { nb[q[e]].add(q[(e + 1) % 4]); nb[q[(e + 1) % 4]].add(q[e]); }
  let X = Float64Array.from(P);
  for (let it = 0; it < 1; it++) {
    const Y = new Float64Array(X.length);
    for (let v = 0; v < nv; v++) {
      let sx = 0, sy = 0, sz = 0, c = 0; for (const w of nb[v]) { sx += X[w * 3]; sy += X[w * 3 + 1]; sz += X[w * 3 + 2]; c++; }
      const t = c ? 0.5 : 0;
      Y[v * 3] = X[v * 3] + ((c ? sx / c : 0) - X[v * 3]) * t; Y[v * 3 + 1] = X[v * 3 + 1] + ((c ? sy / c : 0) - X[v * 3 + 1]) * t; Y[v * 3 + 2] = X[v * 3 + 2] + ((c ? sz / c : 0) - X[v * 3 + 2]) * t;
    }
    for (let v = 0; v < nv; v++) { const q = toSurface(H.d, [Y[v * 3], Y[v * 3 + 1], Y[v * 3 + 2]], 0, 3); Y[v * 3] = q[0]; Y[v * 3 + 1] = q[1]; Y[v * 3 + 2] = q[2]; }
    X = Y;
  }
  const B = newBuf();
  for (let v = 0; v < nv; v++) {
    const x = X[v * 3], y = X[v * 3 + 1], z = X[v * 3 + 2];
    const [b0, b1, w1] = handSkinAt(H, L, Rb, x, y, z);
    addV(B, [x, y, z], fieldGrad(H.d, x, y, z), b0, b1, w1);
  }
  // quads to triangles across the shorter diagonal
  const dist = (a, b) => Math.hypot(X[a * 3] - X[b * 3], X[a * 3 + 1] - X[b * 3 + 1], X[a * 3 + 2] - X[b * 3 + 2]);
  const tris = [];
  for (const [a, b, c, d] of Q) {
    if (dist(a, c) <= dist(b, d)) tris.push(a, b, c, a, c, d); else tris.push(a, b, d, b, c, d);
  }
  // CL-334 g: each triangle on one chart (its vertices' most common), the vertices it shares with another chart or across a
  // chart's seam doubled, each copy with its own place on the detail map
  if (hi) {
    const vc = new Int8Array(nv); for (let v = 0; v < nv; v++) vc[v] = chartOf(H, X[v * 3], X[v * 3 + 1], X[v * 3 + 2]);
    const uvCache = new Map(), copy = new Map();
    const uvOf = (v, c) => { const k = v * 8 + c; let r = uvCache.get(k); if (!r) { r = chartUV(H, c, X[v * 3], X[v * 3 + 1], X[v * 3 + 2]); uvCache.set(k, r); } return r; };
    B.uv1 = [];
    for (let v = 0; v < nv; v++) { const [U, V] = uvOf(v, vc[v]); B.uv1.push(...atlasXY(vc[v], U, V)); }
    const vertFor = (v, c, wrap) => {
      if (c === vc[v] && !wrap) return v;
      const k = v * 32 + c * 2 + (wrap ? 1 : 0);
      if (copy.has(k)) return copy.get(k);
      const nvv = B.p.length / 3;
      B.p.push(B.p[v * 3], B.p[v * 3 + 1], B.p[v * 3 + 2]); B.n.push(B.n[v * 3], B.n[v * 3 + 1], B.n[v * 3 + 2]);
      B.b0.push(B.b0[v]); B.b1.push(B.b1[v]); B.w1.push(B.w1[v]);
      const [U, V] = uvOf(v, c); B.uv1.push(...atlasXY(c, U + (wrap ? 1 : 0), V));
      copy.set(k, nvv); return nvv;
    };
    for (let t = 0; t < tris.length; t += 3) {
      const vs = [tris[t], tris[t + 1], tris[t + 2]], cs = vs.map((v) => vc[v]);
      const c = cs[0] === cs[1] || cs[0] === cs[2] ? cs[0] : cs[1] === cs[2] ? cs[1] : 0;
      const Us = vs.map((v) => uvOf(v, c)[0]), wrapT = Math.max(...Us) - Math.min(...Us) > 0.5;
      for (let k = 0; k < 3; k++) B.idx.push(vertFor(vs[k], c, wrapT && Us[k] < 0.5));
    }
  } else B.idx.push(...tris);
  B.keepN = true;
  const out = { B, onto: ontoC };
  SURF.set(key, out);
  return out;
}
let FIELD0 = null;   // the right hand's field at 0, 0 (handSurface builds only that one)
// The canonical hand's field and skinning seen from a hand at L (moved to ox, gz, mirrored for the left).
function ontoFor(L, c) {
  const m = L.s, X = (x) => (x - L.ox) * m;
  return {
    d: (x, y, z) => c.d(X(x), y, z - L.gz),
    grad: (x, y, z) => { const g = c.grad(X(x), y, z - L.gz); return [g[0] * m, g[1], g[2]]; },
    skin: (x, y, z) => c.skin(X(x), y, z - L.gz)
  };
}
// ---- the bake: the first-person surface takes about half a second to build, so it ships built (studio/marine-hand-bake.js,
// written by tools/hand-bake.mjs) with a signature of everything that shapes it; a bake that no longer matches the code is
// ignored (built here instead, with a warning to bake again).
const SHAPE_FNS = () => [handLayout, thumbRest, boneFrames, sect, palmAt, fingerProf, thumbProf, seRadius, digitField, palmField, handField,
  fieldGrad, toSurface, handSkinAt, surfaceNets, handSurface, smooth, gauss, smin, smax, digitSurf, nail, knuckleGuard, shellFaces, geoNormals, hiExtras];
export function handShapeSig() {
  const src = SHAPE_FNS().map(String).join('|').replace(/\r/g, '') + JSON.stringify(BUILD);
  let h = 0x811c9dc5; for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0') + ':' + src.length;
}
const b64 = (str) => { const bin = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary'); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
const unb64 = (buf) => { const u = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'); };
let bakeWarned = false;
function unbake(K, part) {
  if (!K || !K.sig || !K[part]) return null;
  if (K.sig !== handShapeSig()) { if (!bakeWarned) { bakeWarned = true; try { console.warn('[CL-334] the hand bake is stale: building the hand here. Run node tools/hand-bake.mjs'); } catch (_) {} } return null; }
  const k = K[part];
  const P = new Float32Array(b64(k.p)), N = new Int8Array(b64(k.n)), B0 = new Uint8Array(b64(k.b0)), B1 = new Uint8Array(b64(k.b1)), W = new Uint8Array(b64(k.w1)), I = new Uint16Array(b64(k.idx));
  const B = newBuf();
  B.p = Array.from(P); B.n = Array.from(N, (x) => x / 127); B.b0 = Array.from(B0); B.b1 = Array.from(B1); B.w1 = Array.from(W, (x) => x / 255); B.idx = Array.from(I);
  if (k.uv1) B.uv1 = Array.from(new Uint16Array(b64(k.uv1)), (x) => x / 65535);
  B.keepN = true;
  return B;
}
function packBuf(B) {
  const nv = B.p.length / 3;
  if (nv > 65535) throw new Error('too many vertices for 16-bit indices: ' + nv);
  return { verts: nv, tris: B.idx.length / 3,
    p: unb64(new Float32Array(B.p)), n: unb64(Int8Array.from(B.n, (x) => Math.round(Math.max(-1, Math.min(1, x)) * 127))),
    b0: unb64(Uint8Array.from(B.b0)), b1: unb64(Uint8Array.from(B.b1)), w1: unb64(Uint8Array.from(B.w1, (x) => Math.round(Math.max(0, Math.min(1, x)) * 255))),
    idx: unb64(Uint16Array.from(B.idx)), uv1: B.uv1 ? unb64(Uint16Array.from(B.uv1, (x) => Math.round(Math.max(0, Math.min(1, x)) * 65535))) : undefined };
}
// CL-334 h (Jerry, 10 Nov, J126 rule 1, D-138: "No one part of the hand may clip through another part of the hand"): how
// deep any part of the hand goes into another part in a pose. Every vertex of the first-person surface, posed, against the
// other digits (each bone's piece of a digit moved by its bone, measured in the build pose) and, for the fingers, the palm.
// Left out: a vertex's own digit and the webs and roots where digits meet the palm (u < 15 mm; the skin folds there).
// Returns { max (mm), count (vertices deeper than tol), pairs: the deepest per 'part>into' (mm), near: the closest approach per
// pair within 6 mm (mm; below 0 is how deep) }. The canonical right hand (the left is its mirror). With inflate (the glove's
// 1.1 mm) the gloved hand: each vertex out along its normal and every other part's surface out as far.
export const GLOVE_INFLATE = 0.0011;   // the glove over the hand, along its normals (m)
const PART = (b) => b === 0 ? -1 : b >= THUMB0 ? 4 : Math.floor((b - 1) / 3);
// The first-person surface posed (the canonical right hand at 0, 0; the left is its mirror): positions (m), each vertex's
// first bone, its part (-1 the palm, 0-3 the fingers, 4 the thumb). For the grip solver and the clipping checks (CL-334 h).
// The same for the glove's pads or the nails (hiExtras: the knuckle guard and the finger pads, kind 'pads'), as drawn.
export function handPosedPart(pose, kind) {
  const L = handLayout(1, 0, 0), Rb = boneFrames(L, BUILD), B = hiExtras(kind), Mp = boneFrames(L, pose), S = Mp.map((m, k) => mul(m, inv(Rb[k])));
  const n = B.p.length / 3, p = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    const rx = B.p[v * 3], ry = B.p[v * 3 + 1], rz = B.p[v * 3 + 2], w = B.w1[v];
    let q = ap(S[B.b0[v]], rx, ry, rz); if (w > 0) { const o = ap(S[B.b1[v]], rx, ry, rz); q = [q[0] * (1 - w) + o[0] * w, q[1] * (1 - w) + o[1] * w, q[2] * (1 - w) + o[2] * w]; }
    p[v * 3] = q[0]; p[v * 3 + 1] = q[1]; p[v * 3 + 2] = q[2];
  }
  return { p, b0: B.b0, n };
}
export function handPosed(pose, inflate = 0) {   // inflate: the glove's (0.0011), along the surface's normals
  const L = handLayout(1, 0, 0), Rb = boneFrames(L, BUILD);
  const B = handSurface(L, Rb, true).B, Mp = boneFrames(L, pose), S = Mp.map((m, k) => mul(m, inv(Rb[k])));
  const n = B.p.length / 3, p = new Float32Array(n * 3), part = new Int8Array(n);
  for (let v = 0; v < n; v++) {
    const g = gloveAt(B, v, inflate, Rb), rx = B.p[v * 3] + B.n[v * 3] * g, ry = B.p[v * 3 + 1] + B.n[v * 3 + 1] * g, rz = B.p[v * 3 + 2] + B.n[v * 3 + 2] * g, w = B.w1[v];
    let q = ap(S[B.b0[v]], rx, ry, rz); if (w > 0) { const o = ap(S[B.b1[v]], rx, ry, rz); q = [q[0] * (1 - w) + o[0] * w, q[1] * (1 - w) + o[1] * w, q[2] * (1 - w) + o[2] * w]; }
    p[v * 3] = q[0]; p[v * 3 + 1] = q[1]; p[v * 3 + 2] = q[2]; part[v] = PART(B.b0[v]);
  }
  return { p, b0: B.b0, part, n, layout: L };
}
export function handClipReport(pose, tol = 0.0005, detail = false, inflate = 0) {   // inflate: the glove's (0.0011)
  const L = handLayout(1, 0, 0), Rb = boneFrames(L, BUILD), H = FIELD0 || (FIELD0 = handField(L, Rb));
  const B = handSurface(L, Rb, true).B, Mp = boneFrames(L, pose), S = Mp.map((m, k) => mul(m, inv(Rb[k]))), Si = S.map(inv);
  const segOf = (g, k) => { let c0 = 0; for (let j = 0; j < k; j++) c0 += g.lens[j]; return [c0, c0 + g.lens[k]]; };
  let max = 0, count = 0; const worst = [], near = {}, nearB = {};
  const n = B.p.length / 3;
  for (let v = 0; v < n; v++) {
    const a = PART(B.b0[v]); if (a < 0) continue;
    const gv = gloveAt(B, v, inflate, Rb), rx = B.p[v * 3] + B.n[v * 3] * gv, ry = B.p[v * 3 + 1] + B.n[v * 3 + 1] * gv, rz = B.p[v * 3 + 2] + B.n[v * 3 + 2] * gv;
    const ga = H.digits[a], ua = -ga.local(rx, ry, rz)[1];
    if (ua < 0.015) continue;
    // the posed vertex
    const A = S[B.b0[v]], w = B.w1[v], C = S[B.b1[v]];
    let p = ap(A, rx, ry, rz); if (w > 0) { const q = ap(C, rx, ry, rz); p = [p[0] * (1 - w) + q[0] * w, p[1] * (1 - w) + q[1] * w, p[2] * (1 - w) + q[2] * w]; }
    let deepest = 0, into = null, intoBone = -1;
    const pa = a === 4 ? 'thumb' : FINGERS[a];
    const seen = (nm, d, bone) => {
      const k = pa + '>' + nm; if (!(k in near) || d < near[k]) near[k] = d; if (-d > deepest) { deepest = -d; into = nm; intoBone = bone; }
      if (detail) { const kb = B.b0[v] + '>' + bone; if (!(kb in nearB) || d < nearB[kb]) nearB[kb] = d; }
    };
    H.digits.forEach((g, bi) => {
      if (bi === a) return;
      for (let k = 0; k < 3; k++) {
        const bone = g.bones[k], q = ap(Si[bone], p[0], p[1], p[2]), u = -g.local(q[0], q[1], q[2])[1], [u0, u1] = segOf(g, k);
        if (u < u0 - 0.001 || u > (k === 2 ? u1 + 0.003 : u1 + 0.001) || u < 0.012) continue;
        const d = g.d(q[0], q[1], q[2]) - gv;
        if (d < 0.006) seen(g.thumb ? 'thumb' : FINGERS[bi], d, bone);
      }
    });
    if (a < 4) { const d = H.palmD(p[0], p[1], p[2]) - inflate; if (d < 0.006) seen('palm', d, 0); }
    if (deepest > tol) { count++; if (deepest > max) max = deepest; worst.push({ part: pa, into, depth: +(deepest * 1000).toFixed(2), bone: B.b0[v], intoBone, u: +(ua * 1000).toFixed(1), at: p.map((x) => +(x * 1000).toFixed(1)) }); }
  }
  worst.sort((x, y) => y.depth - x.depth);
  const byPair = {}; for (const w of worst) { const k = w.part + '>' + w.into; byPair[k] = Math.max(byPair[k] || 0, w.depth); }
  const close = {}; for (const k in near) close[k] = +(near[k] * 1000).toFixed(2);
  const R = { max: +(max * 1000).toFixed(2), count, pairs: byPair, near: close };
  if (detail) { R.worst = worst.slice(0, 12); R.nearBone = {}; for (const k in nearB) R.nearBone[k] = +(nearB[k] * 1000).toFixed(2); }   // 'bone>bone' (mm)
  return R;
}
// The painter's facts (tools/hand-bake.mjs): each chart's kind and its digit's bones' lengths, the palm's rows.
export function handDetailInfo() {
  const L = handLayout(1, 0, 0), Rb = boneFrames(L, BUILD), H = FIELD0 || (FIELD0 = handField(L, Rb));
  return { atlas: DETAIL_ATLAS, palmV: PALM_V, palmRow: (v) => H.palmD.rowAt(v), palmLen: L.wristY - L.mcpY,
    digits: H.digits.map((g, i) => ({ thumb: !!g.thumb, lens: g.lens, total: g.total, inset: g.inset, prof: g.thumb ? thumbProf(L.thumb) : fingerProf(L.fingers[i]) })),
    fingersX: L.fingers.map((f) => f.x - L.ox) };
}
// The bake itself (tools/hand-bake.mjs): the right hand at 0, 0, built here, packed.
export function bakeHandSurface() {
  const L = handLayout(1, 0, 0), Rb = boneFrames(L, BUILD);
  handSurface.noBake = true; SURF.clear(); EXTRA.clear();
  const { B } = handSurface(L, Rb, true), pads = hiExtras('pads'), nails = hiExtras('nails');
  handSurface.noBake = false; SURF.clear(); EXTRA.clear();
  return { sig: handShapeSig(), main: packBuf(B), pads: packBuf(pads), nails: packBuf(nails) };
}
// The first-person glove's moulded pieces (the knuckle guard, a patch on each finger's first and middle phalanges) and the
// bare hand's nails, for the right hand at 0, 0 (baked with the surface; hiPlace moves and mirrors them for a hand).
const EXTRA = new Map();
function hiExtras(kind) {
  if (EXTRA.has(kind)) return EXTRA.get(kind);
  let B = handSurface.noBake ? null : unbake(HAND_BAKE, kind);
  if (!B) {
    const L = handLayout(1, 0, 0), R = boneFrames(L, BUILD), onto = handSurface(L, R, true).onto, Tm = L.thumb;
    B = newBuf();
    if (kind === 'pads') {
      const inflate = GLOVE_INFLATE;
      knuckleGuard(B, L, inflate, onto, true);
      L.fingers.forEach((f, i) => {
        const [l0, l1] = f.len, P = fingerProf(f);
        nail(B, R[1 + i * 3], 1 + i * 3, f.len, P, 0.0085, l0 * 0.22, l0 - 0.0062, 1.0, 0.0017, inflate, 0.0008, 0.05, true, onto);
        nail(B, R[2 + i * 3], 2 + i * 3, f.len, P, 0.0085, l0 + l1 * 0.2, l0 + l1 - 0.0048, 0.95, 0.0013, inflate, 0.0006, 0.05, true, onto);
      });
    } else {
      L.fingers.forEach((f, i) => { const [l0, l1, l2] = f.len, tot = l0 + l1 + l2; nail(B, R[3 + i * 3], 3 + i * 3, f.len, fingerProf(f), 0.0085, l0 + l1 + l2 * 0.36, tot - 0.0012, 0.98, 0.00042, 0, 0.0016, 0.18, false, onto); });
      { const [l0, l1, l2] = Tm.len, tot = l0 + l1 + l2; nail(B, R[THUMB0 + 2], THUMB0 + 2, Tm.len, thumbProf(Tm), 0.0085, l0 + l1 + l2 * 0.34, tot - 0.0012, 1.0, 0.00045, 0, 0.0016, 0.18, false, onto); }
    }
    geoNormals(B); B.keepN = true;
  }
  EXTRA.set(kind, B);
  return B;
}
// A canonical (right, 0, 0) buffer into B for the hand at L: moved to ox, gz, mirrored for the left (its faces turned).
function hiPlace(B, o, L) {
  const m = L.s, base = B.p.length / 3;
  for (let v = 0; v < o.p.length / 3; v++) addV(B, [o.p[v * 3] * m + L.ox, o.p[v * 3 + 1], o.p[v * 3 + 2] + L.gz], [o.n[v * 3] * m, o.n[v * 3 + 1], o.n[v * 3 + 2]], o.b0[v], o.b1[v], o.w1[v]);
  for (let t = 0; t < o.idx.length; t += 3) { const a = base + o.idx[t], b = base + o.idx[t + 1], c = base + o.idx[t + 2]; if (m > 0) B.idx.push(a, b, c); else B.idx.push(a, c, b); }
  B.keepN = true;
}
// A built surface into a fresh buffer, a glove's a little fuller (out along each normal).
// CL-334 h (J126 rule 1): the glove's thickness at a vertex: full over the palm, the backs and the pads, a quarter on a
// finger's sides, where it meets the next finger (a glove's fabric is thin there and gives), so gloved fingers in a fist
// lie side by side, not 1.7 mm through each other. Rb: the build pose's bone frames (the fingers' sides along their x).
function gloveAt(o, v, inflate, Rb) {
  const b = o.b0[v]; if (!inflate || b < 1 || b > 12) return inflate;
  const M = Rb[b], lat = o.n[v * 3] * M[0] + o.n[v * 3 + 1] * M[4] + o.n[v * 3 + 2] * M[8];
  return inflate * (1 - 0.75 * lat * lat);
}
function surfaceInto(B, S, inflate, Rb) {
  const o = S.B, base = B.p.length / 3;
  if (o.uv1) { B.uv1 = B.uv1 || []; while (B.uv1.length < base * 2) B.uv1.push(0, 0); B.uv1.push(...o.uv1); }
  for (let v = 0; v < o.p.length / 3; v++) {
    const n = [o.n[v * 3], o.n[v * 3 + 1], o.n[v * 3 + 2]], g = gloveAt(o, v, inflate, Rb);
    addV(B, [o.p[v * 3] + n[0] * g, o.p[v * 3 + 1] + n[1] * g, o.p[v * 3 + 2] + n[2] * g], n, o.b0[v], o.b1[v], o.w1[v]);
  }
  for (const i of o.idx) B.idx.push(base + i);
  B.keepN = true;
}

// Box-projected UVs (the camo's tile, as core/geometry's boxProjectUV), per vertex from its rest normal.
const CAMO_TILE = 0.42;
function uvs(B) {
  const n = B.p.length / 3, U = new Float32Array(n * 2);
  for (let v = 0; v < n; v++) {
    const x = B.p[v * 3], y = B.p[v * 3 + 1], z = B.p[v * 3 + 2], ax = Math.abs(B.n[v * 3]), ay = Math.abs(B.n[v * 3 + 1]), az = Math.abs(B.n[v * 3 + 2]);
    if (ax >= ay && ax >= az) { U[v * 2] = z / CAMO_TILE; U[v * 2 + 1] = y / CAMO_TILE; }
    else if (ay >= az) { U[v * 2] = x / CAMO_TILE; U[v * 2 + 1] = z / CAMO_TILE; }
    else { U[v * 2] = x / CAMO_TILE; U[v * 2 + 1] = y / CAMO_TILE; }
  }
  return U;
}

// buildHandMeshes({ T, s, ox, gz, mat, padMat, detail }): the hand for side s in one material (a glove when padMat is
// given: fuller, with its cuff, and the guard and pads in padMat; bare otherwise: nails). detail: 'high' (first person)
// or 'mid' (the body). Returns { L, J, skins, meshes: { main, pads } }.
export function buildHandMeshes({ T, s, ox, gz, mat, padMat = null, nailMat = null, detail = 'mid' }) {
  const L = handLayout(s, ox, gz), J = jointTable(L), R = boneFrames(L, BUILD);
  const hi = detail === 'high', glove = !!padMat;
  const inflate = glove ? GLOVE_INFLATE : 0;
  const main = newBuf(), pads = glove ? newBuf() : null, nails = !glove && hi && nailMat ? newBuf() : null;
  const Tm = L.thumb;
  if (hi) {
    // CL-334 c: first person, one surface
    surfaceInto(main, handSurface(L, R, hi), inflate, R);
  } else {
    // the body's hands, seen from the third person: the palm and five light tubes on the same layout and sections
    palm(main, L, 12, inflate, R);
    L.fingers.forEach((f, i) => {
      const bones = [1 + i * 3, 2 + i * 3, 3 + i * 3];
      digit(main, bones.map((k) => R[k]), bones, f.len, fingerProf(f), { n: 6, rootBone: 0, inset: 0.009, blend: [0.0045, 0.0045, 0.0035], step: 0.0085, inflate });
    });
    const tb = [THUMB0, THUMB0 + 1, THUMB0 + 2];
    digit(main, tb.map((k) => R[k]), tb, Tm.len, thumbProf(Tm), { n: 6, rootBone: 0, inset: 0.004, blend: [0.006, 0.005, 0.004], step: 0.0085, inflate });
  }
  if (glove) {
    // the cuff over the wrist
    const cuff = [];
    for (const [y, k] of [[L.wristY + 0.016, 1.12], [L.wristY + 0.006, 1.12], [L.wristY + 0.003, 1.09], [L.wristY - 0.002, 1.06]]) {
      const ring = [], n = hi ? 26 : 14;
      for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2, q = sect(a, 0.0285 * k, 0.0128 * k, 0.0128 * k, 0.75); ring.push(addV(main, [ox + q.x, y, L.mcpZ + q.z], [q.nx, 0, q.nz], 0)); }
      cuff.push(ring);
    }
    joinRings(main, cuff);
    // CL-334 b: the knuckle guard moulded over the knuckle heads, and a padded patch on the back of each finger's first
    // and middle phalanges, lying on the glove (they were flat plates)
    if (hi) hiPlace(pads, hiExtras('pads'), L);
    else knuckleGuard(pads, L, inflate, null, false);
  } else if (hi) {
    // nails (first person only: too small to see on the body), lying on the end phalanges
    hiPlace(nails || main, hiExtras('nails'), L);
  }
  const skins = [];
  const mk = (B, m) => {
    if (!B.keepN) geoNormals(B);
    const n = B.p.length / 3;
    const rest = new Float32Array(B.p), nrest = new Float32Array(B.n);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(B.p), 3));
    geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(B.n), 3));
    geo.setAttribute('uv', new T.BufferAttribute(uvs(B), 2));
    if (B.uv1) { const U1 = new Float32Array(n * 2); U1.set(B.uv1.slice(0, n * 2)); geo.setAttribute('uv1', new T.BufferAttribute(U1, 2)); }   // CL-334 g: the detail map
    geo.setIndex(B.idx);
    // Bounds that hold any pose (the deform never recomputes them).
    geo.boundingSphere = new T.Sphere(new T.Vector3(ox, -0.27, gz), 0.13);
    geo.boundingBox = new T.Box3(new T.Vector3(ox - 0.13, -0.40, gz - 0.13), new T.Vector3(ox + 0.13, -0.15, gz + 0.13));
    const mesh = new T.Mesh(geo, m);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = 'gb152-hand';   // the name the view model (game/viewmodel.js bodyArm) and t229 look for
    mesh.add(new T.Object3D());   // a rigid-merge pass (mergeRigidMeshes) leaves a mesh with children alone
    const b0 = new Uint8Array(B.b0), b1 = new Uint8Array(B.b1), w1 = new Float32Array(B.w1);
    const skin = { mesh, rest, nrest, seg: b0, b1, w1, stamp: -1, n };
    skins.push(skin);
    return mesh;
  };
  const meshes = { main: mk(main, mat), pads: pads ? mk(pads, padMat) : null, nails: nails ? mk(nails, nailMat) : null };
  if (hi) { skins[0].kind = glove ? 'glove' : 'bare'; if (pads) skins[1].kind = 'pads'; }   // CL-334 h: the surfaces a hold's give moves (rig.setContact)
  return { L, J, skins, meshes, rest: R };
}

// ---- the rig -------------------------------------------------------------------------------------------------------
// The rig for one hand: shared by its glove and its bare hand (only the visible one is rewritten).
export function makeHandRig(s, builds, pose = HAND_POSES.relaxed) {
  const { L, J } = builds[0];
  const skins = builds.flatMap((b) => b.skins);
  const invBind = boneFrames(L, BUILD).map(inv);   // CL-334 c: bound in the build pose
  const rig = {
    side: s, layout: L, joints: J, skins, stamp: 0,
    pose: copyPose(pose), mats: null, skinM: null,
    set(p) {
      const q = rig.pose; let same = true;
      for (let i = 0; i < 4 && same; i++) for (let j = 0; j < 4; j++) if (Math.abs((p.f[i][j] || 0) - q.f[i][j]) > 1e-4) { same = false; break; }
      for (let j = 0; j < NT && same; j++) if (Math.abs((p.t[j] || 0) - q.t[j]) > 1e-4) same = false;
      if (same) return rig;
      copyPose(p, rig.pose); rig.stamp++; rig.mats = null; rig.skinM = null; return rig;
    },
    // CL-334 h (J126 rule 2: "No part of the hand may clip through any part of a weapon"): where a hand holds a gun its
    // flesh gives. contact: one gun's hold for this hand (studio/hand-contacts.js decoded: { pose, glove, bare }, each
    // { idx, d } the surface's vertices pushed out of the grip, the canonical hand's space, metres), or null. It counts in
    // full in that hold's pose and fades out as the hand leaves it (a reload, the bolt), gone 0.12 rad from it.
    contact: null,
    setContact(c) { if (c !== rig.contact) { rig.contact = c || null; rig.stamp++; } return rig; },
    // Each bone's frame (hand space) for the current pose.
    matrices() { return rig.mats || (rig.mats = boneFrames(L, rig.pose)); },
    // A point on the hand, hand space, current pose: 'palm' (the palm's face, its middle), 'thumbTip', 'thumbBase' (the
    // thumb's knuckle, where it leaves the hand), 'thumbCmc' (its root at the wrist), '<finger>Base' (the knuckle),
    // '<finger>Mid' (the middle joint), '<finger>Tip'.
    point(name, out) {
      const M = rig.matrices(), apply = (k, x, y, z) => { const m = M[k]; return out.set(m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]); };
      if (name === 'palm') return out.set(L.ox, L.gripY, L.mcpZ + 0.0135);
      if (name === 'thumbCmc') return apply(THUMB0, 0, 0, 0);
      if (name === 'thumbBase') return apply(THUMB0 + 1, 0, 0, 0);
      if (name === 'thumbTip') return apply(THUMB0 + 2, 0, -L.thumb.len[2] - 0.001, 0);
      const fi = FINGERS.findIndex((f) => name.startsWith(f));
      if (fi < 0) return out.set(L.ox, L.gripY, L.gz);
      const f = L.fingers[fi], k = 1 + fi * 3;
      if (name.endsWith('Base')) return apply(k, 0, 0, 0);
      if (name.endsWith('Mid')) return apply(k + 1, 0, 0, 0);
      return apply(k + 2, 0, -f.len[2] - 0.001, 0);   // Tip
    },
    // Rewrite the meshes that are showing (or all, force) for the current pose.
    update(force = false) {
      let S = null;
      for (const sk of skins) {
        if (sk.stamp === rig.stamp && !force) continue;
        if (!force) { let vis = true; for (let o = sk.mesh; o; o = o.parent) { if (!o.visible) { vis = false; break; } if (o.userData && o.userData.handRoot) break; } if (!vis) continue; }
        if (!S) { const M = rig.matrices(); S = rig.skinM || (rig.skinM = M.map((m, k) => mul(m, invBind[k]))); }
        const g = sk.mesh.geometry, pa = g.attributes.position.array, na = g.attributes.normal.array, r = sk.rest, nr = sk.nrest, b0 = sk.seg, b1 = sk.b1, w1 = sk.w1;
        for (let v = 0, n = sk.n; v < n; v++) {
          const x = r[v * 3], y = r[v * 3 + 1], z = r[v * 3 + 2], nx = nr[v * 3], ny = nr[v * 3 + 1], nz = nr[v * 3 + 2];
          const A = S[b0[v]], w = w1[v];
          let px = A[0] * x + A[1] * y + A[2] * z + A[3], py = A[4] * x + A[5] * y + A[6] * z + A[7], pz = A[8] * x + A[9] * y + A[10] * z + A[11];
          let qx = A[0] * nx + A[1] * ny + A[2] * nz, qy = A[4] * nx + A[5] * ny + A[6] * nz, qz = A[8] * nx + A[9] * ny + A[10] * nz;
          if (w > 0) {
            const C = S[b1[v]], u = 1 - w;
            px = px * u + (C[0] * x + C[1] * y + C[2] * z + C[3]) * w; py = py * u + (C[4] * x + C[5] * y + C[6] * z + C[7]) * w; pz = pz * u + (C[8] * x + C[9] * y + C[10] * z + C[11]) * w;
            qx = qx * u + (C[0] * nx + C[1] * ny + C[2] * nz) * w; qy = qy * u + (C[4] * nx + C[5] * ny + C[6] * nz) * w; qz = qz * u + (C[8] * nx + C[9] * ny + C[10] * nz) * w;
            const l = Math.hypot(qx, qy, qz) || 1; qx /= l; qy /= l; qz /= l;
          }
          pa[v * 3] = px; pa[v * 3 + 1] = py; pa[v * 3 + 2] = pz; na[v * 3] = qx; na[v * 3 + 1] = qy; na[v * 3 + 2] = qz;
        }
        if (rig.contact) {   // the give, in this hand's layout (the left mirrored)
          const c = rig.contact, kind = sk.kind === 'glove' ? c.glove : sk.kind === 'bare' ? c.bare : sk.kind === 'pads' ? c.pads : null;
          if (kind) {
            let far = 0; const q = c.pose, pp = rig.pose;
            for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) far = Math.max(far, Math.abs((q.f[i][j] || 0) - pp.f[i][j]));
            for (let j = 0; j < NT; j++) far = Math.max(far, Math.abs((q.t[j] || 0) - pp.t[j]));
            const k = Math.max(0, 1 - far / 0.12);
            if (k > 0) for (let i = 0, ix = kind.idx, d = kind.d; i < ix.length; i++) { const v = ix[i]; pa[v * 3] += s * d[i * 3] * k; pa[v * 3 + 1] += d[i * 3 + 1] * k; pa[v * 3 + 2] += d[i * 3 + 2] * k; }
          }
        }
        g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
        sk.stamp = rig.stamp;
      }
      return rig;
    }
  };
  rig.update(true);
  return rig;
}

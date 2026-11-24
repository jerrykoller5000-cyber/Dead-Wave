// game/colossus-pitch.js — D-244 (Jerry, 23 Nov 2026: "Give him a sack ... that he reaches into and pulls out rocks that are
// twice the size of his fist. Make him hurl them fast at the player like a baseball pitch. All the animation for that will
// need to be redone."), Claude 5 (CE-26). The colossus's throw as a baseball pitch, on the game's own joints:
//   reach down into the sack on his throwing hip, pull the rock, the set (both hands at the chest), THE TELL (the front knee comes
//   up high, the body coils away, the rock goes down and back and up behind the head), the stride (the front foot reaches out
//   and stomps down 0.25 s before the release), the whip (hips open first, then the shoulders, the arm over the top),
//   release at the end of the wind-up, then the follow-through (the arm across to the left knee, the pivot heel up) and the
//   step back to his stance.
// Reference (rule 18): Quaternius UAL2 'OverhandThrow' (assets/anim/reference/ual.json, CC0): its beats are 0.27 s wind-up
//   (front foot strides 0.10-0.20 s), 0.10 s whip (hand from behind the head, over the top, out front), 0.10 s
//   follow-through down across the body, a held beat, recovery. A man's pitch scaled to a 5.3 m giant (time ~ sqrt(size),
//   x1.6) and its anticipation held long for the player to read it.
// Sides are the code's: the throwing arm is armRG (+x, the side without the shield), the sack hangs on +x (Claude 7's
// D-244 look), the stride leg is legLG. (The model faces +z, so +x is its anatomical left: a left-handed pitch.)
// Fairness: the tell (knee up) starts ~1.0 s before the rock leaves; the stomp is 0.25 s before it.
// Runs AFTER the walk and the feet (zombie-ability-visuals.js calls it in its colossus branch). It is a layer: every joint
// it moves is blended from what the walk wrote this frame, by the layer's weight (0 at the start and the end), so it goes in
// and out with no snap. Joints the walk never writes (a hip's yaw, an elbow's side turns, the ankles while busy) are read
// back each frame: if nobody wrote them since our last frame, they return to what they were when the throw began.
// No allocation per frame; no game state; nothing random.

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sm = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

// Ranges this layer keeps inside (game/zombie-limits.js and game/zombie-feet.js ZFEET): the ankle's pitch, twist; the elbow.
const ANKLE_MIN = -0.49, ANKLE_MAX = 0.84, ANKLE_TWIST = 0.44, INV = 0.33, ELBOW_MAX = 2.55;

// The keys. t: seconds into the throw on a 1.65 s wind-up + 0.85 s recovery (the beats are fractions: other durations
// stretch them). Units are the body's (x s, the build scale). hips: drop, side (+ over the pivot leg, +x), fwd, yaw (+ closed:
// the throwing-side hip back), roll. torso: twist (+ coiled: the +x shoulder back), lean (+ forward), side (- the +x shoulder
// down). head: yaw on the target is automatic; pitch (+ down). Feet: ankle offsets from where the foot stood when the throw
// began [side, up, fwd (metres on the 2.3 build), sole pitch (+ toe down)]; 'L' the stride foot, 'R' the pivot foot. Hands: torso-local palm targets,
// 'sack' = the sack's mouth, 'aim' = the glove arm out at the target; poles: where the elbow points.
const S = 1 / 2.3;   // the keys were laid out on the colossus at scale 2.3 (metres), stored in body units
const P = (x, y, z) => [x * S, y * S, z * S];
const KEYS = [
  { t: 0.00, w: 0, hips: [0, 0, 0, 0, 0], torso: [0, 0, 0], head: 0, L: [0, 0, 0, 0], R: [0, 0, 0, 0], hR: null, pR: [1, -0.2, -0.3], hL: null, pL: [-1, -0.3, 0] },
  // reach: he dips to the sack side and looks down into the sack
  { t: 0.20, w: 0.8, hips: [0.06, 0.06, 0, 0.10, 0.04], torso: [0.28, 0.16, -0.20], head: 0.35, L: [0, 0, 0, 0], R: [0, 0, 0, 0], hR: 'sack', pR: [1, 0.1, -0.6], hL: P(-1.25, -0.25, 0.70), pL: [-1, -0.3, 0] },
  { t: 0.40, w: 1, hips: [0.10, 0.08, 0, 0.14, 0.05], torso: [0.38, 0.24, -0.26], head: 0.50, L: [0, 0, 0, 0], R: [0, 0, 0, 0], hR: 'sack', pR: [1, 0.1, -0.6], hL: P(-1.20, -0.20, 0.75), pL: [-1, -0.3, 0] },
  // pull it out and up: the set, both hands at the chest
  { t: 0.50, w: 1, hips: [0.07, 0.05, 0, 0.12, 0.03], torso: [0.30, 0.12, -0.14], head: 0.25, L: [0, 0, 0, 0], R: [0, 0, 0, 0], hR: P(2.00, 0.05, 0.38), pR: [1, -0.3, -0.4], hL: P(-1.15, 0.15, 0.65), pL: [-1, -0.4, 0] },
  { t: 0.64, w: 1, hips: [0.04, 0.02, 0, 0.16, 0], torso: [0.22, 0.02, 0], head: 0.05, L: [0, 0, 0, 0], R: [0, 0, 0, 0], hR: P(1.10, 0.40, 1.08), pR: [1, -0.6, 0], hL: P(-0.65, 0.35, 0.80), pL: [-1, -0.6, 0] },
  { t: 0.72, w: 1, hips: [0.04, 0.04, 0, 0.18, 0], torso: [0.24, 0.00, 0], head: 0.02, L: [0, 0, 0, 0], R: [0, 0, 0, 0], hR: P(1.10, 0.45, 1.08), pR: [1, -0.6, 0], hL: P(-0.65, 0.40, 0.80), pL: [-1, -0.6, 0] },
  // THE TELL: the left knee comes up high, the body coils away, the hands rise to the chin
  { t: 0.88, w: 1, hips: [0.06, 0.12, -0.02, 0.26, -0.04], torso: [0.40, -0.06, 0.04], head: -0.05, L: [0.06, 0.62, 0.30, 0.30], R: [0, 0, 0, 0], hR: P(0.35, 0.80, 0.98), pR: [1, -0.6, 0], hL: P(-0.70, 0.75, 0.70), pL: [-1, -0.6, 0] },
  { t: 0.98, w: 1, hips: [0.08, 0.14, -0.02, 0.28, -0.05], torso: [0.46, -0.08, 0.05], head: -0.05, L: [0.07, 0.72, 0.34, 0.30], R: [0, 0, 0, 0], hR: P(0.40, 0.78, 0.93), pR: [1, -0.6, 0], hL: P(-0.75, 0.72, 0.65), pL: [-1, -0.6, 0] },
  // the hands break: the rock swings down and back, the glove points at him; the stride starts
  { t: 1.08, w: 1, hips: [0.09, 0.13, 0.02, 0.27, -0.04], torso: [0.46, -0.07, 0.04], head: -0.04, L: [0.06, 0.66, 0.42, 0.25], R: [0, 0, 0, 0], hR: P(1.70, 0.35, 0.80), pR: [1, -0.25, 0.8], hL: P(-1.05, 0.65, 0.85), pL: [-1, -0.7, 0.1] },
  { t: 1.20, w: 1, hips: [0.12, 0.10, 0.10, 0.24, -0.03], torso: [0.46, -0.04, 0.03], head: -0.02, L: [0.05, 0.50, 0.55, 0.15], R: [0, 0, 0, 0], hR: P(1.95, 0.45, -0.63), pR: [1, -0.25, 0.8], hL: 'aim', pL: [-1, -0.8, 0.2] },
  { t: 1.31, w: 1, hips: [0.14, 0.02, 0.28, 0.14, -0.01], torso: [0.48, -0.10, 0.02], head: 0, L: [0.02, 0.18, 0.85, 0], R: [0, 0, 0, 0.15], hR: P(1.85, 1.35, -0.88), pR: [1, -0.25, 0.8], hL: 'aim', pL: [-1, -0.8, 0.2] },
  // STOMP: the left foot plants, the rock cocked high behind the head, the hips already opening
  { t: 1.40, w: 1, hips: [0.16, -0.04, 0.38, 0.02, 0], torso: [0.50, -0.08, 0.04], head: 0, L: [0, 0, 1.05, 0], R: [0, 0, 0, 0.30], hR: P(0.90, 1.75, -0.70), pR: [1, -0.1, -0.2], hL: 'aim', pL: [-1, -0.8, 0.2] },
  // the whip: shoulders round, elbow high, the hand over the top
  { t: 1.53, w: 1, hips: [0.16, -0.08, 0.48, -0.16, 0], torso: [0.00, 0.22, 0.02], head: 0.05, L: [0, 0, 1.05, 0], R: [0, 0, 0.01, 0.45], hR: P(0.95, 2.10, 0.30), pR: [1, 0.3, 0.3], hL: P(-0.95, 0.45, 0.70), pL: [-1, -0.8, -0.2] },
  // RELEASE (end of the wind-up): the hand out in front, high, the arm long
  { t: 1.65, w: 1, hips: [0.16, -0.12, 0.54, -0.26, 0], torso: [-0.22, 0.32, -0.04], head: 0.10, L: [0, 0, 1.05, 0], R: [-0.02, 0, 0.025, 0.70], hR: P(1.00, 1.85, 1.05), pR: [1, 0, 0], hL: P(-1.00, 0.20, 0.40), pL: [-1, -0.6, -0.4] },
  // follow-through: the arm drives across and down to the left knee, the back heel up
  { t: 1.65 + 0.08, w: 1, hips: [0.19, -0.14, 0.57, -0.30, 0], torso: [-0.38, 0.55, -0.04], head: 0.10, L: [0, 0, 1.05, 0], R: [-0.03, 0, 0.04, 0.80], hR: P(0.15, 0.55, 1.50), pR: [1, 0.1, 0.2], hL: P(-1.02, 0.08, 0.35), pL: [-1, -0.5, -0.4] },
  { t: 1.65 + 0.17, w: 1, hips: [0.22, -0.16, 0.60, -0.34, 0], torso: [-0.52, 0.72, -0.04], head: 0.10, L: [0, 0, 1.05, 0], R: [-0.03, 0, 0.05, 0.90], hR: P(-0.30, -0.35, 0.95), pR: [1, 0.2, 0.4], hL: P(-1.05, -0.05, 0.30), pL: [-1, -0.4, -0.4] },
  { t: 1.65 + 0.36, w: 1, hips: [0.20, -0.12, 0.55, -0.28, 0], torso: [-0.40, 0.58, -0.02], head: -0.05, L: [0, 0, 1.05, 0], R: [-0.02, 0, 0.04, 0.70], hR: P(-0.15, -0.30, 0.95), pR: [1, 0.2, 0.4], hL: P(-1.10, -0.10, 0.45), pL: [-1, -0.4, -0.2] },
  // back to his stance: the left foot steps back
  { t: 1.65 + 0.58, w: 0.85, hips: [0.12, 0.04, 0.22, -0.08, 0.02], torso: [-0.10, 0.20, 0], head: 0, L: [0, 0.30, 0.55, 0.15], R: [0, 0, 0, 0.15], hR: P(1.05, -0.35, 0.65), pR: [1, -0.2, -0.2], hL: P(-1.10, -0.30, 0.65), pL: [-1, -0.3, 0] },
  { t: 1.65 + 0.85, w: 0, hips: [0, 0, 0, 0, 0], torso: [0, 0, 0], head: 0, L: [0, 0, 0, 0], R: [0, 0, 0, 0], hR: null, pR: [1, -0.2, -0.3], hL: null, pL: [-1, -0.3, 0] },
];
export const PITCH = Object.freeze({
  wind: 1.65, recovery: 0.85,
  rockLiftAt: 0.28,   // time on the key grid when the hand begins to lift the hidden rock
  rockShowsAt: 0.36,  // the top of the rock becomes visible inside the opening
  rockClearsAt: 0.53,  // the lower edge has cleared the fabric before the rock moves sideways
  rockSettlesAt: 0.71, // the rock is carried entirely by the throwing arm
  plantAt: 1.40,       // seconds: the stomp (the aim should lock here: 0.25 s before the release)
  tellAt: 0.70,        // seconds: the knee starts up
  keys: KEYS,
});
const SPLIT = 1.65;   // KEYS' wind-up / recovery boundary

// The scalar channels of one key, flattened (hand and pole vectors are resolved per frame: 'sack' and 'aim' move).
const NS = 1 + 5 + 3 + 1 + 4 + 4;   // w, hips 5, torso 3, head, L 4, R 4
const scal = KEYS.map((k) => [k.w, ...k.hips, ...k.torso, k.head, ...k.L, ...k.R]);
const times = KEYS.map((k) => k.t);

// Monotone cubic (Fritsch-Carlson, non-uniform): smooth through the keys with no overshoot, so a held value (a planted
// foot, a hold) stays exactly held and nothing swings past its key.
function hermite(i, f, h, p0, p1, m0, m1) {
  const f2 = f * f, f3 = f2 * f;
  return (2 * f3 - 3 * f2 + 1) * p0 + (f3 - 2 * f2 + f) * h * m0 + (-2 * f3 + 3 * f2) * p1 + (f3 - f2) * h * m1;
}
function slope(arr, i, get) {
  if (i <= 0 || i >= arr.length - 1) return 0;
  const h0 = times[i] - times[i - 1], h1 = times[i + 1] - times[i];
  const d0 = (get(i) - get(i - 1)) / h0, d1 = (get(i + 1) - get(i)) / h1;
  if (d0 * d1 <= 0) return 0;
  const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
  return (w1 + w2) / (w1 / d0 + w2 / d1);
}
function segment(t) {
  let i = 0; while (i < times.length - 2 && t > times[i + 1]) i++;
  const h = times[i + 1] - times[i]; return [i, h, clamp((t - times[i]) / h, 0, 1)];
}
function sampleScalars(t, out) {
  const [i, h, f] = segment(t);
  for (let c = 0; c < NS; c++) {
    const get = (j) => scal[j][c];
    out[c] = hermite(i, f, h, get(i), get(i + 1), slope(scal, i, get), slope(scal, i + 1, get));
  }
  return out;
}
// Vector channels: vec[j] is a resolved [x,y,z] per key (filled each frame for 'sack'/'aim'/null keys).
function sampleVec(t, vec, out) {
  const [i, h, f] = segment(t);
  for (let c = 0; c < 3; c++) {
    const get = (j) => vec[j][c];
    out[c] = hermite(i, f, h, get(i), get(i + 1), slope(vec, i, get), slope(vec, i + 1, get));
  }
  return out;
}

// ---- set-up (once per rig) ----------------------------------------------------------------------------------------
function chans(u) {
  const list = [];
  const add = (o, prop, axes) => { if (o) for (const a of axes) list.push([o, prop, a]); };
  add(u.hips, 'position', 'xyz'); add(u.hips, 'rotation', 'xyz'); add(u.torso, 'rotation', 'xyz'); add(u.head, 'rotation', 'xyz');
  for (const arm of [u.armLG, u.armRG]) { add(arm, 'rotation', 'xyz'); add(arm?.userData?.elbowG, 'rotation', 'xyz'); }
  for (const leg of [u.legLG, u.legRG]) { add(leg, 'rotation', 'xyz'); add(leg?.userData?.shinG, 'rotation', 'xyz'); add(leg?.userData?.shamblerAnkle, 'rotation', 'xyz'); }
  return list;
}
export function prepareColossusPitch(rig) {
  if (rig.pitch) return rig.pitch;
  const T = rig.THREE, u = rig.g.userData;
  const list = chans(u);
  const st = {
    list, hipForward: list.findIndex(([o, prop, axis]) => o === u.hips && prop === 'position' && axis === 'z'),
    snap: new Float64Array(list.length), last: new Float64Array(list.length).fill(NaN), active: false,
    t: 0, w: 0, fade: 0, fadeFrom: 0, lastStage: 'idle',
    sc: new Float64Array(NS),
    hR: KEYS.map(() => [0, 0, 0]), pR: KEYS.map(() => [0, 0, 0]), hL: KEYS.map(() => [0, 0, 0]), pL: KEYS.map(() => [0, 0, 0]),
    hand: [0, 0, 0], pole: [0, 0, 0],
    feet: [new T.Vector3(), new T.Vector3()], restHandL: [0, 0, 0], restHandR: [0, 0, 0],
    v: Array.from({ length: 13 }, () => new T.Vector3()), q: Array.from({ length: 4 }, () => new T.Quaternion()),
    m: new T.Matrix4(), m2: new T.Matrix4(), e: new T.Euler(), gq: new T.Quaternion(), soleQ: [new T.Quaternion(), new T.Quaternion()],
  };
  // Leg lengths: hip pivot -> knee (shin origin), knee -> ankle (+ the ankle's forward offset), ankle -> sole.
  st.legs = [u.legLG, u.legRG].map((leg) => {
    const shin = leg?.userData?.shinG, ankle = leg?.userData?.shamblerAnkle;
    if (!leg || !shin) return null;
    const sy = leg.scale.y;
    return { leg, shin, ankle, Lt: Math.abs(shin.position.y) * sy, Ay: ankle ? -ankle.position.y * sy : 0.36 * rig.scale * sy, Az: ankle ? ankle.position.z * leg.scale.z : 0 };
  });
  rig.pitch = st;
  return st;
}

// ---- the layer's bookkeeping -------------------------------------------------------------------------------------
function readBack(st, z) {
  // The walk writes absolute joints, except for idle fore-aft hip motion, which
  // it damps in place. Remove the damped pitch offset before using that base.
  const L = st.list;
  const idleHips = !(z?.attackWindup > 0 || z?.swingT > 0);
  for (let i = 0; i < L.length; i++) {
    const [o, prop, a] = L[i], cur = o[prop][a], last = st.last[i];
    if (st.active && cur === last) {
      o[prop][a] = st.snap[i];
      continue;
    }
    if (st.active && idleHips && i === st.hipForward) {
      const decay = cur / last;
      if (decay >= 0 && decay < 1) {
        st.snap[i] *= decay;
        o[prop][a] = st.snap[i];
        continue;
      }
    }
    st.snap[i] = cur;
  }
}
function remember(st) { const L = st.list; for (let i = 0; i < L.length; i++) { const [o, prop, a] = L[i]; st.last[i] = o[prop][a]; } }

// ---- two-bone solves ---------------------------------------------------------------------------------------------
// A leg on its hip pivot (hips space), the knee a hinge about the shin's x, the abduction on the leg's z (Euler XYZ).
// Returns [legX, legZ, knee] for the ankle at `t` (hips space).
function legSolve(G, px, py, pz, t, out) {
  const dx = t.x - px, dy = t.y - py, dz = t.z - pz;
  let r = Math.hypot(dx, dy, dz);
  const { Lt, Ay, Az } = G;
  const reach = (k) => { const A = Lt + Ay * Math.cos(k) + Az * Math.sin(k), B = -Ay * Math.sin(k) + Az * Math.cos(k); return Math.hypot(A, B); };
  const rMax = reach(0.02), rMin = reach(2.3);
  r = clamp(r, rMin, rMax);
  let lo = 0.02, hi = 2.3;   // reach falls as the knee bends
  for (let n = 0; n < 24; n++) { const mid = (lo + hi) / 2; if (reach(mid) > r) lo = mid; else hi = mid; }
  const k = (lo + hi) / 2, A = Lt + Ay * Math.cos(k) + Az * Math.sin(k), B = -Ay * Math.sin(k) + Az * Math.cos(k);
  const rz = Math.asin(clamp(dx / Math.max(1e-6, A), -0.6, 0.6));
  const x = Math.atan2(dz, dy) - Math.atan2(B, -A * Math.cos(rz));
  out[0] = Math.atan2(Math.sin(x), Math.cos(x)); out[1] = rz; out[2] = k;
  return out;
}
// An arm on its shoulder (torso space): the elbow placed toward `pole`, the upper arm turned so the elbow is a pure hinge
// (its x), bending toward the arm's front. Writes arm.quaternion's target to qOut and returns the elbow's x.
function armSolve(st, arm, elbow, s, target, pole, qOut) {
  const [d, pl, ep, ax, ay, az, fv] = st.v;
  const upper = Math.abs(elbow.position.y * arm.scale.y);
  const palm = 0.354 * s * Math.abs(elbow.scale.y);
  d.set(target[0], target[1], target[2]).sub(arm.position);
  const r = d.length(); if (r < 1e-5) return elbow.rotation.x; d.multiplyScalar(1 / r);
  // the forearm's length through the arm's uneven scale depends on the bend: two passes
  let a = 1.2, lower = palm * arm.scale.y;
  for (let n = 0; n < 2; n++) {
    // soft reach: the arm eases into full length instead of snapping straight when the target runs out past it
    const full = upper + lower - 0.002, soft = 0.1 * full, knee = full - soft;
    const rs = r > knee ? knee + soft * (1 - Math.exp(-(r - knee) / soft)) : r;
    const rr = clamp(rs, Math.abs(upper - lower) + 0.002, full);
    const along = (upper * upper + rr * rr - lower * lower) / (2 * rr), across = Math.sqrt(Math.max(0, upper * upper - along * along));
    pl.set(pole[0], pole[1], pole[2]).addScaledVector(d, -pl.dot(d)); if (pl.lengthSq() < 1e-8) pl.set(0, 0, 1).addScaledVector(d, -d.z); pl.normalize();
    ep.copy(d).multiplyScalar(along).addScaledVector(pl, across);   // the elbow, from the shoulder
    fv.copy(d).multiplyScalar(rr).sub(ep);                            // the forearm
    // the upper arm's frame: -y along the bone, +z toward where the forearm goes (a pure hinge bends that way), x = y cross z
    ay.copy(ep).normalize().negate();
    const cosPhi = -fv.dot(ay) / Math.max(1e-6, fv.length());       // 1 = straight
    az.copy(fv).addScaledVector(ay, -fv.dot(ay)); if (az.lengthSq() < 1e-10) az.copy(pl).addScaledVector(ay, -pl.dot(ay)); az.normalize();
    ax.crossVectors(ay, az).normalize();
    const phi = Math.acos(clamp(cosPhi, -1, 1));
    // through the arm's own scale (y, z): tan(a) = (sy / sz) tan(phi)
    a = clamp(Math.atan2(Math.sin(phi) * arm.scale.y, Math.cos(phi) * arm.scale.z), 0, ELBOW_MAX);
    lower = palm * Math.hypot(arm.scale.y * Math.cos(a), arm.scale.z * Math.sin(a));
  }
  st.m.makeBasis(ax, ay, az); qOut.setFromRotationMatrix(st.m);
  return -a;
}

// ---- the pose ----------------------------------------------------------------------------------------------------
function resolveHands(st, rig, u, s) {
  const [w0, w1] = st.v;
  // the sack's mouth in torso space (a fallback point on the +x hip if there is no sack)
  const sack = rig.sack || rig.g.getObjectByName?.('colossus-sack');
  if (sack) { rig.sack = sack; const m = sack.userData?.mouth; if (Array.isArray(m)) w0.fromArray(m); else w0.set(m ? m.x : 0, m ? m.y : 0, m ? m.z : 0); sack.localToWorld(w0); u.torso.worldToLocal(w0); }
  else { w0.set(0.34 * s, 0.06 * s, -0.12 * s); u.hips.localToWorld(w0); u.torso.worldToLocal(w0); }
  // the glove arm at the target: from the left shoulder, along the body's forward (the runtime faces him at the target)
  w1.set(0, 0, 1).transformDirection(rig.g.matrixWorld);
  st.q[3].copy(u.torso.getWorldQuaternion(st.q[2])).invert(); w1.applyQuaternion(st.q[3]);
  const sh = u.armLG ? u.armLG.position : w1;
  for (let j = 0; j < KEYS.length; j++) {
    const k = KEYS[j];
    const R = k.hR === 'sack' ? [w0.x, w0.y, w0.z] : k.hR ? [k.hR[0] * s, k.hR[1] * s, k.hR[2] * s] : st.restHandR;
    const L = k.hL === 'aim' ? [sh.x + w1.x * 1.30 * S * s, sh.y + 0.10 * S * s + w1.y * 1.30 * S * s, sh.z + w1.z * 1.30 * S * s] : k.hL ? [k.hL[0] * s, k.hL[1] * s, k.hL[2] * s] : st.restHandL;
    for (let c = 0; c < 3; c++) { st.hR[j][c] = R[c]; st.hL[j][c] = L[c]; st.pR[j][c] = k.pR[c]; st.pL[j][c] = k.pL[c]; }
  }
}
function palmOf(st, arm, s, out, rock) {
  // the IK's end is the wrist (-0.354 s, the rig's hand point); the rock sits on the palm's centre (Claude 7's socket)
  if (rock && rock.isVector3) out.copy(rock); else out.set(0, -0.354 * s, 0.02 * s);
  arm.userData.elbowG.localToWorld(out); return out;
}

/**
 * Pose the colossus's throw. state is the runtime's {kind:'stone', stage, progress}. Returns true while the layer is on.
 * Call every frame after the walk (the visuals' colossus branch), also when idle (it finishes a fade and lets go).
 */
export function poseColossusPitch(rig, z, state, now) {
  const st = prepareColossusPitch(rig), g = rig.g, u = g.userData, s = rig.scale;
  if (!u.torso) return false;   // (no hips or legs: an arms-only rig, e.g. the props' own test; the arms still pitch)
  const stage = state && state.kind === 'stone' ? state.stage : 'idle';
  const p = clamp(state && Number.isFinite(state.progress) ? state.progress : 0, 0, 1);
  const throwing = stage === 'windup' || stage === 'release' || stage === 'recovery';
  // the layer's clock (seconds on the 1.65 + 0.85 key grid)
  let t;
  if (stage === 'windup') t = p * SPLIT;
  else if (stage === 'release') t = SPLIT;
  else if (stage === 'recovery') t = SPLIT + p * (KEYS[KEYS.length - 1].t - SPLIT);
  const dtGuess = Number.isFinite(now) && Number.isFinite(st.now) ? clamp(now - st.now, 0, 0.25) : 0;
  st.now = now;
  if (!throwing) {
    if (!st.active) return false;
    // cancelled mid-throw (or just ended): fade out from the last pose over 0.3 s
    if (st.lastStage !== 'fade') { st.fadeFrom = st.w; st.fade = 0; }
    st.fade += dtGuess;
    t = st.t;
    const wf = st.fadeFrom * (1 - sm(st.fade / 0.3));
    if (wf <= 1e-4) { readBack(st, z); st.active = false; st.lastStage = 'idle'; if (rig.heldRock) rig.heldRock.visible = false; return false; }
    st.lastStage = 'fade';
    apply(st, rig, z, u, s, t, wf, now);
    if (rig.heldRock) rig.heldRock.visible = false;
    return true;
  }
  if (!st.active) {
    // the throw begins: where the feet stand now, and the hands' rest, in the walk's pose of this frame
    readBack(st, z);
    st.active = true; st.last.fill(NaN);
    g.updateMatrixWorld(true);
    const gqi = g.getWorldQuaternion(st.q[0]).invert();
    for (let i = 0; i < 2; i++) { const G = st.legs[i]; if (G && G.ankle) { G.ankle.getWorldPosition(st.feet[i]); g.worldToLocal(st.feet[i]); G.ankle.getWorldQuaternion(st.soleQ[i]).premultiply(gqi); } }
    for (const [arm, out] of [[u.armRG, st.restHandR], [u.armLG, st.restHandL]]) if (arm) { const v = palmOf(st, arm, s, st.v[7]); u.torso.worldToLocal(v); out[0] = v.x; out[1] = v.y; out[2] = v.z; }
  }
  st.t = t; st.lastStage = stage;
  sampleScalars(t, st.sc); st.w = clamp(st.sc[0], 0, 1);
  apply(st, rig, z, u, s, t, st.w, now);
  // the rock: in the throwing palm from the moment the hand is in the sack until it leaves the hand
  if (rig.heldRock) {
    const show = stage === 'windup' && t >= PITCH.rockShowsAt && !(z?.partsLost?.armR);
    rig.heldRock.visible = show || stage === 'release';
    const v = palmOf(st, u.armRG, s, st.v[8], rig.rockPalm);
    const guideWeight = show ? pickupWeight(rig, t) : 0;
    if (guideWeight) v.lerp(pickupCenter(st, rig, t), guideWeight);
    rig.heldRock.parent.worldToLocal(v); rig.heldRock.position.copy(v);
    rig.heldRock.rotation.set(0.4 + t * 1.3, 0.6, 0.35);
    if (guideWeight) {
      rig.sack.getWorldQuaternion(st.q[1]);
      rig.heldRock.parent.getWorldQuaternion(st.q[2]).invert();
      rig.heldRock.quaternion.slerp(st.q[2].multiply(st.q[1]), guideWeight);
    }
    if (stage === 'release') rig.heldRock.visible = false;   // the thrown rock takes over from here (launch = this point)
  }
  return true;
}

function pickupCenter(st, rig, t) {
  const sack = rig.sack;
  const lift = sm((t - PITCH.rockLiftAt) / (PITCH.rockClearsAt - PITCH.rockLiftAt));
  const carry = sm((t - PITCH.rockClearsAt) / (PITCH.rockSettlesAt - PITCH.rockClearsAt));
  const point = st.v[10].copy(sack.userData.rockEntry).lerp(sack.userData.rockExit, lift);
  // Carry the lower edge over the lip as the hand turns toward the set.
  point.addScaledVector(st.v[12].set(.26, .23, .05), 4 * carry * (1 - carry));
  // A slight turn along the fabric lip clears the throwing shoulder.
  const liftTurn = sm((t - .36) / .03) * (1 - sm((t - .465) / .06));
  point.z -= .045 * liftTurn;
  // Finish moving outboard as the hand closes on the rock for the set.
  point.x += .18 * sm((t - .612) / .028) * (1 - sm((t - .663) / .041));
  return sack.localToWorld(point);
}

function pickupWeight(rig, t) {
  if (!rig.sack?.userData.rockExit) return 0;
  return sm((t - .19) / (PITCH.rockLiftAt - .19))
    * (1 - sm((t - PITCH.rockClearsAt) / (PITCH.rockSettlesAt - PITCH.rockClearsAt)));
}

function apply(st, rig, z, u, s, t, w, now) {
  readBack(st, z);
  const g = rig.g, sc = st.sc, lost = z?.partsLost || {};
  const [hy, hx, hz, hyaw, hroll, tw, tl, ts, hp] = [sc[1], sc[2], sc[3], sc[4], sc[5], sc[6], sc[7], sc[8], sc[9]];
  // hips and spine: a layer over the walk's own values
  const m = s * S;   // hips and feet keys are metres on the 2.3 build
  if (u.hips) {
    u.hips.position.y -= hy * m * w; u.hips.position.x += hx * m * w; u.hips.position.z += hz * m * w;
    u.hips.rotation.y += hyaw * w; u.hips.rotation.z += hroll * w;
  }
  u.torso.rotation.y += tw * w; u.torso.rotation.x += tl * w; u.torso.rotation.z += ts * w;
  if (u.head && !lost.head) {
    // eyes on him: the head takes back most of the body's turn and the lean
    u.head.rotation.y += clamp(-(hyaw + tw) * 0.85, -1.2, 1.2) * w;
    u.head.rotation.x += (hp - tl * 0.6) * w;
  }
  g.updateMatrixWorld(true);
  // legs: the ankle on its target (the stance it began in + the key's offset), the sole flat (or on its toe)
  const hipsInv = u.hips ? st.m2.copy(u.hips.matrix).invert() : null;
  g.getWorldQuaternion(st.gq);
  for (let i = 0; i < 2 && hipsInv; i++) {
    const G = st.legs[i]; if (!G || !G.ankle || lost[i ? 'legR' : 'legL']) continue;
    const o = i ? 14 : 10;   // sc: w, hips 5, torso 3, head, L 4 (10-13), R 4 (14-17)
    const side = i ? 1 : -1;
    const tgt = st.v[0].copy(st.feet[i]);
    tgt.x += sc[o] * m * side * w; tgt.y += sc[o + 1] * m * w; tgt.z += sc[o + 2] * m * w;
    const pitch = sc[o + 3] * w;
    if (pitch > 0) {
      // on the toe: the ankle swings up and forward round the toe as the heel lifts (the bind's ankle-to-toe, measured)
      const toeZ = 0.334 / 2.3 * s, up = 0.13 / 2.3 * s;
      tgt.y += up * (Math.cos(pitch) - 1) + toeZ * Math.sin(pitch);
      tgt.z += toeZ * (1 - Math.cos(pitch)) + up * Math.sin(pitch);
    }
    tgt.applyMatrix4(hipsInv);
    const r = legSolve(G, G.leg.position.x, G.leg.position.y, G.leg.position.z, tgt, st.hand);
    // the legs solve the blended body exactly (the feet stay where they stood); a cancelled throw lets them go with the rest
    const wl = st.lastStage === 'fade' ? w : 1;
    G.leg.rotation.x += (r[0] - G.leg.rotation.x) * wl;
    G.leg.rotation.z += (r[1] - G.leg.rotation.z) * wl;
    G.leg.rotation.y *= 1 - wl;
    G.shin.rotation.x += (r[2] - G.shin.rotation.x) * wl;
    // the sole: the turn it stood with when the throw began (in the body's frame), pitched by the key (+ toe down), read
    // through the shin's real turn (hips roll, abduction and all); inside the ankle's ranges
    G.shin.updateWorldMatrix(true, false);
    const qs = G.shin.getWorldQuaternion(st.q[1]).invert();
    const qd = st.q[2].copy(st.gq).multiply(st.soleQ[i]).multiply(st.q[3].setFromAxisAngle(st.v[9].set(1, 0, 0), pitch));
    st.e.setFromQuaternion(qs.multiply(qd), 'XYZ');
    const ax = clamp(st.e.x, ANKLE_MIN, ANKLE_MAX), ay = clamp(st.e.y, -ANKLE_TWIST, ANKLE_TWIST), az = clamp(st.e.z, -INV, INV);
    G.ankle.rotation.set(G.ankle.rotation.x + (ax - G.ankle.rotation.x) * wl, G.ankle.rotation.y + (ay - G.ankle.rotation.y) * wl, G.ankle.rotation.z + (az - G.ankle.rotation.z) * wl);
  }
  g.updateMatrixWorld(true);
  // The reach and the emerging rock use the sack's position after this frame's swing.
  swingColossusSack(rig, z, now, w);
  resolveHands(st, rig, u, s);
  for (let i = 0; i < 2; i++) {
    const arm = i ? u.armRG : u.armLG, elbow = arm?.userData?.elbowG;
    if (!arm || !elbow || lost[i ? 'armR' : 'armL'] || arm.visible === false) continue;
    sampleVec(t, i ? st.hR : st.hL, st.hand); sampleVec(t, i ? st.pR : st.pL, st.pole);
    const baseArm = st.q[3].copy(arm.quaternion);
    const baseElbow = elbow.rotation.x;
    elbow.rotation.y *= 1 - w; elbow.rotation.z *= 1 - w;
    const weight = i && rig.rockPalm && st.lastStage === 'windup' ? pickupWeight(rig, t) : 0;
    // The arm solver targets the wrist. During pickup, correct that target by the
    // world-space difference between the sack guide and the rock's held position.
    const iterations = weight > .001 ? 4 : 1;
    if (iterations > 1) {
      st.pole[0] += (.35 - st.pole[0]) * weight;
      st.pole[1] += (.90 - st.pole[1]) * weight;
      st.pole[2] += (.80 - st.pole[2]) * weight;
    }
    const guide = iterations > 1 ? u.torso.worldToLocal(pickupCenter(st, rig, t)) : null;
    const target = st.v[11].fromArray(st.hand);
    for (let solve = 0; solve < iterations; solve++) {
      const ex = armSolve(st, arm, elbow, s, st.hand, st.pole, st.q[0]);
      arm.quaternion.copy(baseArm).slerp(st.q[0], w);
      elbow.rotation.x = baseElbow + (ex - baseElbow) * w;
      if (solve < iterations - 1) {
        const held = u.torso.worldToLocal(palmOf(st, arm, s, st.v[12], rig.rockPalm));
        target.addScaledVector(held.sub(guide), -.7 * weight).toArray(st.hand);
      }
    }
  }
  g.updateMatrixWorld(true);
  remember(st);
}

/**
 * The sack and tether swing from a torso-fixed belt knot (the 'colossus-sack' group origin). The sack stays under
 * gravity whatever the body does, lags and swings on the moves and steps. Call every frame after the pose.
 */
export function swingColossusSack(rig, z, now, pitchWeight = 0) {
  const sack = rig.sack || rig.g.getObjectByName?.('colossus-sack'); if (!sack || !sack.parent) return;
  rig.sack = sack;
  const T = rig.THREE, ss = rig.sackSwing || (rig.sackSwing = { x: 0, z: 0, vx: 0, vz: 0, p: new T.Vector3(), v: new T.Vector3(), a: new T.Vector3(), t: NaN, w: new T.Vector3(), q: new T.Quaternion(), q2: new T.Quaternion(), e: new T.Euler(), inv: new T.Quaternion() });
  rig.g.updateMatrixWorld(true);
  const p = sack.getWorldPosition(ss.w);
  const dt = Number.isFinite(ss.t) ? clamp(now - ss.t, 0, 0.1) : 0; ss.t = now;
  if (dt > 1e-4) {
    const vx = (p.x - ss.p.x) / dt, vy = (p.y - ss.p.y) / dt, vz = (p.z - ss.p.z) / dt;
    const ax = (vx - ss.v.x) / dt, ay = (vy - ss.v.y) / dt, az = (vz - ss.v.z) / dt;
    ss.v.set(vx, vy, vz);
    // into the body's own frame (yaw only), a pendulum of the sack's length, heavy and well damped
    const yaw = rig.g.rotation.y, c = Math.cos(yaw), sn = Math.sin(yaw);
    const fwd = ax * sn + az * c, side = ax * c - az * sn;
    const L = (sack.userData.length || 0.35) * rig.scale, gEff = Math.max(2, 9.8 + clamp(ay, -20, 20));
    const k = gEff / L, damp = 2 * 0.55 * Math.sqrt(k);
    ss.vx += (-k * Math.sin(ss.x) - (clamp(fwd, -40, 40) / L) * Math.cos(ss.x) - damp * ss.vx) * dt;
    ss.vz += (-k * Math.sin(ss.z) + (clamp(side, -40, 40) / L) * Math.cos(ss.z) - damp * ss.vz) * dt;
    ss.x = clamp(ss.x + ss.vx * dt, -0.6, 0.6); ss.z = clamp(ss.z + ss.vz * dt, -0.5, 0.5);
  }
  ss.p.copy(p);
  // Keep the cinch at the belt while the sack's weight swings out as the waist drives forward.
  const phase = rig.pitch?.t ?? 0;
  const closure = sack.userData.closure;
  if (closure) {
    const opening = sm((phase - .08) / .18) * (1 - sm((phase - .69) / .31));
    closure[0] = 1 - sm(pitchWeight / .96) * opening;
  }
  const stride = pitchWeight * sm((phase - 1.10) / .23) * (1 - sm((phase - 2.15) / .33));
  const torsoYaw = rig.g.userData.torso.rotation.y + (rig.g.userData.hips?.rotation.y ?? 0);
  const settle = sm((phase - 1.76) / .22) * (1 - sm((phase - 2.32) / .18));
  const sway = 1 - .8 * settle;
  ss.e.set(ss.x * sway + .17 * stride, rig.g.rotation.y + .9 * torsoYaw * stride,
    ss.z * sway + .29 * stride, 'YXZ'); ss.q.setFromEuler(ss.e);
  sack.parent.getWorldQuaternion(ss.inv).invert();
  sack.quaternion.copy(ss.inv).multiply(ss.q);
}

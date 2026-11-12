// CB-289 (Jerry, 10 Nov: "Setting limits for extension in the arms would prevent impossible movements"; J127, D-139, the
// anatomy rule: no part of the player's body bends or turns in a way a body can't). One table for the arm's joints in
// third person, the same numbers as the first person's (game/viewmodel.js WRIST_LIMITS) and the hand's
// (studio/marine-hand.js JOINT_LIMITS), and the maths that holds a pose inside it. Pure: plain {x, y, z, w} quaternions,
// no three.js, so the page, the tools and node all use the same code. CB-291 grows this file into every joint.
//
// The arm, third person (studio/marine-body.js): the elbow is a hinge about its own x; the forearm hangs along -y from it;
// the wrist (elbowG.userData.wrist) turns the hand on the forearm. Seen from the hand at rest: +y toward the elbow, +z the
// palm's side, +x * side the thumb's edge (side +1 the right hand, -1 the left), as game/viewmodel.js has it.
//
//   wrist     toward the palm (flexion) 75 deg, back (extension) 70, toward the thumb (radial) 20, toward the little
//             finger (ulnar) 35; between them on an ellipse
//   forearm   turns (pronation / supination) at most 85 deg either way from neutral: the forearm's own roll (index.html
//             rollForearm) and any turn about the forearm's line left at the wrist count together
//   elbow     0 (straight) to 150 deg; never backwards
//
// Exceptions (rule 25: "unless ... it looks right for that one case (named, with its reason, in the limits table)"):
// BODY_EXCEPTIONS lists each one with what it widens, by how much and when. Nothing else may go past the table.
export const DEG = Math.PI / 180;

export const ARM_LIMITS = Object.freeze({
  wrist: Object.freeze({ flex: 75 * DEG, ext: 70 * DEG, radial: 20 * DEG, ulnar: 35 * DEG }),
  twist: 85 * DEG,
  elbow: Object.freeze([0, 150 * DEG])
});

export const BODY_EXCEPTIONS = Object.freeze([
  Object.freeze({
    id: 'support-foregrip',
    joints: Object.freeze(['wrist', 'twist']),
    side: 'support',
    over: 60 * DEG,
    when: 'the support hand on a vertical foregrip (the launcher, the flamer, the minigun\'s peg) or a pump (the shotgun)',
    reason: 'CB-289 (b), CLAUDE DIRECTOR 10 Nov 23:24Z: a hand round an upright grip or a pump held under the marine\'s ' +
      'short arms needs the wrist and the forearm\'s turn past the table (the experiment: up to about 60 deg) to close on ' +
      'it; a real shooter\'s elbow drops and the shoulder turns in instead, which this rig does not do yet'
  })
]);

// How far an exception lets the joint go past the table (radians), 0 when none applies.
export function exceptionOver(id, joint) {
  const e = id ? BODY_EXCEPTIONS.find((x) => x.id === id) : null;
  return e && e.joints.includes(joint) ? e.over : 0;
}

const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function qmul(a, b, out) {
  const x = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
  const y = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
  const z = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
  const w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;
  out.x = x; out.y = y; out.z = z; out.w = w; return out;
}
function qnorm(q) { const l = Math.hypot(q.x, q.y, q.z, q.w) || 1; q.x /= l; q.y /= l; q.z /= l; q.w /= l; return q; }
// A wrist's turn q (the hand on the forearm) as anatomy reads it, radians: flex (> 0 toward the palm, < 0 back), dev
// (> 0 toward the thumb, < 0 toward the little finger), twist (about the forearm's line, as the forearm would turn it).
// Bent toward the palm, the forearm leans toward the palm seen from the hand; bent toward the thumb (radial), it leans
// toward the thumb's edge (the hand's +x * side): the thumb's side of the hand comes up toward the forearm's.
// The turn is split as q = twist * swing: the swing bends the hand off the forearm's line, the twist turns it about it.
export function wristAngles(q, side = 1) {
  const tw = 2 * Math.atan2(q.y, q.w);
  const d = invRot(q, [0, 1, 0]);
  // dev as the lean out of the forearm's flexion plane (asin), so a bend past 90 deg toward the palm still reads no sideways bend
  return { flex: Math.atan2(d[2], d[1]), dev: Math.asin(Math.max(-1, Math.min(1, d[0] * side))), twist: wrapA(tw) };
}

// Where a wrist's bend sits against the ellipse (1 on its edge), with `over` added to each of its four limits.
export function wristOver(flex, dev, over = 0) {
  const W = ARM_LIMITS.wrist;
  const lf = (flex >= 0 ? W.flex : W.ext) + over, ld = (dev >= 0 ? W.radial : W.ulnar) + over;
  return (flex / lf) * (flex / lf) + (dev / ld) * (dev / ld);
}

// Hold a wrist's turn q (changed in place) inside the table. roll: the forearm's own turn already taken (radians, the
// same sense as the wrist's twist), so the two together stay within ARM_LIMITS.twist; exception: a BODY_EXCEPTIONS id
// that applies to this hand now, or null. Returns what it found and what it did, for the checks.
export function clampWrist(q, side = 1, roll = 0, exception = null) {
  qnorm(q);
  const a = wristAngles(q, side);
  const oW = exceptionOver(exception, 'wrist'), oT = exceptionOver(exception, 'twist');
  const tMax = ARM_LIMITS.twist + oT;
  // the twist left at the wrist: what keeps roll + twist inside +-tMax (the forearm's own roll is never undone here)
  const lo = Math.min(0, -tMax - roll), hi = Math.max(0, tMax - roll);
  const twist = Math.max(lo, Math.min(hi, a.twist));
  const e = wristOver(a.flex, a.dev, oW);
  let flex = a.flex, dev = a.dev;
  const changed = twist !== a.twist || e > 1;
  if (changed) {
    // q = t * s: the twist t about the forearm's line (+y), the swing s about a line across it. The swing's angle is cut
    // back (by halves, 24 steps) until the bend sits on the ellipse; the twist is set to what is allowed.
    const t0 = { x: 0, y: -Math.sin(a.twist / 2), z: 0, w: Math.cos(a.twist / 2) };   // the inverse of q's own twist
    const s = qnorm(qmul(t0, q, { x: 0, y: 0, z: 0, w: 1 }));
    if (s.w < 0) { s.x = -s.x; s.y = -s.y; s.z = -s.z; s.w = -s.w; }
    const sAng = 2 * Math.acos(Math.min(1, s.w)), sl = Math.hypot(s.x, s.y, s.z);
    const ax = sl < 1e-9 ? [1, 0, 0] : [s.x / sl, s.y / sl, s.z / sl];
    const swingAt = (k) => { const h = k * sAng / 2, sn = Math.sin(h); return { x: ax[0] * sn, y: ax[1] * sn, z: ax[2] * sn, w: Math.cos(h) }; };
    let k = 1;
    if (e > 1) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2, g = wristAngles(swingAt(m), side); if (wristOver(g.flex, g.dev, oW) > 1) hi = m; else lo = m; }
      k = lo;
    }
    const sw = swingAt(k), g = wristAngles(sw, side);
    flex = g.flex; dev = g.dev;
    const t = { x: 0, y: Math.sin(twist / 2), z: 0, w: Math.cos(twist / 2) };
    qmul(t, sw, q); qnorm(q);
  }
  return { flex: a.flex, dev: a.dev, twist: a.twist, roll, over: e, exception: exception || null,
    held: changed ? { flex, dev, twist } : null };
}

// The elbow's bend, held inside 0..150 deg. hinge: the elbow group's x turn as the rig has it (bending forward is
// negative, index.html solveArmIK); lean: how far forward the forearm already leans at hinge 0 (the rig's forearm runs from
// the elbow to the wrist, which sits forward of the elbow's -y), so the bend is lean - hinge. Returned as a hinge.
export function elbowBend(hinge, lean = 0) { return lean - hinge; }
export function clampElbowHinge(hinge, lean = 0) {
  const bend = Math.max(ARM_LIMITS.elbow[0], Math.min(ARM_LIMITS.elbow[1], lean - hinge));
  return lean - bend;
}

// For the checks: is this wrist's turn inside the table (with the exception's allowance), within tol radians?
export function wristInside(q, side = 1, roll = 0, exception = null, tol = 0.01) {
  const a = wristAngles(q, side);
  const oW = exceptionOver(exception, 'wrist'), oT = exceptionOver(exception, 'twist');
  const e = wristOver(a.flex, a.dev, oW + tol);
  return { ok: e <= 1 + 1e-6 && Math.abs(a.twist + roll) <= ARM_LIMITS.twist + oT + tol, ...a, roll, over: wristOver(a.flex, a.dev, oW) };
}

// ---- CB-291 (J127, D-139): every joint of the third-person body ------------------------------------------------------------
// The rig (studio/marine-body.js): root > lowerBody (the hips) > legG (the hip joint; the thigh hangs along -y) > knee (a
// hinge about x; + bends the shin back) > ankle; root > torsoG (the spine, against lowerBody) > headG (the neck) and armG (the
// shoulder; the upper arm hangs along -y) > elbowG > wrist. He faces +z, +y up; side +1 the arm or leg at +x.
// Angles in radians; each [min, max]. Forward is +z, out (away from his middle) is +x * side.
export const BODY_LIMITS = Object.freeze({
  neck:     Object.freeze({ flex: [-60 * DEG, 50 * DEG], side: [-45 * DEG, 45 * DEG], turn: [-80 * DEG, 80 * DEG] }),     // flex + chin down
  spine:    Object.freeze({ flex: [-30 * DEG, 75 * DEG], side: [-35 * DEG, 35 * DEG], turn: [-45 * DEG, 45 * DEG] }),     // flex + leaning forward
  shoulder: Object.freeze({ back: [-90 * DEG, 60 * DEG], across: [-90 * DEG, 50 * DEG], turn: [-90 * DEG, 90 * DEG] }),   // shoulderAngles: behind, across, the turn
  hip:      Object.freeze({ flex: [-30 * DEG, 125 * DEG], abd: [-30 * DEG, 45 * DEG], turn: [-45 * DEG, 45 * DEG] }),      // the thigh forward / out
  knee:     Object.freeze({ bend: [0, 150 * DEG] }),
  ankle:    Object.freeze({ flex: [-50 * DEG, 30 * DEG], side: [-35 * DEG, 25 * DEG] })
});

// Rotate v by q (plain objects)
function rot(q, v) {
  const x = q.x, y = q.y, z = q.z, w = q.w;
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}
function invRot(q, v) { return rot({ x: -q.x, y: -q.y, z: -q.z, w: q.w }, v); }
// A limb joint (the shoulder, the hip): where the limb (-y at rest) points, as flex (forward of hanging, +) and abd (out to
// its side, +), measured as angles in the planes they turn in; and its turn about its own line (the swing-twist twist).
// Flex past 90 deg (an arm raised) is read on the full circle, so a raised arm reads 90..180, never wraps.
export function limbAngles(q, side = 1) {
  const d = rot(q, [0, -1, 0]);
  const flex = Math.atan2(d[2], -d[1]), abd = Math.atan2(d[0] * side, Math.hypot(d[1], d[2]));
  return { flex, abd, turn: wrapA(2 * Math.atan2(q.y, q.w)) };
}
// A trunk joint (the spine, the neck): its turn against its parent as Euler YXZ: turn (about y), flex (about x, + forward),
// side (about z, + toward its right, -x... read as is).
export function trunkAngles(q) {
  const { x, y, z, w } = q;
  const m11 = 1 - 2 * (x * x + z * z), m13 = 2 * (x * z + y * w), m21 = 2 * (x * y + z * w), m22 = 1 - 2 * (x * x + z * z) ;
  const m23 = 2 * (y * z - x * w), m31 = 2 * (x * z - y * w), m33 = 1 - 2 * (x * x + y * y), m12 = 2 * (x * y - z * w);
  const ex = Math.asin(Math.max(-1, Math.min(1, -m23)));
  const ey = Math.abs(m23) < 0.9999999 ? Math.atan2(m13, m33) : Math.atan2(-m31, m11);
  const ez = Math.abs(m23) < 0.9999999 ? Math.atan2(m21, 1 - 2 * (x * x + z * z)) : 0;
  void m12; void m22;
  return { flex: ex, turn: ey, side: ez };
}
export function hingeAngle(q) { return 2 * Math.atan2(q.x, q.w); }   // a hinge about x (the knee): + bends the shin back
// The shoulder (CB-291, CLAUDE DIRECTOR 11 Nov: the turn read against where the elbow points). u: the upper arm's line
// (shoulder to elbow), hinge: the elbow's hinge axis (the upper arm's own +x: the elbow bends about it, the forearm going
// toward the arm's +z), both in the torso's space (+z forward, +y up), any length; side +1 the arm at +x. A raised arm can
// point anywhere in front, above and out to its side, so the shoulder's limits are where it cannot go: back, how far the
// upper arm points behind the shoulders' plane (asin of -z; a real arm goes about 60 deg back); across, how far it points
// past the body's middle line toward the other side (asin of -x * side; about 50 deg, a hand reaching across the chest);
// turn, the upper arm's turn about its own line, + inward, 0 where an arm swung straight up from hanging would have its
// elbow (bending forward at the side, up with the arm raised forward), about 90 deg either way. It is read from the hinge,
// not the forearm, so the forearm's own roll onto a grip (index.html CL-122, CB-289's twist) does not count here, and a
// straight elbow still has its turn. An arm straight up has none (null).
export function shoulderAngles(u, hinge, side = 1) {
  const ul = Math.hypot(u[0], u[1], u[2]) || 1;
  const ux = u[0] / ul, uy = u[1] / ul, uz = u[2] / ul;
  const cl = (v) => Math.max(-1, Math.min(1, v));
  const back = Math.asin(cl(-uz)), across = Math.asin(cl(-ux * side));
  let turn = null;
  if (uy < 0.97) {
    // the hinge at no turn: (1, 0, 0) carried by the shortest swing from hanging (0, -1, 0) to u
    const ax = [-uz, 0, ux], al = Math.hypot(ax[0], ax[2]), ang = Math.acos(cl(-uy));
    const r = al < 1e-9 ? [1, 0, 0] : rot(fromAxisAngle([ax[0] / al, 0, ax[2] / al], ang), [1, 0, 0]);
    const rd = r[0] * ux + r[1] * uy + r[2] * uz, hd = hinge[0] * ux + hinge[1] * uy + hinge[2] * uz;
    const rp = [r[0] - rd * ux, r[1] - rd * uy, r[2] - rd * uz], hp = [hinge[0] - hd * ux, hinge[1] - hd * uy, hinge[2] - hd * uz];
    const cx = rp[1] * hp[2] - rp[2] * hp[1], cy = rp[2] * hp[0] - rp[0] * hp[2], cz = rp[0] * hp[1] - rp[1] * hp[0];
    turn = Math.atan2(cx * ux + cy * uy + cz * uz, rp[0] * hp[0] + rp[1] * hp[1] + rp[2] * hp[2]) * side;
  }
  return { back, across, turn };
}
// How far past its row a shoulder reading is (radians summed over its three, 0 inside).
export function shoulderPast(a, row = BODY_LIMITS.shoulder) {
  let p = 0;
  for (const k of ['back', 'across', 'turn']) { const v = a[k]; if (v == null) continue; p += Math.max(0, row[k][0] - v, v - row[k][1]); }
  return p;
}
// Hold a shoulder inside its row after the pose, for an arm no hold has a hand on (the IK holds those itself: index.html
// holdShoulderIK). q: the upper arm's turn in the torso's space (changed in place; the arm hangs along -y at rest, its
// hinge +x), elbowAt: the elbow's place in the arm's space, side +1 the arm at +x. First the arm's line is brought back
// inside back and across by the shortest swing, then its turn about that line. Returns the names held.
export function shoulderHold(q, elbowAt, side = 1, row = BODY_LIMITS.shoulder) {
  const read = () => { const u = rot(q, elbowAt), h = rot(q, [1, 0, 0]); return { u, a: shoulderAngles(u, h, side) }; };
  let { u, a } = read();
  const held = [];
  const cl = (v, r) => Math.max(r[0], Math.min(r[1], v));
  const b = cl(a.back, row.back), c = cl(a.across, row.across);
  if (b !== a.back || c !== a.across) {
    if (b !== a.back) held.push('back'); if (c !== a.across) held.push('across');
    const ul = Math.hypot(u[0], u[1], u[2]), un = [u[0] / ul, u[1] / ul, u[2] / ul];
    let z = -Math.sin(b), x = -Math.sin(c) * side; const r2 = x * x + z * z;
    if (r2 > 1) { x /= Math.sqrt(r2); z /= Math.sqrt(r2); }
    const t = [x, (un[1] < 0 ? -1 : 1) * Math.sqrt(Math.max(0, 1 - x * x - z * z)), z];
    const ax = [un[1] * t[2] - un[2] * t[1], un[2] * t[0] - un[0] * t[2], un[0] * t[1] - un[1] * t[0]], al = Math.hypot(ax[0], ax[1], ax[2]);
    if (al > 1e-9) setQ(q, mulQ(fromAxisAngle([ax[0] / al, ax[1] / al, ax[2] / al], Math.atan2(al, un[0] * t[0] + un[1] * t[1] + un[2] * t[2])), q));
    ({ u, a } = read());
  }
  if (a.turn != null) {
    const tc = cl(a.turn, row.turn);
    if (tc !== a.turn) {
      held.push('turn');
      const ul = Math.hypot(u[0], u[1], u[2]);
      setQ(q, mulQ(fromAxisAngle([u[0] / ul, u[1] / ul, u[2] / ul], (tc - a.turn) * side), q));
    }
  }
  return held;
}
// For the checks: a reading against its table row, with the names of what is outside (tol radians).
export function outside(row, reading, tol = 0.01) {
  const out = [];
  for (const k of Object.keys(row)) { const v = reading[k]; if (v == null) continue; if (v < row[k][0] - tol || v > row[k][1] + tol) out.push(k); }
  return out;
}

// ---- holding a pose inside BODY_LIMITS (CB-291, CLAUDE DIRECTOR's (b): the trunk, neck, hips, knees and ankles after the pose)
const clampTo = (v, r) => Math.max(r[0], Math.min(r[1], v));
function fromAxisAngle(ax, a) { const s = Math.sin(a / 2); return { x: ax[0] * s, y: ax[1] * s, z: ax[2] * s, w: Math.cos(a / 2) }; }
function mulQ(a, b) { return qmul(a, b, { x: 0, y: 0, z: 0, w: 1 }); }
function setQ(q, r) { q.x = r.x; q.y = r.y; q.z = r.z; q.w = r.w; return q; }
// A trunk joint (spine, neck; the ankle without its turn): Euler YXZ read, each held, put back (q changed in place). Returns
// the names held.
export function clampTrunk(q, row) {
  const a = trunkAngles(q), held = [];
  const v = { flex: a.flex, turn: a.turn, side: a.side };
  for (const k of ['flex', 'turn', 'side']) if (row[k]) { const c = clampTo(v[k], row[k]); if (c !== v[k]) { held.push(k); v[k] = c; } }
  if (!held.length) return held;
  setQ(q, mulQ(mulQ(fromAxisAngle([0, 1, 0], v.turn), fromAxisAngle([1, 0, 0], v.flex)), fromAxisAngle([0, 0, 1], v.side)));
  return held;
}
// A limb joint (the hip; the shoulder's reading): the limb's direction held inside its flex and abd ranges, its own turn
// inside its turn range (q changed in place). Returns the names held.
export function clampLimb(q, side, row) {
  const a = limbAngles(q, side), held = [];
  let { flex, abd, turn } = a;
  if (row.flex) { const c = clampTo(flex, row.flex); if (c !== flex) { held.push('flex'); flex = c; } }
  if (row.abd) { const c = clampTo(abd, row.abd); if (c !== abd) { held.push('abd'); abd = c; } }
  if (row.turn) { const c = clampTo(turn, row.turn); if (c !== turn) { held.push('turn'); turn = c; } }
  if (!held.length) return held;
  const h = Math.cos(abd), d = [Math.sin(abd) * side, -h * Math.cos(flex), h * Math.sin(flex)];
  const ax = [-d[2], 0, d[0]], al = Math.hypot(ax[0], ax[2]);   // (0,-1,0) x d
  const ang = Math.acos(Math.max(-1, Math.min(1, -d[1])));
  const s = al < 1e-9 ? (d[1] < 0 ? { x: 0, y: 0, z: 0, w: 1 } : fromAxisAngle([1, 0, 0], Math.PI)) : fromAxisAngle([ax[0] / al, 0, ax[2] / al], ang);
  setQ(q, mulQ(s, fromAxisAngle([0, 1, 0], turn)));
  return held;
}
// A hinge about x (the knee): its bend held, any other turn dropped.
export function clampHinge(q, range) {
  const a = hingeAngle(q), c = clampTo(a, range);
  if (c === a) return [];   // inside: left as it is (any small turn off the hinge's axis too)
  setQ(q, fromAxisAngle([1, 0, 0], c));
  return ['bend'];
}

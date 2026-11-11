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
// v rotated by the inverse of q
function invRot(q, v) {
  const x = -q.x, y = -q.y, z = -q.z, w = q.w;
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

// A wrist's turn q (the hand on the forearm) as anatomy reads it, radians: flex (> 0 toward the palm, < 0 back), dev
// (> 0 toward the thumb, < 0 toward the little finger), twist (about the forearm's line, as the forearm would turn it).
// Bent toward the palm, the forearm leans toward the palm seen from the hand; bent toward the thumb (radial), it leans
// toward the thumb's edge (the hand's +x * side): the thumb's side of the hand comes up toward the forearm's.
// The turn is split as q = twist * swing: the swing bends the hand off the forearm's line, the twist turns it about it.
export function wristAngles(q, side = 1) {
  const tw = 2 * Math.atan2(q.y, q.w);
  const d = invRot(q, [0, 1, 0]);   // the forearm's line, seen from the hand (the twist does not move it)
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

// J154 Zombie Pass 4 stage D (Claude 5, ZP4 design §2 D, approved 15 Nov): falls and get-ups for the humanoid zombies,
// keyed clips on the shared rig's own bones, in place of today's rigid pitch about the feet (maybeKnockDown /
// knockDownPitch: "a plank falling and standing up"). REVIEW ONLY: nothing here is called by the game yet.
//
// What it does. maybeKnockDown keeps every rule it has (who falls, the push direction, knockDur, the lie, the cooldown,
// the AI's movement lock); for a humanoid it also plans a clip (planFall). The clip owns the whole body while he is down:
// the hips' pitch, height and slide and every joint, as ABSOLUTE angles (like the brute's keyed get-up, GB-277), after the
// animation has written its pose; the root height is SOLVED every frame so the lowest point of the body (a toe, a knee, a
// hand, the chest, the back, the seat) is on the ground: never sunk, never floating (rule 24), and the body ROLLS over
// its support: the contact that carries his weight does not slide (the hips slide instead, as a falling body does).
// Lengths come from GP-20146's z.restPose v1 (actor-root-local, x rootScale once); without one, today's shambler numbers.
//
// The clips (by the push in his own frame, the hit's side twisting the fall):
//   front: pushed the way he faces: the knees buckle, he drops to his knees, the hands go out and take him, face down,
//          the head turned aside.   Get-up: hands under the shoulders, push up, a knee under him, kneel, stand.
//   back:  pushed back: a step back to catch it, he sits down hard, rolls onto his back, the arms thrown out.
//          Get-up: sit up, roll onto a knee with a hand down, kneel, stand.
// The timing fits inside knockDur, so the AI's timings do not move: fall + lie + rise = knockDur; the lie gives way first,
// then the rise is time-scaled to fit (Director 16 Nov: knockDur never changes); speeds per type (a slow clumsy shambler,
// a fast feral); the shambler slips back onto his hands once when an explosion gives him the time.
//
// The call site (Claude 2's index.html loan, after CB-336 and the freeze; three lines):
//   maybeKnockDown, after z.knockSign is set:     if (!z.knockKeyed) planFall(z, { dx, dz, kind, dur: z.knockDur });
//   knockDownPitch, before the pitch is worked:   if (z._fall) { z.knockT -= dt; if (z.knockT <= 0) z.knockT = 0; return 0; }
//   zombieLateStep, beside bruteGetUpPose(z):     if (z._fall) { const r = stepFall(z); if (r) { z.hitH = r.hitH; if (r.done) zombieFallEnd(z, r); } }
// (zombieFallEnd moves the body to where it got up: r.shiftX/Z in the world, through the walls check, then clears z._fall.)
// Pure: no THREE, no DOM.

// The joints a clip writes: a bone (the userData path, as game/zombie-react.js), its axis, and the clip's anatomy range
// (radians; never widened to make a key fit: rule 25's spirit for the dead). 'pitch', 'yaw', 'roll' are the hips' (the
// root's) own turn. Signs as zombie-react.js: +x folds the torso / head forward; +x swings an arm or a leg BACK; the shin's
// +x bends the knee; the elbow's -x bends it; +z on the left arm takes it out to his left (-z the right one out).
export const FALL_JOINTS = Object.freeze([
  { id: 'pitch', bone: 'hips', ax: 'x', min: -1.62, max: 1.62 },
  { id: 'yaw', bone: 'hips', ax: 'y', min: -0.8, max: 0.8 },
  { id: 'roll', bone: 'hips', ax: 'z', min: -0.5, max: 0.5 },
  { id: 'torso', bone: 'torso', ax: 'x', min: -0.5, max: 1.0 },
  { id: 'torsoYaw', bone: 'torso', ax: 'y', min: -0.6, max: 0.6 },
  { id: 'torsoRoll', bone: 'torso', ax: 'z', min: -0.45, max: 0.45 },
  { id: 'head', bone: 'head', ax: 'x', min: -0.7, max: 0.6 },
  { id: 'headYaw', bone: 'head', ax: 'y', min: -1.1, max: 1.1 },
  { id: 'headRoll', bone: 'head', ax: 'z', min: -0.5, max: 0.5 },
  { id: 'armL', bone: 'armLG', ax: 'x', min: -3.05, max: 0.9 },
  { id: 'armLOut', bone: 'armLG', ax: 'z', min: -0.3, max: 1.6, sign: -1 },   // J159: + is OUT; armLG sits at -x, so out is its -z (the keys crossed the arms over the chest, to 86 deg)
  { id: 'armR', bone: 'armRG', ax: 'x', min: -3.05, max: 0.9 },
  { id: 'armROut', bone: 'armRG', ax: 'z', min: -1.6, max: 0.3, sign: -1 },   // - is out (the keys' sense); armRG at +x: out is its +z
  { id: 'elbowL', bone: 'armLG.elbowG', ax: 'x', min: -2.3, max: 0.05 },
  { id: 'elbowR', bone: 'armRG.elbowG', ax: 'x', min: -2.3, max: 0.05 },
  { id: 'legL', bone: 'legLG', ax: 'x', min: -2.1, max: 0.5 },
  { id: 'legR', bone: 'legRG', ax: 'x', min: -2.1, max: 0.5 },
  { id: 'shinL', bone: 'legLG.shinG', ax: 'x', min: 0, max: 2.35 },
  { id: 'shinR', bone: 'legRG.shinG', ax: 'x', min: 0, max: 2.35 },
  { id: 'footL', bone: 'legLG.shamblerAnkle', ax: 'x', min: -0.38, max: 0.87 },   // J159: inside the ankle's range (game/zombie-limits.js plantar -30..+50);
  { id: 'footR', bone: 'legRG.shamblerAnkle', ax: 'x', min: -0.38, max: 0.87 },   // the tucked toes of a kneel stop at 22 deg toe-up (past it the feral's bare foot opens off its shin, t338)
]);
const NJ = FALL_JOINTS.length;
export const J = Object.freeze(Object.fromEntries(FALL_JOINTS.map((c, i) => [c.id, i])));

// The humanoids that take the clips (the brute keeps his keyed get-up; the colossus and the spider are never knocked down;
// the leaper lands on all fours later, stage D2; the specials keep today's fall)
export const FALL_TYPES = Object.freeze(new Set(['shambler', 'feral', 'military', 'drowned', 'spitter', 'screamer', 'bomber']));
// time scale per type (1 = the shambler's keys; under 1 is quicker): fall, rise
export const FALL_SPEED = Object.freeze({
  shambler: { fall: 1, rise: 1 }, drowned: { fall: 1.05, rise: 1.1 }, military: { fall: 0.9, rise: 0.75 }, spitter: { fall: 1, rise: 0.95 },
  screamer: { fall: 0.9, rise: 0.85 }, bomber: { fall: 1.1, rise: 1.1 }, feral: { fall: 0.75, rise: 0.5 },
});
// LIE_MIN: the shortest lie (it gives way first); then the get-up is time-scaled to fit the knock, down to RISE_FLOOR of
// its length (the shotgun's 1.67 s knock runs the shambler's at ~0.46; Director 16 Nov: never change knockDur, fit the
// clips to it). SLIP_MIN: the shambler's slip only when its clip can run at least this fast.
export const LIE_MIN = 0.2, RISE_FLOOR = 0.35, SLIP_MIN = 0.7, BLEND_IN = 0.09, BLEND_OUT = 0.22;
export const SLIP_TYPES = Object.freeze(new Set(['shambler']));

// Keys: t in seconds from the knock (fall clips) or from the start of the rise (rise clips). Authored in WORLD angles in
// his side view, which is how a fall is laid out, and turned into the rig's joint angles once (W): for the limbs that
// hang (thighs, shins, upper arms, forearms) 0 is straight down, +pi/2 pointing back, -pi/2 forward; for the torso and the
// head 0 is upright, +pi/2 face down (pitched forward), -pi/2 on his back. Feet, yaws and rolls are the joints' own.
// a: the contacts that hold while he moves INTO the key (they do not slide; the hips move over them: solveRoot); each
// is on the ground at the key. A null pose: where the fall left him.
const W = (w) => {
  const o = {}, P = w.pitch || 0, T = w.T != null ? w.T : P;
  o.pitch = P; o.torso = T - P;
  if (w.H != null) o.head = w.H - T;
  for (const s of ['L', 'R']) {
    const th = w['thigh' + s] != null ? w['thigh' + s] : w.thigh, sh = w['shin' + s] != null ? w['shin' + s] : w.shin;
    const ar = w['arm' + s] != null ? w['arm' + s] : w.arm, fo = w['fore' + s] != null ? w['fore' + s] : w.fore;
    if (th != null) { o['leg' + s] = th - P; if (sh != null) o['shin' + s] = sh - th; }
    if (ar != null) { o['arm' + s] = ar - T; if (fo != null) o['elbow' + s] = fo - ar; }
  }
  for (const k of ['yaw', 'roll', 'torsoYaw', 'torsoRoll', 'headYaw', 'headRoll', 'armLOut', 'armROut', 'footL', 'footR']) if (w[k] != null) o[k] = w[k];
  if (w.out != null) { if (o.armLOut == null) o.armLOut = w.out; if (o.armROut == null) o.armROut = -w.out; }
  if (w.foot != null) { if (o.footL == null) o.footL = w.foot; if (o.footR == null) o.footR = w.foot; }
  return o;
};
const K = (t, w, a) => ({ t, pose: w === null ? null : W(w), a: a || null });
// the front get-up's poses, shared by the plain get-up and the shambler's slip (world angles, as the keys)
const LIE_F = { pitch: 1.45, T: 1.47, H: 1.17, headYaw: 0.85, headRoll: 0.2, thighL: 1.5, thighR: 1.53, shinL: 1.62, shinR: 1.6, armL: -1.5, foreL: -1.6, armLOut: 0.35, armR: 1.6, foreR: 1.6, armROut: -0.2, foot: 0.85 };
const ARM_OUT_1 = { ...LIE_F, headYaw: 0.6, headRoll: 0.12, armLOut: 1.5 };
const ARM_OUT_2 = { ...LIE_F, H: 1.08, headYaw: 0.3, headRoll: 0.05, armL: 1.6, foreL: 0.2, armLOut: 1.5, armR: 1.85, foreR: 0.7, armROut: -0.3 };
const HANDS_UNDER = { pitch: 1.45, T: 1.45, H: 1.0, thighL: 1.5, thighR: 1.53, shinL: 1.62, shinR: 1.6, arm: 2.0, fore: 0, out: 0.35, foot: 0.85 };
const ALL_FOURS = { pitch: 1.0, T: 1.27, H: 0.72, thighL: 0.15, thighR: 0.25, shin: 1.85, foot: -0.5, arm: 0.05, fore: 0, out: 0.25 };
const LEG_LIFT = { pitch: 0.85, T: 1.33, H: 0.8, thighL: -0.8, shinL: 1.5, footL: -0.3, thighR: 0.27, shinR: 1.85, footR: -0.5, arm: 0.07, fore: 0.02, out: 0.22 };
const FOOT_THROUGH = { pitch: 0.6, T: 1.45, H: 0.9, thighL: -1.5, shinL: 0.55, footL: -0.55, thighR: 0.3, shinR: 1.85, footR: -0.5, arm: 0.1, fore: 0.05, out: 0.2 };
const SLIPPED = { pitch: 1.15, T: 1.48, H: 1.15, headYaw: -0.25, thighL: 0.3, thighR: 0.28, shin: 1.85, foot: -0.5, arm: 0.85, fore: 0.0, out: 0.4 };
const ONE_KNEE = { pitch: 0.3, T: 0.55, H: 0.4, thighL: -1.45, shinL: 0.14, footL: -0.14, thighR: 0.05, shinR: 1.85, footR: -0.5, armL: -0.7, foreL: -0.9, armR: 0.15, foreR: 0.15, out: 0.12 };
const PUSH_OFF = { pitch: 0.25, T: 0.5, H: 0.4, thighL: -0.82, shinL: -0.02, footL: 0.02, thighR: 0.28, shinR: 1.12, footR: 0.3, armL: -0.45, foreL: -0.6, armR: 0.2, foreR: 0.2 };
export const CLIPS = Object.freeze({
  fallFront: [
    K(0, {}),
    // the knees go, he folds a little, the arms come up to catch himself; the feet still planted
    K(0.14, { pitch: 0.15, T: 0.45, H: 0.2, thighL: -0.25, thighR: -0.2, shinL: 0.45, shinR: 0.4, arm: -0.6, fore: -0.9, out: 0.28, foot: 0.1 }, ['toeL', 'toeR']),
    // down on his knees (shins flat behind, toes tucked), the arms reaching for the ground ahead
    K(0.34, { pitch: 0.55, T: 0.9, H: 0.4, thigh: 0.05, thighR: 0.12, shin: 1.85, arm: -1.2, fore: -1.4, out: 0.3, foot: -0.5 }, ['toeL', 'toeR']),
    // the hands take him, the elbows give
    K(0.5, { pitch: 1.0, T: 1.3, H: 0.75, thigh: 0.3, thighR: 0.35, shin: 1.85, shinR: 1.8, arm: -0.12, fore: -0.22, out: 0.3, foot: -0.5 }, ['kneeL', 'kneeR']),
    // face down, the head turned aside; one arm up by his head, the other along his side
    K(0.72, { pitch: 1.45, T: 1.47, H: 1.17, headYaw: 0.85, headRoll: 0.2, thighL: 1.5, thighR: 1.53, shinL: 1.62, shinR: 1.6, armL: -1.5, foreL: -1.6, armLOut: 0.35, armR: 1.6, foreR: 1.6, armROut: -0.2, foot: 0.85 }, ['kneeL', 'kneeR']),
  ],
  riseFront: [
    K(0, null),
    // the left arm comes in from by his head out along the ground (not down through it), the head comes round
    K(0.08, ARM_OUT_1, ['chest']),
    K(0.18, ARM_OUT_2, ['chest']),
    // the hands come under the shoulders (elbows up, forearms upright), the chest still down, the head up
    K(0.3, HANDS_UNDER, ['chest']),
    // pushed up onto hands and knees
    K(0.65, ALL_FOURS, ['handL', 'handR']),
    // the left knee comes up off the ground, the foot tucked under him
    K(0.8, LEG_LIFT, ['handL', 'handR', 'kneeR']),
    // the left foot comes through and plants
    K(0.95, FOOT_THROUGH, ['handL', 'handR', 'kneeR']),
    // up on one knee, a hand on the knee
    K(1.2, ONE_KNEE, ['kneeR', 'heelL']),
    // pushing off the knee
    K(1.42, PUSH_OFF, ['heelL']),
    K(1.62, {}, ['heelL']),
  ],
  // the shambler's get-up when the knock leaves him time (an explosion; SLIP_MIN): the left foot comes through, slips
  // back out from under him and he goes down onto his hands again (the elbows give, the head hangs), then the second go
  // gets him up (Director 16 Nov: "the shambler's one slip back onto his hands during the get-up", character)
  riseFrontSlip: [
    K(0, null),
    K(0.08, ARM_OUT_1, ['chest']),
    K(0.18, ARM_OUT_2, ['chest']),
    K(0.3, HANDS_UNDER, ['chest']),
    K(0.62, ALL_FOURS, ['handL', 'handR']),
    K(0.76, LEG_LIFT, ['handL', 'handR', 'kneeR']),
    K(0.9, FOOT_THROUGH, ['handL', 'handR', 'kneeR']),
    // the foot goes out from under him: the left leg slides back, the elbows start to give
    K(1.02, { ...LEG_LIFT, thighL: -0.7, shinL: 1.6, footL: -0.4, H: 0.88 }, ['handL', 'handR', 'kneeR']),
    // down on the hands again: both knees down, the elbows given, the chest low, the head hanging
    K(1.16, SLIPPED, ['handL', 'handR']),
    // the second go: the knee up, the foot through again
    K(1.32, LEG_LIFT, ['handL', 'handR', 'kneeR']),
    K(1.46, FOOT_THROUGH, ['handL', 'handR', 'kneeR']),
    K(1.68, ONE_KNEE, ['kneeR', 'heelL']),
    K(1.88, PUSH_OFF, ['heelL']),
    K(2.04, {}, ['heelL']),
  ],
  fallBack: [
    K(0, {}),
    // a step back to catch it (the right foot goes back), the arms thrown forward and out, the chin forward (the head lags)
    K(0.12, { pitch: -0.12, T: -0.3, H: -0.02, thighL: -0.3, shinL: 0, thighR: 0.25, shinR: 0.45, arm: -1.25, fore: -1.6, out: 0.5 }, ['heelL']),
    // he sits down hard on the ground: knees up, the feet still planted, the arms back to catch the ground
    K(0.32, { pitch: -0.5, T: -0.1, H: 0.25, thighL: -2.25, thighR: -2.2, shinL: -0.55, shinR: -0.5, foot: -0.2, arm: 0.75, fore: 0.6, out: 0.4 }, ['heelL', 'heelR']),
    // over onto his back: the knees up, the head snapped back, the arms flung out
    K(0.54, { pitch: -1.3, T: -1.4, H: -1.85, thighL: -2.05, thighR: -2.0, shinL: -1.0, shinR: -0.95, foot: 0, arm: -2.9, fore: -3.1, out: 1.3 }, ['seat']),
    // flat out, the legs slide down, the head rolled aside, the arms out flat on the ground
    K(0.76, { pitch: -1.5, T: -1.55, H: -1.65, headYaw: 0.5, headRoll: 0.15, thighL: -1.6, thighR: -1.62, shinL: -1.55, shinR: -1.5, foot: 0.6, arm: -1.55, fore: -1.7, armLOut: 1.1, armROut: -1.0 }, ['seat']),
  ],
  riseBack: [
    K(0, null),
    // sits up: the knees come up, he curls forward, the arms reach for the knees
    K(0.35, { pitch: -0.55, T: 0.2, H: 0.45, thighL: -2.35, thighR: -2.3, shin: -0.62, foot: -0.2, arm: -1.0, fore: -1.4, out: 0.2 }, ['seat']),
    // the right leg folds under him as he starts the roll, his weight on the right foot (it goes back under him, not down
    // through the ground: the old straight blend lifted him ~21 cm onto that toe)
    K(0.54, { pitch: -0.3, yaw: 0.25, torsoYaw: 0.15, T: 0.3, H: 0.48, thighL: -1.92, shinL: -0.16, footL: -0.25, thighR: -0.8, shinR: 1.5, footR: -0.35, armL: -0.8, foreL: -1.2, armLOut: 0.2, armR: -0.48, foreR: -0.68, armROut: -0.35 }, ['toeR']),
    // rolls toward his right onto the right knee, the right hand down beside him, the left foot planted
    K(0.72, { pitch: -0.05, yaw: 0.5, torsoYaw: 0.3, T: 0.4, H: 0.5, thighL: -1.5, shinL: 0.3, footL: -0.3, thighR: 0.3, shinR: 1.85, footR: -0.5, armR: 0.05, foreR: 0.05, armROut: -0.5, armL: -0.6, foreL: -1.0 }, ['heelL']),
    // on one knee, turned back to face front
    K(1.02, { pitch: 0.3, yaw: 0.12, torsoYaw: 0.05, T: 0.55, H: 0.4, thighL: -1.45, shinL: 0.14, footL: -0.14, thighR: 0.05, shinR: 1.85, footR: -0.5, armL: -0.7, foreL: -0.9, armR: 0.15, foreR: 0.15, out: 0.12 }, ['kneeR', 'heelL']),
    K(1.24, { pitch: 0.25, T: 0.5, H: 0.4, thighL: -0.82, shinL: -0.02, footL: 0.02, thighR: 0.28, shinR: 1.12, footR: 0.3, armL: -0.45, foreL: -0.6, armR: 0.2, foreR: 0.2 }, ['heelL']),
    K(1.46, {}, ['heelL']),
  ],
});
const clipEnd = (keys) => keys[keys.length - 1].t;

// The body's sizes: from z.restPose v1 when the birth has one (GP-20146, Director-approved field contract), else today's
// shambler (the native producer's sample, rootScale 1). Lengths in the actor's root space x its rootScale (once).
export const REST_DEFAULT = Object.freeze({ hipsY: 0.82, thigh: 0.38, shin: 0.362, upperArm: 0.345, forearm: 0.326, headY: 1.66, shoulderHalfWidth: 0.368 });
export function restOf(z) {
  const r = z && z.restPose, s = r && r.rootScale ? r.rootScale[1] : 1;
  const b = r && r.version === 1 ? {
    hipsY: r.hipsY * s, thigh: (r.legs.left.thigh + r.legs.right.thigh) / 2 * s, shin: (r.legs.left.shin + r.legs.right.shin) / 2 * s,
    upperArm: (r.arms.left.upperArm + r.arms.right.upperArm) / 2 * s, forearm: (r.arms.left.forearm + r.arms.right.forearm) / 2 * s,
    headY: r.headPivot[1] * s, shoulderHalfWidth: r.shoulderHalfWidth * (r.rootScale ? r.rootScale[0] : 1),
  } : REST_DEFAULT;
  const span = Math.max(0.3, b.headY - b.hipsY);
  // the rig's proportions above the hips (makeZombieMesh: torso pivot 0.28 s, shoulders 0.70 s, head 0.86 s over the hips)
  return { ...b, torsoUp: span * 0.326, shoulderUp: span * 0.814, headUp: span, ankleH: Math.max(0.04, b.hipsY - 0.02 * span - b.thigh - b.shin),
    chest: 0.17 * span / 0.84, back: 0.15 * span / 0.84, seat: 0.13 * span / 0.84, knee: 0.075, hand: 0.05, headR: 0.12 * span / 0.84 };
}

// The body's points in the root's side view (y up, z his forward), the hips at (hy, hz), from a pose (array by J):
// what touches the ground. Rotations about x add down the chain; an arm out to the side shows cos(out) of its length.
const up = (a, L, o, i) => { o[i] = Math.cos(a) * L; o[i + 1] = Math.sin(a) * L; };
const dn = (a, L, o, i) => { o[i] = -Math.cos(a) * L; o[i + 1] = -Math.sin(a) * L; };
const fw = (a, L, o, i) => { o[i] = -Math.sin(a) * L; o[i + 1] = Math.cos(a) * L; };
export const POINT_NAMES = Object.freeze(['toeL', 'heelL', 'toeR', 'heelR', 'kneeL', 'kneeR', 'handL', 'handR', 'elbowL', 'elbowR', 'seat', 'back', 'chest', 'headF', 'headB', 'headT', 'shoulderB']);
const NP = POINT_NAMES.length;
const _t = new Float64Array(2), _k = new Float64Array(6);
export function bodyPoints(p, R, hy = 0, hz = 0, out = new Float64Array(NP * 2)) {
  let i = 0; const set = (y, z) => { out[i++] = y; out[i++] = z; };
  const a0 = p[J.pitch];
  const legY = hy - 0.02 * R.headUp * Math.cos(a0), legZ = hz - 0.02 * R.headUp * Math.sin(a0);
  for (let s = 0; s < 2; s++) {
    const aT = a0 + p[s ? J.legR : J.legL], aS = aT + p[s ? J.shinR : J.shinL], aF = aS + p[s ? J.footR : J.footL];
    dn(aT, R.thigh, _t, 0); const ky = legY + _t[0], kz = legZ + _t[1];
    dn(aS, R.shin, _t, 0); const ay = ky + _t[0], az = kz + _t[1];
    // the sole: the ankle sits ankleH over it; the toe 0.17 ahead, the heel 0.05 behind (in the foot's own frame)
    const fy = ay - Math.cos(aF) * R.ankleH, fz = az - Math.sin(aF) * R.ankleH;
    set(fy - Math.sin(aF) * 0.17, fz + Math.cos(aF) * 0.17);
    set(fy + Math.sin(aF) * 0.05, fz - Math.cos(aF) * 0.05);
    _k[s * 3] = ky; _k[s * 3 + 1] = kz; _k[s * 3 + 2] = aS;
  }
  // the knees' fronts
  for (let s = 0; s < 2; s++) set(_k[s * 3] - Math.sin(_k[s * 3 + 2]) * R.knee, _k[s * 3 + 1] + Math.cos(_k[s * 3 + 2]) * R.knee);   // (aS: the shin's front at the knee)
  const a1 = a0 + p[J.torso];
  up(a0, R.torsoUp, _t, 0); const ty = hy + _t[0], tz = hz + _t[1];
  up(a1, R.shoulderUp - R.torsoUp, _t, 0); const sy = ty + _t[0], sz = tz + _t[1];
  let hLy = 0, hLz = 0, eLy = 0, eLz = 0, hRy = 0, hRz = 0, eRy = 0, eRz = 0;
  for (let s = 0; s < 2; s++) {
    const c = Math.cos(Math.abs(p[s ? J.armROut : J.armLOut])), aA = a1 + p[s ? J.armR : J.armL], aE = aA + p[s ? J.elbowR : J.elbowL];
    dn(aA, R.upperArm * c, _t, 0); const ey = sy + _t[0], ez = sz + _t[1];
    dn(aE, (R.forearm + R.hand) * c, _t, 0);
    if (s) { hRy = ey + _t[0]; hRz = ez + _t[1]; eRy = ey; eRz = ez; } else { hLy = ey + _t[0]; hLz = ez + _t[1]; eLy = ey; eLz = ez; }
  }
  set(hLy, hLz); set(hRy, hRz); set(eLy, eLz); set(eRy, eRz);
  // the seat (behind and under the hips), the back and the chest (the torso's two faces at mid-height), the head's face,
  // back and top, the back of the shoulders
  fw(a0, -R.seat, _t, 0); set(hy + _t[0] - Math.cos(a0) * 0.06, hz + _t[1] - Math.sin(a0) * 0.06);
  up(a1, (R.shoulderUp - R.torsoUp) * 0.5, _t, 0); const my = ty + _t[0], mz = tz + _t[1];
  fw(a1, -R.back, _t, 0); set(my + _t[0], mz + _t[1]);
  fw(a1, R.chest, _t, 0); set(my + _t[0], mz + _t[1]);
  const aH = a1 + p[J.head]; up(a1, R.headUp - R.torsoUp, _t, 0); const hdy = ty + _t[0], hdz = tz + _t[1];
  const cy = hdy + Math.cos(aH) * R.headR, cz = hdz + Math.sin(aH) * R.headR;
  fw(aH, R.headR, _t, 0); set(cy + _t[0], cz + _t[1]);
  fw(aH, -R.headR, _t, 0); set(cy + _t[0], cz + _t[1]);
  up(aH, R.headR, _t, 0); set(cy + _t[0], cz + _t[1]);
  fw(a1, -R.back, _t, 0); set(sy + _t[0], sz + _t[1]);
  return out;
}

// Sample a clip at time t (seconds) into pose (array by J); a null key is 'from' (where the previous clip left him).
const ease = (u) => u * u * (3 - 2 * u);
export function sampleClip(keys, t, from, pose = new Float64Array(NJ)) {
  const val = (k, j) => (k.pose === null ? (from ? from[j] : 0) : (k.pose[FALL_JOINTS[j].id] || 0));
  let a = keys[0], b = keys[keys.length - 1];
  if (t <= a.t) { sampleClip.anchor = (keys[1] && keys[1].a) || null; for (let j = 0; j < NJ; j++) pose[j] = val(a, j); return pose; }
  if (t >= b.t) { sampleClip.anchor = b.a; for (let j = 0; j < NJ; j++) pose[j] = val(b, j); return pose; }
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
  sampleClip.anchor = b.a || a.a;
  const u = ease((t - a.t) / Math.max(1e-6, b.t - a.t));
  for (let j = 0; j < NJ; j++) pose[j] = val(a, j) + (val(b, j) - val(a, j)) * u;
  return pose;
}
export function clampPose(pose) { for (let j = 0; j < NJ; j++) { const c = FALL_JOINTS[j]; if (pose[j] < c.min) pose[j] = c.min; else if (pose[j] > c.max) pose[j] = c.max; } return pose; }

// The plan, at the knock: which clips, the twist from the hit's side, the time each part gets inside knockDur.
// dx, dz: the push in the world (away from what hit him); dur: z.knockDur. Returns null for the types that keep today's fall.
export function planFall(z, { dx = 0, dz = 0, kind = 'crush', dur = 1.5 } = {}) {
  const type = z && (z.typeKey || (z.mesh && z.mesh.userData && z.mesh.userData.typeKey));
  if (!z || !z.mesh || !FALL_TYPES.has(type)) return null;
  const yaw = z.mesh.rotation ? z.mesh.rotation.y || 0 : 0, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const L = Math.hypot(dx, dz) || 1, fwd = (dx * fx + dz * fz) / L, lat = (dx * rx + dz * rz) / L;
  const front = fwd >= 0, sp = FALL_SPEED[type] || FALL_SPEED.shambler;
  const fall = front ? 'fallFront' : 'fallBack';
  const tFall = clipEnd(CLIPS[fall]) * sp.fall;
  let rise = front ? 'riseFront' : 'riseBack';
  // the shambler's slip: only when the knock leaves the time for it at SLIP_MIN speed or slower (an explosion, not a crush or a shotgun)
  if (front && SLIP_TYPES.has(type) && (dur - tFall - LIE_MIN) >= clipEnd(CLIPS.riseFrontSlip) * sp.rise * SLIP_MIN) rise = 'riseFrontSlip';
  const tRise0 = clipEnd(CLIPS[rise]) * sp.rise;
  let tRise = tRise0, tLie = dur - tFall - tRise;
  if (tLie < LIE_MIN) {   // the lie gives way to LIE_MIN, then the rise is time-scaled to fit (down to RISE_FLOOR); only then the lie goes under LIE_MIN
    tRise = Math.max(tRise0 * RISE_FLOOR, dur - tFall - LIE_MIN);
    tLie = Math.max(0, dur - tFall - tRise);
  }
  const ud = z.mesh.userData || {};
  return (z._fall = {
    type, fall, rise, front, lat, kind, tFall, tLie, tRise, total: tFall + tLie + tRise, over: tFall + tLie + tRise - dur > 1e-6 ? tFall + tLie + tRise - dur : 0,
    sFall: sp.fall, sRise: tRise / clipEnd(CLIPS[rise]), rest: restOf(z), t: 0,
    pose: new Float64Array(NJ), lieP: null, anim: new Float64Array(NJ), pts: new Float64Array(NP * 2),
    sup: -1, supZ: 0, hz: 0, hy: ud.baseHipsY || ud.hips && ud.hips.position.y || 0.82, hz0: ud.hips && ud.hips.position ? ud.hips.position.z || 0 : 0, bones: null, hitH0: z.hitH,
  });
}

function boneOf(ud, path) {
  const dot = path.indexOf('.');
  if (dot < 0) return ud[path] || null;
  const b = ud[path.slice(0, dot)]; return (b && b.userData && b.userData[path.slice(dot + 1)]) || null;
}

// The clip's pose at t (seconds since the knock), before the blends: the fall, the lie (the fall's last key, the head
// settling), the rise from where the lie left him. Pure (tests sample it).
export function fallPoseAt(F, t, pose = new Float64Array(NJ)) {
  if (t < F.tFall + F.tLie) {
    sampleClip(CLIPS[F.fall], Math.min(t, F.tFall) / F.sFall, null, pose);
    F.anchor = sampleClip.anchor;
  } else {
    if (!F.lieP) { F.lieP = new Float64Array(NJ); sampleClip(CLIPS[F.fall], 1e9, null, F.lieP); }
    sampleClip(CLIPS[F.rise], (t - F.tFall - F.tLie) / F.sRise, F.lieP, pose);
    F.anchor = sampleClip.anchor;
  }
  // the hit's side: a push to his left twists the fall that way (the hips turn and roll, the torso counters, the head
  // goes with it), most at the landing, gone again as he gets up
  if (F.lat) {
    const land = t < F.tFall ? ease(Math.min(1, t / F.tFall)) : t < F.tFall + F.tLie ? 1 : Math.max(0, 1 - (t - F.tFall - F.tLie) / (F.tRise * 0.45));
    const s = Math.max(-1, Math.min(1, F.lat)) * land;
    pose[J.yaw] += (F.front ? 0.45 : -0.45) * s; pose[J.roll] += -0.3 * s; pose[J.torsoRoll] += 0.18 * s; pose[J.headYaw] += 0.25 * s;
  }
  return clampPose(pose);
}

// The root, solved: the hips' height so the lowest point is on the ground (never under it, never over it), and the slide
// that keeps the key's contacts still (F.anchor: 'toeL', 'kneeR', 'chest', ...; a limb that swings is not one of them).
// F.hz carries the hips' slide (his forward, metres). When the contacts change, the new ones start where they are, so the
// slide is continuous; while they hold, the hips move over them (the body rolls over its supports; they never skid).
// Without named contacts the lowest point is the support. Returns the index of the lowest point.
const PI_ = Object.fromEntries(POINT_NAMES.map((n, i) => [n, i]));
export function solveRoot(F, pose) {
  const P = bodyPoints(pose, F.rest, 0, 0, F.pts);
  let lo = 0, ly = Infinity;
  for (let i = 0; i < NP; i++) if (P[i * 2] < ly) { ly = P[i * 2]; lo = i; }
  F.hy = -ly;
  const A = F.anchor;
  let mz = 0;
  if (A) { for (const n of A) mz += P[PI_[n] * 2 + 1]; mz /= A.length; } else mz = P[lo * 2 + 1];
  const key = A || lo;
  if (key !== F.sup) { F.sup = key; F.supZ = F.hz + mz; }
  else F.hz = F.supZ - mz;
  return lo;
}
// How far each named contact is over the ground now (metres; for the checks: a contact must touch)
export function anchorGap(F) {
  if (!F.anchor) return 0;
  let g = 0; for (const n of F.anchor) g = Math.max(g, F.pts[PI_[n] * 2] + F.hy);
  return g;
}

// One frame, after the animation wrote its pose and the per-kind modules ran (beside bruteGetUpPose). Reads the clock
// from the knock's own timer (z.knockDur - z.knockT), so the AI and the clip never drift. Writes the bones; returns
// { hitH, done, shiftX, shiftZ } (the world shift of where he got up), or null when there is no clip.
export function stepFall(z, t) {
  const F = z && z._fall; if (!F) return null;
  const ud = z.mesh.userData;
  if (!F.bones) F.bones = FALL_JOINTS.map((c) => boneOf(ud, c.bone));
  if (t == null) t = (z.knockDur || F.total) - Math.max(0, z.knockT || 0);
  F.t = t;
  // what the animation wrote this frame (the blend's other side)
  for (let j = 0; j < NJ; j++) { const b = F.bones[j]; F.anim[j] = b ? b.rotation[FALL_JOINTS[j].ax] * (FALL_JOINTS[j].sign || 1) : 0; }
  fallPoseAt(F, Math.min(t, F.total), F.pose);
  const w = t < BLEND_IN ? ease(t / BLEND_IN) : t > F.total - BLEND_OUT ? ease(Math.max(0, F.total - t) / BLEND_OUT) : 1;
  if (w < 1) for (let j = 0; j < NJ; j++) F.pose[j] = F.anim[j] + (F.pose[j] - F.anim[j]) * w;
  for (let j = 0; j < NJ; j++) if (!F.bones[j]) F.pose[j] = 0;   // a joint this body lacks (an ankle) stays out of the solve
  solveRoot(F, F.pose);
  for (let j = 0; j < NJ; j++) { const b = F.bones[j]; if (b) b.rotation[FALL_JOINTS[j].ax] = F.pose[j] * (FALL_JOINTS[j].sign || 1); }
  if (ud.hips && ud.hips.position) { ud.hips.position.y = F.hy; ud.hips.position.z = F.hz0 + F.hz; }
  // the hit column follows the body (the highest point over the ground)
  let top = 0; for (let i = 0; i < NP; i++) top = Math.max(top, F.pts[i * 2] + F.hy);
  const done = t >= F.total;
  const yaw = z.mesh.rotation ? z.mesh.rotation.y || 0 : 0;
  return { hitH: Math.max(0.35, top), done, shiftX: Math.sin(yaw) * F.hz, shiftZ: Math.cos(yaw) * F.hz, contacts: F.anchor, w };
}
// The end: the hips' slide goes into his place in the world (the caller moves z.mesh.position by shiftX/Z through its
// walls check); the bones go back to the animation's next frame by themselves (the gait writes them).
export function endFall(z) {
  const F = z && z._fall; if (!F) return null;
  const ud = z.mesh.userData; if (ud.hips && ud.hips.position) ud.hips.position.z = F.hz0;
  const yaw = z.mesh.rotation ? z.mesh.rotation.y || 0 : 0, r = { shiftX: Math.sin(yaw) * F.hz, shiftZ: Math.cos(yaw) * F.hz, hitH0: F.hitH0 };
  z._fall = null;
  return r;
}

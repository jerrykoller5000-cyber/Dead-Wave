// studio/marine-gait-feel.js — CL-186: the weight in the marine's walk and run (Claude's).
//
// Jerry (2026-10-12): "a massive pass on Marine animation and his models fidelity. We need to nail his motion and
// look so we do not look like all those other AI games." The studio's clips (CL-84) give his legs, hips, chest and
// head their timing. What they do not give him, and what a figure on screen is read by, is laid on here:
//
//   - the pelvis shifts over the planted foot (sway), with the legs counter-turned so the planted boot stays where
//     it is;
//   - the pelvis turns with the stride and the chest turns against it (the hips and shoulders scissor: from the
//     game's camera, straight down on him, that scissor is most of what a walk looks like);
//   - the foot rolls: the heel strikes toe-up, the heel comes off the ground before the toe does, the toe hangs a
//     little through the swing;
//   - he leans into a start, back against a stop and into a turn: the lean of his own acceleration, the turn's
//     centripetal part included.
//
// Pure: no THREE, no DOM, so it is checked with node (marine-gait-feel.test.mjs). index.html's updateMarinePose
// calls gaitExtras each frame on the gait's own phase and lays the numbers onto the rig; leanFromAccel runs every
// grounded frame on the frame's change of velocity. Plain objects, so the knobs can be turned live (TT.gaitDbg).

export const GAIT_WEIGHT = {
  // The pelvis over the planted foot, metres, walk and run. Peaks swayMid of a cycle after that foot's strike.
  sway: { walk: 0.021, run: 0.013 },
  swayMid: { walk: 0.14, run: 0.09 },
  // The pelvis's turn with the stride, radians: the hip of the forward leg comes forward.
  pelvisYaw: { walk: 0.06, run: 0.09 },
  chestCounter: 0.6,       // the chest turns back against the pelvis by this share
  legCounter: 0.5,         // the thighs turn back by this share, so the boots keep near the travel line
  shoulderDrop: 0.025,     // the shoulder on the planted side settles, radians of chest roll
  // The foot roll, radians of ankle pitch (positive: toe down, heel up).
  strikeToeUp: { walk: 0.18, run: 0.12 },   // the heel lands toe-up (the heel sinks heelLen * sin of it: kept small)
  strikeWidth: 0.08,       // ...for this much of a cycle either side of the strike (centred a touch after it: the heel is down, the ball is not yet)
  pushMax: 0.5,            // the heel off the ground ahead of the toe, at most
  footLen: 0.17,           // ankle to the ball of the foot: the push-off from the ankle's lift keeps the toe down
  swingToeDown: 0.14,      // the toe hangs through the swing (scaled by how free the clip's `level` says the foot is)
  // Where each foot touches down, in cycles (the walk clip's left foot is lowest from 0.05, the run's at 0.036), and
  // where its stance ends (the toe leaves the ground): the push-off from the ankle's lift runs from pushFrom to there.
  strike: { walk: 0.05, run: 0.036 },
  stanceEnd: { walk: 0.58, run: 0.33 },
  pushFrom: 0.08,
  // Leaning into an acceleration: radians per (m/s^2), capped, eased in at `rate`; `side` scales the sideways
  // share (a strafe's start, a turn's centripetal pull), `dip` is metres of body drop per radian of lean,
  // `head` how much of the lean the head takes back (it stays nearer level).
  lean: { perAccel: 0.0022, max: 0.12, side: 0.85, rate: 7, dip: 0.2, head: 0.5 }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const smoothstep = (a, b, x) => smooth((x - a) / (b - a));
// A wrapped cycle difference, in (-0.5, 0.5].
const dcyc = (u, c) => { let d = u - c; d -= Math.round(d); return d; };
// A smooth bump of width w (to zero) about 0.
const bump = (d, w) => { const t = Math.abs(d) / w; return t >= 1 ? 0 : 1 - smooth(t); };

// The foot roll for one foot: du cycles since its strike, lift its ankle's height above standing (m), level the
// clip's own word on the sole (1 flat on the ground .. 0 free in the air), rw run weight. Through the stance the toe
// stays on the ground as the heel comes up with the ankle (the pitch is the one that puts the ball of the foot
// back on the ground); through the swing the toe hangs; at the strike the heel lands first.
export function footRoll(du, lift, level, rw, F = GAIT_WEIGHT) {
  du = dcyc(du, 0);
  const toeUp = mix(F.strikeToeUp.walk, F.strikeToeUp.run, rw) * bump(du - 0.02, F.strikeWidth);
  const end = mix(F.stanceEnd.walk, F.stanceEnd.run, rw);
  const win = smoothstep(F.pushFrom, F.pushFrom + 0.08, du) * (1 - smoothstep(end - 0.04, end + 0.08, du));
  const push = Math.min(F.pushMax, Math.asin(clamp(Math.max(0, lift) / F.footLen, 0, 1))) * win;
  const free = 1 - smoothstep(0.35, 0.8, level == null ? 1 : level);
  const hang = F.swingToeDown * free * (1 - win) * (1 - rw * 0.3);
  return push + hang - toeUp;
}

// Everything the gait's phase gives beyond the clips. u: cycles (0..1, the left foot strikes at u = strike.walk);
// rw: run weight; feet: { footL, footR: the ankles' lift above standing (m); levelL, levelR: the clips' sole
// contact, 1 flat .. 0 free }; legLen: hip to ankle standing (m).
export function gaitExtras(u, rw, feet, legLen = 0.52, F = GAIT_WEIGHT) {
  const strike = mix(F.strike.walk, F.strike.run, rw);
  const uL = dcyc(u, strike), uR = dcyc(u, strike + 0.5);
  const mid = mix(F.swayMid.walk, F.swayMid.run, rw);
  const amp = mix(F.sway.walk, F.sway.run, rw);
  // Over the left foot (-x) at its mid-stance, over the right at its.
  const swayX = -amp * Math.cos((uL - mid) * Math.PI * 2);
  const yawAmp = mix(F.pelvisYaw.walk, F.pelvisYaw.run, rw);
  const pelvisYaw = yawAmp * Math.cos(uL * Math.PI * 2);   // the left hip forward at the left strike
  return {
    swayX,
    legZ: -swayX / legLen,                 // both legs counter the shift, so the planted boot stays put
    pelvisYaw,
    chestYaw: -pelvisYaw * F.chestCounter,
    legYaw: -pelvisYaw * F.legCounter,
    chestRoll: amp > 0 ? -swayX / amp * F.shoulderDrop * (0.5 + 0.5 * rw) : 0,   // the shoulder over the planted foot settles
    ankleL: footRoll(uL, feet ? feet.footL : 0, feet ? feet.levelL : 1, rw, F),
    ankleR: footRoll(uR, feet ? feet.footR : 0, feet ? feet.levelR : 1, rw, F)
  };
}

// The lean of his own weight: ax, az his acceleration this frame (m/s^2) in the world, yaw his facing (radians,
// +z forward at 0, +x to his left as the rig is built), eased at F.lean.rate. s is the state kept between frames:
// s.fwd (positive: forward, a start), s.side (positive: toward his +x side).
export function leanFromAccel(s, ax, az, yaw, dt, F = GAIT_WEIGHT) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const fwd = clamp((ax * fx + az * fz) * F.lean.perAccel, -F.lean.max, F.lean.max);
  const side = clamp((ax * rx + az * rz) * F.lean.perAccel * F.lean.side, -F.lean.max, F.lean.max);
  const k = 1 - Math.exp(-F.lean.rate * dt);
  s.fwd = (s.fwd || 0) + (fwd - (s.fwd || 0)) * k;
  s.side = (s.side || 0) + (side - (s.side || 0)) * k;
  return s;
}

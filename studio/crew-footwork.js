// GB-156 (Grokbot; Jerry, 2026-10-09 22:49 CT: "Could you make the animation for mounting both the mortar and the
// Watchman MG a little more realistic. For the mortar he takes a round out of his backpack with one hand and drops it
// down the tube. Pay attention to how the player mounts these two and what his feet look like when he is rotating them
// around. They need to move with the motion of the gun instead of sliding around frictionless.")
//
// Crewed-weapon footwork and the mortar's loading drill. Visual only: nothing here moves the player's collision root,
// his aim, a cooldown or a shot.
//
// Feet: each foot is held at a point on the ground (world space) while it is planted. Every frame the body says where it
// would like each foot (its stance, through the body's own position and yaw); when one foot has fallen more than
// `trigger` behind that (or turned more than `yawTrigger`), it steps: it lifts, swings to where the body will want it a
// little ahead (the body's speed times `lead` of the step), and plants again. One foot steps at a time, so he shuffles
// round a pivot instead of skating round it. A planted foot does not move at all; a jump bigger than `snap` (a teleport)
// re-plants both at once.
export const FOOTWORK = { trigger: .085, yawTrigger: .42, stepS: .22, minStepS: .11, maxStepS: .34, swingSpeed: 3, maxLead: .14, lift: .055, lead: .9, snap: .9, gap: .02, overlap: .55 };
// Stances, body space (x: the hip's side, multiplied; z: forward of the hips, per side sign of x), foot yaw out from
// the body's heading.
export const CREW_STANCE = {
  // GP-174's Watchman stance: the left foot 10 cm forward, the right 6 cm back, under the hips.
  m240: { widen: 1.0, fwdPos: .10, fwdNeg: -.06, toe: .12, hip: .62, drop: .16 },
  // The mortar: a low crouch beside the tube, the foot nearer it forward, the other back for balance.
  mortar: { widen: 1.45, fwdPos: .16, fwdNeg: -.17, toe: .2, hip: .62, drop: .2 }
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const smooth01 = (v) => { const u = clamp(v, 0, 1); return u * u * (3 - 2 * u); };

export function createFootPlant() { return { feet: null, px: 0, pz: 0, vx: 0, vz: 0, since: 1, steps: 0 }; }
// want: [{ x, z, yaw }, { x, z, yaw }] (world); body: { x, z } (world, the hips). Returns st.feet:
// [{ x, z, yaw, lift, planted, u }] - where each foot is now.
export function stepFootPlant(st, want, body, dt, o = FOOTWORK) {
  dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
  if (!st.feet) {
    st.feet = want.map((w) => ({ x: w.x, z: w.z, yaw: w.yaw, lift: 0, planted: true, u: 0, fx: w.x, fz: w.z, fyaw: w.yaw, dur: o.stepS }));
    st.px = body.x; st.pz = body.z; st.vx = st.vz = 0;
    return st.feet;
  }
  if (dt > 0) {
    const k = 1 - Math.exp(-10 * dt);
    st.vx += ((body.x - st.px) / dt - st.vx) * k; st.vz += ((body.z - st.pz) / dt - st.vz) * k;
  }
  st.px = body.x; st.pz = body.z; st.since += dt;
  const speed = Math.hypot(st.vx, st.vz);
  let swinging = -1, swingU = 1;
  for (let i = 0; i < 2; i++) {
    const f = st.feet[i], w = want[i];
    if (Math.hypot(f.x - w.x, f.z - w.z) > o.snap) { Object.assign(f, { x: w.x, z: w.z, yaw: w.yaw, lift: 0, planted: true, u: 0 }); continue; }
    if (f.planted) continue;
    // A swinging foot aims at where the body will want it when it lands.
    f.u = Math.min(1, f.u + dt / f.dur);
    const left = (1 - f.u) * f.dur * o.lead * 2;
    let lx = st.vx * left, lz = st.vz * left; const ll = Math.hypot(lx, lz);
    if (ll > o.maxLead) { lx *= o.maxLead / ll; lz *= o.maxLead / ll; }
    const tx = w.x + lx, tz = w.z + lz;
    const e = smooth01(f.u);
    f.x = f.fx + (tx - f.fx) * e; f.z = f.fz + (tz - f.fz) * e;
    f.yaw = f.fyaw + wrap(w.yaw - f.fyaw) * e;
    f.lift = o.lift * Math.sin(Math.PI * f.u);
    if (f.u >= 1) { f.planted = true; f.lift = 0; st.since = 0; }
    else { swinging = i; swingU = f.u; }
  }
  // Quick traverses: the other foot may lift once the stepping one is `overlap` of the way down (a shuffle, never both
  // feet off the ground for long: the second lifts late, so the first is about to land).
  if ((swinging < 0 && st.since >= o.gap) || (swinging >= 0 && swingU >= o.overlap && speed > 0.45)) {
    // The foot furthest out of place (distance against `trigger`, turn against `yawTrigger`) steps, if either is out.
    let pick = -1, worst = 1;
    for (let i = 0; i < 2; i++) {
      if (i === swinging) continue;
      const f = st.feet[i], w = want[i];
      const need = Math.max(Math.hypot(f.x - w.x, f.z - w.z) / o.trigger, Math.abs(wrap(f.yaw - w.yaw)) / o.yawTrigger);
      if (need > worst) { worst = need; pick = i; }
    }
    if (pick >= 0) {
      const f = st.feet[pick];
      f.planted = false; f.u = 0; f.fx = f.x; f.fz = f.z; f.fyaw = f.yaw;
      // Quicker steps while he is moving quickly, but never a swing faster than `swingSpeed` (a long step takes longer).
      const far = Math.hypot(f.x - want[pick].x, f.z - want[pick].z) + Math.min(o.maxLead, speed * o.stepS);
      f.dur = clamp(Math.max(o.stepS / (1 + speed * 0.9), far / o.swingSpeed), o.minStepS, o.maxStepS);
      st.steps++;
    }
  }
  return st.feet;
}
// Where the body wants its feet: hips at (bx, bz) facing yaw (+z forward, x = cos/sin as the game's player frame).
// hipX: [left leg x, right leg x] in the hips' space.
export function stanceFeet(bx, bz, yaw, hipX, s, out = [{}, {}]) {
  const c = Math.cos(yaw), n = Math.sin(yaw);
  for (let i = 0; i < 2; i++) {
    const x = hipX[i] * s.widen, z = hipX[i] > 0 ? s.fwdPos : s.fwdNeg;
    out[i].x = bx + c * x + n * z; out[i].z = bz - n * x + c * z;
    out[i].yaw = yaw + Math.sign(hipX[i]) * s.toe;
  }
  return out;
}
// Two-bone leg in the hip's own space: the ankle at (lx, ly, lz) from the hip pivot (ly < 0). Thigh pitch, knee bend
// and the hip's roll that carries the leg out to the side; thigh `a`, shin `b` as studio/marine-body.js builds them.
export function legReach(lx, ly, lz, out = {}, a = 0.27, b = 0.2502) {
  out.roll = Math.atan2(lx, -ly);
  const dy = Math.hypot(lx, ly);
  const d = clamp(Math.hypot(dy, lz), Math.abs(a - b) + 0.001, a + b - 0.001);
  out.knee = Math.acos(clamp((d * d - a * a - b * b) / (2 * a * b), -1, 1));
  out.thigh = Math.atan2(-lz, dy) - Math.atan2(b * Math.sin(out.knee), a + b * Math.cos(out.knee));
  out.reach = Math.hypot(dy, lz) <= a + b - 0.001;
  return out;
}

// The mortar's loading drill. On each shot the round he is holding over the muzzle is let go and drops in (`drop`;
// the shell leaves on that same frame, so nothing waits for the animation); his hand pulls away and he ducks
// (`clear`); then the hand goes back to the pack (`reach`), pulls the next round (`grab`), brings it to the muzzle
// (`bring`) and holds it there (`ready`) for the next shot. drop + clear + reach + grab + bring = 1.56 s, inside the
// 2.4 s a mortar waits between shots; the Mk III's 1.56 s (2.4 x 0.65) and anything shorter scale the drill to fit.
export const MORTAR_LOAD = { drop: .07, clear: .26, reach: .48, grab: .15, bring: .6, settle: .55 };
export const MORTAR_LOAD_S = MORTAR_LOAD.drop + MORTAR_LOAD.clear + MORTAR_LOAD.reach + MORTAR_LOAD.grab + MORTAR_LOAD.bring;
export function createMortarLoad() { return { phase: 'rest', t: 0, scale: 1, round: false, dropping: false, dropT: 0, from: 'rest', fired: 0 }; }
// canLoad: shells left and he is settled on the tube. Phases: rest (hand on the tube), reach, grab, bring, ready, clear.
export function stepMortarLoad(s, dt, canLoad) {
  dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
  s.t += dt;
  if (s.dropping) { s.dropT += dt / (MORTAR_LOAD.drop * s.scale); if (s.dropT >= 1) { s.dropping = false; s.dropT = 1; } }
  const L = MORTAR_LOAD, k = s.scale;
  const next = (p, from) => { s.phase = p; s.t = 0; if (from) s.from = from; };
  switch (s.phase) {
    case 'rest': if (canLoad && s.t >= 0.05) next('reach', 'rest'); break;
    case 'clear': if (s.t >= (L.drop + L.clear) * k) { if (canLoad) next('reach', 'away'); else next('rest', 'away'); } break;
    case 'reach': if (s.t >= L.reach * k) { next('grab'); s.round = true; } break;
    case 'grab': if (s.t >= L.grab * k) next('bring'); break;
    case 'bring': if (s.t >= L.bring * k) next('ready'); break;
    case 'ready': if (!canLoad && !s.round) next('rest', 'hold'); break;
  }
  return s;
}
// The shot: whatever is in his hand goes down the tube now. cooldown: the wait before the next shot.
export function fireMortarLoad(s, cooldown = 2.4) {
  s.scale = clamp((cooldown - 0.06) / MORTAR_LOAD_S, 0.35, 1);
  s.dropping = s.round; s.dropT = 0; s.round = false; s.fired++;
  s.phase = 'clear'; s.t = 0;
  return s;
}
// Phase progress 0..1 (eased) for the hand's move.
export function mortarLoadU(s) {
  const L = MORTAR_LOAD, k = s.scale;
  const len = { rest: L.settle, clear: (L.drop + L.clear) * k, reach: L.reach * k, grab: L.grab * k, bring: L.bring * k, ready: 1 }[s.phase] || 1;
  return smooth01(s.t / len);
}

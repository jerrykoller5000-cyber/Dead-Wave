// game/zombie-feet.js — CL-187: the dead on their feet: heel, sole and toe (Claude's).
//
// Jerry (2026-10-12): "an animation and motion pass on all the zombies." Every two-legged kind had its feet fixed to
// its shins: a boot that tilted with the leg, the toe in the dirt at the back of the stride and the heel in it at
// the front. GP-19852 gave seven kinds an ankle and a flat sole (the shambler's, military's, bomber's, brute's,
// drowned's, spitter's and screamer's planted boots stay flat); the rest (feral, leaper, demon, colossus,
// guardian, cave guardian) still had none, and a flat sole alone hovers through the swing like a tray.
//
// Here: an ankle for the kinds that had none (prepareZombieFeet, the same split of the batched shin that
// GP-19852 does, the pivot a little higher on bare feet so the cut is at the joint), and the roll of a step for all
// of them (applyZombieFeet, after every per-kind pose has had its say): the heel lands toe-up, the sole is flat
// through the stance, the heel comes off the ground ahead of the toe (the leg is re-solved a touch higher so the
// ball of the foot stays down), and the toe hangs through the swing.
//
// Where each foot is in its step is read off the leg itself, not a phase: GP-19852's kinds each keep a private
// stride clock, so the foot's height and the way it is moving (back along the ground: planted; up and forward:
// swinging) are the one thing every rig agrees on. The kinds on the old sine gait use its phase.
//
// Pure arithmetic over joint angles; nothing here spawns or moves a body. Knobs: ZFEET (TT.zombieFeetDbg).

export const ZFEET = {
  on: true,
  toeUp: 0.17,        // the heel lands toe-up, radians (positive ankle pitch is toe down)
  pushMax: 0.42,      // the heel off the ground ahead of the toe, at most
  pushFrom: 0.62,     // ...from this far through the stance
  hang: 0.15,         // the toe hangs through the swing
  footLen: 0.19,      // ankle to the ball of the foot, metres at scale 1
  liftEps: 0.006,     // a foot this far (metres at scale 1) above its ground is in the air
  // J159 (D-191 c; Claude 5 on the Director's named loan, 17 Nov): a body's ankle, the hips down onto the planted foot,
  // the plant held still on the ground, the toes along the travel. Laid on after the roll, every frame he is on his feet.
  ankleMin: -0.49, ankleMax: 0.84,   // the ankle's pitch on the shin: inside 30 deg toe-up .. 50 deg toe-down (2 deg spare for the roll's coupling; never widened)
  ankleTwist: 0.44,                  // toe in / out on the shin, either way (25 deg)
  // (a kind may stop the toe-up sooner: the feral's bare foot opens off its shin past 20 deg, t338; kinds.feral.ankleMin)
  invIn: 0.61, invOut: 0.35,         // the sole turned in (35 deg) / out (20 deg)
  hipPass: true,                     // the hips' height: the lower sole on the ground (no flight in a walk, nothing sunk)
  heldShare: 0.3,   // walking on the spot (the body covers under heldShare of its lean's speed: pressed on its target): the gait owns the feet
  busyFree: true,   // J159 c: while the body is busy (an attack's wind-up and swing, a hit, a scream) the pose owns the feet: no plant fights it
  // CE-13p (Director 11:45Z): a kind with liveAtTarget (the feral) keeps the feet it had before J159 (the roll only: no stride to the speed, no plant,
  // no hips onto the sole, no toes to the travel) through its attack exchange: busy, between its swings (attackCd), or running on the spot (under
  // strideFrom m/s over the ground). Its own motion plants its feet there (ChatGPT's (c), game/feral-motion.js); then this flag goes. Faded over liveFade s.
  liveFade: 0.2, liveHold: 0.15,
  plant: true, plantEps: 0.035, plantHold: 2, plantReach: 0.3, plantOut: 0.3, plantSpeed: 7,   // a sole within plantEps (m at scale 1) holds its spot, up to plantReach of the leg's own length (thigh + shin, read off the bones), while he travels under plantSpeed m/s; plantOut s to let go
  stepAhead: 0.85, stepLift: 0.09, stepMin: 0.08, stepMaxT: 0.28,   // past its reach the foot steps: to stepAhead of that reach on the far side, stepLift (m at scale 1) up, in stepMin..stepMaxT s
  stepArc: 0.6,     // CE-13o (Claude 6's J159c NOTE 1): a step is an arc: up first (sin^stepArc of the way through), over while it is up, straight down onto its spot
  // CE-13o: a gait with no steps of its own (the screamer's glide: the gait's stance speed under strideGlide of what he covers) walks on the plant's steps at
  // a walker's stride for its speed: each foot's reach fore and aft glideK x Froude^0.3 of the leg (Alexander's stride, its stance share), inside
  // plantReach..glideReach, and a swing of glideSwing x the reach over the speed (about a third of the cycle), the arc up to glideArc of the step's length
  glideK: 0.69, glideReach: 0.5, glideSwing: 1.0, glideArc: 0.12, glideRate: 4,
  legStraight: 0.985, hipDrop: 0.12,   // the leg is never asked quite straight; the hips come down for a far plant by at most hipDrop of the leg
  runFroude: 3, legRef: 0.74, ownSteps: 1.2, flightClear: 0.07, flightRate: 30,   // the sprint: past Froude runFroude (v*v over g x the leg: legRef m at scale 1 x the bones' own scale; 4.7 m/s for a man's leg) a gait with steps of its own flies between footfalls, flightClear m up
  stride: true, strideFrom: 0.5, strideMin: 0.6, strideMax: 1.5, strideGlide: 0.3, strideHold: 0.35, strideRate: 4, strideMidRate: 2, strideFlexMax: 1.2,   // the stride kept to the speed (strideToSpeed): the swing scaled strideMin..strideMax about its mean
  sideMax: 0.35,                      // the hip out or in for a plant off to the side, at most (20 deg)
  swingClear: 0.065, swingSpeed: 0.3, liftRate: 20,   // a foot the gait slides forward faster than swingSpeed m/s is lifted swingClear m clear of the ground
  hipExt: 0.5,                       // ...and never past the hip's extension (30 deg): past it the plant gives instead
  toeYawFree: 0.52, toeYawMax: 0.44, toeYawRate: 6,   // the legs turn toward the travel only past toeYawFree off the facing (30 deg), at most 25 deg (the rest is the AI's turn)
  // Per kind: the roll's scale, and how the step is read.
  kinds: {
    shambler: { k: 1.0 }, military: { k: 0.8 }, bomber: { k: 0.8 }, brute: { k: 0.7 }, drowned: { k: 0.9 }, spitter: { k: 0.9 }, screamer: { k: 1.0 },
    feral: { k: 0.9, sine: true, ankleMin: -0.35, liveAtTarget: true }, demon: { k: 0.7, sine: true }, colossus: { k: 0.6, sine: true }, guardian: { k: 0.8, sine: true, noStride: true }, caveguard: { k: 0.8, sine: true, noStride: true }   // (the guardians' anatomical legs: the stride scale reads as a knee wobble, kneeVar)
    // (the leaper runs on all fours on GP-19856's own paws; the spider plants its own limbs)
  }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const WALK_HIP_TRIM = { shambler: 0.012, drowned: 0.03, military: 0.012, brute: 0.05, spitter: 0.025, colossus: -0.06 };

// The roll through a step. u: 0 at the strike .. 1 at toe-off (the stance); v: 0 at toe-off .. 1 at the strike
// (the swing); exactly one of them is given. Returns the ankle pitch (radians, toe down positive).
export function stepRoll(u, v, F = ZFEET) {
  if (u != null) return -F.toeUp * (1 - smooth(0.02, 0.18, u)) + F.pushMax * smooth(F.pushFrom, 1, u);
  return F.pushMax * (1 - smooth(0, 0.35, v)) + F.hang * Math.sin(Math.PI * v) - F.toeUp * smooth(0.72, 1, v);
}

// Two-bone solve in the leg's plane: the ankle at (ry, rz) from the hip pivot, thigh A, shin B.
export function legSolve(ry, rz, A, B) {
  const d = clamp(Math.hypot(ry, rz), 0.01, A + B - 1e-5);
  const knee = Math.PI - Math.acos(clamp((A * A + B * B - d * d) / (2 * A * B), -1, 1));
  const thigh = Math.atan2(-rz, -ry) - Math.acos(clamp((A * A + d * d - B * B) / (2 * A * d), -1, 1));
  return { thigh, knee };
}

// An ankle for a rig without one: the foot's meshes (by rest height, or split out of a batched shin by colour and
// height, as GP-19852 does) move into a group at the joint. Kinds with bare feet get the pivot at the shin's foot.
export function prepareZombieFeet(T, mesh, scale = 1, kind = '') {
  const u = mesh.userData, bare = !!(ZFEET.kinds[kind] && ZFEET.kinds[kind].sine && kind !== 'colossus');
  const pivotY = (bare ? -0.33 : -0.36) * scale, cut = (bare ? -0.31 : -0.28) * scale;
  for (const leg of [u.legLG, u.legRG]) {
    const shin = leg && leg.userData.shinG; if (!shin || leg.userData.shamblerAnkle) continue;
    let feet = shin.children.filter((o) => o.isMesh && o.position.y < cut);
    if (!feet.length) feet = splitFoot(T, shin, cut / scale);
    if (!feet.length) continue;
    const ankle = new T.Group(); ankle.name = 'zombie-ankle'; ankle.position.set(0, pivotY, 0.04 * scale);
    shin.add(ankle);
    for (const f of feet) { f.position.sub(ankle.position); ankle.add(f); }
    leg.userData.shamblerAnkle = ankle;
    leg.userData.shamblerFootY = u.baseHipsY + leg.position.y + shin.position.y + ankle.position.y;
    leg.userData.ankleByClaude = true;
  }
}
// The foot's triangles out of a batched shin: those below `cut` (shin space, scale 1), or boot-coloured.
function splitFoot(T, shin, cut) {
  const leather = new T.Color(0x594834), sole = new T.Color(0x27251f), out = [];
  const sc = Math.abs(shin.position.y) / 0.38;
  for (const m of [...shin.children]) {
    const src = m.geometry; if (!m.isMesh || !src || !src.attributes || !src.attributes.color) continue;
    const geo = src.index ? src.toNonIndexed() : src, P = geo.attributes.position, C = geo.attributes.color;
    const foot = [], leg = [];
    for (let i = 0; i < P.count; i += 3) {
      const y = (P.getY(i) + P.getY(i + 1) + P.getY(i + 2)) / 3;
      const same = (c) => Math.abs(C.getX(i) - c.r) + Math.abs(C.getY(i) - c.g) + Math.abs(C.getZ(i) - c.b) < 1e-5;
      const isFoot = same(leather) || (same(sole) && y < -0.2 * sc) || y < cut * sc;
      (isFoot ? foot : leg).push(i, i + 1, i + 2);
    }
    if (!foot.length || !leg.length) continue;
    const part = (idx) => {
      const g = new T.BufferGeometry();
      for (const [name, a] of Object.entries(geo.attributes)) {
        const data = new a.array.constructor(idx.length * a.itemSize);
        idx.forEach((n, j) => { for (let c = 0; c < a.itemSize; c++) data[j * a.itemSize + c] = a.array[n * a.itemSize + c]; });
        g.setAttribute(name, new T.BufferAttribute(data, a.itemSize));
      }
      return g;
    };
    const fm = new T.Mesh(part(foot), m.material); fm.position.copy(m.position); fm.quaternion.copy(m.quaternion); fm.scale.copy(m.scale); fm.castShadow = m.castShadow; shin.add(fm); out.push(fm);
    m.geometry = part(leg);
    if (geo !== src) geo.dispose();
  }
  return out;
}

// After every pose of the frame. ctx: { phase (the sine gait's), walkAmt 0..1, standing, busy (an attack or a
// special move owns the legs) }.
export function applyZombieFeet(z, ctx) {
  if (!ZFEET.on || !z.alive || z.farLod || z.crawling || z.hopping) return;
  const K = ZFEET.kinds[z.typeKey]; if (!K) return;
  const u = z.mesh.userData, hips = u.hips; if (!hips) return;
  const rest = u.rest || {};
  const st = z._feet || (z._feet = [{ rz: 0, reach: 0.25, planted: false }, { rz: 0, reach: 0.25, planted: false }]);
  const walking = !ctx.standing && !ctx.busy && ctx.walkAmt > 0.05;
  if (K.liveAtTarget) {
    const w = liveWeight(z, st, ctx, walking);
    stripAdds(u, st);   // last frame's stride, toe turn and side plant off: both answers start from the pose
    if (w < 1) {
      rollFeet(z, ctx, K, u, hips, rest, st, walking);   // the feet as they were before J159
      if (w <= 0) { restFeet(st); return; }
      snapFeet(u, _snapLv); putFeet(u, _snapA0);
    }
    strideToSpeed(z, u, st, ctx, walking); rollFeet(z, ctx, K, u, hips, rest, st, walking); groundFeet(z, u, st, ctx, walking);
    if (w < 1) blendFeet(u, st, w);
    return;
  }
  strideToSpeed(z, u, st, ctx, walking);
  rollFeet(z, ctx, K, u, hips, rest, st, walking);
  groundFeet(z, u, st, ctx, walking);
}
// The roll of every step (CL-187), the ankle inside its range
function rollFeet(z, ctx, K, u, hips, rest, st, walking, F = ZFEET) {
  const k = K.k;
  for (let i = 0; i < 2; i++) {
    const leg = i ? u.legRG : u.legLG, lost = i ? z.partsLost && z.partsLost.legR : z.partsLost && z.partsLost.legL;
    const shin = leg && leg.userData.shinG, ankle = leg && leg.userData.shamblerAnkle;
    if (!shin || !ankle || lost) continue;
    const A = Math.abs(shin.position.y), B = Math.abs(ankle.position.y), s = A / 0.38;   // the kind's scale is in the bones
    const a = leg.rotation.x, kn = shin.rotation.x;
    const ry = -(A * Math.cos(a) + B * Math.cos(a + kn)), rz = -(A * Math.sin(a) + B * Math.sin(a + kn));
    const S = st[i], dz = rz - S.rz; S.rz = rz;
    // Kinds without a module keep the sine gait's legs: the sole is laid flat here (GP-19852's kinds do their own).
    if (leg.userData.ankleByClaude) {
      ankle.rotation.x = -((hips.rotation.x - (rest.hipsRX || 0)) + (a - (i ? rest.legRRX || 0 : rest.legLRX || 0)) + kn);
      ankle.rotation.z = -(hips.rotation.z - (rest.hipsRZ || 0));
    }
    if (!walking) { clampAnkle(ankle, i, K.ankleMin || F.ankleMin, F, z.mesh); continue; }
    let roll = 0, lift = 0;
    if (K.sine) {
      // The old gait: a leg is front-most at sin = -1 (the strike) and back-most at sin = 1 (toe-off), planted between.
      const c = ((ctx.phase / (Math.PI * 2) + 0.25 + i * 0.5) % 1 + 1) % 1;
      roll = c < 0.5 ? stepRoll(c / 0.5, null, F) : stepRoll(null, (c - 0.5) / 0.5, F);
      roll *= k * ctx.walkAmt;
      if (roll > 0 && c < 0.5) lift = F.footLen * s * Math.sin(roll) * 0.6;
    } else {
      // GP-19852's kinds: the foot is planted when it is on its ground and going back; it swings when it is up or
      // coming forward. How far through: by where it is between the front and the back of its reach.
      const footY = hips.position.y + leg.position.y + ry, ground = leg.userData.shamblerFootY != null ? leg.userData.shamblerFootY : footY;
      const up = footY - ground;
      const planted = up < F.liftEps * s && dz <= 1e-4;
      if (planted) { if (!S.planted) S.reach = Math.max(0.08 * s, Math.abs(rz)); S.planted = true; S.reach = Math.max(S.reach, Math.abs(rz)); }
      else { if (S.planted) S.reach = Math.max(0.08 * s, Math.abs(rz)); S.planted = false; }
      const R = S.reach;
      if (planted) { const uu = clamp((R - rz) / (2 * R), 0, 1); roll = stepRoll(uu, null, F); if (roll > 0) lift = F.footLen * s * Math.sin(roll); }
      else { const vv = clamp((rz + R) / (2 * R), 0, 1); roll = stepRoll(null, vv, F) * (1 - smooth(0.05 * s, 0.14 * s, up) * 0.5); }
      roll *= k * ctx.walkAmt; lift *= k * ctx.walkAmt;
    }
    if (lift > 1e-4) {
      // The heel comes up: the ankle rises by what the pitch takes, so the ball of the foot stays on the ground.
      const p = legSolve(ry + lift, rz, A, B);
      const da = p.thigh - a, dk = p.knee - kn;
      leg.rotation.x = p.thigh; shin.rotation.x = p.knee;
      ankle.rotation.x -= da + dk;   // the sole as it was, then the roll
    }
    ankle.rotation.x += roll;
    clampAnkle(ankle, i, K.ankleMin || F.ankleMin, F, z.mesh);
  }
  // The authored stride can put the two soles just outside their contact band at once.
  // Trim the walking hip bob after the ankle solve; resting and hit poses keep their own heights.
  if (walking) {
    const trim = WALK_HIP_TRIM[z.typeKey] || 0;
    hips.position.y += trim * ctx.walkAmt;
  }
}
// CE-13p: the feral's attack exchange on its old feet. 0 = the old feet, 1 = J159's; held liveHold s past the exchange, faded over liveFade s.
function liveWeight(z, st, ctx, walking, F = ZFEET) {
  const dt = Math.min(0.05, ctx.dt || z._zfDt || 1 / 60), L = z._lean, sp = L ? Math.hypot(L.vx, L.vz) : 0;
  const x = ctx.busy || z.attackCd > 0 || (walking && sp < F.strideFrom);
  st.lt = x ? F.liveHold : Math.max(0, (st.lt || 0) - dt);
  st.lw = clamp((st.lw ?? (x ? 0 : 1)) + (st.lt > 0 ? -1 : 1) * dt / F.liveFade, 0, 1);
  return st.lw;
}
const _snapA0 = [], _snapLv = [];
function snapFeet(u, out) {
  out.length = 0; out.push(u.hips.position.y);
  for (const leg of [u.legLG, u.legRG]) { const sh = leg && leg.userData.shinG, a = leg && leg.userData.shamblerAnkle; if (!sh || !a) { out.push(null); continue; }
    out.push([leg.rotation.x, leg.rotation.y, leg.rotation.z, sh.rotation.x, a.rotation.x, a.rotation.y, a.rotation.z]); }
  return out;
}
function putFeet(u, s) {
  u.hips.position.y = s[0];
  [u.legLG, u.legRG].forEach((leg, i) => { const r = s[i + 1]; if (!r) return; leg.rotation.set(r[0], r[1], r[2]); leg.userData.shinG.rotation.x = r[3]; leg.userData.shamblerAnkle.rotation.set(r[4], r[5], r[6]); });
}
// last frame's additions taken off where the pose did not rebuild them (the pose writes the swing and the knee, not the turn or the side)
function stripAdds(u, st) {
  [u.legLG, u.legRG].forEach((leg, i) => { const S = st[i], ank = leg && leg.userData.shamblerAnkle; if (!ank || !leg.userData.shinG) return; const r = leg.rotation, q = ank.rotation;
    if (S.sxLeft != null && r.x === S.sxLeft) r.x -= S.sxAdd || 0;
    if (S.yawLeft != null && r.y === S.yawLeft) r.y -= S.yawAdd || 0;
    if (S.zLeft != null && r.z === S.zLeft) r.z -= S.zAdd || 0;
    if (S.azLeft != null && q.z === S.azLeft) q.z += S.azAdd || 0;
    S.sxLeft = S.yawLeft = S.zLeft = S.azLeft = null; S.sxAdd = S.yawAdd = S.zAdd = S.azAdd = 0; });
  snapFeet(u, _snapA0);
}
// fully on the old feet: nothing held, nothing carried over into the walk after it (the stride's clock and the plant start fresh)
function restFeet(st) {
  // CB-351 (Director 15:30Z, ChatGPT's first NaN writer): the plant's pace (S.rate) starts fresh too. restFeet set S.ex, so the plant's own
  // first-frame start (S.ex == null) never ran for a feral born into its exchange: S.rate stayed undefined, the first step's
  // time was NaN, and the right leg went NaN from the side solve on (108 of 120 frames, the leg missing in every picture).
  for (const S of st) { S.lock = S.step = null; S.c = 0; S.ex = S.ez = 0; S.e = 0; S.lift = 0; S.rate = 0.6; S.fly = false; S.over = false; S.sz = null; S.pz = null; S.pwx = null; S.sBase = null; }
  st.hov = 0; st.sk = 1; st.yaw = 0; st.rpx = null; st.rv = undefined; st.pr = null; st.ownRun = false;
}
// the two answers mixed (w of J159's), and what J159 added kept as its additions so the next frame takes them off again
function blendFeet(u, st, w) {
  const N = snapFeet(u, []), Lv = _snapLv, mix = (a, b) => a + (b - a) * w;
  u.hips.position.y = mix(Lv[0], N[0]);
  [u.legLG, u.legRG].forEach((leg, i) => { const a = Lv[i + 1], b = N[i + 1]; if (!a || !b) return; const S = st[i], r = leg.rotation, sh = leg.userData.shinG, q = leg.userData.shamblerAnkle.rotation;
    r.set(mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])); sh.rotation.x = mix(a[3], b[3]); q.set(mix(a[4], b[4]), mix(a[5], b[5]), mix(a[6], b[6]));
    S.yawLeft = r.y; S.yawAdd = r.y - a[1]; S.zLeft = r.z; S.zAdd = r.z - a[2]; S.azLeft = q.z; S.azAdd = a[6] - q.z; });
}

// J159 c (the Director's 08:02Z call): the stride keeps time with the ground. A gait's stance carries the foot back under the
// hips at its own rate (the per-kind swing and the cadence); when that is slower than the body is really going, a planted foot
// has to be dragged or stepped off. Here each leg's fore-and-aft swing is scaled about its own mean so the stance carries the
// foot back at the body's speed, up to strideMax (past it the run's flight takes the rest), down to strideMin (a gait running on
// the spot). Read off the bones every frame: the gait's own rate of the foot going back, the leg's own length; nothing per kind.
// A gait that holds its legs still (the screamer's glide) is left to the plant's steps.
function strideToSpeed(z, u, st, ctx, walking, F = ZFEET) {
  const legs = [u.legLG, u.legRG], L = z._lean, dt = Math.min(0.05, ctx.dt || z._zfDt || 1 / 60), ms = z.mesh.scale.y || 1;
  const sp = Math.min(L ? Math.hypot(L.vx, L.vz) : 0, st.rv ?? 99);   // the ground he really covers (groundFeet keeps st.rv)
  let gv = 0, nn = 0;
  for (let i = 0; i < 2; i++) {
    const leg = legs[i], S = st[i], shin = leg && leg.userData.shinG, ankle = leg && leg.userData.shamblerAnkle; if (!shin || !ankle) continue;
    const r = leg.rotation, base = r.x === S.sxLeft ? r.x - (S.sxAdd || 0) : r.x;   // the gait's own thigh (a pose that did not rebuild the leg keeps last frame's)
    const A = Math.abs(shin.position.y), B = Math.abs(ankle.position.y), kn = shin.rotation.x;
    const rz = -(A * Math.sin(base) + B * Math.sin(base + kn));
    if (S.sz != null) { const v = -(rz - S.sz) / dt * ms; if (v > 0) { gv = Math.max(gv, v); nn++; } }   // the foot going back under him, m/s
    S.sz = rz; S.sBase = base;
    S.sMid = S.sMid == null ? base : S.sMid + (base - S.sMid) * (1 - Math.exp(-F.strideMidRate * dt));
  }
  // the gait's stance speed, held over a stride (its peak is what a planted foot needs)
  st.gv = Math.max(gv, (st.gv || 0) * Math.exp(-dt / F.strideHold));
  let want = 1;
  if (F.stride && !(F.kinds[z.typeKey] || {}).noStride && walking && sp > F.strideFrom && st.gv > F.strideGlide * sp) want = clamp(sp / st.gv, F.strideMin, F.strideMax);
  st.sk = st.sk == null ? 1 : st.sk + (want - st.sk) * (1 - Math.exp(-(walking ? F.strideRate : 4 * F.strideRate) * dt));
  for (let i = 0; i < 2; i++) {
    const leg = legs[i], S = st[i]; if (!leg || S.sBase == null) continue;
    let x = S.sBase + (st.sk - 1) * (S.sBase - S.sMid);
    if (x > S.sBase && x > F.hipExt * 0.95) x = Math.max(S.sBase, F.hipExt * 0.95);   // never past the hip's extension (zombie-limits hipFlex)
    if (x < S.sBase && x < -F.strideFlexMax) x = Math.min(S.sBase, -F.strideFlexMax);   // ...nor past what the hip flexes to in a run
    leg.rotation.x = x; S.sxLeft = x; S.sxAdd = x - S.sBase;
  }
}

// --- J159 (D-191 c): a body's ankle, the hips on the planted foot, the plant held, the toes along the travel ----------
// The ankle on its shin (its own turn: the rigs' ankles rest at zero on the shin, the skin's bind): pitch, twist and the
// sole's roll inside a foot's range. 'L' groups sit at -x (rule of the rig), so the roll's inward sign flips with the side.
export function clampAnkle(ankle, i, min = ZFEET.ankleMin, F = ZFEET, root = null) {   // (exported for its test, CE-17)
  const r = ankle.rotation;
  if (r.x < min) r.x = min; else if (r.x > F.ankleMax) r.x = F.ankleMax;
  if (r.y < -F.ankleTwist) r.y = -F.ankleTwist; else if (r.y > F.ankleTwist) r.y = F.ankleTwist;
  const lim = Math.min(F.invIn, F.invOut) - 0.02;   // the sole's roll either way inside the tighter of in and out (the rig's sides are mirrored: one stop for both)
  if (r.z < -lim) r.z = -lim; else if (r.z > lim) r.z = lim;
  // CE-17 (CE-16 c): the same stop on the reader's own measure. t339 and the audit's sampler (J159, __J.legRead) read the roll as
  // the TWIST about z of the shin-to-ankle turn, taken from the two WORLD frames with each axis's length divided out. Two things
  // make that differ from the Euler z: (1) pitch and toe-in on as well (up to 30 deg read for an Euler z at its 18.9 stop), and
  // (2) a body scaled unevenly (the brute's 0.981 x 1.012 x 0.981): the world frames are skewed, so his z at the stop (18.9)
  // read 20.5 (frames 115-120 of the native 213; read with the same scale made even, 18.9). Read it as the reader does (root:
  // the zombie's mesh, its world frame included) and take the excess off z. Same stop, never wider.
  if (!_Qa) { _Qa = new ankle.quaternion.constructor(); _Qb = new ankle.quaternion.constructor(); _Ms = new ankle.matrix.constructor(); _Ma = new ankle.matrix.constructor(); _Mr = new ankle.matrix.constructor(); _Vp = new ankle.position.constructor(); _Vs = new ankle.position.constructor(); }
  let shinQ = null;
  if (root && ankle.parent && ankle.parent !== root && chainMatrix(root, ankle.parent, _Ms)) {
    const sc = root.scale;   // (the reader's divide-out is not even under a turn of a skewed frame: the body's own turn is kept in too)
    if (Math.abs(sc.x - sc.y) > 1e-6 || Math.abs(sc.y - sc.z) > 1e-6) { root.updateMatrix(); _Mr.copy(root.matrix); if (root.parent) _Mr.premultiply(root.parent.matrixWorld); _Ms.premultiply(_Mr); _Ms.decompose(_Vp, _Qb, _Vs); shinQ = _Qb.invert(); }
  }
  for (let k = 0; k < 4; k++) {
    let q;
    if (shinQ) { ankle.updateMatrix(); _Ma.multiplyMatrices(_Ms, ankle.matrix).decompose(_Vp, _Qa, _Vs); q = _Qa.premultiply(shinQ); }
    else q = _Qa.setFromEuler(r);
    const t = 2 * Math.atan2(q.z, q.w), tz = Math.atan2(Math.sin(t), Math.cos(t));
    const ex = tz > lim ? tz - lim : tz < -lim ? tz + lim : 0;
    if (Math.abs(ex) < 1e-5) break;
    r.z -= ex;
  }
}
let _Qa = null, _Qb = null, _Ms = null, _Ma = null, _Mr = null, _Vp = null, _Vs = null;

// Scratch (made from the rig's own classes on first use: this file imports nothing)
let _M = null, _H = null, _V = null; const _chain = [];
function scratch(o) { if (!_M) { _M = new o.matrix.constructor(); _H = new o.matrix.constructor(); _V = new o.position.constructor(); } }
// obj's matrix in the space of root's children (root's own position, turn and scale left out): the body's space, ground y 0
function chainMatrix(root, obj, out) {
  _chain.length = 0; let o = obj;
  while (o && o !== root) { _chain.push(o); o = o.parent; }
  if (o !== root) return false;
  out.identity();
  for (let k = _chain.length - 1; k >= 0; k--) { const n = _chain[k]; n.updateMatrix(); out.multiply(n.matrix); }
  return true;
}
// The sole's heel and toe in the ankle's own space: from the visible skin's vertices on that bone (its bind), once per
// skin; without a skin, the ankle's rest height over the ground and a boot's length.
const _soleBySkin = new WeakMap();
function skinOf(z) {
  const u = z.mesh.userData;
  if (u._zfSkin === undefined) { u._zfSkin = null; z.mesh.traverse((o) => { if (!u._zfSkin && o.isSkinnedMesh && o.name === 'zombie-skin') u._zfSkin = o; }); }
  return u._zfSkin;
}
function soleOf(z, leg, ankle) {
  const a = ankle.userData; if (a.zfSole) return a.zfSole;
  let sole = null; const skin = skinOf(z);
  if (skin && skin.skeleton && skin.geometry && skin.geometry.attributes.skinIndex) {
    const bi = skin.skeleton.bones.indexOf(ankle);
    let per = _soleBySkin.get(skin.geometry); if (!per) _soleBySkin.set(skin.geometry, (per = new Map()));
    if (bi >= 0 && per.has(bi)) sole = per.get(bi);
    else if (bi >= 0) {
      const g = skin.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
      const m = new skin.bindMatrix.constructor().copy(skin.skeleton.boneInverses[bi]).multiply(skin.bindMatrix), v = new ankle.position.constructor();
      let y0 = Infinity, z0 = Infinity, z1 = -Infinity, n = 0;
      for (let k = 0; k < P.count; k++) {
        let w = 0; for (let c = 0; c < 4; c++) if (SI.array[k * SI.itemSize + c] === bi) w += SW.array[k * SW.itemSize + c];
        if (w < 0.5) continue;
        v.fromBufferAttribute(P, k).applyMatrix4(m); n++;
        if (v.y < y0) y0 = v.y; if (v.z < z0) z0 = v.z; if (v.z > z1) z1 = v.z;
      }
      if (n > 8) sole = { y: y0, heel: z0 * 0.9, toe: z1 * 0.9 };
      per.set(bi, sole);
    }
  }
  if (!sole) { const sc = Math.abs(leg.userData.shinG.position.y) / 0.38, h = leg.userData.shamblerFootY != null ? leg.userData.shamblerFootY : 0.06 * sc; sole = { y: -h, heel: -0.05 * sc, toe: 0.17 * sc }; }
  return (a.zfSole = sole);
}
// The lower of a foot's heel and toe over the ground (the body's space, ground y 0), and its ankle there (into pos)
function footLow(z, leg, ankle, pos) {
  if (!chainMatrix(z.mesh, ankle, _M)) return Infinity;
  const so = soleOf(z, leg, ankle);
  const h = _V.set(0, so.y, so.heel).applyMatrix4(_M).y, t = _V.set(0, so.y, so.toe).applyMatrix4(_M).y;
  if (pos) pos.setFromMatrixPosition(_M);
  return Math.min(h, t);
}
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// On his feet: not knocked, rising, falling, leaping, charging, climbing or crawling (those own the height of the body)
function onFeet(z) { return !(z.knockT > 0 || z.riseT > 0 || z._fall || z.leapT > 0 || z.chargeT > 0 || z.hopping || z.crawling || z.climbing || z.knockKeyed || z._bgu !== undefined); }
const _pa = [null, null];
function groundFeet(z, u, st, ctx, walking, F = ZFEET) {
  const hips = u.hips, legs = [u.legLG, u.legRG];
  if (!hips || !onFeet(z)) { st[0].lock = st[1].lock = null; st[0].c = st[1].c = 0; return; }
  scratch(hips);
  if (!_pa[0]) { _pa[0] = new hips.position.constructor(); _pa[1] = new hips.position.constructor(); }
  const dt = Math.min(0.05, ctx.dt || z._zfDt || 1 / 60), s = Math.abs(u.legLG && u.legLG.userData.shinG ? u.legLG.userData.shinG.position.y : 0.38) / 0.38;
  const live = (i) => { const leg = legs[i], lost = i ? z.partsLost && z.partsLost.legR : z.partsLost && z.partsLost.legL; return leg && leg.userData.shinG && leg.userData.shamblerAnkle && !lost ? leg : null; };
  // the toes along the travel: both legs turn (at the hip) toward the way he is going, from where the hips already point, never past toeYawMax
  const L = z._lean, moving = walking && L && Math.hypot(L.vx, L.vz) > 0.35;
  let want = 0;
  if (moving) { let d = wrapA(Math.atan2(L.vx, L.vz) - z.mesh.rotation.y - (hips.rotation.y || 0)); if (Math.abs(d) > Math.PI / 2) d = wrapA(d + Math.PI); const ex = Math.abs(d) - F.toeYawFree; if (ex > 0) want = Math.sign(d) * Math.min(F.toeYawMax, ex) * ctx.walkAmt; }
  st.yaw = (st.yaw || 0) + (want - (st.yaw || 0)) * (1 - Math.exp(-F.toeYawRate * dt));
  for (let i = 0; i < 2; i++) { const leg = live(i); if (!leg) continue; const S = st[i], r = leg.rotation; const base = r.y === S.yawLeft ? r.y - (S.yawAdd || 0) : r.y; r.y = base + st.yaw; S.yawLeft = r.y; S.yawAdd = st.yaw; }
  // last frame's hip-out for a side plant comes off first where the pose did not rebuild the leg: everything below reads the gait's own leg
  for (let i = 0; i < 2; i++) { const leg = live(i); if (leg && st[i].zAdd) setSide(leg, leg.userData.shamblerAnkle, st[i], 0); }
  // each foot fore or aft of its hip in the leg's own swing, and which way it is going (a turn of the hips or the toes is not a step)
  for (let i = 0; i < 2; i++) { const leg = live(i), S = st[i]; if (!leg) continue; const shin = leg.userData.shinG, ankle = leg.userData.shamblerAnkle, A = Math.abs(shin.position.y), B = Math.abs(ankle.position.y), a = leg.rotation.x, kn = shin.rotation.x;
    const rzA = -(A * Math.sin(a) + B * Math.sin(a + kn)); S.dzg = S.pz == null ? 0 : rzA - S.pz; S.pz = rzA; }
  // the hips: the lower sole on the ground. In a run (below) with nobody holding the ground and the lower foot still coming
  // forward (or just pushed off), the body is in its flight: that foot is kept flightClear over the ground, not dragged along it
  const ms0 = z.mesh.scale.y || 1, sp0 = L ? Math.hypot(L.vx, L.vz) : 0;
  const hipPass = (first) => {
    let lo = Infinity, iLo = -1; for (let i = 0; i < 2; i++) { const leg = live(i); if (!leg) continue; const v = footLow(z, leg, leg.userData.shamblerAnkle, null); if (v < lo) { lo = v; iLo = i; } }
    if (!F.hipPass || !isFinite(lo)) return;
    if (first) {
      const hold = st[0].lock || st[0].step || st[1].lock || st[1].step, S = st[iLo], lands = S.dzg <= 1e-4 * s && !S.fly;
      const fly = F.plant && walking && st.ownRun && !hold && !lands && sp0 < F.plantSpeed && sp0 > Math.sqrt(F.runFroude * 9.81 * F.legRef * s * ms0);
      st[0].landing = st[1].landing = false; if (!fly && !hold && lands && (st.hov || 0) > 0.004) S.landing = true;   // out of the flight: this foot takes the ground where it is now
      st.hov = (st.hov || 0) + ((fly ? F.flightClear / ms0 : 0) - (st.hov || 0)) * (1 - Math.exp(-F.flightRate * dt)); if (st.hov < 1e-4) st.hov = 0;
    }
    hips.position.y -= lo - (st.hov || 0);
  };
  hipPass(true);
  if (!F.plant) return;
  // the plant (J159 b2): a sole on the ground keeps its spot in the world while it is down. The leg reaches for it: thigh
  // and knee in the leg's plane, the hip out or in for what is sideways. When the plant is further off than the leg should
  // reach (plantReach of the leg's own length: the bones', never a number per kind) or the hip or knee would pass their
  // range, the foot STEPS: up, over to the far side of where the gait holds it, down, and it plants again; one foot at a
  // time. A gait with no steps of its own (the screamer's glide) walks on these; a gait whose cadence fits its speed never
  // needs one. A foot the gait drags forward along the ground is lifted clear while the other holds.
  const m = z.mesh, yaw = m.rotation.y, ms = m.scale.y || 1, cy = Math.cos(yaw), sy = Math.sin(yaw);
  // what he really covers (a body pressed against its target or a wall walks on the spot: its lean says 4 m/s, the ground says 0)
  if (st.rpx != null) { const rv = Math.hypot(m.position.x - st.rpx, m.position.z - st.rpz) / dt; st.rv = (st.rv ?? rv) + (rv - (st.rv ?? rv)) * (1 - Math.exp(-10 * dt)); }
  st.rpx = m.position.x; st.rpz = m.position.z;
  const sp = L ? Math.hypot(L.vx, L.vz) : 0, held = walking && sp > 0.5 && (st.rv ?? sp) < F.heldShare * sp;
  const calm = sp < F.plantSpeed && !(F.busyFree && ctx.busy && !walking) && !held;   // a shove carries the feet with it; an attack's own pose (the wind-up, the swing, a lunge) owns its feet
  chainMatrix(m, hips, _H);
  const e0 = _H.elements, n0 = Math.hypot(e0[0], e0[1], e0[2]) || 1, n1 = Math.hypot(e0[4], e0[5], e0[6]) || 1, n2 = Math.hypot(e0[8], e0[9], e0[10]) || 1;   // the hips' axes in the body (column-major)
  const run = sp > Math.sqrt(F.runFroude * 9.81 * F.legRef * s * ms); let ownRun = false;
  // CE-13o: the glide's stride (a gait whose own stance speed is under strideGlide of what he covers has no steps of its own)
  { const l0 = live(0) || live(1), Lb = l0 ? Math.abs(l0.userData.shinG.position.y) + Math.abs(l0.userData.shamblerAnkle.position.y) : 0.76 * s, vg = Math.min(sp, st.rv ?? 99);
    let pr = F.plantReach; if (walking && calm && vg > F.strideFrom && st.gv != null && st.gv < F.strideGlide * vg) pr = clamp(F.glideK * Math.pow(vg * vg / (9.81 * Lb * ms), 0.3), F.plantReach, F.glideReach);
    st.pr = st.pr == null ? pr : st.pr + (pr - st.pr) * (1 - Math.exp(-F.glideRate * dt)); }
  const PR = st.pr, glide = PR > F.plantReach + 0.005;   // own gait + run speed: remembered for the next frame's flight
  let drop = 0; _tg[0].on = _tg[1].on = false; _tg[0].A = _tg[1].A = 0; _tg[0].B = _tg[1].B = 0;
  for (let i = 0; i < 2; i++) {
    const leg = live(i), S = st[i], O = st[1 - i]; if (!leg) { S.lock = S.step = null; S.c = 0; continue; }
    const ankle = leg.userData.shamblerAnkle, shin = leg.userData.shinG, pa = _pa[i];
    const A = Math.abs(shin.position.y), B = Math.abs(ankle.position.y), a = leg.rotation.x, kn = shin.rotation.x;
    const low = footLow(z, leg, ankle, pa);
    const wx = m.position.x + (pa.x * cy + pa.z * sy) * ms, wz = m.position.z + (-pa.x * sy + pa.z * cy) * ms;
    if (S.ex == null) { S.ex = S.ez = 0; S.lift = 0; S.e = 0; S.rate = 0.6; }
    // down: on the ground and, in a walk, in its stance (going back under him, as GP-19852 reads it), not a shuffle's drag forward
    const dzg = S.dzg;
    // ...and once it holds, it holds until the gait lifts it clear (plantHold x the band): a lean, a turn or a foot the gait drags along the
    // ground does not let it go (that foot stays where it is until its reach, then steps)
    const down = calm && !S.fly && (low < F.plantEps * s * (S.lock ? F.plantHold : 1) || (S.landing && low < 0.12 * s)) && (!!S.lock || !walking || dzg <= 1e-4 * s || (!O.lock && !O.step) || (!!O.lock && (O.en >= 1 || O.over)));   // (nobody else holds the ground, or the foot that does is at its reach and has to step: this one takes it, whichever way the gait is carrying it)
    const cap = PR * (A + B) * ms;
    let lift = 0;
    if (!calm) { S.lock = S.step = null; }
    // a gait that lifts its own feet (seen within the last ownSteps s) runs with a flight: past the walk's top speed for its leg
    // (Froude runFroude: v*v over g x the leg's length) a plant past its reach leaves the ground and waits for the gait's next footfall
    if (low - (st.hov || 0) > F.plantEps * s * 1.5) S.liftT = 0; else S.liftT = (S.liftT == null ? 9 : S.liftT) + dt;
    if (dzg > 1e-4 * s) S.fly = false;   // coming forward again: the next footfall may hold
    const own = S.liftT < F.ownSteps; if (own && run) ownRun = true;
    if (S.step) {
      const q = S.step; q.T = Math.min(q.T, clamp((glide ? F.glideSwing : 0.7) * cap / Math.max(0.25, sp), F.stepMin, F.stepMaxT));   // he sped up under it: the step keeps up
      q.t += dt; const uu = Math.min(1, q.t / q.T), hu = smooth(0.08, 0.85, uu);   // CE-13o: up first, over while it is up; it comes down where it stays
      S.ex = q.ex0 + (q.ex1 - q.ex0) * hu; S.ez = q.ez0 + (q.ez1 - q.ez0) * hu;
      if (uu >= 0.85) { if (!q.land) q.land = { x: wx + q.ex1, z: wz + q.ez1 }; S.ex = q.land.x - wx; S.ez = q.land.z - wz; }   // over its spot: it comes straight down on the ground, not along with the body
      lift = q.h * Math.pow(Math.sin(Math.PI * uu), F.stepArc);
      S.c = 1; S.e = Math.hypot(S.ex, S.ez); S.grow = false; S.en = 0;
      if (uu >= 1) { S.step = null; S.lock = q.land || { x: wx + S.ex, z: wz + S.ez }; }
      else if (!O.lock && !O.step && q.t > dt * 1.5) { S.step = null; S.lock = { x: wx + S.ex, z: wz + S.ez }; lift = 0; }   // the gait took the other foot off the ground mid-step: this one comes down where it is and holds
    } else if (down) {
      if (!S.lock) S.lock = { x: wx + S.ex, z: wz + S.ez };
      let ex = S.lock.x - wx, ez = S.lock.z - wz, e = Math.hypot(ex, ez);
      const grow = e > S.e + 1e-6; if (grow) S.rate += ((e - S.e) / dt - S.rate) * Math.min(1, dt * 8);
      // how far off, against what the leg can do: fore and aft plantReach of its length, to the side what the hip's sideMax swings it
      const bx0 = (ex * cy - ez * sy) / ms, bz0 = (ex * sy + ez * cy) / ms;
      let en = Math.hypot(((e0[0] * bx0 + e0[2] * bz0) / n0) / (0.9 * Math.sin(F.sideMax) * (A + B * Math.cos(kn))), ((e0[8] * bx0 + e0[10] * bz0) / n2) / (PR * (A + B)));
      const free = !O.step && (O.lock || O.ex == null);
      if (run && own && (en > 1 || S.over)) { S.lock = null; S.fly = true; S.over = false; }   // toe-off into the flight
      else if (free && e > 0.02 * ms && (en > 1 || S.over || (grow && O.grow && en > 0.55 && O.en > 0.55 && en >= O.en))) {
        // a step: to the far side of the gait's own spot, as far as it was behind
        const k = -F.stepAhead / Math.max(1, en);
        const h0 = Math.max(F.stepLift * s, 0.055 / ms), hg = glide ? Math.min(0.15 * (A + B), F.glideArc * e * (1 - k) / ms) : 0;   // the glide's longer step goes higher
        S.step = { t: 0, T: clamp((glide ? F.glideSwing : 0.7) * cap / Math.max(0.25, S.rate, sp), F.stepMin, F.stepMaxT), ex0: ex, ez0: ez, ex1: ex * k, ez1: ez * k, h: Math.max(h0, hg) };
        S.lock = null; S.over = false;
      } else if (en > 1.25) { const g = 1.25 / en; S.lock.x = wx + ex * g; S.lock.z = wz + ez * g; ex *= g; ez *= g; e *= g; en = 1.25; }   // both at their reach at once: it gives, it does not stretch
      S.ex = ex; S.ez = ez; S.grow = grow; S.e = e; S.en = en; S.c = 1;
    } else {
      S.lock = null; S.grow = false; S.over = false; S.en = 0;
      if (S.c > 0) { const c2 = Math.max(0, S.c - dt / F.plantOut), kf = c2 / S.c; S.ex *= kf; S.ez *= kf; S.c = c2; } else { S.ex = S.ez = 0; }
      S.e = Math.hypot(S.ex, S.ez);
    }
    // a foot going forward along the ground while the other holds: clear of it
    let wantLift = 0;
    // (CE-13o: only a foot the GAIT carries forward, dzg > 0; a foot the body carries (a glide: the legs still) comes down and holds:
    // lifted, it could neither hold nor let the other step: one foot hovered while the other was dragged at its stop)
    if (!S.lock && !S.step && walking && calm && (O.lock || O.step) && low < F.swingClear / ms && S.pwx != null && dzg > 1e-4 * s) {   // (in a flight the whole body is up instead)
      const v = Math.hypot(wx + S.ex - S.pwx, wz + S.ez - S.pwz) / dt; if (v > F.swingSpeed) wantLift = F.swingClear / ms - Math.max(0, low);
    }
    if (S.fly && low < F.flightClear / ms) wantLift = Math.max(wantLift, F.flightClear / ms - Math.max(0, low));   // pushed off: clear of the ground at once (the body's flight follows)
    if (S.fly) S.lift = wantLift; else S.lift += (wantLift - S.lift) * (1 - Math.exp(-F.liftRate * dt)); if (S.lift < 1e-4) S.lift = 0;
    lift += S.lift;
    S.pwx = wx + S.ex; S.pwz = wz + S.ez;
    // the world's error into the body's space, then along the hips' axes: forward and up in the leg's plane, and sideways
    const bx = (S.ex * cy - S.ez * sy) / ms, bz = (S.ex * sy + S.ez * cy) / ms, G = _tg[i];
    G.on = Math.abs(S.ex) + Math.abs(S.ez) + lift >= 1e-5; G.A = A; G.B = B; G.a = a; G.kn = kn;
    G.dz = (e0[8] * bx + e0[10] * bz) / n2; G.dy = (e0[4] * bx + e0[6] * bz) / n1 + lift * (e0[5] / n1); G.dx = (e0[0] * bx + e0[2] * bz) / n0;
    G.ry = -(A * Math.cos(a) + B * Math.cos(a + kn)); G.rz = -(A * Math.sin(a) + B * Math.sin(a + kn));
    // a leg turned on its length (the toes to the travel) swings out along its own turned side: what that carries fore and aft goes back into the plane
    G.cy = Math.max(0.6, Math.cos(leg.rotation.y)); G.ty = Math.tan(clamp(leg.rotation.y, -0.9, 0.9)) * Math.cos(a); G.dz += G.dx * G.ty; G.ax0 = ankle.rotation.x;
    // a plant further off than the straight leg: the hips come down for it (a stride's dip), both feet staying where they are
    if (G.on) { const R = (A + B) * F.legStraight, ty = G.ry + G.dy, tz = G.rz + G.dz; if (Math.abs(tz) < R) drop = Math.max(drop, -ty - Math.sqrt(R * R - tz * tz)); }
  }
  let any = false;
  for (let i = 0; i < 2; i++) { if (live(i) && _tg[i].on) any = true; }
  if (!any) { for (let i = 0; i < 2; i++) { const leg = live(i); if (leg) setSide(leg, leg.userData.shamblerAnkle, st[i], 0); } st.ownRun = ownRun; return; }
  const legLen = _tg[0].A + _tg[0].B || _tg[1].A + _tg[1].B;
  drop = clamp(drop, 0, F.hipDrop * legLen);
  if (drop > 1e-5) hips.position.y -= drop;
  const solve = (i, again) => {
    const leg = live(i); if (!leg) return;
    const S = st[i], G = _tg[i], ankle = leg.userData.shamblerAnkle, shin = leg.userData.shinG, A = G.A, B = G.B, a = G.a, kn = G.kn;
    if (!G.on && drop <= 1e-5) { setSide(leg, ankle, S, 0); return; }
    // the knee bends one way and the hip stops at its extension: past either, the leg does what it can and the foot steps
    const at = (f) => legSolve(G.ry + drop + G.dy * f, G.rz + G.dz * f, A, B);
    const bad = (q) => q.knee < 0 || (q.thigh > F.hipExt && q.thigh > a);
    let f = 1, p = at(1);
    if (bad(p)) { let lo = 0, hi = 1; for (let it = 0; it < 7; it++) { const mid = (lo + hi) / 2; if (bad(at(mid))) hi = mid; else lo = mid; } f = lo; p = at(f);
      if (S.lock && !again) { S.over = true; S.lock.x -= S.ex * (1 - f); S.lock.z -= S.ez * (1 - f); S.ex *= f; S.ez *= f; } }
    let side = G.dx * f / (Math.max(0.1, A + B * Math.cos(kn)) * G.cy);
    if (Math.abs(side) > F.sideMax) { const k2 = F.sideMax / Math.abs(side); side *= k2; if (S.lock && !again) { S.over = true; S.lock.x -= S.ex * (1 - k2); S.lock.z -= S.ez * (1 - k2); S.ex *= k2; S.ez *= k2; } }   // the hip is out as far as it goes: the foot steps
    setSide(leg, ankle, S, side);
    leg.rotation.x = p.thigh; shin.rotation.x = p.knee;
    ankle.rotation.x = G.ax0 - ((p.thigh - a) + (p.knee - kn));   // the sole keeps its turn on the ground
    clampAnkle(ankle, i, (ZFEET.kinds[z.typeKey] || {}).ankleMin || F.ankleMin, F, z.mesh);
  };
  for (let i = 0; i < 2; i++) solve(i, false);
  // a held foot is put where it holds, not near it: what the solve left over (the hip's swing lifts and carries the foot a
  // little, the other leg's step moves the hips) is read back off the bones once and taken out
  for (let i = 0; i < 2; i++) {
    const leg = live(i), S = st[i], G = _tg[i]; if (!leg || !S.lock || !G.on || S.over) continue;
    footLow(z, leg, leg.userData.shamblerAnkle, _pa[i]);
    const rx = S.lock.x - (m.position.x + (_pa[i].x * cy + _pa[i].z * sy) * ms), rz = S.lock.z - (m.position.z + (-_pa[i].x * sy + _pa[i].z * cy) * ms), r = Math.hypot(rx, rz);
    if (r < 0.002 * ms || r > 0.1 * ms) continue;
    const bx = (rx * cy - rz * sy) / ms, bz = (rx * sy + rz * cy) / ms, ddx = (e0[0] * bx + e0[2] * bz) / n0;
    G.dx += ddx; G.dz += (e0[8] * bx + e0[10] * bz) / n2 + ddx * G.ty;
    solve(i, true);
  }
  st.ownRun = ownRun;
  // a run with nobody holding the ground is in its flight: the feet stay as they were tucked (never under the ground); otherwise the lower sole is on it
  if (ownRun && !st[0].lock && !st[0].step && !st[1].lock && !st[1].step) { let lo = Infinity; for (let i = 0; i < 2; i++) { const leg = live(i); if (leg) lo = Math.min(lo, footLow(z, leg, leg.userData.shamblerAnkle, null)); } if (lo < 0) hips.position.y -= lo; }
  else hipPass(false);
}
const _tg = [{}, {}];
// the hip out or in for a plant that is off to the side (the foot swings about the leg's own z by what is asked over the
// leg's drop); the ankle rolls back so the sole stays flat. Added on top of whatever the pose left there, taken off first.
function setSide(leg, ankle, S, side) {
  const r = leg.rotation, base = r.z === S.zLeft ? r.z - (S.zAdd || 0) : r.z; r.z = base + side; S.zLeft = r.z; S.zAdd = side;
  const q = ankle.rotation, b2 = q.z === S.azLeft ? q.z + (S.azAdd || 0) : q.z; q.z = b2 - side; S.azLeft = q.z; S.azAdd = side;
}

// --- The weight of a start, a stop and a turn -------------------------------------------------------------------
// Every body leans into its own acceleration: in on a start, back on a stop, into a turn (the centripetal pull).
// The velocity is read off the body's position and smoothed first, so the horde's shoving (a few centimetres a
// frame) does not jitter the chest. Laid on after every per-kind pose; kinds with a bank of their own (the feral,
// the leaper) get the forward part only.
export const ZLEAN = { on: true, perAccel: 0.012, max: 0.12, side: 0.6, rate: 5, velRate: 9, dip: 0.08 };
export function applyZombieLean(z, dt) {
  if (!ZLEAN.on || !z.alive || z.farLod || dt <= 0) return;
  const u = z.mesh.userData, torso = u.torso; if (!torso) return;
  z._zfDt = dt;   // J159: the frame's step for the plant's fade (applyZombieFeet is given none)
  const p = z.mesh.position;
  const L = z._lean || (z._lean = { x: p.x, z: p.z, vx: 0, vz: 0, fwd: 0, side: 0, fresh: true });
  const dx = p.x - L.x, dz = p.z - L.z; L.x = p.x; L.z = p.z;
  if (L.fresh || Math.hypot(dx, dz) > 2.5 * dt + 0.5) { L.fresh = false; L.vx = dx / dt; L.vz = dz / dt; L.fwd = L.side = 0; return; }   // a teleport, a spawn
  const vx = dx / dt, vz = dz / dt, kv = 1 - Math.exp(-ZLEAN.velRate * dt);
  const ax = (vx - L.vx) * kv / dt, az = (vz - L.vz) * kv / dt;   // the smoothed velocity's change this frame
  L.vx += (vx - L.vx) * kv; L.vz += (vz - L.vz) * kv;
  const yaw = z.mesh.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const K = ZFEET.kinds[z.typeKey], ownBank = z.typeKey === 'feral' || z.typeKey === 'leaper' || z.typeKey === 'spider';
  const fwd = Math.max(-ZLEAN.max, Math.min(ZLEAN.max, (ax * fx + az * fz) * ZLEAN.perAccel));
  const side = ownBank ? 0 : Math.max(-ZLEAN.max, Math.min(ZLEAN.max, (ax * rx + az * rz) * ZLEAN.perAccel * ZLEAN.side));
  const k = 1 - Math.exp(-ZLEAN.rate * dt);
  L.fwd += (fwd - L.fwd) * k; L.side += (side - L.side) * k;
  torso.rotation.x += L.fwd;
  torso.rotation.z -= L.side;   // a lean toward +x is a negative roll
  if (u.hips) u.hips.position.y -= Math.abs(L.fwd) * ZLEAN.dip;
  if (u.head && !(z.partsLost && z.partsLost.head)) u.head.rotation.x -= L.fwd * 0.5;
}

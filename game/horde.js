// GB-94 (P-79, Jerry 2026-10-05): the horde's manners. Jerry: "zombies tend to walk at the same speed and single-file
// walk after you. I would like them to bunch up in bigger hordes around the player, have a higher degree of
// intelligence and attack at varying speeds." Bigger hordes means denser clumping, not more bodies: the horde sizes,
// the 48 cap and the fog cull are untouched. Pure (no three.js, no DOM): index.html rolls each body's traits here once
// and asks where to walk; the timers live on the zombie.
//
//   profileOf(typeKey)                 what this type takes part in (null: none of it; bosses, the spider)
//   rollPace(typeKey, u1, u2[, night]) { mul, band }: its own pace inside its type (shamble, jog, sprint)
//   sprintShare(night)                 the sprinters' share that night (3% on night 1 up to 19% on night 20)
//   rollReact(typeKey, u)              'duck' | 'stagger' | null: how it takes a hit
//   rollWit(typeKey, u)                0..1: how far ahead of him it reads (the cut-off)
//   pickSlot(bearing, loads)           which of the SLOTS angles round him it comes in on
//   slotAngle(i)
//   leadOffset(vx, vz, dist, spd, wit[, out])   where he'll be, as an offset from where he is
//   approachPoint(px, pz, zx, zz, ang, lx, lz[, out])   the point it walks at: swung out to its slot, closing as it nears
//   wanderAngle(bearing, slotAng)      (test helper) the signed gap between two angles, -PI..PI
//   GB-135 (D-77): speedFor(typeKey, pacedSpeed, pace, run)   { speed, cap }: faster, up to 90% of his sprint; sprinters past it
//                  nextRole(typeKey, acc)                     'mass' (70%) or 'flank' (30%), an even quota
//                  massBearing(sumCos, sumSin, n)             the mass's bearing from him, or null
//                  roleSlot(role, bearing, massAng, loads)    the mass's front or a flank; else pickSlot
//                  refillReady(fieldN, cap, heldS)            a full field refills in a clump
//
// Numbers (HORDE): 12 slots, each body picks the emptiest within 80 degrees of where it already is, and looks again
// every 3 s. The swing-out radius is 0.85 of its distance past 2.5 m, at most 12 m; inside 4.5 m it is the flow field
// to him as before. Paces: a crowd type rolls shamble 0.78-0.92 (40%), jog 0.98-1.14 (48%) or sprint 1.28-1.45
// (12%) of its type's speed (mean about 1.01); ferals sprint only to 1.28, heavies 0.94-1.06; bosses and the spider 1.

export const HORDE = Object.freeze({
  SLOTS: 12, SLOT_SWING: 80 * Math.PI / 180, SLOT_RETHINK_S: 3,
  SLOT_R_FROM: 2.5, SLOT_R_K: 0.85, SLOT_R_MAX: 12, CLOSE: 4.5,
  OPEN_DOT: 0.5, OPEN_RETHINK_S: 0.25, OPEN_BUILD_R: 3,
  LEAD_MAX_S: 1.0, LEAD_MAX_M: 6, VEL_MAX: 14,
  MUSTER_IN: 7, MUSTER_OUT: 14, MUSTER_N: 4, MUSTER_COMING_R: 30, STALK_MUL: 0.6, STALK_MAX_S: 1.4, MUSTER_RESET: 20,
  RUSH_S: 1.3, RUSH_MUL: 1.3, RUSH_CD_S: 7,
  LUNGE_IN: 1.6, LUNGE_OUT: 4.2, LUNGE_S: 0.35, LUNGE_MUL: 1.75, LUNGE_CD: [2.2, 4.0],
  RECOIL_S: 0.45, RECOIL_MUL: 0.55, RECOIL_BACK: 0.35, RECOIL_CD: [2.5, 3.5], RECOIL_MIN_D: 3,
  // GB-94 follow-up (Jerry 8:27 PM): sprinters rare on night 1 (3%), more common each night, 19% from night 20; and only
  // 28% of the bodies that react to a hit duck aside: the rest take a stagger (0.3x pace and a shove back along the
  // shot for 0.4 s, at most once every 0.9 s, so a stream of fire slows it without pinning it).
  SPRINT_N1: 0.03, SPRINT_N20: 0.19, DUCK_SHARE: 0.28,
  STAGGER_S: 0.4, STAGGER_MUL: 0.3, STAGGER_PUSH: 2.5, STAGGER_CD: 0.9,
  SPACE: 1.2, SPACE_W: 0.6, SPACE_FREE_D: 3.5,
  // GB-135 (D-77, Jerry 2026-10-06): faster on average, up to 90% of his sprint; sprinters outrun his sprint; 70% close
  // in together and 30% flank; and a full field refills 14 at a time, not one body a death.
  FAST: 1.6, CAP_RUN: 0.9, SPRINT_RUN: [1.04, 1.12],
  MASS_SHARE: 0.7, MASS_SPREAD: 35 * Math.PI / 180, MASS_R: 40, MASS_MIN_N: 3,
  FLANK_MIN: 80 * Math.PI / 180, FLANK_MAX: 125 * Math.PI / 180, FLANK_REACH: 150 * Math.PI / 180,
  FRONT_REPICK: 30 * Math.PI / 180, REFILL_N: 14, REFILL_MAX_S: 10,
});

const BANDS = Object.freeze({ shamble: [0.78, 0.92], jog: [0.98, 1.14], sprint: [1.28, 1.45] });
// Pace kinds: weights over shamble/jog/sprint, or a flat narrow spread [lo, hi], or 1.
const PACE = Object.freeze({
  crowd: { w: [0.40, 0.48, 0.12], bands: BANDS },
  feral: { w: [0.40, 0.48, 0.12], bands: { shamble: [0.82, 0.94], jog: [0.98, 1.10], sprint: [1.18, 1.28] } },
  narrow: { flat: [0.88, 1.14] },
  heavy: { flat: [0.94, 1.06] },
  none: null,
});
// slot: comes in on its own angle (types whose tactics already steer, flank and weave, and the spit band, keep theirs).
// lunge: a burst in the last few metres. recoil: reacts to a hit (rollReact: ducks aside or staggers). muster: waits
// for company, then rushes.
const PROFILE = Object.freeze({
  shambler: { pace: 'crowd', wit: [0.15, 0.55], slot: true, lunge: true, recoil: true, muster: true },
  drowned: { pace: 'crowd', wit: [0.1, 0.4], slot: true, lunge: true, recoil: true, muster: true },
  feral: { pace: 'feral', wit: [0.6, 1], slot: true, lunge: true, recoil: true, muster: true },
  military: { pace: 'crowd', wit: [0.7, 1], slot: true, lunge: true, recoil: true, muster: true },
  screamer: { pace: 'crowd', wit: [0.3, 0.6], slot: true, lunge: false, recoil: true, muster: false },
  leaper: { pace: 'narrow', wit: [0.4, 0.8], slot: true, lunge: false, recoil: true, muster: true },
  spitter: { pace: 'narrow', wit: [0.2, 0.5], slot: true, lunge: false, recoil: true, muster: false },
  bomber: { pace: 'narrow', wit: [0.5, 0.9], slot: true, lunge: false, recoil: false, muster: false },
  brute: { pace: 'heavy', wit: [0.1, 0.3], slot: true, lunge: false, recoil: false, muster: true },
  demon: { pace: 'heavy', wit: [0.3, 0.6], slot: true, lunge: false, recoil: false, muster: false },
});
// Tactics that have their own steering: no slot for them (the type may still roll a pace and lunge).
export const OWN_STEER = Object.freeze(['flank', 'weave', 'spit', 'smash', 'boss']);

export function profileOf(typeKey) { return PROFILE[typeKey] || null; }

const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);

// The sprinters' share on a night: 3% on night 1, a straight ramp to 19% on night 20, and 19% after.
export function sprintShare(night) {
  const n = Number.isFinite(night) ? night : 1;
  return lerp(HORDE.SPRINT_N1, HORDE.SPRINT_N20, clamp01((n - 1) / 19));
}

// night: the night it walks on (the sprinters' share follows it; shamble and jog split the rest 40:48). Without a
// night, the plain 40/48/12 split.
export function rollPace(typeKey, u1, u2, night) {
  const p = PROFILE[typeKey];
  const k = p ? PACE[p.pace] : null;
  if (!k) return { mul: 1, band: 'fixed', u: 0.5 };
  u1 = clamp01(u1); u2 = clamp01(u2);
  if (k.flat) return { mul: lerp(k.flat[0], k.flat[1], u2), band: 'flat', u: u2 };
  let w0 = k.w[0], w1 = k.w[1];
  if (night != null) { const sp = sprintShare(night), rest = (1 - sp) / (k.w[0] + k.w[1]); w0 = k.w[0] * rest; w1 = k.w[1] * rest; }
  const band = u1 < w0 ? 'shamble' : u1 < w0 + w1 ? 'jog' : 'sprint';
  const r = k.bands[band];
  return { mul: lerp(r[0], r[1], u2), band, u: u2 };   // u: where in its band (GB-135's sprinters use it)
}

// How it takes a hit: 'duck' (aside, 28%), 'stagger' (the rest), or null (the heavies, the bombers, the bosses).
export function rollReact(typeKey, u) {
  const p = PROFILE[typeKey];
  if (!p || !p.recoil) return null;
  return clamp01(u) < HORDE.DUCK_SHARE ? 'duck' : 'stagger';
}

export function rollWit(typeKey, u) {
  const p = PROFILE[typeKey];
  return p ? lerp(p.wit[0], p.wit[1], clamp01(u)) : 0;
}

export function slotAngle(i) { return (i / HORDE.SLOTS) * Math.PI * 2; }

export function wanderAngle(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// bearing: the angle from him to it (atan2(dz, dx)). loads: bodies already on each slot.
export function pickSlot(bearing, loads, swing = HORDE.SLOT_SWING) {
  let best = -1, bestLoad = Infinity, bestGap = Infinity;
  for (let i = 0; i < HORDE.SLOTS; i++) {
    const gap = Math.abs(wanderAngle(slotAngle(i), bearing));
    if (gap > swing + 1e-9) continue;
    const ld = loads ? (loads[i] || 0) : 0;
    if (ld < bestLoad || (ld === bestLoad && gap < bestGap)) { best = i; bestLoad = ld; bestGap = gap; }
  }
  if (best < 0) best = ((Math.round(bearing / (Math.PI * 2) * HORDE.SLOTS) % HORDE.SLOTS) + HORDE.SLOTS) % HORDE.SLOTS;
  return best;
}

// out: an object to write into (the game passes one it keeps, so the walk makes no garbage).
export function leadOffset(vx, vz, dist, spd, wit, out = { x: 0, z: 0 }) {
  out.x = 0; out.z = 0;
  const v = Math.hypot(vx, vz);
  if (!(v > 0.2) || !(wit > 0)) return out;
  const t = Math.min(HORDE.LEAD_MAX_S, dist / Math.max(0.5, spd || 0)) * wit;
  let lx = vx * t, lz = vz * t;
  const L = Math.hypot(lx, lz);
  if (L > HORDE.LEAD_MAX_M) { lx *= HORDE.LEAD_MAX_M / L; lz *= HORDE.LEAD_MAX_M / L; }
  out.x = lx; out.z = lz;
  return out;
}

export function approachPoint(px, pz, zx, zz, ang, lx = 0, lz = 0, out = { x: 0, z: 0, r: 0 }) {
  const ax = px + lx, az = pz + lz;
  const dist = Math.hypot(zx - ax, zz - az);
  const r = Math.max(0, Math.min(HORDE.SLOT_R_MAX, (dist - HORDE.SLOT_R_FROM) * HORDE.SLOT_R_K));
  out.x = ax + Math.cos(ang) * r; out.z = az + Math.sin(ang) * r; out.r = r;
  return out;
}

// GB-135 (D-77, Jerry's playthrough 1): "Zombies need to all be faster on average... reach up to 90% of players speed
// while sprinting. Sprinters need to outpace player on sprint." pacedSpeed: its type speed times its pace roll (m/s);
// run: his sprint (PHYS.run). A sprinter runs 1.04-1.12 of his sprint, whatever its type; everyone else FAST x what it
// walked before, at most CAP_RUN of his sprint. cap: its ceiling while it walks (the game holds rushes under it).
export function speedFor(typeKey, pacedSpeed, pace, run) {
  const s = Math.max(0, +pacedSpeed || 0);
  if (!PROFILE[typeKey] || !(run > 0) || !pace) return { speed: s, cap: Infinity };
  if (pace.band === 'sprint') {
    const v = run * lerp(HORDE.SPRINT_RUN[0], HORDE.SPRINT_RUN[1], clamp01(pace.u != null ? pace.u : 0.5));
    return { speed: v, cap: v };
  }
  const cap = run * HORDE.CAP_RUN;
  return { speed: Math.min(cap, s * HORDE.FAST), cap };
}

// "70% of the zombies need to congregate while the other [30%] attempts to flank the player": an even quota, not a
// roll, so any ten that join hold three flankers. acc carries over from the body before (start at 0). Types without
// a slot (bosses, the spider) take no role.
export function nextRole(typeKey, acc) {
  const a0 = Number.isFinite(acc) ? acc : 0;
  if (!PROFILE[typeKey] || !PROFILE[typeKey].slot) return { role: null, acc: a0 };
  const a = a0 + (1 - HORDE.MASS_SHARE);
  return a >= 1 - 1e-9 ? { role: 'flank', acc: a - 1 } : { role: 'mass', acc: a };
}

// The mass's bearing from him, from the sums of the cos and sin of its bodies' bearings: null with fewer than
// MASS_MIN_N, or when they are spread all round him (no one front).
export function massBearing(sumCos, sumSin, n) {
  if (!(n >= HORDE.MASS_MIN_N)) return null;
  return Math.hypot(sumCos, sumSin) / n > 0.35 ? Math.atan2(sumSin, sumCos) : null;
}

// Its slot. The mass: the emptiest slot on the mass's front (within MASS_SPREAD of the mass's bearing), so it comes in
// together on a front, not single file. A flanker: the emptiest slot 80-125 degrees off the mass's bearing, on a side it
// can reach (within FLANK_REACH of its own bearing). A mass body far off the front (more than SLOT_SWING) is a front of
// its own, and with no mass yet everyone picks as before (pickSlot).
export function roleSlot(role, bearing, massAng, loads) {
  if (massAng == null || !role) return pickSlot(bearing, loads);
  if (role === 'mass' && Math.abs(wanderAngle(bearing, massAng)) > HORDE.SLOT_SWING) return pickSlot(bearing, loads);
  let best = -1, bestLoad = Infinity, bestGap = Infinity;
  for (let i = 0; i < HORDE.SLOTS; i++) {
    const off = Math.abs(wanderAngle(slotAngle(i), massAng));
    const gap = Math.abs(wanderAngle(slotAngle(i), bearing));
    const fits = role === 'mass' ? off <= HORDE.MASS_SPREAD + 1e-9
      : off >= HORDE.FLANK_MIN - 1e-9 && off <= HORDE.FLANK_MAX + 1e-9 && gap <= HORDE.FLANK_REACH + 1e-9;
    if (!fits) continue;
    const ld = loads ? (loads[i] || 0) : 0;
    if (ld < bestLoad || (ld === bestLoad && gap < bestGap)) { best = i; bestLoad = ld; bestGap = gap; }
  }
  return best >= 0 ? best : pickSlot(bearing, loads);
}

// "By day 20 it just felt like a slow boring trickle": with the field at the cap, a death let one more out at once,
// one at a time. Now a full field waits until REFILL_N are down (or REFILL_MAX_S have gone by), then a clump comes.
// GB-135: a body with a role re-thinks its slot at once when the mass first finds its front, or when the front has
// swung more than FRONT_REPICK since it picked (else the flankers keep the slots they took before there was a front).
export function frontMoved(pickedAt, massAng) {
  if (massAng == null) return false;
  return pickedAt == null || Math.abs(wanderAngle(massAng, pickedAt)) > HORDE.FRONT_REPICK;
}

export function refillReady(fieldN, cap, heldS) {
  return fieldN <= cap - HORDE.REFILL_N || heldS >= HORDE.REFILL_MAX_S;
}

// studio/marine-dive.js — CL-193: the shootdodge.
//
// Jerry (2026-10-14): "Rolling with V serves no real purpose. I want to turn those into a multi-direction max Payne
// style slow-mo shooting dive roll. Jumping in every direction in slow mo. The ability to move your character and
// aimpoint mid-air." His calls the same day: everything slows but the aim and the camera; zombie swings and lunges
// miss him while he is in the air, everything else still hurts; on the ground he stays down and keeps shooting until a
// move key or jump (or about 1.5 s); a slow-motion meter that the dive drains and that refills over time and with kills.
//
// Pure state and maths, no three.js, so the feel can be tuned here and tested in node (marine-dive.test.mjs).
// index.html feeds it each frame (game seconds, real seconds, grounded, the move keys) and applies what it says: his
// velocity, the lift against the game's own gravity, the time scale, and the way his body lies.

export const DIVE = Object.freeze({
  speed: 7.6,        // m/s along the dive at take-off (game time)
  lift: 3.5,         // m/s up at take-off
  gravity: 10,       // m/s^2 while he is in the air (the game's own 18 would put him down in a third of a second)
  steer: 6,          // m/s^2 of air control from the move keys
  speedMin: 4.5, speedMax: 9,   // what steering can make of his speed
  tip: 0.16,         // s (game) from upright to flat
  minAir: 0.1,       // s (game) before touching down counts as the landing
  landKeep: 0.45,    // of his speed he keeps on touching down, to slide on
  slideDecel: 12,    // m/s^2: the slide on the ground after the landing
  downMin: 0.3,      // s (real) on the ground before a key gets him up
  downMax: 1.5,      // s (real) before he gets up on his own
  getUp: 0.45, getUpPads: 0.32, // s (game); knee and elbow pads get him up sooner (they did the same for the roll)
  cooldown: 0.4,     // s (real) once he is up, before the next dive
  slow: 0.28,        // the time scale while he flies
  slowIn: 0.08, slowOut: 0.3,   // s (real) into and out of the slow motion
  hold: 0.2,         // s (real) the slow motion holds past the landing
  // The meter (0..1): a dive with it slows time, without it the dive still happens, at full speed.
  meter: Object.freeze({ cost: 0.08, drain: 0.1, regen: 0.04, regenDelay: 1, kill: 0.06, min: 0.15 }),
  hip: 0.7, hipDown: 0.24,      // the body's pivot over his feet, standing and lying flat
  lean: 0.18                    // the head rides this much higher than the feet in the air (the head-axis lift)
});

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (v) => { const u = clamp01(v); return u * u * (3 - 2 * u); };

export function createDive() {
  return { phase: 'idle', t: 0, real: 0, airT: 0, dirX: 0, dirZ: 1, vx: 0, vz: 0, slow: false, w: 0, meter: 1, cd: 0,
    idleT: 99, pads: false, dives: 0, wallT:0, wallX:0, wallZ:0, contact:0 };
}
export const diveBusy = (d) => d.phase !== 'idle';
export const diveAirborne = (d) => d.phase === 'air';
export const canDive = (d) => d.phase === 'idle' && d.cd <= 0;

// Take off along (dirX, dirZ) (world, any length). Returns the upward speed to give him.
// slow: false is a dive with no bullet time and no charge to the meter: Jerry (2026-10-14) wants none in a timed range
// drill, so the dive cannot buy real time on the drill's clock (it runs on the game's slowed time).
export function startDive(d, dirX, dirZ, { pads = false, upwardSpeed = 0, slow = true } = {}) {
  const L = Math.hypot(dirX, dirZ);
  d.dirX = L > 1e-6 ? dirX / L : 0; d.dirZ = L > 1e-6 ? dirZ / L : 1;
  d.vx = d.dirX * DIVE.speed; d.vz = d.dirZ * DIVE.speed;
  d.wallT=0;d.contact=0;
  d.phase = 'air'; d.t = 0; d.real = 0; d.airT = 0; d.pads = !!pads; d.dives++;
  d.slow = slow !== false && d.meter >= DIVE.meter.min;
  if (d.slow) d.meter = Math.max(0, d.meter - DIVE.meter.cost);
  // Preserve a rising jump; at its apex/descent the normal dive lift adds one kick.
  return { vy: Math.max(DIVE.lift, Number.isFinite(upwardSpeed) ? upwardSpeed : 0), slow: d.slow };
}

// Out of it at once (water, death, a cinematic, a new run): back on his feet, the meter kept.
export function endDive(d) {
  d.phase = 'idle'; d.t = 0; d.real = 0; d.vx = d.vz = 0; d.slow = false; d.w = 0; d.cd = 0;
}
export function resetDive(d) { Object.assign(d, createDive()); }
export function diveKill(d) { d.meter = Math.min(1, d.meter + DIVE.meter.kill); }

// One frame. dt: game seconds (already slowed), rdt: real seconds.
// input: { grounded, steerX, steerZ (a unit wish direction, or 0s), wantUp (a move key or jump) }.
// Returns what happened this frame: null, 'land', 'up' (starts getting up) or 'idle' (back on his feet).
export function stepDive(d, dt, rdt, input = {}) {
  let ev = null;
  d.wallT=Math.max(0,(d.wallT||0)-dt);d.contact=Math.max(0,(d.contact||0)-rdt*4);
  if (d.phase === 'air') {
    d.t += dt; d.airT += dt; d.real += rdt;
    const sx = input.steerX || 0, sz = input.steerZ || 0;
    if (sx || sz) { d.vx += sx * DIVE.steer * dt; d.vz += sz * DIVE.steer * dt; }
    if(d.wallT>0){const into=d.vx*d.wallX+d.vz*d.wallZ;if(into<0){d.vx-=into*d.wallX;d.vz-=into*d.wallZ;}}
    let sp = Math.hypot(d.vx, d.vz);
    const want = Math.max(d.wallT>0?0:DIVE.speedMin, Math.min(DIVE.speedMax, sp));
    if (sp > 1e-6 && want !== sp) { d.vx *= want / sp; d.vz *= want / sp; sp = want; }
    if (sp > 1e-6) { d.dirX = d.vx / sp; d.dirZ = d.vz / sp; }   // his body follows the line he is steered onto
    if (input.grounded && d.airT >= DIVE.minAir) { d.phase = 'down'; d.t = 0; d.real = 0; d.vx *= DIVE.landKeep; d.vz *= DIVE.landKeep; ev = 'land'; }
  } else if (d.phase === 'down') {
    d.t += dt; d.real += rdt;
    const sp = Math.hypot(d.vx, d.vz), ns = Math.max(0, sp - DIVE.slideDecel * dt);
    if (sp > 1e-6) { d.vx *= ns / sp; d.vz *= ns / sp; }
    if (d.real >= DIVE.downMax || (d.real >= DIVE.downMin && input.wantUp)) { d.phase = 'up'; d.t = 0; d.vx = d.vz = 0; ev = 'up'; }
  } else if (d.phase === 'up') {
    d.t += dt;
    if (d.t >= (d.pads ? DIVE.getUpPads : DIVE.getUp)) { d.phase = 'idle'; d.t = 0; d.cd = DIVE.cooldown; ev = 'idle'; }
  } else if (d.cd > 0) d.cd = Math.max(0, d.cd - rdt);

  // The slow motion runs on real time: all through the flight and a breath past the landing, while there is meter.
  const on = d.slow && d.meter > 0 && (d.phase === 'air' || (d.phase === 'down' && d.real < DIVE.hold));
  d.w = on ? Math.min(1, d.w + rdt / DIVE.slowIn) : Math.max(0, d.w - rdt / DIVE.slowOut);
  if (d.w > 0) {
    d.idleT = 0;
    if (on) { d.meter = Math.max(0, d.meter - DIVE.meter.drain * rdt); if (d.meter <= 0) d.slow = false; }
  } else {
    d.idleT += rdt;
    if (d.idleT >= DIVE.meter.regenDelay) d.meter = Math.min(1, d.meter + DIVE.meter.regen * rdt);
  }
  return ev;
}

// The game's time scale this frame (1 = normal).
export function diveTimeScale(d) { return 1 + (DIVE.slow - 1) * smooth(d.w); }

// How flat he lies (0 upright .. 1 flat) and his hips' height over his feet. vy: his vertical speed; on the way down
// the body is lowered with the fall, so it meets the ground as his feet would.
export function diveLie(d, vy = 0) {
  if (d.phase === 'air') {
    const flat = smooth(d.t / DIVE.tip), fall = vy < 0 ? smooth(-vy / DIVE.lift) : 0;
    return { flat, hip: DIVE.hip + (DIVE.hipDown - DIVE.hip) * fall * flat, lean: DIVE.lean };
  }
  if (d.phase === 'down') return { flat: 1, hip: DIVE.hipDown, lean: 0 };
  if (d.phase === 'up') {
    const u = smooth((d.t / (d.pads ? DIVE.getUpPads : DIVE.getUp)-.18)/.82);
    return { flat: 1 - u, hip: DIVE.hipDown + (DIVE.hip - DIVE.hipDown) * u, lean: 0 };
  }
  return { flat: 0, hip: DIVE.hip, lean: 0 };
}

// The lie of his body: the head (his rig's +Y) along the dive, the chest (+Z) turned toward the aim as far as a body
// lying that way can turn it; where the aim runs along the body, belly down if it is ahead of his head and on his back
// if it is past his feet (the backward dive, shooting between his boots). World vectors in; out.u (head) and out.f
// (chest), unit and perpendicular. His right (+X) is u x f.
export function diveBasis(dirX, dirZ, aimX, aimY, aimZ, lean = DIVE.lean, out = {}) {
  let ux = dirX, uy = lean, uz = dirZ;
  let L = Math.hypot(ux, uy, uz) || 1; ux /= L; uy /= L; uz /= L;
  let ax = aimX, ay = aimY, az = aimZ;
  L = Math.hypot(ax, ay, az);
  if (L < 1e-6) { ax = 0; ay = 0; az = 1; L = 1; }
  ax /= L; ay /= L; az /= L;
  const along = ax * ux + ay * uy + az * uz;
  // World up, square to the head axis: the chest's direction when he lies on his back.
  let px = -uy * ux, py = 1 - uy * uy, pz = -uy * uz;
  L = Math.hypot(px, py, pz) || 1; px /= L; py /= L; pz /= L;
  const s = along > 0 ? -1 : 1, k = Math.abs(along) * 0.9;
  let fx = ax - along * ux + s * px * k, fy = ay - along * uy + s * py * k, fz = az - along * uz + s * pz * k;
  // Keep it square to the head axis (the blend above already is, up to rounding), then unit.
  const back = fx * ux + fy * uy + fz * uz; fx -= back * ux; fy -= back * uy; fz -= back * uz;
  L = Math.hypot(fx, fy, fz);
  if (L < 1e-6) { fx = s * px; fy = s * py; fz = s * pz; L = 1; }
  out.u = { x: ux, y: uy, z: uz };
  out.f = { x: fx / L, y: fy / L, z: fz / L };
  return out;
}

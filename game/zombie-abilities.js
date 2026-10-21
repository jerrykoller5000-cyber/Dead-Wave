// GP-179: attack timing and collision math shared by the three new zombie abilities.
// The legacy combat loop owns meshes, obstruction queries and damage application.
export const ABILITY_CONFIG = Object.freeze({
  demon: Object.freeze({ minDistance: 17, maxDistance: 34, windup: .85, recovery: .45, initialMin: 2, initialMax: 5, cooldownMin: 5.5, cooldownMax: 8.5, castSpacing: 1.2 }),
  colossus: Object.freeze({ minDistance: 7, maxDistance: 38, windup: 1.65, recovery: .85, initialMin: 4, initialMax: 8, cooldownMin: 8, cooldownMax: 12 }),
  spitter: Object.freeze({ spacing: .75, life: 6, radius: .65, teleportDistance: 6, maxSamples: 8, maxActive: 96 })
});

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const timeStep = dt => Number.isFinite(dt) && dt > 0 ? dt : 0;
const finitePoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
const roll = (lo, hi, random) => {
  const n = random();
  return lo + (hi - lo) * (Number.isFinite(n) ? clamp(n, 0, 1) : .5);
};
function configFor(kind) {
  if (kind !== 'demon' && kind !== 'colossus') throw new RangeError('Unknown ranged zombie ability: ' + kind);
  return ABILITY_CONFIG[kind];
}

export function createRangedAbility(kind, random = Math.random) {
  const c = configFor(kind);
  return { kind, stage: 'cooldown', remaining: roll(c.initialMin, c.initialMax, random), elapsed: 0, shots: 0 };
}

// A wind-up commits its aim in the caller's `started` branch. Range only gates
// starting: walking a step across the range boundary cannot erase a visible tell.
// Loss of action permission or sight cancels once and applies a fresh cooldown.
// At most one shot is emitted by a call, even after a long background-frame gap.
export function stepRangedAbility(s, dt, { distance = Infinity, canAct = true, hasLine = true, blocked = false } = {}, random = Math.random) {
  const c = configFor(s.kind);
  const out = { started: false, fired: false, cancelled: false };
  let left = timeStep(dt);
  const allowed = canAct && hasLine && !blocked;
  if (s.stage === 'windup' && !allowed) {
    s.stage = 'cooldown'; s.elapsed = 0;
    s.remaining = roll(c.cooldownMin, c.cooldownMax, random);
    out.cancelled = true;
    left = 0;
  }
  if (s.stage === 'cooldown') {
    const spent = Math.min(left, Math.max(0, s.remaining));
    s.remaining = Math.max(0, s.remaining - spent);
    left -= spent;
    if (allowed && distance >= c.minDistance && distance <= c.maxDistance && s.remaining === 0) {
      s.stage = 'windup'; s.remaining = c.windup; s.elapsed = 0;
      out.started = true;
    }
  }
  if (s.stage === 'windup') {
    const spent = Math.min(left, s.remaining);
    s.elapsed += spent; s.remaining = Math.max(0, s.remaining - spent); left -= spent;
    if (s.remaining <= 1e-9) {
      out.fired = true; s.shots++;
      s.stage = 'recovery'; s.elapsed = 0; s.remaining = c.recovery;
    }
  }
  if (s.stage === 'recovery') {
    const spent = Math.min(left, s.remaining);
    s.elapsed += spent; s.remaining = Math.max(0, s.remaining - spent);
    if (s.remaining <= 1e-9) {
      s.stage = 'cooldown'; s.elapsed = 0;
      s.remaining = roll(c.cooldownMin, c.cooldownMax, random);
      // Discard any extra frame time instead of cycling through several attacks.
    }
  }
  out.stage = s.stage; out.elapsed = s.elapsed; out.remaining = s.remaining;
  out.progress = s.stage === 'windup' ? clamp(s.elapsed / c.windup, 0, 1) : s.stage === 'recovery' ? clamp(s.elapsed / c.recovery, 0, 1) : 0;
  return out;
}

export function createAcidTrail(position = null) {
  return { last: finitePoint(position) ? { x: position.x, y: position.y, z: position.z } : null, carry: 0 };
}

// Sample distance travelled, rather than one puddle per frame. This follows
// corners at any frame rate and rejects spawn/teleport jumps across the arena.
export function sampleAcidTrail(s, position, options = {}) {
  const c = ABILITY_CONFIG.spitter;
  const spacing = options.spacing ?? c.spacing;
  const teleportDistance = options.teleportDistance ?? c.teleportDistance;
  const maxSamples = options.maxSamples ?? c.maxSamples;
  if (!(spacing > 0) || !Number.isFinite(spacing) || !(teleportDistance > 0) || !Number.isFinite(teleportDistance) || !Number.isInteger(maxSamples) || maxSamples < 1) throw new RangeError('Invalid acid trail sampling options');
  if (!finitePoint(position)) { s.last = null; s.carry = 0; return []; }
  const from = s.last;
  s.last = { x: position.x, y: position.y, z: position.z };
  if (!finitePoint(from)) { s.carry = 0; return []; }
  const dx = position.x - from.x, dy = position.y - from.y, dz = position.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance > teleportDistance || Math.abs(dy) > 3) { s.carry = 0; return []; }
  if (distance <= 1e-9) return [];
  const carry = Number.isFinite(s.carry) ? clamp(s.carry, 0, spacing) : 0;
  const points = [];
  let along = spacing - carry;
  for (; along <= distance + 1e-9 && points.length < maxSamples; along += spacing) {
    const u = clamp(along / distance, 0, 1);
    points.push({ x: from.x + dx * u, y: from.y + dy * u, z: from.z + dz * u });
  }
  s.carry = points.length === maxSamples && along <= distance ? 0 : Math.max(0, (carry + distance) - points.length * spacing);
  return points;
}

// Constant-gravity integration is exact across frame sizes. The caller can sweep
// from the old to the returned position before committing a projectile mesh.
export function solveBallisticLaunch(origin, target, flightTime, gravity = 16) {
  if (!finitePoint(origin) || !finitePoint(target) || !(flightTime > 0) || !Number.isFinite(flightTime) || !Number.isFinite(gravity) || gravity < 0) throw new RangeError('Invalid ballistic launch');
  return { vx: (target.x - origin.x) / flightTime, vy: (target.y - origin.y) / flightTime + .5 * gravity * flightTime, vz: (target.z - origin.z) / flightTime };
}

export function stepBallistic(projectile, dt, gravity = 16) {
  const t = timeStep(dt);
  if (!finitePoint(projectile) || !Number.isFinite(projectile.vx) || !Number.isFinite(projectile.vy) || !Number.isFinite(projectile.vz) || !Number.isFinite(gravity) || gravity < 0) throw new RangeError('Invalid ballistic projectile');
  projectile.x += projectile.vx * t;
  projectile.y += projectile.vy * t - .5 * gravity * t * t;
  projectile.z += projectile.vz * t;
  projectile.vy -= gravity * t;
  projectile.age = (Number.isFinite(projectile.age) ? projectile.age : 0) + t;
  return projectile;
}

// Returns the first hit fraction (0..1), so a wall can win over a player behind
// it. Passing the sum of projectile and target radii prevents fast tunnelling.
export function sweptSphereHit(start, end, center, radius) {
  if (!finitePoint(start) || !finitePoint(end) || !finitePoint(center) || !Number.isFinite(radius) || radius < 0) return null;
  const ox = start.x - center.x, oy = start.y - center.y, oz = start.z - center.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  if (c <= 0) return 0;
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const a = dx * dx + dy * dy + dz * dz;
  if (a <= 1e-18) return null;
  const b = ox * dx + oy * dy + oz * dz;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const hit = (-b - Math.sqrt(discriminant)) / a;
  return hit >= 0 && hit <= 1 ? hit : null;
}

// Raw contact damage is 80% maximum health. The caller applies the existing
// armour, streak resistance, dodge, invulnerability and death handling.
export function colossusImpactDamage(maxHP) {
  return Number.isFinite(maxHP) && maxHP > 0 ? maxHP * .8 : 0;
}

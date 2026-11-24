// game/survivor-behavior.js — AI-1 (Antigravity 3, Jerry direct):
// Role-specific roof combat AI, smart target priority, reload cycles, Okafor's combat
// field-dressing toss, and Pike's overnight dawn field-maintenance.
// Preserves all existing invariants:
//   - t149: regenCapFrac() untouched (0.4), PIKE_REPAIR_MUL untouched (0.75)
//   - t156: Brandt M240B outpaces M4s, roofLineClear obeyed, Okafor daily roof heal unchanged

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const SURVIVOR_WEAPON_CFG = Object.freeze({
  brandt: {
    dmg: 14, gap: 0.12, burst: 4, rest: 1.4, spread: 0.02, color: 0xffc070,
    magSize: 40, reloadS: 2.3, sound: 'm240', tracerSpeed: 96
  },
  okafor: {
    dmg: 19, gap: 0.85, burst: 1, rest: 0, spread: 0.011, color: 0xffe0a0,
    magSize: 30, reloadS: 1.65, sound: 'rifle', tracerSpeed: 92
  },
  pike: {
    dmg: 19, gap: 0.85, burst: 1, rest: 0, spread: 0.011, color: 0xffe0a0,
    magSize: 30, reloadS: 1.65, sound: 'rifle', tracerSpeed: 92
  }
});

const HEAVY_TYPES = new Set(['brute', 'colossus', 'guardian', 'caveguard', 'demon', 'bomber']);
const THREAT_TYPES = new Set(['spitter', 'feral', 'leaper', 'screamer', 'bomber']);

/**
 * Role-differentiated roof target selection.
 * - Brandt (M240B): favors heavies/bosses/bombers & dense zombie clusters.
 * - Okafor (Medic): bodyguard overwatch — favors threats closing in on the player & Spitters/Ferals.
 * - Pike (Engineer): fortification defender — favors zombies attacking or near player structures & Bombers.
 * All candidates must pass `lineClear(ox, oy, oz, tx, ty, tz)`.
 */
export function pickRoofTarget(who, ox, oy, oz, ctx) {
  const { zombies, hqPos, hqHeight, fireRadius, lineClear, playerPos, builds } = ctx;
  if (!Array.isArray(zombies) || !zombies.length || !hqPos) return null;

  const cx = hqPos.x, cz = hqPos.z, gy = hqPos.y;
  const cands = [];
  for (let i = 0; i < zombies.length; i++) {
    const z = zombies[i];
    if (!z || !z.alive || z.dying || !z.mesh) continue;
    const p = z.mesh.position;
    if (p.y < gy - 8 || p.y > gy + hqHeight) continue;
    const dHq = Math.hypot(p.x - cx, p.z - cz);
    if (dHq > fireRadius) continue;
    const dPost = Math.hypot(p.x - ox, p.z - oz);

    // Higher score = higher priority
    let score = 30 - dPost;
    const zType = z.type || z.kind || '';

    if (who === 'brandt') {
      if (HEAVY_TYPES.has(zType)) score += 18;
      if (zType === 'guardian' || zType === 'colossus' || zType === 'demon') score += 10;
      // Cluster bonus: reward suppressing tight groups of dead
      let mates = 0;
      for (let j = 0; j < zombies.length && mates < 4; j++) {
        if (i === j) continue;
        const o = zombies[j];
        if (o && o.alive && o.mesh && Math.hypot(o.mesh.position.x - p.x, o.mesh.position.z - p.z) < 3.6) mates++;
      }
      score += mates * 3.5;
    } else if (who === 'okafor') {
      if (playerPos) {
        const dPlayer = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
        if (dPlayer < 10) score += (10 - dPlayer) * 2.6;
      }
      if (THREAT_TYPES.has(zType)) score += 10;
    } else if (who === 'pike') {
      if (zType === 'bomber') score += 20;
      if (z.target && typeof z.target.hp === 'number' && z.target.maxHp) score += 18;
      else if (Array.isArray(builds) && builds.length) {
        for (let bIdx = 0; bIdx < builds.length; bIdx++) {
          const b = builds[bIdx];
          if (!b || b.hp <= 0) continue;
          if (Math.hypot(b.x - p.x, b.z - p.z) < 3.2) { score += 11; break; }
        }
      }
    }

    cands.push({ z, score, dPost });
  }

  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);

  const checkCap = Math.min(cands.length, 10);
  for (let i = 0; i < checkCap; i++) {
    const z = cands[i].z;
    const p = z.mesh.position;
    const ty = p.y + (z.hitH || 1.45) * 0.55;
    if (lineClear(ox, oy, oz, p.x, ty, p.z)) return z;
  }
  return null;
}

/**
 * Determine whether a zombie warrants a subtle tactical threat callout.
 */
export function threatCalloutKind(z) {
  const t = z && (z.type || z.kind || '');
  if (t === 'bomber') return 'bomber';
  if (t === 'brute' || t === 'colossus' || t === 'guardian' || t === 'caveguard' || t === 'demon') return 'boss';
  return null;
}

/**
 * Compute landing spot for Okafor's emergency combat field-dressing toss (once per night when
 * player is < 35% HP within 24 m of HQ and not already on the roof).
 * Always places the pouch outside the HQ footprint on dry ground along the player's side!
 */
export function computeMedDropSpot(playerPos, hqPos, hqHalf, sampleHeight, waterDepthAt) {
  if (!playerPos || !hqPos) return null;
  const dx = playerPos.x - hqPos.x;
  const dz = playerPos.z - hqPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 24) return null;

  // Toss partway toward the player, staying 2.4 m clear of the HQ walls and max 10 m from HQ edge
  const minR = hqHalf + 2.4;
  const targetR = clamp(dist * 0.72, minR, hqHalf + 10.0);
  const len = dist > 0.1 ? dist : 1;
  const ux = dist > 0.1 ? dx / len : 0;
  const uz = dist > 0.1 ? dz / len : 1;
  let x = hqPos.x + ux * targetR;
  let z = hqPos.z + uz * targetR;

  // Push outside square HQ footprint cleanly if close to a wall
  if (Math.abs(x - hqPos.x) < hqHalf + 1.8 && Math.abs(z - hqPos.z) < hqHalf + 1.8) {
    if (Math.abs(ux) >= Math.abs(uz)) x = hqPos.x + Math.sign(ux || 1) * (hqHalf + 2.3);
    else z = hqPos.z + Math.sign(uz || 1) * (hqHalf + 2.3);
  }
  if (waterDepthAt && waterDepthAt(x, z) > 0.25) return null;
  const y = sampleHeight ? sampleHeight(x, z) : hqPos.y;
  return { x, y, z };
}

/**
 * Pike's overnight dawn field-maintenance: if Pike is on the roof, he patches up to 20% wear
 * on up to 3 most-damaged player structures within 28 m of HQ each dawn!
 * Does NOT affect `repairCostOf` or `PIKE_REPAIR_MUL` (t149/t156 stay exact).
 */
export function applyPikeDawnMaintenance(builds, hqPos, { maxCount = 3, repairFrac = 0.20, radius = 28 } = {}) {
  if (!Array.isArray(builds) || !builds.length || !hqPos) return { repairedCount: 0, totalHp: 0 };
  const damaged = [];
  for (const b of builds) {
    if (!b || b.alive === false || !(b.hp > 0) || !(b.maxHp > 0) || b.hp >= b.maxHp) continue;
    if (Math.hypot(b.x - hqPos.x, b.z - hqPos.z) > radius) continue;
    damaged.push({ b, frac: b.hp / b.maxHp });
  }
  if (!damaged.length) return { repairedCount: 0, totalHp: 0 };
  damaged.sort((a, b) => a.frac - b.frac);

  let repairedCount = 0;
  let totalHp = 0;
  const n = Math.min(maxCount, damaged.length);
  for (let i = 0; i < n; i++) {
    const b = damaged[i].b;
    const before = b.hp;
    const gain = Math.max(1, Math.round(b.maxHp * repairFrac));
    b.hp = Math.min(b.maxHp, b.hp + gain);
    if (b.hp > before) {
      repairedCount++;
      totalHp += (b.hp - before);
    }
  }
  return { repairedCount, totalHp };
}

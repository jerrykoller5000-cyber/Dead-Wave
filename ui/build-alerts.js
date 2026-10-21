import { projectScoutCave } from './scouting.js';

const COLORS = Object.freeze({ healthy: '#5ad8ff', damaged: '#e2b45a', critical: '#ff755e' });

// Claude approved the CU-50 build-hit event, not flashT or inferred HP changes.
// Stable event IDs select a build; object identity keeps a removed build's pulse off a replacement in its cell.
export function createBuildAttackPulses() {
  const until = new Map(); let runId = null;
  return {
    handle(event, builds = [], nowMs = 0) {
      if (event?.type === 'run-reset') { until.clear(); runId = event.runId; return; }
      if (event?.type !== 'build-hit' || !Number.isFinite(nowMs) ||
          (runId != null && event.runId != null && event.runId !== runId) ||
          !Number.isFinite(event.id) || !Number.isFinite(event.x) || !Number.isFinite(event.z)) return;
      for (const b of builds) if (b.id === event.id) {
        if (event.broke || b.hp <= 0) until.delete(b);
        else until.set(b, nowMs + 800);
      }
    },
    snapshot(builds, nowMs) {
      const alive = new Set(builds);
      for (const [b, end] of until) if (!alive.has(b) || b.hp <= 0 || end <= nowMs) until.delete(b);
      return builds.map(b => ({ id: b.id, x: b.x, z: b.z, hp: b.hp, maxHp: b.maxHp,
        underAttack: until.has(b) }));
    }
  };
}

// Event-driven only: no HP polling and no extra cue inside the existing 40m sound.
export function createFarBuildWarnings() {
  let runId = null, nextAt = -Infinity;
  return {
    handle(event, listener = {}, nowMs = 0) {
      if (event?.type === 'run-reset') { runId = event.runId; nextAt = -Infinity; return null; }
      if (event?.type !== 'build-hit' || !listener.active ||
          (runId != null && event.runId !== runId) ||
          ![event.id, event.x, event.z, event.frac, listener.x, listener.z, listener.yaw, nowMs].every(Number.isFinite) ||
          event.frac < 0 || event.frac > 1 || (!event.broke && event.frac >= .5) || nowMs < nextAt) return null;
      const dx = event.x - listener.x, dz = event.z - listener.z, distance = Math.hypot(dx, dz);
      if (distance <= 40) return null;
      nextAt = nowMs + 2000;
      const pan = Math.max(-.85, Math.min(.85, (-dx * Math.cos(listener.yaw) + dz * Math.sin(listener.yaw)) / distance));
      return { broke: event.broke === true, pan, volume: .45 };
    }
  };
}

// Presentation snapshots only. underAttack must be damage-specific: combat's
// flashT also denotes turret muzzle flashes and is not safe to consume here.
export function buildHealth(build) {
  if (!build || !Number.isFinite(build.hp) || !Number.isFinite(build.maxHp) ||
      build.hp <= 0 || build.maxHp <= 0) return null;
  const fraction = Math.min(1, build.hp / build.maxHp);
  const severity = fraction < .25 ? 'critical' : fraction < .5 ? 'damaged' : 'healthy';
  return { fraction, severity, color: COLORS[severity], underAttack: build.underAttack === true };
}

// toMap is the existing map's visibility/projection function. With no rim
// projection this also serves the full map, where every build has a location.
// Nearby squares are never capped. The rim is reserved for at most three hurt
// builds, ordered by active damage, lowest health fraction, then distance.
export function buildAlertMarkers(builds, { toMap, projection } = {}) {
  if (!Array.isArray(builds) || typeof toMap !== 'function') return [];
  const near = [], far = [];
  for (const build of builds) {
    const health = buildHealth(build);
    if (!health || !Number.isFinite(build.x) || !Number.isFinite(build.z)) continue;
    const local = toMap(build.x, build.z);
    if (local && Number.isFinite(local.x) && Number.isFinite(local.y)) {
      near.push({ ...health, id: build.id, x: local.x, y: local.y, edge: false, angle: 0 });
      continue;
    }
    if (!projection || health.fraction >= 1) continue;
    const point = projectScoutCave(build, projection);
    if (!point) continue;
    // The map's range is authoritative. Force the bearing to the rim even if
    // its pixel radius differs slightly from the map's world-space cutoff.
    const angle = point.angle;
    far.push({ ...health, id: build.id, angle, edge: true,
      x: projection.center + Math.cos(angle) * projection.rim,
      y: projection.center + Math.sin(angle) * projection.rim,
      distance: Math.hypot(build.x - projection.x, build.z - projection.z) });
  }
  far.sort((a, b) => Number(b.underAttack) - Number(a.underAttack) ||
    a.fraction - b.fraction || a.distance - b.distance);
  return near.concat(far.slice(0, 3));
}

// Square markers distinguish defenses from round enemy dots and triangular
// scouting arrows. An attack flashes the outline; health color stays readable.
export function drawBuildAlerts(ctx, markers, { scale = 1, timeMs = 0 } = {}) {
  if (!Number.isFinite(scale) || scale <= 0) return;
  const bright = Math.floor((Number.isFinite(timeMs) ? timeMs : 0) / 160) % 2 === 0;
  for (const marker of markers) {
    const half = (marker.edge ? 4 : 3) * scale;
    ctx.save();
    ctx.translate(marker.x, marker.y);
    if (marker.edge) ctx.rotate(marker.angle);
    ctx.fillStyle = marker.color;
    ctx.strokeStyle = '#101b21';
    ctx.lineWidth = 2 * scale;
    ctx.fillRect(-half, -half, half * 2, half * 2);
    ctx.strokeRect(-half, -half, half * 2, half * 2);
    if (marker.edge) {
      ctx.beginPath(); ctx.moveTo(half, 0); ctx.lineTo(half + 3 * scale, 0);
      ctx.strokeStyle = marker.color; ctx.stroke();
    }
    if (marker.underAttack && bright) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * scale;
      const outer = half + 2 * scale;
      ctx.strokeRect(-outer, -outer, outer * 2, outer * 2);
    }
    ctx.restore();
  }
}

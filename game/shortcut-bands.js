import { makeWallBand, resolveWallBand } from './wall-bands.js';

export const SHORTCUT_CUT_SECONDS = 4;
export const SHORTCUT_GAP_WIDTH = 3;
export const SHORTCUT_NOISE_RADIUS = 40;

// A deadfall is a short wall band, with a single kerf in its middle. Keep the
// cut state on this record so the visual halves and collision use one truth.
export function makeShortcutBand({ id, a, b, heightAt = () => 0, width = 1.4 }) {
  const pts = [{ x: a.x, z: a.z }, { x: b.x, z: b.z }];
  const band = makeWallBand({ pts, width, spacing: 0.55, heightAt, top: 1.35 });
  band.kind = 'shortcut-deadfall';
  band.id = id;
  band.cut = false;
  band.holdSeconds = 0;
  band.heightAt = heightAt;
  band.middle = { x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5 };
  return band;
}

export function shortcutInReach(band, x, z, reach = 3) {
  return !band.cut && Math.hypot(x - band.middle.x, z - band.middle.z) <= reach;
}

export function nearestShortcut(bands, x, z, reach = 3) {
  let best = null, bestD = reach;
  for (const band of bands) {
    if (band.cut) continue;
    const d = Math.hypot(x - band.middle.x, z - band.middle.z);
    if (d < bestD) { best = band; bestD = d; }
  }
  return best;
}

// Returns old and new circles so the caller can replace the *same* worldSolid
// references used by player collision, build clearance and the valley field.
export function setShortcutCut(band, cut) {
  if (band.cut === !!cut) return null;
  const oldSolids = band.solids;
  band.cut = !!cut;
  band.holdSeconds = 0;
  const margin = band.width * 0.5 + 0.35;
  const gaps = band.cut ? [{ id: 'saw-kerf', kind: 'cut', at: band.length * 0.5,
    width: SHORTCUT_GAP_WIDTH + 2 * margin }] : [];
  const next = makeWallBand({ pts: band.pts, width: band.width, spacing: 0.55,
    heightAt: band.heightAt, top: 1.35, gaps });
  band.gaps = next.gaps;
  band.solids = next.solids;
  band.isGap = next.isGap;
  return { removed: oldSolids, added: band.solids };
}

// The combat-owned sawCutTick performs gas, heat, chain, sound and 40 m hearing;
// its `bite` result is the sole clock for this hold. A dry tank pauses progress.
export function stepShortcutCut(band, dt, { held, inReach, bite, modal = false }) {
  if (band.cut || !held || !inReach || modal) {
    band.holdSeconds = 0;
    return { progress: 0, completed: false };
  }
  if (!bite) return { progress: band.holdSeconds, completed: false };
  band.holdSeconds = Math.min(SHORTCUT_CUT_SECONDS, band.holdSeconds + Math.max(0, dt));
  return { progress: band.holdSeconds, completed: band.holdSeconds >= SHORTCUT_CUT_SECONDS };
}

export function shortcutBlocks(band, x, z, bodyRadius = 0.35) {
  const resolved = resolveWallBand(band, x, z, bodyRadius);
  return Math.hypot(resolved.x - x, resolved.z - z) > 1e-4;
}

// Three staggered trunks, each in three lengths. The middle 3 m is a separate
// instance so sawing hides only that kerf. One geometry/material can draw all
// these pieces in a storage-buffer instanced mesh, including the cut ends.
export function shortcutLogPieces(band) {
  const a = band.pts[0], b = band.pts[1], len = band.length;
  const ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
  const nx = -uz, nz = ux;
  const yaw = Math.atan2(uz, ux);
  const pieces = [];
  const sections = [
    { id: 'left', start: -len * 0.5, end: -SHORTCUT_GAP_WIDTH * 0.5 },
    { id: 'kerf', start: -SHORTCUT_GAP_WIDTH * 0.5, end: SHORTCUT_GAP_WIDTH * 0.5 },
    { id: 'right', start: SHORTCUT_GAP_WIDTH * 0.5, end: len * 0.5 },
  ];
  for (let layer = 0; layer < 3; layer++) {
    const offset = [-0.19, 0.18, 0.02][layer];
    const radius = [0.26, 0.22, 0.19][layer];
    for (const section of sections) {
      const mid = (section.start + section.end) * 0.5;
      const x = band.middle.x + ux * mid + nx * offset;
      const z = band.middle.z + uz * mid + nz * offset;
      const startX = band.middle.x + ux * section.start + nx * offset;
      const startZ = band.middle.z + uz * section.start + nz * offset;
      const endX = band.middle.x + ux * section.end + nx * offset;
      const endZ = band.middle.z + uz * section.end + nz * offset;
      pieces.push({ id: `${band.id}-${layer}-${section.id}`, bandId: band.id,
        section: section.id, layer, x, z,
        y: band.heightAt(x, z) + radius + layer * 0.32,
        length: section.end - section.start, radius, yaw,
        rise: band.heightAt(endX, endZ) - band.heightAt(startX, startZ),
        visible: !band.cut || section.id !== 'kerf' });
    }
  }
  return pieces;
}

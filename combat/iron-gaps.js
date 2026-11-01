// combat/iron-gaps.js - GB-266 (CL-289 iron, CL-287 W2; D-106). The trapper's old man gives horseshoe sets; one hung
// over a ring gap or a cut shortcut closes it to the dead only. He walks through. Pure rules: no DOM, no three.
// The page lists the spots (where the iron can hang), says when he hangs or takes one down, and asks this how a
// dead body is pushed off a hung line and which circles the dead's fields should mark blocked.
//
// A spot is a short line across a gap: centre (x, z), unit direction (ux, uz) along the line, half its length.
// Iron hung on it is a thin wall (IRON_THICK either side) the dead are pushed back from, on the side they came from.

export const IRON_REACH = 3;          // m from the spot's centre for the E prompt
export const IRON_THICK = 0.25;       // half the line's thickness, before the body's radius
export const IRON_LINE_PAD = 1.0;     // m the line runs past the corridor's edge, into the band's solids
export const IRON_BLOCK_STEP = 0.8;   // spacing of the field's blocked circles along a line
export const IRON_BLOCK_R = 0.5;

// The openings in the ring (the trails' corridors, side by side ones as one): one spot an opening, the iron strung along
// the ring over the open arc in chords of at most IRON_SEG m (its segs), running IRON_LINE_PAD into the solids at each
// end. Every way through the ring crosses its centre circle, and on that circle only the open arcs are out of the
// solids, so a line over each arc closes it. An opening that is mostly water (the river's) is the river's: no spot.
// band: the HQ ring (radius about the origin, its circle solids). isWater(x, z) optional.
export const IRON_SEG = 4;
export function ringGapSpots(band, { bodyR = 0.35, step = 0.25, isWater = null } = {}) {
  const out = [];
  if (!band || !(band.radius > 0) || !band.solids || !band.solids.length) return out;
  const R = band.radius, n = Math.ceil((2 * Math.PI * R) / step);
  const open = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n, x = Math.cos(a) * R, z = Math.sin(a) * R;
    let free = 1;
    for (const s of band.solids) { const lim = s.radius + bodyR; const dx = x - s.x, dz = z - s.z; if (dx * dx + dz * dz < lim * lim) { free = 0; break; } }
    open[i] = free;
  }
  let start = -1;
  for (let i = 0; i < n; i++) if (!open[i]) { start = i; break; }
  if (start < 0) return out;   // no solids on the circle: nothing to hang over
  let k = 0;
  for (let j = 1; j <= n; j++) {
    const i = (start + j) % n;
    if (!open[i] || open[(i - 1 + n) % n]) continue;
    let m = 0, wet = 0; while (m < n && open[(i + m) % n]) m++;
    if (isWater) for (let q = 0; q < m; q++) { const a = (2 * Math.PI * ((i + q) % n)) / n; if (isWater(Math.cos(a) * R, Math.sin(a) * R)) wet++; }
    if (wet > m * 0.3) continue;
    const a0 = (2 * Math.PI * i) / n - IRON_LINE_PAD / R, a1 = (2 * Math.PI * (i + m - 1)) / n + IRON_LINE_PAD / R;
    const mid = (a0 + a1) / 2, arc = (a1 - a0) * R;
    const ns = Math.max(1, Math.ceil(arc / IRON_SEG)), segs = [];
    for (let q = 0; q < ns; q++) {
      const b0 = a0 + (a1 - a0) * q / ns, b1 = a0 + (a1 - a0) * (q + 1) / ns;
      const x0 = Math.cos(b0) * R, z0 = Math.sin(b0) * R, x1 = Math.cos(b1) * R, z1 = Math.sin(b1) * R, L = Math.hypot(x1 - x0, z1 - z0);
      segs.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, ux: (x1 - x0) / L, uz: (z1 - z0) / L, half: L / 2 });
    }
    out.push({ id: `ring:${k++}`, kind: 'ring', x: Math.cos(mid) * R, z: Math.sin(mid) * R, ux: -Math.sin(mid), uz: Math.cos(mid), half: arc / 2, segs });
  }
  return out;
}

// A cut deadfall's kerf (GP-20007): the line runs along the logs, over the cut.
export function shortcutSpot(band, gapWidth = 3) {
  if (!band || !band.cut || !band.pts || band.pts.length < 2) return null;
  const a = band.pts[0], b = band.pts[band.pts.length - 1];
  const dl = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const mid = band.middle || { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const s = { id: `cut:${band.id}`, kind: 'cut', x: mid.x, z: mid.z, ux: (b.x - a.x) / dl, uz: (b.z - a.z) / dl, half: gapWidth / 2 + IRON_LINE_PAD };
  s.segs = [{ x: s.x, z: s.z, ux: s.ux, uz: s.uz, half: s.half }];
  return s;
}

const segsOf = (spot) => spot.segs || [spot];
// Push a dead body at (x, z), radius r, that was at (px, pz) last step, back off the line to its own side.
// Null when the line doesn't touch it.
function pushOne(seg, x, z, r, px, pz) {
  const nx = -seg.uz, nz = seg.ux;
  const dx = x - seg.x, dz = z - seg.z;
  if (Math.abs(dx * seg.ux + dz * seg.uz) > seg.half + r) return null;
  const side = dx * nx + dz * nz;
  const was = (px - seg.x) * nx + (pz - seg.z) * nz;
  const s = was > 0 ? 1 : was < 0 ? -1 : (side >= 0 ? 1 : -1);
  const minD = IRON_THICK + r;
  if (side * s >= minD) return null;
  const k = s * minD - side;
  return { x: x + nx * k, z: z + nz * k };
}
export function ironPush(spot, x, z, r, px = x, pz = z) {
  let hit = null;
  for (const seg of segsOf(spot)) { const p = pushOne(seg, x, z, r, px, pz); if (p) { x = p.x; z = p.z; hit = p; } }
  return hit ? { x, z } : null;
}
// The circles the dead's fields mark blocked for a hung line.
export function ironBlockCircles(spot) {
  const out = [];
  for (const seg of segsOf(spot)) {
    const n = Math.max(1, Math.ceil((seg.half * 2) / IRON_BLOCK_STEP));
    for (let i = 0; i <= n; i++) {
      const t = -seg.half + (2 * seg.half) * i / n;
      out.push({ x: seg.x + seg.ux * t, z: seg.z + seg.uz * t, r: IRON_BLOCK_R });
    }
  }
  return out;
}
export { segsOf as ironSegs };
export function nearestSpot(spots, x, z, reach = IRON_REACH) {
  let best = null, bd = reach;
  for (const s of spots) { const d = Math.hypot(x - s.x, z - s.z); if (d < bd) { bd = d; best = s; } }
  return best;
}

// The hung sets of a run. supply: { count(), take(), give() } - the horseshoe sets in hand (the utilities' supply).
export function createIronGaps(supply) {
  const hung = new Map();   // id -> spot
  const api = {
    isHung(id) { return hung.has(id); },
    hung() { return [...hung.values()]; },
    count() { return hung.size; },
    // E at an empty spot with a set in hand. False when there is none to hang or it's hung already.
    hang(spot) {
      if (!spot || hung.has(spot.id) || !(supply.count() > 0)) return false;
      if (!supply.take()) return false;
      hung.set(spot.id, spot); return true;
    },
    // E at a hung spot: the set back in hand, to hang somewhere else.
    takeDown(id) {
      if (!hung.has(id)) return false;
      hung.delete(id); supply.give(); return true;
    },
    // A spot that no longer exists (a cut deadfall put back): its set comes back.
    prune(validIds) {
      const gone = [];
      for (const id of [...hung.keys()]) if (!validIds.has(id)) { hung.delete(id); supply.give(); gone.push(id); }
      return gone;
    },
    read() { return { hung: [...hung.keys()] }; },
    // Restore a saved run: the ids that are still spots hang again (the supply already counts them as taken).
    load(saved, spotsById) {
      hung.clear();
      for (const id of (saved && saved.hung) || []) { const s = spotsById.get(id); if (s) hung.set(id, s); }
    },
    reset() { hung.clear(); },
  };
  return api;
}
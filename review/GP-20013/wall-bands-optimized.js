// W2 scenery barriers. A band is a polyline whose overlapping circle solids
// share the game's existing collision, build-clearance and flow-field paths.
const TAU = Math.PI * 2;

export function hqRingPoints(radius = 60, step = 0.8) {
  const n = Math.ceil(TAU * radius / step);
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = TAU * i / n;
    return { x: Math.cos(a) * radius, z: Math.sin(a) * radius };
  });
}

function normalizeArc(at, length) { return ((at % length) + length) % length; }

// Claude's W2 placement rule: the opening follows the trail's physical
// corridor, even when a trail crosses the ring obliquely. It is not an arc
// interval that removes scenery away from the actual path.
export function ringTrailGaps(paths, radius = 60, width = 4) {
  const gaps = [];
  for (let p = 0; p < paths.length; p++) {
    const pts = paths[p];
    if (pts.length < 2) continue;
    let lo = Infinity, hi = -Infinity;
    for (const q of pts) { const r = Math.hypot(q.x, q.z); lo = Math.min(lo, r); hi = Math.max(hi, r); }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
      if (len2 <= 0) continue;
      const t = Math.max(0, Math.min(1, -(a.x * dx + a.z * dz) / len2));
      lo = Math.min(lo, Math.hypot(a.x + dx * t, a.z + dz * t));
    }
    if (lo > radius - width * 0.5 || hi < radius + width * 0.5) continue;
    gaps.push({ id: `trail-${p}`, kind: 'trail', pts, halfWidth: (pts.hw ?? 0.85) + 1 });
  }
  return gaps;
}

function distanceToTrailSq(x, z, pts, limit = Infinity) {
  const bb = pts.bb;
  if (bb && (x < bb[0] - limit || x > bb[2] + limit || z < bb[1] - limit || z > bb[3] + limit)) return Infinity;
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z;
    const q = dx * dx + dz * dz;
    const t = q > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / q)) : 0;
    const px = a.x + t * dx, pz = a.z + t * dz;
    best = Math.min(best, (x - px) ** 2 + (z - pz) ** 2);
  }
  return best;
}

export function ringWaterGaps(radius, width, isWater) {
  const length = TAU * radius, step = 0.5, n = Math.ceil(length / step);
  const wet = Array.from({ length: n }, (_, i) => {
    const a = TAU * i / n;
    return isWater(Math.cos(a) * radius, Math.sin(a) * radius);
  });
  const gaps = [];
  for (let i = 0; i < n; i++) {
    if (!wet[i] || wet[(i - 1 + n) % n]) continue;
    let count = 1;
    while (count < n && wet[(i + count) % n]) count++;
    gaps.push({ id: `river-${gaps.length}`, kind: 'river', at: normalizeArc((i + (count - 1) * 0.5) * length / n, length), width: count * length / n + width + 1 });
  }
  return gaps;
}

function polylineLengths(pts) {
  const lens = [0];
  for (let i = 1; i < pts.length; i++)
    lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  return lens;
}

function pointOnPolyline(pts, lens, at) {
  let i = 1;
  while (i < lens.length - 1 && lens[i] < at) i++;
  const d = lens[i] - lens[i - 1], t = d > 0 ? (at - lens[i - 1]) / d : 0;
  const a = pts[i - 1], b = pts[i];
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    nx: d > 0 ? -(b.z - a.z) / d : 1, nz: d > 0 ? (b.x - a.x) / d : 0 };
}

// A quarter band follows authored bends. A trail only cuts it where its real
// corridor approaches the polyline, preserving a diagonal crossing's full width.
export function bandTrailGaps(pts, paths, width = 5) {
  if (pts.length < 2) return [];
  const lens = polylineLengths(pts), length = lens.at(-1);
  return paths.flatMap((path, i) => {
    if (!path || path.length < 2) return [];
    const halfWidth = (path.hw ?? 0.85) + 1;
    const limit = width * 0.5 + halfWidth;
    for (let at = 0; at <= length; at += 1) {
      const p = pointOnPolyline(pts, lens, Math.min(at, length));
      if (distanceToTrailSq(p.x, p.z, path, limit) < limit * limit)
        return [{ id: `trail-${i}`, kind: 'trail', pts: path, halfWidth }];
    }
    return [];
  });
}

// Omit wet ground across the whole 5 m strip. A bridge still gets its normal
// trail cut; this water cut never invents another bridge or blocks the river.
export function bandWaterGaps(pts, width, isWater) {
  if (pts.length < 2) return [];
  const lens = polylineLengths(pts), length = lens.at(-1), step = 0.5;
  if (length <= 0) return [];
  const n = Math.ceil(length / step), wet = [];
  for (let i = 0; i <= n; i++) {
    const p = pointOnPolyline(pts, lens, Math.min(length, i * length / n));
    const h = width * 0.5;
    wet.push(isWater(p.x, p.z) || isWater(p.x + p.nx * h, p.z + p.nz * h) ||
      isWater(p.x - p.nx * h, p.z - p.nz * h));
  }
  const gaps = [];
  for (let i = 0; i <= n; i++) {
    if (!wet[i] || wet[i - 1]) continue;
    let end = i;
    while (end + 1 <= n && wet[end + 1]) end++;
    const a = i * length / n, b = end * length / n;
    gaps.push({ id: `water-${gaps.length}`, kind: 'river', at: (a + b) * 0.5,
      width: b - a + width + 1 });
  }
  return gaps;
}

// `clearWidth` is the opening for a marine's centre. Widen the missing solid
// centres by the circle radius plus body radius so the actual passage is 4 m.
export function bandWalkGap(id, at, clearWidth = 4, bandWidth = 5, bodyR = 0.35) {
  return { id, kind: 'walk', at, clearWidth,
    width: clearWidth + bandWidth + bodyR * 2 };
}

export function makeWallBand({ pts, width = 4, gaps = [], spacing = 0.8, heightAt = () => 0, top = 2.5 }) {
  const lens = [0];
  const bounds = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity };
  for (const p of pts) {
    bounds.x0 = Math.min(bounds.x0, p.x); bounds.x1 = Math.max(bounds.x1, p.x);
    bounds.z0 = Math.min(bounds.z0, p.z); bounds.z1 = Math.max(bounds.z1, p.z);
  }
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  const length = lens[lens.length - 1];
  const closed = pts.length > 2 && Math.hypot(pts[0].x - pts.at(-1).x, pts[0].z - pts.at(-1).z) < 1e-3;
  const solidRadius = width * 0.5;
  const isGap = (x, z, at, clearance = 0) => gaps.some((g) => {
    if (g.pts) {
      const limit = g.halfWidth + clearance;
      return distanceToTrailSq(x, z, g.pts, limit) < limit * limit;
    }
    const d = closed ? Math.abs(normalizeArc(at - g.at + length * 0.5, length) - length * 0.5) : Math.abs(at - g.at);
    return d < g.width * 0.5;
  });
  const solids = [];
  const n = Math.ceil(length / Math.min(spacing, solidRadius * 1.4));
  for (let j = 0; j < n; j++) {
    const at = j * length / n;
    let i = 1;
    while (i < lens.length - 1 && lens[i] < at) i++;
    const d = lens[i] - lens[i - 1];
    const t = d > 0 ? (at - lens[i - 1]) / d : 0;
    const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t;
    const z = pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t;
    if (isGap(x, z, at, solidRadius + 0.35)) continue;
    const y = heightAt(x, z);
    const nx = d > 0 ? -(pts[i].z - pts[i - 1].z) / d : 1;
    const nz = d > 0 ? (pts[i].x - pts[i - 1].x) / d : 0;
    solids.push({ x, z, nx, nz, radius: solidRadius, y0: y - 0.25, y1: y + top, at });
  }
  return { pts, width, gaps, length, lens, bounds, solids, isGap, closed };
}

// Movement uses a single nearest-line push. Iterating all overlapping circle
// solids in order makes a body surf sideways along the wall to the next gap.
// The circles still serve build clearance and the zombie navigation grid.
// Both callers consume the coordinates immediately, so the collision result
// can share one scratch object instead of allocating on every zombie step.
const wallBandResult = { x: 0, z: 0 };
export function resolveWallBand(band, x, z, bodyR = 0.35) {
  wallBandResult.x = x; wallBandResult.z = z;
  const minD = band.width * 0.5 + bodyR;
  if (band.radius != null && Math.abs(Math.hypot(x, z) - band.radius) > minD) return wallBandResult;
  if (x < band.bounds.x0 - minD || x > band.bounds.x1 + minD ||
      z < band.bounds.z0 - minD || z > band.bounds.z1 + minD) return wallBandResult;
  let best = Infinity, nearX = 0, nearZ = 0, nearNX = 1, nearNZ = 0, at = 0;
  if (band.radius != null) {
    const r = Math.hypot(x, z), scale = band.radius / r;
    nearX = x * scale; nearZ = z * scale;
    nearNX = x / r; nearNZ = z / r;
    best = (r - band.radius) ** 2;
    at = normalizeArc(Math.atan2(z, x) * band.radius, band.length);
  } else for (let i = 1; i < band.pts.length; i++) {
    const a = band.pts[i - 1], b = band.pts[i];
    const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len2)) : 0;
    const px = a.x + dx * t, pz = a.z + dz * t;
    const d2 = (x - px) ** 2 + (z - pz) ** 2;
    if (d2 < best) {
      best = d2; nearX = px; nearZ = pz;
      const segLen = Math.sqrt(len2);
      nearNX = segLen > 0 ? -dz / segLen : 1;
      nearNZ = segLen > 0 ? dx / segLen : 0;
      at = band.lens[i - 1] + t * segLen;
    }
  }
  if (best >= minD * minD) return wallBandResult;
  let walkable = false;
  for (let i = 0; i < band.gaps.length; i++) {
    const g = band.gaps[i];
    if (g.pts) {
      if (distanceToTrailSq(x, z, g.pts, g.halfWidth) < g.halfWidth ** 2) { walkable = true; break; }
      continue;
    }
    const d = band.closed ? Math.abs(normalizeArc(at - g.at + band.length * 0.5, band.length) - band.length * 0.5) : Math.abs(at - g.at);
    if (d < (g.clearWidth != null ? g.clearWidth * 0.5 : Math.max(0, g.width * 0.5 - minD))) { walkable = true; break; }
  }
  if (walkable) return wallBandResult;
  const d = Math.sqrt(best);
  const nx = d > 1e-8 ? (x - nearX) / d : nearNX;
  const nz = d > 1e-8 ? (z - nearZ) / d : nearNZ;
  wallBandResult.x = nearX + nx * minD;
  wallBandResult.z = nearZ + nz * minD;
  return wallBandResult;
}

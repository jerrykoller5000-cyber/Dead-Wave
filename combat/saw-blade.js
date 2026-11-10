// combat/saw-blade.js - CB-251 (Jerry's J121, 9 Nov playtest: "I want it to be that wherever the real spinning blade hits,
// that is where it actually cuts"). The chainsaw used to test everything in a 3.1 m cone from his chest along the aim, so
// it cut what the crosshair was on, a long way past the end of the bar. Its cut is now the chain: a capsule from the rear
// sprocket to the nose (two world points and a radius, `bl`), and a body is cut when the capsule touches it.
//
// Pure geometry: no three.js, no game state. index.html works the blade out (sawBladeWorld: the view gun's own place in
// first person, the saw in his hands in third) and hands it in. `bl` is { ax, ay, az, bx, by, bz, r } in world metres;
// `out` (optional) is { x, y, z, d }: the point on the blade nearest the body (where the cut is: AG-280's sparks and
// splinters, the blood) and d, the gap in metres (negative when they overlap).

// A little forgiveness on top of the chain's own radius (the cutters throw wide of the bar, a body moves between ticks).
export const SAW_SLOP = 0.12;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// An upright column (a zombie, a tree's trunk): axis (cx, cz), radius cr, from y0 up to y1.
export function bladeColumn(bl, cx, cz, cr, y0, y1, out) {
  const { ax, ay, az, bx, by, bz } = bl, r = bl.r + SAW_SLOP;
  const dy = by - ay, lo = y0 - r, hi = y1 + r;
  let t0 = 0, t1 = 1;
  if (Math.abs(dy) < 1e-6) {
    if (ay < lo || ay > hi) return false;
  } else {
    let s0 = (lo - ay) / dy, s1 = (hi - ay) / dy;
    if (s0 > s1) { const s = s0; s0 = s1; s1 = s; }
    t0 = Math.max(0, s0); t1 = Math.min(1, s1);
    if (t0 > t1) return false;
  }
  const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
  let t = t0;
  if (len2 > 1e-9) t = clamp(((cx - ax) * dx + (cz - az) * dz) / len2, t0, t1);
  const px = ax + dx * t, pz = az + dz * t;
  const gap = Math.hypot(px - cx, pz - cz) - cr - r;
  if (gap > 0) return false;
  if (out) { out.x = px; out.y = ay + dy * t; out.z = pz; out.d = gap; }
  return true;
}

// A point (a bug, a rabbit): within `pad` of the capsule's surface.
export function bladePoint(bl, x, y, z, pad = 0, out) {
  const { ax, ay, az, bx, by, bz } = bl, r = bl.r + SAW_SLOP + pad;
  const dx = bx - ax, dy = by - ay, dz = bz - az, len2 = dx * dx + dy * dy + dz * dz;
  const t = len2 > 1e-9 ? clamp(((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / len2, 0, 1) : 0;
  const px = ax + dx * t, py = ay + dy * t, pz = az + dz * t;
  const gap = Math.hypot(px - x, py - y, pz - z) - r;
  if (gap > 0) return false;
  if (out) { out.x = px; out.y = py; out.z = pz; out.d = gap; }
  return true;
}

// An axis-aligned box ({ minX, maxX, minY, maxY, minZ, maxZ }: the range's plates). The blade is sampled every few cm;
// `out` is the point on the box nearest the blade.
export function bladeBox(bl, box, out) {
  const r = bl.r + SAW_SLOP, N = 16;
  let best = Infinity, qx = 0, qy = 0, qz = 0;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const px = bl.ax + (bl.bx - bl.ax) * t, py = bl.ay + (bl.by - bl.ay) * t, pz = bl.az + (bl.bz - bl.az) * t;
    const cx = clamp(px, box.minX, box.maxX), cy = clamp(py, box.minY, box.maxY), cz = clamp(pz, box.minZ, box.maxZ);
    const d = Math.hypot(px - cx, py - cy, pz - cz);
    if (d < best) { best = d; qx = cx; qy = cy; qz = cz; }
  }
  if (best > r) return false;
  if (out) { out.x = qx; out.y = qy; out.z = qz; out.d = best - r; }
  return true;
}

// The Training Ground's plates the blade touches, nearest `origin` (his chest) first: [{ index, point, distance }], the
// shape world/training-target-hits.js trainingMeleeHits gives. A wall or an upright plate between his chest and the
// cut stops it (`trace(tg, from, to)` is world/training-ballistics.js traceTraining).
export function trainingBladeHits(tg, bl, origin, trace, limit = Infinity) {
  const hits = [], pt = { x: 0, y: 0, z: 0, d: 0 };
  tg.targets.forEach((t, index) => {
    if (t.state !== 'up' || !t.box || !bladeBox(bl, t.box, pt)) return;
    const hit = trace ? trace(tg, origin, pt) : null;
    if (hit && hit.solid.target !== index) return;
    hits.push({ index, point: { x: pt.x, y: pt.y, z: pt.z }, distance: Math.hypot(pt.x - origin.x, pt.z - origin.z) });
  });
  return hits.sort((a, b) => a.distance - b.distance).slice(0, Math.max(0, limit));
}

// The way the blade points on the ground (a unit x, z), or the fallback when it points up or down.
export function bladeHeading(bl, fx, fz, out) {
  const hx = bl.bx - bl.ax, hz = bl.bz - bl.az, hl = Math.hypot(hx, hz);
  if (hl > 0.25) { out.x = hx / hl; out.z = hz / hl; } else { out.x = fx; out.z = fz; }
  return out;
}

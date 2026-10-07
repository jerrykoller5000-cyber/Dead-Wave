// GB-134 (Jerry's playthrough 1, 2026-10-06): the grenade's arc, and the 40 mm launcher's.
// "Hold G: an arc grows from a short lob (a tap) to the longest throw at 3 s; where terrain cuts it, the arc shows
// that. The 40 mm launcher gets an arc like the mortar's."
// Pure: the throw speeds for a charge, and the flight the game will fly (the same step as updateGrenades: gravity
// first, then the move), stopped where the ground or a solid first takes it, or at the fuse.

export const THROW = {
  FULL_S: 3,              // held this long: the longest throw
  LOB: { h: 4, vy: 4.5 }, // a tap: a short lob, about 3 m on the flat
  FAR: { h: 17, vy: 7.5 },// 3 s: about 19 m on the flat
  OLD: { h: 12, vy: 6 },  // the throw before GB-134 (still what a bare throwGrenade() does)
  G: 16,                  // updateGrenades' gravity
  GROUND_LIFT: 0.12,      // a grenade touches down at the terrain + 0.12 (updateGrenades)
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// The speeds for a throw held chargeS seconds: horizontal (along the aim's x/z, as throwGrenade uses it) and up.
export function throwSpeed(chargeS) {
  const k = clamp01((Number.isFinite(chargeS) ? chargeS : 0) / THROW.FULL_S);
  return { h: THROW.LOB.h + (THROW.FAR.h - THROW.LOB.h) * k, vy: THROW.LOB.vy + (THROW.FAR.vy - THROW.LOB.vy) * k, k };
}

// The flight from (sx, sy, sz) at (vx, vy, vz). ground(x, z) is the terrain height; solid(ax, ay, az, bx, by, bz)
// returns the fraction along that step where something solid takes it, or null. Stops at tMax (the fuse).
// Returns { pts: [{x, y, z}] (every step, the start first), hit: {x, y, z, t, kind: 'ground' | 'solid' | 'fuse'} }.
export function flyArc(o) {
  const g = o.g == null ? THROW.G : o.g, dt = o.dt || 1 / 60, tMax = o.tMax || 3, lift = o.lift == null ? THROW.GROUND_LIFT : o.lift;
  let x = o.sx, y = o.sy, z = o.sz, vx = o.vx, vy = o.vy, vz = o.vz, t = 0;
  const pts = [{ x, y, z }];
  while (t < tMax - 1e-9) {
    vy -= g * dt;
    const nx = x + vx * dt, ny = y + vy * dt, nz = z + vz * dt;
    t += dt;
    const f = o.solid ? o.solid(x, y, z, nx, ny, nz) : null;
    if (f != null && f >= 0 && f <= 1) {
      const hx = x + (nx - x) * f, hy = y + (ny - y) * f, hz = z + (nz - z) * f;
      pts.push({ x: hx, y: hy, z: hz });
      return { pts, hit: { x: hx, y: hy, z: hz, t: t - dt * (1 - f), kind: 'solid' } };
    }
    const gy = o.ground ? o.ground(nx, nz) + lift : -Infinity;
    if (ny < gy) {
      // Where the step crossed the ground: halve towards it (the terrain is not flat).
      let a = 0, b = 1;
      for (let i = 0; i < 8; i++) {
        const m = (a + b) / 2, mx = x + (nx - x) * m, my = y + (ny - y) * m, mz = z + (nz - z) * m;
        if (my < o.ground(mx, mz) + lift) b = m; else a = m;
      }
      const hx = x + (nx - x) * b, hz = z + (nz - z) * b, hy = o.ground(hx, hz) + lift;
      pts.push({ x: hx, y: hy, z: hz });
      return { pts, hit: { x: hx, y: hy, z: hz, t: t - dt * (1 - b), kind: 'ground' } };
    }
    x = nx; y = ny; z = nz;
    pts.push({ x, y, z });
  }
  return { pts, hit: { x, y, z, t, kind: 'fuse' } };
}

// n points spaced evenly along the flight (by time), for the dots; the last one is where it lands.
export function arcDots(pts, n) {
  const out = [];
  if (!pts || pts.length < 2 || !(n > 0)) return out;
  for (let i = 1; i <= n; i++) {
    const u = (i / n) * (pts.length - 1), j = Math.min(pts.length - 2, Math.floor(u)), f = u - j;
    const a = pts[j], b = pts[j + 1];
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f });
  }
  return out;
}
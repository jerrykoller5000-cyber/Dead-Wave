// Pure helpers. No Three, no game state. The first slice of the index.html split (CU-4).
// Behaviour is the same code that used to live next to the terrain.

export function hash2(ix, iz) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = zf * zf * zf * (zf * (zf * 6 - 15) + 10);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  const top = a + (b - a) * u;
  const bot = c + (d - c) * u;
  return top + (bot - top) * v;
}

// Fractal brownian motion, returns -1..1.
export function fbm(x, z, oct, lac = 2.03, gain = 0.5) {
  let sum = 0, amp = 0.5, norm = 0, fx = x, fz = z;
  for (let i = 0; i < oct; i++) {
    sum += amp * (vnoise(fx, fz) * 2 - 1);
    norm += amp;
    amp *= gain;
    fx *= lac; fz *= lac;
  }
  return sum / norm;
}

// Ridged multifractal, returns 0..1. Creates creased ridge lines rather than blobs.
export function ridged(x, z, oct, lac = 2.07, gain = 0.5) {
  let sum = 0, amp = 0.5, norm = 0, fx = x, fz = z;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(vnoise(fx, fz) * 2 - 1);
    sum += amp * n * n;
    norm += amp;
    amp *= gain;
    fx *= lac; fz *= lac;
  }
  return sum / norm;
}

export function smoothstep01(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

export function smoothBand(edge0, edge1, x) {
  return smoothstep01((x - edge0) / (edge1 - edge0));
}

export function distPointToSeg(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const apx = px - ax, apz = pz - az;
  const ab2 = abx * abx + abz * abz || 1e-8;
  let t = (apx * abx + apz * abz) / ab2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + abx * t, qz = az + abz * t;
  return Math.hypot(px - qx, pz - qz);
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap deterministic 3-D value noise for lumpy clumps and bark streaks.
export function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise3(x, y, z) {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = x - x0, fy = y - y0, fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash3(x0 + i, y0 + j, z0 + k);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), sx), L(c(0, 1, 0), c(1, 1, 0), sx), sy),
           L(L(c(0, 0, 1), c(1, 0, 1), sx), L(c(0, 1, 1), c(1, 1, 1), sx), sy), sz);
}

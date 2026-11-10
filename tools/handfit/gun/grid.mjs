// The gun's field in a hand's canonical space (sdf.py), trilinear.
import fs from 'node:fs';
export function loadGrid(base) {
  const H = JSON.parse(fs.readFileSync(base + '.json', 'utf8'));
  const buf = fs.readFileSync(base + '.bin'), F = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  const [nx, ny, nz] = H.dims, [ox, oy, oz] = H.origin, st = H.step;
  const at = (i, j, k) => F[(i * ny + j) * nz + k];
  const d = (x, y, z) => {
    let fx = (x - ox) / st, fy = (y - oy) / st, fz = (z - oz) / st;
    if (fx < 0 || fy < 0 || fz < 0 || fx >= nx - 1 || fy >= ny - 1 || fz >= nz - 1) return 0.010;
    const i = fx | 0, j = fy | 0, k = fz | 0; fx -= i; fy -= j; fz -= k;
    const c00 = at(i, j, k) * (1 - fx) + at(i + 1, j, k) * fx, c01 = at(i, j, k + 1) * (1 - fx) + at(i + 1, j, k + 1) * fx;
    const c10 = at(i, j + 1, k) * (1 - fx) + at(i + 1, j + 1, k) * fx, c11 = at(i, j + 1, k + 1) * (1 - fx) + at(i + 1, j + 1, k + 1) * fx;
    return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz;
  };
  return { d, H };
}

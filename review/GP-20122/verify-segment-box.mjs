import { segmentBox } from '../../world/training.js';

// The former array-based slab loop, kept here as an independent oracle.
function original(a, b, box) {
  let t0 = 0, t1 = 1;
  for (const [p, q, lo, hi] of [[a.x, b.x, box.minX, box.maxX], [a.y, b.y, box.minY, box.maxY], [a.z, b.z, box.minZ, box.maxZ]]) {
    const d = q - p;
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
    let u = (lo - p) / d, v = (hi - p) / d;
    if (u > v) { const s = u; u = v; v = s; }
    if (u > t0) t0 = u;
    if (v < t1) t1 = v;
    if (t0 > t1) return null;
  }
  return t0;
}

let seed = 0x20122;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
for (let i = 0; i < 100000; i++) {
  const a = { x: rnd() * 30 - 15, y: rnd() * 30 - 15, z: rnd() * 30 - 15 };
  const b = { x: i % 31 ? rnd() * 30 - 15 : a.x, y: i % 29 ? rnd() * 30 - 15 : a.y, z: i % 23 ? rnd() * 30 - 15 : a.z };
  const x = rnd() * 30 - 15, y = rnd() * 30 - 15, z = rnd() * 30 - 15;
  const box = { minX: x, maxX: x + rnd() * 5, minY: y, maxY: y + rnd() * 5, minZ: z, maxZ: z + rnd() * 5 };
  const want = original(a, b, box), got = segmentBox(a, b, box);
  if (!Object.is(got, want)) throw Error(`segmentBox mismatch ${i}: ${got} vs ${want}`);
}
console.log('PASS 100000 scalar Training ray-box cases match original array-based trace exactly');

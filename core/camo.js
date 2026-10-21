// The CIF's camouflage patterns (Jerry, CU-61). Each one paints a seamless tile into an RGBA
// buffer, so the marine's shared uniform texture can be repainted in place when he swaps.
// Pure: no DOM, no Math.random, no world seed. The same key always paints the same tile.
//
// M81 Woodland is not painted here: it is the uniform the marine was built with
// (makeCamoTexture in index.html), kept exactly as it was.

// Layers are painted in order over the base wherever the layer's noise is above its threshold.
// cx, cy: noise cells across the tile (cy > cx stretches shapes sideways). px: digital block size
// in tile pixels (at 256). spots: round dabs, radius in tile pixels at 256.
// A colour a little darker (f < 1) or lighter (f > 1), for the plain colours' grain.
function shade(h, f) {
  const c = [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f + (f > 1 ? 4 : 0)))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
const PATTERNS = [
  { key: 'm81' },
  { key: 'flecktarn', base: '#8a8a60', layers: [
    { c: '#6d7a48', cx: 6, cy: 6, t: 0.46, seed: 21 }],
  spots: [
    { c: '#3b4a2c', n: 900, r: [1.8, 4.2], seed: 22 },
    { c: '#6b4a30', n: 420, r: [1.6, 3.8], seed: 23 },
    { c: '#1c1d17', n: 320, r: [1.2, 3.0], seed: 24 },
    { c: '#5b6a3c', n: 380, r: [1.6, 3.6], seed: 25 }] },
  { key: 'ucp', px: 4, base: '#b3ad96', layers: [
    { c: '#8e8f88', cx: 6, cy: 6, t: 0.5, seed: 31 },
    { c: '#6f7563', cx: 8, cy: 8, t: 0.6, seed: 32 }] },
  { key: 'multicam', base: '#b09a74', layers: [
    { c: '#8c7a55', cx: 4, cy: 4, t: 0.46, seed: 41 },
    { c: '#5e6b44', cx: 6, cy: 5, t: 0.6, seed: 42 },
    { c: '#6b4f33', cx: 8, cy: 7, t: 0.64, seed: 43 }],
  spots: [
    { c: '#d8cba8', n: 70, r: [2.5, 6], seed: 44 },
    { c: '#3e3325', n: 90, r: [1.8, 4.5], seed: 45 }] },
  { key: 'mccuu', px: 4, base: '#c2a67a', layers: [
    { c: '#9c7b54', cx: 6, cy: 6, t: 0.5, seed: 51 },
    { c: '#6e5238', cx: 8, cy: 8, t: 0.62, seed: 52 },
    { c: '#dcc79f', cx: 10, cy: 10, t: 0.66, seed: 53 }] },
  { key: 'marpat', px: 4, base: '#7d7a58', layers: [
    { c: '#55603a', cx: 5, cy: 5, t: 0.46, seed: 61 },
    { c: '#5e4a33', cx: 7, cy: 7, t: 0.58, seed: 62 },
    { c: '#23241c', cx: 9, cy: 9, t: 0.66, seed: 63 }] },
  { key: 'french', base: '#8b9263', layers: [
    { c: '#3f4d2c', cx: 3, cy: 6, t: 0.5, seed: 71 },
    { c: '#6a4c32', cx: 4, cy: 8, t: 0.6, seed: 72 },
    { c: '#1e1d18', cx: 5, cy: 10, t: 0.67, seed: 73 }] },
  { key: 'dpmWoodland', base: '#9a8e61', layers: [
    { c: '#5b6b38', cx: 5, cy: 5, t: 0.45, seed: 81 },
    { c: '#6e4a2e', cx: 6, cy: 6, t: 0.56, seed: 82 },
    { c: '#1f1c17', cx: 9, cy: 8, t: 0.66, seed: 83 }] },
  { key: 'dpmDesert', base: '#d3b98a', layers: [
    { c: '#b8966a', cx: 6, cy: 6, t: 0.58, seed: 91 },
    { c: '#9e6f47', cx: 5, cy: 5, t: 0.56, seed: 92 }] },
  { key: 'm14Woodland', base: '#6c8a3e', layers: [
    { c: '#3d5a2a', cx: 4, cy: 4, t: 0.5, seed: 101 },
    { c: '#6b4a2c', cx: 5, cy: 5, t: 0.6, seed: 102 },
    { c: '#1d1f16', cx: 6, cy: 6, t: 0.67, seed: 103 }] },
  { key: 'm14Desert', base: '#d6d6c8', layers: [
    { c: '#8fa38a', cx: 4, cy: 4, t: 0.47, seed: 111 },
    { c: '#4a2f33', cx: 5, cy: 5, t: 0.6, seed: 112 },
    { c: '#2f3b2e', cx: 6, cy: 6, t: 0.68, seed: 113 }] },
  { key: 'greenMulticam', base: '#55633a', layers: [
    { c: '#3a4a28', cx: 4, cy: 4, t: 0.46, seed: 121 },
    { c: '#707b3e', cx: 6, cy: 5, t: 0.58, seed: 122 },
    { c: '#8e8b54', cx: 8, cy: 7, t: 0.65, seed: 123 }],
  spots: [
    { c: '#1f2618', n: 100, r: [1.8, 4.5], seed: 124 },
    { c: '#a5a060', n: 45, r: [2, 5], seed: 125 }] },
  { key: 'dcu', base: '#d6c29c', layers: [
    { c: '#b39a70', cx: 3, cy: 7, t: 0.5, seed: 131 },
    { c: '#8a6a44', cx: 4, cy: 9, t: 0.62, seed: 132 }] },
  { key: 'dbdu', base: '#c9b48c', layers: [
    { c: '#a38a63', cx: 4, cy: 4, t: 0.5, seed: 141 },
    { c: '#7a5a3c', cx: 5, cy: 5, t: 0.62, seed: 142 }],
  spots: [
    { c: '#1c1a16', n: 70, r: [3, 6], seed: 143, chip: '#ebe7da' }] },
  { key: 'cadpat', px: 3, base: '#6c7550', layers: [
    { c: '#4e5a38', cx: 8, cy: 8, t: 0.45, seed: 151 },
    { c: '#3b4230', cx: 10, cy: 10, t: 0.56, seed: 152 },
    { c: '#1c1f18', cx: 12, cy: 12, t: 0.66, seed: 153 }] },

  // Jerry's second sheet (2026-09-29, Claude): rare and historic patterns.
  // South African Giraffe: two-tone, irregular brown patches over off-white (dry grassland).
  { key: 'giraffe', base: '#d8cfb4', layers: [
    { c: '#7a5634', cx: 8, cy: 8, t: 0.47, seed: 161 }] },
  // Swiss TAZ (Jerry's reference picture): sage, dusty mauve and deep maroon blotches on grey, their edges
  // torn into little vertical spikes.
  { key: 'swissTaz', base: '#a09e9d', layers: [
    { c: '#7f978c', cx: 4, cy: 4, t: 0.54, seed: 171, jag: 0.12 },
    { c: '#8e7a7b', cx: 4, cy: 5, t: 0.56, seed: 172, jag: 0.12 },
    { c: '#6e4a47', cx: 5, cy: 5, t: 0.6, seed: 173, jag: 0.14 }] },
  // Zaire Green Leopard: bold black rosettes over deep greens.
  { key: 'zaireLeopard', base: '#4a6a34', layers: [
    { c: '#2f4a23', cx: 4, cy: 4, t: 0.5, seed: 181 }],
  spots: [
    { c: '#111310', n: 45, r: [9, 14], seed: 182, hole: 0.55 },
    { c: '#111310', n: 90, r: [2, 4], seed: 183 }] },
  // Sri Lankan Cactus: tall, upright plant shapes, stretched top to bottom.
  { key: 'cactus', base: '#7f7c50', layers: [
    { c: '#3f5a2e', cx: 9, cy: 3, t: 0.5, seed: 191 },
    { c: '#5a4630', cx: 11, cy: 4, t: 0.6, seed: 192 },
    { c: '#1f2119', cx: 13, cy: 4, t: 0.68, seed: 193 }] },
  // Serbian Karst: greys and a little ochre for bare limestone.
  { key: 'serbianKarst', base: '#a9a596', layers: [
    { c: '#7e7b70', cx: 5, cy: 5, t: 0.48, seed: 201 },
    { c: '#9a8a62', cx: 6, cy: 6, t: 0.62, seed: 202 },
    { c: '#55524a', cx: 8, cy: 8, t: 0.66, seed: 203 }],
  spots: [
    { c: '#d2cdbb', n: 160, r: [1.2, 2.8], seed: 204 },
    { c: '#3a3833', n: 120, r: [1, 2.2], seed: 205 }] },
  // PAP digital (Jerry's reference blouse): deep teal green with large olive-brown areas, pale mint pixel
  // clusters and small navy-indigo ones.
  { key: 'papDigital', px: 3, base: '#22584a', layers: [
    { c: '#5a5641', cx: 4, cy: 4, t: 0.54, seed: 211 },
    { c: '#b2cdbd', cx: 8, cy: 7, t: 0.6, seed: 212, jag: 0.12 },
    { c: '#2b2f4e', cx: 9, cy: 9, t: 0.66, seed: 213, jag: 0.08 }] },
  // M1929 Telo Mimetico: large soft-edged green and brown blotches on ochre.
  { key: 'teloMimetico', base: '#b7a878', layers: [
    { c: '#6b7342', cx: 3, cy: 3, t: 0.5, seed: 221, soft: 0.05 },
    { c: '#7a5634', cx: 4, cy: 4, t: 0.58, seed: 222, soft: 0.05 },
    { c: '#3f3a28', cx: 5, cy: 5, t: 0.68, seed: 223, soft: 0.03 }] },
  // Sumpftarnmuster: blurred, split-edge marsh pattern.
  { key: 'sumpftarn', base: '#a39c78', layers: [
    { c: '#6f7a4c', cx: 4, cy: 5, t: 0.5, seed: 231, soft: 0.1 },
    { c: '#7b6246', cx: 5, cy: 6, t: 0.6, seed: 232, soft: 0.1 },
    { c: '#4b4f34', cx: 7, cy: 8, t: 0.68, seed: 233, soft: 0.08 }] },
  // Tiger Stripe: long dark brush-stroke stripes running side to side.
  { key: 'tigerStripe', base: '#8e8a5e', layers: [
    { c: '#4a5a2e', cx: 2, cy: 10, t: 0.5, seed: 241 },
    { c: '#5a4430', cx: 2, cy: 12, t: 0.62, seed: 242 },
    { c: '#181914', cx: 3, cy: 14, t: 0.66, seed: 243 }] },

  // Jerry's colour chart: plain colours, with a faint fabric grain so they read as cloth.
  ...[
    ['oliveDrab', '#6b8e23'], ['armyGreen', '#4b5320'], ['fieldDrab', '#6c541e'], ['drab', '#967117'],
    ['camouflageGreen', '#78866b'], ['foliageGreen', '#4f7942'], ['rifleGreen', '#444c38'],
    ['darkOliveGreen', '#556b2f'], ['olive', '#808000'], ['khaki', '#f0e68c'], ['darkKhaki', '#bdb76b'],
    ['desertSand', '#edc9af'], ['ecru', '#c2b280'], ['tan', '#d2b48c'], ['coyoteBrown', '#81613c'],
    ['sandyBrown', '#f4a460'], ['feldgrau', '#4d5d53'], ['battleshipGrey', '#848482'], ['gunmetal', '#2a3439'],
    ['charcoal', '#36454f'], ['navyBlue', '#000080'], ['airForceBlueRaf', '#5d8aa8'], ['airForceBlueUsaf', '#00308f'],
    ['prussianBlue', '#003153'], ['forestGreen', '#228b22']
  ].map(([key, c], i) => ({ key, solid: true, base: c, layers: [
    { c: shade(c, 0.96), cx: 32, cy: 32, t: 0.62, seed: 300 + i * 2 },
    { c: shade(c, 1.04), cx: 32, cy: 32, t: 0.64, seed: 301 + i * 2 }] }))
];

// In the order Jerry's sheets list them: the patterns, then the plain colours.
export const CAMO_KEYS = Object.freeze(PATTERNS.map((p) => p.key));
// The plain colours, so the CIF can give them their own heading.
export const CAMO_SOLID_KEYS = Object.freeze(PATTERNS.filter((p) => p.solid).map((p) => p.key));
export const CAMO_DEFAULT = 'm81';
export const isCamoKey = (k) => CAMO_KEYS.includes(k);

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// Value noise on a cx×cy lattice that wraps, so the tile has no seams. Three octaves.
function makeNoise(cx, cy, seed) {
  const octs = [1, 2, 4].map((m, k) => {
    const w = cx * m, h = cy * m, rnd = lcg(seed * 7919 + k * 104729), v = new Float32Array(w * h);
    for (let i = 0; i < v.length; i++) v[i] = rnd();
    return { w, h, v, amp: 1 / m };
  });
  const sum = octs.reduce((a, o) => a + o.amp, 0);
  return (u, v) => {
    let n = 0;
    for (const o of octs) {
      const x = u * o.w, y = v * o.h, x0 = Math.floor(x), y0 = Math.floor(y);
      let fx = x - x0, fy = y - y0;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const xa = ((x0 % o.w) + o.w) % o.w, xb = (xa + 1) % o.w, ya = ((y0 % o.h) + o.h) % o.h, yb = (ya + 1) % o.h;
      const a = o.v[ya * o.w + xa], b = o.v[ya * o.w + xb], c = o.v[yb * o.w + xa], d = o.v[yb * o.w + xb];
      n += o.amp * ((a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy);
    }
    return n / sum;
  };
}

// Paints pattern `key` into `out` (Uint8ClampedArray, size*size*4). Returns false for M81
// Woodland or an unknown key: the caller draws those itself.
export function paintCamo(key, out, size) {
  const p = PATTERNS.find((q) => q.key === key);
  if (!p || !p.base || !out || out.length < size * size * 4) return false;
  const base = hex(p.base);
  const layers = (p.layers || []).map((l) => ({ col: hex(l.c), t: l.t, soft: l.soft || 0, jag: l.jag || 0, n: makeNoise(l.cx, l.cy, l.seed),
    // Torn edges: a fine noise stretched top to bottom, added to the shape's own (Swiss TAZ, PAP).
    j: l.jag ? makeNoise(l.cx * 10, l.cy * 2, l.seed + 997) : null }));
  const block = p.px ? Math.max(1, Math.round(p.px * size / 256)) : 1;
  for (let by = 0; by < size; by += block) for (let bx = 0; bx < size; bx += block) {
    const u = (bx + block / 2) / size, v = (by + block / 2) / size;
    let col = base;
    for (const l of layers) {
      const nv = l.n(u, v) + (l.j ? (l.j(u, v) - 0.5) * l.jag * 2 : 0);
      if (l.soft) {
        // Soft edge: blend over a band round the threshold (Telo Mimetico, Sumpftarn).
        const a = Math.max(0, Math.min(1, (nv - l.t + l.soft) / (2 * l.soft)));
        if (a > 0) col = a >= 1 ? l.col : [0, 1, 2].map((i) => Math.round(col[i] + (l.col[i] - col[i]) * a));
      } else if (nv > l.t) col = l.col;
    }
    for (let y = by; y < Math.min(size, by + block); y++) for (let x = bx; x < Math.min(size, bx + block); x++) {
      const i = (y * size + x) * 4;
      out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2]; out[i + 3] = 255;
    }
  }
  const k = size / 256;
  const dab = (cx, cy, r, col) => {
    const ri = Math.ceil(r);
    for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++) {
      if (dx * dx + dy * dy * 1.3 > r * r) continue;
      const x = ((Math.round(cx) + dx) % size + size) % size, y = ((Math.round(cy) + dy) % size + size) % size, i = (y * size + x) * 4;
      out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2];
    }
  };
  for (const s of p.spots || []) {
    const rnd = lcg(s.seed), col = hex(s.c), chip = s.chip ? hex(s.chip) : null;
    const holeCol = s.hole ? hex((p.layers && p.layers[0] && p.layers[0].c) || p.base) : null;
    for (let i = 0; i < s.n; i++) {
      const x = rnd() * size, y = rnd() * size, r = (s.r[0] + rnd() * (s.r[1] - s.r[0])) * k;
      // DBDU's rocks: a dark chip with a pale one sat against it.
      if (chip) dab(x + r * 0.9, y - r * 0.5, r * 0.75, chip);
      dab(x, y, Math.max(0.6, r), col);
      // A leopard's rosette: the ring's middle painted back in the colour under it.
      if (s.hole) dab(x, y, r * s.hole, holeCol);
    }
  }
  return true;
}

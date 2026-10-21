// GP-162. Local, deterministic surface wear for the concept zombie batches.
// The atlas is shared by all rigs; no additional material groups or draw calls.
export const DETAIL_SURFACES = Object.freeze(['skin','cloth','metal','stone','bone','leather','root','wet']);
const CELL = 256, COLS = 4, ROWS = 2, GUTTER = 12;
const WIDTH = CELL * COLS, HEIGHT = CELL * ROWS, INSIDE = CELL - GUTTER * 2;
const materialCache = new WeakMap();
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const smooth = (lo, hi, x) => { const t = clamp((x - lo) / (hi - lo)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), sx), mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), sx), sy);
}
function grain(x, y, seed) {
  return noise(x * 4, y * 4, seed) * .53 + noise(x * 13, y * 13, seed + 7) * .29 + noise(x * 43, y * 43, seed + 19) * .18;
}
// A warped cellular edge gives connected fractures instead of random dots.
function fracture(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let near = 10, next = 10;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = ix + dx, cy = iy + dy;
    const px = cx + .15 + hash(cx, cy, seed) * .7 - x;
    const py = cy + .15 + hash(cx, cy, seed + 3) * .7 - y;
    const d = px * px + py * py;
    if (d < near) { next = near; near = d; } else if (d < next) next = d;
  }
  return Math.sqrt(next) - Math.sqrt(near);
}
const ridge = (value, center, width) => 1 - smooth(width * .35, width, Math.abs(value - center));

/** Raw pixels are exported to check determinism without a WebGL renderer. */
export function generateDetailPixels() {
  const color = new Uint8Array(WIDTH * HEIGHT * 4);
  const height = new Uint8Array(color.length), response = new Uint8Array(color.length);
  for (let tile = 0; tile < DETAIL_SURFACES.length; tile++) {
    const surface = DETAIL_SURFACES[tile], seed = 271 + tile * 31;
    const ox = (tile % COLS) * CELL, oy = Math.floor(tile / COLS) * CELL;
    for (let py = 0; py < INSIDE; py++) for (let px = 0; px < INSIDE; px++) {
      const u = px / (INSIDE - 1), v = py / (INSIDE - 1);
      const broad = grain(u, v, seed), fine = hash(px, py, seed + 4);
      const warp = noise(u * 5, v * 5, seed + 1) - .5;
      let shade = .91, relief = .5, rough = .86, metal = 0;
      let red = 1, green = 1, blue = 1;
      if (surface === 'skin' || surface === 'wet') {
        // Broken, uneven stains read as infected skin. Long periodic strokes
        // turn into contour rings around the head/limbs, so avoid them here.
        const blotch = smooth(.27, .85, broad);
        const cluster = smooth(.18, .87, noise(u * 7, v * 11, seed + 5));
        // Mix rotated lattices before shaping the spots: single thresholded
        // value noise creates square camouflage marks on long limb UVs.
        const speckle = noise(u * 83 + warp, v * 89, seed + 9) * .52
          + noise((u + v) * 59, (v - u) * 67, seed + 12) * .30 + fine * .18;
        const freckle = smooth(.59, .96, speckle) * (.24 + cluster * .76);
        const purple = smooth(.22, .88, noise((u + v) * 6, (v - u) * 7, seed + 17));
        const earthy = smooth(.22, .88, noise((u - v) * 9, (u + v) * 8, seed + 29));
        const pores = smooth(.93, 1, fine) * (.20 + broad * .55);
        shade = .995 - blotch * .095 - freckle * .11 - purple * .025 - earthy * .027 - pores * .04;
        relief = .52 + broad * .021 - pores * .037 - freckle * .012;
        red = 1 - earthy * .017; green = 1 - purple * .036 - freckle * .019;
        blue = 1 - earthy * .036 - freckle * .045 - blotch * .012;
        rough = surface === 'wet' ? .23 + broad * .27 : .77 + broad * .17;
        if (surface === 'wet') {
          const blister = smooth(.73, .93, noise(u * 33 + warp, v * 37, seed + 23)) * (.25 + cluster * .75);
          shade += blister * .025; relief += blister * .10; rough -= blister * .07;
        }
      } else if (surface === 'cloth') {
        const warpThread = Math.pow(Math.abs(Math.sin(u * 169)), 5);
        const weftThread = Math.pow(Math.abs(Math.sin(v * 173)), 5);
        const diagonal = Math.sin((u + v) * 181) * .006;
        const stain = smooth(.37, .68, broad);
        const seam = ridge(u, .10, .009) + ridge(u, .91, .009);
        const stitch = (ridge(u, .116, .005) + ridge(u, .894, .005)) * smooth(.2, .8, Math.sin(v * 140));
        const fray = smooth(.62, .8, noise(u * 12, v * 26, seed + 11));
        shade = .98 - stain * .22 - (warpThread + weftThread) * .010 + diagonal - seam * .09 + stitch * .04 + fray * .06;
        relief = .47 + (warpThread + weftThread) * .007 - seam * .065 + stitch * .055 + fray * .009;
        red = 1; green = .99; blue = .965; rough = .92 + fine * .07;
      } else if (surface === 'metal') {
        const rust = smooth(.53, .72, broad);
        const scratch = ridge(Math.sin(u * 225 + v * 18 + warp * 5), .92, .055) * smooth(.38, .66, noise(u * 8, v * 17, seed + 13));
        const scoring = ridge(Math.sin(v * 22 + u * 8 + warp * 3), .97, .03);
        const edge = Math.pow(Math.max(Math.abs(u - .5), Math.abs(v - .5)) * 2, 15);
        shade = .86 + broad * .10 - rust * .30 + scratch * .18 - scoring * .15 + edge * .07;
        red = 1; green = 1 - rust * .23; blue = 1 - rust * .37;
        relief = .51 + rust * .10 - scratch * .20 - scoring * .13 + fine * .045;
        rough = .46 + rust * .42 + broad * .09 - scratch * .18;
        metal = .78 * (1 - rust) + scratch * .12;
      } else if (surface === 'stone') {
        const edge = fracture(u * 6 + warp * .3, v * 6 + warp * .4, seed);
        const fissure = 1 - smooth(.015, .07, edge);
        const shoulder = ridge(edge, .10, .055);
        const pit = smooth(.78, .94, fine) * smooth(.43, .65, broad);
        shade = .82 + broad * .21 - fissure * .34 + shoulder * .04 - pit * .12;
        relief = .51 + broad * .20 - fissure * .40 - pit * .16;
        red = .985; green = 1; blue = .985; rough = .90 + fine * .09;
      } else if (surface === 'bone') {
        const age = smooth(.23, .86, broad);
        const grainPore = noise(u * 71, v * 79, seed + 9) * .58
          + noise((u + v) * 53, (u - v) * 61, seed + 13) * .42;
        const pore = smooth(.59, .96, grainPore);
        shade = .995 - age * .075 - pore * .065;
        relief = .51 + broad * .02 - pore * .05;
        red = 1; green = 1 - age * .012; blue = 1 - age * .042; rough = .78 + broad * .14;
      } else if (surface === 'leather') {
        const edge = fracture(u * 33, v * 25, seed);
        const grainLine = 1 - smooth(.01, .12, edge);
        const crease = ridge(Math.sin(v * 16 + u * 7 + warp * 4), .84, .035);
        const polish = smooth(.54, .73, broad);
        shade = .90 + broad * .12 - grainLine * .12 - crease * .19 + polish * .04;
        relief = .52 - grainLine * .13 - crease * .23 + broad * .025;
        red = 1; green = .975; blue = .94; rough = .84 - polish * .22;
      } else if (surface === 'root') {
        const flow = u * 73 + warp * 5 + Math.sin(v * 8) * 1.8;
        const furrow = Math.pow(Math.abs(Math.sin(flow)), 9);
        const split = ridge(Math.sin(flow * .31 + v * 2), .97, .04);
        const grainLine = Math.sin(u * 240 + warp * 11) * .03;
        shade = .91 + broad * .12 - furrow * .18 - split * .16 + grainLine;
        relief = .57 - furrow * .17 - split * .26 + grainLine * .7;
        red = 1; green = .975; blue = .94; rough = .91 + broad * .07;
      }
      const p = ((oy + GUTTER + py) * WIDTH + ox + GUTTER + px) * 4;
      color[p] = Math.round(clamp(shade * red) * 255);
      color[p + 1] = Math.round(clamp(shade * green) * 255);
      color[p + 2] = Math.round(clamp(shade * blue) * 255);
      color[p + 3] = 255;
      height[p] = height[p + 1] = height[p + 2] = Math.round(clamp(relief) * 255); height[p + 3] = 255;
      response[p] = 255; response[p + 1] = Math.round(clamp(rough) * 255); response[p + 2] = Math.round(clamp(metal) * 255); response[p + 3] = 255;
    }
    // Duplicate each tile's nearest texel into its gutter, including corners.
    // Bilinear filtering and the first mip levels cannot sample another surface.
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      if (x >= GUTTER && x < CELL - GUTTER && y >= GUTTER && y < CELL - GUTTER) continue;
      const sx = clamp(x, GUTTER, CELL - GUTTER - 1), sy = clamp(y, GUTTER, CELL - GUTTER - 1);
      const dst = ((oy + y) * WIDTH + ox + x) * 4, src = ((oy + sy) * WIDTH + ox + sx) * 4;
      for (const bytes of [color, height, response]) for (let c = 0; c < 4; c++) bytes[dst + c] = bytes[src + c];
    }
  }
  return { width: WIDTH, height: HEIGHT, color, heightMap: height, response };
}

/** One material response for the entire vertex-colored batch. Metalness lives
 * only in the metal tile; flesh and fabric remain nonmetallic in this batch. */
export function detailMaterial(T) {
  if (materialCache.has(T)) return materialCache.get(T);
  if (typeof T.DataTexture !== 'function') { materialCache.set(T, {}); return materialCache.get(T); }
  const probe = new T.DataTexture(new Uint8Array(4), 1, 1);
  const realTexture = probe.isDataTexture === true;
  probe.dispose?.();
  // fakethree exposes a permissive CanvasTexture substitute, not a texture API.
  if (!realTexture) { materialCache.set(T, {}); return materialCache.get(T); }
  const pixels = generateDetailPixels();
  function texture(data, name, srgb = false) {
    const t = new T.DataTexture(data, pixels.width, pixels.height, T.RGBAFormat, T.UnsignedByteType);
    t.name = 'zombie-concepts-' + name;
    if (srgb && T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;
    t.magFilter = T.LinearFilter;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
    return t;
  }
  const response = texture(pixels.response, 'surface-response');
  const options = { map: texture(pixels.color, 'wear', true), bumpMap: texture(pixels.heightMap, 'relief'), bumpScale: .0055,
    roughnessMap: response, metalnessMap: response, roughness: 1, metalness: 1 };
  materialCache.set(T, options);
  return options;
}

/** Remap source UVs without touching shared geometry. Geometry without UVs uses
 * its two longest local axes (rag faces), so thin surfaces keep useful detail. */
export function detailUV(T, geometry, surface = 'skin') {
  const position = geometry.getAttribute?.('position') || geometry.attributes?.position;
  const source = geometry.getAttribute?.('uv') || geometry.attributes?.uv;
  const count = Number.isFinite(position?.count) ? position.count : 0;
  const out = new Float32Array(count * 2);
  const slot = Math.max(0, DETAIL_SURFACES.indexOf(surface));
  const ox = (slot % COLS) * CELL + GUTTER + .5, oy = Math.floor(slot / COLS) * CELL + GUTTER + .5;
  const extent = INSIDE - 1;
  const mins = [Infinity, Infinity, Infinity], maxs = [-Infinity, -Infinity, -Infinity];
  const uvReady = source?.count === count && typeof source.getX === 'function';
  const xyz = (i, axis) => axis === 0 ? position.getX(i) : axis === 1 ? position.getY(i) : position.getZ(i);
  let axes;
  if (!uvReady) {
    for (let i = 0; i < count; i++) for (let a = 0; a < 3; a++) { const n = xyz(i, a); if (Number.isFinite(n)) { mins[a] = Math.min(mins[a], n); maxs[a] = Math.max(maxs[a], n); } }
    axes = [0, 1, 2].sort((a, b) => (maxs[b] - mins[b]) - (maxs[a] - mins[a]));
    // Retain conventional horizontal/vertical orientation for XY cloth faces.
    if (axes[0] === 1 && axes[1] === 0) axes = [0, 1, 2];
  }
  for (let i = 0; i < count; i++) {
    let u, v;
    if (uvReady) { u = source.getX(i); v = source.getY(i); }
    else { u = (xyz(i, axes[0]) - mins[axes[0]]) / (maxs[axes[0]] - mins[axes[0]] || 1); v = (xyz(i, axes[1]) - mins[axes[1]]) / (maxs[axes[1]] - mins[axes[1]] || 1); }
    out[i * 2] = (ox + clamp(Number.isFinite(u) ? u : .5) * extent) / WIDTH;
    out[i * 2 + 1] = (oy + clamp(Number.isFinite(v) ? v : .5) * extent) / HEIGHT;
  }
  return out;
}

// world/training-textures.js — AG-405: Shared procedural PBR texture library for the Training Ground.
// Every material set produces matched, tileable, deterministic PBR maps (albedo sRGB, tangent-space normalMap,
// packed linear ORM: R = AO, G = Roughness, B = Metalness) strictly following docs/art-direction.md
// (Military + Industrial/Research families, <45% saturation on natural/worn bases) and docs/asset-principles.md.
//
// Performance & WebGPU notes:
// - Cached per THREE instance (built once on first Training entry, reused across every Training module).
// - Packed ORM shares one DataTexture across roughnessMap, metalnessMap and aoMap (half the texture memory and
//   identical shader signature across PBR materials so trainingWarmCompile shares WGSL programs).
// - DataTextures are stored bottom-up (flipY = false) matching studio/zombie-atlas.js WebGPU conventions.
// - Node/fakethree safe: returns null textures gracefully when DataTexture or TypedArrays are stubbed/absent.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

// Fast deterministic integer hash -> [0, 1)
function hash2i(ix, iy, seed) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// Seamless periodic 2D value noise on [0, 1) x [0, 1) with integer periods px, py -> [0, 1)
export function tileNoise(u, v, px, py, seed = 1) {
  const x = u * px, y = v * py;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const ix0 = ((x0 % px) + px) % px, ix1 = (ix0 + 1) % px;
  const iy0 = ((y0 % py) + py) % py, iy1 = (iy0 + 1) % py;
  const n00 = hash2i(ix0, iy0, seed), n10 = hash2i(ix1, iy0, seed);
  const n01 = hash2i(ix0, iy1, seed), n11 = hash2i(ix1, iy1, seed);
  return lerp(lerp(n00, n10, ux), lerp(n01, n11, ux), uy);
}

// Seamless periodic multi-octave FBM -> [0, 1]
export function tileFbm(u, v, px, py, seed = 1, octaves = 3, gain = 0.5) {
  let sum = 0, amp = 0.5, norm = 0, fx = px, fy = py;
  for (let i = 0; i < octaves; i++) {
    sum += tileNoise(u, v, fx, fy, seed + i * 31) * amp;
    norm += amp;
    amp *= gain;
    fx <<= 1;
    fy <<= 1;
  }
  return norm > 0 ? sum / norm : 0.5;
}

// Seamless periodic Worley (cell distance + cell id) for spangle/crumb/pebble patterns
function tileWorley(u, v, px, py, seed = 7) {
  const x = u * px, y = v * py;
  const cx = Math.floor(x), cy = Math.floor(y);
  let d1 = 9, d2 = 9, id = 0;
  for (let oy = -1; oy <= 1; oy++) {
    const ny = ((cy + oy) % py + py) % py;
    for (let ox = -1; ox <= 1; ox++) {
      const nx = ((cx + ox) % px + px) % px;
      const rx = hash2i(nx, ny, seed);
      const ry = hash2i(nx, ny, seed + 97);
      const dx = (cx + ox + rx) - x;
      const dy = (cy + oy + ry) - y;
      const d = dx * dx + dy * dy;
      if (d < d1) {
        d2 = d1; d1 = d;
        id = hash2i(nx, ny, seed + 211);
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return { d1: Math.sqrt(d1), edge: Math.sqrt(d2) - Math.sqrt(d1), id };
}

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Flip canvas-order (row 0 = top) RGBA buffer to bottom-up DataTexture order (row 0 = bottom, flipY = false)
export function flipRowsRGBA(src, w, h) {
  const out = new Uint8Array(src.length);
  const row = w * 4;
  for (let y = 0; y < h; y++) {
    out.set(src.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
  }
  return out;
}

// Sobel tangent-space OpenGL normal map from a canvas-order Float32Array heightfield.
// Verified WebGPU convention (studio/zombie-atlas.js): nx = -dX * strength, ny = +dY * strength, nz = 1.
export function heightToNormalRGBA(height, w, h, strength = 2.4, wrapX = true, wrapY = true) {
  const nrm = new Uint8Array(w * h * 4);
  const w1 = w - 1, h1 = h - 1;
  const pow2W = wrapX && (w & w1) === 0;
  for (let y = 0; y < h; y++) {
    const ym = y > 0 ? y - 1 : (wrapY ? h1 : 0);
    const yp = y < h1 ? y + 1 : (wrapY ? 0 : h1);
    const r0 = ym * w, r1 = y * w, r2 = yp * w;
    for (let x = 0; x < w; x++) {
      const xm = pow2W ? ((x - 1) & w1) : (x > 0 ? x - 1 : (wrapX ? w1 : 0));
      const xp = pow2W ? ((x + 1) & w1) : (x < w1 ? x + 1 : (wrapX ? 0 : w1));
      const tl = height[r0 + xm], t = height[r0 + x], tr = height[r0 + xp];
      const l = height[r1 + xm], r = height[r1 + xp];
      const bl = height[r2 + xm], b = height[r2 + x], br = height[r2 + xp];
      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);
      const nx = -dX * strength;
      const ny = dY * strength;
      const inv = 1 / (Math.sqrt(nx * nx + ny * ny + 1.0) || 1);
      const o = (r1 + x) * 4;
      nrm[o] = ((nx * inv * 0.5 + 0.5) * 255 + 0.5) | 0;
      nrm[o + 1] = ((ny * inv * 0.5 + 0.5) * 255 + 0.5) | 0;
      nrm[o + 2] = ((inv * 0.5 + 0.5) * 255 + 0.5) | 0;
      nrm[o + 3] = 255;
    }
  }
  return nrm;
}

// Wrap raw canvas-order RGBA pixel array into a Three.js DataTexture (bottom-up rows, flipY=false).
export function makeDataTexture(T, rgbaCanvasOrder, w, h, {
  name = 'training-pbr',
  srgb = false,
  repeat = true,
  aniso = 8,
  flip = true,
} = {}) {
  if (!T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  const buf = flip ? flipRowsRGBA(rgbaCanvasOrder, w, h) : new Uint8Array(rgbaCanvasOrder);
  const tex = new T.DataTexture(buf, w, h, T.RGBAFormat, T.UnsignedByteType);
  tex.name = name;
  if (srgb && T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping;
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

// Fast pixel-buffer PBR builder: evaluates each pixel -> { r, g, b, h, ao, rgh, met } (reusing scratch `out` if returned/filled)
function synthPBRPixels(w, h, evalFn, { normalStrength = 2.4, wrapX = true, wrapY = true } = {}) {
  const col = new Uint8Array(w * h * 4);
  const orm = new Uint8Array(w * h * 4);
  const height = new Float32Array(w * h);
  const out = { r: 0, g: 0, b: 0, a: 255, h: 0.5, ao: 1.0, rgh: 0.6, met: 0.0 };
  for (let y = 0; y < h; y++) {
    const v = y / h;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      out.a = 255;
      const p = evalFn(u, v, x, y, out) || out;
      const idx = row + x;
      const o = idx * 4;
      col[o] = clamp((p.r + 0.5) | 0, 0, 255);
      col[o + 1] = clamp((p.g + 0.5) | 0, 0, 255);
      col[o + 2] = clamp((p.b + 0.5) | 0, 0, 255);
      col[o + 3] = p.a !== undefined ? clamp((p.a + 0.5) | 0, 0, 255) : 255;
      height[idx] = p.h;
      orm[o] = clamp(((p.ao ?? 1.0) * 255 + 0.5) | 0, 25, 255);
      orm[o + 1] = clamp((clamp(p.rgh ?? 0.6, 0.06, 0.99) * 255 + 0.5) | 0, 16, 253);
      orm[o + 2] = clamp((clamp(p.met ?? 0.0, 0.0, 1.0) * 255 + 0.5) | 0, 0, 255);
      orm[o + 3] = 255;
    }
  }
  const nrm = heightToNormalRGBA(height, w, h, normalStrength, wrapX, wrapY);
  return { col, nrm, orm, w, h };
}

// Fast precomputed periodic FBM grid (bilinear lookup -> 6-10x faster for 256/512 textures with identical smooth FBM!)
export function makeFbmGrid(gridSize, px, py, seed, octaves = 3, gain = 0.5) {
  const buf = new Float32Array(gridSize * gridSize);
  for (let y = 0; y < gridSize; y++) {
    const v = y / gridSize;
    for (let x = 0; x < gridSize; x++) {
      buf[y * gridSize + x] = tileFbm(x / gridSize, v, px, py, seed, octaves, gain);
    }
  }
  const mask = gridSize - 1;
  return (u, v) => {
    const gx = u * gridSize, gy = v * gridSize;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const ix0 = x0 & mask, ix1 = (ix0 + 1) & mask;
    const iy0 = y0 & mask, iy1 = (iy0 + 1) & mask;
    const r0 = iy0 * gridSize, r1 = iy1 * gridSize;
    const a = buf[r0 + ix0], b = buf[r0 + ix1];
    const c = buf[r1 + ix0], d = buf[r1 + ix1];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  };
}

// Fast precomputed periodic Worley grid (d1, edge, id) for spangle/crumb/pebble patterns
export function makeWorleyGrid(gridSize, px, py, seed = 7) {
  const n = gridSize * gridSize;
  const d1Buf = new Float32Array(n);
  const edgeBuf = new Float32Array(n);
  const idBuf = new Float32Array(n);
  for (let y = 0; y < gridSize; y++) {
    const v = y / gridSize;
    for (let x = 0; x < gridSize; x++) {
      const w = tileWorley(x / gridSize, v, px, py, seed);
      const i = y * gridSize + x;
      d1Buf[i] = w.d1;
      edgeBuf[i] = w.edge;
      idBuf[i] = w.id;
    }
  }
  const mask = gridSize - 1;
  const out = { d1: 0, edge: 0, id: 0 };
  return (u, v) => {
    const gx = u * gridSize, gy = v * gridSize;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const ix0 = x0 & mask, ix1 = (ix0 + 1) & mask;
    const iy0 = y0 & mask, iy1 = (iy0 + 1) & mask;
    const r0 = iy0 * gridSize, r1 = iy1 * gridSize;
    const i00 = r0 + ix0, i10 = r0 + ix1, i01 = r1 + ix0, i11 = r1 + ix1;
    out.d1 = lerp(lerp(d1Buf[i00], d1Buf[i10], fx), lerp(d1Buf[i01], d1Buf[i11], fx), fy);
    out.edge = lerp(lerp(edgeBuf[i00], edgeBuf[i10], fx), lerp(edgeBuf[i01], edgeBuf[i11], fx), fy);
    out.id = idBuf[iy0 * gridSize + ix0];
    return out;
  };
}

// =========================================================================
// 1. ARCHITECTURAL TILE SETS (Range Floor, Build Floor, Facility Wall)
// =========================================================================
function buildTilePixels({ baseHex, groutHex, mode = 'rangeFloor', size = 512 }) {
  const parseHex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [br, bg, bb] = parseHex(baseHex);
  const [gr, gg, gb] = parseHex(groutHex);
  const w = size, h = size;
  const n = 4; // 4x4 tiles = 4 m x 4 m repeat (1 m per tile)
  const tilePx = w / n;
  const groutHalf = mode === 'wall' ? Math.max(2, Math.round(w * 0.0022)) : Math.max(2, Math.round(w * 0.0026));
  const chamfW = Math.max(2, Math.round(w * 0.0032));

  const rnd = makeRng(mode === 'wall' ? 701 : mode === 'buildFloor' ? 709 : 703);
  const tileTone = [];
  const tileWarm = [];
  const tileRoughOff = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    tileTone.push((rnd() - 0.5) * (mode === 'wall' ? 9 : 13));
    tileWarm.push((rnd() - 0.5) * 4.5);
    tileRoughOff.push((rnd() - 0.5) * 0.06);
  }
  const chips = [];
  const chipCount = mode === 'wall' ? 14 : 26;
  for (let i = 0; i < chipCount; i++) {
    const ci = Math.floor(rnd() * n), cj = Math.floor(rnd() * n);
    const ex = ci * tilePx + (rnd() < 0.5 ? groutHalf + 1 : tilePx - groutHalf - 1);
    const ey = cj * tilePx + (rnd() < 0.5 ? groutHalf + 1 : tilePx - groutHalf - 1);
    chips.push({ x: ex, y: ey, r: (w / 512) * (1.8 + rnd() * 2.8) });
  }

  const col = new Uint8Array(w * h * 4);
  const orm = new Uint8Array(w * h * 4);
  const height = new Float32Array(w * h);
  const seed = mode === 'wall' ? 17 : mode === 'buildFloor' ? 29 : 11;
  const macroGrid = makeFbmGrid(128, 8, 8, seed, 3, 0.55);
  const microGrid = makeFbmGrid(128, 32, 32, seed + 53, 2, 0.5);
  const scuffGrid = makeFbmGrid(64, mode === 'wall' ? 12 : 10, mode === 'wall' ? 12 : 10, seed + 301, 2, 0.5);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    const tj = Math.min(n - 1, Math.floor(y / tilePx));
    const ly = y - tj * tilePx;
    const dyEdge = Math.min(ly, tilePx - 1 - ly);
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const ti = Math.min(n - 1, Math.floor(x / tilePx));
      const lx = x - ti * tilePx;
      const dxEdge = Math.min(lx, tilePx - 1 - lx);
      const dEdge = Math.min(dxEdge, dyEdge);
      const tidx = tj * n + ti;

      const macro = macroGrid(u, v) - 0.5;
      const micro = microGrid(u, v) - 0.5;
      const fine = hash2i(x, y, seed + 101) - 0.5;

      let r, g, b, hv, ao, rgh;
      if (dEdge < groutHalf) {
        const gDepth = 1 - (dEdge / groutHalf);
        const grit = micro * 18 + fine * 14;
        r = gr * 0.88 + grit;
        g = gg * 0.88 + grit;
        b = gb * 0.88 + grit;
        hv = 0.08 + (1 - gDepth) * 0.08 + fine * 0.04;
        ao = 0.52 + (1 - gDepth) * 0.14;
        rgh = 0.94 + fine * 0.04;
      } else {
        const chamfT = sstep(groutHalf, groutHalf + chamfW, dEdge);
        const bevelSlope = 1 - chamfT;
        let mottle = macro * (mode === 'wall' ? 10 : 18);
        let speck = 0;
        if (mode === 'rangeFloor') {
          const fl = hash2i(x >> 1, y >> 1, seed + 157);
          if (fl > 0.93) speck = -20 * (fl - 0.93) / 0.07;
          else if (fl < 0.06) speck = 14 * (0.06 - fl) / 0.06;
        } else if (mode === 'buildFloor') {
          const ang = Math.atan2(ly - tilePx * 0.5, lx - tilePx * 0.5);
          const rad = Math.hypot(lx - tilePx * 0.5, ly - tilePx * 0.5) / (tilePx * 0.5);
          mottle += Math.sin(rad * 18 + ang * 2 + tidx) * 2.5 * (1 - rad * 0.4);
          const fl = hash2i(x >> 1, y >> 1, seed + 173);
          if (fl > 0.90) speck = -24 * (fl - 0.90) / 0.10;
          else if (fl < 0.07) speck = 16 * (0.07 - fl) / 0.07;
        } else {
          const fl = hash2i(x, y, seed + 191);
          if (fl > 0.95) speck = -9;
        }

        const tone = tileTone[tidx];
        const warm = tileWarm[tidx];
        const edgeDust = bevelSlope * (mode === 'wall' ? 12 : 18);
        r = br + tone + warm + mottle + speck + micro * 5 + fine * 3 - edgeDust;
        g = bg + tone + mottle + speck + micro * 5 + fine * 3 - edgeDust;
        b = bb + tone - warm * 0.7 + mottle + speck + micro * 5 + fine * 3 - edgeDust;

        const sc = scuffGrid(u, v);
        const glazeWave = mode === 'wall'
          ? (sc - 0.5) * 0.045
          : macro * 0.065 + micro * 0.032 + fine * 0.015;
        hv = 0.56 + chamfT * 0.28 + glazeWave;
        ao = 0.82 + chamfT * 0.18 - (mode === 'buildFloor' ? Math.max(0, -macro) * 0.08 : 0);

        if (mode === 'wall') {
          rgh = 0.58 + tileRoughOff[tidx] + Math.abs(macro) * 0.10 + bevelSlope * 0.18 + fine * 0.03;
        } else if (mode === 'rangeFloor') {
          const scuff = sstep(0.52, 0.84, sc);
          rgh = 0.56 + tileRoughOff[tidx] + scuff * 0.22 + Math.abs(micro) * 0.08 + bevelSlope * 0.18;
        } else {
          const scuff = sstep(0.45, 0.82, sc);
          rgh = 0.64 + tileRoughOff[tidx] + scuff * 0.22 + Math.abs(micro) * 0.09 + bevelSlope * 0.16;
        }
      }

      const o = (y * w + x) * 4;
      col[o] = clamp(Math.round(r), 0, 255);
      col[o + 1] = clamp(Math.round(g), 0, 255);
      col[o + 2] = clamp(Math.round(b), 0, 255);
      col[o + 3] = 255;
      height[y * w + x] = hv;
      orm[o] = clamp(Math.round(ao * 255), 30, 255);
      orm[o + 1] = clamp(Math.round(clamp(rgh, 0.12, 0.98) * 255), 25, 252);
      orm[o + 2] = 5;
      orm[o + 3] = 255;
    }
  }

  // Stamp small corner mortar chips into height/color/orm
  for (const ch of chips) {
    const r0 = Math.ceil(ch.r);
    for (let dy = -r0; dy <= r0; dy++) {
      const py = ((Math.round(ch.y) + dy) % h + h) % h;
      for (let dx = -r0; dx <= r0; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > ch.r) continue;
        const px = ((Math.round(ch.x) + dx) % w + w) % w;
        const k = 1 - d / ch.r;
        const idx = py * w + px, o = idx * 4;
        col[o] = Math.round(lerp(col[o], gr * 0.86, k * 0.85));
        col[o + 1] = Math.round(lerp(col[o + 1], gg * 0.86, k * 0.85));
        col[o + 2] = Math.round(lerp(col[o + 2], gb * 0.86, k * 0.85));
        height[idx] = lerp(height[idx], 0.14, k * 0.85);
        orm[o] = Math.min(orm[o], Math.round(lerp(255, 145, k)));
        orm[o + 1] = Math.max(orm[o + 1], 235);
      }
    }
  }

  const strength = mode === 'wall' ? 2.8 : mode === 'rangeFloor' ? 3.2 : 3.6;
  const nrm = heightToNormalRGBA(height, w, h, strength, true, true);
  return { col, nrm, orm, w, h };
}

// =========================================================================
// 2. CORRUGATED GALVANIZED HANGAR SIDING (512x512, 2m x 2m repeat)
// =========================================================================
function buildSidingPixels(size = 512) {
  const gSpangle = makeWorleyGrid(64, 28, 28, 41);
  const gStreak = makeFbmGrid(64, 32, 4, 47, 3);
  const gGrime = makeFbmGrid(64, 6, 6, 53, 3);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    // 8 trapezoidal ribs across 2 m (25 cm rib pitch)
    const phase = (u * 8) % 1;
    let rib;
    if (phase < 0.22) rib = 0.0;
    else if (phase < 0.34) rib = (phase - 0.22) / 0.12;
    else if (phase < 0.66) rib = 1.0;
    else if (phase < 0.78) rib = 1.0 - (phase - 0.66) / 0.12;
    else rib = 0.0;

    // Horizontal sheet overlap lap-seam at v = 0.50 with fastener heads along crests
    const lapDist = Math.abs(v - 0.5);
    const lapShadow = lapDist < 0.008 ? (1 - lapDist / 0.008) : 0;
    const lapStep = v >= 0.5 ? 0.08 : 0.0;
    let rivet = 0;
    if (Math.abs(v - 0.482) < 0.012 && Math.abs(phase - 0.5) < 0.07) {
      const dr = Math.hypot((phase - 0.5) / 0.07, (v - 0.482) / 0.012);
      if (dr < 1) rivet = Math.sqrt(Math.max(0, 1 - dr * dr));
    }

    // Galvanized zinc spangle + subtle vertical rain/condensation streak patina
    const spId = gSpangle(u, v).id;
    const streak = gStreak(u, v) - 0.5;
    const grime = gGrime(u, v);
    const dustInTrough = (1 - rib) * (0.45 + grime * 0.45);

    const zincShift = (spId - 0.5) * 12;
    const base = 114 + rib * 16 + zincShift + streak * 12 - dustInTrough * 16 - lapShadow * 26 + rivet * 12;
    out.r = base * 0.96;
    out.g = base * 1.01;
    out.b = base * 1.04;
    out.h = 0.24 + rib * 0.48 + lapStep * 0.6 - lapShadow * 0.12 + rivet * 0.06 + (spId - 0.5) * 0.015;
    out.ao = clamp(0.66 + rib * 0.34 - lapShadow * 0.28, 0.40, 1.0);
    out.rgh = clamp(0.60 + (1 - rib) * 0.18 + dustInTrough * 0.12 + (spId - 0.5) * 0.06, 0.48, 0.90);
    out.met = clamp(0.46 - dustInTrough * 0.16 + rivet * 0.08, 0.24, 0.64);
    return out;
  }, { normalStrength: 2.1 });
}

// =========================================================================
// 3. STRUCTURAL METALS (Dark Steel, Brushed Light Steel, Roof Steel, Shutter Slat, Galvanized Duct)
// =========================================================================
function buildMetalPixels(kind, size = 512) {
  const cfg = {
    steelDark:  { r: 84,  g: 91,  b: 98,  rgh: 0.54, rghSpan: 0.16, met: 0.42, brushU: 4, brushV: 48, seed: 83,  nrm: 1.3 },
    steelLight: { r: 162, g: 170, b: 176, rgh: 0.31, rghSpan: 0.15, met: 0.88, brushU: 4, brushV: 64, seed: 97,  nrm: 1.3 },
    roofSteel:  { r: 146, g: 155, b: 161, rgh: 0.60, rghSpan: 0.14, met: 0.26, brushU: 16, brushV: 16, seed: 109, nrm: 1.4 },
    shutterSlat:{ r: 138, g: 146, b: 152, rgh: 0.55, rghSpan: 0.14, met: 0.58, brushU: 48, brushV: 6, seed: 127, nrm: 1.7 },
    galvDuct:   { r: 130, g: 140, b: 144, rgh: 0.38, rghSpan: 0.16, met: 0.84, brushU: 6, brushV: 32, seed: 139, nrm: 1.6 },
  }[kind];

  const gBrush = makeFbmGrid(64, cfg.brushU, cfg.brushV, cfg.seed, 3);
  const gMottle = makeFbmGrid(64, 6, 6, cfg.seed + 19, 3);
  const gSp = kind === 'galvDuct' ? makeWorleyGrid(64, 24, 24, cfg.seed + 71) : null;
  const gRub = kind === 'shutterSlat' ? makeFbmGrid(64, 24, 3, cfg.seed + 61, 2) : null;

  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const brush = gBrush(u, v) - 0.5;
    const mottle = gMottle(u, v) - 0.5;
    const micro = tileNoise(u, v, 64, 64, cfg.seed + 41) - 0.5;
    let extraTone = 0, extraH = 0, extraRgh = 0, extraMet = 0, ao = 1.0;

    if (gSp) {
      const spId = gSp(u, v).id;
      extraTone = (spId - 0.5) * 26;
      extraRgh = (spId - 0.5) * 0.12;
      extraH = (spId - 0.5) * 0.04;
      const seam = Math.min(Math.abs(v - 0.5), Math.min(v, 1 - v));
      if (seam < 0.012) {
        const k = 1 - seam / 0.012;
        extraH -= k * 0.22;
        ao -= k * 0.32;
        extraTone -= k * 24;
      }
    } else if (gRub) {
      const rub = sstep(0.68, 0.92, gRub(u, v));
      extraTone = rub * 16;
      extraRgh = -rub * 0.11;
      extraMet = rub * 0.14;
      extraH = -rub * 0.05;
    } else if (kind === 'roofSteel') {
      const pebble = tileNoise(u, v, 80, 80, cfg.seed + 55) - 0.5;
      extraH = pebble * 0.08 + mottle * 0.05;
      extraTone = mottle * 16 + pebble * 5;
    } else {
      const scratch = sstep(0.76, 0.94, tileNoise(u, v, 12, 72, cfg.seed + 89));
      extraTone = scratch * 18;
      extraRgh = -scratch * 0.12;
      extraH = -scratch * 0.07;
    }

    const delta = brush * 14 + mottle * 16 + micro * 5 + extraTone;
    out.r = cfg.r + delta;
    out.g = cfg.g + delta;
    out.b = cfg.b + delta * 1.03;
    out.h = 0.5 + brush * 0.09 + mottle * 0.06 + micro * 0.04 + extraH;
    out.ao = clamp(ao - Math.max(0, -mottle) * 0.12, 0.45, 1.0);
    out.rgh = clamp(cfg.rgh + mottle * cfg.rghSpan - brush * 0.06 + extraRgh, 0.18, 0.88);
    out.met = clamp(cfg.met + extraMet - Math.max(0, -mottle) * 0.08, 0.12, 0.96);
    return out;
  }, { normalStrength: cfg.nrm });
}

// =========================================================================
// 4. MILITARY OLIVE PAINTED STEEL (Gate, Infirmary, Cabinet, Bench Panel, Lockers, Console)
// =========================================================================
function buildOliveSteelPixels(size = 512, tint = [84, 98, 76], seed = 151) {
  const gCoat = makeFbmGrid(64, 8, 8, seed + 17, 3);
  const gBrush = makeFbmGrid(64, 6, 36, seed + 29, 2);
  const gScuff = makeFbmGrid(64, 10, 8, seed + 41, 3);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const pebble = tileNoise(u, v, 84, 84, seed) - 0.5;
    const coat = gCoat(u, v) - 0.5;
    const brush = gBrush(u, v) - 0.5;
    const scuff = sstep(0.60, 0.88, gScuff(u, v));
    const microSpeck = sstep(0.84, 0.94, tileNoise(u, v, 44, 44, seed + 73) * tileNoise(u, v, 16, 16, seed + 91));

    let r = tint[0] + coat * 14 + brush * 8 + pebble * 5 - scuff * 9;
    let g = tint[1] + coat * 14 + brush * 8 + pebble * 5 - scuff * 9;
    let b = tint[2] + coat * 12 + brush * 7 + pebble * 5 - scuff * 7;
    r = lerp(r, 134, microSpeck * 0.52);
    g = lerp(g, 140, microSpeck * 0.52);
    b = lerp(b, 144, microSpeck * 0.52);

    out.r = r; out.g = g; out.b = b;
    out.h = 0.52 + pebble * 0.055 + coat * 0.035 + brush * 0.03 - microSpeck * 0.07 - scuff * 0.025;
    out.ao = clamp(1.0 - scuff * 0.12 - microSpeck * 0.06, 0.72, 1.0);
    out.rgh = clamp(0.66 + coat * 0.12 + scuff * 0.14 - microSpeck * 0.20, 0.38, 0.90);
    out.met = clamp(0.16 + microSpeck * 0.42, 0.10, 0.68);
    return out;
  }, { normalStrength: 1.35 });
}

// =========================================================================
// 5. INDUSTRIAL HAZARD CHEVRONS (Trim Metal & Weathered Floor Epoxy)
// =========================================================================
function buildHazardPixels(mode = 'trim') {
  const w = 512, h = mode === 'trim' ? 128 : 512;
  const seed = mode === 'trim' ? 181 : 193;
  const gGrain = makeFbmGrid(64, mode === 'trim' ? 32 : 24, mode === 'trim' ? 8 : 24, seed, 3);
  const gWear = makeFbmGrid(64, 10, mode === 'trim' ? 4 : 10, seed + 59, 3);
  const gScuff = makeFbmGrid(64, 18, mode === 'trim' ? 6 : 18, seed + 83, 2);
  return synthPBRPixels(w, h, (u, v, _x, _y, out) => {
    const diag = mode === 'trim' ? (u * 4 + v) % 1 : (u * 2 + v * 2) % 1;
    const isBlack = diag >= 0.5;
    const stripeEdge = Math.min(Math.abs(diag - 0.5), Math.min(diag, 1 - diag));
    const grain = gGrain(u, v) - 0.5;
    const micro = tileNoise(u, v, 64, mode === 'trim' ? 16 : 64, seed + 23) - 0.5;
    const wearField = gWear(u, v);
    const edgeWear = sstep(0.56, 0.78, wearField + (stripeEdge < 0.06 ? 0.16 : 0));
    const gritScuff = sstep(0.64, 0.90, gScuff(u, v));

    let r = isBlack ? 26 : 214;
    let g = isBlack ? 29 : 171;
    let b = isBlack ? 31 : 24;
    r += grain * 18 + micro * 6;
    g += grain * 16 + micro * 5;
    b += grain * 10 + micro * 4;

    let met = 0.06, rgh = isBlack ? 0.58 : 0.48, hv = 0.54 + micro * 0.04 + (isBlack ? -0.01 : 0.02);
    if (mode === 'trim') {
      r = lerp(r, 128, edgeWear * 0.55);
      g = lerp(g, 134, edgeWear * 0.55);
      b = lerp(b, 138, edgeWear * 0.55);
      r = lerp(r, 42, gritScuff * 0.35);
      g = lerp(g, 40, gritScuff * 0.35);
      b = lerp(b, 36, gritScuff * 0.35);
      met = clamp(0.10 + edgeWear * 0.58, 0.05, 0.80);
      rgh = clamp(rgh + gritScuff * 0.28 - edgeWear * 0.14, 0.30, 0.90);
      hv -= edgeWear * 0.12;
    } else {
      const conc = 156 + micro * 24 + grain * 18;
      r = lerp(r, conc, edgeWear * 0.52);
      g = lerp(g, conc + 2, edgeWear * 0.52);
      b = lerp(b, conc + 3, edgeWear * 0.52);
      r = lerp(r, 56, gritScuff * 0.34);
      g = lerp(g, 54, gritScuff * 0.34);
      b = lerp(b, 48, gritScuff * 0.34);
      met = 0.02;
      rgh = clamp(rgh + edgeWear * 0.30 + gritScuff * 0.24 + micro * 0.08, 0.38, 0.94);
      hv = 0.50 + grain * 0.08 + micro * 0.09 - edgeWear * 0.10;
    }
    out.r = r; out.g = g; out.b = b; out.h = hv;
    out.ao = clamp(1.0 - gritScuff * 0.18, 0.65, 1.0);
    out.rgh = rgh; out.met = met;
    return out;
  }, { normalStrength: mode === 'trim' ? 1.8 : 2.1 });
}

// =========================================================================
// 6. WEATHERED TRAFFIC YELLOW FLOOR PAINT (Firing Line & No-Build Border)
// =========================================================================
function buildFloorYellowPixels() {
  const gGrain = makeFbmGrid(64, 24, 8, 211, 3);
  const gScuff = makeFbmGrid(64, 14, 4, 229, 3);
  return synthPBRPixels(512, 128, (u, v, _x, _y, out) => {
    const grain = gGrain(u, v) - 0.5;
    const micro = tileNoise(u, v, 80, 20, 223) - 0.5;
    const scuff = sstep(0.60, 0.86, gScuff(u, v));
    const edgeChip = (v < 0.05 || v > 0.95) ? sstep(0.56, 0.80, tileNoise(u, v, 32, 8, 233)) : 0;
    let r = 226 + grain * 14 + micro * 6;
    let g = 178 + grain * 12 + micro * 5;
    let b = 20 + grain * 8 + micro * 4;
    const conc = 166 + micro * 18;
    r = lerp(r, conc, edgeChip * 0.52);
    g = lerp(g, conc + 2, edgeChip * 0.52);
    b = lerp(b, conc + 4, edgeChip * 0.52);
    r = lerp(r, 76, scuff * 0.24);
    g = lerp(g, 70, scuff * 0.24);
    b = lerp(b, 58, scuff * 0.24);
    out.r = r; out.g = g; out.b = b;
    out.h = 0.52 + grain * 0.07 + micro * 0.08 - edgeChip * 0.14;
    out.ao = clamp(1.0 - scuff * 0.14, 0.72, 1.0);
    out.rgh = clamp(0.50 + scuff * 0.28 + edgeChip * 0.32 + Math.abs(micro) * 0.08, 0.40, 0.94);
    out.met = 0.02;
    return out;
  }, { normalStrength: 1.9 });
}

// =========================================================================
// 7. INSTITUTIONAL BLUE DADO BAND (Painted Over 1m Wall Tiles)
// =========================================================================
function buildDadoBandPixels() {
  const gRoller = makeFbmGrid(64, 16, 4, 251, 3);
  return synthPBRPixels(512, 128, (u, v, _x, _y, out) => {
    const tileU = (u * 4) % 1;
    const dSeam = Math.min(tileU, 1 - tileU);
    const seam = dSeam < 0.014 ? 1 - dSeam / 0.014 : 0;
    const stipple = tileNoise(u, v, 96, 24, 241) - 0.5;
    const roller = gRoller(u, v) - 0.5;
    const edgeWear = (v < 0.07 || v > 0.93) ? sstep(0.62, 0.84, tileNoise(u, v, 40, 10, 257)) : 0;
    let r = 46 + roller * 10 + stipple * 4 - seam * 10;
    let g = 108 + roller * 12 + stipple * 5 - seam * 18;
    let b = 140 + roller * 14 + stipple * 5 - seam * 22;
    r = lerp(r, 204, edgeWear * 0.45);
    g = lerp(g, 208, edgeWear * 0.45);
    b = lerp(b, 210, edgeWear * 0.45);
    out.r = r; out.g = g; out.b = b;
    out.h = 0.55 + stipple * 0.05 - seam * 0.28 - edgeWear * 0.10;
    out.ao = clamp(1.0 - seam * 0.30, 0.60, 1.0);
    out.rgh = clamp(0.54 + roller * 0.12 + seam * 0.26 + edgeWear * 0.20, 0.42, 0.92);
    out.met = 0.03;
    return out;
  }, { normalStrength: 2.2 });
}

// =========================================================================
// 8. BALLISTIC RUBBER CRUMB (Backstop Blocks, Baffles, Bench Mat, Bumpers)
// =========================================================================
function buildRubberCrumbPixels(size = 512) {
  const g1 = makeWorleyGrid(64, 40, 40, 263);
  const g2 = makeWorleyGrid(64, 80, 80, 271);
  const gGrain = makeFbmGrid(64, 16, 16, 277, 3);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const c1 = g1(u, v);
    const c1d1 = c1.d1, c1e = c1.edge, c1id = c1.id;
    const c2 = g2(u, v);
    const grain = gGrain(u, v) - 0.5;
    const crack = 1 - sstep(0.0, 0.18, c1e);
    const crumbTone = (c1id - 0.5) * 28 + (c2.id - 0.5) * 14 + grain * 14;
    const base = 178 + crumbTone - crack * 46;
    const cutGlint = c1id > 0.88 ? 0.22 : 0;
    out.r = base; out.g = base * 1.01; out.b = base * 1.02;
    out.h = 0.55 + (1 - c1d1) * 0.26 + (1 - c2.d1) * 0.12 - crack * 0.34;
    out.ao = clamp(0.95 - crack * 0.42, 0.42, 1.0);
    out.rgh = clamp(0.92 - cutGlint + (c2.id - 0.5) * 0.08, 0.58, 0.98);
    out.met = 0.02;
    return out;
  }, { normalStrength: 3.4 });
}

// =========================================================================
// 9. HEAVY MILITARY CANVAS / RIPSTOP FABRIC (Stretcher, Cot, CIF Garments)
// =========================================================================
function buildCanvasPixels(size = 512) {
  const gSlub = makeFbmGrid(64, 10, 10, 283, 3);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const wu = u * 96, wv = v * 96;
    const warp = Math.sin(wu * Math.PI * 2);
    const weft = Math.sin(wv * Math.PI * 2);
    const twill = Math.sin((wu + wv) * Math.PI);
    const weave = (warp * 0.45 + weft * 0.45 + twill * 0.25) * 0.5;
    const ripU = Math.abs(((u * 12) % 1) - 0.5) < 0.035 ? 1 : 0;
    const ripV = Math.abs(((v * 12) % 1) - 0.5) < 0.035 ? 1 : 0;
    const rip = Math.max(ripU, ripV);
    const slub = gSlub(u, v) - 0.5;
    const base = 224 + weave * 14 + slub * 18 + rip * 7;
    out.r = base; out.g = base; out.b = base * 0.97;
    out.h = 0.5 + weave * 0.18 + rip * 0.12 + slub * 0.08;
    out.ao = clamp(0.92 + weave * 0.08 - Math.max(0, -slub) * 0.10, 0.72, 1.0);
    out.rgh = clamp(0.92 + slub * 0.06 - rip * 0.04, 0.84, 0.98);
    out.met = 0.0;
    return out;
  }, { normalStrength: 2.3 });
}

// =========================================================================
// 10. ACOUSTIC CEILING TILES + ALUMINUM T-BAR GRID (512x512, 0.6m x 0.6m)
// =========================================================================
function buildAcousticCeilingPixels(size = 512) {
  const gFiber = makeFbmGrid(64, 16, 16, 311, 3);
  const gPin = makeWorleyGrid(64, 38, 38, 313);
  const gFis = makeFbmGrid(64, 24, 10, 317, 2);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const edge = Math.min(Math.min(u, 1 - u), Math.min(v, 1 - v));
    const tbarW = 0.024;
    const bevelW = 0.040;
    if (edge < tbarW) {
      const railMicro = tileNoise(u, v, 32, 32, 307) - 0.5;
      const groove = edge < 0.005 ? 1 : 0;
      const base = 196 - groove * 48 + railMicro * 8;
      out.r = base; out.g = base + 2; out.b = base + 4;
      out.h = 0.78 - groove * 0.25; out.ao = groove ? 0.55 : 0.88; out.rgh = 0.38; out.met = 0.55;
      return out;
    }
    const shadowRim = 1 - sstep(tbarW, bevelW, edge);
    const fiber = gFiber(u, v) - 0.5;
    const pinhole = gPin(u, v);
    const hole = pinhole.d1 < 0.15 && pinhole.id > 0.42 ? 1 - pinhole.d1 / 0.15 : 0;
    const fissure = sstep(0.72, 0.86, gFis(u, v)) * sstep(0.55, 0.82, tileNoise(u, v, 10, 28, 331));
    const pit = Math.max(hole * 0.85, fissure * 0.75);
    const base = 228 + fiber * 14 - pit * 74 - shadowRim * 34;
    out.r = base; out.g = base - 1; out.b = base - 4;
    out.h = 0.62 - shadowRim * 0.26 - pit * 0.42 + fiber * 0.06;
    out.ao = clamp(0.96 - shadowRim * 0.34 - pit * 0.48, 0.34, 1.0);
    out.rgh = clamp(0.93 + pit * 0.05, 0.86, 0.99);
    out.met = 0.0;
    return out;
  }, { normalStrength: 3.0 });
}

// =========================================================================
// 11. PRISMATIC LIGHT DIFFUSER LENS (256x256)
// =========================================================================
function buildPrismaticLensPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const pu = (u * 16) % 1, pv = (v * 16) % 1;
    const du = Math.abs(pu - 0.5) * 2, dv = Math.abs(pv - 0.5) * 2;
    const pyr = Math.max(0, 1 - (du + dv) * 0.65);
    const rib = Math.abs(((u + v) * 16) % 1 - 0.5) * 2;
    const base = 232 + pyr * 20 - (1 - rib) * 10;
    out.r = base; out.g = base + 2; out.b = base + 4;
    out.h = 0.25 + pyr * 0.65; out.ao = 0.86 + pyr * 0.14; out.rgh = 0.22 + (1 - pyr) * 0.16; out.met = 0.0;
    return out;
  }, { normalStrength: 2.6 });
}

// =========================================================================
// 12. HOLDING TUNNEL LINER (512x512, Neutral Bright Base for Vertex-Color Veil Fade)
// =========================================================================
function buildTunnelLinerPixels(size = 512) {
  const gStreak = makeFbmGrid(64, 20, 6, 347, 3);
  const gGrit = makeFbmGrid(64, 32, 32, 353, 3);
  const gDamp = makeFbmGrid(64, 8, 4, 359, 3);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const su = (u * 2) % 1, sv = (v * 2) % 1;
    const seam = Math.min(Math.min(su, 1 - su), Math.min(sv, 1 - sv));
    const inSeam = seam < 0.016 ? 1 - seam / 0.016 : 0;
    const streak = gStreak(u, v) - 0.5;
    const grit = gGrit(u, v) - 0.5;
    const damp = sstep(0.54, 0.80, gDamp(u, v));
    const base = 224 + streak * 26 + grit * 14 - inSeam * 70 - damp * 22;
    out.r = base * 0.98; out.g = base; out.b = base * 1.02;
    out.h = 0.58 + grit * 0.09 + streak * 0.05 - inSeam * 0.42;
    out.ao = clamp(0.95 - inSeam * 0.48, 0.35, 1.0);
    out.rgh = clamp(0.76 - damp * 0.42 + grit * 0.10, 0.24, 0.94);
    out.met = clamp(0.32 + damp * 0.18 - inSeam * 0.15, 0.10, 0.62);
    return out;
  }, { normalStrength: 3.0 });
}

// =========================================================================
// 13. ARMORY PERFORATED SLATWALL BACKING (512x512)
// =========================================================================
function buildArmorySlatwallPixels(size = 512) {
  const gGrain = makeFbmGrid(64, 16, 16, 367, 2);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const sv = (v * 8) % 1;
    const inSlot = sv < 0.14 ? 1 : 0;
    const slotLip = Math.abs(sv - 0.14) < 0.04 || sv > 0.96 ? 1 : 0;
    const pu = ((u * 24) % 1) - 0.5;
    const pv = (sv - 0.56) * 2.2;
    const holeD = Math.hypot(pu, pv);
    const inHole = holeD < 0.16 ? 1 - holeD / 0.16 : 0;
    const grain = gGrain(u, v) - 0.5;
    const base = inSlot ? 24 : (62 + grain * 12 + slotLip * 16 - inHole * 38);
    out.r = base * 0.92; out.g = base * 1.04; out.b = base * 1.06;
    out.h = inSlot ? 0.08 : (0.64 + slotLip * 0.12 - inHole * 0.46 + grain * 0.04);
    out.ao = inSlot ? 0.32 : clamp(0.96 - inHole * 0.56, 0.34, 1.0);
    out.rgh = inSlot ? 0.88 : clamp(0.56 + grain * 0.12 - slotLip * 0.12, 0.36, 0.85);
    out.met = inSlot ? 0.20 : 0.42;
    return out;
  }, { normalStrength: 3.2 });
}

// =========================================================================
// 14. MEDICAL ENAMEL / COTTON & PEBBLED TACTICAL LEATHER (512x512)
// =========================================================================
function buildMedicalEnamelPixels(size = 512) {
  const gWeave = makeFbmGrid(64, 48, 48, 373, 2);
  const gTone = makeFbmGrid(64, 8, 8, 379, 3);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const weave = gWeave(u, v) - 0.5;
    const tone = gTone(u, v) - 0.5;
    const base = 236 + tone * 10 + weave * 7;
    out.r = base; out.g = base; out.b = base * 0.97;
    out.h = 0.5 + weave * 0.08 + tone * 0.04;
    out.ao = 0.96 + tone * 0.04;
    out.rgh = clamp(0.76 + tone * 0.10, 0.62, 0.90);
    out.met = 0.02;
    return out;
  }, { normalStrength: 1.4 });
}

function buildLeatherPebblePixels(size = 512) {
  const gW1 = makeWorleyGrid(64, 56, 56, 383);
  const gGrain = makeFbmGrid(64, 10, 10, 389, 3);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const w1 = gW1(u, v);
    const grain = gGrain(u, v) - 0.5;
    const crease = 1 - sstep(0.0, 0.18, w1.edge);
    const base = 210 + grain * 20 + (w1.id - 0.5) * 16 - crease * 32;
    out.r = base; out.g = base * 0.99; out.b = base * 0.96;
    out.h = 0.55 + (1 - w1.d1) * 0.22 - crease * 0.26;
    out.ao = clamp(0.95 - crease * 0.32, 0.55, 1.0);
    out.rgh = clamp(0.56 + crease * 0.24 + grain * 0.12, 0.38, 0.88);
    out.met = 0.02;
    return out;
  }, { normalStrength: 2.5 });
}

// =========================================================================
// SHARED CACHED LIBRARY API
// =========================================================================
const LIB_CACHE = new WeakMap();

export function getTrainingPBR(T) {
  if (!T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  let lib = LIB_CACHE.get(T);
  if (lib) return lib;

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const textures = [];
  const track = (tex) => { if (tex) textures.push(tex); return tex; };

  const pack = (name, px, { repeat = true, aniso = 8, normalScale = 1.0, aoIntensity = 0.72, halfDetail = false } = {}) => {
    const map = track(makeDataTexture(T, px.col, px.w, px.h, { name: `${name}-map`, srgb: true, repeat, aniso }));
    let nrmW = px.w, nrmH = px.h, nrmBuf = px.nrm, ormBuf = px.orm;
    if (halfDetail && px.w >= 512 && px.h >= 512) {
      // Already synthesized at px.w; allow callers passing full-res albedo + half-res normal/orm
    }
    const normalMap = track(makeDataTexture(T, nrmBuf, nrmW, nrmH, { name: `${name}-nrm`, srgb: false, repeat, aniso }));
    const ormMap = track(makeDataTexture(T, ormBuf, nrmW, nrmH, { name: `${name}-orm`, srgb: false, repeat, aniso }));
    const set = {
      map,
      normalMap,
      ormMap,
      normalScale,
      aoIntensity,
      // Apply onto an existing MeshStandardMaterial or option object (preserves color tint!)
      apply(mat, { tint, normalScale: ns, roughness, metalness, repeat: rep } = {}) {
        if (!mat) return mat;
        if (rep && rep[0] && rep[1]) {
          // Only clone repeat wrappers if custom repeat is asked (keeps GPU texture shared via clone())
          const cloneRep = (src) => {
            if (!src) return null;
            const c = src.clone();
            c.needsUpdate = true;
            c.wrapS = c.wrapT = T.RepeatWrapping;
            c.repeat.set(rep[0], rep[1]);
            c.anisotropy = aniso;
            return c;
          };
          mat.map = cloneRep(map);
          mat.normalMap = cloneRep(normalMap);
          const ormC = cloneRep(ormMap);
          mat.roughnessMap = ormC;
          mat.metalnessMap = ormC;
          mat.aoMap = ormC;
        } else {
          mat.map = map;
          mat.normalMap = normalMap;
          mat.roughnessMap = ormMap;
          mat.metalnessMap = ormMap;
          mat.aoMap = ormMap;
        }
        mat.aoMapIntensity = aoIntensity;
        if (mat.normalScale && typeof mat.normalScale.set === 'function') {
          const s = ns ?? normalScale;
          mat.normalScale.set(s, s);
        } else if (T.Vector2) {
          const s = ns ?? normalScale;
          mat.normalScale = new T.Vector2(s, s);
        }
        mat.roughness = roughness !== undefined ? roughness : 1.0;
        mat.metalness = metalness !== undefined ? metalness : 1.0;
        if (tint !== undefined && mat.color && typeof mat.color.setHex === 'function') {
          mat.color.setHex(tint);
        }
        return mat;
      },
      opts({ color = 0xffffff, normalScale: ns, roughness = 1.0, metalness = 1.0, extra = {} } = {}) {
        const s = ns ?? normalScale;
        return {
          color,
          map,
          normalMap,
          normalScale: T.Vector2 ? new T.Vector2(s, s) : undefined,
          roughnessMap: ormMap,
          metalnessMap: ormMap,
          aoMap: ormMap,
          aoMapIntensity: aoIntensity,
          roughness,
          metalness,
          ...extra,
        };
      },
    };
    return set;
  };

  // AH-14: Synthesize hero tiles directly at 512x512 (128 px/m = 7.8 mm/texel across 4 m repeat)
  // instead of 1024x1024 + Sobel + immediate 2x downsample — 4-6x faster load and 12+ MB less VRAM.
  const packHeroTile = (name, cfg) => {
    const px = buildTilePixels({ ...cfg, size: 512 });
    const map = track(makeDataTexture(T, px.col, 512, 512, { name: `${name}-map`, srgb: true, repeat: true, aniso: 8 }));
    const normalMap = track(makeDataTexture(T, px.nrm, 512, 512, { name: `${name}-nrm`, srgb: false, repeat: true, aniso: 8 }));
    const ormMap = track(makeDataTexture(T, px.orm, 512, 512, { name: `${name}-orm`, srgb: false, repeat: true, aniso: 8 }));
    return {
      map, normalMap, ormMap, normalScale: cfg.mode === 'wall' ? 0.62 : 0.74, aoIntensity: 0.65,
      opts({ color = 0xffffff, normalScale: ns, roughness = 1.0, metalness = 1.0, extra = {} } = {}) {
        const s = ns ?? (cfg.mode === 'wall' ? 0.62 : 0.74);
        return {
          color, map, normalMap, normalScale: T.Vector2 ? new T.Vector2(s, s) : undefined,
          roughnessMap: ormMap, metalnessMap: ormMap, aoMap: ormMap, aoMapIntensity: 0.72,
          roughness, metalness, ...extra,
        };
      },
      cloneRepeat(rx, ry) {
        const cr = (src) => {
          const c = src.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = T.RepeatWrapping; c.repeat.set(rx, ry); c.anisotropy = 8; return c;
        };
        const ormC = cr(ormMap);
        return {
          map: cr(map), normalMap: cr(normalMap), roughnessMap: ormC, metalnessMap: ormC, aoMap: ormC,
          aoMapIntensity: 0.65, normalScale: T.Vector2 ? new T.Vector2(0.74, 0.74) : undefined,
          roughness: 1.0, metalness: 1.0,
        };
      },
    };
  };

  // Lazy per-material builders so HQ startup only synthesizes the few 256px station sets (<100ms),
  // while the three 1024px hero tile sets build only once when entering the Training Ground.
  const builders = {
    tileWall:        () => packHeroTile('tg-tile-wall',  { baseHex: '#dce0e2', groutHex: '#a1a9ae', mode: 'wall' }),
    tileRangeFloor:  () => packHeroTile('tg-tile-range', { baseHex: '#c6cbce', groutHex: '#90989d', mode: 'rangeFloor' }),
    tileBuildFloor:  () => packHeroTile('tg-tile-build', { baseHex: '#b1b7ba', groutHex: '#828a8f', mode: 'buildFloor' }),
    siding:          () => pack('tg-siding',        buildSidingPixels(512),               { normalScale: 0.78, aoIntensity: 0.75 }),
    steelDark:       () => pack('tg-steel-dark',    buildMetalPixels('steelDark', 256),   { normalScale: 0.75, aoIntensity: 0.60 }),
    steelLight:      () => pack('tg-steel-light',   buildMetalPixels('steelLight', 256),  { normalScale: 0.65, aoIntensity: 0.55 }),
    roofSteel:       () => pack('tg-roof-steel',    buildMetalPixels('roofSteel', 256),   { normalScale: 0.75, aoIntensity: 0.65 }),
    shutterSlat:     () => pack('tg-shutter-slat',  buildMetalPixels('shutterSlat', 256), { normalScale: 0.80, aoIntensity: 0.65 }),
    galvDuct:        () => pack('tg-galv-duct',     buildMetalPixels('galvDuct', 256),    { normalScale: 0.85, aoIntensity: 0.70 }),
    oliveSteel:      () => pack('tg-olive-steel',   buildOliveSteelPixels(256, [84, 98, 76], 151), { normalScale: 0.80, aoIntensity: 0.65 }),
    benchPanel:      () => pack('tg-bench-panel',   buildOliveSteelPixels(256, [64, 78, 69], 163), { normalScale: 0.80, aoIntensity: 0.65 }),
    hazardTrim:      () => pack('tg-hazard-trim',   buildHazardPixels('trim'),            { normalScale: 0.80, aoIntensity: 0.65 }),
    hazardFloor:     () => pack('tg-hazard-floor',  buildHazardPixels('floor'),           { normalScale: 0.90, aoIntensity: 0.70 }),
    floorYellow:     () => pack('tg-floor-yellow',  buildFloorYellowPixels(),             { normalScale: 0.85, aoIntensity: 0.65 }),
    dadoBand:        () => pack('tg-dado-band',     buildDadoBandPixels(),                { normalScale: 0.90, aoIntensity: 0.65 }),
    rubberCrumb:     () => pack('tg-rubber-crumb',  buildRubberCrumbPixels(256),          { normalScale: 1.15, aoIntensity: 0.80 }),
    canvasMilitary:  () => pack('tg-canvas-mil',    buildCanvasPixels(256),               { normalScale: 0.95, aoIntensity: 0.72 }),
    acousticCeiling: () => pack('tg-acoustic-ceil', buildAcousticCeilingPixels(256),      { normalScale: 1.05, aoIntensity: 0.80 }),
    prismaticLens:   () => pack('tg-prism-lens',    buildPrismaticLensPixels(128),        { normalScale: 0.85, aoIntensity: 0.50 }),
    tunnelLiner:     () => pack('tg-tunnel-liner',  buildTunnelLinerPixels(256),          { normalScale: 1.10, aoIntensity: 0.82 }),
    armorySlatwall:  () => pack('tg-armory-slat',   buildArmorySlatwallPixels(256),       { normalScale: 1.15, aoIntensity: 0.85 }),
    medicalEnamel:   () => pack('tg-med-enamel',    buildMedicalEnamelPixels(256),        { normalScale: 0.65, aoIntensity: 0.55 }),
    leatherPebble:   () => pack('tg-leather-peb',   buildLeatherPebblePixels(256),        { normalScale: 0.90, aoIntensity: 0.70 }),
  };
  let totalMs = 0;
  lib = { textures, get buildMs() { return Math.round(totalMs); } };
  for (const [k, fn] of Object.entries(builders)) {
    let built = null;
    Object.defineProperty(lib, k, {
      enumerable: true,
      get() {
        if (!built) {
          const s0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
          built = fn();
          totalMs += (typeof performance !== 'undefined' ? performance.now() : Date.now()) - s0;
        }
        return built;
      },
    });
  }
  LIB_CACHE.set(T, lib);
  return lib;
}

// =========================================================================
// WORLD-SCALE BOX-PROJECTED UV HELPER (Eliminates stretching on Box/Extrude/Merged meshes!)
// =========================================================================
// Re-projects a geometry's UVs in real metres using each vertex's face normal so a 36 m truss beam
// and a 15 cm gusset plate share identical, crisp texel density. Safe on indexed & non-indexed geometry.
export function projectBoxUV(geo, tileU = 1.0, tileV = tileU, matrixWorld = null) {
  if (!geo || !geo.attributes || !geo.attributes.position) return geo;
  const pos = geo.attributes.position;
  let nrm = geo.attributes.normal;
  if (!nrm && typeof geo.computeVertexNormals === 'function') {
    geo.computeVertexNormals();
    nrm = geo.attributes.normal;
  }
  if (!nrm) return geo;
  const count = pos.count;
  const uvArr = new Float32Array(count * 2);
  const invU = 1 / (tileU || 1);
  const invV = 1 / (tileV || 1);
  const e = matrixWorld ? matrixWorld.elements : null;
  for (let i = 0; i < count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i);
    if (e) {
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
      const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
      const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      x = wx; y = wy; z = wz;
      const wnx = e[0] * nx + e[4] * ny + e[8] * nz;
      const wny = e[1] * nx + e[5] * ny + e[9] * nz;
      const wnz = e[2] * nx + e[6] * ny + e[10] * nz;
      nx = wnx; ny = wny; nz = wnz;
    }
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    let u, v;
    if (ay >= ax && ay >= az) {
      u = x * invU; v = z * invV;
    } else if (ax >= ay && ax >= az) {
      u = z * invU; v = y * invV;
    } else {
      u = x * invU; v = y * invV;
    }
    uvArr[i * 2] = u;
    uvArr[i * 2 + 1] = v;
  }
  const uvAttr = geo.attributes.uv;
  if (uvAttr && uvAttr.array && uvAttr.array.length === uvArr.length) {
    uvAttr.array.set(uvArr);
    uvAttr.needsUpdate = true;
  } else if (pos.constructor) {
    geo.setAttribute('uv', new pos.constructor(uvArr, 2));
  }
  return geo;
}

// Walk a group and apply world-scale box UVs to every mesh whose material is listed in tileByMat (Map<Material, number|[u,v]>).
// Shared geometries (used by >1 mesh) project in local space so one mesh never corrupts another's UVs.
export function applyWorldUVByMaterial(root, tileByMat) {
  if (!root || !tileByMat || !tileByMat.size) return 0;
  if (typeof root.updateMatrixWorld === 'function') root.updateMatrixWorld(true);
  const geoUses = new Map();
  const targets = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || Array.isArray(o.material)) return;
    if (!tileByMat.has(o.material)) return;
    geoUses.set(o.geometry, (geoUses.get(o.geometry) || 0) + 1);
    targets.push(o);
  });
  const doneShared = new Set();
  let updated = 0;
  for (const m of targets) {
    const spec = tileByMat.get(m.material);
    const tu = Array.isArray(spec) ? spec[0] : spec;
    const tv = Array.isArray(spec) ? spec[1] : spec;
    const shared = geoUses.get(m.geometry) > 1 || !!m.isInstancedMesh;
    if (shared) {
      if (doneShared.has(m.geometry)) continue;
      doneShared.add(m.geometry);
      projectBoxUV(m.geometry, tu, tv, null);
    } else {
      projectBoxUV(m.geometry, tu, tv, m.matrixWorld);
    }
    updated++;
  }
  return updated;
}

// Pure export for unit tests (verifying pixel synthesis without needing Three.js DOM)
export const _TEST_SYNTH = Object.freeze({
  buildTilePixels,
  buildSidingPixels,
  buildMetalPixels,
  buildOliveSteelPixels,
  buildHazardPixels,
  buildFloorYellowPixels,
  buildDadoBandPixels,
  buildRubberCrumbPixels,
  buildCanvasPixels,
  buildAcousticCeilingPixels,
  buildPrismaticLensPixels,
  buildTunnelLinerPixels,
  buildArmorySlatwallPixels,
  buildMedicalEnamelPixels,
  buildLeatherPebblePixels,
});

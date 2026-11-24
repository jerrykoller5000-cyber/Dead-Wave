// world/build-textures.js — AG-406: Shared procedural PBR texture library & UV projector for all buildable items.
// Covers all 16 buildable types and 51 upgrade/opening forms (walls, doors, gates, window bars, floors,
// barricades, sandbags, gabions, wire, railings, platforms, pillars, stairs, spikes, mines, lures, drums,
// and light/heavy/flame turrets) strictly following docs/art-direction.md and docs/asset-principles.md.
//
// Performance & WebGPU notes:
// - Lazy per-material getters cached per THREE instance: 0 ms cost at title screen; each texture builds once
//   when buildables first instantiate and is shared across every buildable instance & tier.
// - Preserves 100% of static batching (stoneVC, steelVC, woodVC, burlapVC, paintVC stay single vertex-colored
//   master materials so walls, sandbags, wire and floors keep identical draw counts; t13 invariants intact).
// - Packed linear ORM shares one DataTexture across roughnessMap, metalnessMap and aoMap (R=AO, G=Rough, B=Metal).
// - DataTextures are stored bottom-up (flipY = false) matching studio/zombie-atlas.js & world/training-textures.js.
// - Node/fakethree safe: returns null textures gracefully when DataTexture or DOM Canvas is absent/stubbed.

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
    sum += tileNoise(u, v, fx, fy, seed + i * 37) * amp;
    norm += amp;
    amp *= gain;
    fx <<= 1;
    fy <<= 1;
  }
  return norm > 0 ? sum / norm : 0.5;
}

// Seamless periodic Worley cellular distance + edge + cell id
function tileWorley(u, v, px, py, seed = 11) {
  const x = u * px, y = v * py;
  const cx = Math.floor(x), cy = Math.floor(y);
  let d1 = 9, d2 = 9, id = 0;
  for (let oy = -1; oy <= 1; oy++) {
    const ny = ((cy + oy) % py + py) % py;
    for (let ox = -1; ox <= 1; ox++) {
      const nx = ((cx + ox) % px + px) % px;
      const rx = hash2i(nx, ny, seed);
      const ry = hash2i(nx, ny, seed + 101);
      const dx = (cx + ox + rx) - x;
      const dy = (cy + oy + ry) - y;
      const d = dx * dx + dy * dy;
      if (d < d1) {
        d2 = d1; d1 = d;
        id = hash2i(nx, ny, seed + 223);
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return { d1: Math.sqrt(d1), edge: Math.sqrt(d2) - Math.sqrt(d1), id };
}

// Precomputed periodic FBM & Worley grids for fast 512x512 PBR synthesis (AH-14)
function makeFbmGrid(gridSize, px, py, seed, octaves = 3, gain = 0.5) {
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
    return lerp(lerp(buf[r0 + ix0], buf[r0 + ix1], fx), lerp(buf[r1 + ix0], buf[r1 + ix1], fx), fy);
  };
}

function makeWorleyGrid(gridSize, px, py, seed = 11) {
  const n = gridSize * gridSize;
  const d1Buf = new Float32Array(n), edgeBuf = new Float32Array(n), idBuf = new Float32Array(n);
  for (let y = 0; y < gridSize; y++) {
    const v = y / gridSize;
    for (let x = 0; x < gridSize; x++) {
      const w = tileWorley(x / gridSize, v, px, py, seed);
      const i = y * gridSize + x;
      d1Buf[i] = w.d1; edgeBuf[i] = w.edge; idBuf[i] = w.id;
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
    out.id = idBuf[i00];
    return out;
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
// Verified WebGPU convention: nx = -dX * strength, ny = +dY * strength, nz = 1.
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

// Wrap canvas-order RGBA buffer into a bottom-up WebGPU-ready Three.js DataTexture.
export function makeDataTexture(T, rgbaCanvasOrder, w, h, {
  name = 'build-pbr',
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

// Fast pixel-buffer PBR synthesizer: evalFn(u, v, x, y, out) -> { r, g, b, h, ao, rgh, met }
function synthPBRPixels(w, h, evalFn, { normalStrength = 2.4, wrapX = true, wrapY = true } = {}) {
  const col = new Uint8Array(w * h * 4);
  const orm = new Uint8Array(w * h * 4);
  const height = new Float32Array(w * h);
  const out = { r: 0, g: 0, b: 0, h: 0.5, ao: 1.0, rgh: 0.7, met: 0.0 };
  for (let y = 0; y < h; y++) {
    const v = y / h;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const p = evalFn(u, v, x, y, out) || out;
      const idx = row + x;
      const o = idx * 4;
      col[o] = clamp((p.r + 0.5) | 0, 0, 255);
      col[o + 1] = clamp((p.g + 0.5) | 0, 0, 255);
      col[o + 2] = clamp((p.b + 0.5) | 0, 0, 255);
      col[o + 3] = 255;
      orm[o] = clamp((p.ao * 255 + 0.5) | 0, 0, 255);
      orm[o + 1] = clamp((p.rgh * 255 + 0.5) | 0, 0, 255);
      orm[o + 2] = clamp((p.met * 255 + 0.5) | 0, 0, 255);
      orm[o + 3] = 255;
      height[idx] = p.h;
    }
  }
  const nrm = heightToNormalRGBA(height, w, h, normalStrength, wrapX, wrapY);
  return { w, h, col, nrm, orm };
}

// =========================================================================
// 1. DRESSED FORTIFICATION STONE / CAST CONCRETE (512x512, neutral VC-ready)
// =========================================================================
// High-value neutral albedo (~232/255 mean) designed for vertex-colored stoneVC
// (stone walls T2/T3, stone floor T1, concrete pillar T1, gabion rocks T2).
function buildStonePixels(size = 512) {
  const gMacro = makeFbmGrid(64, 4, 4, 17, 3, 0.55);
  const gMed = makeFbmGrid(64, 12, 12, 31, 3, 0.55);
  const gCell = makeWorleyGrid(64, 8, 8, 89);
  const gCellFine = makeWorleyGrid(64, 20, 20, 107);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const macro = gMacro(u, v);
    const med = gMed(u, v);
    const fine = tileNoise(u, v, 48, 48, 53);
    const speck = tileNoise(u, v, 112, 112, 71);
    const cell = gCell(u, v);
    const cellEdge = cell.edge, cellId = cell.id;
    const cellFineId = gCellFine(u, v).id;

    const chiselWarp = (macro - 0.5) * 0.08;
    const chisel = Math.sin((v * 26 + u * 4 + chiselWarp * 14) * Math.PI * 2) * 0.5 + 0.5;
    const chiselMask = sstep(0.32, 0.72, med) * 0.45;

    const pitRaw = tileNoise(u, v, 36, 36, 131) * 0.65 + fine * 0.35;
    const pit = sstep(0.76, 0.89, pitRaw);
    const seam = 1 - sstep(0.0, 0.055, cellEdge);
    const facet = (cellId - 0.5) * 0.14 + (cellFineId - 0.5) * 0.07;

    const mica = sstep(0.84, 0.96, speck);
    const quartz = sstep(0.86, 0.97, tileNoise(u, v, 96, 96, 149));

    const h = 0.54
      + (macro - 0.5) * 0.22
      + (med - 0.5) * 0.18
      + (fine - 0.5) * 0.10
      + facet * 0.14
      + (chisel - 0.5) * 0.09 * chiselMask
      - pit * 0.30
      - seam * 0.06;

    const base = 234
      + (macro - 0.5) * 20
      + (med - 0.5) * 15
      + (fine - 0.5) * 11
      + facet * 14
      + (chisel - 0.5) * 7 * chiselMask
      - pit * 40
      - seam * 9
      - mica * 20
      + quartz * 14;

    const warmShift = (cellId - 0.5) * 6 + (macro - 0.5) * 4;
    out.r = base + warmShift;
    out.g = base + warmShift * 0.35;
    out.b = base - warmShift * 0.75;
    out.h = h;
    out.ao = clamp(0.95 - pit * 0.30 - seam * 0.07 - (1 - macro) * 0.08, 0.56, 1.0);
    out.rgh = clamp(0.86 + (1 - med) * 0.08 + pit * 0.08 - quartz * 0.10, 0.76, 0.97);
    out.met = 0.02;
    return out;
  }, { normalStrength: 2.15 });
}

// =========================================================================
// 2. ROUGH-SAWN FORTIFICATION LUMBER (512x512, longitudinal grain along U)
// =========================================================================
function buildWoodPixels(size = 512) {
  const knots = [
    { ku: 0.28, kv: 0.31, rx: 0.052, ry: 0.025 },
    { ku: 0.76, kv: 0.74, rx: 0.045, ry: 0.022 },
  ];
  const gWarpMacro = makeFbmGrid(64, 2, 4, 211, 3, 0.55);
  const gWarpFine = makeFbmGrid(64, 4, 16, 227, 2, 0.5);
  const gFibers = makeFbmGrid(128, 3, 72, 241, 3, 0.55);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const warpMacro = (gWarpMacro(u, v) - 0.5) * 0.085;
    const warpFine = (gWarpFine(u, v) - 0.5) * 0.016;

    let knotCore = 0;
    let knotDeflect = 0;
    for (let ki = 0; ki < knots.length; ki++) {
      const k = knots[ki];
      let du = u - k.ku; if (du > 0.5) du -= 1; if (du < -0.5) du += 1;
      let dv = v - k.kv; if (dv > 0.5) dv -= 1; if (dv < -0.5) dv += 1;
      const rx = du / k.rx, ry = dv / k.ry;
      const distSq = rx * rx + ry * ry;
      if (distSq < 5.76) {
        const dist = Math.sqrt(distSq);
        const pull = Math.exp(-distSq * 0.72);
        knotDeflect += (dv >= 0 ? 1 : -1) * pull * 0.10;
        if (dist < 1.0) {
          const core = 1 - sstep(0.15, 0.95, dist);
          const ring = 0.5 + 0.5 * Math.sin(dist * Math.PI * 5.0);
          knotCore = Math.max(knotCore, core * (0.72 + 0.28 * ring));
        }
      }
    }

    const ringCoord = v * 9.5 + warpMacro * 6.5 + warpFine * 4.5 + knotDeflect * 3.8 + Math.sin(u * Math.PI * 2) * 0.22;
    const ringFrac = ringCoord - Math.floor(ringCoord);
    const latewood = sstep(0.64, 0.87, ringFrac) * (1 - sstep(0.93, 1.0, ringFrac));

    const fibers = gFibers(u, v);
    const fineFib = tileNoise(u, v, 6, 144, 257);

    const checkField = tileNoise(u, v, 2, 64, 269) * 0.6 + tileNoise(u, v, 4, 128, 277) * 0.4;
    const check = sstep(0.86, 0.94, checkField);

    const sawChat = (Math.sin(u * Math.PI * 2 * 44 + warpMacro * 14) * 0.5 + 0.5) * sstep(0.35, 0.75, tileNoise(u, v, 6, 8, 283));

    const h = 0.55
      + latewood * 0.11
      + (fibers - 0.5) * 0.18
      + (fineFib - 0.5) * 0.09
      + (sawChat - 0.5) * 0.04
      - check * 0.34
      - knotCore * 0.10;

    const base = 236
      - latewood * 22
      + (fibers - 0.5) * 19
      + (fineFib - 0.5) * 10
      + (sawChat - 0.5) * 5
      - check * 50
      - knotCore * 52;

    out.r = base + latewood * 5 + knotCore * 4;
    out.g = base + latewood * 1 - knotCore * 2;
    out.b = base - latewood * 6 - knotCore * 8;
    out.h = h;
    out.ao = clamp(0.96 - check * 0.32 - latewood * 0.06 - knotCore * 0.14 - (1 - fibers) * 0.06, 0.56, 1.0);
    out.rgh = clamp(0.84 - latewood * 0.09 + (1 - fibers) * 0.08 + check * 0.11 - knotCore * 0.08, 0.70, 0.96);
    out.met = 0.0;
    return out;
  }, { normalStrength: 1.75 });
}

// =========================================================================
// 3. COARSE MILITARY BURLAP / HESSIAN WEAVE (512x512, neutral VC-ready)
// =========================================================================
function buildBurlapPixels(size = 512) {
  const N = 56;
  const gDu = makeFbmGrid(64, 4, 4, 311, 2, 0.5);
  const gDv = makeFbmGrid(64, 4, 4, 331, 2, 0.5);
  const gFold = makeFbmGrid(64, 3, 6, 373, 3, 0.55);
  const gDust = makeFbmGrid(64, 6, 6, 379, 3, 0.55);
  const warpVars = new Float32Array(N), weftVars = new Float32Array(N);
  for (let i = 0; i < N; i++) { warpVars[i] = hash2i(i, 3, 347); weftVars[i] = hash2i(5, i, 353); }
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const du = (gDu(u, v) - 0.5) * 0.010;
    const dv = (gDv(u, v) - 0.5) * 0.010;
    let tu = u + du; if (tu < 0) tu += 1; else if (tu >= 1) tu -= 1;
    let tv = v + dv; if (tv < 0) tv += 1; else if (tv >= 1) tv -= 1;

    const gx = tu * N, gy = tv * N;
    const fx0 = gx | 0, fy0 = gy | 0;
    const ix = fx0 % N, iy = fy0 % N;
    const fx = gx - fx0, fy = gy - fy0;

    const warpVar = warpVars[ix];
    const weftVar = weftVars[iy];
    const warpSlub = 0.76 + 0.22 * tileNoise(tu, tv, N, 6, 359);
    const weftSlub = 0.76 + 0.22 * tileNoise(tu, tv, 6, N, 367);

    const warpW = clamp(1 - Math.abs(fx - 0.5) / (0.45 * warpSlub), 0, 1);
    const weftW = clamp(1 - Math.abs(fy - 0.5) / (0.45 * weftSlub), 0, 1);
    const warpProf = Math.sqrt(warpW);
    const weftProf = Math.sqrt(weftW);

    const overWarp = ((ix + iy) & 1) === 0;
    const warpArch = overWarp ? (0.74 + 0.26 * Math.sin(fy * Math.PI)) : (0.34 + 0.20 * Math.sin(fy * Math.PI));
    const weftArch = !overWarp ? (0.74 + 0.26 * Math.sin(fx * Math.PI)) : (0.34 + 0.20 * Math.sin(fx * Math.PI));

    const warpPly = Math.sin((tv * N * 3.0 + fx * 2.2) * Math.PI * 2) * 0.06;
    const weftPly = Math.sin((tu * N * 3.0 + fy * 2.2) * Math.PI * 2) * 0.06;

    const hWarp = warpProf > 0 ? warpProf * warpArch + warpPly * warpProf : 0;
    const hWeft = weftProf > 0 ? weftProf * weftArch + weftPly * weftProf : 0;

    const useWarp = hWarp >= hWeft;
    const yarnH = useWarp ? hWarp : hWeft;
    const gap = 1 - sstep(0.05, 0.24, yarnH);

    const clothFold = gFold(u, v);
    const clothDust = gDust(u, v);
    const microFuzz = tileNoise(u, v, 128, 128, 389);
    const threadTone = useWarp ? (warpVar - 0.5) * 16 : (weftVar - 0.5) * 16;

    const base = 236
      + threadTone
      + (yarnH - 0.56) * 24
      + (clothFold - 0.5) * 16
      + (clothDust - 0.5) * 14
      + (microFuzz - 0.5) * 9
      - gap * 50;

    out.r = base + 3;
    out.g = base + 1;
    out.b = base - 4;
    out.h = yarnH * 0.68 + (clothFold - 0.5) * 0.24 + (clothDust - 0.5) * 0.08 + (microFuzz - 0.5) * 0.04;
    out.ao = clamp(0.60 + yarnH * 0.38 + (clothFold - 0.5) * 0.08 - gap * 0.18, 0.52, 1.0);
    out.rgh = clamp(0.89 + gap * 0.07 + (1 - yarnH) * 0.05 + (microFuzz - 0.5) * 0.04, 0.86, 0.98);
    out.met = 0.0;
    return out;
  }, { normalStrength: 2.25 });
}

// =========================================================================
// 4. ROLLED STRUCTURAL & ARMOUR PLATE STEEL (512x512, neutral VC-ready)
// =========================================================================
function buildSteelPixels(size = 512) {
  const gMill = makeFbmGrid(64, 5, 5, 401, 4, 0.55);
  const gScale = makeWorleyGrid(64, 10, 10, 419);
  const gRoll = makeFbmGrid(64, 4, 36, 431, 3, 0.5);
  const gCross = makeFbmGrid(64, 28, 6, 443, 2, 0.5);
  return synthPBRPixels(size, size, (u, v, _x, _y, out) => {
    const mill = gMill(u, v);
    const scaleCell = gScale(u, v);
    const rollStreak = gRoll(u, v);
    const crossBrush = gCross(u, v);
    const fineGrain = tileNoise(u, v, 96, 96, 457);

    const sc1 = sstep(0.82, 0.94, tileNoise(u, v, 6, 72, 463));
    const sc2 = sstep(0.84, 0.95, tileNoise(u, v, 64, 8, 479));
    const scratch = Math.max(sc1 * 0.8, sc2 * 0.65);

    const oxide = sstep(0.56, 0.82, mill * 0.65 + (1 - scaleCell.d1) * 0.35);
    const pore = sstep(0.86, 0.95, tileNoise(u, v, 56, 56, 491));

    const h = 0.54
      + (mill - 0.5) * 0.14
      + (rollStreak - 0.5) * 0.11
      + (crossBrush - 0.5) * 0.05
      + (fineGrain - 0.5) * 0.05
      - oxide * 0.08
      - scratch * 0.10
      - pore * 0.24;

    const base = 236
      + (mill - 0.5) * 20
      + (rollStreak - 0.5) * 14
      + (scaleCell.id - 0.5) * 12
      - oxide * 20
      + scratch * 22
      - pore * 30;

    out.r = base + oxide * 4 - scratch * 1;
    out.g = base + oxide * 1;
    out.b = base - oxide * 3 + scratch * 3;
    out.h = h;
    out.ao = clamp(0.96 - oxide * 0.12 - pore * 0.24 - (1 - mill) * 0.07, 0.68, 1.0);
    out.rgh = clamp(0.44 + oxide * 0.16 + (1 - rollStreak) * 0.08 - scratch * 0.16 + pore * 0.10, 0.28, 0.64);
    out.met = clamp(0.48 - oxide * 0.10 + scratch * 0.10 - pore * 0.08, 0.36, 0.60);
    return out;
  }, { normalStrength: 2.3 });
}

// =========================================================================
// 5. MILITARY ENAMEL / CARC PAINTED SHEET STEEL (256x256, neutral tintable)
// =========================================================================
// Used on paintVC, olive, paintOliveDark, paintSlate, paintCharcoal, paintRed, black.
// Sleek sprayed military steel enamel: fine micro-grain, wiped oil/grime sheen modulation
// in roughness, delicate directional scratches & pinpoint wear flecks (zero lumpy stucco!).
function buildPaintPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const mottle = tileFbm(u, v, 4, 4, 503, 3, 0.55);
    const microSpray = tileNoise(u, v, 96, 96, 521) * 0.55 + tileNoise(u, v, 128, 128, 541) * 0.45;
    const brushStreak = tileFbm(u, v, 6, 36, 557, 2, 0.5);
    const sc1 = sstep(0.85, 0.96, tileNoise(u, v, 6, 64, 569));
    const sc2 = sstep(0.87, 0.97, tileNoise(u, v, 60, 8, 571));
    const fineScratch = Math.max(sc1, sc2 * 0.75);
    // Pinpoint exposed steel wear flecks
    const fleck = sstep(0.91, 0.98, tileNoise(u, v, 44, 44, 577) * 0.65 + tileNoise(u, v, 88, 88, 587) * 0.35);

    const h = 0.55
      + (microSpray - 0.5) * 0.06
      + (brushStreak - 0.5) * 0.04
      + (mottle - 0.5) * 0.03
      - fineScratch * 0.14
      - fleck * 0.16;

    const base = 240
      + (mottle - 0.5) * 18
      + (brushStreak - 0.5) * 10
      + (microSpray - 0.5) * 5
      + fineScratch * 16
      + fleck * 20;

    const ao = clamp(0.96 - (1 - mottle) * 0.11 - fleck * 0.06, 0.76, 1.0);
    const rgh = clamp(0.58 + (1 - mottle) * 0.16 + (brushStreak - 0.5) * 0.08 - fineScratch * 0.18 - fleck * 0.24, 0.36, 0.78);
    const met = clamp(0.11 + fineScratch * 0.10 + fleck * 0.24, 0.08, 0.38);
    return { r: base, g: base, b: base, h, ao, rgh, met };
  }, { normalStrength: 0.85 });
}

// =========================================================================
// 6. OXIDIZED PITTED SCRAP RUST (256x256, self-colored)
// =========================================================================
// Used on barricadeRustMat & tierMats.rust (barricades, hedgehogs, scrap spikes, trim).
function buildRustPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const macro = tileFbm(u, v, 4, 4, 601, 4, 0.56);
    const flake = tileWorley(u, v, 10, 10, 617);
    const pits = tileFbm(u, v, 16, 16, 631, 3, 0.55);
    const grit = tileNoise(u, v, 64, 64, 647);

    // Three corrosion regimes: bare dark iron scale -> brown oxide -> flaky orange rust crust
    const crust = sstep(0.46, 0.76, macro * 0.6 + (1 - flake.d1) * 0.4);
    const bloom = sstep(0.62, 0.88, pits * 0.55 + macro * 0.45);
    const bare = sstep(0.68, 0.88, (1 - macro) * 0.65 + flake.edge * 0.7);
    const crater = sstep(0.76, 0.90, tileNoise(u, v, 32, 32, 659) * 0.6 + grit * 0.4);

    // Base dark mill-scale brown [74, 56, 48] -> ferric rust [126, 74, 46] -> ochre bloom [164, 94, 46]
    let r = lerp(76, 128, crust);
    let g = lerp(58, 76, crust);
    let b = lerp(50, 48, crust);
    r = lerp(r, 164, bloom * 0.75);
    g = lerp(g, 94, bloom * 0.75);
    b = lerp(b, 46, bloom * 0.75);
    // Exposed dark iron peaks
    r = lerp(r, 84, bare * 0.7);
    g = lerp(g, 82, bare * 0.7);
    b = lerp(b, 80, bare * 0.7);

    const micro = (grit - 0.5) * 18 - crater * 28;
    const h = 0.50
      + crust * 0.22
      + bloom * 0.14
      + (grit - 0.5) * 0.14
      - bare * 0.12
      - crater * 0.34;

    const ao = clamp(0.92 - crater * 0.34 - (1 - flake.edge) * 0.12 - (1 - macro) * 0.08, 0.52, 1.0);
    const rgh = clamp(0.84 + bloom * 0.11 + crater * 0.08 - bare * 0.28, 0.52, 0.97);
    const met = clamp(0.22 - bloom * 0.14 + bare * 0.32, 0.08, 0.56);
    return { r: r + micro, g: g + micro * 0.75, b: b + micro * 0.6, h, ao, rgh, met };
  }, { normalStrength: 2.9 });
}

// =========================================================================
// 7. PARKERIZED ORDNANCE GUNMETAL (256x256, self-colored)
// =========================================================================
// Used on tierMats.gunmetal (turret barrels, receivers, heavy bolts, valve bases).
function buildGunmetalPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const blotch = tileFbm(u, v, 4, 4, 701, 3, 0.5);
    const lathe = tileFbm(u, v, 4, 48, 719, 2, 0.5); // subtle machined lines around U
    const phos = tileNoise(u, v, 80, 80, 733);
    const oilSheen = tileFbm(u, v, 6, 12, 743, 2, 0.5);
    const wearLine = sstep(0.85, 0.96, tileNoise(u, v, 6, 64, 751));

    const base = 96 + (blotch - 0.5) * 16 + (lathe - 0.5) * 12 + (phos - 0.5) * 9 + wearLine * 26;
    const h = 0.52 + (lathe - 0.5) * 0.15 + (phos - 0.5) * 0.10 - wearLine * 0.09;
    const ao = clamp(0.95 - (1 - blotch) * 0.12, 0.76, 1.0);
    const rgh = clamp(0.40 + (1 - oilSheen) * 0.13 - wearLine * 0.14, 0.26, 0.55);
    const met = clamp(0.56 + wearLine * 0.12 - (1 - blotch) * 0.06, 0.48, 0.70);
    return { r: base - 4, g: base, b: base + 6, h, ao, rgh, met };
  }, { normalStrength: 1.9 });
}

// =========================================================================
// 8. BURNISHED WORN MACHINED STEEL (256x256, self-colored)
// =========================================================================
// Used on tierMats.wornSteel (drum chimes/rolling ribs, turret collars, spikes, blades, barbs).
function buildWornSteelPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const brush = tileFbm(u, v, 4, 40, 809, 3, 0.5);
    const cross = tileFbm(u, v, 32, 6, 821, 2, 0.5);
    const patina = tileFbm(u, v, 5, 5, 829, 3, 0.55);
    const sc = sstep(0.82, 0.95, tileNoise(u, v, 6, 72, 839));
    const oil = sstep(0.68, 0.88, 1 - patina);

    const base = 180 + (brush - 0.5) * 18 + (cross - 0.5) * 10 + (patina - 0.5) * 16 + sc * 22 - oil * 24;
    const h = 0.52 + (brush - 0.5) * 0.14 + (cross - 0.5) * 0.06 - sc * 0.10;
    const ao = clamp(0.96 - oil * 0.18, 0.72, 1.0);
    const rgh = clamp(0.32 + oil * 0.16 + (1 - brush) * 0.07 - sc * 0.10, 0.22, 0.50);
    const met = clamp(0.80 - oil * 0.12 + sc * 0.08, 0.68, 0.88);
    return { r: base - 3, g: base, b: base + 5, h, ao, rgh, met };
  }, { normalStrength: 1.8 });
}

// =========================================================================
// 9. TARNISHED ORDNANCE BRASS (256x256, self-colored)
// =========================================================================
// Used on tierMats.brass (ammo belts, casings, drum bungs, valve stems, fittings).
function buildBrassPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const brush = tileFbm(u, v, 4, 36, 907, 3, 0.5);
    const tarnish = tileFbm(u, v, 5, 5, 919, 3, 0.55);
    const grain = tileNoise(u, v, 64, 64, 929);
    const darkPat = sstep(0.58, 0.84, 1 - tarnish);
    const gleam = sstep(0.80, 0.94, brush);

    let r = lerp(192, 134, darkPat * 0.72) + (grain - 0.5) * 10 + gleam * 14;
    let g = lerp(154, 108, darkPat * 0.72) + (grain - 0.5) * 8 + gleam * 11;
    let b = lerp(78, 58, darkPat * 0.72) + (grain - 0.5) * 6 + gleam * 4;
    const h = 0.52 + (brush - 0.5) * 0.14 + (grain - 0.5) * 0.06 - darkPat * 0.06;
    const ao = clamp(0.96 - darkPat * 0.20, 0.70, 1.0);
    const rgh = clamp(0.34 + darkPat * 0.22 - gleam * 0.08, 0.24, 0.56);
    const met = clamp(0.82 - darkPat * 0.16, 0.64, 0.88);
    return { r, g, b, h, ao, rgh, met };
  }, { normalStrength: 1.7 });
}

// =========================================================================
// 10. RIBBED BRAIDED RUBBER FUEL HOSE (256x256, self-colored)
// =========================================================================
// Used on tierMats.rubberHose (CylinderGeometry: ribs vary along V to wrap cleanly around hose).
function buildRubberHosePixels(size = 256) {
  const ribs = 12;
  return synthPBRPixels(size, size, (u, v) => {
    const rib = Math.sin(v * Math.PI * 2 * ribs) * 0.5 + 0.5;
    const ribPeak = Math.pow(rib, 0.75);
    // Diagonal woven cord braid impression across rubber sleeve
    const b1 = Math.sin((u * 18 + v * 18) * Math.PI * 2) * 0.5 + 0.5;
    const b2 = Math.sin((u * 18 - v * 18) * Math.PI * 2) * 0.5 + 0.5;
    const braid = (b1 * b2) * 0.55;
    const grime = tileFbm(u, v, 4, 8, 947, 2, 0.5);
    const grit = tileNoise(u, v, 64, 64, 953);

    const h = 0.30 + ribPeak * 0.52 + braid * 0.14 + (grit - 0.5) * 0.06;
    const base = 44 + ribPeak * 15 + braid * 7 + (grime - 0.5) * 10 + (grit - 0.5) * 6;
    const ao = clamp(0.58 + ribPeak * 0.40, 0.54, 1.0);
    const rgh = clamp(0.82 + (1 - ribPeak) * 0.12 + (grit - 0.5) * 0.05, 0.76, 0.96);
    return { r: base, g: base + 2, b: base + 4, h, ao, rgh, met: 0.02 };
  }, { normalStrength: 3.0 });
}

// =========================================================================
// 11. WEATHERED INDUSTRIAL HAZARD YELLOW ENAMEL (256x256, self-colored)
// =========================================================================
// Used on tierMats.paintYellow (drum hazard bands, hydraulic stripes, caution trim).
// Calibrated industrial ochre-yellow (grounded, not neon).
function buildHazardYellowPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const grime = tileFbm(u, v, 4, 4, 971, 3, 0.55);
    const microSpray = tileNoise(u, v, 96, 96, 977) * 0.6 + tileNoise(u, v, 128, 128, 979) * 0.4;
    const streak = tileFbm(u, v, 6, 36, 983, 2, 0.5);
    const scuff = sstep(0.85, 0.96, tileNoise(u, v, 6, 60, 991));
    const chip = sstep(0.92, 0.98, tileNoise(u, v, 40, 40, 997));

    const dirt = sstep(0.55, 0.85, 1 - grime);
    let r = 214 + (microSpray - 0.5) * 6 + (streak - 0.5) * 12 - dirt * 28;
    let g = 168 + (microSpray - 0.5) * 5 + (streak - 0.5) * 10 - dirt * 26;
    let b = 54 + (microSpray - 0.5) * 4 - dirt * 8;
    // Pinpoint chipped steel fleck
    r = lerp(r, 134, chip * 0.75);
    g = lerp(g, 136, chip * 0.75);
    b = lerp(b, 140, chip * 0.75);

    const h = 0.54 + (microSpray - 0.5) * 0.05 + (streak - 0.5) * 0.04 - scuff * 0.12 - chip * 0.16;
    const ao = clamp(0.95 - dirt * 0.15 - chip * 0.08, 0.74, 1.0);
    const rgh = clamp(0.56 + dirt * 0.18 + (streak - 0.5) * 0.08 - scuff * 0.14 - chip * 0.24, 0.36, 0.78);
    const met = clamp(0.08 + scuff * 0.08 + chip * 0.34, 0.06, 0.44);
    return { r, g, b, h, ao, rgh, met };
  }, { normalStrength: 0.85 });
}

// =========================================================================
// 12. OPTICAL FRESNEL LENS NORMAL MAP (128x128)
// =========================================================================
// Concentric stepped Fresnel glass rings + micro-fluted prism facets for
// turret optics, beacon lamps, mine LEDs, and flame turret pilot lenses.
function buildOpticalLensPixels(size = 128) {
  return synthPBRPixels(size, size, (u, v) => {
    const dx = u - 0.5, dy = v - 0.5;
    const rad = Math.hypot(dx, dy) * 2.0;
    const ang = Math.atan2(dy, dx);
    const ring = (rad * 5.0) - Math.floor(rad * 5.0);
    const flute = Math.sin(ang * 16) * 0.5 + 0.5;
    const h = 0.5 + (ring - 0.5) * 0.55 + (flute - 0.5) * 0.20;
    return { r: 255, g: 255, b: 255, h, ao: 0.96, rgh: 0.18, met: 0.05 };
  }, { normalStrength: 2.2, wrapX: true, wrapY: true });
}

// =========================================================================
// DRUM DIAMOND PLACARD CANVAS TEXTURE (256x256, cached per THREE & kind)
// =========================================================================
// Drawn rotated +45 deg CW in canvas space so when the placard box rotates by
// rotation.z = +Math.PI/4 (front) or rotation.set(0, Math.PI, Math.PI/4) (back),
// the Class 3 FLAMMABLE / NAPALM flame pictogram & stencil text stand upright!
const PLACARD_CACHE = new WeakMap();

export function makeDrumPlacardTexture(T, kind = 'fuel') {
  if (!T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  if (typeof document === 'undefined' || !document.createElement) return null;
  let byKind = PLACARD_CACHE.get(T);
  if (!byKind) { byKind = {}; PLACARD_CACHE.set(T, byKind); }
  if (byKind[kind]) return byKind[kind];

  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;

  const isNapalm = kind === 'napalm';
  // Field background (grounded industrial red or caution yellow)
  ctx.fillStyle = isNapalm ? '#c99c32' : '#9c2c22';
  ctx.fillRect(0, 0, S, S);

  // Subtle surface grime/vignette across the placard plate
  const vg = ctx.createRadialGradient(S * 0.48, S * 0.46, S * 0.12, S * 0.5, S * 0.5, S * 0.75);
  vg.addColorStop(0, 'rgba(255,255,255,0.06)');
  vg.addColorStop(1, 'rgba(18,14,12,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, S, S);

  // Inner inset square border (becomes crisp inner diamond frame when box rotates +45 deg)
  ctx.strokeStyle = isNapalm ? '#191a1c' : '#e6e0d2';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, S - 36, S - 36);

  // Rotate +45 deg CW around center so local (+0.707, -0.707) = top-right maps to upright top!
  ctx.save();
  ctx.translate(S * 0.5, S * 0.5);
  ctx.rotate(Math.PI / 4);

  const ink = isNapalm ? '#161718' : '#efeae0';
  const accent = isNapalm ? '#9e261c' : '#181818';

  // Stylized DOT Class 3 flame pictogram above center
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(0, -104);
  ctx.bezierCurveTo(18, -76, 38, -64, 34, -36);
  ctx.bezierCurveTo(32, -20, 20, -14, 14, -14);
  ctx.bezierCurveTo(22, -28, 18, -42, 8, -48);
  ctx.bezierCurveTo(12, -32, 2, -20, -4, -14);
  ctx.bezierCurveTo(-18, -16, -34, -26, -34, -44);
  ctx.bezierCurveTo(-34, -64, -18, -72, -16, -86);
  ctx.bezierCurveTo(-8, -74, -4, -90, 0, -104);
  ctx.closePath();
  ctx.fill();

  // Secondary inner flame cutout / base bar
  ctx.fillRect(-38, -10, 76, 6);

  // Bold stencil banner across middle waist
  ctx.fillStyle = accent;
  ctx.fillRect(-92, 6, 184, 34);
  ctx.fillStyle = isNapalm ? '#efe2c0' : '#efeae0';
  ctx.font = 'bold 23px "Arial Narrow", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isNapalm ? 'NAPALM' : 'FLAMMABLE', 0, 24);

  // Class digit at bottom diamond apex
  ctx.fillStyle = ink;
  ctx.font = 'bold 34px "Arial", sans-serif';
  ctx.fillText('3', 0, 72);
  ctx.restore();

  // Deterministic field wear micro-scratches & faint soot specks
  ctx.strokeStyle = isNapalm ? 'rgba(35,30,24,0.22)' : 'rgba(235,228,216,0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const x0 = hash2i(i, 1, 77) * S;
    const y0 = hash2i(i, 2, 77) * S;
    const ang = hash2i(i, 3, 77) * Math.PI * 2;
    const len = 10 + hash2i(i, 4, 77) * 28;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
    ctx.stroke();
  }

  const rgba = ctx.getImageData(0, 0, S, S).data;
  const tex = makeDataTexture(T, rgba, S, S, {
    name: `bd-placard-${kind}`,
    srgb: true,
    repeat: false,
    aniso: 8,
  });
  byKind[kind] = tex;
  return tex;
}

// =========================================================================
// LAZY CACHED PBR LIBRARY (0 ms cold startup; built on demand per material)
// =========================================================================
const LIB_CACHE = new WeakMap();

export function getBuildPBR(T) {
  if (!T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  let lib = LIB_CACHE.get(T);
  if (lib) return lib;

  const textures = [];
  const pack = (name, px, { normalScale = 0.85, aoIntensity = 0.65, normalOnly = false } = {}) => {
    const nrm = makeDataTexture(T, px.nrm, px.w, px.h, { name: `${name}-nrm`, srgb: false, aniso: 4 });
    if (normalOnly) {
      if (nrm) textures.push(nrm);
      return {
        map: null,
        normalMap: nrm,
        ormMap: null,
        normalScale: T.Vector2 ? new T.Vector2(normalScale, normalScale) : { x: normalScale, y: normalScale },
        aoIntensity: 0,
      };
    }
    const map = makeDataTexture(T, px.col, px.w, px.h, { name: `${name}-col`, srgb: true, aniso: 4 });
    const orm = makeDataTexture(T, px.orm, px.w, px.h, { name: `${name}-orm`, srgb: false, aniso: 4 });
    if (map) textures.push(map);
    if (nrm) textures.push(nrm);
    if (orm) textures.push(orm);
    return {
      map,
      normalMap: nrm,
      ormMap: orm,
      normalScale: T.Vector2 ? new T.Vector2(normalScale, normalScale) : { x: normalScale, y: normalScale },
      aoIntensity,
    };
  };

  const builders = {
    stone:        () => pack('bd-stone',         buildStonePixels(512),        { normalScale: 0.82, aoIntensity: 0.68 }),
    wood:         () => pack('bd-wood',          buildWoodPixels(512),         { normalScale: 0.74, aoIntensity: 0.66 }),
    burlap:       () => pack('bd-burlap',        buildBurlapPixels(512),       { normalScale: 0.86, aoIntensity: 0.74 }),
    steel:        () => pack('bd-steel',         buildSteelPixels(512),        { normalScale: 0.78, aoIntensity: 0.58 }),
    paint:        () => pack('bd-paint',         buildPaintPixels(256),        { normalScale: 0.36, aoIntensity: 0.55 }),
    rust:         () => pack('bd-rust',          buildRustPixels(256),         { normalScale: 0.98, aoIntensity: 0.74 }),
    gunmetal:     () => pack('bd-gunmetal',      buildGunmetalPixels(256),     { normalScale: 0.62, aoIntensity: 0.54 }),
    wornSteel:    () => pack('bd-worn-steel',    buildWornSteelPixels(256),    { normalScale: 0.64, aoIntensity: 0.54 }),
    brass:        () => pack('bd-brass',         buildBrassPixels(256),        { normalScale: 0.62, aoIntensity: 0.58 }),
    rubberHose:   () => pack('bd-rubber-hose',   buildRubberHosePixels(256),   { normalScale: 0.95, aoIntensity: 0.76 }),
    hazardYellow: () => pack('bd-hazard-yellow', buildHazardYellowPixels(256), { normalScale: 0.38, aoIntensity: 0.56 }),
    opticalLens:  () => pack('bd-optical-lens',  buildOpticalLensPixels(128),  { normalScale: 0.88, normalOnly: true }),
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

// Apply a PBR texture bundle cleanly onto a MeshStandardMaterial.
// When `selfColored` is true, color is set to white so the authored sRGB albedo renders at exact calibrated luminance.
// Otherwise material.color / vertexColors tints the high-value neutral albedo map.
export function applyBuildPBR(mat, pbr, { selfColored = false, colorBoost = 1.0 } = {}) {
  if (!mat || !pbr) return mat;
  if (pbr.map) {
    mat.map = pbr.map;
    if (selfColored && mat.color && typeof mat.color.setHex === 'function') {
      mat.color.setHex(0xffffff);
    } else if (colorBoost !== 1.0 && mat.color && typeof mat.color.multiplyScalar === 'function') {
      mat.color.multiplyScalar(colorBoost);
    }
  }
  if (pbr.normalMap) {
    mat.normalMap = pbr.normalMap;
    if (mat.normalScale && typeof mat.normalScale.set === 'function') {
      mat.normalScale.set(pbr.normalScale.x, pbr.normalScale.y);
    }
  }
  if (pbr.ormMap) {
    mat.roughnessMap = pbr.ormMap;
    mat.metalnessMap = pbr.ormMap;
    mat.aoMap = pbr.ormMap;
    mat.aoMapIntensity = pbr.aoIntensity;
    mat.roughness = 1.0;
    mat.metalness = 1.0;
  }
  mat.needsUpdate = true;
  return mat;
}

// =========================================================================
// METRE-SCALE, GRAIN-ALIGNED & SHAPE-AWARE UV PROJECTOR FOR BUILDABLES
// =========================================================================
// Projects clean, unstretched metre-scale UVs onto every child mesh BEFORE static baking
// (`mergeStatic`), ensuring:
// 1. Wood grain (`alignLongAxis: true`) ALWAYS follows each plank, post, X-brace, or stringer's longest axis.
// 2. Cylinders, cones, tori and spheres scale their parametric UVs with integer circumferential repeats
//    so barrels, fuel tanks, turret barrels, chimes and hoses wrap 360 deg with ZERO UV seam.
// 3. Each stone block, plank, sandbag and plate receives a deterministic position-based UV offset so
//    adjacent blocks never look cloned while still merging cleanly into 1 draw call per master material.
const PARAMETRIC_TYPES = new Set([
  'CylinderGeometry',
  'ConeGeometry',
  'TorusGeometry',
  'SphereGeometry',
  'TubeGeometry',
]);

function posOffset(mesh) {
  const px = mesh.position ? mesh.position.x : 0;
  const py = mesh.position ? mesh.position.y : 0;
  const pz = mesh.position ? mesh.position.z : 0;
  const ix = Math.round(px * 100);
  const iy = Math.round(py * 100);
  const iz = Math.round(pz * 100);
  return {
    u: hash2i(ix + iz * 17, iy * 13 + iz, 1013),
    v: hash2i(iy + ix * 19, iz * 11 + ix, 1031),
  };
}

export function projectMeshBuildUV(mesh, spec) {
  if (!mesh || !mesh.geometry) return false;
  const geo = mesh.geometry;
  if (!geo.attributes || !geo.attributes.position) return false;
  if (geo.userData && geo.userData.buildUVDone) return false;

  const tile = Math.max(0.05, Number(spec && spec.tile) || 0.8);
  const alignLongAxis = !!(spec && spec.alignLongAxis);
  const off = posOffset(mesh);

  const sx = Math.abs(mesh.scale ? mesh.scale.x : 1) || 1;
  const sy = Math.abs(mesh.scale ? mesh.scale.y : 1) || 1;
  const sz = Math.abs(mesh.scale ? mesh.scale.z : 1) || 1;

  // Parametric curved shapes: preserve seamless wrap while scaling UVs to real metre density
  if ((PARAMETRIC_TYPES.has(geo.type) || (spec && spec.cylindrical)) && geo.attributes.uv) {
    const uv = geo.attributes.uv;
    const p = geo.parameters || {};
    let su = 1, sv = 1;
    if (geo.type === 'CylinderGeometry' || geo.type === 'ConeGeometry') {
      const r = Math.max(p.radiusTop || 0, p.radiusBottom || 0, p.radius || 0, 0.04) * Math.max(sx, sz);
      const h = (p.height || 0.2) * sy;
      su = Math.max(1, Math.round((2 * Math.PI * r) / tile));
      sv = Math.max(0.18, h / tile);
    } else if (geo.type === 'TorusGeometry') {
      const R = (p.radius || 0.1) * Math.max(sx, sy);
      const r = (p.tube || 0.02) * sz;
      su = Math.max(1, Math.round((2 * Math.PI * R) / tile));
      sv = Math.max(1, Math.round((2 * Math.PI * r) / tile));
    } else if (geo.type === 'SphereGeometry') {
      const r = (p.radius || 0.1) * Math.max(sx, sy, sz);
      su = Math.max(1, Math.round((2 * Math.PI * r) / tile));
      sv = Math.max(1, Math.round((Math.PI * r) / tile));
    } else {
      su = Math.max(1, Math.round(1 / tile));
      sv = Math.max(0.25, 1 / tile);
    }
    const n = uv.count;
    const arr = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      arr[i * 2] = uv.getX(i) * su + off.u;
      arr[i * 2 + 1] = uv.getY(i) * sv + off.v;
    }
    if (uv.array && uv.array.length === arr.length) {
      uv.array.set(arr);
      uv.needsUpdate = true;
    } else if (geo.attributes.position.constructor) {
      geo.setAttribute('uv', new geo.attributes.position.constructor(arr, 2));
    }
    if (!geo.userData) geo.userData = {};
    geo.userData.buildUVDone = true;
    return true;
  }

  // Box / rounded-box / flat-panel projection in local scaled metres
  const pos = geo.attributes.position;
  let nrm = geo.attributes.normal;
  if (!nrm && typeof geo.computeVertexNormals === 'function') {
    geo.computeVertexNormals();
    nrm = geo.attributes.normal;
  }
  if (!nrm) return false;

  const count = pos.count;
  let longAxis = 'x';
  if (alignLongAxis) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const ex = (maxX - minX) * sx;
    const ey = (maxY - minY) * sy;
    const ez = (maxZ - minZ) * sz;
    if (ey >= ex && ey >= ez) longAxis = 'y';
    else if (ez >= ex && ez >= ey) longAxis = 'z';
    else longAxis = 'x';
  }

  const inv = 1 / tile;
  const arr = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i) * sx;
    const y = pos.getY(i) * sy;
    const z = pos.getZ(i) * sz;
    const ax = Math.abs(nrm.getX(i));
    const ay = Math.abs(nrm.getY(i));
    const az = Math.abs(nrm.getZ(i));
    let u, v;
    if (alignLongAxis) {
      if (longAxis === 'y') {
        // Vertical post / upright stile -> U runs along Y on all side faces
        if (ay >= ax && ay >= az) { u = x; v = z; }
        else if (ax >= ay && ax >= az) { u = y; v = z; }
        else { u = y; v = x; }
      } else if (longAxis === 'z') {
        // Depth-running beam / stringer / joist -> U runs along Z
        if (ay >= ax && ay >= az) { u = z; v = x; }
        else if (ax >= ay && ax >= az) { u = z; v = y; }
        else { u = x; v = y; }
      } else {
        // Horizontal plank / rail / X-brace -> U runs along X
        if (ay >= ax && ay >= az) { u = x; v = z; }
        else if (ax >= ay && ax >= az) { u = z; v = y; }
        else { u = x; v = y; }
      }
    } else {
      if (ay >= ax && ay >= az) { u = x; v = z; }
      else if (ax >= ay && ax >= az) { u = z; v = y; }
      else { u = x; v = y; }
    }
    arr[i * 2] = u * inv + off.u;
    arr[i * 2 + 1] = v * inv + off.v;
  }

  const uvAttr = geo.attributes.uv;
  if (uvAttr && uvAttr.array && uvAttr.array.length === arr.length) {
    uvAttr.array.set(arr);
    uvAttr.needsUpdate = true;
  } else if (pos.constructor) {
    geo.setAttribute('uv', new pos.constructor(arr, 2));
  }
  if (!geo.userData) geo.userData = {};
  geo.userData.buildUVDone = true;
  return true;
}

export function projectBuildUVs(root, specByMat) {
  if (!root || !specByMat || !specByMat.size) return 0;
  const geoUses = new Map();
  const targets = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || Array.isArray(o.material)) return;
    if (o.userData && o.userData.skipBuildUV) return;
    if (!specByMat.has(o.material)) return;
    geoUses.set(o.geometry, (geoUses.get(o.geometry) || 0) + 1);
    targets.push(o);
  });
  let count = 0;
  for (const m of targets) {
    // If a geometry was ever shared across multiple meshes, clone before projecting so UVs stay unique
    if (geoUses.get(m.geometry) > 1 && typeof m.geometry.clone === 'function') {
      m.geometry = m.geometry.clone();
    }
    if (projectMeshBuildUV(m, specByMat.get(m.material))) count++;
  }
  return count;
}

export const _TEST_SYNTH = Object.freeze({
  buildStonePixels,
  buildWoodPixels,
  buildBurlapPixels,
  buildSteelPixels,
  buildPaintPixels,
  buildRustPixels,
  buildGunmetalPixels,
  buildWornSteelPixels,
  buildBrassPixels,
  buildRubberHosePixels,
  buildHazardYellowPixels,
  buildOpticalLensPixels,
});

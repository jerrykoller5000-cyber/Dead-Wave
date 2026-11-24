// world/bridge-dock-textures.js — AH-13: Procedural PBR textures, oriented timber UVs, chamfered plank geometry,
// and vertex-colored UV-preserving mesh baker for all river bridges and the lake dock.
// Deterministic, zero CDN, WebGPU-ready (flipY=false bottom-up DataTextures, packed linear ORM:
// R=AO, G=Roughness, B=Metalness, channel=0), Node/fakethree safe.
import {
  tileFbm,
  heightToNormalRGBA,
  makeDataTexture,
} from './training-textures.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

function hash2i(ix, iy, seed) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

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
    const gx = (((u % 1) + 1) % 1) * gridSize;
    const gy = (((v % 1) + 1) % 1) * gridSize;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const ix0 = x0 & mask, ix1 = (ix0 + 1) & mask;
    const iy0 = y0 & mask, iy1 = (iy0 + 1) & mask;
    const r0 = iy0 * gridSize, r1 = iy1 * gridSize;
    return lerp(lerp(buf[r0 + ix0], buf[r0 + ix1], fx), lerp(buf[r1 + ix0], buf[r1 + ix1], fx), fy);
  };
}

function tileWorley(u, v, px, py, seed = 23) {
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
      if (d < d1) { d2 = d1; d1 = d; id = hash2i(nx, ny, seed + 211); }
      else if (d < d2) d2 = d;
    }
  }
  return { d1: Math.sqrt(d1), edge: Math.sqrt(d2) - Math.sqrt(d1), id };
}

function makeSet(T, name, { albedo, orm, height, w, h, nrmStrength = 2.6, wrapX = true, wrapY = true, aniso = 8 }) {
  const map = makeDataTexture(T, albedo, w, h, { name: `${name}-albedo`, srgb: true, repeat: wrapX && wrapY, aniso });
  const ormTex = makeDataTexture(T, orm, w, h, { name: `${name}-orm`, srgb: false, repeat: wrapX && wrapY, aniso });
  if (ormTex) ormTex.channel = 0;
  const nrmData = heightToNormalRGBA(height, w, h, nrmStrength, wrapX, wrapY);
  const normalMap = makeDataTexture(T, nrmData, w, h, { name: `${name}-nrm`, srgb: false, repeat: wrapX && wrapY, aniso });
  const applyWrap = (tex) => {
    if (!tex) return;
    tex.wrapS = wrapX ? T.RepeatWrapping : T.ClampToEdgeWrapping;
    tex.wrapT = wrapY ? T.RepeatWrapping : T.ClampToEdgeWrapping;
  };
  applyWrap(map);
  applyWrap(ormTex);
  applyWrap(normalMap);
  return {
    name,
    map,
    normalMap,
    ormMap: ormTex,
    roughnessMap: ormTex,
    metalnessMap: ormTex,
    aoMap: ormTex,
    material({
      color = 0xffffff,
      vertexColors = true,
      normalScale = 1.0,
      aoMapIntensity = 0.72,
      roughness = 1.0,
      metalness = 1.0,
      extra = null,
    } = {}) {
      if (!map) {
        return new T.MeshStandardMaterial({
          color,
          vertexColors,
          roughness: metalness > 0.5 ? 0.55 : 0.86,
          metalness: metalness > 0.5 ? 0.45 : 0.04,
          ...(extra || {}),
        });
      }
      const opts = {
        color,
        vertexColors,
        map,
        normalMap,
        normalScale: new T.Vector2(normalScale, normalScale),
        roughnessMap: ormTex,
        metalnessMap: ormTex,
        aoMap: ormTex,
        aoMapIntensity,
        roughness,
        metalness,
      };
      if (extra) Object.assign(opts, extra);
      return new T.MeshStandardMaterial(opts);
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Weathered Structural Deck & Timber Grain (512x512, seamless)
//    U runs along plank length, V runs across plank width.
//    Neutral bright weathered base (~0.80-0.96 luminance) designed for
//    vertexColors tinting so individual planks, curbs, stringers and rails
//    show rich natural variation in a single draw call.
// ---------------------------------------------------------------------------
export function buildDeckTimberPixels(N = 512) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gWarp = makeFbmGrid(64, 3, 5, 5101, 3, 0.52);
  const gFiber = makeFbmGrid(128, 6, 44, 5119, 3, 0.56);
  const gFine = makeFbmGrid(128, 12, 72, 5147, 2, 0.50);
  const gWeather = makeFbmGrid(64, 4, 4, 5171, 3, 0.55);
  const gCheck = makeFbmGrid(128, 4, 56, 5197, 3, 0.52);

  // 4 subtle knots distributed across the tile
  const knots = [
    { u: 0.22, v: 0.26, rx: 0.075, ry: 0.036, str: 0.9 },
    { u: 0.68, v: 0.14, rx: 0.055, ry: 0.028, str: 0.75 },
    { u: 0.48, v: 0.64, rx: 0.085, ry: 0.042, str: 1.0 },
    { u: 0.86, v: 0.82, rx: 0.062, ry: 0.030, str: 0.8 },
  ];

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;

      const warp = gWarp(u, v) - 0.5;
      const fiber = gFiber(u, v + warp * 0.07);
      const fine = gFine(u, v);
      const weather = gWeather(u, v);
      const checkNoise = gCheck(u, v);

      // Cathedral / longitudinal growth rings along U
      let ringCoord = (v * 11.0 + warp * 1.45 + Math.sin(u * Math.PI * 2) * 0.28);
      let knotDark = 0, knotHeight = 0;
      for (const k of knots) {
        let du = u - k.u; if (du > 0.5) du -= 1; else if (du < -0.5) du += 1;
        let dv = v - k.v; if (dv > 0.5) dv -= 1; else if (dv < -0.5) dv += 1;
        const d2 = (du / k.rx) ** 2 + (dv / k.ry) ** 2;
        if (d2 < 4.0) {
          const d = Math.sqrt(d2);
          ringCoord += Math.exp(-d2 * 1.1) * 1.65 * k.str * (dv >= 0 ? 1 : -1);
          const core = 1 - sstep(0.18, 0.92, d);
          const halo = 1 - sstep(0.7, 1.55, d);
          knotDark = Math.max(knotDark, core * 0.42 + halo * 0.12);
          knotHeight = Math.max(knotHeight, core * 0.18);
        }
      }

      const ringWave = 0.5 + 0.5 * Math.sin(ringCoord * Math.PI * 2);
      const earlyLate = Math.pow(ringWave, 1.35);

      // Drying checks (thin dark longitudinal splits)
      const checkMask = sstep(0.76, 0.90, checkNoise) * (0.45 + 0.55 * sstep(0.55, 0.82, fine));

      // Subtle sun-bleached silvering patches vs damp darker grain pockets
      const bleach = sstep(0.45, 0.85, weather) * 0.10;
      const damp = (1 - sstep(0.18, 0.52, weather)) * 0.11;

      // Heightfield for normal map (ridges on dense latewood, recessed earlywood & drying checks)
      const hVal = clamp(
        0.54
        + (earlyLate - 0.5) * 0.22
        + (fiber - 0.5) * 0.20
        + (fine - 0.5) * 0.10
        - checkMask * 0.34
        + knotHeight * 0.12,
        0, 1
      );
      height[idx] = hVal;

      // Neutral bright timber base (vertex color supplies warm/silver/dark wood species hue)
      let base = 0.87
        + (earlyLate - 0.5) * 0.14
        + (fiber - 0.5) * 0.11
        + (fine - 0.5) * 0.05
        + bleach * 0.45
        - damp
        - knotDark * 0.55
        - checkMask * 0.34;
      base = clamp(base, 0.28, 0.98);

      // Slight warm tint in grain ridges, cooler silver in sun-bleached pockets
      const r = clamp(base * (1.03 - bleach * 0.18 - knotDark * 0.06), 0, 1);
      const g = clamp(base * (0.99 - bleach * 0.06 - knotDark * 0.14), 0, 1);
      const b = clamp(base * (0.92 + bleach * 0.18 - knotDark * 0.20), 0, 1);

      albedo[o] = Math.round(r * 255);
      albedo[o + 1] = Math.round(g * 255);
      albedo[o + 2] = Math.round(b * 255);
      albedo[o + 3] = 255;

      const ao = clamp(0.95 - checkMask * 0.42 - (1 - earlyLate) * 0.09 - knotDark * 0.16, 0.42, 1.0);
      const rough = clamp(0.84 + (1 - earlyLate) * 0.07 + checkMask * 0.09 - damp * 0.55 - knotDark * 0.10, 0.58, 0.96);
      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rough * 255);
      orm[o + 2] = 0; // non-metallic wood
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// 2. River & Lake Timber Pilings with Waterline Algae & Wet Saturation (512x512)
//    wrapX = true (around cylinder), wrapY = false (bottom underwater -> top dry!).
//    Canvas row y=0 is TOP (v=1 dry); canvas row y=N-1 is BOTTOM (v=0 submerged).
//    Waterline sits right at v = 0.46 (canvas y ~ 0.54 * N).
// ---------------------------------------------------------------------------
export function buildPilingTimberPixels(N = 512) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gBark = makeFbmGrid(128, 36, 4, 5303, 3, 0.56);
  const gSplit = makeFbmGrid(128, 48, 3, 5329, 3, 0.52);
  const gAlgae = makeFbmGrid(64, 10, 8, 5351, 3, 0.55);
  const gMicro = makeFbmGrid(128, 28, 20, 5381, 2, 0.5);

  for (let y = 0; y < N; y++) {
    // v=1 at top (y=0), v=0 at bottom (y=N-1) after flipRowsRGBA
    const v = 1 - y / (N - 1);
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;

      const bark = gBark(u, v);
      const split = gSplit(u, v);
      const algaeNoise = gAlgae(u, v);
      const micro = gMicro(u, v);

      // Vertical deep checks/fissures along the piling trunk
      const fissure = sstep(0.68, 0.88, split);

      // Irregular waterline jitter (waterline at v=0.42, capillary wicking & mossy algae reaching ~0.5m above water)
      const wLine = 0.42 + (algaeNoise - 0.5) * 0.08;
      // Wet zone: below wLine + strong capillary wicking above waterline
      const wetSubmerged = 1 - sstep(wLine - 0.03, wLine + 0.11, v);
      const dampWick = 1 - sstep(wLine + 0.04, wLine + 0.24, v);
      // Green-brown mossy algae collar concentrated right at/just above waterline
      const algaeBand = Math.exp(-Math.pow((v - (wLine + 0.05)) / 0.11, 2))
        * sstep(0.28, 0.70, algaeNoise);

      // Dry sun-bleached weathered cedar/creosote timber at top, dark saturated creosote below
      const dryLuma = 0.70 + (bark - 0.5) * 0.22 + (micro - 0.5) * 0.08 - fissure * 0.28;
      let r = dryLuma * 1.02;
      let g = dryLuma * 0.90;
      let b = dryLuma * 0.75;

      // Darken wet wood (water fills surface pores -> much darker, richer brown-black)
      const wetDark = 1 - wetSubmerged * 0.58 - dampWick * 0.26;
      r *= wetDark;
      g *= wetDark * (1 - wetSubmerged * 0.04);
      b *= wetDark * (1 - wetSubmerged * 0.08);

      // Blend mossy river/lake algae stain (muted natural olive, <40% saturation)
      const alg = clamp(algaeBand * 0.85, 0, 0.85);
      r = lerp(r, 0.19 + micro * 0.06, alg);
      g = lerp(g, 0.30 + micro * 0.08, alg);
      b = lerp(b, 0.14 + micro * 0.04, alg);

      albedo[o] = Math.round(clamp(r, 0.04, 0.96) * 255);
      albedo[o + 1] = Math.round(clamp(g, 0.04, 0.96) * 255);
      albedo[o + 2] = Math.round(clamp(b, 0.04, 0.96) * 255);
      albedo[o + 3] = 255;

      height[idx] = clamp(0.54 + (bark - 0.5) * 0.26 - fissure * 0.36 + alg * 0.12 + (micro - 0.5) * 0.09, 0, 1);

      const ao = clamp(0.92 - fissure * 0.45 - wetSubmerged * 0.12 - alg * 0.14, 0.35, 1.0);
      // Wet lower piling has glossy wet-wood specular sheen (0.28-0.44); upper dry piling is matte (0.86-0.95)
      const rough = clamp(
        lerp(0.89 + fissure * 0.06, 0.31 + micro * 0.12, wetSubmerged)
        - dampWick * 0.14
        + alg * 0.26,
        0.26, 0.96
      );
      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rough * 255);
      orm[o + 2] = 0;
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

function makeWorleyGrid(gridSize, px, py, seed = 23) {
  const buf = new Float32Array(gridSize * gridSize);
  for (let y = 0; y < gridSize; y++) {
    const v = y / gridSize;
    for (let x = 0; x < gridSize; x++) {
      buf[y * gridSize + x] = tileWorley(x / gridSize, v, px, py, seed).d1;
    }
  }
  const mask = gridSize - 1;
  return (u, v) => {
    const gx = (((u % 1) + 1) % 1) * gridSize;
    const gy = (((v % 1) + 1) % 1) * gridSize;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const ix0 = x0 & mask, ix1 = (ix0 + 1) & mask;
    const iy0 = y0 & mask, iy1 = (iy0 + 1) & mask;
    const r0 = iy0 * gridSize, r1 = iy1 * gridSize;
    return lerp(lerp(buf[r0 + ix0], buf[r0 + ix1], fx), lerp(buf[r1 + ix0], buf[r1 + ix1], fx), fy);
  };
}

// ---------------------------------------------------------------------------
// 3. Weathered Galvanized & Rusted Bridge Iron / Steel Hardware (512x512)
//    Neutral bright metallic base with rust pitting & brushed streaks.
//    Designed for vertexColors tinting (dark iron cleats, steel girders,
//    galvanized brackets, rusted bolts, hazard plates).
// ---------------------------------------------------------------------------
export function buildBridgeIronPixels(N = 512) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gBroad = makeFbmGrid(64, 5, 5, 5501, 3, 0.55);
  const gBrush = makeFbmGrid(128, 32, 6, 5527, 2, 0.50);
  const gRust = makeFbmGrid(64, 8, 8, 5557, 3, 0.58);
  const gFine = makeFbmGrid(128, 22, 22, 5581, 2, 0.52);
  const gPit = makeWorleyGrid(128, 10, 10, 5599);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;

      const broad = gBroad(u, v);
      const brush = gBrush(u, v);
      const rustN = gRust(u, v);
      const fine = gFine(u, v);
      const pitD1 = gPit(u, v);

      const rustMask = sstep(0.55, 0.78, rustN * 0.72 + (1 - pitD1) * 0.28);
      const pitMask = (1 - sstep(0.05, 0.22, pitD1)) * 0.45;

      // Brushed weathered galvanized steel blended with muted warm iron-oxide rust
      // Kept bright enough under overcast sky lighting so steel girders & brackets read crisply as iron, not black
      const steel = 0.84 + (broad - 0.5) * 0.16 + (brush - 0.5) * 0.10 + (fine - 0.5) * 0.06 - pitMask * 0.16;
      let r = steel * 0.96;
      let g = steel * 0.98;
      let b = steel * 1.02;

      // Warm desaturated oxide rust
      r = lerp(r, 0.62 + fine * 0.14, rustMask * 0.80);
      g = lerp(g, 0.39 + fine * 0.09, rustMask * 0.80);
      b = lerp(b, 0.26 + fine * 0.05, rustMask * 0.80);

      albedo[o] = Math.round(clamp(r, 0.10, 0.98) * 255);
      albedo[o + 1] = Math.round(clamp(g, 0.10, 0.98) * 255);
      albedo[o + 2] = Math.round(clamp(b, 0.10, 0.98) * 255);
      albedo[o + 3] = 255;

      height[idx] = clamp(0.55 + (brush - 0.5) * 0.10 + (fine - 0.5) * 0.12 - pitMask * 0.32 + rustMask * 0.09, 0, 1);

      const ao = clamp(0.95 - pitMask * 0.34 - rustMask * 0.16, 0.44, 1.0);
      const rough = clamp(lerp(0.46 + (broad - 0.5) * 0.14, 0.88, rustMask) + pitMask * 0.14, 0.34, 0.96);
      const metal = clamp(lerp(0.76, 0.12, rustMask) - pitMask * 0.20, 0.05, 0.82);

      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rough * 255);
      orm[o + 2] = Math.round(metal * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// 4. Braided Hemp Mooring Rope & Dock Cordage (256x256, seamless)
//    Diagonal 3-strand twist relief + fibrous dry roughness.
// ---------------------------------------------------------------------------
export function buildRopePixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gFiber = makeFbmGrid(64, 24, 24, 5701, 3, 0.52);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;

      const strand = Math.sin((u * 6 + v * 3) * Math.PI * 2);
      const ridge = 0.5 + 0.5 * strand;
      const groove = Math.pow(ridge, 0.55);
      const micro = gFiber(u + v * 0.5, v - u * 0.25);

      const luma = clamp(0.68 + groove * 0.26 + (micro - 0.5) * 0.12, 0.28, 0.96);
      albedo[o] = Math.round(luma * 255);
      albedo[o + 1] = Math.round(luma * 0.95 * 255);
      albedo[o + 2] = Math.round(luma * 0.84 * 255);
      albedo[o + 3] = 255;

      height[idx] = clamp(0.25 + groove * 0.62 + (micro - 0.5) * 0.16, 0, 1);
      orm[o] = Math.round(clamp(0.58 + groove * 0.40, 0.45, 1.0) * 255);
      orm[o + 1] = Math.round(clamp(0.92 - groove * 0.06 + (micro - 0.5) * 0.06, 0.80, 0.98) * 255);
      orm[o + 2] = 0;
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// Cached library per THREE instance
// ---------------------------------------------------------------------------
const _cache = new WeakMap();

export function getBridgeDockTextures(T) {
  if (!T) return null;
  if (_cache.has(T)) return _cache.get(T);

  const deckTimber = makeSet(T, 'bridge-dock-deck-timber', { ...buildDeckTimberPixels(512), nrmStrength: 2.8, wrapX: true, wrapY: true });
  const pilingTimber = makeSet(T, 'bridge-dock-piling-timber', { ...buildPilingTimberPixels(512), nrmStrength: 3.1, wrapX: true, wrapY: false });
  const bridgeIron = makeSet(T, 'bridge-dock-iron', { ...buildBridgeIronPixels(512), nrmStrength: 2.4, wrapX: true, wrapY: true });
  const rope = makeSet(T, 'bridge-dock-rope', { ...buildRopePixels(256), nrmStrength: 3.0, wrapX: true, wrapY: true });

  const lib = {
    deckTimber,
    pilingTimber,
    bridgeIron,
    rope,
    mats: {
      deck: deckTimber.material({ vertexColors: true, normalScale: 1.05, aoMapIntensity: 0.72 }),
      piling: pilingTimber.material({ vertexColors: true, normalScale: 1.15, aoMapIntensity: 0.75 }),
      iron: bridgeIron.material({ vertexColors: true, normalScale: 0.95, aoMapIntensity: 0.78 }),
      rope: rope.material({ vertexColors: true, normalScale: 1.0, aoMapIntensity: 0.75 }),
    },
  };
  _cache.set(T, lib);
  return lib;
}

// ---------------------------------------------------------------------------
// World-scale grain-aligned UV helpers
// ---------------------------------------------------------------------------

/**
 * Remaps BoxGeometry (or chamfered box) UVs in metres so the grain (U axis)
 * runs strictly along the chosen axis ('x', 'y', 'z', or 'auto' = longest axis).
 */
export function orientBoxUVs(geo, w, h, d, { grainAxis = 'auto', scaleU = 0.55, scaleV = 1.6, uOff = 0, vOff = 0 } = {}) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  let uv = geo.attributes.uv;
  if (!pos || !nrm) return geo;
  if (!uv) {
    uv = new pos.constructor(new Float32Array(pos.count * 2), 2);
    geo.setAttribute('uv', uv);
  }
  const axis = grainAxis === 'auto'
    ? (w >= h && w >= d ? 'x' : (d >= h ? 'z' : 'y'))
    : grainAxis;

  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    let u = 0, v = 0;
    if (axis === 'x') {
      u = px * scaleU;
      v = (ay >= az ? pz : py) * scaleV;
    } else if (axis === 'z') {
      u = pz * scaleU;
      v = (ay >= ax ? px : py) * scaleV;
    } else {
      u = py * scaleU;
      v = (ax >= az ? pz : px) * scaleV;
    }
    uv.setXY(i, u + uOff, v + vOff);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Maps a cylinder piling's V coordinate directly to real-world water height so
 * the wet saturation & mossy algae collar sits at the EXACT water surface!
 * localCenterY = piling center Y relative to deckY.
 * waterLocalY  = water surface Y relative to deckY.
 */
export function orientPilingWaterlineUVs(geo, localCenterY, waterLocalY, { uRepeat = 2.0, uOff = 0, vPerMeter = 0.30 } = {}) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (!pos || !uv) return geo;
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i) + localCenterY;
    const u0 = uv.getX(i);
    // Waterline is at v = 0.42 in buildPilingTimberPixels
    const v = clamp(0.42 + (py - waterLocalY) * vPerMeter, 0.015, 0.985);
    uv.setXY(i, u0 * uRepeat + uOff, v);
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Creates a subtly chamfered timber plank/beam BoxGeometry (top & long edges chamfered)
 * so sunlight catches plank bevels and seams read crisply without box-soup overlays.
 */
export function chamferedTimberGeo(T, w, h, d, bevel = 0.012, grainAxis = 'auto', uvOpts = {}) {
  const b = Math.min(bevel, Math.min(w, h, d) * 0.28);
  // Build a crisp 3-segment cross-section box (only 12 quads/24 tris per face where needed, or fast 2x2x2 bevel)
  const geo = new T.BoxGeometry(w, h, d, 2, 2, 2);
  const pos = geo.attributes.position;
  const hx = w * 0.5, hy = h * 0.5, hz = d * 0.5;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const sx = Math.abs(x) > hx * 0.95 ? Math.sign(x) : 0;
    const sy = Math.abs(y) > hy * 0.95 ? Math.sign(y) : 0;
    const sz = Math.abs(z) > hz * 0.95 ? Math.sign(z) : 0;
    const edges = (sx ? 1 : 0) + (sy ? 1 : 0) + (sz ? 1 : 0);
    if (edges >= 2) {
      // Gently chamfer edges (especially top face edges so plank seams catch light!)
      const f = edges === 3 ? 0.72 : 1.0;
      if (sy > 0) {
        if (sx) x -= sx * b * f;
        if (sz) z -= sz * b * f;
        y -= b * 0.35 * f;
      } else if (sx && sz) {
        x -= sx * b * 0.65 * f;
        z -= sz * b * 0.65 * f;
      }
      pos.setXYZ(i, x, y, z);
    }
  }
  geo.computeVertexNormals();
  orientBoxUVs(geo, w, h, d, { grainAxis, ...uvOpts });
  return geo;
}

/**
 * Bakes an array of Mesh parts into ONE vertex-colored, UV-preserving BufferGeometry Mesh.
 * Unlike core/geometry.js's mergeParts (which strips UVs), this preserves UVs so full PBR
 * albedo + normal + ORM textures render in 1 draw call per material while retaining per-part
 * color tinting!
 */
export function mergeTexturedParts(T, parts, material, opts = {}) {
  const prepared = [];
  let total = 0;
  for (const p of parts) {
    if (!p || !p.geometry) continue;
    const g = p.geometry;
    const geo = g.index ? g.toNonIndexed() : g;
    const pos = geo.attributes.position;
    if (!pos || pos.count === 0) continue;
    total += pos.count;
    prepared.push({ geo, mesh: p, count: pos.count });
  }
  if (total === 0) return null;

  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const colors = new Float32Array(total * 3);

  const mat4 = new T.Matrix4();
  const nrm3 = new T.Matrix3();
  const v = new T.Vector3();
  let o = 0;

  for (const { geo, mesh, count } of prepared) {
    mesh.updateMatrix();
    mat4.copy(mesh.matrix);
    nrm3.getNormalMatrix(mat4);
    const pos = geo.attributes.position;
    const nrm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const vcol = geo.attributes.color;
    const col = (mesh.material && mesh.material.color) ? mesh.material.color : { r: 1, g: 1, b: 1 };

    for (let i = 0; i < count; i++) {
      const w3 = (o + i) * 3;
      const w2 = (o + i) * 2;
      v.fromBufferAttribute(pos, i).applyMatrix4(mat4);
      positions[w3] = v.x; positions[w3 + 1] = v.y; positions[w3 + 2] = v.z;
      if (nrm) {
        v.fromBufferAttribute(nrm, i).applyMatrix3(nrm3).normalize();
        normals[w3] = v.x; normals[w3 + 1] = v.y; normals[w3 + 2] = v.z;
      } else {
        normals[w3] = 0; normals[w3 + 1] = 1; normals[w3 + 2] = 0;
      }
      if (uv) {
        uvs[w2] = uv.getX(i);
        uvs[w2 + 1] = uv.getY(i);
      } else {
        // Fallback planar UV from local coordinates if a custom geometry lacked UVs
        uvs[w2] = positions[w3] * 0.5;
        uvs[w2 + 1] = positions[w3 + 2] * 0.5;
      }
      if (vcol) {
        colors[w3] = col.r * vcol.getX(i);
        colors[w3 + 1] = col.g * vcol.getY(i);
        colors[w3 + 2] = col.b * vcol.getZ(i);
      } else {
        colors[w3] = col.r;
        colors[w3 + 1] = col.g;
        colors[w3 + 2] = col.b;
      }
    }
    o += count;
  }

  const merged = new T.BufferGeometry();
  merged.setAttribute('position', new T.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new T.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new T.BufferAttribute(uvs, 2));
  merged.setAttribute('color', new T.BufferAttribute(colors, 3));
  merged.computeBoundingSphere();

  const out = new T.Mesh(merged, material);
  out.castShadow = !!opts.castShadow;
  out.receiveShadow = !!opts.receiveShadow;
  if (opts.name) out.name = opts.name;
  return out;
}

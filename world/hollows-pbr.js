// world/hollows-pbr.js — AG-416: Procedural WebGPU-native PBR texture & material library
// for all five subterranean Hollows warrens (root, shale, iron, wet, hill).
//
// Deterministic, zero Math.random(), WebGPU-ready (flipY=false bottom-up DataTextures,
// linear packed ORM with R=AO, G=Roughness, B=Metalness, ormTex.channel=0), Node/fakethree safe.
// Follows docs/art-direction.md (natural base saturation <45%, 4 families, reserved color discipline)
// and docs/asset-principles.md (macro/medium/micro hierarchy, honest PBR roughness/metalness).

import {
  tileFbm,
  tileNoise,
  heightToNormalRGBA,
  makeDataTexture,
} from './training-textures.js';
import { getCaveEntrancePBR } from './cave-entrance-textures.js';
import { drawGlyph, RUNE_COUNT } from './runes.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / ((b - a) || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeFbmGrid(gridSize, px, py, seed, octaves = 3, gain = 0.54) {
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

function makeRidgedGrid(gridSize, px, py, seed, octaves = 3, gain = 0.55) {
  const buf = new Float32Array(gridSize * gridSize);
  for (let y = 0; y < gridSize; y++) {
    const v = y / gridSize;
    for (let x = 0; x < gridSize; x++) {
      const u = x / gridSize;
      let sum = 0, amp = 0.55, norm = 0, f = 1;
      for (let o = 0; o < octaves; o++) {
        const n = tileNoise(u, v, px * f, py * f, seed + o * 59);
        const r = 1 - Math.abs(n * 2 - 1);
        sum += r * r * amp;
        norm += amp;
        amp *= gain;
        f *= 2;
      }
      buf[y * gridSize + x] = norm > 0 ? sum / norm : 0.5;
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

function makePBRSet(T, name, { albedo, orm, height, w, h, nrmStrength = 2.8, aniso = 8 }) {
  const map = makeDataTexture(T, albedo, w, h, { name: `${name}-albedo`, srgb: true, repeat: true, aniso });
  const ormTex = makeDataTexture(T, orm, w, h, { name: `${name}-orm`, srgb: false, repeat: true, aniso });
  if (ormTex) ormTex.channel = 0;
  const nrmData = heightToNormalRGBA(height, w, h, nrmStrength, true, true);
  const normalMap = makeDataTexture(T, nrmData, w, h, { name: `${name}-nrm`, srgb: false, repeat: true, aniso });
  return {
    name,
    map,
    normalMap,
    ormMap: ormTex,
    opts({ color = 0xffffff, normalScale = 1.15, aoMapIntensity = 0.78, roughness = 1.0, metalness = 1.0, vertexColors = false, side = null, extra = null } = {}) {
      if (!map) {
        return {
          color,
          roughness: 0.88,
          metalness: 0.04,
          vertexColors,
          ...(side != null ? { side } : {}),
          ...(extra || {}),
        };
      }
      const out = {
        color,
        map,
        normalMap,
        normalScale: new T.Vector2(normalScale, normalScale),
        roughnessMap: ormTex,
        metalnessMap: ormTex,
        aoMap: ormTex,
        aoMapIntensity,
        roughness,
        metalness,
        vertexColors,
      };
      if (side != null) out.side = side;
      if (extra) Object.assign(out, extra);
      return out;
    },
  };
}

// ---------------------------------------------------------------------------
// Subterranean Geological Rock & Floor PBR Synth (all 5 warren themes)
// ---------------------------------------------------------------------------
const GEOLOGY_SPECS = Object.freeze({
  root: {
    seed: 41601,
    wall: [96, 83, 68], wallAlt: [68, 78, 52],   // damp earthy sandstone + root-crevice moss
    floor: [76, 63, 49], floorAlt: [54, 62, 42], // loamy packed soil & buried fibrous roots
    roughWall: 0.90, roughFloor: 0.88, metal: 0.02, strataFreq: 16, strataAmp: 0.09,
  },
  shale: {
    seed: 41611,
    wall: [84, 92, 102], wallAlt: [122, 130, 140], // cleaved blue-slate + glinting quartz seams
    floor: [66, 72, 80], floorAlt: [98, 106, 114], // fractured shingle & dark slate flag
    roughWall: 0.78, roughFloor: 0.82, metal: 0.07, strataFreq: 38, strataAmp: 0.16,
  },
  iron: {
    seed: 41621,
    wall: [104, 78, 64], wallAlt: [134, 82, 52],   // red-ochre ironstone & oxidized rust veins
    floor: [82, 66, 56], floorAlt: [112, 72, 48],  // crushed ore ballast & damp mine grit
    roughWall: 0.86, roughFloor: 0.84, metal: 0.14, strataFreq: 20, strataAmp: 0.11,
  },
  wet: {
    seed: 41631,
    wall: [66, 84, 86], wallAlt: [48, 72, 64],     // slick dark wet basalt & mineral algae sheen
    floor: [50, 66, 68], floorAlt: [38, 56, 56],   // submerged dark cobble & slick silt
    roughWall: 0.44, roughFloor: 0.30, metal: 0.05, strataFreq: 22, strataAmp: 0.12,
  },
  hill: {
    seed: 41641,
    wall: [118, 114, 102], wallAlt: [88, 92, 78],  // ancient chiseled barrow limestone & pale lichen
    floor: [96, 92, 82], floorAlt: [74, 72, 64],   // worn dressed flagstone & chalk dust
    roughWall: 0.88, roughFloor: 0.86, metal: 0.02, strataFreq: 14, strataAmp: 0.10,
  },
});

export function buildWarrenSurfacePixels(theme = 'iron', kind = 'wall', N = 256) {
  const spec = GEOLOGY_SPECS[theme] || GEOLOGY_SPECS.iron;
  const isWall = kind === 'wall';
  const base = isWall ? spec.wall : spec.floor;
  const alt = isWall ? spec.wallAlt : spec.floorAlt;
  const seed = spec.seed + (isWall ? 0 : 173);

  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gMacro = makeFbmGrid(64, 5, 5, seed, 3, 0.56);
  const gMid = makeFbmGrid(64, 14, 14, seed + 29, 3, 0.54);
  const gFract = makeRidgedGrid(64, theme === 'shale' ? 11 : 7, theme === 'shale' ? 11 : 7, seed + 61, 3, 0.56);
  const gWarp = makeFbmGrid(64, 4, 4, seed + 97, 2, 0.5);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const wx = (gWarp(u, v) - 0.5) * 0.11;
      const wy = (gWarp(u + 0.37, v + 0.61) - 0.5) * 0.11;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);
      const fr = gFract(u + wx * 1.35, v + wy * 1.35);

      const crack = sstep(0.79, 0.97, fr);
      const crackW = theme === 'hill' ? 0.35 : 1.0;
      const strata = isWall
        ? Math.sin((v * spec.strataFreq + ma * 4.2 + wx * 4.5)) * spec.strataAmp
        : Math.sin((v * spec.strataFreq * 0.55 + ma * 3.2)) * spec.strataAmp * 0.45;

      // Theme-specific geological micro-architecture
      let altMask = 0;
      let masonryGroove = 0;
      let wetRunoff = 0;
      let quartzGlint = 0;

      if (theme === 'root') {
        const rootBand = 1 - sstep(0.0, 0.065, Math.abs(Math.sin((u * 3.0 + ma * 1.4) * Math.PI)));
        altMask = clamp(sstep(0.54, 0.80, ma + (1 - mi) * 0.2) * 0.65 + rootBand * 0.45, 0, 1);
      } else if (theme === 'shale') {
        quartzGlint = sstep(0.84, 0.96, fr) * sstep(0.45, 0.72, mi);
        altMask = clamp(quartzGlint * 0.85 + Math.max(0, strata) * 2.2, 0, 1);
      } else if (theme === 'iron') {
        const streak = gMid(u * 2.0, v * 0.4);
        altMask = sstep(0.48, 0.78, ma * 0.55 + streak * 0.55);
      } else if (theme === 'wet') {
        const seep = gMid(u * 2.4, v * 0.35);
        wetRunoff = sstep(0.42, 0.72, seep * 0.65 + ma * 0.45);
        altMask = sstep(0.56, 0.82, ma + seep * 0.25) * 0.75;
      } else if (theme === 'hill') {
        // Subtle ancient dry-laid dressed barrow masonry blocks on walls & flagstones on floor!
        const rowN = isWall ? 4 : 3;
        const colN = isWall ? 3 : 3;
        const row = Math.floor(v * rowN);
        const bu = ((u * colN + (row & 1) * 0.5) % 1);
        const bv = (v * rowN) % 1;
        const edge = Math.min(bu, 1 - bu, bv, 1 - bv);
        masonryGroove = (1 - sstep(0.012, 0.052, edge)) * 0.65;
        altMask = sstep(0.55, 0.82, ma + masonryGroove * 0.4);
      }

      const h = clamp(
        0.50 + (ma - 0.5) * 0.24 + (mi - 0.5) * 0.16 + strata * 1.15 - crack * 0.19 * crackW - masonryGroove * 0.24 + quartzGlint * 0.14,
        0.06, 0.96
      );
      const ao = clamp(0.90 + (ma - 0.5) * 0.16 - crack * 0.22 * crackW - masonryGroove * 0.36, 0.34, 1.0);
      const shade = (0.85 + (ma - 0.5) * 0.22 + (mi - 0.5) * 0.15 + strata * 0.75) * (1 - crack * 0.20 * crackW - masonryGroove * 0.26);

      let r = lerp(base[0], alt[0], altMask) * shade;
      let g = lerp(base[1], alt[1], altMask) * shade;
      let b = lerp(base[2], alt[2], altMask) * shade;
      if (wetRunoff > 0.05) {
        r *= 1 - wetRunoff * 0.22;
        g *= 1 - wetRunoff * 0.18;
        b *= 1 - wetRunoff * 0.14;
      }

      let rgh = isWall ? spec.roughWall : spec.roughFloor;
      rgh += (mi - 0.5) * 0.12 + crack * 0.09 + masonryGroove * 0.08;
      if (theme === 'wet') rgh = lerp(rgh, 0.20, wetRunoff * 0.72);
      if (theme === 'shale') rgh = lerp(rgh, 0.36, quartzGlint * 0.75);
      rgh = clamp(rgh, 0.18, 0.97);

      let met = spec.metal;
      if (theme === 'iron') met = clamp(lerp(0.08, 0.32, altMask * (1 - crack)), 0.04, 0.38);
      if (theme === 'shale') met = clamp(lerp(0.05, 0.22, quartzGlint), 0.03, 0.26);

      const idx = y * N + x;
      height[idx] = h;
      const o = idx * 4;
      albedo[o] = clamp(Math.round(r), 0, 255);
      albedo[o + 1] = clamp(Math.round(g), 0, 255);
      albedo[o + 2] = clamp(Math.round(b), 0, 255);
      albedo[o + 3] = 255;
      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(met * 255);
      orm[o + 3] = 255;
    }
  }

  return { albedo, orm, height, w: N, h: N, nrmStrength: isWall ? 2.4 : 2.0 };
}

// ---------------------------------------------------------------------------
// Organic Uncanny Nest Tissue PBR (glistening sinewy flesh & dark veins)
// ---------------------------------------------------------------------------
export function buildNestFleshPixels(N = 128) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gA = makeFbmGrid(32, 4, 4, 41671, 3);
  const gV = makeRidgedGrid(32, 6, 6, 41677, 3);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const m = gA(u, v);
      const ridge = gV(u, v);
      const vein = sstep(0.66, 0.90, ridge);
      const h = clamp(0.40 + (m - 0.5) * 0.35 + vein * 0.38, 0.05, 0.98);

      // Art Direction §1 Uncanny: bruise purple-grey & dark visceral crimson, damp wet sheen
      const r = lerp(74, 118, m) + vein * 28;
      const g = lerp(42, 56, m) - vein * 14;
      const b = lerp(48, 66, m) - vein * 10;

      const ao = clamp(0.55 + m * 0.35 + vein * 0.12, 0.25, 1.0);
      const rgh = clamp(lerp(0.58, 0.32, vein * 0.6 + m * 0.4), 0.26, 0.68);

      const idx = y * N + x;
      height[idx] = h;
      const o = idx * 4;
      albedo[o] = clamp(Math.round(r), 0, 255);
      albedo[o + 1] = clamp(Math.round(g), 0, 255);
      albedo[o + 2] = clamp(Math.round(b), 0, 255);
      albedo[o + 3] = 255;
      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(0.03 * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N, nrmStrength: 3.1 };
}

// ---------------------------------------------------------------------------
// Veined Pale Husk Membrane PBR (Art Direction §1: pale bone + bruised veins)
// ---------------------------------------------------------------------------
export function buildHuskMembranePixels(N = 128) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gBase = makeFbmGrid(32, 3, 5, 41681, 3);
  const gVein = makeRidgedGrid(32, 5, 8, 41689, 3);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const m = gBase(u, v);
      const vn = sstep(0.72, 0.93, gVein(u, v));
      const rib = Math.sin(v * Math.PI * 10 + m * 2.2) * 0.08;
      const h = clamp(0.45 + (m - 0.5) * 0.24 + rib + vn * 0.32, 0.05, 0.96);

      const r = lerp(188 + (m - 0.5) * 24, 118, vn * 0.72);
      const g = lerp(178 + (m - 0.5) * 22, 68, vn * 0.78);
      const b = lerp(158 + (m - 0.5) * 18, 76, vn * 0.70);

      const ao = clamp(0.76 + rib - vn * 0.16, 0.38, 1.0);
      const rgh = clamp(lerp(0.62, 0.36, vn * 0.55 + m * 0.3), 0.28, 0.72);

      const idx = y * N + x;
      height[idx] = h;
      const o = idx * 4;
      albedo[o] = clamp(Math.round(r), 0, 255);
      albedo[o + 1] = clamp(Math.round(g), 0, 255);
      albedo[o + 2] = clamp(Math.round(b), 0, 255);
      albedo[o + 3] = 255;
      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = 0;
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N, nrmStrength: 2.6 };
}

// ---------------------------------------------------------------------------
// Soft 2D Gaussian Feathered Volumetric Light Shaft, Radial Pool, Fissure Sky & Flame Textures
// (Premultiplied RGB*alpha so AdditiveBlending NEVER shows hard geometric silhouettes!)
// ---------------------------------------------------------------------------
export function makeVolumetricShaftTexture(T, N = 128) {
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    const v = y / (N - 1); // 0 = base (wide floor end), 1 = top (crack origin)
    const topFade = sstep(1.0, 0.80, v);
    const botFade = Math.pow(sstep(0.0, 0.62, v), 1.35);
    const vertAlpha = topFade * botFade;
    // Beam narrows gently near the crack top (v -> 1) and spreads softly toward the floor (v -> 0)
    const halfW = lerp(0.46, 0.18, v);
    for (let x = 0; x < N; x++) {
      const u = x / (N - 1);
      const dx = Math.abs(u - 0.5) / halfW;
      const horiz = dx >= 1 ? 0 : Math.pow(Math.cos(dx * Math.PI * 0.5), 2.1);
      const rays = 0.78 + 0.22 * (Math.sin((u - 0.5) * Math.PI * 10 + v * 1.4) * 0.5 + 0.5);
      const a = clamp(vertAlpha * horiz * rays, 0, 1);
      const o = (y * N + x) * 4;
      data[o] = Math.round(255 * a);
      data[o + 1] = Math.round(248 * a);
      data[o + 2] = Math.round(234 * a);
      data[o + 3] = Math.round(a * 255);
    }
  }
  return makeDataTexture(T, data, N, N, { name: 'hollow-vol-shaft', srgb: true, repeat: false, aniso: 2 });
}

export function makeRadialPoolTexture(T, N = 128) {
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    const dy = (y / (N - 1)) * 2 - 1;
    for (let x = 0; x < N; x++) {
      const dx = (x / (N - 1)) * 2 - 1;
      const r = Math.hypot(dx, dy);
      const a = r >= 0.94 ? 0 : Math.pow(clamp(1 - r / 0.94, 0, 1), 2.4);
      const o = (y * N + x) * 4;
      data[o] = Math.round(255 * a);
      data[o + 1] = Math.round(246 * a);
      data[o + 2] = Math.round(224 * a);
      data[o + 3] = Math.round(a * 255);
    }
  }
  return makeDataTexture(T, data, N, N, { name: 'hollow-vol-pool', srgb: true, repeat: false, aniso: 2 });
}

export function makeFissureDayTexture(T, N = 128) {
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    const v = y / (N - 1); // 0 = bottom, 1 = top sky
    // Natural jagged rock fissure narrowing gently toward top & bottom
    const jag = Math.sin(v * 15.0) * 0.04 + Math.cos(v * 29.0) * 0.025;
    const halfW = (0.34 - Math.abs(v - 0.56) * 0.24) + jag;
    const vFade = sstep(0.0, 0.14, v) * sstep(1.0, 0.86, v);
    for (let x = 0; x < N; x++) {
      const u = x / (N - 1);
      const dx = Math.abs((u - 0.5) + Math.sin(v * 9.0) * 0.03) / Math.max(0.08, halfW);
      const edge = 1 - sstep(0.52, 1.0, dx);
      const a = clamp(edge * vFade, 0, 1);
      // Cool overcast sky blue-white near top warming softly toward pale daylight mist below
      const r = lerp(225, 244, v);
      const g = lerp(234, 248, v);
      const b = lerp(240, 255, v);
      const o = (y * N + x) * 4;
      data[o] = Math.round(r);
      data[o + 1] = Math.round(g);
      data[o + 2] = Math.round(b);
      data[o + 3] = Math.round(a * 255);
    }
  }
  return makeDataTexture(T, data, N, N, { name: 'hollow-fissure-day', srgb: true, repeat: false, aniso: 2 });
}

export function makeFlameTongueTexture(T, N = 128) {
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    const v = y / (N - 1); // 0 = base on coals, 1 = flame tip
    const sway = Math.sin(v * Math.PI * 2.4) * 0.08 * v;
    const halfW = Math.max(0.04, 0.42 * Math.pow(1 - v, 0.68) * (0.85 + 0.15 * Math.sin(v * 11)));
    for (let x = 0; x < N; x++) {
      const u = x / (N - 1);
      const dx = Math.abs((u - 0.5) - sway) / halfW;
      const body = dx >= 1 ? 0 : Math.pow(Math.cos(dx * Math.PI * 0.5), 1.55);
      const baseFade = sstep(0.0, 0.14, v) * sstep(1.0, 0.72, v);
      const a = clamp(body * baseFade, 0, 1);
      // Hot pale-gold core -> amber mid -> rich ember orange outer fringe
      const core = clamp((1 - dx) * (1 - v * 0.85), 0, 1);
      const r = lerp(235, 255, core);
      const g = lerp(92, 238, Math.pow(core, 0.85));
      const b = lerp(16, 168, Math.pow(core, 1.8));
      const o = (y * N + x) * 4;
      data[o] = Math.round(r * a);
      data[o + 1] = Math.round(g * a);
      data[o + 2] = Math.round(b * a);
      data[o + 3] = Math.round(a * 255);
    }
  }
  return makeDataTexture(T, data, N, N, { name: 'hollow-flame-tongue', srgb: true, repeat: false, aniso: 2 });
}

// ---------------------------------------------------------------------------
// Canvas Textures (browser only, safe null fallback in Node)
// ---------------------------------------------------------------------------
function canvasTex(T, cv) {
  if (!cv) return null;
  const tx = new T.CanvasTexture(cv);
  if (T.SRGBColorSpace) tx.colorSpace = T.SRGBColorSpace;
  tx.anisotropy = 8;
  tx.needsUpdate = true;
  return tx;
}

export function makePgbCrateStencilTexture(T, label = 'FOB THRESHOLD', sub = 'SUPPLIES · PGB', ground = '#4a5236', accent = '#d8d2bc') {
  if (typeof document === 'undefined') return null;
  const W = 256, H = 160;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;
  const rnd = makeRng(41691 + label.length * 37);

  c.fillStyle = ground; c.fillRect(0, 0, W, H);
  // Subtle wood/composite grain & handling scuffs
  for (let i = 0; i < 320; i++) {
    c.fillStyle = rnd() < 0.55 ? 'rgba(0,0,0,0.12)' : 'rgba(180,170,145,0.08)';
    c.fillRect(rnd() * W, rnd() * H, 4 + rnd() * 24, 1 + rnd() * 4);
  }
  c.strokeStyle = 'rgba(15,18,12,0.52)'; c.lineWidth = 6; c.strokeRect(8, 8, W - 16, H - 16);
  c.strokeStyle = 'rgba(216,210,188,0.22)'; c.lineWidth = 2; c.strokeRect(14, 14, W - 28, H - 28);
  c.fillStyle = accent; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'bold 34px "Courier New", monospace';
  c.fillText('PGB', W / 2, 52);
  c.font = 'bold 17px "Courier New", monospace';
  c.fillText(label, W / 2, 92);
  c.font = 'bold 13px "Courier New", monospace';
  c.fillStyle = 'rgba(218,202,146,0.88)';
  c.fillText(sub, W / 2, 122);
  return canvasTex(T, cv);
}

export function makeRuneDoorCarvingTexture(T) {
  if (typeof document === 'undefined') return null;
  const W = 512, H = 640;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;

  c.clearRect(0, 0, W, H);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // Outer incised border arch & twin vertical stave rails
  c.strokeStyle = 'rgba(150, 238, 248, 0.85)';
  c.lineWidth = 5;
  c.strokeRect(34, 34, W - 68, H - 68);
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(130, 224, 236, 0.55)';
  c.strokeRect(50, 50, W - 100, H - 100);

  // Concentric Pit rings around the center heart glyph
  const cx = W / 2, cy = H * 0.48;
  c.strokeStyle = 'rgba(170, 248, 255, 0.92)';
  c.lineWidth = 5;
  c.beginPath(); c.arc(cx, cy, 134, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 3;
  c.beginPath(); c.arc(cx, cy, 94, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 4;
  c.beginPath(); c.arc(cx, cy, 34, 0, Math.PI * 2); c.stroke();

  // Radial spokes connecting the inner ring to the Ring of Eight
  c.strokeStyle = 'rgba(140, 230, 240, 0.42)';
  c.lineWidth = 2.2;
  for (let k = 0; k < RUNE_COUNT; k++) {
    const a = (k / RUNE_COUNT) * Math.PI * 2 - Math.PI / 2;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42);
    c.lineTo(cx + Math.cos(a) * 86, cy + Math.sin(a) * 86);
    c.stroke();
  }

  // The Eight First People Glyphs around the carved ring
  for (let k = 0; k < RUNE_COUNT; k++) {
    const a = (k / RUNE_COUNT) * Math.PI * 2 - Math.PI / 2;
    drawGlyph(c, k, cx + Math.cos(a) * 168, cy + Math.sin(a) * 168, 56, {
      color: 'rgba(186, 250, 255, 0.96)',
      width: 4.0,
    });
  }

  // Bottom horizontal threshold band
  c.strokeStyle = 'rgba(148, 236, 246, 0.58)';
  c.lineWidth = 3;
  c.beginPath(); c.moveTo(76, H - 88); c.lineTo(W - 76, H - 88); c.stroke();
  return canvasTex(T, cv);
}

// ---------------------------------------------------------------------------
// Per-THREE Cached Library Factory
// ---------------------------------------------------------------------------
const CACHE = new WeakMap();

export function getHollowPBRPack(T, theme = 'iron') {
  if (!T) return null;
  let root = CACHE.get(T);
  if (!root) {
    root = { shared: null, themes: new Map() };
    CACHE.set(T, root);
  }
  if (!root.shared) {
    const cavePbr = getCaveEntrancePBR(T);
    root.shared = {
      cavePbr,
      nestFlesh: makePBRSet(T, 'hollow-nest-flesh', buildNestFleshPixels(128)),
      huskMembrane: makePBRSet(T, 'hollow-husk-membrane', buildHuskMembranePixels(128)),
      volShaftTex: makeVolumetricShaftTexture(T, 128),
      volPoolTex: makeRadialPoolTexture(T, 128),
      fissureDayTex: makeFissureDayTexture(T, 128),
      flameTex: makeFlameTongueTexture(T, 128),
      pgbFobTex: makePgbCrateStencilTexture(T, 'FOB THRESHOLD', 'UNIT 12 · PGB'),
      pgbSupplyTex: makePgbCrateStencilTexture(T, 'FIELD SUPPLY', 'AMMO · MED · FRAG', '#4d5738', '#e6dca8'),
      pgbVaultTex: makePgbCrateStencilTexture(T, 'FIELD VAULT', 'PGB · CLASSIFIED', '#343b32', '#ebd488'),
      runeDoorTex: makeRuneDoorCarvingTexture(T),
    };
  }
  if (!root.themes.has(theme)) {
    const wall = makePBRSet(T, `hollow-${theme}-wall`, buildWarrenSurfacePixels(theme, 'wall', 256));
    const floor = makePBRSet(T, `hollow-${theme}-floor`, buildWarrenSurfacePixels(theme, 'floor', 256));
    root.themes.set(theme, { wall, floor });
  }
  return {
    ...root.themes.get(theme),
    ...root.shared,
  };
}

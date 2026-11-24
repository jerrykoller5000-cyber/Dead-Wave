// world/cave-entrance-textures.js — AG-412: Procedural WebGPU PBR textures & storytelling signage
// for all six Grave Shift cave entrances.
// Deterministic, zero-RNG-leakage, WebGPU-native (flipY=false bottom-up DataTextures, linear packed ORM
// with R=AO, G=Roughness, B=Metalness, ormTex.channel=0), Node/fakethree safe.
// Adheres to docs/art-direction.md (4 families, natural base saturation <45%, reserved color discipline)
// and docs/asset-principles.md (macro/medium/micro hierarchy, physical roughness/metalness honesty).
import {
  tileNoise,
  tileFbm,
  heightToNormalRGBA,
  makeDataTexture,
} from './training-textures.js';
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

function makeSet(T, name, { albedo, orm, height, w, h, nrmStrength = 2.6, wrapX = true, wrapY = true, aniso = 8 }) {
  const map = makeDataTexture(T, albedo, w, h, { name: `${name}-albedo`, srgb: true, repeat: wrapX && wrapY, aniso });
  const ormTex = makeDataTexture(T, orm, w, h, { name: `${name}-orm`, srgb: false, repeat: wrapX && wrapY, aniso });
  if (ormTex) ormTex.channel = 0;
  const nrmData = heightToNormalRGBA(height, w, h, nrmStrength, wrapX, wrapY);
  const normalMap = makeDataTexture(T, nrmData, w, h, { name: `${name}-nrm`, srgb: false, repeat: wrapX && wrapY, aniso });
  if (map && !wrapY && wrapX) { map.wrapS = T.RepeatWrapping; map.wrapT = T.ClampToEdgeWrapping; }
  if (ormTex && !wrapY && wrapX) { ormTex.wrapS = T.RepeatWrapping; ormTex.wrapT = T.ClampToEdgeWrapping; }
  if (normalMap && !wrapY && wrapX) { normalMap.wrapS = T.RepeatWrapping; normalMap.wrapT = T.ClampToEdgeWrapping; }
  return {
    name,
    map,
    normalMap,
    ormMap: ormTex,
    opts({ color = 0xffffff, normalScale = 1.0, aoMapIntensity = 0.72, roughness = 1.0, metalness = 1.0, vertexColors = false, side = null, extra = null } = {}) {
      if (!map) {
        return {
          color,
          roughness: 0.85,
          metalness: 0.1,
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
// 1. Gnarled Ancient Root Bark (Root Cave cathedral buttresses & tendrils)
// ---------------------------------------------------------------------------
export function buildGnarledBarkPixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gWarp = makeFbmGrid(64, 4, 4, 41201, 3);
  const gFine = makeFbmGrid(64, 14, 6, 41207, 3);
  const gMoss = makeFbmGrid(64, 5, 5, 41213, 3);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const warp = (gWarp(u, v) - 0.5) * 0.14;
      const ridgeA = Math.abs(Math.sin((u + warp) * Math.PI * 10));
      const ridgeB = Math.abs(Math.sin((u * 2.0 - warp * 1.4) * Math.PI * 9 + v * 2.5));
      const fine = gFine(u, v);
      const furrow = sstep(0.12, 0.72, ridgeA * 0.65 + ridgeB * 0.35);
      const h = clamp(0.18 + furrow * 0.58 + (fine - 0.5) * 0.24, 0, 1);

      // Damp moss tucked into shaded bark furrows
      const mossMask = sstep(0.56, 0.78, gMoss(u, v) + (1 - furrow) * 0.28);

      let r = lerp(52, 92, furrow) + (fine - 0.5) * 18;
      let g = lerp(42, 74, furrow) + (fine - 0.5) * 15;
      let b = lerp(33, 56, furrow) + (fine - 0.5) * 12;
      r = lerp(r, 64, mossMask * 0.72);
      g = lerp(g, 88, mossMask * 0.76);
      b = lerp(b, 48, mossMask * 0.66);

      const ao = clamp(0.45 + furrow * 0.45 + (fine - 0.5) * 0.1, 0.25, 1.0);
      const rgh = clamp(lerp(0.94, 0.80, furrow) - mossMask * 0.05, 0.68, 0.98);

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
  return { albedo, orm, height, w: N, h: N, nrmStrength: 3.3 };
}

// ---------------------------------------------------------------------------
// 2. Weathered Creosote Mine Timber (Iron Cave portal, cribbing, sleepers, crates)
// ---------------------------------------------------------------------------
export function buildCreosoteTimberPixels(N = 256, wet = false) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gWarp = makeFbmGrid(64, 4, 8, wet ? 41231 : 41221, 3);
  const gGrain = makeFbmGrid(64, 24, 4, wet ? 41237 : 41227, 3);
  const gStain = makeFbmGrid(64, 6, 6, wet ? 41243 : 41233, 3);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const plankIdx = Math.floor(u * 4);
      const pu = (u * 4) % 1;
      const seam = Math.min(pu, 1 - pu);
      const seamGroove = 1 - sstep(0.0, 0.032, seam);
      const warp = (gWarp(u + plankIdx * 0.23, v) - 0.5) * 0.08;
      const fibers = Math.sin((u * 18 + warp * 14) * Math.PI * 2) * 0.5 + 0.5;
      const grain = gGrain(u, v + plankIdx * 0.37);
      const checkCrack = sstep(0.84, 0.94, gGrain(u * 2.2, v * 0.45));
      const stain = gStain(u, v);

      const plankTone = 0.88 + ((plankIdx * 37) % 5) * 0.055;
      let h = 0.52 + (fibers - 0.5) * 0.22 + (grain - 0.5) * 0.24 - seamGroove * 0.42 - checkCrack * 0.26;
      h = clamp(h, 0, 1);

      let r = (wet ? 68 : 112) * plankTone + (grain - 0.5) * 26 - stain * 18;
      let g = (wet ? 62 : 91) * plankTone + (grain - 0.5) * 20 - stain * 15;
      let b = (wet ? 50 : 66) * plankTone + (grain - 0.5) * 14 - stain * 12;
      if (wet) {
        const algae = sstep(0.55, 0.80, stain);
        r = lerp(r, 52, algae * 0.6);
        g = lerp(g, 76, algae * 0.65);
        b = lerp(b, 46, algae * 0.55);
      }
      r *= (1 - seamGroove * 0.48 - checkCrack * 0.32);
      g *= (1 - seamGroove * 0.48 - checkCrack * 0.32);
      b *= (1 - seamGroove * 0.48 - checkCrack * 0.32);

      const ao = clamp(0.86 - seamGroove * 0.55 - checkCrack * 0.32 + (grain - 0.5) * 0.14, 0.22, 1.0);
      const rgh = wet
        ? clamp(lerp(0.32, 0.58, stain) + seamGroove * 0.2, 0.24, 0.78)
        : clamp(lerp(0.82, 0.95, stain) + seamGroove * 0.06, 0.74, 0.98);

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
  return { albedo, orm, height, w: N, h: N, nrmStrength: 2.8 };
}

// ---------------------------------------------------------------------------
// 3. Forged & Rusted Cast Iron (Mine cart, rails, sluice wheel, iron stakes, plaque frame)
// ---------------------------------------------------------------------------
export function buildForgedIronPixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gRust = makeFbmGrid(64, 5, 5, 41251, 3);
  const gPit = makeFbmGrid(64, 16, 16, 41257, 3);
  const gStreak = makeFbmGrid(64, 10, 3, 41263, 3);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const rustN = gRust(u, v);
      const pit = gPit(u, v);
      const streak = gStreak(u, v);
      const rustMask = sstep(0.42, 0.74, rustN * 0.72 + streak * 0.36);

      // Weathered forged gunmetal iron base vs muted ochre-rust oxide scale (Art Direction §1)
      const ironR = 92 + (pit - 0.5) * 22;
      const ironG = 95 + (pit - 0.5) * 22;
      const ironB = 98 + (pit - 0.5) * 22;
      const rustR = 136 + (pit - 0.5) * 26;
      const rustG = 82 + (pit - 0.5) * 18;
      const rustB = 56 + (pit - 0.5) * 14;

      const r = lerp(ironR, rustR, rustMask);
      const g = lerp(ironG, rustG, rustMask);
      const b = lerp(ironB, rustB, rustMask);

      const h = clamp(0.48 + (pit - 0.5) * 0.36 + rustMask * 0.16, 0, 1);
      const ao = clamp(0.76 + (pit - 0.5) * 0.24 - rustMask * 0.12, 0.35, 1.0);
      const rgh = clamp(lerp(0.46, 0.86, rustMask) + (pit - 0.5) * 0.12, 0.34, 0.94);
      const met = clamp(lerp(0.72, 0.14, rustMask), 0.08, 0.82);

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
  return { albedo, orm, height, w: N, h: N, nrmStrength: 2.5 };
}

// ---------------------------------------------------------------------------
// 4. PGB Field-Olive Painted Metal (Recon cases, sensor tripods, detonator, seismograph)
// ---------------------------------------------------------------------------
export function buildPgbOliveMetalPixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gChip = makeFbmGrid(64, 9, 9, 41271, 3);
  const gGrime = makeFbmGrid(64, 5, 5, 41277, 3);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const edgeDist = Math.min(u, 1 - u, v, 1 - v);
      const edgeWear = (1 - sstep(0.015, 0.085, edgeDist)) * 0.55;
      const chip = sstep(0.68, 0.80, gChip(u, v) + edgeWear);
      const grime = gGrime(u, v);

      let r = lerp(84, 152, chip) - grime * 16;
      let g = lerp(94, 156, chip) - grime * 15;
      let b = lerp(70, 148, chip) - grime * 12;

      const h = clamp(0.56 - chip * 0.24 + (grime - 0.5) * 0.14, 0, 1);
      const ao = clamp(0.84 - grime * 0.22 - edgeWear * 0.15, 0.35, 1.0);
      const rgh = clamp(lerp(0.66, 0.36, chip) + (grime - 0.5) * 0.12, 0.28, 0.88);
      const met = clamp(lerp(0.14, 0.78, chip), 0.08, 0.86);

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
  return { albedo, orm, height, w: N, h: N, nrmStrength: 2.1 };
}

// ---------------------------------------------------------------------------
// 5. Ancient Barrow Flagstone & Carved Megalith (Hill & Marrow thresholds)
// ---------------------------------------------------------------------------
export function buildBarrowStonePixels(N = 256, pale = false) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gBase = makeFbmGrid(64, 5, 5, pale ? 41291 : 41281, 3);
  const gFine = makeFbmGrid(64, 18, 18, pale ? 41297 : 41287, 3);
  const gLichen = makeFbmGrid(64, 7, 7, pale ? 41303 : 41293, 3);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const macro = gBase(u, v);
      const fine = gFine(u, v);
      const lic = sstep(0.60, 0.80, gLichen(u, v));
      const chisel = Math.abs(Math.sin((u * 12 + v * 3 + macro * 0.5) * Math.PI)) * 0.08;

      const baseR = pale ? 184 : 132;
      const baseG = pale ? 180 : 128;
      const baseB = pale ? 168 : 114;

      let r = baseR + (macro - 0.5) * 34 + (fine - 0.5) * 20;
      let g = baseG + (macro - 0.5) * 32 + (fine - 0.5) * 18;
      let b = baseB + (macro - 0.5) * 28 + (fine - 0.5) * 16;

      if (!pale) {
        r = lerp(r, 118, lic * 0.55);
        g = lerp(g, 130, lic * 0.58);
        b = lerp(b, 92, lic * 0.52);
      } else {
        // Pale chalk mineral streaking & subtle grey-green mineral veins
        const vein = sstep(0.68, 0.84, gLichen(u * 1.5, v * 0.6));
        r = lerp(r, 142, vein * 0.42);
        g = lerp(g, 146, vein * 0.40);
        b = lerp(b, 138, vein * 0.36);
      }

      const h = clamp(0.5 + (macro - 0.5) * 0.36 + (fine - 0.5) * 0.24 - chisel, 0, 1);
      const ao = clamp(0.72 + (macro - 0.5) * 0.26 - chisel * 0.8, 0.35, 1.0);
      const rgh = clamp(0.86 + (fine - 0.5) * 0.12, 0.76, 0.96);

      const idx = y * N + x;
      height[idx] = h;
      const o = idx * 4;
      albedo[o] = clamp(Math.round(r), 0, 255);
      albedo[o + 1] = clamp(Math.round(g), 0, 255);
      albedo[o + 2] = clamp(Math.round(b), 0, 255);
      albedo[o + 3] = 255;
      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(0.02 * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N, nrmStrength: 2.7 };
}

// ---------------------------------------------------------------------------
// 6. Weathered Bone / Antler & Canvas Cloth
// ---------------------------------------------------------------------------
export function buildWeatheredBonePixels(N = 128) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gA = makeFbmGrid(32, 4, 8, 41311, 3);
  const gB = makeFbmGrid(32, 12, 12, 41317, 2);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const a = gA(u, v), b = gB(u, v);
      const r = 196 + (a - 0.5) * 30 + (b - 0.5) * 14;
      const g = 188 + (a - 0.5) * 28 + (b - 0.5) * 12;
      const bl = 166 + (a - 0.5) * 26 + (b - 0.5) * 10;
      const idx = y * N + x;
      height[idx] = clamp(0.5 + (a - 0.5) * 0.35 + (b - 0.5) * 0.2, 0, 1);
      const o = idx * 4;
      albedo[o] = clamp(Math.round(r), 0, 255);
      albedo[o + 1] = clamp(Math.round(g), 0, 255);
      albedo[o + 2] = clamp(Math.round(bl), 0, 255);
      albedo[o + 3] = 255;
      orm[o] = Math.round(clamp(0.78 + (a - 0.5) * 0.2, 0.45, 1.0) * 255);
      orm[o + 1] = Math.round(clamp(0.84 + (b - 0.5) * 0.14, 0.72, 0.96) * 255);
      orm[o + 2] = 0;
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N, nrmStrength: 2.0 };
}

export function buildCanvasClothPixels(N = 128) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gDirt = makeFbmGrid(32, 4, 4, 41329, 3);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const weave = (Math.sin(u * N * 0.9) * Math.sin(v * N * 0.9)) * 0.5 + 0.5;
      const dirt = gDirt(u, v);
      const lum = 158 + (weave - 0.5) * 18 - dirt * 28;
      const idx = y * N + x;
      height[idx] = clamp(0.45 + weave * 0.35 + (dirt - 0.5) * 0.2, 0, 1);
      const o = idx * 4;
      albedo[o] = clamp(Math.round(lum), 0, 255);
      albedo[o + 1] = clamp(Math.round(lum * 0.96), 0, 255);
      albedo[o + 2] = clamp(Math.round(lum * 0.86), 0, 255);
      albedo[o + 3] = 255;
      orm[o] = Math.round(clamp(0.82 - dirt * 0.22, 0.45, 1.0) * 255);
      orm[o + 1] = Math.round(clamp(0.92 + (dirt - 0.5) * 0.06, 0.84, 0.98) * 255);
      orm[o + 2] = 0;
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N, nrmStrength: 1.9 };
}

// ---------------------------------------------------------------------------
// 7. Seepage Pool Water Normal (Wet Cave dripping runoff & concentric ripples)
// ---------------------------------------------------------------------------
export function buildSeepWaterNormal(T, N = 128) {
  const height = new Float32Array(N * N);
  const ripples = [
    [0.28, 0.34, 24],
    [0.68, 0.60, 20],
    [0.50, 0.22, 18],
  ];
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      let h = 0.5 + (tileNoise(u, v, 6, 10, 41341) - 0.5) * 0.24;
      for (const [rx, ry, freq] of ripples) {
        let dx = u - rx, dy = v - ry;
        if (dx > 0.5) dx -= 1; else if (dx < -0.5) dx += 1;
        if (dy > 0.5) dy -= 1; else if (dy < -0.5) dy += 1;
        const d = Math.hypot(dx, dy);
        h += Math.sin(d * freq * Math.PI * 2) * Math.exp(-d * 9) * 0.18;
      }
      height[y * N + x] = clamp(h, 0, 1);
    }
  }
  const nrm = heightToNormalRGBA(height, N, N, 1.8, true, true);
  return makeDataTexture(T, nrm, N, N, { name: 'cave-seep-water-nrm', srgb: false, repeat: true, aniso: 4 });
}

// ---------------------------------------------------------------------------
// Cached library per THREE instance
// ---------------------------------------------------------------------------
const LIB_CACHE = new WeakMap();

export function getCaveEntrancePBR(T) {
  if (!T) return null;
  if (LIB_CACHE.has(T)) return LIB_CACHE.get(T);
  const lib = {
    gnarledBark: makeSet(T, 'cave-gnarled-bark', buildGnarledBarkPixels(256)),
    creosoteTimber: makeSet(T, 'cave-creosote-timber', buildCreosoteTimberPixels(256, false)),
    wetTimber: makeSet(T, 'cave-wet-timber', buildCreosoteTimberPixels(256, true)),
    forgedIron: makeSet(T, 'cave-forged-iron', buildForgedIronPixels(256)),
    pgbOliveMetal: makeSet(T, 'cave-pgb-olive', buildPgbOliveMetalPixels(256)),
    barrowStone: makeSet(T, 'cave-barrow-stone', buildBarrowStonePixels(256, false)),
    marrowChalk: makeSet(T, 'cave-marrow-chalk', buildBarrowStonePixels(256, true)),
    weatheredBone: makeSet(T, 'cave-weathered-bone', buildWeatheredBonePixels(128)),
    tarpCanvas: makeSet(T, 'cave-tarp-canvas', buildCanvasClothPixels(128)),
    seepWaterNormal: buildSeepWaterNormal(T, 128),
  };
  LIB_CACHE.set(T, lib);
  return lib;
}

// ---------------------------------------------------------------------------
// Painted 2D Storytelling Canvases (safe fallback when doc is null in Node)
// ---------------------------------------------------------------------------
function makeCanvasTex(T, cv, { repeat = false } = {}) {
  if (!cv) return null;
  const tx = new T.CanvasTexture(cv);
  if (T.SRGBColorSpace) tx.colorSpace = T.SRGBColorSpace;
  tx.anisotropy = 8;
  if (repeat) tx.wrapS = tx.wrapT = T.RepeatWrapping;
  tx.needsUpdate = true;
  return tx;
}

export function makeColdwaterLintelTexture(T, doc) {
  if (!doc || !doc.createElement) return null;
  const W = 1024, H = 224;
  const cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;
  const rnd = makeRng(189103);

  // Forged cast-iron plate base with weathered oxide gradient
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#3e3934');
  bg.addColorStop(0.5, '#332e2a');
  bg.addColorStop(1, '#2a2420');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);

  // Cast iron grain & rust streaks dripping from top lip
  for (let i = 0; i < 900; i++) {
    c.fillStyle = rnd() < 0.55 ? 'rgba(138,72,38,0.16)' : 'rgba(20,18,16,0.22)';
    c.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 14, 1 + rnd() * 5);
  }
  for (let i = 0; i < 26; i++) {
    const sx = 24 + rnd() * (W - 48), sw = 4 + rnd() * 12, sh = 40 + rnd() * 140;
    const gr = c.createLinearGradient(0, 12, 0, 12 + sh);
    gr.addColorStop(0, 'rgba(138,68,34,0.48)');
    gr.addColorStop(1, 'rgba(138,68,34,0)');
    c.fillStyle = gr; c.fillRect(sx, 12, sw, sh);
  }

  // Embossed cast-iron double border & corner rivets
  c.strokeStyle = '#6f6558'; c.lineWidth = 8; c.strokeRect(14, 14, W - 28, H - 28);
  c.strokeStyle = '#1b1714'; c.lineWidth = 4; c.strokeRect(24, 24, W - 48, H - 48);
  for (const rx of [42, W - 42]) for (const ry of [42, H - 42]) {
    c.fillStyle = '#1a1512'; c.beginPath(); c.arc(rx + 2, ry + 3, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6e6456'; c.beginPath(); c.arc(rx, ry, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(210,196,170,0.3)'; c.beginPath(); c.arc(rx - 3, ry - 3, 3.5, 0, Math.PI * 2); c.fill();
  }

  // Raised cast-iron typography: Coldwater's name (docs/story.md §7)
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'bold 68px Georgia, "Times New Roman", serif';
  c.fillStyle = '#161210'; c.fillText('COLDWATER IRON WORKS', W / 2 + 3, 94 + 3);
  c.fillStyle = '#c8baa0'; c.fillText('COLDWATER IRON WORKS', W / 2, 94);
  c.font = 'bold 34px "Courier New", monospace';
  c.fillStyle = '#161210'; c.fillText('DRIFT NO. 3  ·  EST. 1891', W / 2 + 2, 162 + 2);
  c.fillStyle = '#a9977c'; c.fillText('DRIFT NO. 3  ·  EST. 1891', W / 2, 162);

  return makeCanvasTex(T, cv);
}

export function makeStenciledPlacardTexture(T, doc, { lines, ground = '#b49c6e', stripe = true, rust = 0.35, seed = 412 }) {
  if (!doc || !doc.createElement) return null;
  const W = 512, H = 320;
  const cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;
  const rnd = makeRng(seed);

  c.fillStyle = ground; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 360; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.09)' : `rgba(115,58,28,${(0.08 + rnd() * 0.14 * rust).toFixed(3)})`;
    c.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 18, 2 + rnd() * 10);
  }
  if (stripe) {
    const sh = 34;
    for (const y0 of [0, H - sh]) {
      c.save(); c.beginPath(); c.rect(0, y0, W, sh); c.clip();
      c.fillStyle = '#23221d'; c.fillRect(0, y0, W, sh);
      c.fillStyle = '#c29628';
      for (let x = -sh; x < W + sh; x += 44) {
        c.beginPath(); c.moveTo(x, y0 + sh); c.lineTo(x + 22, y0); c.lineTo(x + 42, y0); c.lineTo(x + 20, y0 + sh); c.fill();
      }
      c.restore();
    }
  }
  c.strokeStyle = 'rgba(20,18,16,0.55)'; c.lineWidth = 6; c.strokeRect(10, 10, W - 20, H - 20);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const l of lines) {
    c.font = `bold ${l.size}px "Courier New", monospace`;
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillText(l.text, W / 2 + 2, H * l.y + 2);
    c.fillStyle = l.color || '#1b1a16'; c.fillText(l.text, W / 2, H * l.y);
  }
  return makeCanvasTex(T, cv);
}

// Ancient First People hand-print & scratched Ring of Eight tablet (docs/story.md §7!)
export function makeMarrowHandprintTexture(T, doc) {
  if (!doc || !doc.createElement) return null;
  const W = 512, H = 512;
  const cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;
  const rnd = makeRng(77412);

  // Pale bone-chalk weathered stone tablet
  c.fillStyle = '#c2bdb0'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 1200; i++) {
    const v = 148 + Math.floor(rnd() * 68);
    c.fillStyle = `rgba(${v},${v - 4},${v - 12},0.22)`;
    c.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 14, 1 + rnd() * 6);
  }
  // Damp lichen & dirt around bottom edge
  const foot = c.createLinearGradient(0, H * 0.72, 0, H);
  foot.addColorStop(0, 'rgba(68,66,54,0)');
  foot.addColorStop(1, 'rgba(68,66,54,0.52)');
  c.fillStyle = foot; c.fillRect(0, H * 0.72, W, H * 0.28);

  // Scratched miniature Ring of Eight above the handprint
  c.strokeStyle = 'rgba(54,50,44,0.72)'; c.lineWidth = 4;
  c.beginPath(); c.arc(256, 134, 58, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(256, 134, 82, 0, Math.PI * 2); c.stroke();
  for (let k = 0; k < RUNE_COUNT; k++) {
    const a = (k / RUNE_COUNT) * Math.PI * 2;
    drawGlyph(c, k, 256 + Math.cos(a) * 70, 134 - Math.sin(a) * 70, 20, { color: 'rgba(54,50,44,0.72)', width: 1.8 });
  }

  // Ancient weathered soot-ochre human hand-print pressed flat into the pale chalk
  c.save();
  c.translate(258, 336);
  c.rotate(-0.08);
  const paintBlob = (x, y, rx, ry, rot, alpha) => {
    c.save(); c.translate(x, y); c.rotate(rot);
    const gr = c.createRadialGradient(0, 0, 2, 0, 0, Math.max(rx, ry));
    gr.addColorStop(0, `rgba(68,42,32,${alpha})`);
    gr.addColorStop(0.68, `rgba(76,48,36,${alpha * 0.85})`);
    gr.addColorStop(1, 'rgba(76,48,36,0)');
    c.fillStyle = gr;
    c.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    c.beginPath(); c.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2); c.fill();
    c.restore();
  };
  // Palm + heel of hand
  paintBlob(0, 18, 56, 62, 0.04, 0.78);
  paintBlob(-18, 42, 34, 38, -0.2, 0.65);
  paintBlob(22, 38, 30, 42, 0.15, 0.68);
  // Five splayed fingers (thumb left, four fingers up)
  paintBlob(-68, 4, 15, 36, -0.68, 0.72);
  paintBlob(-38, -68, 13, 44, -0.14, 0.76);
  paintBlob(-6, -86, 14, 52, -0.02, 0.80);
  paintBlob(26, -78, 13, 48, 0.11, 0.76);
  paintBlob(54, -54, 11, 38, 0.25, 0.70);
  // Pigment speckles weathered over centuries
  for (let i = 0; i < 240; i++) {
    c.fillStyle = rnd() < 0.6 ? 'rgba(194,189,176,0.45)' : 'rgba(54,34,26,0.32)';
    c.fillRect(-90 + rnd() * 180, -135 + rnd() * 210, 2 + rnd() * 6, 2 + rnd() * 5);
  }
  c.restore();

  return makeCanvasTex(T, cv);
}

// Seismograph / Tone Oscilloscope Screen (Marrow Cave PGB acoustic station)
export function makeSeismographScreenTexture(T, doc) {
  if (!doc || !doc.createElement) return null;
  const W = 512, H = 256;
  const cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;

  c.fillStyle = '#0c1614'; c.fillRect(0, 0, W, H);
  // Oscilloscope graticule
  c.strokeStyle = 'rgba(110,195,175,0.18)'; c.lineWidth = 1.5;
  for (let x = 32; x < W; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 32; y < H; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  // 5-pulse repeating tone waveform
  c.strokeStyle = '#8ef0d4'; c.lineWidth = 3.5;
  c.beginPath();
  for (let x = 0; x <= W; x += 2) {
    const u = x / W;
    let env = 0.08;
    for (const p of [0.14, 0.31, 0.49, 0.68, 0.84]) {
      const d = (u - p) / 0.045;
      env += Math.exp(-d * d) * 0.72;
    }
    const y = H * 0.52 + Math.sin(u * Math.PI * 52) * H * 0.36 * env;
    if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();
  c.fillStyle = '#9eeeff'; c.font = 'bold 18px monospace';
  c.fillText('PGB-SEISMIC · 02:14 LOCK · 5-PULSE REPEAT', 16, 26);
  c.fillStyle = '#e06040'; c.fillText('SEAL INTEGRITY: BREACH DETECTED', 16, H - 16);
  return makeCanvasTex(T, cv);
}

// First People carved Barrow lintel frieze (dark carved grooves + matching glow alpha overlay)
export function makeBarrowFriezeTextures(T, doc) {
  if (!doc || !doc.createElement) return { colorTex: null, glowTex: null };
  const W = 1024, H = 192;
  const cvC = doc.createElement('canvas'); cvC.width = W; cvC.height = H;
  const cvG = doc.createElement('canvas'); cvG.width = W; cvG.height = H;
  const cc = cvC.getContext && cvC.getContext('2d');
  const cg = cvG.getContext && cvG.getContext('2d');
  if (!cc || !cg) return { colorTex: null, glowTex: null };
  const rnd = makeRng(51907);

  cc.fillStyle = '#858071'; cc.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) {
    const v = 98 + Math.floor(rnd() * 68);
    cc.fillStyle = `rgba(${v},${v - 4},${v - 14},0.25)`;
    cc.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 14, 1 + rnd() * 5);
  }
  cg.clearRect(0, 0, W, H);

  const paintPattern = (ctx, col, lw) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Upper and lower incised border rails
    for (const y of [22, H - 22]) { ctx.beginPath(); ctx.moveTo(28, y); ctx.lineTo(W - 28, y); ctx.stroke(); }
    // Neolithic running chevron weave between glyphs
    ctx.beginPath();
    for (let x = 40; x <= W - 40; x += 28) {
      const y = ((x / 28) & 1) ? 44 : 28;
      if (x === 40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let x = 40; x <= W - 40; x += 28) {
      const y = ((x / 28) & 1) ? H - 44 : H - 28;
      if (x === 40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Five carved First People glyphs along the center band (crown glyph 5 in the middle)
    const glyphs = [0, 2, 5, 4, 7];
    glyphs.forEach((k, i) => {
      const gx = 150 + i * 181;
      drawGlyph(ctx, k, gx, H * 0.5, 68, { color: col, width: lw * 0.72 });
      if (i < glyphs.length - 1) {
        const mx = gx + 90.5;
        ctx.beginPath(); ctx.arc(mx, H * 0.5, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(mx, H * 0.5, 6, 0, Math.PI * 2); ctx.stroke();
      }
    });
  };
  paintPattern(cc, '#33312b', 6.0);
  paintPattern(cg, '#ffffff', 5.0);

  return {
    colorTex: makeCanvasTex(T, cvC),
    glowTex: makeCanvasTex(T, cvG),
  };
}

// Vertical carved obelisk rune strip (for Marrow Cave twin ward stelae & Hill sentinel menhirs)
export function makeObeliskRuneTexture(T, doc, glyphList = [0, 3, 6, 1]) {
  if (!doc || !doc.createElement) return null;
  const W = 128, H = 512;
  const cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;
  c.clearRect(0, 0, W, H);
  c.strokeStyle = '#ffffff'; c.lineWidth = 3.5; c.lineCap = 'round';
  // Vertical channel rails
  for (const x of [20, W - 20]) { c.beginPath(); c.moveTo(x, 22); c.lineTo(x, H - 22); c.stroke(); }
  const step = (H - 80) / glyphList.length;
  glyphList.forEach((g, i) => {
    const cy = 40 + (i + 0.5) * step;
    drawGlyph(c, g % RUNE_COUNT, W / 2, cy, 56, { color: '#ffffff', width: 2.8 });
    if (i < glyphList.length - 1) {
      c.beginPath(); c.moveTo(36, cy + step * 0.5); c.lineTo(W - 36, cy + step * 0.5); c.stroke();
    }
  });
  return makeCanvasTex(T, cv);
}

// Feathered organic seepage-pool alpha mask (Wet Cave — eliminates any sharp polygon edge!)
export function makeSeepPoolAlphaTexture(T, doc) {
  if (!doc || !doc.createElement) return null;
  const W = 256, H = 256;
  const cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;
  const rnd = makeRng(44901);
  c.fillStyle = '#000000'; c.fillRect(0, 0, W, H);
  // Soft elongated organic puddle body: full inside cave mouth (top v=0), feathered lobe edges & tapering outflow (bottom v=1)
  const blobs = [
    [128, 36, 98, 52, 0.96],
    [124, 96, 86, 62, 0.94],
    [138, 152, 68, 56, 0.88],
    [118, 202, 52, 42, 0.72],
    [82, 82, 48, 36, 0.70],
    [172, 114, 46, 36, 0.68],
  ];
  for (const [bx, by, rx, ry, a] of blobs) {
    c.save(); c.translate(bx, by); c.scale(1, ry / rx);
    const gr = c.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
    gr.addColorStop(0, `rgba(255,255,255,${a})`);
    gr.addColorStop(0.62, `rgba(255,255,255,${(a * 0.78).toFixed(2)})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr;
    c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // Organic edge breakup speckles
  for (let i = 0; i < 45; i++) {
    const px = 42 + rnd() * 172, py = 20 + rnd() * 208, rr = 8 + rnd() * 22;
    const gr = c.createRadialGradient(px, py, 0, px, py, rr);
    gr.addColorStop(0, rnd() < 0.55 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.34)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
  // Force clean zero feather at left, right, and outer (+Z / bottom) borders
  const edgeFade = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#000000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(rx, ry, rw, rh);
  };
  edgeFade(0, 0, 34, 0, 0, 0, 34, H);
  edgeFade(W, 0, W - 34, 0, W - 34, 0, 34, H);
  edgeFade(0, H, 0, H - 46, 0, H - 46, W, 46);
  const tx = new T.CanvasTexture(cv);
  tx.needsUpdate = true;
  return tx;
}

// Feathered organic rust-oxide stain decal (Marrow Cave iron stakes on pale chalk)
export function makeRustBloomTexture(T, doc) {
  if (!doc || !doc.createElement) return null;
  const N = 128;
  const cv = doc.createElement('canvas'); cv.width = N; cv.height = N;
  const c = cv.getContext && cv.getContext('2d');
  if (!c) return null;
  const rnd = makeRng(47909);
  c.clearRect(0, 0, N, N);
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * 22;
    const cx = 64 + Math.cos(a) * d, cy = 64 + Math.sin(a) * d;
    const r = 16 + rnd() * 34;
    const gr = c.createRadialGradient(cx, cy, 2, cx, cy, r);
    gr.addColorStop(0, i < 6 ? 'rgba(98,42,20,0.68)' : 'rgba(128,58,28,0.34)');
    gr.addColorStop(0.6, 'rgba(116,52,24,0.18)');
    gr.addColorStop(1, 'rgba(116,52,24,0)');
    c.fillStyle = gr;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  }
  return makeCanvasTex(T, cv);
}


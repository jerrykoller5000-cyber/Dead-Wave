// studio/weapon-textures.js — AG-410: Shared procedural PBR texture library & WebGPU TSL hardware fold shader
// for every weapon in Grave Shift (12 carried firearms/chainsaw, melee blades, crimson katana + saya,
// Watchman M240 HMG, 81mm mortar + M29A1 round, M67 frag grenade, Holy Hand Grenade, optics, attachments,
// suppressors, and pressure gauges), strictly following docs/art-direction.md and docs/asset-principles.md.
//
// Design & performance guarantees:
// - Lazy per-THREE-instance cache (WeakMap): 0 ms title-screen overhead before weapons build; all textures are
//   shared across every weapon instance, offhand twin, Armory rack copy, carry rig, and 1P viewmodel.
// - WebGPU-native bottom-up DataTextures (flipY = false) with packed linear ORM (R=AO, G=Rough, B=Metal)
//   bound to uv channel 0 (`channel = 0`) so `uv1` remains 100% dedicated to game/barrel-heat.js!
// - Zero extra draw calls: preserves foldStatic batching on all 12 carried weapons via a TSL PBR fold node
//   material that classifies bare machined steel, parkerized/anodized metal, and stippled polymer/rubber
//   per vertex from `foldRM` in one single draw call.
// - 100% compatible with t146 / t334 / tcf9 / t38: coated `gunFurniture` materials receive `normalMap` +
//   `aoMap` + `roughnessMap` while leaving `map === null` on factory finish and preserving exact `issueColor`,
//   `issueRoughness`, `issueMetalness`, and 0.42 m root box-projected UVs; Armory camo layers cleanly on top.
// - Node/fakethree safe: gracefully returns null textures when DataTexture is absent or STAND_IN is true.

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
export function tileWorley(u, v, px, py, seed = 11) {
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
export function heightToNormalRGBA(height, w, h, strength = 2.0, wrapX = true, wrapY = true) {
  const nrm = new Uint8Array(w * h * 4);
  const at = (x, y) => {
    const xx = wrapX ? ((x % w) + w) % w : clamp(x, 0, w - 1);
    const yy = wrapY ? ((y % h) + h) % h : clamp(y, 0, h - 1);
    return height[yy * w + xx];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dX * strength;
      let ny = dY * strength;
      let nz = 1.0;
      const inv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
      nx *= inv; ny *= inv; nz *= inv;
      const o = (y * w + x) * 4;
      nrm[o] = Math.round((nx * 0.5 + 0.5) * 255);
      nrm[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nrm[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nrm[o + 3] = 255;
    }
  }
  return nrm;
}

// Wrap canvas-order RGBA buffer into a bottom-up WebGPU-ready Three.js DataTexture.
export function makeDataTexture(T, rgbaCanvasOrder, w, h, {
  name = 'weapon-pbr',
  srgb = false,
  repeat = true,
  wrapS = null,
  wrapT = null,
  aniso = 4,
  flip = true,
  channel = 0,
} = {}) {
  if (!T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  const buf = flip ? flipRowsRGBA(rgbaCanvasOrder, w, h) : new Uint8Array(rgbaCanvasOrder);
  const tex = new T.DataTexture(buf, w, h, T.RGBAFormat, T.UnsignedByteType);
  tex.name = name;
  if (srgb && T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = wrapS != null ? wrapS : (repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping);
  tex.wrapT = wrapT != null ? wrapT : (repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping);
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = aniso;
  tex.channel = channel;
  tex.needsUpdate = true;
  return tex;
}

// Pixel-buffer PBR synthesizer: evalFn(u, v, x, y) -> { r, g, b, h, ao, rgh, met }
function synthPBRPixels(w, h, evalFn, { normalStrength = 1.8, wrapX = true, wrapY = true } = {}) {
  const col = new Uint8Array(w * h * 4);
  const orm = new Uint8Array(w * h * 4);
  const height = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const p = evalFn(u, v, x, y);
      const o = (y * w + x) * 4;
      col[o] = clamp(Math.round(p.r), 0, 255);
      col[o + 1] = clamp(Math.round(p.g), 0, 255);
      col[o + 2] = clamp(Math.round(p.b), 0, 255);
      col[o + 3] = 255;
      orm[o] = clamp(Math.round(clamp(p.ao, 0, 1) * 255), 0, 255);
      orm[o + 1] = clamp(Math.round(clamp(p.rgh, 0, 1) * 255), 0, 255);
      orm[o + 2] = clamp(Math.round(clamp(p.met, 0, 1) * 255), 0, 255);
      orm[o + 3] = 255;
      height[y * w + x] = p.h;
    }
  }
  const nrm = heightToNormalRGBA(height, w, h, normalStrength, wrapX, wrapY);
  return { col, nrm, orm, w, h };
}

// ============================================================================
// Deterministic Procedural Weapon Material Pixel Generators
// ============================================================================

// 1. Manganese Phosphate / Parkerized Ordnance Steel (barrels, stamped receivers, sights, rails)
// Authored at 0.42 m physical tile scale (repeat 1x1) so coated camo UVs stay 1:1 aligned.
export function genParkerizedPixels(size = 512) {
  return synthPBRPixels(size, size, (u, v) => {
    const oilPatch = tileFbm(u, v, 4, 4, 101, 3, 0.50);
    const sheenWave = tileFbm(u, v, 9, 10, 109, 2, 0.50);
    const fineGrain = tileNoise(u, v, 216, 216, 127);
    const microTooth = tileNoise(u, v, 112, 112, 113);
    const rollGrain = tileFbm(u, v, 6, 128, 139, 2, 0.48);
    // Sparse fine handling hairlines along the receiver/barrel axis (subtle specular glints)
    const scuffMask = sstep(0.82, 0.93, tileFbm(u, v, 6, 28, 151, 2, 0.5)) *
      sstep(0.78, 0.92, tileNoise(u, v, 8, 116, 163));
    const h = 0.50 + (fineGrain - 0.5) * 0.16 + (microTooth - 0.5) * 0.08 + (rollGrain - 0.5) * 0.10 - scuffMask * 0.08;
    const tone = clamp(224 + (oilPatch - 0.5) * 20 + (sheenWave - 0.5) * 10 + (rollGrain - 0.5) * 12 + (fineGrain - 0.5) * 8 + scuffMask * 24, 186, 252);
    const ao = clamp(0.92 + (oilPatch - 0.5) * 0.08 + (fineGrain - 0.5) * 0.06 + (rollGrain - 0.5) * 0.05 + scuffMask * 0.04, 0.84, 1.0);
    // Calibrated around ~0.92 so mat.roughness * G preserves issueRoughness while revealing sleek oiled vs dry phosphate sheen
    const rgh = clamp(0.96 - sstep(0.38, 0.78, oilPatch) * 0.18 + (microTooth - 0.5) * 0.05 - scuffMask * 0.22, 0.64, 1.0);
    const met = clamp(0.88 + scuffMask * 0.12 + (rollGrain - 0.5) * 0.05, 0.80, 1.0);
    return { r: tone * 0.975, g: tone * 0.988, b: tone, h, ao, rgh, met };
  }, { normalStrength: 0.58 });
}

// 2. Type III Hardcoat Anodized Aluminum / Fine Bead-Blasted Receiver, Laser & Optics Alloy
export function genAnodizedPixels(size = 512) {
  return synthPBRPixels(size, size, (u, v) => {
    const sheen = tileFbm(u, v, 4, 4, 211, 3, 0.5);
    const satin = tileNoise(u, v, 224, 224, 227);
    const bead = tileNoise(u, v, 128, 128, 223);
    const mill = tileNoise(u, v, 8, 168, 229);
    const wear = sstep(0.80, 0.94, tileFbm(u, v, 7, 14, 233, 2, 0.5)) *
      sstep(0.76, 0.90, tileNoise(u, v, 10, 96, 239));
    const h = 0.50 + (satin - 0.5) * 0.12 + (bead - 0.5) * 0.06 + (mill - 0.5) * 0.07 - wear * 0.06;
    const tone = clamp(228 + (sheen - 0.5) * 18 + (mill - 0.5) * 9 + (satin - 0.5) * 6 + wear * 20, 196, 252);
    const ao = clamp(0.94 + (sheen - 0.5) * 0.06 + (satin - 0.5) * 0.04, 0.88, 1.0);
    const rgh = clamp(0.95 - sstep(0.42, 0.80, sheen) * 0.17 + (bead - 0.5) * 0.04 - wear * 0.20, 0.66, 1.0);
    const met = clamp(0.92 + wear * 0.08, 0.85, 1.0);
    return { r: tone * 0.985, g: tone * 0.992, b: tone, h, ao, rgh, met };
  }, { normalStrength: 0.40 });
}

// 3. Bare Machined / Brushed / Blued Working Steel (bolts, slides, revolver steel, guide bar, fittings)
export function genMachinedSteelPixels(size = 512) {
  return synthPBRPixels(size, size, (u, v) => {
    const brushCoarse = tileFbm(u, v, 5, 118, 307, 3, 0.52);
    const brushFine = tileNoise(u, v, 12, 224, 311);
    const oilFilm = tileFbm(u, v, 4, 5, 313, 3, 0.5);
    const subtleWear = sstep(0.76, 0.92, tileFbm(u, v, 6, 18, 337, 2, 0.5)) *
      sstep(0.72, 0.90, tileNoise(u, v, 10, 124, 331));
    const h = 0.50 + (brushCoarse - 0.5) * 0.20 + (brushFine - 0.5) * 0.12 - subtleWear * 0.08;
    const tone = clamp(222 + (brushCoarse - 0.5) * 26 + (brushFine - 0.5) * 14 + (oilFilm - 0.5) * 18 + subtleWear * 20, 176, 255);
    const ao = clamp(0.91 + (brushCoarse - 0.5) * 0.10 + (oilFilm - 0.5) * 0.06, 0.82, 1.0);
    const rgh = clamp(0.90 - (brushCoarse - 0.5) * 0.16 - sstep(0.42, 0.80, oilFilm) * 0.16 - subtleWear * 0.16, 0.56, 1.0);
    const met = clamp(0.96 - sstep(0.72, 0.94, oilFilm) * 0.06, 0.86, 1.0);
    return { r: tone * 0.972, g: tone * 0.988, b: tone, h, ao, rgh, met };
  }, { normalStrength: 0.72 });
}

// 4. Hollow-Ground Combat Blade Steel (vertical belt-sander plunge grind lines — knife & machete)
export function genBladeSteelPixels(size = 512) {
  return synthPBRPixels(size, size, (u, v) => {
    const grind = tileFbm(u, v, 96, 6, 401, 3, 0.55);
    const fineGrind = tileNoise(u, v, 192, 12, 409);
    const patina = tileFbm(u, v, 7, 16, 419, 3, 0.52);
    const useScratch = sstep(0.80, 0.93, tileNoise(u, v, 12, 64, 421)) *
      sstep(0.58, 0.82, tileFbm(u, v, 6, 12, 431, 2, 0.5));
    const h = 0.50 + (grind - 0.5) * 0.28 + (fineGrind - 0.5) * 0.14 - useScratch * 0.12;
    const tone = clamp(220 + (grind - 0.5) * 30 + (fineGrind - 0.5) * 14 + (patina - 0.5) * 24 + useScratch * 22, 164, 255);
    const ao = clamp(0.88 + (grind - 0.5) * 0.14 + (patina - 0.5) * 0.10, 0.70, 1.0);
    const rgh = clamp(0.90 + (patina - 0.5) * 0.22 - (grind - 0.5) * 0.14 - useScratch * 0.20, 0.52, 1.0);
    const met = clamp(0.96 - sstep(0.65, 0.90, patina) * 0.12, 0.80, 1.0);
    return { r: tone * 0.97, g: tone * 0.99, b: tone, h, ao, rgh, met };
  }, { normalStrength: 1.45 });
}

// 5. EDM Mold-Etched Glass-Filled Tactical Nylon / Polymer (grips, stocks, PMAGs, frames, handguards)
export function genPolymerPixels(size = 512) {
  return synthPBRPixels(size, size, (u, v) => {
    // Tight tactical EDM stipple (~1.5-2.5 mm scale on pistol/rifle furniture, never coarse cobblestones)
    const pebble = tileWorley(u, v, 168, 168, 503);
    const dome = 1.0 - sstep(0.10, 0.60, pebble.d1);
    const micro = tileNoise(u, v, 240, 240, 509);
    const handWear = tileFbm(u, v, 4, 4, 521, 3, 0.5);
    const scuff = sstep(0.80, 0.92, tileFbm(u, v, 10, 18, 523, 2, 0.5));
    const h = 0.46 + dome * 0.20 + (micro - 0.5) * 0.08 - scuff * 0.05;
    const tone = clamp(224 + (dome - 0.5) * 14 + (handWear - 0.5) * 16 + scuff * 10, 194, 246);
    const ao = clamp(0.89 + dome * 0.09 + (handWear - 0.5) * 0.05, 0.84, 1.0);
    // Handled ridges polish subtly; stipple valleys stay dead-matte
    const rgh = clamp(0.98 - dome * 0.05 - sstep(0.44, 0.82, handWear) * 0.14 - scuff * 0.08, 0.76, 1.0);
    return { r: tone, g: tone, b: tone * 0.992, h, ao, rgh, met: 0.04 };
  }, { normalStrength: 0.70 });
}

// 6. Vulcanized Tactical Grip Rubber / Hoses / Recoil Pads
export function genRubberPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const cell = tileWorley(u, v, 108, 108, 601);
    const nub = 1.0 - sstep(0.12, 0.62, cell.d1);
    const grain = tileNoise(u, v, 144, 144, 607);
    const rib = 0.5 + 0.5 * Math.sin(v * Math.PI * 52);
    const wear = tileFbm(u, v, 4, 4, 613, 2, 0.5);
    const h = 0.44 + nub * 0.18 + rib * 0.10 + (grain - 0.5) * 0.08;
    const tone = clamp(220 + (nub - 0.5) * 14 + (rib - 0.5) * 10 + (wear - 0.5) * 14, 190, 244);
    const ao = clamp(0.86 + nub * 0.09 + rib * 0.05, 0.82, 1.0);
    const rgh = clamp(0.98 - sstep(0.52, 0.88, wear) * 0.10, 0.84, 1.0);
    return { r: tone, g: tone, b: tone, h, ao, rgh, met: 0.0 };
  }, { normalStrength: 0.78 });
}

// 7. Military / Industrial Sprayed Baked Enamel (flamer tanks/case, chainsaw cover, frag body, mortar/M240 olive)
export function genEnamelPixels(size = 512) {
  return synthPBRPixels(size, size, (u, v) => {
    const mist = tileNoise(u, v, 192, 192, 701);
    const grime = tileFbm(u, v, 5, 7, 709, 3, 0.52);
    const wipe = tileFbm(u, v, 8, 24, 719, 2, 0.5);
    const chip = sstep(0.86, 0.94, tileFbm(u, v, 14, 14, 727, 3, 0.55)) *
      sstep(0.74, 0.88, tileNoise(u, v, 52, 52, 733));
    const h = 0.50 + (mist - 0.5) * 0.10 + (wipe - 0.5) * 0.04 - chip * 0.16;
    const tone = clamp(226 + (grime - 0.5) * 20 + (wipe - 0.5) * 10 - chip * 20, 186, 250);
    const ao = clamp(0.92 + (grime - 0.5) * 0.08 - chip * 0.10, 0.82, 1.0);
    const rgh = clamp(0.94 - sstep(0.40, 0.78, wipe) * 0.16 + sstep(0.54, 0.86, grime) * 0.08 - chip * 0.22, 0.64, 1.0);
    const met = clamp(0.16 + chip * 0.78, 0.12, 1.0);
    return { r: tone, g: tone * 0.996, b: tone * 0.988, h, ao, rgh, met };
  }, { normalStrength: 0.42 });
}

// 8. Drawn Ordnance Brass & Copper-Alloy Fittings (casings, linked belt, flamer valves, pins)
export function genBrassPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const turn = tileFbm(u, v, 6, 76, 809, 2, 0.52);
    const tarnish = tileFbm(u, v, 8, 8, 811, 3, 0.55);
    const fine = tileNoise(u, v, 16, 128, 821);
    const h = 0.50 + (turn - 0.5) * 0.20 + (fine - 0.5) * 0.10;
    const pat = sstep(0.45, 0.85, tarnish);
    const r = clamp(228 + (turn - 0.5) * 24 - pat * 34, 155, 255);
    const g = clamp(188 + (turn - 0.5) * 20 - pat * 38, 120, 224);
    const b = clamp(94 + (turn - 0.5) * 14 - pat * 22, 54, 128);
    const ao = clamp(0.88 - pat * 0.16 + (turn - 0.5) * 0.10, 0.68, 1.0);
    const rgh = clamp(0.84 + pat * 0.22 - (turn - 0.5) * 0.14, 0.54, 1.0);
    const met = clamp(0.96 - pat * 0.18, 0.74, 1.0);
    return { r, g, b, h, ao, rgh, met };
  }, { normalStrength: 1.25 });
}

// 9. Oiled Gunstock Walnut (upgrades revolver grips & shared woodMat/woodDark; neutral-warm tintable albedo)
export function genWalnutPixels(size = 512) {
  return synthPBRPixels(size, size, (u, v) => {
    const warp = (tileFbm(u, v, 3, 4, 907, 3, 0.54) - 0.5) * 0.24 +
      (tileFbm(u, v, 8, 6, 911, 2, 0.5) - 0.5) * 0.06;
    const flow = u * 9.0 + warp * 8.5 + 0.35 * Math.sin(v * Math.PI * 2 + u * Math.PI * 2);
    const ring = 0.5 + 0.5 * Math.cos(flow * Math.PI * 2 + 0.65 * Math.sin(flow * Math.PI * 5));
    const band = Math.pow(ring, 2.4);
    const fiber = tileFbm(u, v, 14, 92, 919, 2, 0.5);
    // Elongated open hardwood vessel pores
    const pore = sstep(0.73, 0.90, tileNoise(u, v, 24, 168, 929)) *
      sstep(0.45, 0.85, tileNoise(u, v, 96, 48, 937));
    const oilSheen = tileFbm(u, v, 4, 4, 941, 2, 0.5);
    const h = 0.52 + (band - 0.5) * 0.18 + (fiber - 0.5) * 0.12 - pore * 0.42;
    // Neutral-warm multiplicative albedo (works with revolver's 0x76492f / 0x573922 & woodMat 0x7a4b29!)
    const base = 236 - band * 54 + (fiber - 0.5) * 26 - pore * 62;
    const r = clamp(base * 1.03, 108, 252);
    const g = clamp(base * 0.97, 94, 242);
    const b = clamp(base * 0.91, 82, 228);
    const ao = clamp(0.92 - band * 0.12 - pore * 0.28, 0.56, 1.0);
    const rgh = clamp(0.84 + pore * 0.22 + band * 0.08 - sstep(0.42, 0.80, oilSheen) * 0.16, 0.56, 1.0);
    return { r, g, b, h, ao, rgh, met: 0.0 };
  }, { normalStrength: 1.85 });
}

// 10. Lacquered Soviet Laminate Birch Atlas (512x512: lower half long grain, upper half exposed laminate plies)
// Preserves mapBirchSlab() UV layout 100% while adding rich shellac depth + matching normal & ORM!
export function genBirchAtlasPixels(size = 512) {
  const half = size >> 1;
  return synthPBRPixels(size, size, (_u, _v, x, y) => {
    const u = x / size;
    const edge = y >= half;
    const v = (y % half) / half;
    const bent = v + 0.062 * (tileFbm(u, v, 3, 3, 1009, 2, 0.5) - 0.5) +
      0.018 * (tileNoise(u, v, 8, 4, 1013) - 0.5);
    const band = tileFbm(u, bent, 4, 14, 1019, 3, 0.54) - 0.5;
    const fibres = tileFbm(u, bent, 12, 72, 1021, 2, 0.5) - 0.5;
    const rays = sstep(0.76, 0.92, tileNoise(u, bent, 32, 88, 1031)) * 0.6;
    const pore = sstep(0.72, 0.91, tileNoise(u, bent, 112, 104, 1033));
    const ply = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (bent * 12 + 0.10 * tileNoise(u, v, 3, 5, 1039)));
    const glueLine = edge ? Math.pow(ply, 4.5) : 0;
    const lacquerSheen = tileFbm(u, v, 4, 6, 1049, 2, 0.5);
    const shade = 42 * band + 28 * fibres + 12 * rays - 36 * pore + (edge ? 7 - 26 * glueLine : 0);
    // Rich warm amber-russet lacquered Russian birch
    const r = clamp(174 + shade, 88, 232);
    const g = clamp(104 + 0.86 * shade, 48, 166);
    const b = clamp(62 + 0.62 * shade, 26, 114);
    const h = 0.50 + band * 0.22 + fibres * 0.18 - pore * 0.36 - glueLine * 0.22;
    const ao = clamp(0.92 + band * 0.10 - pore * 0.24 - glueLine * 0.20, 0.58, 1.0);
    // Hand-rubbed shellac satin gloss with dry open pores & resin glue lines
    const rgh = clamp(0.78 + pore * 0.24 + glueLine * 0.16 - sstep(0.42, 0.80, lacquerSheen) * 0.18, 0.48, 1.0);
    return { r, g, b, h, ao, rgh, met: 0.0 };
  }, { normalStrength: 1.75, wrapX: true, wrapY: false });
}

// 10b. Carved Wood Grip Stipple (KR-7 AK grip cheek panels — crisp carved punch pits + normal + ORM)
export function genWoodStipplePixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const cell = tileWorley(u, v, 34, 34, 1103);
    const pit = 1.0 - sstep(0.14, 0.50, cell.d1);
    const ridge = sstep(0.02, 0.20, cell.edge);
    const grain = tileFbm(u, v, 8, 48, 1109, 2, 0.5);
    const h = 0.62 - pit * 0.52 + (grain - 0.5) * 0.10;
    const base = clamp(232 - pit * 112 + (grain - 0.5) * 20, 96, 250);
    const ao = clamp(0.96 - pit * 0.42, 0.48, 1.0);
    const rgh = clamp(0.84 + pit * 0.16 + (1 - ridge) * 0.06, 0.78, 1.0);
    return { r: base, g: base * 0.95, b: base * 0.90, h, ao, rgh, met: 0.0 };
  }, { normalStrength: 2.35 });
}

// 11. Folded Crimson Tamahagane / Damascus Katana Blade Steel with Organic Hamon Temper Wave
export function genKatanaBladePixels(size = 512) {
  return synthPBRPixels(size, size, (u, v) => {
    // Flowing forged hada grain layers along the blade length
    const warp = (tileFbm(u, v, 5, 10, 1201, 3, 0.55) - 0.5) * 0.22;
    const hada = 0.5 + 0.5 * Math.sin((v * 26 + warp * 14 + u * 2.0) * Math.PI * 2);
    const fineLayers = tileFbm(u, v, 8, 64, 1213, 3, 0.54);
    const polish = tileNoise(u, v, 24, 144, 1217);
    // Organic wavy hamon temper band near the edge
    const hamonWave = 0.26 + 0.07 * Math.sin(u * Math.PI * 10) + 0.04 * (tileFbm(u, v, 8, 4, 1223, 2, 0.5) - 0.5);
    const hamonEdge = sstep(hamonWave + 0.04, hamonWave - 0.04, Math.abs(v - 0.5));
    const hamonBand = Math.exp(-Math.pow((Math.abs(v - 0.5) - hamonWave) / 0.032, 2));
    const h = 0.50 + (hada - 0.5) * 0.14 + (fineLayers - 0.5) * 0.12 + (polish - 0.5) * 0.06 + hamonBand * 0.08;
    // Neutral-bright multiplier so the katana's crimson vertexColors shine richly
    const tone = clamp(216 + (hada - 0.5) * 28 + (fineLayers - 0.5) * 18 + hamonBand * 32 + hamonEdge * 14, 168, 255);
    const ao = clamp(0.88 + (hada - 0.5) * 0.12 + hamonBand * 0.08, 0.74, 1.0);
    // Quenched hamon edge has slightly frostier crystalline roughness vs mirror shinogi spine
    const rgh = clamp(0.76 + hamonEdge * 0.20 + hamonBand * 0.14 - (hada - 0.5) * 0.12, 0.54, 1.0);
    const met = clamp(0.98 - hamonBand * 0.08, 0.86, 1.0);
    return { r: tone, g: tone * 0.98, b: tone * 0.985, h, ao, rgh, met };
  }, { normalStrength: 1.15 });
}

// 12a. Braided Japanese Silk Tsuka-Ito Wrap & Sageo Cord
export function genKatanaWrapPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const d1 = (u + v) * 28;
    const d2 = (u - v) * 28;
    const strandA = 0.5 + 0.5 * Math.cos(d1 * Math.PI * 2);
    const strandB = 0.5 + 0.5 * Math.cos(d2 * Math.PI * 2);
    const checker = Math.sin(d1 * Math.PI) * Math.sin(d2 * Math.PI) > 0 ? 1 : 0;
    const weave = lerp(strandA, strandB, checker);
    const thread = tileNoise(u, v, 96, 96, 1301);
    const wear = tileFbm(u, v, 4, 4, 1303, 2, 0.5);
    const h = 0.30 + weave * 0.56 + (thread - 0.5) * 0.12;
    const tone = clamp(192 + weave * 56 + (wear - 0.5) * 18, 135, 252);
    const ao = clamp(0.68 + weave * 0.32, 0.62, 1.0);
    const rgh = clamp(0.98 - weave * 0.12 - sstep(0.50, 0.85, wear) * 0.10, 0.74, 1.0);
    return { r: tone, g: tone * 0.96, b: tone * 0.96, h, ao, rgh, met: 0.05 };
  }, { normalStrength: 2.25 });
}

// 12b. Pebbled Ray-Skin Samegawa (under tsuka-ito wrap)
export function genKatanaSamegawaPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const cell = tileWorley(u, v, 26, 26, 1409);
    const pearl = Math.pow(1.0 - sstep(0.05, 0.54, cell.d1), 0.72);
    const micro = tileNoise(u, v, 84, 84, 1423);
    const h = 0.22 + pearl * 0.70 + (micro - 0.5) * 0.06;
    const tone = clamp(152 + pearl * 96 + (cell.id - 0.5) * 20, 120, 254);
    const ao = clamp(0.58 + pearl * 0.42, 0.54, 1.0);
    const rgh = clamp(0.96 - pearl * 0.36, 0.56, 1.0);
    return { r: tone, g: tone * 0.985, b: tone * 0.95, h, ao, rgh, met: 0.08 };
  }, { normalStrength: 2.55 });
}

// 12c. Deep Hand-Rubbed Urushi Saya Lacquer
export function genKatanaLacquerPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const woodUnder = tileFbm(u, v, 4, 24, 1511, 3, 0.5);
    const swirl = tileFbm(u, v, 8, 8, 1523, 2, 0.5);
    const micro = tileNoise(u, v, 64, 64, 1531);
    const h = 0.50 + (woodUnder - 0.5) * 0.08 + (swirl - 0.5) * 0.06 + (micro - 0.5) * 0.04;
    const tone = clamp(228 + (woodUnder - 0.5) * 24 + (swirl - 0.5) * 14, 190, 254);
    const ao = clamp(0.92 + (woodUnder - 0.5) * 0.08, 0.84, 1.0);
    const rgh = clamp(0.84 + (swirl - 0.5) * 0.24, 0.58, 1.0);
    return { r: tone, g: tone * 0.98, b: tone * 0.985, h, ao, rgh, met: 0.85 };
  }, { normalStrength: 0.65 });
}

// 12d. Refined Hand-Burnished Antique Gold & Gilded Bronze (katana fittings & Holy Hand Grenade)
export function genChasedGoldPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    // Silky jeweler's satin burnish + gentle warm antique patina (no coarse golf-ball dents)
    const burnish = tileFbm(u, v, 10, 64, 1601, 2, 0.5);
    const satin = tileNoise(u, v, 128, 128, 1609);
    const patina = tileFbm(u, v, 5, 5, 1607, 3, 0.54);
    const warmMottle = tileFbm(u, v, 12, 12, 1613, 2, 0.5);
    const h = 0.50 + (burnish - 0.5) * 0.12 + (satin - 0.5) * 0.08 + (warmMottle - 0.5) * 0.06;
    const antiqued = sstep(0.50, 0.88, patina);
    const tone = clamp(242 - antiqued * 38 + (burnish - 0.5) * 16 + (warmMottle - 0.5) * 12, 184, 255);
    const ao = clamp(0.92 - antiqued * 0.12 + (burnish - 0.5) * 0.05, 0.78, 1.0);
    const rgh = clamp(0.76 + antiqued * 0.24 - (burnish - 0.5) * 0.10, 0.58, 1.0);
    const met = clamp(0.98 - antiqued * 0.10, 0.86, 1.0);
    return { r: tone, g: tone * 0.965, b: tone * 0.895, h, ao, rgh, met };
  }, { normalStrength: 0.38 });
}

// 13. Multi-Coated Anti-Reflective Optical Glass Lens
export function genOpticalGlassPixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const dx = u - 0.5, dy = v - 0.5;
    const rad = Math.hypot(dx, dy) * 2.0;
    const ring = 0.5 + 0.5 * Math.cos(rad * Math.PI * 10);
    const dome = clamp(1.0 - rad * rad * 0.42, 0, 1);
    const dust = tileNoise(u, v, 32, 32, 1709);
    const h = 0.45 + dome * 0.40 + ring * 0.04;
    // Subtle emerald-cyan optical AR coating gradient
    const r = clamp(168 + dome * 42 + (dust - 0.5) * 8, 130, 232);
    const g = clamp(214 + dome * 34 + ring * 8, 175, 252);
    const b = clamp(224 + dome * 28, 185, 255);
    const ao = clamp(0.84 + dome * 0.16, 0.78, 1.0);
    const rgh = clamp(0.74 + rad * 0.22 + (dust - 0.5) * 0.08, 0.55, 1.0);
    return { r, g, b, h, ao, rgh, met: 0.92 };
  }, { normalStrength: 0.75, wrapX: false, wrapY: false });
}

// 14. Crisp Vintage Mil-Spec Pressure Gauge Face (Flamer & Mortar dial — sits behind 3D tritium ticks/needle)
export function genPressureGaugePixels(size = 256) {
  return synthPBRPixels(size, size, (u, v) => {
    const dx = (u - 0.5) * 2.0;
    const dy = (v - 0.5) * 2.0;
    const rad = Math.hypot(dx, dy);
    const ang = Math.atan2(-dy, dx); // 0 = +X, PI/2 = top
    const paper = tileFbm(u, v, 14, 14, 1801, 3, 0.52);
    // Warm aged cream dial face with subtle outer bezel shadow vignette
    const vig = sstep(0.68, 0.98, rad);
    let r = 222 + (paper - 0.5) * 18 - vig * 68;
    let g = 216 + (paper - 0.5) * 16 - vig * 64;
    let b = 196 + (paper - 0.5) * 14 - vig * 58;
    let h = 0.54 - vig * 0.22 + (paper - 0.5) * 0.06;
    let rgh = 0.82 + vig * 0.14;

    // Outer metallic scale ring
    const ringLine = Math.abs(rad - 0.80) < 0.022 || Math.abs(rad - 0.58) < 0.012;
    if (ringLine && ang > -Math.PI * 0.75 && ang < Math.PI * 0.75) {
      r *= 0.34; g *= 0.35; b *= 0.34;
      h -= 0.06;
    }
    // Red overpressure danger arc (lower-right / high-pressure quadrant)
    if (rad > 0.68 && rad < 0.80 && ang < 0.25 && ang > -0.82) {
      r = 166; g = 46; b = 38;
      h += 0.03;
    }
    // Fine radial sub-graduation ticks around the dial perimeter
    if (rad > 0.64 && rad < 0.80 && (ang > -2.35 && ang < 2.35)) {
      const tickAngle = ((ang + Math.PI) / (Math.PI * 2)) * 36;
      const frac = Math.abs(tickAngle - Math.round(tickAngle));
      const major = Math.round(tickAngle) % 3 === 0;
      const hit = frac < (major ? 0.08 : 0.045) && (major || rad > 0.71);
      if (hit) {
        r *= 0.26; g *= 0.28; b *= 0.27;
        h -= 0.05;
      }
    }
    // Center brass/dark instrument hub screw
    if (rad < 0.14) {
      r = 68; g = 66; b = 60;
      h = 0.68;
      rgh = 0.54;
    }
    // Dark rim frame
    if (rad > 0.91) {
      r = 46; g = 48; b = 50;
      h = 0.72;
      rgh = 0.62;
    }
    const ao = clamp(0.95 - vig * 0.32, 0.55, 1.0);
    return { r: clamp(r, 20, 248), g: clamp(g, 20, 245), b: clamp(b, 20, 236), h, ao, rgh, met: rad > 0.91 || rad < 0.14 ? 0.65 : 0.02 };
  }, { normalStrength: 1.15, wrapX: false, wrapY: false });
}

// ============================================================================
// Lazy Per-THREE-Instance PBR Library Cache
// ============================================================================
const _libCache = new WeakMap();

const SPEC = {
  parkerized:     { gen: genParkerizedPixels,     size: 512, nrmScale: 0.16, aoInt: 0.28, repeat: true,  srgb: true,  aniso: 4 },
  anodized:       { gen: genAnodizedPixels,       size: 512, nrmScale: 0.12, aoInt: 0.22, repeat: true,  srgb: true,  aniso: 4 },
  machinedSteel:  { gen: genMachinedSteelPixels,  size: 512, nrmScale: 0.20, aoInt: 0.28, repeat: true,  srgb: true,  aniso: 4 },
  bladeSteel:     { gen: genBladeSteelPixels,     size: 512, nrmScale: 0.34, aoInt: 0.50, repeat: true,  srgb: true,  aniso: 4 },
  polymer:        { gen: genPolymerPixels,        size: 512, nrmScale: 0.18, aoInt: 0.26, repeat: true,  srgb: true,  aniso: 4 },
  rubber:         { gen: genRubberPixels,         size: 256, nrmScale: 0.22, aoInt: 0.30, repeat: true,  srgb: true,  aniso: 4 },
  enamel:         { gen: genEnamelPixels,         size: 512, nrmScale: 0.13, aoInt: 0.24, repeat: true,  srgb: true,  aniso: 4 },
  brass:          { gen: genBrassPixels,          size: 256, nrmScale: 0.24, aoInt: 0.42, repeat: true,  srgb: true,  aniso: 4 },
  walnut:         { gen: genWalnutPixels,         size: 512, nrmScale: 0.50, aoInt: 0.68, repeat: true,  srgb: true,  aniso: 4 },
  birch:          { gen: genBirchAtlasPixels,     size: 512, nrmScale: 0.46, aoInt: 0.64, repeat: false, wrapS: 'repeat', wrapT: 'clamp', srgb: true, aniso: 4 },
  woodStipple:    { gen: genWoodStipplePixels,    size: 256, nrmScale: 0.64, aoInt: 0.72, repeat: true,  srgb: true,  aniso: 4 },
  katanaBlade:    { gen: genKatanaBladePixels,    size: 512, nrmScale: 0.30, aoInt: 0.48, repeat: true,  srgb: true,  aniso: 4 },
  katanaWrap:     { gen: genKatanaWrapPixels,     size: 256, nrmScale: 0.60, aoInt: 0.72, repeat: true,  srgb: true,  aniso: 4 },
  katanaSamegawa: { gen: genKatanaSamegawaPixels, size: 256, nrmScale: 0.72, aoInt: 0.74, repeat: true,  srgb: true,  aniso: 4 },
  katanaLacquer:  { gen: genKatanaLacquerPixels,  size: 256, nrmScale: 0.16, aoInt: 0.36, repeat: true,  srgb: true,  aniso: 4 },
  chasedGold:     { gen: genChasedGoldPixels,     size: 256, nrmScale: 0.12, aoInt: 0.24, repeat: true,  srgb: true,  aniso: 4 },
  opticalGlass:   { gen: genOpticalGlassPixels,   size: 256, nrmScale: 0.14, aoInt: 0.32, repeat: false, srgb: true,  aniso: 4 },
  pressureGauge:  { gen: genPressureGaugePixels,  size: 256, nrmScale: 0.30, aoInt: 0.48, repeat: false, srgb: true,  aniso: 8 },
};

export const WEAPON_PBR_KEYS = Object.freeze(Object.keys(SPEC));

function buildEntry(T, key) {
  const s = SPEC[key];
  if (!s || !T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  const px = s.gen(s.size);
  const wS = s.wrapS === 'repeat' ? T.RepeatWrapping : s.wrapS === 'clamp' ? T.ClampToEdgeWrapping : (s.repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping);
  const wT = s.wrapT === 'repeat' ? T.RepeatWrapping : s.wrapT === 'clamp' ? T.ClampToEdgeWrapping : (s.repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping);
  let _colBuf = px.col;
  let _mapTex = null;
  const normalMap = makeDataTexture(T, px.nrm, px.w, px.h, { name: `wpn-${key}-nrm`, srgb: false, wrapS: wS, wrapT: wT, aniso: s.aniso, channel: 0 });
  const ormMap = makeDataTexture(T, px.orm, px.w, px.h, { name: `wpn-${key}-orm`, srgb: false, wrapS: wS, wrapT: wT, aniso: s.aniso, channel: 0 });
  return {
    key,
    get map() {
      if (!_mapTex && _colBuf) {
        _mapTex = makeDataTexture(T, _colBuf, px.w, px.h, { name: `wpn-${key}-col`, srgb: !!s.srgb, wrapS: wS, wrapT: wT, aniso: s.aniso, channel: 0 });
        _colBuf = null;
      }
      return _mapTex;
    },
    normalMap,
    ormMap,
    nrmScale: s.nrmScale,
    aoInt: s.aoInt,
  };
}

/**
 * Returns a lazy-cached PBR map bundle for `key` on Three namespace `T`.
 * Only generates the requested texture family on first access.
 */
export function getWeaponPBR(T, key) {
  if (!T || !SPEC[key] || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  let cache = _libCache.get(T);
  if (!cache) {
    cache = Object.create(null);
    _libCache.set(T, cache);
  }
  if (!cache[key]) cache[key] = buildEntry(T, key);
  return cache[key];
}

/**
 * Applies a weapon PBR bundle cleanly onto a MeshStandardMaterial / MeshPhysicalMaterial.
 * Options:
 * - useMap: attach `map` (set FALSE on paintable `gunFurniture` materials so t146/t334 keep `map === null` on factory!)
 * - useMetalMap: attach `metalnessMap` (only on metallic surfaces where `metalness >= 0.35`)
 * - normalScale: override normal relief intensity
 * - aoIntensity: override AO map intensity
 * - markFoldable: tag `userData.weaponBasePBR = true` so foldGun's foldStatic still batches static weapon hardware!
 */
export function applyWeaponPBR(T, mat, key, {
  useMap = false,
  useMetalMap = false,
  normalScale = null,
  aoIntensity = null,
  markFoldable = false,
  overwrite = false,
} = {}) {
  if (!mat || !T) return mat;
  const pbr = getWeaponPBR(T, key);
  if (!pbr) return mat;
  if (!mat.userData) mat.userData = {};
  const replace = overwrite || (!!mat.userData.weaponPBRKind && mat.userData.weaponPBRKind !== key);
  if (useMap && pbr.map && (replace || !mat.map)) {
    mat.map = pbr.map;
  }
  if (pbr.normalMap && (replace || !mat.normalMap)) {
    mat.normalMap = pbr.normalMap;
    const ns = normalScale != null ? normalScale : pbr.nrmScale;
    if (mat.normalScale && typeof mat.normalScale.set === 'function') mat.normalScale.set(ns, ns);
    else if (typeof T.Vector2 === 'function') mat.normalScale = new T.Vector2(ns, ns);
  }
  if (pbr.ormMap) {
    if (replace || !mat.roughnessMap) mat.roughnessMap = pbr.ormMap;
    if (replace || !mat.aoMap) {
      mat.aoMap = pbr.ormMap;
      mat.aoMapIntensity = aoIntensity != null ? aoIntensity : pbr.aoInt;
    }
    if (useMetalMap && (replace || !mat.metalnessMap)) mat.metalnessMap = pbr.ormMap;
    else if (replace && !useMetalMap && mat.metalnessMap) mat.metalnessMap = null;
  }
  mat.userData.weaponPBRKind = key;
  if (markFoldable) mat.userData.weaponBasePBR = true;
  else if (overwrite) mat.userData.weaponBasePBR = false;
  mat.needsUpdate = true;
  return mat;
}

/**
 * Infers the physical weapon PBR family for any coated `gunFurniture` or hardware material
 * from its weaponFinishRole, issueName/name, roughness, and metalness.
 */
export function classifyWeaponMaterial(mat) {
  if (!mat) return 'parkerized';
  const role = String(mat.userData?.weaponFinishRole || '').toLowerCase();
  const name = (String(mat.userData?.issueName || '') + ' ' + String(mat.name || '')).toLowerCase();
  const r = typeof mat.roughness === 'number' ? mat.roughness : 0.65;
  const m = typeof mat.metalness === 'number' ? mat.metalness : 0.08;
  if (/walnut/.test(name)) return 'walnut';
  if (/birch/.test(name)) return 'birch';
  if (/stipple/.test(name)) return 'woodStipple';
  if (/dial|gauge/.test(name)) return 'pressureGauge';
  if (/rubber|hose|sleeve/.test(name) || (r >= 0.88 && m <= 0.02)) return 'rubber';
  if (/brass|cartridge|belt/.test(name)) return 'brass';
  if (/enamel|tank|cover|hazard|fuel|shell/.test(name) || role === 'tank') return 'enamel';
  if (/blade|edge/.test(name)) return 'bladeSteel';
  if (role === 'optic shell' || role === 'light shell' || role === 'rail' || role === 'suppressor shell') {
    return 'anodized';
  }
  if (role === 'furniture' || role === 'grip' || role === 'stock' || role === 'pump' || role === 'cheek') {
    return r >= 0.72 && m <= 0.06 ? 'polymer' : 'enamel';
  }
  if (role === 'magazine' || role === 'drum') {
    return r >= 0.72 && m <= 0.06 ? 'polymer' : 'parkerized';
  }
  if (m >= 0.45) return 'machinedSteel';
  if (r >= 0.74 && m <= 0.05) return 'polymer';
  if (role === 'slide') return m >= 0.35 ? 'machinedSteel' : 'anodized';
  if (role === 'frame') return r >= 0.72 && m <= 0.06 ? 'polymer' : 'anodized';
  return 'parkerized';
}

/**
 * Applies role-appropriate PBR micro-detail (normalMap + packed AO/Roughness, NEVER overwriting `map`!)
 * to every registered `gunFurniture` material so BOTH factory finishes AND Armory camos show rich
 * phosphate, anodized, enamel, or stippled polymer surface texture while passing t146 & t334 100%.
 */
export function applyGunFurniturePBR(T, gunFurniture) {
  if (!T || !gunFurniture) return 0;
  let count = 0;
  for (const mats of Object.values(gunFurniture)) {
    if (!Array.isArray(mats)) continue;
    for (const mat of mats) {
      if (!mat || !mat.isMaterial) continue;
      const kind = classifyWeaponMaterial(mat);
      const useMetal = (mat.metalness || 0) >= 0.45 && (kind === 'machinedSteel' || kind === 'brass');
      applyWeaponPBR(T, mat, kind, { useMap: false, useMetalMap: useMetal, markFoldable: false, overwrite: true });
      count++;
    }
  }
  return count;
}

/**
 * Projects clean 0.42 m object-space box UVs onto any mesh/hierarchy that lacks UVs or has stretched
 * primitive UVs (used for standalone knife/machete/katana/grenade/mortar/M240 models and folded guns).
 */
export function projectWeaponUVs(root, { tileMeters = 0.42, skip = null } = {}) {
  if (!root) return 0;
  let updated = 0;
  const invScale = 1 / Math.max(0.05, tileMeters);
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    if (skip && skip(o)) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (mat?.userData?.preserveArtworkUV || o.userData?.gunPaintUV) return;
    const geo = o.geometry;
    const P = geo.attributes.position;
    const N = geo.attributes.normal;
    if (!N) geo.computeVertexNormals();
    const Nn = geo.attributes.normal;
    const uvArr = new Float32Array(P.count * 2);
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const ax = Nn ? Math.abs(Nn.getX(i)) : 0;
      const ay = Nn ? Math.abs(Nn.getY(i)) : 1;
      const az = Nn ? Math.abs(Nn.getZ(i)) : 0;
      let u, v;
      if (ax >= ay && ax >= az) { u = z * invScale; v = y * invScale; }
      else if (ay >= az) { u = x * invScale; v = z * invScale; }
      else { u = x * invScale; v = y * invScale; }
      uvArr[i * 2] = u;
      uvArr[i * 2 + 1] = v;
    }
    const Attr = P.constructor;
    geo.setAttribute('uv', new Attr(uvArr, 2));
    updated++;
  });
  return updated;
}

// ============================================================================
// WebGPU TSL PBR Hardware Fold Material (0 Extra Draws on All 12 Carried Guns!)
// ============================================================================
const _foldCache = new WeakMap();

/**
 * Builds the shared TSL PBR node builder used by world/bake.js foldStatic({ weaponPBR }) and
 * game/viewmodel.js (1P view copies). Classifies every folded vertex smoothly from `foldRM`:
 *   - Bare machined / brushed steel (foldRM.y >= 0.45)
 *   - Molded stippled polymer / rubber (foldRM.x >= 0.74, low metal)
 *   - Parkerized / anodized ordnance metal (everything between)
 * All in ONE single draw call per folded gun group, leaving uv1 free for barrel-heat.js!
 */
export function getWeaponFoldPBR(T, TSL) {
  if (!T || !TSL || !T.MeshStandardNodeMaterial || !TSL.attribute || !TSL.texture || !TSL.uv || !TSL.normalMap) return null;
  if (_foldCache.has(T)) return _foldCache.get(T);

  const steel = getWeaponPBR(T, 'machinedSteel');
  const park = getWeaponPBR(T, 'parkerized');
  const poly = getWeaponPBR(T, 'polymer');
  if (!steel?.normalMap || !park?.normalMap || !poly?.normalMap) return null;

  const textures = [steel.normalMap, steel.ormMap, park.normalMap, park.ormMap, poly.normalMap, poly.ormMap];

  function buildNodes() {
    const { attribute, uv, texture, normalMap, vec2, float, smoothstep, mix, clamp: tClamp } = TSL;
    const rm = attribute('foldRM', 'vec2');
    const tc = uv();

    // Smooth per-vertex material-class weights from foldRM = (roughness, metalness)
    const wSteel = smoothstep(float(0.36), float(0.68), rm.y);
    const wPoly = smoothstep(float(0.71), float(0.84), rm.x).mul(float(1.0).sub(wSteel));
    const wPark = tClamp(float(1.0).sub(wSteel).sub(wPoly), float(0.0), float(1.0));

    const sN = texture(steel.normalMap, tc).xyz;
    const pN = texture(park.normalMap, tc).xyz;
    const gN = texture(poly.normalMap, tc).xyz;
    const blendN = sN.mul(wSteel).add(pN.mul(wPark)).add(gN.mul(wPoly));

    const sO = texture(steel.ormMap, tc);
    const pO = texture(park.ormMap, tc);
    const gO = texture(poly.ormMap, tc);
    const blendO = sO.mul(wSteel).add(pO.mul(wPark)).add(gO.mul(wPoly));

    // Subtle physical tonal patina / cavity micro-AO multiplier (~0.91..1.05 around vertex color)
    const patinaMul = mix(float(0.91), float(1.05), blendO.x);
    const nStrength = wSteel.mul(0.20).add(wPark.mul(0.15)).add(wPoly.mul(0.18));

    return {
      rm,
      patinaMul,
      roughnessNode: tClamp(rm.x.mul(blendO.y), float(0.08), float(0.98)),
      metalnessNode: tClamp(rm.y.mul(mix(float(1.0), blendO.z, wSteel)), float(0.0), float(1.0)),
      normalNode: normalMap(blendN, vec2(nStrength, nStrength)),
    };
  }

  function createMaterial(side) {
    const m = new T.MeshStandardNodeMaterial({ vertexColors: true, side });
    const nodes = buildNodes();
    const vc = TSL.attribute('color', 'vec3');
    m.colorNode = vc.mul(nodes.patinaMul);
    m.vertexColors = false;
    m.roughnessNode = nodes.roughnessNode;
    m.metalnessNode = nodes.metalnessNode;
    m.normalNode = nodes.normalNode;
    m.name = 'fold-static'; // Preserves barrel-heat, Armory rack flattener, and viewmodel packedGunPaint contracts
    m.userData = {
      weaponFoldPBR: true,
      weaponFoldTextures: textures,
      buildFoldNodes: buildNodes,
    };
    return m;
  }

  const bundle = { createMaterial, buildNodes, textures };
  _foldCache.set(T, bundle);
  return bundle;
}

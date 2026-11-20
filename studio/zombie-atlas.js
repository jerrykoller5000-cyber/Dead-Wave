// studio/zombie-atlas.js — CC-359 step 3 (Claude 3, 19 Nov 2026). REVIEW COPY (review/CC-359/v6), not landed.
// The paint of the shambler Jerry signed off (D-213, Antigravity's AG-357 pass 7 "FINAL ATLAS 512"): hair patches, the throat
// and mouth blood, the corpse skin mottle, cloth weave and grime, boot leather, in ONE atlas (colour + normal + packed
// AO/rough/metal), the same layout and texel painters as AG's review/AG-357/atlas-step3.mjs (md5 6631cd05) and
// textures-step2.mjs (md5 c22b4d87), ported with only these changes:
//   1. no canvas: the atlas is three DataTextures (rows written bottom-up, so AG's flipY=true UV rects hold unchanged);
//   2. no alpha: the tank's holes are cut in the geometry (zombie-shambler-v5.js), so the tank tile is opaque (its dark
//      frayed rim stays painted round the cut); the game's skinned bodies take no alphaTest materials;
//   3. built once per page, lazily, at the size asked (512 = AG's final, 3 x 1 MB + mips), and shared by every shambler.
// zombie-humanoids.js puts each v5 piece's own 0..1 UVs into its zone's rect (cc359AtlasZone + cc359AtlasUV) and gives it
// the atlas material; the game keeps them through batchSurfaces / skinZombieMesh (the atlas UVs ride userData.cc359Atlas).
// ======== ported from review/AG-357/geo-utils.mjs (md5 f6657157), lines 6-58: the noise ========
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (d, r) => {
  const q = d / (r || 1e-6);
  return Math.exp(-q * q);
};

// Deterministic 3D hash -> [-1, 1]
function hash3i(ix, iy, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 2147483647);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// Smooth 3D value noise in [-1, 1]
function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3i(ix, iy, iz), n100 = hash3i(ix + 1, iy, iz);
  const n010 = hash3i(ix, iy + 1, iz), n110 = hash3i(ix + 1, iy + 1, iz);
  const n001 = hash3i(ix, iy, iz + 1), n101 = hash3i(ix + 1, iy, iz + 1);
  const n011 = hash3i(ix, iy + 1, iz + 1), n111 = hash3i(ix + 1, iy + 1, iz + 1);

  const nx00 = lerp(n000, n100, ux), nx10 = lerp(n010, n110, ux);
  const nx01 = lerp(n001, n101, ux), nx11 = lerp(n011, n111, ux);
  const nxy0 = lerp(nx00, nx10, uy), nxy1 = lerp(nx01, nx11, uy);
  return lerp(nxy0, nxy1, uz) * 2 - 1;
}

// Multi-octave FBM in [-1, 1] approx
function fbm3(x, y, z, octaves = 3, lac = 2.07, gain = 0.5) {
  let sum = 0, amp = 0.5, norm = 0, fx = x, fy = y, fz = z;
  for (let i = 0; i < octaves; i++) {
    sum += noise3(fx, fy, fz) * amp;
    norm += amp;
    amp *= gain;
    fx *= lac; fy *= lac; fz *= lac;
  }
  return norm > 0 ? sum / norm : 0;
}


// ======== ported from review/AG-357/textures-step2.mjs (md5 c22b4d87): the texel painters, unchanged ========
function cylFbm(u, v, radiusU = 2.4, scaleV = 6.0, seed = 11, octaves = 4) {
  const ang = u * Math.PI * 2;
  const cx = Math.cos(ang) * radiusU + seed * 3.1;
  const cy = v * scaleV - seed * 1.7;
  const cz = Math.sin(ang) * radiusU + seed * 0.9;
  return fbm3(cx, cy, cz, octaves);
}

// Signed shortest angular distance around u in [0, 1)
function wrapDU(u, u0) {
  let d = (u - u0) % 1;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

function buildHeightNormalTile(w, h, evalTexel, {
  normalStrength = 3.2,
  wrapU = true,
  pad = 0,
  metalness = 0.0,
  aoBias = 1.0
} = {}) {
  const innerW = Math.max(1, w - pad * 2);
  const innerH = Math.max(1, h - pad * 2);
  const rgba = new Uint8ClampedArray(w * h * 4);
  const orm = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const vRaw = innerH > 1 ? 1 - (y - pad) / (innerH - 1) : 0.5;
    const v = clamp(vRaw, 0, 1);
    for (let x = 0; x < w; x++) {
      let u = innerW > 1 ? (x - pad) / innerW : 0.5;
      if (wrapU) u = ((u % 1) + 1) % 1;
      else u = clamp(u, 0, 1);

      const px = evalTexel(u, v);
      const o = (y * w + x) * 4;
      rgba[o]     = px.r;
      rgba[o + 1] = px.g;
      rgba[o + 2] = px.b;
      rgba[o + 3] = px.a ?? 255;

      height[y * w + x] = px.h;

      const aoVal = px.ao !== undefined ? px.ao : clamp(aoBias - Math.max(0, 0.5 - px.h) * 0.25, 0.80, 1.0);
      orm[o]     = clamp(Math.round(aoVal * 255), 0, 255);
      orm[o + 1] = clamp(Math.round(px.rgh * 255), 25, 252);
      orm[o + 2] = clamp(Math.round((px.metal ?? metalness) * 255), 0, 255);
      orm[o + 3] = 255;
    }
  }

  const nrm = new Uint8ClampedArray(w * h * 4);
  const at = (x, y) => {
    const xx = wrapU && pad === 0 ? ((x % w) + w) % w : clamp(x, 0, w - 1);
    const yy = clamp(y, 0, h - 1);
    return height[yy * w + xx];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l  = at(x - 1, y),                        r  = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dX * normalStrength;
      let ny = dY * normalStrength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const o = (y * w + x) * 4;
      nrm[o]     = Math.round((nx * 0.5 + 0.5) * 255);
      nrm[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nrm[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nrm[o + 3] = 255;
    }
  }

  return { rgba, nrm, orm, w, h };
}


// =========================================================================
// SHARED MOTTLED CORPSE SKIN BASE (locks face, scalp, neck back, torso & limbs!)
// =========================================================================
function evalBaseCorpseSkin(u, v, fine, mottle) {
  const s = sstep(-0.38, 0.38, mottle);
  let r = lerp(212, 240, s);
  let g = lerp(206, 234, s);
  let b = lerp(192, 218, s);

  // Subtle organic corpse red/purple mottling & tiny pore speckles (no flat clay!)
  const blotchRed = sstep(0.14, 0.56, cylFbm(u * 1.9, v * 1.9, 3.4, 7.2, 41, 3));
  const blotchPlum = sstep(0.22, 0.62, cylFbm(u * 1.5, v * 1.5, 2.7, 5.4, 59, 3));
  const poreSpeck = sstep(0.28, 0.64, cylFbm(u * 7.5, v * 7.5, 8.2, 16.0, 97, 2));
  r = lerp(r, 178, blotchRed * 0.28);
  g = lerp(g, 134, blotchRed * 0.34);
  b = lerp(b, 130, blotchRed * 0.32);

  r = lerp(r, 152, blotchPlum * 0.22);
  g = lerp(g, 138, blotchPlum * 0.24);
  b = lerp(b, 148, blotchPlum * 0.20);

  r = lerp(r, 156, poreSpeck * 0.20);
  g = lerp(g, 130, poreSpeck * 0.22);
  b = lerp(b, 122, poreSpeck * 0.20);

  return {
    r,
    g,
    b,
    pMicro: 1 + fine * 0.042 - poreSpeck * 0.025
  };
}

// =========================================================================
// 1. NECK TENDON & EXPOSED MUSCLE + MOTTLED BACK NECK / TRAPEZIUS TEXEL SHADER
// =========================================================================
function evalNeckTexel(u, v) {
  const ang = u * Math.PI * 2;
  const frontCos = Math.cos(ang);
  const du = wrapDU(u, 0);
  const absDu = Math.abs(du);

  const mottle = cylFbm(u, v, 2.2, 5.5, 51, 4);
  const fine = cylFbm(u * 4, v * 4, 3.0, 9.0, 67, 3);
  const ragged = cylFbm(u, v, 3.2, 4.5, 79, 3) * 0.14;

  // Anterior V-shaped SCM tendon cords & lateral fibrous striations
  const scmU = lerp(0.036, 0.165, clamp((v - 0.20) / 0.62, 0, 1));
  const dSCM = Math.abs(absDu - scmU);
  const scmCord = gauss(dSCM, 0.024) * sstep(0.18, 0.38, v) * (1 - sstep(0.68, 0.84, v));
  const throatGroove = gauss(Math.abs(absDu - scmU * 0.55), 0.020) * sstep(0.24, 0.42, v) * (1 - sstep(0.66, 0.80, v));

  const fiberWave = 0.5 + 0.5 * Math.sin(du * 185 + v * 18 + mottle * 3.5);
  const platysmaWave = 0.5 + 0.5 * Math.sin((absDu - v * 0.18) * 155 + fine * 2.5);

  const collarBotFade = sstep(0.22, 0.46, v + scmCord * 0.10 + ragged * 0.25);
  const collarTopFade = 1 - sstep(0.60, 0.80, v - ragged * 0.20);
  const vertWindow = collarBotFade * collarTopFade;
  const frontOpen = sstep(0.02, 0.48, frontCos + ragged);

  // Raw red tissue concentrates INSIDE the sculpted throat hollows & fibrous muscle grooves,
  // while tendon cord crests stay paler sinew-pink/flesh!
  const rawMask = clamp(frontOpen * vertWindow * (0.48 + 0.48 * throatGroove + 0.24 * scmCord + 0.18 * mottle), 0, 1);
  const rawEdge = sstep(0.26, 0.68, rawMask);

  const base = evalBaseCorpseSkin(u, v, fine, mottle);
  let r = base.r, g = base.g, b = base.b;

  // Back of neck: sculpted normal-map posterior nuchal cords, spine furrow & trapezius fibers + mottled skin!
  const backMask = 1 - frontOpen;
  const backMottle = sstep(0.05, 0.58, cylFbm(u * 2.4, v * 2.6, 3.2, 6.2, 91, 4));
  const backBlotch = sstep(0.16, 0.62, cylFbm(u * 1.8, v * 2.0, 2.8, 5.2, 99, 3));
  const napeFade = sstep(0.12, 0.34, v) * (1 - sstep(0.68, 0.86, v));
  r = lerp(r, 174, backBlotch * backMask * napeFade * 0.30);
  g = lerp(g, 132, backBlotch * backMask * napeFade * 0.34);
  b = lerp(b, 128, backBlotch * backMask * napeFade * 0.30);
  r = lerp(r, r * 0.90, backMottle * backMask * napeFade * 0.22);
  g = lerp(g, g * 0.88, backMottle * backMask * napeFade * 0.22);
  b = lerp(b, b * 0.86, backMottle * backMask * napeFade * 0.22);

  // Posterior nuchal cords & spine furrow in heightfield (du around ±0.42 = back cords, ±0.50 = spine!)
  const distFromBackCenter = Math.abs(Math.abs(du) - 0.5);
  const postCord = gauss(distFromBackCenter - 0.080, 0.026) * backMask * sstep(0.16, 0.38, v) * (1 - sstep(0.72, 0.90, v));
  const spineFurrow = -gauss(distFromBackCenter, 0.022) * backMask * sstep(0.10, 0.30, v) * (1 - sstep(0.74, 0.92, v));
  const trapFibers = (0.5 + 0.5 * Math.sin((distFromBackCenter * 42 + v * 12) * Math.PI)) * sstep(0.32, 0.14, v) * backMask * 0.026;

  // Warm ash-plum bruise halo around exposed front throat tissue
  const bruiseRim = clamp(sstep(0.06, 0.38, rawMask) * (1 - rawEdge * 0.85) * vertWindow, 0, 1);
  r = lerp(r, 176, bruiseRim * 0.38);
  g = lerp(g, 138, bruiseRim * 0.42);
  b = lerp(b, 134, bruiseRim * 0.38);

  // Tendon cords paler sinew-pink, recessed grooves deep raw crimson!
  const grooveDark = clamp(throatGroove * 0.72 + (1 - fiberWave) * 0.32, 0, 1);
  const tendonLight = clamp(scmCord * 0.78 + platysmaWave * 0.28, 0, 1);
  const musR = lerp(196, 114, grooveDark * 0.72 - tendonLight * 0.35);
  const musG = lerp(136, 54,  grooveDark * 0.78 - tendonLight * 0.35);
  const musB = lerp(128, 52,  grooveDark * 0.78 - tendonLight * 0.35);
  r = lerp(r, musR, rawEdge * 0.84);
  g = lerp(g, musG, rawEdge * 0.84);
  b = lerp(b, musB, rawEdge * 0.84);

  const hSkin = 0.50 + fine * 0.042 + Math.sin(v * Math.PI * 18 + mottle * 1.6) * 0.015 + postCord * 0.14 + spineFurrow * 0.10 + trapFibers;
  const hMuscle = 0.40 + scmCord * 0.28 - throatGroove * 0.14 + platysmaWave * 0.12 + fiberWave * 0.08;
  return {
    r: clamp(Math.round(r * base.pMicro), 0, 255),
    g: clamp(Math.round(g * base.pMicro), 0, 255),
    b: clamp(Math.round(b * base.pMicro), 0, 255),
    a: 255,
    h: lerp(hSkin, hMuscle, rawEdge) + bruiseRim * 0.025,
    rgh: lerp(lerp(0.82 + fine * 0.05, 0.36 + (1 - tendonLight) * 0.14, rawEdge), 0.78, backMask * 0.8),
    metal: 0.02
  };
}


// =========================================================================
// 2. SKULL / FACE / JAW TEXEL SHADER + FLUSH PATCHY SCABBY HAIR (V-NAPE TAPER)
// =========================================================================
function evalHeadTexel(u, v) {
  const du = wrapDU(u, 0);
  const absDu = Math.abs(du);

  const mottle = cylFbm(u, v, 2.5, 5.5, 111, 4);
  const fine = cylFbm(u * 5, v * 5, 3.6, 10.0, 127, 3);
  const spatter = cylFbm(u * 2, v * 2, 3.2, 7.0, 139, 3);

  const base = evalBaseCorpseSkin(u, v, fine, mottle);
  let r = base.r, g = base.g, b = base.b;

  // Subtle depth shading inside sockets/piriform nose (keep geometry doing the heavy work, NO dark AO blotches!)
  const orbitGrime = gauss(absDu - 0.088, 0.032) * gauss(v - 0.45, 0.065);
  const noseGrime = gauss(absDu, 0.022) * gauss(v - 0.24, 0.055);
  const faceMask = sstep(0.22, 0.08, absDu) * (1 - sstep(0.66, 0.82, v));
  const grime = clamp((orbitGrime * 0.42 + noseGrime * 0.36 + Math.max(0, mottle) * 0.08) * faceMask, 0, 1);
  r = lerp(r, 128, grime * 0.30);
  g = lerp(g, 122, grime * 0.30);
  b = lerp(b, 114, grime * 0.30);

  // Torn/rotted left cheek wound (+X = du > 0) + dried mouth-corner blood
  const leftCheekWound = gauss(wrapDU(u, 0.115), 0.042) * gauss(v - 0.22, 0.085) * sstep(-0.08, 0.42, spatter + 0.10);
  const mouthBlood = sstep(0.08, 0.48, spatter + 0.06) * gauss(absDu - 0.060, 0.042) * sstep(0.14, 0.01, v);
  const blood = clamp(mouthBlood * 0.46 + leftCheekWound * 0.82, 0, 1);
  r = lerp(r, 122, blood * 0.64);
  g = lerp(g, 48,  blood * 0.72);
  b = lerp(b, 46,  blood * 0.72);

  // FLUSH, THIN, PATCHY, SCABBY DARK HAIR covering crown/back with organic pale bald islands & V-nape taper!
  const backProgress = sstep(0.14, 0.42, absDu);
  const sideDip = -0.08 * gauss(absDu - 0.34, 0.070);
  const centerNapePoint = -0.14 * gauss(absDu - 0.50, 0.065);
  const hairlineV = lerp(0.85, 0.30, Math.pow(backProgress, 0.88)) + sideDip + centerNapePoint;

  // Keep u unscaled (scale radiusU instead) so cylFbm wraps continuously across both u = 0/1 and u = 0.5!
  const macroPatch = cylFbm(u, v * 2.8, 6.8, 5.5, 149, 4);
  const scabClump = cylFbm(u, v * 4.0, 14.0, 10.5, 163, 3);
  const fineBreakup = cylFbm(u, v * 6.5, 22.0, 14.0, 173, 3);
  const follicleStipple = sstep(-0.06, 0.46, cylFbm(u, v * 10.0, 34.0, 22.0, 223, 2));

  const hairlineJitter = macroPatch * 0.11 + scabClump * 0.06 + fineBreakup * 0.04;
  const inScalpZone = sstep(hairlineV - 0.07 + hairlineJitter, hairlineV + 0.06 + hairlineJitter, v);
  const napeFeather = sstep(0.08, 0.22 + Math.max(0, macroPatch) * 0.07, v + centerNapePoint * 0.22);

  // Asymmetric organic moth-eaten zombie scalp islands using wrapDU() so ZERO vertical split exists at u = 0.5!
  const patchCrown = gauss(wrapDU(u, 0.05), 0.130) * gauss(v - 0.86, 0.105);
  const patchTempR = gauss(wrapDU(u, -0.24), 0.090) * gauss(v - 0.72, 0.100);
  const patchTempL = gauss(wrapDU(u, +0.26), 0.085) * gauss(v - 0.68, 0.095);
  const patchOccipR = gauss(wrapDU(u, -0.37), 0.090) * gauss(v - 0.52, 0.120);
  const patchOccipL = gauss(wrapDU(u, +0.36), 0.095) * gauss(v - 0.50, 0.125);
  const patchBackMid = gauss(wrapDU(u, +0.47), 0.070) * gauss(v - 0.64, 0.100);
  const patchNapeR = gauss(wrapDU(u, -0.43), 0.085) * gauss(v - 0.34, 0.105);
  const patchNapeL = gauss(wrapDU(u, +0.41), 0.080) * gauss(v - 0.36, 0.100);
  const nBaldNoise = cylFbm(u, v * 2.9, 6.4, 4.8, 211, 4);
  const baldField = clamp(
    patchCrown * 0.82 + patchTempR * 0.78 + patchTempL * 0.74 +
    patchOccipR * 0.78 + patchOccipL * 0.78 + patchBackMid * 0.74 +
    patchNapeR * 0.72 + patchNapeL * 0.70 + Math.max(0, nBaldNoise) * 0.76,
    0,
    1
  );
  const clumpKeep = sstep(-0.06, 0.44, scabClump + macroPatch * 0.42);
  const baldCut = 1 - sstep(0.24, 0.64, baldField) * (0.90 - 0.42 * clumpKeep * follicleStipple);

  const hairDensity = clamp(inScalpZone * napeFeather * baldCut * (0.56 + clumpKeep * 0.36 + follicleStipple * 0.22), 0, 1);
  const hairMask = sstep(0.28, 0.72, hairDensity);

  // Dark scabby charcoal-black hair clumps (reads unmistakably as thin dark patchy hair on pale corpse scalp!)
  const hairTone = clamp(0.42 + 0.40 * scabClump + 0.20 * fineBreakup, 0, 1);
  const hR = lerp(34, 72, hairTone);
  const hG = lerp(30, 64, hairTone);
  const hB = lerp(28, 56, hairTone);

  const stubbleHalo = clamp(inScalpZone * napeFeather * (1 - hairMask) * follicleStipple * 0.62, 0, 1);
  r = lerp(r, 138, stubbleHalo * 0.50);
  g = lerp(g, 130, stubbleHalo * 0.50);
  b = lerp(b, 122, stubbleHalo * 0.50);
  r = lerp(r, hR, hairMask * 0.92);
  g = lerp(g, hG, hairMask * 0.92);
  b = lerp(b, hB, hairMask * 0.92);

  // SCULPTED NORMAL-MAP FACE RELIEF: forehead wrinkles, glabella frown lines, crow's feet,
  // stretched diagonal cheek skin cords & ragged torn cheek pocket!
  const browCrease = Math.sin(v * Math.PI * 34 + mottle * 2.2) * gauss(v - 0.64, 0.085) * sstep(0.16, 0.03, absDu) * (1 - hairMask);
  const glabellaFrown = Math.sin(absDu * 130) * gauss(absDu, 0.045) * gauss(v - 0.54, 0.06) * (1 - hairMask);
  const crowsFeet = Math.sin((v - 0.44) * 165 - absDu * 90) * gauss(absDu - 0.145, 0.035) * gauss(v - 0.46, 0.06) * (1 - hairMask);
  const cheekStretch = Math.sin(v * Math.PI * 38 - absDu * 28 + mottle * 1.4) * gauss(absDu - 0.095, 0.055) * gauss(v - 0.22, 0.12) * (1 - hairMask);
  const hairRelief = hairMask * (0.025 + scabClump * 0.045);

  return {
    r: clamp(Math.round(r * base.pMicro), 0, 255),
    g: clamp(Math.round(g * base.pMicro), 0, 255),
    b: clamp(Math.round(b * base.pMicro), 0, 255),
    a: 255,
    h: 0.5 + fine * 0.036 + browCrease * 0.028 + glabellaFrown * 0.024 + crowsFeet * 0.022 + cheekStretch * 0.026 + hairRelief - blood * 0.030,
    rgh: lerp(lerp(0.82 + fine * 0.04, 0.36, blood * 0.78), 0.78 - hairTone * 0.10, hairMask),
    metal: 0.02
  };
}


// =========================================================================
// 3. CORPSE LIMB, CHEEK, JAW & TORSO SKIN TEXEL SHADER (locked to neck & head!)
// =========================================================================
function evalSkinTexel(u, v) {
  const blotch = cylFbm(u, v, 2.2, 5.5, 13, 4);
  const finePore = cylFbm(u * 4, v * 4, 3.2, 8.0, 29, 3);
  const wrinkle = cylFbm(u * 1.5, v * 5.0, 4.0, 12.0, 41, 3);

  const vRaw = Math.abs(cylFbm(u + 0.17 * wrinkle, v, 3.6, 9.0, 71, 3));
  const vein = Math.pow(clamp(1 - vRaw * 4.8, 0, 1), 3.4);

  const bruisePatch = sstep(0.20, 0.62, cylFbm(u, v, 1.8, 4.2, 83, 3));
  const scrapeNoise = sstep(0.32, 0.68, cylFbm(u, v, 2.8, 6.5, 97, 3));
  const bloodPatch = clamp(scrapeNoise * 0.16, 0, 1);

  const base = evalBaseCorpseSkin(u, v, finePore, blotch);
  let r = base.r, g = base.g, b = base.b;

  r = lerp(r, r * 0.90, bruisePatch * 0.24);
  g = lerp(g, g * 0.86, bruisePatch * 0.26);
  b = lerp(b, b * 0.94, bruisePatch * 0.16);

  r = lerp(r, 132, vein * 0.22);
  g = lerp(g, 136, vein * 0.20);
  b = lerp(b, 144, vein * 0.18);

  r = lerp(r, 128, bloodPatch * 0.56);
  g = lerp(g, 52,  bloodPatch * 0.66);
  b = lerp(b, 48,  bloodPatch * 0.66);

  return {
    r: clamp(Math.round(r * base.pMicro), 0, 255),
    g: clamp(Math.round(g * base.pMicro), 0, 255),
    b: clamp(Math.round(b * base.pMicro), 0, 255),
    a: 255,
    h: 0.5 + finePore * 0.036 + wrinkle * 0.034 + Math.sin(v * Math.PI * 28 + blotch * 2) * 0.014 + vein * 0.045,
    rgh: lerp(0.82 + finePore * 0.04, 0.40, clamp(bloodPatch * 0.75 + vein * 0.10, 0, 1)),
    metal: 0.02
  };
}


// =========================================================================
// 3B. ALPHA-CUTOUT HAIR CARD TEXEL SHADER (kept for module compatibility)
// =========================================================================
function evalHairCardTexel(u, v) {
  const clumpWave = Math.sin(u * Math.PI * 5 + 0.4) * 0.45 +
                    Math.sin(u * Math.PI * 9 - 0.8) * 0.30 +
                    cylFbm(u * 2.5, v * 1.2, 4.0, 2.0, 307, 3) * 0.55;
  const edgeTaper = 1 - Math.pow(Math.abs(u * 2 - 1), 1.8);
  const tipReach = clamp(0.36 + 0.62 * edgeTaper + clumpWave * 0.24, 0.14, 1.0);
  const rootSolid = (1 - sstep(0.06, 0.26, v)) * edgeTaper * 1.4;
  const lockCore = sstep(-0.24, 0.32, clumpWave) * edgeTaper;
  const alphaVal = clamp(Math.max(rootSolid, lockCore * (1 - sstep(tipReach - 0.18, tipReach, v))), 0, 1);
  const a = alphaVal >= 0.46 ? 255 : 0;

  const tone = clamp(0.46 + 0.32 * clumpWave + v * 0.18, 0, 1);
  return {
    r: clamp(Math.round(lerp(42, 76, tone)), 0, 255),
    g: clamp(Math.round(lerp(38, 68, tone)), 0, 255),
    b: clamp(Math.round(lerp(34, 60, tone)), 0, 255),
    a,
    h: 0.48 + tone * 0.22,
    rgh: lerp(0.76, 0.64, tone),
    metal: 0.01
  };
}


// =========================================================================
// 4. CLOTH TEXEL SHADER (weave, folds, seams, grime, tank alphaTest cutouts)
// =========================================================================
function makeClothTexelEval({ weaveFreq = 96, seed = 211, withHoles = false, stitchSeams = true, trouserGrime = false } = {}) {
  return (u, v) => {
    const warp = Math.sin(u * Math.PI * 2 * weaveFreq);
    const weft = Math.sin(v * Math.PI * 2 * weaveFreq * 1.15);
    const weave = warp * weft * 0.5 + 0.5;

    const fold = cylFbm(u, v * 0.45, 2.8, 3.2, seed, 3);
    const grime = sstep(-0.1, 0.48, cylFbm(u, v, 2.0, 4.5, seed + 17, 4));
    const blood = sstep(0.28, 0.62, cylFbm(u, v, 3.0, 6.0, seed + 33, 3));

    let r = lerp(226, 254, weave * 0.40 + 0.60 * (1 - grime));
    let g = lerp(222, 250, weave * 0.40 + 0.60 * (1 - grime));
    let b = lerp(208, 238, weave * 0.40 + 0.60 * (1 - grime));

    const mudBias = trouserGrime ? sstep(0.42, 0.0, v) * 0.32 : 0;
    const totalGrime = clamp(grime * (withHoles ? 0.30 : 0.48) + mudBias, 0, 1);
    r = lerp(r, r * 0.82, totalGrime);
    g = lerp(g, g * 0.80, totalGrime);
    b = lerp(b, b * 0.74, totalGrime);

    const bScale = withHoles ? 0.24 : 0.48;
    r = lerp(r, 148, blood * bScale);
    g = lerp(g, 74, blood * (withHoles ? 0.30 : 0.58));
    b = lerp(b, 64, blood * (withHoles ? 0.30 : 0.58));

    let seamBump = 0;
    if (stitchSeams) {
      const nearSide = Math.min(Math.abs(u - 0.25), Math.abs(u - 0.75));
      if (nearSide < 0.014) {
        seamBump = gauss(nearSide, 0.005) * 0.30 * (0.5 + 0.5 * Math.sin(v * 240));
        r *= 0.86; g *= 0.86; b *= 0.86;
      }
    }

    let alpha = 255;
    if (withHoles) {
      const rag = cylFbm(u * 2.1, v * 2.1, 3.2, 5.8, seed + 91, 4) * 0.36;
      const hole1 = Math.hypot(wrapDU(u, 0.120) / 0.072, (v - 0.43) / 0.096) + rag;
      const hole3 = Math.hypot(wrapDU(u, 0.87) / 0.046, (v - 0.28) / 0.060) + rag;
      const dHole = Math.min(hole1, hole3);
      const holeWindow = sstep(0.14, 0.20, v) * (1 - sstep(0.56, 0.62, v));
      if (holeWindow > 0.5 && dHole < 0.88) {
        alpha = 0;
        // Darken transparent texels too so bilinear mip filtering creates a dark frayed edge (never light grey!)
        r *= 0.26;
        g *= 0.26;
        b *= 0.22;
      } else if (holeWindow > 0.2 && dHole < 1.12) {
        const rim = sstep(1.12, 0.88, dHole);
        r *= lerp(1, 0.34, rim);
        g *= lerp(1, 0.34, rim);
        b *= lerp(1, 0.30, rim);
        seamBump += rim * 0.32;
      }
    }

    return {
      r: clamp(Math.round(r), 0, 255),
      g: clamp(Math.round(g), 0, 255),
      b: clamp(Math.round(b), 0, 255),
      a: alpha,
      h: 0.5 + weave * 0.14 + fold * 0.30 + seamBump,
      rgh: lerp(0.92, 0.52, blood * 0.75),
      metal: 0.0
    };
  };
}


// =========================================================================
// 5. LEATHER & BOOT TEXEL SHADER
// =========================================================================
function evalBootTexel(u, v) {
  const grain = cylFbm(u * 3, v * 3, 4.5, 10.0, 307, 3);
  const scuff = sstep(0.15, 0.45, cylFbm(u, v, 2.2, 5.0, 319, 3));
  const seam = gauss((v * 5) % 1 - 0.5, 0.04) * 0.25;

  let r = lerp(218, 248, 0.5 + grain * 0.35 + scuff * 0.25);
  let g = lerp(210, 238, 0.5 + grain * 0.35 + scuff * 0.20);
  let b = lerp(196, 222, 0.5 + grain * 0.35 + scuff * 0.14);
  r = lerp(r, 175, scuff * 0.35);
  g = lerp(g, 162, scuff * 0.38);
  b = lerp(b, 142, scuff * 0.42);

  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
    a: 255,
    h: 0.5 + grain * 0.22 + seam - scuff * 0.12,
    rgh: lerp(0.50 + grain * 0.10, 0.86, scuff * 0.75),
    metal: 0.04
  };
}


// ======== CC-359: AG's atlas layout (atlas-step3.mjs createShamblerAtlasMaterial), without canvas ========
function blitTile(dst, S, rgba, w, h, px, py) {
  for (let y = 0; y < h; y++) { const dy = py + y; if (dy < 0 || dy >= S) continue;
    for (let x = 0; x < w; x++) { const dx = px + x; if (dx < 0 || dx >= S) continue; const si = (y * w + x) * 4, di = (dy * S + dx) * 4;
      dst[di] = rgba[si]; dst[di + 1] = rgba[si + 1]; dst[di + 2] = rgba[si + 2]; dst[di + 3] = rgba[si + 3]; } }
}
function fillSolidTile(col, nrm, orm, S, px, py, w, h, { r = 255, g = 255, b = 255, a = 255, ao = 1.0, rgh = 0.5, metal = 0.0 }) {
  const rghB = clamp(Math.round(rgh * 255), 0, 255), metB = clamp(Math.round(metal * 255), 0, 255), aoB = clamp(Math.round(ao * 255), 0, 255);
  for (let y = py; y < py + h; y++) for (let x = px; x < px + w; x++) { const di = (y * S + x) * 4;
    col[di] = r; col[di + 1] = g; col[di + 2] = b; col[di + 3] = a; nrm[di] = 128; nrm[di + 1] = 128; nrm[di + 2] = 255; nrm[di + 3] = 255;
    orm[di] = aoB; orm[di + 1] = rghB; orm[di + 2] = metB; orm[di + 3] = 255; }
}
// canvas box -> three's UV rect (as AG's: flipY=true; our rows are stored bottom-up to match)
function innerUvRect(S, px, py, w, h, pad) { return { u0: (px + pad) / S, u1: (px + w - pad) / S, v0: 1 - (py + h - pad) / S, v1: 1 - (py + pad) / S }; }

/** The atlas pixels (canvas order, row 0 = top) and the zones' UV rects. Pure: no three, no DOM (tests can call it). */
export function buildShamblerAtlasPixels(atlasSize = 512) {
  const S = atlasSize, half = S >> 1, qtr = S >> 2;
  const padBig = Math.max(4, Math.round(half * 0.015625)), padSm = Math.max(2, Math.round(qtr * 0.015625));
  const col = new Uint8Array(S * S * 4), nrm = new Uint8Array(S * S * 4), orm = new Uint8Array(S * S * 4);
  const bake = (evalFn, px, py, w, h, pad, { normalStrength512, normalScale, metalness, wrapU = true }) => {
    const slopeScale = clamp(Math.sqrt(w / 512), 0.55, 1.25);
    const tile = buildHeightNormalTile(w, h, evalFn, { normalStrength: normalStrength512 * normalScale * slopeScale, wrapU, pad, metalness });
    blitTile(col, S, tile.rgba, w, h, px, py); blitTile(nrm, S, tile.nrm, w, h, px, py); blitTile(orm, S, tile.orm, w, h, px, py);
    return innerUvRect(S, px, py, w, h, pad);
  };
  const tankEval = makeClothTexelEval({ weaveFreq: 96, seed: 211, withHoles: true, stitchSeams: true });
  const pantsEval = makeClothTexelEval({ weaveFreq: 112, seed: 251, withHoles: false, stitchSeams: true, trouserGrime: true });
  const rects = {
    head: bake(evalHeadTexel, 0, 0, half, half, padBig, { normalStrength512: 2.5, normalScale: 0.68, metalness: 0.02 }),
    tank: bake(tankEval, half, 0, half, half, padBig, { normalStrength512: 4.0, normalScale: 0.75, metalness: 0.00 }),
    neck: bake(evalNeckTexel, 0, half, qtr, qtr, padSm, { normalStrength512: 3.4, normalScale: 0.95, metalness: 0.02 }),
    skin: bake(evalSkinTexel, qtr, half, qtr, qtr, padSm, { normalStrength512: 1.8, normalScale: 0.55, metalness: 0.02 }),
    boot: bake(evalBootTexel, 0, half + qtr, qtr, qtr, padSm, { normalStrength512: 3.8, normalScale: 0.65, metalness: 0.04 }),
    pants: bake(pantsEval, half, half, half, half, padBig, { normalStrength512: 4.0, normalScale: 0.75, metalness: 0.00 })
  };
  const sx = qtr, sy = half + qtr, wSolid = qtr >> 1, wHair = qtr - wSolid, h1 = Math.floor(qtr / 3), h2 = Math.floor(qtr / 3), h3 = qtr - h1 - h2, padFlat = Math.max(2, padSm);
  fillSolidTile(col, nrm, orm, S, sx, sy, wSolid, h1, { rgh: 0.55, metal: 0.00, ao: 1.0 });
  fillSolidTile(col, nrm, orm, S, sx, sy + h1, wSolid, h2, { rgh: 0.34, metal: 0.04, ao: 1.0 });
  fillSolidTile(col, nrm, orm, S, sx, sy + h1 + h2, wSolid, h3, { rgh: 0.44, metal: 0.48, ao: 1.0 });
  rects.cavity = innerUvRect(S, sx, sy, wSolid, h1, padFlat);
  rects.teeth = innerUvRect(S, sx, sy + h1, wSolid, h2, padFlat);
  rects.metal = innerUvRect(S, sx, sy + h1 + h2, wSolid, h3, padFlat);
  rects.hair = bake(evalHairCardTexel, sx + wSolid, sy, wHair, qtr, padFlat, { normalStrength512: 2.2, normalScale: 0.55, metalness: 0.01, wrapU: false });
  for (let i = 3; i < col.length; i += 4) col[i] = 255;   // change 2: opaque (the holes are geometry)
  return { size: S, col, nrm, orm, rects };
}

// AG's zone for each piece (shambler-step3.mjs atlasZoneForMesh), by the piece's name
export function cc359AtlasZone(name = '') {
  if (name.includes('eye')) return 'eye';
  if (name.includes('hair-card')) return 'hair';
  if (name.includes('neck-skin')) return 'neck';
  if (name.includes('skull-cranium') || name.includes('nasal-septum')) return 'head';
  if (name.includes('skull-cavities') || name.includes('jaw-interior')) return 'cavity';
  if (name.includes('teeth')) return 'teeth';
  if (name.includes('belt-buckle')) return 'metal';
  if (name.includes('tank-top')) return 'tank';
  if (name.includes('trouser')) return 'pants';
  if (name.includes('boot') || name.includes('belt')) return 'boot';
  return 'skin';
}
/** The piece's own 0..1 UVs into its zone's rect (as AG's buildShamblerStep3). Returns a new Float32Array. */
export function cc359AtlasUV(uvAttr, count, rect) {
  const out = new Float32Array(count * 2), du = rect.u1 - rect.u0, dv = rect.v1 - rect.v0;
  for (let i = 0; i < count; i++) { const u = uvAttr ? clamp(uvAttr.getX(i), 0, 1) : 0.5, v = uvAttr ? clamp(uvAttr.getY(i), 0, 1) : 0.5; out[i * 2] = rect.u0 + u * du; out[i * 2 + 1] = rect.v0 + v * dv; }
  return out;
}

const atlasCache = new Map();
/** The shared atlas: { rects, options (material settings: map, normalMap, normalScale, roughness/metalness/ao maps), ms, bytes }.
 *  One per three build and size; built on first use. */
export function shamblerAtlas(T, { size = 512 } = {}) {
  const key = size; const hit = atlasCache.get(T); if (hit && hit.has(key)) return hit.get(key);
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const px = buildShamblerAtlasPixels(size), S = px.size;
  const flip = (src) => { const out = new Uint8Array(src.length), row = S * 4; for (let y = 0; y < S; y++) out.set(src.subarray(y * row, (y + 1) * row), (S - 1 - y) * row); return out; };
  let options = {};
  if (typeof T.DataTexture === 'function') {
    const tex = (data, name, srgb) => { const t = new T.DataTexture(flip(data), S, S, T.RGBAFormat, T.UnsignedByteType); t.name = 'cc359-shambler-' + name;
      if (srgb && T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter;
      t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; return t; };
    const orm = tex(px.orm, 'orm', false);
    options = { map: tex(px.col, 'color', true), normalMap: tex(px.nrm, 'normal', false), normalScale: T.Vector2 ? new T.Vector2(1, 1) : undefined,
      roughnessMap: orm, metalnessMap: orm, aoMap: orm, aoMapIntensity: 0.85, roughness: 1, metalness: 1 };
  }
  const out = { size: S, rects: px.rects, options, bytes: S * S * 4 * 3, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0) };
  if (!atlasCache.has(T)) atlasCache.set(T, new Map()); atlasCache.get(T).set(key, out);
  return out;
}

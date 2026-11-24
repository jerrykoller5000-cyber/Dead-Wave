// world/env-effects.js — AG-409: Physically & visually coherent environmental effects library.
// Centralises atmospheric coherence math (rain tilt/drift/tint, time-of-day storm fog clamping,
// cloud lighting across day/dusk/night/blood-moon/storm/lightning, dynamic lake & river reflection/chop,
// shelter & underground weather suppression, water-floating leaf floors, high-detail lightning paths)
// and lightweight cached procedural alpha textures (leaf silhouette, feathered scorch mark, soft
// concentric water ripple, natural wet-rimmed puddle).
//
// Performance & WebGPU notes:
// - All per-frame helpers write into optional pre-allocated `out` objects (zero GC churn per frame).
// - All 4 procedural effect textures are 128x128 (<0.35 MB total VRAM), built lazily once per THREE instance.
// - Node / fakethree safe: texture builders return null cleanly when DOM Canvas is unavailable.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2i(ix, iy, seed) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valNoise2(x, y, period, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const ix0 = ((x0 % period) + period) % period, ix1 = (ix0 + 1) % period;
  const iy0 = ((y0 % period) + period) % period, iy1 = (iy0 + 1) % period;
  return lerp(
    lerp(hash2i(ix0, iy0, seed), hash2i(ix1, iy0, seed), ux),
    lerp(hash2i(ix0, iy1, seed), hash2i(ix1, iy1, seed), ux),
    uy,
  );
}

// =========================================================================
// 1. WEATHER LOCATION & SHELTER COHERENCE
// =========================================================================

// True only when topside outdoors: never rain, blow autumn gale leaves, or strike lightning
// inside the indoor Training Ground or 400 m underground inside a Hollow/Warren.
export function isOutdoorsForWeather({ trainingActive = false, hollowFloor = null } = {}) {
  return !trainingActive && !hollowFloor;
}

// Check if (x, z) is covered overhead by the HQ cabin or a player-built roof / elevated platform.
// Keeps rain streaks from falling indoors and keeps puddles from forming on cabin/building floors.
export function getShelterCeilingY(x, z, { house = null, builds = null } = {}) {
  let best = null;
  if (house && house.active && house.group) {
    const hx = house.group.position.x, hz = house.group.position.z;
    const dx = x - hx, dz = z - hz;
    // HQ cabin footprint (~4.8 x 4.2 m including eaves, roof eaves around +3.4 m)
    if (Math.abs(dx) <= 3.1 && Math.abs(dz) <= 2.9) {
      best = (house.group.position.y || 0) + 3.4;
    }
  }
  if (builds && builds.length) {
    for (let i = 0; i < builds.length; i++) {
      const b = builds[i];
      if (!b || !b.alive) continue;
      const isRoof = (b.type === 'floor' && (b.level | 0) >= 1) || b.type === 'platform';
      if (!isRoof) continue;
      if (Math.abs(x - b.x) <= 1.05 && Math.abs(z - b.z) <= 1.05) {
        const topY = (b.deck && b.deck.deckY != null) ? b.deck.deckY : ((b.mesh && b.mesh.position.y || 0) + 0.25);
        if (best === null || topY > best) best = topY;
      }
    }
  }
  return best;
}

export function isUnderShelter(x, z, opts) {
  return getShelterCeilingY(x, z, opts) !== null;
}

// Leaves hitting water float/skim on the water surface instead of diving to the submerged lake bed.
export function leafFloorHeight(groundY, waterLevel) {
  if (waterLevel != null && Number.isFinite(waterLevel)) {
    return Math.max(groundY, waterLevel + 0.025);
  }
  return groundY;
}

// =========================================================================
// 2. RAIN & WIND PHYSICS (SUSTAINED GALE FLOOR, DOWNWIND TILT & DRIFT)
// =========================================================================

// Sustained wind strength during a windy spell or storm gale:
// At gale=0 returns the ambient base breeze unchanged; as gale rises to 1, lifts the floor
// so a full gale never collapses weaker than calm air during a slow ambient sine trough.
export function computeWindStrength(baseWind, gale, gust, boost = 0.6) {
  const g = clamp(Number.isFinite(gale) ? gale : 0, 0, 1);
  const gu = clamp(Number.isFinite(gust) ? gust : 0.5, 0, 1);
  const sustained = baseWind * (1 - g * 0.55) + 0.78 * g;
  return sustained + g * boost * (0.55 + 0.45 * gu);
}

// Physically accurate rain streak lean & horizontal wind drift:
// A falling raindrop travels along (+windDirX * drift, -speed, +windDirZ * drift), so the TOP
// of the streak leans UPWIND (-windDir) and the BOTTOM trails DOWNWIND (+windDir).
// Under Three.js default Euler 'XYZ', rotating +Y by (tiltX, 0, tiltZ) moves +Y to:
//   x = -sin(tiltZ), z = +sin(tiltX)*cos(tiltZ)
// Therefore tiltX = -windDirZ * lean and tiltZ = +windDirX * lean leans +Y strictly upwind!
export function computeRainTilt(windDirX, windDirZ, windStrength, out = {}) {
  const len = Math.hypot(windDirX || 0, windDirZ || 0) || 1;
  const dx = (windDirX || 0) / len;
  const dz = (windDirZ || 0) / len;
  const ws = clamp(Number.isFinite(windStrength) ? windStrength : 0.5, 0, 2.5);
  const lean = clamp(0.07 + ws * 0.145, 0.05, 0.34);
  const driftSpeed = 2.0 + ws * 3.6;
  out.lean = lean;
  out.tiltX = -dz * lean;
  out.tiltZ = dx * lean;
  out.driftX = dx * driftSpeed;
  out.driftZ = dz * driftSpeed;
  return out;
}

// Rain streak colour & opacity adapted to Day / Dusk / Night / Blood Moon / NVG / Lightning flash.
// Prevents bright daytime neon-blue rain streaks from glowing over pitch-black night fog.
export function computeRainLook({
  nightMix = 0,
  dusk = 0,
  bloodMoon = false,
  nvgActive = false,
  flash = 0,
  intensity = 1,
} = {}, out = {}) {
  const n = clamp(nightMix, 0, 1);
  const d = clamp(dusk, 0, 1);
  const f = clamp(flash, 0, 1);
  const k = clamp(intensity, 0, 1);

  // Base day overcast silver-mist
  let r = 0.72, g = 0.80, b = 0.88;
  // Golden dusk warm slate-mist
  r = lerp(r, 0.74, d * 0.7);
  g = lerp(g, 0.65, d * 0.7);
  b = lerp(b, 0.60, d * 0.7);
  // Deep night dim cool silver-blue
  const nr = bloodMoon ? 0.44 : 0.27;
  const ng = bloodMoon ? 0.22 : 0.34;
  const nb = bloodMoon ? 0.24 : 0.46;
  r = lerp(r, nr, n);
  g = lerp(g, ng, n);
  b = lerp(b, nb, n);
  // NVG green phosphor tint
  if (nvgActive) {
    r = 0.28; g = 0.56; b = 0.36;
  }
  // Lightning flash catches rain sheets electric ice-white
  r = lerp(r, 0.94, f * 0.88);
  g = lerp(g, 0.97, f * 0.88);
  b = lerp(b, 1.00, f * 0.88);

  const baseOp = nvgActive ? 0.34 : lerp(0.38, 0.28, n);
  out.r = r;
  out.g = g;
  out.b = b;
  out.opacity = clamp((baseOp + f * 0.24) * k, 0, 0.65);
  return out;
}

// =========================================================================
// 3. STORM FOG COHERENCE (NEVER BRIGHTENS NIGHT OR WIDENS FOG NIGHT!)
// =========================================================================

export function computeStormFogTarget({
  isNight = false,
  nvgActive = false,
  bloodMoon = false,
  dusk = 0,
  baseFogNear = 190,
  baseFogFar = 640,
  fogNightK = 0,
  intensity = 0,
} = {}, out = {}) {
  const k = clamp(intensity, 0, 1);
  const fn = clamp(fogNightK, 0, 1);
  const d = clamp(dusk, 0, 1);

  // Target storm visibility never widens darker night fog (65 m) or Fog Night mist (32 m)!
  const stormCapFar = isNight && !nvgActive ? 52 : (nvgActive ? 105 : 88);
  const targetFar = Math.min(baseFogFar, stormCapFar);
  const targetNear = Math.min(baseFogNear, 9);

  // Smooth blend toward tightened distances
  out.near = baseFogNear + (targetNear - baseFogNear) * k;
  out.far = baseFogFar + (targetFar - baseFogFar) * k;

  // Time-of-day coherent storm mist colour (0..1 RGB)
  let r, g, b;
  if (nvgActive) {
    r = 0.086; g = 0.169; b = 0.133; // 0x162b22 NVG stormy mist
  } else if (isNight && bloodMoon) {
    r = 0.145; g = 0.043; b = 0.055; // 0x250b0e brooding blood-storm mist
  } else if (isNight) {
    r = 0.055; g = 0.086; b = 0.137; // 0x0e1623 dark stormy midnight blue
  } else {
    // Daytime overcast grey-slate blending smoothly through warm dusk slate
    r = lerp(0.490, 0.392, d);
    g = lerp(0.541, 0.345, d);
    b = lerp(0.596, 0.337, d);
  }
  out.r = r;
  out.g = g;
  out.b = b;
  // Let Fog Night keep dominance over colour when active
  out.colorBlend = k * 0.80 * (1 - fn * 0.72);
  return out;
}

// =========================================================================
// 4. CLOUD BANK COHERENCE (DAY / DUSK / NIGHT / BLOOD MOON / STORM / FLASH)
// =========================================================================

export function computeCloudLook({
  dusk = 0,
  nightMix = 0,
  bloodMoon = false,
  storm = 0,
  flash = 0,
} = {}, out = {}) {
  const d = clamp(dusk, 0, 1);
  const n = clamp(nightMix, 0, 1);
  const s = clamp(storm, 0, 1);
  const f = clamp(flash, 0, 1);

  // Diffuse tint: bright white by day -> warm coral at dusk -> dim slate-indigo at night -> crimson on blood moon
  let r = lerp(1.0, 1.0, d);
  let g = lerp(1.0, 0.68, d * 0.78);
  let b = lerp(1.0, 0.44, d * 0.78);
  // Storm overcast darkens cloud tops to cool brooding slate (day) or near-black indigo (night)
  const stormDayR = 0.46, stormDayG = 0.51, stormDayB = 0.56;
  const stormNightR = bloodMoon ? 0.17 : 0.07;
  const stormNightG = bloodMoon ? 0.05 : 0.10;
  const stormNightB = bloodMoon ? 0.06 : 0.16;
  const clearNightR = bloodMoon ? 0.38 : 0.18;
  const clearNightG = bloodMoon ? 0.10 : 0.23;
  const clearNightB = bloodMoon ? 0.11 : 0.33;

  r = lerp(r, clearNightR, n);
  g = lerp(g, clearNightG, n);
  b = lerp(b, clearNightB, n);

  const stR = lerp(stormDayR, stormNightR, n);
  const stG = lerp(stormDayG, stormNightG, n);
  const stB = lerp(stormDayB, stormNightB, n);
  r = lerp(r, stR, s * 0.82);
  g = lerp(g, stG, s * 0.82);
  b = lerp(b, stB, s * 0.82);

  // Sheet-lightning illuminates clouds from within
  r = lerp(r, 0.86, f * 0.85);
  g = lerp(g, 0.92, f * 0.85);
  b = lerp(b, 1.00, f * 0.85);

  const baseOp = 0.78 * (0.22 + 0.78 * (1 - n)) + (bloodMoon ? n * 0.24 : 0);
  const opacity = clamp(baseOp + s * 0.48, 0.14, 0.95);
  const baseEmissive = lerp(0.62, bloodMoon ? 0.28 : 0.15, n) * (1 - s * 0.58);
  const emissiveIntensity = clamp(baseEmissive + f * 0.95, 0.06, 1.35);

  out.r = r; out.g = g; out.b = b;
  out.opacity = opacity;
  out.emissiveIntensity = emissiveIntensity;
  return out;
}

// =========================================================================
// 5. WATER ENVIRONMENT COHERENCE (LIVE SKY REFLECTION, SUN/MOON PATH & CHOP)
// =========================================================================

export function computeWaterEnv({
  skyMid = { r: 0.53, g: 0.72, b: 1.0 },
  skyHorizon = { r: 0.85, g: 0.91, b: 1.0 },
  sunDir = { x: 0, y: 1, z: 0.3 },
  moonDir = { x: 0, y: 0.6, z: -0.3 },
  sunColor = { r: 1, g: 0.95, b: 0.85 },
  moonColor = { r: 0.55, g: 0.62, b: 0.82 },
  nightMix = 0,
  dusk = 0,
  storm = 0,
  bloodMoon = false,
  windStrength = 0.5,
  flash = 0,
} = {}, out = {}) {
  const n = clamp(nightMix, 0, 1);
  const d = clamp(dusk, 0, 1);
  const s = clamp(storm, 0, 1);
  const f = clamp(flash, 0, 1);
  const ws = clamp(windStrength, 0, 2.5);

  // Reflected sky colour tracks live sky dome (damped under storm overcast, flashed by lightning)
  let sr = lerp(skyMid.r, skyHorizon.r, 0.45);
  let sg = lerp(skyMid.g, skyHorizon.g, 0.45);
  let sb = lerp(skyMid.b, skyHorizon.b, 0.45);
  const ovR = lerp(0.36, bloodMoon ? 0.11 : 0.04, n);
  const ovG = lerp(0.41, bloodMoon ? 0.03 : 0.06, n);
  const ovB = lerp(0.46, bloodMoon ? 0.04 : 0.10, n);
  sr = lerp(sr, ovR, s * 0.72);
  sg = lerp(sg, ovG, s * 0.72);
  sb = lerp(sb, ovB, s * 0.72);
  sr = lerp(sr, 0.82, f * 0.75);
  sg = lerp(sg, 0.89, f * 0.75);
  sb = lerp(sb, 0.98, f * 0.75);

  // Active specular celestial light (sun by day/dusk, moon by night)
  const useMoon = n > 0.52;
  const ld = useMoon ? moonDir : sunDir;
  const lLen = Math.hypot(ld.x || 0, ld.y || 0, ld.z || 0) || 1;

  let lr = useMoon ? (bloodMoon ? 1.0 : moonColor.r) : sunColor.r;
  let lg = useMoon ? (bloodMoon ? 0.28 : moonColor.g) : sunColor.g;
  let lb = useMoon ? (bloodMoon ? 0.20 : moonColor.b) : sunColor.b;
  if (!useMoon && d > 0.05) {
    lr = lerp(lr, 1.0, d * 0.7);
    lg = lerp(lg, 0.64, d * 0.7);
    lb = lerp(lb, 0.34, d * 0.7);
  }
  lr = lerp(lr, 0.92, f * 0.8);
  lg = lerp(lg, 0.96, f * 0.8);
  lb = lerp(lb, 1.00, f * 0.8);

  const baseSpec = useMoon ? (bloodMoon ? 0.52 : 0.42) : lerp(0.55, 0.95, d);
  const spec = clamp(baseSpec * (1 - s * 0.76) + f * 0.55, 0.05, 1.15);

  // Deep-water absorption dims naturally at night so the lake isn't glowing daytime cyan at midnight
  const bodyLight = clamp(lerp(1.0, bloodMoon ? 0.36 : 0.28, n) * (1 - s * 0.22) + f * 0.25, 0.20, 1.15);
  const chop = clamp(0.75 + ws * 0.72 + s * 0.65, 0.65, 2.6);

  out.skyR = sr; out.skyG = sg; out.skyB = sb;
  out.lightX = (ld.x || 0) / lLen;
  out.lightY = Math.max(0.08, (ld.y || 0.2) / lLen);
  out.lightZ = (ld.z || 0) / lLen;
  out.lightR = lr; out.lightG = lg; out.lightB = lb;
  out.spec = spec;
  out.bodyLight = bodyLight;
  out.chop = chop;
  return out;
}

// =========================================================================
// 6. HIGH-DETAIL LIGHTNING BOLT PATH GENERATOR (FOR DUAL-LAYER CORE + HALO)
// =========================================================================

// Generates a 22-segment fractal jagged trunk + 2-3 organic jagged branching forks + secondary sub-twig.
export function computeLightningBoltPaths(from, to, rand = Math.random) {
  const main = [{ x: from.x, y: from.y, z: from.z }];
  const steps = 22;
  let ox = 0, oz = 0;
  for (let i = 1; i < steps; i++) {
    const u = i / steps;
    const env = Math.sin(u * Math.PI); // widest wander mid-air, pins tight to cloud & impact
    ox = ox * 0.58 + (rand() - 0.5) * 6.5 * env;
    oz = oz * 0.58 + (rand() - 0.5) * 6.5 * env;
    main.push({
      x: lerp(from.x, to.x, u) + ox,
      y: lerp(from.y, to.y, u) + (rand() - 0.5) * 0.7,
      z: lerp(from.z, to.z, u) + oz,
    });
  }
  main.push({ x: to.x, y: to.y, z: to.z });
  const paths = [main];
  const forks = 2 + (rand() < 0.55 ? 1 : 0);
  const fSteps = 10;
  let twigParent = null;
  for (let f = 0; f < forks; f++) {
    const at = 3 + Math.floor(rand() * (steps - 9));
    const p0 = main[at];
    const ang = rand() * Math.PI * 2;
    const horiz = 0.34 + rand() * 0.46;
    const dx = Math.cos(ang) * horiz, dz = Math.sin(ang) * horiz;
    const len = 10 + rand() * 12;
    const fork = [p0];
    let fx = 0, fz = 0;
    for (let i = 1; i <= fSteps; i++) {
      const u = i / fSteps;
      const kinkEnv = 0.35 + 0.85 * Math.sin(u * Math.PI);
      fx = fx * 0.44 + (rand() - 0.5) * 3.4 * kinkEnv;
      fz = fz * 0.44 + (rand() - 0.5) * 3.4 * kinkEnv;
      fork.push({
        x: p0.x + dx * len * u + fx,
        y: p0.y - len * u * 1.42 + (rand() - 0.5) * 0.55,
        z: p0.z + dz * len * u + fz,
      });
    }
    paths.push(fork);
    if (!twigParent) twigParent = { fork, ang, len };
  }
  // Crackling secondary sub-twig off the primary fork for authentic branching silhouette
  if (twigParent) {
    const { fork, ang, len } = twigParent;
    const tp0 = fork[3 + Math.floor(rand() * 3)];
    const tAng = ang + (rand() < 0.5 ? 1 : -1) * (0.55 + rand() * 0.65);
    const tHoriz = 0.35 + rand() * 0.45;
    const tdx = Math.cos(tAng) * tHoriz, tdz = Math.sin(tAng) * tHoriz;
    const tLen = len * (0.36 + rand() * 0.18);
    const twig = [tp0];
    let tx = 0, tz = 0;
    for (let i = 1; i <= 5; i++) {
      const u = i / 5;
      tx = tx * 0.4 + (rand() - 0.5) * 1.9;
      tz = tz * 0.4 + (rand() - 0.5) * 1.9;
      twig.push({
        x: tp0.x + tdx * tLen * u + tx,
        y: tp0.y - tLen * u * 1.38,
        z: tp0.z + tdz * tLen * u + tz,
      });
    }
    paths.push(twig);
  }
  return paths;
}

// =========================================================================
// 7. CACHED PROCEDURAL ALPHA EFFECT TEXTURES (128x128 EACH, <0.35 MB TOTAL)
// =========================================================================
const TEX_CACHE = new WeakMap();

function getCache(T) {
  let c = TEX_CACHE.get(T);
  if (!c) { c = {}; TEX_CACHE.set(T, c); }
  return c;
}

function makeCanvasTex(T, canvas, { srgb = true, repeat = false } = {}) {
  if (!T || !canvas || typeof T.CanvasTexture !== 'function' || T.STAND_IN) return null;
  const tex = new T.CanvasTexture(canvas);
  if (srgb && T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Crisp autumn leaf silhouette (pointed oval oak/birch leaf with stem, midrib & subtle veins).
// Keeps instance/material colour tinting clean (bright neutral white-cream leaf base).
export function makeLeafAlphaTexture(T) {
  if (!T || T.STAND_IN || typeof document === 'undefined' || !document.createElement) return null;
  const cache = getCache(T);
  if (cache.leaf) return cache.leaf;

  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, S, S);

  // Draw crisp pointed leaf contour oriented horizontally across [14..116] x [20..108]
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(14, 64); // petiole base
  ctx.bezierCurveTo(28, 30, 56, 18, 86, 30);
  ctx.bezierCurveTo(100, 36, 110, 52, 118, 64); // pointed tip
  ctx.bezierCurveTo(110, 76, 100, 92, 86, 98);
  ctx.bezierCurveTo(56, 110, 28, 98, 14, 64);
  ctx.closePath();

  const grad = ctx.createLinearGradient(14, 24, 118, 104);
  grad.addColorStop(0, '#dedbd0');
  grad.addColorStop(0.5, '#f6f4ec');
  grad.addColorStop(1, '#d6d2c4');
  ctx.fillStyle = grad;
  ctx.fill();

  // Clip to leaf silhouette and paint central midrib & delicate lateral veins
  ctx.clip();
  ctx.strokeStyle = 'rgba(130, 122, 104, 0.42)';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(10, 64);
  ctx.lineTo(114, 64);
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(140, 132, 114, 0.30)';
  for (let i = 0; i < 5; i++) {
    const x0 = 30 + i * 16;
    ctx.beginPath();
    ctx.moveTo(x0, 64);
    ctx.quadraticCurveTo(x0 + 10, 46, x0 + 20, 30);
    ctx.moveTo(x0, 64);
    ctx.quadraticCurveTo(x0 + 10, 82, x0 + 20, 98);
    ctx.stroke();
  }
  ctx.restore();

  // Thin short stem
  ctx.strokeStyle = '#c4baa4';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(4, 65);
  ctx.lineTo(18, 64);
  ctx.stroke();

  const tex = makeCanvasTex(T, cv, { srgb: true, repeat: false });
  if (tex) tex.name = 'env-leaf-alpha';
  cache.leaf = tex;
  return tex;
}

// Soft organic feathered charred-ash scorch decal texture (eliminates hard black polygon discs).
export function makeScorchTexture(T) {
  if (!T || T.STAND_IN || typeof document === 'undefined' || !document.createElement) return null;
  const cache = getCache(T);
  if (cache.scorch) return cache.scorch;

  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    const dy = (y + 0.5) / S * 2 - 1;
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / S * 2 - 1;
      const r = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      // Organic wavy soot tendrils + multi-scale ash speckle
      const ray = Math.sin(ang * 7 + 1.1) * 0.08 + Math.sin(ang * 13 - 0.7) * 0.05;
      const n1 = valNoise2((x / S) * 6, (y / S) * 6, 6, 401);
      const n2 = valNoise2((x / S) * 16, (y / S) * 16, 16, 419);
      const warpR = r * (0.94 + ray + (n1 - 0.5) * 0.34);
      const alpha = clamp(Math.pow(clamp(1 - warpR, 0, 1), 1.65) * (0.78 + n2 * 0.38), 0, 1);
      // Dark carbon centre fading through warm grey wood-ash rim
      const ash = clamp(warpR * 0.85 + (n2 - 0.5) * 0.25, 0, 1);
      const cr = Math.round(lerp(18, 52, ash));
      const cg = Math.round(lerp(15, 48, ash));
      const cb = Math.round(lerp(13, 44, ash));
      const o = (y * S + x) * 4;
      img.data[o] = cr;
      img.data[o + 1] = cg;
      img.data[o + 2] = cb;
      img.data[o + 3] = Math.round(alpha * 225);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = makeCanvasTex(T, cv, { srgb: true, repeat: false });
  if (tex) tex.name = 'env-scorch-feathered';
  cache.scorch = tex;
  return tex;
}

// Soft concentric dual-crest water ripple texture (replaces sharp hard-edged polygon ring).
export function makeRippleTexture(T) {
  if (!T || T.STAND_IN || typeof document === 'undefined' || !document.createElement) return null;
  const cache = getCache(T);
  if (cache.ripple) return cache.ripple;

  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    const dy = (y + 0.5) / S * 2 - 1;
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / S * 2 - 1;
      const r = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      // Slight organic waviness so rain & wake rings don't look CAD-drawn
      const wob = (Math.sin(ang * 5 + 0.6) * 0.015 + Math.cos(ang * 9 - 0.4) * 0.010);
      const rr = r + wob;
      // Outer primary crest near r=0.84 + softer inner secondary crest near r=0.58
      const c1 = Math.exp(-Math.pow((rr - 0.84) / 0.075, 2));
      const c2 = Math.exp(-Math.pow((rr - 0.58) / 0.09, 2)) * 0.48;
      const edgeFade = clamp((1.0 - rr) / 0.12, 0, 1);
      const a = clamp((c1 + c2) * edgeFade, 0, 1);
      const o = (y * S + x) * 4;
      img.data[o] = 235;
      img.data[o + 1] = 244;
      img.data[o + 2] = 250;
      img.data[o + 3] = Math.round(a * 230);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = makeCanvasTex(T, cv, { srgb: true, repeat: false });
  if (tex) tex.name = 'env-water-ripple';
  cache.ripple = tex;
  return tex;
}

// Natural wet-ground puddle texture with subtle dark damp-soil rim & neutral reflective water center.
// Tinted cleanly by `puddleMat.color` at runtime so puddles reflect sky/dusk/night/blood-moon accurately.
export function makePuddleTextureV2(T, seed = 0xf00d) {
  if (!T || T.STAND_IN || typeof document === 'undefined' || !document.createElement) return null;
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const rnd = mulberry32(seed);
  const cx = S / 2, cy = S / 2;
  const n = 14;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (0.58 + rnd() * 0.36) * (S * 0.45);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const p0 = pts[i % n], p1 = pts[(i + 1) % n];
    const mx = (p0[0] + p1[0]) * 0.5, my = (p0[1] + p1[1]) * 0.5;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  ctx.closePath();
  ctx.save();
  ctx.clip();
  // Soft dark damp-earth absorption edge -> neutral mirror-tinted water body (tinted dynamically by sky!)
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.47);
  grad.addColorStop(0.00, 'rgba(182, 194, 202, 0.86)');
  grad.addColorStop(0.55, 'rgba(116, 130, 138, 0.78)');
  grad.addColorStop(0.82, 'rgba(38, 44, 42, 0.52)');
  grad.addColorStop(1.00, 'rgba(26, 30, 28, 0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.restore();
  const tex = makeCanvasTex(T, cv, { srgb: true, repeat: false });
  if (tex) tex.name = `env-puddle-${seed}`;
  return tex;
}

// Seamless 256x256 3-channel periodic FBM noise texture for volumetric TSL sky clouds & lunar maria.
// R = large billowy cumulus shapes, G = wispy cumulus edge turbulence, B = fine high-altitude cirrus.
export function makeCloudNoiseTexture(T) {
  if (!T || T.STAND_IN || typeof document === 'undefined' || !document.createElement) return null;
  const cache = getCache(T);
  if (cache.cloudNoise) return cache.cloudNoise;

  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(S, S);

  const fbmChannel = (periods, seed) => {
    const out = new Float32Array(S * S);
    let amp = 1, tot = 0;
    for (let pi = 0; pi < periods.length; pi++) {
      const P = periods[pi];
      for (let y = 0; y < S; y++) {
        const vy = (y / S) * P;
        for (let x = 0; x < S; x++) {
          out[y * S + x] += valNoise2((x / S) * P, vy, P, seed + pi * 97) * amp;
        }
      }
      tot += amp;
      amp *= 0.52;
    }
    let lo = 1, hi = 0;
    for (let i = 0; i < out.length; i++) {
      out[i] /= tot;
      if (out[i] < lo) lo = out[i];
      if (out[i] > hi) hi = out[i];
    }
    const span = hi - lo || 1;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / span;
    return out;
  };

  const R = fbmChannel([4, 8, 16, 32], 0xc101);
  const G = fbmChannel([8, 16, 32, 64], 0xc203);
  const B = fbmChannel([6, 12, 24], 0xc307);
  for (let i = 0; i < S * S; i++) {
    const o = i * 4;
    img.data[o] = Math.round(R[i] * 255);
    img.data[o + 1] = Math.round(G[i] * 255);
    img.data[o + 2] = Math.round(B[i] * 255);
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = makeCanvasTex(T, cv, { srgb: false, repeat: true });
  if (tex) {
    if (T.NoColorSpace) tex.colorSpace = T.NoColorSpace;
    tex.name = 'env-cloud-fbm';
  }
  cache.cloudNoise = tex;
  return tex;
}

// world/fob-textures.js — AH-10: Shared procedural PBR texture library for FOB Threshold structure & built-in stations.
// Deterministic, zero-RNG-leakage, WebGPU-ready (flipY=false bottom-up DataTextures, packed linear ORM:
// R=AO, G=Roughness, B=Metalness), Node/fakethree safe (degrades cleanly when DataTexture is absent).
// Strictly follows docs/art-direction.md (Military + Industrial families, <45% saturation) and docs/asset-principles.md.
import {
  tileNoise,
  tileFbm,
  heightToNormalRGBA,
  makeDataTexture,
  applyWorldUVByMaterial,
} from './training-textures.js';

export { applyWorldUVByMaterial };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash2i(ix, iy, seed) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// Fast cached periodic FBM lookup grid (huge speedup for 512x512 synthesis)
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

function tileWorley(u, v, px, py, seed = 17) {
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
  if (map && !wrapY && wrapX) { map.wrapS = T.RepeatWrapping; map.wrapT = T.ClampToEdgeWrapping; }
  if (ormTex && !wrapY && wrapX) { ormTex.wrapS = T.RepeatWrapping; ormTex.wrapT = T.ClampToEdgeWrapping; }
  if (normalMap && !wrapY && wrapX) { normalMap.wrapS = T.RepeatWrapping; normalMap.wrapT = T.ClampToEdgeWrapping; }
  return {
    name,
    map,
    normalMap,
    ormMap: ormTex,
    roughnessMap: ormTex,
    metalnessMap: ormTex,
    aoMap: ormTex,
    opts({ color = 0xffffff, normalScale = 1.0, aoMapIntensity = 0.72, roughness = 1.0, metalness = 1.0, extra = null } = {}) {
      if (!map) return { color, roughness: 0.82, metalness: 0.15, ...(extra || {}) };
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
      };
      if (extra) Object.assign(out, extra);
      return out;
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Poured Board-Formed Reinforced Military Bunker Concrete (512x512)
//    - Horizontal formwork lift seams + wood-shuttering board grain
//    - Recessed cast-in-place tie-rod cone holes with subtle rust weep streaks
//    - Aggregate micro-pitting, spalled edge chips, rainwater streaks & hairline cracks
// ---------------------------------------------------------------------------
export function buildBunkerConcretePixels(N = 512, variant = 'wall') {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const isBase = variant === 'base';
  const seed = isBase ? 3101 : 2101;
  const gBroad = makeFbmGrid(64, 4, 4, seed, 3, 0.55);
  const gFine = makeFbmGrid(128, 18, 18, seed + 17, 3, 0.55);
  const gBoard = makeFbmGrid(128, 6, 36, seed + 39, 3, 0.50);
  const gStreak = makeFbmGrid(64, 14, 2, seed + 71, 3, 0.52);

  // Subtle irregular hairline cracks (4 short warped fractures)
  const crackMask = new Float32Array(N * N);
  const rnd = makeRng(seed + 111);
  for (let c = 0; c < (isBase ? 6 : 4); c++) {
    let cx = rnd() * N, cy = rnd() * N;
    let ang = rnd() * Math.PI * 2;
    const steps = 42 + ((rnd() * 48) | 0);
    for (let s = 0; s < steps; s++) {
      ang += (rnd() - 0.5) * 0.48;
      cx = (cx + Math.cos(ang) * 1.4 + N) % N;
      cy = (cy + Math.sin(ang) * 1.4 + N) % N;
      const ix = cx | 0, iy = cy | 0;
      const w = 1 - Math.abs(s / steps - 0.5) * 1.6;
      if (w <= 0) continue;
      for (let dy = -1; dy <= 1; dy++) {
        const py = (iy + dy + N) % N;
        for (let dx = -1; dx <= 1; dx++) {
          const px = (ix + dx + N) % N;
          const k = (dx === 0 && dy === 0) ? w : w * 0.35;
          const idx = py * N + px;
          if (k > crackMask[idx]) crackMask[idx] = k;
        }
      }
    }
  }

  // Tie-rod socket positions (authentic 2x4 bunker formwork cone grid)
  // AH-14: Pre-stamp the 16 small cone sockets & weep streaks onto flat masks (~20k pixels vs 4.2M Math.hypot calls!)
  const tieHoleMask = new Float32Array(N * N);
  const tieRimMask = new Float32Array(N * N);
  const tieWeepMask = new Float32Array(N * N);
  if (!isBase) {
    const tiePoints = [];
    for (let ry = 0; ry < 4; ry++) {
      const vy = (ry + 0.5) / 4;
      for (let rx = 0; rx < 2; rx++) {
        tiePoints.push([(rx + 0.25) / 2, vy]);
        tiePoints.push([(rx + 0.75) / 2, vy]);
      }
    }
    const maxDyDown = Math.ceil(0.14 * N);
    for (let t = 0; t < tiePoints.length; t++) {
      const cx = tiePoints[t][0] * N, cy = tiePoints[t][1] * N;
      const ix0 = Math.floor(cx) - 8, ix1 = Math.ceil(cx) + 8;
      const iy0 = Math.floor(cy) - 8, iy1 = Math.ceil(cy) + maxDyDown;
      for (let iy = iy0; iy <= iy1; iy++) {
        const py = ((iy % N) + N) % N;
        const dy = iy - cy;
        const dv = dy / N;
        const inWeepY = dv > 0 && dv < 0.14;
        const inHoleY = Math.abs(dy) < 7.0;
        if (!inWeepY && !inHoleY) continue;
        const row = py * N;
        for (let ix = ix0; ix <= ix1; ix++) {
          const dx = ix - cx;
          const ax = Math.abs(dx);
          if (ax >= 7.0) continue;
          const px = ((ix % N) + N) % N;
          const idx = row + px;
          if (inHoleY) {
            const dSq = dx * dx + dy * dy;
            if (dSq < 49.0) {
              const d = Math.sqrt(dSq);
              const hVal = 1 - sstep(1.6, 4.6, d);
              if (hVal > tieHoleMask[idx]) tieHoleMask[idx] = hVal;
              const rVal = Math.exp(-((d - 5.0) * (d - 5.0)) / 2.6);
              if (rVal > tieRimMask[idx]) tieRimMask[idx] = rVal;
            }
          }
          if (inWeepY && ax < 4.2) {
            const wv = (1 - dv / 0.14) * (1 - sstep(0.8, 4.0, ax));
            if (wv > tieWeepMask[idx]) tieWeepMask[idx] = wv;
          }
        }
      }
    }
  }

  for (let y = 0; y < N; y++) {
    const v = y / N;
    // 4 horizontal formwork panel lifts (each ~0.62 m tall in world)
    const coursePos = (v * 4) % 1;
    const courseId = Math.floor(v * 4);
    const boardPos = (v * 20) % 1;
    const seamDistH = Math.min(coursePos, 1 - coursePos) * N / 4;
    const seamH = 1 - sstep(0.0, 2.6, seamDistH);
    const boardGroove = (1 - sstep(0.0, 1.3, Math.min(boardPos, 1 - boardPos) * N / 20)) * 0.42;

    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;

      const nb = gBroad(u, v);
      const nf = gFine(u, v);
      const grain = gBoard(u, v);
      const streak = gStreak(u, v);

      // Vertical formwork joint (staggered per course)
      const uOff = (u + (courseId & 1) * 0.5) % 1;
      const seamDistV = Math.min(uOff, 1 - uOff) * N;
      const seamV = 1 - sstep(0.0, 2.2, seamDistV);
      const seam = Math.max(seamH, seamV * 0.85);

      // Course-to-course concrete batch tone variance
      const batchTint = (hash2i(courseId, Math.floor(uOff * 2), seed + 5) - 0.5) * 0.055;

      // Micro air voids ("bug holes" typical of poured military concrete)
      const pitRaw = tileNoise(u, v, 64, 64, seed + 193);
      const pit = pitRaw > 0.915 ? (pitRaw - 0.915) / 0.085 : 0;

      // Tie-rod recessed cone sockets + faint rust/water weep streak underneath
      const tieHole = tieHoleMask[idx];
      const tieRim = tieRimMask[idx];
      const tieWeep = tieWeepMask[idx] * (0.40 + 0.50 * streak);

      const crack = crackMask[idx];

      // Neutral high-value concrete base (tinted cleanly by material.color)
      let lum = (isBase ? 0.74 : 0.78) + batchTint + (nb - 0.5) * 0.14 + (nf - 0.5) * 0.10 + (grain - 0.5) * 0.045;
      // Rainwater vertical weathering streaks
      const rainWash = sstep(0.56, 0.88, streak) * (0.055 + (isBase ? 0.07 : 0.025));
      lum -= rainWash;
      lum -= seam * 0.12 + boardGroove * 0.045 + pit * 0.10 + crack * 0.18 + tieHole * 0.24;
      lum += tieRim * 0.03;

      let cr = lum * 1.00;
      let cg = lum * 1.01;
      let cb = lum * 0.97;

      // Subtle rust/mineral weep below tie-rod holes
      if (tieWeep > 0.01) {
        cr = lerp(cr, lum * 0.86, tieWeep * 0.45);
        cg = lerp(cg, lum * 0.72, tieWeep * 0.50);
        cb = lerp(cb, lum * 0.58, tieWeep * 0.55);
      }

      // Base/foundation variant: damp moss tint, mineral efflorescence salt haze, and ground earth splatter
      let rgh = (isBase ? 0.84 : 0.90) + (nf - 0.5) * 0.09 - rainWash * 0.5;
      if (isBase) {
        const efflor = sstep(0.66, 0.88, nb * 0.65 + streak * 0.35) * 0.22;
        cr += efflor * 0.24; cg += efflor * 0.24; cb += efflor * 0.21;
        const moss = sstep(0.60, 0.85, gBroad(u + 0.31, v + 0.17)) * sstep(0.42, 0.88, v);
        cr = lerp(cr, 0.38, moss * 0.42);
        cg = lerp(cg, 0.45, moss * 0.42);
        cb = lerp(cb, 0.30, moss * 0.42);
        const mudSplatter = sstep(0.55, 0.95, v) * sstep(0.45, 0.82, nf);
        cr = lerp(cr, 0.42, mudSplatter * 0.38);
        cg = lerp(cg, 0.37, mudSplatter * 0.38);
        cb = lerp(cb, 0.29, mudSplatter * 0.38);
        rgh -= sstep(0.60, 1.0, v) * 0.14;
      }

      const h = clamp(
        0.56 + (nb - 0.5) * 0.09 + (nf - 0.5) * 0.12 + (grain - 0.5) * 0.05
        - seam * 0.22 - boardGroove * 0.07 - pit * 0.18 - crack * 0.24 - tieHole * 0.34 + tieRim * 0.04,
        0.02, 0.98
      );
      height[idx] = h;

      const ao = clamp(1.0 - seam * 0.30 - boardGroove * 0.08 - pit * 0.18 - crack * 0.30 - tieHole * 0.42, 0.38, 1.0);
      rgh = clamp(rgh + pit * 0.06 + crack * 0.05 - tieWeep * 0.05, 0.64, 0.98);
      const met = tieHole > 0.5 ? 0.32 : 0.02;

      albedo[o] = clamp(Math.round(cr * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(cg * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(cb * 255), 0, 255);
      albedo[o + 3] = 255;

      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(met * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// 2. Walkable Bunker Roof Deck: Concrete Slabs + Tar Expansion Joints + Bitumen Patches (512x512)
// ---------------------------------------------------------------------------
export function buildRoofDeckPixels(N = 512) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gBroad = makeFbmGrid(64, 3, 3, 4201, 3, 0.55);
  const gGrit = makeFbmGrid(128, 22, 22, 4219, 3, 0.55);
  const gTar = makeFbmGrid(64, 5, 5, 4253, 3, 0.52);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    const py = (v * 2) % 1;
    const jDistY = Math.min(py, 1 - py) * N / 2;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const px = (u * 2) % 1;
      const jDistX = Math.min(px, 1 - px) * N / 2;
      const idx = y * N + x;
      const o = idx * 4;

      const nb = gBroad(u, v);
      const ng = gGrit(u, v);
      const nt = gTar(u, v);

      // Bitumen tar expansion joint strips between concrete roof panels
      const jointDist = Math.min(jDistX, jDistY);
      const jointGroove = 1 - sstep(0.0, 4.5, jointDist);
      const tarBleed = (1 - sstep(3.5, 11.5, jointDist + (nt - 0.5) * 6.0)) * 0.85;
      // Organic weathered bitumen roof repair patches
      const tarPatch = sstep(0.67, 0.77, nt * 0.75 + nb * 0.25) * 0.88;
      const tar = Math.max(jointGroove, tarBleed * 0.75, tarPatch);

      // Roof gravel/trowel concrete base
      let cr = 0.54 + (nb - 0.5) * 0.12 + (ng - 0.5) * 0.11;
      let cg = 0.56 + (nb - 0.5) * 0.12 + (ng - 0.5) * 0.11;
      let cb = 0.53 + (nb - 0.5) * 0.11 + (ng - 0.5) * 0.10;

      // Subtle standing rainwater stain rings
      const waterRing = Math.exp(-Math.pow((nb - 0.34) * 14, 2)) * 0.12;
      cr -= waterRing; cg -= waterRing * 0.95; cb -= waterRing * 0.85;

      // Blend dark weathered tar over joints & patches
      const tarCol = 0.17 + (ng - 0.5) * 0.04;
      cr = lerp(cr, tarCol * 1.02, tar);
      cg = lerp(cg, tarCol * 1.01, tar);
      cb = lerp(cb, tarCol * 0.98, tar);

      const h = clamp(
        0.54 + (ng - 0.5) * 0.16 + (nb - 0.5) * 0.08 - jointGroove * 0.26 + tarPatch * 0.045,
        0.05, 0.95
      );
      height[idx] = h;

      const ao = clamp(1.0 - jointGroove * 0.42 - waterRing * 0.6, 0.44, 1.0);
      // Tar seams & patches have lower satin roughness (catch sky glint!) vs matte concrete
      const rgh = clamp(lerp(0.90 + (ng - 0.5) * 0.08, 0.48 + (ng - 0.5) * 0.08, tar), 0.36, 0.97);

      albedo[o] = clamp(Math.round(cr * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(cg * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(cb * 255), 0, 255);
      albedo[o + 3] = 255;

      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(0.04 * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// 3. Heavy Military Structural Steel & Bolted Corner Armor Plate (512x512)
//    variant='steel': welded structural bunker steel (roof plant, louvers, bay frames)
//    variant='armor': heavy riveted armor plating with battle/claw scrapes & rust bleed
// ---------------------------------------------------------------------------
export function buildBunkerSteelPixels(N = 512, variant = 'steel') {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const isArmor = variant === 'armor';
  const seed = isArmor ? 5401 : 5101;
  const gBroad = makeFbmGrid(64, 4, 4, seed, 3, 0.52);
  const gBrush = makeFbmGrid(128, 36, 6, seed + 23, 3, 0.50);
  const gRust = makeFbmGrid(64, 7, 7, seed + 59, 3, 0.55);

  // Battle / claw graze scratches exposing bright bare steel
  const scratchMask = new Float32Array(N * N);
  const rnd = makeRng(seed + 131);
  const scratchCount = isArmor ? 26 : 16;
  for (let s = 0; s < scratchCount; s++) {
    let sx = rnd() * N, sy = rnd() * N;
    const ang = (isArmor ? -0.45 : 0.0) + (rnd() - 0.5) * 1.1;
    const len = 24 + rnd() * (isArmor ? 78 : 44);
    const thick = isArmor && s < 6 ? 1.8 : 0.9;
    for (let k = 0; k < len; k++) {
      const px = ((sx + Math.cos(ang) * k) % N + N) % N;
      const py = ((sy + Math.sin(ang) * k) % N + N) % N;
      const fade = Math.sin((k / len) * Math.PI);
      const R = Math.ceil(thick);
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > thick + 0.4) continue;
          const idx = (((py | 0) + dy + N) % N) * N + (((px | 0) + dx + N) % N);
          const v = fade * (1 - d / (thick + 0.5));
          if (v > scratchMask[idx]) scratchMask[idx] = v;
        }
      }
    }
  }

  for (let y = 0; y < N; y++) {
    const v = y / N;
    const py = (v * 2) % 1;
    const syDist = Math.min(py, 1 - py) * N / 2;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const px = (u * 2) % 1;
      const sxDist = Math.min(px, 1 - px) * N / 2;
      const idx = y * N + x;
      const o = idx * 4;

      const nb = gBroad(u, v);
      const br = gBrush(u, v);
      const nr = gRust(u, v);

      const seamDist = Math.min(sxDist, syDist);
      const seam = 1 - sstep(0.0, isArmor ? 3.2 : 2.2, seamDist);
      const edgeWear = (1 - sstep(2.0, 9.0, seamDist)) * (0.45 + 0.55 * nb);

      // Embossed rivet rows near plate borders
      let rivet = 0, rivetAO = 0, rivetRust = 0;
      const nearBorderY = Math.abs(syDist - 15) < 7;
      const nearBorderX = Math.abs(sxDist - 15) < 7;
      if (nearBorderY || nearBorderX) {
        const step = isArmor ? 32 : 42.6667;
        const rx = ((x + step * 0.5) % step) - step * 0.5;
        const ry = ((y + step * 0.5) % step) - step * 0.5;
        const dRiv = nearBorderY && nearBorderX ? Math.hypot(sxDist - 15, syDist - 15)
          : nearBorderY ? Math.hypot(rx, syDist - 15) : Math.hypot(sxDist - 15, ry);
        if (dRiv < 6.2) {
          rivet = 1 - sstep(2.2, 4.4, dRiv);
          rivetAO = Math.exp(-((dRiv - 4.8) * (dRiv - 4.8)) / 2.4);
        }
      }

      const scr = scratchMask[idx];
      // Rust pockets near seams & crevices
      const rust = sstep(0.62, 0.86, nr) * (0.28 + edgeWear * 0.75 + seam * 0.4 + rivetRust);

      // Base rolled gunmetal plate (calibrated for scene lighting without HDR env cubemap — never crushes black!)
      let lum = (isArmor ? 0.64 : 0.74) + (nb - 0.5) * 0.14 + (br - 0.5) * 0.10;
      lum -= seam * 0.28 + rivetAO * 0.18;
      lum += rivet * 0.14 + edgeWear * 0.12;

      let cr = lum * 0.96;
      let cg = lum * 1.00;
      let cb = lum * 1.04;

      // Rust oxide tint
      if (rust > 0.02) {
        cr = lerp(cr, 0.52, clamp(rust * 0.72, 0, 0.72));
        cg = lerp(cg, 0.30, clamp(rust * 0.72, 0, 0.72));
        cb = lerp(cb, 0.18, clamp(rust * 0.72, 0, 0.72));
      }
      // Bright bare steel in battle/claw scratches
      if (scr > 0.02) {
        cr = lerp(cr, 0.90, scr * 0.84);
        cg = lerp(cg, 0.92, scr * 0.84);
        cb = lerp(cb, 0.94, scr * 0.84);
      }

      const h = clamp(
        0.54 + (br - 0.5) * 0.07 + (nb - 0.5) * 0.06 - seam * 0.34 + rivet * 0.34 - scr * 0.24 - rust * 0.06,
        0.04, 0.98
      );
      height[idx] = h;

      const ao = clamp(1.0 - seam * 0.48 - rivetAO * 0.28 - rust * 0.18, 0.36, 1.0);
      const rgh = clamp(
        lerp((isArmor ? 0.52 : 0.48) + (nb - 0.5) * 0.16 + (br - 0.5) * 0.08 + rust * 0.34, 0.24, clamp(scr + edgeWear * 0.45, 0, 1)),
        0.20, 0.92
      );
      // Moderate painted-steel metalness (0.34-0.46) with bare-metal scratches up to 0.74 so roof plant & bays stay crisp in shadow
      const met = clamp(lerp((isArmor ? 0.46 : 0.38) - rust * 0.30, 0.76, clamp(scr + edgeWear * 0.35 + rivet * 0.22, 0, 1)), 0.08, 0.80);

      albedo[o] = clamp(Math.round(cr * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(cg * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(cb * 255), 0, 255);
      albedo[o + 3] = 255;

      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(met * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// 4. Galvanized Zinc-Spangle Steel (256x256) — HQ Roof Ladder & Razor Wire
// ---------------------------------------------------------------------------
export function buildGalvSteelPixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gFine = makeFbmGrid(64, 16, 16, 6101, 3, 0.5);
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;
      const w1 = tileWorley(u, v, 20, 20, 6113);
      const nf = gFine(u, v);
      const brush = tileNoise(u, v, 8, 64, 6143);
      const spangle = (w1.id - 0.5) * 0.085;
      const lum = clamp(0.76 + spangle + (nf - 0.5) * 0.09 + (brush - 0.5) * 0.07, 0.52, 0.94);
      const h = clamp(0.5 + spangle * 0.14 + (brush - 0.5) * 0.12 + (nf - 0.5) * 0.08, 0.1, 0.9);
      height[idx] = h;
      const rgh = clamp(0.38 + (w1.id - 0.5) * 0.16 + (nf - 0.5) * 0.10, 0.24, 0.62);
      const met = clamp(0.54 + (0.5 - w1.id) * 0.12, 0.40, 0.68);

      albedo[o] = clamp(Math.round(lum * 0.98 * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(lum * 1.00 * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(lum * 1.02 * 255), 0, 255);
      albedo[o + 3] = 255;

      orm[o] = Math.round(clamp(0.92 + spangle * 0.2, 0.72, 1.0) * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(met * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// 5. Chipped Safety Hazard Enamel (256x256) & Riveted Service-Bay Chevron Strip (512x128)
// ---------------------------------------------------------------------------
export function buildHazardEnamelPixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gBroad = makeFbmGrid(64, 5, 5, 7101, 3, 0.55);
  const gChip = makeFbmGrid(128, 18, 18, 7129, 3, 0.55);
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;
      const nb = gBroad(u, v);
      const nc = gChip(u, v);
      const edgeProx = 1 - sstep(0.0, 0.14, Math.min(v, 1 - v));
      const scuff = tileNoise(u, v, 32, 8, 7159);
      const chip = Math.max(sstep(0.66, 0.78, nc * 0.72 + edgeProx * 0.42), sstep(0.82, 0.92, nc * 0.55 + scuff * 0.55) * 0.8);
      const grime = sstep(0.52, 0.86, nb) * 0.28;

      let cr = 0.78 + (nb - 0.5) * 0.08 - grime * 0.35;
      let cg = 0.64 + (nb - 0.5) * 0.07 - grime * 0.30;
      let cb = 0.31 + (nb - 0.5) * 0.05 - grime * 0.16;

      // Dark primer steel showing through chipped enamel
      cr = lerp(cr, 0.24, chip);
      cg = lerp(cg, 0.25, chip);
      cb = lerp(cb, 0.26, chip);

      height[idx] = clamp(0.56 + (nc - 0.5) * 0.08 - chip * 0.22, 0.1, 0.9);
      const ao = clamp(1.0 - grime * 0.30 - chip * 0.22, 0.45, 1.0);
      const rgh = clamp(lerp(0.54 + grime * 0.26, 0.42, chip), 0.34, 0.90);
      const met = clamp(lerp(0.10, 0.68, chip), 0.05, 0.75);

      albedo[o] = clamp(Math.round(cr * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(cg * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(cb * 255), 0, 255);
      albedo[o + 3] = 255;

      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(met * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

export function buildHazardChevronPixels(W = 512, H = 128) {
  const albedo = new Uint8Array(W * H * 4);
  const orm = new Uint8Array(W * H * 4);
  const height = new Float32Array(W * H);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    const border = 1 - sstep(0, 7, Math.min(y, H - 1 - y));
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const idx = y * W + x;
      const o = idx * 4;

      const nf = tileFbm(u, v, 16, 4, 7501, 3, 0.52);
      const grain = tileNoise(u, v, 64, 16, 7529);
      // Crisp 45-degree military black & ochre hazard stripes (8 pairs across strip)
      const diag = ((u * 8 + v * (H / W) * 8) % 1 + 1) % 1;
      const stripeEdge = Math.min(Math.abs(diag - 0.5), Math.min(diag, 1 - diag));
      const yellowMask = sstep(0.48, 0.51, diag) * (1 - border);
      const chip = sstep(0.70, 0.82, nf + (1 - sstep(0, 0.05, stripeEdge)) * 0.25);

      let cr = lerp(0.16, 0.78, yellowMask) + (grain - 0.5) * 0.06;
      let cg = lerp(0.17, 0.63, yellowMask) + (grain - 0.5) * 0.05;
      let cb = lerp(0.19, 0.29, yellowMask) + (grain - 0.5) * 0.04;

      // Dark riveted top/bottom trim border + paint chips
      cr = lerp(cr, 0.22, Math.max(border * 0.75, chip * 0.65));
      cg = lerp(cg, 0.24, Math.max(border * 0.75, chip * 0.65));
      cb = lerp(cb, 0.26, Math.max(border * 0.75, chip * 0.65));

      // Rivet heads along left/right panel edges
      let rivet = 0;
      const px = x % 128;
      if ((y > 12 && y < 26) || (y > H - 26 && y < H - 12)) {
        const cy = y < H / 2 ? 19 : H - 19;
        const d1 = Math.hypot(px - 10, y - cy), d2 = Math.hypot(px - 118, y - cy);
        const dr = Math.min(d1, d2);
        if (dr < 5) rivet = 1 - sstep(2, 4.5, dr);
      }
      cr += rivet * 0.26; cg += rivet * 0.26; cb += rivet * 0.26;

      // Vertical panel seam every 128 px
      const seam = 1 - sstep(0, 2.2, Math.min(px, 128 - px));
      cr *= 1 - seam * 0.35; cg *= 1 - seam * 0.35; cb *= 1 - seam * 0.35;

      height[idx] = clamp(0.52 + yellowMask * 0.04 + rivet * 0.36 - seam * 0.28 - chip * 0.14 + (grain - 0.5) * 0.04, 0.05, 0.98);
      const ao = clamp(1.0 - seam * 0.45 - border * 0.22, 0.38, 1.0);
      const rgh = clamp(lerp(0.56 + (nf - 0.5) * 0.16, 0.34, Math.max(chip, rivet)), 0.24, 0.88);
      const met = clamp(lerp(0.18, 0.72, Math.max(chip, rivet, border * 0.6)), 0.08, 0.85);

      albedo[o] = clamp(Math.round(cr * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(cg * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(cb * 255), 0, 255);
      albedo[o + 3] = 255;

      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(met * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: W, h: H };
}

// ---------------------------------------------------------------------------
// 6. Military Wrinkle-Enamel Olive (256x256) & Oiled Field Desk Oak Wood (256x256)
// ---------------------------------------------------------------------------
export function buildWrinkleOlivePixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gMacro = makeFbmGrid(64, 4, 4, 8101, 3, 0.5);
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;
      const nm = gMacro(u, v);
      const crinkle = tileNoise(u, v, 64, 64, 8117) * 0.6 + tileNoise(u, v, 128, 128, 8147) * 0.4;
      const lum = 0.76 + (nm - 0.5) * 0.10 + (crinkle - 0.5) * 0.06;
      height[idx] = clamp(0.5 + (crinkle - 0.5) * 0.18 + (nm - 0.5) * 0.05, 0.15, 0.85);
      albedo[o] = clamp(Math.round(lum * 0.94 * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(lum * 1.00 * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(lum * 0.86 * 255), 0, 255);
      albedo[o + 3] = 255;
      orm[o] = Math.round(clamp(0.92 + (crinkle - 0.5) * 0.10, 0.76, 1.0) * 255);
      orm[o + 1] = Math.round(clamp(0.64 + (crinkle - 0.5) * 0.12, 0.48, 0.82) * 255);
      orm[o + 2] = Math.round(clamp(0.22 + (nm - 0.5) * 0.08, 0.12, 0.38) * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

export function buildDeskWoodPixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  const gWarp = makeFbmGrid(64, 4, 4, 8601, 3, 0.5);
  for (let y = 0; y < N; y++) {
    const v = y / N;
    const plank = Math.floor(v * 4);
    const pEdge = 1 - sstep(0, 1.6, Math.min((v * 4) % 1, 1 - ((v * 4) % 1)) * N / 4);
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;
      const nw = gWarp(u, v);
      const ring = Math.sin((v * 26 + nw * 4.5 + plank * 1.9) * Math.PI) * 0.5 + 0.5;
      const fiber = tileNoise(u, v, 8, 96, 8623);
      const lum = (0.70 + (hash2i(plank, 3, 8641) - 0.5) * 0.10 + (ring - 0.5) * 0.16 + (fiber - 0.5) * 0.08) * (1 - pEdge * 0.35);
      height[idx] = clamp(0.54 + (ring - 0.5) * 0.10 + (fiber - 0.5) * 0.08 - pEdge * 0.28, 0.08, 0.92);
      albedo[o] = clamp(Math.round(lum * 1.08 * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(lum * 0.86 * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(lum * 0.64 * 255), 0, 255);
      albedo[o + 3] = 255;
      orm[o] = Math.round(clamp(1.0 - pEdge * 0.42 - (1 - ring) * 0.08, 0.45, 1.0) * 255);
      orm[o + 1] = Math.round(clamp(0.62 + (1 - ring) * 0.14 + pEdge * 0.20, 0.45, 0.90) * 255);
      orm[o + 2] = Math.round(0.04 * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// 7. Etched Military Green PCB Circuit Board (256x256) — Damaged Terminal interior
// ---------------------------------------------------------------------------
export function buildEtchedPCBPixels(N = 256) {
  const albedo = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const idx = y * N + x;
      const o = idx * 4;
      const weave = ((x & 3) === 0 || (y & 3) === 0) ? 0.03 : 0;
      const traceH = ((y % 12) < 2) && (hash2i(x >> 4, y >> 3, 9101) > 0.35);
      const traceV = ((x % 16) < 2) && (hash2i(x >> 4, y >> 4, 9137) > 0.42);
      const trace = traceH || traceV ? 1 : 0;
      const padDx = (x % 16) - 8, padDy = (y % 12) - 6;
      const pad = Math.hypot(padDx, padDy) < 2.3 && hash2i(x >> 4, y >> 3, 9173) > 0.62 ? 1 : 0;
      // Electrical scorch burn near the lower-right sparking break
      const dScorch = Math.hypot(u - 0.72, v - 0.68);
      const scorch = clamp(1 - dScorch / 0.28, 0, 1);

      let cr = 0.09 + weave, cg = 0.25 + weave, cb = 0.16 + weave;
      if (trace) { cr = 0.16; cg = 0.38; cb = 0.22; }
      if (pad) { cr = 0.72; cg = 0.56; cb = 0.30; }
      cr = lerp(cr, 0.05, scorch * 0.85);
      cg = lerp(cg, 0.04, scorch * 0.85);
      cb = lerp(cb, 0.04, scorch * 0.85);

      height[idx] = clamp(0.48 + trace * 0.10 + pad * 0.22 - scorch * 0.08, 0.1, 0.9);
      const ao = clamp(1.0 - scorch * 0.55, 0.35, 1.0);
      const rgh = clamp(lerp(pad ? 0.28 : (trace ? 0.42 : 0.52), 0.92, scorch), 0.24, 0.95);
      const met = clamp(lerp(pad ? 0.88 : (trace ? 0.40 : 0.08), 0.05, scorch), 0.02, 0.90);

      albedo[o] = clamp(Math.round(cr * 255), 0, 255);
      albedo[o + 1] = clamp(Math.round(cg * 255), 0, 255);
      albedo[o + 2] = clamp(Math.round(cb * 255), 0, 255);
      albedo[o + 3] = 255;

      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(met * 255);
      orm[o + 3] = 255;
    }
  }
  return { albedo, orm, height, w: N, h: N };
}

// ---------------------------------------------------------------------------
// 8. Dedicated Non-Tiling Relief Maps for Signage, Blast Door, Duty Board & Radio Face
// ---------------------------------------------------------------------------
export function buildLockdownDoorRelief(W = 384, H = 640) {
  const height = new Float32Array(W * H);
  const orm = new Uint8Array(W * H * 4);
  const claw = new Float32Array(W * H);

  // Two deep multi-talon claw gashes across the middle of the blast door (matches stencil positions)
  const strokes = [
    [62, 316, 205, 368, 3.2], [58, 334, 198, 384, 3.6], [66, 352, 190, 398, 3.0],
    [172, 434, 326, 400, 3.4], [178, 452, 330, 418, 3.8], [186, 470, 322, 438, 2.8],
  ];
  for (const [x0, y0, x1, y1, rad] of strokes) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    for (let s = 0; s <= len; s += 1.0) {
      const t = s / len;
      const cx = x0 + dx * t + Math.sin(t * 9) * 1.8;
      const cy = y0 + dy * t + Math.cos(t * 7) * 1.4;
      const taper = Math.sin(t * Math.PI);
      const r = rad * (0.4 + 0.6 * taper);
      const R = Math.ceil(r + 2);
      for (let oy = -R; oy <= R; oy++) {
        const py = clamp((cy | 0) + oy, 0, H - 1);
        for (let ox = -R; ox <= R; ox++) {
          const px = clamp((cx | 0) + ox, 0, W - 1);
          const d = Math.hypot(ox, oy);
          if (d <= r) {
            const v = (1 - d / r) * taper;
            const idx = py * W + px;
            if (v > claw[idx]) claw[idx] = v;
          }
        }
      }
    }
  }

  for (let y = 0; y < H; y++) {
    const v = y / H;
    // Welded steel horizontal bulkhead ribs & recessed upper/lower panels
    const inUpper = v > 0.08 && v < 0.36;
    const inLower = v > 0.44 && v < 0.88;
    const rib = Math.abs(v - 0.40) < 0.025 || v < 0.05 || v > 0.93 ? 1 : 0;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const idx = y * W + x;
      const o = idx * 4;
      const inX = u > 0.08 && u < 0.92;
      const recess = (inUpper || inLower) && inX ? 1 : 0;
      const edgeFrame = !inX || rib;
      const n = tileNoise(u, v, 32, 48, 9301);
      const c = claw[idx];

      // Perimeter bolts along door frame
      let bolt = 0;
      if ((Math.abs(x - 16) < 6 || Math.abs(x - (W - 16)) < 6) && ((y + 32) % 64) < 12) {
        const cy = Math.floor((y + 32) / 64) * 64 - 26;
        const cx = x < W / 2 ? 16 : W - 16;
        const db = Math.hypot(x - cx, y - cy);
        if (db < 5.2) bolt = 1 - sstep(2.2, 4.8, db);
      }

      height[idx] = clamp(0.56 + (edgeFrame ? 0.14 : -0.06 * recess) + bolt * 0.28 + (n - 0.5) * 0.05 - c * 0.42, 0.04, 0.98);
      const ao = clamp(1.0 - c * 0.48 - (recess ? 0.06 : 0), 0.38, 1.0);
      // Shiny bare torn metal inside claw gouges vs weathered painted bulkhead steel!
      const rgh = clamp(lerp(0.60 + (n - 0.5) * 0.14, 0.22, c), 0.18, 0.88);
      const met = clamp(lerp(0.36, 0.78, Math.max(c, bolt * 0.65)), 0.22, 0.84);

      orm[o] = Math.round(ao * 255);
      orm[o + 1] = Math.round(rgh * 255);
      orm[o + 2] = Math.round(met * 255);
      orm[o + 3] = 255;
    }
  }
  return { height, orm, claw, w: W, h: H };
}

export function buildPlateRelief(W = 512, H = 96) {
  const height = new Float32Array(W * H);
  const orm = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const dy = Math.min(y, H - 1 - y);
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const dx = Math.min(x, W - 1 - x);
      const idx = y * W + x;
      const o = idx * 4;
      const bevel = 1 - sstep(2, 8, Math.min(dx, dy));
      const brush = tileNoise(u, v, 6, 48, 9501);
      const wear = tileFbm(u, v, 8, 2, 9533, 2, 0.5);
      height[idx] = clamp(0.52 + bevel * 0.12 + (brush - 0.5) * 0.04, 0.1, 0.95);
      orm[o] = Math.round(clamp(1.0 - bevel * 0.14, 0.76, 1.0) * 255);
      orm[o + 1] = Math.round(clamp(0.56 + (wear - 0.5) * 0.18, 0.40, 0.78) * 255);
      orm[o + 2] = Math.round(clamp(0.32 + bevel * 0.18, 0.18, 0.58) * 255);
      orm[o + 3] = 255;
    }
  }
  return { height, orm, w: W, h: H };
}

export function buildDutyBoardRelief(W = 256, H = 240) {
  const height = new Float32Array(W * H);
  const orm = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const idx = y * W + x;
      const o = idx * 4;
      const cork = tileNoise(u, v, 64, 64, 9601) * 0.65 + tileNoise(u, v, 128, 128, 9629) * 0.35;
      // Approximate zones of pinned papers vs exposed cork
      const header = v < 0.12;
      const leftSheet = u > 0.04 && u < 0.39 && v > 0.24 && v < 0.94;
      const mapSheet = u > 0.42 && u < 0.96 && v > 0.13 && v < 0.48;
      const cards = u > 0.43 && u < 0.95 && v > 0.50 && v < 0.93;
      const isPaper = leftSheet || mapSheet || cards;
      height[idx] = clamp(header ? 0.66 : (isPaper ? 0.60 + (cork - 0.5) * 0.03 : 0.44 + (cork - 0.5) * 0.24), 0.1, 0.92);
      orm[o] = Math.round(clamp(isPaper ? 0.96 : 0.84 + (cork - 0.5) * 0.14, 0.65, 1.0) * 255);
      orm[o + 1] = Math.round(clamp(header ? 0.62 : (isPaper ? 0.86 : 0.94), 0.50, 0.98) * 255);
      orm[o + 2] = Math.round((header ? 0.24 : 0.02) * 255);
      orm[o + 3] = 255;
    }
  }
  return { height, orm, w: W, h: H };
}

export function buildRadioFaceRelief(W = 256, H = 160) {
  const height = new Float32Array(W * H);
  const orm = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const idx = y * W + x;
      const o = idx * 4;
      const brush = tileNoise(u, v, 6, 48, 9701);
      // Dial glass window, VU meter glass window, circular speaker louver
      const inDial = u > 0.06 && u < 0.51 && v > 0.19 && v < 0.48;
      const inVU = u > 0.55 && u < 0.71 && v > 0.20 && v < 0.47;
      const dSpk = Math.hypot((u - 0.844) * W, (v - 0.338) * H);
      const inSpk = dSpk < 24;
      const slot = inSpk && (((y - 54) % 5) < 2) ? 1 : 0;
      const isGlass = inDial || inVU;
      height[idx] = clamp(isGlass ? 0.42 : (slot ? 0.26 : 0.56 + (brush - 0.5) * 0.05), 0.08, 0.92);
      orm[o] = Math.round(clamp(slot ? 0.42 : (isGlass ? 0.92 : 0.95), 0.35, 1.0) * 255);
      orm[o + 1] = Math.round(clamp(isGlass ? 0.14 : (slot ? 0.85 : 0.52 + (brush - 0.5) * 0.10), 0.12, 0.92) * 255);
      orm[o + 2] = Math.round(clamp(isGlass ? 0.08 : (slot ? 0.20 : 0.58), 0.04, 0.78) * 255);
      orm[o + 3] = 255;
    }
  }
  return { height, orm, w: W, h: H };
}

// ---------------------------------------------------------------------------
// Public Cached Factory: getFobPBR(THREE)
// ---------------------------------------------------------------------------
const _cache = new WeakMap();

export function getFobPBR(T) {
  if (!T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  const cached = _cache.get(T);
  if (cached) return cached;

  const bunkerConcrete = makeSet(T, 'fob-conc', { ...buildBunkerConcretePixels(512, 'wall'), nrmStrength: 3.1 });
  const bunkerConcreteBase = makeSet(T, 'fob-conc-base', { ...buildBunkerConcretePixels(512, 'base'), nrmStrength: 3.2 });
  const bunkerRoofDeck = makeSet(T, 'fob-roof', { ...buildRoofDeckPixels(512), nrmStrength: 2.8 });
  const bunkerSteel = makeSet(T, 'fob-steel', { ...buildBunkerSteelPixels(512, 'steel'), nrmStrength: 2.8 });
  const armorPlate = makeSet(T, 'fob-armor', { ...buildBunkerSteelPixels(512, 'armor'), nrmStrength: 3.4 });
  const galvSteel = makeSet(T, 'fob-galv', { ...buildGalvSteelPixels(256), nrmStrength: 1.9 });
  const hazardEnamel = makeSet(T, 'fob-hazard', { ...buildHazardEnamelPixels(256), nrmStrength: 2.2 });
  const hazardChevron = makeSet(T, 'fob-chevron', { ...buildHazardChevronPixels(512, 128), nrmStrength: 2.6, wrapX: true, wrapY: false });
  const wrinkleOlive = makeSet(T, 'fob-olive', { ...buildWrinkleOlivePixels(256), nrmStrength: 2.4 });
  const deskWood = makeSet(T, 'fob-wood', { ...buildDeskWoodPixels(256), nrmStrength: 2.0 });
  const etchedPCB = makeSet(T, 'fob-pcb', { ...buildEtchedPCBPixels(256), nrmStrength: 2.5 });

  // Dedicated non-tiling normal + ORM pairs for FOB signage/stations
  const mkRelief = (name, r, nrmStrength) => {
    const normalMap = makeDataTexture(T, heightToNormalRGBA(r.height, r.w, r.h, nrmStrength, false, false), r.w, r.h, { name: `${name}-nrm`, srgb: false, repeat: false, aniso: 8 });
    const ormMap = makeDataTexture(T, r.orm, r.w, r.h, { name: `${name}-orm`, srgb: false, repeat: false, aniso: 8 });
    if (ormMap) ormMap.channel = 0;
    return { normalMap, ormMap };
  };

  const lockdownDoorRelief = mkRelief('fob-lockdown', buildLockdownDoorRelief(384, 640), 3.4);
  const designationRelief = mkRelief('fob-desig', buildPlateRelief(512, 96), 2.4);
  const dutyBoardRelief = mkRelief('fob-duty', buildDutyBoardRelief(256, 240), 2.2);
  const radioFaceRelief = mkRelief('fob-radio', buildRadioFaceRelief(256, 160), 2.5);

  // Soft weathered rain-runoff & aged siege stain streak alpha texture (replaces blocky flat grime strips!)
  const gw = 128, gh = 256;
  const grimeRGBA = new Uint8Array(gw * gh * 4);
  for (let y = 0; y < gh; y++) {
    const v = y / gh; // 0 = top (parapet drip origin), 1 = bottom
    const vFade = sstep(0.0, 0.06, v) * (1 - sstep(0.55, 1.0, v));
    for (let x = 0; x < gw; x++) {
      const u = x / gw;
      const edgeX = 1 - sstep(0.18, 0.50, Math.abs(u - 0.5));
      const n1 = tileFbm(u, v, 4, 2, 9901, 3, 0.55);
      const n2 = tileNoise(u, v, 14, 6, 9941);
      const a = clamp(vFade * edgeX * (0.45 + 0.55 * n1) * (0.65 + 0.35 * n2), 0, 1);
      const o = (y * gw + x) * 4;
      const lum = clamp(Math.round((0.88 + (n2 - 0.5) * 0.22) * 255), 0, 255);
      grimeRGBA[o] = lum;
      grimeRGBA[o + 1] = lum;
      grimeRGBA[o + 2] = lum;
      grimeRGBA[o + 3] = Math.round(a * 210);
    }
  }
  const grimeStreakMap = makeDataTexture(T, grimeRGBA, gw, gh, { name: 'fob-grime-streak', srgb: true, repeat: false, aniso: 4 });

  // Pure aggregate concrete pore micro-normal (seamless, no formwork seams/tie-rod holes) for painted mural overlays
  const mn = 128, mH = new Float32Array(mn * mn);
  for (let y = 0; y < mn; y++) for (let x = 0; x < mn; x++) {
    const u = x / mn, v = y / mn;
    mH[y * mn + x] = 0.5 + (tileFbm(u, v, 14, 14, 9871, 3, 0.55) - 0.5) * 0.28 + (tileNoise(u, v, 48, 48, 9887) - 0.5) * 0.12;
  }
  const concretePoreNrm = makeDataTexture(T, heightToNormalRGBA(mH, mn, mn, 2.2, true, true), mn, mn, { name: 'fob-pore-nrm', srgb: false, repeat: true, aniso: 4 });

  const pack = {
    bunkerConcrete,
    bunkerConcreteBase,
    bunkerRoofDeck,
    bunkerSteel,
    armorPlate,
    galvSteel,
    hazardEnamel,
    hazardChevron,
    wrinkleOlive,
    deskWood,
    etchedPCB,
    lockdownDoorRelief,
    designationRelief,
    dutyBoardRelief,
    radioFaceRelief,
    grimeStreakMap,
    concretePoreNrm,
  };
  _cache.set(T, pack);
  return pack;
}

export const _TEST_FOB_SYNTH = Object.freeze({
  buildBunkerConcretePixels,
  buildRoofDeckPixels,
  buildBunkerSteelPixels,
  buildGalvSteelPixels,
  buildHazardEnamelPixels,
  buildHazardChevronPixels,
  buildWrinkleOlivePixels,
  buildDeskWoodPixels,
  buildEtchedPCBPixels,
  buildLockdownDoorRelief,
  buildPlateRelief,
  buildDutyBoardRelief,
  buildRadioFaceRelief,
});

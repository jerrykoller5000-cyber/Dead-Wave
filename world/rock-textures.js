// world/rock-textures.js — AG-407: Procedural geological PBR texture library for all rocks in Grave Shift.
// Produces 10 distinct, seamlessly tileable, deterministic geological PBR material sets adhering to:
//   - docs/art-direction.md (worn military realism + eerie folklore; natural base saturation < 45%)
//   - docs/asset-principles.md (macro/medium/micro hierarchy, physical geology before random noise,
//     honest dielectric stone roughness, verified OpenGL tangent/triplanar normal conventions).
//
// Geological identities:
//   1. granite     — Speckled Sierra Granite (feldspar/quartz/biotite crystals, exfoliation cracks)
//   2. basalt      — Columnar Dark Basalt (dense charcoal volcanic grain, polygonal cracks, vesicles)
//   3. sandstone   — Cross-Bedded Sandstone (sedimentary strata ribs, Liesegang iron staining, grit)
//   4. limestone   — Karst Weathered Limestone (pale chalky stone, vertical rain flutes, calcite veins)
//   5. schist      — Foliated Silver-Slate Schist (angled metamorphic layers, silvery mica sheen)
//   6. ironstone   — Hematite Ironstone Ore (Rust Maw / mine quarry: iron-banded ore & rust bleed)
//   7. wetBasalt   — Dripping Grotto Basalt (Wet cave & Pit shelf: slick dark wet rock & algae runs)
//   8. riverCobble — Water-Tumbled River Stone (smooth abraded cobbles, quartz veins, satin sheen)
//   9. monolith    — Ancient Megalith Stone (First People standing stones, Ring Stone, Marrow door)
//  10. fieldstone  — Weathered Settler Fieldstone (dry stone walls, ruins, hearths, flagstones)
//  11. marrowChalk — Pale Marrow Bone-Limestone (Heart chamber walls, fluted columns, lip stones)
//
// Performance & WebGPU notes:
// - Lazy per-geology getters cached per THREE instance via WeakMap: zero cost until used.
// - Two packed delivery formats from the same physical height/albedo/roughness/AO synthesis:
//   * Triplanar TSL format (`colRgh`, `nrmAoH`, flipY = false, linear) for WebGPU NodeMaterials
//   * Standard PBR format (`map` sRGB, `normalMap`, packed `ormMap` R=AO G=Rough B=Metal) for
//     MeshStandardMaterial meshes & WebGL fallback.
// - Node / fakethree safe: returns null textures gracefully if DataTexture is unavailable.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / ((b - a) || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

// Fast deterministic integer hash -> [0, 1)
function hash2i(ix, iy, seed) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Seamless periodic 2D value noise on [0, 1) x [0, 1) with integer periods px, py
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

// Precomputed bilinearly-sampled seamless FBM grid for fast synthesis
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

// Precomputed ridged multifractal grid (sharp angular geological fractures & fissures)
function makeRidgedGrid(gridSize, px, py, seed, octaves = 3, gain = 0.52) {
  const buf = new Float32Array(gridSize * gridSize);
  for (let y = 0; y < gridSize; y++) {
    const v = y / gridSize;
    for (let x = 0; x < gridSize; x++) {
      const u = x / gridSize;
      let sum = 0, amp = 0.55, norm = 0, fx = px, fy = py;
      for (let i = 0; i < octaves; i++) {
        const n = 1 - Math.abs(tileNoise(u, v, fx, fy, seed + i * 53) * 2 - 1);
        sum += (n * n) * amp;
        norm += amp;
        amp *= gain;
        fx <<= 1;
        fy <<= 1;
      }
      buf[y * gridSize + x] = sum / norm;
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

// Seamless Worley cellular edge distance (for angular fracture joints & spalled rock plates,
// always combined with heavy domain warp so it never reads as raw Voronoi!)
function makeWorleyEdgeGrid(gridSize, px, py, seed) {
  const edgeBuf = new Float32Array(gridSize * gridSize);
  const idBuf = new Float32Array(gridSize * gridSize);
  for (let y = 0; y < gridSize; y++) {
    const v = y / gridSize;
    for (let x = 0; x < gridSize; x++) {
      const u = x / gridSize;
      const fx = u * px, fy = v * py;
      const cx = Math.floor(fx), cy = Math.floor(fy);
      let d1 = 9, d2 = 9, cid = 0.5;
      for (let oy = -1; oy <= 1; oy++) {
        const ny = ((cy + oy) % py + py) % py;
        for (let ox = -1; ox <= 1; ox++) {
          const nx = ((cx + ox) % px + px) % px;
          const rx = hash2i(nx, ny, seed);
          const ry = hash2i(nx, ny, seed + 101);
          const dx = (cx + ox + rx) - fx;
          const dy = (cy + oy + ry) - fy;
          const d = dx * dx + dy * dy;
          if (d < d1) {
            d2 = d1; d1 = d;
            cid = hash2i(nx, ny, seed + 223);
          } else if (d < d2) {
            d2 = d;
          }
        }
      }
      const idx = y * gridSize + x;
      edgeBuf[idx] = Math.sqrt(d2) - Math.sqrt(d1);
      idBuf[idx] = cid;
    }
  }
  const mask = gridSize - 1;
  return {
    edge(u, v) {
      const gx = (((u % 1) + 1) % 1) * gridSize;
      const gy = (((v % 1) + 1) % 1) * gridSize;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const fx = gx - x0, fy = gy - y0;
      const ix0 = x0 & mask, ix1 = (ix0 + 1) & mask;
      const iy0 = y0 & mask, iy1 = (iy0 + 1) & mask;
      const r0 = iy0 * gridSize, r1 = iy1 * gridSize;
      return lerp(lerp(edgeBuf[r0 + ix0], edgeBuf[r0 + ix1], fx), lerp(edgeBuf[r1 + ix0], edgeBuf[r1 + ix1], fx), fy);
    },
    id(u, v) {
      const ix = (Math.floor((((u % 1) + 1) % 1) * gridSize)) & mask;
      const iy = (Math.floor((((v % 1) + 1) % 1) * gridSize)) & mask;
      return idBuf[iy * gridSize + ix];
    }
  };
}

export function flipRowsRGBA(src, w, h) {
  const out = new Uint8Array(src.length);
  const row = w * 4;
  for (let y = 0; y < h; y++) {
    out.set(src.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
  }
  return out;
}

// Sobel OpenGL tangent-space normal map from canvas-order Float32Array heightfield.
// Verified WebGPU/WebGL convention: nx = -dX * strength, ny = +dY * strength, nz = 1.
export function heightToNormalRGBA(height, w, h, strength = 2.8, wrapX = true, wrapY = true) {
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
      let nx = -dX * strength;
      let ny = dY * strength;
      const xySq = nx * nx + ny * ny;
      if (xySq > 4.6225) {
        const sc = 2.15 / Math.sqrt(xySq);
        nx *= sc;
        ny *= sc;
      }
      const inv = 1 / (Math.sqrt(nx * nx + ny * ny + 1.0) || 1);
      const o = (r1 + x) * 4;
      nrm[o] = clamp(((nx * inv * 0.5 + 0.5) * 255 + 0.5) | 0, 0, 255);
      nrm[o + 1] = clamp(((ny * inv * 0.5 + 0.5) * 255 + 0.5) | 0, 0, 255);
      nrm[o + 2] = clamp(((inv * 0.5 + 0.5) * 255 + 0.5) | 0, 0, 255);
      nrm[o + 3] = 255;
    }
  }
  return nrm;
}

// Pack synthesized physical channels into BOTH:
// - Standard PBR buffers: `col` (sRGB albedo), `nrm` (OpenGL tangent normal), `orm` (R=AO, G=Rough, B=Metal)
// - Triplanar TSL buffers: `colRgh` (RGB = neutral/tinted linear albedo*0.5, A = rough),
//   `nrmAoH` (RG = normal xy, B = AO, A = height)
function packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, normalStrength, neutralTriplanar = false) {
  const nrm = heightToNormalRGBA(height, N, N, normalStrength, true, true);
  const col = new Uint8Array(N * N * 4);
  const orm = new Uint8Array(N * N * 4);
  const colRgh = new Uint8Array(N * N * 4);
  const nrmAoH = new Uint8Array(N * N * 4);

  // Compute mean luminance so neutralTriplanar mode normalizes around 0.5 (1.0x when shader multiplies by 2.0)
  // while preserving all mineral hue contrasts, crystal speckles, veins and fissures!
  let meanLum = 0;
  if (neutralTriplanar) {
    for (let i = 0; i < N * N; i++) {
      meanLum += rf[i] * 0.299 + gf[i] * 0.587 + bf[i] * 0.114;
    }
    meanLum = Math.max(0.15, meanLum / (N * N));
  }
  const triGain = neutralTriplanar ? (0.50 / meanLum) : 0.50;

  for (let i = 0; i < N * N; i++) {
    const o = i * 4;
    const aok = clamp(ao[i], 0.35, 1.0);
    const rv = clamp(rf[i], 0, 1);
    const gv = clamp(gf[i], 0, 1);
    const bv = clamp(bf[i], 0, 1);
    const rg = clamp(rghf[i], 0.14, 0.99);
    const mt = clamp(metf[i], 0, 0.25);

    // Standard sRGB albedo (baked subtle micro-AO for non-aoMap fallback)
    const bakeAo = 0.72 + 0.28 * aok;
    col[o] = clamp(Math.round(rv * bakeAo * 255), 0, 255);
    col[o + 1] = clamp(Math.round(gv * bakeAo * 255), 0, 255);
    col[o + 2] = clamp(Math.round(bv * bakeAo * 255), 0, 255);
    col[o + 3] = 255;

    // Packed linear ORM (R=AO, G=Roughness, B=Metalness)
    orm[o] = clamp(Math.round(aok * 255), 0, 255);
    orm[o + 1] = clamp(Math.round(rg * 255), 0, 255);
    orm[o + 2] = clamp(Math.round(mt * 255), 0, 255);
    orm[o + 3] = 255;

    // Triplanar TSL colRgh (RGB centered at 0.5 for *2.0 modulation in TSL; A = roughness)
    colRgh[o] = clamp(Math.round(clamp(rv * triGain, 0, 1) * 255), 0, 255);
    colRgh[o + 1] = clamp(Math.round(clamp(gv * triGain, 0, 1) * 255), 0, 255);
    colRgh[o + 2] = clamp(Math.round(clamp(bv * triGain, 0, 1) * 255), 0, 255);
    colRgh[o + 3] = clamp(Math.round(rg * 255), 0, 255);

    // Triplanar TSL nrmAoH (RG = tangent normal xy, B = cavity AO, A = micro height)
    nrmAoH[o] = nrm[o];
    nrmAoH[o + 1] = nrm[o + 1];
    nrmAoH[o + 2] = clamp(Math.round(aok * 255), 0, 255);
    nrmAoH[o + 3] = clamp(Math.round(clamp(height[i], 0, 1) * 255), 0, 255);
  }

  return { col, nrm, orm, colRgh, nrmAoH, w: N, h: N };
}

// Helper: stamp an organic circular/ragged crustose lichen colony onto buffers
function stampLichenColony(rf, gf, bf, height, ao, rghf, N, cx, cy, R, colRGB, rnd) {
  const [lr, lg, lb] = colRGB;
  const ir = Math.ceil(R * 1.35);
  const lobes = 7 + ((rnd() * 5) | 0);
  const phase = rnd() * Math.PI * 2;
  const phase2 = rnd() * Math.PI * 2;
  for (let dy = -ir; dy <= ir; dy++) {
    const py = ((Math.round(cy + dy) % N) + N) % N;
    for (let dx = -ir; dx <= ir; dx++) {
      const dist = Math.hypot(dx, dy);
      if (dist > R * 1.3) continue;
      const ang = Math.atan2(dy, dx);
      const edgeR = R * (0.82 + 0.18 * Math.sin(ang * lobes + phase) + 0.10 * Math.cos(ang * (lobes + 3) + phase2));
      if (dist > edgeR) continue;
      const t = dist / (edgeR || 1);
      const px = ((Math.round(cx + dx) % N) + N) % N;
      const idx = py * N + px;
      const grain = hash2i(px, py, 9137) - 0.5;
      const rim = sstep(0.68, 0.98, t);
      const alpha = (1 - sstep(0.75, 1.0, t)) * (0.58 + grain * 0.22);
      const rimDark = 1 - rim * 0.18;
      rf[idx] = lerp(rf[idx], clamp((lr + grain * 0.08) * rimDark, 0, 1), alpha);
      gf[idx] = lerp(gf[idx], clamp((lg + grain * 0.08) * rimDark, 0, 1), alpha);
      bf[idx] = lerp(bf[idx], clamp((lb + grain * 0.07) * rimDark, 0, 1), alpha);
      height[idx] = clamp(height[idx] + alpha * (0.045 + rim * 0.025 + grain * 0.015), 0, 1);
      rghf[idx] = lerp(rghf[idx], 0.94, alpha);
      ao[idx] = lerp(ao[idx], ao[idx] * (1 - rim * 0.10), alpha);
    }
  }
}

// =========================================================================
// 1. SPECKLED SIERRA GRANITE (512x512)
// Coarse interlocking plagioclase feldspar, smoky quartz, dark biotite flecks,
// curved exfoliation hairline fractures, subtle weathered pale-gray patina.
// =========================================================================
export function synthGranite(N = 512) {
  const gWarp  = makeFbmGrid(64, 3, 3, 101, 2);
  const gMacro = makeFbmGrid(128, 4, 4, 107, 3);
  const gMid   = makeFbmGrid(128, 12, 12, 113, 3);
  const gCrack = makeRidgedGrid(128, 5, 5, 127, 3, 0.50);
  const gFineC = makeRidgedGrid(128, 14, 14, 131, 2, 0.48);
  const gJoint = makeWorleyEdgeGrid(128, 4, 4, 139);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.12;
      const wy = (gWarp(u + 0.37, v + 0.61) - 0.5) * 0.12;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);
      const cr = sstep(0.77, 0.95, gCrack(u + wx * 1.2, v + wy * 1.2));
      const fcr = sstep(0.83, 0.97, gFineC(u + wx * 0.7, v + wy * 0.7)) * 0.55;
      const jEdge = 1 - sstep(0.0, 0.075, gJoint.edge(u + wx * 1.4, v + wy * 1.4));
      const jId = gJoint.id(u + wx * 1.4, v + wy * 1.4);

      // Interlocking granite mineral crystals (medium 2-3px grains + 1px micro-flecks)
      const cA = hash2i(x >> 1, y >> 1, 149);
      const cB = hash2i((x + 1) >> 1, (y + 1) >> 1, 151);
      const cFine = hash2i(x, y, 157);
      const crystal = cA * 0.55 + cB * 0.30 + cFine * 0.15;

      // Distinct mineral species inside granite:
      // <0.22 dark biotite mica, 0.22..0.72 grey-buff feldspar, >0.76 bright glassy quartz
      let mr, mg, mb, mRough, mH;
      if (crystal < 0.21) {
        // Dark biotite mica fleck
        mr = 0.22; mg = 0.23; mb = 0.25; mRough = 0.66; mH = -0.04;
      } else if (crystal > 0.77) {
        // Pale crystalline quartz grain (tighter specular glint!)
        const q = 0.66 + (crystal - 0.77) * 0.75;
        mr = q * 1.01; mg = q * 1.00; mb = q * 0.97; mRough = 0.56; mH = 0.05;
      } else {
        // Plagioclase/potassium feldspar matrix (cool silver-grey to warm buff-grey)
        const base = 0.45 + (ma - 0.5) * 0.14 + (mi - 0.5) * 0.12 + (jId - 0.5) * 0.09 + (crystal - 0.5) * 0.16;
        const warm = sstep(0.45, 0.80, ma) * 0.045;
        mr = base + warm;
        mg = base + warm * 0.55;
        mb = base + 0.018 - warm * 0.4;
        mRough = 0.80 + (mi - 0.5) * 0.14;
        mH = (crystal - 0.5) * 0.04;
      }

      const crack = clamp(cr * 0.85 + fcr * 0.55 + jEdge * 0.62, 0, 1);
      const exfolStep = (jId - 0.5) * 0.12 * (1 - jEdge);
      const h = clamp(0.50 + (ma - 0.5) * 0.22 + (mi - 0.5) * 0.16 + exfolStep + mH - crack * 0.28, 0.04, 0.97);
      const aov = clamp(0.92 + (ma - 0.5) * 0.08 - crack * 0.46, 0.36, 1.0);
      const creviceDark = 1 - crack * 0.40;

      rf[i] = clamp(mr * creviceDark, 0.04, 0.96);
      gf[i] = clamp(mg * creviceDark, 0.04, 0.96);
      bf[i] = clamp(mb * creviceDark, 0.04, 0.96);
      height[i] = h;
      ao[i] = aov;
      rghf[i] = clamp(mRough + crack * 0.12, 0.48, 0.96);
      metf[i] = crystal > 0.88 ? 0.06 : 0.02;
    }
  }

  // Subtle scattered pale crustose lichen flecks on weathered granite
  const rnd = makeRng(191);
  for (let k = 0; k < 10; k++) {
    stampLichenColony(rf, gf, bf, height, ao, rghf, N, rnd() * N, rnd() * N, (7 + rnd() * 14) * (N / 512), [0.58, 0.61, 0.50], rnd);
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 3.0, true);
}

// =========================================================================
// 2. COLUMNAR DARK BASALT (512x512)
// Dense blue-charcoal volcanic texture, sharp polygonal cooling joints,
// conchoidal fracture facets, scattered tiny gas vesicles, pale mineral dust in cracks.
// =========================================================================
export function synthBasalt(N = 512) {
  const gWarp  = makeFbmGrid(64, 3, 3, 211, 2);
  const gMacro = makeFbmGrid(128, 4, 4, 223, 3);
  const gMid   = makeFbmGrid(128, 10, 10, 227, 3);
  const gFract = makeRidgedGrid(128, 6, 6, 229, 3, 0.54);
  const gJoint = makeWorleyEdgeGrid(128, 5, 4, 233);
  const gMicro = makeWorleyEdgeGrid(128, 14, 14, 239);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.08;
      const wy = (gWarp(u + 0.43, v + 0.19) - 0.5) * 0.08;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);
      const jEdge = 1 - sstep(0.0, 0.065, gJoint.edge(u + wx * 0.9, v + wy * 0.9));
      const jId = gJoint.id(u + wx * 0.9, v + wy * 0.9);
      const chipEdge = 1 - sstep(0.0, 0.055, gMicro.edge(u + wx * 0.6, v + wy * 0.6));
      const chipId = gMicro.id(u + wx * 0.6, v + wy * 0.6);
      const sharpCr = sstep(0.80, 0.96, gFract(u + wx, v + wy));

      // Conchoidal fracture ripples + vertical columnar cooling striations
      const ripple = Math.sin((u * 14 + v * 6 + ma * 4.5 + jId * 6.28) * Math.PI) * 0.028;
      const colStriation = Math.sin(u * Math.PI * 10 + wx * 8) * 0.035;
      const fine = hash2i(x, y, 241) - 0.5;

      // Tiny dark volcanic gas vesicles (pores)
      const vHash = hash2i(x >> 1, y >> 1, 251);
      const vesicle = vHash > 0.94 ? sstep(0.94, 0.995, vHash) : 0;

      const crack = clamp(jEdge * 0.90 + sharpCr * 0.72 + chipEdge * 0.35, 0, 1);
      // Crisp pale silica/quartz mineral traces along wide cooling joints & fracture lips (helps night readability!)
      const dustInJoint = sstep(0.40, 0.86, jEdge) * 0.28 + sstep(0.65, 0.95, sharpCr) * 0.14;
      const rustLip = sstep(0.15, 0.45, jEdge) * (1 - sstep(0.55, 0.85, jEdge)) * sstep(0.48, 0.78, ma) * 0.35;

      const faceStep = (jId - 0.5) * 0.13 * (1 - jEdge) + (chipId - 0.5) * 0.05 * (1 - chipEdge);
      const h = clamp(0.52 + (ma - 0.5) * 0.18 + faceStep + ripple + colStriation + fine * 0.04 - crack * 0.30 - vesicle * 0.16, 0.03, 0.97);
      const aov = clamp(0.93 + (ma - 0.5) * 0.07 - crack * 0.48 - vesicle * 0.30, 0.34, 1.0);

      // Dense charcoal blue-slate basalt
      const vBase = 0.29 + (ma - 0.5) * 0.09 + (mi - 0.5) * 0.07 + (jId - 0.5) * 0.08 + fine * 0.03;
      let r = vBase * 0.95;
      let g = vBase * 0.98;
      let b = vBase * 1.08;
      // Pale weathered mineral dust in deep joints
      r = lerp(r, 0.52, dustInJoint);
      g = lerp(g, 0.51, dustInJoint);
      b = lerp(b, 0.49, dustInJoint);
      // Faint iron-oxide patina beside joints
      r = lerp(r, 0.40, rustLip);
      g = lerp(g, 0.30, rustLip);
      b = lerp(b, 0.24, rustLip);

      const darkK = (1 - crack * 0.34) * (1 - vesicle * 0.42);
      rf[i] = clamp(r * darkK, 0.03, 0.92);
      gf[i] = clamp(g * darkK, 0.03, 0.92);
      bf[i] = clamp(b * darkK, 0.03, 0.92);
      height[i] = h;
      ao[i] = aov;
      // Dense cleaved basalt catches crisp raking highlights (0.58-0.78), crevices/dust rougher (0.92)
      rghf[i] = clamp(0.66 + (mi - 0.5) * 0.14 + (jId - 0.5) * 0.10 + crack * 0.22 + dustInJoint * 0.20 + vesicle * 0.18, 0.54, 0.95);
      metf[i] = 0.04;
    }
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 3.3, true);
}

// =========================================================================
// 3. CROSS-BEDDED OCHRE SANDSTONE (512x512)
// Undulating sedimentary bedding strata, wind-scoured horizontal undercuts,
// iron-oxide Liesegang color banding, gritty matte quartz-sand grain, honeycomb pitting.
// =========================================================================
export function synthSandstone(N = 512) {
  const gWarp  = makeFbmGrid(64, 3, 2, 307, 2);
  const gMacro = makeFbmGrid(128, 3, 5, 311, 3);
  const gMid   = makeFbmGrid(128, 8, 12, 313, 3);
  const gPit   = makeFbmGrid(128, 18, 18, 317, 2);
  const gVcrk  = makeRidgedGrid(128, 6, 3, 331, 2, 0.50);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const warpV = (gWarp(u, v) - 0.5) * 0.14 + (gMacro(u, v) - 0.5) * 0.06;
      const bv = v + warpV;

      // Multi-frequency sedimentary bedding bands (thick primary beds + thin cross-beds + fine laminae)
      const bed1 = Math.sin(bv * Math.PI * 10);
      const bed2 = Math.sin(bv * Math.PI * 24 + Math.sin(u * Math.PI * 4) * 1.1);
      const bed3 = Math.sin(bv * Math.PI * 52 + u * Math.PI * 2);
      const strata = bed1 * 0.45 + bed2 * 0.35 + bed3 * 0.20;

      // Sharp recessed horizontal bedding-plane seams where softer siltstone eroded away
      const seam1 = Math.pow(clamp(1 - Math.abs(Math.sin(bv * Math.PI * 5)), 0, 1), 7);
      const seam2 = Math.pow(clamp(1 - Math.abs(Math.sin(bv * Math.PI * 12 + 0.8)), 0, 1), 9) * 0.65;
      const bedSeam = clamp(seam1 + seam2, 0, 1);

      // Occasional vertical stress fracture cutting across beds
      const vCrack = sstep(0.84, 0.97, gVcrk(u + warpV * 0.4, v)) * 0.72;

      // Wind-eroded honeycomb pitting in softer strata layers
      const pitRaw = gPit(u, v);
      const softLayer = sstep(-0.2, 0.4, -bed1);
      const pit = sstep(0.66, 0.86, pitRaw) * softLayer * 0.55;

      // Gritty sand grain
      const sand = (hash2i(x, y, 337) - 0.5) * 0.14 + (hash2i(x >> 1, y >> 1, 347) - 0.5) * 0.08;
      const ma = gMacro(u, v);
      const mi = gMid(u, v);

      // Warm ochre / buff / muted iron-stained terracotta palette (<40% saturation!)
      const ironBand = sstep(0.25, 0.85, Math.sin(bv * Math.PI * 6 + ma * 2.8) * 0.5 + 0.5);
      const baseLum = 0.50 + strata * 0.10 + (ma - 0.5) * 0.10 + sand * 0.35;
      let r = baseLum * lerp(1.06, 1.16, ironBand);
      let g = baseLum * lerp(0.95, 0.89, ironBand);
      let b = baseLum * lerp(0.76, 0.68, ironBand);

      const recess = clamp(bedSeam * 0.85 + vCrack * 0.75 + pit * 0.55, 0, 1);
      const darkK = 1 - recess * 0.42;

      rf[i] = clamp(r * darkK, 0.05, 0.95);
      gf[i] = clamp(g * darkK, 0.05, 0.95);
      bf[i] = clamp(b * darkK, 0.05, 0.95);
      height[i] = clamp(0.54 + strata * 0.16 + (mi - 0.5) * 0.10 + sand * 0.24 - bedSeam * 0.34 - vCrack * 0.30 - pit * 0.18, 0.04, 0.97);
      ao[i] = clamp(0.92 + strata * 0.05 - bedSeam * 0.42 - vCrack * 0.36 - pit * 0.28, 0.36, 1.0);
      rghf[i] = clamp(0.89 + (mi - 0.5) * 0.08 + recess * 0.07 + sand * 0.12, 0.82, 0.98);
      metf[i] = 0.01;
    }
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 3.1, true);
}

// =========================================================================
// 4. KARST WEATHERED LIMESTONE (512x512)
// Pale bone-buff chalky matrix, vertical rain-dissolved flutes (rillenkarren),
// crisp bright crystalline calcite veins, dark karst pockets & gray-green lichen.
// =========================================================================
export function synthLimestone(N = 512) {
  const gWarp  = makeFbmGrid(64, 3, 3, 401, 2);
  const gMacro = makeFbmGrid(128, 4, 4, 409, 3);
  const gMid   = makeFbmGrid(128, 10, 10, 419, 3);
  const gFlute = makeFbmGrid(128, 22, 4, 421, 3);   // vertically elongated dissolution flutes!
  const gKarst = makeRidgedGrid(128, 5, 5, 431, 3, 0.52);
  const gVein  = makeRidgedGrid(128, 4, 4, 433, 2, 0.45);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.10;
      const wy = (gWarp(u + 0.53, v + 0.27) - 0.5) * 0.10;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);

      // Vertical water-dissolved karst flutes (rillenkarren) & horizontal weathered solution beds
      const flute = (gFlute(u + wx * 0.55, v + wy * 0.35) - 0.5) * 0.34;
      const bed = Math.sin((v + wy * 0.9) * Math.PI * 10 + ma * 2.4) * 0.095;

      // Deep dark karst crevices & solution pockets (richer readable relief!)
      const karst = sstep(0.74, 0.95, gKarst(u + wx * 1.15, v + wy * 1.15));

      // Crisp pale crystalline calcite veins cutting diagonally across the stone
      const veinRaw = gVein(u * 0.85 + v * 0.35 + wx * 0.9, v * 0.85 - u * 0.35 + wy * 0.9);
      const calcite = sstep(0.89, 0.985, veinRaw);

      const chalk = (hash2i(x, y, 439) - 0.5) * 0.08 + (hash2i(x >> 1, y >> 1, 443) - 0.5) * 0.06;
      const base = 0.52 + (ma - 0.5) * 0.16 + (mi - 0.5) * 0.12 + flute * 0.32 + bed * 0.45 + chalk;

      // Weathered pale travertine / cool buff karst limestone
      let r = base * 1.00;
      let g = base * 1.01;
      let b = base * 0.95;

      // Bright pale crystalline calcite vein
      r = lerp(r, 0.82, calcite * 0.78);
      g = lerp(g, 0.81, calcite * 0.78);
      b = lerp(b, 0.76, calcite * 0.78);

      // Damp olive-grey weathering inside deeper flutes
      const fluteShade = sstep(-0.14, -0.01, -flute);
      r = lerp(r, r * 0.80, fluteShade * 0.44);
      g = lerp(g, g * 0.88, fluteShade * 0.44);
      b = lerp(b, b * 0.78, fluteShade * 0.44);

      const darkK = 1 - karst * 0.52;
      rf[i] = clamp(r * darkK, 0.05, 0.95);
      gf[i] = clamp(g * darkK, 0.05, 0.95);
      bf[i] = clamp(b * darkK, 0.05, 0.95);
      height[i] = clamp(0.52 + (ma - 0.5) * 0.20 + flute + bed + calcite * 0.05 + chalk * 0.35 - karst * 0.42, 0.04, 0.97);
      ao[i] = clamp(0.92 + flute * 0.24 - karst * 0.52, 0.34, 1.0);
      // Chalky matte body (0.82-0.94), smoother crystalline calcite veins (0.52)
      rghf[i] = clamp(lerp(0.86 + (mi - 0.5) * 0.10 + karst * 0.08, 0.52, calcite), 0.48, 0.96);
      metf[i] = calcite * 0.05 + 0.01;
    }
  }

  // Crustose lichen patches on limestone
  const rnd = makeRng(449);
  for (let k = 0; k < 14; k++) {
    stampLichenColony(rf, gf, bf, height, ao, rghf, N, rnd() * N, rnd() * N, (6 + rnd() * 14) * (N / 512), [0.54, 0.58, 0.44], rnd);
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 3.4, true);
}

// =========================================================================
// 5. FOLIATED SILVER-SLATE SCHIST (512x512)
// Strongly angled metamorphic foliation layers, organic warped slate cleavage ledges,
// directional silvery mica sheen, rusty iron seepage in cracks.
// =========================================================================
export function synthSchist(N = 512) {
  const gWarp  = makeFbmGrid(64, 3, 3, 503, 2);
  const gMacro = makeFbmGrid(128, 4, 4, 509, 3);
  const gMid   = makeFbmGrid(128, 10, 10, 521, 3);
  const gCrack = makeRidgedGrid(128, 6, 6, 523, 3, 0.52);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.16;
      const wy = (gWarp(u + 0.31, v + 0.73) - 0.5) * 0.16;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);

      // Organically warped diagonal metamorphic foliation (breaks uniform pinstripes into authentic split slate!)
      const folCoord = u * 1.0 + v * 2.0 + wx * 1.65 + wy * 1.25 + (ma - 0.5) * 0.24;
      const f1 = ((folCoord * 5.0) % 1 + 1) % 1;
      const f2 = ((folCoord * 13.0 + mi * 0.85) % 1 + 1) % 1;
      const plateBreak = sstep(0.22, 0.78, ma);
      const plateStep = lerp(f1 * 0.55 + f2 * 0.45, mi, 0.34);
      const ledgeDrop = (sstep(0.86, 0.98, f1) * 0.72 + sstep(0.88, 0.99, f2) * 0.36) * (0.45 + 0.55 * plateBreak);
      const crossCr = sstep(0.78, 0.95, gCrack(u + wx, v + wy)) * 0.82;

      // Elongated silvery mica flakes aligned with cleavage
      const micaHash = hash2i((x + y * 2) >> 1, (y - (x >> 1)) >> 1, 541);
      const micaGlint = micaHash > 0.78 ? sstep(0.78, 0.98, micaHash) : 0;
      const fine = hash2i(x, y, 547) - 0.5;

      // Cool blue-violet-charcoal slate with silvery mica & faint iron seepage along ledges
      const ironSeep = sstep(0.45, 0.85, ledgeDrop) * sstep(0.42, 0.76, ma) * 0.42;
      const base = 0.37 + (ma - 0.5) * 0.11 + (mi - 0.5) * 0.08 + (plateStep - 0.5) * 0.14 + fine * 0.04;
      let r = base * 0.97 + micaGlint * 0.15;
      let g = base * 0.96 + micaGlint * 0.16;
      let b = base * 1.05 + micaGlint * 0.18;

      r = lerp(r, 0.48, ironSeep);
      g = lerp(g, 0.34, ironSeep);
      b = lerp(b, 0.25, ironSeep);

      const crack = clamp(ledgeDrop * 0.75 + crossCr, 0, 1);
      const darkK = 1 - crack * 0.44;
      rf[i] = clamp(r * darkK, 0.04, 0.94);
      gf[i] = clamp(g * darkK, 0.04, 0.94);
      bf[i] = clamp(b * darkK, 0.04, 0.94);
      height[i] = clamp(0.46 + (ma - 0.5) * 0.16 + plateStep * 0.26 - ledgeDrop * 0.28 - crossCr * 0.28 + fine * 0.04, 0.04, 0.97);
      ao[i] = clamp(0.90 + plateStep * 0.08 - ledgeDrop * 0.40 - crossCr * 0.38, 0.34, 1.0);
      // Silvery mica cleavage planes reflect crisp light (0.48), ledges & rust stay rough (0.90)
      rghf[i] = clamp(lerp(0.76 + (mi - 0.5) * 0.12 + crack * 0.16, 0.46, micaGlint * 0.85), 0.44, 0.96);
      metf[i] = clamp(0.03 + micaGlint * 0.11, 0, 0.15);
    }
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 3.4, true);
}

// =========================================================================
// 6. HEMATITE IRONSTONE ORE (512x512) — Rust Maw cave & iron mine quarry stones
// Dark iron-banded rock with oxidized rust-bleed veins & specular dark hematite seams.
// =========================================================================
export function synthIronstone(N = 512) {
  const gWarp  = makeFbmGrid(64, 3, 3, 601, 2);
  const gMacro = makeFbmGrid(128, 4, 4, 607, 3);
  const gMid   = makeFbmGrid(128, 10, 10, 613, 3);
  const gRust  = makeFbmGrid(128, 12, 4, 617, 3); // vertical iron bleed streaks!
  const gCrack = makeRidgedGrid(128, 6, 6, 619, 3, 0.54);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.10;
      const wy = (gWarp(u + 0.41, v + 0.67) - 0.5) * 0.10;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);
      const cr = sstep(0.76, 0.95, gCrack(u + wx * 1.2, v + wy * 1.2));
      const rustRun = sstep(0.46, 0.80, gRust(u + wx * 0.5, v + wy * 0.25));
      const oreBand = sstep(0.35, 0.78, Math.sin((v + wy) * Math.PI * 14 + ma * 4) * 0.5 + 0.5);
      const fine = hash2i(x, y, 631) - 0.5;
      const glint = hash2i(x >> 1, y >> 1, 641) > 0.84 ? 1 : 0;

      // Dark ironstone base + oxidized rust streaks (<45% saturation!)
      const base = 0.38 + (ma - 0.5) * 0.12 + (mi - 0.5) * 0.10 + fine * 0.05;
      let r = base * 1.12;
      let g = base * 0.92;
      let b = base * 0.84;

      // Deep metallic-grey hematite ore band
      r = lerp(r, 0.30, oreBand * 0.48);
      g = lerp(g, 0.29, oreBand * 0.48);
      b = lerp(b, 0.31, oreBand * 0.48);

      // Oxidized rust bleed from fractures
      const rustAmt = clamp(rustRun * 0.62 + cr * 0.35, 0, 0.80);
      r = lerp(r, 0.52, rustAmt * 0.65);
      g = lerp(g, 0.33, rustAmt * 0.65);
      b = lerp(b, 0.23, rustAmt * 0.65);

      const darkK = 1 - cr * 0.44;
      rf[i] = clamp(r * darkK, 0.04, 0.92);
      gf[i] = clamp(g * darkK, 0.04, 0.92);
      bf[i] = clamp(b * darkK, 0.04, 0.92);
      height[i] = clamp(0.50 + (ma - 0.5) * 0.22 + (mi - 0.5) * 0.14 + oreBand * 0.08 + fine * 0.05 - cr * 0.38, 0.04, 0.97);
      ao[i] = clamp(0.90 + (ma - 0.5) * 0.08 - cr * 0.48, 0.34, 1.0);
      rghf[i] = clamp(lerp(0.84 + rustAmt * 0.10 + cr * 0.08, 0.56, oreBand * glint * 0.7), 0.52, 0.97);
      metf[i] = clamp(0.03 + oreBand * glint * 0.14, 0, 0.18);
    }
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 3.3, true);
}

// =========================================================================
// 7. DRIPPING GROTTO WET BASALT (512x512) — Wet cave & Lake Pit abyssal stone
// Dark slick basalt with vertical seepage runnels, algae film & glossy damp sheen.
// =========================================================================
export function synthWetBasalt(N = 512) {
  const gWarp  = makeFbmGrid(64, 3, 3, 701, 2);
  const gMacro = makeFbmGrid(128, 4, 4, 709, 3);
  const gMid   = makeFbmGrid(128, 12, 12, 719, 3);
  const gDrip  = makeFbmGrid(128, 16, 3, 727, 3); // vertical wet seepage tracks
  const gCrack = makeRidgedGrid(128, 6, 6, 733, 3, 0.52);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.09;
      const wy = (gWarp(u + 0.29, v + 0.59) - 0.5) * 0.09;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);
      const cr = sstep(0.78, 0.96, gCrack(u + wx, v + wy));
      const seep = sstep(0.42, 0.78, gDrip(u + wx * 0.4, v + wy * 0.2));
      const algae = sstep(0.55, 0.85, ma) * seep;
      const fine = hash2i(x, y, 739) - 0.5;

      const base = 0.28 + (ma - 0.5) * 0.09 + (mi - 0.5) * 0.07 + fine * 0.03;
      let r = base * 0.88;
      let g = base * 1.00;
      let b = base * 0.98;
      // Dark muted wet moss-algae film in seepage runnels
      r = lerp(r, 0.21, algae * 0.55);
      g = lerp(g, 0.31, algae * 0.55);
      b = lerp(b, 0.22, algae * 0.55);

      // Wet darkening in seepage channels
      const wetDark = (1 - seep * 0.24) * (1 - cr * 0.40);
      rf[i] = clamp(r * wetDark, 0.03, 0.85);
      gf[i] = clamp(g * wetDark, 0.03, 0.85);
      bf[i] = clamp(b * wetDark, 0.03, 0.85);
      height[i] = clamp(0.52 + (ma - 0.5) * 0.20 + (mi - 0.5) * 0.14 - seep * 0.08 - cr * 0.36 + fine * 0.03, 0.04, 0.97);
      ao[i] = clamp(0.90 + (ma - 0.5) * 0.08 - cr * 0.46, 0.34, 1.0);
      // Slick wet seepage sheen (0.28-0.42), damp surrounding basalt (0.56-0.72)
      rghf[i] = clamp(lerp(0.64 + (mi - 0.5) * 0.12 + cr * 0.14, 0.28, seep * 0.82), 0.24, 0.86);
      metf[i] = 0.03;
    }
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 3.1, true);
}

// =========================================================================
// 8. WATER-TUMBLED RIVER COBBLE (256x256) — Stream pebbles, bed cobbles, snag rocks
// Smooth abraded river stone with mineral speckle, occasional white quartz bands & wet sheen.
// =========================================================================
export function synthRiverCobble(N = 256) {
  const gWarp  = makeFbmGrid(64, 3, 3, 809, 2);
  const gMacro = makeFbmGrid(64, 4, 4, 811, 3);
  const gMid   = makeFbmGrid(64, 10, 10, 821, 3);
  const gVein  = makeRidgedGrid(64, 3, 3, 823, 2, 0.45);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.12;
      const wy = (gWarp(u + 0.41, v + 0.23) - 0.5) * 0.12;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);
      const speck = hash2i(x, y, 827) - 0.5;
      const grain = hash2i(x >> 1, y >> 1, 829) - 0.5;
      const qBand = sstep(0.91, 0.985, gVein(u + wx * 0.8, v + wy * 0.8));

      // High-value neutral-warm river stone so material.color tints cleanly per pebble species
      const lum = 0.78 + (ma - 0.5) * 0.16 + (mi - 0.5) * 0.10 + grain * 0.12 + speck * 0.08;
      let r = lerp(lum * 1.00, 0.94, qBand * 0.75);
      let g = lerp(lum * 1.00, 0.93, qBand * 0.75);
      let b = lerp(lum * 0.99, 0.90, qBand * 0.75);

      rf[i] = clamp(r, 0.25, 0.98);
      gf[i] = clamp(g, 0.25, 0.98);
      bf[i] = clamp(b, 0.25, 0.98);
      // Water-tumbled gentle relief (smooth compared with hillside fracture rocks!)
      height[i] = clamp(0.52 + (ma - 0.5) * 0.16 + (mi - 0.5) * 0.10 + grain * 0.06 + qBand * 0.03, 0.08, 0.94);
      ao[i] = clamp(0.90 + (ma - 0.5) * 0.12, 0.65, 1.0);
      // Damp satin river-worn stone (0.42-0.68)
      rghf[i] = clamp(0.54 + (mi - 0.5) * 0.16 - qBand * 0.12, 0.36, 0.76);
      metf[i] = 0.03;
    }
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 1.9, true);
}

// =========================================================================
// 9. ANCIENT CARVED MEGALITH (512x512) — First People Standing Stones, Ring Stone, Marrow Door
// Weathered ancient gneiss/granite with hammer-dressed peck marks, vertical rain wash,
// deep age fissures, organic multi-species crustose lichen rosettes, mossy foot darkening.
// =========================================================================
export function synthMonolith(N = 512) {
  const gWarp  = makeFbmGrid(64, 3, 3, 907, 2);
  const gMacro = makeFbmGrid(128, 4, 4, 911, 3);
  const gMid   = makeFbmGrid(128, 12, 12, 919, 3);
  const gRain  = makeFbmGrid(128, 14, 2, 929, 3);  // vertical rain-wash streaks
  const gCrack = makeRidgedGrid(128, 5, 5, 937, 3, 0.52);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N; // 0 = top of stone, 1 = foot of stone
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.09;
      const wy = (gWarp(u + 0.33, v + 0.71) - 0.5) * 0.09;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);
      const cr = sstep(0.80, 0.96, gCrack(u + wx, v + wy));
      const rainStreak = sstep(0.54, 0.84, gRain(u + wx * 0.3, v * 0.5)) * (1 - v * 0.45);

      // Ancient hand-hammered stone peck dimples + organic gneiss grain (ZERO repetitive corduroy stripes!)
      const peck = (hash2i((x + 3) >> 2, (y + 5) >> 2, 953) - 0.5) * 0.055;
      const grain = (hash2i(x >> 1, y >> 1, 941) - 0.5) * 0.11 + (hash2i(x, y, 947) - 0.5) * 0.06;

      // Pale ancient weathered grey-warm granite (#8b887c family, bleached top, mossy damp foot)
      const topBleach = (1 - v) * 0.09;
      const footMoss = sstep(0.68, 1.0, v + (ma - 0.5) * 0.14);
      const lum = 0.54 + topBleach + (ma - 0.5) * 0.14 + (mi - 0.5) * 0.09 + grain + peck * 0.5;
      let r = lum * 1.01;
      let g = lum * 0.99;
      let b = lum * 0.91;

      // Vertical rain-wash darkening
      r *= (1 - rainStreak * 0.18);
      g *= (1 - rainStreak * 0.18);
      b *= (1 - rainStreak * 0.19);

      // Mossy damp darkening toward ground contact
      r = lerp(r, 0.27, footMoss * 0.58);
      g = lerp(g, 0.33, footMoss * 0.58);
      b = lerp(b, 0.21, footMoss * 0.58);

      const darkK = 1 - cr * 0.44;
      rf[i] = clamp(r * darkK, 0.04, 0.95);
      gf[i] = clamp(g * darkK, 0.04, 0.95);
      bf[i] = clamp(b * darkK, 0.04, 0.95);
      height[i] = clamp(0.52 + (ma - 0.5) * 0.20 + (mi - 0.5) * 0.15 + peck + grain * 0.30 - cr * 0.38 + footMoss * 0.04, 0.04, 0.97);
      ao[i] = clamp(0.91 + (ma - 0.5) * 0.08 - cr * 0.46 - footMoss * 0.12, 0.35, 1.0);
      rghf[i] = clamp(0.87 + (mi - 0.5) * 0.09 + cr * 0.08 + footMoss * 0.06 - rainStreak * 0.05, 0.72, 0.97);
      metf[i] = 0.015;
    }
  }

  // Multi-species crustose lichen colonies (heaviest on upper weathered half, matching CL-267 art direction!)
  const rnd = makeRng(0x11c4e);
  const colonies = 22;
  for (let k = 0; k < colonies; k++) {
    const cx = rnd() * N;
    const cy = Math.pow(rnd(), 1.65) * N * 0.86;
    const roll = rnd();
    let col, R;
    if (roll < 0.50) { col = [0.56, 0.58, 0.47]; R = 10 + rnd() * 20; }       // grey-green crust
    else if (roll < 0.78) { col = [0.65, 0.65, 0.59]; R = 9 + rnd() * 18; }   // pale grey lichen
    else if (roll < 0.93) { col = [0.46, 0.50, 0.37]; R = 8 + rnd() * 15; }   // darker leafy green
    else { col = [0.58, 0.48, 0.31]; R = 5 + rnd() * 8; }                      // rare muted ochre
    stampLichenColony(rf, gf, bf, height, ao, rghf, N, cx, cy, R * (N / 512), col, rnd);
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 3.0, false);
}

// =========================================================================
// 10. WEATHERED SETTLER FIELDSTONE (256x256) — Dry-stone walls, Coldwater ruins, hearths, flagstones
// High-value neutral chiseled fieldstone ready for vertexColors / material.color tinting.
// =========================================================================
export function synthFieldstone(N = 256) {
  const gWarp  = makeFbmGrid(64, 3, 3, 1009, 2);
  const gMacro = makeFbmGrid(64, 4, 4, 1013, 3);
  const gMid   = makeFbmGrid(64, 10, 10, 1019, 3);
  const gCrack = makeRidgedGrid(64, 6, 6, 1021, 3, 0.50);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.10;
      const wy = (gWarp(u + 0.37, v + 0.53) - 0.5) * 0.10;
      const ma = gMacro(u, v);
      const mi = gMid(u + wx, v + wy);
      const cr = sstep(0.79, 0.96, gCrack(u + wx, v + wy));
      const grain = (hash2i(x, y, 1031) - 0.5) * 0.10 + (hash2i(x >> 1, y >> 1, 1033) - 0.5) * 0.08;

      // High-value neutral (~0.84 mean) so vertex-colored fieldstone walls keep calibrated brightness
      const lum = clamp((0.86 + (ma - 0.5) * 0.16 + (mi - 0.5) * 0.12 + grain) * (1 - cr * 0.36), 0.18, 0.98);
      rf[i] = lum;
      gf[i] = lum * 0.995;
      bf[i] = lum * 0.98;
      height[i] = clamp(0.54 + (ma - 0.5) * 0.22 + (mi - 0.5) * 0.16 + grain * 0.25 - cr * 0.36, 0.04, 0.97);
      ao[i] = clamp(0.92 + (ma - 0.5) * 0.08 - cr * 0.44, 0.38, 1.0);
      rghf[i] = clamp(0.86 + (mi - 0.5) * 0.12 + cr * 0.09, 0.72, 0.97);
      metf[i] = 0.02;
    }
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 2.9, true);
}

// =========================================================================
// 11. PALE MARROW BONE-LIMESTONE (256x256) — Heart cavern walls, fluted columns, lip stones
// Eerie pale chalk-and-bone limestone with vertical fluted ridges & subtle dark mineral seams.
// =========================================================================
export function synthMarrowChalk(N = 256) {
  const gWarp  = makeFbmGrid(64, 3, 3, 1103, 2);
  const gMacro = makeFbmGrid(64, 4, 4, 1109, 3);
  const gFlute = makeFbmGrid(64, 16, 3, 1117, 3);
  const gCrack = makeRidgedGrid(64, 5, 5, 1123, 3, 0.50);

  const rf = new Float32Array(N * N);
  const gf = new Float32Array(N * N);
  const bf = new Float32Array(N * N);
  const height = new Float32Array(N * N);
  const ao = new Float32Array(N * N);
  const rghf = new Float32Array(N * N);
  const metf = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.08;
      const wy = (gWarp(u + 0.51, v + 0.29) - 0.5) * 0.08;
      const ma = gMacro(u, v);
      const flute = (gFlute(u + wx * 0.4, v + wy * 0.2) - 0.5) * 0.24;
      const cr = sstep(0.81, 0.96, gCrack(u + wx, v + wy));
      const chalk = (hash2i(x, y, 1129) - 0.5) * 0.07;

      // High-value pale bone-chalk base ready for Heart's ROCK/ROCK_DARK/FLOOR/COLUMN tints
      const lum = clamp((0.88 + (ma - 0.5) * 0.14 + flute * 0.22 + chalk) * (1 - cr * 0.38), 0.20, 0.98);
      rf[i] = lum * 1.01;
      gf[i] = lum * 0.99;
      bf[i] = lum * 0.94;
      height[i] = clamp(0.54 + (ma - 0.5) * 0.18 + flute + chalk * 0.25 - cr * 0.36, 0.04, 0.97);
      ao[i] = clamp(0.92 + flute * 0.20 - cr * 0.45, 0.38, 1.0);
      rghf[i] = clamp(0.90 + (ma - 0.5) * 0.08 + cr * 0.06, 0.78, 0.98);
      metf[i] = 0.01;
    }
  }

  return packRockChannels(rf, gf, bf, height, ao, rghf, metf, N, 2.7, true);
}

// =========================================================================
// THREE.DataTexture FACTORY & LAZY PER-THREE LIBRARY CACHE
// =========================================================================
function makeDataTexture(T, rgba, w, h, { name = '', srgb = false, aniso = 4, flip = true } = {}) {
  if (!T || typeof T.DataTexture !== 'function') return null;
  const data = flip ? flipRowsRGBA(rgba, w, h) : rgba;
  const tex = new T.DataTexture(data, w, h, T.RGBAFormat || 1023);
  if (name) tex.name = name;
  tex.flipY = false;
  if (T.RepeatWrapping !== undefined) {
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.RepeatWrapping;
  }
  if (srgb && T.SRGBColorSpace !== undefined) tex.colorSpace = T.SRGBColorSpace;
  else if (!srgb && T.NoColorSpace !== undefined) tex.colorSpace = T.NoColorSpace;
  tex.generateMipmaps = true;
  if (T.LinearMipmapLinearFilter !== undefined) tex.minFilter = T.LinearMipmapLinearFilter;
  if (T.LinearFilter !== undefined) tex.magFilter = T.LinearFilter;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

const ROCK_SPECS = Object.freeze({
  granite:     { fn: synthGranite,     size: 256, normalScale: 0.92, aoIntensity: 0.70, triScale: 0.58, triNormal: 0.78, strataAmt: 0.06 },
  basalt:      { fn: synthBasalt,      size: 256, normalScale: 1.04, aoIntensity: 0.76, triScale: 0.52, triNormal: 0.86, strataAmt: 0.05 },
  sandstone:   { fn: synthSandstone,   size: 256, normalScale: 0.96, aoIntensity: 0.72, triScale: 0.46, triNormal: 0.82, strataAmt: 0.24 },
  limestone:   { fn: synthLimestone,   size: 256, normalScale: 0.92, aoIntensity: 0.72, triScale: 0.50, triNormal: 0.80, strataAmt: 0.16 },
  schist:      { fn: synthSchist,      size: 256, normalScale: 1.08, aoIntensity: 0.76, triScale: 0.54, triNormal: 0.90, strataAmt: 0.20 },
  ironstone:   { fn: synthIronstone,   size: 256, normalScale: 1.02, aoIntensity: 0.74, triScale: 0.44, triNormal: 0.86, strataAmt: 0.14 },
  wetBasalt:   { fn: synthWetBasalt,   size: 256, normalScale: 0.96, aoIntensity: 0.72, triScale: 0.46, triNormal: 0.82, strataAmt: 0.08 },
  riverCobble: { fn: synthRiverCobble, size: 256, normalScale: 0.64, aoIntensity: 0.58, triScale: 0.95, triNormal: 0.56, strataAmt: 0.04 },
  monolith:    { fn: synthMonolith,    size: 256, normalScale: 0.94, aoIntensity: 0.72, triScale: 0.42, triNormal: 0.76, strataAmt: 0.08 },
  fieldstone:  { fn: synthFieldstone,  size: 256, normalScale: 0.88, aoIntensity: 0.68, triScale: 0.68, triNormal: 0.74, strataAmt: 0.06 },
  marrowChalk: { fn: synthMarrowChalk, size: 256, normalScale: 0.84, aoIntensity: 0.64, triScale: 0.36, triNormal: 0.72, strataAmt: 0.10 },
});

export const ROCK_GEOLOGIES = Object.freeze(Object.keys(ROCK_SPECS));

const LIB_CACHE = new WeakMap();

export function getRockTextureLibrary(T) {
  if (!T) return null;
  let lib = LIB_CACHE.get(T);
  if (lib) return lib;

  const textures = [];
  let totalMs = 0;

  const buildOne = (key) => {
    const spec = ROCK_SPECS[key];
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const px = spec.fn(spec.size);
    const map = makeDataTexture(T, px.col, px.w, px.h, { name: `rock-${key}-col`, srgb: true, aniso: 4, flip: true });
    const normalMap = makeDataTexture(T, px.nrm, px.w, px.h, { name: `rock-${key}-nrm`, srgb: false, aniso: 4, flip: true });
    const ormMap = makeDataTexture(T, px.orm, px.w, px.h, { name: `rock-${key}-orm`, srgb: false, aniso: 4, flip: true });
    const colRgh = makeDataTexture(T, px.colRgh, px.w, px.h, { name: `rock-${key}-tricol`, srgb: false, aniso: 8, flip: false });
    const nrmAoH = makeDataTexture(T, px.nrmAoH, px.w, px.h, { name: `rock-${key}-trinrm`, srgb: false, aniso: 8, flip: false });
    for (const tex of [map, normalMap, ormMap, colRgh, nrmAoH]) if (tex) textures.push(tex);
    totalMs += (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    return {
      key,
      map,
      normalMap,
      ormMap,
      colRgh,
      nrmAoH,
      normalScale: T.Vector2 ? new T.Vector2(spec.normalScale, spec.normalScale) : { x: spec.normalScale, y: spec.normalScale },
      aoIntensity: spec.aoIntensity,
      triScale: spec.triScale,
      triNormal: spec.triNormal,
      strataAmt: spec.strataAmt,
    };
  };

  lib = { textures, get buildMs() { return Math.round(totalMs); } };
  for (const key of ROCK_GEOLOGIES) {
    let built = null;
    Object.defineProperty(lib, key, {
      enumerable: true,
      get() {
        if (!built) built = buildOne(key);
        return built;
      },
    });
  }
  LIB_CACHE.set(T, lib);
  return lib;
}

// Apply a standard PBR rock bundle onto a MeshStandardMaterial (WebGL & direct meshes)
export function applyRockPBR(mat, pbr, { selfColored = false, normalMul = 1.0, roughnessMul = 1.0, aoMul = 1.0, repeat = null } = {}) {
  if (!mat || !pbr) return mat;
  if (pbr.map) {
    mat.map = pbr.map;
    if (selfColored && mat.color && typeof mat.color.setHex === 'function') {
      mat.color.setHex(0xffffff);
    }
  }
  if (pbr.normalMap) {
    mat.normalMap = pbr.normalMap;
    if (mat.normalScale && typeof mat.normalScale.set === 'function') {
      mat.normalScale.set(pbr.normalScale.x * normalMul, pbr.normalScale.y * normalMul);
    }
  }
  if (pbr.ormMap) {
    mat.roughnessMap = pbr.ormMap;
    mat.metalnessMap = pbr.ormMap;
    mat.aoMap = pbr.ormMap;
    mat.aoMapIntensity = pbr.aoIntensity * aoMul;
    mat.roughness = roughnessMul;
    mat.metalness = 1.0;
  }
  if (repeat && pbr.map && pbr.map.repeat && typeof pbr.map.repeat.set === 'function') {
    pbr.map.repeat.set(repeat[0], repeat[1]);
    if (pbr.normalMap?.repeat) pbr.normalMap.repeat.set(repeat[0], repeat[1]);
    if (pbr.ormMap?.repeat) pbr.ormMap.repeat.set(repeat[0], repeat[1]);
  }
  mat.needsUpdate = true;
  return mat;
}

// Build a WebGPU TSL Triplanar PBR MeshStandardNodeMaterial for a geological species
// (zero UV seams, world-space triplanar detail + per-rock phase jitter + moss/lichen + dynamic rain wetness!).
// Falls back cleanly to PBR MeshStandardMaterial when TSL / NodeMaterial is unavailable (WebGL / Node).
export function createRockMaterial(T, TSL, geologyKey, {
  macroTex = null,
  wetUniform = null,
  toViewNormal = null,
  doubleSide = false,
  scaleMul = 1.0,
  normalMul = 1.0,
  wetnessBias = 0.0,
  metalness = 0.03,
  useRockPhase = false,
  nodeAllowed = true,
} = {}) {
  const lib = getRockTextureLibrary(T);
  const pbr = lib && lib[geologyKey] ? lib[geologyKey] : null;

  if (nodeAllowed && TSL && T.MeshStandardNodeMaterial && pbr && pbr.colRgh && pbr.nrmAoH) {
    try {
      const {
        attribute, vec2, vec3, vec4, float, smoothstep, positionWorld, cameraPosition,
        texture, normalWorld, abs, mix, sin, normalize, clamp, max, pow
      } = TSL;
      const near = float(1.0).sub(smoothstep(18.0, 88.0, positionWorld.sub(cameraPosition).length()));
      // Sharp triplanar blend weights (pow 4 minimizes muddy triple-blend across angled rock edges!)
      const aw = pow(abs(normalWorld).add(0.001), vec3(4.0, 4.0, 4.0));
      const ws = aw.x.add(aw.y).add(aw.z);

      // Optional per-rock deterministic offset encoded in uv2/uv so neighbouring rocks never repeat!
      const pBase = useRockPhase
        ? positionWorld.add(vec3(attribute('uv', 'vec2').x, float(0.0), attribute('uv', 'vec2').y))
        : positionWorld;

      const tri = (tex, sc) => {
        const p = pBase.mul(sc);
        const a = texture(tex, vec2(p.z, p.y));
        const b = texture(tex, vec2(p.x, p.z));
        const c = texture(tex, vec2(p.x, p.y));
        return a.mul(aw.x).add(b.mul(aw.y)).add(c.mul(aw.z)).div(ws);
      };

      const sc = pbr.triScale * scaleMul;
      const sCol = tri(pbr.colRgh, sc);
      const sNrm = tri(pbr.nrmAoH, sc);

      // Broad macro geological breakup (prevents any repetition on massive erratics & cave walls)
      const broad = macroTex ? tri(macroTex, sc * 0.24) : tri(pbr.nrmAoH, sc * 0.28);
      const strataWave = sin(pBase.y.mul(geologyKey === 'sandstone' ? 3.2 : geologyKey === 'schist' ? 4.1 : 1.4).add(broad.b.mul(5.8)).add(broad.r.mul(3.1))).mul(0.5).add(0.5);
      const strataMod = strataWave.sub(0.5).mul(pbr.strataAmt * 2.0).add(1.0);
      const macroTone = broad.r.sub(0.5).mul(0.18).add(1.0);

      // Triplanar detail albedo modulation around 1.0 (sCol.rgb * 2.0), distance-faded cleanly to prevent shimmer
      const detailFade = near.mul(0.76).add(0.24);
      const grain = mix(vec3(1.0, 1.0, 1.0), sCol.rgb.mul(2.0), detailFade);
      const cavityAo = clamp(mix(float(1.0), sNrm.b.mul(1.05), near.mul(0.62).add(0.22)), 0.46, 1.04);

      // Dynamic rain wetness + permanent wet-cave/shore bias: porous rock darkens & gets a damp sheen
      const wetAmt = clamp(
        (wetUniform ? clamp(wetUniform, 0.0, 1.0) : float(0.0)).add(float(wetnessBias)),
        0.0, 1.0
      );
      // Up-facing rock surfaces & crevices catch more rain
      const rainCatch = clamp(normalWorld.y.mul(0.55).add(0.55).sub(sNrm.a.mul(0.22)), 0.20, 1.0);
      const effWet = wetAmt.mul(rainCatch);
      const wetDark = mix(float(1.0), float(0.66), effWet);

      const vCol = attribute('color', 'vec3');
      const finalCol = vCol.mul(grain).mul(cavityAo).mul(strataMod).mul(macroTone).mul(wetDark);

      // Triplanar world-space normal perturbation
      const nAmp = near.mul(0.76).add(0.24).mul(pbr.triNormal * normalMul);
      const dnx = sNrm.r.mul(2.0).sub(1.0).mul(nAmp);
      const dnz = sNrm.g.mul(2.0).sub(1.0).mul(nAmp);
      const dny = sNrm.a.sub(0.5).mul(0.24).mul(nAmp);
      const pertWorld = normalize(normalWorld.add(vec3(dnx, dny, dnz)));

      const mat = new T.MeshStandardNodeMaterial({
        roughness: 0.88,
        metalness: geologyKey === 'schist' ? 0.07 : geologyKey === 'ironstone' ? 0.06 : metalness,
      });
      mat.name = `rock-pbr-${geologyKey}`;
      mat.colorNode = vec4(finalCol, 1.0);
      const baseRough = sCol.a;
      const wetRough = mix(baseRough, max(float(0.22), baseRough.mul(0.46)), effWet);
      mat.roughnessNode = clamp(wetRough, 0.22, 0.97);
      if (toViewNormal) {
        mat.normalNode = toViewNormal(pertWorld);
      } else if (TSL.cameraViewMatrix && typeof TSL.cameraViewMatrix.transformDirection === 'function') {
        mat.normalNode = TSL.cameraViewMatrix.transformDirection(pertWorld).normalize();
      }
      if (doubleSide) mat.side = T.DoubleSide;
      if (!mat.userData) mat.userData = {};
      mat.userData.rockGeology = geologyKey;
      mat.userData.rockPbr = true;
      return mat;
    } catch (_err) {
      // Fall through cleanly to MeshStandardMaterial PBR fallback
    }
  }

  // Standard PBR fallback (WebGL & Node tests)
  const mat = new T.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.90,
    metalness: geologyKey === 'schist' ? 0.06 : metalness,
    ...(doubleSide ? { side: T.DoubleSide } : {}),
  });
  mat.name = `rock-pbr-${geologyKey}-std`;
  if (pbr) applyRockPBR(mat, pbr, { selfColored: false, normalMul });
  if (!mat.userData) mat.userData = {};
  mat.userData.rockGeology = geologyKey;
  mat.userData.rockPbr = !!(pbr && (pbr.map || pbr.colRgh));
  return mat;
}

export const _TEST_SYNTH = Object.freeze({
  synthGranite,
  synthBasalt,
  synthSandstone,
  synthLimestone,
  synthSchist,
  synthIronstone,
  synthWetBasalt,
  synthRiverCobble,
  synthMonolith,
  synthFieldstone,
  synthMarrowChalk,
});

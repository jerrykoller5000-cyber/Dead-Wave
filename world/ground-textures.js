// world/ground-textures.js — AH-9: Procedural PBR ground texture library for the main game world.
// Produces matched, seamlessly tileable, deterministic PBR maps strictly adhering to
// docs/art-direction.md (worn military realism + eerie folklore, natural base saturation <45%)
// and docs/asset-principles.md (macro/medium/micro hierarchy, purposeful wear, honest roughness,
// no raw Voronoi mosaics, verified OpenGL normal conventions).

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

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

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

// Fast ridged multifractal grid (great for natural rock fractures, erosion gullies & organic soil creases!)
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

export function flipRowsRGBA(src, w, h) {
  const out = new Uint8Array(src.length);
  const row = w * 4;
  for (let y = 0; y < h; y++) {
    out.set(src.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
  }
  return out;
}

// Sobel OpenGL tangent-space normal map from top-down canvas-order Float32Array heightfield.
export function heightToNormalRGBA(height, w, h, strength = 2.6, wrapX = true, wrapY = true) {
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

// World-XZ normal + micro-AO + height packer (flip = false -> pixel (x,y) maps directly to world (+X,+Z))
function packTerrainNrmAoH(height, ao, N, strength = 2.6) {
  const out = new Uint8Array(N * N * 4);
  const mask = N - 1;
  for (let y = 0; y < N; y++) {
    const ym = (y - 1) & mask, yp = (y + 1) & mask;
    const r0 = ym * N, r1 = y * N, r2 = yp * N;
    for (let x = 0; x < N; x++) {
      const xm = (x - 1) & mask, xp = (x + 1) & mask;
      const tl = height[r0 + xm], t = height[r0 + x], tr = height[r0 + xp];
      const l = height[r1 + xm], c = height[r1 + x], r = height[r1 + xp];
      const bl = height[r2 + xm], b = height[r2 + x], br = height[r2 + xp];
      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dZ = (bl + 2 * b + br) - (tl + 2 * t + tr);
      let nx = -dX * strength;
      let nz = -dZ * strength;
      const ny = 1.0;
      const inv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
      nx *= inv; nz *= inv;
      const avg = (tl + t + tr + l + r + bl + b + br) * 0.125;
      const cavity = clamp(1.0 + (c - avg) * 1.4, 0.56, 1.08);
      const aoFinal = clamp((ao ? ao[r1 + x] : 1.0) * cavity, 0.36, 1.0);
      const o = (r1 + x) * 4;
      out[o] = clamp(Math.round((nx * 0.5 + 0.5) * 255), 0, 255);
      out[o + 1] = clamp(Math.round((nz * 0.5 + 0.5) * 255), 0, 255);
      out[o + 2] = clamp(Math.round(aoFinal * 255), 0, 255);
      out[o + 3] = clamp(Math.round(clamp(c, 0, 1) * 255), 0, 255);
    }
  }
  return out;
}

export function makeDataTexture(T, rgba, w, h, {
  name = 'ground-pbr',
  srgb = false,
  wrapS = 'repeat',
  wrapT = 'repeat',
  aniso = 8,
  flip = true,
} = {}) {
  if (!T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  const buf = flip ? flipRowsRGBA(rgba, w, h) : new Uint8Array(rgba);
  const tex = new T.DataTexture(buf, w, h, T.RGBAFormat, T.UnsignedByteType);
  tex.name = name;
  if (srgb && T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  else if (T.NoColorSpace) tex.colorSpace = T.NoColorSpace;
  tex.wrapS = wrapS === 'clamp' ? T.ClampToEdgeWrapping : T.RepeatWrapping;
  tex.wrapT = wrapT === 'clamp' ? T.ClampToEdgeWrapping : T.RepeatWrapping;
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

// Normalize RGB multiplier buffer to luminance ~1.0 and store scaled by 0.5 in UNORM8 [0..2.0].
function packNormalizedColRgh(rf, gf, bf, rghf, N, gain = 1.0) {
  let sr = 0, sg = 0, sb = 0;
  const total = N * N;
  for (let i = 0; i < total; i++) { sr += rf[i]; sg += gf[i]; sb += bf[i]; }
  const mlum = ((sr * 0.299 + sg * 0.587 + sb * 0.114) / total) || 1;
  const k = 1 / mlum;
  const out = new Uint8Array(total * 4);
  for (let i = 0; i < total; i++) {
    const rr = 1.0 + (rf[i] * k - 1.0) * gain;
    const gg = 1.0 + (gf[i] * k - 1.0) * gain;
    const bb = 1.0 + (bf[i] * k - 1.0) * gain;
    const o = i * 4;
    out[o] = clamp(Math.round(clamp(rr * 0.5, 0.05, 0.99) * 255), 0, 255);
    out[o + 1] = clamp(Math.round(clamp(gg * 0.5, 0.05, 0.99) * 255), 0, 255);
    out[o + 2] = clamp(Math.round(clamp(bb * 0.5, 0.05, 0.99) * 255), 0, 255);
    out[o + 3] = clamp(Math.round(clamp(rghf[i], 0.08, 0.99) * 255), 0, 255);
  }
  return out;
}

// Helper: stamp an angular crushed stone/chip with irregular polygon jitter (NEVER uniform Voronoi!)
function stampRockChip(rf, gf, bf, height, ao, rgh, N, cx, cy, rx, ry, ang, pr, pg, pb, baseLift, sharp, chipRgh, seed) {
  const mask = N - 1;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R = Math.ceil(Math.max(rx, ry) * 1.35 + 2);
  const ix = Math.round(cx), iy = Math.round(cy);
  const f1 = (seed * 3.17) % 6.28, f2 = (seed * 7.31) % 6.28;
  const a3 = 0.14 + (seed % 0.12), a5 = 0.08 + ((seed * 3.7) % 0.08);
  const tiltX = Math.cos(f1) * 0.16, tiltY = Math.sin(f1) * 0.16;

  for (let dy = -R; dy <= R; dy++) {
    const yy = (iy + dy) & mask;
    for (let dx = -R; dx <= R; dx++) {
      const lx = dx * ca + dy * sa;
      const ly = -dx * sa + dy * ca;
      const theta = Math.atan2(ly, lx);
      // Angular natural fracture silhouette (3-lobed & 5-lobed asymmetry)
      const wobble = 1.0 + a3 * Math.cos(theta * 3 + f1) + a5 * Math.sin(theta * 5 + f2);
      const q = ((lx / (rx * wobble)) ** 2) + ((ly / (ry * wobble)) ** 2);
      const xx = (ix + dx) & mask;
      const idx = yy * N + xx;
      if (q < 1.0) {
        const bevel = sharp
          ? sstep(1.0, 0.52, q) * (0.78 + 0.22 * (1 - q))
          : Math.sqrt(1.0 - q);
        // Planar chipped rock face tilt + fine mineral facet noise
        const faceTilt = 1.0 + (lx / (rx + 1)) * tiltX + (ly / (ry + 1)) * tiltY;
        const ph = clamp(0.24 + baseLift * bevel * faceTilt, 0.08, 0.99);
        if (ph >= height[idx] - 0.04) {
          const w = sstep(1.0, 0.68, q);
          const lit = 0.88 + 0.18 * bevel * faceTilt + (hash2i(xx, yy, 991) - 0.5) * 0.09;
          rf[idx] = lerp(rf[idx], pr * lit, w);
          gf[idx] = lerp(gf[idx], pg * lit, w);
          bf[idx] = lerp(bf[idx], pb * lit, w);
          height[idx] = Math.max(height[idx], ph);
          ao[idx] = lerp(ao[idx], 0.72 + 0.28 * bevel, w * 0.85);
          rgh[idx] = lerp(rgh[idx], chipRgh + (1 - bevel) * 0.12, w);
        }
      } else if (q < 1.55) {
        // Subtle shadowed bedding rim right around the stone's base
        const rim = (1 - (q - 1.0) / 0.55) * 0.26;
        ao[idx] *= (1 - rim);
        height[idx] = Math.max(0.05, height[idx] - rim * 0.05);
      }
    }
  }
}

// =========================================================================
// 1. GRASS / DENSE ALPINE MEADOW TURF (512x512, ~2.1 m tile)
// Continuous dense woven grass-blade carpet — zero smooth blurry bald patches!
// =========================================================================
export function synthGrassBuffers(N = 512) {
  const rf = new Float32Array(N * N), gf = new Float32Array(N * N), bf = new Float32Array(N * N);
  const rgh = new Float32Array(N * N), height = new Float32Array(N * N), ao = new Float32Array(N * N);
  const gSoil = makeFbmGrid(128, 8, 8, 101, 3, 0.55);
  const gClump = makeFbmGrid(128, 18, 18, 137, 3, 0.52);
  const gFine = makeFbmGrid(128, 52, 52, 179, 2, 0.5);

  // Underlay: dense fibrous mossy thatch + shaded root-bed (never smooth plastic!)
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const s = gSoil(u, v), cl = gClump(u, v), fn = gFine(u, v);
      const grain = (hash2i(x, y, 211) - 0.5) * 0.14;
      const thatch = sstep(0.18, 0.76, cl * 0.65 + s * 0.35);
      rf[i] = lerp(0.72, 0.90, thatch) + (s - 0.5) * 0.10 + grain;
      gf[i] = lerp(0.70, 0.94, thatch) + (cl - 0.5) * 0.12 + grain;
      bf[i] = lerp(0.54, 0.74, thatch) + (fn - 0.5) * 0.08 + grain;
      height[i] = 0.12 + thatch * 0.20 + (fn - 0.5) * 0.12 + grain * 0.35;
      ao[i] = 0.56 + thatch * 0.18;
      rgh[i] = 0.95 - thatch * 0.04 + (fn - 0.5) * 0.05;
    }
  }

  const rnd = makeRng(0x67a55202);
  const mask = N - 1;
  const scale = N / 512;

  const drawBlade = (ox, oy, ang0, len, curl, baseW, hPeak, cr, cg, cb, bRgh) => {
    const steps = Math.max(4, Math.ceil(len * 1.25));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const ang = ang0 + curl * t * t;
      const px = ox + Math.cos(ang) * len * t;
      const py = oy + Math.sin(ang) * len * t;
      const w = Math.max(0.5, baseW * (1 - t * 0.68));
      const bh = lerp(0.26, hPeak, Math.pow(t, 0.62)) * (1 - t * 0.10);
      const tipLift = 0.74 + t * 0.42;
      const r0 = Math.ceil(w);
      const ix = Math.round(px), iy = Math.round(py);
      for (let dy = -r0; dy <= r0; dy++) {
        const yy = (iy + dy) & mask;
        for (let dx = -r0; dx <= r0; dx++) {
          const dist = Math.hypot(dx, dy);
          if (dist > w + 0.35) continue;
          const cov = clamp(1 - dist / (w + 0.35), 0, 1);
          const xx = (ix + dx) & mask;
          const idx = yy * N + xx;
          const hHere = bh * (0.76 + 0.24 * cov);
          if (hHere >= height[idx] - 0.04) {
            const blend = clamp(cov * 0.86, 0, 1);
            rf[idx] = lerp(rf[idx], cr * tipLift, blend);
            gf[idx] = lerp(gf[idx], cg * tipLift, blend);
            bf[idx] = lerp(bf[idx], cb * tipLift, blend);
            height[idx] = Math.max(height[idx], hHere);
            ao[idx] = lerp(ao[idx], lerp(0.58, 1.0, t), blend);
            rgh[idx] = lerp(rgh[idx], bRgh, blend);
          }
        }
      }
    }
  };

  // Pass 1: Continuous short dense under-turf carpet covering 100% of the tile (~6,200 fine blades)
  const underCount = Math.round(6200 * scale * scale);
  for (let k = 0; k < underCount; k++) {
    const ox = rnd() * N, oy = rnd() * N;
    const u = ox / N, v = oy / N;
    const cl = gClump(u, v);
    // Subtle prevailing wind sweep + natural randomness so turf feels alive, not static noise
    const windAng = (gSoil(u, v) - 0.5) * 1.4 + (rnd() - 0.5) * Math.PI * 2;
    const len = (4.5 + rnd() * 6.0) * scale;
    const dry = rnd() < (0.14 + (1 - cl) * 0.14);
    const cr = dry ? 1.16 : lerp(0.86, 1.02, rnd());
    const cg = dry ? 1.05 : lerp(0.98, 1.14, rnd());
    const cb = dry ? 0.72 : lerp(0.72, 0.84, rnd());
    drawBlade(ox, oy, windAng, len, (rnd() - 0.5) * 0.55, (0.78 + rnd() * 0.42) * scale, 0.44 + rnd() * 0.26, cr, cg, cb, dry ? 0.94 : 0.88);
  }

  // Pass 2: ~180 taller alpine grass tufts & dry straw clumps (~2,600 overlapping blades)
  const clumps = Math.round(180 * scale * scale);
  for (let c = 0; c < clumps; c++) {
    const cx = rnd() * N, cy = rnd() * N;
    const isDryClump = rnd() < 0.26;
    const blades = 11 + Math.floor(rnd() * 8);
    for (let b = 0; b < blades; b++) {
      const a0 = rnd() * Math.PI * 2;
      const ox = cx + (rnd() - 0.5) * (N * 0.045);
      const oy = cy + (rnd() - 0.5) * (N * 0.045);
      const len = (7.0 + rnd() * 10.5) * scale;
      const dry = isDryClump ? (rnd() < 0.58) : (rnd() < 0.16);
      const fresh = !dry && rnd() < 0.35;
      const cr = dry ? 1.24 : fresh ? 0.94 : 0.98;
      const cg = dry ? 1.10 : fresh ? 1.14 : 1.08;
      const cb = dry ? 0.72 : fresh ? 0.80 : 0.78;
      drawBlade(ox, oy, a0, len, (rnd() - 0.5) * 0.75, (0.9 + rnd() * 0.55) * scale, 0.62 + rnd() * 0.34, cr, cg, cb, dry ? 0.93 : 0.84);
    }
  }

  // Pass 3: Subtle clover clusters & dry weed seedheads
  const specks = Math.round(280 * scale * scale);
  for (let k = 0; k < specks; k++) {
    const sx = Math.floor(rnd() * N), sy = Math.floor(rnd() * N);
    const clover = rnd() < 0.68;
    const rad = (clover ? 1.5 : 1.1) * scale;
    const r0 = Math.ceil(rad);
    for (let dy = -r0; dy <= r0; dy++) {
      const yy = (sy + dy) & mask;
      for (let dx = -r0; dx <= r0; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > rad) continue;
        const xx = (sx + dx) & mask;
        const idx = yy * N + xx;
        const w = (1 - d / rad) * 0.52;
        rf[idx] = lerp(rf[idx], clover ? 0.86 : 1.24, w);
        gf[idx] = lerp(gf[idx], clover ? 1.12 : 1.15, w);
        bf[idx] = lerp(bf[idx], clover ? 0.76 : 0.82, w);
        height[idx] = Math.max(height[idx], 0.74 + w * 0.14);
      }
    }
  }

  return {
    colRgh: packNormalizedColRgh(rf, gf, bf, rgh, N, 1.12),
    nrmAoH: packTerrainNrmAoH(height, ao, N, 2.75),
    w: N, h: N,
  };
}

// =========================================================================
// 2. DIRT / PACKED ALPINE TRAIL SOIL & LOAM (512x512, ~2.4 m tile)
// Granular compacted earth, organic clods, soft erosion creases & embedded grit/pebbles
// (NO fake geometric desert-crack Voronoi cells!)
// =========================================================================
export function synthDirtBuffers(N = 512) {
  const rf = new Float32Array(N * N), gf = new Float32Array(N * N), bf = new Float32Array(N * N);
  const rgh = new Float32Array(N * N), height = new Float32Array(N * N), ao = new Float32Array(N * N);
  const gBroad = makeFbmGrid(128, 6, 6, 307, 3, 0.56);
  const gMid = makeFbmGrid(128, 18, 18, 353, 3, 0.54);
  const gFine = makeFbmGrid(128, 56, 56, 401, 2, 0.52);
  const gErode = makeRidgedGrid(128, 8, 8, 431, 3, 0.52);
  const gWarp = makeFbmGrid(64, 6, 6, 463, 2, 0.5);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.08;
      const wy = (gWarp(u + 0.37, v + 0.61) - 0.5) * 0.08;
      const b = gBroad(u, v), m = gMid(u + wx, v + wy), fn = gFine(u, v);
      const er = gErode(u + wx * 1.4, v + wy * 1.4);
      const sand = (hash2i(x, y, 503) - 0.5) * 0.16;
      const microClod = (hash2i(x >> 1, y >> 1, 521) - 0.5) * 0.12;
      // Soft rainwater-washed rills & packed soil undulations
      const rill = sstep(0.68, 0.94, er) * 0.16;
      const h = 0.36 + (b - 0.5) * 0.22 + (m - 0.5) * 0.22 + (fn - 0.5) * 0.16 - rill + sand * 0.24 + microClod * 0.28;
      const dryTop = sstep(0.24, 0.72, h);
      const tone = lerp(0.74, 1.14, dryTop) * (1 - rill * 0.55) + sand * 0.55 + microClod * 0.45;
      rf[i] = tone * 1.04;
      gf[i] = tone * 0.99;
      bf[i] = tone * 0.92;
      height[i] = clamp(h, 0.06, 0.94);
      ao[i] = clamp(0.72 + dryTop * 0.26 - rill * 0.45, 0.42, 1.0);
      rgh[i] = clamp(0.94 - (1 - dryTop) * 0.10 + (fn - 0.5) * 0.06, 0.74, 0.98);
    }
  }

  const rnd = makeRng(0xd1275022);
  const scale = N / 512;

  // Stamp ~220 organic earthy soil clods (slightly darker/lighter compacted lumps)
  const clods = Math.round(220 * scale * scale);
  for (let k = 0; k < clods; k++) {
    const cx = rnd() * N, cy = rnd() * N;
    const rx = (2.8 + rnd() * 5.2) * scale, ry = rx * (0.65 + rnd() * 0.4);
    const t = 0.88 + rnd() * 0.24;
    stampRockChip(rf, gf, bf, height, ao, rgh, N, cx, cy, rx, ry, rnd() * Math.PI, t * 1.04, t * 0.98, t * 0.88, 0.24 + rnd() * 0.16, false, 0.93, rnd());
  }

  // Stamp ~520 angular trail stones, coarse grit & sand pebbles (multi-scale, embedded!)
  const pebs = Math.round(520 * scale * scale);
  for (let p = 0; p < pebs; p++) {
    const cx = rnd() * N, cy = rnd() * N;
    const tier = rnd();
    const rx = (tier < 0.08 ? 3.8 + rnd() * 3.6 : tier < 0.35 ? 1.8 + rnd() * 2.0 : 0.9 + rnd() * 1.1) * scale;
    const ry = rx * (0.55 + rnd() * 0.45);
    const kind = rnd();
    const pr = kind < 0.32 ? 1.16 : kind < 0.68 ? 0.96 : 0.78;
    const pg = kind < 0.32 ? 1.12 : kind < 0.68 ? 0.98 : 0.80;
    const pb = kind < 0.32 ? 1.04 : kind < 0.68 ? 1.00 : 0.84;
    const lift = tier < 0.08 ? 0.46 + rnd() * 0.22 : tier < 0.35 ? 0.34 + rnd() * 0.16 : 0.24 + rnd() * 0.12;
    stampRockChip(rf, gf, bf, height, ao, rgh, N, cx, cy, rx, ry, rnd() * Math.PI, pr, pg, pb, lift, true, 0.78, rnd());
  }

  // Faint embedded rootlets & dry grass fibers (~120)
  const mask = N - 1;
  const fibers = Math.round(120 * scale * scale);
  for (let f = 0; f < fibers; f++) {
    const x0 = rnd() * N, y0 = rnd() * N;
    const ang = rnd() * Math.PI * 2, len = (6 + rnd() * 11) * scale, curl = (rnd() - 0.5) * 0.8;
    const steps = Math.ceil(len * 1.2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = Math.round(x0 + Math.cos(ang + curl * t) * len * t) & mask;
      const py = Math.round(y0 + Math.sin(ang + curl * t) * len * t) & mask;
      const idx = py * N + px;
      rf[idx] = lerp(rf[idx], 1.12, 0.45);
      gf[idx] = lerp(gf[idx], 0.98, 0.45);
      bf[idx] = lerp(bf[idx], 0.74, 0.45);
      height[idx] = Math.max(height[idx], 0.54);
    }
  }

  return {
    colRgh: packNormalizedColRgh(rf, gf, bf, rgh, N, 1.14),
    nrmAoH: packTerrainNrmAoH(height, ao, N, 2.85),
    w: N, h: N,
  };
}

// =========================================================================
// 3. FOREST FLOOR DUFF — DENSE PINE NEEDLES, CURLED FALLEN LEAVES, MOSS & TWIGS
// =========================================================================
export function synthDuffBuffers(N = 512) {
  const rf = new Float32Array(N * N), gf = new Float32Array(N * N), bf = new Float32Array(N * N);
  const rgh = new Float32Array(N * N), height = new Float32Array(N * N), ao = new Float32Array(N * N);
  const gHumus = makeFbmGrid(128, 7, 7, 601, 3, 0.56);
  const gMoss = makeFbmGrid(128, 12, 12, 647, 3, 0.55);
  const gFine = makeFbmGrid(128, 48, 48, 683, 2, 0.52);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const hu = gHumus(u, v), mo = gMoss(u, v), fn = gFine(u, v);
      const grain = (hash2i(x, y, 719) - 0.5) * 0.14;
      const mossPatch = sstep(0.56, 0.76, mo) * (0.55 + 0.45 * fn);
      const base = 0.64 + hu * 0.24 + (fn - 0.5) * 0.12 + grain;
      rf[i] = lerp(base * 1.06, 0.76 + fn * 0.18, mossPatch);
      gf[i] = lerp(base * 0.90, 1.02 + fn * 0.20, mossPatch);
      bf[i] = lerp(base * 0.70, 0.66 + fn * 0.12, mossPatch);
      height[i] = 0.14 + hu * 0.16 + mossPatch * 0.26 + (fn - 0.5) * 0.12 + grain * 0.25;
      ao[i] = 0.56 + hu * 0.18 + mossPatch * 0.18;
      rgh[i] = clamp(0.95 - mossPatch * 0.03 + (fn - 0.5) * 0.05, 0.82, 0.98);
    }
  }

  const rnd = makeRng(0xf02e57d2);
  const mask = N - 1;
  const scale = N / 512;

  // Dense matted pine needle carpet (~5,400 crisscrossed needles in natural drifts)
  const needles = Math.round(5400 * scale * scale);
  for (let k = 0; k < needles; k++) {
    const x0 = rnd() * N, y0 = rnd() * N;
    const ang = rnd() * Math.PI * 2;
    const len = (5.0 + rnd() * 9.0) * scale;
    const steps = Math.max(4, Math.ceil(len * 1.25));
    const tone = rnd();
    const nr = tone < 0.36 ? 1.26 : tone < 0.70 ? 1.12 : tone < 0.88 ? 0.96 : 0.80;
    const ng = tone < 0.36 ? 0.92 : tone < 0.70 ? 0.90 : tone < 0.88 ? 0.86 : 0.74;
    const nb = tone < 0.36 ? 0.58 : tone < 0.70 ? 0.60 : tone < 0.88 ? 0.66 : 0.58;
    const nh = 0.30 + rnd() * 0.44;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = Math.round(x0 + Math.cos(ang) * len * t) & mask;
      const py = Math.round(y0 + Math.sin(ang) * len * t) & mask;
      const idx = py * N + px;
      const hHere = nh * (0.86 + 0.14 * Math.sin(t * Math.PI));
      if (hHere >= height[idx] - 0.06) {
        rf[idx] = lerp(rf[idx], nr, 0.80);
        gf[idx] = lerp(gf[idx], ng, 0.80);
        bf[idx] = lerp(bf[idx], nb, 0.80);
        height[idx] = Math.max(height[idx], hHere);
        ao[idx] = lerp(ao[idx], 0.86, 0.55);
        rgh[idx] = lerp(rgh[idx], 0.82, 0.65);
      }
    }
  }

  // Dense scattered fallen curled woodland leaves (~520 multi-size natural autumn/oak/birch leaves)
  const leaves = Math.round(520 * scale * scale);
  for (let k = 0; k < leaves; k++) {
    const cx = rnd() * N, cy = rnd() * N;
    const rx = (2.8 + rnd() * 4.8) * scale;
    const ry = rx * (0.44 + rnd() * 0.28);
    const ang = rnd() * Math.PI * 2;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pal = rnd();
    // Muted natural russet, weathered ochre, oak brown, damp dark leaf
    const lr = pal < 0.28 ? 1.30 : pal < 0.56 ? 1.18 : pal < 0.80 ? 1.00 : 0.82;
    const lg = pal < 0.28 ? 0.84 : pal < 0.56 ? 0.98 : pal < 0.80 ? 0.88 : 0.72;
    const lb = pal < 0.28 ? 0.50 : pal < 0.56 ? 0.60 : pal < 0.80 ? 0.60 : 0.52;
    const lh = 0.50 + rnd() * 0.44;
    const R = Math.ceil(rx + 1.5);
    const ix = Math.round(cx), iy = Math.round(cy);
    for (let dy = -R; dy <= R; dy++) {
      const yy = (iy + dy) & mask;
      for (let dx = -R; dx <= R; dx++) {
        const lx = (dx * ca + dy * sa) / rx;
        const ly = (-dx * sa + dy * ca) / ry;
        const wAtX = Math.max(0.01, 1 - lx * lx);
        if (Math.abs(lx) > 1.0 || Math.abs(ly) > wAtX) continue;
        const xx = (ix + dx) & mask;
        const idx = yy * N + xx;
        const edge = 1 - Math.abs(ly) / wAtX;
        const curl = 0.82 + 0.18 * (1 - edge) + (Math.abs(ly) < 0.16 ? 0.08 : 0);
        const hHere = lh * curl;
        if (hHere >= height[idx] - 0.05) {
          const w = clamp(edge * 2.6, 0, 1);
          const veinDark = Math.abs(ly) < 0.14 ? 0.88 : 1.0;
          rf[idx] = lerp(rf[idx], lr * veinDark, w * 0.88);
          gf[idx] = lerp(gf[idx], lg * veinDark, w * 0.88);
          bf[idx] = lerp(bf[idx], lb * veinDark, w * 0.88);
          height[idx] = Math.max(height[idx], hHere);
          ao[idx] = lerp(ao[idx], 0.90, w * 0.7);
          rgh[idx] = lerp(rgh[idx], 0.76 + (1 - edge) * 0.10, w);
        }
      }
    }
  }

  // Bark chips & fallen woodland twigs (~90)
  const twigs = Math.round(90 * scale * scale);
  for (let k = 0; k < twigs; k++) {
    const x0 = rnd() * N, y0 = rnd() * N;
    const ang = rnd() * Math.PI * 2;
    const len = (7 + rnd() * 14) * scale;
    const thick = (0.9 + rnd() * 0.85) * scale;
    const steps = Math.ceil(len * 1.25);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = Math.round(x0 + Math.cos(ang) * len * t);
      const py = Math.round(y0 + Math.sin(ang) * len * t);
      const r0 = Math.ceil(thick);
      for (let dy = -r0; dy <= r0; dy++) for (let dx = -r0; dx <= r0; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > thick + 0.3) continue;
        const idx = ((py + dy) & mask) * N + ((px + dx) & mask);
        const dome = Math.sqrt(Math.max(0, 1 - (d / (thick + 0.3)) ** 2));
        rf[idx] = lerp(rf[idx], 0.76 + dome * 0.18, 0.85);
        gf[idx] = lerp(gf[idx], 0.66 + dome * 0.14, 0.85);
        bf[idx] = lerp(bf[idx], 0.54 + dome * 0.10, 0.85);
        height[idx] = Math.max(height[idx], 0.64 + dome * 0.30);
        rgh[idx] = lerp(rgh[idx], 0.92, 0.8);
      }
    }
  }

  return {
    colRgh: packNormalizedColRgh(rf, gf, bf, rgh, N, 1.12),
    nrmAoH: packTerrainNrmAoH(height, ao, N, 2.9),
    w: N, h: N,
  };
}

// =========================================================================
// 4. STONE / CRUSHED GRAVEL / SHINGLE / STRATIFIED ROCK (512x512)
// Real overlapping angular crushed aggregate bedded in compacted stone dust & strata
// (ZERO raw Voronoi giraffe-cell outlines!)
// =========================================================================
export function synthStoneBuffers(N = 512) {
  const rf = new Float32Array(N * N), gf = new Float32Array(N * N), bf = new Float32Array(N * N);
  const rgh = new Float32Array(N * N), height = new Float32Array(N * N), ao = new Float32Array(N * N);
  const gBed = makeFbmGrid(128, 7, 7, 809, 3, 0.56);
  const gFine = makeFbmGrid(128, 42, 42, 853, 2, 0.52);
  const gFract = makeRidgedGrid(128, 9, 9, 887, 3, 0.55);
  const gWarp = makeFbmGrid(64, 6, 6, 919, 2, 0.5);

  // Dusty crushed-stone binder underlay with subtle horizontal bedding & fracture lines
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.08;
      const wy = (gWarp(u + 0.41, v + 0.23) - 0.5) * 0.08;
      const bed = gBed(u, v), fn = gFine(u, v);
      const frac = gFract(u + wx, v + wy);
      const strata = Math.sin(v * 25.13 + bed * 4.2) * 0.08;
      const grit = (hash2i(x, y, 947) - 0.5) * 0.16;
      const seam = sstep(0.76, 0.96, frac) * 0.20;
      const base = 0.78 + (bed - 0.5) * 0.22 + (fn - 0.5) * 0.16 + strata - seam + grit * 0.65;
      rf[i] = base * 1.01;
      gf[i] = base * 0.99;
      bf[i] = base * 0.95;
      height[i] = clamp(0.24 + (bed - 0.5) * 0.18 + (fn - 0.5) * 0.14 + strata * 0.5 - seam + grit * 0.20, 0.05, 0.68);
      ao[i] = clamp(0.68 + (bed - 0.5) * 0.18 - seam * 0.6, 0.38, 0.96);
      rgh[i] = clamp(0.94 - (bed - 0.5) * 0.06 + (fn - 0.5) * 0.05, 0.80, 0.98);
    }
  }

  const rnd = makeRng(0x5704e999);
  const scale = N / 512;

  // Layer 1: ~1100 fine crushed stone grit & compacted mineral chips
  const fineCount = Math.round(1100 * scale * scale);
  for (let k = 0; k < fineCount; k++) {
    const cx = rnd() * N, cy = rnd() * N;
    const rx = (1.5 + rnd() * 2.5) * scale, ry = rx * (0.55 + rnd() * 0.45);
    const kind = rnd();
    const pr = kind < 0.30 ? 0.88 : kind < 0.65 ? 1.00 : kind < 0.88 ? 1.07 : 1.15;
    const pg = kind < 0.30 ? 0.89 : kind < 0.65 ? 0.99 : kind < 0.88 ? 1.03 : 1.12;
    const pb = kind < 0.30 ? 0.92 : kind < 0.65 ? 0.95 : kind < 0.88 ? 0.94 : 1.06;
    stampRockChip(rf, gf, bf, height, ao, rgh, N, cx, cy, rx, ry, rnd() * Math.PI, pr, pg, pb, 0.28 + rnd() * 0.22, true, 0.80, rnd());
  }

  // Layer 2: ~520 medium angular crushed aggregate stones / shingle pebbles
  const medCount = Math.round(520 * scale * scale);
  for (let k = 0; k < medCount; k++) {
    const cx = rnd() * N, cy = rnd() * N;
    const rx = (3.4 + rnd() * 4.5) * scale, ry = rx * (0.54 + rnd() * 0.42);
    const kind = rnd();
    const pr = kind < 0.28 ? 0.84 : kind < 0.62 ? 0.98 : kind < 0.86 ? 1.06 : 1.14;
    const pg = kind < 0.28 ? 0.86 : kind < 0.62 ? 0.98 : kind < 0.86 ? 1.02 : 1.11;
    const pb = kind < 0.28 ? 0.90 : kind < 0.62 ? 0.95 : kind < 0.86 ? 0.94 : 1.05;
    stampRockChip(rf, gf, bf, height, ao, rgh, N, cx, cy, rx, ry, rnd() * Math.PI, pr, pg, pb, 0.44 + rnd() * 0.26, true, 0.74, rnd());
  }

  // Layer 3: ~105 larger fractured bedrock slabs / river cobbles for macro relief
  const bigCount = Math.round(105 * scale * scale);
  for (let k = 0; k < bigCount; k++) {
    const cx = rnd() * N, cy = rnd() * N;
    const rx = (6.8 + rnd() * 5.8) * scale, ry = rx * (0.52 + rnd() * 0.38);
    const kind = rnd();
    const pr = kind < 0.32 ? 0.86 : kind < 0.70 ? 1.00 : 1.10;
    const pg = kind < 0.32 ? 0.88 : kind < 0.70 ? 0.99 : 1.06;
    const pb = kind < 0.32 ? 0.91 : kind < 0.70 ? 0.95 : 0.98;
    stampRockChip(rf, gf, bf, height, ao, rgh, N, cx, cy, rx, ry, rnd() * Math.PI, pr, pg, pb, 0.56 + rnd() * 0.26, true, 0.72, rnd());
  }

  return {
    colRgh: packNormalizedColRgh(rf, gf, bf, rgh, N, 1.06),
    nrmAoH: packTerrainNrmAoH(height, ao, N, 2.95),
    w: N, h: N,
  };
}

// =========================================================================
// 5. MACRO BREAKUP & PUDDLE BASIN MAP (512x512 linear RGBA)
// =========================================================================
export function synthMacroBuffers(N = 512) {
  const gR = makeFbmGrid(128, 4, 4, 1103, 4, 0.56);
  const gG = makeFbmGrid(128, 8, 8, 1151, 3, 0.54);
  const gB1 = makeFbmGrid(128, 4, 16, 1201, 3, 0.55);
  const gB2 = makeFbmGrid(128, 12, 6, 1249, 2, 0.5);
  const gPud = makeFbmGrid(128, 6, 6, 1301, 3, 0.52);

  const rgba = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const r = gR(u, v);
      const g = gG(u, v);
      const b = clamp(gB1(u, v) * 0.65 + gB2(u, v) * 0.35, 0, 1);
      const pud = sstep(0.46, 0.74, gPud(u, v) * 0.72 + (1 - gR(u + 0.17, v + 0.33)) * 0.28);
      const o = (y * N + x) * 4;
      rgba[o] = clamp(Math.round(r * 255), 0, 255);
      rgba[o + 1] = clamp(Math.round(g * 255), 0, 255);
      rgba[o + 2] = clamp(Math.round(b * 255), 0, 255);
      rgba[o + 3] = clamp(Math.round(pud * 255), 0, 255);
    }
  }
  return { rgba, w: N, h: N };
}

// =========================================================================
// 6. FOB TYRE RUTS & GROUND BLEND PAD PBR
// =========================================================================
export function synthFobRutPBR(w = 256, h = 512) {
  const col = new Uint8Array(w * h * 4);
  const rgh = new Uint8Array(w * h * 4);
  const height = new Float32Array(w * h);
  const gMud = makeFbmGrid(64, 6, 12, 1409, 3, 0.55);
  const gGrit = makeFbmGrid(64, 24, 48, 1451, 2, 0.54);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const s = u * 2 - 1;
      const ax = Math.abs(s);
      const mud = gMud(u, v), grit = gGrit(u, v);
      const fine = hash2i(x, y, 1487) - 0.5;
      const stoneSpeck = hash2i(x >> 1, y >> 1, 1499);
      const peb = stoneSpeck > 0.90 ? (stoneSpeck - 0.90) * 10.0 : 0;
      const edgeNoise = (mud - 0.5) * 0.18 + (grit - 0.5) * 0.09;
      const alpha = sstep(0.95, 0.62, ax + edgeNoise);
      const trough = 1 - sstep(0.42, 0.70, ax);
      const berm = sstep(0.45, 0.68, ax) * (1 - sstep(0.72, 0.94, ax));
      const chevronPhase = (v * 14.0 + ax * 1.15) % 1.0;
      const lug = (1 - sstep(0.26, 0.44, Math.abs(chevronPhase - 0.5) * 2)) * trough * (0.55 + 0.45 * sstep(0.08, 0.24, ax));
      const hv = 0.48 - trough * 0.24 - lug * 0.14 + berm * 0.22 + (grit - 0.5) * 0.16 + peb * 0.14 * (1 - trough * 0.5) + fine * 0.07;
      height[y * w + x] = hv;

      const gritCol = (grit - 0.5) * 28 + peb * 28 + fine * 14;
      const baseR = lerp(96, 60, trough) + berm * 20 - lug * 10 + gritCol;
      const baseG = lerp(84, 50, trough) + berm * 17 - lug * 9 + gritCol * 0.94;
      const baseB = lerp(66, 39, trough) + berm * 13 - lug * 7 + gritCol * 0.85;
      const o = (y * w + x) * 4;
      col[o] = clamp(Math.round(baseR), 0, 255);
      col[o + 1] = clamp(Math.round(baseG), 0, 255);
      col[o + 2] = clamp(Math.round(baseB), 0, 255);
      col[o + 3] = clamp(Math.round(clamp(alpha * (0.88 * trough + 0.58 * berm + 0.22), 0, 1) * 255), 0, 255);

      const rv = clamp(0.94 - trough * 0.28 - lug * 0.08 + berm * 0.04 + (grit - 0.5) * 0.08, 0.46, 0.98);
      const rb = clamp(Math.round(rv * 255), 0, 255);
      rgh[o] = rgh[o + 1] = rgh[o + 2] = rb; rgh[o + 3] = 255;
    }
  }
  const nrm = heightToNormalRGBA(height, w, h, 3.2, false, true);
  return { col, nrm, rgh, w, h };
}

export function synthFobBlendPBR(N = 256) {
  const col = new Uint8Array(N * N * 4);
  const rgh = new Uint8Array(N * N * 4);
  const height = new Float32Array(N * N);
  const gM = makeFbmGrid(64, 5, 5, 1543, 3, 0.55);
  const gF = makeFbmGrid(64, 18, 18, 1583, 2, 0.52);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const d = Math.hypot((u - 0.5) * 2, (v - 0.5) * 2);
      const m = gM(u, v), fn = gF(u, v);
      const fine = hash2i(x, y, 1607) - 0.5;
      const rad = d + (m - 0.5) * 0.34 + (fn - 0.5) * 0.14;
      const a = sstep(0.98, 0.28, rad) * 0.72;
      const core = sstep(0.70, 0.15, rad);
      const r = 74 - core * 14 + (fn - 0.5) * 24 + fine * 10;
      const g = 65 - core * 12 + (fn - 0.5) * 20 + fine * 9;
      const b = 52 - core * 10 + (fn - 0.5) * 16 + fine * 7;
      const o = (y * N + x) * 4;
      col[o] = clamp(Math.round(r), 0, 255);
      col[o + 1] = clamp(Math.round(g), 0, 255);
      col[o + 2] = clamp(Math.round(b), 0, 255);
      col[o + 3] = clamp(Math.round(a * 255), 0, 255);
      height[y * N + x] = 0.5 - core * 0.12 + (fn - 0.5) * 0.24 + fine * 0.09;
      const rv = clamp(0.92 - core * 0.16 + (fn - 0.5) * 0.08, 0.62, 0.97);
      const rb = clamp(Math.round(rv * 255), 0, 255);
      rgh[o] = rgh[o + 1] = rgh[o + 2] = rb; rgh[o + 3] = 255;
    }
  }
  const nrm = heightToNormalRGBA(height, N, N, 2.3, false, false);
  return { col, nrm, rgh, w: N, h: N };
}

// =========================================================================
// 7. CORDON CONVOY ROAD PBR (512x1024 dual-atlas: left=inside, right=outside)
// =========================================================================
export function synthCordonRoadPBR(w = 512, h = 1024) {
  const col = new Uint8Array(w * h * 4);
  const rgh = new Uint8Array(w * h * 4);
  const height = new Float32Array(w * h);
  const gBroad = makeFbmGrid(64, 6, 18, 1709, 3, 0.55);
  const gGrit = makeFbmGrid(64, 24, 56, 1747, 2, 0.54);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const outer = x >= (w >> 1);
      const lx = outer ? (x - (w >> 1)) : x;
      const lu = lx / ((w >> 1) - 1);
      const s = lu * 2 - 1;
      const wob = 0.032 * Math.sin(v * 26.0) + 0.022 * Math.sin(v * 78.0);
      const r = Math.abs(s - wob);
      const broad = gBroad(lu, v), grit = gGrit(lu, v);
      const fine = hash2i(x, y, 1823) - 0.5;
      const chip = hash2i(x >> 1, y >> 1, 1847);
      const agg = chip > 0.78 ? (chip - 0.78) * 4.5 : 0;

      const rut = Math.exp(-Math.pow((r - 0.49) / 0.17, 4));
      const berm = Math.exp(-Math.pow((r - 0.72) / 0.11, 2)) * 0.65 + Math.exp(-Math.pow((r - 0.24) / 0.11, 2)) * 0.5;
      const edge = clamp((0.97 - r + (broad - 0.5) * 0.14 + (grit - 0.5) * 0.07) / 0.16, 0, 1);

      const centerGrass = outer ? (1 - sstep(0.10, 0.34, r)) * 0.85 : 0;
      const tread = (Math.sin(v * 340.0 + r * 14.0) * 0.5 + 0.5) * rut * 0.26;
      const aggH = agg * 0.18 * (1 - rut * 0.55);
      const hv = 0.52 - rut * 0.22 - tread * 0.06 + berm * 0.14 + aggH + (grit - 0.5) * 0.12 + fine * 0.05;
      height[y * w + x] = hv;

      const stoneVar = (agg - 0.25) * 28;
      let cr = (outer ? 104 : 114) - rut * 26 + berm * 12 + stoneVar + (grit - 0.5) * 22 + fine * 10;
      let cg = (outer ? 92 : 103) - rut * 24 + berm * 10 + stoneVar * 0.96 + (grit - 0.5) * 20 + fine * 9;
      let cb = (outer ? 72 : 84) - rut * 22 + berm * 8 + stoneVar * 0.88 + (grit - 0.5) * 16 + fine * 7;
      if (centerGrass > 0.01) {
        cr = lerp(cr, 78, centerGrass);
        cg = lerp(cg, 90, centerGrass);
        cb = lerp(cb, 52, centerGrass);
      }
      const fadeEnd = (outer && y < 100) ? (y / 100) : 1.0;
      const alpha = edge * (outer ? clamp(0.10 + rut * 0.88 + berm * 0.32, 0, 0.96) : 0.94) * fadeEnd;

      const o = (y * w + x) * 4;
      col[o] = clamp(Math.round(cr), 0, 255);
      col[o + 1] = clamp(Math.round(cg), 0, 255);
      col[o + 2] = clamp(Math.round(cb), 0, 255);
      col[o + 3] = clamp(Math.round(clamp(alpha, 0, 1) * 255), 0, 255);

      const rv = clamp(0.92 - rut * 0.26 - agg * 0.10 + (grit - 0.5) * 0.06, 0.50, 0.98);
      const rb = clamp(Math.round(rv * 255), 0, 255);
      rgh[o] = rgh[o + 1] = rgh[o + 2] = rb; rgh[o + 3] = 255;
    }
  }
  const nrm = heightToNormalRGBA(height, w, h, 3.0, false, true);
  return { col, nrm, rgh, w, h };
}

// =========================================================================
// 8. DRAG MARKS FURROW PBR (128x256)
// =========================================================================
export function synthDragMarksPBR(w = 128, h = 256) {
  const col = new Uint8Array(w * h * 4);
  const rgh = new Uint8Array(w * h * 4);
  const height = new Float32Array(w * h);
  const gN = makeFbmGrid(64, 6, 14, 1907, 3, 0.55);

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const ax = Math.abs(u * 2 - 1);
      const n = gN(u, v);
      const streak = Math.sin(u * 38.0 + n * 4.5) * 0.5 + 0.5;
      const fine = hash2i(x, y, 1933) - 0.5;
      const trough = 1 - sstep(0.35, 0.72, ax + (n - 0.5) * 0.16);
      const lip = sstep(0.45, 0.70, ax) * (1 - sstep(0.75, 0.96, ax));
      const alpha = sstep(0.96, 0.60, ax + (n - 0.5) * 0.22) * (0.88 * trough + 0.52 * lip + 0.12);
      height[y * w + x] = 0.50 - trough * 0.30 + lip * 0.20 + streak * 0.08 * trough + fine * 0.05;
      const base = lerp(64, 38, trough) + lip * 16 + streak * 6 + fine * 8;
      const o = (y * w + x) * 4;
      col[o] = clamp(Math.round(base * 1.04), 0, 255);
      col[o + 1] = clamp(Math.round(base * 0.86), 0, 255);
      col[o + 2] = clamp(Math.round(base * 0.66), 0, 255);
      col[o + 3] = clamp(Math.round(clamp(alpha, 0, 1) * 255), 0, 255);
      const rv = clamp(0.92 - trough * 0.30 + lip * 0.05, 0.45, 0.97);
      const rb = clamp(Math.round(rv * 255), 0, 255);
      rgh[o] = rgh[o + 1] = rgh[o + 2] = rb; rgh[o + 3] = 255;
    }
  }
  const nrm = heightToNormalRGBA(height, w, h, 3.4, false, true);
  return { col, nrm, rgh, w, h };
}

// =========================================================================
// 9. HOLLOWS CAVERN FLOOR & ROCK PBR (512x512 per warren theme, organic geology!)
// Natural fractured bedrock, packed mine earth, scattered loose scree & wet pools
// =========================================================================
const HOLLOW_PALETTES = {
  root:  { floor: [66, 53, 40],  rock: [80, 68, 56],  accent: [102, 84, 58], rough: 0.88, seed: 2101 },
  shale: { floor: [58, 63, 70],  rock: [68, 74, 82],  accent: [94, 102, 112],rough: 0.84, seed: 2203 },
  iron:  { floor: [70, 55, 45],  rock: [86, 65, 52],  accent: [122, 80, 48], rough: 0.90, seed: 2309 },
  wet:   { floor: [46, 59, 57],  rock: [56, 70, 68],  accent: [72, 96, 92],  rough: 0.46, seed: 2411 },
  hill:  { floor: [74, 70, 62],  rock: [88, 84, 74],  accent: [120, 115, 102],rough: 0.92, seed: 2503 },
};

export function synthHollowSurface(theme = 'iron', kind = 'floor', N = 512) {
  const pal = HOLLOW_PALETTES[theme] || HOLLOW_PALETTES.iron;
  const [br, bg, bb] = kind === 'rock' ? pal.rock : pal.floor;
  const [ar, ag, ab] = pal.accent;
  const seed = pal.seed + (kind === 'rock' ? 97 : 0);
  const rf = new Float32Array(N * N), gf = new Float32Array(N * N), bf = new Float32Array(N * N);
  const rghf = new Float32Array(N * N), height = new Float32Array(N * N), ao = new Float32Array(N * N);

  const gMacro = makeFbmGrid(128, 6, 6, seed, 3, 0.56);
  const gMid = makeFbmGrid(128, 18, 18, seed + 31, 3, 0.54);
  const gFract = makeRidgedGrid(128, theme === 'shale' ? 10 : 7, theme === 'shale' ? 10 : 7, seed + 67, 3, 0.56);
  const gWarp = makeFbmGrid(64, 5, 5, seed + 109, 2, 0.5);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const i = y * N + x;
      const wx = (gWarp(u, v) - 0.5) * 0.09;
      const wy = (gWarp(u + 0.31, v + 0.67) - 0.5) * 0.09;
      const ma = gMacro(u, v), mi = gMid(u + wx, v + wy);
      const fr = gFract(u + wx * 1.4, v + wy * 1.4);
      const fine = hash2i(x, y, seed + 131) - 0.5;
      const crack = sstep(0.76, 0.96, fr);
      const strata = theme === 'shale'
        ? Math.sin(v * 37.7 + ma * 5.5) * 0.14
        : Math.sin(v * 18.8 + ma * 4.0) * 0.07;
      const rootVein = theme === 'root'
        ? (1 - sstep(0.0, 0.055, Math.abs(Math.sin(u * 12.56 + ma * 6.0) * 0.5))) * 0.24
        : 0;
      const puddle = theme === 'wet' && kind === 'floor' ? sstep(0.50, 0.72, ma) : 0;
      const oreDust = theme === 'iron' ? sstep(0.52, 0.78, mi * 0.65 + ma * 0.35) * 0.58 : 0;

      const h = clamp(0.42 + (ma - 0.5) * 0.24 + (mi - 0.5) * 0.18 + strata + rootVein - crack * 0.30 + fine * 0.10, 0.05, 0.95);
      height[i] = lerp(h, 0.24, puddle * 0.78);
      ao[i] = clamp(0.84 + (ma - 0.5) * 0.16 - crack * 0.38, 0.42, 1.0);

      const shade = (0.78 + (ma - 0.5) * 0.24 + (mi - 0.5) * 0.18 + strata * 0.6 + fine * 0.12) * (1 - crack * 0.36);
      let r = (br / 255) * shade, g = (bg / 255) * shade, b = (bb / 255) * shade;
      if (oreDust > 0.01) { r = lerp(r, (ar / 255) * shade, oreDust); g = lerp(g, (ag / 255) * shade, oreDust); b = lerp(b, (ab / 255) * shade, oreDust); }
      if (rootVein > 0.01) { r = lerp(r, (ar / 255) * 0.85, rootVein); g = lerp(g, (ag / 255) * 0.82, rootVein); b = lerp(b, (ab / 255) * 0.78, rootVein); }
      if (puddle > 0.01) { r *= (1 - puddle * 0.30); g *= (1 - puddle * 0.24); b *= (1 - puddle * 0.20); }

      rf[i] = r; gf[i] = g; bf[i] = b;
      rghf[i] = clamp(lerp(pal.rough + crack * 0.08 + (mi - 0.5) * 0.10, 0.22, puddle), 0.18, 0.98);
    }
  }

  // Scatter natural loose scree/pebbles on the cavern floor (and fractured ledge chips on walls)
  const rnd = makeRng(seed + 777);
  const scale = N / 512;
  const rockCount = Math.round((kind === 'floor' ? 320 : 160) * scale * scale);
  for (let k = 0; k < rockCount; k++) {
    const cx = rnd() * N, cy = rnd() * N;
    const rx = (2.0 + rnd() * 4.5) * scale, ry = rx * (0.50 + rnd() * 0.45);
    const t = 0.95 + rnd() * 0.45;
    stampRockChip(rf, gf, bf, height, ao, rghf, N, cx, cy, rx, ry, rnd() * Math.PI, (br / 255) * t, (bg / 255) * t, (bb / 255) * t, 0.35 + rnd() * 0.22, true, Math.max(0.55, pal.rough - 0.08), rnd());
  }

  const col = new Uint8Array(N * N * 4);
  const rgh = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const o = i * 4;
    const aok = clamp(0.65 + ao[i] * 0.35, 0.48, 1.0);
    col[o] = clamp(Math.round(rf[i] * aok * 255), 0, 255);
    col[o + 1] = clamp(Math.round(gf[i] * aok * 255), 0, 255);
    col[o + 2] = clamp(Math.round(bf[i] * aok * 255), 0, 255);
    col[o + 3] = 255;
    const rb = clamp(Math.round(rghf[i] * 255), 0, 255);
    rgh[o] = rgh[o + 1] = rgh[o + 2] = rb; rgh[o + 3] = 255;
  }
  const nrm = heightToNormalRGBA(height, N, N, kind === 'rock' ? 3.2 : 2.8, true, true);
  return { col, nrm, rgh, w: N, h: N };
}

// =========================================================================
// PUBLIC CACHED FACTORIES (per THREE instance, lazy per subsystem)
// =========================================================================
const _cache = new WeakMap();
function cacheFor(T) {
  let c = _cache.get(T);
  if (!c) { c = { terrain: null, fobRut: null, fobBlend: null, cordonRoad: null, dragMarks: null, hollows: new Map() }; _cache.set(T, c); }
  return c;
}

export function getWorldGroundTextures(T, size = 512) {
  if (!T) return null;
  const c = cacheFor(T);
  if (c.terrain) return c.terrain;

  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const gB = synthGrassBuffers(size);
  const dB = synthDirtBuffers(size);
  const fB = synthDuffBuffers(size);
  const sB = synthStoneBuffers(size);
  const mB = synthMacroBuffers(size);

  const mk = (rgba, w, h, name) => makeDataTexture(T, rgba, w, h, { name, srgb: false, aniso: 8, flip: false });
  const set = {
    grassColRgh: mk(gB.colRgh, gB.w, gB.h, 'ground-grass-colrgh'),
    grassNrmAoH: mk(gB.nrmAoH, gB.w, gB.h, 'ground-grass-nrmaoh'),
    dirtColRgh:  mk(dB.colRgh, dB.w, dB.h, 'ground-dirt-colrgh'),
    dirtNrmAoH:  mk(dB.nrmAoH, dB.w, dB.h, 'ground-dirt-nrmaoh'),
    duffColRgh:  mk(fB.colRgh, fB.w, fB.h, 'ground-duff-colrgh'),
    duffNrmAoH:  mk(fB.nrmAoH, fB.w, fB.h, 'ground-duff-nrmaoh'),
    stoneColRgh: mk(sB.colRgh, sB.w, sB.h, 'ground-stone-colrgh'),
    stoneNrmAoH: mk(sB.nrmAoH, sB.w, sB.h, 'ground-stone-nrmaoh'),
    macroNoise:  mk(mB.rgba,   mB.w, mB.h, 'ground-macro-noise'),
    size,
    buildMs: typeof performance !== 'undefined' ? +(performance.now() - t0).toFixed(1) : 0,
  };
  c.terrain = set;
  return set;
}

export function getFobRutPBR(T) {
  if (!T) return null;
  const c = cacheFor(T);
  if (c.fobRut) return c.fobRut;
  const b = synthFobRutPBR(256, 512);
  c.fobRut = {
    map: makeDataTexture(T, b.col, b.w, b.h, { name: 'fob-rut-albedo', srgb: true, wrapS: 'clamp', wrapT: 'repeat', aniso: 8, flip: true }),
    normalMap: makeDataTexture(T, b.nrm, b.w, b.h, { name: 'fob-rut-normal', srgb: false, wrapS: 'clamp', wrapT: 'repeat', aniso: 8, flip: true }),
    roughnessMap: makeDataTexture(T, b.rgh, b.w, b.h, { name: 'fob-rut-rough', srgb: false, wrapS: 'clamp', wrapT: 'repeat', aniso: 4, flip: true }),
  };
  return c.fobRut;
}

export function getFobBlendPBR(T) {
  if (!T) return null;
  const c = cacheFor(T);
  if (c.fobBlend) return c.fobBlend;
  const b = synthFobBlendPBR(256);
  c.fobBlend = {
    map: makeDataTexture(T, b.col, b.w, b.h, { name: 'fob-blend-albedo', srgb: true, wrapS: 'clamp', wrapT: 'clamp', aniso: 4, flip: true }),
    normalMap: makeDataTexture(T, b.nrm, b.w, b.h, { name: 'fob-blend-normal', srgb: false, wrapS: 'clamp', wrapT: 'clamp', aniso: 4, flip: true }),
    roughnessMap: makeDataTexture(T, b.rgh, b.w, b.h, { name: 'fob-blend-rough', srgb: false, wrapS: 'clamp', wrapT: 'clamp', aniso: 4, flip: true }),
  };
  return c.fobBlend;
}

export function getCordonRoadPBR(T) {
  if (!T) return null;
  const c = cacheFor(T);
  if (c.cordonRoad) return c.cordonRoad;
  const b = synthCordonRoadPBR(512, 1024);
  c.cordonRoad = {
    map: makeDataTexture(T, b.col, b.w, b.h, { name: 'cordon-road-albedo', srgb: true, wrapS: 'clamp', wrapT: 'clamp', aniso: 8, flip: true }),
    normalMap: makeDataTexture(T, b.nrm, b.w, b.h, { name: 'cordon-road-normal', srgb: false, wrapS: 'clamp', wrapT: 'clamp', aniso: 8, flip: true }),
    roughnessMap: makeDataTexture(T, b.rgh, b.w, b.h, { name: 'cordon-road-rough', srgb: false, wrapS: 'clamp', wrapT: 'clamp', aniso: 4, flip: true }),
  };
  return c.cordonRoad;
}

export function getDragMarksPBR(T) {
  if (!T) return null;
  const c = cacheFor(T);
  if (c.dragMarks) return c.dragMarks;
  const b = synthDragMarksPBR(128, 256);
  c.dragMarks = {
    map: makeDataTexture(T, b.col, b.w, b.h, { name: 'drag-marks-albedo', srgb: true, wrapS: 'clamp', wrapT: 'repeat', aniso: 4, flip: true }),
    normalMap: makeDataTexture(T, b.nrm, b.w, b.h, { name: 'drag-marks-normal', srgb: false, wrapS: 'clamp', wrapT: 'repeat', aniso: 4, flip: true }),
    roughnessMap: makeDataTexture(T, b.rgh, b.w, b.h, { name: 'drag-marks-rough', srgb: false, wrapS: 'clamp', wrapT: 'repeat', aniso: 4, flip: true }),
  };
  return c.dragMarks;
}

export function getHollowPBR(T, theme = 'iron') {
  if (!T) return null;
  const c = cacheFor(T);
  if (c.hollows.has(theme)) return c.hollows.get(theme);
  const f = synthHollowSurface(theme, 'floor', 512);
  const r = synthHollowSurface(theme, 'rock', 512);
  const pack = {
    floor: {
      map: makeDataTexture(T, f.col, f.w, f.h, { name: `hollow-${theme}-floor-albedo`, srgb: true, aniso: 8, flip: true }),
      normalMap: makeDataTexture(T, f.nrm, f.w, f.h, { name: `hollow-${theme}-floor-normal`, srgb: false, aniso: 8, flip: true }),
      roughnessMap: makeDataTexture(T, f.rgh, f.w, f.h, { name: `hollow-${theme}-floor-rough`, srgb: false, aniso: 4, flip: true }),
    },
    rock: {
      map: makeDataTexture(T, r.col, r.w, r.h, { name: `hollow-${theme}-rock-albedo`, srgb: true, aniso: 8, flip: true }),
      normalMap: makeDataTexture(T, r.nrm, r.w, r.h, { name: `hollow-${theme}-rock-normal`, srgb: false, aniso: 8, flip: true }),
      roughnessMap: makeDataTexture(T, r.rgh, r.w, r.h, { name: `hollow-${theme}-rock-rough`, srgb: false, aniso: 4, flip: true }),
    },
  };
  c.hollows.set(theme, pack);
  return pack;
}

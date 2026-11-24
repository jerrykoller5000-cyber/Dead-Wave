// CU-198 / AG-413: the valley map fills in smoothly where he has walked.
// High-resolution continuous reveal mask with soft feathered mist edge and
// real-time temporal dissolve so walking exposes terrain smoothly with no
// chunky grid cells. A place is found the first time he steps into its
// clearing, about 14 m.

export const REVEAL_CELL = 8;
export const REVEAL_RADIUS = 35;
export const FIND_RADIUS = 14;
export const REVEAL_MASK_SIZE = 512;

const SEEN_THRESHOLD = 48;         // ~19% revealed -> guaranteed true within REVEAL_RADIUS
const INNER_RATIO = 0.72;          // 100% clear inside ~25.2 m (clear past the 25 m minimap ring)
const OUTER_RATIO = 1.24;          // fades smoothly out to ~43.4 m inside the 50 m minimap rim
const EDGE_NOISE_RATIO = 0.06;     // subtle ±2.1 m organic world-space edge undulation
const TELEPORT_JUMP_RATIO = 0.75;  // steps larger than ~26 m are treated as jumps, not walked paths
const STAMP_SPACING = 2.5;         // minimum metres between persisted path stamps
const DISSOLVE_RATE = 8.0;         // exponential fog-clearing speed (~0.37 s to 95%)
const FULL_U16 = 65535;
const U8_TO_U16 = 257;

// Precomputed 256-entry perceptual fade and mid-edge mist curves (zero Math.pow in hot loops).
const FOG_ALPHA_LUT = new Float32Array(256);
const EDGE_MIST_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const u = i / 255;
  FOG_ALPHA_LUT[i] = Math.pow(1 - u, 1.15);
  EDGE_MIST_LUT[i] = 4 * u * (1 - u);
}

const SITE_CARD = {
  'radio-repair': 'mast',
  'medical-convoy': 'convoy',
  'ranger-cache': 'rangers',
  'hikers-cache': 'hikers',
  'trapper-cache': 'trapper',
  'fuel-depot': 'fuel',
  'wreck-salvage': 'clarke',
};

export function cardKeyForLandmark(row) {
  const k = row && row.key;
  if (k === 'map.tower') return 'firetower';
  if (k === 'map.graveyard') return 'graveyard';
  if (k === 'map.mast') return 'mast';
  if (k === 'map.dock') return 'dock';
  if (k === 'map.ranger') return 'rangers';
  if (k === 'map.hikers') return 'hikers';
  if (k === 'map.trapper') return 'trapper';
  if (k === 'map.cabin') return (row.z || 0) >= 0 ? 'northCabin' : 'southwestCabin';
  if (k === 'map.pit' || k === 'map.hq') return null;
  if (k === 'hollow.theme.iron' || k === 'map.marrow') return 'mine';
  return null;
}

export function cardKeyForSite(id) {
  const bare = String(id || '').replace(/^objective:/, '');
  return SITE_CARD[bare] || null;
}

// Fast deterministic integer-hashed 2D smooth value noise in [0, 1].
function hash2(ix, iy, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) * (1 / 4294967296);
}

// Precompute a 1D-indexed 2D smooth value-noise sampler for a fixed grid size & wavelength.
function makeOctave(size, origin, step, wavelength, seed) {
  const invL = 1 / wavelength;
  const minCell = Math.floor((origin + 0.5 * step) * invL);
  const maxCell = Math.floor((origin + (size - 0.5) * step) * invL) + 1;
  const gw = maxCell - minCell + 1;
  const grid = new Float32Array(gw * gw);
  for (let cy = 0; cy < gw; cy++) {
    const row = cy * gw;
    for (let cx = 0; cx < gw; cx++) {
      grid[row + cx] = hash2(minCell + cx, minCell + cy, seed);
    }
  }
  const idx = new Int32Array(size);
  const u = new Float32Array(size);
  for (let t = 0; t < size; t++) {
    const v = (origin + (t + 0.5) * step) * invL;
    const iv = Math.floor(v);
    const f = v - iv;
    idx[t] = iv - minCell;
    u[t] = f * f * (3 - 2 * f);
  }
  return { gw, grid, idx, u };
}

// Cache deterministic world-space edge/cloud/rim fields per (size, radius) so reset() and
// multiple grids reuse them at zero extra cost.
const FIELD_CACHE = new Map();
function getStaticFields(size, radius) {
  const key = size + ':' + radius;
  let cached = FIELD_CACHE.get(key);
  if (cached) return cached;
  const total = size * size;
  const edge = new Float32Array(total);  // [-1, +1] organic edge contour offset
  const cloud = new Uint8Array(total);   // [0..255] subtle atmospheric mist variation
  const rim = new Uint8Array(total);     // [0..255] circular valley mask (anti-aliased at radius)
  const origin = -radius;
  const step = (radius * 2) / size;

  const e1 = makeOctave(size, origin, step, 22, 17);
  const e2 = makeOctave(size, origin, step, 9.5, 53);
  const c1 = makeOctave(size, origin, step, 38, 101);
  const c2 = makeOctave(size, origin, step, 15, 211);

  const rimInner = radius - step * 1.1;
  const rimOuter = radius + step * 1.1;
  const rimInner2 = rimInner * rimInner;
  const rimOuter2 = rimOuter * rimOuter;
  const invRimSpan = 255 / Math.max(0.001, rimOuter - rimInner);

  const sampleRow = (oct, ty) => {
    const r0 = oct.idx[ty] * oct.gw;
    return { r0, r1: r0 + oct.gw, uy: oct.u[ty] };
  };

  for (let ty = 0; ty < size; ty++) {
    const wz = origin + (ty + 0.5) * step;
    const wz2 = wz * wz;
    const row = ty * size;
    const re1 = sampleRow(e1, ty), re2 = sampleRow(e2, ty);
    const rc1 = sampleRow(c1, ty), rc2 = sampleRow(c2, ty);

    for (let tx = 0; tx < size; tx++) {
      const k = row + tx;
      // Edge noise (2 octaves)
      let ix = e1.idx[tx], ux = e1.u[tx];
      let a = e1.grid[re1.r0 + ix], b = e1.grid[re1.r0 + ix + 1];
      let c = e1.grid[re1.r1 + ix], d = e1.grid[re1.r1 + ix + 1];
      const vE1 = a + (b - a) * ux + (c - a) * re1.uy + (a - b - c + d) * ux * re1.uy;

      ix = e2.idx[tx]; ux = e2.u[tx];
      a = e2.grid[re2.r0 + ix]; b = e2.grid[re2.r0 + ix + 1];
      c = e2.grid[re2.r1 + ix]; d = e2.grid[re2.r1 + ix + 1];
      const vE2 = a + (b - a) * ux + (c - a) * re2.uy + (a - b - c + d) * ux * re2.uy;
      edge[k] = (vE1 * 0.68 + vE2 * 0.32) * 2 - 1;

      // Cloud noise (2 octaves)
      ix = c1.idx[tx]; ux = c1.u[tx];
      a = c1.grid[rc1.r0 + ix]; b = c1.grid[rc1.r0 + ix + 1];
      c = c1.grid[rc1.r1 + ix]; d = c1.grid[rc1.r1 + ix + 1];
      const vC1 = a + (b - a) * ux + (c - a) * rc1.uy + (a - b - c + d) * ux * rc1.uy;

      ix = c2.idx[tx]; ux = c2.u[tx];
      a = c2.grid[rc2.r0 + ix]; b = c2.grid[rc2.r0 + ix + 1];
      c = c2.grid[rc2.r1 + ix]; d = c2.grid[rc2.r1 + ix + 1];
      const vC2 = a + (b - a) * ux + (c - a) * rc2.uy + (a - b - c + d) * ux * rc2.uy;
      cloud[k] = Math.round((vC1 * 0.65 + vC2 * 0.35) * 255);

      // Circular valley rim mask
      const wx = origin + (tx + 0.5) * step;
      const d2 = wx * wx + wz2;
      if (d2 <= rimInner2) rim[k] = 255;
      else if (d2 >= rimOuter2) rim[k] = 0;
      else rim[k] = Math.round((rimOuter - Math.sqrt(d2)) * invRimSpan);
    }
  }
  cached = { edge, cloud, rim };
  FIELD_CACHE.set(key, cached);
  return cached;
}

export function createRevealGrid({
  cell = REVEAL_CELL,
  radius = 235,
  revealR = REVEAL_RADIUS,
  findR = FIND_RADIUS,
  maskSize = REVEAL_MASK_SIZE,
} = {}) {
  const n = Math.ceil((radius * 2) / cell);
  const origin = -radius;
  const span = radius * 2;
  const size = Math.max(32, Math.min(1024, Math.round(maskSize)));
  const texStep = span / size;
  const invTexStep = size / span;
  const total = size * size;

  let fields = null;
  const ensureFields = () => {
    if (!fields) fields = getStaticFields(size, radius);
    return fields;
  };

  let target = new Uint8Array(total);
  let display = new Uint16Array(total);
  let seenCount = 0;
  let stamps = [];
  let lastX = NaN, lastZ = NaN;
  let lastStampX = NaN, lastStampZ = NaN;
  const found = new Set();

  // Active temporal-dissolve bounds (texels where display < target * 257).
  let animating = false;
  let hasAdvanced = false;
  let animX0 = size, animY0 = size, animX1 = -1, animY1 = -1;

  // Offscreen fog canvas dirty rectangle (texels needing putImageData upload).
  let fullDirty = true;
  let dirtyX0 = 0, dirtyY0 = 0, dirtyX1 = size - 1, dirtyY1 = size - 1;
  let version = 1;

  const markDirty = (x0, y0, x1, y1) => {
    if (x0 > x1 || y0 > y1) return;
    if (x0 < dirtyX0) dirtyX0 = x0;
    if (y0 < dirtyY0) dirtyY0 = y0;
    if (x1 > dirtyX1) dirtyX1 = x1;
    if (y1 > dirtyY1) dirtyY1 = y1;
    version++;
  };

  const expandAnim = (x0, y0, x1, y1) => {
    if (x0 > x1 || y0 > y1) return;
    if (x0 < animX0) animX0 = x0;
    if (y0 < animY0) animY0 = y0;
    if (x1 > animX1) animX1 = x1;
    if (y1 > animY1) animY1 = y1;
    animating = true;
  };

  const texOf = (x, z) => {
    const tx = Math.floor((x - origin) * invTexStep);
    const ty = Math.floor((z - origin) * invTexStep);
    if (tx < 0 || ty < 0 || tx >= size || ty >= size) return -1;
    return ty * size + tx;
  };

  // Paint a smooth circular or capsule brush from (x0, z0) to (x1, z1) into target[].
  function stampSegment(x0, z0, x1, z1, r, instant) {
    const { edge } = ensureFields();
    const innerR = r * INNER_RATIO;
    const outerR = r * OUTER_RATIO;
    const edgeAmp = r * EDGE_NOISE_RATIO;
    const invFade = 1 / Math.max(0.001, outerR - innerR);
    const maxR = outerR + edgeAmp;
    const maxR2 = maxR * maxR;

    const minX = Math.min(x0, x1) - maxR;
    const maxX = Math.max(x0, x1) + maxR;
    const minZ = Math.min(z0, z1) - maxR;
    const maxZ = Math.max(z0, z1) + maxR;

    const tx0 = Math.max(0, Math.floor((minX - origin) * invTexStep));
    const tx1 = Math.min(size - 1, Math.floor((maxX - origin) * invTexStep));
    const ty0 = Math.max(0, Math.floor((minZ - origin) * invTexStep));
    const ty1 = Math.min(size - 1, Math.floor((maxZ - origin) * invTexStep));
    if (tx0 > tx1 || ty0 > ty1) return 0;

    const segDx = x1 - x0;
    const segDz = z1 - z0;
    const segLen2 = segDx * segDx + segDz * segDz;
    const invSegLen2 = segLen2 > 1e-6 ? 1 / segLen2 : 0;

    let added = 0;
    let cX0 = size, cY0 = size, cX1 = -1, cY1 = -1;

    for (let ty = ty0; ty <= ty1; ty++) {
      const wz = origin + (ty + 0.5) * texStep;
      const row = ty * size;
      const dz0 = wz - z0;
      for (let tx = tx0; tx <= tx1; tx++) {
        const k = row + tx;
        const cur = target[k];
        if (cur === 255 && (!instant || display[k] === FULL_U16)) continue;

        const wx = origin + (tx + 0.5) * texStep;
        const dx0 = wx - x0;
        let d2;
        if (invSegLen2 > 0) {
          let proj = (dx0 * segDx + dz0 * segDz) * invSegLen2;
          if (proj < 0) proj = 0;
          else if (proj > 1) proj = 1;
          const rx = dx0 - segDx * proj;
          const rz = dz0 - segDz * proj;
          d2 = rx * rx + rz * rz;
        } else {
          d2 = dx0 * dx0 + dz0 * dz0;
        }
        if (d2 >= maxR2) continue;

        const de = Math.sqrt(d2) + edge[k] * edgeAmp;
        if (de >= outerR) continue;

        let v;
        if (de <= innerR) {
          v = 255;
        } else {
          const t = (outerR - de) * invFade;
          const s = t * t * t * (t * (t * 6 - 15) + 10);
          v = Math.round(s * 255);
        }

        if (v > cur) {
          if (cur < SEEN_THRESHOLD && v >= SEEN_THRESHOLD) seenCount++;
          target[k] = v;
          added++;
          if (tx < cX0) cX0 = tx;
          if (ty < cY0) cY0 = ty;
          if (tx > cX1) cX1 = tx;
          if (ty > cY1) cY1 = ty;
          if (instant) {
            display[k] = v * U8_TO_U16;
          }
        } else if (instant && display[k] < cur * U8_TO_U16) {
          display[k] = cur * U8_TO_U16;
          if (tx < cX0) cX0 = tx;
          if (ty < cY0) cY0 = ty;
          if (tx > cX1) cX1 = tx;
          if (ty > cY1) cY1 = ty;
        }
      }
    }

    if (cX0 <= cX1) {
      if (instant) markDirty(cX0, cY0, cX1, cY1);
      else expandAnim(cX0, cY0, cX1, cY1);
    }
    return added;
  }

  function consider(id, x, z, px, pz, newly) {
    if (id == null || found.has(id)) return;
    if (Math.hypot(x - px, z - pz) > findR) return;
    found.add(id);
    newly.push(id);
  }

  const grid = {
    cell, n, origin, radius, span, revealR, findR, maskSize: size,
    reset() {
      target.fill(0);
      display.fill(0);
      seenCount = 0;
      stamps = [];
      lastX = NaN; lastZ = NaN;
      lastStampX = NaN; lastStampZ = NaN;
      found.clear();
      animating = false;
      animX0 = size; animY0 = size; animX1 = -1; animY1 = -1;
      fullDirty = true;
      dirtyX0 = 0; dirtyY0 = 0; dirtyX1 = size - 1; dirtyY1 = size - 1;
      version++;
    },
    revealAround(x, z, opts = null) {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
      const r = (opts && opts.radius != null) ? opts.radius : revealR;
      const isFirst = stamps.length === 0 && seenCount === 0;
      const instant = !!(opts && opts.instant) || isFirst;
      const jumpDist = Number.isFinite(lastX) ? Math.hypot(x - lastX, z - lastZ) : Infinity;
      const x0 = jumpDist <= r * TELEPORT_JUMP_RATIO ? lastX : x;
      const z0 = jumpDist <= r * TELEPORT_JUMP_RATIO ? lastZ : z;
      const added = stampSegment(x0, z0, x, z, r, instant);
      lastX = x; lastZ = z;
      if (added > 0) {
        const qx = Math.round(x * 2) * 0.5;
        const qz = Math.round(z * 2) * 0.5;
        if (!Number.isFinite(lastStampX) || Math.hypot(qx - lastStampX, qz - lastStampZ) >= STAMP_SPACING) {
          stamps.push(qx, qz);
          lastStampX = qx; lastStampZ = qz;
        }
      }
      return added;
    },
    // Advance smooth temporal fog dissolve by dt seconds. Returns true if pixels changed.
    advance(dt) {
      hasAdvanced = true;
      if (!animating) return false;
      const clampedDt = Math.min(Math.max(dt || 0, 0), 0.25);
      if (clampedDt <= 0) return false;
      const kEase = 1 - Math.exp(-clampedDt * DISSOLVE_RATE);
      let dX0 = size, dY0 = size, dX1 = -1, dY1 = -1;
      let nX0 = size, nY0 = size, nX1 = -1, nY1 = -1;

      for (let ty = animY0; ty <= animY1; ty++) {
        const row = ty * size;
        for (let tx = animX0; tx <= animX1; tx++) {
          const k = row + tx;
          const tgt = target[k] * U8_TO_U16;
          const cur = display[k];
          if (cur >= tgt) continue;
          let next = cur + (tgt - cur) * kEase;
          if (tgt - next < 90) next = tgt;
          else next = Math.min(tgt, Math.ceil(next));
          display[k] = next;
          if (tx < dX0) dX0 = tx;
          if (ty < dY0) dY0 = ty;
          if (tx > dX1) dX1 = tx;
          if (ty > dY1) dY1 = ty;
          if (next < tgt) {
            if (tx < nX0) nX0 = tx;
            if (ty < nY0) nY0 = ty;
            if (tx > nX1) nX1 = tx;
            if (ty > nY1) nY1 = ty;
          }
        }
      }

      if (dX0 <= dX1) markDirty(dX0, dY0, dX1, dY1);
      if (nX0 <= nX1) {
        animX0 = nX0; animY0 = nY0; animX1 = nX1; animY1 = nY1;
        animating = true;
      } else {
        animX0 = size; animY0 = size; animX1 = -1; animY1 = -1;
        animating = false;
      }
      return dX0 <= dX1;
    },
    isAnimating() { return animating; },
    snapVisual() {
      if (!animating) return;
      for (let ty = animY0; ty <= animY1; ty++) {
        const row = ty * size;
        for (let tx = animX0; tx <= animX1; tx++) {
          const k = row + tx;
          display[k] = target[k] * U8_TO_U16;
        }
      }
      markDirty(animX0, animY0, animX1, animY1);
      animX0 = size; animY0 = size; animX1 = -1; animY1 = -1;
      animating = false;
    },
    // Continuous reveal level [0..1] at world (x, z).
    levelAt(x, z, visual = false) {
      const k = texOf(x, z);
      if (k < 0) return 0;
      return visual ? display[k] / FULL_U16 : target[k] / 255;
    },
    seen(x, z) {
      const k = texOf(x, z);
      return k >= 0 && target[k] >= SEEN_THRESHOLD;
    },
    count() { return seenCount; },
    packed() {
      const s = stamps.slice();
      if (Number.isFinite(lastX) && Number.isFinite(lastZ)) {
        const qx = Math.round(lastX * 2) * 0.5;
        const qz = Math.round(lastZ * 2) * 0.5;
        if (!s.length || Math.hypot(qx - s[s.length - 2], qz - s[s.length - 1]) >= 0.5) {
          s.push(qx, qz);
        }
      }
      return { v: 2, s };
    },
    unpack(data) {
      target.fill(0);
      display.fill(0);
      seenCount = 0;
      stamps = [];
      lastX = NaN; lastZ = NaN;
      lastStampX = NaN; lastStampZ = NaN;
      animating = false;
      animX0 = size; animY0 = size; animX1 = -1; animY1 = -1;

      if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.s)) {
        const arr = data.s;
        for (let i = 0; i + 1 < arr.length; i += 2) {
          const x = Number(arr[i]);
          const z = Number(arr[i + 1]);
          if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
          const jumpDist = Number.isFinite(lastX) ? Math.hypot(x - lastX, z - lastZ) : Infinity;
          const x0 = jumpDist <= revealR * TELEPORT_JUMP_RATIO ? lastX : x;
          const z0 = jumpDist <= revealR * TELEPORT_JUMP_RATIO ? lastZ : z;
          stampSegment(x0, z0, x, z, revealR, true);
          stamps.push(x, z);
          lastX = x; lastZ = z;
          lastStampX = x; lastStampZ = z;
        }
      } else if (Array.isArray(data)) {
        // Backwards compatibility with legacy 8 m cell index lists saved in sessionStorage.
        const maxLegacy = n * n;
        const legacyR = cell * 0.85;
        for (const k of data) {
          if (!Number.isInteger(k) || k < 0 || k >= maxLegacy) continue;
          const i = k % n;
          const j = (k - i) / n;
          const cx = origin + (i + 0.5) * cell;
          const cz = origin + (j + 0.5) * cell;
          stampSegment(cx, cz, cx, cz, legacyR, true);
        }
      }
      fullDirty = true;
      dirtyX0 = 0; dirtyY0 = 0; dirtyX1 = size - 1; dirtyY1 = size - 1;
      version++;
    },
    found() { return [...found]; },
    restoreFound(ids) { for (const id of ids || []) found.add(id); },
    // Landmarks and objective sites. Returns the card ids found on this step, once each.
    visit(rows, sites, x, z) {
      const newly = [];
      for (const row of rows || []) consider(cardKeyForLandmark(row), row.x, row.z, x, z, newly);
      for (const site of sites || []) {
        const c = site && (site.centre || site);
        if (!c || c.x == null) continue;
        consider(cardKeyForSite(site.id), c.x, c.z, x, z, newly);
      }
      return newly;
    },
    // Internal state accessors used by fillUnknown() for dirty-rect offscreen canvas updates.
    _internal() {
      return {
        size, origin, span, display, target, fields: ensureFields(),
        hasAdvanced, animating,
        consumeDirty() {
          if (fullDirty) {
            fullDirty = false;
            dirtyX0 = size; dirtyY0 = size; dirtyX1 = -1; dirtyY1 = -1;
            return { x0: 0, y0: 0, x1: size - 1, y1: size - 1 };
          }
          if (dirtyX0 > dirtyX1 || dirtyY0 > dirtyY1) return null;
          const rect = { x0: dirtyX0, y0: dirtyY0, x1: dirtyX1, y1: dirtyY1 };
          dirtyX0 = size; dirtyY0 = size; dirtyX1 = -1; dirtyY1 = -1;
          return rect;
        },
      };
    },
  };
  return grid;
}

const FOG_CANVAS_CACHE = new WeakMap();

function writeFogRect(rgba, size, display, fields, x0, y0, x1, y1) {
  const { cloud, rim } = fields;
  for (let ty = y0; ty <= y1; ty++) {
    const row = ty * size;
    for (let tx = x0; tx <= x1; tx++) {
      const k = row + tx;
      const o = k * 4;
      const rimMask = rim[k];
      if (rimMask === 0) {
        rgba[o + 3] = 0;
        continue;
      }
      const uByte = display[k] >>> 8;
      if (uByte >= 255) {
        rgba[o + 3] = 0;
        continue;
      }
      const cl = cloud[k] * (1 / 255);
      const mist = EDGE_MIST_LUT[uByte];
      const baseAlpha = 0.945 + cl * 0.035;
      const alpha = FOG_ALPHA_LUT[uByte] * baseAlpha * (rimMask * (1 / 255));
      rgba[o] = Math.round(6 + cl * 5 + mist * 7);
      rgba[o + 1] = Math.round(9 + cl * 6 + mist * 9);
      rgba[o + 2] = Math.round(13 + cl * 8 + mist * 11);
      rgba[o + 3] = Math.round(alpha * 255);
    }
  }
}

// Smooth feathered unknown fog over the bake. ctx is already in bake-pixel space.
export function fillUnknown(ctx, grid, worldToBake, bakeScale) {
  if (!grid || !ctx) return;
  const st = typeof grid._internal === 'function' ? grid._internal() : null;
  const canUseOffscreen = !!(st && typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof ctx.drawImage === 'function');

  if (!canUseOffscreen) {
    // Fallback for headless unit tests or custom legacy grids without a DOM canvas.
    const { n, origin, cell } = grid;
    const s = cell * bakeScale;
    ctx.fillStyle = 'rgba(6, 8, 12, 0.94)';
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (grid.seen(origin + (i + 0.5) * cell, origin + (j + 0.5) * cell)) continue;
        const p = worldToBake(origin + (i + 1) * cell, origin + (j + 1) * cell);
        ctx.fillRect(p.x, p.y, s + 0.75, s + 0.75);
      }
    }
    return;
  }

  // If a caller never invoked advance(dt), render the target mask immediately.
  if (!st.hasAdvanced && st.animating) grid.snapVisual();

  let layer = FOG_CANVAS_CACHE.get(grid);
  if (!layer || layer.size !== st.size) {
    const canvas = document.createElement('canvas');
    canvas.width = st.size;
    canvas.height = st.size;
    const fctx = canvas.getContext('2d');
    const img = fctx.createImageData(st.size, st.size);
    layer = { size: st.size, canvas, ctx: fctx, img, initialized: false };
    FOG_CANVAS_CACHE.set(grid, layer);
  }

  let rect = st.consumeDirty();
  if (!layer.initialized) {
    rect = { x0: 0, y0: 0, x1: st.size - 1, y1: st.size - 1 };
    layer.initialized = true;
  }
  if (rect) {
    writeFogRect(layer.img.data, st.size, st.display, st.fields, rect.x0, rect.y0, rect.x1, rect.y1);
    layer.ctx.putImageData(
      layer.img,
      0,
      0,
      rect.x0,
      rect.y0,
      rect.x1 - rect.x0 + 1,
      rect.y1 - rect.y0 + 1,
    );
  }

  const p0 = worldToBake(st.origin, st.origin);
  const p1 = worldToBake(st.origin + st.span, st.origin + st.span);
  ctx.save();
  ctx.translate(p0.x, p0.y);
  ctx.scale((p1.x - p0.x) / st.size, (p1.y - p0.y) / st.size);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

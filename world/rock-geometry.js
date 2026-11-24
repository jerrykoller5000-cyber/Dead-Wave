// world/rock-geometry.js — AG-407: Procedural sculpted rock geometry & geological identity engine.
// Replaces generic dodecahedron/icosahedron/box/tetrahedron primitives with welded, cleavage-sculpted,
// geology-specific rock meshes adhering to docs/asset-principles.md (silhouette first, primary/secondary/
// tertiary forms, bevels/creased edges, grounded bases, polygon efficiency) and docs/world-design.md
// (environmental causality, clustering, scale relationships, zero floating/clipping).
//
// Pure ES module depending only on the passed THREE namespace (100% Node & browser compatible).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / ((b - a) || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 3D value noise for organic rock massing & strata warping
function hash3i(ix, iy, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 2147483647) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise3(x, y, z, seed = 1) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const c000 = hash3i(ix, iy, iz, seed),     c100 = hash3i(ix + 1, iy, iz, seed);
  const c010 = hash3i(ix, iy + 1, iz, seed), c110 = hash3i(ix + 1, iy + 1, iz, seed);
  const c001 = hash3i(ix, iy, iz + 1, seed), c101 = hash3i(ix + 1, iy, iz + 1, seed);
  const c011 = hash3i(ix, iy + 1, iz + 1, seed), c111 = hash3i(ix + 1, iy + 1, iz + 1, seed);
  const x00 = lerp(c000, c100, ux), x10 = lerp(c010, c110, ux);
  const x01 = lerp(c001, c101, ux), x11 = lerp(c011, c111, ux);
  return lerp(lerp(x00, x10, uy), lerp(x01, x11, uy), uz);
}

export function fbm3(x, y, z, seed = 1, octaves = 3) {
  let sum = 0, amp = 0.55, norm = 0, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += (vnoise3(x * freq, y * freq, z * freq, seed + i * 71) * 2 - 1) * amp;
    norm += amp;
    amp *= 0.48;
    freq *= 2.07;
  }
  return norm > 0 ? sum / norm : 0;
}

// =========================================================================
// WELDED ICOSPHERE BASE TOPOLOGY (detail 0 = 20 tris, 1 = 80 tris, 2 = 320 tris)
// Shared unique vertex list guarantees 100% watertight displacement with ZERO torn seams!
// =========================================================================
const ICO_CACHE = new Map();

export function getWeldedIcosphere(detail = 1) {
  const d = clamp(detail | 0, 0, 2);
  if (ICO_CACHE.has(d)) return ICO_CACHE.get(d);
  const t = (1 + Math.sqrt(5)) / 2;
  const verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(([x, y, z]) => {
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  });
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let s = 0; s < d; s++) {
    const mid = new Map();
    const mp = (a, b) => {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (mid.has(k)) return mid.get(k);
      const p = [(verts[a][0] + verts[b][0]) * 0.5, (verts[a][1] + verts[b][1]) * 0.5, (verts[a][2] + verts[b][2]) * 0.5];
      const l = Math.hypot(p[0], p[1], p[2]) || 1;
      verts.push([p[0] / l, p[1] / l, p[2] / l]);
      mid.set(k, verts.length - 1);
      return verts.length - 1;
    };
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = mp(a, b), bc = mp(b, c), ca = mp(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  const out = { verts, faces };
  ICO_CACHE.set(d, out);
  return out;
}

// =========================================================================
// GEOLOGICAL SPECIES CATALOG & ENVIRONMENTAL CAUSALITY
// =========================================================================
export const GEOLOGY_CATALOG = Object.freeze({
  granite: {
    id: 'granite',
    label: 'Sierra Granite',
    base: 0x868d94, dark: 0x4b5158, light: 0xb2b7bc,
    bed: 0.04, tough: 1.05, creaseDeg: 30, mossBias: 1.0, lichenBias: 1.15,
  },
  basalt: {
    id: 'basalt',
    label: 'Columnar Basalt',
    base: 0x4f555e, dark: 0x292d34, light: 0x767d88,
    bed: 0.05, tough: 1.30, creaseDeg: 24, mossBias: 0.65, lichenBias: 0.85,
  },
  sandstone: {
    id: 'sandstone',
    label: 'Cross-Bedded Sandstone',
    base: 0x9b876d, dark: 0x665643, light: 0xc2ae90,
    bed: 0.68, tough: 0.78, creaseDeg: 28, mossBias: 0.90, lichenBias: 0.75,
  },
  limestone: {
    id: 'limestone',
    label: 'Karst Limestone',
    base: 0x92978d, dark: 0x575d55, light: 0xb7bcb1,
    bed: 0.38, tough: 0.88, creaseDeg: 28, mossBias: 1.20, lichenBias: 1.25,
  },
  schist: {
    id: 'schist',
    label: 'Foliated Silver Schist',
    base: 0x696c75, dark: 0x3b3d46, light: 0x9296a0,
    bed: 0.58, tough: 0.94, creaseDeg: 24, mossBias: 0.72, lichenBias: 0.95,
  },
});

export const VALLEY_GEOLOGY_IDS = Object.freeze(['granite', 'basalt', 'sandstone', 'limestone', 'schist']);

// Determine a rock's geological identity from real world context (docs/world-design.md Rules 2 & 13)
// plus deterministic seed variation so even nearby rocks have authentic geological richness.
export function pickRockGeology({ x = 0, z = 0, h = 0, slope = 0, seed = 1, nearCaveTheme = null, nearWater = false } = {}) {
  const rnd = mulberry32((seed ^ 0x51a7e29) >>> 0);
  const r = rnd();

  // Strong geological echo near the 6 named caves
  if (nearCaveTheme && r < 0.62) {
    if (nearCaveTheme === 'wet') return 'basalt';
    if (nearCaveTheme === 'shale') return 'schist';
    if (nearCaveTheme === 'chalk') return 'limestone';
    if (nearCaveTheme === 'iron') return r < 0.38 ? 'sandstone' : 'basalt';
    if (nearCaveTheme === 'root') return r < 0.35 ? 'sandstone' : 'granite';
    if (nearCaveTheme === 'hill') return 'granite';
  }

  // Regional geological drift so the valley has coherent formations rather than confetti
  const reg = vnoise3(x * 0.011 + 3.1, 0.5, z * 0.011 - 1.7, 709);

  // High altitude / alpine slopes -> Granite & Basalt crags
  if (h > 22 || slope > 0.44) {
    if (r < 0.40) return 'granite';
    if (r < 0.72) return 'basalt';
    if (r < 0.88) return 'schist';
    return 'limestone';
  }
  // Lowlands near river / lake -> Karst Limestone & weathered Granite/Sandstone
  if (nearWater || h < 3.5) {
    if (r < 0.38) return 'limestone';
    if (r < 0.68) return 'granite';
    if (r < 0.86) return 'sandstone';
    return 'basalt';
  }
  // Mid-valley forest outcrops & hillsides: regional geological beds
  if (reg < 0.30) {
    return r < 0.48 ? 'sandstone' : r < 0.76 ? 'granite' : r < 0.90 ? 'limestone' : 'schist';
  } else if (reg < 0.60) {
    return r < 0.44 ? 'granite' : r < 0.68 ? 'limestone' : r < 0.86 ? 'basalt' : 'sandstone';
  } else {
    return r < 0.36 ? 'schist' : r < 0.64 ? 'basalt' : r < 0.84 ? 'granite' : 'sandstone';
  }
}

// =========================================================================
// ANGLE-WEIGHTED CREASED NORMALS + CLEAN METRE-SCALE BOX UV PROJECTOR
// Produces crisp geological ridges alongside smooth micro-lit faces, and clean UVs!
// =========================================================================
function buildCreasedBufferGeometry(THREE, verts, faces, curvatures, {
  creaseDeg = 38,
  uvTile = 1.15,
  uvOffset = [0, 0],
  phaseAttr = null,
} = {}) {
  const cosThresh = Math.cos((creaseDeg * Math.PI) / 180);
  const fCount = faces.length;
  const fNormals = new Array(fCount);
  const fAreas = new Float32Array(fCount);
  const vFaces = Array.from({ length: verts.length }, () => []);

  for (let fi = 0; fi < fCount; fi++) {
    const [ia, ib, ic] = faces[fi];
    const A = verts[ia], B = verts[ib], C = verts[ic];
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    fAreas[fi] = l * 0.5;
    if (l > 1e-8) { nx /= l; ny /= l; nz /= l; } else { nx = 0; ny = 1; nz = 0; }
    fNormals[fi] = [nx, ny, nz];
    vFaces[ia].push(fi);
    vFaces[ib].push(fi);
    vFaces[ic].push(fi);
  }

  const triVerts = fCount * 3;
  const P = new Float32Array(triVerts * 3);
  const N = new Float32Array(triVerts * 3);
  const UV = new Float32Array(triVerts * 2);
  const CURV = new Float32Array(triVerts);
  const invTile = 1 / Math.max(0.05, uvTile);

  let o = 0;
  for (let fi = 0; fi < fCount; fi++) {
    const fn = fNormals[fi];
    const tri = faces[fi];
    const afx = Math.abs(fn[0]), afy = Math.abs(fn[1]), afz = Math.abs(fn[2]);
    // Per-face dominant projection axis ensures ZERO UV distortion across a single triangle!
    const axis = afy >= afx && afy >= afz ? 1 : (afx >= afz ? 0 : 2);
    for (let k = 0; k < 3; k++) {
      const vi = tri[k];
      const v = verts[vi];
      // Blend adjacent face normals within creaseDeg threshold
      let sx = 0, sy = 0, sz = 0;
      const adj = vFaces[vi];
      for (let j = 0; j < adj.length; j++) {
        const ofi = adj[j];
        const on = fNormals[ofi];
        const dot = fn[0] * on[0] + fn[1] * on[1] + fn[2] * on[2];
        if (ofi === fi || dot >= cosThresh) {
          const w = fAreas[ofi] + 1e-6;
          sx += on[0] * w; sy += on[1] * w; sz += on[2] * w;
        }
      }
      const sl = Math.hypot(sx, sy, sz) || 1;
      const nx = sx / sl, ny = sy / sl, nz = sz / sl;

      const w3 = o * 3, w2 = o * 2;
      P[w3] = v[0]; P[w3 + 1] = v[1]; P[w3 + 2] = v[2];
      N[w3] = nx;   N[w3 + 1] = ny;   N[w3 + 2] = nz;
      if (phaseAttr) {
        UV[w2] = phaseAttr[0];
        UV[w2 + 1] = phaseAttr[1];
      } else {
        const u = axis === 1 ? v[0] : axis === 0 ? v[2] : v[0];
        const vv = axis === 1 ? v[2] : v[1];
        UV[w2] = u * invTile + uvOffset[0];
        UV[w2 + 1] = vv * invTile + uvOffset[1];
      }
      CURV[o] = curvatures ? curvatures[vi] : 0;
      o++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  geo.userData.rockCurvature = CURV;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// Project clean metre-scale box UVs onto any existing BufferGeometry (for stone-wall-kit, etc.)
export function projectStoneBoxUV(geo, tile = 1.0, offset = [0, 0]) {
  if (!geo || !geo.attributes || !geo.attributes.position) return geo;
  const pos = geo.attributes.position;
  let nrm = geo.attributes.normal;
  if (!nrm && typeof geo.computeVertexNormals === 'function') {
    geo.computeVertexNormals();
    nrm = geo.attributes.normal;
  }
  const n = pos.count;
  const uv = new Float32Array(n * 2);
  const inv = 1 / Math.max(0.05, tile);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = nrm ? Math.abs(nrm.getX(i)) : 0;
    const ay = nrm ? Math.abs(nrm.getY(i)) : 1;
    const az = nrm ? Math.abs(nrm.getZ(i)) : 0;
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; }
    else if (ax >= ay && ax >= az) { u = z; v = y; }
    else { u = x; v = y; }
    uv[i * 2] = u * inv + offset[0];
    uv[i * 2 + 1] = v * inv + offset[1];
  }
  geo.setAttribute('uv', new pos.constructor(uv, 2));
  return geo;
}

// =========================================================================
// CORE GEOLOGICAL ROCK SCULPTOR (`sculptRockGeometry`)
// Generates a single watertight, cleavage-cut, geology-styled rock piece!
// =========================================================================
export function sculptRockGeometry(THREE, {
  radius = 0.6,
  detail = 2,
  seed = 1,
  style = 'granite',
  scale = [1, 1, 1],
  flatBase = 0.34,
  planes = 6,
  angularity = 0.36,
  bedTilt = [0, 0],
  creaseDeg = null,
  uvTile = 1.15,
} = {}) {
  const rnd = mulberry32(seed >>> 0);
  const base = getWeldedIcosphere(detail);
  const sx = scale[0], sy = scale[1], sz = scale[2];

  // Generate geological cleavage planes: { nx, ny, nz, d, hardness }
  const cuts = [];
  const nPlanes = Math.max(0, planes | 0);
  const dipX = bedTilt[0] || (rnd() - 0.5) * 0.45;
  const dipZ = bedTilt[1] || (rnd() - 0.5) * 0.45;

  for (let k = 0; k < nPlanes; k++) {
    let nx, ny, nz, dist, hard;
    if (style === 'basalt') {
      // Hexagonal/polygonal vertical columnar sides + flat fractured top!
      if (k === 0) {
        nx = (rnd() - 0.5) * 0.28; ny = 1.0; nz = (rnd() - 0.5) * 0.28;
        dist = 0.66 + rnd() * 0.22; hard = 0.88;
      } else {
        const a = ((k - 1) / Math.max(1, nPlanes - 1)) * Math.PI * 2 + (rnd() - 0.5) * 0.38;
        nx = Math.cos(a); ny = (rnd() - 0.5) * 0.24; nz = Math.sin(a);
        dist = 0.64 + rnd() * 0.24; hard = 0.84;
      }
    } else if (style === 'schist') {
      // Strongly angled parallel diagonal cleavage shears + cross-fracture
      const sign = k % 2 === 0 ? 1 : -1;
      if (k < nPlanes - 2) {
        nx = sign * (0.72 + (rnd() - 0.5) * 0.22) + dipX * 0.4;
        ny = sign * (0.55 + (rnd() - 0.5) * 0.22);
        nz = (rnd() - 0.5) * 0.38 + dipZ * 0.4;
        dist = 0.58 + rnd() * 0.28; hard = 0.85;
      } else {
        const a = rnd() * Math.PI * 2;
        nx = Math.cos(a); ny = 0.25 + rnd() * 0.5; nz = Math.sin(a);
        dist = 0.68 + rnd() * 0.24; hard = 0.72;
      }
    } else if (style === 'sandstone') {
      // Dominant horizontal bedding planes + broad stepped side faces
      if (k < 2) {
        nx = dipX * 0.5 + (rnd() - 0.5) * 0.14;
        ny = k === 0 ? 1.0 : -0.9;
        nz = dipZ * 0.5 + (rnd() - 0.5) * 0.14;
        dist = k === 0 ? 0.66 + rnd() * 0.20 : 0.76; hard = 0.78;
      } else {
        const a = ((k - 2) / Math.max(1, nPlanes - 2)) * Math.PI * 2 + (rnd() - 0.5) * 0.55;
        nx = Math.cos(a); ny = (rnd() - 0.5) * 0.32; nz = Math.sin(a);
        dist = 0.72 + rnd() * 0.22; hard = 0.68;
      }
    } else if (style === 'limestone') {
      // Dissolved karst shoulders: crisp stepped upper solution flats + steep block sides
      const a = (k / Math.max(1, nPlanes)) * Math.PI * 2 + (rnd() - 0.5) * 0.48;
      nx = Math.cos(a); ny = (k % 3 === 0 ? 0.72 : (rnd() - 0.32) * 0.62); nz = Math.sin(a);
      dist = 0.61 + rnd() * 0.21; hard = 0.80;
    } else if (style === 'river') {
      // Water-tumbled gentle flattening (oblate river stone)
      const a = (k / Math.max(1, nPlanes)) * Math.PI * 2 + rnd() * 0.6;
      nx = Math.cos(a) * 0.6; ny = k === 0 ? 1.0 : (rnd() - 0.5) * 0.7; nz = Math.sin(a) * 0.6;
      dist = 0.78 + rnd() * 0.16; hard = 0.38;
    } else if (style === 'ironstone') {
      // Jagged blocky ore fracture planes
      const a = (k / Math.max(1, nPlanes)) * Math.PI * 2 + (rnd() - 0.5) * 0.45;
      nx = Math.cos(a); ny = (rnd() - 0.35) * 0.85; nz = Math.sin(a);
      dist = 0.62 + rnd() * 0.26; hard = 0.84;
    } else {
      // Granite / general erratic / hewn: broad exfoliated faces + crisp split shoulders
      const a = (k / Math.max(1, nPlanes)) * Math.PI * 2 + (rnd() - 0.5) * 0.52;
      nx = Math.cos(a); ny = (k === 0 ? 0.76 : (rnd() - 0.30) * 0.78); nz = Math.sin(a);
      dist = 0.62 + rnd() * 0.22; hard = 0.78;
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    cuts.push({ nx: nx / l, ny: ny / l, nz: nz / l, d: dist, hard: hard * clamp(angularity * 2.1, 0.25, 1.0) });
  }

  // Asymmetric elongation & macro-lobe vectors so every rock has a distinct silhouette!
  const lobeAx = rnd() * Math.PI * 2;
  const lobeDx = Math.cos(lobeAx), lobeDz = Math.sin(lobeAx);
  const fluteN = 5 + ((rnd() * 4) | 0);
  const flutePhase = rnd() * Math.PI * 2;
  const strataPhase = rnd() * Math.PI * 2;

  const verts = new Array(base.verts.length);
  const curvatures = new Float32Array(base.verts.length);

  for (let i = 0; i < base.verts.length; i++) {
    let [x, y, z] = base.verts[i];

    // 1. Primary macro rock massing (domain-warped 3D FBM + asymmetric directional shoulder)
    const f1 = fbm3(x * 1.35 + 2.1, y * 1.35 - 1.4, z * 1.35 + 0.7, seed, 3);
    const f2 = fbm3(x * 2.9 - 3.2, y * 2.9 + 1.8, z * 2.9 - 2.4, seed ^ 0x5f3a7b, 2);
    const shoulder = Math.max(0, x * lobeDx + z * lobeDz) * 0.16 * (0.4 + 0.6 * (1 - Math.abs(y)));
    let r = 1.0 + f1 * (style === 'river' ? 0.14 : 0.26) + f2 * (style === 'river' ? 0.04 : 0.10) + shoulder;

    // 2. Geology-specific structural sculpture!
    let geoRelief = 0;
    if (style === 'sandstone') {
      // Undulating sedimentary strata ribs + undercut waist ledges carved into actual geometry!
      const syCoord = y + x * dipX * 0.35 + z * dipZ * 0.35;
      const rib = Math.sin(syCoord * 11.5 + strataPhase + f1 * 2.2) * 0.075
                + Math.sin(syCoord * 23.0 + strataPhase * 1.7) * 0.028;
      // Subtle wind-eroded waist undercut near lower-mid section
      const undercut = -Math.exp(-Math.pow((y + 0.18) / 0.24, 2)) * 0.09;
      geoRelief = rib + undercut;
    } else if (style === 'limestone') {
      // Vertical rain-dissolved karst flutes (rillenkarren) + bold stepped karst shelves
      const ang = Math.atan2(z, x);
      const flute = Math.sin(ang * fluteN + flutePhase + f1 * 1.8) * 0.092 * (1 - Math.abs(y) * 0.45);
      const shelf = Math.sin(y * 8.2 + strataPhase) * 0.068;
      geoRelief = flute + shelf;
    } else if (style === 'schist') {
      // Diagonal razor foliation ridges sheared along the rock's dip plane
      const fol = x * 0.65 + y * 0.75 + z * dipZ * 0.4;
      const saw = (((fol * 3.8 + strataPhase) % 1) + 1) % 1;
      geoRelief = (saw - 0.5) * 0.13;
    } else if (style === 'basalt') {
      // Crisp stepped vertical cooling flutes + fractured top bench
      const ang = Math.atan2(z, x);
      const step = Math.cos(ang * (5 + (seed & 1)) + flutePhase) * 0.065;
      geoRelief = step;
    } else if (style === 'ironstone') {
      // Deep angular fractured ore notches
      const notch = (1 - Math.abs(f2 * 2)) * -0.10;
      geoRelief = notch;
    } else if (style === 'granite') {
      // Exfoliated curved dome spalling + crisp diagonal joint groove
      const joint = Math.exp(-Math.pow((x * 0.7 - z * 0.7 + y * 0.3 + f1 * 0.35) / 0.14, 2)) * -0.135;
      geoRelief = joint;
    }
    r += geoRelief;

    x *= r; y *= r; z *= r;

    // 3. Apply geological cleavage planes (smooth-min half-space clipping creates authentic broad rock faces + crisp ridges!)
    let cutDepth = 0;
    let ridgeHit = 0;
    for (let k = 0; k < cuts.length; k++) {
      const c = cuts[k];
      const proj = x * c.nx + y * c.ny + z * c.nz;
      const over = proj - c.d;
      if (over > 0) {
        const push = over * c.hard;
        x -= c.nx * push;
        y -= c.ny * push;
        z -= c.nz * push;
        cutDepth += over;
        if (over < 0.14) ridgeHit += (0.14 - over) * 3.5;
      }
    }

    // 4. Grounded base skirt: rocks flatten and widen gently at the foot so they sit rooted in earth
    if (flatBase > 0 && y < -0.12) {
      const bf = clamp((-y - 0.12) / 0.88, 0, 1);
      const flare = 1 + bf * flatBase * 0.32;
      x *= flare;
      z *= flare;
      y = lerp(y, -0.46, bf * flatBase * 0.82);
    }

    // Apply requested scale & radius
    verts[i] = [x * radius * sx, y * radius * sy, z * radius * sz];
    // Curvature proxy: positive on exposed ridges/crowns, negative in recessed flutes/joints/undercuts
    curvatures[i] = clamp(geoRelief * 4.5 + ridgeHit * 0.35 + (y > 0.25 ? 0.18 : 0) - cutDepth * 0.55, -1, 1);
  }

  const deg = creaseDeg != null
    ? creaseDeg
    : (GEOLOGY_CATALOG[style] ? GEOLOGY_CATALOG[style].creaseDeg : style === 'river' ? 58 : 36);
  const uvOff = [rnd(), rnd()];

  return buildCreasedBufferGeometry(THREE, verts, base.faces, curvatures, {
    creaseDeg: deg,
    uvTile,
    uvOffset: uvOff,
  });
}

// =========================================================================
// SCULPTED STRATIFIED ROCK SLAB PLATE (for layered sandstone/limestone/slate outcrops)
// Multi-segment organically beveled stone plate — NEVER a boxy crate!
// =========================================================================
export function sculptSlabGeometry(THREE, {
  w = 1.4, h = 0.32, d = 1.0, seed = 1, style = 'sandstone', creaseDeg = 34, uvTile = 1.15
} = {}) {
  const rnd = mulberry32(seed >>> 0);
  // Build as a sculpted 10-sided beveled rock prism (3 height rings + top/bottom caps)
  const sides = 10;
  const radii = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const wob = 0.78 + rnd() * 0.36;
    radii.push([Math.cos(a) * w * 0.5 * wob, Math.sin(a) * d * 0.5 * wob]);
  }
  const ringY = [-0.5, -0.14, 0.22, 0.5];
  const ringScale = [0.96, 1.05, 0.98, 0.86]; // slight overhang & beveled top ledge!
  const verts = [];
  const curvatures = [];
  const faces = [];

  for (let r = 0; r < ringY.length; r++) {
    const yf = ringY[r];
    const rs = ringScale[r];
    for (let i = 0; i < sides; i++) {
      const [bx, bz] = radii[i];
      const n = fbm3(bx * 1.4, yf * 2.2, bz * 1.4, seed + r * 31, 2);
      const strata = style === 'sandstone' ? Math.sin(yf * 12 + seed) * 0.06 : 0;
      const sc = rs + n * 0.14 + strata;
      const vx = bx * sc;
      const vy = yf * h + fbm3(bx * 1.8, 0, bz * 1.8, seed + 97, 2) * h * 0.22;
      const vz = bz * sc;
      verts.push([vx, vy, vz]);
      curvatures.push(r === 3 ? 0.35 + n * 0.3 : r === 1 ? 0.22 : -0.18 + n * 0.2);
    }
  }
  // Top & bottom center vertices
  const topCenterIdx = verts.length;
  verts.push([0, h * (0.54 + (rnd() - 0.5) * 0.12), 0]);
  curvatures.push(0.25);
  const botCenterIdx = verts.length;
  verts.push([0, -h * 0.52, 0]);
  curvatures.push(-0.45);

  // Side bands (CCW outward winding for cos(a),sin(a) clockwise ring!)
  for (let r = 0; r < ringY.length - 1; r++) {
    const a0 = r * sides, b0 = (r + 1) * sides;
    for (let i = 0; i < sides; i++) {
      const ni = (i + 1) % sides;
      faces.push([a0 + i, b0 + ni, a0 + ni]);
      faces.push([a0 + i, b0 + i, b0 + ni]);
    }
  }
  // Top cap (+Y outward) & bottom cap (-Y outward)
  const topRing = (ringY.length - 1) * sides;
  for (let i = 0; i < sides; i++) {
    const ni = (i + 1) % sides;
    faces.push([topCenterIdx, topRing + ni, topRing + i]);
    faces.push([botCenterIdx, i, ni]);
  }

  return buildCreasedBufferGeometry(THREE, verts, faces, curvatures, {
    creaseDeg,
    uvTile,
    uvOffset: [rnd(), rnd()],
  });
}

// =========================================================================
// SCULPTED CRAG SPIRE / COLUMNAR PRISM (replaces raw 5-sided cylinders!)
// =========================================================================
export function sculptSpireGeometry(THREE, {
  rBot = 0.45, rTop = 0.16, height = 1.6, sides = 7, rings = 5, seed = 1, style = 'basalt', uvTile = 1.15
} = {}) {
  const rnd = mulberry32(seed >>> 0);
  const verts = [];
  const curvatures = [];
  const faces = [];

  // Per-side angular profile (irregular basalt/schist facets, not a perfect circle)
  const angs = [], sideR = [];
  for (let i = 0; i < sides; i++) {
    angs.push((i / sides) * Math.PI * 2 + (rnd() - 0.5) * (Math.PI / sides) * 0.55);
    sideR.push(0.80 + rnd() * 0.38);
  }
  const leanX = (rnd() - 0.5) * rBot * 0.58;
  const leanZ = (rnd() - 0.5) * rBot * 0.58;
  const snapTiltX = (rnd() - 0.5) * 0.48;
  const snapTiltZ = (rnd() - 0.5) * 0.48;
  // Deep buried bedrock root skirt (-0.28 * height) guarantees zero floating edges even on 30-deg slopes!
  const rootDepth = height * 0.28;

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    // Slight stepped basalt / hoodoo taper rather than straight cone
    const stepProfile = style === 'sandstone'
      ? 1 + Math.sin(t * Math.PI * 4.5 + seed) * 0.12
      : style === 'basalt'
        ? (t > 0.72 ? 0.86 : 1.0)
        : 1.0;
    const baseFlare = r === 0 ? 1.16 : 1.0;
    const rad = lerp(rBot, rTop, Math.pow(t, 0.88)) * stepProfile * baseFlare;
    const cx = leanX * t * t;
    const cz = leanZ * t * t;
    for (let i = 0; i < sides; i++) {
      const a = angs[i];
      const n = fbm3(Math.cos(a) * 1.8, t * 3.0, Math.sin(a) * 1.8, seed + i * 13, 2);
      const rr = rad * sideR[i] * (1 + n * 0.20);
      const vx = cx + Math.cos(a) * rr;
      const vz = cz + Math.sin(a) * rr;
      // Ring 0 sits deeply buried (-rootDepth); rings 1..rings rise smoothly from ground to snapped oblique peak!
      let vy = r === 0 ? -rootDepth : ((r - 1) / Math.max(1, rings - 1)) * height;
      if (r === rings) vy += (Math.cos(a) * snapTiltX + Math.sin(a) * snapTiltZ) * rTop * 1.6;
      else if (r > 1) vy += n * height * 0.04;
      verts.push([vx, vy, vz]);
      curvatures.push(r === rings ? 0.5 : (n * 0.6 + (t > 0.45 ? 0.18 : -0.18)));
    }
  }
  const topIdx = verts.length;
  verts.push([leanX, height + rTop * 0.18, leanZ]);
  curvatures.push(0.45);
  const botIdx = verts.length;
  verts.push([0, -rootDepth - 0.05, 0]);
  curvatures.push(-0.5);

  // Outward CCW winding!
  for (let r = 0; r < rings; r++) {
    const a0 = r * sides, b0 = (r + 1) * sides;
    for (let i = 0; i < sides; i++) {
      const ni = (i + 1) % sides;
      faces.push([a0 + i, b0 + ni, a0 + ni]);
      faces.push([a0 + i, b0 + i, b0 + ni]);
    }
  }
  const topRing = rings * sides;
  for (let i = 0; i < sides; i++) {
    const ni = (i + 1) % sides;
    faces.push([topIdx, topRing + ni, topRing + i]);
    faces.push([botIdx, i, ni]);
  }

  return buildCreasedBufferGeometry(THREE, verts, faces, curvatures, {
    creaseDeg: style === 'basalt' || style === 'schist' ? 24 : 30,
    uvTile,
    uvOffset: [rnd(), rnd()],
  });
}

// =========================================================================
// ANCIENT MENHIR / PIT MONOLITH / MEGALITH SCULPTOR
// Replaces BoxGeometry / crude jittered boxes for First People & Pit standing stones!
// =========================================================================
export function buildMenhirGeometry(THREE, w, h, t, rnd, {
  taper = 0.30, crown = 0.18, jitter = 0.045, chipStrength = 0.05, uvStretchY = 1.0, flatFront = false
} = {}) {
  const geo = new THREE.BoxGeometry(w, h, t, 6, 10, 3);
  geo.translate(0, h / 2, 0);
  const p = geo.attributes.position;
  const bumps = [rnd(), rnd(), rnd(), rnd()].map(v => v * 6.28);
  const crownSkew = (rnd() - 0.5) * 0.24;
  const chipSeed = ((rnd() * 0x7fffffff) | 0) || 17;

  // Welded corner-safe deformation by vertex coordinates
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = clamp(y / (h || 1), 0, 1);
    const sc = 1 - taper * f * f;
    // Softly chamfer vertical corners so ancient stone arrises catch light instead of razor box edges
    const nx = Math.abs(x) / (w * 0.5 || 1);
    const nz = Math.abs(z) / (t * 0.5 || 1);
    const corner = sstep(0.72, 1.0, nx) * sstep(0.72, 1.0, nz);
    const chamf = 1 - corner * 0.13;
    const isFrontGlyphFace = flatFront && z > 0 && nz > 0.75;
    x *= sc * chamf;
    z *= sc * chamf;
    // Worn asymmetrical natural fracture crown
    if (f > 0.76) {
      const ct = (f - 0.76) / 0.24;
      y -= crown * h * (nx * nx) * ct;
      y += crownSkew * x * ct;
    }
    // Natural stone strata undulations + spalled edge chips
    const n1 = Math.sin(x * 3.4 + bumps[0]) * Math.cos(y * 2.1 + bumps[1])
             + Math.sin(z * 4.5 + y * 1.9 + bumps[2]) * 0.55;
    const chip = fbm3(x * 2.4, y * 1.8, z * 2.4, chipSeed, 2);
    x += n1 * jitter + chip * chipStrength * (0.4 + 0.6 * corner);
    if (isFrontGlyphFace) {
      // Hand-dressed carved face: subtle recessed tooling, NEVER bulges forward into First People runes!
      const edgeMask = sstep(0.68, 1.0, nx) + sstep(0.82, 1.0, f);
      const safeCap = (t * 0.5) * sc * chamf - 0.005;
      const dress = (chip * 0.5 - 0.35) * chipStrength * (0.18 + 0.65 * clamp(edgeMask, 0, 1));
      z = Math.min(safeCap, z + dress);
    } else {
      z += Math.cos(y * 2.7 + bumps[3]) * jitter * 0.8 + chip * chipStrength * 0.65;
    }
    p.setXYZ(i, x, Math.max(0, y), z);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  // Clean face-normal-driven UV mapping (V=1 at top, V=0 at foot so monolith moss sits at base, ZERO corduroy stretch!)
  const uv = geo.attributes.uv;
  const nrm = geo.attributes.normal;
  if (uv && nrm) {
    const uSpan = Math.max(0.45, Math.min(w, 2.2));
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
      let u, v;
      if (ay > ax && ay > az) {
        u = x / uSpan + 0.5;
        v = z / Math.max(0.35, t) + 0.5;
      } else if (ax > az) {
        u = z / uSpan + 0.5;
        v = clamp((y / (h || 1)) * uvStretchY, 0, 1);
      } else {
        u = x / uSpan + 0.5;
        v = clamp((y / (h || 1)) * uvStretchY, 0, 1);
      }
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
  }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// =========================================================================
// FLUTED CARVED LIMESTONE COLUMN (for world/heart.js)
// =========================================================================
export function buildFlutedColumnGeometry(THREE, rTop, rBot, h, seed = 1) {
  const segs = 16, hSegs = 6;
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, segs, hSegs);
  const p = geo.attributes.position;
  const rnd = mulberry32(seed >>> 0);
  const phase = rnd() * Math.PI * 2;
  const flutes = 8;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const ang = Math.atan2(z, x);
    const ty = (y + h * 0.5) / (h || 1);
    const endFade = sstep(0.0, 0.12, ty) * sstep(1.0, 0.88, ty);
    const flute = Math.cos(ang * flutes + phase) * 0.075 * endFade;
    const organic = fbm3(x * 0.7, y * 0.35, z * 0.7, seed, 2) * 0.085;
    const sc = 1 + flute + organic;
    p.setXYZ(i, x * sc, y, z * sc);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// =========================================================================
// VALLEY ROCK MERGE & RICH GEOLOGICAL VERTEX SHADING
// Preserves position, normal, uv, AND curvature-driven AO/ridge-wear/moss/lichen/moisture!
// =========================================================================
export function mergeSculptedRockParts(THREE, parts, material, {
  castShadow = true, receiveShadow = true, phaseOffset = null
} = {}) {
  const mat4 = new THREE.Matrix4();
  const nrmMat = new THREE.Matrix3();
  const tmpV = new THREE.Vector3();
  let total = 0;
  for (const p of parts) {
    const g = p.geometry;
    total += g.index ? g.index.count : g.attributes.position.count;
  }
  const P = new Float32Array(total * 3);
  const N = new Float32Array(total * 3);
  const C = new Float32Array(total * 3);
  const UV = new Float32Array(total * 2);
  const CURV = new Float32Array(total);
  let o = 0;

  for (const p of parts) {
    p.updateMatrix();
    mat4.copy(p.matrix);
    nrmMat.getNormalMatrix(mat4);
    const g = p.geometry;
    const pos = g.attributes.position;
    const nrm = g.attributes.normal;
    const uv = g.attributes.uv;
    const ix = g.index ? g.index.array : null;
    const count = ix ? ix.length : pos.count;
    const col = p.material && p.material.color ? p.material.color : { r: 0.55, g: 0.55, b: 0.55 };
    const partCurv = g.userData && g.userData.rockCurvature;

    for (let i = 0; i < count; i++) {
      const vi = ix ? ix[i] : i;
      const w3 = (o + i) * 3, w2 = (o + i) * 2;
      tmpV.set(pos.getX(vi), pos.getY(vi), pos.getZ(vi)).applyMatrix4(mat4);
      P[w3] = tmpV.x; P[w3 + 1] = tmpV.y; P[w3 + 2] = tmpV.z;
      if (nrm) {
        tmpV.set(nrm.getX(vi), nrm.getY(vi), nrm.getZ(vi)).applyMatrix3(nrmMat).normalize();
        N[w3] = tmpV.x; N[w3 + 1] = tmpV.y; N[w3 + 2] = tmpV.z;
      } else {
        N[w3] = 0; N[w3 + 1] = 1; N[w3 + 2] = 0;
      }
      C[w3] = col.r; C[w3 + 1] = col.g; C[w3 + 2] = col.b;
      if (phaseOffset) {
        // Store clean tileable UVs OR shifted UVs that stay unique per rock!
        const u0 = uv ? uv.getX(vi) : P[w3];
        const v0 = uv ? uv.getY(vi) : P[w3 + 1];
        UV[w2] = u0 + phaseOffset[0];
        UV[w2 + 1] = v0 + phaseOffset[1];
      } else if (uv) {
        UV[w2] = uv.getX(vi);
        UV[w2 + 1] = uv.getY(vi);
      } else {
        UV[w2] = P[w3];
        UV[w2 + 1] = P[w3 + 1];
      }
      CURV[o + i] = partCurv && vi < partCurv.length ? partCurv[vi] : 0;
    }
    o += count;
    g.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  geo.userData.rockCurvature = CURV;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = !!castShadow;
  mesh.receiveShadow = !!receiveShadow;
  return mesh;
}

// Rich geological vertex shading:
// - Ground-contact moisture & soil AO darkening at the foot
// - Sun-bleached crown + ridge edge wear from baked curvature
// - Crevice darkening in recessed joints/flutes
// - Organic directional moss (up-facing + north/shaded bias per docs/art-direction.md!)
// - Crustose lichen patches on exposed upper facets
// - Geological mineral banding (sandstone beds, schist foliation, karst streaks)
export function shadeSculptedRock(THREE, mesh, {
  geology = 'granite',
  seed = 1,
  mossAmt = 0.35,
  lichenAmt = 0.30,
  mossHex = 0x466d2e,
  lichenHex = 0x9aa470,
  ironTint = 0.0,
} = {}) {
  const geo = mesh.geometry;
  const col = geo.attributes.color, pos = geo.attributes.position, nrm = geo.attributes.normal;
  if (!col || !pos) return;
  const curv = geo.userData && geo.userData.rockCurvature;
  const spec = GEOLOGY_CATALOG[geology] || GEOLOGY_CATALOG.granite;

  const cMoss = new THREE.Color(mossHex);
  const cLichen = new THREE.Color(lichenHex);
  const cSoil = new THREE.Color(0x3a352c);
  const cRust = new THREE.Color(0x7c4a30);

  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = Math.max(0.15, maxY - minY);

  // Subtle individual rock mineral hue drift (keeps every rock distinct without leaving <45% sat!)
  const rnd = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const warmShift = (rnd() - 0.5) * 0.07;
  const valShift = 0.93 + rnd() * 0.14;
  const bedAngle = (rnd() - 0.5) * 0.65;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = nrm ? nrm.getX(i) : 0;
    const ny = nrm ? nrm.getY(i) : 1;
    const nz = nrm ? nrm.getZ(i) : 0;
    const t = clamp((y - minY) / span, 0, 1);
    const cv = curv && i < curv.length ? curv[i] : 0;

    // Height lighting + ground-contact AO + ridge highlight / crevice shadow
    let k = (0.64 + 0.44 * Math.pow(t, 0.72)) * valShift;
    k *= 1 + cv * 0.16; // brighter bleached ridges, darker crevices
    k *= 1 + fbm3(x * 2.2, y * 2.2, z * 2.2, seed ^ 0x2b1d05, 2) * 0.14;

    // Sedimentary / metamorphic mineral banding
    if (spec.bed > 0.05) {
      const bCoord = geology === 'schist' ? (y * 10 + x * 7 + z * 4) : (y * 14 + x * bedAngle * 5);
      const bNoise = fbm3(x * 0.8, y * 0.6, z * 0.8, seed + 19, 2);
      k *= 1 + Math.sin(bCoord + bNoise * 3.5 + seed) * 0.11 * spec.bed;
    }

    let r = clamp(col.getX(i) * k * (1 + warmShift), 0, 1);
    let g = clamp(col.getY(i) * k * (1 + warmShift * 0.3), 0, 1);
    let b = clamp(col.getZ(i) * k * (1 - warmShift * 0.8), 0, 1);

    // Optional iron-ore staining (near Rust Maw cave or iron-rich sandstone)
    if (ironTint > 0.01) {
      const rustField = sstep(0.35, 0.78, vnoise3(x * 1.4, y * 0.6, z * 1.4, seed ^ 0x4120));
      const ra = ironTint * rustField * 0.45;
      r = lerp(r, cRust.r, ra); g = lerp(g, cRust.g, ra); b = lerp(b, cRust.b, ra);
    }

    // Ground-contact damp soil skirt (bottom 22% of rock)
    const footSoil = (1 - sstep(0.0, 0.24, t)) * (0.48 + 0.22 * (1 - clamp(ny, 0, 1)));
    r = lerp(r, cSoil.r * 0.85, footSoil);
    g = lerp(g, cSoil.g * 0.85, footSoil);
    b = lerp(b, cSoil.b * 0.85, footSoil);

    // Organic moss on up-facing surfaces & shaded/north ledges (docs/art-direction.md!)
    const effMoss = mossAmt * spec.mossBias;
    if (effMoss > 0.01 && ny > 0.22) {
      const northBias = 0.78 + clamp(-nz, 0, 1) * 0.35;
      const mField = vnoise3(x * 2.1, y * 1.8, z * 2.1, seed ^ 0x5eed17);
      const m = sstep(0.22, 0.72, ny) * sstep(0.36, 0.68, mField) * clamp(0.28 + t * 0.85, 0, 1) * clamp(effMoss * northBias, 0, 0.92);
      r = lerp(r, cMoss.r, m); g = lerp(g, cMoss.g, m); b = lerp(b, cMoss.b, m);
    }

    // Crustose lichen patches on upper weathered rock faces
    const effLichen = lichenAmt * spec.lichenBias;
    if (effLichen > 0.01 && t > 0.24) {
      const lField = vnoise3(x * 4.2 + 3.1, y * 4.2, z * 4.2 - 1.9, seed ^ 0x1c4e9b);
      const l = sstep(0.62, 0.82, lField) * sstep(0.22, 0.60, t) * clamp(effLichen * 0.78, 0, 0.82);
      r = lerp(r, cLichen.r, l); g = lerp(g, cLichen.g, l); b = lerp(b, cLichen.b, l);
    }

    col.setXYZ(i, clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
  }
  col.needsUpdate = true;
}

// =========================================================================
// BUILD COMPLETE SCULPTED VALLEY ROCK (5 Archetypes x 5 Geologies x Sub-variants!)
// Returns { parts, footR, topY, mossAmt, lichenAmt, subStyle } ready for mergeSculptedRockParts!
// =========================================================================
export function buildValleyRockParts(THREE, {
  s = 1,
  seed = 1,
  kind = 'erratic',
  geology = 'granite',
  damp = 0.5,
  stoneTint,
  stoneShade,
} = {}) {
  const rnd = mulberry32(seed >>> 0);
  const type = GEOLOGY_CATALOG[geology] || GEOLOGY_CATALOG.granite;
  const parts = [];
  let footR = 0, topY = 0;

  const add = (geo, hex, px, py, pz, scale, rotv, solid = true) => {
    const m = new THREE.Mesh(geo, stoneTint(hex));
    m.position.set(px, py, pz);
    if (scale) m.scale.set(scale[0], scale[1], scale[2]);
    if (rotv) m.rotation.set(rotv[0], rotv[1], rotv[2]);
    parts.push(m);
    if (solid) {
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const hx = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x)) * m.scale.x;
      const hz = Math.max(Math.abs(bb.min.z), Math.abs(bb.max.z)) * m.scale.z;
      footR = Math.max(footR, Math.hypot(px, pz) + Math.max(hx, hz));
      topY = Math.max(topY, py + bb.max.y * m.scale.y);
    }
    return m;
  };

  // Sculpted angular scree chips (20-tri fractured stone pieces, NEVER 4-tri pyramid tetrahedra!)
  const scree = (count, spread, size) => {
    for (let i = 0; i < count; i++) {
      const a = rnd() * 6.283;
      const d = spread * (0.58 + rnd() * 0.62);
      const r = size * (0.55 + rnd() * 0.65);
      const flat = geology === 'schist' || geology === 'sandstone' ? 0.42 : 0.65;
      const chipGeo = sculptRockGeometry(THREE, {
        radius: r, detail: 0, seed: seed + 61 + i * 17, style: geology,
        scale: [1.2 + rnd() * 0.35, flat, 0.9 + rnd() * 0.3],
        flatBase: 0.45, planes: 4, angularity: 0.42, uvTile: 0.65,
      });
      add(chipGeo, stoneShade(type, -0.45 + rnd() * 0.35),
        Math.cos(a) * d, r * flat * 0.42, Math.sin(a) * d,
        null, [rnd() * 0.45, rnd() * 6.283, rnd() * 0.45], false);
    }
  };

  let mossAmt = 0, lichenAmt = 0;
  let subStyle = kind;
  const heroDetail = s >= 0.62 ? 2 : 1;

  if (kind === 'erratic') {
    const R = 0.56 * s;
    const roll = rnd();
    subStyle = roll < 0.36 ? 'erratic-tor' : roll < 0.70 ? 'erratic-split' : 'erratic-shoulder';
    // Primary sculpted monolith boulder (320 tris for hero erratics, crisp geological planes!)
    const mainGeo = sculptRockGeometry(THREE, {
      radius: R, detail: heroDetail, seed, style: geology,
      scale: [1.08 + rnd() * 0.18, 0.82 + rnd() * 0.22, 0.92 + rnd() * 0.20],
      flatBase: 0.42, planes: geology === 'basalt' ? 9 : 8, angularity: geology === 'granite' ? 0.44 : 0.50,
    });
    add(mainGeo, stoneShade(type, 0.15),
      0, R * 0.52, 0, null, [(rnd() - 0.5) * 0.16, rnd() * 6.283, (rnd() - 0.5) * 0.16]);

    if (subStyle === 'erratic-split') {
      // Split twin boulder separated by a dramatic frost-wedged cleft!
      const sa = rnd() * 6.283;
      const subGeo = sculptRockGeometry(THREE, {
        radius: R * (0.58 + rnd() * 0.16), detail: 1, seed: seed + 17, style: geology,
        scale: [1.15, 0.78 + rnd() * 0.18, 0.85], flatBase: 0.48, planes: 7, angularity: 0.50,
      });
      add(subGeo, stoneShade(type, -0.10 + rnd() * 0.30),
        Math.cos(sa) * R * 0.68, R * 0.36, Math.sin(sa) * R * 0.68,
        null, [0.12, sa + 0.5, -0.14]);
    } else {
      const lumps = 1 + ((rnd() * 2) | 0);
      for (let i = 0; i < lumps; i++) {
        const a = rnd() * 6.283, lr = R * (0.38 + rnd() * 0.24);
        const lGeo = sculptRockGeometry(THREE, {
          radius: lr, detail: 1, seed: seed + 11 + i * 7, style: geology,
          scale: [1.10, 0.74 + rnd() * 0.22, 0.96], flatBase: 0.46, planes: 7, angularity: 0.46,
        });
        add(lGeo, stoneShade(type, -0.12 + rnd() * 0.42),
          Math.cos(a) * R * 0.62, lr * 0.48, Math.sin(a) * R * 0.62,
          null, [(rnd() - 0.5) * 0.25, rnd() * 6.283, (rnd() - 0.5) * 0.25]);
      }
    }
    mossAmt = damp * (0.52 + rnd() * 0.44);
    lichenAmt = 0.28 + rnd() * 0.42;
    scree(3 + ((rnd() * 3) | 0), R * 1.24, R * 0.17);

  } else if (kind === 'angular') {
    const R = 0.54 * s;
    const roll = rnd();
    subStyle = roll < 0.5 ? 'angular-sheared' : 'angular-crag';
    const mainGeo = sculptRockGeometry(THREE, {
      radius: R, detail: heroDetail, seed, style: geology,
      scale: [1.08, 0.88 + rnd() * 0.28, 0.96],
      flatBase: 0.38, planes: 8, angularity: 0.52,
    });
    add(mainGeo, stoneShade(type, 0.22),
      0, R * 0.54, 0, null, [(rnd() - 0.5) * 0.22, rnd() * 6.283, (rnd() - 0.5) * 0.22]);

    // Sheared buttress wedge cleaved off the main face
    const wa = rnd() * 6.283;
    const wGeo = sculptRockGeometry(THREE, {
      radius: R * 0.66, detail: 1, seed: seed + 5, style: geology,
      scale: [1.22, 0.54, 1.04], flatBase: 0.44, planes: 7, angularity: 0.56,
    });
    add(wGeo, stoneShade(type, 0.44),
      Math.cos(wa) * R * 0.44, R * 0.46, Math.sin(wa) * R * 0.44,
      null, [0.16 + rnd() * 0.22, wa, 0.10]);

    // Broken angular talus blocks resting at its foot
    for (let i = 0; i < 2 + ((rnd() * 2) | 0); i++) {
      const a = wa + 1.3 + rnd() * 3.5, sr = R * (0.20 + rnd() * 0.18);
      const tGeo = sculptRockGeometry(THREE, {
        radius: sr, detail: 1, seed: seed + 31 + i * 9, style: geology,
        scale: [1.25, 0.72, 1.05], flatBase: 0.48, planes: 6, angularity: 0.54,
      });
      add(tGeo, stoneShade(type, -0.32 + rnd() * 0.35),
        Math.cos(a) * R * (0.86 + rnd() * 0.45), sr * 0.44, Math.sin(a) * R * (0.86 + rnd() * 0.45),
        null, [(rnd() - 0.5) * 0.4, rnd() * 6.283, (rnd() - 0.5) * 0.4]);
    }
    mossAmt = damp * (0.18 + rnd() * 0.28);
    lichenAmt = 0.32 + rnd() * 0.38;
    scree(2 + ((rnd() * 3) | 0), R * 1.28, R * 0.15);

  } else if (kind === 'slab') {
    const R = 0.64 * s;
    const layers = 3 + ((rnd() * 2) | 0);
    const tilt = (rnd() - 0.5) * 0.24;
    const lean = rnd() * 6.283;
    subStyle = layers >= 4 ? 'slab-terrace' : 'slab-overhang';
    // Start slightly below y=0 with a bold buried bedrock course so slabs rise dramatically above hillside slopes!
    let y = -0.10 * R;
    for (let i = 0; i < layers; i++) {
      const f = 1 - i * (0.11 + rnd() * 0.08);
      const th = R * (i === 0 ? 0.44 : (0.32 + rnd() * 0.18)) * (1 - i * 0.06);
      const long = (1.62 + rnd() * 0.68) * R * f;
      const wide = (1.06 + rnd() * 0.42) * R * f;
      const plateGeo = sculptSlabGeometry(THREE, {
        w: long, h: th, d: wide, seed: seed + i * 19, style: geology, creaseDeg: 30,
      });
      add(plateGeo, stoneShade(type, -0.10 + i * 0.22),
        Math.cos(lean) * R * 0.22 * i + (rnd() - 0.5) * R * 0.22,
        y + th * 0.48,
        Math.sin(lean) * R * 0.22 * i + (rnd() - 0.5) * R * 0.22,
        null, [tilt * (0.45 + i * 0.24), rnd() * 6.283, tilt * (0.38 + i * 0.26)]);
      y += th * 0.78;
    }
    mossAmt = damp * (0.56 + rnd() * 0.42);
    lichenAmt = 0.30 + rnd() * 0.42;
    scree(3 + ((rnd() * 3) | 0), R * 1.32, R * 0.15);

  } else if (kind === 'spire') {
    const R = 0.35 * s, H = 1.54 * s;
    subStyle = geology === 'basalt' ? 'spire-columnar' : geology === 'schist' ? 'spire-fin' : 'spire-crag';
    const sides = geology === 'basalt' ? 6 : geology === 'schist' ? 5 : 7;
    const mainSpire = sculptSpireGeometry(THREE, {
      rBot: R * 1.12, rTop: R * (geology === 'basalt' ? 0.76 : 0.34), height: H,
      sides, rings: 5, seed, style: geology,
    });
    add(mainSpire, stoneShade(type, 0.26),
      0, -0.02 * s, 0, [1.0, 1.0, geology === 'schist' ? 0.64 : 0.82],
      [(rnd() - 0.5) * 0.14, rnd() * 6.283, (rnd() - 0.5) * 0.14]);

    // Secondary companion blade / stepped columnar step (also carries built-in -0.28*H root skirt!)
    const ba = rnd() * 6.283;
    const subSpire = sculptSpireGeometry(THREE, {
      rBot: R * 0.78, rTop: R * (geology === 'basalt' ? 0.58 : 0.24), height: H * (0.56 + rnd() * 0.18),
      sides: Math.max(5, sides - 1), rings: 4, seed: seed + 7, style: geology,
    });
    add(subSpire, stoneShade(type, -0.14),
      Math.cos(ba) * R * 0.76, -0.02 * s, Math.sin(ba) * R * 0.76,
      [1.0, 1.0, 0.78], [0.10, ba + 0.3, 0.14]);

    // Third low basalt/crag shoulder step + basal collar boulder anchoring the spire into bedrock!
    if (s > 0.70) {
      const ba2 = ba + 2.1 + rnd() * 1.4;
      const stepSpire = sculptSpireGeometry(THREE, {
        rBot: R * 0.66, rTop: R * 0.42, height: H * 0.36,
        sides: 5, rings: 3, seed: seed + 13, style: geology,
      });
      add(stepSpire, stoneShade(type, -0.26),
        Math.cos(ba2) * R * 0.86, -0.02 * s, Math.sin(ba2) * R * 0.86,
        [1.05, 1.0, 0.88], [-0.07, ba2, -0.09]);
    }
    const baseCollar = sculptRockGeometry(THREE, {
      radius: R * 1.05, detail: 1, seed: seed + 41, style: geology,
      scale: [1.35, 0.52, 1.18], flatBase: 0.55, planes: 7, angularity: 0.48,
    });
    add(baseCollar, stoneShade(type, -0.24), 0, R * 0.16, 0, null, [0, rnd() * 6.283, 0]);
    mossAmt = damp * (0.14 + rnd() * 0.24);
    lichenAmt = 0.36 + rnd() * 0.42;
    scree(4 + ((rnd() * 4) | 0), R * 2.05, R * 0.22);

  } else { // cluster
    const R = 0.52 * s;
    const n = 3 + ((rnd() * 3) | 0);
    subStyle = n >= 5 ? 'cluster-outcrop' : 'cluster-trio';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + rnd() * 0.75;
      const d = i === 0 ? R * 0.12 : R * (0.28 + rnd() * 0.58);
      const cr = i === 0 ? R * (0.52 + rnd() * 0.16) : R * (0.28 + rnd() * 0.28);
      const cGeo = sculptRockGeometry(THREE, {
        radius: cr, detail: i === 0 ? heroDetail : 1, seed: seed + i * 23, style: geology,
        scale: [1.08 + rnd() * 0.18, 0.70 + rnd() * 0.28, 0.94 + rnd() * 0.18],
        flatBase: 0.46, planes: 6, angularity: i % 2 === 0 ? 0.36 : 0.46,
      });
      add(cGeo, stoneShade(type, -0.28 + rnd() * 0.70),
        Math.cos(a) * d, cr * (0.44 + rnd() * 0.20), Math.sin(a) * d,
        null, [(rnd() - 0.5) * 0.32, rnd() * 6.283, (rnd() - 0.5) * 0.32]);
    }
    mossAmt = damp * (0.34 + rnd() * 0.44);
    lichenAmt = 0.26 + rnd() * 0.38;
    scree(3 + ((rnd() * 4) | 0), R * 1.48, R * 0.16);
  }

  return { parts, footR, topY, mossAmt, lichenAmt, subStyle };
}

// =========================================================================
// SCULPTED CAVE & RIVER-BED BOULDER ACCUMULATOR (replaces blobby GEO_SPHERE addBoulder!)
// Writes directly into index.html's { p, n, c, e } accumulator with creased geology shapes!
// =========================================================================
export function appendSculptedBoulderToAcc(THREE, acc, d, cx, cy, cz, rx, ry, rz, seed, opt = {}) {
  const style = opt.style || 'granite';
  const detail = opt.detail != null ? opt.detail : (Math.max(rx, ry, rz) > 0.75 ? 2 : 1);
  const geo = sculptRockGeometry(THREE, {
    radius: 1.0,
    detail,
    seed: ((seed * 131 + 17) | 0) || 1,
    style,
    scale: [rx, ry, rz],
    flatBase: opt.flatBase != null ? opt.flatBase : 0.32,
    planes: opt.planes != null ? opt.planes : (style === 'shale' || style === 'ironstone' ? 7 : 5),
    angularity: opt.lump != null ? clamp(opt.lump * 1.05, 0.22, 0.58) : 0.38,
  });

  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const curv = geo.userData.rockCurvature;
  const cRock = new THREE.Color(d.rock);
  const cDark = new THREE.Color(d.dark);
  const cMoss = new THREE.Color(d.moss || 0x4a6b32);
  const cStreak = d.streak != null ? new THREE.Color(d.streak) : null;
  const rc = new THREE.Color();
  const floorCut = opt.floor != null ? opt.floor - 0.42 : -1e9;
  const mossW = opt.moss != null ? opt.moss : 0.75;

  for (let i = 0; i < pos.count; i += 3) {
    const y0 = cy + pos.getY(i), y1 = cy + pos.getY(i + 1), y2 = cy + pos.getY(i + 2);
    if (y0 < floorCut && y1 < floorCut && y2 < floorCut) continue;

    for (let k = 0; k < 3; k++) {
      const vi = i + k;
      const px = cx + pos.getX(vi), py = cy + pos.getY(vi), pz = cz + pos.getZ(vi);
      const nx = nrm.getX(vi), ny = nrm.getY(vi), nz = nrm.getZ(vi);
      const cv = curv ? curv[vi] : 0;
      const mott = (vnoise3(px * 1.4, py * 1.4, pz * 1.4, (seed | 0) + 13) - 0.5) * 0.16;

      rc.copy(cRock).lerp(cDark, clamp(0.24 + mott - cv * 0.18 + Math.max(0, -ny) * 0.42, 0, 0.88));
      if (cStreak && (style === 'ironstone' || style === 'chalk' || style === 'limestone')) {
        const stField = sstep(0.42, 0.82, vnoise3(px * 1.1, py * 0.55, pz * 1.1, (seed | 0) + 41));
        rc.lerp(cStreak, stField * (style === 'ironstone' ? 0.36 : 0.22));
      }
      if (ny > 0.38 && mossW > 0) {
        const mNoise = vnoise3(px * 1.9, py * 1.5, pz * 1.9, (seed | 0) + 73);
        const m = sstep(0.38, 0.82, ny) * sstep(0.35, 0.70, mNoise) * mossW;
        rc.lerp(cMoss, clamp(m, 0, 0.88));
      }
      acc.p.push(px, py, pz);
      acc.n.push(nx, ny, nz);
      acc.c.push(rc.r, rc.g, rc.b);
      acc.e.push(0);
    }
  }
  geo.dispose();
}

// =========================================================================
// COMPACT SCULPTED STONE POOL (for river pebbles, cairns, hearths, ruins, snag, Sato)
// =========================================================================
export function buildCompactStoneGeometry(THREE, {
  rx = 0.2, ry = 0.14, rz = 0.18, detail = 1, seed = 1, style = 'river', uvTile = 0.55
} = {}) {
  return sculptRockGeometry(THREE, {
    radius: 1.0,
    detail,
    seed,
    style,
    scale: [rx, ry, rz],
    flatBase: style === 'river' ? 0.22 : 0.38,
    planes: style === 'river' ? 4 : 5,
    angularity: style === 'river' ? 0.22 : 0.40,
    uvTile,
  });
}

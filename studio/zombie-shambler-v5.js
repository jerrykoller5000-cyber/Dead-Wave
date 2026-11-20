// studio/zombie-shambler-v5.js — CC-359 step 2 + step 3 seams (Claude 3, 19 Nov 2026). REVIEW COPY, not landed, not imported by the live game.
// The shambler Jerry signed off (D-213: "Yes shambler is done", Antigravity's AG-357 pass 7) as GEOMETRY for the game's own
// skeleton. This file is a PORT of Antigravity's review/AG-357 sources (geo-utils, shambler-head-skull, shambler-clothes,
// shambler-step1 at pass 7; credited, md5s in each section header) with only these changes:
//   1. no BufferGeometryUtils (the game's vendor has none): a small local mergeGeometries / mergeVertices below;
//   2. no textures (step 3 makes the atlas): the step-1 path, base colours + baked AO in vertex colours;
//   3. the tank's two holes are cut in the geometry with a rim (AG cut them with alphaTest; production has no alpha).
// zombie-humanoids.js (SECTIONS.shambler v5) builds this once per template and moves every piece onto the game bone that
// carries the same part of the body (re-homed in the rest pose, so the shape at rest is exactly AG's).
const cv5Merge = {
  mergeGeometries(geos) {
    const names = ['position', 'normal', 'uv', 'color'].filter((n) => geos.every((g) => g.attributes[n]));
    const out = new geos[0].constructor();
    for (const n of names) {
      const size = geos[0].attributes[n].itemSize; let len = 0; for (const g of geos) len += g.attributes[n].count * size;
      const arr = new Float32Array(len); let o = 0; for (const g of geos) { const a = g.attributes[n]; for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) arr[o++] = a.array[i * size + k]; }
      out.setAttribute(n, new geos[0].attributes[n].constructor(arr, size));
    }
    return out;
  },
  mergeVertices(geo, tol = 1e-4) {
    const names = Object.keys(geo.attributes), count = geo.attributes.position.count, dec = Math.log10(1 / tol), mul = Math.pow(10, dec);
    const map = new Map(), idx = [], keep = [];
    for (let i = 0; i < count; i++) {
      let key = ''; for (const n of names) { const a = geo.attributes[n]; for (let k = 0; k < a.itemSize; k++) key += Math.round(a.array[i * a.itemSize + k] * mul) + ','; }
      let j = map.get(key); if (j === undefined) { j = keep.length; map.set(key, j); keep.push(i); } idx.push(j);
    }
    const out = new geo.constructor();
    for (const n of names) { const a = geo.attributes[n], arr = new Float32Array(keep.length * a.itemSize); keep.forEach((i, j) => { for (let k = 0; k < a.itemSize; k++) arr[j * a.itemSize + k] = a.array[i * a.itemSize + k]; }); out.setAttribute(n, new a.constructor(arr, a.itemSize)); }
    out.setIndex(idx);
    return out;
  }
};
// AG's tank-hole field helpers (review/AG-357/textures-step2.mjs cylFbm / wrapDU)
function cv5CylFbm(u, v, radiusU = 2.4, scaleV = 6.0, seed = 11, octaves = 4) {
  const ang = u * Math.PI * 2;
  return fbm3(Math.cos(ang) * radiusU + seed * 3.1, v * scaleV - seed * 1.7, Math.sin(ang) * radiusU + seed * 0.9, octaves);
}
function cv5WrapDU(u, u0) { let d = (u - u0) % 1; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return d; }

// ======== ported from review/AG-357/geo-utils.mjs (md5 f6657157) ========
// review/AG-357/geo-utils.mjs
// Shared smooth-anatomy lofter, seeded vertex-noise displacer, seam normal welder,
// per-bone BufferGeometry merger, and baked vertex-color AO for AG-357 (review-only).
// Accepts (THREE, BufferGeometryUtils) explicitly or uses module imports.

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

// Builds a closed or open lofted BufferGeometry from rows of ring points.
// grid[r][j] = [x, y, z] for r in [0..R-1], j in [0..C-1].
// If wrapU = true, grid[r] represents C distinct angles around the ring and we duplicate
// column 0 at u=1 for clean cylindrical UVs (seam normals are welded later).
function loftGrid(THREE, grid, {
  wrapU = true,
  capBottom = true,
  capTop = true,
  flip = false,
  skipCell = null,
  uScale = 1,
  vScale = 1,
  vFlip = false
} = {}) {
  const R = grid.length;
  const C = grid[0].length;
  const cols = wrapU ? C + 1 : C;
  const pos = [];
  const uv = [];
  const ix = [];

  for (let r = 0; r < R; r++) {
    const v = (vFlip ? (R - 1 - r) / (R - 1 || 1) : r / (R - 1 || 1)) * vScale;
    for (let j = 0; j < cols; j++) {
      const p = grid[r][j % C];
      pos.push(p[0], p[1], p[2]);
      uv.push((j / (cols - 1 || 1)) * uScale, v);
    }
  }

  for (let r = 0; r < R - 1; r++) {
    for (let j = 0; j < cols - 1; j++) {
      if (skipCell && skipCell(r, j % C)) continue;
      const a = r * cols + j;
      const b = r * cols + (j + 1);
      const c = (r + 1) * cols + j;
      const d = (r + 1) * cols + (j + 1);
      if (!flip) {
        ix.push(a, b, c, b, d, c);
      } else {
        ix.push(a, c, b, b, c, d);
      }
    }
  }

  const addCap = (rowIdx, isTop) => {
    const row = grid[rowIdx];
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < C; j++) {
      cx += row[j][0]; cy += row[j][1]; cz += row[j][2];
    }
    cx /= C; cy /= C; cz /= C;
    const centerIdx = pos.length / 3;
    pos.push(cx, cy, cz);
    uv.push(0.5 * uScale, (isTop ? 1 : 0) * vScale);
    for (let j = 0; j < cols - 1; j++) {
      const p0 = rowIdx * cols + j;
      const p1 = rowIdx * cols + (j + 1);
      const useTopWinding = flip ? !isTop : isTop;
      if (useTopWinding) ix.push(centerIdx, p0, p1);
      else ix.push(centerIdx, p1, p0);
    }
  };

  if (capBottom && R > 1) addCap(0, false);
  if (capTop && R > 1) addCap(R - 1, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ix);
  // Guarantee outward winding on closed shells via divergence signed volume
  if (capBottom && capTop && ix.length >= 3) {
    let vol6 = 0;
    for (let k = 0; k < ix.length; k += 3) {
      const i0 = ix[k] * 3, i1 = ix[k + 1] * 3, i2 = ix[k + 2] * 3;
      const ax = pos[i0], ay = pos[i0 + 1], az = pos[i0 + 2];
      const bx = pos[i1], by = pos[i1 + 1], bz = pos[i1 + 2];
      const cx = pos[i2], cy = pos[i2 + 1], cz = pos[i2 + 2];
      vol6 += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    }
    if (vol6 < 0) {
      for (let k = 0; k < ix.length; k += 3) {
        const tmp = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = tmp;
      }
      geo.setIndex(ix);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// Loft an anatomical limb or torso tube given row specs:
// [y, rx, rz, cx=0, cz=0, rotY=0, squircle=1.0]
function loftProfile(THREE, specs, {
  radialSegs = 16,
  capBottom = true,
  capTop = true,
  deform = null,
  uScale = 1,
  vScale = 1
} = {}) {
  const grid = [];
  for (let r = 0; r < specs.length; r++) {
    const sp = specs[r];
    const y = sp[0], rx = sp[1], rz = sp[2];
    const cx = sp[3] || 0, cz = sp[4] || 0;
    const pwr = sp[5] || 1.0;
    const row = [];
    for (let j = 0; j < radialSegs; j++) {
      const a = (j / radialSegs) * Math.PI * 2;
      const sa = Math.sin(a), ca = Math.cos(a);
      let x = cx + Math.sign(sa) * Math.pow(Math.abs(sa), pwr) * rx;
      let z = cz + Math.sign(ca) * Math.pow(Math.abs(ca), pwr) * rz;
      let yy = y;
      if (deform) {
        const pt = deform(x, yy, z, a, r / (specs.length - 1 || 1), r);
        x = pt[0]; yy = pt[1]; z = pt[2];
      }
      row.push([x, yy, z]);
    }
    grid.push(row);
  }
  return loftGrid(THREE, grid, { wrapU: true, capBottom, capTop, uScale, vScale });
}

// Creates a smooth superellipsoid / organic lump (better than SphereGeometry poles for anatomy patches)
function loftBubble(THREE, cx, cy, cz, rx, ry, rz, {
  rings = 10,
  segs = 14,
  deform = null
} = {}) {
  const grid = [];
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI - Math.PI * 0.5;
    const cp = Math.max(0.002, Math.cos(phi)), sp = Math.sin(phi);
    const row = [];
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      let x = cx + Math.sin(a) * cp * rx;
      let y = cy + sp * ry;
      let z = cz + Math.cos(a) * cp * rz;
      if (deform) {
        const pt = deform(x, y, z, a, phi, r / rings);
        x = pt[0]; y = pt[1]; z = pt[2];
      }
      row.push([x, y, z]);
    }
    grid.push(row);
  }
  return loftGrid(THREE, grid, { wrapU: true, capBottom: true, capTop: true });
}

// Average normals at shared 3D vertex positions so UV wrap seams (u=0 / u=1) shade smoothly
function weldSeamNormals(geo, tol = 1e-4) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  if (!pos || !nrm) return geo;
  const invTol = 1 / tol;
  const groups = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * invTol)},${Math.round(pos.getY(i) * invTol)},${Math.round(pos.getZ(i) * invTol)}`;
    let g = groups.get(k);
    if (!g) {
      groups.set(k, [i]);
    } else {
      g.push(i);
    }
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    let nx = 0, ny = 0, nz = 0;
    for (const idx of list) {
      nx += nrm.getX(idx);
      ny += nrm.getY(idx);
      nz += nrm.getZ(idx);
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    for (const idx of list) nrm.setXYZ(idx, nx, ny, nz);
  }
  nrm.needsUpdate = true;
  return geo;
}

// Prepare BufferGeometry for clean merging & vertex coloring
function prepareGeoForMerge(THREE, geo) {
  let g = geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    const p = g.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      uv[i * 2] = 0.5 + Math.atan2(x, z) / (Math.PI * 2);
      uv[i * 2 + 1] = y;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  if (!g.attributes.color) {
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3).fill(1);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  if (g.attributes.tangent) g.deleteAttribute('tangent');
  return g;
}

// Trick #2 + #1: merge zone geometries per bone, weld vertices, apply deterministic 3D
// vertex noise without cracking UV seams, weld seam normals, and assign base vertex colors.
function finalizeZoneGeometry(THREE, BufferGeometryUtils, geos, {
  baseHex = 0x7c866d,
  tintDarkHex = null,
  colorNoise = 0.06,
  noiseAmp = 0.0035,
  noiseFreq = 24,
  seed = 13,
  noiseMask = null,
  weld = true
} = {}) {
  const prepped = [];
  for (const raw of geos) {
    if (!raw) continue;
    const g = raw.index ? raw.toNonIndexed() : raw.clone();
    prepareGeoForMerge(THREE, g);
    prepped.push(g);
  }
  let merged = prepped.length === 1 ? prepped[0] : BufferGeometryUtils.mergeGeometries(prepped, false);
  if (weld && BufferGeometryUtils.mergeVertices) {
    merged = BufferGeometryUtils.mergeVertices(merged, 1e-4);
  }
  merged.computeVertexNormals();
  weldSeamNormals(merged);

  const pos = merged.attributes.position;
  const nrm = merged.attributes.normal;
  const col = merged.attributes.color;
  const cBase = new THREE.Color(baseHex);
  const cDark = tintDarkHex != null ? new THREE.Color(tintDarkHex) : cBase.clone().multiplyScalar(0.78);
  const cTmp = new THREE.Color();

  // Compute displacements purely from original (x,y,z) and smoothed seam normal so u=0 & u=1 match identically
  const orig = new Float32Array(pos.array);
  for (let i = 0; i < pos.count; i++) {
    const x = orig[i * 3], y = orig[i * 3 + 1], z = orig[i * 3 + 2];
    const mask = noiseMask ? noiseMask(x, y, z) : 1.0;
    if (noiseAmp > 0 && mask > 0) {
      const n = fbm3(x * noiseFreq + seed, y * noiseFreq + seed * 1.73, z * noiseFreq - seed * 0.91, 3);
      const disp = n * noiseAmp * mask;
      pos.setXYZ(i, x + nrm.getX(i) * disp, y + nrm.getY(i) * disp, z + nrm.getZ(i) * disp);
    }
    // Base organic mottle in linear vertex colors (AO multiplies on top later)
    const m = 0.5 + 0.5 * fbm3(x * 11 + seed * 3.1, y * 11 - seed * 2.3, z * 11 + seed * 0.7, 2);
    const t = clamp(0.5 + (m - 0.5) * (colorNoise / 0.08), 0, 1);
    cTmp.copy(cDark).lerp(cBase, t);
    col.setXYZ(i, cTmp.r, cTmp.g, cTmp.b);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  weldSeamNormals(merged);
  merged.userData.baseColor = new Float32Array(col.array);
  merged.userData.aoFactor = new Float32Array(pos.count).fill(1);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

// Switch between base flat colors * AO (normal Step 1) and pure white clay * AO (AO + noise proof)
function applyWhiteAOProof(root, enabled = true, { exponent = 1.25 } = {}) {
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    const col = g.attributes.color;
    const base = g.userData.baseColor;
    const ao = g.userData.aoFactor;
    if (!col || !base || !ao) return;
    if (enabled) {
      for (let i = 0; i < col.count; i++) {
        const w = Math.pow(clamp(ao[i], 0.08, 1.05), exponent) * 0.94;
        col.setXYZ(i, w, w, w);
      }
    } else {
      for (let i = 0; i < col.count; i++) {
        const a = ao[i];
        col.setXYZ(i, base[i * 3] * a, base[i * 3 + 1] * a, base[i * 3 + 2] * a);
      }
    }
    col.needsUpdate = true;
  });
}

// Trick #3: Baked sky-occlusion + anatomical crease AO directly into existing linear vertex colors.
// Also stores per-vertex baseColor and aoFactor so White-AO proof mode renders 100% pure white + AO cleanly.
function bakeShamblerAO(THREE, root, config) {
  const {
    joints,
    occluders,   // Array of { c: Vector3 (in root space), r, owner: Object3D|null, weight }
    zones = [],  // Optional region tint/crease hooks: (mesh, worldLocalPos, localNorm, r, g, b, ao) => [r, g, b, ao?]
    floor = 0.18,
    strength = 1.20,
    skipMaterials = new Set()
  } = config;

  // Save transforms and reset to A-pose cleanly
  const saved = [];
  for (const [obj, ax, ay, az, px, py, pz] of joints) {
    if (!obj) continue;
    saved.push([obj, obj.rotation.x, obj.rotation.y, obj.rotation.z, obj.position.x, obj.position.y, obj.position.z]);
    obj.rotation.set(ax, ay, az);
    if (px !== undefined) obj.position.set(px, py, pz);
  }
  root.updateMatrixWorld(true);

  const jointSet = new Set(joints.map(j => j[0]).filter(Boolean));
  const ownerOf = (obj) => {
    for (let n = obj; n; n = n.parent) if (jointSet.has(n)) return n;
    return null;
  };

  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const M = new THREE.Matrix4();
  const NM = new THREE.Matrix3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const doneGeos = new Set();
  let verts = 0, meshes = 0;

  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes?.position) return;
    if (skipMaterials.has(o.material)) return;
    const geo = o.geometry;
    if (doneGeos.has(geo)) return;
    doneGeos.add(geo);

    const P = geo.attributes.position;
    const N = geo.attributes.normal;
    let C = geo.attributes.color;
    if (!C) {
      C = new THREE.BufferAttribute(new Float32Array(P.count * 3).fill(1), 3);
      geo.setAttribute('color', C);
    }
    const baseArr = geo.userData.baseColor ? new Float32Array(geo.userData.baseColor) : new Float32Array(C.array);
    const aoArr = new Float32Array(P.count);

    M.multiplyMatrices(invRoot, o.matrixWorld);
    NM.getNormalMatrix(M);
    const owner = ownerOf(o);
    const activeOcc = occluders.filter(s => s.owner !== owner || s.self);

    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i).applyMatrix4(M);
      if (N) n.fromBufferAttribute(N, i).applyMatrix3(NM).normalize();
      else n.set(0, 1, 0);

      let vis = 1.0;
      for (let k = 0; k < activeOcc.length; k++) {
        const s = activeOcc[k];
        const dx = s.c.x - p.x, dy = s.c.y - p.y, dz = s.c.z - p.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const maxD2 = s.r * s.r * 30;
        if (d2 > maxD2) continue;
        const r = s.r;
        const dist = Math.max(r * 1.015, Math.sqrt(d2));
        const cos = (dx * n.x + dy * n.y + dz * n.z) / dist;
        if (cos <= 0.02) continue;
        const q = r / dist;
        const occ = (1 - Math.sqrt(Math.max(0, 1 - q * q))) * 1.9 * ((cos - 0.02) / 0.98);
        const w = s.weight ?? 1.0;
        vis *= 1 - clamp(occ * strength * w, 0, 0.94);
      }

      const sky = 0.84 + 0.16 * clamp(n.y * 0.5 + 0.5, 0, 1);
      let ao = clamp(Math.max(floor, vis * sky), floor, 1.04);

      let br = baseArr[i * 3], bg = baseArr[i * 3 + 1], bb = baseArr[i * 3 + 2];
      for (let z = 0; z < zones.length; z++) {
        const res = zones[z](o, p, n, br, bg, bb, ao);
        if (res) {
          br = res[0]; bg = res[1]; bb = res[2];
          if (res.length > 3 && res[3] !== undefined) ao = res[3];
        }
      }
      baseArr[i * 3] = br; baseArr[i * 3 + 1] = bg; baseArr[i * 3 + 2] = bb;
      aoArr[i] = ao;
      C.setXYZ(i, br * ao, bg * ao, bb * ao);
    }
    geo.userData.baseColor = baseArr;
    geo.userData.aoFactor = aoArr;
    C.needsUpdate = true;
    verts += P.count;
    meshes++;
  });

  // Restore saved poses
  for (const [obj, ax, ay, az, px, py, pz] of saved) {
    obj.rotation.set(ax, ay, az);
    obj.position.set(px, py, pz);
  }
  root.updateMatrixWorld(true);
  return { verts, meshes };
}

// ======== ported from review/AG-357/shambler-head-skull.mjs (md5 8ca7cf6b) ========
// review/AG-357/shambler-head-skull.mjs
// AG-357 Step 4b Pass 6 (Jerry skull size + profile addendum):
// - Bigger cranium matching Jerry's Tripo reference (~0.29 m depth, ~0.205 m cranium width, ~0.27-0.28 m closed head height).
// - Neck enters under the skull's MIDDLE (slim ~0.09 m neck, ~9.2 cm chin-to-collar) with a bold rounded occiput overhang behind!
// - ONE continuous sculpted head+cheek+mandible+chin shell (headShellGrid), tall screaming jaw, 24 big teeth, deep sunken sockets.


function makeTooth(THREE, x, y, z, rx, ry, rz, yaw = 0, pitch = 0, isLower = false) {
  return loftBubble(THREE, x, y, z, rx, ry, rz, {
    rings: 5,
    segs: 8,
    deform: (px, py, pz) => {
      const t = clamp((py - y) / (ry || 1e-4), -1, 1);
      const tipScale = isLower
        ? sstep(1.0, -0.80, t) * 0.12 + 0.92
        : sstep(-1.0, 0.80, t) * 0.12 + 0.92;
      const dx = px - x, dz = pz - z;
      const sqx = Math.sign(dx) * Math.pow(Math.abs(dx / (rx || 1e-4)), 0.56) * rx;
      const sqz = Math.sign(dz) * Math.pow(Math.abs(dz / (rz || 1e-4)), 0.62) * rz;
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const sx = sqx * tipScale, sz = sqz * tipScale;
      return [
        x + sx * cy + sz * sy,
        py,
        z - sx * sy + sz * cy + (py - y) * pitch * 0.35
      ];
    }
  });
}

function evalRowsCatmull(rows, y) {
  const n = rows.length;
  if (y <= rows[0][0]) return rows[0].slice();
  if (y >= rows[n - 1][0]) return rows[n - 1].slice();
  let idx = 0;
  for (let i = 0; i < n - 1; i++) {
    if (y <= rows[i + 1][0]) { idx = i; break; }
  }
  const p0 = rows[Math.max(0, idx - 1)];
  const p1 = rows[idx];
  const p2 = rows[Math.min(n - 1, idx + 1)];
  const p3 = rows[Math.min(n - 1, idx + 2)];
  const t = clamp((y - p1[0]) / (p2[0] - p1[0] || 1e-6), 0, 1);
  const t2 = t * t, t3 = t2 * t;
  const out = [y];
  for (let m = 1; m < p1.length; m++) {
    const v0 = p0[m], v1 = p1[m], v2 = p2[m], v3 = p3[m];
    out.push(0.5 * (
      2 * v1 +
      (-v0 + v2) * t +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
      (-v0 + 3 * v1 - 3 * v2 + v3) * t3
    ));
  }
  return out;
}

function evalSplinePt(pts, u) {
  const n = pts.length;
  const x = clamp(u, 0, 1) * (n - 1);
  const idx = Math.min(n - 2, Math.floor(x));
  const t = x - idx;
  const p0 = pts[Math.max(0, idx - 1)];
  const p1 = pts[idx];
  const p2 = pts[Math.min(n - 1, idx + 1)];
  const p3 = pts[Math.min(n - 1, idx + 2)];
  const t2 = t * t, t3 = t2 * t;
  const out = [];
  for (let m = 0; m < p1.length; m++) {
    const v0 = p0[m], v1 = p1[m], v2 = p2[m], v3 = p3[m];
    out.push(0.5 * (
      2 * v1 +
      (-v0 + v2) * t +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
      (-v0 + 3 * v1 - 3 * v2 + v3) * t3
    ));
  }
  return out;
}

function buildNeckAndSkull3DForms(THREE, BGU, headGroup, bodyMat, eyeMat, PALETTE, mergeZoneInto, mats = {}, lod = 0) {
  const isLod = lod >= 1;
  const neckMat = mats.neckMat || bodyMat;
  const headMat = mats.headMat || bodyMat;
  const skinMat = mats.skinMat || bodyMat;
  const cavityMat = mats.cavityMat || bodyMat;
  const teethMat = mats.teethMat || bodyMat;

  // -----------------------------------------------------------------------
  // 1. THICKER MUSCULAR SINEWY NECK (~12-13 cm wide, 1.6x skull/neck)
  //    JOINING UNDER SKULL MIDDLE (~39%) WITH ~5 cm OCCIPUT OVERHANG
  // -----------------------------------------------------------------------
  const neckRows = [
    // [y, rx, rz, cx, cz, squircle]
    [-0.080, 0.138, 0.078, 0, -0.016, 0.88], // tucked deeply inside torso chest & upper back
    [-0.036, 0.174, 0.094, 0, -0.018, 0.86], // feathering smoothly flush into trapezius / torso shell
    [ 0.012, 0.134, 0.078, 0, -0.016, 0.88],
    [ 0.054, 0.088, 0.068, 0, -0.015, 0.90], // muscular trapezius flare into neck column
    [ 0.090, 0.063, 0.058, 0, -0.014, 0.92], // ~12.8 cm muscular upper neck (Tripo 1.6x!)
    [ 0.122, 0.062, 0.056, 0, -0.016, 0.92], // enters under ~39% of skull (back -0.072, ~5.1 cm overhang)
    [ 0.150, 0.052, 0.048, 0, -0.012, 0.92], // tapers cleanly INSIDE cranial base (back -0.060 < skull -0.074 -> zero ledge!)
    [ 0.178, 0.036, 0.038, 0, -0.012, 0.94]  // cap deeply enclosed inside skull
  ];
  const neckGrid = [];
  const N_R = isLod ? 12 : 24, N_C = isLod ? 14 : 32;
  for (let r = 0; r < N_R; r++) {
    const y = lerp(-0.080, 0.184, r / (N_R - 1));
    const [, rx, rz, cx, cz, pwr] = evalRowsCatmull(neckRows, y);
    const row = [];
    for (let j = 0; j < N_C; j++) {
      const a = (j / N_C) * Math.PI * 2;
      const sa = Math.sin(a), ca = Math.cos(a);
      let x = cx + Math.sign(sa) * Math.pow(Math.abs(sa), pwr) * rx;
      let z = cz + Math.sign(ca) * Math.pow(Math.abs(ca), pwr) * rz;
      const ax = Math.abs(x);

      // Bold sculpted V-shaped SCM tendon cords sweeping from mastoids into sternal heads
      const uNeck = clamp((y - (-0.014)) / (0.142 - (-0.014)), 0, 1);
      const scmTargetX = lerp(0.018, 0.056, uNeck);
      const scmTargetZ = lerp(0.046, -0.014, uNeck);
      const dSCM = Math.hypot(ax - scmTargetX, z - scmTargetZ);
      const scmMask = sstep(-0.020, 0.016, y) * (1 - sstep(0.112, 0.146, y));
      const scmRidge = 0.0108 * gauss(dSCM, 0.013) * scmMask;

      const front = clamp(ca, 0, 1);
      const back = clamp(-ca, 0, 1);
      const side = Math.abs(sa);

      const latCord = 0.0046 * gauss(ax - lerp(0.056, 0.061, uNeck), 0.012) * gauss(z + 0.014, 0.016) * sstep(0.01, 0.104, y) * (1 - sstep(0.112, 0.144, y));

      // Sculpted laryngeal cartilage + hollows on broad muscular anterior neck
      const hyoid = 0.0032 * gauss(ax, 0.020) * gauss(y - 0.110, 0.014) * front;
      const adamsApple = 0.0062 * gauss(ax, 0.022) * gauss(y - 0.082, 0.016) * front;
      const cricoid = 0.0048 * gauss(ax, 0.020) * gauss(y - 0.052, 0.014) * front;
      const sternalPit = -0.010 * gauss(ax, 0.020) * gauss(y - 0.016, 0.018) * front;
      const throatHollow = -0.0068 * gauss(ax - 0.036, 0.014) * gauss(y - 0.066, 0.038) * front;
      const sideHollow = -0.0040 * gauss(ax - 0.064, 0.014) * gauss(z + 0.018, 0.018) * sstep(0.025, 0.112, y);

      // Sweeping diagonal posterior trapezius + nuchal cords
      const nuchalTopFade = 1 - sstep(0.096, 0.144, y);
      const trapFlare = 0.016 * sstep(0.074, 0.000, y) * (1 - sstep(-0.020, -0.066, y)) * Math.pow(side, 1.25) * (0.55 + 0.45 * back);
      const nuchalCords = 0.0072 * gauss(ax - 0.024, 0.014) * back * sstep(0.01, 0.060, y) * nuchalTopFade;
      const nuchalFurrow = -0.0046 * gauss(ax, 0.014) * back * sstep(-0.01, 0.060, y) * nuchalTopFade;
      const spineBump = 0.0034 * (0.5 + 0.5 * Math.sin(y * 195)) * gauss(ax, 0.010) * back * sstep(-0.040, 0.030, y);

      const underChinTuck = -0.008 * sstep(0.104, 0.160, y) * Math.pow(front, 1.25);
      const frontRootTuck = -0.019 * sstep(0.010, -0.080, y) * Math.pow(front, 0.85);
      const backRootTuck = +0.022 * sstep(-0.038, -0.080, y) * back;

      x += Math.sign(x || 1) * (scmRidge * 0.50 + latCord + sideHollow + trapFlare + nuchalCords * 0.25);
      z += scmRidge * 0.88 + hyoid + adamsApple + cricoid + sternalPit + throatHollow - nuchalCords - nuchalFurrow - spineBump + underChinTuck + frontRootTuck + backRootTuck;
      row.push([x, y, z]);
    }
    neckGrid.push(row);
  }
  const neckGeo = loftGrid(THREE, neckGrid, { wrapU: true, capBottom: true, capTop: true });
  mergeZoneInto(headGroup, THREE, BGU, [neckGeo], neckMat, {
    name: 'shambler-neck-skin',
    baseHex: PALETTE.skin,
    tintDarkHex: PALETTE.skinDark,
    colorNoise: 0.06,
    noiseAmp: 0.0010,
    noiseFreq: 42,
    seed: 100,
    noiseMask: (_x, y, _z) => 1 - sstep(0.112, 0.146, y)
  });

  // -----------------------------------------------------------------------
  // 2. FACE-FIRST CHISELED CRANIUM: LOWER FLATTER CROWN, HEAVY BROW,
  //    HIGH CHEEKBONES, HOLLOW TEMPLES & CHEEKS, DEEP JAW, ~5 cm OVERHANG
  // -----------------------------------------------------------------------
  const SH_R = isLod ? 22 : 56, SH_C = isLod ? 24 : 62;
  const headShellRows = [
    // [v, rx, rzF, rzB, yF, ySide, yB, cz, pwr]
    [0.00, 0.044, 0.036, 0.044, 0.118, 0.128, 0.128, -0.012, 0.92], // enclosed inside ~12.8 cm neck
    [0.05, 0.062, 0.064, 0.060, 0.088, 0.146, 0.146, -0.014, 0.88], // emerges smoothly OVER neck top (back -0.074 -> zero collar step!)
    [0.12, 0.076, 0.098, 0.086, 0.075, 0.168, 0.172,  0.000, 0.82], // wide angular U-chin + smooth 5 cm nuchal diagonal
    [0.20, 0.084, 0.112, 0.106, 0.114, 0.194, 0.202,  0.004, 0.80], // broad jaw ramus + crisp protruding muzzle line
    [0.29, 0.088, 0.120, 0.118, 0.166, 0.228, 0.236,  0.004, 0.80], // hollow cheek transition below cheekbone
    [0.40, 0.094, 0.128, 0.124, 0.226, 0.264, 0.270,  0.004, 0.78], // smooth zygomatic cheekbone curve (~0.204m skull W)
    [0.51, 0.098, 0.132, 0.124, 0.276, 0.298, 0.304,  0.002, 0.78], // deep sockets / ~20.4 cm parietal width
    [0.63, 0.098, 0.136, 0.122, 0.322, 0.332, 0.336,  0.002, 0.80], // heavy overhanging brow + parietal crest (~29 cm deep)
    [0.77, 0.088, 0.110, 0.110, 0.366, 0.372, 0.374,  0.000, 0.84], // sharply sloped brow-to-forehead curve
    [0.91, 0.062, 0.074, 0.080, 0.398, 0.404, 0.404,  0.000, 0.88], // rounded-arch low skull roof (NOT flat table!)
    [1.00, 0.020, 0.024, 0.024, 0.418, 0.418, 0.418,  0.000, 0.94]
  ];

  const skullGrid = [];
  const skullUvs = [];
  for (let r = 0; r < SH_R; r++) {
    const v = r / (SH_R - 1);
    const [, rx, rzF, rzB, yF, ySide, yB, cz, pwr] = evalRowsCatmull(headShellRows, v);
    const row = [];
    const uvRow = [];
    for (let j = 0; j < SH_C; j++) {
      const tAng = (j / SH_C) * Math.PI * 2;
      const a = tAng - 0.26 * Math.sin(tAng);
      const sa = Math.sin(a), ca = Math.cos(a);
      const front = clamp(ca, 0, 1);
      const back = clamp(-ca, 0, 1);

      const frontW = ca > 0 ? ca * ca : 0;
      const backW = ca < 0 ? ca * ca : 0;
      const sideW = 1 - frontW - backW;
      let y = yF * frontW + ySide * sideW + yB * backW;
      let x = Math.sign(sa) * Math.pow(Math.abs(sa), pwr) * rx;
      let z = cz + Math.sign(ca) * Math.pow(Math.abs(ca), pwr) * (ca >= 0 ? rzF : rzB);

      // Gentle submental feathering behind jaw without pinching neck/mastoid
      const submentalBand = sstep(0.24, 0.12, v) * sstep(0.01, 0.06, v);
      const backSideTaper = lerp(1.0, 0.88, sstep(0.15, -0.45, ca) * submentalBand * sstep(0.21, 0.12, v));
      x *= backSideTaper;
      const ax = Math.abs(x);

      // Compact rounded occiput contour (~5 cm behind neck)
      const occiputBall = 0.005 * gauss(y - 0.285, 0.056) * Math.pow(back, 1.25) * sstep(0.095, 0.020, ax);

      // Heavy angular protruding BROW ridge shading sockets
      const browY = 0.326 + 0.011 * sstep(0.014, 0.058, ax);
      const browBand = gauss(y - browY, 0.021) * sstep(0.088, 0.016, ax) * front;
      const browOverhangY = -0.0060 * browBand;
      const glabellaFurrow = -0.0052 * gauss(ax, 0.009) * gauss(y - 0.324, 0.013) * front;
      const frownFold = 0.0034 * gauss(ax - 0.016, 0.007) * gauss(y - 0.332, 0.016) * front;
      const latPillar = 0.0072 * gauss(ax - 0.062, 0.011) * gauss(y - 0.300, 0.023) * sstep(0.26, 0.72, front);

      // Deep cavernous eye sockets higher on face (y = 0.302)
      const dOrbit = Math.hypot((ax - 0.035) / 0.024, (y - 0.302) / 0.019);
      const orbitCarve = -0.054 * Math.exp(-Math.pow(dOrbit, 2.5)) * sstep(0.16, 0.52, front);
      const infraRim = 0.0050 * gauss(dOrbit - 1.18, 0.24) * sstep(0.296, 0.268, y) * front;

      // Subtle eroded nasal bridge tucked behind brow overhang + open piriform cavity
      const nasalBridge = 0.010 * gauss(ax, 0.010) * sstep(0.264, 0.288, y) * (1 - sstep(0.310, 0.324, y)) * Math.pow(front, 1.4);
      const piriformT = clamp((y - 0.242) / 0.032, 0, 1);
      const piriformW = lerp(0.0168, 0.0038, piriformT);
      const piriformMask = (1 - sstep(piriformW * 0.62, piriformW * 1.12, ax)) * sstep(0.236, 0.244, y) * (1 - sstep(0.272, 0.276, y)) * Math.pow(front, 1.5);
      const noseCarve = -0.040 * piriformMask;
      const piriformRim = 0.0058 * gauss(ax - (piriformW + 0.0042), 0.0048) * sstep(0.237, 0.246, y) * (1 - sstep(0.270, 0.278, y)) * front;

      // Smooth broad high CHEEKBONES + natural ZYGOMATIC ARCHES (NO pointy horn spike!)
      const cheekBone = 0.0140 * gauss(y - 0.264, 0.024) * gauss(ax - 0.056, 0.026) * sstep(-0.15, 0.55, ca);
      const zygArch = 0.0055 * gauss(y - 0.262, 0.017) * sstep(0.052, 0.090, ax) * sstep(-0.35, 0.45, ca);

      // TALL OVAL SCREAMING MOUTH (y = 0.165) framing visible protruding upper & lower teeth in side profile!
      const mouthYc = 0.165;
      const mouthRy = 0.048; // y = 0.117..0.213
      const tyM = clamp((y - mouthYc) / mouthRy, -1, 1);
      const mouthRx = lerp(0.033, 0.037, 0.5 + 0.5 * tyM);
      const pM = Math.pow(Math.pow(ax / mouthRx, 2.2) + Math.pow(Math.abs(y - mouthYc) / mouthRy, 2.2), 1 / 2.2);
      const mouthMaskF = sstep(0.32, 0.68, front) * sstep(0.11, 0.19, v);
      const mouthCav = -0.068 * Math.exp(-Math.pow(pM, 3.6)) * mouthMaskF;
      const lipRim = 0.0045 * gauss(pM - 1.18, 0.14) * sstep(0.40, 0.78, front) * sstep(0.08, 0.16, v);
      const nasolabialCrease = -0.0038 * gauss(ax - lerp(0.024, 0.046, clamp((0.240 - y) / 0.08, 0, 1)), 0.0080) * sstep(0.135, 0.182, y) * (1 - sstep(0.232, 0.256, y)) * front;

      // Deep smooth HOLLOW CHEEKS under cheekbones + deep wide U-MANDIBLE + ascending JAW RAMUS
      const cheekHollow = -0.0165 * gauss(ax - 0.054, 0.020) * gauss(y - 0.214, 0.032) * sstep(0.08, 0.65, front) * sstep(1.10, 1.46, pM);
      const leftWoundGroove = (x > 0.030) ? -0.0042 * gauss(x - 0.055, 0.014) * gauss(y - 0.220, 0.024) * front * sstep(1.08, 1.42, pM) : 0;
      const jawEdge = 0.0068 * gauss(y - lerp(0.080, 0.166, clamp((ax - 0.026) / 0.062, 0, 1)), 0.022) * sstep(0.032, 0.066, ax) * sstep(-0.08, 0.55, ca);
      const ramusRidge = 0.0046 * gauss(ax - 0.074, 0.015) * gauss(z - 0.018, 0.024) * sstep(0.145, 0.175, y) * (1 - sstep(0.240, 0.265, y));
      const chinJut = 0.0036 * gauss(ax, 0.034) * gauss(y - 0.078, 0.016) * front;

      // Smooth anatomical HOLLOW TEMPLES behind brow (no sharp gouge dent!)
      const templeHollow = -0.0115 * gauss(ax - 0.082, 0.024) * gauss(y - 0.330, 0.032) * sstep(0.01, 0.095, z);
      const mastoid = 0.0022 * gauss(ax - 0.064, 0.015) * gauss(y - 0.214, 0.016) * gauss(z + 0.016, 0.018);

      x += Math.sign(x || 1) * (cheekBone * 0.18 + zygArch + latPillar * 0.28 + templeHollow * 0.85 + mastoid + ramusRidge + cheekHollow * 0.42 + jawEdge * 0.46);
      y += browOverhangY;
      z += browBand * 0.026 + glabellaFurrow + frownFold + latPillar * 0.65 + orbitCarve + infraRim +
           nasalBridge + noseCarve + piriformRim + cheekBone * 0.72 + mouthCav + lipRim + nasolabialCrease +
           cheekHollow * 0.56 + leftWoundGroove + jawEdge * 0.50 + chinJut + templeHollow * 0.28 - occiputBall;
      row.push([x, y, z]);

      const yUvBase = lerp(0.156, 0.212, Math.pow(0.5 + 0.5 * ca, 0.85));
      const vUv = clamp((y - yUvBase) / (0.418 - yUvBase), 0, 1);
      uvRow.push([((a / (Math.PI * 2)) % 1 + 1) % 1, vUv]);
    }
    skullGrid.push(row);
    skullUvs.push(uvRow);
  }
  const skullGeo = loftGrid(THREE, skullGrid, { wrapU: true, capBottom: true, capTop: true });
  const uvAttr = skullGeo.attributes.uv;
  if (uvAttr && uvAttr.count === SH_R * (SH_C + 1)) {
    for (let r = 0; r < SH_R; r++) {
      for (let j = 0; j < SH_C + 1; j++) {
        const idx = r * (SH_C + 1) + j;
        const src = skullUvs[r][j % SH_C];
        const uVal = j === SH_C ? src[0] + 1 : src[0];
        uvAttr.setXY(idx, uVal, src[1]);
      }
    }
    uvAttr.needsUpdate = true;
  }

  const skullParts = [skullGeo];
  if (!isLod) {
    for (const s of [-1, +1]) {
      const earGrid = [];
      const ER = 14, EC = 10;
      for (let i = 0; i < ER; i++) {
        const f = i / (ER - 1);
        const ang = lerp(-1.15, Math.PI * 1.15, f);
        const ey = 0.256 + Math.sin(ang) * 0.025;
        const ez = 0.000 - Math.cos(ang) * 0.013 - f * 0.004;
        const ex = s * (0.097 + 0.010 * Math.sin(f * Math.PI) + (f > 0.8 ? 0.002 : 0));
        const rad = lerp(0.0048, 0.0064, Math.sin(f * Math.PI)) * (f > 0.8 ? 1.1 : 1.0);
        const row = [];
        for (let j = 0; j < EC; j++) {
          const a = (j / EC) * Math.PI * 2;
          row.push([
            ex + Math.cos(a) * rad * 0.72,
            ey + Math.sin(a) * rad * 0.92,
            ez + Math.cos(a) * rad * 0.82
          ]);
        }
        earGrid.push(row);
      }
      skullParts.push(loftGrid(THREE, earGrid, { wrapU: true, capBottom: true, capTop: true }));
      skullParts.push(loftBubble(THREE, s * 0.096, 0.255, 0.002, 0.0080, 0.021, 0.012, { rings: 5, segs: 8 }));
    }
  } else {
    for (const s of [-1, +1]) {
      skullParts.push(loftBubble(THREE, s * 0.096, 0.255, 0.001, 0.0080, 0.021, 0.012, { rings: 4, segs: 6 }));
    }
  }

  mergeZoneInto(headGroup, THREE, BGU, skullParts, headMat, {
    name: 'shambler-skull-cranium',
    baseHex: PALETTE.skin,
    tintDarkHex: PALETTE.skinDark,
    colorNoise: 0.06,
    noiseAmp: 0.00045,
    noiseFreq: 44,
    seed: 101,
    noiseMask: (x, y, z) => (z > 0.070 && y > 0.070 && y < 0.345) ? 0.14 : 0.65
  });

  // -----------------------------------------------------------------------
  // 3. DEEP CAVITIES + RECESSED GLOWING EYEBALLS (y = 0.302, z = 0.126)
  //    + WIDE-ARCH UPPER GUMS & 12 BIG BLOCKY UPPER TEETH
  // -----------------------------------------------------------------------
  const cavRings = isLod ? 4 : 6, cavSegs = isLod ? 8 : 10;
  const darkCavities = [
    loftBubble(THREE, +0.035, 0.302, 0.110, 0.021, 0.018, 0.016, { rings: cavRings, segs: cavSegs }),
    loftBubble(THREE, -0.035, 0.302, 0.110, 0.021, 0.018, 0.016, { rings: cavRings, segs: cavSegs }),
    loftBubble(THREE, 0, 0.256, 0.124, 0.015, 0.0155, 0.017, { rings: cavRings, segs: cavSegs }),
    loftBubble(THREE, 0, 0.165, 0.074, 0.032, 0.052, 0.034, { rings: cavRings, segs: cavSegs + 2 })
  ];
  mergeZoneInto(headGroup, THREE, BGU, darkCavities, cavityMat, {
    name: 'shambler-skull-cavities',
    baseHex: PALETTE.mouth,
    tintDarkHex: 0x090707,
    noiseAmp: 0.0003,
    seed: 102
  });

  const septumGeo = loftBubble(THREE, 0, 0.256, 0.137, 0.0020, 0.014, 0.009, { rings: isLod ? 3 : 5, segs: isLod ? 6 : 8 });
  mergeZoneInto(headGroup, THREE, BGU, [septumGeo], headMat, {
    name: 'shambler-nasal-septum',
    baseHex: PALETTE.skinDark,
    tintDarkHex: 0x5c5449,
    noiseAmp: 0.0002,
    seed: 108
  });

  for (const s of [-1, +1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0100, isLod ? 8 : 12, isLod ? 6 : 10), eyeMat);
    eye.name = s > 0 ? 'shambler-eye-L' : 'shambler-eye-R';
    eye.position.set(s * 0.035, 0.302, 0.118);
    headGroup.add(eye);
  }

  // Sculpted UPPER GUMS wide U-arch framed cleanly inside snarled upper lip (y = 0.212)
  const upperGumPts = [
    [-0.033, 0.211, 0.090, 0.0062, 0.0074, 0.78],
    [-0.028, 0.211, 0.108, 0.0064, 0.0078, 0.76],
    [-0.017, 0.212, 0.124, 0.0066, 0.0082, 0.74],
    [ 0.000, 0.212, 0.129, 0.0068, 0.0084, 0.74],
    [+0.017, 0.212, 0.124, 0.0066, 0.0082, 0.74],
    [+0.028, 0.211, 0.108, 0.0064, 0.0078, 0.76],
    [+0.033, 0.211, 0.090, 0.0062, 0.0074, 0.78]
  ];
  const UG_STEPS = isLod ? 10 : 18, UG_SEGS = isLod ? 6 : 8;
  const uGumGrid = [];
  for (let i = 0; i < UG_STEPS; i++) {
    const [gx, gy, gz, ht, hh, pwr] = evalSplinePt(upperGumPts, i / (UG_STEPS - 1));
    const angYaw = Math.atan2(gx, Math.max(0.02, gz - 0.076));
    const nx = Math.sin(angYaw), nz = Math.cos(angYaw);
    const row = [];
    for (let j = 0; j < UG_SEGS; j++) {
      const a = (j / UG_SEGS) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const u = Math.sign(ca) * Math.pow(Math.abs(ca), pwr) * ht;
      const v = Math.sign(sa) * Math.pow(Math.abs(sa), pwr) * hh;
      row.push([gx + nx * u, gy + v, gz + nz * u]);
    }
    uGumGrid.push(row);
  }
  const upperGumsGeo = loftGrid(THREE, uGumGrid, { wrapU: true, capBottom: true, capTop: true });
  mergeZoneInto(headGroup, THREE, BGU, [upperGumsGeo], skinMat, {
    name: 'shambler-upper-gums',
    baseHex: PALETTE.gums || 0x9e3d3a,
    tintDarkHex: 0x622624,
    colorNoise: 0.06,
    noiseAmp: 0.0004,
    noiseFreq: 65,
    seed: 112
  });

  // 12 BIG BLOCKY CROWDED UPPER TEETH projecting visibly in side & 3/4 view (tips ~0.194)
  const upperTeethDefs = isLod
    ? [
        [-0.009, 0.205, 0.135, 0.0086, 0.0114, 0.0042, -0.08, -0.05],
        [+0.009, 0.205, 0.135, 0.0086, 0.0114, 0.0042, +0.08, -0.05],
        [-0.025, 0.205, 0.121, 0.0072, 0.0120, 0.0040, -0.45, -0.04],
        [+0.025, 0.205, 0.121, 0.0072, 0.0120, 0.0040, +0.45, -0.04]
      ]
    : [
        [-0.0054, 0.205, 0.136, 0.0058, 0.0114, 0.0042, -0.04, -0.05],
        [+0.0054, 0.205, 0.136, 0.0058, 0.0116, 0.0042, +0.04, -0.05],
        [-0.0154, 0.205, 0.131, 0.0055, 0.0108, 0.0041, -0.24, -0.04],
        [+0.0154, 0.205, 0.131, 0.0055, 0.0107, 0.0041, +0.24, -0.04],
        [-0.0234, 0.204, 0.122, 0.0056, 0.0126, 0.0042, -0.52, -0.03],
        [+0.0234, 0.204, 0.122, 0.0056, 0.0124, 0.0042, +0.52, -0.03],
        [-0.0280, 0.205, 0.110, 0.0054, 0.0104, 0.0042, -0.84, -0.02],
        [+0.0280, 0.205, 0.110, 0.0054, 0.0106, 0.0042, +0.84, -0.02],
        [-0.0306, 0.206, 0.099, 0.0054, 0.0094, 0.0042, -1.08,  0.00],
        [+0.0306, 0.206, 0.099, 0.0054, 0.0094, 0.0042, +1.08,  0.00],
        [-0.0318, 0.207, 0.087, 0.0054, 0.0088, 0.0042, -1.26,  0.00],
        [+0.0318, 0.207, 0.087, 0.0054, 0.0088, 0.0042, +1.26,  0.00]
      ];
  const upperTeeth = upperTeethDefs.map((t) => makeTooth(THREE, ...t, false));
  mergeZoneInto(headGroup, THREE, BGU, upperTeeth, teethMat, {
    name: 'shambler-upper-teeth',
    baseHex: PALETTE.teeth,
    tintDarkHex: 0x9b9079,
    noiseAmp: 0.0003,
    seed: 103
  });

  // -----------------------------------------------------------------------
  // 4. ARTICULATED JAW BONE GROUP FOR LOWER GUMS + 12 LOWER TEETH + FLOOR
  //    Rest scream at jaw.rotation.x = 0 (lower tips y_head = 0.144 => ~5.0 cm gape!)
  // -----------------------------------------------------------------------
  const jawGroup = new THREE.Group();
  jawGroup.name = 'jaw';
  jawGroup.position.set(0, 0.232, -0.004);
  headGroup.add(jawGroup);
  headGroup.userData.jaw = jawGroup;

  // Broad U lower gums tucked cleanly above chin floor & inside chin skin (head y = 0.126 -> jaw y = -0.106)
  const lowerGumPts = [
    [-0.028, -0.104, 0.086, 0.0052, 0.0062, 0.78],
    [-0.024, -0.105, 0.102, 0.0054, 0.0066, 0.76],
    [-0.015, -0.106, 0.116, 0.0056, 0.0070, 0.74],
    [ 0.000, -0.106, 0.120, 0.0058, 0.0072, 0.74],
    [+0.015, -0.106, 0.116, 0.0056, 0.0070, 0.74],
    [+0.024, -0.105, 0.102, 0.0054, 0.0066, 0.76],
    [+0.028, -0.104, 0.086, 0.0052, 0.0062, 0.78]
  ];
  const LG_STEPS = isLod ? 10 : 18, LG_SEGS = isLod ? 6 : 8;
  const lGumGrid = [];
  for (let i = 0; i < LG_STEPS; i++) {
    const [gx, gy, gz, ht, hh, pwr] = evalSplinePt(lowerGumPts, i / (LG_STEPS - 1));
    const angYaw = Math.atan2(gx, Math.max(0.02, gz - 0.070));
    const nx = Math.sin(angYaw), nz = Math.cos(angYaw);
    const row = [];
    for (let j = 0; j < LG_SEGS; j++) {
      const a = (j / LG_SEGS) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const u = Math.sign(ca) * Math.pow(Math.abs(ca), pwr) * ht;
      const v = Math.sign(sa) * Math.pow(Math.abs(sa), pwr) * hh;
      row.push([gx + nx * u, gy + v, gz + nz * u]);
    }
    lGumGrid.push(row);
  }
  const lowerGumsGeo = loftGrid(THREE, lGumGrid, { wrapU: true, capBottom: true, capTop: true });
  mergeZoneInto(jawGroup, THREE, BGU, [lowerGumsGeo], skinMat, {
    name: 'shambler-lower-gums',
    baseHex: PALETTE.gums || 0x9e3d3a,
    tintDarkHex: 0x622624,
    colorNoise: 0.06,
    noiseAmp: 0.0004,
    noiseFreq: 65,
    seed: 113
  });

  const mouthFloor = loftBubble(THREE, 0, -0.104, 0.080, 0.022, 0.009, 0.026, { rings: cavRings, segs: cavSegs + 2 });
  mergeZoneInto(jawGroup, THREE, BGU, [mouthFloor], cavityMat, {
    name: 'shambler-jaw-interior',
    baseHex: PALETTE.mouth,
    tintDarkHex: 0x090707,
    noiseAmp: 0.0004,
    seed: 105
  });

  // 12 BIG BLOCKY CROWDED LOWER TEETH matching uppers (jaw y = -0.099 -> head y = 0.133 -> tips ~0.144!)
  const lowerTeethDefs = isLod
    ? [
        [-0.009, -0.098, 0.125, 0.0082, 0.0110, 0.0040, -0.08, +0.05],
        [+0.009, -0.098, 0.125, 0.0082, 0.0110, 0.0040, +0.08, +0.05],
        [-0.023, -0.097, 0.113, 0.0068, 0.0116, 0.0038, -0.45, +0.04],
        [+0.023, -0.097, 0.113, 0.0068, 0.0116, 0.0038, +0.45, +0.04]
      ]
    : [
        [-0.0052, -0.099, 0.126, 0.0056, 0.0112, 0.0040, -0.04, +0.05],
        [+0.0052, -0.099, 0.126, 0.0056, 0.0112, 0.0040, +0.04, +0.05],
        [-0.0144, -0.099, 0.122, 0.0053, 0.0108, 0.0039, -0.24, +0.04],
        [+0.0144, -0.099, 0.122, 0.0053, 0.0108, 0.0039, +0.24, +0.04],
        [-0.0214, -0.098, 0.114, 0.0054, 0.0122, 0.0040, -0.52, +0.03],
        [+0.0214, -0.098, 0.114, 0.0054, 0.0122, 0.0040, +0.52, +0.03],
        [-0.0254, -0.097, 0.104, 0.0052, 0.0104, 0.0040, -0.84, +0.02],
        [+0.0254, -0.097, 0.104, 0.0052, 0.0104, 0.0040, +0.84, +0.02],
        [-0.0272, -0.096, 0.093, 0.0052, 0.0094, 0.0040, -1.08,  0.00],
        [+0.0272, -0.096, 0.093, 0.0052, 0.0094, 0.0040, +1.08,  0.00],
        [-0.0280, -0.095, 0.083, 0.0052, 0.0088, 0.0040, -1.26,  0.00],
        [+0.0280, -0.095, 0.083, 0.0052, 0.0088, 0.0040, +1.26,  0.00]
      ];
  const lowerTeeth = lowerTeethDefs.map((t) => makeTooth(THREE, ...t, true));
  mergeZoneInto(jawGroup, THREE, BGU, lowerTeeth, teethMat, {
    name: 'shambler-lower-teeth',
    baseHex: PALETTE.teeth,
    tintDarkHex: 0x9b9079,
    noiseAmp: 0.0003,
    seed: 106
  });
}

// ======== ported from review/AG-357/shambler-clothes.mjs (md5 d6b13798) ========
// review/AG-357/shambler-clothes.mjs
// AG-357 Step 4b Tank Top + Full-Length Trousers (D-209 / Jerry 4b add):
// - Tank top: U-SCOOP neckline front AND back with 3D rolled binding rim, 3.6 cm flat
//   edge-stitched shoulder straps lying on the trapezius, DEEP rib-exposing armholes,
//   LOOSE chest-draped body with soft vertical folds, and ragged uneven hem hanging over belt.
// - Full-length trousers tucked into boot tops w/ left cargo pocket & right torn knee HOLE.


function buildRealTankTop(THREE, BGU, torsoGroup, bodyMat, PALETTE, {
  clothSupportPointAndNormal,
  skinPointAndNormal = null,
  mergeZoneInto,
  tankMat = null,
  lod = 0
}) {
  const mat = tankMat || bodyMat;
  const tankParts = [];
  const surfaceAt = skinPointAndNormal || clothSupportPointAndNormal;

  // Periodic spline helper for smooth symmetric top U-scoop + armhole curve over absA in [0, PI]
  const topKnots = [
    [0.00, 0.286], // front U-scoop center nadir (exposes sternum, clavicles & upper ribs!)
    [0.24, 0.302],
    [0.44, 0.372],
    [0.60, 0.432], // front strap attachment apex
    [0.82, 0.336],
    [1.18, 0.226],
    [1.5708, 0.204], // deep side armhole nadir (exposes side ribcage!)
    [1.96, 0.226],
    [2.32, 0.340],
    [2.54, 0.436], // back strap attachment apex
    [2.72, 0.382],
    [2.94, 0.346],
    [Math.PI, 0.338] // back U-scoop center nadir (true U-scoop between shoulder blades!)
  ];

  const getTopY = (a) => {
    const absA = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    let idx = topKnots.length - 2;
    for (let i = 0; i < topKnots.length - 1; i++) {
      if (absA <= topKnots[i + 1][0]) { idx = i; break; }
    }
    const p0 = topKnots[Math.max(0, idx - 1)][1];
    const p1 = topKnots[idx][1];
    const p2 = topKnots[idx + 1][1];
    const p3 = topKnots[Math.min(topKnots.length - 1, idx + 2)][1];
    const x1 = topKnots[idx][0], x2 = topKnots[idx + 1][0];
    const t = clamp((absA - x1) / (x2 - x1 || 1e-6), 0, 1);
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (
      2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  };

  // Loose chest & back drape gap: snug across upper chest/shoulders, hangs LOOSE off torso in side & 3/4 views!
  const U = lod >= 1 ? 28 : 54;
  const V = lod >= 1 ? 14 : 24;
  const offGap = (y, a) => {
    const upperHug = sstep(0.24, 0.41, y);
    const looseT = 1 - upperHug;
    const hemFlare = sstep(0.18, -0.05, y) * 0.012;
    // Soft vertical gravity folds draping down from chest & shoulder blades
    const vertFolds = (
      0.0046 * Math.sin(a * 7 + y * 5 + 0.5) +
      0.0028 * Math.cos(a * 11 - y * 7 - 0.3)
    ) * looseT;
    // Subtle waist blousing gather just above ragged hem (y in -0.02..0.06)
    const blouse = 0.0055 * gauss(y - 0.020, 0.042);
    const baseGap = lerp(0.021, 0.0038, upperHug);
    return baseGap + hemFlare + vertFolds + blouse;
  };

  // Drape support: below pectoral chest line (y < 0.30), hang off chest/shoulder blades instead of sucking into waist!
  const looseClothPointAndNormal = (y, a) => {
    const p0 = clothSupportPointAndNormal(y, a);
    if (y >= 0.30) return p0;
    const pChest = clothSupportPointAndNormal(0.30, a);
    const hangT = sstep(0.30, 0.02, y) * 0.85;
    const x = lerp(p0.p[0], Math.max(Math.abs(p0.p[0]), Math.abs(pChest.p[0]) * 0.92) * Math.sign(p0.p[0] || 1), hangT * 0.62);
    const z = lerp(p0.p[2], pChest.p[2] * 0.92, hangT * (Math.cos(a) > 0 ? 0.90 : 0.78));
    return { p: [x, y, z], n: p0.n };
  };

  const getHemY = (a) => (
    -0.044 +
    0.016 * Math.sin(a * 4 + 0.7) +
    0.010 * Math.cos(a * 7 - 0.5) +
    0.006 * Math.sin(a * 13 + 1.1)
  );

  const tankShellGrid = (insetOffset) => {
    const grid = [];
    for (let r = 0; r < V; r++) {
      const v = r / (V - 1);
      const row = [];
      for (let j = 0; j < U; j++) {
        const a = (j / U) * Math.PI * 2;
        const ragHem = getHemY(a);
        const topY = getTopY(a);
        const y = lerp(ragHem, topY, v);
        const upperT = sstep(0.25, 0.40, y);
        const { p: pCloth, n: nCloth } = looseClothPointAndNormal(y, a);
        const { p: pSkin, n: nSkin } = surfaceAt(y, a);
        const p = [lerp(pCloth[0], pSkin[0], upperT * 0.70), lerp(pCloth[1], pSkin[1], upperT * 0.70), lerp(pCloth[2], pSkin[2], upperT * 0.70)];
        const n = [lerp(nCloth[0], nSkin[0], upperT * 0.70), lerp(nCloth[1], nSkin[1], upperT * 0.70), lerp(nCloth[2], nSkin[2], upperT * 0.70)];
        const nl = Math.hypot(n[0], n[1], n[2]) || 1;
        const gap = offGap(y, a) + insetOffset;
        row.push([p[0] + (n[0] / nl) * gap, p[1] + (n[1] / nl) * gap, p[2] + (n[2] / nl) * gap]);
      }
      grid.push(row);
    }
    return grid;
  };

  const outerG = tankShellGrid(0);
  // CC-359 (Claude 3): the tank's two holes are CUT in the cloth (AG cut them with alphaTest in the texture; production has
  // no alpha, plan 6.1, Director pick 2). The same hole field as AG's makeClothTexelEval(withHoles), tested at each cell's
  // centre in the tank's own (u, v); the cut edge gets a rim down to the inner layer (the cloth's thickness).
  const tankHoleCell = (r, j) => {
    const u = (j + 0.5) / U, v = (r + 0.5) / (V - 1);
    const rag = cv5CylFbm(u * 2.1, v * 2.1, 3.2, 5.8, 211 + 91, 4) * 0.36;
    const hole1 = Math.hypot(cv5WrapDU(u, 0.120) / 0.072, (v - 0.43) / 0.096) + rag;
    const hole3 = Math.hypot(cv5WrapDU(u, 0.87) / 0.046, (v - 0.28) / 0.060) + rag;
    const holeWindow = sstep(0.14, 0.20, v) * (1 - sstep(0.56, 0.62, v));
    return holeWindow > 0.5 && Math.min(hole1, hole3) < 0.88;
  };
  const tankHoles = lod < 1 ? tankHoleCell : null;
  tankParts.push(loftGrid(THREE, outerG, { wrapU: true, capBottom: false, capTop: false, vScale: 1.0, skipCell: tankHoles }));
  if (lod < 1) {
    const innerG = tankShellGrid(-0.0040);
    tankParts.push(loftGrid(THREE, innerG, { wrapU: true, capBottom: false, capTop: false, flip: true, vScale: 1.0, skipCell: tankHoles }));
    // the holes' cut edges: one quad from the outer to the inner layer along every edge between a kept cell and a cut one
    {
      const rp = [], ruv = [], kept = (r, j) => r >= 0 && r < V - 1 && !tankHoleCell(r, ((j % U) + U) % U);
      const P = (G, r, j) => G[r][((j % U) + U) % U];
      for (let r = 0; r < V - 1; r++) for (let j = 0; j < U; j++) {
        if (!kept(r, j)) continue;
        const c = [0, 1, 2].map((k) => (P(outerG, r, j)[k] + P(outerG, r + 1, j + 1)[k]) * 0.5);
        for (const [nr, nj, a0, a1] of [[r, j + 1, [r, j + 1], [r + 1, j + 1]], [r, j - 1, [r, j], [r + 1, j]], [r + 1, j, [r + 1, j], [r + 1, j + 1]], [r - 1, j, [r, j], [r, j + 1]]]) {
          if (nr < 0 || nr >= V - 1 || kept(nr, nj)) continue;
          const A = P(outerG, ...a0), B = P(outerG, ...a1), Ci = P(innerG, ...a0), D = P(innerG, ...a1);
          const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [Ci[0] - A[0], Ci[1] - A[1], Ci[2] - A[2]];
          const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
          const m = [(A[0] + B[0]) / 2 - c[0], (A[1] + B[1]) / 2 - c[1], (A[2] + B[2]) / 2 - c[2]];
          const tri = n[0] * m[0] + n[1] * m[1] + n[2] * m[2] >= 0 ? [A, B, Ci, B, D, Ci] : [A, Ci, B, B, Ci, D];
          for (const q of tri) { rp.push(q[0], q[1], q[2]); ruv.push((j + 0.5) / U, (r + 0.5) / (V - 1)); }
        }
      }
      if (rp.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2)); g.computeVertexNormals(); tankParts.push(g); }
    }

    // Stitch closed rims along top neckline/armholes AND ragged lower hem
    const stitchEdge = (rowOut, rowIn, flipRim, vPin) => {
      const g = loftGrid(THREE, [rowOut, rowIn], { wrapU: true, capBottom: false, capTop: false, flip: flipRim });
      const uv = g.attributes.uv;
      if (uv) {
        for (let i = 0; i < uv.count; i++) uv.setY(i, vPin);
        uv.needsUpdate = true;
      }
      return g;
    };
    tankParts.push(stitchEdge(outerG[V - 1], innerG[V - 1], false, 0.96));
    tankParts.push(stitchEdge(outerG[0], innerG[0], true, 0.04));

    // Sculpted 3D ROLLED BINDING RIM running cleanly along front U-scoop, back U-scoop & armholes!
    const rimGrid = [];
    const rimSegs = 8;
    for (let j = 0; j < U; j++) {
      const a = (j / U) * Math.PI * 2;
      const absA = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      // Smoothly taper rim tube down where it meets the shoulder strap mounts (absA ~ 0.60 and 2.54)
      const strapFade = (1 - 0.72 * gauss(absA - 0.60, 0.14)) * (1 - 0.72 * gauss(absA - 2.54, 0.14));
      const pOut = outerG[V - 1][j];
      const pIn = innerG[V - 1][j];
      const cx = (pOut[0] + pIn[0]) * 0.5;
      const cy = (pOut[1] + pIn[1]) * 0.5;
      const cz = (pOut[2] + pIn[2]) * 0.5;
      const pPrev = outerG[V - 1][(j - 1 + U) % U];
      const pNext = outerG[V - 1][(j + 1) % U];
      let tx = pNext[0] - pPrev[0], ty = pNext[1] - pPrev[1], tz = pNext[2] - pPrev[2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;
      let ox = pOut[0] - pIn[0], oy = pOut[1] - pIn[1], oz = pOut[2] - pIn[2];
      const ol = Math.hypot(ox, oy, oz) || 1;
      ox /= ol; oy /= ol; oz /= ol;
      // Tangent-orthogonal up vector along rim lip
      let ux = oy * tz - oz * ty, uy = oz * tx - ox * tz, uz = ox * ty - oy * tx;
      const ul = Math.hypot(ux, uy, uz) || 1;
      ux /= ul; uy /= ul; uz /= ul;

      const rad = 0.0038 * strapFade;
      const rimRow = [];
      for (let c = 0; c < rimSegs; c++) {
        const ca = Math.cos((c / rimSegs) * Math.PI * 2) * rad;
        const sa = Math.sin((c / rimSegs) * Math.PI * 2) * rad * 1.15;
        rimRow.push([
          cx + ox * ca + ux * sa,
          cy + oy * ca + uy * sa,
          cz + oz * ca + uz * sa
        ]);
      }
      rimGrid.push(rimRow);
    }
    rimGrid.push(rimGrid[0]);
    const rimGeo = loftGrid(THREE, rimGrid, { wrapU: true, capBottom: false, capTop: false });
    const ruv = rimGeo.attributes.uv;
    if (ruv) {
      for (let i = 0; i < ruv.count; i++) ruv.setY(i, 0.94);
      ruv.needsUpdate = true;
    }
    tankParts.push(rimGeo);
  }

  // Two flat surface-conformed 3.6 cm shoulder straps with subtle raised rolled edges!
  const findClosestSkin = (qx, qy, qz, aHint, yHint) => {
    let bestA = aHint, bestY = yHint, bestD2 = Infinity;
    for (let dy = -0.036; dy <= 0.0361; dy += 0.009) {
      const yy = clamp(yHint + dy, 0.34, 0.556);
      for (let da = -0.32; da <= 0.321; da += 0.064) {
        const aa = aHint + da;
        const { p } = surfaceAt(yy, aa);
        const dx = p[0] - qx, dyy = p[1] - qy, dz = p[2] - qz;
        const d2 = dx * dx + dyy * dyy + dz * dz;
        if (d2 < bestD2) { bestD2 = d2; bestA = aa; bestY = yy; }
      }
    }
    for (let dy = -0.009; dy <= 0.0091; dy += 0.003) {
      const yy = clamp(bestY + dy, 0.34, 0.556);
      for (let da = -0.06; da <= 0.061; da += 0.015) {
        const aa = bestA + da;
        const { p } = surfaceAt(yy, aa);
        const dx = p[0] - qx, dyy = p[1] - qy, dz = p[2] - qz;
        const d2 = dx * dx + dyy * dyy + dz * dz;
        if (d2 < bestD2) { bestD2 = d2; bestA = aa; bestY = yy; }
      }
    }
    return surfaceAt(bestY, bestA);
  };

  for (const s of [-1, +1]) {
    const steps = lod >= 1 ? 10 : 21;
    const halfWidth = 0.0185; // ~3.7 cm wide shoulder straps lying cleanly on trapezius!
    const phiFront = s > 0 ? 0.60 : -0.60;
    const phiBack = s > 0 ? Math.PI - 0.58 : -Math.PI + 0.58;
    const centerSamples = [];
    for (let i = 0; i < steps; i++) {
      const f = i / (steps - 1);
      const yCurve = lerp(0.410, 0.415, f) + 0.092 * Math.sin(f * Math.PI);
      const a = lerp(phiFront, phiBack, f);
      const { p, n } = surfaceAt(yCurve, a);
      centerSamples.push({ f, a, yCurve, p, n });
    }

    const strapGrid = [];
    const crossSegs = lod >= 1 ? 6 : 12;
    for (let i = 0; i < steps; i++) {
      const { f, a: aC, yCurve: yC, p, n } = centerSamples[i];
      const prev = centerSamples[Math.max(0, i - 1)].p;
      const next = centerSamples[Math.min(steps - 1, i + 1)].p;
      let tx = next[0] - prev[0], ty = next[1] - prev[1], tz = next[2] - prev[2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl; ty /= tl; tz /= tl;

      let lx = n[1] * tz - n[2] * ty;
      let ly = n[2] * tx - n[0] * tz;
      let lz = n[0] * ty - n[1] * tx;
      const ll = Math.hypot(lx, ly, lz) || 1;
      lx /= ll; ly /= ll; lz /= ll;

      const endTuck = 1.0 - Math.min(sstep(0.0, 0.20, f), sstep(1.0, 0.80, f));
      const w = halfWidth * (0.90 + 0.10 * (1 - endTuck));
      const outerOff = lerp(0.0040, 0.0014, endTuck);
      const innerOff = lerp(0.0010, -0.0005, endTuck);

      const row = [];
      for (let j = 0; j < crossSegs; j++) {
        const ang = (j / crossSegs) * Math.PI * 2;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const u = Math.sign(ca) * Math.pow(Math.abs(ca), 0.42) * w;
        const qx = p[0] + lx * u, qy = p[1] + ly * u, qz = p[2] + lz * u;
        const { p: ps, n: ns } = findClosestSkin(qx, qy, qz, aC, yC);
        // Subtle raised piping along outer & inner edges of shoulder strap
        const edgeBinding = gauss(Math.abs(ca) - 0.86, 0.16) * 0.0014 * (1 - endTuck);
        const edgeRound = 1 - Math.pow(Math.abs(ca), 3.2) * 0.40;
        const hSurf = (sa >= 0
          ? lerp(innerOff, outerOff, 0.5 + 0.5 * sa * edgeRound)
          : lerp(outerOff, innerOff, 0.5 - 0.5 * sa * edgeRound)) + edgeBinding;
        row.push([ps[0] + ns[0] * hSurf, ps[1] + ns[1] * hSurf, ps[2] + ns[2] * hSurf]);
      }
      strapGrid.push(row);
    }
    const strapGeo = loftGrid(THREE, strapGrid, { wrapU: true, capBottom: true, capTop: true });
    const uv = strapGeo.attributes.uv;
    if (uv) {
      for (let i = 0; i < uv.count; i++) uv.setY(i, 0.72 + clamp(uv.getY(i), 0, 1) * 0.24);
      uv.needsUpdate = true;
    }
    tankParts.push(strapGeo);
  }

  mergeZoneInto(torsoGroup, THREE, BGU, tankParts, mat, {
    name: 'shambler-tank-top',
    baseHex: PALETTE.tank,
    tintDarkHex: PALETTE.tankDark,
    colorNoise: 0.08,
    noiseAmp: lod >= 1 ? 0.0005 : 0.0010,
    noiseFreq: 26,
    seed: 205,
    noiseMask: (_x, y, _z) => 1 - sstep(0.36, 0.43, y) * 0.75
  });
}

// =========================================================================
// FULL-LENGTH TROUSERS (Left cargo + knee bulge, Right torn-knee HOLE)
// Smoothly tucked INTO boot collars (boot shaft overlaps cuffed trouser cleanly!)
// =========================================================================
function buildFullLengthTrousers(THREE, BGU, {
  isLeft,
  legG,
  shinG,
  bodyMat,
  pantsMat = null,
  skinMat = null,
  PALETTE,
  mergeZoneInto,
  lod = 0
}) {
  const pMat = pantsMat || bodyMat;
  const sMat = skinMat || bodyMat;
  const isLod = lod >= 1;
  // 1. CONTINUOUS THIGH TROUSER (both Left AND Right run cleanly up over hip/pelvis with zero brief-line pinch!)
  const hipIn = isLeft ? -0.012 : +0.012;
  const thighGeo = loftProfile(THREE, [
    [-0.415, 0.068, 0.073, 0,  0.002, 0.86],
    [-0.365, 0.071, 0.077, 0,  0.002, 0.86],
    [-0.275, 0.078, 0.084, 0,  0.001, 0.84],
    [-0.175, 0.086, 0.092, 0,  0.000, 0.82],
    [-0.075, 0.095, 0.100, hipIn * 0.25, -0.002, 0.80],
    [ 0.005, 0.104, 0.112, hipIn * 0.65, -0.004, 0.80],
    [ 0.058, 0.102, 0.112, hipIn,        -0.003, 0.84]
  ], {
    radialSegs: isLod ? 12 : 18,
    deform: (x, y, z, a) => {
      const ca = Math.cos(a);
      const fold = 0.004 * Math.sin(y * 54 + Math.cos(a * 2) * 1.4) * (1 - sstep(-0.08, 0.05, y));
      const inseam = (isLeft ? x < -0.01 : x > 0.01) ? -0.004 * gauss(y + 0.06, 0.12) : 0;
      const drape = ca < -0.4 ? 0.004 * gauss(y + 0.24, 0.12) : 0;
      return [x + Math.sign(x || 1) * fold + inseam, y, z - drape + fold * 0.4];
    }
  });

  const thighParts = [thighGeo];
  if (isLeft) {
    const pocket = loftBubble(THREE, +0.088, -0.195, 0.004, 0.017, 0.062, 0.044, {
      rings: isLod ? 5 : 10,
      segs: isLod ? 8 : 12,
      deform: (x, y, z) => {
        const pleat = 0.003 * gauss(z - 0.004, 0.010) * gauss(y + 0.20, 0.045);
        const flap = (y > -0.148) ? 0.004 * gauss(y + 0.142, 0.010) : 0;
        return [x + pleat + flap, y, z];
      }
    });
    thighParts.push(pocket);
  }
  mergeZoneInto(legG, THREE, BGU, thighParts, pMat, {
    name: 'shambler-thigh-trouser-' + (isLeft ? 'L' : 'R'),
    baseHex: PALETTE.pants,
    tintDarkHex: PALETTE.pantsDark,
    colorNoise: 0.075,
    noiseAmp: isLod ? 0.0018 : 0.0035,
    noiseFreq: 24,
    seed: isLeft ? 401 : 402,
    noiseMask: (_x, y, _z) => 1 - sstep(-0.02, 0.05, y)
  });

  // 2. LOWER SHIN TROUSERS (y_shin = -0.232 INSIDE boot collar .. +0.072)
  const makeShinProfile = (rowYs, radSegs, deformFn, skipCellFn = null) => {
    const lerpSpec = (y) => {
      const specs = [
        [-0.232, 0.042, 0.046, 0,  0.000, 0.90],
        [-0.195, 0.049, 0.054, 0,  0.002, 0.88],
        [-0.172, 0.057, 0.062, 0,  0.004, 0.85],
        [-0.085, 0.063, 0.070, 0,  0.003, 0.84],
        [ 0.002, 0.066, 0.077, 0,  0.004, 0.83],
        [ 0.072, 0.068, 0.074, 0,  0.002, 0.86]
      ];
      let idx = specs.length - 2;
      for (let i = 0; i < specs.length - 1; i++) {
        if (y <= specs[i + 1][0]) { idx = i; break; }
      }
      const r0 = specs[idx], r1 = specs[idx + 1];
      const t = clamp((y - r0[0]) / (r1[0] - r0[0] || 1e-6), 0, 1);
      const k = t * t * (3 - 2 * t);
      return [
        y,
        lerp(r0[1], r1[1], k),
        lerp(r0[2], r1[2], k),
        lerp(r0[3], r1[3], k),
        lerp(r0[4], r1[4], k),
        lerp(r0[5], r1[5], k)
      ];
    };

    const grid = [];
    for (let r = 0; r < rowYs.length; r++) {
      const [, rx, rz, cx, cz, pwr] = lerpSpec(rowYs[r]);
      const y = rowYs[r];
      const row = [];
      for (let j = 0; j < radSegs; j++) {
        const a = (j / radSegs) * Math.PI * 2;
        const sa = Math.sin(a), ca = Math.cos(a);
        let x = cx + Math.sign(sa) * Math.pow(Math.abs(sa), pwr) * rx;
        let z = cz + Math.sign(ca) * Math.pow(Math.abs(ca), pwr) * rz;
        let yy = y;
        if (deformFn) {
          const pt = deformFn(x, yy, z, a, r / (rowYs.length - 1 || 1));
          x = pt[0]; yy = pt[1]; z = pt[2];
        }
        row.push([x, yy, z]);
      }
      grid.push(row);
    }
    return loftGrid(THREE, grid, {
      wrapU: true,
      capBottom: !skipCellFn,
      capTop: !skipCellFn,
      skipCell: skipCellFn
    });
  };

  if (isLeft) {
    const rowYs = [];
    const stepsL = isLod ? 11 : 26;
    for (let i = 0; i <= stepsL; i++) rowYs.push(lerp(-0.232, 0.072, i / stepsL));
    const lowerL = makeShinProfile(rowYs, isLod ? 12 : 22, (x, y, z, a) => {
      const ca = Math.cos(a);
      const fold = 0.004 * Math.sin(y * 70 + ca * 1.8) * sstep(-0.20, -0.05, y);
      const tuck = 0.004 * gauss(y + 0.175, 0.016) * (0.6 + 0.4 * Math.cos(a * 5));
      const kneePop = ca > 0.4 ? 0.007 * gauss(y - 0.004, 0.036) * ca : 0;
      const backCrease = ca < -0.5 ? -0.006 * gauss(y - 0.008, 0.030) : 0;
      return [x + fold * Math.sin(a) + tuck * Math.sin(a), y, z + kneePop + backCrease + tuck * Math.cos(a)];
    });
    mergeZoneInto(shinG, THREE, BGU, [lowerL], pMat, {
      name: 'shambler-shin-trouser-L',
      baseHex: PALETTE.pants,
      tintDarkHex: PALETTE.pantsDark,
      colorNoise: 0.075,
      noiseAmp: isLod ? 0.0018 : 0.0034,
      noiseFreq: 24,
      seed: 403
    });
  } else {
    const kneeSkinR = loftProfile(THREE, [
      [-0.105, 0.036, 0.038, 0,  0.002, 0.92],
      [-0.065, 0.044, 0.046, 0,  0.004, 0.88],
      [-0.025, 0.048, 0.052, 0,  0.005, 0.85],
      [ 0.005, 0.050, 0.056, 0,  0.006, 0.82],
      [ 0.035, 0.049, 0.054, 0,  0.005, 0.84],
      [ 0.070, 0.046, 0.048, 0,  0.002, 0.88]
    ], {
      radialSegs: isLod ? 10 : 16,
      deform: (x, y, z, a) => {
        const ca = Math.cos(a);
        const patella = ca > 0.35 ? 0.008 * gauss(y - 0.002, 0.022) * gauss(x, 0.022) : 0;
        const shinBone = ca > 0.5 && y < -0.02 ? 0.004 * gauss(x, 0.010) : 0;
        return [x, y, z + patella + shinBone];
      }
    });
    mergeZoneInto(shinG, THREE, BGU, [kneeSkinR], sMat, {
      name: 'shambler-torn-knee-R',
      baseHex: PALETTE.skin,
      tintDarkHex: PALETTE.skinDark,
      colorNoise: 0.07,
      noiseAmp: isLod ? 0.0010 : 0.0018,
      noiseFreq: 38,
      seed: 404
    });

    const RN = isLod ? 16 : 40, CN = isLod ? 14 : 28;
    const rowYs = [];
    for (let i = 0; i <= RN; i++) rowYs.push(lerp(-0.232, 0.072, i / RN));

    const wrapAng = (a) => {
      let d = a % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      return d;
    };
    const holeMetric = (y, a) => {
      const da = wrapAng(a - 0.02);
      const dy = y - 0.002;
      const th = Math.atan2(dy / 0.048, da / 0.64);
      const jag = 1.0 + 0.16 * Math.sin(th * 5 + 0.6) + 0.09 * Math.cos(th * 9 - 0.8);
      return Math.hypot(dy / 0.048, da / 0.64) / jag;
    };

    const holeVertexInside = (r, j) => {
      const y = rowYs[r];
      const a = (j / CN) * Math.PI * 2;
      return holeMetric(y, a) < 0.96;
    };
    const skipKneeHole = (r, j) => {
      const j1 = (j + 1) % CN;
      return holeVertexInside(r, j) && holeVertexInside(r, j1) && holeVertexInside(r + 1, j) && holeVertexInside(r + 1, j1);
    };

    const makeRightLayer = (dr) => makeShinProfile(rowYs, CN, (x, y, z, a) => {
      const ca = Math.cos(a);
      const hm = holeMetric(y, a);
      const holeEdgeCurl = gauss(hm - 1.04, 0.16) * 0.0055 * (1 + 0.35 * Math.sin(a * 12));
      const fold = 0.004 * Math.sin(y * 68 + ca * 2.1) * sstep(-0.20, -0.05, y);
      const tuck = 0.004 * gauss(y + 0.175, 0.016) * (0.6 + 0.4 * Math.cos(a * 5));
      const off = dr + holeEdgeCurl + tuck;
      return [
        x + Math.sin(a) * off + fold * Math.sin(a),
        y,
        z + Math.cos(a) * off + fold * 0.3
      ];
    }, skipKneeHole);

    const outerR = makeRightLayer(0);
    const shinRParts = [outerR];
    if (!isLod) {
      const innerR = makeShinProfile(rowYs, CN, (x, y, z, a) => {
        const off = -0.0035;
        return [x + Math.sin(a) * off, y, z + Math.cos(a) * off];
      }, skipKneeHole);
      if (innerR.index) {
        const arr = innerR.index.array;
        for (let k = 0; k < arr.length; k += 3) {
          const tmp = arr[k + 1]; arr[k + 1] = arr[k + 2]; arr[k + 2] = tmp;
        }
        innerR.computeVertexNormals();
      }
      shinRParts.push(innerR);

      const collarGrid = [];
      const COLLAR_STEPS = 24;
      for (let i = 0; i < COLLAR_STEPS; i++) {
        const th = (i / COLLAR_STEPS) * Math.PI * 2;
        const jag = 1.0 + 0.16 * Math.sin(th * 5 + 0.6) + 0.09 * Math.cos(th * 9 - 0.8);
        const rimA = 0.02 + Math.cos(th) * 0.64 * jag * 0.98;
        const rimY = 0.002 + Math.sin(th) * 0.048 * jag * 0.98;
        const sa = Math.sin(rimA), ca = Math.cos(rimA);
        const baseRx = lerp(0.063, 0.068, sstep(-0.085, 0.072, rimY));
        const baseRz = lerp(0.070, 0.077, sstep(-0.085, 0.072, rimY)) + 0.003;
        const bx = Math.sign(sa) * Math.pow(Math.abs(sa), 0.84) * baseRx;
        const bz = 0.004 + Math.sign(ca) * Math.pow(Math.abs(ca), 0.84) * baseRz;
        const outN = [Math.sin(rimA), 0, Math.cos(rimA)];
        const tang = [-Math.cos(rimA) * 0.042 * Math.sin(th), Math.cos(th) * 0.056, Math.sin(rimA) * 0.042 * Math.sin(th)];
        const tl = Math.hypot(...tang) || 1;
        const tx = tang[0] / tl, ty = tang[1] / tl, tz = tang[2] / tl;
        const sx = outN[1] * tz - outN[2] * ty, sy = outN[2] * tx - outN[0] * tz, sz = outN[0] * ty - outN[1] * tx;
        const sl = Math.hypot(sx, sy, sz) || 1;
        const colRow = [];
        const rollR = 0.0045 * (1 + 0.35 * Math.sin(th * 7 + 1.1));
        for (let c = 0; c < 8; c++) {
          const ca2 = (c / 8) * Math.PI * 2;
          const u = Math.cos(ca2) * rollR, v = Math.sin(ca2) * rollR;
          colRow.push([
            bx + (outN[0] * u + (sx / sl) * v) + outN[0] * 0.0025,
            rimY + (outN[1] * u + (sy / sl) * v),
            bz + (outN[2] * u + (sz / sl) * v) + outN[2] * 0.0025
          ]);
        }
        collarGrid.push(colRow);
      }
      collarGrid.push(collarGrid[0]);
      shinRParts.push(loftGrid(THREE, collarGrid, { wrapU: true, capBottom: false, capTop: false, flip: true }));
    }

    mergeZoneInto(shinG, THREE, BGU, shinRParts, pMat, {
      name: 'shambler-shin-trouser-R',
      baseHex: PALETTE.pants,
      tintDarkHex: PALETTE.pantsDark,
      colorNoise: 0.08,
      noiseAmp: isLod ? 0.0018 : 0.0036,
      noiseFreq: 25,
      seed: 405
    });
  }
}

// ======== ported from review/AG-357/shambler-step1.mjs (md5 a973126c) ========
// review/AG-357/shambler-step1.mjs
// AG-357 PRIORITY STEP 1 (REDO #2 per CLAUDE DIRECTOR 05:00Z review):
// Shape + Seeded Vertex Noise + Baked AO in Vertex Colours (NO textures, NO red paint flush yet).
// Explicit 3D skull forms (cranium dome, overhanging brow bar, deep inset sockets, cheekbones,
// nasal bridge + dark nose hole, maxilla + teeth, hinged open U-mandible w/ gonion angle & chin),
// shorter collar-seated neck w/ visible clavicles & sternum top, real full-chest tank top w/ scoop
// below collarbones & 3.8 cm straps, full-length trousers tucked into boots w/ torn right knee HOLE,
// and neutral pale grey-beige Tripo-matched skin tone.





const SHAMBLER_HEIGHT = 1.800;

// Neutral flat base colours matching Jerry's Tripo shambler (pale grey-beige skin, NO Step 1 pink/red)
const PALETTE = {
  skin: 0xbcb6aa,       // pale neutral grey-beige corpse skin (NO pink/red cast!)
  skinDark: 0x8e877a,   // desaturated recessed grey-taupe crevice
  tank: 0x525746,       // dark muted olive-drab tank top (readable weave & shadows!)
  tankDark: 0x33372b,   // deep olive cloth creases
  pants: 0x433830,      // worn charcoal-brown cargo trousers (readable pocket & knee folds!)
  pantsDark: 0x26201b,  // deep trouser folds
  boot: 0x6f4e34,       // warm tan worn leather work boot
  bootDark: 0x3b2819,   // scuffed tan heel/toe
  sole: 0x251d16,       // dark lug rubber outsole
  lace: 0x9b8c72,       // tan-grey bootlaces
  belt: 0x2d2017,       // dark leather belt
  buckle: 0x92856d,     // weathered steel/brass belt buckle
  hair: 0x1d1917,       // wispy dark sparse scalp hair
  mouth: 0x1a1514,      // deep shadowed nasal/oral skull cavity interior
  teeth: 0xd6cfbf,      // bone-ivory jagged teeth
  gums: 0x8f4945,       // exposed necrotic gum tissue
  eye: 0x9bc4b6         // dull pale necrotic eye
};

function mergeZoneInto(boneGroup, THREE, BGU, geos, material, opts) {
  const geo = finalizeZoneGeometry(THREE, BGU, geos, opts);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = opts.name || 'part';
  boneGroup.add(mesh);
  return mesh;
}

// Helper: 1 articulated 3-capsule finger / thumb chain welded cleanly together
function makeCapsuleChainDigit(THREE, segments, radList, curlList, baseOrigin, dirVec, sideX) {
  // Build one smooth continuous multi-ring loft along 3 articulated bone phalanges
  // so there are ZERO gaps at joints and distinct knuckle swells between the 3 capsules!
  const pts = [];
  let px = baseOrigin[0], py = baseOrigin[1], pz = baseOrigin[2];
  let pitch = 0.08;
  const subPerBone = 4; // proximal, middle, distal phalanx -> 13 cross-section rings cleanly bulging at each capsule!

  // Axis frame: along finger direction (roughly -Y tilted by dirVec), curl bends inward (-sideX * X or +Z)
  let dx = dirVec[0], dy = dirVec[1], dz = dirVec[2];
  const dl = Math.hypot(dx, dy, dz) || 1;
  dx /= dl; dy /= dl; dz /= dl;

  const rings = [];
  for (let b = 0; b < 3; b++) {
    const segLen = segments[b];
    const rStart = radList[b], rEnd = radList[b + 1];
    pitch += curlList[b];
    // Rotate direction slightly inward toward palm (-sideX) & slightly forward (+Z)
    const c = Math.cos(pitch), s = Math.sin(pitch);
    const curDx = dx * c - sideX * s * 0.85;
    const curDy = dy * c;
    const curDz = dz + s * 0.25;
    const cl = Math.hypot(curDx, curDy, curDz) || 1;
    const vx = curDx / cl, vy = curDy / cl, vz = curDz / cl;

    // Orthogonal basis (uVec roughly +Z, wVec roughly X)
    let ux = 0, uy = vz, uz = -vy;
    let ul = Math.hypot(ux, uy, uz);
    if (ul < 1e-4) { ux = 0; uy = 0; uz = 1; ul = 1; }
    ux /= ul; uy /= ul; uz /= ul;
    const wx = vy * uz - vz * uy;
    const wy = vz * ux - vx * uz;
    const wz = vx * uy - vy * ux;

    const steps = b === 2 ? subPerBone + 1 : subPerBone;
    for (let k = (b === 0 ? 0 : 1); k <= steps; k++) {
      const f = k / steps;
      const dist = segLen * f;
      const cx = px + vx * dist;
      const cy = py + vy * dist;
      const cz = pz + vz * dist;
      // Capsule bulge in mid-phalanx + slight knuckle flare at joints (f ~ 0 or 1)
      const cap = 0.90 + 0.14 * Math.sin(f * Math.PI);
      const rad = lerp(rStart, rEnd, f) * cap * (b === 2 && f > 0.78 ? lerp(1.0, 0.35, (f - 0.78) / 0.22) : 1.0);
      const row = [];
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        row.push([
          cx + (ux * ca + wx * sa) * rad * 0.94,
          cy + (uy * ca + wy * sa) * rad,
          cz + (uz * ca + wz * sa) * rad * 1.04
        ]);
      }
      rings.push(row);
    }
    px += vx * segLen;
    py += vy * segLen;
    pz += vz * segLen;
  }
  return loftGrid(THREE, rings, { wrapU: true, capBottom: true, capTop: true });
}

// =========================================================================
// 2. SHARED TORSO SURFACE (skin ribcage/clavicles + SEPARATE OFF-BODY TANK SHELL!)
// ZERO skin-through-cloth z-fighting; visible side ribs through deep armholes; hem hangs over belt!
// =========================================================================
const TORSO_ROWS = [
  [-0.028, 0.144, 0.104, 0,  0.000, 0.88],
  [ 0.040, 0.148, 0.105, 0,  0.002, 0.88], // waist ~0.304 m
  [ 0.120, 0.152, 0.108, 0,  0.005, 0.85], // hollow abdomen
  [ 0.215, 0.166, 0.120, 0,  0.006, 0.82], // lower ribcage arch
  [ 0.312, 0.178, 0.127, 0,  0.004, 0.80], // chestD ~0.254 m
  [ 0.402, 0.194, 0.118, 0,  0.001, 0.82], // upper pectorals / acromion shelf
  [ 0.452, 0.184, 0.094, 0, -0.002, 0.86], // sloped trapezius / acromion shoulder (merges smoothly into neck trap flare!)
  [ 0.496, 0.118, 0.068, 0, -0.006, 0.90], // smooth trapezius slope inside neck collar
  [ 0.526, 0.060, 0.045, 0, -0.010, 0.94], // inside slim neck cone
  [ 0.546, 0.030, 0.030, 0, -0.012, 0.96]  // tucked deep inside neck base
];

function evalTorsoSmoothShell(y, a) {
  const n = TORSO_ROWS.length;
  let idx = n - 2;
  for (let i = 0; i < n - 1; i++) {
    if (y <= TORSO_ROWS[i + 1][0]) { idx = i; break; }
  }
  const p0 = TORSO_ROWS[Math.max(0, idx - 1)];
  const p1 = TORSO_ROWS[idx];
  const p2 = TORSO_ROWS[Math.min(n - 1, idx + 1)];
  const p3 = TORSO_ROWS[Math.min(n - 1, idx + 2)];
  const t = clamp((y - p1[0]) / (p2[0] - p1[0] || 1e-6), 0, 1);
  const t2 = t * t, t3 = t2 * t;
  const cr = (m) => 0.5 * (2 * p1[m] + (-p0[m] + p2[m]) * t + (2 * p0[m] - 5 * p1[m] + 4 * p2[m] - p3[m]) * t2 + (-p0[m] + 3 * p1[m] - 3 * p2[m] + p3[m]) * t3);
  const rx = cr(1), rz = cr(2), cx = cr(3), cz = cr(4), pwr = cr(5);
  const sa = Math.sin(a), ca = Math.cos(a);
  return [cx + Math.sign(sa) * Math.pow(Math.abs(sa), pwr) * rx, y, cz + Math.sign(ca) * Math.pow(Math.abs(ca), pwr) * rz];
}

function evalTorsoBase(y, a) {
  let [x, yy, z] = evalTorsoSmoothShell(y, a);
  const ax = Math.abs(x), ca = Math.cos(a), front = clamp(ca, 0, 1), back = clamp(-ca, 0, 1);
  const ribWave = Math.sin((y - 0.16) * 112);
  const ribMask = gauss(y - 0.245, 0.095) * sstep(0.03, 0.10, ax) * (1 - 0.55 * back);
  const sternumPit = -0.011 * gauss(y - 0.295, 0.065) * gauss(ax, 0.026) * front;
  // Crisp protruding MANUBRIUM / upper sternum (visible above tank U-scoop!) + deep sternal jugular pit
  const manubrium = 0.012 * gauss(y - 0.432, 0.032) * gauss(ax, 0.024) * front;
  const jugularPit = -0.018 * gauss(y - 0.472, 0.016) * gauss(ax, 0.022) * front;
  // Bold 3D-SCULPTED S-curve bony CLAVICLES sweeping from sternum heads out to acromion (+deep infra/supra hollows)
  const clavY = 0.452 + ax * 0.10 + 0.006 * Math.sin(clamp((ax - 0.025) / 0.12, 0, 1) * Math.PI);
  const clavicle = 0.0235 * gauss(y - clavY, 0.012) * sstep(0.010, 0.034, ax) * (1 - sstep(0.145, 0.186, ax)) * front;
  const subClav = -0.0115 * gauss(y - (clavY - 0.022), 0.016) * sstep(0.020, 0.048, ax) * (1 - sstep(0.135, 0.180, ax)) * front;
  const supraClav = -0.0170 * gauss(y - (clavY + 0.022), 0.014) * sstep(0.020, 0.048, ax) * (1 - sstep(0.125, 0.172, ax)) * front;
  const spine = -0.008 * (0.6 + 0.4 * Math.sin(y * 125)) * gauss(ax, 0.016) * gauss(y - 0.28, 0.19) * back;
  const gutter = +0.007 * gauss(ax - 0.032, 0.018) * gauss(y - 0.30, 0.17) * back;
  const scapula = -0.011 * gauss(ax - 0.088, 0.040) * gauss(y - 0.375, 0.055) * back;
  const gutHollow = -0.012 * gauss(y - 0.095, 0.055) * gauss(ax, 0.085) * front;

  x += 0.0092 * ribWave * ribMask * Math.sin(a);
  z += 0.0082 * ribWave * ribMask * Math.cos(a) + sternumPit + manubrium + jugularPit + clavicle + subClav + supraClav + spine + gutter + scapula + gutHollow;
  return [x, yy, z];
}

// Positive upper-bound cloth support shell: includes ALL outward clavicle/rib/scapula peaks without collapsing into hollows!
function evalTorsoClothBound(y, a) {
  let [x, yy, z] = evalTorsoSmoothShell(y, a);
  const ax = Math.abs(x), ca = Math.cos(a), front = clamp(ca, 0, 1), back = clamp(-ca, 0, 1);
  const ribWave = Math.max(0, Math.sin((y - 0.16) * 112));
  const ribMask = gauss(y - 0.245, 0.095) * sstep(0.03, 0.10, ax) * (1 - 0.55 * back);
  const clavY = 0.452 + ax * 0.10 + 0.006 * Math.sin(clamp((ax - 0.025) / 0.12, 0, 1) * Math.PI);
  const clavicle = 0.0240 * gauss(y - clavY, 0.012) * sstep(0.010, 0.034, ax) * (1 - sstep(0.145, 0.186, ax)) * front;
  const manubrium = 0.012 * gauss(y - 0.432, 0.028) * gauss(ax, 0.024) * front;
  const scapula = -0.012 * gauss(ax - 0.088, 0.040) * gauss(y - 0.375, 0.055) * back;
  x += 0.0095 * ribWave * ribMask * Math.sin(a);
  z += 0.0085 * ribWave * ribMask * Math.cos(a) + clavicle + manubrium + scapula;
  return [x, yy, z];
}

function pointAndNormalFromFn(fn, y, a) {
  const p = fn(y, a);
  const py = fn(y + 0.003, a);
  const pa = fn(y, a + 0.02);
  const ax = pa[0] - p[0], ay = pa[1] - p[1], az = pa[2] - p[2];
  const yx = py[0] - p[0], yy = py[1] - p[1], yz = py[2] - p[2];
  let nx = ay * yz - az * yy, ny = az * yx - ax * yz, nz = ax * yy - ay * yx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return { p, n: [nx / l, ny / l, nz / l] };
}

function clothSupportPointAndNormal(y, a) {
  return pointAndNormalFromFn(evalTorsoClothBound, y, a);
}

function skinPointAndNormal(y, a) {
  return pointAndNormalFromFn(evalTorsoBase, y, a);
}

function buildHipsAndTorso(THREE, BGU, hipsGroup, torsoGroup, bodyMat, mats = {}, lod = 0) {
  const isLod = lod >= 1;
  const pantsMat = mats.pantsMat || bodyMat;
  const skinMat = mats.skinMat || bodyMat;
  const tankMat = mats.tankMat || bodyMat;
  const bootMat = mats.bootMat || bodyMat;
  const metalMat = mats.metalMat || bodyMat;

  // HIPS: Trouser pelvis + waistband + glutes + BELT WITH METALLIC BUCKLE!
  const hipsMesh = loftProfile(THREE, [
    [-0.102, 0.038, 0.048, 0,  0.002, 0.92], // tucks cleanly inside upper thigh trouser tops!
    [-0.065, 0.105, 0.082, 0,  0.000, 0.86],
    [-0.025, 0.178, 0.114, 0, -0.004, 0.80], // widest hip ~0.404 m (seamless into thigh!)
    [ 0.025, 0.180, 0.118, 0, -0.002, 0.80],
    [ 0.068, 0.158, 0.112, 0,  0.000, 0.84], // trouser waistband
    [ 0.095, 0.146, 0.105, 0,  0.000, 0.88]
  ], {
    radialSegs: isLod ? 12 : 20,
    deform: (x, y, z, a) => {
      const ca = Math.cos(a);
      const glute = ca < 0 ? -0.012 * gauss(y + 0.018, 0.045) * gauss(Math.abs(x) - 0.068, 0.045) : 0;
      const fly = ca > 0.7 ? 0.005 * gauss(x, 0.016) * gauss(y + 0.005, 0.055) : 0;
      return [x, y, z + glute + fly];
    }
  });
  mergeZoneInto(hipsGroup, THREE, BGU, [hipsMesh], pantsMat, {
    name: 'shambler-pelvis-trousers',
    baseHex: PALETTE.pants,
    tintDarkHex: PALETTE.pantsDark,
    colorNoise: 0.07,
    noiseAmp: isLod ? 0.0018 : 0.0038,
    noiseFreq: 22,
    seed: 201,
    noiseMask: (_x, y, _z) => sstep(-0.08, 0.06, y)
  });

  // Worn Leather BELT + 5 Belt Loops sitting visibly around waist (y_hips = 0.032..0.076 -> world 0.887..0.931)
  const beltStrap = loftProfile(THREE, [
    [0.030, 0.168, 0.119, 0, 0.000, 0.82],
    [0.052, 0.171, 0.121, 0, 0.000, 0.82],
    [0.074, 0.167, 0.118, 0, 0.000, 0.82]
  ], { radialSegs: isLod ? 12 : 20 });
  const beltGeos = [beltStrap];
  if (!isLod) {
    for (const ang of [-2.4, -1.1, -0.42, 0.42, 1.1, 2.4]) {
      const lx = Math.sin(ang) * 0.162, lz = Math.cos(ang) * 0.116;
      beltGeos.push(loftBubble(THREE, lx, 0.052, lz, 0.009, 0.025, 0.009, { rings: 4, segs: 8 }));
    }
  }
  mergeZoneInto(hipsGroup, THREE, BGU, beltGeos, bootMat, {
    name: 'shambler-belt',
    baseHex: PALETTE.belt,
    tintDarkHex: 0x160f0b,
    noiseAmp: 0.0012,
    seed: 205
  });

  // Weathered Rectangular BELT BUCKLE at front center (slightly tilted worn look)
  const bklFrame = loftBubble(THREE, 0, 0.051, 0.123, 0.032, 0.024, 0.008, {
    rings: isLod ? 3 : 6, segs: isLod ? 8 : 12,
    deform: (x, y, z) => {
      // Recessed central prong pit + squared beveled outer rim
      const pit = -0.0035 * gauss(x, 0.015) * gauss(y - 0.051, 0.011) * (z > 0.122 ? 1 : 0);
      return [x, y, z + pit];
    }
  });
  mergeZoneInto(hipsGroup, THREE, BGU, [bklFrame], metalMat, {
    name: 'shambler-belt-buckle',
    baseHex: PALETTE.buckle,
    tintDarkHex: 0x524837,
    noiseAmp: 0.0006,
    seed: 206
  });

  // NAKED TORSO SKIN (using exact shared evalTorsoBase so ribs & clavicles match tank clearances!)
  const torsoSkinGrid = [];
  const TS_ROWS = isLod ? 12 : 24, TS_SEGS = isLod ? 14 : 28;
  for (let r = 0; r < TS_ROWS; r++) {
    const y = lerp(-0.028, 0.548, r / (TS_ROWS - 1));
    const row = [];
    for (let j = 0; j < TS_SEGS; j++) {
      const a = (j / TS_SEGS) * Math.PI * 2;
      row.push(evalTorsoBase(y, a));
    }
    torsoSkinGrid.push(row);
  }
  mergeZoneInto(torsoGroup, THREE, BGU, [loftGrid(THREE, torsoSkinGrid, { wrapU: true, capBottom: true, capTop: true })], skinMat, {
    name: 'shambler-torso-skin',
    baseHex: PALETTE.skin,
    tintDarkHex: PALETTE.skinDark,
    colorNoise: 0.08,
    noiseAmp: isLod ? 0.0015 : 0.0030,
    noiseFreq: 26,
    seed: 202,
    noiseMask: (_x, y, _z) => sstep(-0.01, 0.05, y) * (1 - sstep(0.51, 0.56, y))
  });

  buildRealTankTop(THREE, BGU, torsoGroup, bodyMat, PALETTE, {
    clothSupportPointAndNormal,
    skinPointAndNormal,
    mergeZoneInto,
    tankMat,
    lod
  });
}

// =========================================================================
// 3. LATHE ARMS (Deltoid/Biceps/Elbow Knob/Forearm Swell/Thin Wrist 0.056m) + BIG 5-FINGERED 3-CAPSULE HANDS
// Shoulder at (s * 0.188, +0.448, -0.010) in torso -> world (s*0.188, 1.388, -0.010)
// =========================================================================
function buildArm(THREE, BGU, side, torsoGroup, bodyMat, mats = {}, lod = 0) {
  const isLod = lod >= 1;
  const skinMat = mats.skinMat || bodyMat;
  const armG = new THREE.Group();
  armG.name = side > 0 ? 'armLG' : 'armRG';
  armG.position.set(side * 0.186, 0.454, -0.010);
  torsoGroup.add(armG);

  // Sculpted Upper Arm Lathe Profile: tear-drop deltoid -> insertion dip -> biceps/triceps belly -> slender distal humerus -> smooth elbow core
  const upperGeo = loftProfile(THREE, [
    [-0.318, 0.028, 0.030, 0,  0.000, 0.92], // tapered elbow core smoothly inside forearm cuff
    [-0.295, 0.037, 0.041, 0, -0.001, 0.88], // flush epicondyle transition (zero ring step!)
    [-0.265, 0.037, 0.039, 0,  0.001, 0.90], // slender distal humerus above elbow
    [-0.210, 0.040, 0.044, 0,  0.003, 0.88],
    [-0.145, 0.045, 0.052, 0,  0.004, 0.85], // sculpted biceps / triceps muscle belly!
    [-0.095, 0.042, 0.047, 0,  0.002, 0.90], // deltoid insertion hollow!
    [-0.042, 0.055, 0.058, 0,  0.000, 0.86], // broad tear-drop deltoid shoulder cap
    [-0.005, 0.054, 0.056, -side * 0.005, 0, 0.88],
    [ 0.034, 0.044, 0.048, -side * 0.016, 0, 0.92], // blends cleanly inside acromion socket
    [ 0.060, 0.024, 0.026, -side * 0.028, 0, 1.00]
  ], {
    radialSegs: isLod ? 10 : 20,
    deform: (x, y, z, a) => {
      const ca = Math.cos(a);
      // Biceps tendon hollow along medial arm + smooth posterior olecranon elbow bone mound (no hard lip)
      const olecranon = ca < -0.25 ? 0.0055 * gauss(y + 0.292, 0.024) * clamp(-ca, 0, 1) : 0;
      const bicipGroove = -0.005 * gauss(y + 0.145, 0.055) * gauss(Math.abs(a) - 1.55, 0.32);
      const deltoidRidge = 0.004 * gauss(y + 0.045, 0.030) * Math.sin(a * 3);
      return [x + bicipGroove * Math.sign(x || 1) + deltoidRidge, y, z - olecranon];
    }
  });
  mergeZoneInto(armG, THREE, BGU, [upperGeo], skinMat, {
    name: 'shambler-upper-arm-' + (side > 0 ? 'L' : 'R'),
    baseHex: PALETTE.skin,
    tintDarkHex: PALETTE.skinDark,
    colorNoise: 0.07,
    noiseAmp: isLod ? 0.0014 : 0.0026,
    noiseFreq: 30,
    seed: side > 0 ? 301 : 302,
    noiseMask: (_x, y, _z) => sstep(-0.30, -0.24, y) * (1 - sstep(0.01, 0.05, y))
  });

  // Forearm + Wrist (0.056m!) + BIG 5-FINGERED 3-CAPSULE HAND pivoted at elbow (0, -0.295, 0)
  const elbowG = new THREE.Group();
  elbowG.name = 'elbowG';
  elbowG.position.set(0, -0.295, 0);
  armG.add(elbowG);
  armG.userData.elbowG = elbowG;

  const forearmGeo = loftProfile(THREE, [
    [-0.275, 0.022, 0.032, 0, 0.005, 0.85], // tucked into palm heel
    [-0.256, 0.024, 0.028, 0, 0.004, 0.88], // THIN BONY WRIST (CF-15 0.056 m = 0.028*2!)
    [-0.220, 0.027, 0.032, 0, 0.004, 0.88], // distal ulna/radius tendons
    [-0.165, 0.034, 0.042, 0, 0.003, 0.86],
    [-0.095, 0.045, 0.055, 0, 0.002, 0.84], // FOREARM MUSCLE SWELL (0.110 m CF-15 target!)
    [-0.042, 0.043, 0.049, 0, 0.000, 0.86],
    [ 0.000, 0.0385, 0.0425, 0, -0.001, 0.88], // flush spherical elbow overlap (zero ring seam!)
    [ 0.036, 0.025, 0.028, 0, 0.000, 0.94]
  ], {
    radialSegs: isLod ? 10 : 18,
    deform: (x, y, z, a) => {
      // Ulna styloid wrist bone bump + dorsal tendon ridge
      const ulna = Math.cos(a) < -0.2 ? 0.004 * gauss(y + 0.252, 0.015) : 0;
      const tendon = 0.003 * gauss(y + 0.20, 0.045) * Math.sin(a * 4);
      return [x + tendon, y, z - ulna];
    }
  });

  // BIG METACARPAL PALM (broad skeletal back & cupped inner palm, raised dorsal tendons & knuckles!)
  const palmGeo = loftProfile(THREE, [
    [-0.354, 0.013, 0.048, 0, 0.008, 0.72], // wide knuckle arch (~0.096 m palm span!)
    [-0.312, 0.016, 0.044, 0, 0.006, 0.75], // mid metacarpal hand
    [-0.274, 0.020, 0.034, 0, 0.005, 0.82], // palm heel
    [-0.250, 0.023, 0.027, 0, 0.004, 0.88]
  ], {
    radialSegs: isLod ? 10 : 16,
    deform: (x, y, z) => {
      // 4 protruding dorsal metacarpal tendon cords + sunken palm concavity
      const isBack = (x * side) > 0;
      const rays = isBack ? 0.0035 * Math.cos(z * 165) * gauss(y + 0.320, 0.028) : -0.004 * gauss(y + 0.308, 0.024) * gauss(z - 0.006, 0.024);
      const knuckle = (y < -0.340 && isBack) ? 0.005 * (0.5 + 0.5 * Math.cos(z * 165)) : 0;
      return [x + side * (rays + knuckle), y, z];
    }
  });

  const handParts = [forearmGeo, palmGeo];

  if (isLod) {
    // LOD1 (15m+): simplified curled claw blade + opposable thumb silhouette (~85% fewer hand tris!)
    handParts.push(loftBubble(THREE, -side * 0.014, -0.386, 0.008, 0.014, 0.044, 0.044, { rings: 4, segs: 8 }));
    handParts.push(loftBubble(THREE, -side * 0.020, -0.322, 0.058, 0.010, 0.036, 0.012, { rings: 3, segs: 6 }));
  } else {
    // 4 SEPARATE FINGERS (each 3 distinct phalanx capsules, well-spaced, bony & curled!)
    // [knuckleZ, segments [prox, mid, dist], rads [base, r1, r2, tip], curls [c1, c2, c3], splayZ]
    const fingerDefs = [
      [ 0.038, [0.042, 0.029, 0.022], [0.0092, 0.0076, 0.0064, 0.0050], [0.10, 0.22, 0.24],  0.14], // Index
      [ 0.014, [0.046, 0.032, 0.024], [0.0096, 0.0080, 0.0068, 0.0052], [0.12, 0.26, 0.28],  0.04], // Middle (~10.2 cm finger!)
      [-0.012, [0.042, 0.029, 0.022], [0.0090, 0.0075, 0.0062, 0.0048], [0.14, 0.28, 0.30], -0.06], // Ring
      [-0.036, [0.034, 0.024, 0.018], [0.0078, 0.0065, 0.0054, 0.0042], [0.16, 0.32, 0.32], -0.16]  // Pinky
    ];
    for (const [kz, segs, rads, curls, sz] of fingerDefs) {
      handParts.push(makeCapsuleChainDigit(
        THREE, segs, rads, curls,
        [0, -0.344, 0.008 + kz],
        [-side * 0.06, -1.0, sz],
        side
      ));
    }

    // 5th DIGIT: BIG OPPOSABLE THUMB (3 capsules splayed forward-downward & inward)
    handParts.push(makeCapsuleChainDigit(
      THREE, [0.034, 0.028, 0.022], [0.0110, 0.0088, 0.0074, 0.0056], [0.06, 0.14, 0.18],
      [-side * 0.012, -0.286, 0.038],
      [-side * 0.28, -0.82, 0.56],
      side
    ));
  }

  mergeZoneInto(elbowG, THREE, BGU, handParts, skinMat, {
    name: 'shambler-forearm-hand-' + (side > 0 ? 'L' : 'R'),
    baseHex: PALETTE.skin,
    tintDarkHex: PALETTE.skinDark,
    colorNoise: 0.07,
    noiseAmp: isLod ? 0.0010 : 0.0020,
    noiseFreq: 38,
    seed: side > 0 ? 303 : 304,
    noiseMask: (_x, y, _z) => (1 - sstep(-0.01, 0.03, y)) * sstep(-0.46, -0.35, y)
  });
}

// =========================================================================
// 4. TROUSERS (Left cargo pocket & knee bulge + Right continuous torn knee)
//    + STACKED ANKLE FOLDS BUNCHING ON TAN LACE-UP WORK BOOTS
// =========================================================================
function buildLeg(THREE, BGU, side, hipsGroup, bodyMat, mats = {}, lod = 0) {
  const isLod = lod >= 1;
  const pantsMat = mats.pantsMat || bodyMat;
  const skinMat = mats.skinMat || bodyMat;
  const bootMat = mats.bootMat || bodyMat;
  const isLeft = side > 0;
  const legG = new THREE.Group();
  legG.name = isLeft ? 'legLG' : 'legRG';
  legG.position.set(side * 0.103, -0.045, 0);
  hipsGroup.add(legG);

  const shinG = new THREE.Group();
  shinG.name = "shambler-shin-" + (isLeft ? "L" : "R");
  shinG.position.set(0, -0.400, 0);
  legG.add(shinG);
  legG.userData.shinG = shinG;

  buildFullLengthTrousers(THREE, BGU, { isLeft, legG, shinG, bodyMat, pantsMat, skinMat, PALETTE, mergeZoneInto, lod });

  // TAN LACE-UP WORK BOOTS pivoted at ankle (0, -0.322, 0) -> world y = 0.088 m (sole bottom = 0.000 m!)
  const ankleG = new THREE.Group();
  ankleG.name = 'shambler-ankle';
  ankleG.position.set(0, -0.322, 0);
  shinG.add(ankleG);
  legG.userData.shamblerAnkle = ankleG;
  legG.userData.shamblerFootY = 0.088;

  const shaft = loftProfile(THREE, [
    [-0.062, 0.056, 0.072, 0,  0.014, 0.78],
    [ 0.000, 0.055, 0.063, 0,  0.002, 0.85],
    [ 0.065, 0.055, 0.060, 0, -0.001, 0.88],
    [ 0.115, 0.060, 0.065, 0,  0.002, 0.86], // sturdy boot top cuff wraps OUTSIDE tucked trouser hem!
    [ 0.132, 0.058, 0.063, 0,  0.002, 0.88]
  ], {
    radialSegs: isLod ? 10 : 18,
    deform: (x, y, z, a) => {
      if (Math.cos(a) > 0.35 && y > -0.045 && y < 0.105) {
        const ax = Math.abs(x);
        const channel = -0.007 * gauss(ax, 0.013);
        const eyestay = 0.006 * gauss(ax - 0.023, 0.008);
        return [x, y, z + channel + eyestay];
      }
      return [x, y, z];
    }
  });

  const vampSlices = [
    [-0.078, 0.045, 0.032, -0.040],
    [-0.045, 0.052, 0.038, -0.034],
    [ 0.005, 0.051, 0.036, -0.036],
    [ 0.058, 0.054, 0.033, -0.040],
    [ 0.114, 0.056, 0.030, -0.044],
    [ 0.154, 0.045, 0.022, -0.050],
    [ 0.170, 0.020, 0.012, -0.056]
  ];
  const vampGrid = [];
  const vampSegs = isLod ? 8 : 16;
  for (let r = 0; r < vampSlices.length; r++) {
    const [z, wx, hy, cy] = vampSlices[r];
    const row = [];
    for (let j = 0; j < vampSegs; j++) {
      const a = (j / vampSegs) * Math.PI * 2;
      const sa = Math.sin(a), ca = Math.cos(a);
      const yOff = ca >= 0 ? Math.pow(ca, 0.75) * hy : -Math.pow(-ca, 0.55) * hy * 0.72;
      row.push([Math.sign(sa) * Math.pow(Math.abs(sa), 0.75) * wx, cy + yOff, z]);
    }
    vampGrid.push(row);
  }
  const vampGeo = loftGrid(THREE, vampGrid, { wrapU: true, capBottom: true, capTop: true, flip: true });

  mergeZoneInto(ankleG, THREE, BGU, [shaft, vampGeo], bootMat, {
    name: 'shambler-boot-leather-' + (isLeft ? 'L' : 'R'),
    baseHex: PALETTE.boot,
    tintDarkHex: PALETTE.bootDark,
    colorNoise: 0.08,
    noiseAmp: isLod ? 0.0009 : 0.0018,
    noiseFreq: 38,
    seed: isLeft ? 406 : 407
  });

  // Dark rubber lug outsole + heel separated visually in Step 1 base tone!
  const soleSlices = [
    [-0.082, 0.049, -0.088, -0.062],
    [-0.038, 0.054, -0.088, -0.062],
    [-0.005, 0.050, -0.083, -0.064],
    [ 0.045, 0.056, -0.088, -0.064],
    [ 0.125, 0.058, -0.088, -0.065],
    [ 0.162, 0.044, -0.087, -0.066],
    [ 0.172, 0.019, -0.085, -0.068]
  ];
  const soleGrid = [];
  const soleSegs = isLod ? 8 : 14;
  for (let r = 0; r < soleSlices.length; r++) {
    const [z, wx, yBot, yTop] = soleSlices[r];
    const ym = (yBot + yTop) * 0.5, hy = (yTop - yBot) * 0.5;
    const row = [];
    for (let j = 0; j < soleSegs; j++) {
      const a = (j / soleSegs) * Math.PI * 2;
      const sa = Math.sin(a), ca = Math.cos(a);
      row.push([Math.sign(sa) * Math.pow(Math.abs(sa), 0.55) * wx, ym + Math.sign(ca) * Math.pow(Math.abs(ca), 0.45) * hy, z]);
    }
    soleGrid.push(row);
  }
  const soleGeo = loftGrid(THREE, soleGrid, { wrapU: true, capBottom: true, capTop: true, flip: true });
  mergeZoneInto(ankleG, THREE, BGU, [soleGeo], bootMat, {
    name: 'shambler-boot-sole-' + (isLeft ? 'L' : 'R'),
    baseHex: PALETTE.sole,
    tintDarkHex: 0x16110d,
    noiseAmp: isLod ? 0.0006 : 0.0012,
    seed: isLeft ? 410 : 411,
    noiseMask: (_x, y, _z) => sstep(-0.085, -0.065, y)
  });

  if (!isLod) {
    // 6 pair criss-cross sculpted bootlaces
    const laceGeos = [];
    for (let k = 0; k < 6; k++) {
      const f = k / 5;
      const y0 = lerp(-0.016, 0.088, f);
      const z0 = lerp(0.066, 0.056, f);
      for (const cr of [-1, 1]) {
        const g = [];
        for (let m = 0; m < 6; m++) {
          const t = m / 5;
          const lx = lerp(-0.023, 0.023, t);
          const ly = y0 + (cr * (t - 0.5)) * 0.014;
          const lz = z0 + 0.004 * Math.sin(t * Math.PI);
          const row = [];
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * Math.PI * 2;
            row.push([lx, ly + Math.sin(a) * 0.0026, lz + Math.cos(a) * 0.0026]);
          }
          g.push(row);
        }
        laceGeos.push(loftGrid(THREE, g, { wrapU: true, capBottom: true, capTop: true }));
      }
    }
    mergeZoneInto(ankleG, THREE, BGU, laceGeos, bootMat, {
      name: 'shambler-boot-laces-' + (isLeft ? 'L' : 'R'),
      baseHex: PALETTE.lace,
      tintDarkHex: 0x625644,
      noiseAmp: 0.0005,
      seed: isLeft ? 408 : 409
    });
  }
}

// =========================================================================
// MAIN BUILDER + LIVE SHAMBLE POSE + AO + WHITE PROOF TOGGLE
// =========================================================================
function buildShamblerStep1(THREE, BufferGeometryUtils, {
  pose = 'a-pose',
  scale = 1.0,
  whiteProof = false,
  step = 1,
  texSize = 512,
  materialBundle = null,
  lod = 0
} = {}) {
  const root = new THREE.Group();
  root.name = step >= 2 ? (lod >= 1 ? 'shambler-step3-lod1' : 'shambler-step2') : 'shambler-step1';

  let bundle = null;
  let mats = {};
  let bodyMat;
  let eyeMat;

  if (step >= 2) {
    bundle = materialBundle; if (!bundle) throw new Error('CC-359 v5 port: no step-2 textures here (the atlas is step 3)');
    mats = bundle.mats;
    bodyMat = mats.skinMat;
    eyeMat = mats.eyeMat;
  } else {
    bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.02
    });
    eyeMat = new THREE.MeshStandardMaterial({
      color: PALETTE.eye,
      emissive: 0x225a48,
      emissiveIntensity: 0.25,
      roughness: 0.10,
      metalness: 0.05
    });
  }

  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.855, 0);
  root.add(hips);

  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.085, 0);
  hips.add(torso);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.494, 0.020); // ~9.0 cm chin-to-collar, Pass 7 thicker 12.5 cm neck + 5 cm occiput overhang!
  torso.add(head);

  buildHipsAndTorso(THREE, BufferGeometryUtils, hips, torso, bodyMat, mats, lod);
  buildNeckAndSkull3DForms(THREE, BufferGeometryUtils, head, bodyMat, eyeMat, PALETTE, mergeZoneInto, mats, lod);
  buildArm(THREE, BufferGeometryUtils, +1, torso, bodyMat, mats, lod);
  buildArm(THREE, BufferGeometryUtils, -1, torso, bodyMat, mats, lod);
  buildLeg(THREE, BufferGeometryUtils, +1, hips, bodyMat, mats, lod);
  buildLeg(THREE, BufferGeometryUtils, -1, hips, bodyMat, mats, lod);

  const armLG = torso.getObjectByName('armLG');
  const armRG = torso.getObjectByName('armRG');
  const elbowLG = armLG?.userData.elbowG;
  const elbowRG = armRG?.userData.elbowG;
  const legLG = hips.getObjectByName('legLG');
  const legRG = hips.getObjectByName('legRG');
  const shinLG = legLG?.userData.shinG;
  const shinRG = legRG?.userData.shinG;
  const ankleLG = legLG?.userData.shamblerAnkle;
  const ankleRG = legRG?.userData.shamblerAnkle;
  const jaw = head.userData.jaw;

  // Trick #3: Baked sky & anatomical crevice AO computed cleanly in rest A-pose!
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const aoInfo = bakeShamblerAO(THREE, root, {
    skipMaterials: new Set([eyeMat]),
    floor: 0.16,
    strength: 1.24,
    joints: [
      [hips, 0, 0, 0, 0, 0.855, 0],
      [torso, 0, 0, 0, 0, 0.085, 0],
      [head, 0, 0, 0, 0, 0.494, 0.020],
      [jaw, 0, 0, 0],
      [armLG, 0, 0, 0.435],
      [armRG, 0, 0, -0.435],
      [elbowLG, -0.14, 0, 0],
      [elbowRG, -0.14, 0, 0],
      [legLG, 0, 0, 0.072],
      [legRG, 0, 0, -0.072],
      [shinLG, 0, 0, 0],
      [shinRG, 0, 0, 0],
      [ankleLG, 0, 0, -0.072],
      [ankleRG, 0, 0, 0.072]
    ],
    occluders: [
      { c: V(0, 1.24, 0.00), r: 0.145, owner: torso },
      { c: V(0, 1.08, 0.00), r: 0.130, owner: torso },
      { c: V(0, 0.90, 0.00), r: 0.092, owner: hips, weight: 0.45 },
      // Armpits & tank armholes
      { c: V( 0.17, 1.38, 0), r: 0.072, owner: torso },
      { c: V(-0.17, 1.38, 0), r: 0.072, owner: torso },
      { c: V( 0.23, 1.34, 0), r: 0.058, owner: armLG },
      { c: V(-0.23, 1.34, 0), r: 0.058, owner: armRG },
      // Hanging tank-top hem shadowing belt & waistband
      { c: V(0, 0.94, 0.02), r: 0.138, owner: torso },
      // Crotch & inner thighs (softened so hip/thigh trousers look continuous!)
      { c: V( 0.09, 0.72, 0), r: 0.062, owner: legLG, weight: 0.35 },
      { c: V(-0.09, 0.72, 0), r: 0.062, owner: legRG, weight: 0.35 },
      { c: V( 0.12, 0.50, 0), r: 0.076, owner: legLG },
      { c: V(-0.12, 0.50, 0), r: 0.076, owner: legRG },
      // Skull brow overhang, under-jaw pocket, tall vertical scream cavity, DEEP orbital bowls & nasal pit!
      { c: V(0, 1.720, 0.020), r: 0.118, owner: head },
      { c: V(0, 1.545, 0.106), r: 0.048, owner: jaw, self: true, weight: 0.72 },
      { c: V(0, 1.599, 0.114), r: 0.042, owner: null, self: true, weight: 0.94 }, // deep pharynx cavity AO behind teeth!
      { c: V( 0.035, 1.736, 0.144), r: 0.021, owner: null, self: true, weight: 0.92 }, // deep L orbit AO inside bowl
      { c: V(-0.035, 1.736, 0.144), r: 0.021, owner: null, self: true, weight: 0.92 }, // deep R orbit AO inside bowl
      { c: V(0, 1.690, 0.146), r: 0.016, owner: null, self: true, weight: 0.92 }, // piriform nasal pit AO!
      { c: V(0, 1.490, 0.020), r: 0.050, owner: head, weight: 0.40 }, // neck under-jaw shadow
      // Cargo pocket crease, knee folds, boot cuff tuck shadow
      { c: V( 0.215, 0.62, 0.00), r: 0.045, owner: null, self: true, weight: 0.65 },
      { c: V(-0.132, 0.41, -0.02), r: 0.036, owner: null, self: true, weight: 0.26 },
      { c: V( 0.148, 0.20, 0.00), r: 0.058, owner: shinLG },
      { c: V(-0.148, 0.20, 0.00), r: 0.058, owner: shinRG }
    ],
    zones: [
      (mesh, p, n, br, bg, bb, ao) => {
        const nm = mesh.name || '';
        if (nm.includes('hair-card')) {
          return [br, bg, bb, Math.max(0.76, clamp(ao, 0.76, 1.0))];
        }
        // Subtle grey-brown dirt dust near lower boots only
        if (p.y < 0.21) {
          const dust = sstep(0.21, 0.02, p.y) * 0.28;
          br = lerp(br, br * 1.15 + 0.020, dust);
          bg = lerp(bg, bg * 1.12 + 0.018, dust);
          bb = lerp(bb, bb * 1.00 + 0.010, dust);
        }
        // Deep cloth-tear overhang cavity shadow + sharp rib valley contrast inside front-left & right tank holes!
        if (nm.includes('torso-skin') && p.y > 0.98 && p.y < 1.36) {
          const ribWave = Math.sin((p.y - 0.94 - 0.16) * 112);
          const ribValley = Math.max(0, -ribWave) * sstep(0.03, 0.10, Math.abs(p.x));
          const hole1AO = gauss(p.x - 0.112, 0.056) * gauss(p.y - 1.165, 0.068) * clamp(p.z * 8 + 0.35, 0, 1);
          const hole3AO = gauss(p.x + 0.125, 0.042) * gauss(p.y - 1.085, 0.048) * clamp(-p.z * 6 + 0.6, 0, 1);
          const ribPeak = Math.max(0, ribWave) * hole1AO;
          ao = ao * (1 - clamp(0.42 * ribValley + 0.44 * hole1AO + 0.46 * hole3AO, 0, 0.72)) + ribPeak * 0.16;
        }
        // Highlight sculpted clavicle bone peaks subtly & darken sternal/supraclavicular pits
        if ((nm.includes('neck-skin') || nm.includes('torso-skin')) && p.y > 1.36 && p.y < 1.58 && p.z > -0.02) {
          const sternalPit = gauss(p.y - 1.412, 0.018) * gauss(p.x, 0.024);
          const supraPit = gauss(p.y - 1.420, 0.014) * sstep(0.024, 0.060, Math.abs(p.x)) * (1 - sstep(0.13, 0.17, Math.abs(p.x)));
          const clavPeak = gauss(p.y - (1.392 + Math.abs(p.x) * 0.10), 0.011) * sstep(0.022, 0.055, Math.abs(p.x)) * (1 - sstep(0.14, 0.18, Math.abs(p.x)));
          const neckGroove = gauss(Math.abs(p.x) - 0.061, 0.018) * sstep(1.455, 1.545, p.y);
          ao = ao * (1 - clamp(0.22 * sternalPit + 0.18 * supraPit + 0.14 * neckGroove, 0, 0.36)) + clavPeak * 0.12;
        }
        if (nm.includes('shin-trouser') && p.y > 0.19 && p.y < 0.26) {
          const cuffShadow = sstep(0.26, 0.21, p.y);
          ao *= 1 - 0.25 * cuffShadow;
        }
        if (nm.includes('torn-knee') && p.z > 0.020) {
          ao *= 1.14;
        }
        if (nm.includes('teeth')) {
          ao = Math.max(ao, 0.74);
        }
        // Deep cavity interior AO ONLY inside sockets/nasal pit/mouth floor (sculpted geometry handles outer face!)
        if (nm.includes('skull-cavities') || nm.includes('jaw-interior')) {
          ao *= 0.48;
        }
        if ((nm.includes('skull-cranium') || nm.includes('nasal-septum')) && p.z > 0.060) {
          const eyeInner = gauss(Math.abs(p.x) - 0.035, 0.019) * gauss(p.y - 1.736, 0.017) * sstep(0.095, 0.142, p.z);
          const noseInner = gauss(p.x, 0.013) * gauss(p.y - 1.690, 0.015) * sstep(0.098, 0.146, p.z);
          const mouthInner = gauss(p.x, 0.032) * gauss(p.y - 1.599, 0.044) * clamp((0.146 - p.z) / 0.044, 0, 1) * sstep(0.050, 0.090, p.z);
          ao *= 1 - clamp(eyeInner * 0.72 + noseInner * 0.58 + mouthInner * 0.76, 0, 0.82);
          if (eyeInner > 0.08 && p.z < 0.144) {
            br = lerp(br, 0.18, eyeInner * 0.55);
            bg = lerp(bg, 0.16, eyeInner * 0.58);
            bb = lerp(bb, 0.15, eyeInner * 0.58);
          }
          if (mouthInner > 0.05) {
            br = lerp(br, 0.09, mouthInner * 0.85);
            bg = lerp(bg, 0.03, mouthInner * 0.88);
            bb = lerp(bb, 0.03, mouthInner * 0.88);
          }
        }
        // Step 2-4b continuous 3D WORLD-SPACE colour & seam feathering across jaw / cheek / neck / torso!
        if (step >= 2) {
          // 1. Unified mouth/jaw/left-cheek-wound dried blood (world-space across head & lips/chin!)
          if ((nm.includes('skull-cranium') || nm.includes('lower-jaw') || nm.includes('cheek-flesh')) && p.y > 1.48 && p.z > 0.065) {
            const sp = fbm3(p.x * 42 + 2.1, p.y * 42 - 1.3, p.z * 42 + 4.7, 3);
            const cornerBlood = gauss(Math.abs(p.x) - 0.036, 0.016) * gauss(p.y - 1.595, 0.030) * sstep(-0.08, 0.38, sp);
            const chinDrip = gauss(p.x - 0.005, 0.017) * gauss(p.y - 1.522, 0.024) * sstep(-0.02, 0.44, sp);
            const leftWound = p.x > 0.028 ? gauss(p.x - 0.054, 0.016) * gauss(p.y - 1.652, 0.024) * sstep(-0.10, 0.34, sp) : 0;
            const bStr = clamp(cornerBlood * 0.56 + chinDrip * 0.46 + leftWound * 0.72, 0, 0.76);
            br = lerp(br, 0.36, bStr);
            bg = lerp(bg, 0.13, bStr);
            bb = lerp(bb, 0.12, bStr);
          }
          // 2. NECK-TO-FACE & NECK-TO-TORSO continuous world-space wash (kept strictly center-sternum so sculpted clavicles stay pale bone!)
          if (nm.includes('neck-skin') || nm.includes('torso-skin') || nm.includes('skull-cranium') || nm.includes('lower-jaw')) {
            const sp = fbm3(p.x * 34 + 5.1, p.y * 34 - 1.1, p.z * 34 + 2.3, 3);
            // Subtle central sternal/throat tint (muted so 3D sculpted tendons & clavicles dominate!)
            if ((nm.includes('neck-skin') || nm.includes('torso-skin')) && p.y > 1.24 && p.y < 1.50 && p.z > 0.01) {
              const chestSpread = lerp(0.038, 0.022, sstep(1.26, 1.42, p.y));
              const collarBlood = gauss(p.x, chestSpread) * sstep(1.24, 1.34, p.y) * (1 - sstep(1.44, 1.50, p.y)) * clamp((p.z - 0.005) * 16, 0, 1) * sstep(-0.14, 0.38, sp);
              br = lerp(br, 0.56, collarBlood * 0.20);
              bg = lerp(bg, 0.30, collarBlood * 0.25);
              bb = lerp(bb, 0.29, collarBlood * 0.25);
            }
            // Deep bruised cavity flesh & bloody intercostal grooves framing exposed sculpted ribs inside tank tears!
            if (nm.includes('torso-skin') && p.y > 1.02 && p.y < 1.27) {
              const sp2 = Math.sin((p.y - 0.94 - 0.16) * 112);
              const holeEnvL = p.x > 0.05 && p.z > 0.01 ? gauss(p.x - 0.112, 0.048) * gauss(p.y - 1.165, 0.058) : 0;
              const holeEnvR = p.x < -0.06 ? gauss(p.x + 0.125, 0.040) * gauss(p.y - 1.085, 0.045) : 0;
              const cavTint = clamp((holeEnvL + holeEnvR) * (0.45 + 0.55 * clamp(-sp2, 0, 1)) * sstep(-0.22, 0.36, sp), 0, 1);
              br = lerp(br, 0.28, cavTint * 0.68);
              bg = lerp(bg, 0.13, cavTint * 0.72);
              bb = lerp(bb, 0.12, cavTint * 0.72);
            }
            // Shared back-of-neck & upper-back mottled corpse blotches across trapezius (eliminates flat clay + seam!)
            if ((nm.includes('neck-skin') || nm.includes('torso-skin')) && p.y > 1.24 && p.y < 1.52 && p.z <= 0.01) {
              const bMottle = fbm3(p.x * 26 + 3.7, p.y * 26 - 2.1, p.z * 26 + 1.9, 3);
              const blotch = sstep(0.08, 0.52, bMottle) * sstep(1.24, 1.34, p.y) * (1 - sstep(1.47, 1.52, p.y));
              br = lerp(br, 0.54, blotch * 0.20);
              bg = lerp(bg, 0.42, blotch * 0.24);
              bb = lerp(bb, 0.41, blotch * 0.22);
            }
            // Under-chin / neck-to-jaw transition wash shared smoothly across neck-skin & chin/jaw underside
            if ((nm.includes('neck-skin') || nm.includes('skull-cranium') || nm.includes('lower-jaw')) && p.y > 1.46 && p.y < 1.54 && p.z > -0.02 && p.z < 0.11) {
              const jawNeckWash = gauss(p.x, 0.058) * sstep(1.46, 1.495, p.y) * (1 - sstep(1.520, 1.54, p.y)) * clamp((p.z + 0.01) * 12, 0, 1) * sstep(-0.20, 0.36, sp);
              br = lerp(br, 0.56, jawNeckWash * 0.20);
              bg = lerp(bg, 0.36, jawNeckWash * 0.24);
              bb = lerp(bb, 0.34, jawNeckWash * 0.24);
            }
          }
          if (nm.includes('torn-knee') && p.z > 0.02) {
            const sp = fbm3(p.x * 48 + 1.4, p.y * 48, p.z * 48, 3);
            const kneeScrape = gauss(p.x, 0.026) * gauss(p.y - 0.455, 0.028) * sstep(0.02, 0.45, sp);
            br = lerp(br, 0.38, kneeScrape * 0.65);
            bg = lerp(bg, 0.14, kneeScrape * 0.75);
            bb = lerp(bb, 0.13, kneeScrape * 0.75);
          }
          if (nm.includes('forearm-hand-L') && p.y > 0.90 && p.y < 1.05 && p.z > -0.02) {
            const sp = fbm3(p.x * 44 + 3.2, p.y * 44 - 1.1, p.z * 44 + 0.9, 3);
            const armWound = gauss(p.y - 0.97, 0.032) * gauss(p.x - 0.255, 0.035) * sstep(-0.08, 0.38, sp);
            br = lerp(br, 0.38, armWound * 0.74);
            bg = lerp(bg, 0.12, armWound * 0.80);
            bb = lerp(bb, 0.11, armWound * 0.80);
          }
        }
        return [br, bg, bb, clamp(ao, 0.12, 1.04)];
      }
    ]
  });

  function setPose(mode = 'a-pose') {
    if (mode === 'shamble') {
      // OUR live Tiny Trek shamble pose (hunched forward spine, head pushed forward, LOWER & UNEVEN reaching arms!)
      hips.position.set(0, 0.855, 0);
      hips.rotation.set(0.08, 0.08, -0.04);
      torso.rotation.set(0.32, -0.09, 0.05);   // clear hunched zombie spine!
      head.rotation.set(-0.22, 0.10, -0.14);   // craning forward/up to watch prey
      jaw.rotation.set(0, 0, 0);               // tall screaming mandible sculpted cleanly in rest pose!
      armLG.rotation.set(-0.78, 0.06, 0.10);
      elbowLG.rotation.set(-0.38, 0, 0);
      armRG.rotation.set(-0.56, -0.06, -0.13);
      elbowRG.rotation.set(-0.54, 0, 0);
      // Grounded bent-knee shamble stride
      legLG.rotation.set(-0.26, 0, 0.04);
      shinLG.rotation.set(0.38, 0, 0);
      ankleLG.rotation.set(-0.20, 0, -0.04);
      legRG.rotation.set(0.14, 0, -0.04);
      shinRG.rotation.set(0.20, 0, 0);
      ankleRG.rotation.set(-0.42, 0, 0.04);
    } else {
      hips.position.set(0, 0.855, 0);
      hips.rotation.set(0, 0, 0);
      torso.rotation.set(0, 0, 0);
      head.rotation.set(0, 0, 0);
      jaw.rotation.set(0, 0, 0);               // tall screaming jaw sculpted cleanly in rest A-pose!
      armLG.rotation.set(0, 0, 0.435);
      armRG.rotation.set(0, 0, -0.435);
      elbowLG.rotation.set(-0.14, 0, 0);
      elbowRG.rotation.set(-0.14, 0, 0);
      legLG.rotation.set(0, 0, 0.072);
      legRG.rotation.set(0, 0, -0.072);
      shinLG.rotation.set(0, 0, 0);
      shinRG.rotation.set(0, 0, 0);
      ankleLG.rotation.set(0, 0, -0.072);
      ankleRG.rotation.set(0, 0, 0.072);
    }
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (Math.abs(box.min.y) > 1e-4) {
      hips.position.y -= box.min.y / (scale || 1);
      root.updateMatrixWorld(true);
    }
  }

  function setWhiteProof(enabled) {
    applyWhiteAOProof(root, enabled, { exponent: 1.30 });
    eyeMat.color.setHex(enabled ? 0xffffff : PALETTE.eye);
    eyeMat.emissiveIntensity = enabled ? 0.0 : 0.22;
    eyeMat.needsUpdate = true;
  }

  root.scale.setScalar(scale);
  setPose(pose);
  if (whiteProof) setWhiteProof(true);

  let tris = 0, meshCount = 0;
  const matSet = new Set();
  root.traverse((o) => {
    if (o.isMesh) {
      meshCount++;
      const g = o.geometry;
      tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => matSet.add(m));
    }
  });

  root.userData = {
    hips, torso, head, jaw, armLG, armRG, elbowLG, elbowRG,
    legLG, legRG, shinLG, shinRG, ankleLG, ankleRG,
    bodyMat, eyeMat, mats, bundle, setPose, setWhiteProof,
    stats: {
      tris: Math.round(tris),
      meshCount,
      aoVerts: aoInfo.verts,
      materials: matSet.size,
      texBytes: bundle ? bundle.texBytes : 0,
      texCount: bundle ? bundle.texCount : 0
    }
  };
  return root;
}

// ======== CC-359 (Claude 3): the entry point ========
// Builds AG's pass-7 shambler (LOD0 or LOD1 shapes), its AO baked in its own A-pose exactly as AG bakes it, then every
// bone back to rotation 0 (the bare skeleton). Returns the root and its bones; each mesh sits on one bone (weight 1).
export const SHAMBLER_V5_HEIGHT = SHAMBLER_HEIGHT;
export function buildShamblerV5(THREE, { lod = 0 } = {}) {
  const root = buildShamblerStep1(THREE, cv5Merge, { pose: 'a-pose', lod });
  const u = root.userData, bones = { hips: u.hips, torso: u.torso, head: u.head, jaw: u.jaw, armL: u.armLG, armR: u.armRG, elbowL: u.elbowLG, elbowR: u.elbowRG,
    legL: u.legLG, legR: u.legRG, shinL: u.shinLG, shinR: u.shinRG, ankleL: u.ankleLG, ankleR: u.ankleRG };
  for (const b of Object.values(bones)) if (b) b.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);
  tuckChestUnderYoke(THREE, root);
  root.userData.cc359Seams = blendShoulderAndElbowSeams(THREE, root);
  return { root, bones, eyeMat: u.eyeMat, palette: PALETTE };
}
// CC-359 step 3 (Director 10:20Z: "blend the visible seam where the upper arm meets the shoulder"; Claude 5's second review: the
// elbow ring). AG's arms are separate rounded tubes: the upper arm's top is a dome that sits ABOVE the torso's shoulder with a dark
// gap under its rim (the 'doll joint' line), and the forearm's top is a cuff that laps over the upper arm with a lip. Fix, in the
// bare-skeleton pose, once per template, shapes only (nothing moves to another bone; the game's joint blend still bends them):
//   SHOULDER: the torso's shoulder skin near the dome climbs toward it (each vertex moves toward the nearest point of the dome by
//   .85 w^1.5 of the gap, w = 1 - d/5 cm) and the dome's rim settles onto the torso (.9 w, 3.5 cm): one sloped shoulder (a
//   deltoid) instead of a ball on a ledge;
//   ELBOW: the cuff's lip is pulled onto the upper arm (.9 w, 2 cm), so it tapers into it with no step; the neck yoke's lower rim
//   the same onto the chest and back (the back kept a lit ledge after step 2b);
//   both: the vertex colours (AG's baked AO: dark under the rim) and the normals blend across the same band.
// Only near the joint (10 cm round the shoulder pivot, 6.5 cm round the elbow), never the arm's inner side along the ribs. A skin
// under the tank never moves into the cloth: its move is capped 3 mm under the tank (rule 24).
function blendShoulderAndElbowSeams(THREE, root) {
  const get = (n) => { let m = null; root.traverse((o) => { if (o.isMesh && o.name === n) m = o; }); return m; };
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const frame = (m) => { const M = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld); return { M, Mi: M.clone().invert(), nm: new THREE.Matrix3().getNormalMatrix(M) }; };
  const tris = (m, f) => { const P = m.geometry.attributes.position, I = m.geometry.index, n = I ? I.count / 3 : P.count / 3, out = [];
    const at = (k) => new THREE.Vector3().fromBufferAttribute(P, I ? I.getX(k) : k).applyMatrix4(f.M);
    for (let t = 0; t < n; t++) { const a = at(t * 3), b = at(t * 3 + 1), c3 = at(t * 3 + 2), c = a.clone().add(b).add(c3).multiplyScalar(1 / 3);
      const nn = b.clone().sub(a), e2 = c3.clone().sub(a), nx = nn.y * e2.z - nn.z * e2.y, ny = nn.z * e2.x - nn.x * e2.z, nz = nn.x * e2.y - nn.y * e2.x, l = Math.hypot(nx, ny, nz) || 1;
      out.push({ tr: { a, b, c: c3 }, c, r: Math.max(c.distanceTo(a), c.distanceTo(b), c.distanceTo(c3)), n: new THREE.Vector3(nx / l, ny / l, nz / l) }); }
    return out; };
  // nearest point of a skin to p, its distance, which side p is on (+1 outside by that triangle's face normal) and the normal there
  // the closest point of a triangle to p (Ericson, Real-Time Collision Detection 5.1.5; plain maths, so it runs on any three)
  const closest = (tr, p, out) => { const { a, b, c } = tr, abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
    const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z, d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
    if (d1 <= 0 && d2 <= 0) return out.set(a.x, a.y, a.z);
    const bpx = p.x - b.x, bpy = p.y - b.y, bpz = p.z - b.z, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) return out.set(b.x, b.y, b.z);
    const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return out.set(a.x + abx * v, a.y + aby * v, a.z + abz * v); }
    const cpx = p.x - c.x, cpy = p.y - c.y, cpz = p.z - c.z, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
    if (d6 >= 0 && d5 <= d6) return out.set(c.x, c.y, c.z);
    const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return out.set(a.x + acx * w, a.y + acy * w, a.z + acz * w); }
    const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return out.set(b.x + (c.x - b.x) * w, b.y + (c.y - b.y) * w, b.z + (c.z - b.z) * w); }
    const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return out.set(a.x + abx * v + acx * w, a.y + aby * v + acy * w, a.z + abz * v + acz * w); };
  const nearest = (p, T, reach) => { let best = Infinity, bt = null; const q = new THREE.Vector3();
    for (const t of T) { if (t.c.distanceTo(p) - t.r > Math.min(best, reach)) continue; closest(t.tr, p, q); const d = q.distanceTo(p); if (d < best) { best = d; bt = t; } }
    if (!bt) return null; closest(bt.tr, p, q); return { d: best, q: q.clone(), s: p.clone().sub(q).dot(bt.n) >= 0 ? 1 : -1, n: bt.n }; };
  const tank = get('shambler-tank-top'), tankT = tank ? tris(tank, frame(tank)) : [];
  // [piece, the skin it meets, the joint's reach, then for each side: band k and how far it moves toward the other: frac(w)]
  const pairs = [
    ['shambler-upper-arm-L', 'shambler-torso-skin', .10, [.035, (w) => .9 * w], [.05, (w) => .85 * w ** 1.5]],
    ['shambler-upper-arm-R', 'shambler-torso-skin', .10, [.035, (w) => .9 * w], [.05, (w) => .85 * w ** 1.5]],
    // AG's neck piece is a yoke that runs out over the trapezius to the shoulder domes: the dome meets the YOKE there (pieces
    // coloured in review/CC-359/v6/pieces-coloured.png), so the same blend for arm/yoke
    ['shambler-upper-arm-L', 'shambler-neck-skin', .10, [.035, (w) => .9 * w], [.05, (w) => .85 * w ** 1.5]],
    ['shambler-upper-arm-R', 'shambler-neck-skin', .10, [.035, (w) => .9 * w], [.05, (w) => .85 * w ** 1.5]],
    // the neck yoke's lower rim (front and back, 1.35-1.42 m) settles onto the chest and back skin: no ledge (the chest top was
    // already tucked 1 mm under it at the front, tuckChestUnderYoke; the back kept a lit ledge)
    ['shambler-neck-skin', 'shambler-torso-skin', (p) => p.y < 1.42, [.02, (w) => .9 * w], [.02, () => 0]],
    ['shambler-forearm-hand-L', 'shambler-upper-arm-L', .065, [.02, (w) => .9 * w], [.02, () => 0]],
    ['shambler-forearm-hand-R', 'shambler-upper-arm-R', .065, [.02, (w) => .9 * w], [.02, () => 0]]];
  const report = [];
  for (const [an, bn, reach, sa, sb] of pairs) {
    const A = get(an), B = get(bn); if (!A || !B) continue;
    const joint = A.parent.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv), near = typeof reach === 'function' ? reach : (p) => p.distanceTo(joint) <= reach;
    const fa = frame(A), fb = frame(B), TA = tris(A, fa), TB = tris(B, fb), plans = [];
    for (const [m, f, other, [k, frac]] of [[A, fa, TB, sa], [B, fb, TA, sb]]) {
      const P = m.geometry.attributes.position, N = m.geometry.attributes.normal, C = m.geometry.attributes.color, plan = [];
      for (let i = 0; i < P.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(f.M); if (!near(p)) continue;
        const r = nearest(p, other, k); if (!r || r.s < 0 || r.d >= k) continue;      // only the outside band (inside = hidden)
        const w = 1 - r.d / k; let move = r.d * frac(w), capped = false;
        if (move > 1e-5 && tankT.length) {   // never into the tank: a skin it covers stays under it (as deep as it was, up to 3 mm)
          const t0 = nearest(p, tankT, .03);
          if (t0 && t0.s < 0) {
            const need = Math.min(t0.d, .003) - 1e-4, ok = (mv) => { const t = nearest(p.clone().lerp(r.q, mv / r.d), tankT, .04); return !t || (t.s < 0 && t.d >= need); };
            if (!ok(move)) { let lo = 0, hi = move; for (let it = 0; it < 8; it++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; } move = lo; capped = true; }
          }
        }
        plan.push({ i, p, w, move, q: r.q, on: r.n, capped });
      }
      plans.push({ m, f, P, N, C, plan });
    }
    const colAt = (pl, p) => { let best = Infinity, bi = -1; const q = new THREE.Vector3(); for (let j = 0; j < pl.P.count; j++) { const d = q.fromBufferAttribute(pl.P, j).applyMatrix4(pl.f.M).distanceToSquared(p); if (d < best) { best = d; bi = j; } } return bi; };
    const newCol = plans.map((pl, k2) => pl.plan.map((e) => { const o = plans[1 - k2]; if (!pl.C || !o.C) return null; const j = colAt(o, e.q), t = .5 * e.w * e.w;
      const g3 = (A, k) => [A.getX(k), A.getY(k), A.getZ(k)], x = g3(pl.C, e.i), y = g3(o.C, j); return [0, 1, 2].map((c) => x[c] * (1 - t) + y[c] * t); }));
    let maxMove = 0, moved = [0, 0], capped = 0;
    plans.forEach((pl, k2) => { pl.plan.forEach((e, j) => { if (e.move > 1e-5) { const p = e.p.clone().lerp(e.q, e.move / Math.max(1e-6, e.p.distanceTo(e.q))).applyMatrix4(pl.f.Mi); pl.P.setXYZ(e.i, p.x, p.y, p.z); moved[k2]++; maxMove = Math.max(maxMove, e.move); }
      if (e.capped) capped++; const c = newCol[k2][j]; if (c) pl.C.setXYZ(e.i, c[0], c[1], c[2]); });
      pl.P.needsUpdate = true; if (pl.C) pl.C.needsUpdate = true; pl.m.geometry.computeVertexNormals(); weldSeamNormals(pl.m.geometry); pl.m.geometry.computeBoundingSphere(); });
    for (const pl of plans) { const nmi = new THREE.Matrix3().getNormalMatrix(pl.f.Mi); for (const e of pl.plan) { const n = new THREE.Vector3().fromBufferAttribute(pl.N, e.i).applyMatrix3(pl.f.nm).normalize().lerp(e.on, .5 * e.w * e.w).normalize().applyMatrix3(nmi).normalize(); pl.N.setXYZ(e.i, n.x, n.y, n.z); } pl.N.needsUpdate = true; }
    report.push({ pair: an.replace('shambler-', '') + '/' + bn.replace('shambler-', ''), band: [plans[0].plan.length, plans[1].plan.length], moved, maxMoveMm: +(maxMove * 1000).toFixed(1), cappedUnderTank: capped });
  }
  return report;
}
// CC-359 step 2 fix (Director 08:53Z: "a thin horizontal LINE across the upper chest just under the neck"). AG's neck piece
// spreads down over the collarbones (a yoke) and the chest skin under it turns in steeply to the neck at ~1.38-1.40 m, so the
// two skins cross there at a sharp angle: a ragged crease with a shading step (in AG's own geometry too; its paint hid it).
// Fix: the chest skin's top (1.34-1.42 m) ramps in to lie 1 mm under the yoke (found by a level ray inward from each chest
// vertex), fully by 1.39 m: the chest slides under the yoke at a grazing angle, one smooth skin, nothing floating.
function tuckChestUnderYoke(THREE, root) {
  let neck = null, chest = null; root.traverse((o) => { if (o.isMesh && o.name === 'shambler-neck-skin') neck = o; if (o.isMesh && o.name === 'shambler-torso-skin') chest = o; });
  if (!neck || !chest) return { moved: 0, max: 0 };
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), Mc = new THREE.Matrix4().multiplyMatrices(inv, chest.matrixWorld), Mci = Mc.clone().invert();
  const nm = new THREE.Matrix3().getNormalMatrix(Mc);
  const side = neck.material.side; neck.material.side = THREE.DoubleSide;
  const ray = new THREE.Raycaster(), CP = chest.geometry.attributes.position, CN = chest.geometry.attributes.normal;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), o = new THREE.Vector3(), UNDER = 0.001;
  let moved = 0, max = 0;
  for (let i = 0; i < CP.count; i++) {
    v.fromBufferAttribute(CP, i).applyMatrix4(Mc); if (v.y < 1.34 || v.y > 1.42) continue;
    n.fromBufferAttribute(CN, i).applyMatrix3(nm).normalize();
    const flat = new THREE.Vector3(n.x, 0, n.z); if (flat.lengthSq() < 1e-6) continue; flat.normalize();
    ray.set(o.copy(v).addScaledVector(flat, 0.03), flat.clone().negate()); ray.far = 0.1;   // from just outside, inward
    const hits = ray.intersectObject(neck, false); if (!hits.length) continue;
    const yoke = 0.03 - hits[0].distance;            // the yoke's outer surface, along the outward ray from the chest vertex
    const want = Math.min(0, yoke - UNDER);           // never pushed out
    const d = want * sstep(1.34, 1.39, v.y); if (d >= -1e-5) continue;
    v.addScaledVector(flat, d); if (-d > max) max = -d; moved++;
    v.applyMatrix4(Mci); CP.setXYZ(i, v.x, v.y, v.z);
  }
  neck.material.side = side;
  if (moved) { CP.needsUpdate = true; chest.geometry.computeVertexNormals(); weldSeamNormals(chest.geometry); chest.geometry.computeBoundingSphere(); }
  // the shading across the join: near it (1.5 cm) each skin's normals blend toward the other's, the same at the join itself
  { const Mn = new THREE.Matrix4().multiplyMatrices(inv, neck.matrixWorld), sets = [[chest, Mc], [neck, Mn]].map(([m, M]) => {
      const P = m.geometry.attributes.position, N = m.geometry.attributes.normal, nmm = new THREE.Matrix3().getNormalMatrix(M), pts = [];
      for (let i = 0; i < P.count; i++) { const p = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(M); if (p.y < 1.33 || p.y > 1.45) continue; pts.push({ i, p, n: new THREE.Vector3().fromBufferAttribute(N, i).applyMatrix3(nmm).normalize() }); }
      return { m, M, pts, nmi: new THREE.Matrix3().getNormalMatrix(M.clone().invert()) }; });
    const R = 0.015, upd = [[], []];
    for (const k of [0, 1]) for (const a of sets[k].pts) { let best = 1e9, bn = null; for (const b of sets[1 - k].pts) { const d = a.p.distanceToSquared(b.p); if (d < best) { best = d; bn = b.n; } }
      const d = Math.sqrt(best); if (d >= R || !bn) continue; const w = .5 * (1 - d / R) ** 2; upd[k].push([a.i, a.n.clone().lerp(bn, w).normalize()]); }
    for (const k of [0, 1]) { const N = sets[k].m.geometry.attributes.normal; for (const [i, nn] of upd[k]) { nn.applyMatrix3(sets[k].nmi).normalize(); N.setXYZ(i, nn.x, nn.y, nn.z); } N.needsUpdate = true; }
    root.userData.cc359TuckNormals = [upd[0].length, upd[1].length]; }
  root.userData.cc359Tuck = { moved, max: +max.toFixed(4) };
  return root.userData.cc359Tuck;
}

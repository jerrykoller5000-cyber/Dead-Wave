// world/training-destructibles.js — AH-12: Physical destruction, rigid-body debris, pressurized oxygen cylinder
// rocket/rupture physics, stacked sandbag collapse + spilled-sand mounds, 2-stage monitors & signs, IV stand/saline bag
// burst, fluorescent tube & gate beacon shatter, and pooled wet spills/puddles for the Training Ground.
//
// Performance contract:
// - 0 extra draw calls at rest (all still props remain baked into their existing room batches; all pools start hidden
//   with drawRange 0).
// - 0 CPU work per frame at rest (update() returns 0 immediately when no piece, vent, spill, or mound is active).
// - 0 Geometry / Material / Mesh allocations on hit, blast, rupture, bounce, or frame (everything pre-built at room
//   construction and GPU-primed during blackout via prime(true)/(false)).

export const DESTRUCT_LIMITS = Object.freeze({
  maxPieces: 28,
  maxSpills: 12,
  maxMounds: 4,
  g: 9.8,
  paperG: 1.5,
  fadeAfter: 7.5,
  fade: 0.9,
  spillHold: 18,
  spillFade: 3.5,
  rest: 0.4,
  maxAng: 22,
  o2JetTime: 2.1,
  o2Thrust: 26,
  o2RuptureRadius: 3.6
});

const DEFAULT_HP = Object.freeze({
  electronics: 3,
  monitor: 2,
  sign: 2,
  rackProp: 3,
  paper: 1,
  flickerTube: 1,
  beacon: 2,
  oxygen: 1,
  ivBag: 1,
  ivStand: 1,
  medBoxStack: 2,
  firstAid: 3,
  obsChart: 2,
  blanket: Infinity,
  sandbag: 3
});

const DEFAULT_MASS = Object.freeze({
  electronics: 1.15,
  monitor: 1.8,
  sign: 1.4,
  rackProp: 0.55,
  paper: 0.35,
  oxygen: 2.0,
  ivStand: 1.75,
  medBoxStack: 0.65,
  firstAid: 1.0,
  obsChart: 0.75,
  blanket: 0.85,
  sandbag: 2.4
});

const KICK_MULT = Object.freeze({ bullet: 1.0, pellet: 0.45, melee: 0.85, blast: 1.75, fire: 0.65 });

// Build a radial feathered puddle alpha texture once (32x32, WebGPU/WebGL safe, DataTexture fallback in Node)
function makePuddleTexture(T) {
  if (!T.DataTexture) return null;
  const S = 32, d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5) / S - 0.5, dy = (y + 0.5) / S - 0.5;
    const r = Math.hypot(dx, dy) * 2;
    const edge = r >= 1 ? 0 : Math.pow(1 - r * r, 1.35);
    const rim = r > 0.68 && r < 0.96 ? 1 + 0.16 * Math.sin((r - 0.68) / 0.28 * Math.PI) : 1;
    const a = Math.min(1, edge * rim);
    const k = (y * S + x) * 4;
    d[k] = d[k + 1] = d[k + 2] = 255;
    d[k + 3] = Math.round(a * 255);
  }
  const tex = new T.DataTexture(d, S, S);
  if (T.LinearFilter != null) { tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter; }
  tex.generateMipmaps = false;
  tex.name = 'training-destruct-puddle-tex';
  tex.needsUpdate = true;
  return tex;
}

// Organic slumped sand mound template (smooth radial normals, warm grainy sand colors, skirt strictly y = 0.001 m)
function buildSandMoundTemplate() {
  const segs = 22, rings = 6;
  const tris = [];
  const grid = [];
  for (let r = 0; r <= rings; r++) {
    const u = r / rings;
    const row = [];
    for (let s = 0; s < segs; s++) {
      const ang = (s / segs) * Math.PI * 2;
      const lobe = 1 + 0.11 * Math.sin(ang * 3 + 0.7) + 0.06 * Math.cos(ang * 5 - 1.1) + 0.03 * Math.sin(ang * 7 + 1.9);
      const rad = u * lobe;
      const px = Math.cos(ang) * rad, pz = Math.sin(ang) * rad;
      // Smooth bell-curve dome tapering gently to ground skirt
      const profile = Math.pow(Math.max(0, 1 - u * u), 1.65);
      const ripple = 1 + 0.045 * Math.sin(ang * 2 + u * 5) + 0.025 * Math.cos(ang * 4 - u * 7);
      const py = r === rings ? 0.001 : Math.max(0.0015, profile * ripple);
      // Analytic smooth slope normal for soft natural lighting (zero faceted polygon ridges)
      const slope = r === 0 ? 0 : (r === rings ? 0.45 : Math.min(0.9, 1.35 * u * Math.pow(Math.max(0.02, 1 - u * u), 0.65)));
      const nx0 = Math.cos(ang) * slope, ny0 = 1, nz0 = Math.sin(ang) * slope;
      const nl = Math.hypot(nx0, ny0, nz0) || 1;
      // Warm earthy burlap-matched tan-ochre sand with subtle granular mottling & darkened damp skirt
      const grain = 0.90 + 0.14 * (1 - u * 0.65) + 0.045 * Math.sin(ang * 11 + u * 13) + 0.035 * Math.cos(ang * 17 - u * 9);
      row.push({
        p: [px, py, pz],
        n: [nx0 / nl, ny0 / nl, nz0 / nl],
        c: [0.58 * grain, 0.50 * grain, 0.34 * grain]
      });
    }
    grid.push(row);
  }
  const pushSmoothTri = (a, b, c) => {
    tris.push(a.p, a.n, a.c, b.p, b.n, b.c, c.p, c.n, c.c);
  };
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs;
      const v00 = grid[r][s], v10 = grid[r + 1][s], v11 = grid[r + 1][s1], v01 = grid[r][s1];
      pushSmoothTri(v00, v11, v10);
      if (r > 0) pushSmoothTri(v00, v01, v11);
    }
  }
  return tris; // length = numVerts * 3 (pos, nrm, col)
}
const SAND_MOUND_TEMPLATE = buildSandMoundTemplate();
const SAND_MOUND_VERTS = SAND_MOUND_TEMPLATE.length / 3;
const SPILL_SEGS = 16;
const SPILL_VERTS = SPILL_SEGS * 3;

export function createTrainingDestructibles(T, {
  root,
  origin,
  props = [],
  surfaces = [],
  rooms = [],
  blocks = [],
  onEvent = null
} = {}) {
  const O = origin || { x: 0, y: 0, z: 0 };
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const AXES = [V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1)];
  let emitEvent = typeof onEvent === 'function' ? onEvent : null;
  const emit = (ev) => { if (emitEvent) emitEvent(ev); };

  // Deterministic PRNG
  let seed = 0x51a7c3d1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const ownedGeos = [], ownedMats = [], ownedTexs = [];
  const tmpM = new T.Matrix4(), invRoot = new T.Matrix4(), nm3 = new T.Matrix3();
  const tmpV = V3(), tmpV2 = V3(), tmpN = V3(), qTmp = new T.Quaternion(), qInv = new T.Quaternion();
  const wV = V3(), upV = V3(), pB = V3(), qB = new T.Quaternion(), sB = V3(), atV = V3();
  const axTmp = V3(), nozTmp = V3();

  // Dark shattered screen material for broken monitors (shared, 1 material)
  const darkCavityMat = new T.MeshStandardMaterial({ color: 0x0b0e10, roughness: 0.85, metalness: 0.15 });
  darkCavityMat.name = 'training-destruct-cavity';
  const darkBeaconMat = new T.MeshStandardMaterial({ color: 0x261d12, roughness: 0.72, metalness: 0.2 });
  darkBeaconMat.name = 'training-destruct-beacon-off';
  ownedMats.push(darkCavityMat, darkBeaconMat);

  // ---- Pooled Batched Spills / Puddles Mesh (1 draw call max, 0 at rest)
  const spillTex = makePuddleTexture(T);
  if (spillTex) ownedTexs.push(spillTex);
  const SPILL_CAP = DESTRUCT_LIMITS.maxSpills;
  const spillGeo = new T.BufferGeometry();
  const spillPos = new T.BufferAttribute(new Float32Array(SPILL_CAP * SPILL_VERTS * 3), 3);
  const spillNrm = new T.BufferAttribute(new Float32Array(SPILL_CAP * SPILL_VERTS * 3), 3);
  const spillCol = new T.BufferAttribute(new Float32Array(SPILL_CAP * SPILL_VERTS * 3), 3);
  const spillUv = new T.BufferAttribute(new Float32Array(SPILL_CAP * SPILL_VERTS * 2), 2);
  if (spillPos.setUsage && T.DynamicDrawUsage != null) {
    spillPos.setUsage(T.DynamicDrawUsage);
    spillCol.setUsage(T.DynamicDrawUsage);
  }
  for (let i = 0; i < SPILL_CAP * SPILL_VERTS; i++) spillNrm.setXYZ(i, 0, 1, 0);
  spillGeo.setAttribute('position', spillPos);
  spillGeo.setAttribute('normal', spillNrm);
  spillGeo.setAttribute('color', spillCol);
  spillGeo.setAttribute('uv', spillUv);
  if (spillGeo.setDrawRange) spillGeo.setDrawRange(0, 0);
  const spillMat = new T.MeshStandardMaterial({
    color: 0xffffff,
    map: spillTex || null,
    vertexColors: true,
    transparent: true,
    opacity: 0.74,
    roughness: 0.14,
    metalness: 0.06,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    forceSinglePass: true
  });
  spillMat.name = 'training-prop-spills';
  const spillMesh = new T.Mesh(spillGeo, spillMat);
  spillMesh.name = 'training-prop-spills';
  spillMesh.renderOrder = 1.08;
  spillMesh.frustumCulled = false;
  spillMesh.visible = false;
  spillMesh.castShadow = false;
  spillMesh.receiveShadow = true;
  spillMesh.raycast = () => {};
  if (root) root.add(spillMesh);
  ownedGeos.push(spillGeo); ownedMats.push(spillMat);

  const spills = [];
  let spillNext = 0;
  const SPILL_COLORS = {
    coffee: [0.16, 0.08, 0.035],
    water: [0.36, 0.44, 0.47],
    saline: [0.62, 0.84, 0.90]
  };

  function clampSpillRadius(lx, ly, lz, radius) {
    let r = radius;
    // If on an elevated worktop/bench surface, never let a spill overhang into mid-air
    if (ly > 0.05) {
      for (const s of surfaces) {
        if (Math.abs(ly - s.y) < 0.06 && lx >= s.minX && lx <= s.maxX && lz >= s.minZ && lz <= s.maxZ) {
          r = Math.min(r, Math.max(0.06, Math.min(lx - s.minX, s.maxX - lx, lz - s.minZ, s.maxZ - lz) - 0.015));
          break;
        }
      }
    }
    for (const rm of rooms) {
      if (lx >= rm.minX && lx <= rm.maxX && lz >= rm.minZ && lz <= rm.maxZ) {
        r = Math.min(r, Math.max(0.08, Math.min(lx - rm.minX, rm.maxX - lx, lz - rm.minZ, rm.maxZ - lz) - 0.04));
        break;
      }
    }
    return Math.max(0.05, r);
  }

  function addSpill(kind, worldPoint, radius = 0.32) {
    if (!worldPoint) return false;
    const lx = worldPoint.x - O.x, lz = worldPoint.z - O.z;
    const ly = groundAt(lx, lz, worldPoint.y - O.y + 0.06);
    const r = clampSpillRadius(lx, ly, lz, radius);
    const col = SPILL_COLORS[kind] || SPILL_COLORS.water;
    const rec = {
      x: lx, y: ly + 0.0018, z: lz,
      rMax: r, age: 0, phase: rnd() * 6.283,
      cr: col[0], cg: col[1], cb: col[2]
    };
    if (spills.length < SPILL_CAP) spills.push(rec);
    else { spills[spillNext] = rec; spillNext = (spillNext + 1) % SPILL_CAP; }
    syncSpills(0);
    return true;
  }

  function syncSpills(dt) {
    let alive = 0;
    const P = spillPos.array, C = spillCol.array, U = spillUv.array;
    for (let i = spills.length - 1; i >= 0; i--) {
      const s = spills[i];
      s.age += dt;
      if (s.age >= DESTRUCT_LIMITS.spillHold + DESTRUCT_LIMITS.spillFade) {
        spills.splice(i, 1);
        continue;
      }
      const spread = Math.min(1, 0.25 + (s.age / 0.42) * 0.75);
      const fade = s.age > DESTRUCT_LIMITS.spillHold
        ? Math.max(0, 1 - (s.age - DESTRUCT_LIMITS.spillHold) / DESTRUCT_LIMITS.spillFade)
        : 1;
      const rad = s.rMax * (1 - (1 - spread) * (1 - spread)) * (0.4 + 0.6 * fade);
      const baseV = alive * SPILL_VERTS;
      for (let k = 0; k < SPILL_SEGS; k++) {
        const a0 = (k / SPILL_SEGS) * Math.PI * 2;
        const a1 = ((k + 1) / SPILL_SEGS) * Math.PI * 2;
        const l0 = 1 + 0.16 * Math.sin(a0 * 3 + s.phase) + 0.09 * Math.cos(a0 * 5 - s.phase * 1.3);
        const l1 = 1 + 0.16 * Math.sin(a1 * 3 + s.phase) + 0.09 * Math.cos(a1 * 5 - s.phase * 1.3);
        const v0 = baseV + k * 3;
        const p0 = v0 * 3, u0 = v0 * 2;
        // Center
        P[p0] = s.x; P[p0 + 1] = s.y; P[p0 + 2] = s.z;
        U[u0] = 0.5; U[u0 + 1] = 0.5;
        // Rim 1 (CCW looking down +Y)
        P[p0 + 3] = s.x + Math.cos(a1) * rad * l1; P[p0 + 4] = s.y; P[p0 + 5] = s.z + Math.sin(a1) * rad * l1;
        U[u0 + 2] = 0.5 + Math.cos(a1) * 0.48; U[u0 + 3] = 0.5 + Math.sin(a1) * 0.48;
        // Rim 0
        P[p0 + 6] = s.x + Math.cos(a0) * rad * l0; P[p0 + 7] = s.y; P[p0 + 8] = s.z + Math.sin(a0) * rad * l0;
        U[u0 + 4] = 0.5 + Math.cos(a0) * 0.48; U[u0 + 5] = 0.5 + Math.sin(a0) * 0.48;
        for (let j = 0; j < 3; j++) {
          const ci = (v0 + j) * 3;
          C[ci] = s.cr * fade; C[ci + 1] = s.cg * fade; C[ci + 2] = s.cb * fade;
        }
      }
      alive++;
    }
    spillMesh.visible = alive > 0;
    if (spillGeo.setDrawRange) spillGeo.setDrawRange(0, alive * SPILL_VERTS);
    if (alive) { spillPos.needsUpdate = true; spillCol.needsUpdate = true; spillUv.needsUpdate = true; }
  }

  // ---- Pooled Batched Spilled-Sand Mound Mesh (1 draw call max, 0 at rest)
  const MOUND_CAP = DESTRUCT_LIMITS.maxMounds;
  const moundGeo = new T.BufferGeometry();
  const moundPos = new T.BufferAttribute(new Float32Array(MOUND_CAP * SAND_MOUND_VERTS * 3), 3);
  const moundNrm = new T.BufferAttribute(new Float32Array(MOUND_CAP * SAND_MOUND_VERTS * 3), 3);
  const moundCol = new T.BufferAttribute(new Float32Array(MOUND_CAP * SAND_MOUND_VERTS * 3), 3);
  if (moundPos.setUsage && T.DynamicDrawUsage != null) {
    moundPos.setUsage(T.DynamicDrawUsage);
    moundNrm.setUsage(T.DynamicDrawUsage);
    moundCol.setUsage(T.DynamicDrawUsage);
  }
  moundGeo.setAttribute('position', moundPos);
  moundGeo.setAttribute('normal', moundNrm);
  moundGeo.setAttribute('color', moundCol);
  if (moundGeo.setDrawRange) moundGeo.setDrawRange(0, 0);
  const moundMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.96, metalness: 0.0 });
  moundMat.name = 'training-sand-mounds';
  const moundMesh = new T.Mesh(moundGeo, moundMat);
  moundMesh.name = 'training-sand-mounds';
  moundMesh.frustumCulled = false;
  moundMesh.visible = false;
  moundMesh.castShadow = true;
  moundMesh.receiveShadow = true;
  moundMesh.raycast = () => {};
  if (root) root.add(moundMesh);
  ownedGeos.push(moundGeo); ownedMats.push(moundMat);

  const mounds = [];
  function addSandMound(lx, lz, radius = 0.38, height = 0.115) {
    // Clamp inside room so mound never pokes through the wall
    let cx = lx, cz = lz;
    for (const rm of rooms) {
      if (cx >= rm.minX - 0.2 && cx <= rm.maxX + 0.2 && cz >= rm.minZ - 0.2 && cz <= rm.maxZ + 0.2) {
        cx = Math.max(rm.minX + radius * 0.85, Math.min(rm.maxX - radius * 0.85, cx));
        cz = Math.max(rm.minZ + radius * 0.85, Math.min(rm.maxZ - radius * 0.85, cz));
        break;
      }
    }
    const rec = { x: cx, z: cz, rx: radius * 1.15, rz: radius * 0.85, h: height, rot: rnd() * 6.283, grow: 0.25 };
    if (mounds.length < MOUND_CAP) mounds.push(rec);
    else mounds[mounds.length - 1] = rec;
    syncMounds(0);
  }

  function syncMounds(dt) {
    if (!mounds.length) {
      if (moundMesh.visible) { moundMesh.visible = false; if (moundGeo.setDrawRange) moundGeo.setDrawRange(0, 0); }
      return false;
    }
    let dirty = dt === 0;
    for (const m of mounds) {
      if (m.grow < 1) { m.grow = Math.min(1, m.grow + dt * 3.5); dirty = true; }
    }
    if (!dirty && moundMesh.visible) return false;
    const P = moundPos.array, N = moundNrm.array, C = moundCol.array;
    for (let i = 0; i < mounds.length; i++) {
      const m = mounds[i], cs = Math.cos(m.rot), sn = Math.sin(m.rot), g = m.grow;
      const base = i * SAND_MOUND_VERTS;
      for (let v = 0; v < SAND_MOUND_VERTS; v++) {
        const tp = SAND_MOUND_TEMPLATE[v * 3], tn = SAND_MOUND_TEMPLATE[v * 3 + 1], tc = SAND_MOUND_TEMPLATE[v * 3 + 2];
        const rx = tp[0] * m.rx * g, rz = tp[2] * m.rz * g;
        const wx = m.x + rx * cs - rz * sn, wz = m.z + rx * sn + rz * cs;
        const wy = tp[1] <= 0.0011 ? 0.001 : 0.001 + tp[1] * m.h * g;
        const o = (base + v) * 3;
        P[o] = wx; P[o + 1] = wy; P[o + 2] = wz;
        N[o] = tn[0] * cs - tn[2] * sn; N[o + 1] = tn[1]; N[o + 2] = tn[0] * sn + tn[2] * cs;
        C[o] = tc[0]; C[o + 1] = tc[1]; C[o + 2] = tc[2];
      }
    }
    moundMesh.visible = true;
    if (moundGeo.setDrawRange) moundGeo.setDrawRange(0, mounds.length * SAND_MOUND_VERTS);
    moundPos.needsUpdate = true; moundNrm.needsUpdate = true; moundCol.needsUpdate = true;
    return mounds.some((m) => m.grow < 1);
  }

  // ---- Geometry preparation helpers (run ONCE at buildTrainingGround, BEFORE bakeStatic)
  if (root) { root.updateMatrixWorld(true); invRoot.copy(root.matrixWorld).invert(); }

  function recordSourceMesh(m) {
    m.updateMatrixWorld(true);
    const P = m.geometry && m.geometry.attributes && m.geometry.attributes.position;
    if (!P) return null;
    const idx = m.geometry.index, n = idx ? idx.count : P.count;
    if (!n) return null;
    tmpM.multiplyMatrices(invRoot, m.matrixWorld);
    const at = (k) => { const i = idx ? idx.getX(k) : k; return V3().fromBufferAttribute(P, i).applyMatrix4(tmpM); };
    return {
      mesh: m,
      mat: m.material,
      count: n,
      first: at(0),
      mid: at((n / 2) | 0),
      last: at(n - 1),
      range: null,
      unbaked: null
    };
  }

  // Merge a list of source meshes into [{ geo, mat }] centered around a single origin `centre` (root-local)
  function buildSubparts(meshList) {
    const valid = meshList.filter((m) => m && m.isMesh && m.geometry && m.geometry.attributes && m.geometry.attributes.position);
    if (!valid.length) return null;
    let lox = Infinity, loy = Infinity, loz = Infinity, hix = -Infinity, hiy = -Infinity, hiz = -Infinity;
    for (const m of valid) {
      m.updateMatrixWorld(true);
      tmpM.multiplyMatrices(invRoot, m.matrixWorld);
      const e = tmpM.elements, P = m.geometry.attributes.position, pa = P.array;
      for (let k = 0; k < P.count; k++) {
        const o = k * 3, x = pa[o], y = pa[o + 1], z = pa[o + 2];
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
        const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
        const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        if (wx < lox) lox = wx; if (wy < loy) loy = wy; if (wz < loz) loz = wz;
        if (wx > hix) hix = wx; if (wy > hiy) hiy = wy; if (wz > hiz) hiz = wz;
      }
    }
    const lo = V3(lox, loy, loz), hi = V3(hix, hiy, hiz);
    const cx = (lox + hix) * 0.5, cy = (loy + hiy) * 0.5, cz = (loz + hiz) * 0.5;
    const centre = V3(cx, cy, cz);
    const byMat = new Map();
    for (const m of valid) {
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!mat) continue;
      let list = byMat.get(mat); if (!list) byMat.set(mat, list = []);
      list.push(m);
    }
    const subparts = [];
    const corners = [];
    for (const [mat, list] of byMat) {
      let total = 0, anyUv = true;
      for (const m of list) {
        const g = m.geometry; total += g.index ? g.index.count : g.attributes.position.count;
        if (!g.attributes.uv) anyUv = false;
      }
      const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = anyUv ? new Float32Array(total * 2) : null;
      let at = 0;
      for (const m of list) {
        tmpM.multiplyMatrices(invRoot, m.matrixWorld);
        nm3.getNormalMatrix(tmpM);
        const e = tmpM.elements, ne = nm3.elements;
        const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, idx = g.index;
        const pa = P.array, na = N ? N.array : null, ua = U ? U.array : null, ia = idx ? idx.array : null;
        const cnt = idx ? idx.count : P.count;
        for (let k = 0; k < cnt; k++) {
          const i = ia ? ia[k] : k, io = i * 3, d = (at + k) * 3;
          const x = pa[io], y = pa[io + 1], z = pa[io + 2];
          pos[d] = e[0] * x + e[4] * y + e[8] * z + e[12] - cx;
          pos[d + 1] = e[1] * x + e[5] * y + e[9] * z + e[13] - cy;
          pos[d + 2] = e[2] * x + e[6] * y + e[10] * z + e[14] - cz;
          if (na) {
            const nx0 = na[io], ny0 = na[io + 1], nz0 = na[io + 2];
            const nx = ne[0] * nx0 + ne[3] * ny0 + ne[6] * nz0;
            const ny = ne[1] * nx0 + ne[4] * ny0 + ne[7] * nz0;
            const nz = ne[2] * nx0 + ne[5] * ny0 + ne[8] * nz0;
            const nl = Math.hypot(nx, ny, nz) || 1;
            nrm[d] = nx / nl; nrm[d + 1] = ny / nl; nrm[d + 2] = nz / nl;
          } else {
            nrm[d + 1] = 1;
          }
          if (uv && ua) { uv[(at + k) * 2] = ua[i * 2]; uv[(at + k) * 2 + 1] = ua[i * 2 + 1]; }
        }
        at += cnt;
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new T.BufferAttribute(nrm, 3));
      if (uv) geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      ownedGeos.push(geo);
      subparts.push({ geo, mat });
      const step = Math.max(1, Math.floor(total / 48));
      for (let k = 0; k < total; k += step) corners.push(V3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]));
    }
    const ext = [hix - lox, hiy - loy, hiz - loz];
    const minK = ext.indexOf(Math.min(...ext)), rest2 = ext.filter((_, j) => j !== minK);
    const thin = ext[minK] < 0.42 * Math.min(...rest2) ? AXES[minK] : null;
    const maxK = ext.indexOf(Math.max(...ext));
    const long = ext[maxK] > 2.8 * Math.max(...ext.filter((_, j) => j !== maxK)) ? AXES[maxK] : null;
    const radius = Math.hypot(ext[0], ext[1], ext[2]) * 0.5;
    return { subparts, centre, lo, hi, ext, corners, thin, long, radius };
  }

  // Split a subpart geometry's triangles into chunks (returns [{ subparts: [{ geo, mat }], centre, corners, thin, long, radius }])
  function splitSubparts(body, mode = 'quad') {
    if (!body || !body.subparts.length) return [];
    const buckets = new Map();
    const keyOf = (c) => {
      if (mode === 'strip3') {
        const ax = body.ext[0] >= body.ext[1] && body.ext[0] >= body.ext[2] ? c.x : body.ext[1] >= body.ext[2] ? c.y : c.z;
        const span = Math.max(0.05, Math.max(...body.ext));
        return ax < -span * 0.16 ? 0 : ax > span * 0.16 ? 2 : 1;
      }
      if (mode === 'radial6') {
        return Math.floor((Math.atan2(c.z, c.x) + Math.PI) / (Math.PI / 3)) % 6;
      }
      if (mode === 'split2') {
        const ax = body.ext[0] >= body.ext[2] ? c.x : c.z;
        return ax >= 0 ? 1 : 0;
      }
      // quad
      return (c.x >= 0 ? 1 : 0) + (c.y >= 0 ? 2 : 0) + (c.z >= 0 ? 4 : 0);
    };
    for (const sp of body.subparts) {
      const P = sp.geo.attributes.position, N = sp.geo.attributes.normal, U = sp.geo.attributes.uv;
      for (let t = 0; t + 2 < P.count; t += 3) {
        tmpV.set(
          (P.getX(t) + P.getX(t + 1) + P.getX(t + 2)) / 3,
          (P.getY(t) + P.getY(t + 1) + P.getY(t + 2)) / 3,
          (P.getZ(t) + P.getZ(t + 1) + P.getZ(t + 2)) / 3
        );
        const k = keyOf(tmpV);
        let bk = buckets.get(k); if (!bk) buckets.set(k, bk = new Map());
        let list = bk.get(sp.mat); if (!list) bk.set(sp.mat, list = []);
        list.push({ P, N, U, t });
      }
    }
    const out = [];
    for (const bk of buckets.values()) {
      const lo = V3(Infinity, Infinity, Infinity), hi = V3(-Infinity, -Infinity, -Infinity);
      let triCount = 0;
      for (const list of bk.values()) {
        triCount += list.length;
        for (const q of list) for (let j = 0; j < 3; j++) {
          tmpV.set(q.P.getX(q.t + j), q.P.getY(q.t + j), q.P.getZ(q.t + j));
          lo.min(tmpV); hi.max(tmpV);
        }
      }
      if (!triCount) continue;
      const centre = V3((lo.x + hi.x) * 0.5, (lo.y + hi.y) * 0.5, (lo.z + hi.z) * 0.5);
      const subparts = [], corners = [];
      for (const [mat, list] of bk) {
        const cnt = list.length * 3, anyUv = list.every((q) => !!q.U);
        const pos = new Float32Array(cnt * 3), nrm = new Float32Array(cnt * 3), uv = anyUv ? new Float32Array(cnt * 2) : null;
        for (let i = 0; i < list.length; i++) {
          const q = list[i];
          for (let j = 0; j < 3; j++) {
            const s = q.t + j, d = i * 3 + j;
            const px = q.P.getX(s) - centre.x, py = q.P.getY(s) - centre.y, pz = q.P.getZ(s) - centre.z;
            pos[d * 3] = px; pos[d * 3 + 1] = py; pos[d * 3 + 2] = pz;
            if (q.N) { nrm[d * 3] = q.N.getX(s); nrm[d * 3 + 1] = q.N.getY(s); nrm[d * 3 + 2] = q.N.getZ(s); }
            else nrm[d * 3 + 1] = 1;
            if (uv) { uv[d * 2] = q.U.getX(s); uv[d * 2 + 1] = q.U.getY(s); }
          }
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new T.BufferAttribute(nrm, 3));
        if (uv) geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
        geo.computeBoundingBox(); geo.computeBoundingSphere();
        ownedGeos.push(geo);
        subparts.push({ geo, mat });
        const step = Math.max(1, Math.floor(cnt / 24));
        for (let k = 0; k < cnt; k += step) corners.push(V3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]));
      }
      const ext = [hi.x - lo.x, hi.y - lo.y, hi.z - lo.z];
      const minK = ext.indexOf(Math.min(...ext)), rest2 = ext.filter((_, j) => j !== minK);
      const thin = ext[minK] < 0.45 * Math.min(...rest2) ? AXES[minK] : null;
      const maxK = ext.indexOf(Math.max(...ext));
      const long = ext[maxK] > 3 * Math.max(...ext.filter((_, j) => j !== maxK)) ? AXES[maxK] : null;
      out.push({ subparts, centre, corners, thin, long, radius: Math.hypot(ext[0], ext[1], ext[2]) * 0.5 });
      if (out.length >= 6) break;
    }
    return out;
  }

  // Split a thin rectangular paper/poster plane into 3 fluttering torn pieces (always works even on 2-triangle PlaneGeometry)
  function buildPaperStrips(body) {
    if (!body || !body.subparts.length) return [];
    const sp = body.subparts[0];
    const w = Math.max(0.06, Math.max(body.ext[0], body.ext[2])), h = Math.max(0.06, body.ext[1]);
    const out = [];
    for (let k = 0; k < 3; k++) {
      const sw = w * (0.45 + (k % 2) * 0.14), sh = h * (0.38 + ((k + 1) % 2) * 0.14);
      const geo = new T.PlaneGeometry(sw, sh);
      if (geo.attributes.uv) {
        const uv = geo.attributes.uv, sUv = sp.geo.attributes.uv;
        if (sUv && sUv.count >= 4) {
          let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
          for (let i = 0; i < sUv.count; i++) { u0 = Math.min(u0, sUv.getX(i)); u1 = Math.max(u1, sUv.getX(i)); v0 = Math.min(v0, sUv.getY(i)); v1 = Math.max(v1, sUv.getY(i)); }
          const du = (u1 - u0) * 0.55, dv = (v1 - v0) * 0.5;
          const ou = u0 + (k === 1 ? (u1 - u0) * 0.42 : (k === 2 ? (u1 - u0) * 0.2 : 0));
          const ov = v0 + (k === 2 ? (v1 - v0) * 0.45 : 0);
          for (let i = 0; i < uv.count; i++) uv.setXY(i, ou + uv.getX(i) * du, ov + uv.getY(i) * dv);
          uv.needsUpdate = true;
        }
      }
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      ownedGeos.push(geo);
      const cx = (k - 1) * w * 0.22, cy = ((k % 2) - 0.5) * h * 0.22;
      const corners = [V3(-sw / 2, -sh / 2, 0), V3(sw / 2, -sh / 2, 0), V3(sw / 2, sh / 2, 0), V3(-sw / 2, sh / 2, 0)];
      out.push({ subparts: [{ geo, mat: sp.mat }], centre: V3(cx, cy, 0), corners, thin: AXES[2], long: null, radius: Math.hypot(sw, sh) * 0.5 });
    }
    return out;
  }

  // ---- Build entries BEFORE bakeStatic
  const stillMeshes = new Set();
  const entries = [];
  const byId = new Map();

  for (let i = 0; i < props.length; i++) {
    const spec = props[i];
    const allMeshes = [...(spec.meshes || [])];
    const extra = spec.extraMeshes || {};
    for (const val of Object.values(extra)) {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (Array.isArray(item)) for (const m of item) if (m && m.isMesh && !allMeshes.includes(m)) allMeshes.push(m);
          else if (item && item.isMesh && !allMeshes.includes(item)) allMeshes.push(item);
        }
      }
    }
    const validMeshes = allMeshes.filter((m) => m && m.isMesh && m.geometry && m.geometry.attributes && m.geometry.attributes.position);
    if (!validMeshes.length) continue;

    // Exclude still meshes from static propSolids so exactLayer never holds ghost triangles after destruction
    for (const m of validMeshes) stillMeshes.add(m);

    // Compute world solid AABB from all source meshes
    let wlox = Infinity, wloy = Infinity, wloz = Infinity, whix = -Infinity, whiy = -Infinity, whiz = -Infinity;
    for (const m of validMeshes) {
      m.updateMatrixWorld(true);
      const e = m.matrixWorld.elements, P = m.geometry.attributes.position, pa = P.array;
      for (let k = 0; k < P.count; k++) {
        const o = k * 3, x = pa[o], y = pa[o + 1], z = pa[o + 2];
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
        const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
        const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        if (wx < wlox) wlox = wx; if (wy < wloy) wloy = wy; if (wz < wloz) wloz = wz;
        if (wx > whix) whix = wx; if (wy > whiy) whiy = wy; if (wz > whiz) whiz = wz;
      }
    }
    const pad = spec.kind === 'paper' ? 0.025 : 0.014;
    const stillBox = { minX: wlox - pad, maxX: whix + pad, minY: wloy - pad, maxY: whiy + pad, minZ: wloz - pad, maxZ: whiz + pad };

    // Record each source mesh's vertex signatures for post-bake binding
    const recs = validMeshes.map(recordSourceMesh).filter(Boolean);
    const recByMesh = new Map(recs.map((r) => [r.mesh, r]));

    // Build pre-baked loose & broken shapes
    const kind = spec.kind;
    let body = null, bits = null, extraParts = {}, cavity = null, stackBodies = null;

    if (kind === 'flickerTube' || kind === 'beacon') {
      // Unbaked named emissive meshes: no loose body needed, just shatter state + darkened material swap
      body = null;
    } else if (kind === 'medBoxStack' && Array.isArray(extra.boxes) && extra.boxes.length) {
      stackBodies = extra.boxes.map((list) => buildSubparts(list)).filter(Boolean);
      body = buildSubparts(validMeshes);
      bits = stackBodies.flatMap((sb) => splitSubparts(sb, 'split2'));
    } else if (kind === 'monitor') {
      const scrMeshes = (extra.screen || []).filter((m) => m && m.isMesh);
      const tapeMeshes = (extra.tape || []).filter((m) => m && m.isMesh);
      const casingMeshes = validMeshes.filter((m) => !scrMeshes.includes(m) && !tapeMeshes.includes(m));
      // Keep the whole dead monitor casing + dark screen face intact as a solid rigid body on Stage 2 (no hollow spiky bevel shards!)
      body = buildSubparts(casingMeshes.length ? casingMeshes : validMeshes);
      if (scrMeshes.length && body) {
        const sb = buildSubparts(scrMeshes);
        if (sb && sb.subparts.length) {
          cavity = { subparts: [{ geo: sb.subparts[0].geo, mat: darkCavityMat }], centre: sb.centre, corners: sb.corners, thin: sb.thin, long: sb.long, radius: sb.radius };
          // Also clone a shifted cavity subpart onto body so the knocked-off monitor carries its dark dead screen cleanly
          const srcPos = sb.subparts[0].geo.attributes.position, srcNrm = sb.subparts[0].geo.attributes.normal;
          const pos = new Float32Array(srcPos.count * 3), nrm = new Float32Array(srcNrm.count * 3);
          const ox = sb.centre.x - body.centre.x, oy = sb.centre.y - body.centre.y, oz = sb.centre.z - body.centre.z;
          for (let k = 0; k < srcPos.count; k++) {
            pos[k * 3] = srcPos.array[k * 3] + ox; pos[k * 3 + 1] = srcPos.array[k * 3 + 1] + oy; pos[k * 3 + 2] = srcPos.array[k * 3 + 2] + oz;
            nrm[k * 3] = srcNrm.array[k * 3]; nrm[k * 3 + 1] = srcNrm.array[k * 3 + 1]; nrm[k * 3 + 2] = srcNrm.array[k * 3 + 2];
          }
          const cGeo = new T.BufferGeometry();
          cGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
          cGeo.setAttribute('normal', new T.BufferAttribute(nrm, 3));
          cGeo.computeBoundingBox(); cGeo.computeBoundingSphere();
          ownedGeos.push(cGeo);
          body.subparts.push({ geo: cGeo, mat: darkCavityMat });
        }
      }
      bits = null;
      if (tapeMeshes.length) extraParts.tape = tapeMeshes.map((m) => buildSubparts([m])).filter(Boolean);
    } else if (kind === 'oxygen') {
      const valveMeshes = (extra.valve || []).filter((m) => m && m.isMesh);
      const cylMeshes = validMeshes.filter((m) => !valveMeshes.includes(m));
      body = buildSubparts(cylMeshes.length ? cylMeshes : validMeshes);
      bits = splitSubparts(body, 'radial6');
      if (valveMeshes.length) extraParts.valve = [buildSubparts(valveMeshes)].filter(Boolean);
    } else if (kind === 'electronics') {
      const antMeshes = (extra.antenna || []).filter((m) => m && m.isMesh);
      const mainMeshes = validMeshes.filter((m) => !antMeshes.includes(m));
      body = buildSubparts(mainMeshes.length ? mainMeshes : validMeshes);
      bits = splitSubparts(body, 'quad');
      if (antMeshes.length) extraParts.antenna = [buildSubparts(antMeshes)].filter(Boolean);
    } else if (kind === 'obsChart') {
      const shMeshes = (extra.sheet || []).filter((m) => m && m.isMesh);
      const mainMeshes = validMeshes.filter((m) => !shMeshes.includes(m));
      body = buildSubparts(mainMeshes.length ? mainMeshes : validMeshes);
      bits = splitSubparts(body, 'quad');
      if (shMeshes.length) extraParts.sheet = [buildSubparts(shMeshes)].filter(Boolean);
    } else if (kind === 'paper') {
      body = buildSubparts(validMeshes);
      bits = buildPaperStrips(body);
    } else if (kind === 'sandbag') {
      body = buildSubparts(validMeshes);
      bits = splitSubparts(body, 'strip3');
    } else if (kind === 'ivBag') {
      body = buildSubparts(validMeshes);
      bits = splitSubparts(body, 'strip3');
    } else if (kind === 'ivStand') {
      body = buildSubparts(validMeshes);
      bits = null; // topples whole onto the floor cleanly
    } else if (kind === 'sign') {
      body = buildSubparts(validMeshes);
      bits = null; // detaches intact as a bent steel sign plate onto the floor
    } else if (kind === 'blanket') {
      body = buildSubparts(validMeshes);
      bits = null; // cloth blanket tumbles whole
    } else {
      body = buildSubparts(validMeshes);
      bits = splitSubparts(body, kind === 'rackProp' ? 'split2' : 'quad');
    }

    const screenRecs = (extra.screen || []).map((m) => recByMesh.get(m)).filter(Boolean);
    const tapeRecs = (extra.tape || []).map((m) => recByMesh.get(m)).filter(Boolean);
    const hp = spec.hp != null ? spec.hp : (DEFAULT_HP[kind] ?? 3);
    const fx = spec.fx || (kind === 'monitor' ? 'glass' : kind === 'electronics' ? 'electronics' : kind === 'sandbag' ? 'sand' : kind === 'paper' ? 'paper' : kind === 'ivBag' ? 'saline' : kind === 'flickerTube' ? 'phosphor' : kind === 'beacon' ? 'amberGlass' : kind === 'blanket' ? 'cloth' : kind === 'sign' || kind === 'oxygen' || kind === 'ivStand' ? 'steel' : 'plastic');
    const breakFx = spec.breakFx || (kind === 'sandbag' ? 'burlap' : kind === 'monitor' ? 'electronics' : kind === 'sign' ? 'steel' : fx);
    const metal = spec.metal != null ? !!spec.metal : (kind === 'sign' || kind === 'oxygen' || kind === 'ivStand' || kind === 'beacon');

    const solid = {
      ...stillBox,
      prop: true,
      destructible: spec.id,
      destructIndex: entries.length,
      fx,
      metal
    };

    const entry = {
      id: spec.id,
      index: entries.length,
      kind,
      hp,
      baseHp: hp,
      mass: spec.mass || DEFAULT_MASS[kind] || 1,
      fx,
      breakFx,
      metal,
      flammable: !!spec.flammable,
      supports: spec.supports || null,
      linked: spec.linked || null,
      wallNormal: spec.wallNormal || null,
      onShatter: spec.onShatter || null,
      recs,
      screenRecs,
      tapeRecs,
      still: stillBox,
      solid,
      prep: { body, bits, extraParts, cavity, stackBodies },
      state: 'still',     // 'still' | 'damaged' | 'loose' | 'venting' | 'broken'
      hits: 0,
      heat: 0,
      slump: 0,
      piece: null,
      stackPieces: [],
      cavityPiece: null,
      savedMats: null,
      flickerT: 0
    };
    entries.push(entry);
    byId.set(entry.id, entry);
  }

  // ---- Post-bake binding (call right after partitionTrainingShell + bakeStatic)
  let boundOnce = false;
  function bind() {
    boundOnce = true;
    const bakedList = [];
    const byMat = new Map();
    const cutawayBaked = [];
    if (root) {
      root.traverse((o) => {
        if (o.isMesh && o.userData && o.userData.baked && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
          if (!o.geometry.boundingBox && o.geometry.computeBoundingBox) o.geometry.computeBoundingBox();
          const entry = { mesh: o, box: o.geometry.boundingBox, pos: o.geometry.attributes.position };
          bakedList.push(entry);
          let arr = byMat.get(o.material);
          if (!arr) byMat.set(o.material, arr = []);
          arr.push(entry);
          if (o.parent && o.parent.name && o.parent.name.startsWith('training-cutaway-')) cutawayBaked.push(entry);
        }
      });
    }
    const scanPool = (r, pool, stride) => {
      const fx = r.first.x, fy = r.first.y, fz = r.first.z;
      const mx = r.mid.x, my = r.mid.y, mz = r.mid.z;
      const lx = r.last.x, ly = r.last.y, lz = r.last.z;
      const n = r.count, midOff = ((n / 2) | 0) * 3, lastOff = (n - 1) * 3;
      for (let bi = 0; bi < pool.length; bi++) {
        const be = pool[bi], box = be.box;
        if (box) {
          if (fx < box.min.x - 1e-3 || fx > box.max.x + 1e-3 || fy < box.min.y - 1e-3 || fy > box.max.y + 1e-3 || fz < box.min.z - 1e-3 || fz > box.max.z + 1e-3) continue;
          if (lx < box.min.x - 1e-3 || lx > box.max.x + 1e-3 || ly < box.min.y - 1e-3 || ly > box.max.y + 1e-3 || lz < box.min.z - 1e-3 || lz > box.max.z + 1e-3) continue;
        }
        const P = be.pos, a = P.array, end = (P.count - n) * 3;
        if (end < 0) continue;
        for (let j = 0; j <= end; j += stride) {
          const dx = a[j] - fx; if (dx > 2e-4 || dx < -2e-4) continue;
          const dy = a[j + 1] - fy; if (dy > 2e-4 || dy < -2e-4) continue;
          const dz = a[j + 2] - fz; if (dz > 2e-4 || dz < -2e-4) continue;
          const mIdx = j + midOff;
          if (Math.abs(a[mIdx] - mx) > 2e-4 || Math.abs(a[mIdx + 1] - my) > 2e-4 || Math.abs(a[mIdx + 2] - mz) > 2e-4) continue;
          const lIdx = j + lastOff;
          if (Math.abs(a[lIdx] - lx) > 2e-4 || Math.abs(a[lIdx + 1] - ly) > 2e-4 || Math.abs(a[lIdx + 2] - lz) > 2e-4) continue;
          r.range = { mesh: be.mesh, start: j / 3, count: n, stillCopy: a.slice(j, j + n * 3), hidden: false };
          return true;
        }
      }
      return false;
    };
    let matched = 0;
    for (const e of entries) {
      for (const r of e.recs) {
        if (r.range || r.unbaked) { matched++; continue; }
        // If bakeStatic kept this mesh untouched (unique material or named), hide via .visible!
        if (r.mesh.parent) {
          r.unbaked = r.mesh;
          matched++;
          continue;
        }
        // Pass 1: exact same material, triangle-aligned stride (matches ~95% in O(1) meshes)
        const sameMat = byMat.get(r.mat);
        if (sameMat && scanPool(r, sameMat, 9)) { matched++; continue; }
        // Pass 2: cutaway-cloned material groups (triangle-aligned)
        if (cutawayBaked.length && scanPool(r, cutawayBaked, 9)) { matched++; continue; }
        // Pass 3: full fallback with vertex stride 3
        if (scanPool(r, bakedList, 3)) { matched++; }
      }
    }
    return matched;
  }

  function setRecsHidden(recs, hide) {
    let any = false;
    for (const r of recs) {
      if (r.unbaked) {
        if (r.unbaked.visible === hide) { r.unbaked.visible = !hide; any = true; }
      } else if (r.range) {
        const rg = r.range;
        if (rg.hidden === hide) continue;
        const P = rg.mesh.geometry.attributes.position, a = P.array, s = rg.start * 3, n = rg.count * 3;
        if (hide) {
          const x = a[s], y = a[s + 1], z = a[s + 2];
          for (let k = 0; k < n; k += 3) { a[s + k] = x; a[s + k + 1] = y; a[s + k + 2] = z; }
          rg.hidden = true;
        } else {
          a.set(rg.stillCopy, s);
          rg.hidden = false;
        }
        if (P.addUpdateRange) P.addUpdateRange(s, n);
        P.needsUpdate = true;
        any = true;
      }
    }
    return any;
  }

  function hasAnyBinding(e) {
    return e.recs.some((r) => !!(r.range || r.unbaked));
  }

  // ---- Pooled loose/debris objects (ZERO allocations after warm())
  const groupPool = [];
  const meshPool = [];
  const pieces = [];
  let warmed = false, primer = null, primed = false;

  function takeMesh(geo, mat, shadow) {
    const m = meshPool.pop() || new T.Mesh(geo, mat);
    m.geometry = geo; m.material = mat; m.castShadow = shadow; m.receiveShadow = true;
    m.visible = true; m.frustumCulled = true; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
    return m;
  }

  function releasePiece(p) {
    const idx = pieces.indexOf(p);
    if (idx >= 0) pieces.splice(idx, 1);
    if (p.group.parent) p.group.parent.remove(p.group);
    for (const m of p.meshes) { p.group.remove(m); meshPool.push(m); }
    p.meshes.length = 0;
    groupPool.push(p.group);
    if (p.entry) {
      if (p.entry.piece === p) { p.entry.piece = null; if (p.entry.state !== 'broken' && p.entry.kind !== 'medBoxStack') offSolid(p.entry); }
      const si = p.entry.stackPieces.indexOf(p);
      if (si >= 0) p.entry.stackPieces.splice(si, 1);
      if (p.entry.cavityPiece === p) p.entry.cavityPiece = null;
    }
    p.entry = null; p.jet = null; p.mounted = null;
  }

  function addPiece(shape, centre, opts = {}) {
    if (!shape || !shape.subparts || !shape.subparts.length) return null;
    while (pieces.length >= DESTRUCT_LIMITS.maxPieces) {
      let k = pieces.findIndex((p) => p.debris && p.resting);
      if (k < 0) k = pieces.findIndex((p) => p.debris && !p.jet);
      if (k < 0) k = pieces.findIndex((p) => !p.jet && !p.mounted);
      if (k < 0) k = 0;
      releasePiece(pieces[k]);
    }
    const grp = groupPool.pop() || new T.Group();
    grp.name = 'training-destruct-piece';
    grp.position.copy(centre);
    grp.scale.set(1, 1, 1);
    if (opts.quat) grp.quaternion.copy(opts.quat); else grp.quaternion.set(0, 0, 0, 1);
    const meshes = [];
    const shadow = opts.shadow !== false && !opts.paper;
    for (const sp of shape.subparts) {
      const m = takeMesh(sp.geo, sp.mat, shadow);
      grp.add(m);
      meshes.push(m);
    }
    if (root) root.add(grp);
    const p = {
      group: grp,
      meshes,
      shape,
      corners: shape.corners,
      thin: shape.thin,
      long: shape.long,
      radius: shape.radius || 0.12,
      vel: V3(),
      ang: V3(),
      rest: 0,
      resting: !!opts.resting,
      life: 0,
      fade: 0,
      paper: !!opts.paper,
      debris: !!opts.debris,
      bounce: opts.bounce ?? 0.25,
      entry: opts.entry || null,
      mounted: opts.mounted || null,
      jet: opts.jet || null,
      stillMounted: !!opts.stillMounted
    };
    pieces.push(p);
    return p;
  }

  function offSolid(e) {
    const s = e.solid;
    s.minX = s.maxX = s.minY = s.maxY = s.minZ = s.maxZ = -1e9;
  }

  function followSolid(e) {
    const list = e.kind === 'medBoxStack' && e.stackPieces.length ? e.stackPieces : (e.piece ? [e.piece] : []);
    if (!list.length) return offSolid(e);
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of list) {
      p.group.updateMatrix();
      for (const c of p.corners) {
        tmpV.copy(c).applyMatrix4(p.group.matrix);
        if (tmpV.x < minX) minX = tmpV.x; if (tmpV.x > maxX) maxX = tmpV.x;
        if (tmpV.y < minY) minY = tmpV.y; if (tmpV.y > maxY) maxY = tmpV.y;
        if (tmpV.z < minZ) minZ = tmpV.z; if (tmpV.z > maxZ) maxZ = tmpV.z;
      }
    }
    const s = e.solid;
    s.minX = minX + O.x; s.maxX = maxX + O.x; s.minY = minY + O.y; s.maxY = maxY + O.y; s.minZ = minZ + O.z; s.maxZ = maxZ + O.z;
  }

  const toLocal = (p) => ({ x: p.x - O.x, y: p.y - O.y, z: p.z - O.z });
  const toWorld = (p) => ({ x: p.x + O.x, y: p.y + O.y, z: p.z + O.z });
  function centreOf(e) {
    const s = e.solid;
    return { x: (s.minX + s.maxX) * 0.5 - O.x, y: (s.minY + s.maxY) * 0.5 - O.y, z: (s.minZ + s.maxZ) * 0.5 - O.z };
  }

  function kickPiece(p, dir, power, at) {
    if (!p) return;
    tmpV.set(dir.x || 0, dir.y || 0, dir.z || 0);
    if (tmpV.lengthSq() < 1e-9) tmpV.set(0, 0, 1);
    tmpV.normalize();
    p.vel.addScaledVector(tmpV, power * (p.paper ? 0.55 : 1));
    p.vel.y += power * (p.paper ? 0.48 : 0.42);
    if (at) tmpV2.set(at.x, at.y, at.z).sub(p.group.position);
    else tmpV2.set(rnd() - 0.5, 0.25, rnd() - 0.5).multiplyScalar(0.12);
    tmpV2.cross(tmpV).multiplyScalar(power * 42);
    p.ang.add(tmpV2);
    p.ang.x += (rnd() - 0.5) * power * 3.5;
    p.ang.y += (rnd() - 0.5) * power * 3.5;
    p.ang.z += (rnd() - 0.5) * power * 3.5;
    if (p.ang.lengthSq() > DESTRUCT_LIMITS.maxAng * DESTRUCT_LIMITS.maxAng) p.ang.setLength(DESTRUCT_LIMITS.maxAng);
    p.resting = false; p.rest = 0;
  }

  function spawnExtraParts(list, dir, power, opts = {}) {
    if (!list) return;
    for (const sh of list) {
      const p = addPiece(sh, sh.centre, { debris: true, ...opts });
      kickPiece(p, { x: dir.x + (rnd() - 0.5) * 1.1, y: 0.45 + rnd() * 0.6, z: dir.z + (rnd() - 0.5) * 1.1 }, power * (0.55 + rnd() * 0.5), null);
    }
  }

  function breakIntoBits(e, dir, power, basePiece = null, paperBits = false) {
    const bits = e.prep.bits || [];
    if (basePiece) {
      basePiece.group.updateMatrix();
      qB.copy(basePiece.group.quaternion);
      pB.copy(basePiece.group.position);
      sB.copy(basePiece.group.scale);
      releasePiece(basePiece);
    } else if (e.prep.body) {
      qB.set(0, 0, 0, 1);
      pB.copy(e.prep.body.centre);
      sB.set(1, 1, 1);
    } else {
      const c = centreOf(e);
      qB.set(0, 0, 0, 1);
      pB.set(c.x, c.y, c.z);
      sB.set(1, 1, 1);
    }
    for (const b of bits) {
      atV.copy(b.centre).multiply(sB).applyQuaternion(qB).add(pB);
      const sp = addPiece(b, atV, { debris: true, quat: qB, paper: paperBits });
      if (sp) {
        const ox = (atV.x - pB.x) * 6, oz = (atV.z - pB.z) * 6;
        kickPiece(sp, { x: (dir.x || 0) + ox + (rnd() - 0.5) * 0.8, y: 0.5 + rnd() * 0.5, z: (dir.z || 0) + oz + (rnd() - 0.5) * 0.8 }, power * (0.65 + rnd() * 0.45), null);
      }
    }
  }

  // Gravity support cascade: if a supporting prop broke (e.g. lower sandbags), drop what sat on top
  function checkSupports(brokenId) {
    for (const other of entries) {
      if (!other.supports || other.state === 'broken' || !other.supports.includes(brokenId)) continue;
      const aliveSupports = other.supports.filter((sid) => {
        const s = byId.get(sid);
        return s && s.state !== 'broken';
      }).length;
      if (aliveSupports === 0 || (other.supports.length >= 2 && aliveSupports === 1)) {
        if (other.state === 'still' && hasAnyBinding(other)) {
          setRecsHidden(other.recs, true);
          other.state = 'loose';
          other.piece = addPiece(other.prep.body, other.prep.body.centre, { entry: other, bounce: 0.12 });
        }
        if (other.piece) {
          other.piece.resting = false;
          other.piece.rest = 0;
          const tiltSign = aliveSupports === 1 ? (rnd() < 0.5 ? -1 : 1) : 0;
          other.piece.vel.x += tiltSign * 0.45;
          other.piece.ang.z += tiltSign * 2.2;
        }
      }
    }
  }

  // ---- Pressurized Oxygen Cylinder Rupture
  function ruptureOxygen(e, dir) {
    if (e.state === 'broken') return;
    const p = e.piece;
    const posL = p ? p.group.position.clone() : (e.prep.body ? e.prep.body.centre.clone() : V3(0, 0.4, 0));
    const wPt = toWorld(posL);
    if (e.state === 'still') setRecsHidden(e.recs, true);
    e.state = 'broken';
    offSolid(e);
    breakIntoBits(e, dir || { x: 0, y: 1, z: 0 }, 3.4, p, false);
    // Knock nearby destructible props in the room (not across walls)
    for (const o of entries) {
      if (o === e || o.state === 'broken') continue;
      const oc = centreOf(o), dx = oc.x - posL.x, dy = oc.y - posL.y, dz = oc.z - posL.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > DESTRUCT_LIMITS.o2RuptureRadius) continue;
      // Same room check
      if ((posL.x < -8) !== (oc.x < -8)) continue;
      const dl = d || 1, k = 1 - d / DESTRUCT_LIMITS.o2RuptureRadius;
      take(o, oc, { x: dx / dl, y: 0.55, z: dz / dl }, 55 * k, 'blast');
    }
    emit({ type: 'o2Rupture', id: e.id, point: wPt, radius: DESTRUCT_LIMITS.o2RuptureRadius });
  }

  // ---- Main Hit / Destruction Logic per Prop Kind
  function take(e, at, dir, damage = 20, kind = 'bullet') {
    if (e.state === 'broken') return false;
    if (!boundOnce) bind();
    if (!hasAnyBinding(e)) return false;

    const power = Math.min(4.2, 1.15 + (damage || 1) * 0.04) * (KICK_MULT[kind] || 1) / e.mass;
    const dIn = dir || { x: 0, y: 0, z: 1 };
    const wPt = at ? toWorld(at) : toWorld(centreOf(e));
    const isBlast = kind === 'blast';
    const isMelee = kind === 'melee';
    const isFire = kind === 'fire';

    // 1. Flickering fluorescent tube (1-hit glass + phosphor shatter)
    if (e.kind === 'flickerTube') {
      e.hits++;
      e.state = 'broken';
      offSolid(e);
      if (e.onShatter) e.onShatter(true);
      // Rain glass & phosphor dust from three spots along the 3.2m tube
      const c = { x: (e.still.minX + e.still.maxX) * 0.5, y: (e.still.minY + e.still.maxY) * 0.5, z: (e.still.minZ + e.still.maxZ) * 0.5 };
      for (const dz of [-1.0, 0, 1.0]) {
        emit({ type: 'break', id: e.id, fx: 'phosphor', point: { x: c.x - 0.06, y: c.y, z: c.z + dz }, dir: { x: -1, y: -0.3, z: 0 }, kind });
      }
      return true;
    }

    // 2. Containment gate warning beacons (2 hits or 1 blast shatters amber glass lens)
    if (e.kind === 'beacon') {
      e.hits += isBlast ? 2 : 1;
      if (e.hits < e.hp) {
        emit({ type: 'hit', id: e.id, fx: 'steel', point: wPt, dir: dIn, kind });
        return true;
      }
      e.state = 'broken';
      offSolid(e);
      setRecsHidden(e.recs, true);
      emit({ type: 'break', id: e.id, fx: 'amberGlass', point: wPt, dir: { x: 0, y: -0.2, z: -1 }, kind });
      return true;
    }

    // 3. Pinned/taped paper (Roster, Calendar, PGB Notes)
    if (e.kind === 'paper') {
      e.hits++;
      setRecsHidden(e.recs, true);
      e.state = 'broken';
      offSolid(e);
      const wn = e.wallNormal || { x: 0, z: 1 };
      const outDir = { x: wn.x * 1.1 + dIn.x * 0.25, y: 0.45, z: wn.z * 1.1 + dIn.z * 0.25 };
      breakIntoBits(e, outDir, Math.min(2.2, power * 0.9), null, true);
      emit({ type: 'break', id: e.id, fx: isFire ? 'ember' : 'paper', extraFx: isFire ? 'paper' : null, point: wPt, dir: outDir, kind });
      return true;
    }

    // 4. Pressurized Oxygen Cylinder (Stage 1: valve shears + O2 rocket jet; Stage 2: concussive rupture!)
    if (e.kind === 'oxygen') {
      if (e.state === 'venting') {
        ruptureOxygen(e, dIn);
        return true;
      }
      if (isBlast || isFire) {
        if (e.prep.extraParts.valve) spawnExtraParts(e.prep.extraParts.valve, { x: dIn.x, y: 1.2, z: dIn.z }, power * 1.2);
        ruptureOxygen(e, dIn);
        return true;
      }
      // Stage 1: Shear valve off, launch cylinder skidding/rocketing propelled by pressurized O2!
      setRecsHidden(e.recs, true);
      e.state = 'venting';
      e.hits++;
      if (e.prep.extraParts.valve) spawnExtraParts(e.prep.extraParts.valve, { x: dIn.x * 0.6, y: 1.4, z: dIn.z * 0.6 }, power * 1.2);
      const cyl = addPiece(e.prep.body, e.prep.body.centre, {
        entry: e,
        bounce: 0.38,
        jet: { timer: DESTRUCT_LIMITS.o2JetTime, fxCd: 0, hissCd: 0 }
      });
      e.piece = cyl;
      if (cyl) {
        // Tip the cylinder nearly horizontal out of the cart so the sheared neck (+Y) vents backward (-z/-x)
        // and rockets the bottle smoothly out into the open Build Room hangar (+z/+x)!
        const tx = Math.max(0.25, (dIn.x || 0) * 0.45 + 0.42);
        const tz = Math.max(0.55, (dIn.z || 0) * 0.45 + 0.85);
        const tl = Math.hypot(tx, tz) || 1;
        const fx = tx / tl, fz = tz / tl;
        // Align local +Y (neck/nozzle) opposite to travel direction (-fx, 0.18, -fz) so -Y thrust drives forward!
        axTmp.set(-fx, 0.18, -fz).normalize();
        cyl.group.quaternion.setFromUnitVectors(AXES[1], axTmp);
        cyl.vel.set(fx * 3.8, 1.35, fz * 3.8);
        cyl.ang.set((rnd() - 0.5) * 1.4, (rnd() < 0.5 ? -1 : 1) * (1.2 + rnd() * 1.1), (rnd() - 0.5) * 1.4);
      }
      emit({ type: 'o2Launch', id: e.id, point: wPt, dir: dIn });
      return true;
    }

    // 5. IV Saline Bag (1-hit burst: cyan saline spray + glossy vinyl puddle + scraps)
    if (e.kind === 'ivBag') {
      e.hits++;
      setRecsHidden(e.recs, true);
      e.state = 'broken';
      offSolid(e);
      breakIntoBits(e, dIn, power * 0.7, null, true);
      addSpill('saline', wPt, 0.48);
      emit({ type: 'break', id: e.id, fx: 'saline', point: wPt, dir: dIn, kind });
      return true;
    }

    // 6. IV Pole Stand (topples onto the infirmary floor with metallic clang, bursting IV bag if still hanging!)
    if (e.kind === 'ivStand') {
      e.hits++;
      if (e.state === 'still') {
        setRecsHidden(e.recs, true);
        e.state = 'loose';
        e.piece = addPiece(e.prep.body, e.prep.body.centre, { entry: e, bounce: 0.22 });
      }
      if (e.piece) {
        kickPiece(e.piece, { x: dIn.x * 0.75 + 0.3, y: 0.15, z: dIn.z * 0.75 + 0.2 }, power * 0.9, at);
        e.piece.ang.x += (dIn.z || 0.6) * 5.2;
        e.piece.ang.z -= (dIn.x || 0.6) * 5.2;
      }
      // If IV saline bag is still attached, knock/burst it!
      if (e.linked) {
        const bag = byId.get(e.linked);
        if (bag && bag.state === 'still') take(bag, null, dIn, 20, kind);
      }
      emit({ type: 'hit', id: e.id, fx: 'steel', point: wPt, dir: dIn, kind });
      return true;
    }

    // 7. Two-Stage Monitors (Cracked Wall Monitor & Portable Medical Vitals Monitor)
    if (e.kind === 'monitor') {
      e.hits += isBlast ? 2 : 1;
      if (e.state === 'still' && e.hits < e.hp) {
        // Stage 1: Glass screen implodes, masking tape & linked note flutter loose, screen dies dark!
        e.state = 'damaged';
        if (e.screenRecs.length) setRecsHidden(e.screenRecs, true);
        if (e.tapeRecs.length) setRecsHidden(e.tapeRecs, true);
        if (e.prep.cavity) {
          e.cavityPiece = addPiece(e.prep.cavity, e.prep.cavity.centre, { entry: e, resting: true, stillMounted: true, shadow: false });
          e.flickerT = 0.36;
        }
        const wn = e.wallNormal || { x: 0, z: 1 };
        const outD = { x: wn.x * 1.1, y: 0.4, z: wn.z * 1.1 };
        if (e.prep.extraParts.tape) spawnExtraParts(e.prep.extraParts.tape, outD, Math.min(2.2, power), { paper: true });
        if (e.linked) {
          const note = byId.get(e.linked);
          if (note && note.state === 'still') take(note, null, outD, 15, kind);
        }
        emit({ type: 'break', id: e.id, fx: 'glass', extraFx: 'electronics', point: wPt, dir: outD, kind });
        return true;
      }
      // Stage 2: Dead monitor casing shears clean off its bracket/cabinet and tumbles onto the floor sparking & smoking!
      if (e.cavityPiece) releasePiece(e.cavityPiece);
      setRecsHidden(e.recs, true);
      if (e.linked) {
        const note = byId.get(e.linked);
        if (note && note.state === 'still') take(note, null, dIn, 15, kind);
      }
      const wn = e.wallNormal || { x: 0, z: 1 };
      const outD = { x: wn.x * 1.25 + dIn.x * 0.4, y: 0.45, z: wn.z * 1.25 + dIn.z * 0.4 };
      e.state = 'broken';
      offSolid(e);
      if (e.prep.body) {
        const fallen = addPiece(e.prep.body, e.prep.body.centre, { debris: true, bounce: 0.24 });
        kickPiece(fallen, outD, power * 1.05, at);
      }
      emit({ type: 'break', id: e.id, fx: 'electronics', extraFx: 'glass', point: wPt, dir: outD, kind });
      return true;
    }

    // 8. Two-Stage Wall Signs & DAYS WITHOUT INCIDENT Board (crooked wobble -> shears off onto floor!)
    if (e.kind === 'sign') {
      e.hits += isBlast ? 3 : 1;
      const wn = e.wallNormal || { x: 0, z: 1 };
      if (e.hits < e.hp) {
        if (e.state === 'still') {
          setRecsHidden(e.recs, true);
          e.state = 'damaged';
          const tiltTarget = (rnd() < 0.5 ? -1 : 1) * 0.24;
          const nl = Math.hypot(wn.x || 0, wn.z || 0) || 1;
          e.piece = addPiece(e.prep.body, e.prep.body.centre, {
            entry: e,
            bounce: 0.22,
            mounted: { nx: (wn.x || 0) / nl, nz: (wn.z || 0) / nl, target: tiltTarget, angle: 0, vel: tiltTarget * 12 }
          });
        } else if (e.piece && e.piece.mounted) {
          e.piece.mounted.vel += (e.piece.mounted.target > 0 ? 1 : -1) * 8;
        }
        emit({ type: 'hit', id: e.id, fx: 'steel', point: wPt, dir: dIn, kind });
        return true;
      }
      // Detach clean off the wall bracket and tumble onto the floor!
      if (e.state === 'still') {
        setRecsHidden(e.recs, true);
        e.piece = addPiece(e.prep.body, e.prep.body.centre, { entry: e, bounce: 0.24 });
      }
      if (e.piece) {
        e.piece.mounted = null;
        e.state = 'loose';
        const outD = { x: wn.x * 1.2 + dIn.x * 0.35, y: 0.35, z: wn.z * 1.2 + dIn.z * 0.35 };
        kickPiece(e.piece, outD, power * 1.05, at);
        e.hp = Infinity; // Once detached on the floor, steel plate clangs & slides if shot again
      }
      emit({ type: 'break', id: e.id, fx: 'steel', extraFx: 'concrete', point: wPt, dir: wn, kind });
      return true;
    }

    // 9. Stacked Burlap Sandbags (per-hit slump + sand spout; rupture -> burlap shreds + sand cloud + slumped sand mound + gravity cascade!)
    if (e.kind === 'sandbag') {
      e.hits += (isBlast || isMelee) ? e.hp : 1;
      if (e.hits < e.hp) {
        if (e.state === 'still') {
          setRecsHidden(e.recs, true);
          e.state = 'loose';
          e.piece = addPiece(e.prep.body, e.prep.body.centre, { entry: e, bounce: 0.08, resting: true });
        }
        if (e.piece) {
          e.slump++;
          const m = e.piece.group;
          m.scale.set(1 + e.slump * 0.04, Math.max(0.7, 1 - e.slump * 0.12), 1 + e.slump * 0.04);
          // Re-seat bottom on ground/support
          const drop = (e.prep.body.hi.y - e.prep.body.lo.y) * 0.06;
          m.position.y = Math.max(e.prep.body.lo.y + (e.prep.body.hi.y - e.prep.body.lo.y) * 0.35, m.position.y - drop);
          followSolid(e);
        }
        emit({ type: 'hit', id: e.id, fx: 'sand', point: wPt, dir: dIn, kind });
        return true;
      }
      // Rupture!
      const posL = e.piece ? e.piece.group.position.clone() : e.prep.body.centre.clone();
      setRecsHidden(e.recs, true);
      e.state = 'broken';
      offSolid(e);
      breakIntoBits(e, dIn, power * 0.9, e.piece, true);
      addSandMound(posL.x, posL.z, 0.45, 0.088);
      checkSupports(e.id);
      emit({ type: 'break', id: e.id, fx: 'burlap', point: toWorld(posL), dir: dIn, kind });
      return true;
    }

    // 10. Stacked Medical Supply Boxes (3 boxes scatter individually on hit 1, burst on hit 2!)
    if (e.kind === 'medBoxStack') {
      e.hits += isBlast ? 2 : 1;
      if (e.state === 'still' && e.hits < e.hp) {
        setRecsHidden(e.recs, true);
        e.state = 'loose';
        e.stackPieces = [];
        const boxes = e.prep.stackBodies || [];
        boxes.forEach((sb, idx) => {
          const bp = addPiece(sb, sb.centre, { entry: e, bounce: 0.22 });
          if (bp) {
            e.stackPieces.push(bp);
            const mult = 0.75 + idx * 0.38;
            kickPiece(bp, { x: dIn.x + (rnd() - 0.5) * 0.9, y: 0.45 + idx * 0.25, z: dIn.z + (rnd() - 0.5) * 0.9 }, power * mult, null);
          }
        });
        followSolid(e);
        emit({ type: 'hit', id: e.id, fx: 'paper', point: wPt, dir: dIn, kind });
        return true;
      }
      setRecsHidden(e.recs, true);
      const firstPiece = e.stackPieces[0] || null;
      for (const sp of e.stackPieces.slice()) if (sp !== firstPiece) releasePiece(sp);
      e.stackPieces.length = 0;
      e.state = 'broken';
      offSolid(e);
      breakIntoBits(e, dIn, power * 1.1, firstPiece, true);
      emit({ type: 'break', id: e.id, fx: 'paper', extraFx: 'cloth', point: wPt, dir: dIn, kind });
      return true;
    }

    // 11. Generic loose-then-break props (radio, rackMuff, firstAid, obsChart, blanket)
    const first = e.state === 'still';
    if (first) {
      setRecsHidden(e.recs, true);
      e.state = 'loose';
      e.piece = addPiece(e.prep.body, e.prep.body.centre, { entry: e, bounce: e.kind === 'blanket' ? 0.08 : 0.26 });
      if (e.prep.extraParts.antenna) spawnExtraParts(e.prep.extraParts.antenna, dIn, power * 1.15);
      if (e.prep.extraParts.sheet) spawnExtraParts(e.prep.extraParts.sheet, dIn, power * 0.85, { paper: true });
    }
    e.hits += isBlast ? 2 : 1;
    if (e.hits >= e.hp && e.prep.bits && e.prep.bits.length) {
      const bPt = e.piece ? toWorld(e.piece.group.position) : wPt;
      e.state = 'broken';
      offSolid(e);
      breakIntoBits(e, dIn, power * 1.15, e.piece, false);
      const extraFx = e.kind === 'firstAid' ? 'paper' : e.kind === 'obsChart' ? 'paper' : e.kind === 'rackProp' ? 'cloth' : null;
      emit({ type: 'break', id: e.id, fx: e.breakFx, extraFx, point: bPt, dir: dIn, kind });
      return true;
    }
    if (e.piece) kickPiece(e.piece, dIn, power, at);
    emit({ type: 'hit', id: e.id, fx: e.fx, point: wPt, dir: dIn, kind, first });
    return true;
  }

  function hit(solid, point, dir, damage = 20, kind = 'bullet') {
    const e = solid && solid.destructIndex != null ? entries[solid.destructIndex] : null;
    return e ? take(e, point ? toLocal(point) : null, dir || { x: 0, y: 0, z: 1 }, damage, kind) : false;
  }

  function blast(point, radius = 4.5, power = 1, canReach = null) {
    if (!point) return 0;
    const c = toLocal(point); let n = 0;
    for (const e of entries) {
      if (e.state === 'broken') continue;
      const q = centreOf(e), dx = q.x - c.x, dy = q.y - c.y, dz = q.z - c.z, d = Math.hypot(dx, dy, dz);
      if (d > radius) continue;
      if (canReach && !canReach(point, toWorld(q), e.solid)) continue;
      const k = (1 - d / radius) * power, dl = d || 1;
      if (take(e, q, { x: dx / dl, y: 0.5, z: dz / dl }, 65 * k, 'blast')) n++;
    }
    return n;
  }

  function cut(from, dir, reach = 1.4, canReach = null) {
    if (!from || !dir) return 0;
    const f = toLocal(from), dl = Math.hypot(dir.x, dir.z) || 1; let n = 0;
    for (const e of entries) {
      if (e.state === 'broken' || e.kind === 'flickerTube' || e.kind === 'beacon') continue;
      const q = centreOf(e), dx = q.x - f.x, dz = q.z - f.z, d = Math.hypot(dx, dz);
      if (d > reach + 0.4 || (dx * dir.x + dz * dir.z) / (d * dl || 1) < 0.25) continue;
      if (canReach && !canReach({ x: from.x, y: q.y + O.y, z: from.z }, toWorld(q), e.solid)) continue;
      if (take(e, q, { x: dir.x / dl, y: 0.22, z: dir.z / dl }, 35, 'melee')) n++;
    }
    return n;
  }

  // Flamethrower interaction: ignites paper/cloth/sandbags, ruptures O2 cylinder fast, bursts IV saline bag with steam!
  function burn(worldPoint, dt) {
    if (!worldPoint || !(dt > 0)) return 0;
    const c = toLocal(worldPoint); let n = 0;
    for (const e of entries) {
      if (e.state === 'broken') continue;
      const q = centreOf(e), d = Math.hypot(q.x - c.x, q.y - c.y, q.z - c.z);
      if (d > 0.85) continue;
      if (e.kind === 'oxygen') {
        e.heat += dt;
        if (e.heat >= 0.25) { e.heat = 0; take(e, q, { x: 0, y: 1, z: 0 }, 50, 'fire'); n++; }
      } else if (e.kind === 'ivBag') {
        e.heat += dt;
        if (e.heat >= 0.35) { e.heat = 0; take(e, q, { x: 0, y: 0.5, z: 0 }, 20, 'fire'); n++; }
      } else if (e.kind === 'paper') {
        e.heat += dt;
        if (e.heat >= 0.28) { e.heat = 0; take(e, q, { x: 0, y: 1, z: 0 }, 20, 'fire'); n++; }
      } else if (e.flammable) {
        e.heat += dt;
        if (e.heat >= 0.95) {
          e.heat = 0;
          if (e.kind === 'blanket') {
            emit({ type: 'fx', id: e.id, fx: 'ember', point: toWorld(q), dir: { x: 0, y: 1, z: 0 }, scale: 0.8 });
          } else {
            take(e, q, { x: 0, y: 1, z: 0 }, 30, 'fire');
          }
          n++;
        }
      }
    }
    return n;
  }

  // Player walking into loose floor props gently nudges/kicks them aside
  function bump(worldPos, velXZ, radius = 0.42) {
    if (!pieces.length || !worldPos) return 0;
    const lx = worldPos.x - O.x, ly = worldPos.y - O.y, lz = worldPos.z - O.z;
    if (ly > 0.65) return 0;
    const spd = velXZ ? Math.hypot(velXZ.x || 0, velXZ.z || 0) : 0;
    let moved = 0;
    for (const p of pieces) {
      if (!p.entry || p.debris || p.paper || p.mounted || p.stillMounted || p.jet) continue;
      if (p.entry.kind === 'sandbag') continue; // heavy sandbags stay planted
      const m = p.group.position;
      if (m.y > 0.55) continue;
      const rad = Math.min(0.32, p.radius * 0.65) + radius;
      const dx = m.x - lx, dz = m.z - lz, d = Math.hypot(dx, dz);
      if (d <= 1e-4 || d >= rad) continue;
      const ux = dx / d, uz = dz / d, push = Math.min(2.6, 0.85 + spd * 0.45) / (p.entry.mass || 1);
      m.x += ux * (rad - d) * 0.6; m.z += uz * (rad - d) * 0.6;
      p.vel.x += ux * push; p.vel.z += uz * push; p.vel.y = Math.max(p.vel.y, 0.25 * push);
      p.ang.x += uz * push * 3.5; p.ang.z -= ux * push * 3.5;
      if (p.ang.lengthSq() > DESTRUCT_LIMITS.maxAng * DESTRUCT_LIMITS.maxAng) p.ang.setLength(DESTRUCT_LIMITS.maxAng);
      p.resting = false; p.rest = 0;
      followSolid(p.entry);
      emit({ type: 'bounce', id: p.entry.id, fx: p.entry.fx, point: toWorld(m), speed: push * 1.4 });
      moved++;
    }
    return moved;
  }

  // ---- Physics Integration
  function groundAt(x, z, y) {
    let g = 0;
    for (let i = 0; i < surfaces.length; i++) {
      const s = surfaces[i];
      if (x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ && y >= s.y - 0.06 && s.y > g) g = s.y;
    }
    return g;
  }

  function update(dt) {
    if (!warmed) warm();
    if (!primed) prime(true); else if (primer) prime(false);
    const hasSpills = spills.length > 0;
    const hasMounds = mounds.length > 0;
    if (!pieces.length && !hasSpills && !hasMounds) return 0;
    dt = Math.min(dt, 1 / 30);

    if (hasSpills) syncSpills(dt);
    if (hasMounds) syncMounds(dt);

    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i], g = p.group;
      // Static cavity on damaged monitor (brief dying spark flicker)
      if (p.stillMounted) {
        if (p.entry && p.entry.flickerT > 0) {
          p.entry.flickerT -= dt;
          if (rnd() < 0.25) emit({ type: 'fx', id: p.entry.id, fx: 'electronics', point: toWorld(g.position), dir: p.entry.wallNormal || { x: 0, y: 0.2, z: 1 }, scale: 0.35 });
        }
        continue;
      }
      // Crooked wall-mounted sign damped swing (around sign's outward face normal)
      if (p.mounted) {
        const mt = p.mounted;
        mt.vel += (-28 * (mt.angle - mt.target) - 5.5 * mt.vel) * dt;
        mt.angle += mt.vel * dt;
        wV.set(mt.nx || 0, 0, mt.nz || 1);
        g.quaternion.setFromAxisAngle(wV, mt.angle);
        if (Math.abs(mt.angle - mt.target) < 0.002 && Math.abs(mt.vel) < 0.01) { mt.angle = mt.target; mt.vel = 0; }
        continue;
      }
      if (p.resting) {
        if (p.debris && (p.life += dt) > DESTRUCT_LIMITS.fadeAfter) {
          p.fade += dt / DESTRUCT_LIMITS.fade;
          const s = Math.max(0, 1 - p.fade);
          g.scale.setScalar(s);
          if (s <= 0) releasePiece(p);
        }
        continue;
      }
      // Pressurized Oxygen Cylinder Rocket Thrust!
      if (p.jet) {
        const J = p.jet;
        J.timer -= dt;
        if (J.timer <= 0) {
          ruptureOxygen(p.entry, { x: p.vel.x, y: 0.6, z: p.vel.z });
          continue;
        }
        // Local +Y is cylinder neck; jet exits +Y so thrust accelerates along -Y!
        axTmp.set(0, 1, 0).applyQuaternion(g.quaternion).normalize();
        const thrust = DESTRUCT_LIMITS.o2Thrust * (0.65 + 0.35 * (J.timer / DESTRUCT_LIMITS.o2JetTime));
        p.vel.x -= axTmp.x * thrust * dt;
        p.vel.y += Math.max(-2.5, -axTmp.y * thrust * 0.35) * dt;
        p.vel.z -= axTmp.z * thrust * dt;
        // Keep cylinder mostly horizontal skimming/arcing across the floor instead of spinning in place
        const tiltErr = axTmp.y;
        p.ang.x += (rnd() - 0.5) * 2.6 * dt - axTmp.z * tiltErr * 3.0 * dt;
        p.ang.y += (rnd() - 0.5) * 4.5 * dt;
        p.ang.z += (rnd() - 0.5) * 2.6 * dt + axTmp.x * tiltErr * 3.0 * dt;
        if (p.ang.lengthSq() > 49) p.ang.setLength(7);
        if (p.vel.lengthSq() > 121) p.vel.setLength(11); // max 11 m/s safe skidding speed
        J.fxCd -= dt;
        if (J.fxCd <= 0) {
          J.fxCd = 0.028;
          nozTmp.copy(g.position).addScaledVector(axTmp, 0.38);
          emit({ type: 'o2Jet', id: p.entry.id, point: toWorld(nozTmp), dir: { x: axTmp.x, y: axTmp.y, z: axTmp.z } });
        }
        J.hissCd -= dt;
        if (J.hissCd <= 0) {
          J.hissCd = 0.36;
          emit({ type: 'o2Hiss', id: p.entry.id, point: toWorld(g.position), dur: 0.42 });
        }
      }

      p.vel.y -= (p.paper ? DESTRUCT_LIMITS.paperG : DESTRUCT_LIMITS.g) * dt;
      if (p.paper) {
        p.vel.multiplyScalar(1 - Math.min(1, 2.4 * dt));
        p.vel.x += Math.sin(p.life * 7 + i) * 0.65 * dt;
        p.vel.z += Math.cos(p.life * 5.3 + i) * 0.65 * dt;
        p.life += dt;
      }
      g.position.addScaledVector(p.vel, dt);
      const aLen = p.ang.length();
      if (aLen > 1e-6) {
        wV.copy(p.ang).divideScalar(aLen);
        qTmp.setFromAxisAngle(wV, aLen * dt);
        g.quaternion.premultiply(qTmp);
      }
      g.updateMatrix();
      let low = Infinity;
      for (let c = 0; c < p.corners.length; c++) {
        tmpV.copy(p.corners[c]).applyMatrix4(g.matrix);
        if (tmpV.y < low) low = tmpV.y;
      }
      const gy = groundAt(g.position.x, g.position.z, low);
      let touching = false;
      if (low < gy) {
        g.position.y += gy - low;
        touching = true;
        const impactVy = -p.vel.y;
        if (p.vel.y < 0) p.vel.y = p.vel.y < -0.55 ? -p.vel.y * (p.paper ? 0 : p.bounce) : 0;
        const fric = Math.min(1, (p.paper ? 12 : p.jet ? 1.8 : 6) * dt);
        p.vel.x *= 1 - fric; p.vel.z *= 1 - fric;
        p.ang.multiplyScalar(1 - Math.min(1, (p.jet ? 1.5 : 5) * dt));
        if (p.entry && !p.paper && impactVy > 1.2) {
          emit({ type: 'bounce', id: p.entry.id, fx: p.entry.fx, point: toWorld(g.position), speed: impactVy });
        }
        if (!p.jet) {
          let ax = p.thin;
          if (!ax) {
            let best = -1;
            for (const c of AXES) {
              if (c === p.long) continue;
              wV.copy(c).applyQuaternion(g.quaternion);
              const ay = Math.abs(wV.y);
              if (ay > best) { best = ay; ax = c; }
            }
          }
          if (ax) {
            wV.copy(ax).applyQuaternion(g.quaternion);
            upV.set(0, wV.y >= 0 ? 1 : -1, 0);
            qTmp.setFromUnitVectors(wV, upV);
            qInv.identity().slerp(qTmp, Math.min(1, 7 * dt));
            g.quaternion.premultiply(qInv);
          }
        }
      }
      // Keep strictly inside room walls
      for (const r of rooms) {
        if (g.position.x < r.minX - 0.5 || g.position.x > r.maxX + 0.5 || g.position.z < r.minZ - 0.5 || g.position.z > r.maxZ + 0.5) continue;
        const rad = Math.min(0.4, p.radius * 0.55);
        let wallHit = false;
        if (g.position.x < r.minX + rad) { g.position.x = r.minX + rad; p.vel.x = Math.abs(p.vel.x) * (p.jet ? 0.65 : 0.32); wallHit = true; }
        if (g.position.x > r.maxX - rad) { g.position.x = r.maxX - rad; p.vel.x = -Math.abs(p.vel.x) * (p.jet ? 0.65 : 0.32); wallHit = true; }
        if (g.position.z < r.minZ + rad) { g.position.z = r.minZ + rad; p.vel.z = Math.abs(p.vel.z) * (p.jet ? 0.65 : 0.32); wallHit = true; }
        if (g.position.z > r.maxZ - rad) { g.position.z = r.maxZ - rad; p.vel.z = -Math.abs(p.vel.z) * (p.jet ? 0.65 : 0.32); wallHit = true; }
        if (wallHit && p.jet) {
          emit({ type: 'bounce', id: p.entry.id, fx: 'steel', point: toWorld(g.position), speed: 4.0 });
          emit({ type: 'fx', id: p.entry.id, fx: 'steel', point: toWorld(g.position), dir: { x: 0, y: 0.4, z: 0 }, scale: 0.7 });
        }
        break;
      }
      // Keep out of furniture under-blocks (bench kick panel, medical cabinet, stretcher, lockers)
      for (const b of blocks) {
        const px = g.position.x, pz = g.position.z, r = 0.05;
        if (px < b.minX - (b.sides ? r : 0) || px > b.maxX + (b.sides ? r : 0) || pz < b.minZ - r || pz > b.maxZ + r || low > b.maxY) continue;
        const ex = b.sides ? Math.min(px - b.minX, b.maxX - px) : Infinity;
        const ez = Math.min(pz - b.minZ, b.maxZ - pz);
        if (ex < ez) {
          if (px - b.minX < b.maxX - px) { g.position.x = b.minX - r; p.vel.x = -Math.abs(p.vel.x) * 0.35; }
          else { g.position.x = b.maxX + r; p.vel.x = Math.abs(p.vel.x) * 0.35; }
        } else if (pz - b.minZ < b.maxZ - pz) { g.position.z = b.minZ - r; p.vel.z = -Math.abs(p.vel.z) * 0.35; }
        else { g.position.z = b.maxZ + r; p.vel.z = Math.abs(p.vel.z) * 0.35; }
      }
      if (!p.jet && touching && p.vel.lengthSq() < 0.004 && p.ang.lengthSq() < 0.1) {
        if ((p.rest += dt) > DESTRUCT_LIMITS.rest) {
          p.resting = true; p.vel.set(0, 0, 0); p.ang.set(0, 0, 0); p.life = 0;
        }
      } else {
        p.rest = 0;
      }
      if (p.entry && !p.debris) followSolid(p.entry);
    }
    return pieces.length + spills.length + mounds.length;
  }

  // ---- Warmup & GPU Shader/Buffer Priming (0 frame hitch on first shot!)
  function warm() {
    if (!boundOnce) bind();
    while (groupPool.length < DESTRUCT_LIMITS.maxPieces) {
      const g = new T.Group(); g.name = 'training-destruct-piece'; groupPool.push(g);
    }
    while (meshPool.length < DESTRUCT_LIMITS.maxPieces * 2) {
      const m = new T.Mesh(undefined, darkCavityMat); m.name = 'training-destruct-mesh'; meshPool.push(m);
    }
    warmed = true;
    return entries.length;
  }

  function prime(on) {
    if (on) {
      if (primer) return primer.children.length;
      warm();
      primer = new T.Group(); primer.name = 'training-destruct-primer';
      const seen = new Set();
      const addGeo = (geo, mat, c) => {
        if (!geo || !mat || seen.has(geo)) return;
        seen.add(geo);
        const m = new T.Mesh(geo, mat);
        m.position.copy(c); m.scale.setScalar(1e-4);
        m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
        primer.add(m);
      };
      for (const e of entries) {
        const c = V3((e.still.minX + e.still.maxX) * 0.5 - O.x, (e.still.minY + e.still.maxY) * 0.5 - O.y, (e.still.minZ + e.still.maxZ) * 0.5 - O.z);
        const shapes = [
          e.prep.body,
          e.prep.cavity,
          ...(e.prep.bits || []),
          ...(e.prep.stackBodies || []),
          ...Object.values(e.prep.extraParts || {}).flat()
        ].filter(Boolean);
        for (const sh of shapes) for (const sp of sh.subparts) addGeo(sp.geo, sp.mat, c);
      }
      // Also prime the batched spill and sand mound meshes with 1 zero-area degenerate draw
      if (!spills.length) {
        spillPos.array.fill(0, 0, SPILL_VERTS * 3); spillPos.needsUpdate = true;
        if (spillGeo.setDrawRange) spillGeo.setDrawRange(0, SPILL_VERTS);
        spillMesh.visible = true;
      }
      if (!mounds.length) {
        moundPos.array.fill(0, 0, SAND_MOUND_VERTS * 3); moundPos.needsUpdate = true;
        if (moundGeo.setDrawRange) moundGeo.setDrawRange(0, SAND_MOUND_VERTS);
        moundMesh.visible = true;
      }
      if (root) root.add(primer);
      primed = true;
      return primer.children.length;
    }
    if (primer) {
      if (primer.parent) primer.parent.remove(primer);
      primer = null;
    }
    if (!spills.length) { spillMesh.visible = false; if (spillGeo.setDrawRange) spillGeo.setDrawRange(0, 0); }
    if (!mounds.length) { moundMesh.visible = false; if (moundGeo.setDrawRange) moundGeo.setDrawRange(0, 0); }
    return 0;
  }

  function reset() {
    for (const p of pieces.slice()) releasePiece(p);
    spills.length = 0; spillNext = 0;
    spillMesh.visible = false; if (spillGeo.setDrawRange) spillGeo.setDrawRange(0, 0);
    mounds.length = 0;
    moundMesh.visible = false; if (moundGeo.setDrawRange) moundGeo.setDrawRange(0, 0);
    for (const e of entries) {
      if (e.state !== 'still') {
        setRecsHidden(e.recs, false);
        if (e.savedMats) { for (const [m, mat] of e.savedMats) m.material = mat; e.savedMats = null; }
        if (e.onShatter) e.onShatter(false);
      }
      e.state = 'still'; e.hits = 0; e.heat = 0; e.slump = 0; e.flickerT = 0;
      e.hp = e.baseHp;
      e.piece = null; e.stackPieces.length = 0; e.cavityPiece = null;
      Object.assign(e.solid, e.still);
    }
  }

  function dispose() {
    reset();
    prime(false);
    if (spillMesh.parent) spillMesh.parent.remove(spillMesh);
    if (moundMesh.parent) moundMesh.parent.remove(moundMesh);
    for (const g of ownedGeos) g.dispose && g.dispose();
    for (const m of ownedMats) m.dispose && m.dispose();
    for (const t of ownedTexs) t.dispose && t.dispose();
    ownedGeos.length = 0; ownedMats.length = 0; ownedTexs.length = 0;
  }

  return {
    solids: entries.map((e) => e.solid),
    entries,
    stillMeshes,
    hit,
    blast,
    cut,
    burn,
    bump,
    addSpill,
    update,
    reset,
    bind,
    warm,
    prime,
    dispose,
    setEventHandler: (fn) => { emitEvent = typeof fn === 'function' ? fn : null; },
    loose: () => pieces.length,
    spills: () => spills.length,
    mounds: () => mounds.length,
    pieces: () => pieces,
    byId: (id) => byId.get(id) || null
  };
}

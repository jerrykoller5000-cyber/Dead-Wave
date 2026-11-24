// world/world-filler-props.js — AG-418: Sculpted, WebGPU-PBR hero vignettes & lived-in valley micro-props.
// Reuses cached PBR libraries (fob-textures, cave-entrance-textures, rock-textures) for zero cold-load
// texture bloat, adheres strictly to docs/art-direction.md (four families, <45% natural saturation,
// reserved accent discipline) and docs/asset-principles.md (silhouette first, functional construction,
// grounded skirts so zero edges float on slopes). Node/fakethree safe.

import { getFobPBR, applyWorldUVByMaterial } from './fob-textures.js';
import { getCaveEntrancePBR, makeStenciledPlacardTexture } from './cave-entrance-textures.js';
import { getRockTextureLibrary, applyRockPBR } from './rock-textures.js';
import { buildCompactStoneGeometry, projectStoneBoxUV } from './rock-geometry.js';

const MAT_CACHE = new WeakMap();

// Shared radial glow DataTexture (32x32, 4 KB) for restrained amber lantern pools, strobes & night fireflies.
function getRadialGlowTexture(T) {
  if (!T || typeof T.DataTexture !== 'function' || T.STAND_IN) return null;
  let cache = MAT_CACHE.get(T);
  if (cache && cache._glowTex) return cache._glowTex;
  const N = 32;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const nx = (x + 0.5) * 2 / N - 1;
      const ny = (y + 0.5) * 2 / N - 1;
      const r = Math.hypot(nx, ny);
      const a = Math.max(0, 1 - r);
      const v = Math.round(255 * a * a * a);
      const o = (y * N + x) * 4;
      data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = v;
    }
  }
  const tex = new T.DataTexture(data, N, N, T.RGBAFormat);
  tex.needsUpdate = true;
  if (!cache) { cache = {}; MAT_CACHE.set(T, cache); }
  cache._glowTex = tex;
  return tex;
}

export function getFillerMaterials(T) {
  let cache = MAT_CACHE.get(T);
  if (cache && cache.ready) return cache;
  const fob = getFobPBR(T);
  const cave = getCaveEntrancePBR(T);
  const rocks = getRockTextureLibrary(T);

  const mk = (pbrSet, opts, fallback) => {
    if (pbrSet && typeof pbrSet.opts === 'function') {
      return new T.MeshStandardMaterial(pbrSet.opts(opts));
    }
    return new T.MeshStandardMaterial(fallback);
  };
  const mkRock = (rockKey, color, rough = 0.93, normalMul = 1.0) => {
    const m = new T.MeshStandardMaterial({ color, roughness: rough, metalness: 0.03 });
    if (rocks && rocks[rockKey]) applyRockPBR(m, rocks[rockKey], { selfColored: false, normalMul });
    return m;
  };

  const mats = {
    ready: true,
    _glowTex: (cache && cache._glowTex) || null,
    // Military family (PGB / FOB Threshold)
    oliveCrate: mk(fob?.wrinkleOlive, { color: 0x7b8568, normalScale: 0.95 }, { color: 0x4d573e, roughness: 0.72, metalness: 0.12 }),
    oliveSteel: mk(cave?.pgbOliveMetal, { color: 0x8e997e, normalScale: 0.95 }, { color: 0x46513c, roughness: 0.58, metalness: 0.45 }),
    bunkerConcrete: mk(fob?.bunkerConcrete, { color: 0x9ea29d, normalScale: 1.05 }, { color: 0x7c807b, roughness: 0.92, metalness: 0.02 }),
    bunkerSteel: mk(fob?.bunkerSteel, { color: 0x79828b, normalScale: 0.95 }, { color: 0x434a52, roughness: 0.56, metalness: 0.58 }),
    galvSteel: mk(fob?.galvSteel, { color: 0x9fa6ab, normalScale: 0.85 }, { color: 0x7d848a, roughness: 0.48, metalness: 0.75 }),
    hazardChevron: mk(fob?.hazardChevron, { color: 0xcfc4a8, normalScale: 0.9 }, { color: 0xa6893a, roughness: 0.7, metalness: 0.12 }),
    sandbagCanvas: mk(cave?.tarpCanvas, { color: 0x9c8e73, normalScale: 1.05 }, { color: 0x85785d, roughness: 0.94, metalness: 0.0 }),
    chuteDrab: mk(cave?.tarpCanvas, { color: 0xa8ab97, normalScale: 0.85, side: T.DoubleSide }, { color: 0x8f9380, roughness: 0.9, metalness: 0.0, side: T.DoubleSide }),
    brass: new T.MeshStandardMaterial({ color: 0xb08d42, roughness: 0.42, metalness: 0.82 }),
    redDanger: new T.MeshStandardMaterial({ color: 0x8e3026, roughness: 0.65, metalness: 0.12 }),
    // Settler & civil family (Coldwater / Trapper / Rangers / Hikers)
    weatheredTimber: mk(cave?.creosoteTimber, { color: 0xa58e72, normalScale: 1.05 }, { color: 0x5c4834, roughness: 0.92, metalness: 0.02 }),
    wetTimber: mk(cave?.wetTimber, { color: 0x8d7b66, normalScale: 1.05 }, { color: 0x45392c, roughness: 0.85, metalness: 0.02 }),
    plankWood: mk(fob?.deskWood, { color: 0xaa9272, normalScale: 0.9 }, { color: 0x735b41, roughness: 0.88, metalness: 0.02 }),
    barkWood: mk(cave?.gnarledBark, { color: 0x8f7a62, normalScale: 1.1 }, { color: 0x4b3b2c, roughness: 0.95, metalness: 0.0 }),
    heartwood: new T.MeshStandardMaterial({ color: 0xa4865f, roughness: 0.86, metalness: 0.0 }),
    forgedIron: mk(cave?.forgedIron, { color: 0x676b69, normalScale: 1.0 }, { color: 0x383c3a, roughness: 0.72, metalness: 0.62 }),
    rustedIron: mk(cave?.forgedIron, { color: 0x865d42, normalScale: 1.1 }, { color: 0x6b452d, roughness: 0.84, metalness: 0.35 }),
    ropeTan: mk(cave?.tarpCanvas, { color: 0xb49f7b, normalScale: 0.9 }, { color: 0x9b8662, roughness: 0.94, metalness: 0.0 }),
    hikerOrange: mk(cave?.tarpCanvas, { color: 0xc4672f, normalScale: 0.9 }, { color: 0xb85c27, roughness: 0.86, metalness: 0.0 }),
    medWhite: new T.MeshStandardMaterial({ color: 0xc8c5b6, roughness: 0.58, metalness: 0.08 }),
    darkRubber: new T.MeshStandardMaterial({ color: 0x262928, roughness: 0.9, metalness: 0.05 }),
    enamelBlue: new T.MeshStandardMaterial({ color: 0x4a6370, roughness: 0.38, metalness: 0.14 }),
    // Stone & Uncanny family
    fieldstone: mkRock('fieldstone', 0x8d8b80, 0.94, 1.05),
    granite: mkRock('granite', 0x868882, 0.92, 1.0),
    basalt: mkRock('basalt', 0x5d615e, 0.9, 1.1),
    ironstone: mkRock('ironstone', 0x564b46, 0.86, 1.15),
    riverCobble: mkRock('riverCobble', 0x7b7c74, 0.84, 0.95),
    bone: mk(cave?.weatheredBone, { color: 0xd0c9b4, normalScale: 0.95 }, { color: 0xc2baa4, roughness: 0.88, metalness: 0.0 }),
    deepWater: new T.MeshStandardMaterial({ color: 0x101c1c, roughness: 0.14, metalness: 0.12 }),
    // Muted amber ribbon / trail blaze (<45% natural or reserved marker accent)
    blazeYellow: new T.MeshStandardMaterial({ color: 0xc49c3a, roughness: 0.82, metalness: 0.04 }),
  };

  MAT_CACHE.set(T, mats);
  return mats;
}

// ---------------------------------------------------------------------------
// Geometry helpers: clean primitives, struts, horseshoes, hinged stash containers,
// and material-grouped static baking (preserves UVs & normals, keeps draws tiny!).
// ---------------------------------------------------------------------------
function makeBuilder(T, group) {
  const staticParts = [];
  const addStatic = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    staticParts.push(mesh);
    group.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = null) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    if (parent) { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    return addStatic(m);
  };
  const cyl = (rt, rb, h, mat, x, y, z, rx = 0, ry = 0, rz = 0, seg = 10, parent = null) => {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    if (parent) { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    return addStatic(m);
  };
  const strut = (a, b, r, mat, seg = 6, parent = null) => {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b);
    const dir = bv.clone().sub(av);
    const len = dir.length();
    if (len < 1e-4) return null;
    const m = new T.Mesh(new T.CylinderGeometry(r, r, len, seg), mat);
    m.position.copy(av).add(bv).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    if (parent) { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    return addStatic(m);
  };
  const torus = (r, tube, mat, x, y, z, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2, parent = null) => {
    const m = new T.Mesh(new T.TorusGeometry(r, tube, 6, 14, arc), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    if (parent) { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    return addStatic(m);
  };
  const rock = (rx, ry, rz, mat, x, y, z, rotY = 0, seed = 101, style = 'granite', parent = null) => {
    const geo = buildCompactStoneGeometry(T, { rx, ry, rz, detail: 1, seed, style, uvTile: 0.75 });
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    if (parent) { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    return addStatic(m);
  };
  // Sculpted horseshoe (points up by default; pass invert=true for uncanny upside-down ward)
  const horseshoe = (mat, x, y, z, rx = 0, ry = 0, rz = 0, scale = 1, parent = null) => {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.rotation.set(rx, ry, rz);
    g.scale.setScalar(scale);
    const arc = new T.Mesh(new T.TorusGeometry(0.085, 0.014, 6, 12, Math.PI * 1.35), mat);
    arc.rotation.z = Math.PI * 0.825;
    arc.castShadow = true; arc.receiveShadow = true;
    g.add(arc);
    for (const s of [-1, 1]) {
      const heel = new T.Mesh(new T.BoxGeometry(0.026, 0.042, 0.022), mat);
      heel.position.set(s * 0.072, 0.056, 0);
      heel.rotation.z = -s * 0.12;
      g.add(heel);
    }
    if (parent) { parent.add(g); return g; }
    // Bake horseshoe children into static list if not animated
    g.updateMatrixWorld(true);
    for (const ch of [...g.children]) {
      ch.applyMatrix4(g.matrix);
      addStatic(ch);
    }
    return g;
  };
  // Reusable hinged stash container (military ammo can / footlocker / settler iron strongbox / first-aid cabinet)
  const hingedBox = ({ w, h, d, bodyMat, trimMat, brassMat, innerLootMat, x, y, z, ry = 0, lidDir = -1, openAngle = 1.65 }) => {
    const root = new T.Group();
    root.name = 'filler-stash-box';
    root.position.set(x, y, z);
    root.rotation.y = ry;
    group.add(root);

    // Lower container walls + buried foot flange (stays seated on slopes)
    const wallT = Math.max(0.025, Math.min(w, d) * 0.08);
    box(w, 0.05, d, bodyMat, 0, 0.025, 0, 0, 0, 0, root);
    box(w, h, wallT, bodyMat, 0, h * 0.5, d * 0.5 - wallT * 0.5, 0, 0, 0, root);
    box(w, h, wallT, bodyMat, 0, h * 0.5, -d * 0.5 + wallT * 0.5, 0, 0, 0, root);
    box(wallT, h, d - wallT * 2, bodyMat, w * 0.5 - wallT * 0.5, h * 0.5, 0, 0, 0, 0, root);
    box(wallT, h, d - wallT * 2, bodyMat, -w * 0.5 + wallT * 0.5, h * 0.5, 0, 0, 0, 0, root);
    // Corner reinforcement straps & front brass hasp
    for (const sx of [-1, 1]) {
      box(0.032, h + 0.01, d + 0.014, trimMat, sx * (w * 0.44), h * 0.5, 0, 0, 0, 0, root);
    }
    box(0.06, 0.09, 0.024, brassMat, 0, h * 0.82, d * 0.5 + 0.012, 0, 0, 0, root);
    // Side carry handles
    for (const sx of [-1, 1]) {
      torus(0.055, 0.01, trimMat, sx * (w * 0.5 + 0.012), h * 0.55, 0, 0, Math.PI * 0.5, 0, Math.PI, root);
    }

    // Inner loot bundle (disappears cleanly once player collects the stash!)
    const lootMesh = new T.Group();
    lootMesh.name = 'filler-stash-contents';
    box(w * 0.48, h * 0.42, d * 0.44, innerLootMat, -w * 0.14, h * 0.34, 0.02, 0, 0.14, 0, lootMesh);
    cyl(0.045, 0.045, Math.min(0.24, w * 0.32), brassMat, w * 0.2, h * 0.32, -0.02, Math.PI * 0.5, 0.3, 0, 8, lootMesh);
    root.add(lootMesh);

    // Hinged lid pivoting along back (-z) edge
    const lidPivot = new T.Group();
    lidPivot.name = 'filler-stash-lid';
    lidPivot.position.set(0, h, -d * 0.5);
    lidPivot.userData = { closedRx: 0, openRx: lidDir * openAngle };
    root.add(lidPivot);
    box(w + 0.024, 0.065, d + 0.024, bodyMat, 0, 0.032, d * 0.5, 0, 0, 0, lidPivot);
    for (const sx of [-1, 1]) {
      box(0.036, 0.072, d + 0.032, trimMat, sx * (w * 0.44), 0.035, d * 0.5, 0, 0, 0, lidPivot);
      // Rear hinge knuckles
      cyl(0.014, 0.014, 0.08, trimMat, sx * (w * 0.32), 0.01, 0.0, 0, 0, Math.PI * 0.5, 6, lidPivot);
    }
    box(0.055, 0.045, 0.024, brassMat, 0, 0.015, d + 0.012, 0, 0, 0, lidPivot);

    return { root, lidPivot, lootMesh };
  };

  // Hanging storm lantern with warm sodium-amber glass & soft sprite halo (zero dynamic PointLight cost!)
  const stormLantern = (mats, x, y, z, parent = null) => {
    const g = new T.Group();
    g.name = 'filler-storm-lantern';
    g.position.set(x, y, z);
    (parent || group).add(g);
    cyl(0.065, 0.085, 0.06, mats.forgedIron, 0, -0.22, 0, 0, 0, 0, 10, g);
    cyl(0.075, 0.04, 0.05, mats.forgedIron, 0, -0.04, 0, 0, 0, 0, 10, g);
    torus(0.035, 0.007, mats.rustedIron, 0, 0.01, 0, 0, 0, 0, Math.PI * 2, g);
    for (const s of [-1, 1]) {
      strut([s * 0.068, -0.20, 0], [s * 0.058, -0.05, 0], 0.007, mats.forgedIron, 5, g);
    }
    const glassMat = new T.MeshStandardMaterial({
      color: 0xffd28a, emissive: 0xffa030, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.05,
    });
    const glass = new T.Mesh(new T.CylinderGeometry(0.048, 0.052, 0.13, 10), glassMat);
    glass.position.y = -0.125;
    g.add(glass);

    let glowSprite = null;
    const gTex = getRadialGlowTexture(T);
    if (gTex && typeof T.Sprite === 'function') {
      const spMat = new T.SpriteMaterial({
        map: gTex, color: 0xffb34d, transparent: true, opacity: 0.32,
        blending: T.AdditiveBlending, depthWrite: false, fog: true,
      });
      glowSprite = new T.Sprite(spMat);
      glowSprite.position.set(0, -0.12, 0);
      glowSprite.scale.set(1.35, 1.35, 1);
      g.add(glowSprite);
    }
    return { group: g, glassMat, glowSprite };
  };

  // Batch all staticParts by material into minimal draw calls while preserving UVs and normals!
  const bakeStatic = (label) => {
    const byMat = new Map();
    for (const m of staticParts) {
      if (!m || !m.isMesh || !m.geometry) continue;
      m.updateMatrix();
      const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      if (!geo.attributes.normal && typeof geo.computeVertexNormals === 'function') geo.computeVertexNormals();
      geo.applyMatrix4(m.matrix);
      const pos = geo.attributes.position;
      const nrm = geo.attributes.normal;
      const uv = geo.attributes.uv;
      let b = byMat.get(m.material);
      if (!b) byMat.set(m.material, b = { p: [], n: [], u: [], cast: false });
      if (m.castShadow) b.cast = true;
      for (let i = 0; i < pos.count; i++) {
        b.p.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (nrm) b.n.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
        else b.n.push(0, 1, 0);
        if (uv) b.u.push(uv.getX(i), uv.getY(i));
        else b.u.push(pos.getX(i) * 0.5, pos.getY(i) * 0.5);
      }
      geo.dispose();
      m.geometry.dispose();
      group.remove(m);
    }
    staticParts.length = 0;
    let idx = 0;
    for (const [mat, b] of byMat) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(b.p, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(b.u, 2));
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const mesh = new T.Mesh(geo, mat);
      mesh.name = `${label}-batch-${idx++}`;
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  };

  return { box, cyl, strut, torus, rock, horseshoe, hingedBox, stormLantern, bakeStatic, addStatic };
}

function makePlacard(T, doc, lines, opts) {
  const tex = makeStenciledPlacardTexture(T, doc, { lines, ...opts });
  if (!tex) return new T.MeshStandardMaterial({ color: 0x9b8b69, roughness: 0.88, metalness: 0.05 });
  return new T.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.86, metalness: 0.06 });
}

// ---------------------------------------------------------------------------
// 14 AUTHORED HERO VIGNETTE BUILDERS
// Each returns: { group, lidPivot, lootMesh, strobeMat, strobeSprite, lantern, chimePivot, solids, interactOffset }
// Every structure embeds a -0.25..-0.40 m ground skirt/root so zero edges ever float on slopes!
// ---------------------------------------------------------------------------
export function buildVignetteModel(T, id, doc = null) {
  const mats = getFillerMaterials(T);
  const group = new T.Group();
  group.name = `world-filler:${id}`;
  const b = makeBuilder(T, group);
  const res = {
    group,
    lidPivot: null,
    lootMesh: null,
    strobeMat: null,
    strobeSprite: null,
    lantern: null,
    chimePivot: null,
    solids: [],
    interactOffset: { x: 0, y: 0.8, z: 0 },
  };

  if (id === 'drop-rig') {
    // 1. Snagged PGB Insertion Parachute Pack & Drop Canister (Military)
    // Weathered mossy stump + granite anchor stone holding a tangled olive parachute canopy + drop canister
    b.cyl(0.42, 0.56, 1.15, mats.barkWood, -0.55, 0.28, -0.35, 0.06, 0.3, -0.05, 11);
    b.cyl(0.39, 0.39, 0.04, mats.heartwood, -0.53, 0.85, -0.34, 0.06, 0.3, -0.05, 11);
    b.rock(0.62, 0.42, 0.52, mats.granite, 0.72, 0.14, -0.55, 0.9, 41801, 'granite');
    // Draped military drab parachute panels snagged over stump & trailing onto ground
    b.box(1.15, 0.045, 0.85, mats.chuteDrab, -0.45, 0.86, -0.38, 0.24, 0.32, -0.36);
    b.box(1.05, 0.04, 0.95, mats.chuteDrab, -0.98, 0.44, -0.58, 0.58, 0.22, -0.62);
    b.box(0.88, 0.035, 0.72, mats.chuteDrab, -1.32, 0.08, -0.78, 0.12, 0.5, -0.12);
    // Suspension cords linking chute to drop harness
    for (const [ax, ay, az] of [[-0.2, 0.78, -0.25], [-0.55, 0.68, -0.15], [-0.85, 0.45, -0.32]]) {
      b.strut([ax, ay, az], [0.22, 0.24, 0.22], 0.008, mats.ropeTan, 4);
    }
    // Buried impact dirt collar + hinged PGB Drop Canister
    b.box(0.84, 0.28, 0.56, mats.bunkerSteel, 0.28, -0.08, 0.22, 0, -0.28, 0);
    const boxObj = b.hingedBox({
      w: 0.76, h: 0.36, d: 0.48, bodyMat: mats.oliveCrate, trimMat: mats.bunkerSteel,
      brassMat: mats.brass, innerLootMat: mats.oliveSteel, x: 0.28, y: 0.04, z: 0.22, ry: -0.28,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    // Spent yellow chem-light stick on the ground
    b.cyl(0.014, 0.014, 0.16, mats.blazeYellow, 0.58, 0.02, 0.56, Math.PI * 0.5, 0.8, 0, 6);
    res.solids.push({ x: -0.55, z: -0.35, r: 0.58, h: 1.0 }, { x: 0.28, z: 0.22, r: 0.48, h: 0.55 });
    res.interactOffset = { x: 0.28, y: 0.55, z: 0.22 };
  }
  else if (id === 'listening-post') {
    // 2. NW Overwatch Sandbagged Foxhole & Spotting Tripod (Military)
    // Low sandbag crescent with buried bottom course so nothing floats
    for (let i = 0; i < 6; i++) {
      const a = -1.05 + i * 0.42;
      const rx = Math.sin(a) * 1.32, rz = -Math.cos(a) * 1.15;
      for (let row = 0; row < 2; row++) {
        const y = row === 0 ? 0.02 : 0.24;
        const offA = a + (row ? 0.14 : 0);
        b.box(0.56, 0.28, 0.30, mats.sandbagCanvas, rx, y, rz, 0, -offA, (i % 2 ? 0.03 : -0.03));
      }
    }
    // Buried earth apron & wooden duckboard pallet
    b.box(1.25, 0.24, 0.92, mats.weatheredTimber, 0.0, -0.07, 0.15, 0, 0.1, 0);
    // Olive spotting scope on three-legged field tripod peering over the sandbags
    const tx = -0.32, tz = -0.58;
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3 + 0.3;
      b.strut([tx + Math.cos(a) * 0.36, -0.18, tz + Math.sin(a) * 0.36], [tx, 0.96, tz], 0.018, mats.bunkerSteel, 6);
    }
    b.cyl(0.055, 0.042, 0.42, mats.oliveSteel, tx, 1.04, tz - 0.04, Math.PI * 0.5 - 0.08, 0.15, 0, 10);
    b.cyl(0.062, 0.062, 0.06, mats.darkRubber, tx + 0.03, 1.06, tz - 0.24, Math.PI * 0.5 - 0.08, 0.15, 0, 10);
    // Spent brass scatter & tin canteen
    for (let k = 0; k < 8; k++) {
      b.cyl(0.008, 0.008, 0.045, mats.brass, -0.45 + k * 0.14, 0.05, -0.12 + (k % 3) * 0.12, Math.PI * 0.5, k * 0.9, 0, 5);
    }
    b.cyl(0.07, 0.07, 0.18, mats.oliveSteel, -0.72, 0.12, 0.32, 0.12, 0.4, 0.15, 8);
    // Hinged steel rifle-ammo box
    const boxObj = b.hingedBox({
      w: 0.62, h: 0.34, d: 0.34, bodyMat: mats.oliveSteel, trimMat: mats.forgedIron,
      brassMat: mats.brass, innerLootMat: mats.brass, x: 0.48, y: 0.05, z: 0.18, ry: -0.42,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: 0, z: -1.1, r: 0.72, h: 0.65 }, { x: 0.95, z: -0.65, r: 0.58, h: 0.65 }, { x: -0.95, z: -0.65, r: 0.58, h: 0.65 });
    res.interactOffset = { x: 0.48, y: 0.55, z: 0.18 };
  }
  else if (id === 'signal-spool') {
    // 3. PGB Field-Wire Cable Reel & Junction Box (Industrial / Military)
    // Heavy steel A-frame cradle anchored deeply into earth
    for (const s of [-1, 1]) {
      b.strut([s * 0.42, -0.25, -0.48], [s * 0.42, 0.82, 0], 0.036, mats.bunkerSteel, 6);
      b.strut([s * 0.42, -0.25, 0.48], [s * 0.42, 0.82, 0], 0.036, mats.bunkerSteel, 6);
      b.box(0.10, 0.24, 1.08, mats.bunkerSteel, s * 0.42, -0.06, 0);
    }
    b.cyl(0.038, 0.038, 1.02, mats.galvSteel, 0, 0.78, 0, 0, 0, Math.PI * 0.5, 8);
    // Big wooden cable reel drum + wound dark copper/rubber wire core
    for (const s of [-1, 1]) {
      b.cyl(0.56, 0.56, 0.065, mats.plankWood, s * 0.31, 0.78, 0, 0, 0, Math.PI * 0.5, 16);
      b.torus(0.54, 0.02, mats.forgedIron, s * 0.31, 0.78, 0, 0, Math.PI * 0.5);
    }
    b.cyl(0.41, 0.41, 0.56, mats.darkRubber, 0, 0.78, 0, 0, 0, Math.PI * 0.5, 14);
    // Trailing slack cable loops on the ground toward the mast
    b.torus(0.28, 0.022, mats.darkRubber, 0.05, 0.03, 0.82, Math.PI * 0.5, 0, 0);
    b.strut([0.25, 0.03, 0.85], [1.25, 0.01, 1.35], 0.018, mats.darkRubber, 6);
    // Bolted steel survey stake & field-signals satchel box
    b.box(0.08, 1.45, 0.08, mats.galvSteel, -0.95, 0.48, -0.25);
    b.box(0.32, 0.36, 0.16, mats.bunkerSteel, -0.95, 0.96, -0.15);
    b.box(0.34, 0.06, 0.18, mats.hazardChevron, -0.95, 1.15, -0.15);
    // Hinged signals field case
    b.box(0.64, 0.24, 0.44, mats.bunkerConcrete, 0.82, -0.08, 0.24, 0, 0.26, 0);
    const boxObj = b.hingedBox({
      w: 0.56, h: 0.28, d: 0.36, bodyMat: mats.oliveCrate, trimMat: mats.galvSteel,
      brassMat: mats.brass, innerLootMat: mats.bunkerSteel, x: 0.82, y: 0.04, z: 0.24, ry: 0.26,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: 0, z: 0, r: 0.72, h: 1.35 }, { x: -0.95, z: -0.25, r: 0.28, h: 1.25 });
    res.interactOffset = { x: 0.82, y: 0.52, z: 0.24 };
  }
  else if (id === 'river-sluice') {
    // 4. Coldwater Ore-Washing Sluice Box & Iron Strongbox (Settler / Civil)
    // Sloped weathered timber sluice trough resting on cobble piers
    b.rock(0.54, 0.38, 0.48, mats.riverCobble, -0.92, 0.14, 0, 0.4, 41804, 'river');
    b.rock(0.46, 0.26, 0.42, mats.riverCobble, 0.86, 0.06, 0.05, 1.2, 41805, 'river');
    // Sluice box angled downward along +X
    const sluice = new T.Group();
    sluice.position.set(0, 0.42, 0);
    sluice.rotation.z = -0.18;
    group.add(sluice);
    b.box(2.25, 0.06, 0.56, mats.wetTimber, 0, 0, 0, 0, 0, 0, sluice);
    for (const sz of [-0.26, 0.26]) b.box(2.25, 0.26, 0.05, mats.wetTimber, 0, 0.12, sz, 0, 0, 0, sluice);
    // Iron riffle bars inside the sluice
    for (let k = -3; k <= 3; k++) b.box(0.035, 0.045, 0.46, mats.rustedIron, k * 0.26, 0.045, 0, 0, 0, 0, sluice);
    // Settler support legs buried into ground
    for (const [lx, h] of [[-0.85, 0.78], [0.75, 0.48]]) {
      for (const sz of [-0.24, 0.24]) b.box(0.08, h, 0.08, mats.weatheredTimber, lx, h * 0.5 - 0.28, sz);
    }
    // Leaning rusty miner's shovel & iron gold-pan
    b.strut([-1.28, -0.08, 0.44], [-0.94, 1.05, 0.24], 0.02, mats.weatheredTimber, 6);
    b.box(0.22, 0.28, 0.025, mats.rustedIron, -1.28, 0.08, 0.44, 0.22, 0.2, 0.18);
    b.cyl(0.24, 0.17, 0.07, mats.forgedIron, 0.35, 0.04, 0.62, 0, 0, 0.05, 14);
    // Buried base stone + settler iron assay strongbox
    b.rock(0.55, 0.26, 0.42, mats.fieldstone, 0.85, -0.04, 0.72, 0.3, 41806, 'granite');
    const boxObj = b.hingedBox({
      w: 0.52, h: 0.28, d: 0.36, bodyMat: mats.forgedIron, trimMat: mats.rustedIron,
      brassMat: mats.brass, innerLootMat: mats.brass, x: 0.85, y: 0.08, z: 0.72, ry: -0.5,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: -0.45, z: 0, r: 0.68, h: 0.85 }, { x: 0.55, z: 0.05, r: 0.62, h: 0.65 });
    res.interactOffset = { x: 0.85, y: 0.52, z: 0.72 };
  }
  else if (id === 'trapper-line') {
    // 5. Upstream Trapper's Drying Rack & Iron Horseshoe Chimes (Settler / Civil)
    // Two A-frame rough timber uprights + top ridge beam buried deeply
    for (const sx of [-1.05, 1.05]) {
      b.strut([sx, -0.35, -0.48], [sx, 1.85, 0], 0.058, mats.barkWood, 7);
      b.strut([sx, -0.35, 0.48], [sx, 1.85, 0], 0.058, mats.barkWood, 7);
    }
    b.cyl(0.052, 0.058, 2.55, mats.barkWood, 0, 1.82, 0, 0, 0, Math.PI * 0.5, 8);
    // Stretched weathered oilskin/hide canvas on the left bay
    b.box(0.86, 1.15, 0.032, mats.sandbagCanvas, -0.45, 1.18, 0.02, 0.08, 0, 0.03);
    // Animated swinging horseshoe ward chimes hanging from the right side of the crossbar!
    const chimePivot = new T.Group();
    chimePivot.name = 'filler-horseshoe-chime';
    chimePivot.position.set(0.45, 1.80, 0);
    group.add(chimePivot);
    for (let k = 0; k < 3; k++) {
      const ox = (k - 1) * 0.24, drop = 0.42 + (k % 2) * 0.14;
      b.strut([ox, 0, 0], [ox, -drop, 0], 0.006, mats.ropeTan, 4, chimePivot);
      b.horseshoe(mats.forgedIron, ox, -drop - 0.08, 0, 0, k * 0.35, 0, 1.1, chimePivot);
    }
    res.chimePivot = chimePivot;
    // Wooden stump & strapped trapper oilskin supply tin
    b.cyl(0.32, 0.38, 0.65, mats.barkWood, 0.42, 0.16, 0.56, 0, 0.4, 0, 9);
    const boxObj = b.hingedBox({
      w: 0.48, h: 0.26, d: 0.34, bodyMat: mats.weatheredTimber, trimMat: mats.forgedIron,
      brassMat: mats.brass, innerLootMat: mats.oliveSteel, x: 0.42, y: 0.48, z: 0.56, ry: -0.22,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: -1.05, z: 0, r: 0.42, h: 1.85 }, { x: 1.05, z: 0, r: 0.42, h: 1.85 }, { x: 0.42, z: 0.56, r: 0.42, h: 0.8 });
    res.interactOffset = { x: 0.42, y: 0.85, z: 0.56 };
  }
  else if (id === 'shore-skiff') {
    // 6. Coldwater Beached Cedar Skiff Wreck & Tackle Box (Settler / Civil)
    // Half-overturned ribbed timber hull nestled deeply into shore gravel with keel arching ~0.85 m high
    const hull = new T.Group();
    hull.position.set(0, 0.56, 0);
    hull.rotation.set(0.08, 0.25, 2.45); // low gunwale buried -0.19 m in gravel, high chine arching +0.85 m
    group.add(hull);
    // Keel spine + tapered strake sides + ribs + transom
    b.box(0.10, 0.12, 3.15, mats.wetTimber, 0, 0.04, 0, 0, 0, 0, hull);
    for (const s of [-1, 1]) {
      b.box(0.06, 0.46, 2.35, mats.wetTimber, s * 0.52, 0.26, -0.15, 0, 0, s * 0.22, hull);
      b.box(0.06, 0.42, 0.92, mats.wetTimber, s * 0.28, 0.25, 1.24, 0, -s * 0.54, s * 0.18, hull);
      b.box(0.07, 0.07, 2.45, mats.weatheredTimber, s * 0.60, 0.48, -0.15, 0, 0, 0, hull);
    }
    b.box(1.06, 0.46, 0.08, mats.wetTimber, 0, 0.26, -1.34, 0, 0, 0, hull);
    for (const z of [-0.95, -0.35, 0.25, 0.82]) {
      b.box(0.96, 0.06, 0.08, mats.weatheredTimber, 0, 0.12, z, 0, 0, 0, hull);
    }
    // Iron horseshoe hammered dead-center into the bow stem (settler ward against the lake!)
    b.horseshoe(mats.rustedIron, 0, 0.26, 1.62, 0.12, 0, 0, 1.15, hull);
    // Weathered wooden oar resting beside the hull + mooring post
    b.cyl(0.025, 0.028, 2.05, mats.plankWood, 0.92, 0.12, 0.15, Math.PI * 0.48, 0.35, 0.12, 7);
    b.box(0.16, 0.024, 0.58, mats.plankWood, 1.22, 0.10, 1.08, 0.06, 0.35, 0.12);
    b.cyl(0.11, 0.13, 1.25, mats.wetTimber, -1.22, 0.32, 0.65, 0.06, 0, -0.08, 8);
    b.torus(0.075, 0.014, mats.rustedIron, -1.16, 0.72, 0.65, 0, Math.PI * 0.5);
    // Hinged steel tackle strongbox on a flat river stone
    b.rock(0.48, 0.24, 0.38, mats.riverCobble, 0.82, -0.04, -0.78, 0.6, 41807, 'river');
    const boxObj = b.hingedBox({
      w: 0.50, h: 0.26, d: 0.32, bodyMat: mats.enamelBlue, trimMat: mats.rustedIron,
      brassMat: mats.brass, innerLootMat: mats.medWhite, x: 0.82, y: 0.06, z: -0.78, ry: 0.45,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: -0.1, z: -0.5, r: 0.78, h: 0.85 }, { x: 0.15, z: 0.7, r: 0.72, h: 0.85 });
    res.interactOffset = { x: 0.82, y: 0.52, z: -0.78 };
  }
  else if (id === 'hiker-overlook') {
    // 7. Hikers' Lake-Overlook Granite Ledge & Drybag (Settler / Civil — single burnt-orange accent!)
    // Broad flat granite overlook slab anchored deeply into slope
    b.rock(1.35, 0.52, 0.96, mats.granite, 0, 0.12, -0.25, 0.18, 41808, 'granite');
    b.rock(0.68, 0.34, 0.58, mats.granite, -1.05, 0.02, 0.12, 1.1, 41809, 'granite');
    // Folding aluminum camp tripod stool
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3;
      b.strut([-0.75 + Math.cos(a) * 0.22, -0.18, 0.55 + Math.sin(a) * 0.22], [-0.75 - Math.cos(a) * 0.16, 0.44, 0.55 - Math.sin(a) * 0.16], 0.014, mats.galvSteel, 5);
    }
    b.cyl(0.22, 0.22, 0.03, mats.sandbagCanvas, -0.75, 0.45, 0.55, 0, 0, 0, 6);
    // Enamel camp mug & rolled bedroll on the slab
    b.cyl(0.055, 0.05, 0.11, mats.enamelBlue, -0.24, 0.54, -0.15, 0, 0, 0, 10);
    b.cyl(0.12, 0.12, 0.56, mats.sandbagCanvas, -0.52, 0.54, -0.45, 0, 0.4, Math.PI * 0.5, 10);
    // Burnt-orange waterproof hiker field case (ONLY bright accent per Art Direction §1!)
    const boxObj = b.hingedBox({
      w: 0.54, h: 0.28, d: 0.36, bodyMat: mats.hikerOrange, trimMat: mats.darkRubber,
      brassMat: mats.galvSteel, innerLootMat: mats.medWhite, x: 0.38, y: 0.44, z: -0.12, ry: -0.35,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: 0, z: -0.25, r: 0.92, h: 0.72 });
    res.interactOffset = { x: 0.38, y: 0.92, z: -0.12 };
  }
  else if (id === 'logging-bench') {
    // 8. Coldwater Timberman's Hand-Felled Stump, Crosscut Saw & Tool Chest (Settler / Civil)
    // Massive gnarled cedar stump rooted deeply into earth
    b.cyl(0.68, 0.88, 1.25, mats.barkWood, -0.45, 0.32, -0.22, 0.02, 0.3, -0.02, 12);
    b.cyl(0.65, 0.65, 0.04, mats.heartwood, -0.45, 0.95, -0.22, 0.02, 0.3, -0.02, 12);
    b.box(0.68, 0.025, 0.032, mats.darkRubber, -0.28, 0.96, -0.15, 0.02, 0.32, -0.02); // dark sawn kerf slot
    // Two-man rusted crosscut saw wedged halfway into the stump kerf!
    b.box(1.58, 0.16, 0.018, mats.rustedIron, -0.12, 0.86, -0.08, 0.04, 0.32, -0.06);
    for (const s of [-1, 1]) {
      b.cyl(0.026, 0.028, 0.24, mats.plankWood, -0.12 + s * 0.75 * Math.cos(0.32), 0.96 - s * 0.05, -0.08 - s * 0.75 * Math.sin(0.32), 0, 0, 0, 7);
    }
    // Stacked split cordwood pile beside the stump (buried bottom row)
    for (let row = 0; row < 3; row++) {
      const n = 4 - row;
      for (let i = 0; i < n; i++) {
        const lx = -1.35 + (i - (n - 1) * 0.5) * 0.24;
        b.cyl(0.11, 0.115, 0.95, mats.barkWood, lx, 0.06 + row * 0.19, 0.52, Math.PI * 0.5, 0.15, 0, 8);
      }
    }
    // Iron splitting wedge buried in the stump edge
    b.box(0.07, 0.22, 0.12, mats.forgedIron, -0.68, 1.02, -0.35, 0.12, 0.2, 0.18);
    // Strapped woodcutter's heavy timber chest on stone shims
    b.box(0.84, 0.24, 0.52, mats.fieldstone, 0.68, -0.06, 0.42, 0, -0.42, 0);
    const boxObj = b.hingedBox({
      w: 0.78, h: 0.38, d: 0.46, bodyMat: mats.weatheredTimber, trimMat: mats.forgedIron,
      brassMat: mats.brass, innerLootMat: mats.redDanger, x: 0.68, y: 0.06, z: 0.42, ry: -0.42,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: -0.45, z: -0.22, r: 0.85, h: 1.05 }, { x: -1.35, z: 0.52, r: 0.65, h: 0.65 }, { x: 0.68, z: 0.42, r: 0.52, h: 0.55 });
    res.interactOffset = { x: 0.68, y: 0.62, z: 0.42 };
  }
  else if (id === 'cairn-benchmark') {
    // 9. First People Basalt Cairn, Inverted Horseshoe & 1962 PGB Survey Benchmark (Uncanny / Research)
    // Anchored weathered basalt shelf rock
    b.rock(0.92, 0.68, 0.78, mats.basalt, -0.35, 0.22, -0.35, 0.4, 41810, 'basalt');
    // Carefully balanced 5-tier basalt cairn (quiet uncanny order)
    let cy = 0.02;
    for (let k = 0; k < 5; k++) {
      const r = 0.34 - k * 0.052;
      const h = 0.14 - k * 0.012;
      b.rock(r * 1.08, h, r * 0.96, mats.basalt, 0.58 + (k % 2 ? 0.02 : -0.015), cy + h * 0.5, -0.18, k * 1.1, 41820 + k, 'basalt');
      cy += h * 1.45;
    }
    // Tarnished brass PGB 1962 survey benchmark disk bolted to the main rock face!
    b.cyl(0.11, 0.11, 0.025, mats.brass, -0.12, 0.64, 0.08, 0.45, 0.2, 0, 14);
    b.cyl(0.02, 0.02, 0.035, mats.forgedIron, -0.12, 0.64, 0.09, 0.45, 0.2, 0, 6);
    // Inverted rusted iron horseshoe laid points-DOWN on the turf (Art Direction §2: iron turned over near the uncanny!)
    b.horseshoe(mats.rustedIron, 0.12, 0.02, 0.46, Math.PI * 0.5, 0.35, Math.PI, 1.15);
    // Weathered bleached elk antler resting beside the boulder
    b.strut([-1.15, 0.06, 0.25], [-0.55, 0.18, 0.52], 0.022, mats.bone, 5);
    b.strut([-0.85, 0.12, 0.38], [-0.72, 0.34, 0.32], 0.014, mats.bone, 4);
    b.strut([-0.68, 0.15, 0.46], [-0.52, 0.33, 0.40], 0.013, mats.bone, 4);
    // Hidden waterproof gravewalker dead-drop ammo tin tucked behind the boulder
    const boxObj = b.hingedBox({
      w: 0.44, h: 0.24, d: 0.28, bodyMat: mats.oliveSteel, trimMat: mats.forgedIron,
      brassMat: mats.brass, innerLootMat: mats.brass, x: -0.35, y: 0.04, z: 0.52, ry: 0.22,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: -0.35, z: -0.35, r: 0.82, h: 0.88 }, { x: 0.58, z: -0.18, r: 0.42, h: 1.05 });
    res.interactOffset = { x: -0.35, y: 0.55, z: 0.52 };
  }
  else if (id === 'snagged-airdrop') {
    // 10. Off-Target PGB Supply Drop Crate & Dying Amber Recovery Strobe (Military)
    // Ground impact mound / buried timber skid so tilted crate sits naturally in dirt
    b.rock(1.15, 0.28, 1.05, mats.fieldstone, 0, -0.06, 0, 0.3, 41830, 'granite');
    const skid = new T.Group();
    skid.position.set(0, 0.04, 0);
    skid.rotation.set(0.08, -0.32, -0.12);
    group.add(skid);
    // Heavy slatted military airdrop pallet + stenciled side placard
    b.box(1.24, 0.14, 1.12, mats.plankWood, 0, 0.06, 0, 0, 0, 0, skid);
    const placMat = makePlacard(T, doc, [
      { text: 'PGB · SUPPLY', size: 42, y: 0.26 },
      { text: 'REQ 4-B · SITE 9', size: 38, y: 0.54 },
      { text: 'DO NOT ABANDON', size: 34, y: 0.80, colour: '#7d1a12' },
    ], { ground: '#8c9678', stripe: true, seed: 41810 });
    const sideCard = new T.Mesh(new T.PlaneGeometry(0.74, 0.42), placMat);
    sideCard.position.set(0, 0.43, 0.466);
    skid.add(sideCard);
    // Hinged airdrop main crate
    const boxObj = b.hingedBox({
      w: 1.02, h: 0.62, d: 0.92, bodyMat: mats.oliveCrate, trimMat: mats.bunkerSteel,
      brassMat: mats.brass, innerLootMat: mats.oliveSteel, x: 0, y: 0.12, z: 0, ry: 0,
    });
    skid.add(boxObj.root);
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    // Tangled cargo chute billowing behind the crate
    b.box(1.45, 0.04, 1.15, mats.chuteDrab, -0.82, 0.22, -0.95, 0.25, 0.42, 0.18);
    b.box(1.12, 0.04, 0.88, mats.chuteDrab, 0.55, 0.14, -1.12, 0.18, -0.35, -0.22);
    // Recovery strobe beacon mast bolted to corner (pulses softly until looted!)
    b.cyl(0.025, 0.032, 0.65, mats.galvSteel, 0.52, 0.98, 0.44, 0, 0, 0, 8, skid);
    const strobeMat = new T.MeshStandardMaterial({
      color: 0xffb838, emissive: 0xff9818, emissiveIntensity: 1.2, roughness: 0.22, metalness: 0.08,
    });
    const strobeBulb = new T.Mesh(new T.CylinderGeometry(0.046, 0.046, 0.09, 10), strobeMat);
    strobeBulb.position.set(0.52, 1.32, 0.44);
    skid.add(strobeBulb);
    res.strobeMat = strobeMat;
    const gTex = getRadialGlowTexture(T);
    if (gTex && typeof T.Sprite === 'function') {
      const sp = new T.Sprite(new T.SpriteMaterial({
        map: gTex, color: 0xffaa28, transparent: true, opacity: 0.55,
        blending: T.AdditiveBlending, depthWrite: false, fog: true,
      }));
      sp.position.set(0.52, 1.33, 0.44);
      sp.scale.set(1.15, 1.15, 1);
      skid.add(sp);
      res.strobeSprite = sp;
    }
    res.solids.push({ x: 0, z: 0, r: 0.82, h: 1.05 });
    res.interactOffset = { x: 0, y: 0.95, z: 0 };
  }
  else if (id === 'ore-cart-spur') {
    // 11. Coldwater Narrow-Gauge Mine Ore Cart Spur & Miner's Lockbox (Industrial / Settler)
    // Narrow-gauge timber sleepers & rusted twin iron rails emerging from mossy ground
    for (let i = -3; i <= 3; i++) {
      b.box(0.16, 0.14, 1.22, mats.wetTimber, i * 0.52, -0.02, 0, 0, (i % 2 ? 0.04 : -0.03), 0);
    }
    for (const sz of [-0.40, 0.40]) {
      b.box(3.55, 0.075, 0.06, mats.rustedIron, 0, 0.06, sz);
    }
    // Slightly derailed iron-banded timber mine ore cart filled with dark ironstone
    const cart = new T.Group();
    cart.position.set(-0.18, 0.10, 0.06);
    cart.rotation.set(0.06, 0.18, 0.16);
    group.add(cart);
    // Axles & 4 flanged cast-iron spoked wheels
    for (const sx of [-0.46, 0.46]) {
      b.cyl(0.035, 0.035, 0.92, mats.forgedIron, sx, 0.18, 0, Math.PI * 0.5, 0, 0, 8, cart);
      for (const sz of [-0.40, 0.40]) {
        b.cyl(0.18, 0.18, 0.065, mats.forgedIron, sx, 0.18, sz, Math.PI * 0.5, 0, 0, 12, cart);
        b.cyl(0.07, 0.07, 0.085, mats.rustedIron, sx, 0.18, sz, Math.PI * 0.5, 0, 0, 8, cart);
      }
    }
    // Cart chassis + flared timber hopper walls + forged iron corner straps
    b.box(1.38, 0.12, 0.92, mats.weatheredTimber, 0, 0.36, 0, 0, 0, 0, cart);
    for (const sz of [-0.44, 0.44]) b.box(1.42, 0.56, 0.07, mats.weatheredTimber, 0, 0.68, sz, sz > 0 ? 0.12 : -0.12, 0, 0, cart);
    for (const sx of [-0.68, 0.68]) b.box(0.07, 0.56, 0.92, mats.weatheredTimber, sx, 0.68, 0, 0, 0, sx > 0 ? -0.10 : 0.10, cart);
    for (const sx of [-0.69, 0, 0.69]) b.box(0.045, 0.58, 0.98, mats.forgedIron, sx, 0.68, 0, 0, 0, 0, cart);
    // Dark ironstone chunks inside cart + spilled ore pile on track side
    for (let k = 0; k < 5; k++) {
      b.rock(0.24, 0.18, 0.22, mats.ironstone, -0.32 + k * 0.17, 0.88 + (k % 2) * 0.06, (k % 3 - 1) * 0.16, k, 41840 + k, 'granite', cart);
    }
    for (let k = 0; k < 4; k++) {
      b.rock(0.20, 0.14, 0.18, mats.ironstone, 0.42 + k * 0.18, 0.06, 0.68 + (k % 2) * 0.16, k * 1.4, 41850 + k, 'granite');
    }
    // Riveted miner's iron lockbox resting on the end sleeper
    const boxObj = b.hingedBox({
      w: 0.48, h: 0.28, d: 0.34, bodyMat: mats.forgedIron, trimMat: mats.rustedIron,
      brassMat: mats.brass, innerLootMat: mats.brass, x: 1.08, y: 0.05, z: 0.44, ry: -0.52,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: -0.18, z: 0.06, r: 0.88, h: 1.15 });
    res.interactOffset = { x: 1.08, y: 0.52, z: 0.44 };
  }
  else if (id === 'trail-shelter') {
    // 12. Abandoned Ranger Timber Trail Lean-To Shelter & First-Aid Cabinet (Settler / Civil)
    // Ground-buried heavy sill plinth so lean-to never floats on any slope
    b.box(2.75, 0.42, 1.85, mats.fieldstone, 0, -0.10, 0);
    b.box(2.65, 0.10, 1.75, mats.weatheredTimber, 0, 0.14, 0);
    // 4 heavy timber corner posts
    for (const sx of [-1.20, 1.20]) {
      b.box(0.14, 2.28, 0.14, mats.weatheredTimber, sx, 1.24, 0.78);
      b.box(0.14, 1.82, 0.14, mats.weatheredTimber, sx, 1.02, -0.78);
    }
    // Back timber wall & half-height side windbreaks
    b.box(2.52, 1.68, 0.10, mats.plankWood, 0, 0.98, -0.78);
    for (const sx of [-1.20, 1.20]) b.box(0.10, 1.12, 1.56, mats.plankWood, sx, 0.70, 0);
    // Sloped overhanging shingle roof + rafters
    b.box(3.05, 0.11, 2.38, mats.wetTimber, 0, 2.18, 0.06, -0.26, 0, 0);
    for (const sx of [-1.1, -0.36, 0.36, 1.1]) b.box(0.08, 0.10, 2.24, mats.weatheredTimber, sx, 2.08, 0.06, -0.26, 0, 0);
    // Built-in plank bench & stacked dry firewood tucked beneath it
    b.box(2.22, 0.08, 0.44, mats.plankWood, 0, 0.54, -0.45);
    for (let i = 0; i < 6; i++) {
      b.cyl(0.08, 0.085, 0.42, mats.barkWood, -0.82 + i * 0.18, 0.24, -0.44, Math.PI * 0.5, 0, 0, 7);
    }
    // Warm amber storm lantern hanging from front-right beam (Art Direction §3: "People left the light on")
    res.lantern = b.stormLantern(mats, 1.02, 2.06, 0.68);
    // Bench-mounted Ranger First-Aid & Emergency Kit (white enamel steel box with bold red cross on swinging lid!)
    const boxObj = b.hingedBox({
      w: 0.48, h: 0.26, d: 0.32, bodyMat: mats.medWhite, trimMat: mats.redDanger,
      brassMat: mats.galvSteel, innerLootMat: mats.redDanger, x: 0.58, y: 0.58, z: -0.44, ry: 0,
    });
    b.box(0.16, 0.012, 0.044, mats.redDanger, 0, 0.068, 0.16, 0, 0, 0, boxObj.lidPivot);
    b.box(0.044, 0.012, 0.16, mats.redDanger, 0, 0.068, 0.16, 0, 0, 0, boxObj.lidPivot);
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push(
      { x: -1.15, z: -0.75, r: 0.32, h: 2.1 }, { x: 1.15, z: -0.75, r: 0.32, h: 2.1 },
      { x: -1.15, z: 0.75, r: 0.28, h: 2.2 }, { x: 1.15, z: 0.75, r: 0.28, h: 2.2 },
      { x: 0, z: -0.78, r: 0.75, h: 1.8 }
    );
    res.interactOffset = { x: 0.58, y: 1.05, z: -0.25 };
  }
  else if (id === 'roadblock-post') {
    // 13. PGB Concrete Checkpost & Munitions Footlocker (Military / Industrial)
    // Two angled chamfered Jersey concrete barriers with deeply buried skirts
    for (const [bx, bz, ry] of [[-0.95, -0.52, 0.24], [0.95, -0.46, -0.22]]) {
      b.box(1.55, 0.44, 0.58, mats.bunkerConcrete, bx, 0.04, bz, 0, ry, 0);
      b.box(1.52, 0.52, 0.36, mats.bunkerConcrete, bx, 0.48, bz, 0, ry, 0);
      b.box(1.48, 0.22, 0.20, mats.bunkerConcrete, bx, 0.80, bz, 0, ry, 0);
    }
    // Knocked-over steel sawhorse barricade with hazard chevron beam
    const sh = new T.Group();
    sh.position.set(0.05, 0.14, 0.72);
    sh.rotation.set(1.18, 0.38, 0.12);
    group.add(sh);
    b.box(1.38, 0.22, 0.06, mats.hazardChevron, 0, 0.72, 0, 0, 0, 0, sh);
    for (const sx of [-0.52, 0.52]) {
      b.strut([sx, 0, -0.22], [sx, 0.82, 0], 0.025, mats.galvSteel, 6, sh);
      b.strut([sx, 0, 0.22], [sx, 0.82, 0], 0.025, mats.galvSteel, 6, sh);
    }
    // Sandbag stack & spent red road flares
    for (let i = 0; i < 3; i++) b.box(0.56, 0.22, 0.30, mats.sandbagCanvas, -0.55 + i * 0.22, 0.06 + (i === 2 ? 0.20 : 0), 0.18, 0, 0.15 * i, 0);
    for (const [fx, fz, ry] of [[0.78, 0.48, 0.7], [0.95, 0.32, 1.9]]) {
      b.cyl(0.018, 0.018, 0.22, mats.redDanger, fx, 0.02, fz, Math.PI * 0.5, ry, 0, 6);
    }
    // Buried plinth + Olive PGB steel munitions footlocker
    b.box(0.88, 0.24, 0.54, mats.bunkerConcrete, 0.15, -0.08, -0.05, 0, 0.08, 0);
    const boxObj = b.hingedBox({
      w: 0.82, h: 0.40, d: 0.46, bodyMat: mats.oliveSteel, trimMat: mats.bunkerSteel,
      brassMat: mats.brass, innerLootMat: mats.oliveCrate, x: 0.15, y: 0.04, z: -0.05, ry: 0.08,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: -0.95, z: -0.52, r: 0.78, h: 0.95 }, { x: 0.95, z: -0.46, r: 0.78, h: 0.95 });
    res.interactOffset = { x: 0.15, y: 0.65, z: -0.05 };
  }
  else if (id === 'stone-well-spring') {
    // 14. Old Coldwater Iron-Hooped Fieldstone Well & Hillside Spring (Settler / Civil)
    // Circular fieldstone ring wall (10 chipped stone courses, deeply rooted -0.35 m)
    const R = 0.74;
    for (let row = 0; row < 4; row++) {
      const y = -0.18 + row * 0.26;
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i + (row % 2) * 0.5) * Math.PI * 2 / n;
        b.box(0.42, 0.24, 0.26, mats.fieldstone, Math.cos(a) * R, y, Math.sin(a) * R, 0, -a + Math.PI * 0.5, 0);
      }
    }
    // Heavy forged-iron tension band hooping the well (settler anti-tone ward!) + dark cold spring surface inside
    b.torus(R + 0.12, 0.025, mats.forgedIron, 0, 0.46, 0, Math.PI * 0.5, 0, 0);
    b.torus(R + 0.12, 0.025, mats.forgedIron, 0, 0.14, 0, Math.PI * 0.5, 0, 0);
    b.cyl(R - 0.10, R - 0.10, 0.08, mats.deepWater, 0, 0.42, 0, 0, 0, 0, 14);
    // Hand-hewn timber windlass uprights, axle crank, chain, bucket & pitched roof cap
    for (const sx of [-0.88, 0.88]) {
      b.box(0.14, 2.25, 0.14, mats.weatheredTimber, sx, 0.98, 0);
    }
    b.cyl(0.08, 0.08, 1.72, mats.plankWood, 0, 1.48, 0, 0, 0, Math.PI * 0.5, 10);
    b.strut([0.96, 1.48, 0], [0.96, 1.48, 0.22], 0.02, mats.forgedIron, 6);
    b.strut([0.96, 1.48, 0.22], [1.14, 1.48, 0.22], 0.022, mats.plankWood, 6);
    // Hanging iron chain + oak iron-hooped bucket perched on rim
    for (let k = 0; k < 7; k++) {
      b.torus(0.028, 0.008, mats.rustedIron, 0, 1.38 - k * 0.11, 0, 0, k % 2 ? Math.PI * 0.5 : 0);
    }
    b.cyl(0.16, 0.13, 0.26, mats.wetTimber, 0.52, 0.94, 0.54, 0, 0, 0.06, 10);
    b.torus(0.155, 0.012, mats.forgedIron, 0.52, 1.00, 0.54, Math.PI * 0.5, 0, 0);
    // Pitched shingle canopy over the windlass
    b.box(2.18, 0.09, 0.96, mats.wetTimber, 0, 2.26, 0.36, 0.48, 0, 0);
    b.box(2.18, 0.09, 0.96, mats.wetTimber, 0, 2.26, -0.36, -0.48, 0, 0);
    // Horseshoe nailed over the gable peak
    b.horseshoe(mats.forgedIron, 0, 2.12, 0.72, 0, 0, 0, 1.1);
    // Tucked settler tin cache wedged on the stone rim lip
    const boxObj = b.hingedBox({
      w: 0.42, h: 0.22, d: 0.28, bodyMat: mats.forgedIron, trimMat: mats.rustedIron,
      brassMat: mats.brass, innerLootMat: mats.medWhite, x: -0.58, y: 0.72, z: 0.62, ry: -0.48,
    });
    res.lidPivot = boxObj.lidPivot; res.lootMesh = boxObj.lootMesh;
    res.solids.push({ x: 0, z: 0, r: 0.96, h: 1.95 });
    res.interactOffset = { x: 0, y: 1.15, z: 0.75 };
  }

  // Bake all static geometry inside this vignette into 2-4 clean PBR draws & project tidy box UVs where needed!
  b.bakeStatic(id);
  const uvMap = new Map([
    [mats.bunkerConcrete, 1.4],
    [mats.weatheredTimber, 1.3],
    [mats.wetTimber, 1.3],
    [mats.plankWood, 1.4],
    [mats.fieldstone, 1.2],
    [mats.oliveCrate, 1.5],
    [mats.oliveSteel, 1.5],
    [mats.bunkerSteel, 1.5],
  ]);
  applyWorldUVByMaterial(group, uvMap);
  return res;
}

// ---------------------------------------------------------------------------
// 6 INSTANCED LIVED-IN MICRO-PROP GEOMETRIES (1 draw call each across whole map!)
// Every geometry extends deeply below y = 0 (-0.30..-0.65 m) so slopes NEVER leave a floating base!
// ---------------------------------------------------------------------------
function mergeProtoGeos(T, parts, useColors = false) {
  const pos = [], nrm = [], uv = [], col = [];
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3();
  const cObj = new T.Color();
  for (const it of parts) {
    e.set(it.rx || 0, it.ry || 0, it.rz || 0);
    q.setFromEuler(e);
    p.set(it.x || 0, it.y || 0, it.z || 0);
    s.set(it.sx || 1, it.sy || 1, it.sz || 1);
    m4.compose(p, q, s);
    const g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(m4);
    const gp = g.attributes.position, gn = g.attributes.normal, gu = g.attributes.uv;
    if (useColors) cObj.setHex(it.hex != null ? it.hex : 0xffffff);
    for (let i = 0; i < gp.count; i++) {
      pos.push(gp.getX(i), gp.getY(i), gp.getZ(i));
      nrm.push(gn.getX(i), gn.getY(i), gn.getZ(i));
      if (gu) uv.push(gu.getX(i), gu.getY(i));
      else uv.push(gp.getX(i) * 0.6, gp.getY(i) * 0.6);
      if (useColors) col.push(cObj.r, cObj.g, cObj.b);
    }
    g.dispose();
    it.geo.dispose();
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
  out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (useColors) out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

export function buildMicroPropPrototypes(T) {
  const mats = getFillerMaterials(T);
  const timberVC = mats.weatheredTimber.clone();
  timberVC.vertexColors = true;
  timberVC.color.setHex(0xffffff);

  // 1. Weathered Trail Fork Milepost with directional finger slat & painted ochre trail blaze
  const milepostGeo = mergeProtoGeos(T, [
    { geo: new T.BoxGeometry(0.13, 1.85, 0.13), y: 0.42, hex: 0x9b866d },          // buried to y=-0.505
    { geo: new T.BoxGeometry(0.138, 0.14, 0.138), y: 0.88, hex: 0xc29c46 },        // painted trail blaze band
    { geo: new T.BoxGeometry(0.68, 0.16, 0.045), x: 0.24, y: 1.14, z: 0.075, rz: 0.03, hex: 0xb09878 },
    { geo: new T.BoxGeometry(0.16, 0.06, 0.16), y: 1.36, hex: 0x7b6955 },          // weathered cap
  ], true);

  // 2. PGB Field Survey Stake (angled raw timber stake + muted surveyor ribbon flag)
  const stakeGeo = mergeProtoGeos(T, [
    { geo: new T.BoxGeometry(0.055, 1.12, 0.055), y: 0.22, rz: 0.08, hex: 0x9f8b6e }, // buried to y=-0.34
    { geo: new T.BoxGeometry(0.064, 0.08, 0.064), y: 0.72, rz: 0.08, hex: 0xc49a3c }, // tied tape collar
    { geo: new T.BoxGeometry(0.24, 0.095, 0.018), x: 0.14, y: 0.67, z: 0.015, ry: 0.18, rz: -0.22, hex: 0xc49a3c },
  ], true);

  // 3. Coldwater Crumbled Dry-Stone Boundary Wall Stub (deeply rooted fieldstone courses)
  const wallParts = [];
  const stones = [
    [-0.62, 0.02, 0, 0.56, 0.48, 0.44, 0.04],
    [0.02, 0.04, 0.02, 0.64, 0.52, 0.46, -0.03],
    [0.64, 0.00, -0.02, 0.52, 0.44, 0.42, 0.06],
    [-0.32, 0.34, 0.01, 0.54, 0.28, 0.38, -0.04],
    [0.30, 0.32, -0.01, 0.56, 0.26, 0.36, 0.05],
    [-0.02, 0.54, 0.0, 0.44, 0.20, 0.32, 0.02],
  ];
  stones.forEach(([x, y, z, w, h, d, ry], idx) => {
    const sg = buildCompactStoneGeometry(T, { rx: w * 0.56, ry: h * 0.56, rz: d * 0.56, detail: 1, seed: 41860 + idx * 17, style: 'granite', uvTile: 0.8 });
    wallParts.push({ geo: sg, x, y, z, ry });
  });
  const wallStubGeo = mergeProtoGeos(T, wallParts);
  projectStoneBoxUV(wallStubGeo, 0.9);

  // 4. Shoreline Weathered Mooring Piling & Cross-Brace (extends to y=-0.65 m)
  const pilingGeo = mergeProtoGeos(T, [
    { geo: new T.CylinderGeometry(0.11, 0.14, 1.75, 8), y: 0.22, rz: 0.05 },
    { geo: new T.CylinderGeometry(0.085, 0.105, 1.32, 8), x: 0.34, y: 0.04, z: 0.14, rx: -0.07, rz: -0.06 },
    { geo: new T.BoxGeometry(0.46, 0.11, 0.06), x: 0.16, y: 0.52, z: 0.12, ry: -0.25 },
  ]);

  // 5. Balanced 4-Stone River/Basalt Trail Cairn (buried base stone y=-0.22 m)
  const cairnParts = [
    { r: 0.26, h: 0.18, y: -0.02, ox: 0, oz: 0 },
    { r: 0.21, h: 0.14, y: 0.16, ox: 0.02, oz: -0.01 },
    { r: 0.16, h: 0.11, y: 0.30, ox: -0.01, oz: 0.02 },
    { r: 0.11, h: 0.08, y: 0.41, ox: 0.01, oz: 0.0 },
  ].map((s, idx) => ({
    geo: buildCompactStoneGeometry(T, { rx: s.r * 1.08, ry: s.h * 0.72, rz: s.r * 0.96, detail: 1, seed: 41880 + idx * 23, style: 'river', uvTile: 0.6 }),
    x: s.ox, y: s.y, z: s.oz, ry: idx * 1.3,
  }));
  const cairnGeo = mergeProtoGeos(T, cairnParts);

  return {
    milepost: { geo: milepostGeo, mat: timberVC },
    stake: { geo: stakeGeo, mat: timberVC },
    wallStub: { geo: wallStubGeo, mat: mats.fieldstone },
    piling: { geo: pilingGeo, mat: mats.wetTimber },
    cairn: { geo: cairnGeo, mat: mats.riverCobble },
    fireflyTex: getRadialGlowTexture(T),
  };
}

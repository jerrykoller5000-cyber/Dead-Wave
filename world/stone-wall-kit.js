// world/stone-wall-kit.js
// AG-204b / J67 / CL-296: Dry field-stone wall kit for valley scenery barriers.
// Replaces low-poly dark hedge blobs with coursed dry-stone walls (2.8 - 3.5 m)
// providing natural choke points and blocking sightlines for sector culling.
// Optimized for triangle budget: <= hedge bands' budget.
// - Fewer, larger stones in courses (silhouette and coping carry the read)
// - Moss and ivy as cards (2-4 tris per patch)
// - Far slabs past ~48 m from the origin when the page asks ?walls=slabs (the CU-233 look).
// - CU-234, game lines: 24 m cells. Far slabs are one InstancedMesh (colour per instance).
//   Near stone, moss and ivy merge per cell, built the first time the camera is within
//   70 m (one cell a frame) and shown within 40 m (hidden again past 44 m).
// - Circle and studio builds stay full detail, three draws.
// All draws support castShadow = true, receiveShadow = true.

export const STONE_WALL_DEFAULTS = {
  intactHeightMin: 2.80,
  intactHeightMax: 3.45,
  pierHeight: 3.45,
  breachHeightMin: 1.75,
  breachHeightMax: 2.10,
  baseThickness: 1.28,
  topThickness: 0.92,
  copingThickness: 1.04,
  copingHeight: 0.24,
  copingOverhang: 0.06,
  pierWidth: 1.55,
  pierDepth: 1.55,
  trailGapClearance: 4.0,
  stepLength: 2.10, // Larger step length reduces station count while keeping unbroken barrier
};

// Lighter dry field-stone palette (warm buff / weathered limestone / gray granite)
// Addresses Jerry / Claude critique: prototype read near-black at noon.
export const FIELD_STONE_PALETTE = [
  0xa8a49c, 0xb4b0a4, 0x9e9b92, 0xc0bbb0,
  0xa5a198, 0x8f8c84, 0xb8b4aa, 0x98948c,
  0xaba79e, 0xb2aea6, 0x88857d, 0x949087,
];

export const CAPSTONE_PALETTE = [
  0xbbb7ad, 0xc4bfb5, 0xa6a299, 0xb0aba2,
];

export const MOSS_PALETTE = [
  0x4a6b32, 0x587d3a, 0x3d5929, 0x628b42, 0x44632c,
];

export const IVY_PALETTE = [
  0x264220, 0x31522a, 0x1e3619, 0x3a5e32, 0x2d4d27,
];

export function createStoneWallMaterials(THREE) {
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
    flatShading: true,
  });
  stoneMat.name = 'stone-wall-masonry';

  const mossMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.01,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  mossMat.name = 'stone-wall-moss';

  const ivyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.02,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  ivyMat.name = 'stone-wall-ivy';

  return { stoneMat, mossMat, ivyMat };
}

/**
 * Builds the stone wall kit geometry folded into 3 draws.
 * @param {Object} params
 * @param {Object} params.THREE - Three.js instance
 * @param {Function} params.sampleHeight - (x, z) => groundY
 * @param {Array<{x:number, z:number}>} [params.arcPoints] - Explicit wall centerline points
 * @param {number} [params.radius=60] - Ring radius if building circular arc
 * @param {number} [params.startAngle=-0.75]
 * @param {number} [params.endAngle=0.45]
 * @param {Array<{angle:number, clearWidth:number}>} [params.gaps] - Trail gap angular openings
 * @param {Object} [params.materials] - Cached materials or created anew
 * @param {number} [params.seed=0x510e9a11] - PRNG seed
 * @returns {THREE.Group} Group containing 3 meshes (stone, moss, ivy)
 */
export function buildStoneWallKit(params) {
  const {
    THREE,
    sampleHeight,
    radius = 60.0,
    startAngle = -0.75,
    endAngle = 0.45,
    gaps = [{ angle: -0.335, clearWidth: 6.4 }],
    materials,
    seed: initialSeed = 0x510e9a11,
  } = params;

  let seed = initialSeed | 0;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const mats = materials || createStoneWallMaterials(THREE);

  const stoneTris = { pos: [], nrm: [], col: [] };
  const mossTris = { pos: [], nrm: [], col: [] };
  const ivyTris = { pos: [], nrm: [], col: [] };

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const nV = new THREE.Vector3();
  const cTmp = new THREE.Color();

  function pushGeo(bucket, geo, mat4, hex, jitter = 0.02, shadeBottom = 0.18) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const P = g.attributes.position;
    cTmp.setHex(hex);
    let yLo = Infinity, yHi = -Infinity;
    for (let i = 0; i < P.count; i++) {
      const py = P.getY(i);
      if (py < yLo) yLo = py;
      if (py > yHi) yHi = py;
    }
    const hRange = Math.max(0.01, yHi - yLo);

    for (let i = 0; i < P.count; i += 3) {
      vA.fromBufferAttribute(P, i);
      vB.fromBufferAttribute(P, i + 1);
      vC.fromBufferAttribute(P, i + 2);
      for (const v of [vA, vB, vC]) {
        if (jitter > 0) {
          const h = Math.sin(v.x * 19.3 + v.y * 31.7 + v.z * 23.1) * 0.5 + Math.cos(v.z * 13.7 - v.x * 17.9) * 0.5;
          v.x += h * jitter;
          v.y += h * jitter * 0.5;
          v.z -= h * jitter;
        }
        v.applyMatrix4(mat4);
      }
      nV.subVectors(vB, vA).cross(vC.clone().sub(vA)).normalize();
      for (let j = 0; j < 3; j++) {
        const v = j === 0 ? vA : j === 1 ? vB : vC;
        bucket.pos.push(v.x, v.y, v.z);
        bucket.nrm.push(nV.x, nV.y, nV.z);
        const origY = P.getY(i + j);
        const tY = (origY - yLo) / hRange;
        const ao = (1 - shadeBottom) + shadeBottom * tY;
        bucket.col.push(
          Math.min(1, cTmp.r * ao),
          Math.min(1, cTmp.g * ao),
          Math.min(1, cTmp.b * ao)
        );
      }
    }
    g.dispose();
  }

  // Efficient primitives: single-segment Box (12 tris), low-poly rock (Dodecahedron/Box), Quad Card (2 tris)
  const boxGeo = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const rubbleGeo = new THREE.DodecahedronGeometry(0.4, 0);
  const cardGeo = new THREE.PlaneGeometry(1, 1);

  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const eul = new THREE.Euler();

  const stepM = STONE_WALL_DEFAULTS.stepLength;
  const stations = [];

  const distToPoly = (x, z, pts) => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z, q = dx * dx + dz * dz;
      const t = q > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / q)) : 0;
      const px = a.x + t * dx, pz = a.z + t * dz, ddx = x - px, ddz = z - pz;
      best = Math.min(best, ddx * ddx + ddz * ddz);
    }
    return Math.sqrt(best);
  };

  const consider = (dist, half, state) => {
    if (!(half > 0)) return;
    if (dist < half) { state.inGap = true; return; }
    const edge = dist - half;
    if (edge < state.edge) state.edge = edge;
    if (edge < 1.6) state.isPillar = true;
  };

  const circleStations = () => {
    const dAng = stepM / radius;
    for (let ang = startAngle; ang <= endAngle; ang += dAng) {
      const x = Math.sin(ang) * radius;
      const z = Math.cos(ang) * radius;
      const state = { inGap: false, edge: Infinity, isPillar: false };
      for (const gap of gaps) {
        const gapAng = gap.angle;
        const gapArcHalf = (gap.clearWidth || 6.4) * 0.5;
        const dist = Math.abs(ang - gapAng) * radius;
        consider(dist, gapArcHalf, state);
        if (state.inGap) break;
      }
      if (state.inGap) continue;
      const nx = Math.sin(ang), nz = Math.cos(ang);
      const tangentYaw = ang + Math.PI / 2;
      stations.push({
        x, z, sideX: nx, sideZ: nz, alongX: Math.sin(tangentYaw), alongZ: Math.cos(tangentYaw),
        yaw: tangentYaw, ang, isPillar: state.isPillar,
      });
    }
  };

  const lineStations = (pts, lineGaps) => {
    if (!pts || pts.length < 2) return;
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    const length = lens[lens.length - 1];
    const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z) < 1e-3;
    for (let at = 0; at <= length; at += stepM) {
      let i = 1;
      while (i < lens.length - 1 && lens[i] < at) i++;
      const seg = lens[i] - lens[i - 1], t = seg > 0 ? (at - lens[i - 1]) / seg : 0;
      const a = pts[i - 1], b = pts[i];
      const alongX = seg > 0 ? (b.x - a.x) / seg : 1, alongZ = seg > 0 ? (b.z - a.z) / seg : 0;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const state = { inGap: false, edge: Infinity, isPillar: false };
      for (const gap of lineGaps) {
        if (gap.pts) consider(distToPoly(x, z, gap.pts), gap.halfWidth, state);
        else if (gap.at != null) {
          const half = (gap.width ?? gap.clearWidth) * 0.5;
          let dist = Math.abs(at - gap.at);
          if (closed && length > 0) dist = Math.abs(((at - gap.at + length * 0.5) % length) - length * 0.5);
          consider(dist, half, state);
        }
        if (state.inGap) break;
      }
      if (state.inGap) continue;
      stations.push({
        x, z, sideX: alongZ, sideZ: -alongX, alongX, alongZ,
        yaw: Math.atan2(alongX, alongZ), ang: at / 60, isPillar: state.isPillar,
      });
    }
  };

  if (Array.isArray(params.lines) && params.lines.length) {
    for (const line of params.lines) lineStations(line.pts, line.gaps || []);
  } else circleStations();

  // CU-234: the game's bands LOD by the camera. ?walls=slabs keeps the origin distance.
  const lineMode = Array.isArray(params.lines) && params.lines.length;
  let keepOriginLod = false;
  if (lineMode && typeof location !== 'undefined' && location && location.search) {
    keepOriginLod = new URLSearchParams(location.search).get('walls') === 'slabs';
  }
  if (lineMode && !keepOriginLod) return assembleCameraLod();

  for (const st of stations) {
    const { x, z, yaw: tangentYaw, sideX, sideZ, alongX, alongZ, ang, isPillar } = st;
    const gy = sampleHeight ? sampleHeight(x, z) : 0;

    // Far LOD check: stations past 45 m from primary points use a textured slab (12 tris)
    // In studio mode (arcPoints/radius), stations are kept full-detail for inspection.
    const isStudio = !Array.isArray(params.lines);
    const distCenter = Math.hypot(x, z);
    const isFarLOD = !isStudio && !isPillar && distCenter > 48.0;

    if (isFarLOD) {
      // FAR LOD: Single textured slab box (12 triangles) with integrated batter and capstone silhouette
      const slabH = STONE_WALL_DEFAULTS.intactHeightMin + 0.3 * Math.sin(ang * 8.5);
      pos.set(x, gy + slabH * 0.5 - 0.05, z);
      eul.set(0, tangentYaw, 0);
      quat.setFromEuler(eul);
      scl.set(STONE_WALL_DEFAULTS.baseThickness * 0.95, slabH, stepM * 1.02);
      m4.compose(pos, quat, scl);
      const colHex = FIELD_STONE_PALETTE[Math.floor(rnd() * FIELD_STONE_PALETTE.length)];
      pushGeo(stoneTris, boxGeo, m4, colHex, 0.01, 0.22);
      continue;
    }

    // NEAR / MID DETAIL:
    // Breach wave: periodic tumbled breaks with verge rubble
    const breachWave = Math.sin(ang * 17.5) + 0.55 * Math.cos(ang * 33.0);
    const isBreach = !isPillar && breachWave > 1.15;

    const targetH = isPillar
      ? STONE_WALL_DEFAULTS.pierHeight
      : isBreach
      ? (STONE_WALL_DEFAULTS.breachHeightMin + rnd() * (STONE_WALL_DEFAULTS.breachHeightMax - STONE_WALL_DEFAULTS.breachHeightMin))
      : (STONE_WALL_DEFAULTS.intactHeightMin + 0.35 * Math.sin(ang * 8.5) + rnd() * 0.25);

    if (isPillar) {
      // Squared Gate Pier framing gap: single column box + pyramid/flat cap (24 tris)
      const pierH = STONE_WALL_DEFAULTS.pierHeight;
      pos.set(x, gy + pierH * 0.5 - 0.05, z);
      eul.set(0, tangentYaw, 0);
      quat.setFromEuler(eul);
      scl.set(STONE_WALL_DEFAULTS.pierWidth, pierH, STONE_WALL_DEFAULTS.pierDepth);
      m4.compose(pos, quat, scl);
      const pierCol = FIELD_STONE_PALETTE[Math.floor(rnd() * FIELD_STONE_PALETTE.length)];
      pushGeo(stoneTris, boxGeo, m4, pierCol, 0.015, 0.22);

      // Pier capstone
      const capCol = CAPSTONE_PALETTE[Math.floor(rnd() * CAPSTONE_PALETTE.length)];
      pos.set(x, gy + pierH + 0.12, z);
      quat.setFromEuler(eul);
      scl.set(STONE_WALL_DEFAULTS.pierWidth + 0.18, 0.24, STONE_WALL_DEFAULTS.pierDepth + 0.18);
      m4.compose(pos, quat, scl);
      pushGeo(stoneTris, boxGeo, m4, capCol, 0.01, 0.12);
      continue;
    }

    // Fewer, larger stones in courses:
    // 2 large courses (foundation/lower course + upper bond course) carry the weight and read cleanly
    const courses = isBreach ? 1 : 2;
    let curY = gy - 0.08;

    for (let c = 0; c < courses; c++) {
      const frac = c / courses;
      const courseH = (targetH / courses) * (c === 0 ? 1.08 : 0.92);
      const batterW = STONE_WALL_DEFAULTS.baseThickness * (1.0 - frac * 0.22);
      const courseY = curY + courseH * 0.5;

      // 1-2 large dry fieldstone blocks per course
      const blocksInCourse = (rnd() < 0.35 && !isBreach) ? 2 : 1;
      const subLen = (stepM * 1.02) / blocksInCourse;

      for (let b = 0; b < blocksInCourse; b++) {
        const alongOff = (b + 0.5 - blocksInCourse * 0.5) * subLen;
        const bx = x + alongX * alongOff;
        const bz = z + alongZ * alongOff;
        const colHex = FIELD_STONE_PALETTE[Math.floor(rnd() * FIELD_STONE_PALETTE.length)];

        pos.set(bx, courseY, bz);
        eul.set((rnd() - 0.5) * 0.025, tangentYaw + (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.025);
        quat.setFromEuler(eul);
        scl.set(batterW * (0.94 + rnd() * 0.10), courseH * 0.98, subLen * 0.98);
        m4.compose(pos, quat, scl);
        pushGeo(stoneTris, boxGeo, m4, colHex, 0.02, 0.18);
      }
      curY += courseH;
    }

    // Flat overhanging coping capstone on intact sections (12 tris)
    if (!isBreach) {
      const capCol = CAPSTONE_PALETTE[Math.floor(rnd() * CAPSTONE_PALETTE.length)];
      const capH = STONE_WALL_DEFAULTS.copingHeight;
      pos.set(x, curY + capH * 0.5, z);
      eul.set((rnd() - 0.5) * 0.02, tangentYaw + (rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.02);
      quat.setFromEuler(eul);
      scl.set(STONE_WALL_DEFAULTS.copingThickness, capH, stepM * 1.04);
      m4.compose(pos, quat, scl);
      pushGeo(stoneTris, boxGeo, m4, capCol, 0.015, 0.12);

      // Moss as a horizontal card on top of coping (2 tris)
      if (rnd() < 0.65) {
        const mossCol = MOSS_PALETTE[Math.floor(rnd() * MOSS_PALETTE.length)];
        pos.set(x + (rnd() - 0.5) * 0.15, curY + capH + 0.02, z + (rnd() - 0.5) * 0.15);
        eul.set(-Math.PI * 0.5 + (rnd() - 0.5) * 0.05, tangentYaw + rnd() * 0.5, 0);
        quat.setFromEuler(eul);
        scl.set(0.75 + rnd() * 0.35, stepM * 0.55 + rnd() * 0.3, 1);
        m4.compose(pos, quat, scl);
        pushGeo(mossTris, cardGeo, m4, mossCol, 0.01, 0.05);
      }
    } else {
      // Fallen rubble stones along the verge on both sides of tumbled breach (8 tris each)
      const rubbleCount = 2 + Math.floor(rnd() * 2);
      for (let r = 0; r < rubbleCount; r++) {
        const side = (r % 2 === 0 ? 1 : -1) * (0.75 + rnd() * 0.65);
        const along = (rnd() - 0.5) * (stepM * 0.8);
        const rx = x + sideX * side + alongX * along;
        const rz = z + sideZ * side + alongZ * along;
        const rgy = sampleHeight ? sampleHeight(rx, rz) : 0;
        pos.set(rx, rgy + 0.20, rz);
        eul.set(rnd() * 3.14, rnd() * 3.14, rnd() * 3.14);
        quat.setFromEuler(eul);
        scl.set(0.55 + rnd() * 0.25, 0.35 + rnd() * 0.20, 0.50 + rnd() * 0.25);
        m4.compose(pos, quat, scl);
        const colHex = FIELD_STONE_PALETTE[Math.floor(rnd() * FIELD_STONE_PALETTE.length)];
        pushGeo(stoneTris, rubbleGeo, m4, colHex, 0.02, 0.22);
      }
    }

    // Climbing ivy as vertical cards hugging wall faces (2 tris per card)
    if (rnd() < 0.50) {
      for (const faceSide of [-1, 1]) {
        if (rnd() < 0.40) continue;
        const faceOff = faceSide * (STONE_WALL_DEFAULTS.baseThickness * 0.48 + 0.03);
        const vx = x + sideX * faceOff;
        const vz = z + sideZ * faceOff;
        const cardH = Math.min(curY - gy, 1.4 + rnd() * 1.2);
        const ivyCol = IVY_PALETTE[Math.floor(rnd() * IVY_PALETTE.length)];

        pos.set(vx, gy + cardH * 0.5, vz);
        eul.set(0, tangentYaw + (faceSide < 0 ? Math.PI : 0), 0);
        quat.setFromEuler(eul);
        scl.set(0.85 + rnd() * 0.45, cardH, 1);
        m4.compose(pos, quat, scl);
        pushGeo(ivyTris, cardGeo, m4, ivyCol, 0.01, 0.15);
      }
    }
  }

  boxGeo.dispose();
  rubbleGeo.dispose();
  cardGeo.dispose();

  function makeMesh(bucket, mat, name) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bucket.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.nrm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(bucket.col, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  const group = new THREE.Group();
  group.name = 'stone-wall-kit';

  const stoneMesh = makeMesh(stoneTris, mats.stoneMat, 'stone-wall-masonry');
  const mossMesh = makeMesh(mossTris, mats.mossMat, 'stone-wall-moss');
  const ivyMesh = makeMesh(ivyTris, mats.ivyMat, 'stone-wall-ivy');

  group.add(stoneMesh);
  group.add(mossMesh);
  group.add(ivyMesh);

  group.userData = {
    draws: 3,
    tris: (stoneTris.pos.length + mossTris.pos.length + ivyTris.pos.length) / 3,
    stoneTris: stoneTris.pos.length / 3,
    mossTris: mossTris.pos.length / 3,
    ivyTris: ivyTris.pos.length / 3,
  };

  return group;

  // CU-234. Hoisted. Game lines only; the origin-LOD loop above is ?walls=slabs and the circle build.
  function assembleCameraLod() {
    const CELL = 24;
    const BUILD_DIST = 70;
    const NEAR_IN = 40;
    const NEAR_OUT = 44;
    const cells = [];
    const cellMap = new Map();
    const slabList = [];

    function makeRng(seed0) {
      let s = seed0 | 0;
      return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // CL-300 (J67, AG-211/AG-215: up close the wall read as "big grey blocks"): a dry-stone field wall where he stands.
    // Courses 22-42 cm high of stones 30-80 cm long, staggered, each stone a little turned and proud of the face, warm
    // field colours; a dark hearting behind them so every joint reads as shadow; a coping of stones set on edge ("cock
    // and hen"), moss on the top and the foot. The joints come from the line's own distance (not the station), so the
    // courses run on through the 2.1 m stations without a seam; a stone belongs to the station its middle is in.
    const NEAR_PALETTE = [0xb9ad97, 0xa89f8c, 0xc4b9a3, 0x9a927f, 0xb0a891, 0x8e8676, 0xa39785, 0xbfb4a0, 0x9d9a90, 0xaaa59a, 0x938a78, 0xb5ab95];
    const HEART = 0x2b2924, MOSS_TOP = 0x5d7a3c, MOSS_DAMP = 0x4c6a34;
    const hash = (a, b, c) => { let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13; return ((h >>> 0) % 100000) / 100000; };
    const UNIT = (() => { const g = boxGeo.index ? boxGeo.toNonIndexed() : boxGeo.clone(); const a = Float32Array.from(g.attributes.position.array); g.dispose(); return a; })();
    const _c = new THREE.Color(), _m = new THREE.Color();
    // One box: centre (x, y, z), size (w along, h, d across), turned by yaw about up (plus tilt and lean), coloured; the
    // corners pushed by a hash so stones aren't square (shared corners move together: no cracks). No allocation.
    function stoneBox(bucket, x, y, z, w, h, d, yaw, tilt, lean, hex, bright, moss, mossHex, seed, jag) {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), stt = Math.sin(tilt), cl = Math.cos(lean), sl = Math.sin(lean);
      _c.setHex(hex).multiplyScalar(bright); if (moss > 0) _m.setHex(mossHex), _c.lerp(_m, moss);
      const P = UNIT, v = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < P.length; i += 9) {
        for (let k = 0; k < 3; k++) {
          let lx = P[i + k * 3], ly = P[i + k * 3 + 1], lz = P[i + k * 3 + 2];
          const hj = hash(seed, Math.round(lx * 2) * 3 + Math.round(ly * 2) * 7 + Math.round(lz * 2) * 13, 77) - 0.5;
          lx = lx * w + hj * jag; ly = ly * h + hj * jag * 0.6; lz = lz * d - hj * jag * 0.5;
          // lean (about the along axis), tilt (about across), then yaw: the box's x runs along the wall
          let ty = ly * cl - lz * sl, tz = ly * sl + lz * cl; ly = ty; lz = tz;
          const tx = lx * ct - ly * stt; ty = lx * stt + ly * ct; lx = tx; ly = ty;
          v[k * 3] = x + lx * cy + lz * sy; v[k * 3 + 1] = y + ly; v[k * 3 + 2] = z - lx * sy + lz * cy;
        }
        const ux = v[3] - v[0], uy = v[4] - v[1], uz = v[5] - v[2], wx = v[6] - v[0], wy = v[7] - v[1], wz = v[8] - v[2];
        let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        // a face's light: the top a touch brighter, the underside darker (the course below shades it)
        const f = ny > 0.5 ? 1.06 : ny < -0.5 ? 0.62 : 0.94;
        for (let k = 0; k < 3; k++) {
          bucket.pos.push(v[k * 3], v[k * 3 + 1], v[k * 3 + 2]); bucket.nrm.push(nx, ny, nz);
          bucket.col.push(Math.min(1, _c.r * f), Math.min(1, _c.g * f), Math.min(1, _c.b * f));
        }
      }
    }

    for (let si = 0; si < stations.length; si++) {
      const st = stations[si];
      st.index = si;
      const { x, z, yaw: tangentYaw, ang, isPillar } = st;
      const gy = sampleHeight ? sampleHeight(x, z) : 0;
      if (isPillar) {
        // CL-300: a gate pier built like the wall: quoins in courses, alternately long along and across, a cap stone
        const pierH = STONE_WALL_DEFAULTS.pierHeight, PW = STONE_WALL_DEFAULTS.pierWidth, PD = STONE_WALL_DEFAULTS.pierDepth;
        const pyaw = Math.atan2(-st.alongZ, st.alongX), sd0 = si * 131 + 7;
        stoneBox(stoneTris, x, gy + pierH * 0.5 - 0.05, z, PW * 0.84, pierH, PD * 0.84, pyaw, 0, 0, HEART, 1, 0, 0, 1, 0);
        let py = -0.05, pc = 0;
        while (py < pierH - 0.12 && pc < 14) {
          const h = Math.min(pierH - py, 0.3 + hash(sd0, pc, 1) * 0.16), flip = pc % 2;
          for (let q = 0; q < 2; q++) {
            const r1 = hash(sd0, pc, 10 + q), r2 = hash(sd0, pc, 20 + q), sgn = q ? 1 : -1;
            const ox = flip ? 0 : sgn * PW * 0.25, oz = flip ? sgn * PD * 0.25 : 0;
            const w = flip ? PW * 0.98 : PW * 0.49, d = flip ? PD * 0.49 : PD * 0.98;
            stoneBox(stoneTris, x + st.alongX * ox + st.sideX * oz, gy + py + h * 0.5, z + st.alongZ * ox + st.sideZ * oz, w * 0.97, h * 0.9, d * 0.97,
              pyaw + (r1 - 0.5) * 0.05, 0, (r2 - 0.5) * 0.03, NEAR_PALETTE[Math.floor(r2 * NEAR_PALETTE.length)], 0.92 + r1 * 0.2, pc === 0 ? 0.3 : 0, MOSS_DAMP, sd0 + pc * 3 + q, 0.035);
          }
          py += h; pc++;
        }
        stoneBox(stoneTris, x, gy + pierH + 0.11, z, PW + 0.16, 0.22, PD + 0.16, pyaw, 0, 0, CAPSTONE_PALETTE[si % CAPSTONE_PALETTE.length], 1, 0.25, MOSS_TOP, sd0 + 99, 0.03);
        continue;
      }
      const slabH = STONE_WALL_DEFAULTS.intactHeightMin + 0.3 * Math.sin(ang * 8.5);
      pos.set(x, gy + slabH * 0.5 - 0.05, z);
      eul.set(0, tangentYaw, 0);
      quat.setFromEuler(eul);
      scl.set(STONE_WALL_DEFAULTS.baseThickness * 0.95, slabH, stepM * 1.02);
      m4.compose(pos, quat, scl);
      const hex = new THREE.Color(NEAR_PALETTE[Math.floor(rnd() * NEAR_PALETTE.length)]).multiplyScalar(0.8).getHex();   // CL-300: the near stone's colour at a distance
      const rec = { st, inst: slabList.length, hex, mx: new Float32Array(16) };
      rec.mx.set(m4.elements);
      slabList.push(rec);
      const key = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
      let cell = cellMap.get(key);
      if (!cell) {
        cell = { key, minX: x, maxX: x, minZ: z, maxZ: z, stations: [], built: false, near: false, meshes: [] };
        cellMap.set(key, cell);
        cells.push(cell);
      } else {
        if (x < cell.minX) cell.minX = x;
        if (x > cell.maxX) cell.maxX = x;
        if (z < cell.minZ) cell.minZ = z;
        if (z > cell.maxZ) cell.maxZ = z;
      }
      cell.stations.push(rec);
    }

    const group = new THREE.Group();
    group.name = 'stone-wall-kit';
    if (stoneTris.pos.length) {
      const pierMesh = makeMesh(stoneTris, mats.stoneMat, 'stone-wall-masonry');
      pierMesh.matrixAutoUpdate = false;
      group.add(pierMesh);
    }

    const n = slabList.length;
    const baseMatrices = new Float32Array(n * 16);
    let slabMesh = null;
    if (n) {
      const slabGeo = new THREE.BoxGeometry(1, 1, 1);
      const slabMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.88, metalness: 0.04, flatShading: true,
      });
      slabMat.name = 'stone-wall-slab';
      slabMesh = new THREE.InstancedMesh(slabGeo, slabMat, n);
      slabMesh.name = 'stone-wall-slabs';
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      slabMesh.frustumCulled = false;
      slabMesh.matrixAutoUpdate = false;
      const tint = new THREE.Color();
      const tmp = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        baseMatrices.set(slabList[i].mx, i * 16);
        tmp.fromArray(baseMatrices, i * 16);
        slabMesh.setMatrixAt(i, tmp);
        slabMesh.setColorAt(i, tint.setHex(slabList[i].hex));
      }
      slabMesh.instanceMatrix.needsUpdate = true;
      if (slabMesh.instanceColor) slabMesh.instanceColor.needsUpdate = true;
      group.add(slabMesh);
    }

    function distToCell(cell, x, z) {
      const cx = x < cell.minX ? cell.minX : (x > cell.maxX ? cell.maxX : x);
      const cz = z < cell.minZ ? cell.minZ : (z > cell.maxZ ? cell.maxZ : z);
      const dx = x - cx, dz = z - cz;
      return Math.sqrt(dx * dx + dz * dz);
    }

    function writeSlab(inst, hide) {
      const arr = slabMesh.instanceMatrix.array;
      const o = inst * 16;
      if (!hide) {
        for (let k = 0; k < 16; k++) arr[o + k] = baseMatrices[o + k];
      } else {
        arr[o] = arr[o + 1] = arr[o + 2] = 0;
        arr[o + 4] = arr[o + 5] = arr[o + 6] = 0;
        arr[o + 8] = arr[o + 9] = arr[o + 10] = 0;
      }
    }

    function setCellNear(cell, show) {
      cell.near = show;
      for (let i = 0; i < cell.meshes.length; i++) cell.meshes[i].visible = show;
      if (!slabMesh) return;
      for (let i = 0; i < cell.stations.length; i++) writeSlab(cell.stations[i].inst, show);
      slabMesh.instanceMatrix.needsUpdate = true;
    }

    function emitNear(st, localRnd, buckets) {
      const { x, z, alongX, alongZ, sideX, sideZ, ang } = st;
      const yaw = Math.atan2(-alongZ, alongX);   // the box's x along the wall
      const gy = sampleHeight ? sampleHeight(x, z) : 0;
      const at = ang * 60, half = stepM * 0.5, a0 = at - half, a1 = at + half;
      const breachWave = Math.sin(ang * 17.5) + 0.55 * Math.cos(ang * 33.0);
      const isBreach = breachWave > 1.15;
      // height from the line's distance only, so neighbours agree (a course's step at most where it changes)
      const topH = isBreach
        ? STONE_WALL_DEFAULTS.breachHeightMin + 0.3 * (0.5 + 0.5 * Math.sin(at * 0.9))
        : STONE_WALL_DEFAULTS.intactHeightMin + 0.32 * (0.5 + 0.5 * Math.sin(at * 0.142)) + 0.18 * (0.5 + 0.5 * Math.sin(at * 0.53 + 1.3));
      const capH = isBreach ? 0 : 0.34;
      const bodyH = topH - capH;
      const T0 = STONE_WALL_DEFAULTS.baseThickness, T1 = STONE_WALL_DEFAULTS.topThickness;
      const thickAt = (hgt) => T0 + (T1 - T0) * Math.min(1, Math.max(0, hgt / topH));
      // the hearting: dark, inset, so a joint shows shadow, never sky
      stoneBox(buckets.stone, x, gy + bodyH * 0.5 - 0.05, z, stepM * 1.03, bodyH + 0.1, (T0 + T1) * 0.5 * 0.82, yaw, 0, 0, HEART, 1, 0, 0, 1, 0);
      // courses: heights by course index (the same down the whole line), joints by the line's distance
      let y = -0.06, c = 0;
      while (y < bodyH - 0.1 && c < 16) {
        let h = 0.22 + hash(91, c, 3) * 0.2;
        if (c === 0) h += 0.08;                       // bigger stones at the foot
        if (bodyH - (y + h) < 0.16) h = bodyH - y;    // the last course fills to the coping
        const thick = thickAt(y + h * 0.5);
        // walk this course's joints from the line's start: spacing 0.32-0.78 m, its own phase
        const phase = hash(17, c, 5) * 0.6;
        let j = Math.floor((a0 - phase) / 0.55) - 2, s0 = phase + j * 0.55 + (hash(c, j, 9) - 0.5) * 0.24;
        for (let guard = 0; guard < 24; guard++) {
          const j1 = j + 1, s1 = phase + j1 * 0.55 + (hash(c, j1, 9) - 0.5) * 0.24;
          const mid = (s0 + s1) * 0.5;
          if (mid >= a1) break;
          if (mid >= a0) {
            const len = s1 - s0, off = mid - at, sd = c * 7919 + j * 31;
            const r1 = hash(sd, 1, 2), r2 = hash(sd, 3, 4), r3 = hash(sd, 5, 6), r4 = hash(sd, 7, 8);
            const proud = (r1 - 0.5) * 0.06, hex = NEAR_PALETTE[Math.floor(r2 * NEAR_PALETTE.length)];
            const moss = c === 0 && r3 < 0.45 ? 0.35 + r3 * 0.5 : (r3 < 0.06 ? 0.3 : 0);
            stoneBox(buckets.stone, x + alongX * off + sideX * proud, gy + y + h * 0.5, z + alongZ * off + sideZ * proud,
              len * (0.9 + r4 * 0.06), h * (0.86 + r1 * 0.08), thick * (0.96 + r2 * 0.06),
              yaw + (r3 - 0.5) * 0.09, (r4 - 0.5) * 0.06, (r1 - 0.5) * 0.05, hex, 0.88 + r4 * 0.24, moss, MOSS_DAMP, sd, Math.min(0.07, h * 0.22));
          }
          j = j1; s0 = s1;
        }
        y += h; c++;
      }
      if (!isBreach) {
        // the coping: stones on edge, 12-22 cm thick along, some leaning, mossed
        let k = Math.floor(a0 / 0.17) - 2;
        for (let guard = 0; guard < 24; guard++, k++) {
          const s0 = k * 0.17 + (hash(k, 11, 3) - 0.5) * 0.04, s1 = (k + 1) * 0.17 + (hash(k + 1, 11, 3) - 0.5) * 0.04, mid = (s0 + s1) * 0.5;
          if (mid >= a1) break;
          if (mid < a0) continue;
          const r1 = hash(k, 21, 1), r2 = hash(k, 22, 2), r3 = hash(k, 23, 3), off = mid - at, hh = capH * (0.8 + r1 * 0.45);
          stoneBox(buckets.stone, x + alongX * off, gy + bodyH + hh * 0.5 - 0.02, z + alongZ * off, (s1 - s0) * 0.9, hh, T1 * (0.9 + r2 * 0.12),
            yaw, (r3 - 0.5) * 0.35, (r2 - 0.5) * 0.06, NEAR_PALETTE[Math.floor(r2 * NEAR_PALETTE.length)], 0.9 + r1 * 0.2,
            r3 < 0.4 ? 0.45 + r3 : 0.08, MOSS_TOP, k * 13 + 5, 0.025);
        }
      } else {
        // a breach: the top courses fallen to the verge
        for (let r = 0; r < 4; r++) {
          const sd = Math.floor(at * 10) * 17 + r, r1 = hash(sd, 1, 1), r2 = hash(sd, 2, 2), r3 = hash(sd, 3, 3);
          const sideOff = (r % 2 ? 1 : -1) * (0.85 + r1 * 0.7), along = (r2 - 0.5) * stepM * 0.8;
          const rx = x + sideX * sideOff + alongX * along, rz = z + sideZ * sideOff + alongZ * along, rgy = sampleHeight ? sampleHeight(rx, rz) : gy;
          stoneBox(buckets.stone, rx, rgy + 0.12, rz, 0.35 + r1 * 0.3, 0.22 + r2 * 0.12, 0.3 + r3 * 0.25, yaw + r3 * 2, (r1 - 0.5) * 0.5, (r2 - 0.5) * 0.4,
            NEAR_PALETTE[Math.floor(r3 * NEAR_PALETTE.length)], 0.9 + r2 * 0.15, r1 < 0.5 ? 0.4 : 0, MOSS_DAMP, sd, 0.05);
        }
      }
    }

    function buildCell(cell, camX, camZ) {
      const buckets = {
        stone: { pos: [], nrm: [], col: [] },
        moss: { pos: [], nrm: [], col: [] },
        ivy: { pos: [], nrm: [], col: [] },
      };
      let tris = 0;
      for (let i = 0; i < cell.stations.length; i++) {
        const rec = cell.stations[i];
        emitNear(rec.st, makeRng(initialSeed ^ Math.imul(rec.st.index + 1, 0x9e3779b1)), buckets);
      }
      const parts = [
        [buckets.stone, mats.stoneMat, 'stone-wall-masonry'],
        [buckets.moss, mats.mossMat, 'stone-wall-moss'],
        [buckets.ivy, mats.ivyMat, 'stone-wall-ivy'],
      ];
      for (let i = 0; i < parts.length; i++) {
        const bucket = parts[i][0];
        if (!bucket.pos.length) continue;
        const mesh = makeMesh(bucket, parts[i][1], parts[i][2]);
        mesh.visible = false;
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
        cell.meshes.push(mesh);
        tris += bucket.pos.length / 9;
      }
      cell.built = true;
      group.userData.builtCells = (group.userData.builtCells || 0) + 1;
      group.userData.nearTris = (group.userData.nearTris || 0) + tris;
      if (distToCell(cell, camX, camZ) <= NEAR_IN) setCellNear(cell, true);
    }

    let lastToggle = -1e9;
    let lastBuild = -1e9;
    function tick(camera) {
      if (!camera || camera.isPerspectiveCamera !== true) return;
      const now = performance.now();
      const camE = camera.matrixWorld.elements;
      const camX = camE[12], camZ = camE[14];
      if (now - lastBuild >= 12) {
        let best = null, bestD = BUILD_DIST;
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          if (cell.built) continue;
          const d = distToCell(cell, camX, camZ);
          if (d < bestD) { bestD = d; best = cell; }
        }
        if (best) {
          lastBuild = now;
          buildCell(best, camX, camZ);
        }
      }
      if (now - lastToggle < 250) return;
      lastToggle = now;
      let showing = 0;
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (!cell.built) continue;
        const d = distToCell(cell, camX, camZ);
        let show = cell.near;
        if (!show && d <= NEAR_IN) show = true;
        else if (show && d >= NEAR_OUT) show = false;
        if (show !== cell.near) setCellNear(cell, show);
        if (cell.near) showing++;
      }
      group.userData.nearShowing = showing;
    }

    const hook = slabMesh || group.children[0] || null;
    if (hook) {
      hook.frustumCulled = false;
      hook.onBeforeRender = function (_renderer, _scene, camera) { tick(camera); };
    }

    group.userData = {
      lod: 'camera',
      cells: cells.length,
      slabInstances: n,
      pierTris: stoneTris.pos.length / 3,
      builtCells: 0,
      nearTris: 0,
      nearShowing: 0,
    };
    return group;
  }
}

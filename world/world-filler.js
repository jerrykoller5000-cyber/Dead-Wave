// world/world-filler.js — AG-418: World Filler runtime, placement solver, exploration quick-wins & lived-in micro-props.
// Populates the 440 m valley with 14 hand-crafted, terrain-seated PBR vignettes (each with a tangible
// gameplay quick win + short lore trace obeying docs/story.md §11-§12) and 6 instanced lived-in micro-prop
// layers (trail mileposts, PGB survey stakes, Coldwater dry-stone wall stubs, shoreline pilings, balanced
// cairns, and dusk/night fireflies).
//
// Invariants:
// - Uses its own isolated mulberry32 RNG (ZERO calls to the main world RNG; Rule 10).
// - Runs after all POIs, caves, trails, trees, rocks, solids, and history props exist; never moves or alters them.
// - Every vignette & micro-prop is slope-checked, clearance-checked, and seated to terrain with buried skirts.
// - Auto-hides cleanly inside Training Ground & Hollows (zero topside draw leak).

import { buildVignetteModel, buildMicroPropPrototypes } from './world-filler-props.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hypot = Math.hypot;

function distPointToSeg(px, pz, ax, az, bx, bz) {
  const abx = bx - ax, abz = bz - az;
  const ab2 = abx * abx + abz * abz;
  if (ab2 < 1e-8) return hypot(px - ax, pz - az);
  const t = clamp(((px - ax) * abx + (pz - az) * abz) / ab2, 0, 1);
  return hypot(px - (ax + abx * t), pz - (az + abz * t));
}

export const RECON_MILESTONES = Object.freeze([
  { count: 5,  cash: 60,  medkit: 1, grenade: 0, skill: 'scavenger', skillXp: 8,  titleKey: 'filler.milestone.5.title',  lineKey: 'filler.milestone.5.line' },
  { count: 10, cash: 100, medkit: 1, grenade: 1, skill: 'scavenger', skillXp: 14, titleKey: 'filler.milestone.10.title', lineKey: 'filler.milestone.10.line' },
  { count: 14, cash: 150, medkit: 1, grenade: 2, skill: 'scavenger', skillXp: 24, titleKey: 'filler.milestone.14.title', lineKey: 'filler.milestone.14.line' },
]);

// 14 authored hero exploration vignettes covering every quadrant & art family of the valley.
export const VIGNETTE_SPECS = Object.freeze([
  {
    id: 'drop-rig',
    family: 'military',
    target: { x: 54, z: -10 },
    searchR: 26,
    footprintR: 1.9,
    maxSlope: 0.28,
    yawMode: 'towardHQ',
    audio: 'ammo',
    rewards: { cash: 30, ammoScale: 0.5, skill: 'scavenger', skillXp: 4 },
  },
  {
    id: 'listening-post',
    family: 'military',
    target: { x: 108, z: 44 },
    searchR: 32,
    footprintR: 2.1,
    maxSlope: 0.28,
    yawMode: 'towardRootCave',
    audio: 'ammo',
    rewards: { cash: 25, ammoScale: 0.75, grenade: 1, skill: 'hands', skillXp: 5 },
  },
  {
    id: 'signal-spool',
    family: 'industrial',
    target: { x: -76, z: -14 },
    searchR: 30,
    footprintR: 1.9,
    maxSlope: 0.26,
    yawMode: 'towardMast',
    audio: 'metal',
    rewards: { cash: 40, ammoScale: 0.6, skill: 'scavenger', skillXp: 5 },
  },
  {
    id: 'river-sluice',
    family: 'settler',
    target: { x: 6, z: 58 },
    searchR: 30,
    footprintR: 2.0,
    maxSlope: 0.28,
    preferNearRiver: true,
    yawMode: 'alongRiver',
    audio: 'coin',
    rewards: { cash: 55, skill: 'scavenger', skillXp: 6 },
  },
  {
    id: 'trapper-line',
    family: 'settler',
    target: { x: 96, z: 68 },
    searchR: 32,
    footprintR: 2.0,
    maxSlope: 0.28,
    preferNearRiver: true,
    yawMode: 'random',
    audio: 'chime',
    rewards: { cash: 30, ammoScale: 0.65, grenade: 1, skill: 'legs', skillXp: 6 },
  },
  {
    id: 'shore-skiff',
    family: 'settler',
    target: { x: -80, z: -124 },
    searchR: 36,
    footprintR: 2.2,
    maxSlope: 0.28,
    preferNearLake: true,
    yawMode: 'towardLake',
    audio: 'pickup',
    rewards: { cash: 50, medkit: 1, skill: 'scavenger', skillXp: 6 },
  },
  {
    id: 'hiker-overlook',
    family: 'settler',
    target: { x: -46, z: -148 },
    searchR: 34,
    footprintR: 1.9,
    maxSlope: 0.30,
    yawMode: 'towardLake',
    audio: 'med',
    rewards: { cash: 35, medkit: 1, skill: 'legs', skillXp: 6 },
  },
  {
    id: 'logging-bench',
    family: 'settler',
    target: { x: 74, z: -108 },
    searchR: 34,
    footprintR: 2.2,
    maxSlope: 0.28,
    yawMode: 'random',
    audio: 'metal',
    rewards: { cash: 40, sawFuel: 28, ammoScale: 0.45, skill: 'power', skillXp: 12 },
    daily: { sawFuel: 18, ammoScale: 0.35, audio: 'metal' },
  },
  {
    id: 'cairn-benchmark',
    family: 'uncanny',
    target: { x: 126, z: -126 },
    searchR: 36,
    footprintR: 1.9,
    maxSlope: 0.30,
    yawMode: 'towardLake',
    audio: 'paper',
    rewards: { cash: 65, grenade: 1, skill: 'scavenger', skillXp: 8 },
  },
  {
    id: 'snagged-airdrop',
    family: 'military',
    target: { x: 52, z: 146 },
    searchR: 36,
    footprintR: 2.2,
    maxSlope: 0.28,
    yawMode: 'random',
    audio: 'crate',
    rewards: { cash: 40, ammoScale: 0.9, medkit: 1, grenade: 1, skill: 'scavenger', skillXp: 8 },
  },
  {
    id: 'ore-cart-spur',
    family: 'industrial',
    target: { x: -132, z: 114 },
    searchR: 34,
    footprintR: 2.3,
    maxSlope: 0.28,
    yawMode: 'towardMine',
    audio: 'metal',
    rewards: { cash: 60, grenade: 1, skill: 'power', skillXp: 14 },
  },
  {
    id: 'trail-shelter',
    family: 'settler',
    target: { x: -42, z: -64 },
    searchR: 30,
    footprintR: 2.4,
    maxSlope: 0.25,
    yawMode: 'towardHQ',
    audio: 'med',
    rewards: { cash: 25, medkit: 1, heal: 35, skill: 'vitality', skillXp: 4 },
    daily: { heal: 25, audio: 'med' },
  },
  {
    id: 'roadblock-post',
    family: 'military',
    target: { x: 86, z: -28 },
    searchR: 30,
    footprintR: 2.3,
    maxSlope: 0.26,
    yawMode: 'towardHQ',
    audio: 'ammo',
    rewards: { cash: 35, ammoScale: 0.75, armor: 25, grenade: 1, skill: 'grenadier', skillXp: 3 },
  },
  {
    id: 'stone-well-spring',
    family: 'settler',
    target: { x: -56, z: 128 },
    searchR: 34,
    footprintR: 2.1,
    maxSlope: 0.26,
    yawMode: 'towardHQ',
    audio: 'pickup',
    rewards: { cash: 50, medkit: 1, skill: 'vitality', skillXp: 5 },
    daily: { heal: 35, audio: 'med' },
  },
]);

function minDistToPaths(paths, x, z) {
  let best = Infinity;
  if (!paths) return best;
  for (let i = 0; i < paths.length; i++) {
    const line = paths[i];
    if (!line || line.length < 2) continue;
    for (let j = 0; j < line.length - 1; j++) {
      const a = line[j], b = line[j + 1];
      const d = distPointToSeg(x, z, a.x, a.z, b.x, b.z);
      if (d < best) best = d;
    }
  }
  return best;
}

function estimateSlope(sampleHeight, x, z, eps = 1.2) {
  const hx = (sampleHeight(x + eps, z) - sampleHeight(x - eps, z)) / (2 * eps);
  const hz = (sampleHeight(x, z + eps) - sampleHeight(x, z - eps)) / (2 * eps);
  return Math.hypot(hx, hz);
}

function footprintStats(sampleHeight, waterDepthAt, x, z, r) {
  const cy = sampleHeight(x, z);
  let minY = cy, maxY = cy;
  if (waterDepthAt && waterDepthAt(x, z) > 0.01) return { dry: false, minY, maxY, span: 99, cy };
  const probeR = r + 0.65;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI * 0.25;
    const px = x + Math.cos(a) * probeR, pz = z + Math.sin(a) * probeR;
    if (waterDepthAt && waterDepthAt(px, pz) > 0.01) return { dry: false, minY, maxY, span: 99, cy };
    const py = sampleHeight(px, pz);
    if (!Number.isFinite(py)) return { dry: false, minY, maxY, span: 99, cy };
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  return { dry: true, minY, maxY, span: maxY - minY, cy };
}

function isClearOfExisting(x, z, clearR, ctx, placed) {
  const {
    wallRadius = 220,
    poi = null,
    worldSolids = [],
    trees = [],
    rocks = [],
    historyTaken = [],
    paths = [],
    onBridgeOrDock = null,
    inWallBand = null,
    landing = { x: 42, z: -20 },
    hqClearR = 31,
    pathPad = 1.35,
    minVignetteSep = 20,
  } = ctx;

  const rCenter = hypot(x, z);
  if (rCenter < hqClearR || rCenter > wallRadius - 11) return false;
  if (landing && hypot(x - landing.x, z - landing.z) < 8.5 + clearR) return false;
  if (onBridgeOrDock && onBridgeOrDock(x, z, clearR + 1.5)) return false;
  if (inWallBand && inWallBand(x, z, clearR + 1.5)) return false;

  // Keep off worn trail surfaces so players & zombies never snag on paths
  if (paths && paths.length && minDistToPaths(paths, x, z) < pathPad + clearR) return false;

  if (poi) {
    const checkList = (arr, pad) => {
      if (!arr) return false;
      for (const o of arr) if (o && hypot(x - o.x, z - o.z) < pad + clearR) return true;
      return false;
    };
    if (checkList(poi.campsites, 13)) return false;
    if (checkList(poi.cabins, 12)) return false;
    if (checkList(poi.bridges, 12)) return false;
    if (checkList(poi.sheds, 11)) return false;
    if (checkList(poi.wrecks, 11)) return false;
    if (checkList(poi.caves, 14)) return false;
    if (poi.tower && hypot(x - poi.tower.x, z - poi.tower.z) < 13 + clearR) return false;
    if (poi.graveyard && hypot(x - poi.graveyard.x, z - poi.graveyard.z) < 18 + clearR) return false;
    if (poi.dock && hypot(x - poi.dock.x, z - poi.dock.z) < 14 + clearR) return false;
    if (poi.mast && hypot(x - poi.mast.x, z - poi.mast.z) < 12 + clearR) return false;
  }

  for (let i = 0; i < historyTaken.length; i++) {
    const t = historyTaken[i];
    if (t.hx != null) {
      const dx = Math.max(0, Math.abs(x - t.x) - t.hx);
      const dz = Math.max(0, Math.abs(z - t.z) - t.hz);
      if (hypot(dx, dz) < clearR + 1.2) return false;
    } else if (hypot(x - t.x, z - t.z) < (t.r || 1) + clearR + 1.0) {
      return false;
    }
  }

  for (let i = 0; i < worldSolids.length; i++) {
    const s = worldSolids[i];
    if (hypot(x - s.x, z - s.z) < (s.radius || 0.5) + clearR + 0.85) return false;
  }

  for (let i = 0; i < trees.length; i++) {
    const tr = trees[i];
    if (tr && tr.alive !== false && hypot(x - tr.x, z - tr.z) < (tr.trunkRadius || 0.35) + clearR + 0.85) return false;
  }

  for (let i = 0; i < rocks.length; i++) {
    const rk = rocks[i];
    if (rk && rk.alive !== false && hypot(x - rk.x, z - rk.z) < (rk.radius || rk.r || rk.size || 0.8) + clearR + 0.75) return false;
  }

  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    if (hypot(x - p.x, z - p.z) < minVignetteSep) return false;
  }

  return true;
}

function findBestVignetteSpot(spec, ctx, placed, rnd) {
  const { sampleHeight, waterDepthAt, distToRiver, lake = { x: -138, z: -104, r: 58 } } = ctx;
  let best = null;
  let bestScore = Infinity;

  const tryPass = (slopeCap, spanCap, pathPad, maxR) => {
    for (let r = 0; r <= maxR; r += 3.0) {
      const steps = r === 0 ? 1 : Math.min(28, Math.max(12, Math.round(r * 0.9)));
      const a0 = rnd() * Math.PI * 2;
      for (let k = 0; k < steps; k++) {
        const a = a0 + (k / steps) * Math.PI * 2;
        const x = spec.target.x + Math.cos(a) * r;
        const z = spec.target.z + Math.sin(a) * r;
        const slope = estimateSlope(sampleHeight, x, z, 1.3);
        if (slope > slopeCap) continue;
        const fp = footprintStats(sampleHeight, waterDepthAt, x, z, spec.footprintR);
        if (!fp.dry || fp.span > spanCap) continue;
        if (!isClearOfExisting(x, z, spec.footprintR, { ...ctx, pathPad }, placed)) continue;

        let score = r * 0.85 + fp.span * 14 + slope * 18;
        if (spec.preferNearRiver && distToRiver) {
          const dr = distToRiver(x, z);
          if (dr < 6.5) continue;
          score += Math.abs(dr - 11.5) * 1.4;
        }
        if (spec.preferNearLake && lake) {
          const dl = hypot(x - lake.x, z - lake.z);
          score += Math.abs(dl - (lake.r + 12)) * 0.45;
        }
        if (score < bestScore) {
          bestScore = score;
          best = { x, z, y: fp.minY, centerY: fp.cy, span: fp.span, slope };
        }
      }
      if (best && bestScore < 18 && r >= 12) break;
    }
  };

  // Primary strict pass: very flat, generous trail clearance
  tryPass(spec.maxSlope, 0.52, 1.5, spec.searchR);
  // Secondary relaxed pass if dense forest crowded target
  if (!best) tryPass(spec.maxSlope + 0.08, 0.78, 1.0, spec.searchR + 18);
  return best;
}

function resolveVignetteYaw(spec, spot, ctx, rnd) {
  const { poi, lake = { x: -138, z: -104 } } = ctx;
  if (spec.yawMode === 'towardHQ') return Math.atan2(-spot.x, -spot.z);
  if (spec.yawMode === 'towardLake') return Math.atan2(lake.x - spot.x, lake.z - spot.z);
  if (spec.yawMode === 'towardMast' && poi?.mast) return Math.atan2(poi.mast.x - spot.x, poi.mast.z - spot.z);
  if (spec.yawMode === 'towardRootCave') {
    const c = poi?.caves?.find((cv) => cv.theme === 'root');
    if (c) return Math.atan2(c.x - spot.x, c.z - spot.z);
  }
  if (spec.yawMode === 'towardMine') {
    const c = poi?.caves?.find((cv) => cv.theme === 'iron');
    if (c) return Math.atan2(c.x - spot.x, c.z - spot.z);
  }
  return (rnd() * Math.PI * 2);
}

// ---------------------------------------------------------------------------
// Micro-prop scatter planner: 6 instanced lived-in layers across the valley
// ---------------------------------------------------------------------------
function buildInstancedLayer(T, name, geo, mat, items, maxDist = 55) {
  if (!items.length) return null;
  const im = new T.InstancedMesh(geo, mat, items.length);
  im.name = name;
  im.castShadow = name === 'filler-mileposts' || name === 'filler-wall-stubs';
  im.receiveShadow = true;
  im.userData.maxDist = maxDist;
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    e.set(it.rx || 0, it.ry || 0, it.rz || 0);
    q.setFromEuler(e);
    p.set(it.x, it.y, it.z);
    s.set(it.sx || 1, it.sy || 1, it.sz || 1);
    m4.compose(p, q, s);
    im.setMatrixAt(i, m4);
  }
  im.instanceMatrix.needsUpdate = true;
  return im;
}

function placeMicroProps(T, ctx, placedVignettes, rnd) {
  const {
    sampleHeight,
    waterDepthAt,
    distToRiver,
    pathHubs = [],
    paths = [],
    poi = null,
    lake = { x: -138, z: -104, r: 58 },
    wallRadius = 220,
    firstPeople = null,
  } = ctx;

  const protos = buildMicroPropPrototypes(T);
  const microGroup = new T.Group();
  microGroup.name = 'world-filler-micro-props';
  microGroup.userData.cullKids = true;

  const microTaken = [];
  const canPlaceMicro = (x, z, r = 0.65, maxSlope = 0.36, pathPad = 1.15, allowWater = false) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const rc = hypot(x, z);
    if (rc < 26 || rc > wallRadius - 8) return false;
    const wd = waterDepthAt ? waterDepthAt(x, z) : 0;
    if (!allowWater && wd > 0.02) return false;
    if (allowWater && wd > 0.45) return false;
    if (estimateSlope(sampleHeight, x, z, 1.0) > maxSlope) return false;
    if (paths.length && minDistToPaths(paths, x, z) < pathPad) return false;
    if (ctx.onBridgeOrDock && ctx.onBridgeOrDock(x, z, r + 1.2)) return false;
    if (ctx.inWallBand && ctx.inWallBand(x, z, r + 1.0)) return false;
    for (const v of placedVignettes) if (hypot(x - v.x, z - v.z) < 4.5 + r) return false;
    for (const m of microTaken) if (hypot(x - m.x, z - m.z) < (m.r || 1) + r + 1.2) return false;
    if (ctx.worldSolids) {
      for (const s of ctx.worldSolids) if (hypot(x - s.x, z - s.z) < (s.radius || 0.4) + r + 0.45) return false;
    }
    if (ctx.trees) {
      for (const tr of ctx.trees) if (tr && tr.alive !== false && hypot(x - tr.x, z - tr.z) < (tr.trunkRadius || 0.35) + r + 0.45) return false;
    }
    if (poi?.caves) {
      for (const c of poi.caves) if (hypot(x - c.x, z - c.z) < 9.5) return false;
    }
    return true;
  };

  // 1. Trail Fork Mileposts near PATH_HUBS junctions (Directional Guidance, Rule 11)
  const mileposts = [];
  const hubCandidates = pathHubs.length ? pathHubs : [
    { x: 24, z: 18 }, { x: -28, z: -22 }, { x: 46, z: 54 }, { x: -64, z: 32 },
    { x: 64, z: -48 }, { x: -34, z: -88 }, { x: 96, z: -12 }, { x: -84, z: 54 },
  ];
  for (let i = 0; i < hubCandidates.length && mileposts.length < 12; i++) {
    const h = hubCandidates[i];
    if (hypot(h.x, h.z) < 28) continue;
    for (let k = 0; k < 12; k++) {
      const a = rnd() * Math.PI * 2;
      const d = 2.6 + rnd() * 2.0;
      const x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d;
      if (!canPlaceMicro(x, z, 0.45, 0.30, 1.35)) continue;
      const y = sampleHeight(x, z);
      mileposts.push({ x, y, z, ry: Math.atan2(-x, -z) + (rnd() - 0.5) * 0.9, rx: (rnd() - 0.5) * 0.05, rz: (rnd() - 0.5) * 0.05 });
      microTaken.push({ x, z, r: 4.0 });
      break;
    }
  }

  // 2. PGB Field Survey Stakes near cave approaches & outer valley shoulders
  const stakes = [];
  const stakeAnchors = [];
  if (poi?.caves) {
    for (const c of poi.caves) {
      for (const angOff of [-0.55, 0.55]) {
        const a = (c.yaw || 0) + angOff;
        stakeAnchors.push({ x: c.x + Math.sin(a) * 16, z: c.z + Math.cos(a) * 16 });
      }
    }
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.15;
    const r = 152 + rnd() * 34;
    stakeAnchors.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  for (const an of stakeAnchors) {
    if (stakes.length >= 22) break;
    for (let t = 0; t < 8; t++) {
      const a = rnd() * Math.PI * 2, d = t * 1.8;
      const x = an.x + Math.cos(a) * d, z = an.z + Math.sin(a) * d;
      if (!canPlaceMicro(x, z, 0.35, 0.34, 1.25)) continue;
      stakes.push({ x, y: sampleHeight(x, z), z, ry: rnd() * Math.PI * 2, rx: (rnd() - 0.5) * 0.12, rz: (rnd() - 0.5) * 0.12 });
      microTaken.push({ x, z, r: 5.5 });
      break;
    }
  }

  // 3. Coldwater Crumbled Dry-Stone Boundary Wall Stubs around the old town & northern pastures
  const wallStubs = [];
  const cw = poi?.graveyard || { x: -90, z: 89 };
  for (let i = 0; i < 60 && wallStubs.length < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 24 + rnd() * 44;
    const x = cw.x + Math.cos(a) * r, z = cw.z + Math.sin(a) * r;
    if (hypot(x - cw.x, z - cw.z) < 22) continue;
    if (!canPlaceMicro(x, z, 1.1, 0.28, 2.0)) continue;
    const fp = footprintStats(sampleHeight, waterDepthAt, x, z, 0.9);
    if (!fp.dry || fp.span > 0.42) continue;
    const sc = 0.85 + rnd() * 0.35;
    wallStubs.push({ x, y: fp.minY, z, ry: a + Math.PI * 0.5 + (rnd() - 0.5) * 0.35, sx: sc, sy: 0.85 + rnd() * 0.25, sz: sc });
    microTaken.push({ x, z, r: 4.5 });
  }

  // 4. Shoreline Weathered Mooring Pilings along quiet lake bays & river banks
  const pilings = [];
  for (let k = 0; k < 40 && pilings.length < 16; k++) {
    const a = (k / 40) * Math.PI * 2 + rnd() * 0.12;
    for (let r = lake.r - 12; r <= lake.r + 28; r += 2.5) {
      const x = lake.x + Math.cos(a) * r, z = lake.z + Math.sin(a) * r;
      if (hypot(x, z) > wallRadius - 12) continue;
      const wd = waterDepthAt ? waterDepthAt(x, z) : 0;
      if (wd < 0.02 || wd > 0.38) continue;
      if (poi?.dock && hypot(x - poi.dock.x, z - poi.dock.z) < 16) continue;
      if (!canPlaceMicro(x, z, 0.55, 0.42, 1.6, true)) continue;
      pilings.push({ x, y: sampleHeight(x, z), z, ry: a + (rnd() - 0.5) * 0.6, sx: 0.85 + rnd() * 0.3, sy: 0.8 + rnd() * 0.35, sz: 0.85 + rnd() * 0.3 });
      microTaken.push({ x, z, r: 9.0 });
      break;
    }
  }

  // 5. Balanced Trail/Ridge Stone Cairns near standing stones, high ground & quiet overlooks
  const cairns = [];
  const cairnSeeds = [];
  if (firstPeople?.sites) {
    for (const st of firstPeople.sites) {
      cairnSeeds.push({ x: st.x + 8, z: st.z - 6 }, { x: st.x - 9, z: st.z + 7 });
    }
  }
  for (let i = 0; i < 24; i++) {
    const a = rnd() * Math.PI * 2, r = 72 + rnd() * 110;
    cairnSeeds.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  for (const cs of cairnSeeds) {
    if (cairns.length >= 16) break;
    for (let t = 0; t < 6; t++) {
      const a = rnd() * Math.PI * 2, d = t * 2.2;
      const x = cs.x + Math.cos(a) * d, z = cs.z + Math.sin(a) * d;
      if (!canPlaceMicro(x, z, 0.48, 0.32, 1.45)) continue;
      const sc = 0.85 + rnd() * 0.35;
      cairns.push({ x, y: sampleHeight(x, z), z, ry: rnd() * Math.PI * 2, sx: sc, sy: sc, sz: sc });
      microTaken.push({ x, z, r: 8.0 });
      break;
    }
  }

  const layers = [
    buildInstancedLayer(T, 'filler-mileposts', protos.milepost.geo, protos.milepost.mat, mileposts, 65),
    buildInstancedLayer(T, 'filler-survey-stakes', protos.stake.geo, protos.stake.mat, stakes, 55),
    buildInstancedLayer(T, 'filler-wall-stubs', protos.wallStub.geo, protos.wallStub.mat, wallStubs, 75),
    buildInstancedLayer(T, 'filler-shore-pilings', protos.piling.geo, protos.piling.mat, pilings, 70),
    buildInstancedLayer(T, 'filler-trail-cairns', protos.cairn.geo, protos.cairn.mat, cairns, 60),
  ];
  for (const l of layers) if (l) microGroup.add(l);

  // 6. Dusk/Night Valley Fireflies (1 instanced draw, 48 warm-amber drifting motes over damp banks & shelter)
  let fireflies = null;
  const fireflySeeds = [];
  const dampAnchors = placedVignettes
    .filter((v) => ['river-sluice', 'trapper-line', 'shore-skiff', 'trail-shelter', 'stone-well-spring'].includes(v.id))
    .map((v) => ({ x: v.x, y: v.y, z: v.z }));
  if (poi?.bridges) for (const br of poi.bridges) dampAnchors.push({ x: br.x, y: sampleHeight(br.x, br.z), z: br.z });
  if (dampAnchors.length && protos.fireflyTex) {
    const COUNT = 48;
    for (let i = 0; i < COUNT; i++) {
      const an = dampAnchors[i % dampAnchors.length];
      const ang = rnd() * Math.PI * 2, rad = 1.4 + rnd() * 7.5;
      const fx = an.x + Math.cos(ang) * rad, fz = an.z + Math.sin(ang) * rad;
      fireflySeeds.push({
        x: fx, y: sampleHeight(fx, fz) + 0.55 + rnd() * 1.4, z: fz,
        phase: rnd() * Math.PI * 2, speed: 0.65 + rnd() * 0.9,
        ampX: 0.35 + rnd() * 0.45, ampY: 0.22 + rnd() * 0.35,
        pulseRate: 1.6 + rnd() * 1.8,
      });
    }
    const ffGeo = new T.PlaneGeometry(0.18, 0.18);
    const ffMat = new T.MeshBasicMaterial({
      map: protos.fireflyTex, color: 0xffd66b, transparent: true, opacity: 0.0,
      blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: true,
    });
    const ffMesh = new T.InstancedMesh(ffGeo, ffMat, COUNT);
    ffMesh.name = 'filler-valley-fireflies';
    ffMesh.frustumCulled = false;
    ffMesh.visible = false;
    if (ffMesh.instanceMatrix && typeof ffMesh.instanceMatrix.setUsage === 'function') {
      ffMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    }
    microGroup.add(ffMesh);
    fireflies = { mesh: ffMesh, mat: ffMat, seeds: fireflySeeds };
  }

  return {
    group: microGroup,
    fireflies,
    counts: {
      mileposts: mileposts.length,
      stakes: stakes.length,
      wallStubs: wallStubs.length,
      pilings: pilings.length,
      cairns: cairns.length,
      fireflies: fireflySeeds.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Main builder: constructs all 14 vignettes + 6 micro-prop layers + runtime state
// ---------------------------------------------------------------------------
export function buildWorldFiller(T, ctx) {
  const rnd = mulberry32(0xF111E418);
  const root = new T.Group();
  root.name = 'world-filler';
  root.userData.cullKids = true;

  const vignettes = [];
  const doc = ctx.doc || (typeof document !== 'undefined' ? document : null);

  for (const spec of VIGNETTE_SPECS) {
    const spot = findBestVignetteSpot(spec, ctx, vignettes, rnd);
    if (!spot) continue;
    const yaw = resolveVignetteYaw(spec, spot, ctx, rnd);
    const built = buildVignetteModel(T, spec.id, doc);
    built.group.position.set(spot.x, spot.y, spot.z);
    built.group.rotation.y = yaw;
    built.group.userData.maxDist = 88;
    root.add(built.group);

    // Register compact static collision solids in world space
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const worldSolidsAdded = [];
    for (const sl of built.solids) {
      const wx = spot.x + sl.x * c + sl.z * s;
      const wz = spot.z - sl.x * s + sl.z * c;
      if (typeof ctx.addSolid === 'function') {
        const ref = ctx.addSolid(wx, wz, sl.r, spot.y - 0.1, spot.y + sl.h);
        worldSolidsAdded.push(ref);
      }
    }

    // Compute world-space interaction anchor point for E prompt
    const io = built.interactOffset || { x: 0, y: 0.8, z: 0 };
    const ix = spot.x + io.x * c + io.z * s;
    const iz = spot.z - io.x * s + io.z * c;
    const iy = spot.y + io.y;

    vignettes.push({
      id: spec.id,
      spec,
      family: spec.family,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      yaw,
      slope: spot.slope,
      span: spot.span,
      anchor: { x: ix, y: iy, z: iz },
      interactRadius: 2.65,
      model: built,
      solids: worldSolidsAdded,
      // Runtime mutable state (reset cleanly on new run)
      looted: false,
      lastDailyDay: -1,
      lidT: 0,
    });
  }

  const micro = placeMicroProps(T, ctx, vignettes, rnd);
  root.add(micro.group);

  let elapsed = 0;
  const reachedMilestones = new Set();
  const _m4 = new T.Matrix4(), _pos = new T.Vector3(), _scl = new T.Vector3(), _camQ = new T.Quaternion();

  function nearestInteract(px, py, pz, day = 1) {
    let best = null, bestD = Infinity;
    for (let i = 0; i < vignettes.length; i++) {
      const v = vignettes[i];
      const canFirst = !v.looted;
      const canDaily = !!(v.looted && v.spec.daily && v.lastDailyDay < (day | 0));
      if (!canFirst && !canDaily) continue;
      const d = hypot(px - v.anchor.x, pz - v.anchor.z);
      if (d > v.interactRadius) continue;
      if (Math.abs(py - v.y) > 2.4) continue;
      if (d < bestD) {
        bestD = d;
        best = {
          id: v.id,
          mode: canFirst ? 'loot' : 'daily',
          promptKey: canFirst ? `filler.${v.id}.prompt` : `filler.${v.id}.dailyPrompt`,
          anchor: v.anchor,
          distance: d,
          vignette: v,
        };
      }
    }
    return best;
  }

  function interact(id, { day = 1 } = {}) {
    const v = vignettes.find((it) => it.id === id);
    if (!v) return null;

    if (!v.looted) {
      v.looted = true;
      if (v.spec.daily) v.lastDailyDay = day | 0; // first loot counts for today's utility refresh too
      if (v.model.lootMesh) v.model.lootMesh.visible = false;
      if (v.model.strobeSprite) v.model.strobeSprite.visible = false;
      if (v.model.strobeMat) { v.model.strobeMat.emissiveIntensity = 0.02; }

      const discoveredCount = vignettes.reduce((acc, it) => acc + (it.looted ? 1 : 0), 0);
      let milestone = null;
      for (const ms of RECON_MILESTONES) {
        if (discoveredCount >= ms.count && !reachedMilestones.has(ms.count)) {
          reachedMilestones.add(ms.count);
          milestone = ms;
          break;
        }
      }
      return {
        ok: true,
        mode: 'loot',
        id: v.id,
        nameKey: `filler.${v.id}.name`,
        noteKey: `filler.${v.id}.note`,
        audio: v.spec.audio,
        rewards: { ...v.spec.rewards },
        discoveredCount,
        totalCount: vignettes.length,
        milestone,
      };
    }

    if (v.spec.daily && v.lastDailyDay < (day | 0)) {
      v.lastDailyDay = day | 0;
      return {
        ok: true,
        mode: 'daily',
        id: v.id,
        nameKey: `filler.${v.id}.name`,
        noteKey: `filler.${v.id}.dailyNote`,
        audio: v.spec.daily.audio || v.spec.audio,
        rewards: { ...v.spec.daily },
        discoveredCount: vignettes.reduce((acc, it) => acc + (it.looted ? 1 : 0), 0),
        totalCount: vignettes.length,
        milestone: null,
      };
    }

    return null;
  }

  function reset() {
    reachedMilestones.clear();
    for (const v of vignettes) {
      v.looted = false;
      v.lastDailyDay = -1;
      v.lidT = 0;
      if (v.model.lidPivot) v.model.lidPivot.rotation.x = v.model.lidPivot.userData.closedRx || 0;
      if (v.model.lootMesh) v.model.lootMesh.visible = true;
      if (v.model.strobeSprite) v.model.strobeSprite.visible = true;
      if (v.model.strobeMat) v.model.strobeMat.emissiveIntensity = 1.2;
    }
  }

  function update(dt, env = {}) {
    const hidden = !!(env.inHollow || env.inTraining);
    root.visible = !hidden;
    if (hidden) return;

    const step = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.25);
    elapsed += step;
    const nightMix = clamp(env.nightMix ?? 0, 0, 1);
    const dusk = clamp(env.dusk ?? 0, 0, 1);
    const windStr = clamp(env.windStrength ?? 0.3, 0, 2);

    for (let i = 0; i < vignettes.length; i++) {
      const v = vignettes[i];
      const m = v.model;

      // Smooth lid swing animation on looted containers
      if (m.lidPivot) {
        const target = v.looted ? 1 : 0;
        if (Math.abs(v.lidT - target) > 0.001) {
          v.lidT = v.lidT < target ? Math.min(1, v.lidT + step * 3.4) : Math.max(0, v.lidT - step * 3.4);
          // Smooth cubic ease-out with slight physical hinge settle
          const u = 1 - Math.pow(1 - v.lidT, 3);
          const cRx = m.lidPivot.userData.closedRx || 0;
          const oRx = m.lidPivot.userData.openRx ?? -1.65;
          m.lidPivot.rotation.x = cRx + (oRx - cRx) * u;
        }
      }

      // Off-target airdrop recovery strobe (slow double-flash beacon until looted!)
      if (m.strobeMat && !v.looted) {
        const cyc = (elapsed * 0.72) % 1;
        const flash = (cyc < 0.08 || (cyc > 0.16 && cyc < 0.24)) ? 1 : 0.08;
        const lum = (0.55 + 1.35 * Math.max(nightMix, dusk)) * flash;
        m.strobeMat.emissiveIntensity = lum;
        if (m.strobeSprite) {
          m.strobeSprite.visible = flash > 0.2;
          m.strobeSprite.material.opacity = clamp(0.18 + 0.58 * Math.max(nightMix, dusk), 0, 0.85) * flash;
          const sc = 0.85 + 0.45 * flash;
          m.strobeSprite.scale.set(sc, sc, 1);
        }
      }

      // Warm sodium-amber storm lantern glow at dusk/night + gentle wind sway
      if (m.lantern) {
        const warm = 0.22 + 0.78 * Math.max(nightMix, dusk * 0.85);
        const flicker = 0.92 + 0.08 * Math.sin(elapsed * 7.3 + i * 2.1);
        m.lantern.glassMat.emissiveIntensity = warm * 1.35 * flicker;
        if (m.lantern.glowSprite) {
          m.lantern.glowSprite.visible = warm > 0.28;
          m.lantern.glowSprite.material.opacity = (warm - 0.18) * 0.52 * flicker;
        }
        m.lantern.group.rotation.z = Math.sin(elapsed * 1.45 + i) * (0.04 + 0.05 * windStr);
      }

      // Gentle iron horseshoe wind-chime sway at Trapper's River Station
      if (m.chimePivot) {
        m.chimePivot.rotation.z = Math.sin(elapsed * 1.85) * (0.045 + 0.06 * windStr);
        m.chimePivot.rotation.x = Math.cos(elapsed * 1.2) * (0.025 + 0.03 * windStr);
      }
    }

    // Dusk/night valley fireflies over damp banks (1 draw, invisible at noon!)
    if (micro.fireflies) {
      const ff = micro.fireflies;
      const glowVis = clamp(Math.max(nightMix, dusk * 0.9) - 0.18, 0, 1) * (1 - clamp(env.rainK || 0, 0, 1) * 0.85);
      ff.mesh.visible = glowVis > 0.02;
      if (ff.mesh.visible) {
        ff.mat.opacity = glowVis * 0.78;
        if (env.camera && typeof env.camera.getWorldQuaternion === 'function') {
          env.camera.getWorldQuaternion(_camQ);
        } else {
          _camQ.identity();
        }
        for (let i = 0; i < ff.seeds.length; i++) {
          const sd = ff.seeds[i];
          const t = elapsed * sd.speed + sd.phase;
          _pos.set(
            sd.x + Math.sin(t) * sd.ampX,
            sd.y + Math.sin(t * 1.37 + 1.1) * sd.ampY,
            sd.z + Math.cos(t * 0.83) * sd.ampX
          );
          const pulse = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(elapsed * sd.pulseRate + sd.phase * 2), 2);
          const sc = (0.7 + 0.6 * pulse) * glowVis;
          _scl.set(sc, sc, 1);
          _m4.compose(_pos, _camQ, _scl);
          ff.mesh.setMatrixAt(i, _m4);
        }
        ff.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  function getDebugState() {
    let meshCount = 0;
    root.traverse((o) => { if (o.isMesh) meshCount++; });
    return {
      visible: root.visible,
      vignetteCount: vignettes.length,
      lootedCount: vignettes.reduce((acc, v) => acc + (v.looted ? 1 : 0), 0),
      milestones: [...reachedMilestones],
      microCounts: { ...micro.counts },
      totalMeshes: meshCount,
      vignettes: vignettes.map((v) => ({
        id: v.id,
        family: v.family,
        x: +v.x.toFixed(2),
        y: +v.y.toFixed(2),
        z: +v.z.toFixed(2),
        yaw: +v.yaw.toFixed(2),
        slope: +v.slope.toFixed(3),
        span: +v.span.toFixed(3),
        looted: v.looted,
        lastDailyDay: v.lastDailyDay,
        daily: !!v.spec.daily,
        anchor: { x: +v.anchor.x.toFixed(2), y: +v.anchor.y.toFixed(2), z: +v.anchor.z.toFixed(2) },
      })),
    };
  }

  return {
    group: root,
    vignettes,
    microCounts: micro.counts,
    nearestInteract,
    interact,
    reset,
    update,
    getDebugState,
  };
}

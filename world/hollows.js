// world/hollows.js — the five warrens under the caves (CL-99, P-137, D-67, docs/specs/hollows.md §3).
// Upgraded in AG-416 with sculpted cave geometry, WebGPU-native PBR rock/floor/prop sets,
// visible interactive loot meshes, wall-oriented feathered daylight shafts, tactical per-warren
// interactives, and bespoke Deep set pieces while keeping deterministic layouts & t325 clearance intact.
//
// Each warren is laid out on a grid of 7.5 m cells from its own fixed dice (the same every run, Jerry Q-4; never the
// run's or the world's seed, rule 10). Three depths, side by side on one plan so a point on the map has one floor:
// the Galleries (depth 1), the Narrows (2) and the Deep (3), joined by ramps two cells long, 4 m down each. Tunnels
// have 1 m walls and 5 m doorways (GB-267, CL-286 / J47: room to fight in, no notches) under a 4.6 m roof; chambers
// are open cells with a high roof; the Deep's chamber is 2 x 2 cells. He walks down to the Galleries from a landing
// 6 m above them (the descent, GB-267 descent A): a run down the shaft, a turn, and a run back to the mouth.
//
// API:
//   WARREN_THEMES                  ['root', 'shale', 'iron', 'wet', 'hill']
//   layoutWarren(theme)         -> the plan, pure data (no three.js): cells, links, points, doors, exits
//   buildWarren(theme, opts?)   -> { group, cells, groundAt, roofAt, openAt, solids, nav, entry, arrive, exits, points, doors, lamps,
//                                    descent, accents, cell, plan, light, look, crateMeshes, tagMeshes, strongboxMesh,
//                                    runeDoorMesh, lanternMeshes, interactives, waterMesh, waterNormal, husks, isWetCell, dispose }
//                                  the contract in docs/specs/hollows.md §2. opts.origin: { x, y, z } (default 0, -400, 0)
import * as THREE from 'three';
import { getHollowPBRPack } from './hollows-pbr.js';
import {
  SculptBatch,
  buildSculptedBoxesGeometry,
  buildOilLanternMesh,
  buildSupplyCrateMesh,
  buildDogTagVignetteMesh,
  buildStrongboxMesh,
  buildHeroHusk,
  buildRuneDoorMesh,
  buildBoltHoleMesh,
  buildInteractiveProp,
  buildHeroSetPiece,
} from './hollows-props.js';

export const WARREN_THEMES = Object.freeze(['root', 'shale', 'iron', 'wet', 'hill']);
export const HOLLOW = Object.freeze({
  CELL: 7.5, GRID: 16, DEPTH_DROP: 4,   // GB-267: 7.5 m cells (were 6)
  SIZES: [[10, 12], [8, 10], [5, 7]],      // cells a depth (the Deep counts its 2 x 2 chamber as four)
  TUNNEL_ROOF: 4.6, CHAMBER_ROOF: 7.5, WALL: 1, GAP: 5,   // GB-267: were 3.4, 6.5 and a 3 m doorway
  NAV_CELL: 1.5,
  RAMP_CELLS: 2,                                   // GB-267: a ramp is two cells long (4 m over 15 m, about 15 degrees)
  DESCENT: Object.freeze({ TOP: 6, RUN: 1.5 }),    // GB-267: the landing 6 m above the Galleries; a run falls 1.5 m a cell
  PROP_WALL: 1.2,                                  // GB-267: a floor prop stands within this of a closed side, out of the run
  ROOT_CLEAR: 2.4,                                 // GB-267: roots hang no lower than this off the floor
  ORIGIN: Object.freeze({ x: 0, y: -400, z: 0 }),
  TAGS: Object.freeze({ root: 2, shale: 2, iron: 2, wet: 2, hill: 1 }),   // CL-99 v3: the nine who died (story §8a; GP-83's WARREN_TAG_COUNTS)
});

// Each theme's look (colours, subterranean lighting, props) and its set piece (hollows.md §3).
export const WARREN_LOOKS = Object.freeze({
  root: {
    rock: 0x4a3f33, floor: 0x3a2f24, accent: 0x6b5a3a, glow: 0x6ce89c, set: 'climbers-knot', props: 'roots',
    ambient: 0x161c12, ambientInt: 0.22, hemiSky: 0x2a3a24, hemiGround: 0x16110b, hemiInt: 0.44,
    fog: 0x090d08, fogNear: 5.5, fogFar: 33, lampColor: 0xffb866, moteColor: 0x98c88a, interactive: 'spore-bulb',
  },
  shale: {
    rock: 0x3d4247, floor: 0x33373b, accent: 0x5a6068, glow: 0x8ec0f2, set: 'shale-flankers', props: 'blades',
    ambient: 0x131820, ambientInt: 0.22, hemiSky: 0x283648, hemiGround: 0x11151b, hemiInt: 0.46,
    fog: 0x070a10, fogNear: 6.0, fogFar: 36, lampColor: 0xffbe74, moteColor: 0xb0c4da, interactive: 'demo-charge',
  },
  iron: {
    rock: 0x4b3a30, floor: 0x3b3029, accent: 0x6b4a2a, glow: 0xffaa56, set: 'mine-crew', props: 'timber',
    ambient: 0x1c140e, ambientInt: 0.24, hemiSky: 0x3a281c, hemiGround: 0x1a110b, hemiInt: 0.48,
    fog: 0x0d0906, fogNear: 5.5, fogFar: 35, lampColor: 0xffaa50, moteColor: 0xdca878, interactive: 'powder-cask',
  },
  wet: {
    rock: 0x33403f, floor: 0x283432, accent: 0x3f5a58, glow: 0x6cd4d8, set: 'drowned', props: 'pools',
    ambient: 0x101a1c, ambientInt: 0.22, hemiSky: 0x1e363c, hemiGround: 0x0b1518, hemiInt: 0.46,
    fog: 0x060c0e, fogNear: 5.0, fogFar: 31, lampColor: 0xffbc70, moteColor: 0x8cc8ce, interactive: 'flare-pack',
  },
  hill: {
    rock: 0x4a4740, floor: 0x3c3a34, accent: 0x6e6a5e, glow: 0xffd28c, set: 'barrow-king', props: 'slabs',
    ambient: 0x1a1813, ambientInt: 0.24, hemiSky: 0x363228, hemiGround: 0x18150f, hemiInt: 0.48,
    fog: 0x0c0b08, fogNear: 5.5, fogFar: 35, lampColor: 0xffc674, moteColor: 0xd8ceb4, interactive: 'pitch-brazier',
  },
});

// --- dice ---------------------------------------------------------------------------------
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // n(-z) e(+x) s(+z) w(-x) in plan terms; index = side
const OPP = [2, 3, 0, 1];
// GB-267: a cell's floor where he comes into it (top), how far it falls across it (a ramp's or a descent run's drop,
// toward rampSide), and its roof above top.
const floorOfDepth = (d) => -(d - 1) * HOLLOW.DEPTH_DROP;
function cellTop(c) { return c.top != null ? c.top : floorOfDepth(c.depth); }
function cellDrop(c) { return c.drop > 0 ? c.drop : 0; }
function roofOfCell(c) { return c.kind === 'chamber' || c.kind === 'deep' ? HOLLOW.CHAMBER_ROOF : HOLLOW.TUNNEL_ROOF; }

// --- the plan ---------------------------------------------------------------------------------
export function layoutWarren(theme) {
  if (!WARREN_THEMES.includes(theme)) throw new Error('no warren under the ' + theme + ' cave');
  for (let attempt = 0; attempt < 64; attempt++) {
    const plan = tryLayout(theme, mulberry32(hashStr('hollows:' + theme + ':' + attempt)));
    if (plan) { plan.attempt = attempt; return plan; }
  }
  throw new Error('no layout for ' + theme);
}

function tryLayout(theme, rnd) {
  const G = HOLLOW.GRID;
  const cells = new Map();   // key 'i,j' -> cell
  const key = (i, j) => i + ',' + j;
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < G && j < G;
  const free = (i, j) => inGrid(i, j) && !cells.has(key(i, j));
  const add = (i, j, depth, kind, from, side) => {
    const c = { i, j, depth, kind, open: [false, false, false, false], id: cells.size };
    cells.set(key(i, j), c);
    if (from) { c.open[OPP[side]] = true; from.open[side] = true; }
    return c;
  };
  const neighbours = (c) => DIRS.map(([di, dj], s) => ({ s, i: c.i + di, j: c.j + dj }));
  const range = ([a, b]) => a + Math.floor(rnd() * (b - a + 1));

  // Grow one depth from a start cell: a growing tree that prefers the newest cells (winding tunnels).
  function grow(start, depth, n) {
    const mine = [start];
    let guard = 0;
    while (mine.length < n && guard++ < 400) {
      const from = rnd() < 0.7 ? mine[mine.length - 1 - Math.floor(rnd() * Math.min(3, mine.length))] : mine[Math.floor(rnd() * mine.length)];
      const opts = neighbours(from).filter((o) => free(o.i, o.j) && o.j > 0);
      if (!opts.length) continue;
      const o = opts[Math.floor(rnd() * opts.length)];
      mine.push(add(o.i, o.j, depth, 'tunnel', from, o.s));
    }
    if (mine.length < n) return null;
    // A few loops inside the depth, so it isn't one corridor.
    for (const c of mine) for (const o of neighbours(c)) {
      const d = cells.get(key(o.i, o.j));
      if (d && d.depth === depth && !c.open[o.s] && d.kind !== 'ramp' && c.kind !== 'ramp' && rnd() < 0.12) { c.open[o.s] = true; d.open[OPP[o.s]] = true; }
    }
    return mine;
  }
  // The cell of `list` farthest from `from` by walking.
  function farthest(list, from) {
    const dist = new Map([[from, 0]]), q = [from];
    while (q.length) {
      const c = q.shift();
      for (const o of neighbours(c)) {
        if (!c.open[o.s]) continue;
        const d = cells.get(key(o.i, o.j));
        if (d && !dist.has(d)) { dist.set(d, dist.get(c) + 1); q.push(d); }
      }
    }
    let best = null;
    for (const c of list) if (dist.has(c) && (!best || dist.get(c) > dist.get(best))) best = c;
    return best;
  }
  // A ramp out of `from` (GB-267: HOLLOW.RAMP_CELLS cells in a line, each falling its share), then the next depth's
  // first cell beyond it. ramp is the ramp's head (its first cell); ramps all of its cells.
  function rampFrom(from, depth, needBlock) {
    const sides = [0, 1, 2, 3].sort(() => rnd() - 0.5);
    const n = HOLLOW.RAMP_CELLS, step = HOLLOW.DEPTH_DROP / n;
    for (const s of sides) {
      const [di, dj] = DIRS[s];
      const run = [];
      for (let k = 1; k <= n; k++) run.push([from.i + di * k, from.j + dj * k]);
      const ni = from.i + di * (n + 1), nj = from.j + dj * (n + 1);
      if (!run.every(([x, y]) => free(x, y) && y > 0) || !free(ni, nj) || nj <= 0) continue;
      let blk = null;
      if (needBlock) {
        // The Deep's chamber: a 2 x 2 block that holds (ni, nj), every cell free and off the south edge.
        const blocks = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => [[ni - a, nj - b], [ni - a + 1, nj - b], [ni - a, nj - b + 1], [ni - a + 1, nj - b + 1]])
          .filter((bl) => bl.every(([x, y]) => free(x, y) && y > 0 && !run.some(([rx, ry]) => rx === x && ry === y)))
          .sort(() => rnd() - 0.5);
        if (!blocks.length) continue;
        blk = blocks[0];
      }
      const ramps = [];
      let prev = from;
      for (let k = 0; k < n; k++) {
        const r = add(run[k][0], run[k][1], depth - 1, 'ramp', prev, s);
        r.rampSide = s; r.toDepth = depth; r.top = floorOfDepth(depth - 1) - k * step; r.drop = step;
        ramps.push(r); prev = r;
      }
      const ramp = ramps[0], last = ramps[n - 1];
      if (blk) {
        const deep = blk.map(([x, y]) => add(x, y, depth, 'deep'));
        for (const c of deep) for (const o of neighbours(c)) { const d = cells.get(key(o.i, o.j)); if (d && d.kind === 'deep') { c.open[o.s] = true; d.open[OPP[o.s]] = true; } }
        const first = cells.get(key(ni, nj));
        last.open[s] = true; first.open[OPP[s]] = true;
        return { ramp, ramps, first, deep };
      }
      const first = add(ni, nj, depth, 'tunnel', last, s);
      return { ramp, ramps, first };
    }
    return null;
  }

  const mid = Math.floor(G / 2);
  const mouth = add(mid, 0, 1, 'mouth');
  // GB-267 (CL-286, descent A): the walked way down. A landing 6 m above the Galleries, a run east down the shaft, a
  // turn, and a run back west to the mouth: [i, j, top, drop, the side it leads on by (and falls toward)]. Reserved
  // before the depths grow, so nothing else takes these cells. Their depth is 0 (above the Galleries).
  const DS = HOLLOW.DESCENT, RN = DS.RUN;
  const descentPlan = [[mid + 1, 1, DS.TOP, 0, 1], [mid + 2, 1, DS.TOP, RN, 1], [mid + 3, 1, DS.TOP - RN, RN, 1], [mid + 4, 1, DS.TOP - 2 * RN, 0, 0],
    [mid + 4, 0, DS.TOP - 2 * RN, 0, 3], [mid + 3, 0, DS.TOP - 2 * RN, RN, 3], [mid + 2, 0, DS.TOP - 3 * RN, RN, 3], [mid + 1, 0, 0, 0, 3]];
  const descent = descentPlan.map(([i, j, top, drop, side]) => { const c = add(i, j, 0, 'descent'); c.top = top; c.drop = drop; c.rampSide = side; return c; });
  descent.forEach((c, k) => { const nx = descent[k + 1] || mouth; c.open[c.rampSide] = true; nx.open[OPP[c.rampSide]] = true; });
  const g1 = grow(mouth, 1, range(HOLLOW.SIZES[0]));
  if (!g1) return null;
  const r1 = rampFrom(farthest(g1, mouth), 2, false);
  if (!r1) return null;
  const g2 = grow(r1.first, 2, range(HOLLOW.SIZES[1]));
  if (!g2) return null;
  const r2 = rampFrom(farthest(g2, r1.first), 3, true);
  if (!r2) return null;
  // The Deep: its chamber plus a pocket or two off it.
  const extra = range(HOLLOW.SIZES[2]) - 4;
  const deepCells = [...r2.deep];
  for (let k = 0; k < extra; k++) {
    const from = deepCells[Math.floor(rnd() * deepCells.length)];
    const opts = neighbours(from).filter((o) => free(o.i, o.j) && o.j > 0);
    if (!opts.length) continue;
    const o = opts[Math.floor(rnd() * opts.length)];
    deepCells.push(add(o.i, o.j, 3, 'pocket', from, o.s));
  }

  // Chambers: two in the Galleries, one in the Narrows (cells with the most room around them, not the ramp's ends).
  const pick = (list, n) => {
    const cand = list.filter((c) => c.kind === 'tunnel' && c !== r1.first).sort((a, b) => b.open.filter(Boolean).length - a.open.filter(Boolean).length || a.id - b.id);
    const out = [];
    for (const c of cand) { if (out.length >= n) break; if (out.every((o) => Math.abs(o.i - c.i) + Math.abs(o.j - c.j) > 2)) out.push(c); }
    for (const c of out) c.kind = 'chamber';
    return out;
  };
  const ch1 = pick(g1, 2), ch2 = pick(g2, 1);
  if (ch1.length < 2 || ch2.length < 1) return null;

  const all = [...cells.values()];
  const deadEnds = (depth) => all.filter((c) => c.depth === depth && c.kind === 'tunnel' && c.open.filter(Boolean).length === 1);
  const de1 = deadEnds(1), de2 = deadEnds(2);
  const deep = r2.deep, pockets = deepCells.filter((c) => c.kind === 'pocket');
  // A bolt-hole a depth: a dead end if there is one, else the depth's cell farthest from its way in.
  const bolt1 = de1[0] || farthest(g1, mouth), bolt2 = de2[de2.length - 1] || farthest(g2, r1.first);
  const bolt3 = pockets[0] || deep[3];
  if (!bolt1 || !bolt2 || !bolt3) return null;

  const C = HOLLOW.CELL;
  const floorY = (d) => -(d - 1) * HOLLOW.DEPTH_DROP;
  const centre = (c, ox = 0, oz = 0) => ({ x: c.i * C + C / 2 + ox, y: cellTop(c), z: c.j * C + C / 2 + oz });
  const corner = (c, k, inset = 2.1) => centre(c, (k & 1 ? 1 : -1) * (C / 2 - inset), (k & 2 ? 1 : -1) * (C / 2 - inset));
  // The Deep's chamber: its far side from the ramp holds the rune door and the passage; the strongbox before them.
  const dMinI = Math.min(...deep.map((c) => c.i)), dMinJ = Math.min(...deep.map((c) => c.j));
  const deepCentre = { x: (dMinI + 1) * C, y: floorY(3), z: (dMinJ + 1) * C };
  const rs = r2.ramp.rampSide, [fi, fj] = DIRS[rs];
  const doorAt = { x: deepCentre.x + fi * (C - 0.7), y: floorY(3), z: deepCentre.z + fj * (C - 0.7), yaw: Math.atan2(-fi, -fj) };
  const side = [fj, -fi];   // across the far wall
  const passage = { x: deepCentre.x + fi * (C - 2.2) + side[0] * 3.2, y: floorY(3), z: deepCentre.z + fj * (C - 2.2) + side[1] * 3.2, r: 1.6 };
  const strongbox = { x: deepCentre.x + fi * 3.2 - side[0] * 2.2, y: floorY(3), z: deepCentre.z + fj * 3.2 - side[1] * 2.2 };

  const sleepers = [];
  for (const c of [...ch1, ...ch2]) for (let k = 0; k < 4; k++) if (rnd() < 0.8) sleepers.push({ ...corner(c, k), depth: c.depth });
  for (const c of all) if (c.kind === 'tunnel' && c.depth > 1 && rnd() < 0.22) sleepers.push({ ...corner(c, Math.floor(rnd() * 4)), depth: c.depth });
  const nests = [{ ...centre(ch2[0]), depth: 2 }];
  if (theme === 'wet' || theme === 'hill' || rnd() < 0.5) nests.push({ ...centre(ch1[1]), depth: 1 });
  const crateSpots = [...de1, ...de2, ...pockets].filter((c) => c !== bolt1 && c !== bolt2 && c !== bolt3);
  const crates = crateSpots.slice(0, 5).map((c) => ({ ...centre(c), depth: c.depth }));
  while (crates.length < 3) { const c = ch1[crates.length % 2]; crates.push({ ...corner(c, crates.length), depth: c.depth }); }
  const tagSpots = [...pockets, ...de2, ...de1, ...ch2, ...ch1];
  const tags = [];
  for (let k = 0; k < HOLLOW.TAGS[theme]; k++) {
    const c = tagSpots[k % tagSpots.length];
    tags.push({ ...corner(c, (k * 3 + 1) % 4), depth: c.depth, n: k });
  }
  const lamps = [...ch1, ...ch2].map((c) => ({ ...centre(c), y: floorY(c.depth) + 2.4 }))
    .concat([r1.ramp, r2.ramp].map((c) => ({ ...centre(c), y: floorY(c.depth) + 2.2 })));
  const boltPoint = (c) => {
    // At the wall of its one closed side farthest from its way in.
    const s = c.open.findIndex((o) => o);
    const back = (s + 2) % 4, [bi, bj] = DIRS[back];
    return { ...centre(c, bi * (C / 2 - 2.1), bj * (C / 2 - 2.1)), r: 1.5, depth: c.depth, cell: c.id };
  };
  // GB-267: each chamber's accent light, in the theme's glow, high under its roof (the Deep's at its middle).
  const accents = [...ch1, ...ch2].map((c) => ({ ...centre(c), y: cellTop(c) + HOLLOW.CHAMBER_ROOF - 1.6 }))
    .concat([{ ...deepCentre, y: floorY(3) + HOLLOW.CHAMBER_ROOF - 1.6 }]);
  const landing = descent[0];
  return {
    theme, cells: all, mouthCell: mouth.id,
    depths: [g1.length, g2.length + 0, deepCells.length],
    ramps: [r1.ramp.id, r2.ramp.id], rampRuns: [r1.ramps.map((c) => c.id), r2.ramps.map((c) => c.id)],
    chambers: [...ch1, ...ch2].map((c) => c.id), deep: deep.map((c) => c.id),
    entry: { ...centre(mouth, 0, -C / 2 + 2.2), yaw: 0 },
    // GB-267: he comes in on the landing facing down the shaft (+x), the daylight behind him; walking back up into
    // the daylight at the landing's west end is the way out by the mouth.
    arrive: { ...centre(landing, 1.0, 0), yaw: Math.PI / 2 },
    descent: { cells: descent.map((c) => c.id), top: DS.TOP, day: { ...centre(landing, -C / 2 + 1.05, 0), y: DS.TOP + 1.7 } },
    accents,
    exits: { mouth: { ...centre(landing, -C / 2 + 1.7, 0), r: 1.4 }, boltHoles: [boltPoint(bolt1), boltPoint(bolt2), boltPoint(bolt3)], deep: passage },
    points: { sleepers, nests, crates, strongbox, tags, set: { kind: WARREN_LOOKS[theme].set, ...deepCentre } },
    doors: { rune: doorAt },
    lamps,
  };
}

// --- the plan's floor and walls ---------------------------------------------------------------
function planGround(plan) {
  const C = HOLLOW.CELL, map = new Map();
  for (const c of plan.cells) map.set(c.i + ',' + c.j, c);
  return function groundAt(x, z) {
    const i = Math.floor(x / C), j = Math.floor(z / C);
    const c = map.get(i + ',' + j);
    if (!c) return null;
    const drop = cellDrop(c);
    if (!drop) return cellTop(c);
    // A ramp (or a run of the descent) falls from its top by its drop, along its side (GB-267).
    const [di, dj] = DIRS[c.rampSide];
    const u = di ? (di > 0 ? (x - i * C) / C : 1 - (x - i * C) / C) : (dj > 0 ? (z - j * C) / C : 1 - (z - j * C) / C);
    return cellTop(c) - Math.max(0, Math.min(1, u)) * drop;
  };
}

// Wall boxes: a cell's closed sides are rock; an open side keeps its two shoulders (a GAP m doorway between); a tunnel
// has a pillar in each corner, flush with the walls (GB-267: no notch in the run), and the Deep's chamber has no walls
// inside it. { minX, maxX, minY, maxY, minZ, maxZ }.
function planSolids(plan) {
  const C = HOLLOW.CELL, W = HOLLOW.WALL, gap = HOLLOW.GAP, sh = (C - gap) / 2;
  const out = [];
  for (const c of plan.cells) {
    const x0 = c.i * C, z0 = c.j * C, y0 = cellTop(c) - cellDrop(c) - 0.5;
    const y1 = cellTop(c) + roofOfCell(c);
    const box = (ax, bx, az, bz, kind) => out.push({ minX: x0 + ax, maxX: x0 + bx, minZ: z0 + az, maxZ: z0 + bz, minY: y0, maxY: y1, cell: c.id, kind });
    for (let s = 0; s < 4; s++) {
      const [di, dj] = DIRS[s];
      const inside = (c.kind === 'deep') && (() => { const n = plan.cells.find((d) => d.i === c.i + di && d.j === c.j + dj); return n && n.kind === 'deep'; })();
      if (inside) continue;
      const along = (a0, a1) => (di ? [di > 0 ? C - W : 0, di > 0 ? C : W, a0, a1] : [a0, a1, dj > 0 ? C - W : 0, dj > 0 ? C : W]);
      const open = c.open[s];   // GB-267: the mouth's way up to the daylight is the descent now (its east side)
      if (!open) { const [ax, bx, az, bz] = along(0, C); box(ax, bx, az, bz, 'wall'); }
      else { const [a1, b1, c1, d1] = along(0, sh); box(a1, b1, c1, d1, 'shoulder'); const [a2, b2, c2, d2] = along(C - sh, C); box(a2, b2, c2, d2, 'shoulder'); }
    }
    if (c.kind === 'tunnel' || c.kind === 'pocket') {
      const p = W;
      box(0, p, 0, p, 'pillar'); box(C - p, C, 0, p, 'pillar'); box(0, p, C - p, C, 'pillar'); box(C - p, C, C - p, C, 'pillar');
    }
  }
  return out;
}

// CL-259 (N30): is a point in the open (in a cell, over its floor, under its roof, outside its rock)? For the
// third-person camera below, which used to ask the valley's ground 400 m up whenever it swung outside a cell. Local
// plan coordinates; pad keeps it off the rock. roofAt is the cell's roof (a ramp's is its upper depth's).
function planOpen(plan, solids, groundAt) {
  const C = HOLLOW.CELL, cells = new Map(), byCell = new Map();
  for (const c of plan.cells) cells.set(c.i + ',' + c.j, c);
  for (const s of solids) { if (!byCell.has(s.cell)) byCell.set(s.cell, []); byCell.get(s.cell).push(s); }
  const cellAt = (x, z) => cells.get(Math.floor(x / C) + ',' + Math.floor(z / C));
  const roofAt = (x, z) => { const c = cellAt(x, z); return c ? cellTop(c) + roofOfCell(c) : null; };
  function openAt(x, y, z, pad = 0.2) {
    const c = cellAt(x, z); if (!c) return false;
    const f = groundAt(x, z), r = cellTop(c) + roofOfCell(c);
    if (f == null || y < f + pad || y > r - pad) return false;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const n = cells.get((c.i + di) + ',' + (c.j + dj)); if (!n) continue;
      for (const b of byCell.get(n.id) || []) if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad && y > b.minY && y < b.maxY) return false;
    }
    return true;
  }
  return { openAt, roofAt };
}

// The zombies' flow field: 1.5 m squares, walkable where a floor is and no solid stands.
function planNav(plan, solids) {
  const C = HOLLOW.CELL, N = HOLLOW.NAV_CELL, G = HOLLOW.GRID;
  const w = Math.ceil(G * C / N), h = w, walkable = new Uint8Array(w * h);
  const has = new Set(plan.cells.map((c) => c.i + ',' + c.j));
  for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) {
    const x = (a + 0.5) * N, z = (b + 0.5) * N;
    if (!has.has(Math.floor(x / C) + ',' + Math.floor(z / C))) continue;
    let blocked = false;
    for (const s of solids) if (x > s.minX - 0.2 && x < s.maxX + 0.2 && z > s.minZ - 0.2 && z < s.maxZ + 0.2) { blocked = true; break; }
    if (!blocked) walkable[b * w + a] = 1;
  }
  return { cell: N, w, h, ox: 0, oz: 0, walkable };
}

// --- the meshes ---------------------------------------------------------------------------------
// GB-267 (CL-286, J47): wall-placement helpers keeping every floor prop & find strictly against
// one closed side (within PROP_DEPTH = 0.5 m) and out of all doorway bands (t325 >= 4.4 m clear).
function atWall(c, s, along, out, a, b, C) {
  const W = HOLLOW.WALL, x0 = c.i * C, z0 = c.j * C;
  const t = W + 0.6 + a / 2 + along * Math.max(0, C - 2 * W - 1.2 - a);
  const [di, dj] = DIRS[s];
  if (di) {
    const fx = di > 0 ? x0 + C - W - out - b / 2 : x0 + W + out + b / 2;
    return { minX: fx - b / 2, maxX: fx + b / 2, minZ: z0 + t - a / 2, maxZ: z0 + t + a / 2, x: fx, z: z0 + t, s };
  }
  const fz = dj > 0 ? z0 + C - W - out - b / 2 : z0 + W + out + b / 2;
  return { minX: x0 + t - a / 2, maxX: x0 + t + a / 2, minZ: fz - b / 2, maxZ: fz + b / 2, x: x0 + t, z: fz, s };
}
const closedSides = (c) => [0, 1, 2, 3].filter((s) => !c.open[s]);
const PROP_DEPTH = 0.5;
const propSide = (c) => { const ss = closedSides(c); return ss.length ? ss[c.id % ss.length] : -1; };
const wallYaw = (s) => Math.atan2(-DIRS[s][0], -DIRS[s][1]);
const openDoorYaw = (c) => {
  const s = c.open.findIndex(Boolean);
  return s >= 0 ? Math.atan2(DIRS[s][0], DIRS[s][1]) : 0;
};

// --- CL-99 v3 + AG-416: what the dead dragged down, hero husks, and the iron breach ---
function dressDraggedDown(group, plan, theme, mats, floorY, C, solidsOut = [], extraLights = []) {
  const rnd = mulberry32(hashStr('hollows-dragged:' + theme));
  // FOB Threshold's stores in Chamber 0: tucked cleanly against a closed wall out of the fighting lane!
  const wc = plan.cells[plan.chambers[0]];
  {
    const y = floorY(wc.depth);
    const side = propSide(wc);
    const kit = new THREE.Group();
    kit.name = 'fob-crates';
    if (side >= 0) {
      const fp = atWall(wc, side, 0.14, 0.02, 2.05, 0.46, C);
      kit.position.set(fp.x, y, fp.z);
      kit.rotation.y = wallYaw(side);
    } else {
      kit.position.set(wc.i * C + 1.65, y, wc.j * C + 1.65);
    }
    const fBatch = new SculptBatch(THREE, 'fob-kit');
    // Lower + stacked upper military crates + burst open crate beside them
    fBatch.box(0.84, 0.44, 0.42, mats.crate, -0.44, 0.22, -0.02, 0, 0.04, 0, 0.5);
    fBatch.box(0.86, 0.05, 0.44, mats.iron, -0.44, 0.44, -0.02, 0, 0.04, 0, 0.4);
    fBatch.box(0.76, 0.40, 0.38, mats.crate, -0.40, 0.65, -0.03, 0, -0.10, 0, 0.5);
    fBatch.box(0.78, 0.05, 0.40, mats.iron, -0.40, 0.86, -0.03, 0, -0.10, 0, 0.4);
    // Burst open supply crate with thrown lid leaning against front
    fBatch.box(0.74, 0.06, 0.40, mats.crateDark, 0.46, 0.04, 0.0, 0, -0.08, 0, 0.5);
    fBatch.box(0.74, 0.34, 0.04, mats.crate, 0.46, 0.21, -0.18, 0, -0.08, 0, 0.5);
    fBatch.box(0.74, 0.22, 0.04, mats.crate, 0.46, 0.15, 0.18, 0, -0.08, 0, 0.5);
    fBatch.box(0.04, 0.34, 0.36, mats.crate, 0.11, 0.21, 0.0, 0, -0.08, 0, 0.5);
    fBatch.box(0.04, 0.34, 0.36, mats.crate, 0.81, 0.21, 0.0, 0, -0.08, 0, 0.5);
    fBatch.box(0.76, 0.05, 0.40, mats.crate, 0.60, 0.16, 0.26, 0.92, 0.35, 0.12, 0.5); // burst lid
    // Combat helmet resting on upper crate
    const helmGeo = new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.56);
    fBatch.pushGeo(helmGeo, mats.helmet, { x: -0.56, y: 0.92, z: 0.02, rx: 0.28, ry: 0.5, rz: 0.4, tile: 0.4 });
    helmGeo.dispose();
    // PGB field radio set + angled whip antenna
    fBatch.box(0.24, 0.32, 0.14, mats.helmet, -0.06, 1.04, -0.02, 0, 0.3, 0.08, 0.3);
    fBatch.box(0.18, 0.10, 0.03, mats.crateDark, -0.05, 1.08, 0.06, 0, 0.3, 0.08, 0.3);
    fBatch.rod([-0.02, 1.18, -0.02], [0.14, 1.78, 0.04], 0.008, 0.006, 4, mats.iron);
    fBatch.flush(kit);
    if (mats.stencil) {
      const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.34), mats.stencil);
      f1.position.set(-0.44, 0.22, 0.195);
      f1.rotation.y = 0.04;
      kit.add(f1);
      const f2 = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.30), mats.stencil);
      f2.position.set(-0.40, 0.65, 0.165);
      f2.rotation.y = -0.10;
      kit.add(f2);
    }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), mats.lamp);
    led.position.set(0.01, 1.14, 0.06);
    kit.add(led);
    group.add(kit);
  }

  // Hero veined husks hung overhead in chambers and the Deep (keeps y - 2.3 > floor + 2.5 for hollows.test.mjs!)
  const kinds = ['boot', 'jacket', 'many'];
  const chambers = plan.chambers.map((id) => plan.cells[id]);
  const deep = plan.deep.map((id) => plan.cells[id]);
  const hang = (c, n, rooms) => {
    for (let k = 0; k < n; k++) {
      const what = c.depth >= 2 && rnd() < 0.45 ? 'many' : kinds[Math.floor(rnd() * 2)];
      const h = buildHeroHusk(THREE, mats, what, rnd);
      const x = c.i * C + 1.4 + rnd() * (C - 2.8), z = c.j * C + 1.4 + rnd() * (C - 2.8);
      h.position.set(x, floorY(c.depth) + HOLLOW.CHAMBER_ROOF - 0.2, z);
      group.add(h);
      rooms.push(h);
    }
  };
  const husks = [];
  for (const c of chambers) hang(c, 2 + (rnd() < 0.5 ? 1 : 0), husks);
  for (const c of deep) if (rnd() < 0.75) hang(c, 1, husks);
  group.userData.husks = husks;

  // Iron warren breach: settlers' forged-iron wall across Ramp 0 head, cut open with bolt cutters,
  // plus the hikers' climbing rope down the ramp and their dropped lights at the foot.
  if (theme === 'iron') {
    const r = plan.cells[plan.ramps[0]], [di, dj] = DIRS[r.rampSide], y = cellTop(r);
    const cx = r.i * C + C / 2 - di * (C / 2 - 0.4), cz = r.j * C + C / 2 - dj * (C / 2 - 0.4), across = [dj, -di];
    const wall = new THREE.Group(); wall.name = 'iron-wall-cut'; group.add(wall);
    const SP = 0.3, n = 2 * Math.ceil(HOLLOW.GAP / 2 / SP) + 1, CUTK = 2;
    const clear = (CUTK + 1) * SP * 2 - 0.05, half0 = ((n - 1) / 2) * SP;
    for (const sd of [-1, 1]) {
      const a = sd * clear / 2, b = sd * (half0 + 0.1);
      const xa = cx + across[0] * a, za = cz + across[1] * a, xb = cx + across[0] * b, zb = cz + across[1] * b;
      solidsOut.push({
        minX: Math.min(xa, xb) - 0.06, maxX: Math.max(xa, xb) + 0.06,
        minZ: Math.min(za, zb) - 0.06, maxZ: Math.max(za, zb) + 0.06,
        minY: y - 0.5, maxY: y + HOLLOW.TUNNEL_ROOF, cell: r.id, kind: 'iron-bars',
      });
    }
    wall.userData.clear = clear;
    const wBatch = new SculptBatch(THREE, 'iron-bars');
    const ry = Math.atan2(across[0], across[1]), half = (n * SP) / 2, gap = (CUTK + 0.5) * SP;
    // Heavy forged header beam spanning ceiling rock + anchored floor threshold plates
    wBatch.box(0.16, 0.16, n * SP + 0.4, mats.ironRust, cx, y + HOLLOW.TUNNEL_ROOF - 0.08, cz, 0, ry, 0, 0.7);
    for (const sd of [-1, 1]) {
      const len = half - gap, mid = sd * (gap + len / 2);
      wBatch.box(0.14, 0.10, len + 0.12, mats.ironRust, cx + across[0] * mid, y + 0.05, cz + across[1] * mid, 0, ry, 0, 0.6);
      for (const yy of [0.58, 2.2, HOLLOW.TUNNEL_ROOF - 0.45]) {
        wBatch.box(0.08, 0.09, len + 0.05, mats.iron, cx + across[0] * mid, y + yy, cz + across[1] * mid, 0, ry, 0, 0.5);
      }
    }
    for (let k = 0; k < n; k++) {
      const u = (k - (n - 1) / 2) * SP, cut = Math.abs(k - (n - 1) / 2) <= CUTK;
      const bx = cx + across[0] * u, bz = cz + across[1] * u;
      if (!cut) {
        wBatch.cyl(0.028, 0.030, HOLLOW.TUNNEL_ROOF, 7, mats.iron, bx, y + HOLLOW.TUNNEL_ROOF / 2, bz);
        wBatch.cyl(0.044, 0.044, 0.06, 7, mats.ironRust, bx, y + 2.2, bz);
      } else {
        // Sheared upper & lower iron bar stubs with bright cut steel ends + bent bars resting aside
        wBatch.cyl(0.028, 0.028, 0.52, 7, mats.iron, bx, y + HOLLOW.TUNNEL_ROOF - 0.26, bz);
        wBatch.cyl(0.028, 0.028, 0.24, 7, mats.iron, bx, y + 0.12, bz);
        wBatch.cyl(0.027, 0.027, 0.03, 6, mats.reflective, bx, y + 0.25, bz);
        const side = u < 0 ? -1 : 1;
        const lx = cx + across[0] * side * (1.28 + Math.abs(u) * 0.26) + di * 0.62;
        const lz = cz + across[1] * side * (1.28 + Math.abs(u) * 0.26) + dj * 0.62;
        wBatch.cyl(0.027, 0.027, 2.35, 7, mats.ironRust, lx, y + 0.07 + Math.abs(u) * 0.04, lz, Math.PI / 2 - 0.07, Math.atan2(di, dj) + side * 0.24, 0);
      }
    }
    wBatch.flush(wall);

    // Hikers' braided climbing rope pegged down the two-cell ramp, coil & dropped headlamp + glowsticks
    const rope = new THREE.Group(); rope.name = 'hikers-rope'; group.add(rope);
    const rBatch = new SculptBatch(THREE, 'hikers-kit');
    const RL = C * HOLLOW.RAMP_CELLS, ROFF = 2.25;
    const ropePts = [];
    for (let s = 0; s <= 6; s++) {
      const f = s / 6;
      const px = r.i * C + C / 2 + di * (f * RL - C / 2) + across[0] * ROFF;
      const pz = r.j * C + C / 2 + dj * (f * RL - C / 2) + across[1] * ROFF;
      const py = y - f * HOLLOW.DEPTH_DROP + 0.16 - Math.sin(f * Math.PI) * 0.05;
      ropePts.push([px, py, pz]);
      if (s % 2 === 0) rBatch.box(0.06, 0.06, 0.14, mats.iron, px, py + 0.02, pz, 0, Math.atan2(across[0], across[1]), 0, 0.3);
    }
    rBatch.tube(ropePts, 6, 0.024, mats.rope, 0.5);
    const coilX = r.i * C + C / 2 + di * (RL - C / 2 + 0.8) + across[0] * ROFF;
    const coilZ = r.j * C + C / 2 + dj * (RL - C / 2 + 0.8) + across[1] * ROFF;
    const coilY = y - HOLLOW.DEPTH_DROP;
    rBatch.torus(0.28, 0.042, 6, 16, Math.PI * 2, mats.rope, coilX, coilY + 0.045, coilZ, Math.PI / 2, 0, 0);
    rBatch.torus(0.22, 0.036, 6, 14, Math.PI * 2, mats.rope, coilX + 0.03, coilY + 0.09, coilZ - 0.02, Math.PI / 2 + 0.08, 0.2, 0);
    rBatch.flush(rope);

    const lp = { x: coilX + across[0] * -0.8, y: coilY, z: coilZ + across[1] * -0.8 };
    const lamp = new THREE.Group(); lamp.name = 'hikers-headlamp'; lamp.position.set(lp.x, lp.y + 0.035, lp.z);
    const lBody = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.065, 0.075), mats.helmet); lamp.add(lBody);
    const lLens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 8), mats.day); lLens.position.set(0, 0, 0.039); lamp.add(lLens);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 4, 12), mats.rope); strap.rotation.x = Math.PI / 2; strap.position.set(-0.09, -0.02, 0); lamp.add(strap);
    rope.add(lamp);
    extraLights.push({ x: lp.x, y: lp.y + 0.22, z: lp.z, color: 0xcce4ff, range: 6.5, intensity: 1.9, phase: 1.1, isHeadlamp: true });

    for (let k = 0; k < 2; k++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.17, 6), mats.glowstick);
      st.rotation.set(Math.PI / 2, 0, rnd() * 3);
      st.position.set(lp.x + 0.5 + k * 0.7, lp.y + 0.018, lp.z + 0.3 - k * 0.5);
      rope.add(st);
    }
  }
}

// --- GB-267 + AG-416: sculpted descent fissure, feathered daylight shaft, braided rope, chalk mark ---
function dressDescent(group, plan, mats, C) {
  const ids = plan.descent && plan.descent.cells; if (!ids) return;
  const cells = ids.map((id) => plan.cells[id]), L = cells[0], W = HOLLOW.WALL;
  const g = new THREE.Group(); g.name = 'descent'; group.add(g);
  const dBatch = new SculptBatch(THREE, 'descent');
  const day = plan.descent.day;
  const rockMat = mats.stoneTrim || mats.rock;

  // Sculpted jagged rock mouth framing the daylight fissure on the landing's west wall
  const wx = L.i * C + W;
  dBatch.stone(wx + 0.12, day.y - 0.15, day.z - 0.62, 0.32, 1.38, 0.34, 41901, 'schist', rockMat, { rot: [0.10, 0, 0], detail: 1, tile: 0.9 });
  dBatch.stone(wx + 0.12, day.y - 0.15, day.z + 0.62, 0.32, 1.38, 0.34, 41902, 'schist', rockMat, { rot: [-0.10, 0, 0], detail: 1, tile: 0.9 });
  dBatch.stone(wx + 0.16, day.y + 1.24, day.z, 0.36, 0.38, 0.85, 41903, 'schist', rockMat, { detail: 1, tile: 0.9 });

  // Braided rope along the shaft's north wall (+z) of the upper run on forged iron pitons
  const up = cells.slice(0, 4), W2 = (c) => c.j * C + C - W - 0.08;
  const pts = [];
  for (const c of up) for (const f of [0.15, 0.5, 0.85]) {
    const x = c.i * C + f * C, drop = c.drop > 0 ? c.drop * f : 0;
    const py = cellTop(c) - drop + 1.5, pz = W2(c);
    pts.push([x, py - 0.07, pz - 0.09]);
    dBatch.box(0.055, 0.055, 0.15, mats.iron, x, py, pz - 0.04, 0, 0, 0, 0.3);
    dBatch.torus(0.036, 0.01, 4, 8, Math.PI * 2, mats.ironRust, x, py - 0.03, pz - 0.09, 0, Math.PI / 2, 0);
  }
  dBatch.tube(pts, 5, 0.020, mats.rope, 0.5);

  // Chalked FOB Threshold arrow on the turn's east wall, pointing down the lower run
  const T0 = cells[4], ax = T0.i * C + C - W - 0.02, ay = cellTop(T0) + 1.6, az = T0.j * C + C / 2;
  dBatch.box(0.022, 0.07, 1.12, mats.chalk, ax, ay, az);
  for (const sd of [-1, 1]) dBatch.box(0.022, 0.07, 0.45, mats.chalk, ax, ay + sd * 0.14, az - 0.42, sd * 0.7, 0, 0);
  dBatch.box(0.022, 0.05, 0.52, mats.chalk, ax, ay - 0.35, az + 0.1);
  dBatch.flush(g);

  // Bright feathered daylight crack + 2D Gaussian crossed volumetric shaft angling softly onto the floor
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 2.58), mats.day);
  crack.position.set(wx + 0.04, day.y - 0.12, day.z);
  crack.rotation.y = Math.PI / 2;
  crack.name = 'descent-daylight';
  g.add(crack);

  const beamGrp = new THREE.Group();
  beamGrp.position.set(wx + 1.48, day.y - 0.72, day.z);
  beamGrp.rotation.z = Math.PI / 2 - 0.48;
  for (const ry of [-0.48, 0.48]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 3.65), mats.shaft);
    plane.rotation.y = ry;
    beamGrp.add(plane);
  }
  g.add(beamGrp);

  const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 2.85), mats.shaftPool);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(wx + 2.05, cellTop(L) + 0.022, day.z);
  g.add(pool);

  // Dropped green glowstick at the turn
  const T1 = cells[3];
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.17, 6), mats.glowstick);
  stick.rotation.set(Math.PI / 2, 0, 0.7);
  stick.position.set(T1.i * C + C / 2 + 1.1, cellTop(T1) + 0.018, T1.j * C + C / 2 - 0.6);
  g.add(stick);
}

// --- GB-267 + AG-416: thematic expedition finds along chamber walls (strictly within PROP_DEPTH) ---
function dressFinds(group, plan, theme, mats, C, solidsOut) {
  const rnd = mulberry32(hashStr('hollows-finds:' + theme));
  const g = new THREE.Group(); g.name = 'finds'; group.add(g);
  const batch = new SculptBatch(THREE, 'finds-' + theme);
  const chambers = plan.chambers.map((id) => plan.cells[id]);
  const solid = (c, f, h) => solidsOut.push({
    minX: f.minX, maxX: f.maxX, minZ: f.minZ, maxZ: f.maxZ,
    minY: cellTop(c) - 0.5, maxY: cellTop(c) + h, cell: c.id, kind: 'find',
  });
  const spot = (c, k, a, b, out = 0.02, any = false, alongVal = null) => {
    const al = alongVal != null ? alongVal : (0.68 + rnd() * 0.22);
    if (any) { const ss = closedSides(c); if (!ss.length) return null; return atWall(c, ss[k % ss.length], al, out, a, b, C); }
    const s = propSide(c); if (s < 0) return null;
    return atWall(c, s, al, Math.min(out, Math.max(0, PROP_DEPTH - b)), a, Math.min(b, PROP_DEPTH), C);
  };
  const c0 = chambers[0], c1 = chambers[1] || chambers[0], c2 = chambers[2] || chambers[0];

  if (theme === 'root') {
    const f = spot(c1, 0, 1.2, 0.46, 0.02, false, 0.55);
    if (f) {
      const y = cellTop(c1);
      batch.torus(0.22, 0.036, 6, 14, Math.PI * 2, mats.harness, f.x, y + 0.04, f.z, Math.PI / 2, 0, 0);
      batch.torus(0.14, 0.024, 5, 12, Math.PI * 2, mats.rope, f.x - 0.16, y + 0.03, f.z + 0.12, Math.PI / 2, 0.3, 0);
      const hGeo = new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.56);
      batch.pushGeo(hGeo, mats.climbHelmet, { x: f.x + 0.30, y: y + 0.04, z: f.z + 0.16, rx: 0.4, ry: 0.2, rz: 0.85, tile: 0.3 });
      hGeo.dispose();
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), mats.lamp);
      hl.position.set(f.x + 0.37, y + 0.14, f.z + 0.24);
      g.add(hl);
    }
    const p = spot(c2, 1, 0.62, 0.42, 0.02, false, 0.50);
    if (p) {
      const y = cellTop(c2);
      batch.stone(p.x, y + 0.30, p.z, (p.maxX - p.minX) * 0.48, 0.32, (p.maxZ - p.minZ) * 0.48, 41809, 'granite', mats.pack, { detail: 1, tile: 0.4 });
      for (let k = 0; k < 4; k++) {
        const dx = (k - 1.5) * 0.12;
        batch.tube([[p.x + dx, y, p.z], [p.x + dx * 0.5, y + 0.55, p.z + 0.08], [p.x + dx * 1.4, y + 2.5, p.z - 0.04]], 5, (u) => 0.055 - u * 0.025, mats.bark, 0.5);
      }
      solid(c2, p, 0.65);
    }
  } else if (theme === 'shale') {
    const f = spot(c0, 0, 1.4, 0.02, 0, true, 0.72);
    if (f) {
      const y = cellTop(c0) + 1.35, along = DIRS[f.s][0] ? [0, 1] : [1, 0];
      for (let k = 0; k < 9; k++) {
        const u = (k - 4) * 0.14 + (k >= 5 ? 0.14 : 0);
        batch.box(along[0] ? 0.025 : 0.032, 0.34, along[1] ? 0.025 : 0.032, mats.chalk, f.x + along[0] * u, y, f.z + along[1] * u);
      }
    }
    const s = spot(c1, 1, 1.75, 0.48, 0.02, false, 0.52);
    if (s) {
      const y = cellTop(c1);
      for (let k = 0; k < 3; k++) {
        batch.stone(s.x, y + 0.10 + k * 0.19, s.z, (s.maxX - s.minX) * 0.5, 0.10, (s.maxZ - s.minZ) * 0.5, 41815 + k, 'schist', mats.schistLight, { detail: 1, tile: 0.7 });
      }
      batch.cyl(0.14, 0.14, Math.max(0.55, Math.min(1.4, Math.max(s.maxX - s.minX, s.maxZ - s.minZ) - 0.16)), 8, mats.sleepBag, s.x, y + 0.68, s.z, DIRS[s.s][0] ? Math.PI / 2 : 0, 0, DIRS[s.s][0] ? 0 : Math.PI / 2);
      solid(c1, s, 0.72);
    }
  } else if (theme === 'iron') {
    const f = spot(c1, 0, 1.65, 0.48, 0.02, false, 0.50);
    if (f) {
      const y = cellTop(c1), wy = wallYaw(f.s);
      batch.box(f.maxX - f.minX, 0.84, f.maxZ - f.minZ, mats.ironRust, f.x, y + 0.42, f.z, 0, 0.03, 0, 0.6);
      batch.box((f.maxX - f.minX) * 0.96, 0.08, (f.maxZ - f.minZ) * 1.04, mats.iron, f.x, y + 0.84, f.z, 0, 0.03, 0, 0.5);
      batch.cyl(0.22, 0.22, 0.075, 10, mats.iron, f.x - DIRS[f.s][0] * 0.28, y + 0.22, f.z - DIRS[f.s][1] * 0.28, Math.PI / 2, wy, 0);
      solid(c1, f, 0.88);
    }
  } else if (theme === 'wet') {
    const f = spot(c1, 0, 2.4, 0.48, 0.02, false, 0.52);
    if (f) {
      const y = cellTop(c1), d = DIRS[f.s][0] ? [0, 1] : [1, 0];
      const ledge = atWall(c1, f.s, 0.52, 0, 1.6, PROP_DEPTH, C);
      batch.stone(ledge.x, y + 0.46, ledge.z, (ledge.maxX - ledge.minX) * 0.52, 0.48, (ledge.maxZ - ledge.minZ) * 0.52, 41831, 'basalt', mats.wetBasalt, { detail: 1, tile: 0.7 });
      solid(c1, ledge, 0.9);
      for (let k = 0; k < 4; k++) {
        batch.box(0.28, 0.20, 0.16, mats.ammoCan, ledge.x - DIRS[f.s][0] * (1.05 + k * 0.48) + d[0] * (rnd() - 0.5) * 0.26, y + 0.48, ledge.z - DIRS[f.s][1] * (1.05 + k * 0.48) + d[1] * (rnd() - 0.5) * 0.26, 0, rnd() * 0.8, 0, 0.35);
      }
      batch.rod([ledge.x, y + 3.7, ledge.z], [ledge.x, y + HOLLOW.CHAMBER_ROOF, ledge.z], 0.015, 0.015, 5, mats.rope);
      batch.stone(ledge.x, y + 3.4, ledge.z, 0.20, 0.32, 0.14, 41835, 'granite', mats.rangerJacket, { detail: 1, tile: 0.4 });
    }
  } else if (theme === 'hill') {
    for (const c of chambers) for (let k = 0; k < 3; k++) {
      const f = spot(c, k, 1.85, 0.24, 0, true, 0.28 + k * 0.26); if (!f) continue;
      const ty = cellTop(c) + 0.55 + (k % 2) * 0.78;
      batch.box(f.maxX - f.minX, 0.48, f.maxZ - f.minZ, mats.barrowStone, f.x, ty, f.z, 0, 0, 0, 0.8);
      batch.box((f.maxX - f.minX) + 0.06, 0.08, (f.maxZ - f.minZ) + 0.04, mats.stoneTrim, f.x, ty + 0.28, f.z, 0, 0, 0, 0.8);
    }
    const s = spot(c0, 1, 2.0, 0.48, 0.02, false, 0.78);
    if (s) {
      const y = cellTop(c0);
      batch.box(s.maxX - s.minX, 0.66, s.maxZ - s.minZ, mats.barrowStone, s.x, y + 0.33, s.z, 0, 0, 0, 0.85);
      batch.box((s.maxX - s.minX) + 0.08, 0.09, (s.maxZ - s.minZ) + 0.06, mats.stoneTrim, s.x, y + 0.69, s.z, 0, 0, 0, 0.85);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(1.65, Math.max(0.32, s.maxX - s.minX - 0.08)), 0.22, Math.min(1.65, Math.max(0.32, s.maxZ - s.minZ - 0.08))),
        mats.rangerJacket
      );
      body.position.set(s.x, y + 0.84, s.z);
      body.name = 'gravewalker-laid-out';
      g.add(body);
      solid(c0, s, 0.75);
    }
  }
  batch.flush(g);

  // Dark grime drag tracks from each nest toward its cell's way in
  for (const n of plan.points.nests) {
    const c = plan.cells.find((q) => q.i === Math.floor(n.x / C) && q.j === Math.floor(n.z / C)); if (!c) continue;
    const s = c.open.findIndex(Boolean); if (s < 0) continue;
    const [di, dj] = DIRS[s], len = C / 2 + 0.45;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.68, len), mats.drag);
    m.position.set(n.x + di * len / 2, cellTop(c) + 0.014, n.z + dj * len / 2);
    m.rotation.order = 'YXZ';
    m.rotation.y = Math.atan2(di, dj);
    m.rotation.x = -Math.PI / 2;
    g.add(m);
  }
}

// --- AG-416: Batched architectural cave dressing (arches, stalactites, talus, theme dressing) ---
function dressArchitecture(group, plan, theme, look, mats, C, extraSolids, timberLamps, rnd) {
  const batch = new SculptBatch(THREE, 'arch-' + theme);
  const byKey = new Map(plan.cells.map((c) => [c.i + ',' + c.j, c]));
  const Wl = HOLLOW.WALL;
  const rockMat = mats.stoneTrim || mats.rock;
  const waterQuads = [];

  for (const c of plan.cells) {
    const x0 = c.i * C, z0 = c.j * C, y = cellTop(c);
    const roof = roofOfCell(c), sloped = cellDrop(c) > 0, floorOk = !sloped && c.kind !== 'descent';
    const side = propSide(c);
    const isLarge = c.kind === 'chamber' || c.kind === 'deep';

    // 1. Grounded doorway portal framing (replaces floating upper-corner stones with clean flush pilasters/lintels!)
    // Strictly outside the 4.4 m doorway opening (no solids, zero walkway intrusion).
    for (let s = 0; s < 4; s++) {
      if (!c.open[s]) continue;
      const [di, dj] = DIRS[s];
      const nbr = byKey.get((c.i + di) + ',' + (c.j + dj));
      if (!nbr || (c.kind === 'deep' && nbr.kind === 'deep')) continue;
      if (c.id > nbr.id) continue; // draw once per doorway pair
      const lowRoof = Math.min(y + roof, cellTop(nbr) + roofOfCell(nbr));
      const baseY = Math.max(y, cellTop(nbr));
      if (lowRoof - baseY < 3.6) continue;
      const cx = di ? (di > 0 ? x0 + C : x0) : x0 + C * 0.5;
      const cz = dj ? (dj > 0 ? z0 + C : z0) : z0 + C * 0.5;
      const ax = di ? [0, 1] : [1, 0];
      const jambH = lowRoof - baseY;
      if (theme === 'hill') {
        // Flush dressed barrow ashlar pilasters rising cleanly along each doorway cheek + stone header lintel
        for (const sd of [-1, 1]) {
          const off = sd * (HOLLOW.GAP * 0.5 + 0.08);
          const hx = cx + ax[0] * off, hz = cz + ax[1] * off;
          batch.box(di ? 1.18 : 0.28, jambH, dj ? 1.18 : 0.28, mats.barrowStone, hx, baseY + jambH * 0.5, hz, 0, 0, 0, 0.9);
        }
        batch.box(di ? 1.24 : HOLLOW.GAP + 0.6, 0.30, dj ? 1.24 : HOLLOW.GAP + 0.6, mats.barrowStone, cx, lowRoof - 0.15, cz, 0, 0, 0, 0.9);
      } else if (theme === 'iron') {
        // Heavy mine timber doorway cap beam + angled corner knee braces flush under the ceiling
        batch.box(di ? 0.36 : HOLLOW.GAP + 0.5, 0.26, dj ? 0.36 : HOLLOW.GAP + 0.5, mats.timberDark, cx, lowRoof - 0.14, cz, 0, 0, 0, 1.0);
        for (const sd of [-1, 1]) {
          const jOff = sd * (HOLLOW.GAP * 0.5 + 0.04);
          const kOff = sd * (HOLLOW.GAP * 0.5 - 0.72);
          batch.beam(
            [cx + ax[0] * jOff, lowRoof - 0.98, cz + ax[1] * jOff],
            [cx + ax[0] * kOff, lowRoof - 0.18, cz + ax[1] * kOff],
            0.14, 0.16, mats.timberDark
          );
        }
      } else {
        // Organic wall-hugging tapered rock jamb ribs along doorway edges (zero floating corner potatoes!)
        for (const sd of [-1, 1]) {
          const off = sd * (HOLLOW.GAP * 0.5 + 0.06);
          const hx = cx + ax[0] * off, hz = cz + ax[1] * off;
          batch.cyl(0.16, 0.22, jambH * 0.98, 6, rockMat, hx, baseY + jambH * 0.49, hz, 0, sd * 0.4, 0, 0.9);
        }
      }
    }

    // 2. Ceiling stalactites / rock pendants (always safely above head height!)
    if (c.kind !== 'descent') {
      const sCount = isLarge ? 3 : (rnd() < 0.55 ? 1 : 0);
      const minClear = isLarge ? 4.6 : 3.25;
      for (let k = 0; k < sCount; k++) {
        const sx = x0 + 1.45 + rnd() * (C - 2.9);
        const sz = z0 + 1.45 + rnd() * (C - 2.9);
        const maxLen = Math.max(0.45, Math.min(isLarge ? 2.1 : 1.15, roof - minClear));
        const len = 0.45 + rnd() * (maxLen - 0.45);
        batch.speleothem(sx, y + roof + 0.05, sz, 0.14 + rnd() * 0.12, len, true, 43400 + c.id * 29 + k, rockMat, 0.85);
      }
    }

    // 3. Low tucked corner scree / talus stones (zero walkway intrusion!)
    if (floorOk && c.kind !== 'deep') {
      const corners = [
        [!c.open[0] && !c.open[3], x0 + Wl + 0.24, z0 + Wl + 0.24],
        [!c.open[0] && !c.open[1], x0 + C - Wl - 0.24, z0 + Wl + 0.24],
        [!c.open[2] && !c.open[3], x0 + Wl + 0.24, z0 + C - Wl - 0.24],
        [!c.open[2] && !c.open[1], x0 + C - Wl - 0.24, z0 + C - Wl - 0.24],
      ];
      for (let ci = 0; ci < 4; ci++) {
        const [okCorner, kx, kz] = corners[ci];
        if (!okCorner || rnd() > 0.55) continue;
        batch.stone(kx, y + 0.14, kz, 0.24 + rnd() * 0.12, 0.15 + rnd() * 0.10, 0.24 + rnd() * 0.12, 43700 + c.id * 13 + ci, theme === 'wet' ? 'basalt' : 'granite', rockMat, { detail: 1, tile: 0.65 });
      }
    }

    // 4. Theme-specific signature architecture (strictly respecting propSide(c) & PROP_DEPTH!)
    const n = isLarge ? 4 : 2;
    const pushSolidProp = (b) => {
      extraSolids.push({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, minY: y - 0.5, maxY: b.maxY, cell: c.id, kind: 'prop' });
    };

    if (look.props === 'roots') {
      // Curved overhead strangler-root vaults & sinuous hanging tendrils (>= HOLLOW.ROOT_CLEAR!)
      for (let k = 0; k < n; k++) {
        const px = x0 + 1.6 + rnd() * (C - 3.2), pz = z0 + 1.6 + rnd() * (C - 3.2);
        const len = 0.75 + rnd() * Math.max(0.2, roof - HOLLOW.ROOT_CLEAR - 0.85);
        const rBase = 0.065 + rnd() * 0.055;
        batch.tube([
          [px, y + roof + 0.06, pz],
          [px + (rnd() - 0.5) * 0.42, y + roof - len * 0.52, pz + (rnd() - 0.5) * 0.42],
          [px + (rnd() - 0.5) * 0.55, y + roof - len, pz + (rnd() - 0.5) * 0.55],
        ], 5, (u) => rBase * (1 - u * 0.72), k % 2 ? mats.bark : mats.barkDark, 0.75);
      }
      // Overhead cross-tunnel strangler root arch in tunnels
      if (!isLarge && c.kind !== 'descent' && rnd() < 0.6) {
        const we = !c.open[1] && !c.open[3];
        const a0 = we ? [x0 + Wl, y + roof - 0.8, z0 + C * 0.5] : [x0 + C * 0.5, y + roof - 0.8, z0 + Wl];
        const a1 = we ? [x0 + C * 0.5, y + roof - 0.15, z0 + C * 0.5 + (rnd() - 0.5) * 0.7] : [x0 + C * 0.5 + (rnd() - 0.5) * 0.7, y + roof - 0.15, z0 + C * 0.5];
        const a2 = we ? [x0 + C - Wl, y + roof - 0.9, z0 + C * 0.5] : [x0 + C * 0.5, y + roof - 0.9, z0 + C - Wl];
        batch.tube([a0, a1, a2], 6, (u) => 0.12 - Math.abs(u - 0.5) * 0.06, mats.bark, 0.8);
      }
      // Subtle woodland bioluminescent shelf-fungus clusters on closed walls (replaces neon mint balls!)
      if (floorOk && side >= 0 && rnd() < 0.75) {
        const fp = atWall(c, side, 0.25 + rnd() * 0.55, 0.02, 0.45, 0.16, C);
        batch.shelfFungus(fp.x, y + 0.75 + rnd() * 1.15, fp.z, wallYaw(side), 3 + (isLarge ? 2 : 0), rnd, mats.fungusCap, mats.fungusGlow, isLarge ? 1.15 : 0.95);
      }
    } else if (look.props === 'blades' && floorOk && side >= 0) {
      // Sculpted cleaved-slate wall blades (strictly on propSide(c), <= PROP_DEPTH!)
      for (let k = 0; k < Math.min(2, n); k++) {
        const f = atWall(c, side, 0.12 + k * 0.46 + rnd() * 0.22, 0.02 + rnd() * (PROP_DEPTH - 0.26), 1.0, 0.24, C);
        const bh = 0.85 + rnd() * 1.35;
        const alongX = DIRS[side][1] !== 0;
        batch.blade(
          f.x, y + bh * 0.48, f.z,
          alongX ? 0.95 : 0.26, bh, alongX ? 0.26 : 0.95,
          44100 + c.id * 19 + k, 'schist', k % 2 ? mats.schistLight : mats.accent,
          { ry: (rnd() - 0.5) * 0.18, rz: (rnd() - 0.5) * 0.08, taperTop: 0.26, detail: 1, tile: 0.9 }
        );
        pushSolidProp({ ...f, maxY: y + bh });
      }
    } else if (look.props === 'timber' && floorOk) {
      // Full creosote mine timber set: notched posts, diagonal overhead knee braces, heavy cap beam, lagging planks!
      const we = !c.open[1] && !c.open[3], ns = !c.open[0] && !c.open[2];
      if (we) {
        const zc = z0 + C / 2;
        batch.box(0.24, roof, 0.26, mats.timber, x0 + Wl + 0.12, y + roof / 2, zc, 0, 0, 0, 1.0);
        batch.box(0.24, roof, 0.26, mats.timber, x0 + C - Wl - 0.12, y + roof / 2, zc, 0, 0, 0, 1.0);
        batch.box(C - 2 * Wl, 0.28, 0.28, mats.timberDark, x0 + C / 2, y + roof - 0.15, zc, 0, 0, 0, 1.0);
        // Overhead diagonal knee braces + iron gusset brackets
        batch.beam([x0 + Wl + 0.16, y + roof - 1.15, zc], [x0 + Wl + 1.05, y + roof - 0.22, zc], 0.14, 0.16, mats.timberDark);
        batch.beam([x0 + C - Wl - 0.16, y + roof - 1.15, zc], [x0 + C - Wl - 1.05, y + roof - 0.22, zc], 0.14, 0.16, mats.timberDark);
        batch.box(0.30, 0.10, 0.30, mats.iron, x0 + Wl + 0.14, y + roof - 0.34, zc);
        batch.box(0.30, 0.10, 0.30, mats.iron, x0 + C - Wl - 0.14, y + roof - 0.34, zc);
        // Overhead ceiling lagging boards running longitudinally
        for (const ox of [-1.4, 0, 1.4]) batch.box(0.24, 0.08, 2.4, mats.timber, x0 + C / 2 + ox, y + roof - 0.04, zc, 0, 0, 0, 1.0);
        pushSolidProp({ minX: x0 + Wl, maxX: x0 + Wl + 0.25, minZ: zc - 0.15, maxZ: zc + 0.15, maxY: y + roof });
        pushSolidProp({ minX: x0 + C - Wl - 0.25, maxX: x0 + C - Wl, minZ: zc - 0.15, maxZ: zc + 0.15, maxY: y + roof });
        timberLamps.push({ x: x0 + Wl + 0.44, y: y + roof - 0.85, z: zc, yaw: Math.PI / 2 });
      } else if (ns) {
        const xc = x0 + C / 2;
        batch.box(0.26, roof, 0.24, mats.timber, xc, y + roof / 2, z0 + Wl + 0.12, 0, 0, 0, 1.0);
        batch.box(0.26, roof, 0.24, mats.timber, xc, y + roof / 2, z0 + C - Wl - 0.12, 0, 0, 0, 1.0);
        batch.box(0.28, 0.28, C - 2 * Wl, mats.timberDark, xc, y + roof - 0.15, z0 + C / 2, 0, 0, 0, 1.0);
        batch.beam([xc, y + roof - 1.15, z0 + Wl + 0.16], [xc, y + roof - 0.22, z0 + Wl + 1.05], 0.16, 0.14, mats.timberDark);
        batch.beam([xc, y + roof - 1.15, z0 + C - Wl - 0.16], [xc, y + roof - 0.22, z0 + C - Wl - 1.05], 0.16, 0.14, mats.timberDark);
        batch.box(0.30, 0.10, 0.30, mats.iron, xc, y + roof - 0.34, z0 + Wl + 0.14);
        batch.box(0.30, 0.10, 0.30, mats.iron, xc, y + roof - 0.34, z0 + C - Wl - 0.14);
        for (const oz of [-1.4, 0, 1.4]) batch.box(2.4, 0.08, 0.24, mats.timber, xc, y + roof - 0.04, z0 + C / 2 + oz, 0, 0, 0, 1.0);
        pushSolidProp({ minX: xc - 0.15, maxX: xc + 0.15, minZ: z0 + Wl, maxZ: z0 + Wl + 0.25, maxY: y + roof });
        pushSolidProp({ minX: xc - 0.15, maxX: xc + 0.15, minZ: z0 + C - Wl - 0.25, maxZ: z0 + C - Wl, maxY: y + roof });
        timberLamps.push({ x: xc, y: y + roof - 0.85, z: z0 + Wl + 0.44, yaw: 0 });
      }
    } else if (look.props === 'slabs' && floorOk && side >= 0) {
      // Dressed stepped barrow tomb slabs along propSide(c)
      for (let k = 0; k < Math.min(2, n); k++) {
        const f = atWall(c, side, 0.14 + k * 0.48 + rnd() * 0.18, 0.02, 1.05, PROP_DEPTH - 0.04, C);
        const sh = 0.44 + rnd() * 0.28;
        batch.box(f.maxX - f.minX, sh, f.maxZ - f.minZ, mats.barrowStone, f.x, y + sh * 0.5, f.z, 0, 0, 0, 0.85);
        batch.box((f.maxX - f.minX) + 0.06, 0.08, (f.maxZ - f.minZ) + 0.04, mats.stoneTrim, f.x, y + sh + 0.04, f.z, 0, 0, 0, 0.85);
        batch.box(0.06, sh + 0.10, (f.maxZ - f.minZ) + 0.06, mats.ironRust, f.x, y + (sh + 0.10) * 0.5, f.z);
        pushSolidProp({ ...f, maxY: y + sh + 0.08 });
      }
    } else if (look.props === 'pools' && floorOk) {
      // Wet warren: hexagonal basalt wall columns tucked into closed corners + unified water quad list!
      waterQuads.push({ x0, z0, y: y + 0.44 });
      if (side >= 0 && rnd() < 0.65) {
        const f = atWall(c, side, 0.2 + rnd() * 0.6, 0.02, 0.42, 0.36, C);
        batch.cyl(0.18, 0.22, roof * 0.92, 6, mats.wetBasalt, f.x, y + roof * 0.46, f.z);
      }
    }
  }

  batch.flush(group);

  // Build ONE unified seamless water surface mesh for Wet warren (zero double-plane Z-fighting!)
  let waterMesh = null;
  if (waterQuads.length) {
    const pos = [], nrm = [], uv = [];
    for (const q of waterQuads) {
      const x0 = q.x0, x1 = q.x0 + C, z0 = q.z0, z1 = q.z0 + C, wy = q.y;
      const u0 = x0 / 4.2, u1 = x1 / 4.2, v0 = z0 / 4.2, v1 = z1 / 4.2;
      pos.push(x0, wy, z0, x0, wy, z1, x1, wy, z1, x0, wy, z0, x1, wy, z1, x1, wy, z0);
      for (let i = 0; i < 6; i++) nrm.push(0, 1, 0);
      uv.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    wg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    wg.computeBoundingBox();
    wg.computeBoundingSphere();
    waterMesh = new THREE.Mesh(wg, mats.water);
    waterMesh.name = 'wet-water-surface';
    group.add(waterMesh);
  }
  return waterMesh;
}

// --- AG-416: Deterministic placement of 3-4 per-warren tactical interactive props ---
function placeInteractives(group, plan, theme, look, mats, C, origin) {
  const kind = look.interactive;
  if (!kind) return [];
  const rnd = mulberry32(hashStr('hollows-interactives:' + theme));
  const chambers = plan.chambers.map((id) => plan.cells[id]);
  const deepCells = plan.deep.map((id) => plan.cells[id]);
  const tunnels = plan.cells.filter((c) => c.kind === 'tunnel' && c.depth >= 1 && closedSides(c).length >= 1);

  // Pick candidate cells: Chambers 0/1/2 + Deep + a mid-Narrows tunnel
  const picks = [];
  if (kind === 'pitch-brazier') {
    for (const c of chambers) picks.push({ c, along: 0.46 });
    if (deepCells[0]) picks.push({ c: deepCells[0], along: 0.42 });
    if (deepCells[2]) picks.push({ c: deepCells[2], along: 0.58 });
  } else {
    if (chambers[1]) picks.push({ c: chambers[1], along: 0.44 });
    if (chambers[2]) picks.push({ c: chambers[2], along: 0.46 });
    const midTunnel = tunnels.find((c) => c.depth === 2) || tunnels[Math.floor(tunnels.length / 2)];
    if (midTunnel) picks.push({ c: midTunnel, along: 0.50 });
    const deepPick = deepCells.find((c) => closedSides(c).length >= 1);
    if (deepPick) picks.push({ c: deepPick, along: 0.48 });
  }

  const avoid = [
    ...plan.points.crates,
    ...plan.points.tags,
    ...plan.points.nests,
    ...plan.exits.boltHoles,
    plan.points.strongbox,
    plan.doors.rune,
    plan.exits.deep,
  ].filter(Boolean);

  const out = [];
  for (const { c, along } of picks) {
    const ss = closedSides(c);
    if (!ss.length) continue;
    let chosen = null;
    // Prefer a closed side NOT used as propSide so it sits cleanly opposite finds/blades, fallback to propSide
    const ordered = [...ss.filter((s) => s !== propSide(c)), ...ss.filter((s) => s === propSide(c))];
    for (const s of ordered) {
      const fp = atWall(c, s, along, 0.06, 0.68, 0.44, C);
      const y = cellTop(c);
      const clear = avoid.every((p) => Math.hypot(p.x - fp.x, p.z - fp.z) > 1.65)
        && out.every((o) => Math.hypot((o.x - origin.x) - fp.x, (o.z - origin.z) - fp.z) > 2.4);
      if (clear) {
        chosen = { x: fp.x, y, z: fp.z, yaw: wallYaw(s) };
        break;
      }
    }
    if (!chosen) continue;
    const id = out.length;
    const spec = { id, kind, ...chosen, radius: 0.72 };
    const mesh = buildInteractiveProp(THREE, mats, spec);
    group.add(mesh);
    out.push({
      id, kind,
      x: chosen.x + origin.x,
      y: chosen.y + origin.y,
      z: chosen.z + origin.z,
      yaw: chosen.yaw,
      radius: 0.72,
      mesh,
      used: false,
      phase: rnd() * Math.PI * 2,
    });
  }
  return out;
}

export function buildWarren(theme, opts = {}) {
  const plan = layoutWarren(theme);
  const look = WARREN_LOOKS[theme];
  const origin = opts.origin || HOLLOW.ORIGIN;
  const C = HOLLOW.CELL;
  const floorY = (d) => -(d - 1) * HOLLOW.DEPTH_DROP;
  const group = new THREE.Group();
  group.name = 'warren:' + theme;
  group.position.set(origin.x, origin.y, origin.z);
  const rnd = mulberry32(hashStr('hollows-dress:' + theme));

  const pbr = getHollowPBRPack(THREE, theme);
  const cp = pbr && pbr.cavePbr;
  let waterNormal = null;
  if (theme === 'wet' && cp && cp.seepWaterNormal) {
    waterNormal = typeof cp.seepWaterNormal.clone === 'function' ? cp.seepWaterNormal.clone() : cp.seepWaterNormal;
    if (waterNormal && waterNormal.repeat) waterNormal.repeat.set(2.2, 2.2);
    if (waterNormal) waterNormal.needsUpdate = true;
  }

  const mats = {
    rock: new THREE.MeshStandardMaterial(pbr.wall.opts({ color: 0xffffff, normalScale: 1.25, aoMapIntensity: 0.85, vertexColors: true })),
    floor: new THREE.MeshStandardMaterial(pbr.floor.opts({ color: 0xffffff, normalScale: 1.20, aoMapIntensity: 0.80, vertexColors: true })),
    stoneTrim: new THREE.MeshStandardMaterial(pbr.wall.opts({ color: 0xeee9e0, normalScale: 1.15, aoMapIntensity: 0.72, vertexColors: false })),
    rampFloor: new THREE.MeshStandardMaterial(pbr.floor.opts({ color: 0xf4f0e6, normalScale: 1.18, aoMapIntensity: 0.72, vertexColors: false })),
    schistLight: new THREE.MeshStandardMaterial(pbr.wall.opts({ color: 0xd0dae6, normalScale: 1.30, aoMapIntensity: 0.70, vertexColors: false })),
    wetBasalt: new THREE.MeshStandardMaterial(pbr.wall.opts({ color: 0x9ab4b8, normalScale: 1.20, aoMapIntensity: 0.72, roughness: 0.42, vertexColors: false })),
    ore: new THREE.MeshStandardMaterial(pbr.wall.opts({ color: 0xd8906a, normalScale: 1.35, aoMapIntensity: 0.75, vertexColors: false })),
    barrowStone: new THREE.MeshStandardMaterial(cp ? cp.barrowStone.opts({ color: 0xe6e0d0, normalScale: 1.15, aoMapIntensity: 0.78 }) : { color: 0x8e8a7d, roughness: 0.90 }),
    timber: new THREE.MeshStandardMaterial(cp ? cp.creosoteTimber.opts({ color: 0xd8c8b4, normalScale: 1.15, aoMapIntensity: 0.75 }) : { color: 0x5c432b, roughness: 0.88 }),
    timberDark: new THREE.MeshStandardMaterial(cp ? cp.wetTimber.opts({ color: 0xb29e88, normalScale: 1.15, aoMapIntensity: 0.78 }) : { color: 0x423020, roughness: 0.90 }),
    bark: new THREE.MeshStandardMaterial(cp ? cp.gnarledBark.opts({ color: 0xbaa892, normalScale: 1.22, aoMapIntensity: 0.78 }) : { color: 0x5b4a36, roughness: 0.92 }),
    barkDark: new THREE.MeshStandardMaterial(cp ? cp.gnarledBark.opts({ color: 0x8a7a68, normalScale: 1.25, aoMapIntensity: 0.82 }) : { color: 0x3e3226, roughness: 0.94 }),
    iron: new THREE.MeshStandardMaterial(cp ? cp.forgedIron.opts({ color: 0xc4c8cc, normalScale: 1.1, aoMapIntensity: 0.72 }) : { color: 0x46484b, roughness: 0.56, metalness: 0.65 }),
    ironRust: new THREE.MeshStandardMaterial(cp ? cp.forgedIron.opts({ color: 0xa87860, normalScale: 1.15, aoMapIntensity: 0.78 }) : { color: 0x5c4438, roughness: 0.72, metalness: 0.45 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb8964e, roughness: 0.42, metalness: 0.78 }),
    bone: new THREE.MeshStandardMaterial(cp ? cp.weatheredBone.opts({ color: 0xe4dcc8, normalScale: 1.0, aoMapIntensity: 0.75 }) : { color: 0xcfc6ae, roughness: 0.88 }),
    canvas: new THREE.MeshStandardMaterial(cp ? cp.tarpCanvas.opts({ color: 0xb8ae90, normalScale: 0.95 }) : { color: 0x7b745d, roughness: 0.92 }),
    accent: new THREE.MeshStandardMaterial(pbr.wall.opts({ color: 0xded6c8, normalScale: 1.15, aoMapIntensity: 0.72 })),
    glow: new THREE.MeshBasicMaterial({ color: look.glow, toneMapped: false }),
    fungusCap: new THREE.MeshStandardMaterial({ color: 0x5a684e, roughness: 0.84, metalness: 0.0 }),
    fungusGlow: new THREE.MeshStandardMaterial({ color: 0x86c896, emissive: 0x3ea868, emissiveIntensity: 0.85, roughness: 0.55, metalness: 0.0 }),
    rune: new THREE.MeshStandardMaterial({ color: 0x222c30, roughness: 0.72, metalness: 0.14, emissive: 0x1e8ca6, emissiveIntensity: 0.75 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffd284, toneMapped: false }),
    lanternGlass: new THREE.MeshStandardMaterial({ color: 0xffd89c, emissive: 0xff9e3c, emissiveIntensity: 1.55, roughness: 0.25, metalness: 0.0, transparent: true, opacity: 0.86 }),
    water: new THREE.MeshStandardMaterial({
      color: 0x142c30,
      normalMap: waterNormal,
      normalScale: waterNormal ? new THREE.Vector2(0.42, 0.42) : undefined,
      roughness: 0.22,
      metalness: 0.36,
      transparent: true,
      opacity: 0.80,
    }),
    day: new THREE.MeshBasicMaterial({
      color: 0xf4f8ff,
      map: pbr.fissureDayTex || null,
      transparent: !!pbr.fissureDayTex,
      depthWrite: !pbr.fissureDayTex,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
    shaft: new THREE.MeshBasicMaterial({
      color: 0xffefd2,
      map: pbr.volShaftTex || null,
      transparent: true,
      opacity: pbr.volShaftTex ? 0.24 : 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
    shaftPool: new THREE.MeshBasicMaterial({
      color: 0xffecc8,
      map: pbr.volPoolTex || null,
      transparent: true,
      opacity: pbr.volPoolTex ? 0.28 : 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
    brazierFlame: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: pbr.flameTex || null,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
    husk: new THREE.MeshStandardMaterial(pbr.huskMembrane.opts({ color: 0xffffff, normalScale: 1.15, aoMapIntensity: 0.75 })),
    huskDark: new THREE.MeshStandardMaterial({ color: 0x887c70, roughness: 0.78 }),
    hikerBoot: new THREE.MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.85 }),
    hikerLace: new THREE.MeshStandardMaterial({ color: 0xb83828, roughness: 0.80 }),
    rangerJacket: new THREE.MeshStandardMaterial({ color: 0xc85c1e, roughness: 0.76 }),
    reflective: new THREE.MeshStandardMaterial({ color: 0xdfe3dc, roughness: 0.26, metalness: 0.65 }),
    crate: new THREE.MeshStandardMaterial(cp ? cp.pgbOliveMetal.opts({ color: 0x9aa47c, normalScale: 0.9, aoMapIntensity: 0.7 }) : { color: 0x4c5232, roughness: 0.82 }),
    crateDark: new THREE.MeshStandardMaterial({ color: 0x1e221b, roughness: 0.90 }),
    vaultBody: new THREE.MeshStandardMaterial(cp ? cp.pgbOliveMetal.opts({ color: 0x6c7566, normalScale: 1.0, aoMapIntensity: 0.75 }) : { color: 0x3b4238, roughness: 0.65, metalness: 0.35 }),
    stencil: new THREE.MeshStandardMaterial({ color: 0xffffff, map: pbr.pgbFobTex || null, roughness: 0.82 }),
    supplyStencil: new THREE.MeshStandardMaterial({ color: 0xffffff, map: pbr.pgbSupplyTex || null, roughness: 0.78 }),
    vaultStencil: new THREE.MeshStandardMaterial({ color: 0xffffff, map: pbr.pgbVaultTex || null, roughness: 0.68, metalness: 0.25 }),
    helmet: new THREE.MeshStandardMaterial(cp ? cp.pgbOliveMetal.opts({ color: 0x7c8668, normalScale: 0.85 }) : { color: 0x3f4430, roughness: 0.7, metalness: 0.15 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x367aa6, roughness: 0.84 }),
    glowstick: new THREE.MeshBasicMaterial({ color: 0x6dff8a, toneMapped: false }),
    chalk: new THREE.MeshStandardMaterial({ color: 0xe6e2d6, roughness: 0.95 }),
    harness: new THREE.MeshStandardMaterial({ color: 0xa6302a, roughness: 0.80 }),
    climbHelmet: new THREE.MeshStandardMaterial({ color: 0xd0ba3c, roughness: 0.56 }),
    pack: new THREE.MeshStandardMaterial({ color: 0x3a5672, roughness: 0.86 }),
    sleepBag: new THREE.MeshStandardMaterial({ color: 0x3d583a, roughness: 0.90 }),
    ammoCan: new THREE.MeshStandardMaterial(cp ? cp.pgbOliveMetal.opts({ color: 0x7a8858, normalScale: 0.85 }) : { color: 0x4c5232, roughness: 0.58, metalness: 0.4 }),
    hazardRed: new THREE.MeshStandardMaterial({ color: 0x9e3226, roughness: 0.68, metalness: 0.12 }),
    hazardYellow: new THREE.MeshStandardMaterial({ color: 0xc29e38, roughness: 0.68, metalness: 0.10 }),
    drag: new THREE.MeshBasicMaterial({ color: 0x0a0706, transparent: true, opacity: 0.46, depthWrite: false }),
  };
  if (!mats.stencil.map) mats.stencil.color.setHex(0x4c5232);
  if (!mats.supplyStencil.map) mats.supplyStencil.color.setHex(0x4d5738);
  if (!mats.vaultStencil.map) mats.vaultStencil.color.setHex(0x343b32);

  const solids = planSolids(plan);
  const groundAt = planGround(plan);
  const extraSolids = [];

  // Floors, roofs, and sculpted rock walls/lintels (baked AO vertex colors + organic relief!)
  const floors = [], roofs = [];
  for (const c of plan.cells) {
    const x0 = c.i * C, z0 = c.j * C, y = cellTop(c);
    const roof = roofOfCell(c);
    if (!cellDrop(c)) floors.push({ minX: x0, maxX: x0 + C, minY: y - 0.5, maxY: y, minZ: z0, maxZ: z0 + C });
    roofs.push({ minX: x0, maxX: x0 + C, minY: y + roof, maxY: y + roof + 0.8, minZ: z0, maxZ: z0 + C });
  }
  const lintels = [];
  {
    const byKey = new Map(plan.cells.map((c) => [c.i + ',' + c.j, c]));
    const W = HOLLOW.WALL;
    for (const c of plan.cells) for (let s = 0; s < 4; s++) {
      if (!c.open[s]) continue;
      const [di, dj] = DIRS[s], n = byKey.get((c.i + di) + ',' + (c.j + dj));
      if (!n) continue;
      const top = cellTop(c) + roofOfCell(c) + 0.8;
      const nTop = cellTop(n) + roofOfCell(n) + (cellDrop(n) > 0 && n.rampSide === OPP[s] ? 0 : 0.8);
      if (top - nTop < 0.05) continue;
      const x0 = c.i * C, z0 = c.j * C;
      const ax = di ? (di > 0 ? x0 + C - W : x0) : x0, bx = di ? (di > 0 ? x0 + C : x0 + W) : x0 + C;
      const az = dj ? (dj > 0 ? z0 + C - W : z0) : z0, bz = dj ? (dj > 0 ? z0 + C : z0 + W) : z0 + C;
      lintels.push({ minX: ax, maxX: bx, minZ: az, maxZ: bz, minY: nTop - 0.8, maxY: top });
    }
  }

  const wallGeo = buildSculptedBoxesGeometry(THREE, solids.concat(lintels), {
    subdivSize: 1.45, relief: theme === 'hill' ? 0.055 : 0.095, seed: hashStr('wall:' + theme), uvTile: 3.5, aoFloor: true,
  });
  const floorGeo = buildSculptedBoxesGeometry(THREE, floors, {
    subdivSize: 2.6, relief: 0.0, seed: hashStr('floor:' + theme), uvTile: 3.5, isFloor: true,
  });
  const roofGeo = buildSculptedBoxesGeometry(THREE, roofs, {
    subdivSize: 1.65, relief: theme === 'hill' ? 0.045 : 0.105, seed: hashStr('roof:' + theme), uvTile: 3.5, isRoof: true,
  });
  const wallMesh = new THREE.Mesh(wallGeo, mats.rock);
  wallMesh.name = 'warren-walls';
  const floorMesh = new THREE.Mesh(floorGeo, mats.floor);
  floorMesh.name = 'warren-floors';
  const roofMesh = new THREE.Mesh(roofGeo, mats.rock);
  roofMesh.name = 'warren-roofs';
  roofMesh.userData.roof = true;
  group.add(wallMesh, floorMesh, roofMesh);

  // Sloped ramp & descent slabs with PBR floor material
  for (const c of plan.cells) if (cellDrop(c) > 0) {
    const [di, dj] = DIRS[c.rampSide], drop = cellDrop(c);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(C, 0.5, Math.hypot(C, drop)), mats.rampFloor);
    slab.position.set(c.i * C + C / 2, cellTop(c) - drop / 2 - 0.25, c.j * C + C / 2);
    slab.rotation.order = 'YXZ';
    slab.rotation.y = Math.atan2(di, dj);
    slab.rotation.x = Math.atan2(drop, C);
    group.add(slab);
  }

  // Batched cave architecture & theme dressing
  const timberLamps = [];
  const waterMesh = dressArchitecture(group, plan, theme, look, mats, C, extraSolids, timberLamps, rnd);

  // Story props, husks, descent shaft, chamber finds
  const extraLights = [];
  dressDraggedDown(group, plan, theme, mats, floorY, C, extraSolids, extraLights);
  dressDescent(group, plan, mats, C);
  dressFinds(group, plan, theme, mats, C, extraSolids);

  // Monumental Rune Door
  const d = plan.doors.rune;
  const runeDoorMesh = buildRuneDoorMesh(THREE, mats, opts.doorTexture || pbr.runeDoorTex);
  runeDoorMesh.position.set(d.x, d.y, d.z);
  runeDoorMesh.rotation.y = d.yaw;
  group.add(runeDoorMesh);

  // Hero Strongbox facing Deep center
  const sb = plan.points.strongbox;
  const setPt = plan.points.set;
  const strongboxMesh = buildStrongboxMesh(THREE, mats);
  strongboxMesh.position.set(sb.x, sb.y, sb.z);
  strongboxMesh.rotation.y = Math.atan2(setPt.x - sb.x, setPt.z - sb.z);
  group.add(strongboxMesh);

  // Visible Grounded Supply Crates (in Wet warren, raised onto dry dark basalt stepping plinths above the 0.44 m waterline!)
  const byCoord = new Map(plan.cells.map((c) => [c.i + ',' + c.j, c]));
  const wetPlinthBatch = theme === 'wet' ? new SculptBatch(THREE, 'wet-loot-plinth') : null;
  const crateMeshes = plan.points.crates.map((p, idx) => {
    const m = buildSupplyCrateMesh(THREE, mats, idx);
    const cell = byCoord.get(Math.floor(p.x / C) + ',' + Math.floor(p.z / C));
    const liftY = (wetPlinthBatch && cell && cellDrop(cell) <= 0) ? 0.36 : 0;
    if (liftY > 0) {
      wetPlinthBatch.stone(p.x, p.y + 0.18, p.z, 0.72, 0.22, 0.58, 45100 + idx * 13, 'basalt', mats.wetBasalt, { detail: 1, tile: 0.65 });
    }
    m.position.set(p.x, p.y + liftY, p.z);
    m.rotation.y = cell ? openDoorYaw(cell) : 0;
    group.add(m);
    return m;
  });

  // Visible Somber Gravewalker Dog Tag Vignettes (raised onto dry basalt rock ledges in Wet warren!)
  const tagMeshes = plan.points.tags.map((p, idx) => {
    const m = buildDogTagVignetteMesh(THREE, mats, theme, p.n, rnd);
    const cell = byCoord.get(Math.floor(p.x / C) + ',' + Math.floor(p.z / C));
    const liftY = (wetPlinthBatch && cell && cellDrop(cell) <= 0) ? 0.38 : 0;
    if (liftY > 0) {
      wetPlinthBatch.stone(p.x, p.y + 0.19, p.z, 0.48, 0.22, 0.44, 45200 + idx * 17, 'basalt', mats.wetBasalt, { detail: 1, tile: 0.6 });
    }
    m.position.set(p.x, p.y + liftY, p.z);
    group.add(m);
    return m;
  });
  if (wetPlinthBatch) wetPlinthBatch.flush(group);

  // Hero Oil Lanterns (chamber/ramp hanging lanterns + iron wall-mounted mine timber lanterns!)
  const lanternMeshes = [];
  const lamps = plan.lamps.map((l, idx) => {
    const cell = byCoord.get(Math.floor(l.x / C) + ',' + Math.floor(l.z / C));
    const ceilY = cell ? (cellTop(cell) + roofOfCell(cell)) : (l.y + 1.8);
    const hangLen = Math.max(0.4, Math.min(4.8, ceilY - (l.y + 0.22)));
    const lm = buildOilLanternMesh(THREE, mats, { hangLen, wallMount: false });
    lm.position.set(l.x, l.y, l.z);
    group.add(lm);
    lanternMeshes.push(lm);
    return { x: l.x + origin.x, y: l.y + origin.y, z: l.z + origin.z, color: look.lampColor, range: 13.5, intensity: 4.8, phase: idx * 1.37 };
  });
  for (let i = 0; i < timberLamps.length; i++) {
    const tl = timberLamps[i];
    const lm = buildOilLanternMesh(THREE, mats, { wallMount: true });
    lm.position.set(tl.x, tl.y, tl.z);
    lm.rotation.y = tl.yaw || 0;
    group.add(lm);
    lanternMeshes.push(lm);
    lamps.push({ x: tl.x + origin.x, y: tl.y + origin.y, z: tl.z + origin.z, color: look.lampColor, range: 10.5, intensity: 3.6, phase: 2.1 + i * 1.13, isTimber: true });
  }
  for (const el of extraLights) {
    lamps.push({ ...el, x: el.x + origin.x, y: el.y + origin.y, z: el.z + origin.z });
  }

  // Wall-Oriented Bolt-Holes with feathered volumetric daylight beams (fixes wrong +Z yaw & opaque cones!)
  for (let i = 0; i < plan.exits.boltHoles.length; i++) {
    const b = plan.exits.boltHoles[i];
    const c = plan.cells[b.cell];
    const openS = c ? c.open.findIndex(Boolean) : 0;
    const backS = (openS + 2) % 4;
    const wallS = c && !c.open[backS] ? backS : (c && closedSides(c)[0] != null ? closedSides(c)[0] : backS);
    const [wi, wj] = DIRS[wallS];
    const bhMesh = buildBoltHoleMesh(THREE, mats, { backYaw: wallYaw(wallS), index: i });
    if (c && wallS === backS) {
      bhMesh.position.set(b.x + wi * 0.86, b.y, b.z + wj * 0.86);
    } else if (c) {
      const fp = atWall(c, wallS, 0.5, 0.0, 0.8, 0.25, C);
      bhMesh.position.set(fp.x, b.y, fp.z);
    } else {
      bhMesh.position.set(b.x, b.y, b.z);
    }
    group.add(bhMesh);
  }

  // Hero Bespoke Deep Set Piece + anatomical sleeper bone clusters
  buildHeroSetPiece(THREE, group, plan, theme, mats, floorY, C, extraSolids);

  // Per-Warren Tactical Environmental Interactives
  const interactives = placeInteractives(group, plan, theme, look, mats, C, origin);

  // Everything to world space (contract speaks world coordinates).
  const W = (p) => (p ? { ...p, x: p.x + origin.x, y: (p.y || 0) + origin.y, z: p.z + origin.z } : p);
  const allSolids = solids.concat(extraSolids);
  const open = planOpen(plan, allSolids, groundAt);
  const worldSolids = allSolids.map((s) => ({
    ...s,
    minX: s.minX + origin.x, maxX: s.maxX + origin.x,
    minY: s.minY + origin.y, maxY: s.maxY + origin.y,
    minZ: s.minZ + origin.z, maxZ: s.maxZ + origin.z,
  }));
  const nav = planNav(plan, allSolids); nav.ox = origin.x; nav.oz = origin.z;
  const pts = plan.points;

  const isWetCell = (x, z) => {
    if (theme !== 'wet') return false;
    const c = byCoord.get(Math.floor((x - origin.x) / C) + ',' + Math.floor((z - origin.z) / C));
    return !!c && cellDrop(c) <= 0 && c.kind !== 'descent';
  };

  return {
    theme, plan, group, look,
    cells: plan.cells,
    groundAt: (x, z) => { const y = groundAt(x - origin.x, z - origin.z); return y == null ? null : y + origin.y; },
    roofAt: (x, z) => { const y = open.roofAt(x - origin.x, z - origin.z); return y == null ? null : y + origin.y; },
    openAt: (x, y, z, pad) => open.openAt(x - origin.x, y - origin.y, z - origin.z, pad),
    isWetCell,
    solids: worldSolids, nav,
    entry: W(plan.entry),
    arrive: W(plan.arrive),
    descent: { cells: plan.descent.cells, top: plan.descent.top, day: W(plan.descent.day) },
    accents: plan.accents.map((a) => ({ ...W(a), color: look.glow })),
    cell: C,
    exits: { mouth: W(plan.exits.mouth), boltHoles: plan.exits.boltHoles.map(W), deep: W(plan.exits.deep) },
    points: { sleepers: pts.sleepers.map(W), nests: pts.nests.map(W), crates: pts.crates.map(W), strongbox: W(pts.strongbox), tags: pts.tags.map(W), set: W(pts.set) },
    doors: { rune: W(plan.doors.rune) },
    lamps,
    light: {
      ambient: look.ambient,
      ambientInt: look.ambientInt,
      hemiSky: look.hemiSky,
      hemiGround: look.hemiGround,
      hemiInt: look.hemiInt,
      fog: look.fog,
      fogNear: look.fogNear,
      fogFar: look.fogFar,
    },
    crateMeshes,
    tagMeshes,
    strongboxMesh,
    runeDoorMesh,
    lanternMeshes,
    interactives,
    waterMesh,
    waterNormal,
    husks: group.userData.husks || [],
    dispose() {
      const disposedMats = new Set();
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const list = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of list) {
            if (m && !disposedMats.has(m)) { disposedMats.add(m); m.dispose(); }
          }
        }
      });
      for (const m of Object.values(mats)) {
        if (m && !disposedMats.has(m)) { disposedMats.add(m); m.dispose(); }
      }
      if (waterNormal && waterNormal !== (cp && cp.seepWaterNormal) && typeof waterNormal.dispose === 'function') {
        waterNormal.dispose();
      }
      if (group.parent) group.parent.remove(group);
    },
  };
}

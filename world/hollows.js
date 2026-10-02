// world/hollows.js — the five warrens under the caves (CL-99, P-137, D-67, docs/specs/hollows.md §3). Claude's.
//
// Each warren is laid out on a grid of 6 m cells from its own fixed dice (the same every run, Jerry Q-4; never the
// run's or the world's seed, rule 10). Three depths, side by side on one plan so a point on the map has one floor:
// the Galleries (depth 1), the Narrows (2) and the Deep (3), joined by ramps, 4 m down each. Tunnels are 6 m cells
// with rock in their corners (a 3 m way through) and a low roof; chambers are open cells with a high roof; the Deep's
// chamber is 2 x 2 cells.
//
// API:
//   WARREN_THEMES                  ['root', 'shale', 'iron', 'wet', 'hill']
//   layoutWarren(theme)         -> the plan, pure data (no three.js): cells, links, points, doors, exits
//   buildWarren(theme, opts?)   -> { group, cells, groundAt, solids, nav, entry, exits, points, doors, lamps, plan, dispose }
//                                  the contract in docs/specs/hollows.md §2. opts.origin: { x, y, z } (default 0, -400, 0)
//
// Coordinates: the plan's cell (i, j) spans x in [i*6, i*6+6), z in [j*6, j*6+6) relative to the origin; he comes in
// at the mouth cell on the south edge (j = 0), facing +z. Floors: depth 1 at 0, depth 2 at -4, depth 3 at -8.
import * as THREE from 'three';
import { drawGlyph, RUNE_COUNT } from './runes.js';

export const WARREN_THEMES = Object.freeze(['root', 'shale', 'iron', 'wet', 'hill']);
export const HOLLOW = Object.freeze({
  CELL: 6, GRID: 16, DEPTH_DROP: 4,
  SIZES: [[10, 12], [8, 10], [5, 7]],      // cells a depth (the Deep counts its 2 x 2 chamber as four)
  TUNNEL_ROOF: 3.4, CHAMBER_ROOF: 6.5, WALL: 1, GAP: 3,
  NAV_CELL: 1.5,
  ORIGIN: Object.freeze({ x: 0, y: -400, z: 0 }),
  TAGS: Object.freeze({ root: 2, shale: 2, iron: 2, wet: 2, hill: 1 }),   // CL-99 v3: the nine who died (story §8a; GP-83's WARREN_TAG_COUNTS)
});

// Each theme's look (colours, the props it scatters) and its set piece (hollows.md §3).
export const WARREN_LOOKS = Object.freeze({
  root:  { rock: 0x4a3f33, floor: 0x3a2f24, accent: 0x6b5a3a, glow: 0x7cffb0, set: 'climbers-knot',  props: 'roots',  ambient: 0x0e120c, fog: 0x070a06 },
  shale: { rock: 0x3d4247, floor: 0x33373b, accent: 0x5a6068, glow: 0x9ec8ff, set: 'shale-flankers', props: 'blades', ambient: 0x0c0e12, fog: 0x06070a },
  iron:  { rock: 0x4b3a30, floor: 0x3b3029, accent: 0x6b4a2a, glow: 0xffb45a, set: 'mine-crew',      props: 'timber', ambient: 0x120e0a, fog: 0x0a0705 },
  wet:   { rock: 0x33403f, floor: 0x283432, accent: 0x3f5a58, glow: 0x7fe0e0, set: 'drowned',        props: 'pools',  ambient: 0x0a1011, fog: 0x050909 },
  hill:  { rock: 0x4a4740, floor: 0x3c3a34, accent: 0x6e6a5e, glow: 0xffd89a, set: 'barrow-king',    props: 'slabs',  ambient: 0x100f0c, fog: 0x080806 },
});

// --- dice ---------------------------------------------------------------------------------
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // n(-z) e(+x) s(+z) w(-x) in plan terms; index = side
const OPP = [2, 3, 0, 1];

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
  // A ramp out of `from` into a free cell, then the next depth's first cell beyond it.
  function rampFrom(from, depth, needBlock) {
    const sides = [0, 1, 2, 3].sort(() => rnd() - 0.5);
    for (const s of sides) {
      const [di, dj] = DIRS[s];
      const ri = from.i + di, rj = from.j + dj, ni = ri + di, nj = rj + dj;
      if (!free(ri, rj) || !free(ni, nj) || rj <= 0 || nj <= 0) continue;
      if (needBlock) {
        // The Deep's chamber: a 2 x 2 block that holds (ni, nj), every cell free and off the south edge.
        const blocks = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => [[ni - a, nj - b], [ni - a + 1, nj - b], [ni - a, nj - b + 1], [ni - a + 1, nj - b + 1]])
          .filter((blk) => blk.every(([x, y]) => free(x, y) && y > 0 && !(x === ri && y === rj)))
          .sort(() => rnd() - 0.5);
        if (!blocks.length) continue;
        const ramp = add(ri, rj, depth - 1, 'ramp', from, s);
        ramp.rampSide = s; ramp.toDepth = depth;
        const deep = blocks[0].map(([x, y]) => add(x, y, depth, 'deep'));
        for (const c of deep) for (const o of neighbours(c)) { const d = cells.get(key(o.i, o.j)); if (d && d.kind === 'deep') { c.open[o.s] = true; d.open[OPP[o.s]] = true; } }
        const first = cells.get(key(ni, nj));
        ramp.open[s] = true; first.open[OPP[s]] = true;
        return { ramp, first, deep };
      }
      const ramp = add(ri, rj, depth - 1, 'ramp', from, s);
      ramp.rampSide = s; ramp.toDepth = depth;
      const first = add(ni, nj, depth, 'tunnel', ramp, s);
      return { ramp, first };
    }
    return null;
  }

  const mid = Math.floor(G / 2);
  const mouth = add(mid, 0, 1, 'mouth');
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
  const centre = (c, ox = 0, oz = 0) => ({ x: c.i * C + C / 2 + ox, y: floorY(c.depth), z: c.j * C + C / 2 + oz });
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
  return {
    theme, cells: all, mouthCell: mouth.id,
    depths: [g1.length, g2.length + 0, deepCells.length],
    ramps: [r1.ramp.id, r2.ramp.id],
    chambers: [...ch1, ...ch2].map((c) => c.id), deep: deep.map((c) => c.id),
    entry: { ...centre(mouth, 0, -C / 2 + 1.2), yaw: 0 },
    exits: { mouth: { ...centre(mouth, 0, -C / 2 + 0.6), r: 2.2 }, boltHoles: [boltPoint(bolt1), boltPoint(bolt2), boltPoint(bolt3)], deep: passage },
    points: { sleepers, nests, crates, strongbox, tags, set: { kind: WARREN_LOOKS[theme].set, ...deepCentre } },
    doors: { rune: doorAt },
    lamps,
  };
}

// --- the plan's floor and walls ---------------------------------------------------------------
function planGround(plan) {
  const C = HOLLOW.CELL, map = new Map();
  for (const c of plan.cells) map.set(c.i + ',' + c.j, c);
  const floorY = (d) => -(d - 1) * HOLLOW.DEPTH_DROP;
  return function groundAt(x, z) {
    const i = Math.floor(x / C), j = Math.floor(z / C);
    const c = map.get(i + ',' + j);
    if (!c) return null;
    if (c.kind !== 'ramp') return floorY(c.depth);
    // The ramp runs from its own depth's floor to the next one's, along its side.
    const [di, dj] = DIRS[c.rampSide];
    const u = di ? (di > 0 ? (x - i * C) / C : 1 - (x - i * C) / C) : (dj > 0 ? (z - j * C) / C : 1 - (z - j * C) / C);
    return floorY(c.depth) - Math.max(0, Math.min(1, u)) * HOLLOW.DEPTH_DROP;
  };
}

// Wall boxes: a cell's closed sides are rock; an open side keeps its two shoulders (a 3 m gap between); a tunnel
// has a pillar in each corner, and the Deep's chamber has no walls inside it. { minX, maxX, minY, maxY, minZ, maxZ }.
function planSolids(plan) {
  const C = HOLLOW.CELL, W = HOLLOW.WALL, gap = HOLLOW.GAP, sh = (C - gap) / 2;
  const floorY = (d) => -(d - 1) * HOLLOW.DEPTH_DROP;
  const out = [];
  for (const c of plan.cells) {
    const x0 = c.i * C, z0 = c.j * C, y0 = floorY(c.depth) - (c.kind === 'ramp' ? HOLLOW.DEPTH_DROP : 0) - 0.5;
    const roof = c.kind === 'tunnel' || c.kind === 'ramp' || c.kind === 'mouth' || c.kind === 'pocket' ? HOLLOW.TUNNEL_ROOF : HOLLOW.CHAMBER_ROOF;
    const y1 = floorY(c.depth) + roof + (c.kind === 'ramp' ? 0 : 0);
    const box = (ax, bx, az, bz, kind) => out.push({ minX: x0 + ax, maxX: x0 + bx, minZ: z0 + az, maxZ: z0 + bz, minY: y0, maxY: y1, cell: c.id, kind });
    for (let s = 0; s < 4; s++) {
      const [di, dj] = DIRS[s];
      const inside = (c.kind === 'deep') && (() => { const n = plan.cells.find((d) => d.i === c.i + di && d.j === c.j + dj); return n && n.kind === 'deep'; })();
      if (inside) continue;
      const along = (a0, a1) => (di ? [di > 0 ? C - W : 0, di > 0 ? C : W, a0, a1] : [a0, a1, dj > 0 ? C - W : 0, dj > 0 ? C : W]);
      const open = c.open[s] || (c.kind === 'mouth' && s === 0);   // the mouth's way out, back up to the daylight
      if (!open) { const [ax, bx, az, bz] = along(0, C); box(ax, bx, az, bz, 'wall'); }
      else { const [a1, b1, c1, d1] = along(0, sh); box(a1, b1, c1, d1, 'shoulder'); const [a2, b2, c2, d2] = along(C - sh, C); box(a2, b2, c2, d2, 'shoulder'); }
    }
    if (c.kind === 'tunnel' || c.kind === 'pocket') {
      const p = 1.5;
      box(0, p, 0, p, 'pillar'); box(C - p, C, 0, p, 'pillar'); box(0, p, C - p, C, 'pillar'); box(C - p, C, C - p, C, 'pillar');
    }
  }
  return out;
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
function mergedBoxes(list) {
  // One geometry from many boxes (non-indexed), with box-projected UVs.
  const pos = [], nrm = [], uv = [];
  const base = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const P = base.attributes.position, Nn = base.attributes.normal;
  for (const b of list) {
    const sx = b.maxX - b.minX, sy = b.maxY - b.minY, sz = b.maxZ - b.minZ;
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2;
    for (let k = 0; k < P.count; k++) {
      const x = P.getX(k) * sx + cx, y = P.getY(k) * sy + cy, z = P.getZ(k) * sz + cz;
      pos.push(x, y, z);
      const nx = Nn.getX(k), ny = Nn.getY(k), nz = Nn.getZ(k);
      nrm.push(nx, ny, nz);
      if (Math.abs(nx) > 0.5) uv.push(z / 3, y / 3); else if (Math.abs(ny) > 0.5) uv.push(x / 3, z / 3); else uv.push(x / 3, y / 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  base.dispose();
  return g;
}

// The rune door's carving: the Pit's eight glyphs in two columns round a ring, glowing (browser only).
let doorTexCache = null;
function makeDoorTexture() {
  if (doorTexCache) return doorTexCache;
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 360;
  const ctx = cv.getContext('2d');
  ctx.strokeStyle = 'rgba(160, 245, 255, 0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(128, 180, 70, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(128, 180, 20, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < RUNE_COUNT; k++) {
    const a = (k / RUNE_COUNT) * Math.PI * 2 - Math.PI / 2;
    drawGlyph(ctx, k, 128 + Math.cos(a) * 100, 180 + Math.sin(a) * 100, 44, { width: 2.6 });
  }
  doorTexCache = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) doorTexCache.colorSpace = THREE.SRGBColorSpace;
  return doorTexCache;
}

// Each Deep's set piece, and the little that makes each warren itself.
function dressSetPiece(group, plan, theme, mats, floorY, C) {
  const set = plan.points.set, y3 = floorY(3);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); group.add(m); return m; };
  const rnd = mulberry32(hashStr('hollows-set:' + theme));
  if (theme === 'root') {
    // The climbers' knot: a mass of roots and bodies bunched under the Deep's roof.
    for (let k = 0; k < 14; k++) add(new THREE.SphereGeometry(0.5 + rnd() * 0.6, 8, 6), k % 3 ? mats.accent : mats.bone, set.x + (rnd() - 0.5) * 3, y3 + HOLLOW.CHAMBER_ROOF - 0.8 - rnd() * 0.8, set.z + (rnd() - 0.5) * 3);
    for (let k = 0; k < 10; k++) { const a = rnd() * Math.PI * 2, r = 1.5 + rnd() * 3; add(new THREE.CylinderGeometry(0.06, 0.14, 3 + rnd() * 2, 6), mats.accent, set.x + Math.cos(a) * r, y3 + HOLLOW.CHAMBER_ROOF - 1.8, set.z + Math.sin(a) * r, (rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.5); }
  } else if (theme === 'shale') {
    // The clefts the flankers come out of: tall fins of slate either side.
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.3, 4 + rnd() * 1.5, 2.2), mats.accent, set.x + s * (3.6 + k * 0.5), y3 + 2.2, set.z + (k - 1) * 2.6, 0, (rnd() - 0.5) * 0.4, s * 0.08);
  } else if (theme === 'iron') {
    // The mine crew's cart on its rails, the winch, and timbering.
    for (const s of [-0.45, 0.45]) add(new THREE.BoxGeometry(0.08, 0.08, C * 1.8), mats.iron, set.x + s, y3 + 0.04, set.z);
    for (let k = -4; k <= 4; k++) add(new THREE.BoxGeometry(1.3, 0.08, 0.2), mats.accent, set.x, y3 + 0.02, set.z + k * 1.2);
    add(new THREE.BoxGeometry(1.1, 0.7, 1.6), mats.iron, set.x, y3 + 0.65, set.z + 1.5, 0.05, 0, 0.12);
    add(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 12), mats.accent, set.x + 3.5, y3 + 0.9, set.z - 3, 0, 0, Math.PI / 2);
  } else if (theme === 'wet') {
    // The drowned's pool: black water filling the middle of the Deep, with bones at its edge.
    add(new THREE.CylinderGeometry(3.6, 3.6, 0.06, 28), mats.water, set.x, y3 + 0.5, set.z);
    for (let k = 0; k < 8; k++) { const a = rnd() * Math.PI * 2; add(new THREE.BoxGeometry(0.07, 0.07, 0.5), mats.bone, set.x + Math.cos(a) * 3.9, y3 + 0.05, set.z + Math.sin(a) * 3.9, 0, rnd() * 3, 0); }
  } else if (theme === 'hill') {
    // The barrow king's bier, and his court's tombs in the walls.
    add(new THREE.BoxGeometry(2.6, 0.9, 1.4), mats.accent, set.x, y3 + 0.45, set.z);
    add(new THREE.BoxGeometry(2.9, 0.15, 1.7), mats.rock, set.x, y3 + 0.95, set.z);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(new THREE.BoxGeometry(1.8, 0.5, 0.8), mats.accent, set.x + Math.cos(a) * 4.4, y3 + 0.25, set.z + Math.sin(a) * 4.4, 0, -a, 0); }
  }
  // Every warren: a ring of small stones and bones by each sleeper's alcove.
  for (const p of plan.points.sleepers) if (rnd() < 0.5) add(new THREE.BoxGeometry(0.06, 0.06, 0.45), mats.bone, p.x + (rnd() - 0.5), p.y + 0.04, p.z + (rnd() - 0.5), 0, rnd() * 3, 0);
}

// --- CL-99 v3: what the dead dragged down, and the husks (docs/story.md §8) -------------------------------------------
let stencilTexCache = null, veinTexCache = null;
function makeStencilTexture() {
  if (stencilTexCache) return stencilTexCache;
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#4c5232'; c.fillRect(0, 0, 256, 128);
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3; c.strokeRect(6, 6, 244, 116);
  c.fillStyle = '#d9d4bf'; c.font = 'bold 44px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('PGB', 128, 50);
  c.font = 'bold 18px monospace'; c.fillText('FOB THRESHOLD', 128, 92);
  stencilTexCache = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) stencilTexCache.colorSpace = THREE.SRGBColorSpace;
  return stencilTexCache;
}
function makeVeinTexture() {
  if (veinTexCache) return veinTexCache;
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
  const c = cv.getContext('2d'), rnd = mulberry32(hashStr('husk-veins'));
  c.fillStyle = '#d6cdb8'; c.fillRect(0, 0, 128, 256);
  for (let k = 0; k < 18; k++) {
    let x = rnd() * 128, y = 0;
    c.strokeStyle = k % 3 ? 'rgba(122, 52, 66, 0.55)' : 'rgba(80, 96, 120, 0.5)'; c.lineWidth = 1 + rnd() * 2.5;
    c.beginPath(); c.moveTo(x, y);
    while (y < 256) { x += (rnd() - 0.5) * 18; y += 8 + rnd() * 14; c.lineTo(x, y); if (rnd() < 0.15) { c.moveTo(x, y); } }
    c.stroke();
  }
  veinTexCache = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) veinTexCache.colorSpace = THREE.SRGBColorSpace;
  if (THREE.RepeatWrapping) veinTexCache.wrapS = veinTexCache.wrapT = THREE.RepeatWrapping;
  return veinTexCache;
}
// A husk: a pale veined sack hung from the roof by a twist of root, half turned, something showing through it.
// what: 'boot' (a hiker's), 'jacket' (a ranger's, the search-and-rescue orange), 'many' (two or three grown together).
function buildHusk(mats, what, rnd) {
  const g = new THREE.Group(); g.name = 'husk';
  const many = what === 'many';
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mats.husk);
  body.scale.set(many ? 1.6 : 1, 2.3, many ? 1.15 : 0.9); body.position.y = -1.1; g.add(body);
  if (many) for (const s of [-1, 1]) { const lump = new THREE.Mesh(new THREE.SphereGeometry(0.34, 9, 7), mats.husk); lump.scale.set(1, 1.8, 0.9); lump.position.set(s * 0.5, -0.9 - rnd() * 0.3, 0.12); g.add(lump); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.9, 6), mats.accent); neck.position.y = -0.1; g.add(neck);
  if (what === 'boot') {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.28), mats.hikerBoot); boot.position.set(0.12, -2.08, 0.1); boot.rotation.x = 0.3; g.add(boot);
    const lace = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.12), mats.hikerLace); lace.position.set(0.12, -2.0, 0.16); lace.rotation.x = 0.3; g.add(lace);
  } else if (what === 'jacket') {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.05), mats.rangerJacket); patch.position.set(0.05, -1.05, 0.37); patch.rotation.set(-0.08, 0.2, 0.1); g.add(patch);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.055), mats.reflective); stripe.position.set(0.05, -1.12, 0.39); stripe.rotation.set(-0.08, 0.2, 0.1); g.add(stripe);
  } else {
    // A hand pressed out through the skin, and another, not the same person's.
    for (const [x, y] of [[0.55, -0.8], [-0.62, -1.3]]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.06), mats.huskDark); h.position.set(x, y, 0.3); h.rotation.z = x > 0 ? -0.4 : 0.5; g.add(h); }
  }
  g.rotation.y = rnd() * Math.PI * 2;
  g.rotation.z = (rnd() - 0.5) * 0.12;
  return g;
}
function dressDraggedDown(group, plan, theme, mats, floorY, C) {
  const rnd = mulberry32(hashStr('hollows-dragged:' + theme));
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); group.add(m); return m; };
  // FOB Threshold's stores in the first chamber: crates stencilled PGB, one burst open, a helmet and a field radio.
  const wc = plan.cells[plan.chambers[0]];
  { const x = wc.i * C + C / 2, z = wc.j * C + C / 2, y = floorY(wc.depth);
    const kit = new THREE.Group(); kit.name = 'fob-crates'; group.add(kit);
    const crate = (cx, cz, cy, ry, lid) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), [mats.stencil, mats.stencil, mats.crate, mats.crate, mats.stencil, mats.stencil]);   // stencilled on every side
      b.position.set(cx, cy + 0.3, cz); b.rotation.y = ry; kit.add(b);
      if (lid) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 0.72), mats.crate); l.position.set(cx + 0.6, cy + 0.04, cz + 0.4); l.rotation.set(0, ry + 0.7, 0.05); kit.add(l); }
    };
    crate(x + 1.0, z - 0.6, y, 0.3, false);
    crate(x + 1.1, z - 0.5, y + 0.6, 0.45, false);
    crate(x - 0.9, z + 0.9, y, -0.4, true);   // burst open, its lid thrown off
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats.helmet); helmet.position.set(x - 0.2, y + 0.02, z - 1.3); helmet.rotation.set(0.35, 0, 0.8); kit.add(helmet);
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.14), mats.helmet); radio.position.set(x + 0.3, y + 0.18, z + 1.4); radio.rotation.set(0, 0.6, 0.25); kit.add(radio);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 4), mats.iron); ant.position.set(x + 0.36, y + 0.62, z + 1.4); ant.rotation.z = 0.5; kit.add(ant);
  }
  // The husks: two or three from the roof of each chamber, three in the Deep; the hikers' boots, the rangers' jackets,
  // and deeper down more of them grown together.
  const kinds = ['boot', 'jacket', 'many'];
  const chambers = plan.chambers.map((id) => plan.cells[id]);
  const deep = plan.deep.map((id) => plan.cells[id]);
  const hang = (c, n, rooms) => {
    for (let k = 0; k < n; k++) {
      const what = c.depth >= 2 && rnd() < 0.45 ? 'many' : kinds[Math.floor(rnd() * 2)];
      const h = buildHusk(mats, what, rnd);
      const x = c.i * C + 1.4 + rnd() * (C - 2.8), z = c.j * C + 1.4 + rnd() * (C - 2.8);
      h.position.set(x, floorY(c.depth) + HOLLOW.CHAMBER_ROOF - 0.2, z);
      h.userData.what = what;
      group.add(h); rooms.push(h);
    }
  };
  const husks = [];
  for (const c of chambers) hang(c, 2 + (rnd() < 0.5 ? 1 : 0), husks);
  for (const c of deep) if (rnd() < 0.75) hang(c, 1, husks);
  group.userData.husks = husks;
  // The iron warren is where it started: the settlers' iron wall across the first ramp's head, cut open with bolt
  // cutters, the bars bent aside; the hikers' climbing rope down the ramp, a coil at its foot, their lights dropped.
  if (theme === 'iron') {
    const r = plan.cells[plan.ramps[0]], [di, dj] = DIRS[r.rampSide], y = floorY(r.depth);
    const cx = r.i * C + C / 2 - di * (C / 2 - 0.4), cz = r.j * C + C / 2 - dj * (C / 2 - 0.4), across = [dj, -di];
    const wall = new THREE.Group(); wall.name = 'iron-wall-cut'; group.add(wall);
    const n = 9;
    for (let k = 0; k < n; k++) {
      const u = (k - (n - 1) / 2) * 0.32, cut = Math.abs(k - (n - 1) / 2) <= 2;   // a gap he can walk through
      const bx = cx + across[0] * u, bz = cz + across[1] * u;
      if (!cut) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, HOLLOW.TUNNEL_ROOF, 6), mats.iron); bar.position.set(bx, y + HOLLOW.TUNNEL_ROOF / 2, bz); wall.add(bar); }
      else {
        // Cut through near the roof and at the floor: a stub of each left, and the bar itself bent out and down
        // to lie along the wall, either side of the gap.
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), mats.iron); top.position.set(bx, y + HOLLOW.TUNNEL_ROOF - 0.22, bz); wall.add(top);
        const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), mats.iron); stub.position.set(bx, y + 0.11, bz); wall.add(stub);
        const side = u < 0 ? -1 : 1, lx = cx + across[0] * side * (1.25 + Math.abs(u) * 0.3) + di * 0.6, lz = cz + across[1] * side * (1.25 + Math.abs(u) * 0.3) + dj * 0.6;
        const bent = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), mats.iron);
        bent.position.set(lx, y + 0.06 + Math.abs(u) * 0.05, lz);
        bent.rotation.order = 'YXZ'; bent.rotation.y = Math.atan2(di, dj) + side * 0.25; bent.rotation.x = Math.PI / 2 - 0.08;
        wall.add(bent);
      }
    }
    // The cross rails, cut through with the bars: a length each side of the gap.
    const ry = Math.atan2(across[0], across[1]), half = (n * 0.32) / 2, gap = 2.5 * 0.32;
    for (const yy of [0.5, HOLLOW.TUNNEL_ROOF - 0.4]) for (const sd of [-1, 1]) {
      const len = half - gap, mid = sd * (gap + len / 2);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, len), mats.iron);
      rail.position.set(cx + across[0] * mid, y + yy, cz + across[1] * mid); rail.rotation.y = ry; wall.add(rail);
    }
    // The rope: pegged at the top, down the ramp, a coil at the foot.
    const rope = new THREE.Group(); rope.name = 'hikers-rope'; group.add(rope);
    const L = Math.hypot(C, HOLLOW.DEPTH_DROP);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L, 5), mats.rope);
    line.position.set(r.i * C + C / 2 + across[0] * 1.6, y - HOLLOW.DEPTH_DROP / 2 + 0.15, r.j * C + C / 2 + across[1] * 1.6);
    line.rotation.order = 'YXZ'; line.rotation.y = Math.atan2(di, dj); line.rotation.x = Math.PI / 2 + Math.atan2(HOLLOW.DEPTH_DROP, C);
    rope.add(line);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 14), mats.rope); coil.rotation.x = Math.PI / 2;
    coil.position.set(r.i * C + C / 2 + di * (C / 2 + 0.8) + across[0] * 1.6, y - HOLLOW.DEPTH_DROP + 0.05, r.j * C + C / 2 + dj * (C / 2 + 0.8) + across[1] * 1.6); rope.add(coil);
    // Their lights: a headlamp and two glow sticks on the floor of the Narrows, still faintly green.
    const lp = { x: coil.position.x + across[0] * -0.8, y: y - HOLLOW.DEPTH_DROP, z: coil.position.z + across[1] * -0.8 };
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.07), mats.helmet); lamp.position.set(lp.x, lp.y + 0.03, lp.z); lamp.name = 'hikers-headlamp'; rope.add(lamp);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 4, 12), mats.rope); strap.rotation.x = Math.PI / 2; strap.position.set(lp.x - 0.1, lp.y + 0.012, lp.z); rope.add(strap);
    for (let k = 0; k < 2; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), mats.glowstick); st.rotation.set(Math.PI / 2, 0, rnd() * 3); st.position.set(lp.x + 0.5 + k * 0.7, lp.y + 0.016, lp.z + 0.3 - k * 0.5); rope.add(st); }
  }
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
  const mats = {
    rock: new THREE.MeshStandardMaterial({ color: look.rock, roughness: 0.97, metalness: 0.02 }),
    floor: new THREE.MeshStandardMaterial({ color: look.floor, roughness: 1, metalness: 0 }),
    accent: new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.85, metalness: 0.08 }),
    glow: new THREE.MeshBasicMaterial({ color: look.glow, toneMapped: false }),
    rune: new THREE.MeshStandardMaterial({ color: 0x2b3438, roughness: 0.8, emissive: 0x2a9ab8, emissiveIntensity: 0.9 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffc97a, toneMapped: false }),
    wreck: new THREE.MeshStandardMaterial({ color: 0xc9c4b4, roughness: 0.7, metalness: 0.3 }),
    water: new THREE.MeshStandardMaterial({ color: 0x1d3a3c, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.8 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3b3a38, roughness: 0.6, metalness: 0.6 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xcfc6ae, roughness: 0.9 }),
    day: new THREE.MeshBasicMaterial({ color: 0xfff4d8, toneMapped: false }),
    shaft: new THREE.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }),
    // CL-99 v3
    husk: new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeVeinTexture(), roughness: 0.55, metalness: 0 }),
    huskDark: new THREE.MeshStandardMaterial({ color: 0x8a7e70, roughness: 0.8 }),
    hikerBoot: new THREE.MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.85 }),
    hikerLace: new THREE.MeshStandardMaterial({ color: 0xc23b2a, roughness: 0.8 }),
    rangerJacket: new THREE.MeshStandardMaterial({ color: 0xd2621f, roughness: 0.75 }),
    reflective: new THREE.MeshStandardMaterial({ color: 0xdfe3dc, roughness: 0.3, metalness: 0.4 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x4c5232, roughness: 0.85 }),
    stencil: new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeStencilTexture(), roughness: 0.85 }),
    helmet: new THREE.MeshStandardMaterial({ color: 0x3f4430, roughness: 0.7, metalness: 0.15 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x2f7fb8, roughness: 0.8 }),
    glowstick: new THREE.MeshBasicMaterial({ color: 0x6dff8a, toneMapped: false }),
  };
  if (!mats.husk.map) mats.husk.color.setHex(0xd6cdb8);
  if (!mats.stencil.map) mats.stencil.color.setHex(0x4c5232);
  const solids = planSolids(plan);
  const groundAt = planGround(plan);
  // Floors (a ramp is a tilted slab), roofs, and the walls.
  const floors = [], roofs = [];
  for (const c of plan.cells) {
    const x0 = c.i * C, z0 = c.j * C, y = floorY(c.depth);
    const roof = c.kind === 'tunnel' || c.kind === 'mouth' || c.kind === 'pocket' || c.kind === 'ramp' ? HOLLOW.TUNNEL_ROOF : HOLLOW.CHAMBER_ROOF;
    if (c.kind !== 'ramp') floors.push({ minX: x0, maxX: x0 + C, minY: y - 0.5, maxY: y, minZ: z0, maxZ: z0 + C });
    roofs.push({ minX: x0, maxX: x0 + C, minY: y + roof, maxY: y + roof + 0.8, minZ: z0, maxZ: z0 + C });
  }
  const lintels = [];
  { const byKey = new Map(plan.cells.map((c) => [c.i + ',' + c.j, c]));
    const roofOf = (c) => (c.kind === 'tunnel' || c.kind === 'mouth' || c.kind === 'pocket' || c.kind === 'ramp' ? HOLLOW.TUNNEL_ROOF : HOLLOW.CHAMBER_ROOF);
    const W = HOLLOW.WALL;
    for (const c of plan.cells) for (let s = 0; s < 4; s++) {
      if (!c.open[s]) continue;
      const [di, dj] = DIRS[s], n = byKey.get((c.i + di) + ',' + (c.j + dj));
      if (!n) continue;
      const top = floorY(c.depth) + roofOf(c) + 0.8, nTop = floorY(n.depth) + roofOf(n) + (n.kind === 'ramp' && n.rampSide === OPP[s] ? 0 : 0.8);
      if (top - nTop < 0.05) continue;
      const x0 = c.i * C, z0 = c.j * C;
      const ax = di ? (di > 0 ? x0 + C - W : x0) : x0, bx = di ? (di > 0 ? x0 + C : x0 + W) : x0 + C;
      const az = dj ? (dj > 0 ? z0 + C - W : z0) : z0, bz = dj ? (dj > 0 ? z0 + C : z0 + W) : z0 + C;
      lintels.push({ minX: ax, maxX: bx, minZ: az, maxZ: bz, minY: nTop - 0.8, maxY: top });
    }
  }
  const wallMesh = new THREE.Mesh(mergedBoxes(solids.concat(lintels)), mats.rock);
  const floorMesh = new THREE.Mesh(mergedBoxes(floors), mats.floor);
  const roofMesh = new THREE.Mesh(mergedBoxes(roofs), mats.rock);
  roofMesh.userData.roof = true;   // the review sheet lifts it off for the view from above
  group.add(wallMesh, floorMesh, roofMesh);
  for (const c of plan.cells) if (c.kind === 'ramp') {
    const [di, dj] = DIRS[c.rampSide];
    const slab = new THREE.Mesh(new THREE.BoxGeometry(C, 0.5, Math.hypot(C, HOLLOW.DEPTH_DROP)), mats.floor);
    slab.position.set(c.i * C + C / 2, floorY(c.depth) - HOLLOW.DEPTH_DROP / 2 - 0.25, c.j * C + C / 2);
    slab.rotation.y = Math.atan2(di, dj);
    slab.rotation.x = Math.atan2(HOLLOW.DEPTH_DROP, C);
    slab.rotation.order = 'YXZ';
    group.add(slab);
  }
  // Dressing: each theme's props, scattered from its own dice.
  const props = [];
  const glows = [];
  for (const c of plan.cells) {
    const x0 = c.i * C, z0 = c.j * C, y = floorY(c.depth);
    const roof = c.kind === 'chamber' || c.kind === 'deep' ? HOLLOW.CHAMBER_ROOF : HOLLOW.TUNNEL_ROOF;
    const n = c.kind === 'chamber' || c.kind === 'deep' ? 4 : 2;
    for (let k = 0; k < n; k++) {
      const px = x0 + 1.8 + rnd() * (C - 3.6), pz = z0 + 1.8 + rnd() * (C - 3.6);
      if (look.props === 'roots') { const r = 0.08 + rnd() * 0.1, l = 0.8 + rnd() * (roof - 1.4); props.push({ minX: px - r, maxX: px + r, minZ: pz - r, maxZ: pz + r, minY: y + roof - l, maxY: y + roof }); if (rnd() < 0.5) glows.push({ x: px + 0.3, y: y + 0.12, z: pz, s: 0.18 }); }
      else if (look.props === 'blades') { const t = 0.12, hgt = 0.6 + rnd() * 1.2; props.push({ minX: px - t, maxX: px + t, minZ: pz - 0.5, maxZ: pz + 0.5, minY: y, maxY: y + hgt }); }
      else if (look.props === 'timber' && k === 0) { props.push({ minX: x0 + 1.4, maxX: x0 + 1.7, minZ: z0 + C / 2 - 0.15, maxZ: z0 + C / 2 + 0.15, minY: y, maxY: y + roof }, { minX: x0 + C - 1.7, maxX: x0 + C - 1.4, minZ: z0 + C / 2 - 0.15, maxZ: z0 + C / 2 + 0.15, minY: y, maxY: y + roof }, { minX: x0 + 1.4, maxX: x0 + C - 1.4, minZ: z0 + C / 2 - 0.15, maxZ: z0 + C / 2 + 0.15, minY: y + roof - 0.3, maxY: y + roof }); }
      else if (look.props === 'slabs') { props.push({ minX: px - 0.5, maxX: px + 0.5, minZ: pz - 0.25, maxZ: pz + 0.25, minY: y, maxY: y + 0.4 + rnd() * 0.3 }); }
    }
    if (look.props === 'pools') floorsWater(c, x0, z0, y);
  }
  function floorsWater(c, x0, z0, y) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(C, C), mats.water);
    w.rotation.x = -Math.PI / 2;
    w.position.set(x0 + C / 2, y + 0.45, z0 + C / 2);   // knee-deep (the runtime slows him: hollows.md §3)
    group.add(w);
  }
  if (props.length) group.add(new THREE.Mesh(mergedBoxes(props), mats.accent));
  for (const g of glows) { const m = new THREE.Mesh(new THREE.SphereGeometry(g.s, 8, 6), mats.glow); m.position.set(g.x, g.y, g.z); m.scale.y = 0.5; group.add(m); }
  // CL-99 v3 (story §8): what the dead dragged down with the living. FOB Threshold's crates and kit in the first
  // chamber (stencilled PGB crates, one burst, a helmet, a radio), and the husks hanging from the roof of the chambers.
  dressDraggedDown(group, plan, theme, mats, floorY, C);
  // The rune door: a slab carved with the Pit's glyphs, glowing (world/runes.js draws them; see makeDoorTexture).
  const d = plan.doors.rune;
  const door = new THREE.Group(); door.name = 'rune-door';
  door.position.set(d.x, d.y, d.z); door.rotation.y = d.yaw;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.6, 0.5), mats.rune); slab.position.y = 1.8; door.add(slab);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.8), mats.rock); frame.position.y = 3.85; door.add(frame);
  for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.9, 0.8), mats.rock); post.position.set(sx * 1.5, 1.95, 0); door.add(post); }
  const doorTex = opts.doorTexture || makeDoorTexture();
  if (doorTex) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.1), new THREE.MeshBasicMaterial({ map: doorTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: 0x9eeeff }));
    face.position.set(0, 1.8, 0.26); door.add(face);
  }
  group.add(door);
  // The strongbox: an iron-bound chest on a rock.
  const sb = plan.points.strongbox;
  const box = new THREE.Group(); box.name = 'strongbox'; box.position.set(sb.x, sb.y, sb.z);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), mats.accent); chest.position.y = 0.45; box.add(chest);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.14, 0.64), mats.iron); lid.position.y = 0.77; box.add(lid);
  for (const sx of [-0.3, 0.3]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.64), mats.iron); band.position.set(sx, 0.45, 0); box.add(band); }
  const rock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.9), mats.rock); rock.position.y = 0.1; box.add(rock);
  group.add(box);
  // Lamps: an old oil lantern on a hook, its flame the only warm light (the runtime lends them effect lights).
  const lamps = plan.lamps.map((l) => {
    const g = new THREE.Group(); g.position.set(l.x, l.y, l.z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), mats.iron); g.add(body);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mats.lamp); flame.scale.y = 1.4; g.add(flame);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.02), mats.iron); hook.position.y = 0.36; g.add(hook);
    group.add(g);
    return { x: l.x + origin.x, y: l.y + origin.y, z: l.z + origin.z, color: 0xffb46a };
  });
  // The bolt-holes: a crack of daylight in the rock.
  for (const b of plan.exits.boltHoles) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 1.7), mats.day);
    m.position.set(b.x, b.y + 1.1, b.z); m.lookAt(b.x + 0.001, b.y + 1.1, b.z + 1); group.add(m);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.9, 3, 10, 1, true), mats.shaft);
    shaft.position.set(b.x, b.y + 1.5, b.z); group.add(shaft);
  }
  dressSetPiece(group, plan, theme, mats, floorY, C);

  // Everything to world space (the contract speaks the world's coordinates).
  const W = (p) => (p ? { ...p, x: p.x + origin.x, y: (p.y || 0) + origin.y, z: p.z + origin.z } : p);
  const worldSolids = solids.map((s) => ({ ...s, minX: s.minX + origin.x, maxX: s.maxX + origin.x, minY: s.minY + origin.y, maxY: s.maxY + origin.y, minZ: s.minZ + origin.z, maxZ: s.maxZ + origin.z }));
  const nav = planNav(plan, solids); nav.ox = origin.x; nav.oz = origin.z;
  const pts = plan.points;
  return {
    theme, plan, group,
    cells: plan.cells,
    groundAt: (x, z) => { const y = groundAt(x - origin.x, z - origin.z); return y == null ? null : y + origin.y; },
    solids: worldSolids, nav,
    entry: W(plan.entry),
    exits: { mouth: W(plan.exits.mouth), boltHoles: plan.exits.boltHoles.map(W), deep: W(plan.exits.deep) },
    points: { sleepers: pts.sleepers.map(W), nests: pts.nests.map(W), crates: pts.crates.map(W), strongbox: W(pts.strongbox), tags: pts.tags.map(W), set: W(pts.set) },
    doors: { rune: W(plan.doors.rune) },
    lamps,
    light: { ambient: look.ambient, fog: look.fog, fogNear: 4, fogFar: 26 },   // for the runtime: the dark below (CU-71)
    dispose() { group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); for (const m of Object.values(mats)) m.dispose(); if (group.parent) group.parent.remove(group); },
  };
}

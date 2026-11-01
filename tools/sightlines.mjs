// CU-196 (CL-287 W1): which places the HQ can see.
//
//   node tools/sightlines.mjs
// Boots the game the way the bench does and prints one JSON line.
//
// A line is blocked by the ground when the terrain rises through it, by a tree when it
// passes inside 0.8 of that tree's canopy radius between the canopy's bottom and top
// (those heights are above the ground at the trunk), or by an HQ wall cylinder.
// The pure checks take plain data so a node test can run them without the game.

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const CANOPY_FRACTION = 0.8;
const FLOOR_R = 220;
const EYE_CLEAR = 1.5;

export function hypot(x, z) {
  return Math.hypot(x, z);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// t in [0, 1] where the segment's height is inside [y0, y1], then whether that
// stretch comes inside the vertical cylinder.
export function segmentHitsCylinder(ax, ay, az, bx, by, bz, cx, cz, radius, y0, y1) {
  if (!(radius > 0) || !(y1 > y0)) return null;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  if (Math.abs(dy) < 1e-8) {
    if (ay < y0 || ay > y1) return null;
  } else {
    const ta = (y0 - ay) / dy;
    const tb = (y1 - ay) / dy;
    t0 = Math.max(0, Math.min(ta, tb));
    t1 = Math.min(1, Math.max(ta, tb));
    if (t1 < t0) return null;
  }
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const dist2 = (t) => {
    const x = ax + dx * t - cx;
    const z = az + dz * t - cz;
    return x * x + z * z;
  };
  const r2 = radius * radius;
  if (len2 < 1e-10) return dist2(t0) <= r2 ? t0 : null;
  let t = ((cx - ax) * dx + (cz - az) * dz) / len2;
  if (t < t0) t = t0;
  else if (t > t1) t = t1;
  if (dist2(t) <= r2) return t;
  if (dist2(t0) <= r2) return t0;
  if (dist2(t1) <= r2) return t1;
  return null;
}

export function groundHit(eye, target, sampleHeight, step = 2) {
  const dx = target.x - eye.x;
  const dy = target.y - eye.y;
  const dz = target.z - eye.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < EYE_CLEAR * 2) return null;
  const n = Math.max(2, Math.ceil(len / step));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const along = t * len;
    if (along < EYE_CLEAR || len - along < EYE_CLEAR) continue;
    const x = lerp(eye.x, target.x, t);
    const z = lerp(eye.z, target.z, t);
    const y = lerp(eye.y, target.y, t);
    if (sampleHeight(x, z) > y) return { t, by: 'ground' };
  }
  return null;
}

export function treeHit(eye, target, trees, sampleHeight) {
  let best = null;
  for (const tree of trees) {
    const radius = (tree.canopyRadius || 0) * CANOPY_FRACTION;
    if (!(radius > 0)) continue;
    const ground = sampleHeight(tree.x, tree.z);
    const y0 = ground + (tree.canopyBottom || 0);
    const y1 = ground + (tree.canopyTop || 0);
    const t = segmentHitsCylinder(eye.x, eye.y, eye.z, target.x, target.y, target.z, tree.x, tree.z, radius, y0, y1);
    if (t == null || t <= 0 || t >= 1) continue;
    if (!best || t < best.t) best = { t, by: 'tree' };
  }
  return best;
}

export function wallHit(eye, target, walls) {
  let best = null;
  for (const wall of walls) {
    const t = segmentHitsCylinder(
      eye.x, eye.y, eye.z, target.x, target.y, target.z,
      wall.x, wall.z, wall.radius, wall.y0, wall.y1,
    );
    if (t == null || t <= 0.02 || t >= 0.98) continue;
    if (!best || t < best.t) best = { t, by: 'wall' };
  }
  return best;
}

// The first thing the line meets. open when nothing is in the way.
export function sightLine(eye, place, world) {
  const groundY = world.sampleHeight(place.x, place.z);
  const target = { x: place.x, y: groundY + 1.5, z: place.z };
  const sample = world.sampleHeight;
  const hits = [
    groundHit(eye, target, sample),
    treeHit(eye, target, world.trees || [], sample),
    wallHit(eye, target, world.walls || []),
  ].filter(Boolean);
  hits.sort((a, b) => a.t - b.t);
  const dist = Math.hypot(target.x - eye.x, target.y - eye.y, target.z - eye.z);
  const hit = hits[0];
  return {
    id: place.id,
    x: place.x,
    z: place.z,
    dist: Math.round(dist * 10) / 10,
    open: !hit,
    by: hit ? hit.by : null,
  };
}

// The twelve places on today's map: seven sites, the tower, the graveyard, the dock, two cabins.
export function placesOf(poi, props) {
  const out = [];
  for (const id of ['tower', 'graveyard', 'dock']) {
    const v = poi && poi[id];
    if (v && v.x != null) out.push({ id, x: v.x, z: v.z });
  }
  for (const [i, c] of (poi && poi.cabins || []).entries()) {
    if (c && c.x != null) out.push({ id: 'cabin:' + i, x: c.x, z: c.z });
  }
  for (const [id, p] of Object.entries(props || {})) {
    const c = p && (p.centre || p);
    if (c && c.x != null) out.push({ id, x: c.x, z: c.z });
  }
  return out;
}

// Share of the 220 m floor whose disk is under some canopy. Overlaps count once.
// A 2 m cell matches the 4.2 % canopy Claude counted. A 4 m cell reads 4.3.
export function canopyFraction(trees, floorR = FLOOR_R, cell = 2) {
  const r2 = floorR * floorR;
  let under = 0;
  let cells = 0;
  for (let x = -floorR; x <= floorR; x += cell) {
    for (let z = -floorR; z <= floorR; z += cell) {
      if (x * x + z * z > r2) continue;
      cells += 1;
      for (const tree of trees) {
        const rad = tree.canopyRadius || 0;
        const dx = x - tree.x;
        const dz = z - tree.z;
        if (dx * dx + dz * dz <= rad * rad) { under += 1; break; }
      }
    }
  }
  return cells ? under / cells : 0;
}

export function hqWalls(solids, house) {
  if (!house) return [];
  const reach = (house.half || 8) + 3;
  const hx = house.x || 0;
  const hz = house.z || 0;
  return (solids || []).filter((s) => Math.hypot(s.x - hx, s.z - hz) <= reach && s.radius > 0 && s.y1 > s.y0);
}

export function report(world) {
  const places = world.places;
  const look = (eye) => {
    const rows = places.map((p) => sightLine(eye, p, world));
    return { eye, open: rows.filter((r) => r.open).length, places: rows.length, rows };
  };
  return {
    yard: look(world.yardEye),
    roof: look(world.roofEye),
    canopy: Math.round(canopyFraction(world.trees) * 1000) / 10,
  };
}

const READ = `(() => {
  const plain = (v) => v && v.x != null ? { x: v.x, z: v.z } : null;
  const H = TT.house;
  const house = H && H.group ? { x: H.group.position.x, z: H.group.position.z, y: H.group.position.y, half: H.half || 8 } : { x: 0, z: 0, y: 0, half: 8 };
  const ladder = TT.hqLadderAt();
  const yardX = house.x;
  const yardZ = house.z - (house.half + 1.5);
  const poi = {};
  for (const id of ['tower', 'graveyard', 'dock']) poi[id] = plain(TT.POI && TT.POI[id]);
  poi.cabins = ((TT.POI && TT.POI.cabins) || []).map(plain).filter(Boolean);
  const props = {};
  const bag = TT.getObjectiveProps && TT.getObjectiveProps();
  for (const [id, p] of Object.entries((bag && bag.props) || {})) {
    const c = p && (p.centre || p);
    if (c && c.x != null) props[id] = { centre: { x: c.x, z: c.z } };
  }
  return {
    house,
    yardEye: { x: yardX, y: TT.sampleHeight(yardX, yardZ) + 1.7, z: yardZ },
    roofEye: { x: house.x, y: ladder.roof + 1.6, z: house.z },
    poi, props,
    trees: (TT.trees || []).filter((t) => t && t.alive !== false && !t.falling).map((t) => ({
      x: t.x, z: t.z, canopyRadius: t.canopyRadius || 0, canopyBottom: t.canopyBottom || 0, canopyTop: t.canopyTop || 0,
    })),
    solids: (TT.worldSolids || []).map((s) => ({ x: s.x, z: s.z, radius: s.radius || 0, y0: s.y0, y1: s.y1 })),
  };
})()`;

function heightKey(x, z) {
  return (Math.round(x * 100) / 100).toFixed(2) + ',' + (Math.round(z * 100) / 100).toFixed(2);
}

function remember(points, seen, x, z) {
  const k = heightKey(x, z);
  if (seen.has(k)) return;
  seen.add(k);
  points.push({ x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 });
}

// The same x,z groundHit will ask for, plus each trunk and each place.
export function heightPoints(eyes, places, trees) {
  const points = [];
  const seen = new Set();
  const add = (x, z) => remember(points, seen, x, z);
  for (const tree of trees) add(tree.x, tree.z);
  for (const place of places) add(place.x, place.z);
  for (const eye of eyes) {
    for (const place of places) {
      const dx = place.x - eye.x;
      const dz = place.z - eye.z;
      const len = Math.hypot(dx, dz, (place.y ?? eye.y) - eye.y);
      const n = Math.max(2, Math.ceil(len / 2));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        add(eye.x + dx * t, eye.z + dz * t);
      }
    }
  }
  return points;
}

async function fetchHeights(page, points) {
  const raw = await page.evaluate(`((pts) => pts.map((p) => TT.sampleHeight(p.x, p.z)))(${JSON.stringify(points)})`);
  const map = new Map();
  points.forEach((p, i) => map.set(heightKey(p.x, p.z), raw[i]));
  return (x, z) => {
    const k = heightKey(x, z);
    if (map.has(k)) return map.get(k);
    let best = 0;
    let bd = Infinity;
    for (const [kk, h] of map) {
      const [sx, sz] = kk.split(',').map(Number);
      const d = (sx - x) * (sx - x) + (sz - z) * (sz - z);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  };
}

export async function readGame(page) {
  const raw = await page.evaluate(READ);
  const places = placesOf(raw.poi, raw.props);
  const eyes = [raw.yardEye, raw.roofEye];
  const sampleHeight = await fetchHeights(page, heightPoints(eyes, places.map((p) => ({ ...p, y: raw.yardEye.y })), raw.trees));
  const placed = places.map((p) => ({ ...p, y: sampleHeight(p.x, p.z) + 1.5 }));
  const sampleHeight2 = await fetchHeights(page, heightPoints(eyes, placed, raw.trees));
  return report({
    sampleHeight: sampleHeight2,
    trees: raw.trees,
    walls: hqWalls(raw.solids, raw.house),
    places,
    yardEye: raw.yardEye,
    roofEye: raw.roofEye,
  });
}

const IS_MAIN = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (IS_MAIN) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const server = await serve(root, 0);
  const browser = await launch({ headless: false, args: [] });
  let code = 0;
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(server.origin + '/index.html?debug=1', { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }
    const ready = await page.waitFor('!!window.TT && !!window.TT.sampleHeight && !!window.TT.hqLadderAt', { timeout: 180000 });
    if (!ready) throw new Error('the world never finished building');
    const line = await readGame(page);
    console.log(JSON.stringify(line));
  } catch (err) {
    console.error('sightlines: ' + (err && err.message || err));
    code = 1;
  } finally {
    try { await browser.close(); } catch { /* gone */ }
    try { await server.close(); } catch { /* gone */ }
  }
  process.exit(code);
}

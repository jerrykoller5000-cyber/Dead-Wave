// world/heart.js — the heart in the Marrow (CL-112, P-97, D-56, D-70, docs/specs/secret-quest.md §5). Claude's.
//
// One cave, big and round, under the Marrow cave. The Pit's roots come down through its roof as columns of the Marrow's
// white rock, cut with the Pit's glyphs; in the middle, the source: a hole going down toward the Pit with a shaft of
// cold light standing in it, where the dead come up. He comes in down a long tunnel from a warren's rune door. GB-92's
// fight happens here: the guardian, the dead it calls up out of the source, and in the last phase the columns
// coming down.
//
// API (the same contract as world/hollows.js buildWarren, docs/specs/hollows.md §2, plus the heart's own parts):
//   HEART                          the sizes
//   buildHeart(opts?)          ->  { group, groundAt, solids, nav, entry, exits, columns, source, points, lamps, light,
//                                    fellColumn(i) -> the solid that replaces it, dispose }
//                                  opts.origin { x, y, z } (default 0, -460, 0); opts.doc (a document for the carvings)
//   columns[i]                     { x, z, r, mesh, solid, down: false }: fellColumn(i) lays it down across the floor
//                                  (toward the source), swaps its standing solid for a lying one, and returns that
//   source                         { x, y, z, r }: the hole; groundAt is null inside r (nothing stands there)
//   points.rise                    where the dead climb out, round the source's lip
//   points.guardian                where the guardian stands guard, between the source and the way in
//   exits.back                     { x, y, z, r }: the tunnel's top, the way back up to the warren
// Coordinates: the cave's middle at the origin; the tunnel comes in from -z (south), its top TUNNEL.LEN out, DROP up.
import * as THREE from 'three';
import { drawGlyph, RUNE_COUNT } from './runes.js';

export const HEART = Object.freeze({
  R: 22,                 // m, the cave's floor
  ROOF: 15,              // m at the middle (a dome down to WALL_H at the edge)
  WALL_H: 7,
  SOURCE_R: 2.6,         // the hole in the middle
  COLUMNS: 6, COLUMN_RING: 11.5, COLUMN_R: 1.1,
  TUNNEL: Object.freeze({ LEN: 26, DROP: 5, HALF: 1.6 }),
  NAV_CELL: 1.5,
  ORIGIN: Object.freeze({ x: 0, y: -460, z: 0 }),
  RUNE: 0x9eeeff, ROCK: 0xcfc8b4, ROCK_DARK: 0x8f8a7c, FLOOR: 0xb9b29e
});

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// The plan, pure: where the floor is and how high (local coordinates).
export function heartGround(x, z) {
  const H = HEART, T = H.TUNNEL, d = Math.hypot(x, z);
  if (d < H.SOURCE_R) return null;
  if (d <= H.R) return 0;
  // The tunnel: |x| <= HALF, z from -R (its foot, at the cave's edge) to -(R + LEN) (its top, DROP higher).
  if (Math.abs(x) <= T.HALF && z <= -H.R + 0.5 && z >= -(H.R + T.LEN)) {
    const u = Math.max(0, Math.min(1, (-H.R - z) / T.LEN));
    return u * T.DROP;
  }
  return null;
}

export function heartColumns() {
  const H = HEART, out = [];
  for (let k = 0; k < H.COLUMNS; k++) {
    const a = k / H.COLUMNS * Math.PI * 2;   // 0, 60 … 300 degrees: none straight across the way in (at 270)
    out.push({ k, x: Math.cos(a) * H.COLUMN_RING, z: Math.sin(a) * H.COLUMN_RING, r: H.COLUMN_R });
  }
  return out;
}

// Wall boxes (local): a ring of slabs just outside the floor, open where the tunnel comes in; the tunnel's two walls.
function heartSolids(columns) {
  const H = HEART, T = H.TUNNEL, out = [], n = 48;
  for (let k = 0; k < n; k++) {
    const a = (k + 0.5) / n * Math.PI * 2, x = Math.cos(a) * (H.R + 0.9), z = Math.sin(a) * (H.R + 0.9);
    if (z < -H.R + 2 && Math.abs(x) < T.HALF + 0.9) continue;   // the tunnel's mouth
    const s = 1.6;
    out.push({ minX: x - s, maxX: x + s, minY: -1, maxY: H.WALL_H + 2, minZ: z - s, maxZ: z + s, kind: 'wall' });
  }
  for (const sx of [-1, 1]) out.push({ minX: sx > 0 ? T.HALF : -T.HALF - 1, maxX: sx > 0 ? T.HALF + 1 : -T.HALF, minY: -1, maxY: T.DROP + 4, minZ: -(H.R + T.LEN), maxZ: -H.R + 0.4, kind: 'wall' });
  for (const c of columns) out.push(c.solid = { minX: c.x - c.r * 0.8, maxX: c.x + c.r * 0.8, minY: 0, maxY: H.ROOF, minZ: c.z - c.r * 0.8, maxZ: c.z + c.r * 0.8, kind: 'column', column: c.k });
  return out;
}

export function heartNav(solids) {
  const H = HEART, N = HEART.NAV_CELL, span = H.R + H.TUNNEL.LEN + 2;
  const w = Math.ceil(span * 2 / N), h = w, ox = -span, oz = -span, walkable = new Uint8Array(w * h);
  for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) {
    const x = ox + (a + 0.5) * N, z = oz + (b + 0.5) * N;
    if (heartGround(x, z) == null) continue;
    let blocked = false;
    for (const s of solids) if (x > s.minX - 0.2 && x < s.maxX + 0.2 && z > s.minZ - 0.2 && z < s.maxZ + 0.2) { blocked = true; break; }
    if (!blocked) walkable[b * w + a] = 1;
  }
  return { cell: N, w, h, ox, oz, walkable };
}

function runeBandTexture(doc, seed) {
  if (!doc || !doc.createElement) return null;
  const cv = doc.createElement('canvas'); cv.width = 512; cv.height = 128;
  const c = cv.getContext('2d'); if (!c) return null;
  c.clearRect(0, 0, 512, 128);
  for (let k = 0; k < 6; k++) drawGlyph(c, (seed + k * 3) % RUNE_COUNT, 42 + k * 85, 64, 70, { color: 'rgba(170, 245, 255, 1)', width: 2.8 });
  const t = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  if (THREE.RepeatWrapping) t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function buildHeart(opts = {}) {
  const H = HEART, T = H.TUNNEL;
  const origin = opts.origin || H.ORIGIN;
  const doc = opts.doc !== undefined ? opts.doc : (typeof document !== 'undefined' ? document : null);
  const rnd = mulberry32(0x4ea27);
  const group = new THREE.Group(); group.name = 'heart';
  group.position.set(origin.x, origin.y, origin.z);
  const mats = {
    rock: new THREE.MeshStandardMaterial({ color: H.ROCK, roughness: 0.95, side: THREE.BackSide }),
    rockOut: new THREE.MeshStandardMaterial({ color: H.ROCK_DARK, roughness: 0.95 }),
    floor: new THREE.MeshStandardMaterial({ color: H.FLOOR, roughness: 1 }),
    column: new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.85 }),
    groove: new THREE.MeshBasicMaterial({ color: H.RUNE, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    shaft: new THREE.MeshBasicMaterial({ color: H.RUNE, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }),
    deep: new THREE.MeshBasicMaterial({ color: 0x030608 }),
    lip: new THREE.MeshBasicMaterial({ color: H.RUNE, toneMapped: false }),
    bone: new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.9 })
  };
  // The floor: a disc with the source's hole cut in it, and the tunnel's ramp.
  const floorGeo = new THREE.RingGeometry(H.SOURCE_R, H.R + 0.6, 64, 3);
  const floor = new THREE.Mesh(floorGeo, mats.floor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'heart-floor'; group.add(floor);
  const rampLen = Math.hypot(T.LEN, T.DROP);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(T.HALF * 2 + 0.4, 0.4, rampLen), mats.rockOut);
  ramp.position.set(0, T.DROP / 2 - 0.2, -H.R - T.LEN / 2); ramp.rotation.x = Math.atan2(T.DROP, T.LEN); group.add(ramp);
  // The walls and the dome (seen from inside).
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(H.R + 1.2, H.R + 1.6, H.WALL_H + 1, 48, 1, true), mats.rock);
  wall.position.y = (H.WALL_H + 1) / 2 - 0.5; group.add(wall);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(H.R + 1.2, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.rock);
  dome.scale.y = (H.ROOF - H.WALL_H + 0.5) / (H.R + 1.2); dome.position.y = H.WALL_H - 0.5; dome.userData.roof = true; group.add(dome);
  // The tunnel: walls and a low roof down to the cave.
  for (const sx of [-1, 1]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(1, 4.5, rampLen + 1), mats.rockOut); tw.position.set(sx * (T.HALF + 0.5), T.DROP / 2 + 1.8, -H.R - T.LEN / 2); tw.rotation.x = Math.atan2(T.DROP, T.LEN); group.add(tw); }
  const troof = new THREE.Mesh(new THREE.BoxGeometry(T.HALF * 2 + 2, 0.6, rampLen + 1), mats.rockOut); troof.position.set(0, T.DROP / 2 + 3.9, -H.R - T.LEN / 2); troof.rotation.x = Math.atan2(T.DROP, T.LEN); troof.userData.roof = true; group.add(troof);
  // The source: the hole's dark throat, a lit lip, a shaft of cold light standing up out of it.
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(H.SOURCE_R, H.SOURCE_R * 0.7, 30, 32, 1, true), mats.deep); throat.material.side = THREE.BackSide; throat.position.y = -15; group.add(throat);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(H.SOURCE_R + 0.05, 0.06, 6, 48), mats.lip); lip.rotation.x = Math.PI / 2; lip.position.y = 0.04; lip.name = 'source-lip'; group.add(lip);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(H.SOURCE_R * 0.75, H.SOURCE_R * 0.95, H.ROOF + 30, 32, 1, true), mats.shaft); shaft.position.y = (H.ROOF - 30) / 2; shaft.name = 'source-shaft'; group.add(shaft);
  // Stones round the lip, eight, each with its glyph lit (the Pit's ring, down here where it began).
  for (let k = 0; k < RUNE_COUNT; k++) {
    const a = k / RUNE_COUNT * Math.PI * 2, x = Math.cos(a) * (H.SOURCE_R + 1.1), z = Math.sin(a) * (H.SOURCE_R + 1.1);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1 + rnd() * 0.4, 0.35), mats.rockOut); st.position.set(x, 0.55, z); st.rotation.y = -a + Math.PI / 2; st.castShadow = true; group.add(st);
  }
  // The columns: the Pit's roots come through the roof as white rock, banded with lit glyphs.
  const cols = heartColumns();
  const solids = heartSolids(cols);
  for (const c of cols) {
    const g = new THREE.Group(); g.name = 'heart-column'; g.position.set(c.x, 0, c.z);
    const shaftM = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.8, c.r * 1.15, H.ROOF + 1, 10), mats.column); shaftM.position.y = (H.ROOF + 1) / 2; shaftM.castShadow = true; g.add(shaftM);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 1.2, c.r * 1.7, 1.0, 10), mats.column); foot.position.y = 0.5; g.add(foot);
    const tex = runeBandTexture(doc, c.k);
    for (const y of [2.2, 5.2]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 1.02, c.r * 1.06, 0.9, 16, 1, true), tex ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: H.RUNE }) : mats.groove);
      band.position.y = y; if (!tex) band.scale.set(1, 0.08, 1); g.add(band);
    }
    group.add(g);
    c.mesh = g; c.down = false;
  }
  // The floor's bones: what came down here before him.
  for (let k = 0; k < 40; k++) {
    const a = rnd() * Math.PI * 2, r = H.SOURCE_R + 2 + rnd() * (H.R - H.SOURCE_R - 4);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3 + rnd() * 0.3), mats.bone); b.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r); b.rotation.y = rnd() * 3; group.add(b);
  }
  const groundAt = (x, z) => { const y = heartGround(x - origin.x, z - origin.z); return y == null ? null : y + origin.y; };
  const W = (p) => ({ ...p, x: p.x + origin.x, y: (p.y || 0) + origin.y, z: p.z + origin.z });
  const WS = (s) => ({ ...s, minX: s.minX + origin.x, maxX: s.maxX + origin.x, minY: s.minY + origin.y, maxY: s.maxY + origin.y, minZ: s.minZ + origin.z, maxZ: s.maxZ + origin.z });
  const worldSolids = solids.map(WS);
  const nav = heartNav(solids); nav.ox += origin.x; nav.oz += origin.z;
  const rise = [];
  for (let k = 0; k < 12; k++) { const a = (k + 0.5) / 12 * Math.PI * 2; rise.push(W({ x: Math.cos(a) * (H.SOURCE_R + 1.7), y: 0, z: Math.sin(a) * (H.SOURCE_R + 1.7) })); }
  const columns = cols.map((c) => ({ k: c.k, x: c.x + origin.x, z: c.z + origin.z, r: c.r, mesh: c.mesh, solid: worldSolids.find((s) => s.column === c.k), down: false }));
  // A column comes down: it tips over toward the source and lies across the floor; its solid lies with it.
  function fellColumn(i) {
    const c = columns[i];
    if (!c || c.down) return null;
    c.down = true;
    const lx = c.x - origin.x, lz = c.z - origin.z, d = Math.hypot(lx, lz) || 1, dx = -lx / d, dz = -lz / d;
    c.mesh.rotation.set(0, 0, 0);
    c.mesh.rotation.order = 'YXZ'; c.mesh.rotation.y = Math.atan2(dx, dz); c.mesh.rotation.x = Math.PI / 2 - 0.06;
    c.mesh.position.y = c.r * 0.9;
    const len = Math.min(H.COLUMN_RING - H.SOURCE_R - 0.5, 8), ex = c.x + dx * len, ez = c.z + dz * len;
    c.mesh.scale.y = (len + c.r) / (H.ROOF + 1);   // it breaks as it falls: what lies on the floor stops short of the source
    const idx = worldSolids.indexOf(c.solid);
    const lying = { minX: Math.min(c.x, ex) - c.r, maxX: Math.max(c.x, ex) + c.r, minY: origin.y, maxY: origin.y + c.r * 1.8, minZ: Math.min(c.z, ez) - c.r, maxZ: Math.max(c.z, ez) + c.r, kind: 'column-down', column: c.k };
    if (idx >= 0) worldSolids[idx] = lying; else worldSolids.push(lying);
    c.solid = lying;
    return lying;
  }
  return {
    group, groundAt, solids: worldSolids, nav,
    entry: W({ x: 0, y: T.DROP - 0.3, z: -(H.R + T.LEN - 1.5), yaw: 0 }),
    exits: { back: W({ x: 0, y: T.DROP, z: -(H.R + T.LEN - 0.4), r: 2 }) },
    columns, fellColumn,
    source: W({ x: 0, y: 0, z: 0, r: H.SOURCE_R }),
    points: { rise, guardian: W({ x: 0, y: 0, z: -(H.SOURCE_R + 5) }) },
    lamps: [W({ x: 0, y: 3, z: 0, color: H.RUNE })],
    light: { ambient: 0x0c1418, fog: 0x050a0d, fogNear: 8, fogFar: 46 },
    dispose() { group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); for (const m of Object.values(mats)) m.dispose(); if (group.parent) group.parent.remove(group); }
  };
}

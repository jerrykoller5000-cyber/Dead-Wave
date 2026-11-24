// CL-115 (Jerry, 2026-10-02): the Training Ground. A white-tiled firing range with a yellow firing line and five
// pop-up targets that drop when shot and stand back up, the HQ's terminals on its left wall (the CIF, the supply
// terminal and the Armory: copies of the HQ's own, so they change when those do), and through a doorway on the right
// the build room: the HQ panel (it calls zombies in), the skull window, and an infirmary bed in the corner where he
// wakes up if he dies here. Zombies stay in the build room.
//
// CL-143 (Jerry, 2026-10-10: "We are going to start with build mode now for training grounds. I would not permit the
// player to build within 5 tiles of the zombie gate. (Put a yellow hazard stripe paint on those tiles as a visual cue
// for players) ... I would probably raise the height of the build room to accommodate using the mortar"): the build
// room is a 24 m hangar now (steel columns, roof trusses, high-bay lamps), tall enough for the mortar's highest shot
// (~20 m), and it has a build area: the game's own 2 m lattice inside its walls, less five squares round the zombie
// gate (painted in hazard stripes), the doorway's apron, the terminals' and the infirmary's floor.
//
// Everything sits far outside the map (no tree, rock or water reaches it) in its own dark box, so the world never
// shows and nothing of it gets in the way. This module only builds the place and keeps the targets; the game wires
// it in (index.html, CL-115).
//
//   buildTrainingGround(THREE, opts?) -> {
//     group, origin, floorY,
//     walk: [rect], zombieRect: rect, zombieRoom: rect, solids: [box],   world coordinates; rect = { minX, maxX, minZ, maxZ }
//     stations: { cif, kiosk, armory, hqPanel, skullWindow, lightSwitch }     each { x, y, z, yaw, front: { x, z } } (world)
//     throat, bed: { x, y, z, yaw, stand: { x, z, yaw } }, gate: { x, z }, spawn: { x, z, yaw },
//     targets: [{ lane, range, state, hits, box, pivot }], hitTarget(i), resetTargets(), update(dt), dispose(),
//     scoreHit(i, point?) -> { zone, points, mult, total, lane, range } | null, onPlate(i, point), plateUV(i, point)   CL-144
//     setLights(on) -> on, lightsOn()                            the wall switch (CU-94): the strips, the lever, its lamp
//     releaseGate: { setState({ amount, lit }), leaves, lamp, passage: { x, wallZ, spawnZ, halfWidth, height } }
//     build: { grid, offset, minGX, maxGX, minGZ, maxGZ, refusal(gx, gz) -> null | 'outside' | 'gate' | 'door' | 'terminal' |
//              'infirmary' | 'column', gateCells: [[gx, gz]] }                CL-143: where he may build (world lattice indices)
//   }
//   opts.grid: the game's build lattice (2 m); opts.gridOffset offsets cell centres (Training uses 1 m to meet walls).
//   clampToRects(rects, x, z) -> { x, z, moved }   keeps a point inside the union of rects (nearest edge if outside)
//   segmentBox(a, b, box) -> t in [0, 1] or null   where the segment a->b first enters the box
//   propSolids(THREE, root, floorY, opts?) -> [box]   CL-158: the still meshes' boxes, for the solids (the HQ copies too)

import { partitionTrainingShell } from './training-cutaway.js';
import { buildFiringLine, FIRING_LINE } from './training-firing-line.js';
import { isTrainingBorderCell, trainingBorderPaintRect } from '../game/training-perimeter.js';
import { dressTrainingProps } from './training-props.js';   // GP-168
import { bakeStatic } from './bake.js';   // CL-117
import { markLineMesh, markLineRoot } from './training-exact.js';   // CH-1: propSolids names the line queries' surfaces
import { dressTrainingWear } from './training-wear.js';   // GB-159
import { dressBuildWear } from './training-build-wear.js';   // GB-162
import { buildKitProp } from './training-kitprops.js';   // CH-3 #18: the light switch
import { createTrainingDestructibles } from './training-destructibles.js';   // AH-12: physical prop destruction
import { dressEmergency } from './training-emergency.js';   // CJ-5 (CH-3 #20): EXIT signs + battery emergency lamps for the dark
import { getTrainingPBR, applyWorldUVByMaterial, heightToNormalRGBA, makeDataTexture } from './training-textures.js';   // AG-405: shared PBR textures

export const TRAINING = Object.freeze({
  ORIGIN: Object.freeze({ x: 0, y: -200, z: -640 }),   // past the map's edge (the land ends at 220 m)
  WALL_H: 6,
  HANGAR_H: 24,        // CL-143: the build room's walls (the mortar's highest shell climbs ~20 m)
  GATE_CLEAR: 5,       // CL-143: no building within this many lattice squares of the zombie gate
  RANGE: Object.freeze({ minX: -8, maxX: 8, minZ: -12, maxZ: 30 }),        // the firing range
  // Facing downrange (+z) his left is +x: the terminals are on the range's +x wall, the build room is on his right (-x).
  BUILD: Object.freeze({ minX: -44, maxX: -8, minZ: -12, maxZ: 28 }),       // the build room
  DOOR: Object.freeze({ x: -8, minZ: -9.5, maxZ: -6.5 }),                  // between them
  LINE_Z: 0,                                                             // the yellow firing line
  LANES: Object.freeze([6, 3, 0, -3, -6]),                               // lane 1 on his left
  RANGES: Object.freeze([8, 12, 16, 20, 25]),                            // metres past the line, lane 1 nearest
  DOWN_S: 2.6,                                                           // how long a shot target stays down
  FALL_S: 0.16, RISE_S: 0.45,
  FAR: 150,                                                              // the camera's reach while here
  // CL-144 (Jerry, 2026-10-10: "make the training targets twice their current size and a scoring system based on
  // hits"): the plates are twice the size (1.28 x 2.24 m, on a doubled stand), and a hit scores by where it lands
  // (the drawn rings: head ring, chest bullseye, chest ring, the rest of the silhouette) times the lane's distance.
  TARGET_SCALE: 2,
  SCORE: Object.freeze({ head: 10, bull: 10, ring: 5, plate: 2 }),
  LANE_MULT: Object.freeze([1, 1.5, 2, 2.5, 3])                           // lane 1 (8 m) to lane 5 (25 m)
});

// CL-144: the silhouette and its rings, in the plate's canvas units (256 x 448, its top at 0): what is drawn and what
// is scored are one description. u runs across the plate, v down it.
export const PLATE_ART = Object.freeze({ W: 256, H: 448, head: { u: 128, v: 70, r: 52, ring: 20 }, neck: { minU: 108, maxU: 148, top: 110, bottom: 162 }, chest: { u: 128, v: 260, bull: 26, ring: 54 },
  body: { top: 170, shoulder: 120, bottom: 442, inTop: 52, inBottom: 42 } });
// On the silhouette (not the cut-away corners of the plate) at (u, v)?
export function onSilhouette(u, v) {
  const A = PLATE_ART, hd = A.head, b = A.body;
  if (Math.hypot(u - hd.u, v - hd.v) <= hd.r) return true;
  if (u >= A.neck.minU && u <= A.neck.maxU && v >= A.neck.top && v <= A.neck.bottom) return true;
  if (v > b.bottom || v < b.shoulder) return false;
  const du = Math.abs(u - A.W / 2);
  if (v < b.top) {   // the shoulders: a quadratic from (52,170) through (128,120) to (204,170): x is linear in t there
    const t = (u - b.inTop) / (A.W - 2 * b.inTop);
    if (t < 0 || t > 1) return false;
    return v >= b.top - 2 * (b.top - b.shoulder) * t * (1 - t);
  }
  const edge = b.inTop + (b.inBottom - b.inTop) * (v - b.top) / (b.bottom - b.top);   // the sides widen a little to the foot
  return du <= A.W / 2 - edge;
}
// What a hit at (u, v) scores, before the lane's multiplier: { zone, points } (null off the silhouette).
export function scoreZone(u, v) {
  if (!onSilhouette(u, v)) return null;
  const A = PLATE_ART, S = TRAINING.SCORE;
  if (Math.hypot(u - A.head.u, v - A.head.v) <= A.head.ring) return { zone: 'head', points: S.head };
  const dc = Math.hypot(u - A.chest.u, v - A.chest.v);
  if (dc <= A.chest.bull) return { zone: 'bull', points: S.bull };
  if (dc <= A.chest.ring) return { zone: 'ring', points: S.ring };
  return { zone: 'plate', points: S.plate };
}
// +1 falls downrange (shot from the line). -1 falls back toward the line (shot from behind the plate).
export function fallSign(playerZ, originZ, targetZ) {
  return playerZ > originZ + targetZ ? -1 : 1;
}

// Keep a point inside the union of axis-aligned rectangles: unchanged when it is in one, otherwise moved to the
// nearest point of the nearest one.
export function clampToRects(rects, x, z) {
  let best = null, bd = Infinity;
  for (const r of rects) {
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) return { x, z, moved: false };
    const cx = Math.max(r.minX, Math.min(r.maxX, x)), cz = Math.max(r.minZ, Math.min(r.maxZ, z));
    const d = (cx - x) * (cx - x) + (cz - z) * (cz - z);
    if (d < bd) { bd = d; best = { x: cx, z: cz, moved: true }; }
  }
  return best || { x, z, moved: false };
}

// Slab test: the fraction along a->b where it first touches the box, or null.
// CL-158: boxes for the still things under `root` that a beam or a round should stop on (world coordinates, `prop: true`):
// every visible mesh not under a skipped object, at least `minH` tall, its top no higher than `maxTop` over the floor,
// no longer than `maxLen` (the walls, bands and floors are their own solids, or not solids at all). A box inside
// another is left out. Taken before the bake (bakeStatic merges the meshes).
export function propSolids(T, root, floorY, { skip = null, maxTop = 3.2, minH = 0.15, maxLen = 8, minLen = 0.08 } = {}) {
  // CH-1: a whole copy (no skip: the HQ's station copies) is a root of the exact layer, so a piece added to it later
  // (the Armory's rack) is a surface too; the room's own walk names only its meshes (later children of the room, the
  // cutaway shells, the fences, the dummy, are not props).
  if (!skip) markLineRoot(root);
  skip = skip || (() => false);
  root.updateMatrixWorld(true);
  const b = new T.Box3(), found = [];
  const walk = (o, blocked) => {
    const stop = blocked || skip(o);
    if (!stop && o.isMesh && o.visible !== false && o.geometry) {
      // CH-1 (J151 notes 31, 45): every still mesh walked here, whatever its size, is a surface for the line queries'
      // exact layer (world/training-exact.js); its box below stays the broad solid for everything else.
      markLineMesh(o);
      b.setFromObject(o);
      if (!b.isEmpty()) {
        const sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z, len = Math.max(sx, sz);
        if (sy >= minH && b.max.y - floorY <= maxTop && len <= maxLen && len >= minLen) {
          const box = { minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y, minZ: b.min.z, maxZ: b.max.z, prop: true };
          Object.defineProperty(box, 'mesh', { value: o, enumerable: false, writable: true, configurable: true });   // CH-1: the mesh it came from
          found.push(box);
        }
      }
    }
    for (const c of o.children) walk(c, stop);
  };
  walk(root, false);
  const inside = (a, c) => a.minX >= c.minX && a.maxX <= c.maxX && a.minY >= c.minY && a.maxY <= c.maxY && a.minZ >= c.minZ && a.maxZ <= c.maxZ;
  return found.filter((a, i) => !found.some((c, j) => j !== i && inside(a, c) && (!inside(c, a) || j < i)));
}

export function segmentBox(a, b, box) {
  let t0 = 0, t1 = 1, p, q, lo, hi, d, u, v, s;
  p = a.x; q = b.x; lo = box.minX; hi = box.maxX;
  d = q - p;
  if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; }
  else { u = (lo - p) / d; v = (hi - p) / d; if (u > v) { s = u; u = v; v = s; } if (u > t0) t0 = u; if (v < t1) t1 = v; if (t0 > t1) return null; }
  p = a.y; q = b.y; lo = box.minY; hi = box.maxY;
  d = q - p;
  if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; }
  else { u = (lo - p) / d; v = (hi - p) / d; if (u > v) { s = u; u = v; v = s; } if (u > t0) t0 = u; if (v < t1) t1 = v; if (t0 > t1) return null; }
  p = a.z; q = b.z; lo = box.minZ; hi = box.maxZ;
  d = q - p;
  if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; }
  else { u = (lo - p) / d; v = (hi - p) / d; if (u > v) { s = u; u = v; v = s; } if (u > t0) t0 = u; if (v < t1) t1 = v; if (t0 > t1) return null; }
  return t0;
}

function canvasTex(T, w, h, draw, repeat) {
  const cv = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!cv) return null;
  cv.width = w; cv.height = h;
  const c = cv.getContext ? cv.getContext('2d') : null;
  if (c) draw(c, w, h);
  const tex = new T.CanvasTexture(cv);
  if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  if (repeat) { tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(repeat[0], repeat[1]); }
  return tex;
}

// Square tiles with grout: four tiles a side on the canvas (one metre each).
// CH-3 #1 (D-237 item 13): 1024 px (256 px a metre, was 64), thin grout with a lit/shaded chamfer,
// per-tile tone, fine speckle, mipmaps + anisotropy, so floors and walls stay crisp at distance.
function tileTex(T, base, grout, repeat, speck = 0.04, aniso = 8) {
  const tex = canvasTex(T, 1024, 1024, (c, w) => {
    const n = 4, t = w / n, g = 6;                       // 4 tiles a side (1 m each), grout 6 px = 2.3 cm (v2.1: reads at 15-20 m)
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    c.fillStyle = grout; c.fillRect(0, 0, w, w); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 0, w, w);   // v2.1: grout a shade darker
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * t + g / 2, y = j * t + g / 2, sz = t - g;
      c.fillStyle = base; c.fillRect(x, y, sz, sz);
      const k = (rnd() - 0.5) * 0.07;                    // per-tile tone, +-3.5 %
      c.fillStyle = k > 0 ? `rgba(255,255,255,${k})` : `rgba(0,0,0,${-k})`; c.fillRect(x, y, sz, sz);
      // soft mottling inside the tile (glaze is never flat)
      for (let m = 0; m < 6; m++) {
        const r = 30 + rnd() * 70, cx = x + rnd() * sz, cy = y + rnd() * sz;
        const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r);
        gr.addColorStop(0, `rgba(0,0,0,${0.025 * rnd()})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.fillRect(Math.max(x, cx - r), Math.max(y, cy - r), Math.min(2 * r, x + sz - Math.max(x, cx - r)), Math.min(2 * r, y + sz - Math.max(y, cy - r)));
      }
      // chamfer: 2 px lit on top/left, 2 px shade on bottom/right
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x, y, sz, 2); c.fillRect(x, y, 2, sz);
      c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(x, y + sz - 2, sz, 2); c.fillRect(x + sz - 2, y, 2, sz);
    }
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(0,0,0,${speck * 1.4 * rnd()})`; c.fillRect(rnd() * w, rnd() * w, 1 + (rnd() < 0.2), 1); }
    for (let i = 0; i < 40; i++) {                       // a few small chips at tile corners
      const ci = Math.floor(rnd() * n), cj = Math.floor(rnd() * n), cx = ci * t + (rnd() < 0.5 ? g : t - g), cy = cj * t + (rnd() < 0.5 ? g : t - g);
      c.fillStyle = grout; c.beginPath(); c.arc(cx, cy, 2 + rnd() * 3, 0, Math.PI * 2); c.fill();
    }
  }, repeat);
  if (tex) { tex.anisotropy = aniso; tex.generateMipmaps = true; }
  return tex;
}

function textTex(T, text, opts = {}) {
  const w = opts.w || 1024, h = opts.h || 256;
  const tex = canvasTex(T, w, h, (c) => {
    let s = 37;
    for (let i = 0; i < text.length; i++) s = (s * 31 + text.charCodeAt(i)) % 2147483647;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    if (opts.bg) {
      // AG-405: weathered painted steel/aluminum signplate with subtle grain, border bevel, corner rivets & light grime
      c.fillStyle = opts.bg; c.fillRect(0, 0, w, h);
      const grad = c.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255,255,255,0.08)'); grad.addColorStop(0.5, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.14)');
      c.fillStyle = grad; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 140; i++) {
        c.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.025 + rnd() * 0.04})` : `rgba(0,0,0,${0.035 + rnd() * 0.06})`;
        c.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 32, 1 + rnd() * 2);
      }
      const pad = Math.max(5, Math.round(Math.min(w, h) * 0.045));
      c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = Math.max(2, Math.round(pad * 0.4));
      c.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = Math.max(1, Math.round(pad * 0.2));
      c.strokeRect(pad + 3, pad + 3, w - pad * 2 - 6, h - pad * 2 - 6);
      const rv = Math.max(3, Math.round(Math.min(w, h) * 0.024));
      for (const [rx, ry] of [[pad + rv * 1.4, pad + rv * 1.4], [w - pad - rv * 1.4, pad + rv * 1.4], [pad + rv * 1.4, h - pad - rv * 1.4], [w - pad - rv * 1.4, h - pad - rv * 1.4]]) {
        c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(rx + 1, ry + 1.5, rv * 1.15, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(182,188,192,0.72)'; c.beginPath(); c.arc(rx, ry, rv, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.34)'; c.beginPath(); c.arc(rx - rv * 0.3, ry - rv * 0.3, rv * 0.38, 0, Math.PI * 2); c.fill();
      }
    }
    c.fillStyle = opts.color || '#1c1f22'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let px = opts.size || 150; const font = () => `${opts.weight || 'bold'} ${px}px Impact, "Arial Black", sans-serif`; c.font = font();
    while (px > 10 && c.measureText && c.measureText(text).width > w * 0.86) { px -= 4; c.font = font(); }   // GB-161: every sign's words fit inside it
    if (opts.bg) {
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillText(text, w / 2 + 2, h / 2 + (opts.dy || 0) + 2);
      c.fillStyle = opts.color || '#1c1f22';
    }
    c.fillText(text, w / 2, h / 2 + (opts.dy || 0));
    if (!opts.bg) {
      // AG-405: subtle concrete-grit wear speckles cut out of transparent floor/wall stencil paint
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = 'rgba(0,0,0,0.52)';
      for (let i = 0; i < 220; i++) c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 5, 1 + rnd() * 3.5);
      c.globalCompositeOperation = 'source-over';
    } else {
      for (let i = 0; i < 24; i++) {
        c.fillStyle = `rgba(28,26,22,${0.08 + rnd() * 0.14})`;
        c.fillRect(rnd() * w, rnd() < 0.5 ? rnd() * 14 : h - 14 + rnd() * 14, 4 + rnd() * 18, 2 + rnd() * 5);
      }
    }
  });
  if (tex) { tex.anisotropy = 8; tex.generateMipmaps = true; }
  return tex;
}

// CU-117 (Jerry): the range legend is paint on the tile, not a printed label.
// Soft overspray, a few drips and chips. CU-118: no bar through the letters.
function paintStencilTex(T, text) {
  const w = 1280, h = 360;
  const tex = canvasTex(T, w, h, (c) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = 250;
    c.font = `bold ${size}px Impact, "Arial Black", sans-serif`;
    while (c.measureText(text).width > w * 0.9 && size > 90) {
      size -= 6;
      c.font = `bold ${size}px Impact, "Arial Black", sans-serif`;
    }
    const cx = w / 2, cy = h / 2 + 4;
    c.fillStyle = 'rgba(36, 44, 40, 0.24)';
    for (const [dx, dy] of [[3, 2], [-2, 3], [2, -1], [-3, 1], [4, 3]]) c.fillText(text, cx + dx, cy + dy);
    c.fillStyle = '#1b2623';
    c.fillText(text, cx + 1, cy + 1);
    c.fillStyle = '#24302c';
    c.fillText(text, cx, cy);
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    let s = 19;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 160; i++) c.fillRect(rnd() * w, cy - size * 0.45 + rnd() * size * 0.9, 1.5 + rnd() * 6, 1 + rnd() * 3);
    c.fillStyle = 'rgba(0,0,0,0.42)';
    for (let gx = 1; gx < 7; gx++) c.fillRect(Math.round(gx * w / 7.4) - 1, 0, 2, h);
    c.fillRect(0, Math.round(h * 0.47), w, 2);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(32, 42, 38, 0.72)';
    const span = c.measureText(text).width;
    for (let i = 0; i < 8; i++) {
      const x = cx - span / 2 + rnd() * span;
      c.fillRect(x, cy + size * 0.32, 1.5 + rnd() * 2, 6 + rnd() * 30);
    }
  });
  if (tex) { tex.anisotropy = 8; tex.generateMipmaps = true; }
  return tex;
}

export function buildTrainingGround(T, opts = {}) {
  const O = opts.origin || TRAINING.ORIGIN;
  const H = TRAINING.WALL_H, R = TRAINING.RANGE, B = TRAINING.BUILD, D = TRAINING.DOOR;
  const g = new T.Group(); g.name = 'training-ground'; g.position.set(O.x, O.y, O.z);
  const owned = [];   // geometries, materials and textures this built (dispose)
  const keep = (x) => { if (x) owned.push(x); return x; };
  const std = (o) => keep(new T.MeshStandardMaterial(o));
  const W = (x, z) => ({ x: x + O.x, z: z + O.z });
  const add = (geo, mat, x, y, z, parent = g) => { const m = new T.Mesh(keep(geo), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, parent) => { const m = add(new T.BoxGeometry(w, h, d), mat, x, y, z, parent); m.castShadow = true; m.receiveShadow = true; return m; };

  // --- materials (AG-405: full PBR albedo + tangent-space normal + packed AO/Roughness/Metalness)
  const pbr = getTrainingPBR(T);
  const worldUvMats = new Map();
  const trackClone = (o) => { if (o) { keep(o.map); keep(o.normalMap); keep(o.roughnessMap); } return o; };
  const tileW = pbr ? null : keep(tileTex(T, '#dfe3e5', '#b3babf', [1, 1]));
  const floorMat = (w, d, base, grout, isBuild) => {
    if (pbr) {
      const rep = trackClone((isBuild ? pbr.tileBuildFloor : pbr.tileRangeFloor).cloneRepeat(w / 4, d / 4));
      return std({ color: 0xffffff, ...rep });
    }
    const t = keep(tileTex(T, base, grout, [w / 4, d / 4]));
    return std({ color: 0xffffff, map: t, roughness: 0.55, metalness: 0.02 });
  };
  // One material for every wall (CL-117: so they bake to one draw); the tiling is in each wall's uvs, not the texture.
  if (tileW) { tileW.wrapS = tileW.wrapT = T.RepeatWrapping; tileW.repeat.set(1, 1); }
  const wallMatOne = std(pbr ? pbr.tileWall.opts() : { color: 0xffffff, map: tileW, roughness: 0.6 });
  const wallMat = () => wallMatOne;
  const tileUv = (geo, w, h) => { const uv = geo.attributes.uv; if (uv) { for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, uv.getY(i) * h / 4); uv.needsUpdate = true; } return geo; };
  const steel = std(pbr ? pbr.steelDark.opts() : { color: 0x3a4046, roughness: 0.45, metalness: 0.6 });
  const steelLight = std(pbr ? pbr.steelLight.opts() : { color: 0x9aa2a8, roughness: 0.35, metalness: 0.7 });
  const yellow = std(pbr ? pbr.floorYellow.opts() : { color: 0xe8b50c, roughness: 0.5 });
  const hazardTex = pbr ? null : keep(canvasTex(T, 256, 32, (c, w, h) => { c.fillStyle = '#f2c418'; c.fillRect(0, 0, w, h); c.fillStyle = '#16181a';
    for (let x = -h; x < w + h; x += 32) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 16, h); c.lineTo(x + 16 + h, 0); c.lineTo(x + h, 0); c.fill(); } }, [1, 1]));
  const hazard = std(pbr ? pbr.hazardTrim.opts() : { color: 0xffffff, map: hazardTex, roughness: 0.55 });
  const lensMaps = pbr ? { map: pbr.prismaticLens.map, normalMap: pbr.prismaticLens.normalMap, normalScale: T.Vector2 ? new T.Vector2(0.7, 0.7) : undefined } : {};
  const lampMat = std({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0.8, roughness: 0.3, ...lensMaps });
  const buildLampMat = std({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0.8, roughness: 0.3, ...lensMaps });
  // CJ-1: the band is paint: 1 mm off the tile and a polygonOffset step up, like the floor paint, so a bullet mark
  // (2.2 mm off the wall, GT-20105) lies over it instead of behind it.
  const band = std(pbr ? pbr.dadoBand.opts({ extra: { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 } })
    : { color: 0x2f6e8e, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  worldUvMats.set(steel, 1.0);
  worldUvMats.set(steelLight, 0.9);
  worldUvMats.set(yellow, 0.5);
  worldUvMats.set(lampMat, 0.32);
  worldUvMats.set(buildLampMat, 0.32);

  // --- the dark box it all sits in (the world never shows) and the floors
  const voidMat = keep(new T.MeshBasicMaterial({ color: 0x0b0d0f, side: T.BackSide }));   // unlit: it fills the screen behind everything (CL-116)
  const voidBox = add(new T.BoxGeometry(150, 70, 150), voidMat, 9, 20, 9); voidBox.name = 'training-void';
  const outer = add(new T.PlaneGeometry(150, 150), keep(new T.MeshBasicMaterial({ color: 0x15181b })), 9, -0.02, 9); outer.rotation.x = -Math.PI / 2;
  const rangeFloor = add(new T.PlaneGeometry(R.maxX - R.minX, R.maxZ - R.minZ), floorMat(R.maxX - R.minX, R.maxZ - R.minZ, '#c9ced1', '#9aa2a7', false),
    (R.minX + R.maxX) / 2, 0, (R.minZ + R.maxZ) / 2);
  rangeFloor.rotation.x = -Math.PI / 2; rangeFloor.receiveShadow = true; rangeFloor.name = 'training-range-floor';
  const buildFloor = add(new T.PlaneGeometry(B.maxX - B.minX, B.maxZ - B.minZ), floorMat(B.maxX - B.minX, B.maxZ - B.minZ, '#b4b9bc', '#8b9398', true),
    (B.minX + B.maxX) / 2, 0, (B.minZ + B.maxZ) / 2);
  buildFloor.rotation.x = -Math.PI / 2; buildFloor.receiveShadow = true; buildFloor.name = 'training-build-floor';

  // CL-143: steel siding for the hangar's walls above the tiled six metres (and the range's side of the shared wall)
  const sidingTex = pbr ? null : keep(canvasTex(T, 64, 64, (c, w, h) => {
    c.fillStyle = '#6f777c'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { c.fillStyle = '#5b6267'; c.fillRect(x, 0, 5, h); c.fillStyle = '#868e93'; c.fillRect(x + 6, 0, 2, h); }
  }, [1, 1]));
  if (sidingTex) { sidingTex.wrapS = sidingTex.wrapT = T.RepeatWrapping; }
  const siding = std(pbr ? pbr.siding.opts() : { color: 0xffffff, map: sidingTex, roughness: 0.7, metalness: 0.35 });
  const sidingUv = (geo, w, h) => { const uv = geo.attributes.uv; if (uv) { for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2, uv.getY(i) * h / 2); uv.needsUpdate = true; } return geo; };

  // --- the walls: tiled planes facing in (the camera looks through the near ones from outside), a blue band at
  // waist height, a lamp strip along the top. Each wall is also a solid for rounds.
  const solids = [];
  const PILLAR_Z = [-6, 0, 6, 12, 18, 24];   // CG-1: the hangar's truss lines (its pillars); the lamp strips stop short of them
  const wall = (x0, z0, x1, z1, nx, nz, h = H, inset = 0) => {   // inset (CJ-1): the faces stand that far into the room; the solid stays on the line.
    // a wall from (x0,z0) to (x1,z1), facing (nx,nz) into its room, h tall
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.01) return;
    const cx = (x0 + x1) / 2 + nx * inset, cz = (z0 + z1) / 2 + nz * inset, yaw = Math.atan2(nx, nz);
    const m = add(tileUv(new T.PlaneGeometry(len, Math.min(h, H)), len, Math.min(h, H)), wallMat(len), cx, Math.min(h, H) / 2, cz); m.rotation.y = yaw; m.receiveShadow = true;
    if (h > H) {   // The siding laps the tile and sits proud of it. A shared edge on one plane flickered above the light.
      const lap = 0.16;
      const shy = h - H + lap;
      const up = add(sidingUv(new T.PlaneGeometry(len, shy), len, shy), siding, cx + nx * 0.025, H + (h - H - lap) / 2, cz + nz * 0.025);
      up.rotation.y = yaw; up.receiveShadow = true;
      const trimZ0 = nx !== 0 && (Math.abs(Math.min(z0, z1) - B.minZ) < 0.01) ? 0.056 : 0;
      const trimZ1 = nx !== 0 && (Math.abs(Math.max(z0, z1) - B.maxZ) < 0.01 || Math.abs(Math.max(z0, z1) - (B.maxZ + 7)) < 0.01) ? 0.056 : 0;
      // CJ-1: a ledge running to x = -8 ended in the range wall's own plane (its end face fought the tile at the top
      // corners, seen from the range); it stops 3 mm short of it.
      const trimX1 = nz !== 0 && Math.abs(Math.max(x0, x1) - B.maxX) < 0.01 ? 0.003 : 0;
      const lLen = len - trimZ0 - trimZ1 - trimX1, lCz = nx !== 0 ? (Math.min(z0, z1) + trimZ0 + Math.max(z0, z1) - trimZ1) / 2 : cz;
      const ledge = add(new T.BoxGeometry(lLen, 0.08, 0.056), steel, cx + nx * 0.028 - trimX1 / 2, H - 0.04, lCz + nz * 0.028);
      ledge.rotation.y = yaw; ledge.receiveShadow = true;
    }
    const bGeo = new T.PlaneGeometry(len, 0.16);
    if (bGeo.attributes && bGeo.attributes.uv) { for (let i = 0; i < bGeo.attributes.uv.count; i++) bGeo.attributes.uv.setX(i, bGeo.attributes.uv.getX(i) * len / 4); bGeo.attributes.uv.needsUpdate = true; }
    const b = add(bGeo, band, cx + nx * 0.001, 1.05, cz + nz * 0.001); b.rotation.y = yaw;
    const roomLamp = cx + nx * .1 < B.maxX ? buildLampMat : lampMat;
    // CG-1 (D-218, Jerry: "lights intersecting pillars"): a lamp strip no longer runs behind a pillar or through a
    // post. On the long walls it is cut into one fitting per bay, each end closed by a steel cap clear of the pillar
    // (hangar: 8 cm off the column flange at 5.75 m, 7 cm off the truss chord's end at the top; range: 4 cm off the
    // firing bench's end post).
    const strip = (y, cuts) => {
      if (nx === 0 || !cuts.length) { const l = add(new T.PlaneGeometry(len, 0.1), roomLamp, cx + nx * 0.01, y, cz + nz * 0.01); l.rotation.y = yaw; return; }   // a plane: unseen from outside
      const za = Math.min(z0, z1), zb = Math.max(z0, z1), runs = [];
      let at = za;
      for (const [c, half] of cuts.filter(([c, half]) => c + half > za && c - half < zb).sort((p, q) => p[0] - q[0])) {
        if (c - half - at > 0.05) runs.push([at, c - half, at > za, true]);
        at = Math.max(at, c + half);
      }
      if (zb - at > 0.05) runs.push([at, zb, at > za, false]);
      for (const [a, b, capA, capB] of runs) {
        const l = add(new T.PlaneGeometry(b - a, 0.1), roomLamp, cx + nx * 0.01, y, (a + b) / 2); l.rotation.y = yaw;
        if (capA) box(0.03, 0.13, 0.025, steel, cx + nx * 0.015, y, a + 0.0125);
        if (capB) box(0.03, 0.13, 0.025, steel, cx + nx * 0.015, y, b - 0.0125);
      }
    };
    const postCut = h > H ? [] : [[FIRING_LINE.back - 0.075, 0.08]];
    // CG-1 D1: on the doorway's wall line the low strips stop 4 cm short of the header pocket's ends.
    const doorCut = Math.abs(x0 - D.x) < 0.01 && Math.abs(x1 - D.x) < 0.01 ? [[(D.minZ + D.maxZ) / 2, (D.maxZ - D.minZ) / 2 + 0.04]] : [];
    strip(h - 0.25, h > H ? PILLAR_Z.map(z => [z, 0.2]) : [...postCut, ...doorCut]);
    if (h > H) strip(H - 0.25, [...PILLAR_Z.map(z => [z, 0.43]), ...doorCut]);   // CL-143: and one at the range's height
    const th = 0.3;
    solids.push({ minX: Math.min(x0, x1) - (nx < 0 ? th : 0) + O.x, maxX: Math.max(x0, x1) + (nx > 0 ? th : 0) + O.x,
      minY: O.y - 1, maxY: O.y + h, minZ: Math.min(z0, z1) - (nz < 0 ? th : 0) + O.z, maxZ: Math.max(z0, z1) + (nz > 0 ? th : 0) + O.z, wall: true,
      surface: { x:cx-nx*inset+O.x, z:cz-nz*inset+O.z, nx, nz } });
  };
  // The range: back (behind him), far end, his left (+x, the terminals); his right (-x) has the doorway.
  wall(R.minX, R.minZ, R.maxX, R.minZ, 0, 1);
  wall(R.minX, R.maxZ, R.maxX, R.maxZ, 0, -1);
  wall(R.maxX, R.minZ, R.maxX, R.maxZ, -1, 0);
  wall(R.minX, R.minZ, R.minX, D.minZ, 1, 0);
  wall(R.minX, D.maxZ, R.minX, R.maxZ, 1, 0);
  // The build room: its east wall is the range's right wall (the other face), with the same doorway.
  const HB = TRAINING.HANGAR_H;
  // CJ-1 (J151 note 63): this face and the range's are back to back on x = -8, and what stands flush on the range side
  // (the firing bench's ends, the range console, its yellow box) puts a face on that same plane: seen from the build
  // room it fought the tile through the wall. The build-room face stands 4 mm into its room, so the wall always wins.
  wall(B.maxX, B.minZ, B.maxX, D.minZ, -1, 0, HB, 0.004);
  wall(B.maxX, D.maxZ, B.maxX, B.maxZ, -1, 0, HB, 0.004);
  wall(B.minX, B.minZ, B.maxX, B.minZ, 0, 1, HB);
  // Split the far wall around the containment opening and enclose its holding passage.
  const gateX = (B.minX + B.maxX) / 2, gateHalfWidth = 3.3, gateHeight = 6.3;
  wall(B.minX, B.maxZ, gateX - gateHalfWidth, B.maxZ, 0, -1, HB);
  wall(gateX + gateHalfWidth, B.maxZ, B.maxX, B.maxZ, 0, -1, HB);
  const gateHeader = add(sidingUv(new T.PlaneGeometry(6.6, HB - gateHeight), 6.6, HB - gateHeight), siding,
    gateX, gateHeight + (HB - gateHeight) / 2, B.maxZ - 0.025);
  gateHeader.name = 'training-gate-header';
  gateHeader.rotation.y = Math.PI;
  gateHeader.receiveShadow = true;
  solids.push({ minX: O.x + gateX - 3.3, maxX: O.x + gateX + 3.3, minY: O.y + gateHeight, maxY: O.y + HB,
    minZ: O.z + B.maxZ, maxZ: O.z + B.maxZ + .3, wall: true });
  wall(gateX - 3.3, B.maxZ, gateX - 3.3, B.maxZ + 7, 1, 0, gateHeight);
  wall(gateX + 3.3, B.maxZ, gateX + 3.3, B.maxZ + 7, -1, 0, gateHeight);
  wall(gateX - 3.3, B.maxZ + 7, gateX + 3.3, B.maxZ + 7, 0, -1, gateHeight);
  // CJ-1: the slab starts at the build floor's edge; it ran 3 cm under it on the same plane and flickered there.
  const passageFloor = box(6.6,.04,7.0,steel,gateX,-.02,B.maxZ+3.5); passageFloor.userData.isFloorSlab = true;
  const passageRoof = box(6.6,.12,7.03,steel,gateX,gateHeight+.06,B.maxZ+3.485); passageRoof.userData.isRoofSlab = true;
  wall(B.minX, B.minZ, B.minX, B.maxZ, 1, 0, HB);
  // Over the doorway, the wall above the opening (both faces), and a hazard-striped frame.
  // CG-1 D1 (D-218): the lift shutter rises 3.12 m into the wall over the door, but that wall was two flat planes on
  // the wall line, so the raised shutter stood 10-18 cm out of both faces and the signs over the door were inside it.
  // A real lift door runs up into a header pocket: a box as deep as the shutter hood (36 cm), clad like each room,
  // closed at its ends (and on top in the hangar), sitting on the hood. The shutter now hides inside it.
  const POCKET = 0.186, pocketY = 3.32, pocketTopB = 6.14;
  { const doorW = D.maxZ - D.minZ, dz = (D.minZ + D.maxZ) / 2, th = 0.006;
    const rh = H - pocketY, bh = pocketTopB - pocketY;
    for (const face of [add(tileUv(new T.BoxGeometry(th, rh, doorW), doorW, rh), wallMat(), D.x + POCKET - th / 2, pocketY + rh / 2, dz),
                        add(sidingUv(new T.BoxGeometry(th, bh, doorW), doorW, bh), siding, D.x - POCKET + th / 2, pocketY + bh / 2, dz)])
      face.receiveShadow = true;
    for (const z of [D.minZ + th / 2, D.maxZ - th / 2]) {
      box(POCKET - 0.010, rh, th, steel, D.x + (POCKET - 0.002) / 2, pocketY + rh / 2, z);    // range half, to the ceiling (to the face's back)
      box(POCKET - 0.010, bh, th, steel, D.x - (POCKET - 0.002) / 2, pocketY + bh / 2, z);    // hangar half
    }
    box(POCKET - 0.004, 0.02, doorW, steel, D.x - (POCKET + 0.004) / 2, pocketTopB + 0.01, dz);   // its lid in the hangar
    const shy = HB - pocketTopB - 0.02;   // the hangar siding over the door starts on the pocket's lid
    const up = add(sidingUv(new T.PlaneGeometry(doorW, shy), doorW, shy), siding, B.maxX - 0.025, pocketTopB + 0.02 + shy / 2, dz);
    up.rotation.y = -Math.PI / 2; }
  const doorZ = (D.minZ + D.maxZ) / 2;
  // CG-2 (AH-4 #4): the jamb posts took the whole 256 x 32 stripe strip on each 3 m face, so the stripes stood as thin
  // vertical pinstripes. Their side faces now map the strip along the height at its own scale (1 m a strip, 12.5 cm a
  // stripe, the texture repeats), so they run at 45 degrees like the header's.
  const postUv = (m, w, h, d) => { const uv = m.geometry.attributes && m.geometry.attributes.uv; if (!uv || uv.count !== 24) return m;
    const across = [d, d, w, w, w, w];   // BoxGeometry faces: +x, -x, +y, -y, +z, -z (the side faces run up the post)
    for (let i = 0; i < 24; i++) { const f = i >> 2; if (f === 2 || f === 3) continue; const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * h, u * across[f] / 0.125); }
    uv.needsUpdate = true; return m; };
  for (const z of [D.minZ, D.maxZ]) {
    postUv(box(0.5, 3.0, 0.14, hazard, D.x, 1.5, z), 0.5, 3.0, 0.14);
    box(0.364, 0.18, 0.14, hazard, D.x, 3.09, z);
  }
  for (const side of [-1, 1]) {
    box(0.068, 0.18, D.maxZ - D.minZ + 0.14, hazard, D.x + side * 0.216, 3.09, doorZ);
    box(0.093, 0.14, D.maxZ - D.minZ + 0.22, steel, D.x + side * 0.2285, 3.25, doorZ);
  }
  for (const [z, dz] of [[D.minZ, -0.02], [D.maxZ, 0.02]]) box(0.364, 0.14, 0.18, steel, D.x, 3.25, z + dz);
  // CF-22 (CH-3 #10, D-237 item 13): the trim was plain yellow boxes. Now: bare steel corner guards (50 mm angles, 1.2 m
  // tall, three anchor bolts each) on the posts' four corners at the opening, where carts and boots hit; the hazard paint
  // chipped to bare steel round them; the shutter's guide channels (25 mm lips both faces, 0-3 m) in each jamb; bolt
  // heads along the header bars; and on the hangar face of the header pocket, the drive: a drum/shaft housing across the
  // door, the gear motor at its end and a conduit down. Kit materials (steel, steelLight), all in the east shell already.
  for (const [z, zs] of [[D.minZ, 1], [D.maxZ, -1]]) {
    const zf = z + zs * 0.07;   // the post's face at the opening
    for (const side of [-1, 1]) {
      const xf = D.x + side * 0.25;   // the post's face toward each room
      box(0.006, 1.2, 0.05, steelLight, xf + side * 0.003, 0.6, zf - zs * 0.025);    // guard leg on the room face
      box(0.05, 1.2, 0.006, steelLight, xf - side * 0.025, 0.6, zf + zs * 0.003);    // guard leg on the opening face
      for (const gy of [0.12, 0.6, 1.08]) box(0.008, 0.022, 0.022, steel, xf + side * 0.0095, gy, zf - zs * 0.03);
      for (const [cy, ch, cw] of [[1.31, 0.05, 0.03], [1.62, 0.02, 0.05], [2.2, 0.035, 0.02], [0.03, 0.03, 0.12]]) box(0.0012, ch, cw, steelLight, xf + side * 0.0006, cy, zf - zs * (0.06 + cw / 2));   // chips
      box(0.012, 3.0, 0.025, steel, D.x + side * 0.134, 1.5, zf + zs * 0.0125);   // guide channel lip
    }
  }
  for (const side of [-1, 1]) for (let bz = D.minZ + 0.1; bz < D.maxZ - 0.05; bz += 0.36) box(0.008, 0.024, 0.024, steelLight, D.x + side * 0.2795, 3.25, bz);
  { const hx = D.x - POCKET, drumY = 5.55, mz = D.minZ + 0.2, z0 = D.minZ + 0.35, z1 = D.maxZ - 0.15, w = z1 - z0, dz = (z0 + z1) / 2;
    const drum = add(new T.CylinderGeometry(0.11, 0.11, w, 16), steel, hx - 0.12, drumY, dz); drum.rotation.x = Math.PI / 2; drum.castShadow = true;
    box(0.24, 0.3, 0.012, steel, hx - 0.12, drumY - 0.02, z1 + 0.006);   // end bracket (the motor is the other end's)
    box(0.22, 0.26, 0.3, steelLight, hx - 0.11, drumY, mz);   // the gear motor
    add(new T.CylinderGeometry(0.075, 0.075, 0.1, 14), steel, hx - 0.27, drumY, mz).rotation.z = Math.PI / 2;   // its fan cover
    box(0.14, 0.16, 0.06, steel, hx - 0.07, drumY - 0.33, D.minZ + 0.08);   // junction box
    box(0.025, drumY - 0.41 - 3.32, 0.025, steel, hx - 0.0125, (drumY - 0.41 + 3.32) / 2, D.minZ + 0.08);   // conduit, down into the header bar
  }

  // GP-167: a reinforced lift shutter. Its own baked subtree rises cleanly through the split lintel/hood slot.
  // CF-21 (Jerry D-234: "Fix gap at top of security door"): shut, the slab stopped at 2.88 m under the 3.0 m header, a
  // 12 cm slot you saw the other room through, and 0.2 mm short of each jamb. It now runs up 1 cm behind the header
  // (3.01 m) and 0.2 mm into each jamb; it lifts 2.99 m (was 3.12), so open its top still stops at the 6 m wall top,
  // its foot 1 cm under the header.
  const SHUT_H = 3.01, SHUT_LIFT = 2.99;
  const shutter = new T.Group(); shutter.name = 'training-security-shutter';
  shutter.position.set(D.x, SHUT_LIFT, doorZ); g.add(shutter);
  box(.20, SHUT_H, D.maxZ - D.minZ - .1396, steel, 0, SHUT_H / 2, 0, shutter);
  // CF-23 (D-237 item 13): the slats get their own satin steel; on the light steel (rough .35, metal .7) their bevelled
  // lips caught the lamps as white bloom stripes on the closed door (native C12). The claw gouges keep the light steel.
  const slatSteel = std(pbr ? pbr.shutterSlat.opts() : { color: 0x8a9298, roughness: 0.58, metalness: 0.5 });
  worldUvMats.set(slatSteel, 1.4);
  for (const side of [-1, 1]) {
    // CF-22 (CH-3 #10): the face is 24 interlocked slats with bevelled lips (the old flat plate's 18 mm and 2.48 m)
    for (let s = 0; s < 24; s++) {
      const sh = 2.48 / 24, geo = new T.BoxGeometry(.018, sh - .003, 2.5), sp = geo.attributes.position;
      for (let k = 0; k < sp.count; k++) if (sp.getX(k) * side > 0) sp.setY(k, Math.sign(sp.getY(k)) * (sh / 2 - .014));
      geo.computeVertexNormals();
      const slat = add(geo, slatSteel, side * .109, .24 + sh * (s + .5), 0, shutter); slat.castShadow = true; slat.receiveShadow = true;
    }
    for (const y of [.42, .95, 1.48, 2.01, 2.54])
      box(.022, .055, 2.5, steel, side * .129, y, 0, shutter);
    box(.032, .14, 2.6, hazard, side * .116, .11, 0, shutter);
    for (const hy of [1.045, 1.385]) box(.022, .05, .07, steel, side * .129, hy, .85, shutter);
    box(.036, .4, .07, steel, side * .158, 1.215, .85, shutter);
  }
  // CG-2 beat 2 (the incident, never explained): four claw gouges through the hazard paint at the foot of the shutter's
  // build-room face, bare steel showing (the shutter's own light steel, baked with it: no new draw).
  for (let k = 0; k < 4; k++) {
    const gz = .2 + k * .042 + (k === 2 ? .006 : 0), len = .145 - Math.abs(k - 1.5) * .02;   // inside the strip (y .04-.18)
    const gm = box(.0024, len, .011 - (k === 3 ? .003 : 0), steelLight, -.1332, .108 + (k % 2) * .006, gz, shutter);
    gm.rotation.x = -.42 - k * .03;
  }
  applyWorldUVByMaterial(shutter, worldUvMats);
  bakeStatic(T, shutter);
  const doorLamp = std({ color: 0x51db8b, emissive: 0x51db8b, emissiveIntensity: .8, roughness: .4 });
  // CL-146: the keypad beside the door, one each side; it is what opens and shuts it (index.html trainingActionTarget).
  // J151 note 59: raised sealed keys, legible legends and an inset rubber face.
  // CF-21 (Jerry D-227: "Keypad has no body ... just a floating keypad and floating screen"): one wall-mounted
  // access-control unit a side, 12.5 x 27 x 4.5 cm: a steel housing with a chamfered front, four dark security screws,
  // the screen recessed behind a rubber bezel (a dim display; only its status line and LED take the door lamp's
  // red/green), raised keys in a rubber gasket, and an armoured flex conduit from its foot down into a junction box on
  // the post. The same four kit materials (steel, rubber, the legend atlas, the lamp), so still four draws a pad.
  const keypadTex = keep(canvasTex(T, 384, 640, (c, w, h) => {
    const legends = ['1','2','3','4','5','6','7','8','9','×','0','✓'], kh = (h - 128) / 4, kw = w / 3;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 80px monospace';
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
      const kx = k * kw, ky = r * kh;
      const base = r === 3 && k !== 1 ? (k ? '#355b43' : '#713e37') : '#454c4e';
      c.fillStyle = base; c.fillRect(kx, ky, kw, kh);
      const gr = c.createLinearGradient(kx, ky, kx, ky + kh);
      gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.28)');
      c.fillStyle = gr; c.fillRect(kx, ky, kw, kh);
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 4; c.strokeRect(kx + 2, ky + 2, kw - 4, kh - 4);
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillText(legends[r * 3 + k], (k + .5) * kw + 2, (r + .52) * kh + 2);
      c.fillStyle = '#e4e5dc'; c.fillText(legends[r * 3 + k], (k + .5) * kw, (r + .51) * kh);
    }
    // the screen (the atlas's bottom 128 rows): backlit dark LCD glass, scan lines, status bars & faint glare
    const y0 = h - 128;
    const sgr = c.createRadialGradient(w * 0.45, y0 + 54, 8, w * 0.45, y0 + 64, 210);
    sgr.addColorStop(0, '#10211a'); sgr.addColorStop(1, '#070e0b');
    c.fillStyle = sgr; c.fillRect(0, y0, w, 128);
    c.fillStyle = 'rgba(0,0,0,0.32)'; for (let y = y0; y < h; y += 3) c.fillRect(0, y, w, 1);
    c.fillStyle = '#254c3b'; c.fillRect(30, y0 + 24, 198, 12); c.fillRect(30, y0 + 48, 126, 10);
    c.fillStyle = '#1b382b'; c.fillRect(292, y0 + 22, 58, 42);
    c.strokeStyle = '#336a52'; c.lineWidth = 2; c.strokeRect(292, y0 + 22, 58, 42);
    const gl = c.createLinearGradient(0, y0, w, y0 + 128);
    gl.addColorStop(0, 'rgba(255,255,255,0.08)'); gl.addColorStop(0.35, 'rgba(255,255,255,0.0)'); gl.addColorStop(1, 'rgba(255,255,255,0.03)');
    c.fillStyle = gl; c.fillRect(0, y0, w, 128);
  }, [1, 1]));
  if (keypadTex) { keypadTex.anisotropy = 8; keypadTex.generateMipmaps = true; }
  // CJ-1: the legends lie 0.2 mm off their keys: a polygonOffset step toward the eye keeps them from flickering.
  const keypadFace = std({ color: 0xffffff, map: keypadTex, roughness: .8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const keypadRubber = std({ color: 0x202729, roughness: .9 });
  const keypads = [];
  // CG-1 (CF-20 #10): the pads 15 cm lower (centre 1.13 m, top 1.31 m; were 1.28 / 1.46): an access keypad's top
  // stays under 1.22-1.3 m, at hand for a standing man. (CF-21: KPY stays the E target; the unit spans 1.015-1.285 m.)
  const KPY = 1.13, BY = 1.15, BH = .27, BW = .125, KY = 1.104, SY = 1.224;
  for (const side of [-1, 1]) {
    // AG-278 (Jerry's J104): keypad mounted on the yellow-and-black striped door trim post (z = D.minZ, face at D.x + side * .25)
    const kz = D.minZ, X = (u) => D.x + side * (.25 + u);   // u: metres out from the post's face
    const pad = new T.Group(); pad.name = 'training-security-keypad-' + side; g.add(pad);
    const along = (m) => { m.rotation.z = Math.PI / 2; return m; };   // a cylinder's axis out of the post
    // the housing: a 3.6 cm body 0.5 mm off the post, and an 8 mm front chamfered 7 mm all round
    box(.036, BH, BW, steelLight, X(.0185), BY, kz, pad);
    const bev = new T.BoxGeometry(.008, BH, BW), bp = bev.attributes.position;
    for (let i = 0; i < bp.count; i++) if (bp.getX(i) * side > 0)
      bp.setXYZ(i, bp.getX(i), bp.getY(i) - Math.sign(bp.getY(i)) * .007, bp.getZ(i) - Math.sign(bp.getZ(i)) * .007);
    bp.needsUpdate = true; bev.computeVertexNormals();
    add(bev, steelLight, X(.0405), BY, kz, pad).castShadow = false;
    const F = .0445;   // the front face
    for (const sy of [-1, 1]) for (const sz of [-1, 1])   // four security screws in the corners
      along(add(new T.CylinderGeometry(.0032, .0032, .0016, 10), keypadRubber, X(F + .0008), BY + sy * .1205, kz + sz * .0485, pad));
    // the screen: dark glass 3.5 mm back inside a 4 mm rubber bezel, a status line and an LED in the door lamp's colour
    for (const sy of [-1, 1]) box(.004, .012, .098, keypadRubber, X(F + .002), SY + sy * .028, kz, pad);
    for (const sz of [-1, 1]) box(.004, .044, .012, keypadRubber, X(F + .002), SY, kz + sz * .043, pad);
    const scr = new T.PlaneGeometry(.074, .044), su = scr.attributes.uv;
    if (su) for (let i = 0; i < su.count; i++) su.setXY(i, su.getX(i), su.getY(i) * .2);
    add(scr, keypadFace, X(F + .0005), SY, kz, pad).rotation.y = side * Math.PI / 2;
    box(.0015, .005, .05, doorLamp, X(F + .00125), SY - .011, kz - side * .006, pad);
    box(.002, .006, .006, doorLamp, X(F + .001), 1.181, kz - side * .041, pad);
    // the keys: raised 4 mm out of a 3 mm rubber gasket
    box(.003, .136, .104, keypadRubber, X(F + .0015), KY, kz, pad);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
      const ky = KY + .048 - r * .032, kZ = kz - side * (k - 1) * .034;
      box(.004, .024, .029, keypadRubber, X(F + .005), ky, kZ, pad);
      const geo = new T.PlaneGeometry(.027, .021), uv = geo.attributes.uv;
      if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, (k + uv.getX(i)) / 3, (4 - r + uv.getY(i)) / 5);
      const face = add(geo, keypadFace, X(F + .0072), ky, kZ, pad);
      face.rotation.y = side * Math.PI / 2; face.userData.isDecal = true;
    }
    // the conduit: a gland under the housing, 7 cm of armoured flex (three steel rings), a gland nut on a junction box
    add(new T.CylinderGeometry(.0085, .0085, .008, 12), steelLight, X(.018), BY - BH / 2 - .004, kz, pad);
    add(new T.CylinderGeometry(.0065, .0065, .068, 12), keypadRubber, X(.018), .981, kz, pad);
    for (const ry of [.962, .981, 1.0]) add(new T.CylinderGeometry(.0074, .0074, .003, 12), steelLight, X(.018), ry, kz, pad);
    add(new T.CylinderGeometry(.0095, .0095, .012, 6), steelLight, X(.018), .941, kz, pad);
    box(.028, .05, .05, steelLight, X(.0145), .91, kz, pad);
    bakeStatic(T, pad);
    pad.traverse(o => { if (o.geometry && o.userData.baked) keep(o.geometry); });
    // Keep the existing post/keypad cutaway together.
    for (const mesh of [...pad.children]) g.add(mesh);
    g.remove(pad);
    keypads.push({ side, x: O.x + D.x + side * (.25 + .04), y: O.y + KPY, z: O.z + kz, front: W(D.x + side * 1.0, kz) });
  }
  const doorSolid = { minX: O.x+D.x-.18, maxX: O.x+D.x+.18, minY: O.y, maxY: O.y+3,
    minZ: O.z+D.minZ, maxZ: O.z+D.maxZ, securityDoor: true };
  const securityDoor = {
    x: O.x+D.x, z: O.z+doorZ, minZ: O.z+D.minZ, maxZ: O.z+D.maxZ, shutter, keypads,
    setState(state) {
      shutter.position.y = state.amount * SHUT_LIFT;
      doorLamp.color.set(state.locked ? 0xe44232 : 0x51db8b);
      doorLamp.emissive.set(state.locked ? 0xe44232 : 0x51db8b);
      const at = solids.indexOf(doorSolid);
      if (state.blocked && at < 0) solids.push(doorSolid);
      else if (!state.blocked && at >= 0) solids.splice(at, 1);
    }
  };

  // --- signs
  const sign = (text, w, h, x, y, z, yaw, o = {}) => {
    const tex = keep(textTex(T, text, o));
    if (tex) tex.anisotropy = 8;   // CH-3: floor words and lane numbers stay sharp at a grazing angle
    // CJ-1 (J151 note 63): a sign is a plate laid on a face (the gate frame's and the infirmary's labels sit 0.3 mm
    // proud of theirs): one polygonOffset step toward the eye, so the depth buffer never picks between the two.
    const m = add(new T.PlaneGeometry(w, h), std({ color: 0xffffff, map: tex, transparent: !o.bg, roughness: 0.7,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), x, y, z);
    m.rotation.y = yaw; return m;
  };
  {
    // Painted stencil on the back wall of the range. Matte, and tight to the tile.
    const tex = keep(paintStencilTex(T, 'PGB RANGE'));
    const m = add(new T.PlaneGeometry(7.4, 1.7), std({
      color: 0xffffff, map: tex, transparent: true, roughness: 0.96, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    }), 0, 4.05, R.minZ + 0.04);
    m.rotation.y = 0;
    m.name = 'pgb-range-stencil';
  }
  // CG-1 D1: both signs on the header pocket's face (they were inside the raised shutter), clear of the hood under it.
  sign('BUILD ROOM', 2.6, 0.62, R.minX + POCKET + 0.012, 3.72, (D.minZ + D.maxZ) / 2, Math.PI / 2, { bg: '#f2c418', color: '#16181a', size: 170 });
  if (opts.securityLabel) sign(opts.securityLabel, 2.5, .36, B.maxX - POCKET - .012, 3.66, doorZ, -Math.PI/2, { bg: '#16181a', color: '#f2c418', size: 150 });


  // --- the firing line, its stencil, and a lane number past it for each target
  const floorPaintMaterial = m => { m.polygonOffset=true; m.polygonOffsetFactor=-1; m.polygonOffsetUnits=-1; return m; };
  const lineGeo = new T.PlaneGeometry(R.maxX - R.minX, 0.26);
  if (lineGeo.attributes && lineGeo.attributes.uv) { for (let i = 0; i < lineGeo.attributes.uv.count; i++) lineGeo.attributes.uv.setX(i, lineGeo.attributes.uv.getX(i) * (R.maxX - R.minX) / 2); lineGeo.attributes.uv.needsUpdate = true; }
  const line = add(lineGeo, floorPaintMaterial(std(pbr ? pbr.floorYellow.opts() : { color: 0xe8b50c, roughness: 0.5 })), 0, 0.001, TRAINING.LINE_Z); line.rotation.x = -Math.PI / 2; line.name = 'firing-line';
  const lineText = sign('FIRING LINE', 4.2, 0.8, 0, 0.001, TRAINING.LINE_Z - 0.75, 0, { color: '#9c7600', size: 170 });
  floorPaintMaterial(lineText.material);
  lineText.rotation.set(-Math.PI / 2, 0, Math.PI);
  TRAINING.LANES.forEach((lx, i) => {
    const n = sign(String(i + 1), 0.7, 0.7, lx, 0.001, TRAINING.LINE_Z + 1.1, 0, { w: 256, h: 256, color: '#9c7600', size: 200 });
    floorPaintMaterial(n.material);
    n.rotation.set(-Math.PI / 2, 0, Math.PI);
  });
  // GP-19907: continuous firing bench and upper mesh; the open middle is for weapons, not bodies.
  const firingLine = buildFiringLine(T, {root:g,origin:O,range:R,height:H,box,std,keep,steel,steelLight,hazard});
  solids.push(...firingLine.solids);
  // A rubber backstop across the far end.
  // CC-363 (D-218 R2, for Claude 7): no longer one flat slab. Stacked rubber-crumb blocks (0.6 x 0.3 m, running bond,
  // two rubber shades, each block set back 0-1.5 cm so the courses read) in a steel frame: a back panel, a floor sill,
  // end posts, four posts between the lanes, and a top hood sloping toward the shooter. Same footprint, same solid
  // (front face at R.maxZ - 0.55, top 3.8 m: the wear decal at -0.562 and the ballistics stay as they were).
  {
    const bsW = R.maxX - R.minX - 0.4, bsH = 3.8, front = R.maxZ - 0.55, back = R.maxZ - 0.05;
    // CF-22 (CH-3 #8, D-237 item 13): it read as black noise. The rubber is a shade lighter and every block has a 2 cm
    // chamfer round its face, so each course catches the light; behind each lane (the shot zone, 0.8-2.6 m up) the blocks
    // are mostly the paler rubber with their edges chewed back (3 cm); the frame and hood are painted steel grey
    // with bolt rows down each post. Same footprint, same solid, same three materials (no new draw).
    const rubberA = std(pbr ? pbr.rubberCrumb.opts({ color: 0x62686c, normalScale: 1.2 }) : { color: 0x3d4143, roughness: 0.95 });
    const rubberB = std(pbr ? pbr.rubberCrumb.opts({ color: 0x454a4d, normalScale: 1.25 }) : { color: 0x2b2e30, roughness: 0.97 });
    const frameMat = std(pbr ? pbr.roofSteel.opts({ color: 0xd0d6da }) : { color: 0x7b8389, roughness: 0.6, metalness: 0.3 });
    worldUvMats.set(rubberA, 0.6); worldUvMats.set(rubberB, 0.6); worldUvMats.set(frameMat, 1.4);
    const blockGeo = (w, h, d, c) => {   // a block whose front face (-z) is chamfered `c` round its edges
      const geo = new T.BoxGeometry(w, h, d), bp = geo.attributes.position;
      for (let k = 0; k < bp.count; k++) if (bp.getZ(k) < 0) bp.setXYZ(k, Math.sign(bp.getX(k)) * (w / 2 - c), Math.sign(bp.getY(k)) * (h / 2 - c), bp.getZ(k));
      geo.computeVertexNormals(); return geo;
    };
    box(bsW, bsH, 0.06, frameMat, 0, bsH / 2, back - 0.03);                                   // back panel (the seams' shadow)
    box(bsW, 0.08, 0.5, frameMat, 0, 0.04, (front + back) / 2);                               // floor sill
    const posts = [-bsW / 2 + 0.08, -4.5, -1.5, 1.5, 4.5, bsW / 2 - 0.08];                    // between the lanes (6, 3, 0, -3, -6)
    for (const x of posts) {
      box(0.16, bsH - 0.08, 0.012, frameMat, x, 0.08 + (bsH - 0.08) / 2, front + 0.006);      // front flange, flush with the blocks
      box(0.012, bsH - 0.08, 0.44, frameMat, x, 0.08 + (bsH - 0.08) / 2, (front + back) / 2 + 0.02);   // web
      for (let by = 0.3; by < bsH - 0.1; by += 0.45) for (const bx of [-0.05, 0.05]) box(0.024, 0.024, 0.01, steel, x + bx, by, front - 0.005);   // bolt heads
    }
    const shotZone = (x, y) => y > 0.8 && y < 2.6 && TRAINING.LANES.some((lx) => Math.abs(x - lx) < 0.9);
    // the blocks, bay by bay between the posts
    let seed = 9137; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const rows = Math.round((bsH - 0.08) / 0.3), rowH = (bsH - 0.08) / rows, gap = 0.012;
    for (let b = 0; b < posts.length - 1; b++) {
      const x0 = posts[b] + 0.08, x1 = posts[b + 1] - 0.08, bayW = x1 - x0;
      for (let r = 0; r < rows; r++) {
        const y0 = 0.08 + r * rowH, n = Math.max(1, Math.round(bayW / 0.6)), w = bayW / n, shift = (r % 2) ? w / 2 : 0;
        const edges = [x0];
        for (let k = 1; k <= n; k++) { const e = x0 + k * w - shift; if (e > x0 + 0.05 && e < x1 - 0.05) edges.push(e); }
        edges.push(x1);
        for (let k = 0; k < edges.length - 1; k++) {
          const a = edges[k], c = edges[k + 1], worn = shotZone((a + c) / 2, y0 + rowH / 2);
          const set = rnd() * 0.015, d = 0.44 - set;   // as before: the marks and the wear decal (12 mm proud) stay on the face
          const blk = add(blockGeo(c - a - gap, rowH - gap, d, worn ? 0.03 : 0.02), worn ? (rnd() < 0.8 ? rubberA : rubberB) : (rnd() < 0.3 ? rubberA : rubberB),
            (a + c) / 2, y0 + rowH / 2, front + set + d / 2);
          blk.castShadow = true; blk.receiveShadow = true;
        }
      }
    }
    // top hood: a steel deflector over the blocks, its lip 15 cm proud of the face, sloping down toward the line
    const hoodD = back - (front - 0.15), hood = box(bsW + 0.1, 0.012, hoodD / Math.cos(0.32), frameMat, 0, bsH + 0.08, (front - 0.15 + back) / 2);
    hood.rotation.x = -0.32;   // the shooter's side lower
    box(bsW + 0.1, 0.07, 0.012, frameMat, 0, bsH + 0.08 - Math.tan(0.32) * hoodD / 2 - 0.03, front - 0.15);   // front lip
    box(bsW + 0.1, 0.16, 0.06, frameMat, 0, bsH + 0.08, back - 0.03);                         // top rail it hangs from
  }
  solids.push({minX:O.x+R.minX+.2,maxX:O.x+R.maxX-.2,minY:O.y,maxY:O.y+3.8,minZ:O.z+R.maxZ-.55,maxZ:O.z+R.maxZ-.05,backstop:true});

  // --- the targets: a steel base, a pivot at its top, a silhouette plate on an arm. Shot, it falls back flat, waits,
  // and stands up again.
  // AG-405: painted AR500 steel target plate with brushed metal substrate, realistic bullet-splatter chips around scoring zones,
  // and paired normal + ORM maps (bare chipped steel glints metallically while spray paint stays matte).
  const plateChips = [];
  { let ps = 14409; const pr = () => { ps = (ps * 16807) % 2147483647; return ps / 2147483647; };
    const gauss = () => Math.sqrt(-2 * Math.log(pr() + 1e-9)) * Math.cos(6.2832 * pr());
    for (let i = 0; i < 65; i++) plateChips.push([PLATE_ART.chest.u + gauss() * 28, PLATE_ART.chest.v + gauss() * 34, 1.8 + pr() * 4.5, pr()]);
    for (let i = 0; i < 22; i++) plateChips.push([PLATE_ART.head.u + gauss() * 14, PLATE_ART.head.v + gauss() * 14, 1.4 + pr() * 3.2, pr()]);
    for (let i = 0; i < 30; i++) plateChips.push([60 + pr() * 136, 150 + pr() * 270, 1.2 + pr() * 2.8, pr()]);
  }
  const plateTex = keep(canvasTex(T, 512, 896, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.save(); c.scale(2, 2);   // drawn in PLATE_ART's units (exact scoring geometry preserved)
    const A = PLATE_ART, W = A.W, b = A.body;
    const figPath = (inset) => {
      c.beginPath();
      c.arc(A.head.u, A.head.v, A.head.r - inset, 0, Math.PI * 2);
      c.rect(A.neck.minU + inset, A.neck.top + inset,
        A.neck.maxU - A.neck.minU - inset * 2, A.neck.bottom - A.neck.top - inset * 2);
      c.moveTo(b.inBottom + inset, b.bottom - inset); c.lineTo(b.inTop + inset, b.top + inset); c.quadraticCurveTo(W / 2, b.shoulder + inset, W - b.inTop - inset, b.top + inset);
      c.lineTo(W - b.inBottom - inset, b.bottom - inset); c.closePath();
    };
    const fig = (inset, col) => { c.fillStyle = col; figPath(inset); c.fill(); };
    fig(0, '#e3e6e2'); fig(6, '#2b3136');
    // Subtle brushed AR500 steel patina + spray-paint texture inside the silhouette
    c.save(); figPath(6); c.clip();
    let s = 419; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 180; i++) {
      c.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.02 + rnd() * 0.035})` : `rgba(0,0,0,${0.03 + rnd() * 0.05})`;
      c.fillRect(30 + rnd() * 196, 15 + rnd() * 420, 8 + rnd() * 34, 1 + rnd() * 2);
    }
    // Bullet lead-splatter & bare chipped AR500 steel pocks from past practice
    for (const [cx, cy, rad, k] of plateChips) {
      const halo = c.createRadialGradient(cx, cy, 0, cx, cy, rad * 2.2);
      halo.addColorStop(0, 'rgba(18,20,22,0.45)'); halo.addColorStop(1, 'rgba(18,20,22,0)');
      c.fillStyle = halo; c.fillRect(cx - rad * 2.2, cy - rad * 2.2, rad * 4.4, rad * 4.4);
      c.fillStyle = k < 0.65 ? '#9ba3a8' : '#7a8388';
      c.beginPath(); c.arc(cx, cy, rad * 0.72, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c2c9cd';
      c.beginPath(); c.arc(cx - rad * 0.18, cy - rad * 0.18, rad * 0.34, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    // the scoring rings: the head ring and the chest bullseye filled faintly, the rings in red, their values beside them
    c.fillStyle = '#d93c2838';
    c.beginPath(); c.arc(A.chest.u, A.chest.v, A.chest.bull, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(A.head.u, A.head.v, A.head.ring, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#de3c28'; c.lineWidth = 5;
    for (const r of [A.chest.bull, A.chest.ring]) { c.beginPath(); c.arc(A.chest.u, A.chest.v, r, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.arc(A.head.u, A.head.v, A.head.ring, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#edf0ec'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 16px Impact, "Arial Black", sans-serif';
    c.fillText(String(TRAINING.SCORE.bull), A.chest.u, A.chest.v + 1);
    c.fillText(String(TRAINING.SCORE.ring), A.chest.u + (A.chest.bull + A.chest.ring) / 2, A.chest.v + 1);
    c.fillText(String(TRAINING.SCORE.head), A.head.u, A.head.v + 1);
    c.font = 'bold 13px Impact, "Arial Black", sans-serif'; c.fillStyle = '#a4acb2';
    c.fillText(String(TRAINING.SCORE.plate), A.chest.u, b.bottom - 40);
    c.restore();
  }));
  if (plateTex) { plateTex.anisotropy = 8; plateTex.generateMipmaps = true; }
  let plateNrm = null, plateOrm = null;
  if (pbr && plateTex) {
    const pw = 256, ph = 448;
    const hf = new Float32Array(pw * ph);
    const ormBuf = new Uint8Array(pw * ph * 4);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const i = y * pw + x, o = i * 4;
      const g = ((x * 73 + y * 31) & 15) / 15 - 0.5;
      hf[i] = 0.55 + g * 0.04;
      ormBuf[o] = 244; ormBuf[o + 1] = 196; ormBuf[o + 2] = 22; ormBuf[o + 3] = 255;   // matte paint baseline
    }
    for (const [cx, cy, rad] of plateChips) {
      const r0 = Math.ceil(rad * 1.2);
      for (let dy = -r0; dy <= r0; dy++) {
        const py = Math.round(cy) + dy; if (py < 0 || py >= ph) continue;
        for (let dx = -r0; dx <= r0; dx++) {
          const px = Math.round(cx) + dx; if (px < 0 || px >= pw) continue;
          const d = Math.hypot(dx, dy); if (d > rad) continue;
          const i = py * pw + px, o = i * 4, k = 1 - d / rad;
          hf[i] = Math.min(hf[i], 0.55 - k * 0.34);   // recessed dimple in steel plate
          ormBuf[o] = Math.min(ormBuf[o], Math.round(244 - k * 70));
          ormBuf[o + 1] = Math.min(ormBuf[o + 1], Math.round(196 - k * 108));   // bare steel shinier (rough ~0.35)
          ormBuf[o + 2] = Math.max(ormBuf[o + 2], Math.round(22 + k * 195));    // bare AR500 steel metallic (~0.85)
        }
      }
    }
    plateNrm = keep(makeDataTexture(T, heightToNormalRGBA(hf, pw, ph, 2.2, false, false), pw, ph, { name: 'tg-plate-nrm', srgb: false, repeat: false, aniso: 8 }));
    plateOrm = keep(makeDataTexture(T, ormBuf, pw, ph, { name: 'tg-plate-orm', srgb: false, repeat: false, aniso: 8 }));
  }
  const plateMat = std({ color: 0xffffff, map: plateTex, ...(plateNrm ? { normalMap: plateNrm, normalScale: T.Vector2 ? new T.Vector2(0.85, 0.85) : undefined, roughnessMap: plateOrm, metalnessMap: plateOrm, aoMap: plateOrm, aoMapIntensity: 0.65, roughness: 1.0, metalness: 1.0 } : { roughness: 0.5, metalness: 0.2 }), transparent: true, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: T.DoubleSide });
  const K = TRAINING.TARGET_SCALE;
  // The plate doubles; its foot stays where it was (0.66 m up), so the chest rings come at a standing man's eye line
  // (about 1.6 m) and a blade still reaches the plate.
  const PLATE = { w: 0.64 * K, h: 1.12 * K, y: 0.42 + 0.56 * K };   // its middle, above the pivot
  const PIVOT_Y = 0.24;
  const targets = TRAINING.LANES.map((lx, i) => {
    const z = TRAINING.LINE_Z + TRAINING.RANGES[i];
    const root = new T.Group(); root.position.set(lx, 0, z); g.add(root);
    // CF-22 (CH-3 #9, D-237 item 13): a real turning-target base, not a box with a sticker. A 25 mm foot plate held down
    // by four anchor bolts, a housing with bevelled sides, a gusset each side, and a bevelled steel lid in hazard paint
    // worn back to bare steel along its edges and corners. Same footprint (1.05 x 0.81 m), lid top still the pivot's
    // 0.24 m. Kit materials only (steel, hazard, steelLight), so the bake keeps the draws.
    const bevel = (w, h, d, inset) => {   // a box whose top is `inset` smaller each side (bevelled sides, flat normals)
      const geo = new T.BoxGeometry(w, h, d), bp = geo.attributes.position;
      for (let k = 0; k < bp.count; k++) if (bp.getY(k) > 0) bp.setXYZ(k, Math.sign(bp.getX(k)) * (w / 2 - inset), bp.getY(k), Math.sign(bp.getZ(k)) * (d / 2 - inset));
      geo.computeVertexNormals(); return geo;
    };
    const solid = (geo, mat, x, y, z) => { const m = add(geo, mat, x, y, z, root); m.castShadow = true; m.receiveShadow = true; return m; };
    box(1.05, 0.025, 0.81, steel, 0, 0.0125, 0, root);                          // foot plate
    solid(bevel(0.93, 0.175, 0.69, 0.03), steel, 0, 0.025 + 0.0875, 0);          // housing
    solid(bevel(0.95, 0.04, 0.73, 0.02), hazard, 0, 0.22, 0);                     // lid, hazard paint
    for (const s of [-1, 1]) for (const gz of [-0.2, 0.2]) box(0.05, 0.07, 0.012, steel, s * 0.49, 0.025 + 0.035, gz, root);   // gussets
    for (const ax of [-0.495, 0.495]) for (const az of [-0.375, 0.375]) {     // anchor bolts: washer, nut, thread
      box(0.045, 0.004, 0.045, steelLight, ax, 0.027, az, root);
      add(new T.CylinderGeometry(0.017, 0.017, 0.016, 6), steel, ax, 0.029 + 0.008, az, root);
      add(new T.CylinderGeometry(0.008, 0.008, 0.012, 8), steelLight, ax, 0.037 + 0.006, az, root);
    }
    // wear: the paint chipped off the lid's top edges and corners (bare steel, 0.8 mm proud of the lid's top)
    for (const [wx, wz, ww, wd] of [[-0.42, -0.33, 0.06, 0.03], [0.4, -0.335, 0.09, 0.02], [0.1, -0.338, 0.05, 0.014], [-0.15, 0.335, 0.07, 0.02],
      [0.43, 0.32, 0.04, 0.05], [-0.438, 0.05, 0.014, 0.08], [0.44, -0.12, 0.012, 0.05], [-0.25, -0.34, 0.03, 0.01]]) {
      box(ww, 0.0016, wd, steelLight, wx, 0.2408, wz, root).castShadow = false;
    }
    for (const s of [-1, 1]) box(0.045, 0.04, 0.14, steel, s * 0.1125, 0.26, 0, root); // flanking pillow blocks flush on hazard plate
    const pivot = new T.Group(); pivot.position.set(0, PIVOT_Y, 0); root.add(pivot);
    box(0.18, 0.04, 0.10, steelLight, 0, 0.02, 0, pivot);          // pivot axle knuckle
    // The firing line looks along +z. The plate faces -z, so its backing is on +z.
    // The short lower stem meets the plate's foot; the backing begins high enough to clear
    // the base when the pivot lies down in either direction.
    box(0.035, 0.32, 0.009, steelLight, 0, 0.20, 0, pivot).name = 'target-lower-stem';
    // CG-1 (CF-20 #3): the backing was the old plate's (to 1.49 m), so the doubled plate's top half had nothing behind
    // it. It now follows the plate, all of it inside the silhouette so the front never shows it: the centre post to the
    // head (2.36), the side posts to just under the shoulders (1.75, 0.30 m out: the body is 0.38 m each side), and the
    // two crossbars at the hips and the chest (0.66 m: inside the body's width at both).
    box(0.06, 2.0, 0.04, steelLight, 0, 1.36, 0.02, pivot).name = 'target-backing-center';
    for (const s of [-1, 1]) box(0.045, 1.33, 0.04, steelLight, s * 0.30, 1.085, 0.02, pivot).name = 'target-backing-side';
    box(0.66, 0.04, 0.022, steelLight, 0, 1.62, 0.051, pivot).name = 'target-backing-crossbar';
    box(0.66, 0.04, 0.022, steelLight, 0, 0.62, 0.051, pivot).name = 'target-backing-crossbar';
    // The backing touches the translucent plate; its own shadow would stripe the target face at distance.
    for (const part of pivot.children) if (part.name.startsWith('target-backing-')) part.castShadow = false;
    const plate = add(new T.PlaneGeometry(PLATE.w, PLATE.h), plateMat, 0, PLATE.y, 0, pivot);
    plate.rotation.y = Math.PI; plate.castShadow = true; plate.name = 'target-plate';
    const t = { lane: i + 1, range: TRAINING.RANGES[i], state: 'up', t: 0, hits: 0, fall: 1, pivot, plate, x: lx, z };
    t.box = { minX: O.x + lx - PLATE.w / 2, maxX: O.x + lx + PLATE.w / 2, minY: O.y + PIVOT_Y + PLATE.y - PLATE.h / 2, maxY: O.y + PIVOT_Y + PLATE.y + PLATE.h / 2,
      minZ: O.z + z - 0.07, maxZ: O.z + z + 0.07 };
    return t;
  });
  const DOWN_A = 1.45;
  function hitTarget(i, away) {
    const t = targets[i];
    if (!t || t.state !== 'up') return false;
    t.state = 'falling'; t.t = 0; t.hits++;
    t.fall = away < 0 ? -1 : 1;
    return true;
  }
  // CL-144: where on its plate a world point is (PLATE_ART units), and what a hit there scores (null: off the silhouette,
  // the round goes by). The plate is upright when it can be hit, facing the firing line.
  function plateUV(i, p) {
    const t = targets[i]; if (!t) return null;
    const cx = O.x + t.x, top = O.y + PIVOT_Y + PLATE.y + PLATE.h / 2;
    return { u: PLATE_ART.W / 2 + (cx - p.x) / PLATE.w * PLATE_ART.W, v: (top - p.y) / PLATE.h * PLATE_ART.H };
  }
  function onPlate(i, p) { const q = plateUV(i, p); return !!q && onSilhouette(q.u, q.v); }
  function scoreHit(i, p) {
    const t = targets[i]; if (!t) return null;
    const mult = TRAINING.LANE_MULT[t.lane-1] || 1;
    const z = p ? (() => { const q = plateUV(i, p); return scoreZone(q.u, q.v); })() : { zone: 'plate', points: TRAINING.SCORE.plate };
    if (!z) return null;
    return { ...z, mult, total: Math.round(z.points * mult), lane: t.lane, range: t.range };
  }
  function resetTargets() { for (const t of targets) { t.state = 'up'; t.t = 0; t.pivot.rotation.x = 0; } }
  function update(dt) {
    for (const t of targets) {
      if (t.state === 'up') continue;
      t.t += dt;
      if (t.state === 'falling') {
        const u = Math.min(1, t.t / TRAINING.FALL_S);
        t.pivot.rotation.x = t.drillControlled ? (t.drillFrom||0)+(DOWN_A-(t.drillFrom||0))*u*u : (t.fall || 1) * DOWN_A * u * u;
        if (u >= 1) { t.state = 'down'; t.t = 0; }
      } else if (t.state === 'down') {
        if (!t.drillControlled && t.t >= TRAINING.DOWN_S) { t.state = 'rising'; t.t = 0; }
      } else if (t.state === 'rising') {
        const u = Math.min(1, t.t / TRAINING.RISE_S), e = 1 - (1 - u) * (1 - u);
        t.pivot.rotation.x = t.drillControlled ? (t.drillFrom??DOWN_A)*(1-e)-Math.sin(u*Math.PI)*.06 : (t.fall || 1) * (DOWN_A * (1 - e) - Math.sin(u * Math.PI) * 0.06);
        if (u >= 1) { t.state = 'up'; t.t = 0; t.pivot.rotation.x = 0; }
      }
    }
  }
  for (const t of targets) solids.push({ ...t.box, target: t.lane - 1 });

  // GP-168: larger containment gate and a fitted field infirmary.
  // Spawn origin and the lying/wake contract remain the same; the bed moves into
  // the bay with its pad still at the original .68 m lying height.
  const gate = { x: (B.minX + B.maxX) / 2, z: B.maxZ - 1.4 };
  const bedAt = { x: B.minX + 3.15, z: B.minZ + 2.0 };
  const releaseProps = dressTrainingProps(T, { B, gate, bedAt, box, add, std,
    texture: (w,h,draw,repeat) => keep(canvasTex(T,w,h,draw,repeat)),
    sign, steel, steelLight, hazard, lampMat: buildLampMat, labels: opts.labels });
  if (releaseProps.worldUvMats) for (const [m, s] of releaseProps.worldUvMats) worldUvMats.set(m, s);
  g.add(releaseProps.gateFrame); applyWorldUVByMaterial(releaseProps.gateFrame, worldUvMats); bakeStatic(T, releaseProps.gateFrame);
  const gateLeafSolids = releaseProps.gateLeaves.map(leaf => {
    g.add(leaf); g.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(leaf);
    const solid = { minX: b.min.x, maxX: b.max.x, minY: b.min.y, maxY: b.max.y,
      minZ: b.min.z, maxZ: b.max.z, prop: true, containment: true };
    solids.push(solid); applyWorldUVByMaterial(leaf, worldUvMats); bakeStatic(T, leaf);
    return { solid, minX: solid.minX, maxX: solid.maxX };
  });
  const releaseGate = {
    leaves: releaseProps.gateLeaves, lamp: releaseProps.gateLamp,
    passage: { x: O.x + gate.x, wallZ: O.z + B.maxZ, spawnZ: O.z + B.maxZ + 3, halfWidth: 3.3, height: gateHeight },
    setState({ amount = 0, lit = false }) {
      releaseProps.gateLeaves.forEach((leaf, i) => {
        const dx = leaf.userData.side * 3.5 * amount;
        leaf.position.x = dx;
        gateLeafSolids[i].solid.minX = gateLeafSolids[i].minX + dx;
        gateLeafSolids[i].solid.maxX = gateLeafSolids[i].maxX + dx;
      });
      releaseProps.gateLamp.emissiveIntensity = lit ? 3.5 : .06;
      releaseProps.gateLamp.color.setHex(lit ? 0xffd36a : 0x65451b);
    }
  };
  releaseGate.setState({});

  // GB-159 (Jerry): the place has been used: worn paint, pocks and patches, grime and rust, tired props, a flickering
  // strip, faded signs (world/training-wear.js). Visual only; its decals stay out of the solids below.
  const wear = dressTrainingWear(T, { R, B, bedAt, add, box, std, lampMat, root: g,
    texture: (w, h, draw) => keep(canvasTex(T, w, h, draw)) });
  // GB-162 (Jerry): the build room's history: minigun holes, old blood, acid, burns, webs (world/training-build-wear.js).
  const buildWear = dressBuildWear(T, { B, D, gate, add, std, texture: (w, h, draw) => keep(canvasTex(T, w, h, draw)) });

  // --- CL-143: the hangar. The build room's walls go up to HANGAR_H; steel columns stand along them under roof trusses
  // every 6 m, with high-bay lamps hung from the trusses (lampMat: the light switch puts them out with the strips) and a
  // dark deck over all. The range's side of the shared wall carries on above the range in plain steel siding. Nothing
  // up there casts a shadow (the sun lights the floor through it, as it did with no roof).
  {
    const upper = HB - H;
    const face = add(sidingUv(new T.PlaneGeometry(R.maxZ - R.minZ, upper), R.maxZ - R.minZ, upper), siding, R.minX + 0.003, H + upper / 2, (R.minZ + R.maxZ) / 2);
    face.rotation.y = Math.PI / 2;
    const capRail = add(new T.BoxGeometry(0.3, 0.35, R.maxZ - R.minZ), steel, R.minX + 0.15, H + 0.18, (R.minZ + R.maxZ) / 2); capRail.receiveShadow = true;
    // CF-22 / AG-405: painted structural grey steel PBR (columns, trusses, purlins, trapezoidal deck)
    const roofSteel = std(pbr ? pbr.roofSteel.opts() : { color: 0x939ca2, roughness: 0.6, metalness: 0.2 });
    worldUvMats.set(roofSteel, 2.0);
    const noShadow = (m) => { m.castShadow = false; return m; };
    const TRUSS_Z = PILLAR_Z;
    const spanX = B.maxX - B.minX, midX = (B.minX + B.maxX) / 2, yLo = HB - 2.0, yHi = HB - 0.33;
    const webH = (yHi - 0.13) - (yLo + 0.13), webY = (yLo + yHi) / 2, bayW = 3.0 - 0.14, dTh = 0.11;
    const dAng = Math.atan2(bayW, webH);
    const diagLen = Math.min((bayW - 0.004 - dTh * Math.cos(dAng)) / Math.sin(dAng), (webH - 0.004 - dTh * Math.sin(dAng)) / Math.cos(dAng));
    const colTop = yLo - 0.13, colBot = 0.06, colH = colTop - colBot, colY = (colBot + colTop) / 2;
    // CF-22 (CH-3 #4): real built-up steel, not square boxes. The chords are T sections (a flange 26 cm wide, a 16 mm
    // stem in the truss plane), the verticals and diagonals pairs of angles either side of 16 mm gusset plates, each
    // gusset with two rows of bolt heads a face. Same envelope as before (the chords' 0.26 m, the webs' 0.14 m), roofSteel
    // only, so still one draw; nothing up here casts a shadow.
    // Each member (and each gusset with its bolts) is fused into one mesh first, so the cutaway files it as overhead
    // like the old boxes (training-cutaway.js classifies the room's direct meshes by their bounds) and it bakes with them.
    const fuse = (parts) => {   // parts: [geometry already placed]; one non-indexed geometry (position, normal, uv)
      const flat = parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; if (q !== p) p.dispose(); return q; });
      let n = 0; for (const q of flat) n += q.attributes.position.count;
      const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let at = 0;
      for (const q of flat) { pos.set(q.attributes.position.array, at * 3); nrm.set(q.attributes.normal.array, at * 3); uv.set(q.attributes.uv.array, at * 2); at += q.attributes.position.count; q.dispose(); }
      const out = new T.BufferGeometry();
      out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nrm, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2));
      return out;
    };
    const part = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z);
    const BOLT = 0.026, BOLT_T = 0.022;   // a head and its shank: from the gusset face out past the angles' (18 mm)
    const bolts = (out, xs, ys, z) => { for (const bx of xs) for (const by of ys) for (const s of [-1, 1]) out.push(part(BOLT, BOLT, BOLT_T, bx, by, z + s * (0.008 + BOLT_T / 2))); };
    const chord = (y, flangeUp, z) => {   // flange on the outside of the truss (bottom chord: under, top chord: over)
      const fy = y + (flangeUp ? 1 : -1) * 0.118;
      noShadow(box(spanX - 0.2, 0.024, 0.26, roofSteel, midX, fy, z));
      noShadow(box(spanX - 0.2, 0.236, 0.016, roofSteel, midX, y - (flangeUp ? 1 : -1) * 0.012, z));
    };
    const anglePair = (len, w, x, y, z, rz = 0) => {   // two angles back to back, 16 mm apart (the gusset between): legs 10-12 x 7 cm
      const out = [];
      for (const s of [-1, 1]) { out.push(part(w, len, 0.01, 0, 0, s * 0.013)); out.push(part(0.01, len, 0.07, w / 2 - 0.005, 0, s * 0.053)); }
      const geo = fuse(out); if (rz) geo.rotateZ(rz); geo.translate(x, y, z);
      noShadow(add(geo, roofSteel, 0, 0, 0));
    };
    const GUS_W = 0.46, GUS_H = 0.26;
    for (const z of TRUSS_Z) {
      // CL-146: chords stop 10 cm short of the walls, columns stand 6 cm off them and seat 0.0 mm on footplates under the truss.
      chord(yLo, false, z);
      chord(yHi, true, z);
      for (let x = B.minX + 1.5, k = 0; x < B.maxX - 1; x += 3, k++) {
        anglePair(webH, 0.12, x, webY, z);
        if (x + 3 < B.maxX - 0.5) anglePair(diagLen - 0.04, 0.1, x + 1.5, webY, z, (k % 2 ? 1 : -1) * dAng);
        // the gusset at each panel point, on the chord's stem, and its bolts
        for (const [gy, up] of [[yLo + 0.13 + GUS_H / 2, true], [yHi - 0.13 - GUS_H / 2, false]]) {
          const out = [part(GUS_W, GUS_H, 0.016, x, gy, z)];
          const by = up ? [gy - 0.03, gy + 0.07] : [gy - 0.07, gy + 0.03];
          bolts(out, [x - 0.16, x - 0.06, x + 0.06, x + 0.16], [by[up ? 0 : 1]], z);
          bolts(out, [x - 0.025, x + 0.025], [by[up ? 1 : 0]], z);
          noShadow(add(fuse(out), roofSteel, 0, 0, 0));
        }
      }
      // CF-22 (CH-3 #4): each column is a built-up H, not a black box: a 70 cm flange facing the room (the old face
      // plate's place and size: the perimeter fence's end clamps and CG-2's tally marks sit on it), a 42 cm flange 6 cm
      // off the wall, a web between them in the truss's plane; bearing plates across the channel where the crane rail
      // and its corbels butt on (z +-0.21, as before); a cap plate under the truss; a 6 cm base plate held by four
      // anchor bolts (washer, nut, thread). Painted with the trusses (roofSteel: grey steel; it casts its shadow as
      // before), the bolts bare steel. Same solid. Draws: roofSteel joins the two wall shells, the deck's own material
      // goes (one draw more in all, won back on the gate leaves).
      for (const [x, side] of [[B.minX + 0.30, 1], [B.maxX - 0.30, -1]]) {
        const capT = 0.025, shaftH = colH - capT, shaftY = colBot + shaftH / 2, at = (w) => x + side * (w - 0.30);   // at(w): w metres off the wall
        box(0.04, shaftH, 0.42, roofSteel, at(0.08), shaftY, z);    // wall flange
        box(0.04, shaftH, 0.70, roofSteel, at(0.60), shaftY, z);    // room flange
        box(0.48, shaftH, 0.025, roofSteel, at(0.34), shaftY, z);   // web
        for (const s of [-1, 1]) box(0.48, 0.8, 0.02, roofSteel, at(0.34), 8.35, z + s * 0.20);   // crane-rail bearing plates
        box(0.56, capT, 0.72, roofSteel, at(0.34), colTop - capT / 2, z);
        box(0.66, colBot, 0.9, roofSteel, at(0.37), colBot / 2, z);
        for (const aw of [0.2, 0.5]) for (const az of [z - 0.4, z + 0.4]) {
          const ax = at(aw);
          box(0.07, 0.006, 0.07, steel, ax, colBot + 0.003, az);
          add(new T.CylinderGeometry(0.026, 0.026, 0.03, 6), steel, ax, colBot + 0.006 + 0.015, az).castShadow = false;
          add(new T.CylinderGeometry(0.012, 0.012, 0.03, 8), steel, ax, colBot + 0.036 + 0.015, az);
        }
        solids.push({ minX: O.x + x - 0.27, maxX: O.x + x + 0.27, minY: O.y, maxY: O.y + HB, minZ: O.z + z - 0.35, maxZ: O.z + z + 0.35, column: true });
      }
      // high-bay lamps: drop rod seated 0.0 mm under bottom chord and 0.0 mm on hood top
      for (const x of [midX - 10, midX - 5, midX, midX + 5, midX + 10]) {
        // CG-1 (CF-20 #2): the hoods were 1.24 m across (a real high-bay is 0.40-0.56 m), so the hangar read small. Now
        // 0.50 m across and 0.35 m tall on the same drop rod; five a truss (every 5 m) instead of three keep the light.
        noShadow(box(0.05, 0.86, 0.05, roofSteel, x, yLo - 0.56, z));
        const hood = add(new T.CylinderGeometry(0.10, 0.25, 0.35, 16, 1, true), roofSteel, x, yLo - 0.99 - 0.175, z);
        hood.castShadow = false;
        const lens = add(new T.CircleGeometry(0.235, 16), buildLampMat, x, yLo - 0.99 - 0.33, z); lens.rotation.x = Math.PI / 2;
      }
    }
    // purlins seated 0.0 mm on top chord [HB-0.20, HB], and the deck over them
    // CF-22 (CH-3 #5): purlins are C channels (a 2 cm web, 7 cm flanges), and the deck is trapezoidal steel sheet in the
    // trusses' grey: the flat pans 5 cm up, the 12 cm troughs every 30 cm resting on the purlins, running across them,
    // so it reads as a roof, not a black void (the deck's own dark material is gone: one material fewer up there).
    const purlinL = B.maxZ - B.minZ - 0.2, purlinZ = (B.minZ + B.maxZ) / 2;
    for (let x = B.minX + 2; x < B.maxX - 1; x += 4) {
      noShadow(box(0.02, 0.2, purlinL, roofSteel, x - 0.07, yHi + 0.23, purlinZ));
      for (const fy of [yHi + 0.14, yHi + 0.32]) noShadow(box(0.07, 0.02, purlinL, roofSteel, x - 0.025, fy, purlinZ));
    }
    const deck = add(new T.PlaneGeometry(spanX, B.maxZ - B.minZ), roofSteel, midX, HB + 0.052, (B.minZ + B.maxZ) / 2);
    deck.rotation.x = Math.PI / 2; deck.castShadow = false;
    const troughs = []; for (let z = B.minZ + 0.15; z < B.maxZ - 0.1; z += 0.3) troughs.push(part(spanX, 0.05, 0.12, midX, HB + 0.027, z));
    noShadow(add(fuse(troughs), roofSteel, 0, 0, 0));   // one mesh: the cutaway files it overhead with the deck
    // crane rails spanning cleanly between column bays along both long walls at y = 8.5 m
    // CG-1 (D-218): the rails were hung in the air (7 cm off the siding, 14 cm short of each pillar). Now each run
    // butts onto the pillar faces (and the end walls' siding), sits on a corbel bolted to the pillar under each end,
    // and is clipped to the siding mid-bay. Rail 0.30 x 0.42 m at 8.5 m; corbels 0.24 m; clips span the 14.5 cm gap.
    const SIDING = 0.025, COL_FACE = 0.21, railBot = 8.5 - 0.21;
    const zStops = [B.minZ + SIDING, ...TRUSS_Z, B.maxZ - SIDING];
    for (const [x, side] of [[B.minX + 0.2, 1], [B.maxX - 0.2, -1]]) {
      const rx = x + side * 0.12;
      for (let k = 0; k < zStops.length - 1; k++) {
        const atColA = k > 0, atColB = k + 1 < zStops.length - 1;
        const za = atColA ? zStops[k] + COL_FACE : zStops[k], zb = atColB ? zStops[k + 1] - COL_FACE : zStops[k + 1];
        noShadow(box(0.3, 0.42, zb - za, steel, rx, 8.5, (za + zb) / 2));
        if (atColA) noShadow(box(0.3, 0.24, 0.24, steel, rx, railBot - 0.12, za + 0.12));
        if (atColB) noShadow(box(0.3, 0.24, 0.24, steel, rx, railBot - 0.12, zb - 0.12));
        const wallX = side > 0 ? B.minX : B.maxX, clipW = Math.abs(rx - side * 0.15 - (wallX + side * SIDING));
        noShadow(box(clipW, 0.16, 0.12, steel, wallX + side * (SIDING + clipW / 2), 8.5, (za + zb) / 2));
      }
    }
  }

  // --- CL-143: where he may build. The game's lattice is world-aligned (squares of `grid`, centred on its multiples),
  // so the squares are found here in world indices. Inside the build room's walls, less: the zombie gate's apron (every
  // square whose middle is within GATE_CLEAR squares of the gate's opening, painted in hazard stripes), the doorway's
  // apron, the floor in front of the panel and the skull window, and the infirmary bay.
  const grid = opts.grid || 2;
  const offset = opts.gridOffset || 0;
  const gc = (i) => i * grid + offset;
  const minGX = Math.ceil((O.x + B.minX + grid / 2 - offset) / grid), maxGX = Math.floor((O.x + B.maxX - grid / 2 - offset) / grid);
  const minGZ = Math.ceil((O.z + B.minZ + grid / 2 - offset) / grid), maxGZ = Math.floor((O.z + B.maxZ - grid / 2 - offset) / grid);
  const gateHalf = 4.0, clear = TRAINING.GATE_CLEAR * grid + 0.01;
  const gateDist = (wx, wz) => {   // from a world point to the gate's opening (a segment along the far wall)
    const lx = wx - O.x, lz = wz - O.z;
    const dx = Math.max(0, Math.abs(lx - gate.x) - gateHalf), dz = Math.max(0, B.maxZ - lz);
    return Math.hypot(dx, dz);
  };
  const inLocalRect = (gx, gz, x0, x1, z0, z1) => { const lx = gc(gx) - O.x, lz = gc(gz) - O.z, h = grid / 2; return lx + h > x0 && lx - h < x1 && lz + h > z0 && lz - h < z1; };
  const BAY = { minX: B.minX, maxX: bedAt.x + 0.8 + 3.75, minZ: B.minZ, maxZ: B.minZ + 4.15 };
  const refusal = (gx, gz) => {
    if (gx < minGX || gx > maxGX || gz < minGZ || gz > maxGZ) return 'outside';
    if (gateDist(gc(gx), gc(gz)) <= clear) return 'gate';
    // Jerry GP-19897: reserve one whole cell along every wall, including access openings.
    const x = gc(gx), z = gc(gz), h = grid / 2;
    if (solids.some(s => s.column && x + h > s.minX && x - h < s.maxX && z + h > s.minZ && z - h < s.maxZ)) return 'column';
    if (inLocalRect(gx, gz, B.maxX - grid - 0.1, B.maxX, D.minZ - 0.3, D.maxZ + 0.3)) return 'door';
    if (inLocalRect(gx, gz, B.minX, B.minX + 1.8, -5.2, 4.4)) return 'terminal';
    if (inLocalRect(gx, gz, BAY.minX, BAY.maxX, BAY.minZ, BAY.maxZ)) return 'infirmary';
    if (isTrainingBorderCell({minGX,maxGX,minGZ,maxGZ}, gx, gz)) return 'outside';
    return null;
  };
  const gateCells = [];
  for (let gx = minGX; gx <= maxGX; gx++) for (let gz = minGZ; gz <= maxGZ; gz++) if (refusal(gx, gz) === 'gate') gateCells.push([gx, gz]);
  const medicalPaint = {minX:O.x+BAY.minX,maxX:O.x+BAY.maxX,minZ:O.z+BAY.minZ,maxZ:O.z+BAY.maxZ};
  const paintGrid = {grid,offset,minGX,maxGX,minGZ,maxGZ};
  const paintCells = gateCells.slice(), painted = new Set(gateCells.map(([x,z])=>x+','+z));
  for(let gx=minGX;gx<=maxGX;gx++)for(let gz=minGZ;gz<=maxGZ;gz++) {
    if(!isTrainingBorderCell(paintGrid,gx,gz)||!trainingBorderPaintRect(paintGrid,gx,gz,medicalPaint)||painted.has(gx+','+gz))continue;
    paintCells.push([gx,gz]);
  }
  // The paint: one mesh of squares, the stripes running on across them (their uvs are world positions), a yellow
  // edge round the outside of the zone, and NO BUILD ZONE stencilled in front of it.
  if (paintCells.length) {
    const stripeTex = pbr ? null : keep(canvasTex(T, 128, 128, (c, w) => {
      c.fillStyle = '#f2c418'; c.fillRect(0, 0, w, w);
      c.fillStyle = '#17191b';
      for (let k = -2; k < 3; k++) { c.beginPath(); c.moveTo(k * 64, 0); c.lineTo(k * 64 + 32, 0); c.lineTo(k * 64 + 32 + w, w); c.lineTo(k * 64 + w, w); c.closePath(); c.fill(); }
      c.fillStyle = 'rgba(0,0,0,0.07)'; let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 260; i++) c.fillRect(r() * w, r() * w, 2, 2);   // scuffed paint
    }, [1, 1]));
    const PERIOD = 1.2;   // metres per repeat of the canvas (two stripes)
    const pos = [], uv = [], idx = [];
    const inZone = new Set(paintCells.map(([a, b]) => a + ',' + b));
    const inset = 0.035;   // a hair of bare floor between squares: the lattice still reads through the paint
    const paintEdge = (gx, gz, dx, dz) => {
      const nx = gx + dx, nz = gz + dz;
      return nx >= minGX && nx <= maxGX && nz >= minGZ && nz <= maxGZ && !inZone.has(nx + ',' + nz);
    };
    for (const [gx, gz] of paintCells) {
      const rect = trainingBorderPaintRect(paintGrid,gx,gz,isTrainingBorderCell(paintGrid,gx,gz)?medicalPaint:null,inset);
      if (!rect) continue;
      let x0=rect.x0-O.x,x1=rect.x1-O.x,z0=rect.z0-O.z,z1=rect.z1-O.z;
      // GP-20139: opaque yellow edging covers these strips. Do not leave a second,
      // coplanar striped face beneath it: different depth offsets still zip on WebGPU.
      // A 10-micrometre seam prevents Float32 bake rounding from recreating overlap.
      const trim = .10001;
      if (paintEdge(gx,gz,-1,0)) x0 += trim;
      if (paintEdge(gx,gz,1,0)) x1 -= trim;
      if (paintEdge(gx,gz,0,-1)) z0 += trim;
      if (paintEdge(gx,gz,0,1)) z1 -= trim;
      if (x1 <= x0 || z1 <= z0) continue;
      const k = pos.length / 3;
      for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) { pos.push(x, 0.001, z); uv.push((x + O.x) / PERIOD, -(z + O.z) / PERIOD); }
      idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    if (stripeTex) { stripeTex.wrapS = stripeTex.wrapT = T.RepeatWrapping; stripeTex.repeat.set(1, 1); }
    const paint = add(geo, std(pbr ? pbr.hazardFloor.opts({ extra: { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 } })
      : { color: 0xffffff, map: stripeTex, roughness: 0.62, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 0, 0, 0);
    paint.receiveShadow = true; paint.name = 'training-no-build-paint'; (paint.userData || (paint.userData = {})).isDecal = true;
    // the outer edge: a yellow line along every side of a zone square that meets a buildable square
    // CJ-1: the edge lies on the stripe paint (both on the floor plane): a polygonOffset step above it, not the same one.
    const edgeMat = std(pbr ? pbr.floorYellow.opts({ extra: { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } })
      : { color: 0xf2c418, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    worldUvMats.set(edgeMat, [1.6, 0.28]);
    for (const [gx, gz] of paintCells) {
      const rect=trainingBorderPaintRect(paintGrid,gx,gz,isTrainingBorderCell(paintGrid,gx,gz)?medicalPaint:null,inset);
      if(!rect)continue;
      const cx=(rect.x0+rect.x1)/2-O.x,cz=(rect.z0+rect.z1)/2-O.z,w=rect.x1-rect.x0,d=rect.z1-rect.z0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ngx = gx + dx, ngz = gz + dz;
        if (!paintEdge(gx, gz, dx, dz)) continue;
        const e = add(new T.PlaneGeometry(dx ? Math.min(.1,w) : w, dx ? d : Math.min(.1,d)), edgeMat, cx + dx * Math.max(0,w/2-.05), 0.001, cz + dz * Math.max(0,d/2-.05));
        e.rotation.x = -Math.PI / 2; e.receiveShadow = true;
      }
    }
    // the stencil, on the bare floor just in front of the zone's nearest row, read from the room
    let frontZ = Infinity; for (const [, gz] of gateCells) frontZ = Math.min(frontZ, gc(gz) - O.z - grid / 2);
    const st = sign((opts.labels && opts.labels.noBuild) || 'NO BUILD ZONE', 5.2, 1.3, gate.x, 0.001, frontZ - 0.85, 0, { color: '#d9a90f', size: 170 });
    floorPaintMaterial(st.material);
    st.rotation.set(-Math.PI / 2, 0, Math.PI);   // read from the room, as the firing line's stencil is from behind it
  }

  // --- light
  // (No lamps of its own: the noon sun and the sky already light white tiles to a glare.)
  // CU-94 (Jerry): a switch that turns the lights off. On the range side of the doorway, beside its frame at hand
  // height, where he passes it on his way to the build room. Off, the lamp strips go out, the lever drops and a lamp
  // on the plate glows so he can find it again in the dark; the game brings the night's light down (index.html).
  const lights = [];
  // CG-7 (Jerry D-229: "Move this prop somewhere else. Put the light switch here instead."): the switch is on the range's
  // back wall now, centred where the cracked monitor hung (x -2.2), at the same hand height; the monitor went to the east
  // wall (training-wear.js WEAR.STORY.MONITOR).
  const SW = { x: -2.2, y: 1.15, z: R.minZ };   // CG-1 (CF-20 #10): the switch box 0.94-1.36 m (was 1.19-1.61)
  const sw = new T.Group(); sw.position.set(SW.x, SW.y, SW.z); sw.rotation.y = 0; g.add(sw);   // its +z faces into the range
  // CH-3 #18 (Claude 7 on the Director's loan; the native walk: "placeholder boxes"): a real industrial switch box, built in
  // world/training-kitprops.js (powder-coated box, door, hinges, latches, guarded toggle, a round pilot lamp, its conduit
  // up the wall to a pull box). Its back still 0.4 mm off the wall plane; the lever and the lamp are still ours to drive.
  const pilotMat = std({ color: 0x2a2620, emissive: 0xffa640, emissiveIntensity: 0, roughness: 0.4 });
  const swPlate = std(pbr ? pbr.medicalEnamel.opts({ color: 0xf0f2f4 }) : { color: 0xe9ecee, roughness: 0.5 });
  const swDark = std(pbr ? pbr.steelDark.opts({ color: 0x52585c }) : { color: 0x16181a, roughness: 0.6 });
  worldUvMats.set(swPlate, 0.4); worldUvMats.set(swDark, 0.5);
  const swMat = { yellow, plate: swPlate, steel, steelLight, dark: swDark, pilot: pilotMat };
  const swBox = buildKitProp(T, 'lightSwitch', { mk: (geo, s, x, y, z, parent) => { const m = add(geo, swMat[s], x, y, z, parent); m.castShadow = true; m.receiveShadow = true; return m; }, opts: { up: H - 0.6 - SW.y } });   // its conduit runs up to a pull box at 5.4 m (clear of the wall tops)
  sw.add(swBox);
  const lever = swBox.userData.lever || new T.Group();   // (a stand-in THREE in the canvas tests builds nothing: an empty lever)
  if (!lever.parent) { lever.name = 'training-light-switch-lever'; lever.position.set(0, -0.03, 0.09); sw.add(lever); }
  sign('LIGHTS', 0.6, 0.15, SW.x, SW.y + 0.34, R.minZ + 0.03, 0, { bg: '#16181a', color: '#f2c418', size: 170 });
  let lit = true, cutaway = null;
  // CJ-5 (CH-3 #20, Jerry's audit: "Lamps off: everything one dull grey-blue"): EXIT signs over the doorway and battery
  // emergency lamps on the walls, emissive only (no new lights), two shared materials the bake merges to two draws.
  const emergency = dressEmergency(T, { R, B, D, POCKET, add, std, keep, steelLight, root: g });
  function setLights(on) {
    lit = !!on;
    emergency.setLit(lit);
    lampMat.emissiveIntensity = lit ? 0.8 : 0;
    lampMat.color.setHex(lit ? 0xffffff : 0x50565b);   // white with no glow still catches the night's light like a lit tube
    buildLampMat.color.copy(lampMat.color);buildLampMat.emissiveIntensity=lampMat.emissiveIntensity;
    pilotMat.emissiveIntensity = lit ? 0 : 1.8;
    wear.update(0, lit);   // GB-161: the flickering strip goes out (and comes back) with the rest at once
    lever.rotation.x = lit ? -0.5 : 0.5;   // up is on
    cutaway?.syncMaterials();
    return lit;
  }
  setLights(true);

  // --- where things go (world coordinates)
  const station = (x, z, yaw, depth = 1.0) => ({ x: O.x + x, y: O.y, z: O.z + z, yaw, front: W(x + Math.sin(yaw) * depth, z + Math.cos(yaw) * depth) });
  const stations = {
    cif: station(R.maxX - 0.02, -10.2, -Math.PI / 2),
    kiosk: station(R.maxX - 0.02, -6.6, -Math.PI / 2),
    armory: station(R.maxX - 0.02, -3.0, -Math.PI / 2),
    hqPanel: station(B.minX + 0.02, 3.0, Math.PI / 2, 1.2),   // left of the skull window when facing it
    skullWindow: station(B.minX + 0.02, -3.0, Math.PI / 2, 1.2),
    lightSwitch: station(SW.x, SW.z + 0.02, 0, 0.8)
  };
  const inset = 0.42;
  // CB-292 / J126: the wall solids project 0.3 m into these two rooms. A 0.8 m
  // centre inset leaves 0.5 m from the solid face for the marine's 0.42 m body
  // and his moving limbs. Keep a small overlap through the actual door opening.
  const wallWalkInset = 0.8, doorwayOverlap = 0.05;
  const walk = [
    { minX: O.x + R.minX + wallWalkInset, maxX: O.x + R.maxX - 0.8, minZ: O.z + R.minZ + wallWalkInset, maxZ: O.z + firingLine.front - 0.85 },
    { minX: O.x + B.maxX - wallWalkInset - doorwayOverlap, maxX: O.x + R.minX + wallWalkInset + doorwayOverlap, minZ: O.z + D.minZ + inset, maxZ: O.z + D.maxZ - inset },
    { minX: O.x + B.minX + 0.8, maxX: O.x + B.maxX - wallWalkInset, minZ: O.z + B.minZ + wallWalkInset, maxZ: O.z + B.maxZ - 1.15 }
  ];
  const zombieRect = { minX: O.x + B.minX + 0.95, maxX: O.x + B.maxX - 0.75, minZ: O.z + B.minZ + 0.6, maxZ: O.z + B.maxZ - 0.9 };
  // CL-136: the room's inner wall faces, for a body to keep its own radius off (trainingKeepZombie, the corpses).
  const zombieRoom = { minX: O.x + B.minX, maxX: O.x + B.maxX, minZ: O.z + B.minZ, maxZ: O.z + B.maxZ };
  // Lying on the bed: his feet at the foot end (+x), his head on the pillow (-x).
  const bed = { x: O.x + bedAt.x + 0.98, y: O.y + 0.68, z: O.z + bedAt.z, yaw: Math.PI / 2, centre: W(bedAt.x, bedAt.z), stand: { ...W(bedAt.x + 0.6, bedAt.z + 1.3), yaw: 0 } };
  const throat = { x: O.x + B.minX - 0.26, y: O.y + 1.6, z: O.z - 3.0 };

  // CL-158 (Jerry: "not enough collision detection for lasers in training area, it tends to go through a lot of things"):
  // the props stop the beam, the rounds and the aim too, not only the walls, plates and columns: the bed, the gate, the
  // shelving, the panel, the door frame and keypads ... each still mesh's box, up to head height (the roof and its lamps
  // stay out of the aim ray coming down from the camera).
  const allDestructSpecs = [...(releaseProps.destructSpecs || []), ...(wear.destructSpecs || [])];
  {
    const notProps = new Set([firingLine.group, voidBox, outer, rangeFloor, buildFloor, shutter, lever, passageFloor, passageRoof, ...releaseProps.gateLeaves, ...targets.map((t) => t.pivot), ...wear.decals, ...wear.dead, wear.flicker, ...buildWear.decals, ...emergency.washes]);   // CJ-5: the light washes are not props
    if (wear.door) { notProps.add(wear.door.pivot); wear.door.pivot.traverse((o) => notProps.add(o)); }   // GB-161: its own solid, it moves
    // CG-7 (D-226): one moving box per breakable kit prop; its baked mesh leaves the static trace.
    if (wear.kitProps) for (const e of wear.kitProps.entries) notProps.add(e.group);
    // AH-12: destructible props manage their own dynamic solids so exactLayer never holds ghost triangles after breakage.
    for (const sp of allDestructSpecs) {
      if (sp.meshes) for (const m of sp.meshes) notProps.add(m);
      if (sp.extraMeshes) for (const v of Object.values(sp.extraMeshes)) if (Array.isArray(v)) for (const item of v) {
        if (Array.isArray(item)) for (const m of item) notProps.add(m); else notProps.add(item);
      }
    }
    for (const s of propSolids(T, g, O.y, { skip: (o) => notProps.has(o) })) solids.push(s);
    if (wear.kitProps) solids.push(...wear.kitProps.solids);
  }
  // GB-161 (Jerry: he walked through the lockers): the bank blocks him (keepOut, index.html trainingKeepPlayer), and the
  // dented door is a solid that follows its swing, so a round finds it (hitDoor) as a blade does (cutDoor).
  const wearBlock = wear.blockers.map((b) => ({ minX: b.minX + O.x, maxX: b.maxX + O.x, minY: b.minY + O.y, maxY: b.maxY + O.y, minZ: b.minZ + O.z, maxZ: b.maxZ + O.z, prop: true, block: true }));
  const lockerSolid = wear.door ? { lockerDoor: true, prop: true } : null;
  const syncDoor = () => { if (!lockerSolid) return; const s = wear.door.solid; lockerSolid.minX = s.minX + O.x; lockerSolid.maxX = s.maxX + O.x; lockerSolid.minY = s.minY + O.y; lockerSolid.maxY = s.maxY + O.y; lockerSolid.minZ = s.minZ + O.z; lockerSolid.maxZ = s.maxZ + O.z; };
  syncDoor(); solids.push(...wearBlock); if (lockerSolid) solids.push(lockerSolid);
  // GB-163 (Jerry: "Remove bullet decals from lockers, add sparks instead"): the lockers and the door are steel; a round there
  // sparks (index.html trainingRound) and leaves no hole.
  { const k = wear.blockers[0]; for (const s of solids) if (!s.wall && s.minX >= O.x + k.minX - 0.05 && s.maxX <= O.x + k.maxX + 0.05 && s.minZ >= O.z + k.minZ - 0.05 && s.maxZ <= O.z + k.maxZ + 0.1) s.metal = true;
    for (const s of wearBlock) s.metal = true; if (lockerSolid) lockerSolid.metal = true; }
  let lastKeep = null;
  function keepOut(p, r) {   // world point, his radius -> { x, z, moved }
    let x = p.x, z = p.z, moved = false;
    for (const b of wearBlock) {
      if (p.y > b.maxY || x < b.minX - r || x > b.maxX + r || z < b.minZ - r || z > b.maxZ + r) continue;
      const dl = x - (b.minX - r), dr = b.maxX + r - x, df = b.maxZ + r - z, m = Math.min(dl, dr, df);   // never back into the wall behind it
      if (m === dl) x = b.minX - r; else if (m === dr) x = b.maxX + r; else z = b.maxZ + r;
      moved = true;
    }
    if (wear.door) wear.bumpDoor(x - O.x, z - O.z, r, lastKeep ? x - lastKeep.x : 0, lastKeep ? z - lastKeep.z : 0);
    lastKeep = { x, z };
    return { x, z, moved };
  }
  const hitDoor = (point, dir, strength = 3.2) => (wear.door ? wear.pushDoor(point.x - O.x, point.z - O.z, dir.x, dir.z, strength) : 0);
  function cutDoor(from, dir, reach) {   // a blade swung from `from` along `dir` (world): true when it caught the door
    if (!wear.door) return false;
    const d = wear.door, cx = O.x + d.hx + Math.cos(d.angle) * d.w * 0.6, cz = O.z + d.hz + Math.sin(d.angle) * d.w * 0.6;
    const dx = cx - from.x, dz = cz - from.z, len = Math.hypot(dx, dz), dl = Math.hypot(dir.x, dir.z) || 1;
    if (len > reach + 0.35 || (dx * dir.x + dz * dir.z) / (len * dl || 1) < 0.3) return false;
    wear.pushDoor(cx - O.x, cz - O.z, dir.x, dir.z, 2.4); return true;
  }

  // CL-117: the still parts (frames, pegs, the bed, the gate's bars, the lamp strips) baked to one mesh per material;
  // the targets' pivots keep their own meshes, they turn.
  if (wear && wear.worldUvMats) for (const [m, s] of wear.worldUvMats) worldUvMats.set(m, s);
  applyWorldUVByMaterial(g, worldUvMats);
  // AH-12: build destructible prop loose/broken geometries AFTER world UVs are projected and BEFORE bakeStatic merges them.
  let destructibles = null;
  if (T.Box3 && T.Matrix4 && T.Matrix3 && T.BufferGeometry && T.BufferAttribute && T.Quaternion && T.Vector3 && allDestructSpecs.length) {
    const medMat = { minX: bedAt.x + 0.82 - 3.6, maxX: bedAt.x + 0.82 + 3.6, minZ: B.minZ + 0.08 + 2.0775 - 1.92, maxZ: B.minZ + 0.08 + 2.0775 + 1.92, y: 0.02 };
    const medTop = { minX: bedAt.x + 2.72 - 0.89, maxX: bedAt.x + 2.72 + 0.89, minZ: B.minZ + 0.08 + 0.225, maxZ: B.minZ + 0.08 + 0.875, y: 0.90 };
    const bedTop = { minX: bedAt.x - 1.0, maxX: bedAt.x + 1.0, minZ: bedAt.z - 0.47, maxZ: bedAt.z + 0.47, y: 0.68 };
    const cotTop = { minX: bedAt.x + 3.25 - 0.92, maxX: bedAt.x + 3.25 + 0.92, minZ: B.minZ + 3.25 - 0.35, maxZ: B.minZ + 3.25 + 0.35, y: 0.48 };
    const dBlocks = [
      { minX: R.minX, maxX: R.maxX, minZ: 0.18, maxZ: 0.82, maxY: 0.79 },
      { ...medTop, maxY: 0.86, sides: true },
      { minX: bedAt.x - 1.02, maxX: bedAt.x + 1.02, minZ: bedAt.z - 0.48, maxZ: bedAt.z + 0.48, maxY: 0.64, sides: true },
      { minX: bedAt.x + 3.25 - 0.94, maxX: bedAt.x + 3.25 + 0.94, minZ: B.minZ + 3.25 - 0.36, maxZ: B.minZ + 3.25 + 0.36, maxY: 0.44, sides: true },
      ...(wear.blockers || []).map((b) => ({ ...b, sides: true }))
    ];
    destructibles = createTrainingDestructibles(T, {
      root: g, origin: O, props: allDestructSpecs,
      surfaces: [{ minX: R.minX, maxX: R.maxX, minZ: 0.18, maxZ: 0.82, y: 0.86 }, medMat, medTop, bedTop, cotTop],
      blocks: dBlocks, rooms: [R, B]
    });
    solids.push(...destructibles.solids);
  }
  const pivots = new Set([...targets.map((t) => t.pivot), ...releaseProps.gateLeaves]);
  cutaway = partitionTrainingShell(T, g, new T.Vector3(O.x, O.y, O.z));
  const baked = bakeStatic(T, g, { skip: (o) => pivots.has(o) });
  if (destructibles) destructibles.bind();
  // AH-14: Freeze local matrices on purely static baked meshes so updateSceneMatrices skips 200+ static walls/trusses/floors each frame.
  {
    const dynamicRoots = new Set([
      ...targets.map((t) => t.pivot),
      ...releaseProps.gateLeaves,
      shutter,
      lever,
      wear.flicker,
      ...(wear.door ? [wear.door.pivot] : []),
      ...(wear.kitProps ? wear.kitProps.entries.map((e) => e.group) : []),
    ].filter(Boolean));
    if (destructibles) {
      g.traverse((o) => {
        if (o.name && /^training-destruct/.test(o.name)) dynamicRoots.add(o);
      });
    }
    const freezeStatic = (node) => {
      if (!node || dynamicRoots.has(node)) return;
      if (node !== g && (node.isMesh || (node.name && /^training-cutaway-/.test(node.name)))) {
        node.updateMatrix();
        node.matrixAutoUpdate = false;
      }
      if (node.children) for (let i = 0; i < node.children.length; i++) freezeStatic(node.children[i]);
    };
    g.updateMatrixWorld(true);
    freezeStatic(g);
  }

  return {
    group: g, origin: O, cutaway, floorY: O.y, buildLamp: buildLampMat, walk, zombieRect, zombieRoom, solids, stations, bed, throat, lights, baked, securityDoor, releaseGate,
    // CU-120 (Jerry): two feet behind the firing line, facing downrange (+z), not the back wall.
    gate: W(gate.x, gate.z), spawn: { ...W(0, TRAINING.LINE_Z - 0.61), yaw: 0 },
    build: { grid, offset, minGX, maxGX, minGZ, maxGZ, refusal, gateCells },   // CL-143
    wear: { parts: wear.parts, flicker: wear.flicker, dead: wear.dead, door: wear.door, doorSolid: lockerSolid, hitDoor, cutDoor, kickDoor: wear.kickDoor }, kitProps: wear.kitProps, destructibles,   // GB-159, GB-161, AH-12
    keepOut,   // GB-161
    buildWear: { parts: buildWear.parts, mounts: buildWear.mounts },   // GB-162
    targets, hitTarget, resetTargets, update: (dt) => { update(dt); wear.update(dt, lit); syncDoor(); }, setLights, lightsOn: () => lit, plateUV, onPlate, scoreHit,   // CL-144
    // Inside the training ground's footprint (and a margin): the floor height, for every body and drop.
    floorAt: (x, z) => (Math.abs(x - (O.x + 9)) < 75 && Math.abs(z - (O.z + 9)) < 75 ? O.y : null),
    dispose() {
      if (destructibles) destructibles.dispose();
      cutaway.dispose();
      if (g.parent) g.parent.remove(g);
      for (const x of owned) { try { x.dispose && x.dispose(); } catch (_) {} }
      owned.length = 0;
    }
  };
}
     

// CL-115 (Jerry, 2026-10-02): the Training Ground. A white-tiled firing range with a yellow firing line and five
// pop-up targets that drop when shot and stand back up, the HQ's terminals on its left wall (the CIF, the supply
// terminal and the Armory: copies of the HQ's own, so they change when those do), and through a doorway on the right
// the build room: the HQ panel (it calls zombies in), the skull window, and an infirmary bed in the corner where he
// wakes up if he dies here. Zombies stay in the build room. Building there comes later.
//
// Everything sits far outside the map (no tree, rock or water reaches it) in its own dark box, so the world never
// shows and nothing of it gets in the way. This module only builds the place and keeps the targets; the game wires
// it in (index.html, CL-115).
//
//   buildTrainingGround(THREE, opts?) -> {
//     group, origin, floorY,
//     walk: [rect], zombieRect: rect, solids: [box],             world coordinates; rect = { minX, maxX, minZ, maxZ }
//     stations: { cif, kiosk, armory, hqPanel, skullWindow }     each { x, y, z, yaw, front: { x, z } } (world)
//     throat, bed: { x, y, z, yaw, stand: { x, z, yaw } }, gate: { x, z }, spawn: { x, z, yaw },
//     targets: [{ lane, range, state, hits, box, pivot }], hitTarget(i), resetTargets(), update(dt), dispose()
//   }
//   clampToRects(rects, x, z) -> { x, z, moved }   keeps a point inside the union of rects (nearest edge if outside)
//   segmentBox(a, b, box) -> t in [0, 1] or null   where the segment a->b first enters the box

export const TRAINING = Object.freeze({
  ORIGIN: Object.freeze({ x: 0, y: -200, z: -640 }),   // past the map's edge (the land ends at 220 m)
  WALL_H: 6,
  RANGE: Object.freeze({ minX: -8, maxX: 8, minZ: -12, maxZ: 30 }),        // the firing range
  // Facing downrange (+z) his left is +x: the terminals are on the range's +x wall, the build room is on his right (-x).
  BUILD: Object.freeze({ minX: -26, maxX: -8, minZ: -12, maxZ: 8 }),       // the build room
  DOOR: Object.freeze({ x: -8, minZ: -9.5, maxZ: -6.5 }),                  // between them
  LINE_Z: 0,                                                             // the yellow firing line
  LANES: Object.freeze([6, 3, 0, -3, -6]),                               // lane 1 on his left
  RANGES: Object.freeze([8, 12, 16, 20, 25]),                            // metres past the line, lane 1 nearest
  DOWN_S: 2.6,                                                           // how long a shot target stays down
  FALL_S: 0.16, RISE_S: 0.45,
  FAR: 150                                                               // the camera's reach while here
});

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
export function segmentBox(a, b, box) {
  let t0 = 0, t1 = 1;
  for (const [p, q, lo, hi] of [[a.x, b.x, box.minX, box.maxX], [a.y, b.y, box.minY, box.maxY], [a.z, b.z, box.minZ, box.maxZ]]) {
    const d = q - p;
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
    let u = (lo - p) / d, v = (hi - p) / d;
    if (u > v) { const s = u; u = v; v = s; }
    if (u > t0) t0 = u;
    if (v < t1) t1 = v;
    if (t0 > t1) return null;
  }
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
function tileTex(T, base, grout, repeat, speck = 0.04) {
  return canvasTex(T, 256, 256, (c, w) => {
    c.fillStyle = base; c.fillRect(0, 0, w, w);
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 380; i++) { c.fillStyle = `rgba(0,0,0,${speck * rnd()})`; c.fillRect(rnd() * w, rnd() * w, 2, 2); }
    c.fillStyle = grout;
    for (let k = 0; k <= 4; k++) { c.fillRect(k * 64 - 1.5, 0, 3, w); c.fillRect(0, k * 64 - 1.5, w, 3); }
  }, repeat);
}

function textTex(T, text, opts = {}) {
  const w = opts.w || 1024, h = opts.h || 256;
  return canvasTex(T, w, h, (c) => {
    if (opts.bg) { c.fillStyle = opts.bg; c.fillRect(0, 0, w, h); }
    c.fillStyle = opts.color || '#1c1f22'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${opts.weight || 'bold'} ${opts.size || 150}px Impact, "Arial Black", sans-serif`;
    c.fillText(text, w / 2, h / 2 + (opts.dy || 0));
  });
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

  // --- materials
  const tileW = keep(tileTex(T, '#dfe3e5', '#b3babf', [1, 1]));
  const floorMat = (w, d, base, grout) => { const t = keep(tileTex(T, base, grout, [w / 4, d / 4])); return std({ color: 0xffffff, map: t, roughness: 0.55, metalness: 0.02 }); };
  const wallMat = (len) => { const t = tileW ? tileW.clone() : null; if (t) { keep(t); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(len / 4, H / 4); }
    return std({ color: 0xffffff, map: t, roughness: 0.6 }); };
  const steel = std({ color: 0x3a4046, roughness: 0.45, metalness: 0.6 });
  const steelLight = std({ color: 0x9aa2a8, roughness: 0.35, metalness: 0.7 });
  const yellow = std({ color: 0xe8b50c, roughness: 0.5 });
  const hazardTex = keep(canvasTex(T, 256, 32, (c, w, h) => { c.fillStyle = '#f2c418'; c.fillRect(0, 0, w, h); c.fillStyle = '#16181a';
    for (let x = -h; x < w + h; x += 32) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 16, h); c.lineTo(x + 16 + h, 0); c.lineTo(x + h, 0); c.fill(); } }, [1, 1]));
  const hazard = std({ color: 0xffffff, map: hazardTex, roughness: 0.55 });
  const lampMat = std({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0.8, roughness: 0.3 });
  const band = std({ color: 0x2f6e8e, roughness: 0.6 });

  // --- the dark box it all sits in (the world never shows) and the floors
  const voidMat = keep(new T.MeshBasicMaterial({ color: 0x0b0d0f, side: T.BackSide }));   // unlit: it fills the screen behind everything (CL-116)
  const voidBox = add(new T.BoxGeometry(150, 70, 150), voidMat, 9, 20, 9); voidBox.name = 'training-void';
  const outer = add(new T.PlaneGeometry(150, 150), keep(new T.MeshBasicMaterial({ color: 0x15181b })), 9, -0.02, 9); outer.rotation.x = -Math.PI / 2;
  const rangeFloor = add(new T.PlaneGeometry(R.maxX - R.minX, R.maxZ - R.minZ), floorMat(R.maxX - R.minX, R.maxZ - R.minZ, '#c9ced1', '#9aa2a7'),
    (R.minX + R.maxX) / 2, 0, (R.minZ + R.maxZ) / 2);
  rangeFloor.rotation.x = -Math.PI / 2; rangeFloor.receiveShadow = true; rangeFloor.name = 'training-range-floor';
  const buildFloor = add(new T.PlaneGeometry(B.maxX - B.minX, B.maxZ - B.minZ), floorMat(B.maxX - B.minX, B.maxZ - B.minZ, '#b4b9bc', '#8b9398'),
    (B.minX + B.maxX) / 2, 0, (B.minZ + B.maxZ) / 2);
  buildFloor.rotation.x = -Math.PI / 2; buildFloor.receiveShadow = true; buildFloor.name = 'training-build-floor';

  // --- the walls: tiled planes facing in (the camera looks through the near ones from outside), a blue band at
  // waist height, a lamp strip along the top. Each wall is also a solid for rounds.
  const solids = [];
  const wall = (x0, z0, x1, z1, nx, nz) => {   // a wall from (x0,z0) to (x1,z1), facing (nx,nz) into its room
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.01) return;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, yaw = Math.atan2(nx, nz);
    const m = add(new T.PlaneGeometry(len, H), wallMat(len), cx, H / 2, cz); m.rotation.y = yaw; m.receiveShadow = true;
    const b = add(new T.PlaneGeometry(len, 0.16), band, cx + nx * 0.004, 1.05, cz + nz * 0.004); b.rotation.y = yaw;
    const l = add(new T.PlaneGeometry(len, 0.1), lampMat, cx + nx * 0.01, H - 0.25, cz + nz * 0.01); l.rotation.y = yaw;   // a plane: unseen from outside
    const th = 0.3;
    solids.push({ minX: Math.min(x0, x1) - (nx < 0 ? th : 0) + O.x, maxX: Math.max(x0, x1) + (nx > 0 ? th : 0) + O.x,
      minY: O.y - 1, maxY: O.y + H, minZ: Math.min(z0, z1) - (nz < 0 ? th : 0) + O.z, maxZ: Math.max(z0, z1) + (nz > 0 ? th : 0) + O.z, wall: true });
  };
  // The range: back (behind him), far end, his left (+x, the terminals); his right (-x) has the doorway.
  wall(R.minX, R.minZ, R.maxX, R.minZ, 0, 1);
  wall(R.minX, R.maxZ, R.maxX, R.maxZ, 0, -1);
  wall(R.maxX, R.minZ, R.maxX, R.maxZ, -1, 0);
  wall(R.minX, R.minZ, R.minX, D.minZ, 1, 0);
  wall(R.minX, D.maxZ, R.minX, R.maxZ, 1, 0);
  // The build room: its east wall is the range's right wall (the other face), with the same doorway.
  wall(B.maxX, B.minZ, B.maxX, D.minZ, -1, 0);
  wall(B.maxX, D.maxZ, B.maxX, B.maxZ, -1, 0);
  wall(B.minX, B.minZ, B.maxX, B.minZ, 0, 1);
  wall(B.minX, B.maxZ, B.maxX, B.maxZ, 0, -1);
  wall(B.minX, B.minZ, B.minX, B.maxZ, 1, 0);
  // Over the doorway, the wall above the opening (both faces), and a hazard-striped frame.
  for (const [x, ny] of [[R.minX + 0.002, 1], [B.maxX - 0.002, -1]]) {
    const top = add(new T.PlaneGeometry(D.maxZ - D.minZ, H - 3), wallMat(D.maxZ - D.minZ), x, 3 + (H - 3) / 2, (D.minZ + D.maxZ) / 2);
    top.rotation.y = Math.atan2(ny, 0);
  }
  for (const z of [D.minZ, D.maxZ]) box(0.5, 3.0, 0.14, hazard, D.x, 1.5, z);
  box(0.5, 0.18, D.maxZ - D.minZ + 0.14, hazard, D.x, 3.05, (D.minZ + D.maxZ) / 2);

  // --- signs
  const sign = (text, w, h, x, y, z, yaw, o = {}) => {
    const tex = keep(textTex(T, text, o));
    const m = add(new T.PlaneGeometry(w, h), std({ color: 0xffffff, map: tex, transparent: !o.bg, roughness: 0.7 }), x, y, z);
    m.rotation.y = yaw; return m;
  };
  sign('TRAINING GROUND', 9, 2.2, 0, 4.1, R.minZ + 0.02, 0, { color: '#1d2a33' });
  sign('BUILD ROOM', 2.6, 0.62, R.minX + 0.03, 3.6, (D.minZ + D.maxZ) / 2, Math.PI / 2, { bg: '#f2c418', color: '#16181a', size: 170 });
  sign('INFIRMARY', 2.2, 0.5, B.minX + 1.6, 2.6, B.minZ + 0.02, 0, { bg: '#ffffff', color: '#c01f1f', size: 170 });

  // --- the firing line, its stencil, and a lane number past it for each target
  const line = add(new T.PlaneGeometry(R.maxX - R.minX, 0.26), yellow, 0, 0.012, TRAINING.LINE_Z); line.rotation.x = -Math.PI / 2; line.name = 'firing-line';
  const lineText = sign('FIRING LINE', 4.2, 0.8, 0, 0.014, TRAINING.LINE_Z - 0.75, 0, { color: '#9c7600', size: 170 });
  lineText.rotation.set(-Math.PI / 2, 0, Math.PI);
  TRAINING.LANES.forEach((lx, i) => {
    const n = sign(String(i + 1), 0.7, 0.7, lx, 0.014, TRAINING.LINE_Z + 1.1, 0, { w: 256, h: 256, color: '#9c7600', size: 200 });
    n.rotation.set(-Math.PI / 2, 0, Math.PI);
  });
  // A rubber backstop across the far end.
  box(R.maxX - R.minX - 0.4, 3.4, 0.5, std({ color: 0x24282b, roughness: 0.95 }), 0, 1.7, R.maxZ - 0.3);

  // --- the targets: a steel base, a pivot at its top, a silhouette plate on an arm. Shot, it falls back flat, waits,
  // and stands up again.
  const plateTex = keep(canvasTex(T, 256, 448, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const fig = (inset, col) => {
      c.fillStyle = col; c.beginPath();
      c.arc(w / 2, 70, 52 - inset, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(42 + inset, h - 6 - inset); c.lineTo(52 + inset, 170 + inset); c.quadraticCurveTo(w / 2, 120 + inset, w - 52 - inset, 170 + inset);
      c.lineTo(w - 42 - inset, h - 6 - inset); c.closePath(); c.fill();
    };
    fig(0, '#f3f4f2'); fig(9, '#2c3237');
    c.strokeStyle = '#e8402b'; c.lineWidth = 7;
    for (const r of [26, 54]) { c.beginPath(); c.arc(w / 2, 260, r, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.arc(w / 2, 70, 20, 0, Math.PI * 2); c.stroke();
  }));
  const plateMat = std({ color: 0xffffff, map: plateTex, transparent: true, alphaTest: 0.5, roughness: 0.5, metalness: 0.2, side: T.DoubleSide });
  const PLATE = { w: 0.64, h: 1.12, y: 0.98 };   // above the pivot
  const targets = TRAINING.LANES.map((lx, i) => {
    const z = TRAINING.LINE_Z + TRAINING.RANGES[i];
    const root = new T.Group(); root.position.set(lx, 0, z); g.add(root);
    box(0.62, 0.2, 0.46, steel, 0, 0.1, 0, root);
    box(0.7, 0.04, 0.54, hazard, 0, 0.21, 0, root);
    const pivot = new T.Group(); pivot.position.set(0, 0.24, 0); root.add(pivot);
    box(0.06, 0.5, 0.06, steelLight, 0, 0.25, 0, pivot);
    const plate = add(new T.PlaneGeometry(PLATE.w, PLATE.h), plateMat, 0, PLATE.y, 0, pivot);
    plate.rotation.y = Math.PI; plate.castShadow = true; plate.name = 'target-plate';
    const t = { lane: i + 1, range: TRAINING.RANGES[i], state: 'up', t: 0, hits: 0, pivot, plate, x: lx, z };
    t.box = { minX: O.x + lx - PLATE.w / 2, maxX: O.x + lx + PLATE.w / 2, minY: O.y + 0.24 + PLATE.y - PLATE.h / 2, maxY: O.y + 0.24 + PLATE.y + PLATE.h / 2,
      minZ: O.z + z - 0.07, maxZ: O.z + z + 0.07 };
    return t;
  });
  const DOWN_A = 1.45;
  function hitTarget(i) {
    const t = targets[i];
    if (!t || t.state !== 'up') return false;
    t.state = 'falling'; t.t = 0; t.hits++;
    return true;
  }
  function resetTargets() { for (const t of targets) { t.state = 'up'; t.t = 0; t.pivot.rotation.x = 0; } }
  function update(dt) {
    for (const t of targets) {
      if (t.state === 'up') continue;
      t.t += dt;
      if (t.state === 'falling') {
        const u = Math.min(1, t.t / TRAINING.FALL_S);
        t.pivot.rotation.x = DOWN_A * u * u;
        if (u >= 1) { t.state = 'down'; t.t = 0; }
      } else if (t.state === 'down') {
        if (t.t >= TRAINING.DOWN_S) { t.state = 'rising'; t.t = 0; }
      } else if (t.state === 'rising') {
        const u = Math.min(1, t.t / TRAINING.RISE_S), e = 1 - (1 - u) * (1 - u);
        t.pivot.rotation.x = DOWN_A * (1 - e) - Math.sin(u * Math.PI) * 0.06;
        if (u >= 1) { t.state = 'up'; t.t = 0; t.pivot.rotation.x = 0; }
      }
    }
  }
  for (const t of targets) solids.push({ ...t.box, target: t.lane - 1 });

  // --- the build room: the zombie gate on the far wall, the infirmary bed in the corner
  const gate = { x: -21.5, z: B.maxZ - 1.4 };
  {
    const gx = gate.x, gz = B.maxZ - 0.02;
    box(3.2, 3.2, 0.06, std({ color: 0x121416, roughness: 1 }), gx, 1.6, gz - 0.03);
    for (const sx of [-1.65, 1.65]) box(0.22, 3.4, 0.3, hazard, gx + sx, 1.7, gz - 0.15);
    box(3.52, 0.26, 0.3, hazard, gx, 3.4, gz - 0.15);
    for (let k = -6; k <= 6; k++) box(0.05, 3.1, 0.05, steelLight, gx + k * 0.24, 1.6, gz - 0.12);
    sign('ZOMBIE GATE', 2.6, 0.5, gx, 3.95, gz - 0.02, Math.PI, { bg: '#16181a', color: '#f2c418', size: 160 });
  }
  const bedAt = { x: B.minX + 2.15, z: B.minZ + 0.85 };   // along x, head to the west wall
  {
    const white = std({ color: 0xf2f4f5, roughness: 0.85 });
    const frame = std({ color: 0xb8c0c5, roughness: 0.35, metalness: 0.6 });
    const hd = -1;   // the head end is toward -x (the wall)
    box(2.1, 0.08, 0.95, frame, bedAt.x, 0.48, bedAt.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, 0.48, 0.05, frame, bedAt.x + sx * 1.0, 0.24, bedAt.z + sz * 0.43);
    box(2.0, 0.16, 0.88, white, bedAt.x, 0.6, bedAt.z);
    box(0.42, 0.1, 0.62, white, bedAt.x + hd * 0.75, 0.73, bedAt.z);
    box(0.06, 0.62, 0.95, frame, bedAt.x + hd * 1.05, 0.82, bedAt.z);
    box(0.06, 0.42, 0.95, frame, bedAt.x - hd * 1.05, 0.72, bedAt.z);
    const blanket = std({ color: 0x8fa9b8, roughness: 0.95 });
    box(1.2, 0.05, 0.9, blanket, bedAt.x - hd * 0.32, 0.7, bedAt.z);
    // An IV pole and a cabinet with a red cross.
    box(0.03, 1.9, 0.03, frame, bedAt.x + hd * 1.35, 0.95, bedAt.z + 0.7);
    box(0.5, 0.03, 0.03, frame, bedAt.x + hd * 1.35, 1.9, bedAt.z + 0.7);
    box(0.16, 0.24, 0.08, std({ color: 0xd9eef5, transparent: true, opacity: 0.8, roughness: 0.2 }), bedAt.x + hd * 1.55, 1.74, bedAt.z + 0.7);
    box(0.7, 0.8, 0.45, white, bedAt.x - hd * 1.75, 0.4, bedAt.z - 0.12);
    const red = std({ color: 0xc01f1f, roughness: 0.6 });
    box(0.28, 0.08, 0.01, red, bedAt.x - hd * 1.75, 0.55, bedAt.z + 0.115);
    box(0.08, 0.28, 0.01, red, bedAt.x - hd * 1.75, 0.55, bedAt.z + 0.115);
  }

  // --- light
  // (No lamps of its own: the noon sun and the sky already light white tiles to a glare.)
  const lights = [];

  // --- where things go (world coordinates)
  const station = (x, z, yaw, depth = 1.0) => ({ x: O.x + x, y: O.y, z: O.z + z, yaw, front: W(x + Math.sin(yaw) * depth, z + Math.cos(yaw) * depth) });
  const stations = {
    cif: station(R.maxX - 0.02, -10.2, -Math.PI / 2),
    kiosk: station(R.maxX - 0.02, -6.6, -Math.PI / 2),
    armory: station(R.maxX - 0.02, -3.0, -Math.PI / 2),
    hqPanel: station(-13.5, B.maxZ - 0.02, Math.PI),
    skullWindow: station(B.minX + 0.02, -1.5, Math.PI / 2, 1.2)
  };
  const inset = 0.42;
  const walk = [
    { minX: O.x + R.minX + inset, maxX: O.x + R.maxX - 0.8, minZ: O.z + R.minZ + inset, maxZ: O.z + R.maxZ - 0.9 },
    { minX: O.x + B.maxX - inset - 0.05, maxX: O.x + R.minX + inset + 0.05, minZ: O.z + D.minZ + inset, maxZ: O.z + D.maxZ - inset },
    { minX: O.x + B.minX + 0.8, maxX: O.x + B.maxX - inset, minZ: O.z + B.minZ + inset, maxZ: O.z + B.maxZ - 0.75 }
  ];
  const zombieRect = { minX: O.x + B.minX + 0.95, maxX: O.x + B.maxX - 0.75, minZ: O.z + B.minZ + 0.6, maxZ: O.z + B.maxZ - 0.9 };
  // Lying on the bed: his feet at the foot end (+x), his head on the pillow (-x).
  const bed = { x: O.x + bedAt.x + 0.98, y: O.y + 0.68, z: O.z + bedAt.z, yaw: Math.PI / 2, centre: W(bedAt.x, bedAt.z), stand: { ...W(bedAt.x + 0.6, bedAt.z + 1.3), yaw: 0 } };
  const throat = { x: O.x + B.minX - 0.26, y: O.y + 1.6, z: O.z - 1.5 };

  return {
    group: g, origin: O, floorY: O.y, walk, zombieRect, solids, stations, bed, throat, lights,
    gate: W(gate.x, gate.z), spawn: { ...W(0, -8.5), yaw: 0 },
    targets, hitTarget, resetTargets, update,
    // Inside the training ground's footprint (and a margin): the floor height, for every body and drop.
    floorAt: (x, z) => (Math.abs(x - (O.x + 9)) < 75 && Math.abs(z - (O.z + 9)) < 75 ? O.y : null),
    dispose() {
      if (g.parent) g.parent.remove(g);
      for (const x of owned) { try { x.dispose && x.dispose(); } catch (_) {} }
      owned.length = 0;
    }
  };
}

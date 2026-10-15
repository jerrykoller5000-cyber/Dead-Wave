// GB-159 (Jerry, 2026-10-12: "add a little wear to the training facility"): the Training Ground has been used.
// Paint walked off the floor along the routes people take, boot scuffs at the firing line, the yellow line chipped
// where people stand; bullet pocks and patched holes behind the targets (some patches a slightly different white),
// grime under the vents and rust bleeding from bolts; a dented locker that won't shut, a cracked monitor taped up, a
// weapon rack with a hook missing, a sagging cot with a stained mattress in the infirmary bay; one lamp strip that
// flickers now and then and two dead ones; faded safety signs with peeling corners and a "DAYS WITHOUT INCIDENT" board
// reset to 0 by hand.
//
// Visual only. Nothing here changes the walk rects, the zombies' room, the build lattice or the targets. Decals are
// flat planes off the tiles (the game leaves them out of the solids: `decals`); the small props stay in the solids
// like every other prop (CL-158). Everything still is baked by buildTrainingGround (one draw per material: the
// signs, the board and the monitor share one printed sheet). Only the flickering strip keeps its own mesh.
//
//   dressTrainingWear(THREE, { R, B, bedAt, add, box, std, texture, lampMat }) -> {
//     parts: [name], decals: [mesh], flicker: mesh, dead: [mesh], update(dt, lit)
//   }
//   texture(w, h, draw) -> CanvasTexture | null (null in Node: the shapes are still built)

export const WEAR = Object.freeze({
  PX: 32,                                              // floor and wall decals: pixels a metre
  FLICKER: Object.freeze({ wall: 'px', z: 14, len: 3.2 }),
  DEAD: Object.freeze([{ wall: 'nx', z: 19, len: 3 }, { wall: 'px', z: 25, len: 2.6 }]),
  VENTS: Object.freeze([['px', 8], ['px', 22], ['nx', 7], ['nx', 21]]),
  MISSING_HOOK: 4,
  SIGN_MARGIN: 20,                                     // px each side inside a 256 px sign (GB-161)
  DOOR: Object.freeze({ rest: 0.5, min: 0.22, max: 2.2, k: 16, damp: 2.0 }),   // GB-161: the dented door's spring (rad, 1/s^2, 1/s)
  FLOOR_PX: 48,                                        // the floor sheet: pixels a metre (768 x 2016)
  WALL_PX: 64,                                         // the backstop and the tile above it: pixels a metre
  LANE_USE: Object.freeze([0.35, 1.0, 0.55, 0.08, 0.22])   // lane 1..5: lane 2 the favourite, lane 4 barely touched
});

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

const TRAINING_RANGES = [8, 12, 16, 20, 25];   // TRAINING.RANGES (not imported: training.js imports this file)

export function dressTrainingWear(T, { R, B, bedAt, add, box, std, texture, lampMat, root }) {
  const parts = [], decals = [], dead = [];
  const tex = (w, h, draw) => (texture ? texture(w, h, draw) : null);
  const decalMat = (map) => std({ color: 0xffffff, map, transparent: true, depthWrite: false, roughness: 0.9, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const decal = (name, w, h, map, x, y, z, ry, rx = 0) => {
    const m = add(new T.PlaneGeometry(w, h), decalMat(map), x, y, z);
    m.rotation.set(rx, ry, 0); m.renderOrder = 1; decals.push(m); parts.push(name); return m;
  };
  const S = WEAR.PX, WS2 = 48;
  let markKitFor = null, scatterFor = null;   // GB-160: set below with the kit; the side walls' textures draw after
  const RW = R.maxX - R.minX, RD = R.maxZ - R.minZ;
  const H = 5.9;   // the decals stop short of the 6 m wall top (training.test: nothing hangs over the range at 6 m)
  const STRIP_Y = 5.75;

  // ---------- (1) the floor: one sheet over the range's tiles (GB-159 pass 2, Jerry: "more variation. Start with the
  // ground marks"). Seeded, so every build looks the same; nothing in it repeats: each lane has its own use, each
  // route its own width, wander and wear; boot marks are smears, heel and toe drags, half prints and rubber streaks.
  const lanes = [6, 3, 0, -3, -6];
  const FS = WEAR.FLOOR_PX;
  const floorTex = tex(RW * FS, RD * FS, (c) => {
    const r = rng(41);
    const P = (x, z) => [(x - R.minX) * FS, (z - R.minZ) * FS];
    const noise = (t, k) => Math.sin(t * 1.7 + k) * 0.5 + Math.sin(t * 4.3 + k * 2.1) * 0.3 + Math.sin(t * 9.1 + k * 0.7) * 0.2;   // -1..1, smooth
    const blob = (u, v, rad, rgb, a) => {
      const g = c.createRadialGradient(u, v, 0, u, v, rad);
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.55, `rgba(${rgb},${a * 0.55})`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.fillRect(u - rad, v - rad, rad * 2, rad * 2);
    };
    // Worn routes: the paint walked off to pale, rough concrete in the middle, a grimy fringe at the edges. Stamped
    // softly along a wandering line, so routes that meet build up (the line, the door, the lockers) on their own.
    const route = (pts, width, wear) => {
      const k = r() * 10;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0);
        const nx = -(z1 - z0) / len, nz = (x1 - x0) / len, steps = Math.ceil(len * 9);
        for (let s = 0; s <= steps; s++) {
          const t = s / steps, d = (i + t) * 3, wob = noise(d, k) * width * 0.35;
          const x = x0 + (x1 - x0) * t + nx * wob, z = z0 + (z1 - z0) * t + nz * wob;
          const w = width * (0.65 + 0.35 * (noise(d * 1.3, k + 5) + 1) / 2 + r() * 0.25);
          const keep = 0.55 + 0.45 * noise(d * 2.2, k + 9);              // breaks up: worn patches, less worn gaps
          if (keep < 0.25) continue;
          const [u, v] = P(x + (r() - 0.5) * w * 0.3, z + (r() - 0.5) * w * 0.3);
          blob(u, v, w * 0.75 * FS, '92,86,74', 0.024 * wear * keep);        // grime fringe, wide and faint
          blob(u, v, w * 0.45 * FS, '188,182,166', 0.042 * wear * keep);      // the paint gone: lighter concrete
        }
        for (let n = 0; n < len * 30 * wear; n++) {   // GB-165: half the grit, fainter                         // its grain: grit and bare flecks
          const t = r(), [u, v] = P(x0 + (x1 - x0) * t + nx * (r() - 0.5) * width, z0 + (z1 - z0) * t + nz * (r() - 0.5) * width);
          c.fillStyle = r() < 0.45 ? `rgba(${74 + (r() * 14 | 0)},${70 + (r() * 10 | 0)},64,${0.08 + r() * 0.22})` : `rgba(196,${186 + (r() * 10 | 0)},174,${0.1 + r() * 0.25})`;
          c.fillRect(u, v, 1 + r() * 2.5, 1 + r() * 2);
        }
      }
    };
    const use = WEAR.LANE_USE;
    route([[0.4, -1.4], [2.2, -3.1], [4.6, -5.0], [6.7, -6.4]], 1.0, 0.9);             // the spot to the terminals
    route([[6.7, -10.0], [6.9, -6.8], [6.6, -3.2]], 0.85, 0.75);                    // along the CIF, kiosk and Armory
    route([[-0.3, -1.3], [-2.4, -3.6], [-5.2, -6.2], [-7.7, -8.0]], 1.05, 1.0);       // to the build room door
    route([[-6.6, -0.9], [-2.8, -1.05], [1.2, -0.85], [6.6, -1.0]], 1.2, 0.8);        // the walk behind the line
    route([[-5.4, -11.0], [-3.8, -7.2], [-0.8, -2.0]], 0.75, 0.6);                  // from the lockers
    route([[2.3, -11.0], [1.6, -6.0], [0.6, -1.8]], 0.6, 0.45);                     // from the rack
    lanes.forEach((lx, i) => { if (use[i] > 0.3) route([[lx + (r() - 0.5) * 0.4, -0.8], [lx + (r() - 0.5) * 0.6, 3], [lx + (r() - 0.5) * 0.4, TRAINING_RANGES[i] - 1.2]], 0.45 + use[i] * 0.3, use[i] * 0.55); });
    // Boot marks behind each lane's spot: no rings. Short directional smears, heel and toe drags, half sole prints,
    // turn scuffs and thin black rubber streaks, as many and as dark as that lane has been used.
    const rubber = (a) => `rgba(${18 + (r() * 14) | 0},${17 + (r() * 12) | 0},${16 + (r() * 10) | 0},${a})`;
    const smear = (u, v, ang, len, wid, a) => {                          // a tapered drag, dark at its start
      c.save(); c.translate(u, v); c.rotate(ang);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, rubber(a)); g.addColorStop(1, rubber(0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -wid / 2); c.quadraticCurveTo(len * 0.5, -wid * 0.45, len, -wid * 0.1); c.lineTo(len, wid * 0.1); c.quadraticCurveTo(len * 0.5, wid * 0.4, 0, wid / 2); c.closePath(); c.fill();
      c.restore();
    };
    const sole = (u, v, ang, a) => {                                    // part of a print: a few tread bars, some missing
      c.save(); c.translate(u, v); c.rotate(ang); c.fillStyle = rubber(a);
      const L = (0.26 + r() * 0.04) * FS, Wd = 0.09 * FS, from = r() < 0.5 ? 0 : 0.45, to = from + 0.35 + r() * 0.2;
      for (let t = from; t < Math.min(1, to); t += 0.07) if (r() > 0.25) c.fillRect(-Wd / 2 + r() * 1.5, t * L - L / 2, Wd * (t > 0.7 ? 0.8 : 1), 0.022 * FS);
      c.restore();
    };
    const turn = (u, v, ang, rad, a) => {                               // a pivot: a comma, thick at one end
      const span = 0.5 + r() * 0.9;
      for (let k = 0; k < 6; k++) {
        const a0 = ang + span * k / 6, a1 = ang + span * (k + 1) / 6;
        c.strokeStyle = rubber(a * (1 - k / 7)); c.lineWidth = (0.035 * FS) * (1 - k / 7) + 0.6; c.lineCap = 'round';
        c.beginPath(); c.arc(u, v, rad, a0, a1); c.stroke();
      }
    };
    const streak = (u, v, ang, len, a) => { c.strokeStyle = rubber(a); c.lineWidth = 0.6 + r() * 1.2; c.beginPath(); c.moveTo(u, v); c.lineTo(u + Math.cos(ang) * len, v + Math.sin(ang) * len); c.stroke(); };
    lanes.forEach((lx, i) => {
      const u0 = lx + (r() - 0.5) * 0.5, n = Math.round(3 + use[i] * 38), spread = 0.35 + use[i] * 0.5, dark = 0.25 + use[i] * 0.45;
      for (let m = 0; m < n; m++) {
        const [u, v] = P(u0 + (r() - 0.5) * 2 * spread, -0.25 - Math.pow(r(), 0.7) * (0.5 + spread));
        const face = Math.PI / 2 + (r() - 0.5) * 0.9;                  // canvas +v is downrange: most face that way
        const kind = r(), a = dark * (r() < 0.1 ? 0.85 + r() * 0.3 : 0.2 + r() * 0.4);   // GB-165: mostly faint, a few strong
        if (kind < 0.38) smear(u, v, face + (r() < 0.5 ? Math.PI : 0) + (r() - 0.5) * 0.6, (0.06 + r() * 0.16) * FS, (0.03 + r() * 0.05) * FS, a);
        else if (kind < 0.6) sole(u, v, face - Math.PI / 2, a * 0.6);
        else if (kind < 0.8) turn(u, v, r() * 6.3, (0.05 + r() * 0.07) * FS, a);
        else streak(u, v, face + (r() - 0.5) * 1.2, (0.15 + r() * 0.35) * FS, a * 0.8);
      }
      if (use[i] > 0.5) for (let m = 0; m < 4; m++) { const [u, v] = P(u0 + (r() - 0.5) * 0.6, -0.5 - r() * 0.6); blob(u, v, (0.15 + r() * 0.2) * FS, '40,38,36', 0.05 + r() * 0.05); }   // a worn smudge where he stands
    });
    // Extras: specks, a dried spill, a faint drag, grit in the seams along the walls.
    for (let n = 0; n < 420; n++) { const [u, v] = P(R.minX + r() * RW, R.minZ + r() * RD); c.fillStyle = `rgba(${60 + (r() * 40) | 0},${56 + (r() * 30) | 0},${46 + (r() * 12) | 0},${0.05 + r() * 0.2})`; c.fillRect(u, v, 1 + r() * 2, 1 + r() * 1.5); }
    {
      const [u, v] = P(-5.1, -3.4);                                     // dried spill: lobes, a darker tide line
      c.fillStyle = 'rgba(132,116,82,0.12)';
      const lobes = []; for (let k = 0; k < 9; k++) lobes.push([u + (r() - 0.5) * 0.7 * FS, v + (r() - 0.5) * 0.45 * FS, (0.1 + r() * 0.2) * FS]);
      for (const [x, y, rr] of lobes) { c.beginPath(); c.ellipse(x, y, rr, rr * (0.6 + r() * 0.4), r() * 3, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(96,80,52,0.22)'; c.lineWidth = 1.3;
      for (const [x, y, rr] of lobes) { c.beginPath(); c.arc(x, y, rr * 0.95, r() * 6, r() * 6 + 1.5); c.stroke(); }
    }
    for (const off of [-0.18, 0.18]) {                                  // something heavy dragged toward the door
      c.strokeStyle = 'rgba(70,66,60,0.13)'; c.lineWidth = 2; c.beginPath();
      for (let t = 0; t <= 1; t += 0.05) { const [u, v] = P(-1.5 - t * 4.5 + off * 0.3, 6 - t * 9 + off + noise(t * 8, 3) * 0.08); t ? c.lineTo(u, v) : c.moveTo(u, v); }
      c.stroke();
    }
    for (let x = Math.ceil(R.minX); x <= R.maxX; x++) for (let z = Math.ceil(R.minZ); z <= R.maxZ; z++) {   // seams near the walls
      const edge = Math.min(x - R.minX, R.maxX - x, z - R.minZ, R.maxZ - z);
      if (edge > 1.6) continue;
      const a = (0.32 - edge * 0.18) * (0.25 + r() * 0.5);
      if (a <= 0.02) continue;
      const [u, v] = P(x, z);
      c.fillStyle = `rgba(52,48,42,${a})`;
      if (r() < 0.8) c.fillRect(u - 1, v, 2.5, FS * (0.3 + r() * 0.7));
      if (r() < 0.8) c.fillRect(u, v - 1, FS * (0.3 + r() * 0.7), 2.5);
    }
  });
  decal('wear-floor', RW, RD, floorTex, (R.minX + R.maxX) / 2, 0.005, (R.minZ + R.maxZ) / 2, 0, -Math.PI / 2);

  // The yellow line: faded unevenly, and chipped to the tile in ragged flakes where people stand (more where more do).
  const chipTex = tex(RW * 64, 32, (c, w, h) => {
    const r = rng(77);
    for (let x = 0; x < w; x += 8) { c.fillStyle = `rgba(205,208,210,${0.08 + r() * 0.25})`; c.fillRect(x, 0, 8 + r() * 8, h); }
    const flake = (u, v, s) => {
      c.beginPath(); const n = 5 + (r() * 4 | 0);
      for (let k = 0; k < n; k++) { const a = k / n * 6.28, d = s * (0.4 + r() * 0.8); k ? c.lineTo(u + Math.cos(a) * d * 1.5, v + Math.sin(a) * d) : c.moveTo(u + Math.cos(a) * d * 1.5, v + Math.sin(a) * d); }
      c.closePath(); c.fill();
    };
    lanes.forEach((lx, i) => {
      const n = Math.round(4 + WEAR.LANE_USE[i] * 50);
      for (let k = 0; k < n; k++) {
        c.fillStyle = r() < 0.75 ? `rgba(196,200,202,${0.75 + r() * 0.25})` : 'rgba(150,146,136,0.85)';
        flake((lx - R.minX + (r() - 0.5) * (0.6 + WEAR.LANE_USE[i] * 1.4)) * 64, r() * h, 1.5 + r() * (3 + WEAR.LANE_USE[i] * 7));
      }
    });
    for (let k = 0; k < 25; k++) { c.fillStyle = 'rgba(196,200,202,0.85)'; flake(r() * w, r() * h, 1 + r() * 3); }   // strays along it
  });
  decal('wear-line-chips', RW, 0.27, chipTex, 0, 0.0132, 0, 0, -Math.PI / 2);

  // ---------- (2) the walls
  // Where the side walls' features go (range local): vents with corner bolts, a conduit's brackets with two bolts.
  const sideX = { px: R.maxX, nx: R.minX };
  const yawOf = { px: -Math.PI / 2, nx: Math.PI / 2 };
  const nrm = { px: -1, nx: 1 };
  const ventMat = std({ color: 0x8c9398, roughness: 0.6, metalness: 0.5 });
  const boltMat = std({ color: 0x6d5a48, roughness: 0.8, metalness: 0.4 });
  const steel = std({ color: 0x3a4046, roughness: 0.45, metalness: 0.6 });
  const bolts = { px: [], nx: [] }, vents = { px: [], nx: [] };
  for (const [side, z] of WEAR.VENTS) {
    const x = sideX[side] + nrm[side] * 0.03;
    const v = box(0.05, 0.46, 0.92, ventMat, x, 5.0, z);
    for (let i = 0; i < 5; i++) box(0.03, 0.03, 0.84, steel, x + nrm[side] * 0.03, 4.84 + i * 0.08, z);
    for (const dy of [-0.19, 0.19]) for (const dz of [-0.42, 0.42]) { box(0.02, 0.04, 0.04, boltMat, x + nrm[side] * 0.035, 5.0 + dy, z + dz); bolts[side].push([z + dz, 5.0 + dy]); }
    vents[side].push(z); parts.push('wear-vent');
  }
  for (const side of ['px', 'nx']) {
    const x = sideX[side] + nrm[side] * 0.06;
    const z0 = side === 'px' ? -1.5 : -5.2;
    const cond = box(0.05, 0.05, R.maxZ - 0.6 - z0, steel, x, 4.4, (z0 + R.maxZ - 0.6) / 2); cond.castShadow = false;
    for (let z = z0 + 1; z < R.maxZ - 1; z += 4) {
      box(0.03, 0.12, 0.09, steel, sideX[side] + nrm[side] * 0.02, 4.4, z);
      for (const dz of [-0.03, 0.03]) { box(0.02, 0.025, 0.025, boltMat, sideX[side] + nrm[side] * 0.04, 4.46, z + dz); bolts[side].push([z + dz, 4.46]); }
    }
    parts.push('wear-conduit');
  }
  const sideTex = (side, za, zb, seed) => tex((zb - za) * WS2, H * WS2, (c, w, h) => {
    const r = rng(seed);
    const U = (z) => (side === 'px' ? z - za : zb - z) * WS2, V = (y) => (H - y) * WS2;
    for (const z of vents[side]) for (let n = 0; n < 9; n++) {      // grime streaks under each vent
      const u = U(z + (r() - 0.5) * 0.8), v0 = V(4.76), len = (0.8 + r() * 1.8) * WS2;
      const g = c.createLinearGradient(0, v0, 0, v0 + len);
      g.addColorStop(0, `rgba(48,44,40,${0.25 + r() * 0.2})`); g.addColorStop(1, 'rgba(48,44,40,0)');
      c.fillStyle = g; c.fillRect(u, v0, 2 + r() * 5, len);
    }
    for (const [z, y] of bolts[side]) {                             // rust bleeding down from every bolt
      const u = U(z), v0 = V(y) + 1, len = (0.25 + r() * 0.9) * WS2;
      const g = c.createLinearGradient(0, v0, 0, v0 + len);
      g.addColorStop(0, 'rgba(128,62,24,0.75)'); g.addColorStop(1, 'rgba(150,80,30,0)');
      c.fillStyle = g; c.fillRect(u - 1.5, v0, 3 + r() * 2, len);
    }
    const kit = markKitFor(c, r, true);                             // GB-160: strays from the range, mostly near the far end ...
    for (let n = 0; n < 13; n++) { const z = R.maxZ - Math.pow(r(), 1.6) * 12, y = 0.4 + r() * 4.2; scatterFor(kit, r, U(z), V(y), (0.008 + r() * 0.01) * WS2, true); }
    for (let n = 0; n < 3; n++) { const z = 0.5 + r() * 6, y = 0.3 + r() * 3.6; scatterFor(kit, r, U(z), V(y), (0.008 + r() * 0.01) * WS2, true); }   // ... and a few wild ones near the line
  });
  // Behind the targets (GB-160, Jerry: "old bullet decals on the wall next. Same thing"): years of rounds. The marks
  // come from one seeded kit, so no two are the same: fresh holes (a dark core, a torn rim, cracks out through the
  // tile), spalled chips down to the grey under the glaze, shallow ricochet gouges, old holes puttied and sanded flush
  // (some painted over in a white that doesn't match, some left bare, some shot through again), cut-out squares
  // patched with a board and screws, soot and lead smudges, and rust or dirt run down from a few. Each lane is as
  // marked as it has been used (WEAR.LANE_USE), thickest at the plates' height and thinning out from there, with a
  // few wild ones high, low and on the side walls near the line.
  const WS = WEAR.WALL_PX;
  const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.2832 * r());
  const markKit = (c, r, tile) => {
    const sub = tile ? [150, 152, 148] : [62, 64, 66];               // under the glaze / under the rubber's skin
    const jag = (u, v, rad, n, wob) => { c.beginPath(); for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + r() * 0.4, d = rad * (1 - wob + r() * wob * 2); k ? c.lineTo(u + Math.cos(a) * d, v + Math.sin(a) * d) : c.moveTo(u + Math.cos(a) * d, v + Math.sin(a) * d); } c.closePath(); };
    const soot = (u, v, rad, a) => { const g = c.createRadialGradient(u, v, 0, u, v, rad); g.addColorStop(0, `rgba(40,38,36,${a})`); g.addColorStop(1, 'rgba(40,38,36,0)'); c.fillStyle = g; c.fillRect(u - rad, v - rad, rad * 2, rad * 2); };
    const run = (u, v, len, rust) => { const g = c.createLinearGradient(0, v, 0, v + len); g.addColorStop(0, rust ? 'rgba(126,64,26,0.6)' : 'rgba(70,62,50,0.45)'); g.addColorStop(1, 'rgba(120,70,30,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(u - 1.5, v); c.lineTo(u + 1.5, v); c.lineTo(u + 0.5 + (r() - 0.5) * 3, v + len); c.lineTo(u - 0.5, v + len); c.fill(); };
    const hole = (u, v, s) => {                                     // s: the round's size in px
      if (r() < 0.5) soot(u, v, s * (2 + r() * 2), 0.12 + r() * 0.18);
      c.fillStyle = `rgba(${sub},0.9)`; jag(u, v, s * (1.3 + r() * 0.9), 7 + (r() * 5 | 0), 0.45); c.fill();   // the torn rim
      if (tile) { c.strokeStyle = 'rgba(60,62,64,0.55)'; c.lineWidth = 0.8;   // cracks out through the tile
        for (let k = 0, n = 2 + (r() * 5 | 0); k < n; k++) { let x = u, y = v, a = r() * 6.2832; c.beginPath(); c.moveTo(x, y);
          for (let j = 0, m = 2 + (r() * 3 | 0); j < m; j++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * s * (1 + r() * 2); y += Math.sin(a) * s * (1 + r() * 2); c.lineTo(x, y); } c.stroke(); } }
      c.fillStyle = 'rgba(10,10,11,0.95)'; jag(u, v, s * (0.5 + r() * 0.25), 6, 0.3); c.fill();             // the core
      if (r() < (tile ? 0.12 : 0.05)) run(u, v + s, (0.1 + r() * 0.35) * WS, r() < 0.6);
    };
    const spall = (u, v, s) => {
      c.fillStyle = `rgba(${sub.map((x) => x + (r() * 16 | 0) - 8)},0.95)`; jag(u, v, s, 6 + (r() * 4 | 0), 0.5); c.fill();
      c.strokeStyle = 'rgba(30,30,32,0.45)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = 'rgba(20,20,22,0.5)'; jag(u + s * 0.15, v + s * 0.1, s * 0.35, 5, 0.4); c.fill();
    };
    const gouge = (u, v, s) => {                                     // a shallow hit skating along the face
      const a = (r() < 0.5 ? 0 : Math.PI) + (r() - 0.5) * 0.7, len = s * (5 + r() * 9);
      c.save(); c.translate(u, v); c.rotate(a);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(20,20,22,0.85)'); g.addColorStop(0.3, `rgba(${sub},0.8)`); g.addColorStop(1, 'rgba(110,112,116,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -s * 0.5); c.quadraticCurveTo(len * 0.4, -s * 0.6, len, 0); c.quadraticCurveTo(len * 0.4, s * 0.5, 0, s * 0.5); c.fill();
      c.fillStyle = 'rgba(80,82,88,0.25)'; c.fillRect(len * 0.2, -s * 0.9, len * 0.7, s * 0.35);   // lead smeared off it
      c.restore();
    };
    const PAINTS = ['#eef0ec', '#f3efe2', '#e2e4e0', '#d9dcd6', '#ece6d4', '#f6f7f4'];
    const putty = (u, v, s) => {                                    // filled and sanded flush; painted or not, maybe shot again
      const rad = s * (2 + r() * 2.5), bare = r() < 0.3;
      if (!tile) {                                                     // on the rubber: a plugged hole, a shade off the sheet
        const g = 28 + (r() * 30 | 0); c.fillStyle = `rgba(${g},${g + 2},${g + 4},0.9)`; jag(u, v, rad * 0.8, 7, 0.3); c.fill();
        if (r() < 0.3) hole(u, v, s * (0.7 + r() * 0.4)); return;
      }
      c.fillStyle = bare ? `rgba(${226 + (r() * 12 | 0)},${220 + (r() * 10 | 0)},${200 + (r() * 14 | 0)},0.95)` : PAINTS[(r() * PAINTS.length) | 0];
      c.beginPath(); c.ellipse(u, v, rad * (0.8 + r() * 0.5), rad * (0.6 + r() * 0.5), r() * 3, 0, 6.2832); c.fill();
      if (bare) { c.strokeStyle = 'rgba(170,164,146,0.4)'; c.lineWidth = 0.7; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(u + (r() - 0.5) * rad, v + (r() - 0.5) * rad, rad * (0.3 + r() * 0.5), r() * 6, r() * 6 + 1.2); c.stroke(); } }
      if (r() < 0.22) hole(u + (r() - 0.5) * rad, v + (r() - 0.5) * rad, s * (0.7 + r() * 0.4));
    };
    const board = (u, v, s) => {                                    // a square cut out and patched, its seams and screws showing
      const w = s * (9 + r() * 10), h = w * (0.6 + r() * 0.7), rot = (r() - 0.5) * 0.04;
      c.save(); c.translate(u, v); c.rotate(rot);
      c.fillStyle = tile ? PAINTS[(r() * PAINTS.length) | 0] : `rgb(${40 + (r() * 14 | 0)},${43 + (r() * 12 | 0)},${46 + (r() * 12 | 0)})`;
      c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = 'rgba(40,40,42,0.6)'; c.lineWidth = 1.2; c.strokeRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.18)'; c.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);
      c.fillStyle = 'rgba(70,72,74,0.9)';
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) if (x === 0 ? w > s * 12 : true) { c.beginPath(); c.arc(x * (w / 2 - 3), y * (h / 2 - 3), 1.3, 0, 6.2832); c.fill(); }
      c.restore();
      if (r() < 0.3) run(u + w / 2 - 3, v + h / 2 - 2, (0.08 + r() * 0.2) * WS, true);
      for (let k = 0, n = r() < 0.5 ? (r() * 4 | 0) : 0; k < n; k++) hole(u + (r() - 0.5) * w * 0.8, v + (r() - 0.5) * h * 0.8, s * (0.7 + r() * 0.4));   // shot through since
    };
    return { hole, spall, gouge, putty, board, soot, c };
  };
  // One mark of a random kind; kinds weighted by surface, sizes by r.
  // GB-165 (Jerry: "a bit too thick ... more sparse and nuanced"): most marks small and part-faded, a few strong focal ones.
  const scatter = (kit, r, u, v, s, tile) => {
    const strong = r() < 0.12;
    kit.c.globalAlpha = strong ? 1 : 0.35 + r() * 0.4;
    s *= strong ? 1.15 + r() * 0.45 : 0.55 + r() * r() * 0.6;
    mark(kit, r, u, v, s, tile);
    kit.c.globalAlpha = 1;
  };
  const mark = (kit, r, u, v, s, tile) => {
    const k = r();
    if (k < 0.42) kit.hole(u, v, s * (0.8 + r() * 0.6));
    else if (k < 0.56) kit.spall(u, v, s * (1.5 + r() * 2.5));
    else if (k < 0.68) kit.gouge(u, v, s * (0.6 + r() * 0.5));
    else if (k < (tile ? 0.88 : 0.76)) kit.putty(u, v, s);
    else if (k < (tile ? 0.92 : 0.84)) kit.board(u, v, s);
    else kit.soot(u, v, s * (3 + r() * 5), 0.1 + r() * 0.15);
  };
  markKitFor = markKit; scatterFor = scatter;
  const PLATE_Y = 1.9;   // the doubled plates' chest, where the rounds go
  const bsW = RW - 0.4, bsH = 3.8;
  const laneMarks = (c, r, kit, tile, toU, toV, yMin, yMax, perLane, sigY) => {
    lanes.forEach((lx, i) => {
      const n = Math.round(perLane * (0.15 + WEAR.LANE_USE[i]));
      for (let m = 0; m < n; m++) {
        const x = lx + gauss(r) * (0.35 + WEAR.LANE_USE[i] * 0.4), y = PLATE_Y + gauss(r) * sigY;
        if (y < yMin || y > yMax) continue;
        scatter(kit, r, toU(x), toV(y), (0.008 + r() * 0.01) * WS, tile);
      }
    });
  };
  const backTex = tex(bsW * WS, bsH * WS, (c, w, h) => {
    const r = rng(23), kit = markKit(c, r, false);
    for (let k = 0; k < 24; k++) { c.fillStyle = `rgba(${r() < 0.5 ? '60,62,64' : '14,15,16'},${0.04 + r() * 0.07})`; c.fillRect(r() * w, r() * h, 10 + r() * 60, 6 + r() * 30); }   // the rubber's own wear
    laneMarks(c, r, kit, false, (x) => (bsW / 2 - x) * WS, (y) => (bsH - y) * WS, 0.05, bsH - 0.05, 65, 0.55);
    for (let k = 0; k < 9; k++) scatter(kit, r, r() * w, r() * h, (0.008 + r() * 0.01) * WS, false);   // wild ones
  });
  decal('wear-backstop', bsW, bsH, backTex, 0, bsH / 2, R.maxZ - 0.562, Math.PI);
  const farTex = tex(RW * WS, (H - bsH) * WS, (c, w, h) => {
    const r = rng(31), kit = markKit(c, r, true);
    laneMarks(c, r, kit, true, (x) => (RW / 2 - x) * WS, (y) => (H - y) * WS, bsH + 0.05, H - 0.1, 85, 1.15);   // the high ones over the backstop
    for (let k = 0; k < 12; k++) scatter(kit, r, r() * w, r() * h, (0.008 + r() * 0.01) * WS, true);
  });
  decal('wear-far-wall', RW, H - bsH, farTex, 0, bsH + (H - bsH) / 2, R.maxZ - 0.012, Math.PI);
  // The side walls draw now, with the kit (their strays use it).
  {
    const pz0 = -1.5, nz0 = -5.2;
    decal('wear-wall-px', R.maxZ - pz0, H, sideTex('px', pz0, R.maxZ, 5), R.maxX - 0.012, H / 2, (pz0 + R.maxZ) / 2, yawOf.px);
    decal('wear-wall-nx', R.maxZ - nz0, H, sideTex('nx', nz0, R.maxZ, 9), R.minX + 0.012, H / 2, (nz0 + R.maxZ) / 2, yawOf.nx);
  }

  // ---------- (4) the lamp strips: one that flickers now and then, two dead
  const stripAt = (spec) => {
    if (spec.wall === 'far') return { x: spec.x, z: R.maxZ - 0.02, ry: Math.PI };
    return { x: sideX[spec.wall] + nrm[spec.wall] * 0.02, z: spec.z, ry: yawOf[spec.wall] };
  };
  const deadMat = std({ color: 0x41474b, roughness: 0.45, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const d of WEAR.DEAD) { const a = stripAt(d); const m = add(new T.PlaneGeometry(d.len, 0.11), deadMat, a.x, STRIP_Y, a.z); m.rotation.y = a.ry; dead.push(m); parts.push('wear-dead-strip'); }
  const flickMat = std({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0.8, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const fa = stripAt(WEAR.FLICKER);
  const flicker = add(new T.PlaneGeometry(WEAR.FLICKER.len, 0.11), flickMat, fa.x, STRIP_Y, fa.z);
  flicker.rotation.y = fa.ry; flicker.name = 'training-wear-flicker'; parts.push('wear-flicker-strip');
  const fr = rng(97);
  let wait = 3 + fr() * 6, burst = 0, tick = 0, on = true;
  function update(dt, lit) {
    if (door) stepDoor(dt);   // GB-161
    if (!lit) { flickMat.emissiveIntensity = lampMat.emissiveIntensity; flickMat.color.copy(lampMat.color); return; }
    if (burst > 0) {
      burst -= dt; tick -= dt;
      if (tick <= 0) { on = !on; tick = 0.03 + fr() * 0.09; }
      if (burst <= 0) { on = true; wait = 4 + fr() * 9; }
    } else if ((wait -= dt) <= 0) { burst = 0.25 + fr() * 0.7; tick = 0; }
    flickMat.emissiveIntensity = on ? lampMat.emissiveIntensity : 0.04;
    flickMat.color.setHex(on ? 0xffffff : 0x6a7074);
  }

  // ---------- (3) and (5): the back wall's kit (behind him at the line) and the side walls' signs
  // One printed sheet for the signs, the board and the monitor: 1024 x 1024, cells by uv.
  const sheet = tex(1024, 1024, (c) => {
    const r = rng(13);
    // GB-161 (Jerry: the DANGER sign's words ran off its sides): every line is measured and shrunk to fit its margins.
    const fitText = (t, cx, cy, maxW, size, font) => {
      let px = size; c.font = font(px);
      while (px > 8 && c.measureText(t).width > maxW) { px -= 1; c.font = font(px); }
      c.fillText(t, cx, cy); return px;
    };
    const impact = (px) => `bold ${px}px Impact, "Arial Black", sans-serif`, arial = (px) => `bold ${px}px Arial, sans-serif`;
    const signCell = (x, y, head, headCol, lines) => {           // 256 x 180, faded, its top-right corner peeling
      c.fillStyle = '#e6e1cf'; c.fillRect(x, y, 256, 180);
      c.fillStyle = headCol; c.fillRect(x, y, 256, 52);
      c.fillStyle = '#f4f1e6'; c.font = 'bold 34px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      fitText(head, x + 128, y + 27, 256 - 2 * 46, 34, impact);   // clear of the peeled corner
      c.fillStyle = '#2a2c2e'; c.font = 'bold 22px Arial, sans-serif';
      const fit = Math.min(...lines.map((t) => { let px = 22; c.font = arial(px); while (px > 8 && c.measureText(t).width > 256 - 2 * 20) { px -= 1; c.font = arial(px); } return px; }));
      lines.forEach((t, i) => fitText(t, x + 128, y + 82 + i * 30, 256 - 2 * 20, fit, arial));   // one size for all its lines
      c.fillStyle = 'rgba(255,250,230,0.35)'; c.fillRect(x, y, 256, 180);   // sun-bleached
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(120,110,90,${r() * 0.15})`; c.fillRect(x + r() * 250, y + r() * 175, 3 + r() * 8, 2 + r() * 6); }
      c.clearRect(x + 214, y, 42, 42);                               // the corner gone ...
      c.fillStyle = '#c9c3ad'; c.beginPath(); c.moveTo(x + 214, y); c.lineTo(x + 256, y + 42); c.lineTo(x + 222, y + 34); c.closePath(); c.fill();   // ... curled over
      c.clearRect(x, y + 156, 18, 24); c.fillStyle = '#d1cbb4'; c.beginPath(); c.moveTo(x, y + 156); c.lineTo(x + 18, y + 180); c.lineTo(x + 6, y + 166); c.fill();
    };
    signCell(0, 0, 'CAUTION', '#b8901a', ['EYE AND EAR', 'PROTECTION REQUIRED']);
    signCell(256, 0, 'WARNING', '#a8432f', ['KEEP MUZZLE', 'POINTED DOWNRANGE']);
    signCell(512, 0, 'NOTICE', '#2f5f86', ['CEASE FIRE', 'ON COMMAND']);
    signCell(768, 0, 'DANGER', '#a3302a', ['NO PERSONNEL FORWARD', 'OF FIRING LINE']);
    // The board: 512 x 360 at (0, 256).
    c.fillStyle = '#1f3b2c'; c.fillRect(0, 256, 512, 360);
    c.fillStyle = '#e9e4cf'; c.font = 'bold 46px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    fitText('DAYS WITHOUT', 256, 300, 512 - 2 * 28, 46, impact); fitText('INCIDENT', 256, 350, 512 - 2 * 28, 46, impact);
    c.fillStyle = '#f5f2e8'; c.fillRect(146, 384, 220, 200);
    c.fillStyle = 'rgba(40,40,46,0.28)'; c.font = 'bold 150px Impact, sans-serif'; c.fillText('47', 256, 488);   // the old count, wiped
    c.strokeStyle = 'rgba(30,30,40,0.35)'; c.lineWidth = 9; c.beginPath(); c.moveTo(160, 420); c.lineTo(352, 560); c.stroke();
    c.fillStyle = 'rgba(190,190,192,0.5)'; for (let i = 0; i < 6; i++) c.fillRect(150 + r() * 160, 400 + r() * 160, 40 + r() * 40, 10);
    c.strokeStyle = '#b3201c'; c.lineWidth = 16; c.lineCap = 'round';   // 0 in marker, by hand
    c.beginPath(); c.ellipse(258, 484, 52, 78, 0.12, 0.3, 6.6); c.stroke();
    c.fillStyle = '#c7c0a8'; c.fillRect(0, 600, 512, 16);
    // The monitor: 384 x 256 at (512, 256): dead dark glass, a crack spidering from one corner.
    c.fillStyle = '#0d1418'; c.fillRect(512, 256, 384, 256);
    c.fillStyle = 'rgba(70,110,120,0.25)'; c.fillRect(530, 270, 160, 90);
    c.strokeStyle = 'rgba(210,225,230,0.75)'; c.lineWidth = 2;
    const ox = 512 + 300, oy = 256 + 70;
    for (let i = 0; i < 9; i++) {
      let x = ox, y = oy; const a = r() * 6.3; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += Math.cos(a + (r() - 0.5) * 0.8) * (14 + r() * 30); y += Math.sin(a + (r() - 0.5) * 0.8) * (14 + r() * 30); c.lineTo(Math.max(512, Math.min(896, x)), Math.max(256, Math.min(512, y))); }
      c.stroke();
    }
    c.beginPath(); c.arc(ox, oy, 10, 0, 7); c.stroke();
    // The dented locker door: 128 x 384 at (896, 256): grey-green steel, louvres, a fist-sized dent.
    c.fillStyle = '#5d6b5f'; c.fillRect(896, 256, 128, 384);
    c.fillStyle = '#4b574d'; for (let i = 0; i < 6; i++) c.fillRect(916, 280 + i * 12, 88, 5);
    const dg = c.createRadialGradient(950, 470, 2, 958, 476, 34); dg.addColorStop(0, 'rgba(25,30,26,0.75)'); dg.addColorStop(0.6, 'rgba(40,46,40,0.35)'); dg.addColorStop(1, 'rgba(120,135,120,0)');
    c.fillStyle = dg; c.fillRect(910, 430, 90, 90);
    c.strokeStyle = 'rgba(170,175,160,0.55)'; c.lineWidth = 2; c.beginPath(); c.arc(956, 470, 22, 3.6, 5.4); c.stroke();
    for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(120,70,40,${r() * 0.35})`; c.fillRect(896 + r() * 128, 256 + r() * 384, 2 + r() * 4, 2 + r() * 6); }
    // The mattress: 512 x 256 at (0, 640): ticking stripes, stains.
    c.fillStyle = '#d8d3c2'; c.fillRect(0, 640, 512, 256);
    c.fillStyle = '#9fa6b4'; for (let x = 0; x < 512; x += 22) c.fillRect(x, 640, 6, 256);
    for (let i = 0; i < 6; i++) {
      const x = 60 + r() * 380, y = 680 + r() * 170, rad = 20 + r() * 45;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, i < 2 ? 'rgba(110,40,30,0.55)' : 'rgba(150,120,60,0.45)'); g.addColorStop(0.75, 'rgba(140,110,60,0.25)'); g.addColorStop(1, 'rgba(140,110,60,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rad, rad * 0.7, r() * 3, 0, 7); c.fill();
    }
  });
  const sheetMat = std({ color: 0xffffff, map: sheet, transparent: true, alphaTest: 0.5, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const cell = (geo, x, y, w, h) => {   // map a plane's uvs onto one cell of the sheet (pixels, y down)
    const uv = geo.attributes && geo.attributes.uv; if (!uv) return geo;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * w) / 1024, 1 - (y + (1 - uv.getY(i)) * h) / 1024);
    uv.needsUpdate = true; return geo;
  };
  const printed = (name, w, h, c4, x, y, z, ry) => { const m = add(cell(new T.PlaneGeometry(w, h), ...c4), sheetMat, x, y, z); m.rotation.y = ry; parts.push(name); return m; };

  // Safety signs on the side walls (the +x wall's terminals end at z -2).
  printed('wear-sign-ears', 1.0, 0.7, [0, 0, 256, 180], R.maxX - 0.02, 2.2, 2.2, yawOf.px);
  printed('wear-sign-muzzle', 1.0, 0.7, [256, 0, 256, 180], R.maxX - 0.02, 2.2, 9.5, yawOf.px);
  printed('wear-sign-cease', 1.0, 0.7, [512, 0, 256, 180], R.minX + 0.02, 2.2, 2.5, yawOf.nx);
  printed('wear-sign-forward', 1.0, 0.7, [768, 0, 256, 180], R.minX + 0.02, 2.2, 11, yawOf.nx);

  const BZ = R.minZ;   // the back wall (faces +z)
  // The board, framed, right of the rack.
  box(1.18, 0.86, 0.03, steel, 5.0, 1.85, BZ + 0.02);
  printed('wear-days-board', 1.1, 0.77, [0, 256, 512, 360], 5.0, 1.85, BZ + 0.05, 0);   // GB-163: 1.5 cm proud of its frame (it fought it)
  // The weapon rack: a steel rail of seven hooks, the fifth snapped off (two empty bolt holes and a clean shadow).
  box(2.2, 0.12, 0.04, steel, 2.3, 1.55, BZ + 0.03); box(2.2, 0.12, 0.04, steel, 2.3, 1.05, BZ + 0.03);
  for (let i = 0; i < 7; i++) {
    const x = 1.4 + i * 0.3;
    if (i === WEAR.MISSING_HOOK) { for (const dy of [-0.025, 0.025]) box(0.012, 0.012, 0.004, std({ color: 0x0c0d0e }), x, 1.55 + dy, BZ + 0.052); continue; }
    for (const y of [1.55, 1.05]) { box(0.025, 0.025, 0.13, steel, x, y, BZ + 0.11); box(0.025, 0.06, 0.025, steel, x, y + 0.03, BZ + 0.17); }
  }
  parts.push('wear-rack-missing-hook');
  // The cracked monitor on its bracket, taped corner to corner.
  box(0.08, 0.08, 0.16, steel, -2.2, 1.75, BZ + 0.08);
  box(0.66, 0.44, 0.05, std({ color: 0x1b1d1f, roughness: 0.6 }), -2.2, 1.75, BZ + 0.18);
  printed('wear-monitor-cracked', 0.6, 0.38, [512, 256, 384, 256], -2.2, 1.75, BZ + 0.215, 0);
  const tapeMat = std({ color: 0xc9b98a, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: T.DoubleSide });
  for (const a of [0.55, -0.55]) {
    const t = add(new T.PlaneGeometry(0.58, 0.038), tapeMat, -2.2, 1.75, BZ + 0.26);
    t.rotation.z = a; t.castShadow = false;
  }
  parts.push('wear-monitor-tape');
  // Three lockers; the middle one dented, its door sprung ajar and hanging. GB-161: the bank is solid to him (one
  // box: `blockers`), and the dented door is on a hinge with a soft spring: bumped, shot or cut it swings and settles
  // back ajar; it never shuts (DOOR.min) and never folds back into the next locker (DOOR.max).
  const lockerMat = std({ color: 0x5d6b5f, roughness: 0.55, metalness: 0.4 });
  const blockers = [];
  let door = null;
  for (let i = 0; i < 3; i++) {
    const x = -6.4 + i * 0.62;
    box(0.6, 1.85, 0.48, lockerMat, x, 0.93, BZ + 0.26);
    if (i !== 1) { printed('wear-locker-door', 0.54, 1.62, [896, 256, 128, 384], x, 0.96, BZ + 0.512, 0); parts.pop(); continue; }
    const cavity = std({ color: 0x141614, roughness: 0.95 });
    add(new T.PlaneGeometry(0.5, 1.7), cavity, x, 0.96, BZ + 0.1);
    for (const s of [-1, 1]) { const side = add(new T.PlaneGeometry(0.32, 1.7), cavity, x + s * 0.24, 0.96, BZ + 0.26); side.rotation.y = -s * Math.PI / 2; }
    const sole = add(new T.PlaneGeometry(0.48, 0.3), cavity, x, 0.14, BZ + 0.26); sole.rotation.x = -Math.PI / 2;
    const lid = add(new T.PlaneGeometry(0.48, 0.3), cavity, x, 1.76, BZ + 0.26); lid.rotation.x = Math.PI / 2;
    const D = WEAR.DOOR, hx = x - 0.27, hz = BZ + 0.505, dw = 0.54;
    const pivot = new T.Group(); pivot.name = 'training-wear-locker-door'; pivot.position.set(hx, 0, hz); pivot.rotation.y = -D.rest; root.add(pivot);
    const leaf = box(dw, 1.62, 0.02, lockerMat, dw / 2, 0.95, 0, pivot); leaf.rotation.z = 0.025;
    const face = add(cell(new T.PlaneGeometry(dw, 1.62), 896, 256, 128, 384), sheetMat, dw / 2, 0.95, 0.018, pivot); face.rotation.z = 0.025;
    door = { pivot, hx, hz, w: dw, h: 1.65, angle: D.rest, vel: 0, solid: { minX: 0, maxX: 0, minY: 0, maxY: 1.78, minZ: 0, maxZ: 0, lockerDoor: true, prop: true } };
  }
  blockers.push({ minX: -6.4 - 0.31, maxX: -6.4 + 2 * 0.62 + 0.31, minY: 0, maxY: 1.86, minZ: BZ, maxZ: BZ + 0.51, lockers: true });
  const doorBox = () => {   // the leaf's box at its angle (local), a little thick so rounds find it
    const ex = door.hx + Math.cos(door.angle) * door.w, ez = door.hz + Math.sin(door.angle) * door.w;
    door.solid.minX = Math.min(door.hx, ex) - 0.03; door.solid.maxX = Math.max(door.hx, ex) + 0.03;
    door.solid.minZ = Math.min(door.hz, ez) - 0.03; door.solid.maxZ = Math.max(door.hz, ez) + 0.03;
    return door.solid;
  };
  doorBox();
  function kickDoor(impulse) { door.vel += impulse; return door.vel; }
  // A push at (x, z) along (dx, dz), local: which way the door swings depends on the side it is struck from.
  function pushDoor(x, z, dx, dz, strength) {
    const ux = Math.cos(door.angle), uz = Math.sin(door.angle);    // hinge to tip
    const along = (x - door.hx) * ux + (z - door.hz) * uz;
    const lever = Math.max(0.15, Math.min(1, along / door.w));
    const nx = -uz, nz = ux;                                         // the leaf's normal (angle grows toward +n)
    const push = dx * nx + dz * nz;
    return kickDoor(Math.sign(push || 1) * strength * lever);
  }
  // He walks into it: the leaf as a segment; within his radius it gives, the way he is moving.
  function bumpDoor(x, z, r, mvx = 0, mvz = 0) {
    const ux = Math.cos(door.angle), uz = Math.sin(door.angle);
    const t = Math.max(0, Math.min(door.w, (x - door.hx) * ux + (z - door.hz) * uz));
    const px = door.hx + ux * t, pz = door.hz + uz * t, d = Math.hypot(x - px, z - pz);
    if (d > r + 0.02) return false;
    const away = (x - px) * -uz + (z - pz) * ux;                     // his side of the leaf
    const dir = Math.hypot(mvx, mvz) > 1e-4 ? mvx * -uz + mvz * ux : -away;
    kickDoor(-Math.sign(away || dir || 1) * (1.4 + 0.6 * (t / door.w)));
    return true;
  }
  function stepDoor(dt) {
    const D = WEAR.DOOR, h = Math.min(dt, 0.05);
    door.vel += (-D.k * (door.angle - D.rest) - D.damp * door.vel) * h;
    door.angle += door.vel * h;
    if (door.angle < D.min) { door.angle = D.min; door.vel = Math.abs(door.vel) * 0.35; }       // the dent stops it short of shut
    if (door.angle > D.max) { door.angle = D.max; door.vel = -Math.abs(door.vel) * 0.3; }
    door.pivot.rotation.y = -door.angle;
    doorBox();
  }
  parts.push('wear-locker-dented');

  // ---------- the infirmary bay: an old sagging cot in front of the cabinet (clear of the wake bed and his stand)
  {
    const cx = bedAt.x + 3.25, cz = B.minZ + 3.25, L = 1.9, Wd = 0.72;
    for (const dz of [-Wd / 2, Wd / 2]) box(L, 0.035, 0.035, steel, cx, 0.42, cz + dz);
    for (const dx of [-L / 2 + 0.05, L / 2 - 0.05]) for (const s of [-1, 1]) { const leg = box(0.03, 0.5, 0.03, steel, cx + dx, 0.21, cz); leg.rotation.x = s * 0.62; }
    const canvas = std({ color: 0x6f6a4e, roughness: 0.95 });
    const mattress = std({ color: 0xffffff, map: sheet, roughness: 0.9 });
    const seg = 5, sl = L / seg;
    for (let i = 0; i < seg; i++) {   // it sags in the middle: a parabola, each piece tilted to follow it
      const t = (i + 0.5) / seg - 0.5, y = 0.43 - 0.09 * (1 - 4 * t * t), slope = 0.09 * 8 * t / L;
      const f = box(sl + 0.01, 0.015, Wd - 0.04, canvas, cx - L / 2 + sl * (i + 0.5), y, cz); f.rotation.z = Math.atan(slope);
      const m = add(cell(new T.BoxGeometry(sl + 0.01, 0.1, Wd - 0.1), i * 102, 640, 102, 256), mattress, cx - L / 2 + sl * (i + 0.5), y + 0.06, cz);
      m.rotation.z = Math.atan(slope); m.castShadow = true; m.receiveShadow = true;
    }
    parts.push('wear-cot-sagging', 'wear-mattress-stained');
  }

  return { parts, decals, dead, flicker, flickerMat: flickMat, update, blockers, door, kickDoor, pushDoor, bumpDoor };
}

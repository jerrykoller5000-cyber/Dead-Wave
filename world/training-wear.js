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

import { buildKitProp, createKitPropRuntime } from './training-kitprops.js';   // CG-7 (D-226)
import { getTrainingPBR, heightToNormalRGBA, makeDataTexture, makeFbmGrid, tileFbm } from './training-textures.js';

const WEAR_PBR_CACHE = new WeakMap();
// Procedural normal + ORM for sheet (1024->512) and kitTex (1024->512), pure math so Node stand-in tests stay instant
function getWearAtlases(T) {
  let c = WEAR_PBR_CACHE.get(T);
  if (c) return c;
  const S = 512;
  const shFineGrid = makeFbmGrid(64, 32, 32, 503, 2);
  const shBrushGrid = makeFbmGrid(64, 8, 48, 521, 2);
  const ktFineGrid = makeFbmGrid(64, 32, 32, 607, 2);
  // 1) Printed sheet normal + ORM (coords are half of 1024x1024 sheet)
  const shH = new Float32Array(S * S);
  const shOrm = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, o = i * 4, u = x / S, v = y / S;
    const fine = shFineGrid(u, v) - 0.5;
    let hv = 0.52 + fine * 0.04, ao = 0.95, rgh = 0.72, met = 0.05;
    if (y < 90) {
      // Four safety signs (each 128x90): semi-gloss enameled aluminum with rim bevel & rust corner
      const lx = x % 128, ly = y;
      const rim = Math.min(Math.min(lx, 127 - lx), Math.min(ly, 89 - ly));
      hv = rim < 3 ? 0.64 : 0.52 + fine * 0.05;
      rgh = 0.44 + Math.abs(fine) * 0.14; met = 0.18;
      if (lx > 102 && ly < 24) { hv = 0.72; rgh = 0.85; met = 0.02; ao = 0.75; }
    } else if (x < 256 && y >= 128 && y < 308) {
      // Days Without Incident board (0..256, 128..308): metal frame + glossy dry-erase inset
      const inWhite = x >= 73 && x <= 183 && y >= 192 && y <= 292;
      rgh = inWhite ? 0.24 + Math.abs(fine) * 0.08 : 0.48 + Math.abs(fine) * 0.1;
      met = inWhite ? 0.04 : 0.22;
      hv = inWhite ? 0.48 : 0.56 + fine * 0.04;
    } else if (x >= 256 && x < 448 && y >= 128 && y < 256) {
      // Cracked monitor glass (256..448, 128..256): glossy CRT glass + radial crack relief
      const dx = x - (256 + 150), dy = y - (128 + 35), d = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const ray = Math.abs(Math.sin(ang * 4.5 + 0.4));
      const crack = (d < 85 && ray < 0.07) || Math.abs(d - 5) < 1.5 ? 1 : 0;
      hv = crack ? 0.26 : 0.60;
      rgh = crack ? 0.78 : 0.16;
      met = 0.06;
      ao = crack ? 0.62 : 0.98;
    } else if ((x >= 448 && y >= 128 && y < 320) || (x >= 256 && x < 320 && y >= 320)) {
      // Locker doors (dented at 448..512, 128..320; plain at 256..320, 320..512)
      const isDent = x >= 448;
      const lx = isDent ? x - 448 : x - 256;
      const ly = isDent ? y - 128 : y - 320;
      const brush = shBrushGrid(u, v) - 0.5;
      hv = 0.56 + brush * 0.05; rgh = 0.54 + Math.abs(brush) * 0.14; met = 0.36;
      // Six louvered vent slots
      if (lx >= 10 && lx <= 54 && ly >= 12 && ly <= 46 && ((ly - 12) % 6) < 2.5) {
        hv = 0.20; ao = 0.45; rgh = 0.78;
      }
      // Fist dent depression on dented door
      if (isDent) {
        const dd = Math.hypot(lx - 30, ly - 109) / 18;
        if (dd < 1) {
          const dep = Math.cos(dd * Math.PI * 0.5);
          hv -= dep * 0.36; ao -= dep * 0.22;
          if (dd > 0.65 && dd < 0.92) { rgh = 0.34; met = 0.74; } // scuffed bare steel rim on dent
        }
      }
    } else if (x < 256 && y >= 320 && y < 448) {
      // Cot mattress ticking (0..256, 320..448): woven cloth + subtle button-tuft dimples
      const weave = Math.sin(x * 1.8) * Math.sin(y * 1.8) * 0.08;
      const tx = ((x - 32) % 64) - 32, ty = ((y - 352) % 64) - 32;
      const td = Math.hypot(tx, ty) / 12;
      const tuft = td < 1 ? Math.cos(td * Math.PI * 0.5) * 0.26 : 0;
      hv = 0.55 + weave - tuft + fine * 0.06;
      ao = 0.95 - tuft * 0.9;
      rgh = 0.93; met = 0.0;
    }
    shH[i] = hv;
    shOrm[o] = Math.max(30, Math.min(255, Math.round(ao * 255)));
    shOrm[o + 1] = Math.max(24, Math.min(252, Math.round(rgh * 255)));
    shOrm[o + 2] = Math.max(0, Math.min(255, Math.round(met * 255)));
    shOrm[o + 3] = 255;
  }

  // 2) Story & 33-swatch kit atlas normal + ORM (512x512 = half of 1024x1024 kitTex)
  // Per-swatch physical properties indexed by WEAR.STORY.SWATCH_NAMES order (0..32):
  // [roughness, metalness, patternKind]  pattern: 0=smooth/ceramic, 1=wood, 2=brushedMetal, 3=wovenCloth, 4=plastic, 5=rubber, 6=foam
  const SW_PBR = [
    [0.24, 0.02, 0], [0.08, 0.00, 0], [0.84, 0.00, 1], [0.30, 0.86, 2], [0.92, 0.00, 3], [0.64, 0.00, 1], [0.58, 0.00, 1],
    [0.44, 0.78, 2], [0.28, 0.90, 2], [0.54, 0.02, 4], [0.52, 0.02, 4], [0.82, 0.00, 5], [0.32, 0.88, 2], [0.46, 0.02, 4],
    [0.36, 0.80, 2], [0.94, 0.00, 3], [0.50, 0.02, 4], [0.22, 0.02, 0], [0.78, 0.00, 5], [0.52, 0.72, 2], [0.94, 0.00, 3],
    [0.96, 0.00, 3], [0.56, 0.08, 4], [0.90, 0.00, 3], [0.46, 0.56, 2], [0.90, 0.00, 3], [0.46, 0.20, 2], [0.60, 0.00, 0],
    [0.92, 0.00, 0], [0.38, 0.82, 2], [0.60, 0.00, 1], [0.96, 0.00, 6], [0.48, 0.02, 4],
  ];
  const ktH = new Float32Array(S * S);
  const ktOrm = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, o = i * 4, u = x / S, v = y / S;
    const fine = ktFineGrid(u, v) - 0.5;
    let hv = 0.52 + fine * 0.03, ao = 0.96, rgh = 0.88, met = 0.0;
    if (y >= 384) {
      // Swatch grid: 16 cols x 3 rows of 32x32 px (half of 64x64)
      const col = x >> 5, row = (y - 384) >> 5, idx = row * 16 + col;
      const spec = SW_PBR[idx] || [0.72, 0.12, 4];
      rgh = spec[0]; met = spec[1];
      const pat = spec[2];
      const lx = (x & 31) / 32, ly = (y & 31) / 32;
      if (pat === 1) { // wood grain
        const g = Math.sin((lx * 14 + Math.sin(ly * 6) * 0.8) * Math.PI);
        hv = 0.52 + g * 0.10 + fine * 0.05; rgh += g * 0.06; ao = 0.94 + g * 0.05;
      } else if (pat === 2) { // brushed metal
        const b = tileFbm(lx, ly, 4, 24, 613 + idx, 2) - 0.5;
        hv = 0.52 + b * 0.08; rgh += b * 0.08;
      } else if (pat === 3) { // woven cloth / burlap
        const wv = Math.sin(lx * Math.PI * 16) * Math.sin(ly * Math.PI * 16);
        hv = 0.52 + wv * 0.20 + fine * 0.06; ao = 0.90 + wv * 0.08;
      } else if (pat === 5) { // ribbed rubber
        const rb = Math.sin(ly * Math.PI * 12);
        hv = 0.52 + rb * 0.14; ao = 0.92 + rb * 0.06;
      } else if (pat === 6) { // porous foam
        const fm = tileFbm(lx, ly, 16, 16, 631, 2) - 0.5;
        hv = 0.52 + fm * 0.24; ao = 0.84 + fm * 0.16;
      } else { // ceramic / plastic
        hv = 0.52 + fine * 0.03;
      }
    } else if (x >= 256 && y < 160) {
      // Whiteboard (512..1024, 0..320 -> half 256..512, 0..160): glossy dry-erase melamine
      rgh = 0.24 + Math.abs(fine) * 0.08; met = 0.02; hv = 0.54;
    } else if (x >= 256 && y >= 352 && y < 384) {
      // HOSE DOWN enamel steel plate (512..1024, 704..768 -> half 256..512, 352..384)
      rgh = 0.46 + Math.abs(fine) * 0.12; met = 0.22; hv = 0.55 + fine * 0.06;
    } else {
      // Paper notices, roster, qualification card, obs chart, calendar, tape
      rgh = 0.90 + fine * 0.06; met = 0.0; hv = 0.50 + fine * 0.06;
    }
    ktH[i] = hv;
    ktOrm[o] = Math.max(30, Math.min(255, Math.round(ao * 255)));
    ktOrm[o + 1] = Math.max(18, Math.min(252, Math.round(rgh * 255)));
    ktOrm[o + 2] = Math.max(0, Math.min(255, Math.round(met * 255)));
    ktOrm[o + 3] = 255;
  }

  c = {
    sheetNrm: makeDataTexture(T, heightToNormalRGBA(shH, S, S, 2.2, false, false), S, S, { name: 'tg-sheet-nrm', srgb: false, repeat: false, aniso: 8 }),
    sheetOrm: makeDataTexture(T, shOrm, S, S, { name: 'tg-sheet-orm', srgb: false, repeat: false, aniso: 8 }),
    kitNrm: makeDataTexture(T, heightToNormalRGBA(ktH, S, S, 2.0, false, false), S, S, { name: 'tg-kit-nrm', srgb: false, repeat: false, aniso: 8 }),
    kitOrm: makeDataTexture(T, ktOrm, S, S, { name: 'tg-kit-orm', srgb: false, repeat: false, aniso: 8 }),
  };
  WEAR_PBR_CACHE.set(T, c);
  return c;
}

export const WEAR = Object.freeze({
  PX: 32,                                              // floor and wall decals: pixels a metre
  FLICKER: Object.freeze({ wall: 'px', z: 14, len: 3.2 }),
  DEAD: Object.freeze([{ wall: 'nx', z: 19, len: 3 }, { wall: 'px', z: 25, len: 2.6 }]),
  VENTS: Object.freeze([['px', 8], ['px', 22], ['nx', 7], ['nx', 21]]),
  MISSING_HOOK: 4,
  SIGN_MARGIN: 20,                                     // px each side inside a 256 px sign (GB-161)
  DOOR: Object.freeze({ rest: 0.5, min: 0.22, max: 2.2, k: 16, damp: 2.0 }),   // GB-161: the dented door's spring (rad, 1/s^2, 1/s)
  FLOOR_PX: 80,                                        // the floor sheet: pixels a metre (1280 x 3360; CH-3 #9: was 48, chunky)
  WALL_PX: 64,                                         // the backstop and the tile above it: pixels a metre
  LANE_USE: Object.freeze([0.35, 1.0, 0.55, 0.08, 0.22]),  // lane 1..5: lane 2 the favourite, lane 4 barely touched
  // CG-2 (D-218 pass 2): the story props. Names only from docs/story.md (the twelve of FOB Threshold, their ranks).
  STORY: Object.freeze({
    ROSTER_HEAD: 'ROTATION: THRESHOLD \u00b7 12', ROSTER_SUB: 'PGB RANGE \u00b7 RIDGELINE ANNEX',
    ROSTER: Object.freeze([['CPT', 'HALE M.'], ['LT', 'ADE S.'], ['SGT', 'SATO K.'], ['SGT', 'BRANDT E.'], ['CPL', 'DELGADO R.'],
      ['CPL', 'CLARKE I.'], ['CPL', 'OKAFOR D.'], ['SPC', 'MENSAH A.'], ['SPC', 'PIKE'], ['PFC', 'PRICE J.'], ['PVT', 'LINDQVIST T.'],
      ['PVT', 'KOWALSKI D.']]),
    LOCKERS: Object.freeze(['HALE', 'PRICE', 'OKAFOR']),
    CARD_HEAD: 'QUALIFICATION',
    CARD: Object.freeze([[2, '38/40', 'MH'], [2, '36/40', 'JP'], [1, '33/40', 'KS'], [2, '39/40', 'EB'], [3, '31/40', 'RD'],
      [2, '35/40', 'DO'], [2, '37/40', 'P'], [5, '29/40', 'DK']]),
    BOARD_HEAD: 'DRILLS WK 3', BOARD_DAYS: Object.freeze(['MON', 'TUE', 'WED', 'THU', 'FRI']),
    TALLY_HEAD: 'REVIVALS THIS ROTATION', TALLY: 23, CHART_HEAD: 'OBS',
    SWATCH_NAMES: Object.freeze(['mug', 'coffee', 'hardboard', 'clip', 'bristle', 'broomhead', 'handle', 'pail', 'brass', 'tote',
      'earcup', 'earband', 'alu', 'marker', 'pin', 'blanket', 'sharpslid', 'whitemug',
      'hose', 'drain', 'mophead', 'sandbag', 'radio', 'glove', 'reel', 'scuff', 'plate',
      'stain', 'paper', 'brassdk', 'broomwood', 'foam', 'mopyellow']),
    // CG-7 step 5 (D-237 #11): each swatch's material for the hit effects (world/training-hitfx.js reads mesh.userData.fx)
    SWATCH_FX: Object.freeze({ mug: 'china', whitemug: 'china', coffee: 'china', stain: 'china', hardboard: 'wood', clip: 'steel', bristle: 'wood',
      broomhead: 'wood', handle: 'wood', broomwood: 'wood', pail: 'steel', brass: 'steel', brassdk: 'steel', tote: 'plastic', earcup: 'plastic',
      earband: 'plastic', alu: 'steel', marker: 'plastic', pin: 'steel', blanket: 'cloth', sharpslid: 'plastic', hose: 'plastic', drain: 'steel',
      mophead: 'cloth', sandbag: 'sand', radio: 'plastic', glove: 'cloth', reel: 'steel', scuff: 'cloth', plate: 'steel', paper: 'paper',
      foam: 'cloth', mopyellow: 'plastic' }),
    SWATCH: Object.freeze(['#4c5a45', '#2a1a10', '#7a5a3a', '#9aa0a3', '#2b2622', '#8a2a22', '#c9a654', '#55595c', '#b8893a', '#2c3236',
      '#3f5a3a', '#1c1f21', '#b9bec1', '#1b3c8c', '#b3261e', '#5f6b4a', '#c9a654', '#d9d6cc',
      '#25301f', '#2a2c2d', '#bdb6a0', '#8c7b58', '#36413a', '#4a4535', '#66403a', '#46413a', '#e0b81c',
      '#4a3322', '#e8e3d4', '#6e5426', '#7a5634', '#18191a', '#a48c4c']),
    // CG-7 (D-226): the rebuilt bench props' new swatches: a coffee stain, plain paper, the shadowed brass under the loose
    // cases, the broom's lacquered block, black ear-cushion foam; the mop bucket's dusty yellow (Claude 9, 22:5xZ: off the
    // hazard paint it stands on).
    // CI-2 (Claude 9's colour notes, Director 20:24Z): the sharps lid and mop bucket faded out of the amber take band,
    // the glove matches the issued glove, the reel a muted dark red (not a danger red by the gate); the HOSE DOWN plate
    // keeps its own safety yellow ('plate').
    ROSTER_AT: Object.freeze({ x: 6.0, y: 1.55 }),
    MUG: Object.freeze({ x: -7.0, z: 0.6 }), CLIP: Object.freeze({ x: -6.68, z: 0.47, ry: 0.18 }),
    BROOM: Object.freeze({ x: -7.72 }), BUCKET: Object.freeze({ x: -7.25, z: 0.02 }),
    // CG-7 (Jerry D-230: "Move this prop to the range counter"): the ear-defender tray lies on the bench's worktop at the
    // wall end (it stood on the floor by the range console); the mug and the clipboard step along to make room.
    TOTE: Object.freeze({ x: -7.52, z: 0.45, ry: 0.04, bench: true }),
    // CG-7 (Jerry D-229: "Move this prop somewhere else. Put the light switch here instead."): the cracked monitor moves
    // to the range's west wall, downrange of the RANGE CONTROL console (the old screen it replaced, still waiting on its
    // replacement); the switch takes its old spot on the back wall.
    MONITOR: Object.freeze({ wall: 'west', z: -2.75, y: 1.5 }),
    WHITEBOARD: Object.freeze({ x: -3.85, y: 1.55 }),
    // Beat 5, the infirmary (offsets from bedAt, the wake stretcher; the bay's back wall is B.minZ)
    MEDIC: Object.freeze({ tallyDX: -1.55, tallyY: 1.6, sharpsDX: 1.62, sharpsY: 1.2, mugDX: 3.4, mugZ: 0.88 }),
    // CG-2 sheet 2. Beat 4, the Containment crew (build room, the gate end; B.maxZ is the gate's wall): the hose reel on
    // the wall west of the gate and its stencilled plate, the hose run to a floor drain, a mop bucket and squeegee in the
    // west corner, three sandbags east of the gate. The drains themselves: BUILD_WEAR.DRAINS (their rust and wet floor).
    STENCIL: 'HOSE DOWN AFTER EVERY SESSION',
    REEL: Object.freeze({ x: -31.2, y: 1.05 }), MOP: Object.freeze({ x: -43.5, z: 26.75 }), SQUEEGEE_Z: 25.55,
    SANDBAGS: Object.freeze({ x: -20.95, z: 27.62 }),
    DRAINS: Object.freeze([Object.freeze([-31.75, 25.15]), Object.freeze([-24.45, 16.25])]),
    // Beat 6, the Branch's paper (words: ChatGPT, 21 Nov, by request; the Director: keep them here). Never about the dead.
    NOTE_HEAD: 'PGB \u00b7 NOTICE',
    NOTES: Object.freeze([
      'Replacement request 3 received. Tape approved.',              // 0 taped on the cracked monitor
      'Specimen names are assigned by Inventory.',                   // 1 on the gate's west pilaster
      'Training cash. Reimbursements require a different kind of money.',   // 2 on the wall by the supply kiosk
      'Return board markers to the tray. Caps count.',               // 3 by the REVIVALS board
      'Return hose to reel. Initial the box marked RETURNED.'        // 4 on the hose reel's backboard
    ]),
    // Beat 7, small life: a calendar on the range's back wall (days crossed off up to a circled one), a silent radio at
    // the bench's east end, a glove left on the bench.
    CAL_MARK: 'ROTATION OUT', CAL_DAYS: 30, CAL_FIRST: 3, CAL_CROSSED: 19, CAL_CIRCLE: 24,
    CAL: Object.freeze({ x: -0.6, y: 1.5 }), RADIO: Object.freeze({ x: 6.85, z: 0.58, ry: -0.25 }), GLOVE: Object.freeze({ x: 2.3, z: 0.42, ry: 0.6 })
  })
});

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

const TRAINING_RANGES = [8, 12, 16, 20, 25];   // TRAINING.RANGES (not imported: training.js imports this file)

export function dressTrainingWear(T, { R, B, bedAt, add, box, std, texture, lampMat, root }) {
  const parts = [], decals = [], dead = [], destructSpecs = [];
  // CH-3 #9 (the native walk: "chunky pixel wear"): every sheet here is mipmapped with anisotropic filtering, so the wear
  // stays sharp at the low angles the floor is seen at (as Claude 8's tiles, CH-3 #1)
  const tex = (w, h, draw) => { const t = texture ? texture(w, h, draw) : null; if (t) { t.anisotropy = 8; t.generateMipmaps = true; } return t; };
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
  decal('wear-floor', RW, RD, floorTex, (R.minX + R.maxX) / 2, 0.001, (R.minZ + R.maxZ) / 2, 0, -Math.PI / 2);

  // The yellow line: faded unevenly, and chipped to the tile in ragged flakes where people stand (more where more do).
  const CP = 128;   // CH-3 #9: the chip sheet's pixels a metre (was 64, 32 px tall: the line's fade read as blocks)
  const chipTex = tex(RW * CP, 64, (c, w, h) => {
    const r = rng(77);
    for (let x = 0; x < w; x += 6) { c.fillStyle = `rgba(205,208,210,${0.05 + r() * 0.2})`; c.fillRect(x, 0, 6 + r() * 10, h); }
    const flake = (u, v, s) => {
      c.beginPath(); const n = 5 + (r() * 4 | 0);
      for (let k = 0; k < n; k++) { const a = k / n * 6.28, d = s * (0.4 + r() * 0.8); k ? c.lineTo(u + Math.cos(a) * d * 1.5, v + Math.sin(a) * d) : c.moveTo(u + Math.cos(a) * d * 1.5, v + Math.sin(a) * d); }
      c.closePath(); c.fill();
    };
    lanes.forEach((lx, i) => {
      const n = Math.round(4 + WEAR.LANE_USE[i] * 50);
      for (let k = 0; k < n; k++) {
        c.fillStyle = r() < 0.75 ? `rgba(196,200,202,${0.75 + r() * 0.25})` : 'rgba(150,146,136,0.85)';
        flake((lx - R.minX + (r() - 0.5) * (0.6 + WEAR.LANE_USE[i] * 1.4)) * CP, r() * h, (1.5 + r() * (3 + WEAR.LANE_USE[i] * 7)) * CP / 64);
      }
    });
    for (let k = 0; k < 25; k++) { c.fillStyle = 'rgba(196,200,202,0.85)'; flake(r() * w, r() * h, (1 + r() * 3) * CP / 64); }   // strays along it
  });
  decal('wear-line-chips', RW, 0.27, chipTex, 0, 0.0015, 0, 0, -Math.PI / 2).renderOrder = 1.05;   // CJ-1: over the floor sheet in a fixed order

  // ---------- (2) the walls
  // Where the side walls' features go (range local): vents with corner bolts, a conduit's brackets with two bolts.
  const sideX = { px: R.maxX, nx: R.minX };
  const yawOf = { px: -Math.PI / 2, nx: Math.PI / 2 };
  const nrm = { px: -1, nx: 1 };
  const pbr = getTrainingPBR(T);
  const worldUvMats = new Map();
  const ventMat = std(pbr ? pbr.galvDuct.opts({ color: 0xd0d6da }) : { color: 0x8c9398, roughness: 0.6, metalness: 0.5 });
  const boltMat = std(pbr ? pbr.steelDark.opts({ color: 0xc89a78 }) : { color: 0x6d5a48, roughness: 0.8, metalness: 0.4 });
  const steel = std(pbr ? pbr.steelDark.opts() : { color: 0x3a4046, roughness: 0.45, metalness: 0.6 });
  worldUvMats.set(ventMat, 0.8); worldUvMats.set(boltMat, 0.5); worldUvMats.set(steel, 1.0);
  const bolts = { px: [], nx: [] }, vents = { px: [], nx: [] };
  for (const [side, z] of WEAR.VENTS) {
    const x = sideX[side] + nrm[side] * 0.02;
    box(0.04, 0.46, 0.92, ventMat, x, 5.0, z);
    for (let i = 0; i < 5; i++) box(0.02, 0.03, 0.78, steel, sideX[side] + nrm[side] * 0.05, 4.84 + i * 0.08, z);
    for (const dy of [-0.19, 0.19]) for (const dz of [-0.42, 0.42]) { box(0.016, 0.04, 0.04, boltMat, sideX[side] + nrm[side] * 0.048, 5.0 + dy, z + dz); bolts[side].push([z + dz, 5.0 + dy]); }
    vents[side].push(z); parts.push('wear-vent');
  }
  for (const side of ['px', 'nx']) {
    const x = sideX[side] + nrm[side] * 0.06;
    const z0 = side === 'px' ? -1.5 : -5.2, zPostLo = 0.7075, zPostHi = 0.7825, zEnd = R.maxZ - 0.6;
    for (const [za, zb] of [[z0, zPostLo], [zPostHi, zEnd]]) {
      const cond = box(0.05, 0.05, zb - za, steel, x, 4.4, (za + zb) / 2); cond.castShadow = false;
    }
    for (let z = z0 + 1; z < zEnd - 0.4; z += 4) {
      box(0.035, 0.12, 0.09, steel, sideX[side] + nrm[side] * 0.0175, 4.4, z);
      for (const dz of [-0.03, 0.03]) { box(0.016, 0.024, 0.024, boltMat, sideX[side] + nrm[side] * 0.043, 4.444, z + dz); bolts[side].push([z + dz, 4.46]); }
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
  let wait = 3 + fr() * 6, burst = 0, tick = 0, on = true, flickerBroken = false, lastLit = true;
  function update(dt, lit) {
    lastLit = !!lit;
    if (door) stepDoor(dt);   // GB-161
    if (flickerBroken) { flickMat.emissiveIntensity = 0; flickMat.color.setHex(0x222629); return; }
    if (!lit) { flickMat.emissiveIntensity = lampMat.emissiveIntensity; flickMat.color.copy(lampMat.color); return; }
    if (burst > 0) {
      burst -= dt; tick -= dt;
      if (tick <= 0) { on = !on; tick = 0.03 + fr() * 0.09; }
      if (burst <= 0) { on = true; wait = 4 + fr() * 9; }
    } else if ((wait -= dt) <= 0) { burst = 0.25 + fr() * 0.7; tick = 0; }
    flickMat.emissiveIntensity = on ? lampMat.emissiveIntensity : 0.04;
    flickMat.color.setHex(on ? 0xffffff : 0x6a7074);
  }
  destructSpecs.push({ id: 'flickerStrip', kind: 'flickerTube', meshes: [flicker], wallNormal: { x: nrm[WEAR.FLICKER.wall], z: 0 }, onShatter: (b) => { flickerBroken = !!b; if (b) { flickMat.emissiveIntensity = 0; flickMat.color.setHex(0x222629); } else { update(0, lastLit); } } });

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
    { // CG-2 beat 1: this locker's name, masking tape at the plain doors' card height (cell 128 px = 0.33 m, 384 px = 1.62 m)
      const n = WEAR.STORY.LOCKERS[1], tx = 896 + 64 - 35, ty = 256 + 120, tw = 70, th = 16;
      c.fillStyle = '#d8c896'; c.fillRect(tx, ty, tw, th); c.fillStyle = 'rgba(120,100,50,0.3)'; c.fillRect(tx, ty, tw, 1); c.fillRect(tx, ty + th - 1, tw, 1);
      c.fillStyle = '#16181b'; c.textAlign = 'center'; c.textBaseline = 'middle';
      let px = 15; c.font = `bold ${px}px "Segoe Print", "Comic Sans MS", Arial, sans-serif`;
      while (px > 6 && c.measureText(n).width > tw - 6) { px -= 1; c.font = `bold ${px}px "Segoe Print", "Comic Sans MS", Arial, sans-serif`; }
      c.fillText(n, tx + tw / 2, ty + th / 2 + 1); }
    // CG-1 (AH-1 #16): the lockers that are not dented get their own door: 128 x 384 at (512, 640): the same steel and
    // louvres, a paper name strip, its own scuffs; no dent.
    c.fillStyle = '#5d6b5f'; c.fillRect(512, 640, 128, 384);
    c.fillStyle = '#4b574d'; for (let i = 0; i < 6; i++) c.fillRect(532, 664 + i * 12, 88, 5);
    c.fillStyle = '#d9d3bb'; c.fillRect(546, 760, 60, 16); c.fillStyle = 'rgba(40,40,40,0.55)'; c.fillRect(552, 766, 40, 4);
    for (let i = 0; i < 22; i++) { c.fillStyle = `rgba(120,70,40,${r() * 0.3})`; c.fillRect(512 + r() * 128, 640 + r() * 384, 2 + r() * 4, 2 + r() * 5); }
    for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(170,175,160,0.25)'; c.fillRect(520 + r() * 110, 900 + r() * 110, 10 + r() * 20, 2); }
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
  const wearAtlases = pbr ? getWearAtlases(T) : null;
  const sheetMat = std({ color: 0xffffff, map: sheet,
    ...(wearAtlases ? { normalMap: wearAtlases.sheetNrm, normalScale: T.Vector2 ? new T.Vector2(0.85, 0.85) : undefined, roughnessMap: wearAtlases.sheetOrm, metalnessMap: wearAtlases.sheetOrm, aoMap: wearAtlases.sheetOrm, aoMapIntensity: 0.65, roughness: 1.0, metalness: 1.0 } : { roughness: 0.8 }),
    transparent: true, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const cell = (geo, x, y, w, h) => {   // map a plane's uvs onto one cell of the sheet (pixels, y down)
    const uv = geo.attributes && geo.attributes.uv; if (!uv) return geo;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * w) / 1024, 1 - (y + (1 - uv.getY(i)) * h) / 1024);
    uv.needsUpdate = true; return geo;
  };
  const printed = (name, w, h, c4, x, y, z, ry, parent) => { const m = add(cell(new T.PlaneGeometry(w, h), ...c4), sheetMat, x, y, z, parent); m.rotation.y = ry; parts.push(name); return m; };

  // Safety signs on the side walls (the +x wall's terminals end at z -2). CG-1 (CF-20 #10): 0.6 x 0.42 m at 1.8 m (were
  // 1.0 x 0.7 m at 2.2 m: a wall made for a taller man).
  // CG-2 (AH-4 #22): flat on the side walls they were thin slivers from the bench, behind the screen's mesh. Ranges hang
  // these on a swing-out bracket turned toward the line: a steel plate hinged on a wall strip at its near edge, swung
  // SIGN_SWING out, two struts back to the wall at its far edge. The face looks back up the range at the shooter.
  const SIGN_SWING = 0.7, SW = 0.6, SH = 0.42, PW = SW + 0.04, PH = SH + 0.04, PT = 0.012;
  const swungSign = (name, c4, side, y, z0, destructId) => {
    const n = nrm[side], sa = Math.sin(SIGN_SWING), ca = Math.cos(SIGN_SWING), wx = sideX[side];
    const ry = side === 'px' ? -Math.PI / 2 - SIGN_SWING : Math.PI / 2 + SIGN_SWING;
    const fx = -Math.cos(SIGN_SWING) * -n, fz = -sa;   // the face's normal: off the wall and back toward the line
    const hinge = 0.03;                                 // the plate's near edge stands on the wall strip's face
    const cxp = wx + n * (hinge + (PW / 2) * sa), czp = z0 + (PW / 2) * ca;
    box(0.03, PH, 0.03, steel, wx + n * 0.015, y, z0);  // the wall strip it hinges on
    const plate = box(PW, PH, PT, steel, cxp, y, czp); plate.rotation.y = ry;
    const face = printed(name, SW, SH, c4, cxp + fx * (PT / 2 + 0.002), y, czp + fz * (PT / 2 + 0.002), ry);
    const farX = wx + n * (hinge + PW * sa), farZ = z0 + PW * ca, reach = Math.abs(farX - wx) - 0.006;
    for (const dy of [-PH / 2 + 0.04, PH / 2 - 0.04]) box(reach, 0.02, 0.02, steel, wx + n * reach / 2, y + dy, farZ + 0.012);   // struts, behind the plate
    if (destructId) destructSpecs.push({ id: destructId, kind: 'sign', meshes: [plate, face], wallNormal: { x: fx, z: fz } });
    return face;
  };
  swungSign('wear-sign-ears', [0, 0, 256, 180], 'px', 1.8, 2.2, 'signEars');
  swungSign('wear-sign-muzzle', [256, 0, 256, 180], 'px', 1.8, 9.5, 'signMuzzle');
  swungSign('wear-sign-cease', [512, 0, 256, 180], 'nx', 1.8, 2.5, 'signCease');
  swungSign('wear-sign-forward', [768, 0, 256, 180], 'nx', 1.8, 11, 'signForward');

  const BZ = R.minZ;   // the back wall (faces +z)
  // The board, framed, right of the rack (seated 0.0 mm flush on BZ).
  // CG-1 (CF-20 #10, AH-1 #22): centre 1.5 m (was 1.85); the face 2 mm on its frame (it stood 1.5 cm off it, floating;
  // the sheet's polygonOffset keeps it from fighting the frame).
  const dbFrame = box(1.18, 0.86, 0.03, steel, 5.0, 1.5, BZ + 0.015);
  const dbFace = printed('wear-days-board', 1.1, 0.77, [0, 256, 512, 360], 5.0, 1.5, BZ + 0.032, 0);
  destructSpecs.push({ id: 'daysBoard', kind: 'sign', meshes: [dbFrame, dbFace], wallNormal: { x: 0, z: 1 } });
  // The weapon rack: steel rails seated 0.0 mm flush on BZ, hooks flush on rails with zero stem/tip overlap.
  // CG-1 (CD-18 B1, AH-1 #22): the lower rail sat on the blue band (1.05 m) and the 2.5 cm dark hooks vanished. Rails
  // now at 1.25 and 1.75 m, hooks 3.5 cm in a lighter zinc steel with a turned-up tip, so the rack reads as a rack.
  const hookMat = std(pbr ? pbr.steelLight.opts({ color: 0xd8dfe3 }) : { color: 0x8c9398, roughness: 0.45, metalness: 0.6 });
  worldUvMats.set(hookMat, 0.7);
  const RY = [1.75, 1.25];
  // CH-3 #16 (the native walk: "two flat straps"): each rail is a pressed steel channel now, its web on the wall and two
  // lips standing out top and bottom, held by bolts at the ends and the middle; the hooks are round bar, bent up at the tip.
  for (const y of RY) {
    box(2.2, 0.12, 0.012, steel, 2.3, y, BZ + 0.006);                                         // the web, flush on the wall
    for (const s of [-1, 1]) box(2.2, 0.01, 0.045, steel, 2.3, y + s * 0.055, BZ + 0.0225);  // its lips
    if (T.CylinderGeometry) for (const bx of [1.25, 2.3, 3.35]) { const b = add(new T.CylinderGeometry(0.011, 0.011, 0.012, 8), hookMat, bx, y, BZ + 0.018); b.rotation.x = Math.PI / 2; }
  }
  const bar = (len, x, y, z, rx) => { const m = T.CylinderGeometry ? add(new T.CylinderGeometry(0.0085, 0.0085, len, 8), hookMat, x, y, z) : box(0.017, len, 0.017, hookMat, x, y, z); m.rotation.x = rx; m.castShadow = true; return m; };
  for (let i = 0; i < 7; i++) {
    const x = 1.4 + i * 0.3;
    if (i === WEAR.MISSING_HOOK) { for (const dy of [-0.025, 0.025]) box(0.012, 0.012, 0.004, std({ color: 0x0c0d0e }), x, RY[0] + dy, BZ + 0.042); continue; }
    for (const y of RY) { bar(0.14, x, y, BZ + 0.082, Math.PI / 2); bar(0.06, x, y + 0.022, BZ + 0.152, -0.35); }
  }
  parts.push('wear-rack-missing-hook');
  // The cracked monitor on its bracket, seated 0.0 mm flush on its wall and taped right across the screen face.
  // CG-1 (CF-20 #10): its centre at 1.5 m (was 1.75). CG-7 (Jerry D-229): moved off the back wall (the light switch is
  // there now) to the range's west wall, beside the RANGE CONTROL console: WEAR.STORY.MONITOR. Built facing +z, then turned.
  const MY = WEAR.STORY.MONITOR.y;
  const monX = WEAR.STORY.MONITOR.wall === 'east' ? R.maxX : R.minX, monRy = WEAR.STORY.MONITOR.wall === 'east' ? -Math.PI / 2 : Math.PI / 2;
  { const mon = new T.Group(); mon.position.set(monX, 0, WEAR.STORY.MONITOR.z); mon.rotation.y = monRy; if (root) root.add(mon);   // its +z faces into the range
    box(0.08, 0.08, 0.155, steel, 0, MY, 0.0775, mon);
    const mCase = box(0.66, 0.44, 0.05, std({ color: 0x1b1d1f, roughness: 0.6 }), 0, MY, 0.18, mon);
    const mScr = printed('wear-monitor-cracked', 0.6, 0.38, [512, 256, 384, 256], 0, MY, 0.208, 0, mon);
    const tapeMat = std(pbr ? pbr.medicalEnamel.opts({ color: 0xd8c694, extra: { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: T.DoubleSide } }) : { color: 0xc9b98a, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: T.DoubleSide });
    const mTapes = [];
    for (const a of [0.55, -0.55]) {
      const t = add(new T.PlaneGeometry(0.58, 0.038), tapeMat, 0, MY, 0.212, mon);
      t.rotation.z = a; t.castShadow = false; (t.userData || (t.userData = {})).isDecal = true;
      mTapes.push(t);
    }
    destructSpecs.push({ id: 'crackedMonitor', kind: 'monitor', meshes: [mCase, mScr, ...mTapes], extraMeshes: { screen: [mScr], tape: mTapes }, wallNormal: { x: WEAR.STORY.MONITOR.wall === 'east' ? -1 : 1, z: 0 }, linked: 'note0' }); }
  parts.push('wear-monitor-tape');
  // Three lockers seated 0.0 mm flush on y=0 and z=BZ; middle door hung on lower pivot bracket clear of carcass.
  const lockerMat = std(pbr ? pbr.oliveSteel.opts({ color: 0xb6c8b9 }) : { color: 0x5d6b5f, roughness: 0.55, metalness: 0.4 });
  const plinthMat = std(pbr ? pbr.steelDark.opts({ color: 0x585e5a }) : { color: 0x1d211e, roughness: 0.8, metalness: 0.3 });
  worldUvMats.set(lockerMat, 1.2); worldUvMats.set(plinthMat, 0.8);
  const blockers = [];
  let door = null;
  // CG-1 (CF-20 #6, AH-1 #16): the lockers were 0.60 m wide (real: about 0.38). Now 0.38 m on a 0.40 m pitch, the bank
  // centred where the middle (dented) one stood, so the door still swings where a blade or a round finds it. Each door
  // has a latch handle; only the middle one carries the dent, the others a plain door of their own.
  const LP = 0.40, LW = 0.38, LD = 0.33, L0 = -5.78 - LP;
  for (let i = 0; i < 3; i++) {
    const x = L0 + i * LP;
    box(LW, 1.85, 0.48, lockerMat, x, 0.925, BZ + 0.24);
    // CH-3 #16 ("flat boxes"): a dark recessed plinth, a rolled cap along the top front, and the hinge strip with its
    // three knuckles down the hinge side of each door, so each reads as a pressed-steel locker, not a block
    box(LW - 0.03, 0.1, 0.012, plinthMat, x, 0.05, BZ + 0.486);
    box(LW + 0.004, 0.03, 0.03, lockerMat, x, 1.835, BZ + 0.47);
    if (i !== 1) for (const hy of [0.32, 0.95, 1.58]) box(0.012, 0.07, 0.014, steel, x - LD / 2 - 0.008, hy, BZ + 0.493);
    if (i !== 1) {
      printed('wear-locker-door', LD, 1.62, [512, 640, 128, 384], x, 0.955, BZ + 0.488, 0); parts.pop();
      box(0.022, 0.13, 0.03, steel, x + LD / 2 - 0.05, 1.02, BZ + 0.503);
      continue;
    }
    const cavity = std({ color: 0x141614, roughness: 0.95 });
    const cw = LW - 0.08;   // the cavity, 4 cm walls
    const cBack = add(new T.PlaneGeometry(cw, 1.7), cavity, x, 0.955, BZ + 0.08); (cBack.userData || (cBack.userData = {})).isDecal = true;
    for (const s of [-1, 1]) { const side = add(new T.PlaneGeometry(0.32, 1.7), cavity, x + s * cw / 2, 0.955, BZ + 0.24); side.rotation.y = -s * Math.PI / 2; (side.userData || (side.userData = {})).isDecal = true; }
    const sole = add(new T.PlaneGeometry(cw, 0.3), cavity, x, 0.135, BZ + 0.24); sole.rotation.x = -Math.PI / 2; (sole.userData || (sole.userData = {})).isDecal = true;
    const lid = add(new T.PlaneGeometry(cw, 0.3), cavity, x, 1.755, BZ + 0.24); lid.rotation.x = Math.PI / 2; (lid.userData || (lid.userData = {})).isDecal = true;
    const D = WEAR.DOOR, hx = x - LD / 2, hz = BZ + 0.505, dw = LD;
    box(0.036, 0.022, 0.038, steel, hx + 0.018, 0.1168, BZ + 0.499);
    const pivot = new T.Group(); pivot.name = 'training-wear-locker-door'; pivot.position.set(hx, 0, hz); pivot.rotation.y = -D.rest; root.add(pivot);
    const leaf = box(dw, 1.62, 0.02, lockerMat, dw / 2 + 0.016, 0.945, 0, pivot); leaf.rotation.z = 0.015;   // CG-1: sags less (its top corner reached the next locker)
    box(0.022, 0.13, 0.03, steel, dw - 0.034, 1.02, 0.025, pivot);   // its latch handle
    const face = add(cell(new T.PlaneGeometry(dw, 1.62), 896, 256, 128, 384), sheetMat, dw / 2 + 0.016, 0.945, 0.014, pivot); face.rotation.z = 0.015; (face.userData || (face.userData = {})).isDecal = true;
    door = { pivot, hx, hz, w: dw, h: 1.65, angle: D.rest, vel: 0, solid: { minX: 0, maxX: 0, minY: 0, maxY: 1.78, minZ: 0, maxZ: 0, lockerDoor: true, prop: true } };
  }
  blockers.push({ minX: L0 - LW / 2 - 0.01, maxX: L0 + 2 * LP + LW / 2 + 0.01, minY: 0, maxY: 1.85, minZ: BZ, maxZ: BZ + 0.49, lockers: true });
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
    const cx = bedAt.x + 3.25, cz = B.minZ + 3.25, L = 1.9, Wd = 0.72, yMat = 0.02;
    const cylOrBox = (r, h, mat, x, y, z) => add(T.CylinderGeometry ? new T.CylinderGeometry(r, r, h, 10) : new T.BoxGeometry(r * 2, h, r * 2), mat, x, y, z);
    for (const dz of [-Wd / 2, Wd / 2]) box(L, 0.035, 0.035, steel, cx, 0.42, cz + dz);
    for (const sx of [-1, 1]) box(0.035, 0.035, Wd + 0.035, steel, cx + sx * (L / 2 - 0.025), 0.385, cz);
    const yFootTop = yMat + 0.014, yBrkBot = 0.4025 - 0.016, yMid = (yFootTop + yBrkBot) / 2;
    const legAng = Math.atan2(Wd + 0.042, yBrkBot - yFootTop);
    const legLen = ((yBrkBot - yFootTop) / 2 - 0.0002 - 0.013 * Math.sin(legAng)) / (0.5 * Math.cos(legAng));
    for (const dx of [-L / 2 + 0.14, L / 2 - 0.14]) {
      const washer = cylOrBox(0.014, 0.006, steel, cx + dx, yMid, cz); washer.rotation.z = Math.PI / 2;
      for (const s of [-1, 1]) {
        const lx = cx + dx + s * 0.016;
        box(0.038, 0.014, 0.056, steel, lx, yMat + 0.007, cz - s * (Wd / 2));
        box(0.038, 0.016, 0.035, steel, lx, 0.4025 - 0.008, cz + s * (Wd / 2));
        const leg = box(0.026, legLen, 0.026, steel, lx, yMid, cz); leg.rotation.x = s * legAng;
        const cap = cylOrBox(0.012, 0.008, steel, cx + dx + s * 0.033, yMid, cz); cap.rotation.z = Math.PI / 2;
      }
    }
    const canvas = std(pbr ? pbr.canvasMilitary.opts({ color: 0x7e785a, normalScale: 1.0 }) : { color: 0x6f6a4e, roughness: 0.95 });
    worldUvMats.set(canvas, 0.5);
    const mattress = std({ color: 0xffffff, map: sheet,
      ...(wearAtlases ? { normalMap: wearAtlases.sheetNrm, normalScale: T.Vector2 ? new T.Vector2(0.95, 0.95) : undefined, roughnessMap: wearAtlases.sheetOrm, metalnessMap: wearAtlases.sheetOrm, aoMap: wearAtlases.sheetOrm, aoMapIntensity: 0.72, roughness: 1.0, metalness: 1.0 } : { roughness: 0.9 }) });
    const cLen = L - 0.12, seg = 5, sl = cLen / seg;
    // CG-2 (AH-4 #21): the canvas and the mattress were five tilted slabs each, with dark V-gaps between them. Each is now
    // one piece bent along the same sag (a parabola, 8 cm at the middle): a box cut in 20 along its length, every point
    // dropped by the sag under it, so the top runs on without a break. The straps still hang at the five old centres.
    const sagY = (x) => { const t = x / cLen; return -0.08 * (1 - 4 * t * t); };   // x from the cot's centre
    const bend = (geo) => { const p = geo.attributes && geo.attributes.position; if (!p) return geo;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + sagY(Math.max(-cLen / 2, Math.min(cLen / 2, p.getX(i)))));
      p.needsUpdate = true; if (geo.computeVertexNormals) geo.computeVertexNormals(); return geo; };
    const sheetBox = (w, h, d) => new T.BoxGeometry(w, h, d, 20, 1, 1);
    const f = add(bend(sheetBox(cLen - 0.006, 0.015, Wd - 0.071)), canvas, cx, 0.415, cz); f.castShadow = true; f.receiveShadow = true;
    for (let i = 0; i < seg; i++) {
      const t = (i + 0.5) / seg - 0.5, y = 0.415 + sagY(t * cLen), sx = cx + t * cLen;
      const strapH = 0.4375 - y;
      for (const sz of [-1, 1]) box(0.06, strapH, 0.018, canvas, sx, y + strapH / 2, cz + sz * 0.3335);
    }
    const m = add(bend(cell(sheetBox(cLen - 0.022, 0.1, Wd - 0.11), 0, 640, 512, 256)), mattress, cx, 0.415 + 0.0575, cz);
    m.castShadow = true; m.receiveShadow = true;
    parts.push('wear-cot-sagging', 'wear-mattress-stained');
  }

  // ---------- (6) CG-2, Training pass 2: the story (review/CG-2-training/STORY-PLAN.md, Director LOOK 02:55Z). Who used
  // this place, told by the things they left (docs/story.md: the history is in the world, no wall of text). One more
  // atlas, one more material: the paper (the rotation roster, a qualification card, the whiteboard, the locker name
  // strips) and a row of flat colour swatches that every small prop takes its colour from, so the whole pass bakes to
  // one more draw. Names only from the story bible (the twelve of FOB Threshold); nothing here says what became of them.
  const STORY = WEAR.STORY;
  const kitTex = tex(1024, 1024, (c) => {
    const r = rng(211);
    c.fillStyle = '#7f8a80'; c.fillRect(0, 0, 1024, 1024);
    const hand = (px) => `${px}px "Segoe Print", "Comic Sans MS", "Bradley Hand", cursive`;
    const type = (px, b = '') => `${b} ${px}px "Courier New", Courier, monospace`;
    c.textBaseline = 'middle'; c.textAlign = 'left';
    // The roster: 256 x 384 at (0, 0): a typed sheet, a pen tick by eleven of the twelve lines ... and by the twelfth;
    // under them a thirteenth line, left blank.
    c.fillStyle = '#ece6d2'; c.fillRect(0, 0, 256, 384);
    const fit = (t, x, y, maxW, px, bold = '') => { c.font = type(px, bold); while (px > 8 && c.measureText(t).width > maxW) { px -= 1; c.font = type(px, bold); } c.fillText(t, x, y); };
    c.fillStyle = '#1f2326'; c.textAlign = 'center'; fit(STORY.ROSTER_HEAD, 128, 24, 228, 19, 'bold');
    fit(STORY.ROSTER_SUB, 128, 44, 228, 11);
    c.fillRect(14, 56, 228, 2);
    c.textAlign = 'left';
    STORY.ROSTER.forEach(([rank, name], i) => {
      const y = 74 + i * 22;
      c.fillStyle = '#23272a'; c.font = type(13); c.fillText(String(i + 1).padStart(2, ' '), 14, y); c.fillText(rank, 40, y); c.fillText(name, 82, y);
      c.fillStyle = 'rgba(40,40,40,0.25)'; c.fillRect(14, y + 10, 228, 1);
      c.strokeStyle = '#2b3f86'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(212, y - 1); c.lineTo(218, y + 6); c.lineTo(232, y - 8); c.stroke();   // ticked
    });
    { const y = 74 + 12 * 22; c.fillStyle = '#23272a'; c.font = type(13); c.fillText('13', 14, y); c.fillStyle = 'rgba(40,40,40,0.55)'; c.fillRect(40, y + 6, 160, 1.5); }
    for (const [x, y] of [[18, 8], [238, 8]]) { c.fillStyle = 'rgba(120,100,60,0.35)'; c.fillRect(x - 6, y - 4, 12, 9); }   // pin holes, old ones
    for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(150,130,90,${r() * 0.12})`; c.fillRect(r() * 250, r() * 380, 4 + r() * 10, 3 + r() * 8); }
    // The qualification card: 256 x 192 at (256, 0): lane, score, initials, mostly lane 2.
    c.fillStyle = '#f1ecdc'; c.fillRect(256, 0, 256, 192);
    c.fillStyle = '#2a2e31'; c.textAlign = 'center'; fit(STORY.CARD_HEAD, 384, 16, 228, 14, 'bold');
    c.font = type(11); c.fillText('LANE    SCORE    INIT', 384, 36); c.fillRect(268, 44, 232, 1);
    STORY.CARD.forEach(([lane, score, init], i) => {
      const y = 58 + i * 16; c.fillStyle = 'rgba(40,40,40,0.25)'; c.fillRect(268, y + 7, 232, 1);
      c.fillStyle = '#1e2a6b'; c.font = hand(13); c.fillText(String(lane), 300, y); c.fillText(score, 384, y); c.fillText(init, 462, y);
    });
    // The whiteboard: 512 x 320 at (512, 0): the week's drills in marker, the right half wiped with a sleeve.
    c.fillStyle = '#f4f6f5'; c.fillRect(512, 0, 512, 320);
    c.textAlign = 'left'; c.fillStyle = '#1b2f73'; c.font = hand(30); c.fillText(STORY.BOARD_HEAD, 536, 34);
    c.strokeStyle = '#1b2f73'; c.lineWidth = 3; c.beginPath(); c.moveTo(536, 54); c.lineTo(700, 54); c.stroke();
    STORY.BOARD_DAYS.forEach((d, i) => {
      const x = 540 + i * 94; c.fillStyle = '#1b2f73'; c.font = hand(20); c.fillText(d, x, 84);
      c.strokeStyle = i < 3 ? '#a3241e' : '#1b2f73'; c.lineWidth = 3;
      for (let k = 0; k < 3 + (i % 2); k++) { const y = 116 + k * 40; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18 + r() * 40, y + (r() - 0.5) * 6); c.stroke(); }
      if (i < 3) { c.beginPath(); c.moveTo(x + 4, 270); c.lineTo(x + 14, 282); c.lineTo(x + 34, 258); c.stroke(); }
    });
    c.fillStyle = '#a3241e'; c.font = hand(24); c.fillText('25m', 900, 120);
    c.strokeStyle = '#a3241e'; c.lineWidth = 3; c.beginPath(); c.ellipse(922, 120, 36, 20, 0, 0, 7); c.stroke();
    const wipe = c.createLinearGradient(780, 0, 1024, 0); wipe.addColorStop(0, 'rgba(244,246,245,0)'); wipe.addColorStop(0.35, 'rgba(244,246,245,0.82)'); wipe.addColorStop(1, 'rgba(244,246,245,0.9)');
    c.fillStyle = wipe; c.fillRect(760, 60, 264, 250);
    for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(60,80,140,0.12)'; c.fillRect(780 + r() * 220, 70 + r() * 230, 30 + r() * 80, 5 + r() * 9); }   // ghosts of old marker
    // The locker name strips: 256 x 96 each at (0, 400 + 96 i): masking tape over the door's old card, marker.
    STORY.LOCKERS.forEach((n, i) => {
      const y = 400 + i * 96; c.fillStyle = '#d8c896'; c.fillRect(0, y, 256, 96);
      c.fillStyle = 'rgba(120,100,50,0.3)'; c.fillRect(0, y, 256, 4); c.fillRect(0, y + 92, 256, 4);
      c.fillStyle = '#16181b'; c.textAlign = 'center';
      let px = 62; c.font = `bold ${px}px "Segoe Print", "Comic Sans MS", Arial, sans-serif`;
      while (px > 20 && c.measureText(n).width > 232) { px -= 2; c.font = `bold ${px}px "Segoe Print", "Comic Sans MS", Arial, sans-serif`; }
      c.fillText(n, 128, y + 50);
    });
    // The Medic's count: 320 x 256 at (512, 320): REVIVALS THIS ROTATION, ticks in five-bar gates (a fixed number in pass 2).
    c.fillStyle = '#eef0ec'; c.fillRect(512, 320, 320, 256);
    c.fillStyle = '#7d1d18'; c.fillRect(512, 320, 320, 46);
    c.fillStyle = '#f4f1e6'; c.textAlign = 'center'; fit(STORY.TALLY_HEAD, 672, 343, 296, 21, 'bold');
    c.strokeStyle = '#1b2f73'; c.lineWidth = 4; c.lineCap = 'round';
    for (let k = 0; k < STORY.TALLY; k++) {
      const g = Math.floor(k / 5), j = k % 5, gx = 536 + (g % 5) * 58, gy = 392 + Math.floor(g / 5) * 76;
      c.beginPath(); if (j < 4) { c.moveTo(gx + j * 11, gy); c.lineTo(gx + j * 11 + (r() - 0.5) * 3, gy + 52); } else { c.moveTo(gx - 6, gy + 44); c.lineTo(gx + 42, gy + 8); } c.stroke();
    }
    // The stretcher's chart: 256 x 192 at (256, 192): an obs grid and a pulse line in pen.
    c.fillStyle = '#f1ecdc'; c.fillRect(256, 192, 256, 192);
    c.fillStyle = '#2a2e31'; c.font = type(15, 'bold'); c.textAlign = 'left'; c.fillText(STORY.CHART_HEAD, 270, 212);
    c.strokeStyle = 'rgba(40,40,40,0.3)'; c.lineWidth = 1;
    for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(270, 232 + i * 22); c.lineTo(498, 232 + i * 22); c.stroke(); }
    for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(270 + i * 28.5, 232); c.lineTo(270 + i * 28.5, 364); c.stroke(); }
    c.strokeStyle = '#1e2a6b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(272, 300);
    for (let i = 1; i <= 16; i++) c.lineTo(272 + i * 14, 286 + Math.sin(i * 1.7) * 14 + r() * 8); c.stroke();
    // CG-2 sheet 2. The Branch's notes (beat 6): 256 x 128 cells, typed slips with a thin header, words wrapped to fit.
    const NOTE_CELLS = [[256, 384], [256, 512], [256, 640], [512, 576], [768, 576]];
    STORY.NOTES.forEach((t, i) => {
      const [x0, y0] = NOTE_CELLS[i];
      c.fillStyle = i === 4 ? '#f3e7a0' : '#f1ede0'; c.fillRect(x0, y0, 256, 128);
      c.fillStyle = 'rgba(40,40,40,0.18)'; c.fillRect(x0, y0 + 126, 256, 2);
      c.fillStyle = '#7d1d18'; c.fillRect(x0 + 10, y0 + 8, 236, 18);
      c.fillStyle = '#f4f1e6'; c.textAlign = 'center'; c.font = type(12, 'bold'); c.fillText(STORY.NOTE_HEAD, x0 + 128, y0 + 17);
      c.fillStyle = '#1d2124'; c.textAlign = 'left';
      let px = 21, lines;
      for (;; px -= 1) {
        c.font = type(px, 'bold'); lines = []; let line = '';
        for (const w of t.split(' ')) { const tryL = line ? line + ' ' + w : w; if (c.measureText(tryL).width > 232 && line) { lines.push(line); line = w; } else line = tryL; }
        lines.push(line);
        if ((lines.length * px * 1.15 <= 92 && lines.every((l) => c.measureText(l).width <= 236)) || px <= 10) break;
      }
      const lh = px * 1.15, top = y0 + 32 + (92 - lines.length * lh) / 2 + lh / 2;
      lines.forEach((l, k) => c.fillText(l, x0 + 12, top + k * lh));
      for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(150,130,90,${r() * 0.1})`; c.fillRect(x0 + r() * 240, y0 + r() * 120, 3 + r() * 8, 2 + r() * 6); }
    });
    // The stencilled plate by the hose reel (beat 4): 512 x 64 at (512, 704), black stencil on safety yellow.
    { const x0 = 512, y0 = 704; c.fillStyle = '#e0b81c'; c.fillRect(x0, y0, 512, 64);
      for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(60,50,20,${r() * 0.12})`; c.fillRect(x0 + r() * 500, y0 + r() * 60, 2 + r() * 14, 1 + r() * 4); }
      c.fillStyle = '#17181a'; c.textAlign = 'center'; let px = 40;
      const st = (q) => `bold ${q}px Impact, "Arial Narrow", "Arial Black", Arial, sans-serif`;
      c.font = st(px); while (px > 14 && c.measureText(STORY.STENCIL).width > 480) { px -= 1; c.font = st(px); }
      c.fillText(STORY.STENCIL, x0 + 256, y0 + 33);
      // CH-3 #17 (the native walk read "HCSE DCWN": a row of bridges at one height cut the bottom out of every O, so it read
      // as a C): a stencil's bridges go where the letter needs them, top and bottom of the round ones (O, D, Q, 0), so the
      // two halves still read as one letter; the straight letters have none.
      { const w = c.measureText(STORY.STENCIL).width, m = c.measureText('O'), up = m.actualBoundingBoxAscent || px * 0.72, dn = m.actualBoundingBoxDescent || 0;
        let at = x0 + 256 - w / 2; c.fillStyle = '#e0b81c';
        for (const ch of STORY.STENCIL) {
          const cw = c.measureText(ch).width;
          if ('ODQ0'.includes(ch)) { const bx = at + cw * (ch === 'D' ? 0.42 : 0.5) - 1.25, th = Math.max(3, px * 0.16);
            c.fillRect(bx, y0 + 33 - up - 1, 2.5, th); c.fillRect(bx, y0 + 33 + dn - th + 1, 2.5, th); }
          at += cw; } }
      c.fillStyle = 'rgba(23,24,26,0.25)'; for (let k = 0; k < 10; k++) c.fillRect(x0 + 20 + r() * 470, y0 + 46 + r() * 12, 1, 3 + r() * 6); }   // overspray runs
    // The calendar page (beat 7): 192 x 256 at (832, 320): a photo band, the month's grid, days crossed off, one circled.
    { const x0 = 832, y0 = 320; c.fillStyle = '#f2efe6'; c.fillRect(x0, y0, 192, 256);
      const sky = c.createLinearGradient(0, y0 + 8, 0, y0 + 84); sky.addColorStop(0, '#8ea7b4'); sky.addColorStop(1, '#c9cfc4');
      c.fillStyle = sky; c.fillRect(x0 + 8, y0 + 8, 176, 76);
      c.fillStyle = '#4f5d52'; c.beginPath(); c.moveTo(x0 + 8, y0 + 84); c.lineTo(x0 + 48, y0 + 44); c.lineTo(x0 + 82, y0 + 66); c.lineTo(x0 + 124, y0 + 30); c.lineTo(x0 + 184, y0 + 72); c.lineTo(x0 + 184, y0 + 84); c.fill();
      c.fillStyle = '#e9ece9'; c.beginPath(); c.moveTo(x0 + 114, y0 + 40); c.lineTo(x0 + 124, y0 + 30); c.lineTo(x0 + 134, y0 + 37); c.fill();
      c.fillStyle = '#9aa0a3'; c.fillRect(x0 + 8, y0 + 92, 176, 1);
      const cw = 24.5, ch = 22, gx = x0 + 10, gy = y0 + 102;
      c.font = type(10, 'bold'); c.textAlign = 'center'; c.fillStyle = '#5a5e60';
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, k) => c.fillText(d, gx + k * cw + cw / 2, gy));
      for (let d = 1; d <= STORY.CAL_DAYS; d++) {
        const cell = d - 1 + STORY.CAL_FIRST, cx = gx + (cell % 7) * cw + cw / 2, cy = gy + 16 + Math.floor(cell / 7) * ch;
        c.fillStyle = cell % 7 > 4 ? '#8a2a22' : '#2a2e31'; c.font = type(11); c.fillText(String(d), cx, cy);
        if (d <= STORY.CAL_CROSSED) { c.strokeStyle = '#1b2f73'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx - 8, cy - 7); c.lineTo(cx + 8, cy + 7); c.moveTo(cx + 8, cy - 7); c.lineTo(cx - 8, cy + 7); c.stroke(); }
        if (d === STORY.CAL_CIRCLE) { c.strokeStyle = '#a3241e'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(cx, cy, 11, 9, 0, 0, 7); c.stroke();
          c.fillStyle = '#a3241e'; c.font = hand(15); c.textAlign = 'center'; c.fillText(STORY.CAL_MARK, x0 + 96, y0 + 241);
          c.beginPath(); c.moveTo(x0 + 96 + 30, y0 + 232); c.quadraticCurveTo(cx + 14, y0 + 226, cx + 4, cy + 10); c.stroke(); } } }
    // AG-405: Textured material swatches (64 x 64 from (0, 768)): wood grain, burlap weave, brushed brass/steel,
    // ceramic glaze, rubber ribs, cloth weave — paired with per-swatch normal + ORM maps (0 extra draw calls!).
    STORY.SWATCH.forEach((col, k) => {
      const sx = (k % 16) * 64, sy = 768 + Math.floor(k / 16) * 64, nm = STORY.SWATCH_NAMES[k] || '';
      c.fillStyle = col; c.fillRect(sx, sy, 64, 64);
      if (nm === 'handle' || nm === 'broomwood' || nm === 'broomhead' || nm === 'hardboard') {
        for (let i = 0; i < 64; i += 3) { c.fillStyle = i % 6 ? 'rgba(0,0,0,0.11)' : 'rgba(255,245,220,0.08)'; c.fillRect(sx + i, sy, 2, 64); }
      } else if (nm === 'sandbag' || nm === 'blanket' || nm === 'glove' || nm === 'mophead' || nm === 'bristle') {
        c.fillStyle = 'rgba(0,0,0,0.13)'; for (let i = 0; i < 64; i += 4) c.fillRect(sx + i, sy, 1.5, 64);
        c.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 64; i += 4) c.fillRect(sx, sy + i, 64, 1.5);
      } else if (nm === 'brass' || nm === 'brassdk' || nm === 'alu' || nm === 'clip' || nm === 'pail' || nm === 'drain' || nm === 'reel') {
        for (let i = 0; i < 42; i++) {
          c.fillStyle = i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
          c.fillRect(sx + ((i * 19) % 52), sy + ((i * 7) % 62), 12 + (i % 14), 1.5);
        }
      } else if (nm === 'hose' || nm === 'earband') {
        c.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 64; i += 6) c.fillRect(sx, sy + i, 64, 2);
      } else {
        for (let i = 0; i < 28; i++) {
          c.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
          c.fillRect(sx + ((i * 23) % 58), sy + ((i * 17) % 58), 3 + (i % 6), 2 + (i % 4));
        }
      }
    });
  });
  const kitMat = std({ color: 0xffffff, map: kitTex,
    ...(wearAtlases ? { normalMap: wearAtlases.kitNrm, normalScale: T.Vector2 ? new T.Vector2(0.85, 0.85) : undefined, roughnessMap: wearAtlases.kitOrm, metalnessMap: wearAtlases.kitOrm, aoMap: wearAtlases.kitOrm, aoMapIntensity: 0.68, roughness: 1.0, metalness: 1.0 } : { roughness: 0.72, metalness: 0.12 }) });
  const SW_ = Object.fromEntries(STORY.SWATCH_NAMES.map((n, k) => [n, k]));
  const flat = (geo, name) => { const uv = geo.attributes && geo.attributes.uv, k = SW_[name]; if (!uv) return geo;
    const x0 = (k % 16) * 64 + 6, y0 = 768 + Math.floor(k / 16) * 64 + 6, span = 52;
    const wrap01 = (v) => (v >= 0 && v <= 1 ? v : ((v % 1) + 1) % 1);
    for (let i = 0; i < uv.count; i++) {
      const lu = wrap01(uv.getX(i)), lv = wrap01(uv.getY(i));
      uv.setXY(i, (x0 + lu * span) / 1024, 1 - (y0 + (1 - lv) * span) / 1024);
    }
    uv.needsUpdate = true; return geo; };
  const kitCell = (geo, x, y, w, h) => { const uv = geo.attributes && geo.attributes.uv; if (!uv) return geo;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * w) / 1024, 1 - (y + (1 - uv.getY(i)) * h) / 1024);
    uv.needsUpdate = true; return geo; };
  const G = { cyl: (rt, rb, h, seg = 12, open = false) => (T.CylinderGeometry ? new T.CylinderGeometry(rt, rb, h, seg, 1, open) : new T.BoxGeometry(2 * rb, h, 2 * rb)),
    torus: (R0, r0, arc = Math.PI * 2) => (T.TorusGeometry ? new T.TorusGeometry(R0, r0, 6, 14, arc) : new T.BoxGeometry(2 * R0, 2 * R0, 2 * r0)) };
  // Draws: the cutaway (training-cutaway.js) bakes each wall's hangings with its wall, so a material costs one draw per
  // wall group it is in. The infirmary's pieces are its furniture (GP-19893: trainingProp, like props.js's medical bay),
  // the bench-end pieces stand clear of the east wall's group, and the dented door's name is printed on its own face:
  // the kit is two draws (the room, the range's back wall).
  let kitProp = false;
  const kit = (geo, name, x, y, z, parent, shadow = true) => { const m = add(flat(geo, name), kitMat, x, y, z, parent); if (shadow) { m.castShadow = true; m.receiveShadow = true; } if (kitProp) (m.userData || (m.userData = {})).trainingProp = true;
    if (STORY.SWATCH_FX[name]) (m.userData || (m.userData = {})).fx = STORY.SWATCH_FX[name]; return m; };   // CG-7 step 5: what a round knocks off it (world/training-hitfx.js)
  const kbox = (w, h, d, name, x, y, z, parent) => kit(new T.BoxGeometry(w, h, d), name, x, y, z, parent);
  const tiny = (m) => { (m.userData || (m.userData = {})).isDecal = true; m.castShadow = false; return m; };   // pins, tape: not solids
  const paper = (name, w, h, c4, x, y, z, ry = 0, rx = 0, parent) => {
    const m = add(kitCell(new T.PlaneGeometry(w, h), ...c4), kitMat, x, y, z, parent); m.rotation.set(rx, ry, 0, 'YXZ'); tiny(m); m.receiveShadow = true; if (kitProp) (m.userData || (m.userData = {})).trainingProp = true; m.userData.fx = 'paper'; parts.push(name); return m; };

  // Beat 1: the twelve came through. The roster pinned right of the DAYS WITHOUT INCIDENT board, and three lockers
  // carrying names from it.
  { const P = STORY.ROSTER_AT, w = 0.3, h = 0.45;
    const rp = paper('story-roster', w, h, [0, 0, 256, 384], P.x, P.y, BZ + 0.003, 0);
    destructSpecs.push({ id: 'roster', kind: 'paper', meshes: [rp], wallNormal: { x: 0, z: 1 }, flammable: true });
    for (const [dx, dy] of [[-w / 2 + 0.018, h / 2 - 0.012], [w / 2 - 0.018, h / 2 - 0.012]]) tiny(kbox(0.012, 0.012, 0.01, 'pin', P.x + dx, P.y + dy, BZ + 0.008)); }
  for (let i = 0; i < 3; i++) {
    const x = L0 + i * LP, c4 = [0, 400 + 96 * i, 256, 96], sw = 0.18, sh = 0.0675;   // covers the door's printed card
    if (i !== 1) { paper('story-locker-name', sw, sh, c4, x, 1.225, BZ + 0.4925); continue; }
    parts.push('story-locker-name');   // the dented door's (PRICE) is taped on in the wear sheet's door cell: no mesh of its own
  }

  // Beat 3: the Range Master's lane. His mug and the qualification clipboard at the bench's wall end, the brass bucket
  // and a push broom leaning on the bench, ear defenders in a tray on the worktop, the week's drills on a whiteboard.
  // CG-7 (Jerry D-226: "these props need higher fidelity"): each one is built by world/training-kitprops.js (rolled rims,
  // wall thickness, a real clip, bristle tufts and brace, cups and foam), still in the room's one kit draw.
  const kitGroups = {};   // CG-7 step 2: what can be shot loose (createKitPropRuntime, below)
  const prop = (id, x, y, z, ry = 0, opts) => {
    const grp = buildKitProp(T, id, { mk: (geo, sw, px, py, pz, parent, shadow) => kit(geo, sw, px, py, pz, parent, shadow), tiny, opts });
    grp.position.set(x, y, z); grp.rotation.y = ry; if (root) root.add(grp);
    if (kitProp) grp.traverse((o) => { if (o.isMesh) o.userData.trainingProp = true; });
    kitGroups[id] = { group: grp, opts };
    return grp; };
  // CH-3 #16 follow-up (Claude 8: "two clean channels on a bare wall still read as a gap"): two ear defenders hung by
  // their crowns on the rack, one on each rail (the hooks' bars: radius 8.5 mm, 0.012-0.152 m off the wall).
  let rmIdx = 0;
  for (const [i, y] of [[5, 1.75], [1, 1.25]]) {
    const rmMeshes = [];
    const ed = buildKitProp(T, 'earDefender', { mk: (geo, sw, px, py, pz, parent, shadow) => { const m = kit(geo, sw, px, py, pz, parent, shadow); rmMeshes.push(m); return m; }, tiny });
    ed.position.set(1.4 + i * 0.3, y + 0.0085, BZ + 0.11); ed.rotation.y = (i === 5 ? 0.05 : -0.04); if (root) root.add(ed);
    destructSpecs.push({ id: 'rackMuff' + (rmIdx++), kind: 'rackProp', meshes: rmMeshes, wallNormal: { x: 0, z: 1 } });
  }
  { const top = 0.86, M = STORY.MUG, C = STORY.CLIP;
    prop('mug', M.x, top, M.z, -0.5);                                                  // the handle toward his right hand
    const cb = prop('clipboard', C.x, top, C.z, C.ry);                                   // flat on the worktop, its clip away from him
    const ud = cb.userData || {}; const card = paper('story-qual-card', 0.2, 0.15, [256, 0, 256, 192], 0, ud.cardY, ud.cardZ, Math.PI, -Math.PI / 2, cb); card.userData.part = 'sheet'; }   // reads from behind the line
  kitProp = true;   // CG-2 sheet 2: the bench-end pieces ride the room's kit draw (the broom and tote reached into the east wall's group)
  { // the push broom: its head on the floor on his side, the handle resting on the worktop's steel lip (front-top corner
    // z 0.162, y 0.86), its end a hand past it. lean: the handle's angle off the floor.
    const B0 = STORY.BROOM, lean = 0.65, base = 0.114, over = 0.014 / Math.cos(lean);
    const dc = (0.86 + over - base) / Math.sin(lean), run = dc * Math.cos(lean);
    prop('pushBroom', B0.x, 0, 0.162 - run, Math.PI, { lean }); }
  { const K = STORY.BUCKET;
    prop('brassBucket', K.x, 0, K.z, 0.6);
    const rb = rng(5);
    for (let i = 0; i < 5; i++) { const a = -0.4 - rb() * 2.3, d = 0.22 + rb() * 0.25,   // toward the shooter's side, never under the bench
       s = kit(G.cyl(0.0048, i % 2 ? 0.0048 : 0.0032, i % 2 ? 0.019 : 0.045, 7), 'brass', K.x + Math.cos(a) * d, 0.0048, K.z + Math.sin(a) * d, undefined, false);
      s.rotation.set(Math.PI / 2, 0, rb() * 3); tiny(s); } }
  { const E = STORY.TOTE; prop('earTray', E.x, 0.86, E.z, E.ry); }                    // CG-7 (D-230): on the worktop
  kitProp = false;
  { const Wb = STORY.WHITEBOARD, w = 0.9, h = 0.56;
    // CG-7 s2 (CF-23 "one flat sheet: no frame depth, no pen tray, no fixings"): a real frame, corner caps with their
    // screws, a pen tray (built in world/training-kitprops.js); the markers and eraser in it can be shot out.
    const wb = buildKitProp(T, 'whiteboard', { mk: (geo, sw, px, py, pz, parent, shadow) => kit(geo, sw, px, py, pz, parent, shadow), tiny, opts: { w, h } });
    wb.position.set(Wb.x, Wb.y, BZ); if (root) root.add(wb);
    paper('story-whiteboard', w, h, [512, 0, 512, 320], Wb.x, Wb.y, BZ + 0.0205, 0);
    const ud = wb.userData || {};
    kitProp = true; prop('markers', Wb.x + 0.02, Wb.y + ud.trayY, BZ + ud.trayZ, 0); kitProp = false; }

  // Beat 5: the Medic's count. Everybody who "dies" here wakes on that stretcher; she keeps count on the wall, a chart
  // hangs on its foot rail, a blanket lies folded on the old cot, a sharps bin by the cabinet, her mug by the monitor.
  kitProp = true;
  { const M = STORY.MEDIC, bx = bedAt.x, bz = bedAt.z, wall = B.minZ + 0.08 + 0.0925;   // the olive panels' face
    { const w = 0.5, h = 0.42, x = bx + M.tallyDX, y = M.tallyY;
      kbox(w + 0.03, h + 0.03, 0.016, 'alu', x, y, wall + 0.008);
      paper('story-revivals', w, h, [512, 320, 320, 256], x, y, wall + 0.0175, 0); }
    { const x = bx + M.sharpsDX, y0 = M.sharpsY - 0.1;                            // a wall bracket, the bin on it
      // CG-7 s2 (CF-23 "primitive sharps bin"): built in world/training-kitprops.js; the bin can be shot off its bracket
      const br = buildKitProp(T, 'sharpsBracket', { mk: (geo, sw, px, py, pz, parent, shadow) => kit(geo, sw, px, py, pz, parent, shadow), tiny });
      br.position.set(x, y0, wall); if (root) root.add(br);
      prop('sharpsBin', x, y0, wall + ((br.userData && br.userData.binZ) || 0), 0); }
    { const x = bx + M.mugDX, z = B.minZ + M.mugZ, top = 0.9;                       // on the worktop, in front of the monitor
      prop('medMug', x, top, z, 0); }   // CG-7 s2: the real mug (white), shootable: it shatters like the range master's
    { const fx = bx + 1.21 * 0.85 + 0.018 + 0.004, y0 = 0.88 + 0.03 - 0.155;       // the chart, hung on the stretcher's foot rail
      const ocBoard = kbox(0.008, 0.31, 0.23, 'hardboard', fx, y0, bz);
      const ocSheet = paper('story-obs-chart', 0.2, 0.15, [256, 192, 256, 192], fx + 0.0055, y0 + 0.04, bz, Math.PI / 2);
      const ocClip = kbox(0.016, 0.03, 0.09, 'clip', fx + 0.009, 0.88 + 0.015, bz);
      destructSpecs.push({ id: 'obsChart', kind: 'obsChart', meshes: [ocBoard, ocSheet, ocClip], extraMeshes: { sheet: [ocSheet] }, wallNormal: { x: 1, z: 0 }, flammable: true }); }
    { const cx = bedAt.x + 3.25, cz = B.minZ + 3.25, cLen = 1.9 - 0.12, off = 0.71, w = 0.34, h = 0.07;   // the cot (above)
      const sag = (x) => { const t = x / cLen; return -0.08 * (1 - 4 * t * t); }, slope = 0.08 * 8 * off / (cLen * cLen);
      const fold = kbox(w, h, 0.5, 'blanket', cx + off, 0.4725 + 0.05 + sag(off) + h / 2 + 0.005, cz); fold.rotation.z = Math.atan(slope);
      destructSpecs.push({ id: 'cotBlanket', kind: 'blanket', meshes: [fold], flammable: true }); } }   // +5 mm: its flat bottom rides the curve's ends (audit)
  kitProp = false;

  // ---------- CG-2 sheet 2: beat 4 (the Containment crew), beat 6 (the Branch's paper), beat 7 (small life). Same kit
  // material: what hangs on the gate's wall is one more draw (the north wall's cutaway group, so it fades with the
  // wall); everything else rides the room's and the range back wall's kit draws.
  const NOTE_C = [[256, 384], [256, 512], [256, 640], [512, 576], [768, 576]];
  const note = (i, w, x, y, z, ry, rz = 0) => {
    const m = paper('story-note', w, w / 2, [...NOTE_C[i], 256, 128], x, y, z, ry); m.rotation.z = rz;
    const dz = Math.cos(ry) * 0.0006, dx = Math.sin(ry) * 0.0006;   // a strip of tape over its top edge
    const t = paper('story-note-tape', 0.05, 0.016, [256 + 31, 832 + 31, 2, 2], x + dx - Math.sin(rz) * w / 4, y + w / 4 - 0.002, z + dz, ry); t.rotation.z = rz;
    destructSpecs.push({ id: 'note' + i, kind: 'paper', meshes: [m, t], wallNormal: { x: Math.sin(ry), z: Math.cos(ry) }, flammable: true });
    return m; };
  const tube = (pts, r, name, seg) => kit(new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg, r, 8), name, 0, 0, 0);
  const V3 = (x, y, z) => new T.Vector3(x, y, z), curves = !!(T.Vector3 && T.CatmullRomCurve3 && T.TubeGeometry);   // (stand-in tests have none)

  // Beat 4: the Containment crew. They hose the floor down after every session: a reel on a backboard west of the gate
  // (the hose wound round its drum in six coils), its stencilled plate over it, the hose run down and across to the
  // nearer drain, a mop bucket and squeegee in the west corner, three sandbags against the wall east of the gate.
  { const Rl = STORY.REEL, wz = B.maxZ, x = Rl.x, y = Rl.y;
    kbox(0.75, 0.46, 0.02, 'pail', x + 0.175, y, wz - 0.01);                                   // backboard, on the tile
    for (const [dx, dy] of [[-0.17, -0.19], [0.52, -0.19], [-0.17, 0.19], [0.52, 0.19]]) { const b = kit(G.cyl(0.014, 0.014, 0.008, 8), 'alu', x + dx, y + dy, wz - 0.024); b.rotation.x = Math.PI / 2; }
    const sp = kit(G.cyl(0.03, 0.03, 0.3, 10), 'pail', x, y, wz - 0.17); sp.rotation.x = Math.PI / 2;           // spindle, board to the crank
    { const f = kit(G.cyl(0.27, 0.27, 0.012, 28), 'reel', x, y, wz - 0.07); f.rotation.x = Math.PI / 2; }   // the back flange, solid
    // CH-3 #17 ("flat hose reel": a solid front disc hid the hose): the front flange is open, a rolled rim on four spokes
    // and a hub, so the six coils show through it as on a real wall reel
    { const zf = wz - 0.29;
      if (T.TorusGeometry) kit(new T.TorusGeometry(0.262, 0.009, 6, 36), 'reel', x, y, zf);
      else kbox(0.54, 0.54, 0.018, 'reel', x, y, zf);
      for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, sp = kbox(0.022, 0.21, 0.01, 'reel', x + Math.cos(a) * 0.15, y + Math.sin(a) * 0.15, zf); sp.rotation.z = a - Math.PI / 2; }
      const hub = kit(G.cyl(0.05, 0.05, 0.016, 16), 'reel', x, y, zf); hub.rotation.x = Math.PI / 2; }
    kit(G.cyl(0.18, 0.18, 0.2, 20), 'reel', x, y, wz - 0.18).rotation.x = Math.PI / 2;      // the drum under the hose
    for (let k = 0; k < 6; k++) kit(T.TorusGeometry ? new T.TorusGeometry(0.2, 0.0173, 5, 26) : new T.BoxGeometry(0.43, 0.43, 0.035), 'hose', x, y, wz - 0.076 - 0.0173 - 0.0346 * k);
    kbox(0.03, 0.14, 0.012, 'pail', x, y + 0.07, wz - 0.302);                                  // crank arm
    kit(G.cyl(0.012, 0.012, 0.09, 8), 'handle', x, y + 0.13, wz - 0.353).rotation.x = Math.PI / 2;
    // the hose: off the drum's bottom, down the wall, across the floor to drain 1; split where the north group ends
    const D0 = STORY.DRAINS[0];
    if (curves) {
    const path = new T.CatmullRomCurve3([V3(x + 0.03, y - 0.226, wz - 0.19), V3(x + 0.06, y - 0.52, wz - 0.2), V3(x + 0.08, 0.2, wz - 0.25),
      V3(x + 0.05, 0.019, wz - 0.55), V3(x - 0.08, 0.019, wz - 1.05), V3(x - 0.3, 0.019, wz - 1.55), V3(D0[0], 0.019, D0[1] + 0.8),
      V3(D0[0] - 0.1, 0.019, D0[1] + 0.45), V3(D0[0] + 0.18, 0.019, D0[1] + 0.22)]);
    const pts = path.getPoints(96).map((p) => V3(p.x, Math.max(0.019, p.y), p.z));
    const cut = pts.findIndex((p) => p.z < wz - 1.45);
    tube(pts.slice(0, cut + 1), 0.019, 'hose', 48);
    kitProp = true; tube(pts.slice(cut), 0.019, 'hose', 40);
    const e = pts[pts.length - 1], q = pts[pts.length - 4], dl = Math.hypot(e.x - q.x, e.z - q.z) || 1, ux = (e.x - q.x) / dl, uz = (e.z - q.z) / dl;
    const nz = kit(G.cyl(0.024, 0.016, 0.14, 10), 'brass', e.x + ux * 0.07, 0.024, e.z + uz * 0.07);   // the nozzle, on the floor
    nz.rotation.set(Math.PI / 2, Math.atan2(ux, uz), 0, 'YXZ');
    kitProp = false; }
    // the plate over the reel, and the note on the backboard's free end
    kbox(1.2, 0.16, 0.02, 'plate', x, 1.62, wz - 0.01);
    paper('story-stencil', 1.18, 0.1475, [512, 704, 512, 64], x, 1.62, wz - 0.0205, Math.PI);
    note(4, 0.15, x + 0.44, y - 0.08, wz - 0.0206, Math.PI, 0.04); }
  kitProp = true;
  for (const [dx, dz] of STORY.DRAINS) {                                                        // two cast floor drains
    kbox(0.32, 0.006, 0.32, 'drain', dx, 0.003, dz);
    for (let k = 0; k < 5; k++) tiny(kbox(0.25, 0.002, 0.022, 'earband', dx, 0.007, dz + (k - 2) * 0.05)); }
  { // CG-7 (D-226): the mop bucket on its casters, the wringer at the +x end, grey water; the mop soaking in it, its
    // clamp just over the water, the handle leaning on the west wall (world/training-kitprops.js).
    const M = STORY.MOP, x = M.x, z = M.z;
    prop('mopBucket', x, 0, z, 0);
    if (curves) {
      const clamp = V3(x - 0.07, 0.06 + 0.215, z), top = V3(B.minX + 0.028, 1.3, z + 0.06), up = top.clone().sub(clamp);
      const mg = prop('mop', clamp.x, clamp.y, clamp.z, 0, { len: up.length() - 0.06, strands: 0.19 });
      mg.quaternion.setFromUnitVectors(V3(0, 1, 0), up.normalize()); } }
  { // the floor squeegee against the west wall: its blade along z on the floor, the handle's end on the tile
    const lean = 1.28, run = 1.4 * Math.cos(lean);
    prop('squeegee', B.minX + 0.028 + run, 0, STORY.SQUEEGEE_Z, Math.PI / 2, { lean }); }
  { // the sandbags (Director 19:58Z: fat stacked bags, pillow-shaped, a crease at the tied end, two under one): a
    // subdivided box pushed into a filled sack; its floor is flat (it sits), its top bulges, the seams thin out.
    const S = STORY.SANDBAGS, L = 0.6, Wd = 0.34, H = 0.15;
    const sack = (sag) => { const g = new T.BoxGeometry(1, 1, 1, 12, 3, 8), P = g.attributes && g.attributes.position;
      if (!P || !P.getX) return g;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), t = y + 0.5;
        const fx = 1 - Math.pow(2 * x, 4) * 0.55, fz = 1 - Math.pow(2 * z, 4) * 0.7, crease = 1 - 0.3 * Math.exp(-Math.pow((x - 0.36) / 0.045, 2));
        const top = H * (0.3 + 0.7 * fx * fz) * crease, bot = -sag * fx * fz, fat = Math.sin(Math.PI * t);
        P.setXYZ(i, x * L * (1 + 0.04 * fat) * (x > 0.4 ? 0.97 : 1), bot + t * (top - bot), z * Wd * (1 + 0.12 * fat) * (1 - 0.25 * Math.max(0, 2 * x - 0.8)));
      }
      P.needsUpdate = true; if (g.computeVertexNormals) g.computeVertexNormals(); return g; };
    const bag = (x, y, z, ry, sag = 0) => { const m = kit(sack(sag), 'sandbag', x, y, z); m.rotation.y = ry; return m; };
    const sb0 = bag(S.x - 0.3, 0, S.z, 0.03), sb1 = bag(S.x + 0.3, 0, S.z - 0.01, Math.PI - 0.04);
    const sb2 = bag(S.x + 0.01, 0.159, S.z + 0.005, 0.06, 0.015);
    destructSpecs.push({ id: 'sandbag0', kind: 'sandbag', meshes: [sb0], flammable: true }, { id: 'sandbag1', kind: 'sandbag', meshes: [sb1], flammable: true }, { id: 'sandbag2', kind: 'sandbag', meshes: [sb2], supports: ['sandbag0', 'sandbag1'], flammable: true }); }   // rests on both crests (squashed under 4 mm, like a real sack)
  kitProp = false;

  // Beat 6: the Branch's paper. Typed slips, taped where the joke lands; nothing about the dead.
  { const Mo = STORY.MONITOR, e = Mo.wall === 'east' ? -1 : 1, was = kitProp; kitProp = true;   // (rides with the monitor: not in a wall's cutaway group)
    note(0, 0.16, (e < 0 ? R.maxX : R.minX) + e * 0.2105, Mo.y - 0.135, Mo.z, e * Math.PI / 2, -0.03); kitProp = was; }   // the cracked monitor (CG-7: moved), under the tape's X
  note(1, 0.17, -29.64, 1.45, B.maxZ - 0.02 - 0.56 - 0.0008, Math.PI, 0.03);                  // the gate's west pilaster face
  kitProp = true;
  note(2, 0.18, 8 - 0.0012, 1.45, -5.55, -Math.PI / 2, -0.03);                                // on the wall by the supply kiosk
  note(3, 0.18, bedAt.x + STORY.MEDIC.tallyDX + 0.42, 1.52, B.minZ + 0.08 + 0.0925 + 0.0012, 0, 0.05);   // by the REVIVALS board

  // Beat 7: small life. The calendar, the radio at the bench's east end (silent), a glove left on the bench.
  kitProp = false;
  { const C = STORY.CAL; const cp = paper('story-calendar', 0.21, 0.28, [832, 320, 192, 256], C.x, C.y, BZ + 0.003, 0);
    destructSpecs.push({ id: 'calendar', kind: 'paper', meshes: [cp], wallNormal: { x: 0, z: 1 }, flammable: true });
    tiny(kbox(0.012, 0.012, 0.01, 'pin', C.x, C.y + 0.128, BZ + 0.008)); }
  kitProp = true;
  { const Rd = STORY.RADIO, g2 = new T.Group(); g2.position.set(Rd.x, 0.86, Rd.z); g2.rotation.y = Rd.ry; if (root) root.add(g2);
    const rdMeshes = [
      kbox(0.26, 0.15, 0.09, 'radio', 0, 0.075, 0, g2),
      tiny(kbox(0.13, 0.1, 0.002, 'earband', -0.05, 0.07, -0.046, g2)),                         // speaker grille (it faces him)
      tiny(kbox(0.07, 0.028, 0.002, 'alu', 0.075, 0.1, -0.046, g2))                            // the dial window
    ];
    for (const kx of [0.05, 0.1]) { const k = kit(G.cyl(0.012, 0.012, 0.014, 10), 'earband', kx, 0.04, -0.052, g2); k.rotation.x = Math.PI / 2; rdMeshes.push(k); }
    for (const sx of [-0.1, 0.1]) rdMeshes.push(kbox(0.012, 0.04, 0.012, 'earband', sx, 0.17, 0, g2));
    rdMeshes.push(kbox(0.212, 0.012, 0.012, 'earband', 0, 0.196, 0, g2));
    const an = kit(G.cyl(0.004, 0.003, 0.32, 6), 'alu', 0.11 + 0.16 * Math.sin(0.35), 0.15 + 0.16 * Math.cos(0.35), 0.02, g2); an.rotation.z = -0.35;
    rdMeshes.push(an);
    destructSpecs.push({ id: 'radio', kind: 'electronics', meshes: rdMeshes, extraMeshes: { antenna: [an] } }); }
  { const Gl = STORY.GLOVE; prop('glove', Gl.x, 0.86, Gl.z, Gl.ry); }   // CH-3 #18: built in world/training-kitprops.js (was five boxes)
  kitProp = false;

  // CG-7 step 3 (D-237 #11): the other five too: the broom, mop and squeegee snap (handle in two, the head off), the ear
  // tray's defenders fly out and it cracks, the mop bucket is knocked over and never breaks (the mop goes with it).
  // CG-7 step 2 (D-226: shot and destroyed). First three: the mug shatters, the clipboard's sheets fly and it breaks on
  // the third round, the brass bucket is knocked over (its cases spill) and dents, never breaks. Their still shapes stay in
  // the kit draw; world/training-kitprops.js swaps a hit one for its loose copy.
  let kitProps = null;
  // CG-7 s2: the sharps bin falls past the infirmary cabinet's worktop (world/training-props.js: 1.78 m wide at bedAt.x
  // + 2.72, 0.65 deep from the panels + 0.225, its top at 0.90 m): a knocked bin lands on it, never inside it.
  const MEDMAT = { minX: bedAt.x + 0.82 - 3.6, maxX: bedAt.x + 0.82 + 3.6, minZ: B.minZ + 0.08 + 2.0775 - 1.92, maxZ: B.minZ + 0.08 + 2.0775 + 1.92, y: 0.02 };
  const MEDTOP = { minX: bedAt.x + 2.72 - 0.89, maxX: bedAt.x + 2.72 + 0.89, minZ: B.minZ + 0.08 + 0.225, maxZ: B.minZ + 0.08 + 0.875, y: 0.9 };
  const MEDKIT = { minX: bedAt.x + 2.22 - 0.24, maxX: bedAt.x + 2.22 + 0.24, minZ: B.minZ + 0.08 + 0.375, maxZ: B.minZ + 0.08 + 0.725, y: 1.14 };   // the kit case on it
  const MEDMON = { minX: bedAt.x + 3.2 - 0.29, maxX: bedAt.x + 3.2 + 0.29, minZ: B.minZ + 0.08 + 0.35, maxZ: B.minZ + 0.08 + 0.59, y: 1.39 };   // and the monitor (the medic's mug's shards stay out of it)
  if (root && T.Box3 && T.Matrix4 && T.Matrix3 && T.BufferGeometry && T.BufferAttribute && T.Quaternion && T.Vector3 && kitGroups.mug) {
    const build = (id, opts) => {
      const g2 = buildKitProp(T, id, { mk: (geo, sw, px, py, pz, parent, shadow = true) => { const m = new T.Mesh(flat(geo, sw), kitMat); m.position.set(px, py, pz); m.castShadow = shadow; parent.add(m); return m; }, tiny, opts });
      if (id === 'clipboard') { const ud = g2.userData; const m = new T.Mesh(kitCell(new T.PlaneGeometry(0.2, 0.15), 256, 0, 256, 192), kitMat); m.position.set(0, ud.cardY, ud.cardZ); m.rotation.set(-Math.PI / 2, Math.PI, 0, 'YXZ'); m.userData.part = 'sheet'; g2.add(m); }
      return g2; };
    kitProps = createKitPropRuntime(T, { root, mat: kitMat, origin: root.position, build,
      props: ['mug', 'clipboard', 'brassBucket', 'pushBroom', 'earTray', 'mopBucket', 'mop', 'squeegee', 'glove', 'markers', 'sharpsBin', 'medMug'].filter((id) => kitGroups[id])   // CG-7 step 3: all eight (+ the glove, CH-3 #18; + the board's markers, the sharps bin, the medic's mug, CG-7 s2)
        .map((id) => ({ id, ...kitGroups[id], metal: id === 'brassBucket', rides: id === 'mop' ? 'mopBucket' : undefined })),
      surfaces: [{ minX: R.minX, maxX: R.maxX, minZ: 0.18, maxZ: 0.82, y: 0.86 }, MEDMAT, MEDTOP, MEDKIT, MEDMON],   // the bench's worktop (world/training-firing-line.js); the infirmary cabinet's (CG-7 s2)
      blocks: [{ minX: R.minX, maxX: R.maxX, minZ: 0.18, maxZ: 0.82, maxY: 0.79 }, { ...MEDTOP, maxY: 0.86, sides: true }, { ...MEDKIT, maxY: 1.12, sides: true }, { ...MEDMON, maxY: 1.37, sides: true }],   // under the worktop (kick panel), CG-7 step 3; the cabinet
      rooms: [R, B] }); }

  return { parts, decals, dead, flicker, flickerMat: flickMat, update, blockers, door, kickDoor, pushDoor, bumpDoor, kitProps, worldUvMats, destructSpecs };
}

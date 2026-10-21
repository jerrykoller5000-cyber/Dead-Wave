// world/heron.js — the way out, story v2 (CL-110, D-70, docs/story.md §1, §3). Claude's (world/*).
//
// Heron is the PGB's military floatplane: a high-winged, twin-engined amphibious transport in olive drab. The lake
// is cut off from every river and road, so the way out is from the air. On night 20, once he has called it (GB-85's
// 'extraction' 'called'), it comes in as the last push starts ('due'): three red flares go up from the end of the
// dock, Heron comes in low over the trees with its landing light on, sets down far out on the lake, runs in on its
// floats, swings round and lies with its left float along the end of the dock, engines idling. It waits through the
// dawn (GB-85's wait) until he boards (GB-86) or the next alarm sends it away ('gone'): then it pulls off, runs out
// across the lake and climbs away.
//
// It replaces world/boat.js (CL-73) behind the same API, so GB-85's and GB-86's flow is unchanged (GB-117):
//   createHeron({ scene, dock, deckY, waterY, requestLight, audio, groundAt }) → craft
//     dock: { x, z, yaw, len, hw, lakeEnd } as for the boat; groundAt(x, z) (optional) keeps the flight over the hills.
//   craft.arrive() / leave() / reset() / update(dt) / state() / deck() / timeline()   as the boat's
//   craft.group, craft.flares, craft.berth, craft.offshore, craft.end                     for tests and shots
//   craft.path(u, leaving)   where it is at u (0..1) along its arrival or its leaving: { x, y, z, yaw, onWater }
//
// No lights are added: the flares, the landing light and the cabin glow ask the game's effect-light pool
// (requestLight), as the boat did.
import * as THREE from 'three';
import { loftBody, ringLoft, airfoilPanel, skinPatch, skinBand, strut, tubeAB, camo, camoField, mergeStatic, stencilTexture, spaced, smoothstep, mix, joinGeos } from './aircraft-kit.js';

export const HERON = Object.freeze({
  ARRIVE_S: 24,        // s from the first flare to lying at the dock (t145 has it waiting by 25.5 s)
  AIR_S: 10,           // of which in the air, from the hills to the touchdown
  RUN_S: 8,            // on the water, running in
  LEAVE_S: 20,         // s from the 'gone' to out of sight (t145: gone within 21 s)
  START_OUT: 320,      // m out from the dock's end where it is first seen
  START_ALT: 62,       // m over the water there
  TOUCH_OUT: 62,       // m out from the dock's end where its floats touch
  SWING_OUT: 15,       // m out where it swings round to lay its float along the dock
  FLOAT_X: 2.4,        // m from the middle of the plane to the middle of each float
  BERTH_GAP: 1.0,      // m from the dock's end to the middle of its left float
  FLARES: 3, FLARE_GAP_S: 1.2, FLARE_UP_S: 2.2, FLARE_BURN_S: 9, FLARE_HEIGHT: 26,
  DECK_R: 2.2,
  FLOAT_TOP: 0.42,     // the float's top over its keel
  DRAFT: 0.22          // how deep the floats sit in the water
});

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const ease = (u) => 1 - Math.pow(1 - clamp01(u), 3);
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const angLerp = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;

// --------------------------------------------------------------------------------------------------------------
// The model (CL-142: rebuilt for fidelity; it was boxes). Nose +Z, left wing +X, up +Y; the waterline (the floats'
// keels) at y = 0. A twin-turboprop, high-winged utility floatplane in the PGB's olive and dark green: a squared,
// lofted fuselage with a glazed flight deck and a sloped windscreen, five cabin windows a side and a cargo door each
// side, a strut-braced wing with flaps and ailerons, long turboprop nacelles with exhaust stacks and three-bladed
// props, a swept fin with its dorsal fillet, rudder and a ventral fin, and two stepped floats on N-struts with
// spreader bars, bracing wires, walkways and water rudders. Still parts are merged into one mesh per material
// (mergeStatic); what the game and the tests hold by name stays as it was: 'heron-wing', two 'heron-float', two
// 'heron-prop' (each with its 'heron-prop-blur'), 'heron-strut', 'heron-nacelle', 'heron-landing-light'.
const FY = 2.35;                                           // the fuselage's middle over the water

// The fuselage's cross-section at z: half width, top and bottom, squareness.
function fuselage(z) {
  let yTop = FY + 0.98, yBot = FY - 0.97, w = 0.9, n = 3.1;
  if (z > 4.0) yTop = FY + 0.98 - 0.70 * smoothstep(4.0, 5.2, z);                // the windscreen's slope
  if (z > 4.5) yBot = FY - 0.97 + 0.17 * smoothstep(4.5, 5.2, z);
  if (z > 4.3) w = 0.9 - 0.12 * smoothstep(4.3, 5.2, z);
  if (z > 5.2) {                                                                  // the nose, rounded off
    const s = Math.min(1, (z - 5.2) / 0.95), e = Math.sqrt(Math.max(0, 1 - s * s));
    yTop = FY - 0.32 + 0.60 * e; yBot = FY - 0.32 - 0.48 * e; w = 0.78 * e; n = 3.1 - 0.7 * s;
  }
  if (z < -2.6) {                                                                 // the tail sweeps up and narrows
    const u = Math.min(1, (-2.6 - z) / 5.1);
    yBot = FY - 0.97 + 1.59 * Math.pow(u, 1.15);
    yTop = FY + 0.98 - 0.12 * smoothstep(0.3, 1, u);
    w = 0.9 - 0.72 * Math.pow(u, 0.9); n = 3.1 - 0.6 * u;
  }
  if (z < -7.7) {                                                                 // the tail cone's end
    const s = Math.min(1, (-7.7 - z) / 0.16), e = Math.sqrt(Math.max(0, 1 - s * s)), mid = (FY + 0.86 + FY + 0.62) / 2;
    yTop = mid + (FY + 0.86 - mid) * e; yBot = mid - (mid - FY - 0.62) * e; w = 0.18 * e;
  }
  const y = (yTop + yBot) / 2;
  return { w, ht: yTop - y, hb: y - yBot, y, n };
}
// The engine nacelle's section (its own frame, centred on the engine's axis at x = 0).
function nacelle(z) {
  let w = 0.4, ht = 0.4, hb = 0.47, y = 0, n = 2.3;
  if (z > 3.3) { const s = (z - 3.3) / 0.75; w = 0.4 - 0.08 * s * s; ht = 0.4 - 0.1 * s * s; hb = 0.47 - 0.15 * s * s; }
  if (z < 1.0) { const s = Math.min(1, (1.0 - z) / 1.6); w = 0.4 - 0.3 * Math.pow(s, 1.3); ht = 0.4 - 0.22 * s; hb = 0.47 - 0.37 * Math.pow(s, 0.9); y = 0.14 * s; }
  return { w, ht, hb, y, n };
}

export function buildHeron() {
  const T = THREE;
  const g = new T.Group();
  g.name = 'heron';
  const skin = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.78, metalness: 0.12 });
  const olive = new T.MeshStandardMaterial({ color: 0x485134, roughness: 0.8, metalness: 0.15 });
  const dark = new T.MeshStandardMaterial({ color: 0x23251f, roughness: 0.6, metalness: 0.3 });
  const metal = new T.MeshStandardMaterial({ color: 0x8c9088, roughness: 0.38, metalness: 0.8 });
  const rubber = new T.MeshStandardMaterial({ color: 0x151613, roughness: 0.9, metalness: 0.0 });
  const soot = new T.MeshStandardMaterial({ color: 0x1b1c17, roughness: 1.0, metalness: 0.0 });
  const yellow = new T.MeshStandardMaterial({ color: 0xc8a43a, roughness: 0.6, metalness: 0.05 });
  const walk = new T.MeshStandardMaterial({ color: 0x2a2c27, roughness: 0.98, metalness: 0.0 });
  const glass = new T.MeshStandardMaterial({ color: 0x33475a, emissive: 0xffd89a, emissiveIntensity: 0.03, roughness: 0.05, metalness: 0.35 });
  const lightMat = new T.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff2d2, emissiveIntensity: 2.5 });
  const red = new T.MeshStandardMaterial({ color: 0xff2a1e, emissive: 0xff2a1e, emissiveIntensity: 2 });
  const green = new T.MeshStandardMaterial({ color: 0x22ff6a, emissive: 0x22ff6a, emissiveIntensity: 2 });
  const white = new T.MeshStandardMaterial({ color: 0xf4f6ff, emissive: 0xf4f6ff, emissiveIntensity: 1.2 });
  const bladeMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.55, metalness: 0.3 });
  const mesh = (geo, mat, name) => { const m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (name) m.name = name; g.add(m); return m; };
  const at = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };

  // The paint: olive with dark green blotches over, a pale grey-green under the chine.
  const OL = new T.Color(0x4d5636), DK = new T.Color(0x2b311c), BR = new T.Color(0x5a5338), BL = new T.Color(0x6f776a), FL = new T.Color(0x666c60), AF = new T.Color(0x33372f);
  const blot = camoField(0.7), blot2 = camoField(3.1);
  const paint = (under) => (x, y, z, c) => { c.copy(OL).lerp(BR, blot2(z * 1.3, y, -x * 1.3) * 0.75).lerp(DK, blot(x, y, z) * 0.95); const b = under(x, y, z); if (b > 0) c.lerp(BL, b); return c; };
  const camoOf = (geo, under = () => 0) => camo(T, geo, paint(under));

  // --- The fuselage -----------------------------------------------------------------------------------------
  const zs = [...new Set([...spaced(-7.86, -7.7, 4, 'start'), ...spaced(-7.7, -2.6, 16, 'none'), ...spaced(-2.6, 4.0, 12, 'none'),
    ...spaced(4.0, 5.2, 10, 'none'), ...spaced(5.2, 6.15, 12, 'end')].map((v) => +v.toFixed(4)))].sort((a, b) => a - b);
  const body = loftBody(T, fuselage, { zs, seg: 36 });
  camoOf(body.geo, (x, y, z) => { const p = fuselage(z); return smoothstep(p.y - p.hb * 0.3, p.y - p.hb * 0.62, y); });
  mesh(body.geo, skin);
  const P = Math.PI, H = P / 2;
  const onBody = (geo, mat) => mesh(geo, mat);
  const win = (z0, z1, a0, a1, rnd = 1) => {
    onBody(skinPatch(T, body, z0 - 0.035, z1 + 0.035, a0 - 0.04, a1 + 0.04, 0.006, { nz: 8, na: 8, round: rnd }), rubber);
    onBody(skinPatch(T, body, z0, z1, a0, a1, 0.012, { nz: 8, na: 8, round: rnd }), glass);
  };
  // The flight deck: two windscreen panes on the slope, a side window each side, the eyebrow over it.
  win(4.22, 5.08, H + 0.05, H + 0.66, 0); win(4.22, 5.08, H - 0.66, H - 0.05, 0);
  for (const [a0, a1] of [[0.14, 0.62], [P - 0.62, P - 0.14]]) win(3.62, 4.62, a0, a1);
  // Wipers, lying at the bottom of each pane.
  for (const s of [-1, 1]) { const p = body.surf(5.02, H + s * 0.36, 0.02); const m = mesh(new T.BoxGeometry(0.42, 0.012, 0.02), dark); at(m, p.x, p.y, p.z, -0.75, 0, s * 0.12); }
  // The cabin windows, five a side.
  for (const zc of [2.75, 1.85, 0.95, 0.05, -0.85]) for (const [a0, a1] of [[0.13, 0.55], [P - 0.55, P - 0.13]]) win(zc - 0.29, zc + 0.29, a0, a1);
  // Seams: the cargo doors (two-leaf on the left, one on the right), the crew doors, panel lines round the body.
  const seam = (z0, z1, a0, a1) => {
    for (const z of [z0, z1]) onBody(skinPatch(T, body, z - 0.011, z + 0.011, a0, a1, 0.004, { nz: 1, na: 10 }), rubber);
    for (const a of [a0, a1]) onBody(skinPatch(T, body, z0, z1, a - 0.012, a + 0.012, 0.004, { nz: 6, na: 1 }), rubber);
  };
  seam(-2.58, -1.22, -0.72, 0.64); onBody(skinPatch(T, body, -1.911, -1.889, -0.72, 0.64, 0.004, { nz: 1, na: 10 }), rubber);
  seam(-2.38, -1.42, P - 0.64, P + 0.72);
  seam(3.5, 4.78, -0.5, 0.7); seam(3.5, 4.78, P - 0.7, P + 0.5);
  for (const z of [3.42, 2.3, -0.42, -2.82, -4.45, -6.05]) onBody(skinBand(T, body, z, 0.018, -P, P, 0.003, 36), rubber);
  // Door handles, a step under each cargo door, the boarding ladders down to the floats.
  for (const [sx, zc] of [[1, -1.7], [1, -2.1], [-1, -1.9]]) { const p = body.surf(zc, sx > 0 ? -0.05 : P + 0.05, 0.02); mesh(new T.BoxGeometry(0.04, 0.03, 0.16), metal).position.copy(p); }
  // --- The wing --------------------------------------------------------------------------------------------------
  const WY = 3.48, LE = 2.25, CH = 2.1, WT = 0.15, TIP = 8.6;
  const wsec = () => ({ le: LE, c: CH, t: WT, y: WY, camber: 0.02 });
  const wingGeos = [
    airfoilPanel(T, { s0: -0.95, s1: 0.95, at: wsec, steps: 4 }),
    airfoilPanel(T, { s0: 0.9, s1: TIP, at: wsec, to: 0.75, steps: 22, round: 0.32 }),
    airfoilPanel(T, { s0: -0.9, s1: -TIP, at: wsec, to: 0.75, steps: 22, round: 0.32 })
  ];
  const wingGeo = joinGeos(T, wingGeos);
  camoOf(wingGeo, (x, y) => smoothstep(WY + 0.02, WY - 0.06, y));
  mesh(wingGeo, skin, 'heron-wing');
  // Flaps (two a side, a little down at rest) and the ailerons outboard.
  const hingeZ = LE - 0.77 * CH;
  for (const [s0, s1, droop] of [[0.95, 3.95, -0.1], [4.05, 5.95, -0.1], [6.05, 8.1, 0], [-0.95, -3.95, -0.1], [-4.05, -5.95, -0.1], [-6.05, -8.1, 0]]) {
    const geo = airfoilPanel(T, { s0, s1, at: wsec, from: 0.77, to: 1.0, steps: 6, cn: 6 });
    geo.translate(0, -WY, -hingeZ);
    camoOf(geo, (x, y) => smoothstep(0.02, -0.04, y));
    const m = mesh(geo, skin); at(m, 0, WY - 0.02, hingeZ, droop);
  }
  // Flap-track fairings under the trailing edge, fuel caps on top, a stall vane.
  for (const x of [2.2, 3.95, 5.0, 6.9, -2.2, -3.95, -5.0, -6.9]) {
    const f = mesh(new T.SphereGeometry(1, 10, 6), olive); at(f, x, WY - 0.16, hingeZ - 0.05); f.scale.set(0.05, 0.08, 0.42);
  }
  for (const x of [2.6, -2.6, 5.4, -5.4]) at(mesh(new T.CylinderGeometry(0.07, 0.07, 0.02, 12), dark), x, WY + 0.155, 1.45);
  // Lights at the tips: red to port (the left, +X), green to starboard, white strobes aft.
  at(mesh(new T.SphereGeometry(0.075, 10, 8), red), TIP + 0.02, WY + 0.01, 1.65);
  at(mesh(new T.SphereGeometry(0.075, 10, 8), green), -TIP - 0.02, WY + 0.01, 1.65);
  for (const s of [1, -1]) at(mesh(new T.SphereGeometry(0.05, 8, 6), white), s * (TIP - 0.05), WY + 0.03, 0.45);
  // The wing struts (to the lower fuselage), and the jury struts down to the floats.
  const strutMat = olive;
  for (const sx of [1, -1]) {
    const st = strut(T, [sx * 0.8, 1.62, 1.6], [sx * 3.75, WY - 0.12, 1.55], 0.18, 0.065, strutMat);
    st.castShadow = true; g.add(st); if (sx > 0) st.name = 'heron-strut';
  }
  // --- The engines --------------------------------------------------------------------------------------------------
  const NX = 3.3, NY = 3.24;
  const nzs = [...new Set([...spaced(-0.62, 1.0, 10, 'none'), ...spaced(1.0, 3.3, 6, 'none'), ...spaced(3.3, 4.05, 6, 'end')].map((v) => +v.toFixed(4)))].sort((a, b) => a - b);
  for (const sx of [1, -1]) {
    const nb = loftBody(T, nacelle, { zs: nzs, seg: 24 });
    nb.geo.translate(sx * NX, NY, 0);
    camoOf(nb.geo, (x, y, z) => { const p = nacelle(z); return smoothstep(NY + p.y - p.hb * 0.2, NY + p.y - p.hb * 0.6, y); });
    const nm = mesh(nb.geo, skin); if (sx > 0) nm.name = 'heron-nacelle';
    const nbody = { surf: (z, a, off, out) => nb.surf(z, a, off, out).add(new T.Vector3(sx * NX, NY, 0)), norm: nb.norm };
    // The exhaust stacks, both sides of each engine, and the soot behind them.
    for (const side of [1, -1]) {
      const a = side > 0 ? -0.1 : P + 0.1;
      const p = nbody.surf(2.85, a, 0);
      const ex = mesh(new T.CylinderGeometry(0.09, 0.11, 0.26, 12, 1, true), dark);
      at(ex, p.x + side * 0.06, p.y, p.z - 0.04, 0, 0, 0);
      ex.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(side * 0.8, 0.0, -0.6).normalize());
      const inner = mesh(new T.CircleGeometry(0.095, 12), soot); inner.position.copy(ex.position).add(new T.Vector3(side * 0.13, 0, -0.1)); inner.lookAt(inner.position.clone().add(new T.Vector3(side * 0.8, 0, -0.6)));
      mesh(skinPatch(T, nbody, 2.0, 2.72, a - 0.18, a + 0.18, 0.004, { nz: 6, na: 4, round: 1 }), soot);
    }
    // The intake under the spinner, a cooler scoop under the nacelle.
    const intake = mesh(new T.SphereGeometry(1, 14, 8, 0, P * 2, 0, H), rubber); at(intake, sx * NX, NY - 0.33, 3.95, H, 0, 0); intake.scale.set(0.2, 0.08, 0.1);
    const scoop = mesh(new T.BoxGeometry(0.26, 0.1, 0.5), olive); at(scoop, sx * NX, NY - 0.47, 2.3);
    // The spinner (still; it is round) and the prop, which turns.
    const spin = mesh(new T.LatheGeometry([[0.0, 0], [0.27, 0], [0.265, 0.1], [0.235, 0.24], [0.18, 0.38], [0.1, 0.5], [0.0, 0.58]].map(([r, h]) => new T.Vector2(r, h)), 20), dark);
    at(spin, sx * NX, NY, 4.02, H, 0, 0);
    const prop = new T.Group(); prop.name = 'heron-prop'; prop.position.set(sx * NX, NY, 4.18);
    prop.add(new T.Mesh(propBlades(T), bladeMat));
    prop.children[0].castShadow = true; prop.children[0].receiveShadow = true;
    const blur = new T.Mesh(new T.CircleGeometry(1.48, 32), new T.MeshBasicMaterial({ color: 0x9a9a8c, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
    blur.name = 'heron-prop-blur';
    prop.add(blur);
    g.add(prop);
  }
  // --- The tail ------------------------------------------------------------------------------------------------------
  const finLE = (y) => -5.55 - (y - 3.1) * 0.55, finC = (y) => 2.05 - (y - 3.1) * 0.32;
  const finSec = (y) => ({ le: finLE(y), c: finC(y), t: 0.11, x: 0 });
  const finGeo = joinGeos(T, [
    airfoilPanel(T, { s0: 3.05, s1: 5.45, axis: 'y', at: finSec, to: 0.68, steps: 10, round: 0.22 }),
    // the dorsal fillet, running forward along the spine into the fin
    airfoilPanel(T, { s0: 3.05, s1: 3.62, axis: 'y', at: (y) => { const u = (y - 3.05) / 0.57; const le = mix(-3.6, finLE(y) + 0.02, Math.pow(u, 0.6)); return { le, c: le - (finLE(y) - 0.6), t: 0.07, x: 0 }; }, steps: 5, round: 0.08 }),
    // the ventral fin under the tail cone
    airfoilPanel(T, { s0: 3.0, s1: 2.42, axis: 'y', at: (y) => { const u = (3.0 - y) / 0.58; return { le: -6.25 - u * 0.75, c: 1.25 - u * 0.5, t: 0.09, x: 0 }; }, steps: 4, round: 0.1 })
  ]);
  camoOf(finGeo); mesh(finGeo, skin);
  const rudder = airfoilPanel(T, { s0: 3.25, s1: 5.4, axis: 'y', at: finSec, from: 0.71, to: 1, steps: 8, cn: 6, round: 0.2 });
  camoOf(rudder); mesh(rudder, skin);
  const SY = 3.42, stabLE = (x) => -6.05 - Math.abs(x) * 0.08, stabC = (x) => 1.55 - Math.abs(x) * 0.12;
  const stabSec = (x) => ({ le: stabLE(x), c: stabC(x), t: 0.1, y: SY });
  for (const [s0, s1] of [[0, 3.2], [0, -3.2]]) {
    const st = airfoilPanel(T, { s0, s1, at: stabSec, to: 0.68, steps: 8, round: 0.16 }); camoOf(st, (x, y) => smoothstep(SY + 0.02, SY - 0.04, y)); mesh(st, skin);
    const el = airfoilPanel(T, { s0: s0 + Math.sign(s1) * 0.12, s1: s1 - Math.sign(s1) * 0.04, at: stabSec, from: 0.71, to: 1, steps: 6, cn: 6, round: 0.12 });
    camoOf(el, (x, y) => smoothstep(SY + 0.02, SY - 0.04, y)); mesh(el, skin);
  }
  at(mesh(new T.SphereGeometry(0.08, 10, 8), red), 0, 5.47, finLE(5.45) - 0.55);           // the beacon on the fin
  at(mesh(new T.SphereGeometry(0.07, 10, 8), red), 0, FY - 0.99, -1.2);                     // and under the belly
  at(mesh(new T.SphereGeometry(0.05, 8, 6), white), 0, 4.0, -8.13);                         // the tail light
  // Antennas: a wire from the cabin roof to the fin, a whip and two blades, a loop fairing.
  g.add(tubeAB(T, [0, FY + 0.99, -0.55], [0, 4.62, finLE(4.62) - 0.05], 0.006, dark));
  at(mesh(new T.CylinderGeometry(0.008, 0.012, 0.75, 6), dark), 0, FY + 1.3, -1.7, -0.45);
  for (const [z, y, sy] of [[-1.1, FY + 0.98, 1], [-0.2, FY - 0.97, -1]]) { const b = mesh(new T.BoxGeometry(0.03, 0.22, 0.18), dark); at(b, 0, y + sy * 0.1, z, -0.35 * sy); }
  const adf = mesh(new T.SphereGeometry(1, 12, 6), dark); at(adf, 0, FY + 0.985, -2.1); adf.scale.set(0.16, 0.05, 0.3);
  g.add(tubeAB(T, [0.62, FY + 0.15, 5.0], [0.62, FY + 0.15, 5.5], 0.015, metal));          // the pitot
  // --- The floats -----------------------------------------------------------------------------------------------------
  const keelAt = (z) => (z < -0.22 ? 0.09 + ((-0.22 - z) / 3.53) * 0.22 : z > 2.9 ? 0.3 * Math.pow((z - 2.9) / 2.15, 1.6) : 0);
  const deckAt = (z) => HERON.FLOAT_TOP - 0.08 * smoothstep(4.0, 5.05, z) - 0.05 * smoothstep(-3.2, -3.75, z);
  const halfAt = (z) => (z > 3.0 ? Math.max(0.03, 0.46 * Math.sqrt(Math.max(0, 1 - ((z - 3.0) / 2.12) ** 2))) : z < -1.6 ? 0.46 - 0.3 * smoothstep(-1.6, -3.75, z) : 0.46);
  const fzs = [-3.75, -3.62, -3.3, -2.8, -2.0, -1.2, -0.23, -0.21, 0.6, 1.6, 2.5, 3.0, 3.5, 4.0, 4.4, 4.7, 4.9, 5.02];
  const ringAt = (z) => {
    const k = keelAt(z), d = deckAt(z), a = halfAt(z), ch = Math.min(d - 0.1, k + (z < -0.22 ? 0.1 : 0.13));
    return [[0, k], [a * 0.97, ch], [a, d - 0.06], [a * 0.86, d], [0, d + 0.012], [-a * 0.86, d], [-a, d - 0.06], [-a * 0.97, ch]];
  };
  for (const sx of [1, -1]) {
    const geo = ringLoft(T, fzs.map((z) => ({ z, pts: ringAt(z) })), { flat: true });
    geo.translate(sx * HERON.FLOAT_X, 0, 0);
    camo(T, geo, (x, y, z, c) => c.copy(FL).lerp(AF, smoothstep(0.3, 0.22, y)));
    mesh(geo, skin, 'heron-float');
    const fx = sx * HERON.FLOAT_X, top = HERON.FLOAT_TOP + 0.012;
    at(mesh(new T.BoxGeometry(0.46, 0.012, 6.0), walk), fx, top + 0.004, 0.3);                       // the walkway, non-slip
    for (const e of [-1, 1]) at(mesh(new T.BoxGeometry(0.035, 0.013, 6.0), yellow), fx + e * 0.245, top + 0.004, 0.3);
    for (const z of [-2.5, -1.2, 0.4, 1.7, 2.9]) at(mesh(new T.CylinderGeometry(0.075, 0.075, 0.02, 14), metal), fx - sx * 0.33, top - 0.01, z);
    for (const z of [4.25, -3.25]) at(mesh(new T.BoxGeometry(0.06, 0.05, 0.22), metal), fx, deckAt(z) + 0.03, z);  // cleats
    const bump = mesh(new T.SphereGeometry(0.07, 10, 8), rubber); at(bump, fx, keelAt(5.02) + 0.02, 5.03);
    const rud = mesh(new T.BoxGeometry(0.025, 0.3, 0.26), dark); at(rud, fx, 0.2, -3.88);           // the water rudder
    at(mesh(new T.BoxGeometry(0.05, 0.06, 0.14), dark), fx, 0.35, -3.74);
    // The N-struts up to the fuselage, the jury strut up to the wing strut.
    for (const [a, b] of [[[fx - sx * 0.05, 0.44, 2.6], [sx * 0.74, 1.5, 2.6]], [[fx - sx * 0.05, 0.44, 1.55], [sx * 0.74, 1.5, 2.6]],
      [[fx - sx * 0.05, 0.44, -0.9], [sx * 0.74, 1.5, -0.9]], [[fx - sx * 0.05, 0.44, 0.1], [sx * 0.74, 1.5, -0.9]], [[fx, 0.44, 1.55], [sx * 2.4, 2.575, 1.58]]]) {
      const s = strut(T, a, b, 0.15, 0.055, strutMat); s.castShadow = true; g.add(s);
    }
    // The boarding ladder from the walkway to the cargo door.
    for (const z of [-1.72, -2.08]) g.add(tubeAB(T, [fx - sx * 0.3, 0.44, z], [sx * 0.97, 1.5, z], 0.018, metal));
    for (let k = 1; k <= 3; k++) { const u = k / 4; g.add(tubeAB(T, [mix(fx - sx * 0.3, sx * 0.97, u), mix(0.44, 1.5, u), -1.72], [mix(fx - sx * 0.3, sx * 0.97, u), mix(0.44, 1.5, u), -2.08], 0.014, metal)); }
  }
  // Spreader bars between the floats, and the bracing wires crossed under the belly.
  for (const z of [2.6, -0.9]) {
    const sb = strut(T, [-HERON.FLOAT_X + 0.4, 0.5, z], [HERON.FLOAT_X - 0.4, 0.5, z], 0.12, 0.05, strutMat); g.add(sb);
    for (const s of [1, -1]) g.add(tubeAB(T, [s * (HERON.FLOAT_X - 0.15), 0.47, z + 0.04], [-s * 0.7, 1.46, z + 0.04], 0.008, metal));
  }
  // --- Stencils --------------------------------------------------------------------------------------------------
  const decal = (tex, geo) => { if (!tex) return; const m = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.8, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 })); g.add(m); return m; };
  const name = stencilTexture(T, 'PGB · HERON');
  decal(name, skinPatch(T, body, -2.92, -5.12, -0.06, 0.26, 0.008, { nz: 10, na: 3 }));
  decal(name, skinPatch(T, body, -5.12, -2.92, P + 0.06, P - 0.26, 0.008, { nz: 10, na: 3 }));
  const roundel = stencilTexture(T, '', { w: 128, h: 128, draw: (c, w, h) => {
    c.fillStyle = 'rgba(32,36,22,0.95)'; c.beginPath(); c.arc(64, 64, 60, 0, P * 2); c.fill();
    c.fillStyle = 'rgba(200,190,150,0.9)'; c.beginPath(); c.arc(64, 64, 44, 0, P * 2); c.fill();
    c.fillStyle = 'rgba(46,52,30,1)'; c.beginPath(); c.moveTo(64, 28); c.lineTo(96, 84); c.lineTo(64, 70); c.lineTo(32, 84); c.closePath(); c.fill();
  } });
  if (roundel) {
    decal(roundel, skinPatch(T, body, -4.55, -3.85, 0.3, 0.72, 0.008, { nz: 3, na: 3 }));
    decal(roundel, skinPatch(T, body, -3.85, -4.55, P - 0.3, P - 0.72, 0.008, { nz: 3, na: 3 }));
    for (const s of [1, -1]) { const r = decal(roundel, new T.PlaneGeometry(1.1, 1.1)); r.rotation.x = -H; r.position.set(s * 6.6, WY + 0.17, 1.3); }
  }
  const code = stencilTexture(T, 'H-07', { w: 256, h: 128, font: 'bold 96px "Arial Narrow", Arial, sans-serif' });
  if (code) for (const s of [1, -1]) { const m = decal(code, new T.PlaneGeometry(0.9, 0.45)); m.position.set(s * 0.1, 4.25, finLE(4.25) - 0.62); m.rotation.y = s * H; }
  const nostep = stencilTexture(T, 'NO STEP', { w: 256, h: 64, font: 'bold 44px Arial, sans-serif', color: 'rgba(214,208,180,0.85)' });
  if (nostep) for (const s of [1, -1]) { const m = decal(nostep, new T.PlaneGeometry(0.8, 0.2)); m.rotation.set(-H, 0, 0); m.position.set(s * 1.45, WY + 0.168, 0.85); }
  // The landing light, in the bottom of the nose.
  const land = mesh(new T.SphereGeometry(0.11, 12, 8), lightMat, 'heron-landing-light');
  at(land, 0, 1.63, 5.62); land.scale.set(1, 0.5, 1);
  // One mesh per material for the still parts; the named parts and the decals stay as they are.
  mergeStatic(T, g, (o) => !!o.name || (o.material && o.material.transparent));
  g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent)) o.receiveShadow = true; });   // the game's renderer wants it (CL-142)
  g.userData = { props: g.children.filter((c) => c.name === 'heron-prop'), glass, lightMat };
  return g;
}

// The model takes a few tens of milliseconds to build, and the craft is created the moment it is called in, during
// night 20's last push: so one is built ahead, while the browser is idle, and createHeron takes that one.
let spare = null;
function takeHeron() { const g = spare || buildHeron(); spare = null; return g; }
if (typeof requestIdleCallback === 'function') requestIdleCallback(() => { try { if (!spare) spare = buildHeron(); } catch (_) { /* built on demand instead */ } }, { timeout: 15000 });

// Three blades: tapered, twisted, the tips painted yellow. One geometry, in the prop's frame (the disc in XY).
function propBlades(T) {
  const geos = [];
  for (let k = 0; k < 3; k++) {
    const geo = new T.BoxGeometry(0.2, 1.28, 0.04, 2, 14, 1);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 0.64) / 1.28;                     // 0 at the hub, 1 at the tip
      let x = p.getX(i), z = p.getZ(i);
      const wdt = (t < 0.12 ? 0.55 + 0.45 * (t / 0.12) : 1 - 0.38 * (t - 0.12)) * (t > 0.9 ? Math.sqrt(Math.max(0.05, 1 - ((t - 0.9) / 0.1) ** 2)) : 1);
      x *= wdt; z *= (1 - 0.5 * t);
      const tw = 0.75 - 0.6 * t, c = Math.cos(tw), s = Math.sin(tw);
      p.setXYZ(i, x * c - z * s, 0.16 + t * 1.28, x * s + z * c);
      const yel = t > 0.9 ? 1 : 0;
      col[i * 3] = yel ? 0.85 : 0.07; col[i * 3 + 1] = yel ? 0.7 : 0.07; col[i * 3 + 2] = yel ? 0.15 : 0.065;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    geo.rotateZ((k / 3) * Math.PI * 2);
    geos.push(geo);
  }
  geos.push(new T.CylinderGeometry(0.16, 0.16, 0.18, 14).rotateX(Math.PI / 2));
  const hub = geos[geos.length - 1];
  const hc = new Float32Array(hub.attributes.position.count * 3).fill(0.08); hub.setAttribute('color', new T.BufferAttribute(hc, 3));
  return joinGeos(T, geos);
}

function buildFlare() {
  const mat = new THREE.MeshBasicMaterial({ color: 0xff3b24 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
  m.visible = false;
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.35, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), haloMat);
  m.add(halo);
  m.userData.halo = halo;
  return m;
}

// --------------------------------------------------------------------------------------------------------------
export function createHeron({ scene, dock, deckY, waterY, requestLight = () => {}, audio = {}, groundAt = null, depthAt = null }) {
  const fx = Math.sin(dock.yaw), fz = Math.cos(dock.yaw);        // along the dock
  const rx = Math.cos(dock.yaw), rz = -Math.sin(dock.yaw);       // across it
  const out = dock.lakeEnd || 1;
  const half = (dock.len || 9.5) / 2;
  const end = { x: dock.x + fx * out * half, z: dock.z + fz * out * half };
  const along = (d, side = 0) => ({ x: end.x + fx * out * d + rx * side, z: end.z + fz * out * d + rz * side });
  // At the dock it lies across the end, its left float along the planks: the middle of the plane is out from the end
  // by the gap and the float's offset, its nose across the dock, its left side (+X) toward the planks.
  const berth = along(HERON.BERTH_GAP + HERON.FLOAT_X);
  // Which way it lies: its left float to the planks (side +1) or its right (-1), whichever keeps nose, tail and the far
  // float in the deeper water (depthAt, when given); a door on each side, so either way he steps aboard.
  const yawFor = (sd) => Math.atan2(sd * out * fz, -sd * out * fx);
  const depthScore = (sd) => {
    if (!depthAt) return sd;                                      // without the water's depths: the left, as drawn
    const y = yawFor(sd), nx = Math.sin(y), nz = Math.cos(y), ax = sd * Math.cos(y), az = -sd * Math.sin(y);
    const pts = [[6, 0], [-7, 0], [5, -2 * HERON.FLOAT_X], [-4, -2 * HERON.FLOAT_X]];
    return Math.min(...pts.map(([f, a]) => depthAt(berth.x + nx * f + ax * a, berth.z + nz * f + az * a)));
  };
  const side = depthScore(-1) > depthScore(1) + 0.05 ? -1 : 1;
  const berthYaw = yawFor(side);
  const inYaw = Math.atan2(-fx * out, -fz * out);                 // nose to the shore, coming in
  const outYaw = Math.atan2(fx * out, fz * out);                  // nose to the far shore, going
  const offshore = along(HERON.START_OUT);
  const touch = along(HERON.TOUCH_OUT), swing = along(HERON.SWING_OUT);
  const safe = (x, z, y) => (groundAt ? Math.max(y, groundAt(x, z) + 18) : y);

  // Where it is at u (0..1) along its arrival (or, leaving, along its going).
  function path(u, leaving = false) {
    if (!leaving) {
      const T = HERON.ARRIVE_S, ua = HERON.AIR_S / T, ur = (HERON.AIR_S + HERON.RUN_S) / T;
      if (u < ua) {                                                // in the air, down to the touchdown
        const s = u / ua, e = smooth(s);
        const x = lerp(offshore.x, touch.x, s), z = lerp(offshore.z, touch.z, s);
        const y = waterY + HERON.START_ALT * Math.pow(1 - e, 1.6);
        return { x, y: s < 0.85 ? safe(x, z, y) : y, z, yaw: inYaw, pitch: -0.06 * (1 - s), onWater: false };
      }
      if (u < ur) {                                                // on the floats, slowing as it runs in
        const s = ease((u - ua) / (ur - ua));
        return { x: lerp(touch.x, swing.x, s), y: waterY, z: lerp(touch.z, swing.z, s), yaw: inYaw, pitch: 0.04 * (1 - s), onWater: true };
      }
      const s = smooth((u - ur) / (1 - ur));                      // swing round and lie along the dock's end
      return { x: lerp(swing.x, berth.x, s), y: waterY, z: lerp(swing.z, berth.z, s), yaw: angLerp(inYaw, berthYaw, s), pitch: 0, onWater: true };
    }
    const far = along(95), climb = along(HERON.START_OUT + 40);
    if (u < 0.22) {                                                // pull off and swing to face the far shore
      const s = smooth(u / 0.22);
      const p = along(lerp(HERON.BERTH_GAP + HERON.FLOAT_X, 12, s));
      return { x: p.x, y: waterY, z: p.z, yaw: angLerp(berthYaw, outYaw, s), pitch: 0, onWater: true };
    }
    if (u < 0.6) {                                                 // the run, lifting off at the end of it
      const s = (u - 0.22) / 0.38, e = s * s;
      const p = along(lerp(12, 95, e));
      const lift = s > 0.8 ? (s - 0.8) / 0.2 : 0;
      return { x: p.x, y: waterY + 4 * lift * lift, z: p.z, yaw: outYaw, pitch: 0.05 + 0.08 * lift, onWater: lift === 0 };
    }
    const s = (u - 0.6) / 0.4;                                     // the climb, away over the hills
    const x = lerp(far.x, climb.x, s), z = lerp(far.z, climb.z, s);
    return { x, y: safe(x, z, waterY + 4 + (HERON.START_ALT + 30) * smooth(s)), z, yaw: outYaw, pitch: 0.12, onWater: false };
  }

  const group = takeHeron();
  group.visible = false;
  scene.add(group);
  const flares = [];
  for (let i = 0; i < HERON.FLARES; i++) { const f = buildFlare(); scene.add(f); flares.push(f); }

  let state = 'away', t = 0, propSpin = 0, wasOnWater = false;
  const play = (name, ...a) => { try { if (typeof audio[name] === 'function') audio[name](...a); } catch (_) { /* audio is a nicety */ } };

  function place(p, rock) {
    const bob = p.onWater ? Math.sin(t * 1.2) * 0.05 * rock - HERON.DRAFT : 0;   // on the water its floats sit in it
    group.position.set(p.x, p.y + bob, p.z);
    group.rotation.set(-(p.pitch || 0) + (p.onWater ? Math.sin(t * 0.8) * 0.012 * rock : 0), p.yaw, p.onWater ? Math.sin(t * 1.0 + 0.6) * 0.02 * rock : 0);
  }
  function spinProps(dt, rate) {
    propSpin += dt * rate;
    for (const pr of group.userData.props) {
      pr.rotation.z = propSpin;
      const blur = pr.children.find((c) => c.name === 'heron-prop-blur');
      if (blur) blur.material.opacity = rate > 60 ? Math.min(0.3, (rate - 60) / 300) : 0;
      for (const c of pr.children) if (c !== blur) c.visible = rate < 60;
    }
  }
  function arrive() {
    if (state === 'arriving' || state === 'waiting') return;
    state = 'arriving'; t = 0;
    group.visible = true;
    for (const f of flares) { f.visible = false; f.userData.t = null; f.userData.burst = false; }
    wasOnWater = false;
    play('heronSound', 'arrive', 12);   // CL-161: Jerry's floatplane coming in (the flyover if he has none)
  }
  function leave() {
    if (state !== 'arriving' && state !== 'waiting') return;
    state = 'leaving'; t = 0;
    for (const f of flares) f.visible = false;
    play('heronSound', 'leave', 14);   // CL-161: the takeoff
  }
  function reset() {
    state = 'away'; t = 0; group.visible = false;
    play('heronSound', 'stop');   // CL-161
    for (const f of flares) { f.visible = false; f.userData.t = null; f.userData.burst = false; }
  }
  function updateFlares() {
    for (let i = 0; i < flares.length; i++) {
      const f = flares[i];
      const ft = t - i * HERON.FLARE_GAP_S;
      if (state !== 'arriving' && state !== 'waiting') { f.visible = false; continue; }
      if (ft < 0 || ft > HERON.FLARE_UP_S + HERON.FLARE_BURN_S) { f.visible = false; continue; }
      if (f.userData.t == null) { f.userData.t = 0; play('flareWhistle'); }
      if (ft >= HERON.FLARE_UP_S && !f.userData.burst) { f.userData.burst = true; play('flareBurst'); }
      f.visible = true;
      const up = ease(ft / HERON.FLARE_UP_S);
      const fall = Math.max(0, ft - HERON.FLARE_UP_S) / HERON.FLARE_BURN_S;
      const spread = (i - (flares.length - 1) / 2) * 3;
      const x = end.x + rx * spread + fx * out * (2 + 6 * up);
      const z = end.z + rz * spread + fz * out * (2 + 6 * up);
      const y = deckY + HERON.FLARE_HEIGHT * up - 9 * fall * fall;
      f.position.set(x, y, z);
      const burn = ft < HERON.FLARE_UP_S ? 0.5 : 1 - fall * 0.6;
      f.userData.halo.scale.setScalar(0.8 + 0.2 * Math.sin(t * 17 + i) + burn * 0.5);
      requestLight(x, y, z, 0xff3b24, 3.2 * burn, 34);
    }
  }
  function update(dt) {
    if (state === 'away') return;
    t += dt;
    let p, rock = 0.6, rate = 140;
    if (state === 'arriving') {
      p = path(clamp01(t / HERON.ARRIVE_S));
      if (t >= HERON.ARRIVE_S) { state = 'waiting'; p = path(1); }
      rate = p.onWater ? 90 : 160;
      if (p.onWater && !wasOnWater) play('heronSound', 'touch');   // CL-161: the floats meeting the lake
      wasOnWater = !!p.onWater;
    }
    if (state === 'waiting') { p = path(1); rock = 1; rate = 45; play('heronSound', 'idle', 1); }   // idling: the blades still show (CL-161: and heard)
    if (state === 'leaving') {
      if (t >= HERON.LEAVE_S) { reset(); return; }
      p = path(clamp01(t / HERON.LEAVE_S), true);
      rate = 170;
    }
    place(p, rock);
    spinProps(dt, rate);
    updateFlares();
    // The landing light while it comes in and goes; a warm glow in the cockpit while it waits.
    const nose = { x: group.position.x + Math.sin(group.rotation.y) * 5.2, z: group.position.z + Math.cos(group.rotation.y) * 5.2 };
    if (state !== 'waiting') requestLight(nose.x, group.position.y + 1.4, nose.z, 0xfff2d2, 3.0, 40);
    else requestLight(nose.x, group.position.y + 2.6, nose.z, 0xffd89a, 1.4, 14);
  }
  // The middle of its left float's walkway: what he steps onto from the end of the dock.
  function deck() {
    if (state === 'away') return null;
    const yaw = group.rotation.y;
    const lx = side * Math.cos(yaw), lz = -side * Math.sin(yaw);  // its side toward the planks, in the world
    return { x: group.position.x + lx * HERON.FLOAT_X, y: group.position.y + HERON.FLOAT_TOP, z: group.position.z + lz * HERON.FLOAT_X, r: HERON.DECK_R };
  }
  return {
    group, flares, berth, offshore, end, path, side,
    arrive, leave, reset, update,
    state: () => state,
    deck,
    timeline: () => ({ state, t })
  };
}

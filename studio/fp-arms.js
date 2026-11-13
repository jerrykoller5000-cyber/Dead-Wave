// studio/fp-arms.js - CL-281 (docs/specs/first-person-1.2.md §3): the first-person view's own forearms and hands.
// His lower arm as studio/marine-body.js builds it, from the elbow down, in the elbow's own space: the sleeve's forearm
// (its ring table) with the cuff, or the rolled sleeve's bare forearm and ChatGPT's wrist bridge, and GB-152's jointed
// hand (studio/marine-hand.js) in the glove and the bare hand, on a wrist that turns. Nothing here knows the camera:
// game/viewmodel.js places the wrist on the gun and points the forearm at an elbow below the view.
import { buildHandMeshes, makeHandRig, HAND_POSES } from './marine-hand.js';
import { loftRings } from './marine-cloth.js';
import { wristTransition } from '../ui/marine-kit-fit.js';
import { boxProjectUV } from '../core/geometry.js';

export const HAND_SCALE = 1.18;   // studio/marine-body.js GB-169
// CG-1: the view's upper sleeve's length from the elbow (m); game/viewmodel.js stretches it only past this (never in play).
export const UPPER_ARM_LEN = 1.1;
// The arm's layout for a side (+1 his right, -1 his left), as marine-body.js arm() has it.
export function armLayout(side) {
  const ox = side < 0 ? 0.02 : -0.01, oz = side < 0 ? 0.04 : 0.03, gz = side < 0 ? 0.08 : 0.07;
  return { side, ox, oz, gz, wrist: [ox, -0.214, (oz + gz) / 2], grip: [ox, -0.271, gz + 0.008] };   // CL-334 e: the longer palm's grip channel (was -0.262)
}
// marine-body.js's forearm rings [y, rx, rz, cx, cz], with a run above the elbow so the sleeve leaves the view
// as a sleeve, not an open end. CL-293 (AG-202: "a severed left forearm floats in mid-air" on the long guns, elbow stumps in
// the pistol's walk): the run goes on 0.42 m past the elbow (short of the camera's plane), the upper arm's girth, so the arm always leaves the view's bottom.
// (CL-293, 3 Nov: the run above the elbow is now the upper arm's own piece, below in buildViewArm.)
// CL-334 h (Jerry, 10 Nov, J128: "No fabric or material will clip through another. (Noticing the wrist clip through the
// players arm fabric)"): the sleeve's last 6 cm come round the wrist. The wrist is 2 cm to the palm's side of the forearm's
// line (the hand's layout, gz) and the round-5 hand is fuller there: the gloved wrist stood 16 mm out through the sleeve's
// palm side and 4 mm through its thumb side, at rest (measured on the built arm). The end now centres on the wrist, 4 mm
// toward the palm and the thumb, is as wide as the gloved wrist and 3 mm more, and stops 6 mm short of the wrist's joint
// (it ran 12 mm past it, so a bent hand left the sleeve through its side; was [-0.2, 0.043, 0.038, ox, oz],
// [-0.226, 0.041, 0.034, ox, oz]). The glove's cuff runs on up inside it.
const SLEEVE_GIVE = 0.6;   // CL-334 h: how much of the wrist's bend the sleeve's end takes
export function sleeveEnd(L) {
  const s = L.side || 1, wz = (L.oz + L.gz) / 2;
  return { x: L.ox + s * 0.004, z: wz + 0.004, zMid: L.oz + 0.6 * (wz - L.oz), y: -0.208 };
}
function sleeveRings(L) {
  const { ox, oz } = L, E = sleeveEnd(L);
  return [[0.13, 0.068, 0.072, 0, 0], [0.09, 0.058, 0.062, 0, 0], [0.04, 0.0575, 0.0615, 0, 0], [-0.025, 0.059, 0.062, ox * 0.15, oz * 0.1], [-0.05, 0.066, 0.07, ox * 0.35, oz * 0.3],
    [-0.105, 0.063, 0.069, ox * 0.8, oz * 0.7], [-0.135, 0.0575, 0.0615, ox * 0.92, oz * 0.86], [-0.165, 0.05, 0.052, ox, oz], [-0.19, 0.046, 0.040, (ox + E.x) / 2, E.zMid], [E.y, 0.046, 0.033, E.x, E.z]];
}
function skinRings(L) {
  const { ox, oz } = L;
  return [[0.09, 0.05, 0.051, 0, 0], [0.03, 0.0505, 0.0515, ox * 0.05, oz * 0.04], [-0.03, 0.0505, 0.0515, ox * 0.05, oz * 0.04], [-0.065, 0.0555, 0.0555, ox * 0.3, oz * 0.25],
    [-0.105, 0.051, 0.0525, ox * 0.8, oz * 0.7], [-0.145, 0.0425, 0.0445, ox * 0.95, oz * 0.93], [-0.18, 0.037, 0.036, ox, oz]];
}
// [y, rx, rz, cx, cz] in the elbow's space as loftRings' rings, each gap halved once (marine-body.js subdiv).
// AG-168: seen from the eye the 3P sleeve's girth filled the bottom of the view; the view's sleeves are 85 % of it
// (the rolled sleeve's bare forearm keeps its size: ChatGPT's wrist bridge meets it).
const SLIM = 1.0;   // CL-293 (Jerry, 3 Nov: the arms "weird and skinny"): the body's own girth; the long guns sit up close now
function toRings(rows, e, slim = 1) {
  const out = [];
  rows = rows.map((r) => [r[0], r[1] * slim, r[2] * slim, r[3], r[4]]);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    out.push({ c: [r[3], r[0], r[4]], ax: [1, 0, 0], az: [0, 0, 1], rx: r[1], rz: r[2], e });
    if (i + 1 < rows.length) {
      const q = rows[i + 1], m = r.map((v, k) => (v + q[k]) / 2);
      out.push({ c: [m[3], m[0], m[4]], ax: [1, 0, 0], az: [0, 0, 1], rx: m[1], rz: m[2], e });
    }
  }
  return out;
}
// A rounded band round the forearm at y (the cuff, marine-body.js's 8.8 x 2.2 x 7.6 cm block) as a short closed loft.
// CL-334 h (J128): the sleeve's hem, a hollow band round its last 16 mm, just outside the sleeve's own wall (it was a
// capped solid: its end discs closed the sleeve round the wrist and the hand went through them). A closed profile swept
// round: outside down, under, inside up, over; the inside 0.5 mm off the sleeve, the outside 3 mm. Was centred on the
// forearm's line at y -0.211, rx 0.044, rz 0.038, capped.
function sleeveRingAt(L, y) {   // the sleeve's ring at y over its end (as sleeveRings and toRings lay it): centre, rx, rz
  const R = sleeveRings(L), i = R.findIndex((r, k) => k + 1 < R.length && y <= r[0] && y >= R[k + 1][0]), A = R[Math.max(0, i)], B = R[Math.max(0, i) + 1] || A;
  const t = A[0] === B[0] ? 0 : (A[0] - y) / (A[0] - B[0]), lin = (k) => A[k] + (B[k] - A[k]) * t;
  return { cx: lin(3), cz: lin(4), rx: lin(1) * SLIM, rz: lin(2) * SLIM };
}
function cuffRings(L) {
  const E = sleeveEnd(L), y0 = E.y, y1 = E.y + 0.016, ring = (y, off) => { const r = sleeveRingAt(L, y); return { c: [r.cx, y, r.cz], ax: [1, 0, 0], az: [0, 0, 1], rx: r.rx + off, rz: r.rz + off, e: 0.72 }; };
  return [ring(y1, 0.0018), ring(y1 - 0.002, 0.003), ring(y0 + 0.002, 0.003), ring(y0, 0.0018), ring(y0, 0.0006), ring(y1, 0.0006), ring(y1, 0.0018)];
}

// J63 (Jerry, 2026-11-02: the camo "will switch in texture size... They pop between two sizes"; AG-201): the loft's own UVs
// wrapped the camo once round the forearm, 3.0-3.8 repeats a metre against his body's sleeve's 2.3, so the pattern changed
// size whenever first person went from his own arms to these and back. Laid on by position as the body's is (core/geometry.js).
// CL-304 (J6, AG-254's side-by-side): the body's sleeve is projected in the marine's root space and this one in the
// elbow's, so the pattern sat 0.25 m across and 1.05 m along (a half-tile phase) from the body's and the camo jumped at
// the swap. The projection is shifted by that so the two patterns line up.
const CAMO_SHIFT = [0.25, 1.05, 0];
function bodyCamoUV(T, geo) {
  const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, uv = new Float32Array(P.count * 2);
  const shifted = new Float32Array(P.array.length);
  for (let i = 0; i < P.array.length; i += 3) { shifted[i] = P.array[i] + CAMO_SHIFT[0]; shifted[i + 1] = P.array[i + 1] + CAMO_SHIFT[1]; shifted[i + 2] = P.array[i + 2] + CAMO_SHIFT[2]; }
  boxProjectUV(shifted, uv);
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  return g;
}

// CL-334: the bare hand's nails, in the skin's material made a little lighter and pinker with a little sheen. A copy of
// the view's skin keeps that material's view-model hooks (game/viewmodel.js gives the arms their own projection), so the
// nails sit where the fingers are. One copy per skin material.
const NAIL_TINT = [0.94, 0.80, 0.76];
function nailMaterial(T) {
  let src = null, made = null;
  return (skin) => {
    if (!skin) return null;
    if (skin === src && made && made.userData.nailOf === (skin.version | 0)) return made;
    let m; try { m = skin.clone(); } catch (_) { return skin; }
    copyStandard(m, skin);
    for (const k of ['setupModelViewProjection', 'customProgramCacheKey']) if (Object.prototype.hasOwnProperty.call(skin, k)) m[k] = skin[k];
    m.userData = Object.assign({}, skin.userData, { nailOf: skin.version | 0 });
    if (m.color && skin.color) m.color.copy(skin.color).lerp(new T.Color(NAIL_TINT[0], NAIL_TINT[1], NAIL_TINT[2]), 0.14);
    if (typeof m.roughness === 'number') m.roughness = Math.min(m.roughness, 0.5);
    m.name = (skin.name || 'skin') + ':nails';
    if (made && made !== skin && made.dispose) { try { made.dispose(); } catch (_) {} }
    src = skin; made = m;
    return m;
  };
}
// CL-334 g (J101 round 6: "A highly highly detailed one"): the hand's detail maps, its creases, wrinkles, veins and
// the glove's seams (assets/hand, painted by tools/hand-bake.mjs; the hand's second UV channel). The hand's skin and glove
// are copies of the view's (their view-model hooks kept, as the nails') with the maps on; the forearm keeps the plain one.
const DETAIL = { T: null };
function detailMaps(T) {
  if (DETAIL.T === T) return DETAIL;
  DETAIL.T = T;
  let base = 'assets/hand/'; try { base = new URL('../assets/hand/', import.meta.url).href; } catch (_) {}
  const ld = new T.TextureLoader();
  const load = (n, srgb) => { const t = ld.load(base + n + '.png'); t.channel = 1; t.anisotropy = 4; if (srgb && T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; return t; };
  DETAIL.skin = { map: load('hand-skin-colour', true), normalMap: load('hand-skin-normal') };
  DETAIL.glove = { map: load('hand-glove-colour', true), normalMap: load('hand-glove-normal') };
  return DETAIL;
}
const detailCache = new WeakMap();
// A node material's clone() keeps its nodes but not a standard material's values (colour, maps, roughness): put them back.
const STD_COLOURS = ['color', 'emissive'], STD_VALUES = ['roughness', 'metalness', 'emissiveIntensity', 'opacity', 'transparent', 'side', 'alphaTest', 'envMapIntensity', 'flatShading', 'fog', 'depthWrite', 'depthTest'];
const STD_MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'lightMap'];
function copyStandard(m, src) {
  for (const k of STD_COLOURS) if (src[k] && m[k] && m[k].copy) m[k].copy(src[k]);
  for (const k of STD_VALUES) if (src[k] !== undefined) m[k] = src[k];
  for (const k of STD_MAPS) if (src[k] !== undefined) m[k] = src[k];
  if (src.normalScale && m.normalScale && m.normalScale.copy) m.normalScale.copy(src.normalScale);
}
function detailed(T, src, kind) {
  if (!src || !T.TextureLoader) return src;
  const c = detailCache.get(src);
  if (c && c.version === src.version) return c.mat;
  let m; try { m = src.clone(); } catch (_) { return src; }
  copyStandard(m, src);
  for (const k of ['setupModelViewProjection', 'customProgramCacheKey']) if (Object.prototype.hasOwnProperty.call(src, k)) m[k] = src[k];
  m.userData = Object.assign({}, src.userData, { cl334Detail: kind });
  const D = detailMaps(T)[kind];
  if (!m.map) m.map = D.map;
  m.normalMap = D.normalMap; if (T.Vector2) m.normalScale = new T.Vector2(1, 1);
  m.name = (src.name || kind) + ':detail';
  m.needsUpdate = true;
  detailCache.set(src, { version: src.version, mat: m });
  return m;
}
// One side's arm. mats: { uniform, skin, glove, pads } (any may be swapped later: arm.setMaterials).
// Returns { root (the elbow), wrist, rig, layout, parts: { sleeve, rolled, glove, bare }, meshes: { ... } }.
export function buildViewArm(T, side, mats) {
  const L = armLayout(side);
  const root = new T.Group(); root.name = 'vm-arm-' + (side > 0 ? 'r' : 'l');
  const sleeve = new T.Group(); sleeve.name = 'vm-sleeve'; root.add(sleeve);
  const rolled = new T.Group(); rolled.name = 'vm-rolled'; root.add(rolled);
  // CL-304 (J6, AG-250): the view arms take no shadow from the world: his own body behind the camera cast its cascaded
  // shadow onto them, and the sleeves flipped from shadow to sun in one frame as he moved (the pop). Lights and the night's
  // goggles still light them; a view model is lit without the world's shadows, as in every shooter.
  const mesh = (geo, mat, name, parent) => { const m = new T.Mesh(geo, mat); m.name = name; m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; parent.add(m); return m; };
  const fore = loftRings(T, toRings(sleeveRings(L), 0.72, SLIM), 30, { caps: 'first' });
  const meshes = {};
  meshes.fore = mesh(bodyCamoUV(T, fore.geo), mats.uniform, 'vm-forearm', sleeve);
  meshes.cuff = mesh(bodyCamoUV(T, loftRings(T, cuffRings(L), 30).geo), mats.uniform, 'vm-cuff', sleeve);   // CL-334 h: hollow, no caps
  meshes.skinFore = mesh(loftRings(T, toRings(skinRings(L), 0.88), 24, { caps: 'first' }).geo, mats.skin, 'vm-bare-forearm', rolled);
  // CL-293: the rolled sleeve's roll above the elbow and the sleeve on up the arm (the bare forearm stops at the roll)
  meshes.roll = mesh(bodyCamoUV(T, loftRings(T, toRings([[0.13, 0.068, 0.072, 0, 0], [0.11, 0.064, 0.068, 0, 0], [0.075, 0.066, 0.07, 0, 0]], 0.7), 26, { caps: 'first' }).geo), mats.uniform, 'vm-rolled-sleeve', rolled);
  // CL-293 (Jerry, 3 Nov: "the arms looking weird and skinny"; the sleeve ran on straight 0.42 m past the elbow, one long
  // tube): the upper arm is its own piece from the elbow, turned each frame toward his shoulder (game/viewmodel.js), so
  // the arm bends at the elbow and leaves the view toward him. Along +y from the elbow, the upper arm's girth.
  const upper = new T.Group(); upper.name = 'vm-upper-arm'; root.add(upper);
  // CG-1 (J151 note 4: "Camo resize glitch is persistent in 1st person on arms"): the view stretched this piece along its
  // length to reach his shoulder (up to 2.5 times on the long guns' support arm, changing every frame through a reload or
  // the aim), and the camo stretched with it. It now runs UPPER_ARM_LEN, past his shoulder, so it is never stretched: the
  // part past the shoulder is behind the eye, out of the view.
  const UP = [[UPPER_ARM_LEN, 0.074, 0.078, 0, 0], [0.62, 0.074, 0.078, 0, 0], [0.34, 0.074, 0.078, 0, 0], [0.24, 0.076, 0.08, 0, 0], [0.12, 0.074, 0.078, 0, 0], [0.03, 0.07, 0.074, 0, 0], [-0.03, 0.066, 0.07, 0, 0]];
  meshes.upper = mesh(bodyCamoUV(T, loftRings(T, toRings(UP, 0.72), 26, { caps: 'first' }).geo), mats.uniform, 'vm-upper-sleeve', upper);
  const wrist = new T.Group(); wrist.name = 'vm-wrist'; wrist.position.set(L.wrist[0], L.wrist[1], L.wrist[2]); root.add(wrist);
  const builds = [], parts = { sleeve, rolled };
  const nails = nailMaterial(T);
  for (const [key, mat, pads] of [['glove', detailed(T, mats.glove, 'glove'), mats.pads], ['bare', detailed(T, mats.skin, 'skin'), null]]) {
    const h = new T.Group(); h.name = 'vm-hand-' + key; h.position.set(-L.wrist[0], -L.wrist[1], -L.wrist[2]); wrist.add(h);
    const b = buildHandMeshes({ T, s: side, ox: L.ox, gz: L.gz, mat, padMat: pads || null, nailMat: key === 'bare' ? nails(mats.skin) : null, detail: 'high' });   // CL-334: the detailed hand up close
    for (const k of ['main', 'pads', 'nails']) { const m = b.meshes[k]; if (!m) continue; m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; m.name = 'vm-hand-' + key + '-' + k; h.add(m); meshes[key + (k === 'main' ? '' : k === 'pads' ? 'Pads' : 'Nails')] = m; }
    builds.push(b); parts[key] = h;
  }
  const rig = makeHandRig(side, builds, HAND_POSES.relaxed);
  wrist.userData.hand = rig; wrist.userData.handRoot = true;
  wrist.scale.setScalar(HAND_SCALE);
  let bridge = null;
  try { bridge = wristTransition(T, rolled, wrist, mats.skin, { ox: L.ox, oz: L.oz, gz: L.gz, scale: HAND_SCALE }); } catch (_) { bridge = null; }
  if (bridge) { bridge.castShadow = false; bridge.receiveShadow = false; bridge.name = 'vm-wrist-skin'; meshes.bridge = bridge; }
  parts.glove.visible = true; parts.bare.visible = false; rolled.visible = false;
  const arm = { side, root, wrist, upper, rig, layout: L, parts, meshes, bridge };
  // CL-334 h (Jerry, J128: "No fabric or material will clip through another"): the sleeve's end gives with the wrist. Its
  // last 18 mm and the cuff's band turn with the hand by up to SLEEVE_GIVE of the wrist's bend (eased up the sleeve), about
  // the wrist's joint, as a loose sleeve is pushed by the bent hand; a bend past half the wrist's range left the hand through
  // the sleeve's side (5 mm). q: the wrist group's turn (the hand on the forearm). The rest is read from whatever geometry
  // the mesh has when first bent (the WebGPU mirror's twin, game/vm-flip.js).
  const give = { q: [0, 0, 0, 1], rest: new Map() };
  arm.bendSleeve = (q) => {
    const g0 = give.q; if (Math.abs(q.x - g0[0]) + Math.abs(q.y - g0[1]) + Math.abs(q.z - g0[2]) + Math.abs(q.w - g0[3]) < 0.002) return;
    give.q = [q.x, q.y, q.z, q.w];
    const E = sleeveEnd(L), yA = -0.19, P = L.wrist, ang0 = 2 * Math.acos(Math.min(1, Math.abs(q.w))), sh = Math.sqrt(Math.max(0, 1 - q.w * q.w)), sg = q.w >= 0 ? 1 : -1;
    const k = sh > 1e-6 ? [sg * q.x / sh, sg * q.y / sh, sg * q.z / sh] : [1, 0, 0];
    for (const m of [meshes.fore, meshes.cuff]) {
      const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal;
      let R = give.rest.get(g);
      if (!R) {
        const idx = [], w = [], p0 = [], n0 = [];
        for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); if (y >= yA) continue; const t = Math.min(1, (yA - y) / (yA - E.y)); idx.push(i); w.push(SLEEVE_GIVE * t * t * (3 - 2 * t)); p0.push(pa.getX(i), y, pa.getZ(i)); n0.push(na ? na.getX(i) : 0, na ? na.getY(i) : 0, na ? na.getZ(i) : 0); }
        give.rest.set(g, R = { idx, w, p0, n0 });
      }
      for (let j = 0; j < R.idx.length; j++) {
        const a = ang0 * R.w[j], c = Math.cos(a), sn = Math.sin(a), t1 = 1 - c;
        const rot = (x, y, z) => { const d = k[0] * x + k[1] * y + k[2] * z; return [x * c + (k[1] * z - k[2] * y) * sn + k[0] * d * t1, y * c + (k[2] * x - k[0] * z) * sn + k[1] * d * t1, z * c + (k[0] * y - k[1] * x) * sn + k[2] * d * t1]; };
        const e = rot(R.p0[j * 3] - P[0], R.p0[j * 3 + 1] - P[1], R.p0[j * 3 + 2] - P[2]), nn = rot(R.n0[j * 3], R.n0[j * 3 + 1], R.n0[j * 3 + 2]);
        pa.setXYZ(R.idx[j], P[0] + e[0], P[1] + e[1], P[2] + e[2]); if (na) na.setXYZ(R.idx[j], nn[0], nn[1], nn[2]);
      }
      pa.needsUpdate = true; if (na) na.needsUpdate = true;
    }
  };
  // Swap materials (the camo and the glove change at the CIF): { uniform, skin, glove, pads }.
  arm.setMaterials = (m) => {
    if (m.uniform) { meshes.fore.material = m.uniform; meshes.cuff.material = m.uniform; if (meshes.roll) meshes.roll.material = m.uniform; if (meshes.upper) meshes.upper.material = m.uniform; }
    if (m.skin) { meshes.skinFore.material = m.skin; if (meshes.bare) meshes.bare.material = detailed(T, m.skin, 'skin'); if (bridge) bridge.material = m.skin; if (meshes.bareNails) meshes.bareNails.material = nails(m.skin); }
    if (m.glove && meshes.glove) meshes.glove.material = detailed(T, m.glove, 'glove');
    if (m.pads && meshes.glovePads) meshes.glovePads.material = m.pads;
  };
  return arm;
}
// The grip channel's middle and the palm's face in the wrist group's own space (before its scale), from a rig's pose.
export function wristSpacePoint(arm, name, out) {
  const L = arm.layout;
  if (name === 'grip') return out.set(L.grip[0] - L.wrist[0], L.grip[1] - L.wrist[1], L.grip[2] - L.wrist[2]);
  arm.rig.point(name, out);
  return out.set(out.x - L.wrist[0], out.y - L.wrist[1], out.z - L.wrist[2]);
}

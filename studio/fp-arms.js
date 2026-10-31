// studio/fp-arms.js - CL-281 (docs/specs/first-person-1.2.md §3): the first-person view's own forearms and hands.
// His lower arm as studio/marine-body.js builds it, from the elbow down, in the elbow's own space: the sleeve's forearm
// (its ring table) with the cuff, or the rolled sleeve's bare forearm and ChatGPT's wrist bridge, and GB-152's jointed
// hand (studio/marine-hand.js) in the glove and the bare hand, on a wrist that turns. Nothing here knows the camera:
// game/viewmodel.js places the wrist on the gun and points the forearm at an elbow below the view.
import { buildHandMeshes, makeHandRig, HAND_POSES } from './marine-hand.js';
import { loftRings } from './marine-cloth.js';
import { wristTransition } from '../ui/marine-kit-fit.js';

export const HAND_SCALE = 1.18;   // studio/marine-body.js GB-169
// The arm's layout for a side (+1 his right, -1 his left), as marine-body.js arm() has it.
export function armLayout(side) {
  const ox = side < 0 ? 0.02 : -0.01, oz = side < 0 ? 0.04 : 0.03, gz = side < 0 ? 0.08 : 0.07;
  return { side, ox, oz, gz, wrist: [ox, -0.214, (oz + gz) / 2], grip: [ox, -0.262, gz + 0.008] };
}
// marine-body.js's forearm rings [y, rx, rz, cx, cz], with a short run above the elbow so the sleeve leaves the view
// as a sleeve, not an open end.
function sleeveRings(L) {
  const { ox, oz } = L;
  return [[0.09, 0.058, 0.062, 0, 0], [0.04, 0.0575, 0.0615, 0, 0], [-0.025, 0.059, 0.062, ox * 0.15, oz * 0.1], [-0.05, 0.066, 0.07, ox * 0.35, oz * 0.3],
    [-0.105, 0.063, 0.069, ox * 0.8, oz * 0.7], [-0.135, 0.0575, 0.0615, ox * 0.92, oz * 0.86], [-0.165, 0.05, 0.052, ox, oz], [-0.2, 0.043, 0.038, ox, oz], [-0.226, 0.041, 0.034, ox, oz]];
}
function skinRings(L) {
  const { ox, oz } = L;
  return [[0.09, 0.05, 0.051, 0, 0], [0.03, 0.0505, 0.0515, ox * 0.05, oz * 0.04], [-0.03, 0.0505, 0.0515, ox * 0.05, oz * 0.04], [-0.065, 0.0555, 0.0555, ox * 0.3, oz * 0.25],
    [-0.105, 0.051, 0.0525, ox * 0.8, oz * 0.7], [-0.145, 0.0425, 0.0445, ox * 0.95, oz * 0.93], [-0.18, 0.037, 0.036, ox, oz]];
}
// [y, rx, rz, cx, cz] in the elbow's space as loftRings' rings, each gap halved once (marine-body.js subdiv).
// AG-168: seen from the eye the 3P sleeve's girth filled the bottom of the view; the view's sleeves are 85 % of it
// (the rolled sleeve's bare forearm keeps its size: ChatGPT's wrist bridge meets it).
const SLIM = 0.85;
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
function cuffRings(L) {
  const { ox, oz } = L, y = -0.211, h = 0.011, rx = 0.044 * SLIM, rz = 0.038 * SLIM;
  return [{ c: [ox, y + h, oz], ax: [1, 0, 0], az: [0, 0, 1], rx: rx * 0.93, rz: rz * 0.93, e: 0.6 },
    { c: [ox, y + h * 0.6, oz], ax: [1, 0, 0], az: [0, 0, 1], rx, rz, e: 0.6 },
    { c: [ox, y - h * 0.6, oz], ax: [1, 0, 0], az: [0, 0, 1], rx, rz, e: 0.6 },
    { c: [ox, y - h, oz], ax: [1, 0, 0], az: [0, 0, 1], rx: rx * 0.93, rz: rz * 0.93, e: 0.6 }];
}

// One side's arm. mats: { uniform, skin, glove, pads } (any may be swapped later: arm.setMaterials).
// Returns { root (the elbow), wrist, rig, layout, parts: { sleeve, rolled, glove, bare }, meshes: { ... } }.
export function buildViewArm(T, side, mats) {
  const L = armLayout(side);
  const root = new T.Group(); root.name = 'vm-arm-' + (side > 0 ? 'r' : 'l');
  const sleeve = new T.Group(); sleeve.name = 'vm-sleeve'; root.add(sleeve);
  const rolled = new T.Group(); rolled.name = 'vm-rolled'; root.add(rolled);
  const mesh = (geo, mat, name, parent) => { const m = new T.Mesh(geo, mat); m.name = name; m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); return m; };
  const fore = loftRings(T, toRings(sleeveRings(L), 0.72, SLIM), 30, { caps: 'first' });
  const meshes = {};
  meshes.fore = mesh(fore.geo, mats.uniform, 'vm-forearm', sleeve);
  meshes.cuff = mesh(loftRings(T, cuffRings(L), 30, { caps: 'both' }).geo, mats.uniform, 'vm-cuff', sleeve);
  meshes.skinFore = mesh(loftRings(T, toRings(skinRings(L), 0.88), 24, { caps: 'first' }).geo, mats.skin, 'vm-bare-forearm', rolled);
  const wrist = new T.Group(); wrist.name = 'vm-wrist'; wrist.position.set(L.wrist[0], L.wrist[1], L.wrist[2]); root.add(wrist);
  const builds = [], parts = { sleeve, rolled };
  for (const [key, mat, pads] of [['glove', mats.glove, mats.pads], ['bare', mats.skin, null]]) {
    const h = new T.Group(); h.name = 'vm-hand-' + key; h.position.set(-L.wrist[0], -L.wrist[1], -L.wrist[2]); wrist.add(h);
    const b = buildHandMeshes({ T, s: side, ox: L.ox, gz: L.gz, mat, padMat: pads || null });
    for (const k of ['main', 'pads']) { const m = b.meshes[k]; if (!m) continue; m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; m.name = 'vm-hand-' + key + '-' + k; h.add(m); meshes[key + (k === 'main' ? '' : 'Pads')] = m; }
    builds.push(b); parts[key] = h;
  }
  const rig = makeHandRig(side, builds, HAND_POSES.relaxed);
  wrist.userData.hand = rig; wrist.userData.handRoot = true;
  wrist.scale.setScalar(HAND_SCALE);
  let bridge = null;
  try { bridge = wristTransition(T, rolled, wrist, mats.skin, { ox: L.ox, oz: L.oz, gz: L.gz, scale: HAND_SCALE }); } catch (_) { bridge = null; }
  if (bridge) { bridge.castShadow = false; bridge.receiveShadow = true; bridge.name = 'vm-wrist-skin'; meshes.bridge = bridge; }
  parts.glove.visible = true; parts.bare.visible = false; rolled.visible = false;
  const arm = { side, root, wrist, rig, layout: L, parts, meshes, bridge };
  // Swap materials (the camo and the glove change at the CIF): { uniform, skin, glove, pads }.
  arm.setMaterials = (m) => {
    if (m.uniform) { meshes.fore.material = m.uniform; meshes.cuff.material = m.uniform; }
    if (m.skin) { meshes.skinFore.material = m.skin; if (meshes.bare) meshes.bare.material = m.skin; if (bridge) bridge.material = m.skin; }
    if (m.glove && meshes.glove) meshes.glove.material = m.glove;
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

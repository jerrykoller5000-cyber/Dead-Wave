// world/cave-guardian.js — the thing that lives in the caves. Claude's (world/*).
//
// A built rig, not a re-dressed zombie: a pale, long-armed crawler that runs on all fours,
// rears up to take a leg, and hauls its catch back into the dark. Everything here is
// primitives (rbox, cones, spheres) in the game's beveled-box style, coloured from the cave
// it lives in, so the chalk cave's thing is chalk and the wet cave's is slick and green.
//
// Two halves: makeCaveGuardianRig builds the body and hands back a Group whose userData.rig
// names every joint; the pose functions below drive those joints for each beat of the
// scripted scenes (the chase, the grab, the drag, the walk-out and the throw). Arms are
// placed by a two-bone IK (ikLimb) so a hand really lands on the ground or on an ankle;
// the rest is cycles and eases.
//
// Rig conventions: every limb hangs along its joint's -Y at rest and bends about +X (a
// positive elbow.rotation.x folds the forearm toward -Z, i.e. behind the body); +Z is the
// creature's forward. Joint groups (not meshes) are what the pose code moves, so the
// existing rigDamp smoothing in index.html can ease them frame to frame.
import * as THREE from 'three';
import { rbox } from '../core/geometry.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _T = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion();

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const ease = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };

// Colour helpers. three works in linear space, where a mid-brown is a small number, so
// brightening is a multiply (keeps the hue) rather than a lerp toward white (which lands on
// neutral grey and throws the cave's theme away).
function lit(c, k, add = 0) {
  const o = c.clone().multiplyScalar(k).addScalar(add);
  o.r = Math.min(1, o.r); o.g = Math.min(1, o.g); o.b = Math.min(1, o.b);
  return o;
}

// === The body ==========================================================================
export function makeCaveGuardianRig(design) {
  const d = design || {};
  const rock = new THREE.Color(d.rock != null ? d.rock : 0x5a5650);
  const dark = new THREE.Color(d.dark != null ? d.dark : 0x1c1a17);
  const moss = new THREE.Color(d.moss != null ? d.moss : 0x2e4a22);
  const eyeTint = d.eyeTint != null ? d.eyeTint : 0xbdf3ff;
  const pale = lit(rock, 4.4, 0.14);           // skin: the cave's own stone, gone pale in the dark
  const under = dark.clone().lerp(pale, 0.3);   // belly, joints, the inside of the arms
  const crease = dark.clone().lerp(pale, 0.12); // sinew and the hollows
  const M = {
    skin: new THREE.MeshStandardMaterial({ color: pale, roughness: 0.86, metalness: 0.02 }),
    under: new THREE.MeshStandardMaterial({ color: under, roughness: 0.9 }),
    crease: new THREE.MeshStandardMaterial({ color: crease, roughness: 0.95 }),
    claw: new THREE.MeshStandardMaterial({ color: dark.clone().lerp(pale, 0.12), roughness: 0.45, metalness: 0.2 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xe6dfcc, roughness: 0.8 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x2a0508, roughness: 1 }),
    tongue: new THREE.MeshStandardMaterial({ color: 0x4a1218, roughness: 0.7 }),
    eye: new THREE.MeshStandardMaterial({ color: eyeTint, emissive: eyeTint, emissiveIntensity: 2.6, roughness: 0.3 }),
    crust: new THREE.MeshStandardMaterial({ color: rock, roughness: 0.97 }),
    moss: new THREE.MeshStandardMaterial({ color: lit(moss, 1.4), roughness: 1, side: THREE.DoubleSide })
  };
  const g = new THREE.Group();
  g.userData.mats = Object.values(M);
  const rig = { joints: [], hands: [], claws: [] };
  g.userData.rig = rig;

  const part = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const joint = (parent, name, x, y, z) => {
    const j = new THREE.Group();
    j.position.set(x, y, z);
    j.name = name;
    parent.add(j);
    rig[name] = j;
    rig.joints.push(j);
    return j;
  };

  // --- Pelvis and spine. The root sits on the ground between the hind feet. -----------
  const pelvis = joint(g, 'pelvis', 0, 1.02, 0);
  part(pelvis, rbox(0.62, 0.42, 0.5, 0.08), M.skin, 0, 0, 0);
  part(pelvis, rbox(0.5, 0.3, 0.42, 0.06), M.under, 0, -0.12, 0.04);
  // Three vertebrae rise and lean forward to the chest; each carries a bony spike.
  const spine1 = joint(pelvis, 'spine1', 0, 0.16, 0.22);
  part(spine1, rbox(0.5, 0.34, 0.4, 0.07), M.skin, 0, 0.02, 0.06);
  const spine2 = joint(spine1, 'spine2', 0, 0.12, 0.32);
  part(spine2, rbox(0.58, 0.4, 0.44, 0.07), M.skin, 0, 0.04, 0.08);
  const chest = joint(spine2, 'chest', 0, 0.1, 0.34);
  // The ribcage: deep and wide, with the shoulder girdle sitting on top of it.
  part(chest, rbox(0.92, 0.66, 0.78, 0.1), M.skin, 0, 0.02, 0.22);
  part(chest, rbox(0.7, 0.4, 0.62, 0.08), M.under, 0, -0.26, 0.24);
  part(chest, rbox(1.36, 0.36, 0.46, 0.09), M.skin, 0, 0.22, 0.28);        // the girdle
  // Ribs showing through the skin on the flanks.
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
    part(chest, rbox(0.06, 0.34 - i * 0.03, 0.05, 0.02), M.crease, sx * 0.47, -0.02 - i * 0.02, 0.02 + i * 0.16, 0, 0, sx * 0.15);
  }
  // A ridge of bone spikes down the back, biggest over the shoulders.
  const spikeAt = (parent, y, z, h, lean) => part(parent, new THREE.ConeGeometry(0.07, h, 5), M.bone, 0, y + h * 0.4, z, -lean, 0, 0);
  spikeAt(pelvis, 0.2, -0.1, 0.28, 0.5); spikeAt(pelvis, 0.18, 0.08, 0.32, 0.4);
  spikeAt(spine1, 0.18, 0.02, 0.36, 0.35); spikeAt(spine1, 0.2, 0.16, 0.4, 0.3);
  spikeAt(spine2, 0.22, 0.02, 0.44, 0.25); spikeAt(spine2, 0.24, 0.2, 0.46, 0.2);
  spikeAt(chest, 0.38, 0.06, 0.5, 0.15); spikeAt(chest, 0.4, 0.28, 0.46, 0.1);
  // Cave crust grown over the shoulders and the back, and weed hanging off it.
  for (let i = 0; i < 5; i++) {
    const p = part(chest, new THREE.DodecahedronGeometry(0.12 + (i % 3) * 0.05, 0), M.crust,
      (i - 2) * 0.28, 0.36 + (i % 2) * 0.06, 0.2 + ((i * 7) % 3) * 0.1, i * 0.7, i * 1.3, i * 0.4);
    p.scale.set(1.3, 0.55, 1.1);
  }
  for (let i = 0; i < 6; i++) {
    const s = part(chest, new THREE.BoxGeometry(0.05, 0.36 + (i % 3) * 0.14, 0.008), M.moss,
      (i - 2.5) * 0.22, -0.02 - (i % 2) * 0.1, -0.2, 0.25, 0, (i % 2 ? 1 : -1) * 0.2);
    s.castShadow = false;
  }

  // --- Neck and head. --------------------------------------------------------------------
  const neck = joint(chest, 'neck', 0, 0.2, 0.58);
  part(neck, rbox(0.36, 0.3, 0.5, 0.07), M.skin, 0, 0.02, 0.2);
  part(neck, rbox(0.26, 0.2, 0.44, 0.05), M.under, 0, -0.1, 0.22);
  const head = joint(neck, 'head', 0, 0.04, 0.44);
  // A long low skull: a heavy brow, a snout that is mostly mouth, cheekbones standing out.
  // No ears, no nose — it has not needed them.
  part(head, rbox(0.5, 0.3, 0.46, 0.08), M.skin, 0, 0.08, 0.08);           // cranium
  part(head, rbox(0.44, 0.24, 0.72, 0.07), M.skin, 0, 0.0, 0.5);           // snout
  part(head, rbox(0.7, 0.15, 0.32, 0.05), M.skin, 0, 0.2, 0.26);           // the brow ridge
  part(head, rbox(0.3, 0.08, 0.5, 0.03), M.crease, 0, 0.13, 0.5);          // a furrow down the snout
  for (const sx of [-1, 1]) part(head, rbox(0.14, 0.2, 0.34, 0.04), M.crease, sx * 0.28, -0.02, 0.32);   // cheekbones
  // The upper teeth, hanging off the snout's edge: two fangs at the corners, a row between.
  for (let i = 0; i < 9; i++) {
    const big = i === 0 || i === 8;
    part(head, new THREE.ConeGeometry(big ? 0.04 : 0.026, big ? 0.24 : 0.12, 4), M.bone, (i - 4) * 0.05, -0.12 - (big ? 0.07 : 0.01), 0.84 - Math.abs(i - 4) * 0.012, Math.PI, 0, 0);
  }
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) part(head, new THREE.ConeGeometry(0.026, 0.13, 4), M.bone, sx * 0.21, -0.12, 0.68 - k * 0.11, Math.PI, 0, 0);
  // Eyes: two big and four small, clustered on the brow like something that grew up blind
  // and then grew eyes to see prey by its own light.
  const eyes = [];
  const eye = (x, y, z, r) => { const e = part(head, new THREE.SphereGeometry(r, 10, 8), M.eye, x, y, z); e.castShadow = false; eyes.push(e); return e; };
  for (const sx of [-1, 1]) {
    eye(sx * 0.17, 0.12, 0.42, 0.07);
    eye(sx * 0.3, 0.19, 0.34, 0.036);
    eye(sx * 0.08, 0.24, 0.4, 0.03);
  }
  rig.eyes = eyes;
  // The jaw: hinged at the back of the skull, long enough to swallow a boot whole.
  const jaw = joint(head, 'jaw', 0, -0.1, 0.06);
  part(jaw, rbox(0.42, 0.13, 0.8, 0.05), M.skin, 0, -0.08, 0.42);
  part(jaw, rbox(0.32, 0.06, 0.66, 0.02), M.mouth, 0, -0.005, 0.44);      // the floor of the mouth
  part(jaw, rbox(0.14, 0.05, 0.4, 0.02), M.tongue, 0, 0.02, 0.36);
  for (let i = 0; i < 9; i++) {
    const big = i === 0 || i === 8;
    part(jaw, new THREE.ConeGeometry(big ? 0.036 : 0.024, big ? 0.2 : 0.1, 4), M.bone, (i - 4) * 0.046, 0.04 + (big ? 0.05 : 0), 0.8 - Math.abs(i - 4) * 0.012);
  }
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) part(jaw, new THREE.ConeGeometry(0.024, 0.11, 4), M.bone, sx * 0.19, 0.03, 0.64 - k * 0.11);
  // The roof of the mouth, so the open jaw shows dark, not the underside of the skull.
  part(head, rbox(0.38, 0.05, 0.7, 0.02), M.mouth, 0, -0.1, 0.5);

  // --- Arms: the reason it is what it is. ---------------------------------------------
  const ARM = { upper: 1.08, fore: 1.16, hand: 0.3 };
  rig.arm = ARM;
  for (const side of [-1, 1]) {
    const S = side < 0 ? 'L' : 'R';
    const sh = joint(chest, 'shoulder' + S, side * 0.66, 0.16, 0.3);
    part(sh, new THREE.SphereGeometry(0.2, 10, 8), M.skin, 0, 0, 0);                        // the ball of the joint
    part(sh, rbox(0.3, ARM.upper, 0.28, 0.07), M.skin, 0, -ARM.upper * 0.5, 0);
    part(sh, rbox(0.18, ARM.upper * 0.7, 0.1, 0.03), M.under, side * 0.02, -ARM.upper * 0.5, 0.12);
    const el = joint(sh, 'elbow' + S, 0, -ARM.upper, 0);
    part(el, new THREE.SphereGeometry(0.16, 10, 8), M.crease, 0, 0, 0);
    part(el, rbox(0.24, ARM.fore, 0.22, 0.06), M.skin, 0, -ARM.fore * 0.5, 0);
    part(el, rbox(0.14, ARM.fore * 0.8, 0.08, 0.03), M.under, 0, -ARM.fore * 0.5, 0.09);
    // Weed and crust on the forearm, dripping.
    for (let i = 0; i < 3; i++) {
      const s = part(el, new THREE.BoxGeometry(0.03, 0.22 + i * 0.08, 0.008), M.moss, (i - 1) * 0.07, -ARM.fore * 0.8 - 0.06, -0.1, -0.3, 0, (i - 1) * 0.3);
      s.castShadow = false;
    }
    const wr = joint(el, 'wrist' + S, 0, -ARM.fore, 0);
    // The hand: a broad palm and four fingers as long as a man's forearm, plus a thumb.
    // It knuckle-walks on the backs of these and takes an ankle with them.
    part(wr, rbox(0.34, 0.12, 0.3, 0.04), M.skin, 0, -0.04, 0.06);
    const hand = joint(wr, 'hand' + S, 0, -0.08, 0.18);
    rig.hands.push(hand);
    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const fin = new THREE.Group();
      fin.position.set((f - 1.5) * 0.085, 0, 0);
      fin.rotation.x = 0;                                     // fingers extend along +Z
      hand.add(fin);
      const len = 0.34 + (f === 1 || f === 2 ? 0.06 : 0);
      part(fin, rbox(0.06, 0.06, len * 0.55, 0.02), M.skin, 0, 0, len * 0.28);
      const tip = new THREE.Group(); tip.position.set(0, 0, len * 0.55); fin.add(tip);
      part(tip, rbox(0.05, 0.05, len * 0.35, 0.015), M.under, 0, 0, len * 0.17);
      const claw = part(tip, new THREE.ConeGeometry(0.03, 0.17, 5), M.claw, 0, -0.01, len * 0.35 + 0.06, Math.PI / 2 + 0.35, 0, 0);
      claw.castShadow = false;
      fin.userData.tip = tip;
      fingers.push(fin);
      rig.claws.push(fin);
    }
    const thumb = new THREE.Group();
    thumb.position.set(side * 0.19, 0, -0.06);
    thumb.rotation.set(0, side * 0.9, 0);
    hand.add(thumb);
    part(thumb, rbox(0.06, 0.06, 0.16, 0.02), M.skin, 0, 0, 0.08);
    const ttip = new THREE.Group(); ttip.position.set(0, 0, 0.16); thumb.add(ttip);
    part(ttip, new THREE.ConeGeometry(0.03, 0.14, 5), M.claw, 0, -0.01, 0.06, Math.PI / 2 + 0.3, 0, 0);
    thumb.userData.tip = ttip;
    rig['thumb' + S] = thumb;
    rig['fingers' + S] = fingers;
    rig.joints.push(thumb);
  }

  // --- Legs: shorter, digitigrate, built to push. ---------------------------------------
  const LEG = { thigh: 0.74, shin: 0.66, foot: 0.3 };
  rig.leg = LEG;
  for (const side of [-1, 1]) {
    const S = side < 0 ? 'L' : 'R';
    const hip = joint(pelvis, 'hip' + S, side * 0.3, -0.08, -0.02);
    part(hip, new THREE.SphereGeometry(0.18, 10, 8), M.skin, 0, 0, 0);
    part(hip, rbox(0.3, LEG.thigh, 0.34, 0.07), M.skin, 0, -LEG.thigh * 0.5, 0.02);
    part(hip, rbox(0.18, LEG.thigh * 0.7, 0.1, 0.03), M.under, 0, -LEG.thigh * 0.5, 0.15);
    const knee = joint(hip, 'knee' + S, 0, -LEG.thigh, 0);
    part(knee, new THREE.SphereGeometry(0.14, 10, 8), M.crease, 0, 0, 0);
    part(knee, rbox(0.22, LEG.shin, 0.24, 0.05), M.skin, 0, -LEG.shin * 0.5, 0);
    const ankle = joint(knee, 'ankle' + S, 0, -LEG.shin, 0);
    // A long foot standing on its toes, three claws forward and a dew claw behind.
    part(ankle, rbox(0.26, 0.12, 0.44, 0.04), M.skin, 0, -0.06, 0.14);
    for (let t = 0; t < 3; t++) part(ankle, new THREE.ConeGeometry(0.035, 0.18, 5), M.claw, (t - 1) * 0.09, -0.08, 0.4, Math.PI / 2 + 0.4, 0, 0);
    part(ankle, new THREE.ConeGeometry(0.03, 0.12, 5), M.claw, 0, -0.02, -0.1, -Math.PI / 2 - 0.5, 0, 0);
  }

  // Everything above was placed in a "standing" rest; the pose functions put it on all
  // fours. Shadows on, no receive (it moves too fast for a static lightmap to matter).
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  rig.eyeMat = M.eye;
  // What index.html's damping walks: every joint group.
  return g;
}

// === Two-bone IK ========================================================================
// Places a hanging limb (joint 'a' = shoulder or hip, its child 'b' = elbow or knee, lengths
// L1 and L2) so the end of the second bone lands on `target` (world). `pole` is a world
// direction the middle joint is pushed toward (an elbow points back and out, a knee forward).
// Works in world space and converts, so it does not care how the parent chain is posed.
export function ikLimb(a, b, L1, L2, target, pole, weight = 1) {
  a.updateWorldMatrix(true, false);
  _S.setFromMatrixPosition(a.matrixWorld);
  _T.copy(target).sub(_S);
  // The rig may be scaled as a whole; bone lengths are rig units, the target is metres.
  const sc = _v2.setFromMatrixColumn(a.matrixWorld, 1).length() || 1;
  _T.divideScalar(sc);
  const reach = L1 + L2;
  let d = _T.length();
  if (d < 1e-4) { _T.set(0, -1, 0); d = 1; }
  const dHat = _v1.copy(_T).divideScalar(d);
  d = Math.max(Math.abs(L1 - L2) + 0.02, Math.min(reach - 0.01, d));
  // Interior angles from the law of cosines.
  const cosA1 = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const a1 = Math.acos(cosA1);
  const cosA2 = Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)));
  const bend = Math.PI - Math.acos(cosA2);
  // The bend plane: the middle joint goes toward the pole, projected off the reach line.
  const pp = _v2.copy(pole);
  pp.addScaledVector(dHat, -pp.dot(dHat));
  if (pp.lengthSq() < 1e-6) { pp.set(0, 0, -1).addScaledVector(dHat, -dHat.z); if (pp.lengthSq() < 1e-6) pp.set(1, 0, 0); }
  pp.normalize();
  const u = _v3.copy(dHat).multiplyScalar(Math.cos(a1)).addScaledVector(pp, Math.sin(a1)).normalize();   // upper bone, world
  _E.copy(u).multiplyScalar(L1);                                                                          // elbow, relative to S (rig units)
  const v = _v4.copy(_T).sub(_E).normalize();                                                             // lower bone, world
  // Bend axis: the rotation that takes u to v (about local +X in the child).
  const ax = _v2.crossVectors(u, v);
  if (ax.lengthSq() < 1e-8) ax.copy(pp).cross(u);
  ax.normalize();
  // World orientation for joint a: local X = bend axis, local -Y = upper bone.
  const y = _v1.copy(u).negate();
  const z = _T.crossVectors(ax, y).normalize();
  _m.makeBasis(ax, y, z);
  _q.setFromRotationMatrix(_m);
  // Into the parent's frame.
  a.parent.updateWorldMatrix(true, false);
  _qp.setFromRotationMatrix(a.parent.matrixWorld).invert();
  _q.premultiply(_qp);
  if (weight >= 1) a.quaternion.copy(_q); else a.quaternion.slerp(_q, weight);
  const bx = bend;
  if (weight >= 1) b.rotation.set(bx, 0, 0);
  else { b.rotation.x += (bx - b.rotation.x) * weight; b.rotation.y *= (1 - weight); b.rotation.z *= (1 - weight); }
  return bend;
}

// Where a joint is, in the world.
export function jointWorld(j, out) {
  j.updateWorldMatrix(true, false);
  return (out || new THREE.Vector3()).setFromMatrixPosition(j.matrixWorld);
}

// === Poses ==============================================================================
// Shared body shapes. `crouch` 0 is the tall walking crawler; 1 is flat to the ground.
// `rear` 0 is on all fours; 1 is up on its hind legs with its arms free.
const _root = new THREE.Vector3(), _tgt = new THREE.Vector3(), _pole = new THREE.Vector3();
function bodyShape(g, R, { rear = 0, crouch = 0, arch = 0, lean = 0, twist = 0 }) {
  // Pelvis height and pitch. On all fours the spine climbs forward to the shoulders; reared
  // up it stands almost straight.
  // A negative pitch stands the spine up (its joints are offset along +Z, so at 0 it runs
  // flat along the ground): -0.5 is the crawler's climb to the shoulders, -1.25 is upright.
  R.pelvis.position.y = 1.02 - crouch * 0.42 + rear * 0.3;
  R.pelvis.rotation.set(-(0.5 + 0.75 * rear) + crouch * 0.2 + lean, twist, 0);
  R.spine1.rotation.set(-0.16 * (1 - rear) - arch * 0.25, twist * 0.5, 0);
  R.spine2.rotation.set(-0.14 * (1 - rear) - arch * 0.3, twist * 0.5, 0);
  R.chest.rotation.set(-0.1 * (1 - rear) - arch * 0.2 + rear * 0.2, 0, 0);
  // The neck comes up out of the chest to level the head.
  R.neck.rotation.set(0.62 + 0.55 * rear + arch * 0.4, 0, 0);
}
// Turn the ankle so the foot lies flat on the root's ground, whatever the leg is doing.
function levelFoot(g, R, S) {
  const ankle = R['ankle' + S];
  ankle.rotation.set(0, 0, 0);
  ankle.updateWorldMatrix(true, false);
  // Foot's forward (+Z of the ankle) should be level: measure how far the ankle's +Z tips.
  _v1.set(0, 0, 1).transformDirection(ankle.matrixWorld);
  _v2.set(0, 1, 0).transformDirection(g.matrixWorld);
  const tip = Math.asin(Math.max(-1, Math.min(1, _v1.dot(_v2))));
  ankle.rotation.x = tip - 0.15;
}
// The hand: fingers straight (0), knuckled under for walking (1), or closed on something (2).
export function guardianGrip(R, S, amt, mode = 'walk') {
  for (const fin of R['fingers' + S]) {
    if (mode === 'walk') { fin.rotation.x = -1.35 * amt; fin.userData.tip.rotation.x = -1.5 * amt; }
    else { fin.rotation.x = 0.55 * amt; fin.userData.tip.rotation.x = 1.25 * amt; }
  }
  const th = R['thumb' + S];
  if (mode === 'walk') { th.rotation.x = -0.6 * amt; th.userData.tip.rotation.x = -0.9 * amt; }
  else { th.rotation.x = 0.7 * amt; th.userData.tip.rotation.x = 1.0 * amt; }
}
// Put a hand's palm on `target` (world), knuckles down. `pole` is where the elbow goes.
export function guardianHandTo(g, R, S, target, pole, weight = 1) {
  const a = R['shoulder' + S], b = R['elbow' + S];
  ikLimb(a, b, R.arm.upper, R.arm.fore, target, pole, weight);
}
// The wrist follows the ground (or the thing held): flatten the hand to the root's floor.
function levelHand(g, R, S, amt = 1) {
  const wr = R['wrist' + S];
  wr.rotation.set(0, 0, 0);
  wr.updateWorldMatrix(true, false);
  _v1.set(0, 0, 1).transformDirection(wr.matrixWorld);
  _v2.set(0, 1, 0).transformDirection(g.matrixWorld);
  const tip = Math.asin(Math.max(-1, Math.min(1, _v1.dot(_v2))));
  wr.rotation.x = (tip - 0.1) * amt;
}
// Head and jaw. `look` is a world point (or null to hold straight); `open` 0..1.
export function guardianHead(g, R, look, open, snarl = 0) {
  if (look) {
    R.neck.updateWorldMatrix(true, false);
    _S.setFromMatrixPosition(R.neck.matrixWorld);
    _T.copy(look).sub(_S);
    // Express in the neck's parent frame and split into yaw (about Y) and pitch (about X).
    R.neck.parent.updateWorldMatrix(true, false);
    _qp.setFromRotationMatrix(R.neck.parent.matrixWorld).invert();
    _T.applyQuaternion(_qp).normalize();
    const yaw = Math.atan2(_T.x, _T.z);
    const pitch = -Math.atan2(_T.y, Math.hypot(_T.x, _T.z));
    R.neck.rotation.y = Math.max(-1.2, Math.min(1.2, yaw)) * 0.55;
    R.head.rotation.y = Math.max(-1.2, Math.min(1.2, yaw)) * 0.45;
    R.neck.rotation.x = Math.max(-0.9, Math.min(1.1, pitch)) * 0.5 + R.neck.rotation.x * 0.5;
    R.head.rotation.x = Math.max(-0.9, Math.min(1.1, pitch)) * 0.5;
  } else {
    R.head.rotation.set(0, 0, 0); R.neck.rotation.y = 0;
  }
  R.jaw.rotation.x = 0.12 + open * 0.95;
  R.head.rotation.z = snarl * 0.12;
}

// --- The gallop: a flat-out bound on all fours. ph is the stride phase (radians, from the
// distance run), run 0..1 blends from standing to flat out, t is time for the extras.
// One stride: the hands reach out and land together (ph 0), the body is hauled over them
// while the hind legs gather under it (ph pi/2), the hands leave behind as the feet plant
// ahead (ph pi), and the legs drive it into the air while the arms swing forward (3pi/2).
export function guardianGallop(g, R, ph, run, t, look) {
  const s = Math.sin(ph), c = Math.cos(ph);
  const r = ease(run);
  // Body: low and long. Nose down as the hands land, up on the push; the spine flexes as
  // the legs gather and stretches out at full reach; it rides up and down with the bound.
  // Kept a little tall (shoulders over hips), not flat: the play camera looks down on it, and
  // a flat body reads as lying down from up there.
  bodyShape(g, R, { rear: 0, crouch: 0.16 * r, arch: 0.3 * Math.sin(ph + 0.5) * r, lean: (0.04 + 0.14 * c) * r });
  R.pelvis.position.y += (0.16 * -s + 0.1) * r;
  R.pelvis.rotation.z = 0.05 * Math.sin(ph * 0.5) * r;
  g.updateWorldMatrix(true, false);
  // Forelimbs. Root space, then world.
  for (const S of ['L', 'R']) {
    const side = S === 'L' ? -1 : 1;
    const lag = side < 0 ? 0 : 0.3;                    // the second hand lands a beat later
    const p = ph - lag;
    const sw = Math.sin(p), cw = Math.cos(p);
    const air = Math.max(0, -sw);                      // swinging forward through the air
    const z = (1.0 + 1.15 * cw) * r + 1.05 * (1 - r);
    const y = air * 0.95 * r;
    const x = side * (0.66 + 0.08 * r);
    _tgt.set(x, y, z).applyMatrix4(g.matrixWorld);
    _pole.set(side * 0.7, 0.35, -1).transformDirection(g.matrixWorld);   // elbows back and out
    guardianHandTo(g, R, S, _tgt, _pole);
    levelHand(g, R, S, 1 - air);
    R['wrist' + S].rotation.x += air * -0.6;
    guardianGrip(R, S, 0.35 + 0.65 * (1 - air), 'walk');
  }
  // Hind legs: plant as the hands leave, drive together, then trail out behind.
  for (const S of ['L', 'R']) {
    const side = S === 'L' ? -1 : 1;
    const lag = side < 0 ? 0.2 : 0;
    const p = ph + Math.PI - 0.35 - lag;
    const sw = Math.sin(p), cw = Math.cos(p);
    const air = Math.max(0, -sw);
    const z = (-0.15 + 1.0 * cw) * r - 0.25 * (1 - r);
    const y = air * 0.65 * r;
    _tgt.set(side * 0.34, y, z).applyMatrix4(g.matrixWorld);
    _pole.set(0, 0.2, 1).transformDirection(g.matrixWorld);   // knees forward
    ikLimb(R['hip' + S], R['knee' + S], R.leg.thigh, R.leg.shin, _tgt, _pole);
    levelFoot(g, R, S);
    R['ankle' + S].rotation.x += air * 0.7;
  }
  guardianHead(g, R, look, 0.55 + 0.35 * Math.abs(Math.sin(t * 9)), 0.4);
  R.head.rotation.x += 0.08 * s * r;
}

// --- Standing on all fours, breathing, looking at something. -----------------------------
export function guardianStand(g, R, t, look, { open = 0.3, crouch = 0 } = {}) {
  bodyShape(g, R, { rear: 0, crouch, arch: 0.04 * Math.sin(t * 1.7) });
  g.updateWorldMatrix(true, false);
  for (const S of ['L', 'R']) {
    const side = S === 'L' ? -1 : 1;
    _tgt.set(side * 0.7, 0, 1.05).applyMatrix4(g.matrixWorld);
    _pole.set(side * 0.6, 0.3, -1).transformDirection(g.matrixWorld);
    guardianHandTo(g, R, S, _tgt, _pole);
    levelHand(g, R, S);
    guardianGrip(R, S, 1, 'walk');
  }
  for (const S of ['L', 'R']) {
    const side = S === 'L' ? -1 : 1;
    _tgt.set(side * 0.34, 0, -0.25).applyMatrix4(g.matrixWorld);
    _pole.set(0, 0.2, 1).transformDirection(g.matrixWorld);
    ikLimb(R['hip' + S], R['knee' + S], R.leg.thigh, R.leg.shin, _tgt, _pole);
    levelFoot(g, R, S);
  }
  guardianHead(g, R, look, open + 0.06 * Math.sin(t * 3), 0);
}

// --- Rearing up to grab: the hind legs take the weight, the body comes up, one arm shoots
// out to `ankle` (world). `reach` 0..1 is how far into the lunge; `hold` 0..1 closes the
// hand. The free arm stays planted (or braces).
export function guardianRearGrab(g, R, t, S, ankle, reach, hold, look) {
  const rr = ease(reach);
  bodyShape(g, R, { rear: 0.55 * rr, crouch: 0.1 * (1 - rr), arch: -0.15 * rr, lean: 0.2 * rr });
  g.updateWorldMatrix(true, false);
  const free = S === 'L' ? 'R' : 'L';
  // The grabbing arm goes to the ankle. Elbow out to the side and up.
  const side = S === 'L' ? -1 : 1;
  _pole.set(side * 1, 0.6, -0.2).transformDirection(g.matrixWorld);
  // Before the reach it is planted like the other one.
  _v3.set(side * 0.7, 0, 1.0).applyMatrix4(g.matrixWorld);
  _tgt.copy(_v3).lerp(ankle, rr);
  guardianHandTo(g, R, S, _tgt, _pole);
  R['wrist' + S].rotation.set(-0.4 * rr, 0, 0);
  guardianGrip(R, S, hold, 'grab');
  if (rr < 1) { guardianGrip(R, S, Math.max(hold, (1 - rr) * 0.8), hold > 0.5 ? 'grab' : 'walk'); }
  // The free arm braces on the ground, wide.
  const fs = -side;
  _tgt.set(fs * 0.85, 0, 0.9 - 0.3 * rr).applyMatrix4(g.matrixWorld);
  _pole.set(fs * 0.7, 0.3, -1).transformDirection(g.matrixWorld);
  guardianHandTo(g, R, free, _tgt, _pole);
  levelHand(g, R, free);
  guardianGrip(R, free, 1, 'walk');
  // Legs planted wide, knees bent.
  for (const L of ['L', 'R']) {
    const ls = L === 'L' ? -1 : 1;
    _tgt.set(ls * 0.42, 0, -0.3 + 0.2 * rr).applyMatrix4(g.matrixWorld);
    _pole.set(0, 0.2, 1).transformDirection(g.matrixWorld);
    ikLimb(R['hip' + L], R['knee' + L], R.leg.thigh, R.leg.shin, _tgt, _pole);
    levelFoot(g, R, L);
  }
  guardianHead(g, R, look, 0.85 * rr + 0.2, 0.6 * rr);
}

// --- The drag: it goes for the mouth on three limbs, the fourth arm trailing behind holding
// the leg (`ankle`, world). ph is the stride phase, `heave` 0..1 how hard it is pulling.
export function guardianDragWalk(g, R, t, S, ankle, ph, heave, look) {
  const s = Math.sin(ph), c = Math.cos(ph);
  bodyShape(g, R, { rear: 0, crouch: 0.4, arch: 0.15 * s, lean: 0.3 * heave, twist: (S === 'L' ? 0.2 : -0.2) * heave });
  R.pelvis.position.y += 0.06 * Math.abs(c);
  g.updateWorldMatrix(true, false);
  const side = S === 'L' ? -1 : 1;
  // The holding arm: back and low to the ankle, elbow pointing up.
  _pole.set(side * 0.5, 1, 0).transformDirection(g.matrixWorld);
  guardianHandTo(g, R, S, ankle, _pole);
  R['wrist' + S].rotation.set(0.3, 0, side * 0.3);
  guardianGrip(R, S, 1, 'grab');
  // The other arm walks: a knuckle step in front.
  const free = S === 'L' ? 'R' : 'L', fs = -side;
  const swing = Math.max(0, s);
  _tgt.set(fs * 0.7, swing * 0.5, 1.1 + 0.7 * c).applyMatrix4(g.matrixWorld);
  _pole.set(fs * 0.7, 0.35, -1).transformDirection(g.matrixWorld);
  guardianHandTo(g, R, free, _tgt, _pole);
  levelHand(g, R, free, 1 - swing);
  guardianGrip(R, free, 1, 'walk');
  // The legs stride, opposite to the free hand.
  for (const L of ['L', 'R']) {
    const ls = L === 'L' ? -1 : 1;
    const p = ph + Math.PI * (L === free ? 1 : 0.5);
    const sw = Math.sin(p), cw = Math.cos(p);
    const lift = Math.max(0, sw);
    _tgt.set(ls * 0.36, lift * 0.35, -0.3 + 0.55 * cw).applyMatrix4(g.matrixWorld);
    _pole.set(0, 0.2, 1).transformDirection(g.matrixWorld);
    ikLimb(R['hip' + L], R['knee' + L], R.leg.thigh, R.leg.shin, _tgt, _pole);
    levelFoot(g, R, L);
    R['ankle' + L].rotation.x += lift * 0.5;
  }
  guardianHead(g, R, look, 0.35 + 0.3 * Math.abs(Math.sin(t * 4)), 0.5);
}

// --- Up on its hind legs holding what is left in both hands. `wind` 0..1 hauls the arms
// back over its head; `toss` 0..1 whips them through. `carry` is where the hands meet
// (world) while holding.
export function guardianCarryThrow(g, R, t, carry, wind, toss, look) {
  const w = ease(wind), k = ease(toss);
  bodyShape(g, R, { rear: 1, crouch: 0.1, arch: -0.25 * w + 0.35 * k, lean: -0.25 * w + 0.5 * k });
  g.updateWorldMatrix(true, false);
  for (const S of ['L', 'R']) {
    const side = S === 'L' ? -1 : 1;
    // Holding: hands together low in front. Wind: up and back over the shoulders. Toss: out
    // in front, arms straight.
    _v3.copy(carry);
    _v1.set(side * 0.35, 3.3, -0.9).applyMatrix4(g.matrixWorld);          // over the head
    _v2.set(side * 0.55, 2.2, 2.3).applyMatrix4(g.matrixWorld);           // thrown through
    _tgt.copy(_v3).lerp(_v1, w).lerp(_v2, k);
    _pole.set(side * 1, 0.2, -0.6).transformDirection(g.matrixWorld);
    guardianHandTo(g, R, S, _tgt, _pole);
    R['wrist' + S].rotation.set(0.3 - 0.9 * k, 0, 0);
    guardianGrip(R, S, k > 0.45 ? 0.15 : 1, 'grab');
  }
  for (const L of ['L', 'R']) {
    const ls = L === 'L' ? -1 : 1;
    _tgt.set(ls * 0.4, 0, (L === 'L' ? 0.25 : -0.25) * (1 - k * 0.5) + 0.2 * k).applyMatrix4(g.matrixWorld);
    _pole.set(0, 0.2, 1).transformDirection(g.matrixWorld);
    ikLimb(R['hip' + L], R['knee' + L], R.leg.thigh, R.leg.shin, _tgt, _pole);
    levelFoot(g, R, L);
  }
  guardianHead(g, R, look, 0.3 + 0.6 * w + 0.3 * k, 0.3 * w);
}

// --- Walking upright (the walk-out with the body, the turn to go back in). --------------
export function guardianWalkUpright(g, R, t, ph, hold, look) {
  const s = Math.sin(ph);
  bodyShape(g, R, { rear: 0.92, crouch: 0.15, arch: 0.05 * s, lean: 0.12 });
  R.pelvis.position.y += 0.05 * Math.abs(Math.cos(ph));
  g.updateWorldMatrix(true, false);
  for (const S of ['L', 'R']) {
    const side = S === 'L' ? -1 : 1;
    if (hold) {
      _tgt.copy(hold).add(_v1.set(side * 0.28, 0, 0).transformDirection(g.matrixWorld));
      _pole.set(side * 1, 0.1, -0.5).transformDirection(g.matrixWorld);
      guardianHandTo(g, R, S, _tgt, _pole);
      guardianGrip(R, S, 1, 'grab');
    } else {
      // Arms swinging low, knuckles nearly brushing the ground.
      _tgt.set(side * 0.78, 0.25 + 0.15 * Math.max(0, Math.sin(ph + (side < 0 ? 0 : Math.PI))), 0.25 * Math.sin(ph + (side < 0 ? 0 : Math.PI))).applyMatrix4(g.matrixWorld);
      _pole.set(side * 0.8, 0.2, -0.8).transformDirection(g.matrixWorld);
      guardianHandTo(g, R, S, _tgt, _pole);
      guardianGrip(R, S, 0.6, 'walk');
    }
  }
  for (const L of ['L', 'R']) {
    const ls = L === 'L' ? -1 : 1;
    const p = ph + (L === 'L' ? 0 : Math.PI);
    const lift = Math.max(0, Math.sin(p));
    _tgt.set(ls * 0.36, lift * 0.3, 0.45 * Math.cos(p)).applyMatrix4(g.matrixWorld);
    _pole.set(0, 0.2, 1).transformDirection(g.matrixWorld);
    ikLimb(R['hip' + L], R['knee' + L], R.leg.thigh, R.leg.shin, _tgt, _pole);
    levelFoot(g, R, L);
    R['ankle' + L].rotation.x += lift * 0.4;
  }
  guardianHead(g, R, look, 0.3, 0.2);
}

// Convenience for the caller: the joint list for damping, and the hand groups.
export function guardianJoints(g) { return g.userData.rig.joints; }
export function guardianHands(g) { return g.userData.rig.hands; }

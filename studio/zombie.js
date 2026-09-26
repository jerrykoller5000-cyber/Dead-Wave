// studio/zombie.js — the game's zombies as a studio rig (D-42). Claude's (studio/*).
//
// Two ways to get one, as for the marine (studio/marine.js):
//   makeZombieRig({ type })  a stand-in for the studio: plain boxes on the SAME joint layout as the game's
//                            makeZombieMesh() in index.html (every offset below is copied from it), so a
//                            reaction tuned in the studio is the reaction in the game.
//   adoptZombie(group)       the game's own zombie mesh: its joint groups, found in makeZombieMesh()'s
//                            userData. Adding the two empty end groups (hand, foot) is the only change.
//
// Joint names follow the marine's: "L" is the zombie's -X side. It faces +Z. Limbs hang along -Y.
// Note (for Grokbot): the game stands a zombie's feet about 0.2 m under its root (hips 0.55, leg 0.74);
// studio/motion.js measures that sink when a body wakes, so reactions don't pop it up or down.
import * as THREE from 'three';
import { rbox } from '../core/geometry.js';

// The game zombie's joint offsets at scale 1 (index.html, makeZombieMesh). crew: keep these in step.
export const ZOMBIE = {
  hipsY: 0.55,                 // hips.position.y = 0.55 * s
  torsoY: 0.28,                // torso.position.y = 0.28 * s (child of hips)
  legX: 0.13, legY: -0.02,     // legLG.position.set(-0.13 * s, -0.02 * s, 0)
  shin: -0.38,                 // shinG.position.y = -0.38 * s
  foot: [0, -0.36, 0.04],      // boot.position.set(0, -0.36 * s, 0.04 * s)
  shoulderY: 0.42,             // shoulderY = 0.42 * s
  shoulderX: 0.32,             // 0.42 for brutes and demons
  elbow: -0.34,                // elbowG.position.y = -0.34 * s
  hand: [0, -0.34, 0.01],      // hand.position.set(0, -0.34 * s, 0.01 * s)
  headY: 0.58,                 // headY (0.55 on ferals)
  droop: { shambler: -0.85, feral: -1.15, military: -0.25, other: -0.45 }
};

export function makeZombieRig(opts = {}) {
  const Z = ZOMBIE, type = opts.type || 'shambler';
  const wide = type === 'brute' || type === 'demon';
  const skin = new THREE.MeshStandardMaterial({ color: opts.color ?? 0xd4c4a8, roughness: 0.92 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x5a5046, roughness: 0.95 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 0.85 });
  const box = (parent, w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(rbox(w, h, d, Math.min(w, h, d) * 0.25), mat);
    m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  const g = new THREE.Group();
  g.name = 'zombie';
  const hips = new THREE.Group(); hips.position.y = Z.hipsY; g.add(hips);
  const torso = new THREE.Group(); torso.position.y = Z.torsoY; hips.add(torso);
  box(hips, 0.36, 0.2, 0.22, cloth, 0, 0.1, 0);                    // the pelvis block
  box(torso, wide ? 0.62 : 0.48, 0.5, 0.26, cloth, 0, 0.22, 0);
  const leg = (side) => {
    const legG = new THREE.Group(); legG.position.set(side * Z.legX, Z.legY, 0); hips.add(legG);
    box(legG, 0.16, 0.38, 0.18, skin, 0, -0.18, 0);
    const shinG = new THREE.Group(); shinG.position.y = Z.shin; legG.add(shinG);
    box(shinG, 0.14, 0.36, 0.16, skin, 0, -0.16, 0);
    box(shinG, 0.16, 0.1, 0.24, boot, ...Z.foot);
    const foot = new THREE.Group(); foot.position.set(...Z.foot); shinG.add(foot);
    legG.userData.shinG = shinG;
    return { legG, shinG, foot };
  };
  const L = leg(-1), R = leg(1);
  const droop = Z.droop[type] ?? Z.droop.other;
  const arm = (side) => {
    const armG = new THREE.Group();
    armG.position.set(side * (wide ? 0.42 : Z.shoulderX), Z.shoulderY, 0);
    torso.add(armG);
    box(armG, 0.12, 0.34, 0.13, skin, 0, -0.16, 0);
    const elbowG = new THREE.Group(); elbowG.position.y = Z.elbow; armG.add(elbowG);
    box(elbowG, 0.1, 0.3, 0.11, skin, 0, -0.14, 0);
    const hand = new THREE.Group(); hand.position.set(...Z.hand); elbowG.add(hand);
    box(hand, 0.09, 0.1, 0.1, skin, 0, 0, 0);
    armG.rotation.x = droop;                                        // the game's arm droop (baseRotX)
    armG.userData.elbowG = elbowG;
    return { armG, elbowG, hand };
  };
  const AL = arm(-1), AR = arm(1);
  const head = new THREE.Group(); head.position.set(0, type === 'feral' ? 0.55 : Z.headY, type === 'feral' ? 0.12 : 0); torso.add(head);
  box(head, 0.34, 0.34, 0.34, skin, 0, 0, 0);
  g.userData.rig = rigOf({ hips, torso, head, armLG: AL.armG, armRG: AR.armG, legLG: L.legG, legRG: R.legG }, {
    handL: AL.hand, handR: AR.hand, footL: L.foot, footR: R.foot
  });
  if (opts.scale) g.scale.setScalar(opts.scale);
  return g;
}

function rigOf(u, ends) {
  return {
    pelvis: u.hips, spine: u.torso, head: u.head,
    hipL: u.legLG, kneeL: u.legLG.userData.shinG, ankleL: ends.footL,
    hipR: u.legRG, kneeR: u.legRG.userData.shinG, ankleR: ends.footR,
    shoulderL: u.armLG, elbowL: u.armLG.userData.elbowG, handL: ends.handL,
    shoulderR: u.armRG, elbowR: u.armRG.userData.elbowG, handR: ends.handR
  };
}

// The game's zombie (index.html makeZombieMesh), by the names its userData already gives them.
// The hand and foot ends are empty groups at the game's own hand and boot offsets, added once.
export function adoptZombie(group) {
  const u = group.userData || {};
  const need = ['hips', 'torso', 'head', 'armLG', 'armRG', 'legLG', 'legRG'];
  const missing = need.filter((k) => !u[k] || !u[k].isObject3D);
  if (!missing.length) for (const k of ['armLG', 'armRG']) if (!u[k].userData.elbowG) missing.push(k + '.elbowG');
  if (!missing.length) for (const k of ['legLG', 'legRG']) if (!u[k].userData.shinG) missing.push(k + '.shinG');
  if (missing.length) throw new Error('adoptZombie: this group is not a game zombie (no ' + missing.join(', ') + ' in its userData)');
  const end = (parent, name, at) => {
    let e = parent.children.find((c) => c.name === name);
    if (!e) { e = new THREE.Group(); e.name = name; e.position.set(...at); parent.add(e); }
    return e;
  };
  if (!u.motionEnds) {
    u.motionEnds = {
      handL: end(u.armLG.userData.elbowG, 'handEndL', ZOMBIE.hand), handR: end(u.armRG.userData.elbowG, 'handEndR', ZOMBIE.hand),
      footL: end(u.legLG.userData.shinG, 'footEndL', ZOMBIE.foot), footR: end(u.legRG.userData.shinG, 'footEndR', ZOMBIE.foot)
    };
  }
  return rigOf(u, u.motionEnds);
}

export const ZOMBIE_CHAINS = {
  footL: { root: 'hipL', mid: 'kneeL', end: 'ankleL', lengths: [0.38, 0.36], pole: [0, 0, 1], exact: true },
  footR: { root: 'hipR', mid: 'kneeR', end: 'ankleR', lengths: [0.38, 0.36], pole: [0, 0, 1], exact: true },
  handL: { root: 'shoulderL', mid: 'elbowL', end: 'handL', lengths: [0.34, 0.34], pole: [0, 0, -1], exact: true },
  handR: { root: 'shoulderR', mid: 'elbowR', end: 'handR', lengths: [0.34, 0.34], pole: [0, 0, -1], exact: true }
};

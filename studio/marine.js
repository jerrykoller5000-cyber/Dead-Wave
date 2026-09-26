// studio/marine.js — the marine as a studio rig (D-41, CL-63). Claude's (studio/*).
//
// Two ways to get one:
//   makeMarineRig()        a stand-in for the studio: plain boxes on the SAME joint layout as the game's
//                          makeMarine() in index.html (every offset below is copied from it), so a grip
//                          point worked out in the studio is the grip point in the game.
//   adoptMarine(group)     the game's own marine: its joint groups, found in makeMarine()'s userData.
//                          rigs.get('marine').create({ group: marine }) uses this.
//
// Joint names follow the game's: "L" is the marine's -X side (legLG, armLG), whatever that is from
// his own point of view. He faces +Z. Limbs hang along -Y and bend about +X (studio/ik.js).
import * as THREE from 'three';
import { rbox } from '../core/geometry.js';

// The game marine's joint offsets (index.html, makeMarine). crew: keep these in step with it;
// studio/scene.test.mjs checks the numbers are still there.
export const MARINE = {
  hipY: 0.62, hipX: 0.13,           // legG.position.set(side * 0.13, 0.62, 0)
  knee: [0, -0.27, 0],              // knee.position.set(0, -0.27, 0)
  ankle: [0, -0.25, 0.01],          // ankle.position.set(0, -0.25, 0.01)
  torsoY: 0.7,                      // TORSO_PIVOT_Y
  shoulder: [0.34, 1.08, 0.02],     // armG.position.set(side * 0.34, 1.08 - TORSO_PIVOT_Y, 0.02)
  elbow: [0, -0.28, 0],             // elbowG.position.set(0, -0.28, 0)
  gripL: [0.02, -0.27, 0.13],       // gripL.position.set(0.02, -0.27, 0.13)
  gripR: [-0.01, -0.26, 0.12],      // gripR.position.set(-0.01, -0.26, 0.12)
  headY: 1.22                       // HEAD_PIVOT_Y
};

export function makeMarineRig() {
  const M = MARINE;
  const cloth = new THREE.MeshStandardMaterial({ color: 0x4b5a32, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2f3524, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd2b090, roughness: 0.7 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.85 });
  const box = (parent, w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(rbox(w, h, d, Math.min(w, h, d) * 0.25), mat);
    m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  const g = new THREE.Group();
  g.name = 'marine';
  const lowerBody = new THREE.Group(); g.add(lowerBody);
  box(lowerBody, 0.4, 0.18, 0.26, dark, 0, M.hipY, 0);
  const leg = (side) => {
    const hip = new THREE.Group(); hip.position.set(side * M.hipX, M.hipY, 0); lowerBody.add(hip);
    box(hip, 0.17, 0.29, 0.19, cloth, 0, -0.135, 0);
    const knee = new THREE.Group(); knee.position.set(...M.knee); hip.add(knee);
    box(knee, 0.14, 0.27, 0.16, cloth, 0, -0.125, 0);
    const ankle = new THREE.Group(); ankle.position.set(...M.ankle); knee.add(ankle);
    box(ankle, 0.13, 0.1, 0.28, boot, 0, -0.06, 0.05);
    return { hip, knee, ankle };
  };
  const L = leg(-1), Rt = leg(1);
  const torso = new THREE.Group(); torso.position.y = M.torsoY; g.add(torso);
  box(torso, 0.44, 0.5, 0.27, cloth, 0, 0.2, 0);
  const arm = (side, grip) => {
    const sh = new THREE.Group(); sh.position.set(side * M.shoulder[0], M.shoulder[1] - M.torsoY, M.shoulder[2]); torso.add(sh);
    box(sh, 0.12, 0.29, 0.13, cloth, 0, -0.14, 0);
    const el = new THREE.Group(); el.position.set(...M.elbow); sh.add(el);
    box(el, 0.1, 0.27, 0.11, cloth, 0, -0.13, 0.02);
    const hand = new THREE.Group(); hand.position.set(...grip); el.add(hand);
    box(hand, 0.08, 0.1, 0.09, skin, 0, 0, 0);
    // Hanging at his sides (the game's rest is the gun hold; a scene's clips pose the arms).
    sh.rotation.set(0.05, 0, side * 0.1);
    el.rotation.set(-0.25, 0, 0);
    return { sh, el, hand };
  };
  const AL = arm(-1, M.gripL), AR = arm(1, M.gripR);
  const head = new THREE.Group(); head.position.y = M.headY - M.torsoY; torso.add(head);
  box(head, 0.12, 0.13, 0.12, skin, 0, 0.02, 0);
  box(head, 0.25, 0.27, 0.27, skin, 0, 0.19, 0.015);
  box(head, 0.27, 0.07, 0.29, dark, 0, 0.3, 0.02);   // the field cap
  g.userData.rig = {
    pelvis: lowerBody, hipL: L.hip, kneeL: L.knee, ankleL: L.ankle, hipR: Rt.hip, kneeR: Rt.knee, ankleR: Rt.ankle,
    spine: torso, shoulderL: AL.sh, elbowL: AL.el, handL: AL.hand, shoulderR: AR.sh, elbowR: AR.el, handR: AR.hand, head
  };
  return g;
}

// The game's marine (index.html makeMarine), by the names its userData already gives them.
export function adoptMarine(group) {
  const u = group.userData || {};
  const R = {
    pelvis: u.lowerBody, hipL: u.legLG, kneeL: u.kneeLG, ankleL: u.ankleLG, hipR: u.legRG, kneeR: u.kneeRG, ankleR: u.ankleRG,
    spine: u.torsoG, shoulderL: u.armLG, elbowL: u.elbowLG, handL: u.gripL, shoulderR: u.armRG, elbowR: u.elbowRG, handR: u.gripR, head: u.headG
  };
  const missing = Object.entries(R).filter(([, v]) => !v || !v.isObject3D).map(([k]) => k);
  if (missing.length) throw new Error('adoptMarine: this group is not a game marine (no ' + missing.join(', ') + ' in its userData)');
  return R;
}

// The limbs the player can place. `exact`: the end joint sits off the bone line (the grip is ahead of
// the forearm), so the solver aims the real end point, and the lengths come from the joints themselves.
export const MARINE_CHAINS = {
  footL: { root: 'hipL', mid: 'kneeL', end: 'ankleL', lengths: [0.27, 0.25], pole: [0, 0, 1], exact: true },
  footR: { root: 'hipR', mid: 'kneeR', end: 'ankleR', lengths: [0.27, 0.25], pole: [0, 0, 1], exact: true },
  handL: { root: 'shoulderL', mid: 'elbowL', end: 'handL', lengths: [0.28, 0.3], pole: [-0.5, 0, -1], exact: true },
  handR: { root: 'shoulderR', mid: 'elbowR', end: 'handR', lengths: [0.28, 0.3], pole: [0.5, 0, -1], exact: true }
};

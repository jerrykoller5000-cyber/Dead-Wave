// studio/make-getup.mjs — writes the get-up clips (D-42): a body the reactions left lying face down
// or face up stands up on a clip, not on a blend.
//
//   node --import ./studio/node-three.mjs studio/make-getup.mjs          write them, and check them
//   node --import ./studio/node-three.mjs studio/make-getup.mjs --check  only check what's on disk
//
// The clips are data (studio/clips/<rig>/getup-front.json, getup-back.json); this script is how
// they were made, so the numbers that matter sit in one place with the reasons next to them.
//
// How they line up with the body (studio/motion.js, the getup event): a get-up clip starts lying
// with its hips over the rig's origin. getup-front lies face down with its head toward the rig's +Z;
// getup-back lies face up with its feet toward +Z. The host turns the rig's group to the event's
// heading, so the clip lies where the body does, and plays it from its start while the body's weight
// goes to 0. Both end standing at the origin facing +Z, in the pose the rig stands in (its rest, with
// the spine and head of its idle), so the host's own clip takes it back without a pop.
//
// Each beat says where the hips are (the pelvis point, rig frame) and how they're turned, how the
// spine and head bend, and where the hands and feet go (rig frame targets, fitted on the real rig and
// written as plain joint turns so the player never has to solve them). A limb is fitted without
// twist: the shoulder or hip swings (about X and Z), the elbow or knee bends (about X), starting from
// where the beat before left it. That's the rest pose's own way of writing a limb, so beats blend into
// each other and into the rest without an arm spinning about itself (the IK's own frames are
// flipped half a turn for a forward-bending elbow). "rest" puts a limb back exactly as the rig stands.
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rigs } from './rigs.js';
import { loadClip, createPlayer } from './clip.js';
import { MARINE } from './marine.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const r1 = (x) => Math.round(x * 10) / 10, r3 = (x) => Math.round(x * 1000) / 1000;

// --- The beats -------------------------------------------------------------------------------
// t: seconds. ease: how the beat is arrived at (clip eases). hips: the pelvis point (between the hip
// joints), rig frame. turn: the hips' turn, degrees XYZ (90 about X lies face down, head to +Z; -90
// face up, head to -Z). spine, head: bends, degrees, on top of the hips' and the spine's turns.
// hands, feet: { L, R } rig-frame targets for the limb's end, 'rest', or { rot: [shoulder or hip],
// mid: [elbow or knee] } turns. pole: which way the elbows or knees bend, rig frame, per side.
const ZOMBIE_IDLE = { spine: [8, 0, -3], head: [10, 8, 4] };     // studio/clips/zombie/idle.json at 0
const MARINE_STAND = { spine: [2, 0, 0], head: [0, 0, 0] };      // studio/clips/marine/stand.json at 0

const CLIPS = {
  // The zombie, face down (a shell from behind, a blast): it lies spread on its front, gets its hands
  // under its chest and shoves its chest up, drags a knee under its hips, plants the other foot in
  // front, hauls itself up that leg with a hand on the knee, and stands, arms dropping into its
  // droop. Slow and effortful, like something that has forgotten how (the shambler's notes).
  'zombie/getup-front': {
    rig: 'zombie', length: 1.2,
    notes: 'D-42. Face down to standing: hands under the chest and shove, a knee dragged under, the other foot planted, up that leg with a hand on the knee, arms drop into the droop. Starts lying head toward +Z; the host turns it to the body\'s heading (studio/motion.js getup).',
    beats: [
      { t: 0, hips: [0, 0.13, 0], turn: [90, 0, 0], spine: [-8, 0, 0], head: [-22, 12, 0],
        hands: { L: [-0.44, 0.05, 0.62], R: [0.44, 0.05, 0.66] }, handPole: [0, 1, -0.4],
        feet: { L: [-0.16, 0.06, -0.72], R: [0.16, 0.06, -0.72] }, footPole: [0, -1, 0.1] },
      { t: 0.3, ease: 'smooth', hips: [0, 0.15, -0.02], turn: [72, 0, 0], spine: [-24, 0, 0], head: [-30, 6, 0],
        hands: { L: [-0.36, 0.05, 0.56], R: [0.36, 0.05, 0.58] }, handPole: [0, 1, -0.5],
        feet: { L: [-0.15, 0.06, -0.68], R: [0.16, 0.06, -0.7] }, footPole: [0, -1, 0.2] },
      { t: 0.58, ease: 'smooth', hips: [0, 0.4, -0.16], turn: [50, 0, 0], spine: [-6, 0, 0], head: [-26, 0, 0],
        hands: { L: [-0.34, 0.05, 0.42], R: [0.34, 0.05, 0.44] }, handPole: [0, 1, -0.6],
        feet: { L: [-0.14, 0.05, -0.5], R: [0.15, 0.05, -0.46] }, footPole: [0, -0.4, 1] },
      { t: 0.84, ease: 'smooth', hips: [0, 0.44, -0.1], turn: [34, 0, 0], spine: [-2, 0, 0], head: [-16, -4, 0],
        hands: { L: [-0.36, 0.3, 0.46], R: [0.24, 0.3, 0.26] }, handPole: [0, 0.3, -1],
        feet: { L: [-0.14, 0.05, -0.46], R: [0.16, -0.1, 0.18] }, footPole: [0, 0, 1] },
      { t: 1.02, ease: 'smooth', hips: [0, 0.52, -0.02], turn: [14, 0, 0], spine: [4, 0, -2], head: [2, 4, 2],
        hands: { L: [-0.34, 0.66, 0.44], R: [0.32, 0.64, 0.42] }, handPole: [0, 0, -1],
        feet: { L: [-0.14, -0.08, -0.14], R: [0.14, -0.19, 0.08] }, footPole: [0, 0, 1] },
      { t: 1.2, ease: 'smooth', hips: [0, 0.55, 0], turn: [0, 0, 0], ...ZOMBIE_IDLE,
        hands: { L: 'rest', R: 'rest' }, feet: { L: 'rest', R: 'rest' } }
    ]
  },
  // The zombie, face up (a shell or a blast from in front): it lies on its back, curls up to sit,
  // rolls onto its left hip with the left hand planted behind, gets its knees under it, and rises.
  'zombie/getup-back': {
    rig: 'zombie', length: 1.2,
    notes: 'D-42. Face up to standing: a sit-up, a roll onto the left hip and hand, the knees under, up. Starts lying feet toward +Z; the host turns it to the body\'s heading (studio/motion.js getup).',
    beats: [
      { t: 0, hips: [0, 0.13, 0], turn: [-90, 0, 0], spine: [6, 0, 0], head: [16, -10, 0],
        hands: { L: [-0.46, 0.05, -0.18], R: [0.46, 0.05, -0.22] }, handPole: [0, -1, 0.3],
        feet: { L: [-0.16, 0.06, 0.72], R: [0.16, 0.06, 0.72] }, footPole: [0, 1, 0.1] },
      { t: 0.32, ease: 'smooth', hips: [0, 0.14, 0], turn: [-40, 0, 0], spine: [20, 0, 0], head: [24, -4, 0],
        hands: { L: [-0.34, 0.05, -0.22], R: [0.34, 0.05, -0.2] }, handPole: [0, -0.3, -1],
        feet: { L: [-0.16, 0.06, 0.6], R: [0.17, 0.2, 0.46] }, footPole: [0, 1, 0.4] },
      { t: 0.58, ease: 'smooth', hips: [-0.04, 0.22, 0.06], turn: [-4, 0, 16], spine: [26, 0, -10], head: [16, 6, 0],
        hands: { L: [-0.44, 0.05, -0.12], R: [0.12, 0.34, 0.36] }, handPole: [0, 0, -1],
        feet: { L: [-0.18, 0.05, 0.38], R: [0.18, 0.02, 0.3] }, footPole: [0, 0.4, 1] },
      { t: 0.84, ease: 'smooth', hips: [0, 0.36, 0.02], turn: [30, 0, 4], spine: [10, 0, -4], head: [-4, 4, 0],
        hands: { L: [-0.3, 0.08, 0.4], R: [0.26, 0.3, 0.44] }, handPole: [0, 0.4, -1],
        feet: { L: [-0.15, -0.05, 0.06], R: [0.16, -0.1, 0.12] }, footPole: [0, 0, 1] },
      { t: 1.02, ease: 'smooth', hips: [0, 0.5, 0], turn: [14, 0, 0], spine: [4, 0, -2], head: [4, 6, 2],
        hands: { L: [-0.34, 0.64, 0.44], R: [0.32, 0.64, 0.44] }, handPole: [0, 0, -1],
        feet: { L: [-0.14, -0.17, 0.03], R: [0.14, -0.19, 0.06] }, footPole: [0, 0, 1] },
      { t: 1.2, ease: 'smooth', hips: [0, 0.55, 0], turn: [0, 0, 0], ...ZOMBIE_IDLE,
        hands: { L: 'rest', R: 'rest' }, feet: { L: 'rest', R: 'rest' } }
    ]
  },
  // The marine, face down: a soldier's push-up, a knee under, a foot in front, a hand on the knee,
  // up. Quicker and cleaner than the zombie's (Jerry's GB-50 order: he's up fast).
  'marine/getup-front': {
    rig: 'marine', length: 1.1,
    notes: 'D-42. Face down to standing, a soldier\'s: push-up, a knee under, a foot planted, a hand on that knee, up. Starts lying head toward +Z; the host turns it to the body\'s heading (studio/motion.js getup).',
    beats: [
      { t: 0, hips: [0, 0.14, 0], turn: [90, 0, 0], spine: [-6, 0, 0], head: [-20, 14, 0],
        hands: { L: [-0.36, 0.06, 0.44], R: [0.36, 0.06, 0.46] }, handPole: [0, 1, -0.5],
        feet: { L: [-0.15, 0.1, -0.52], R: [0.15, 0.1, -0.52] }, footPole: [0, -1, 0.1] },
      { t: 0.26, ease: 'smooth', hips: [0, 0.2, -0.02], turn: [68, 0, 0], spine: [-16, 0, 0], head: [-26, 4, 0],
        hands: { L: [-0.3, 0.06, 0.4], R: [0.3, 0.06, 0.42] }, handPole: [0, 1, -0.6],
        feet: { L: [-0.14, 0.1, -0.5], R: [0.15, 0.1, -0.52] }, footPole: [0, -1, 0.2] },
      { t: 0.52, ease: 'smooth', hips: [0, 0.46, -0.12], turn: [44, 0, 0], spine: [-4, 0, 0], head: [-22, 0, 0],
        hands: { L: [-0.3, 0.06, 0.32], R: [0.3, 0.06, 0.34] }, handPole: [0, 1, -0.6],
        feet: { L: [-0.13, 0.1, -0.44], R: [0.14, 0.1, -0.4] }, footPole: [0, -0.4, 1] },
      { t: 0.76, ease: 'smooth', hips: [0, 0.5, -0.08], turn: [28, 0, 0], spine: [0, 0, 0], head: [-12, -4, 0],
        hands: { L: [-0.34, 0.36, 0.3], R: [0.2, 0.42, 0.22] }, handPole: [0, 0.3, -1],
        feet: { L: [-0.13, 0.1, -0.42], R: [0.15, 0.1, 0.18] }, footPole: [0, 0, 1] },
      { t: 0.94, ease: 'smooth', hips: [0, 0.6, -0.02], turn: [10, 0, 0], spine: [2, 0, 0], head: [-2, 2, 0],
        hands: { L: [-0.36, 0.6, 0.14], R: [0.36, 0.6, 0.14] }, handPole: [0, 0, -1],
        feet: { L: [-0.13, 0.16, -0.12], R: [0.14, 0.1, 0.06] }, footPole: [0, 0, 1] },
      { t: 1.1, ease: 'smooth', hips: [0, 0.62, 0], turn: [0, 0, 0], ...MARINE_STAND,
        hands: { L: 'rest', R: 'rest' }, feet: { L: 'rest', R: 'rest' } }
    ]
  },
  // The marine, face up: sits up hard, rolls to his left onto a hand and knee, a foot planted, up.
  'marine/getup-back': {
    rig: 'marine', length: 1.1,
    notes: 'D-42. Face up to standing, a soldier\'s: sit up, roll onto the left hand and knee, the right foot planted, up. Starts lying feet toward +Z; the host turns it to the body\'s heading (studio/motion.js getup).',
    beats: [
      { t: 0, hips: [0, 0.14, 0], turn: [-90, 0, 0], spine: [4, 0, 0], head: [14, -12, 0],
        hands: { L: [-0.4, 0.06, -0.14], R: [0.4, 0.06, -0.18] }, handPole: [0, -1, 0.3],
        feet: { L: [-0.15, 0.1, 0.52], R: [0.15, 0.1, 0.52] }, footPole: [0, 1, 0.1] },
      { t: 0.26, ease: 'smooth', hips: [0, 0.14, 0], turn: [-42, 0, 0], spine: [22, 0, 0], head: [22, -4, 0],
        hands: { L: [-0.3, 0.06, -0.18], R: [0.3, 0.06, -0.16] }, handPole: [0, -0.3, -1],
        feet: { L: [-0.15, 0.1, 0.46], R: [0.16, 0.2, 0.36] }, footPole: [0, 1, 0.4] },
      { t: 0.5, ease: 'smooth', hips: [-0.04, 0.24, 0.04], turn: [-4, 0, 16], spine: [26, 0, -10], head: [14, 6, 0],
        hands: { L: [-0.38, 0.06, -0.08], R: [0.1, 0.36, 0.28] }, handPole: [0, 0, -1],
        feet: { L: [-0.18, 0.1, 0.3], R: [0.17, 0.1, 0.24] }, footPole: [0, 0.4, 1] },
      { t: 0.74, ease: 'smooth', hips: [0, 0.42, 0.02], turn: [28, 0, 4], spine: [8, 0, -4], head: [-4, 4, 0],
        hands: { L: [-0.28, 0.08, 0.3], R: [0.22, 0.36, 0.32] }, handPole: [0, 0.4, -1],
        feet: { L: [-0.14, 0.1, 0.02], R: [0.15, 0.1, 0.1] }, footPole: [0, 0, 1] },
      { t: 0.93, ease: 'smooth', hips: [0, 0.58, 0], turn: [10, 0, 0], spine: [2, 0, 0], head: [0, 2, 0],
        hands: { L: [-0.36, 0.6, 0.14], R: [0.36, 0.6, 0.14] }, handPole: [0, 0, -1],
        feet: { L: [-0.13, 0.1, 0.0], R: [0.13, 0.1, 0.04] }, footPole: [0, 0, 1] },
      { t: 1.1, ease: 'smooth', hips: [0, 0.62, 0], turn: [0, 0, 0], ...MARINE_STAND,
        hands: { L: 'rest', R: 'rest' }, feet: { L: 'rest', R: 'rest' } }
    ]
  }
};

// --- Posing a beat on the real rig, and reading its joints back ---------------------------------
const qOf = (deg) => new THREE.Quaternion().setFromEuler(new THREE.Euler(deg[0] * D2R, deg[1] * D2R, deg[2] * D2R, 'XYZ'));
// The joints a clip writes: the hips and spine (turn and place), the head, and each limb's two joints.
const LIMBS = { handL: ['shoulderL', 'elbowL'], handR: ['shoulderR', 'elbowR'], footL: ['hipL', 'kneeL'], footR: ['hipR', 'kneeR'] };

// Fit a limb to a rig-frame target: the elbow or knee bend first, from how far the target is
// (elbows only bend forward, x <= 0; knees back, x >= 0), then the shoulder or hip swing (x, z) that
// points it there, within the joint's range, by damped least squares from where the beat before
// left it. Returns [swing x, swing z, bend] in radians.
const RANGE = {
  hand: { x: [-200, 80], zL: [-120, 30], zR: [-30, 120], bend: [-150, 0] },
  foot: { x: [-140, 50], zL: [-50, 20], zR: [-20, 50], bend: [0, 150] }
};
function fitLimb(inst, limb, target, init) {
  const [a, b] = LIMBS[limb], end = inst.def.chains[limb].end;
  const A = inst.R[a], B = inst.R[b], E = inst.R[end];
  const rg = RANGE[limb.startsWith('hand') ? 'hand' : 'foot'], zr = limb.endsWith('L') ? rg.zL : rg.zR;
  const clampTo = (v, [lo, hi]) => Math.max(lo * D2R, Math.min(hi * D2R, v));
  const e = new THREE.Euler(), w = new THREE.Vector3(), root = new THREE.Vector3();
  const pose = (p) => {
    A.quaternion.setFromEuler(e.set(p[0], 0, p[1], 'XYZ'));
    B.quaternion.setFromEuler(e.set(p[2], 0, 0, 'XYZ'));
    A.updateWorldMatrix(false, true);
    return w.setFromMatrixPosition(E.matrixWorld);
  };
  A.updateWorldMatrix(true, false);
  root.setFromMatrixPosition(A.matrixWorld);
  // The bend that gives the reach: the root-to-end distance grows as the limb straightens.
  const want = root.distanceTo(target);
  const reachAt = (k) => pose([0, 0, k]).distanceTo(root);
  const [b0, b1] = rg.bend.map((d) => d * D2R);
  const straight = Math.abs(b0) < Math.abs(b1) ? b0 : b1, folded = Math.abs(b0) < Math.abs(b1) ? b1 : b0;
  let k;
  if (reachAt(straight) <= want) k = straight;
  else if (reachAt(folded) >= want) k = folded;
  else { let s0 = straight, s1 = folded; for (let i = 0; i < 50; i++) { const m = (s0 + s1) / 2; if (reachAt(m) > want) s0 = m; else s1 = m; } k = (s0 + s1) / 2; }
  // The swing: from where it was, and from a spread of other starts (a limit can trap one), keeping
  // the one that reaches best, and of those that reach, the one nearest where it was.
  const at = (q) => pose([q[0], q[1], k]).clone().sub(target);
  const descend = (p) => {
    let err = at(p), lam = 0.01;
    for (let it = 0; it < 150 && err.lengthSq() > 1e-9; it++) {
      const J = [0, 1].map((i) => { const q = p.slice(); q[i] += 1e-4; return at(q).sub(err).divideScalar(1e-4); });
      const a11 = J[0].dot(J[0]) + lam, a12 = J[0].dot(J[1]), a22 = J[1].dot(J[1]) + lam;
      const g1 = -J[0].dot(err), g2 = -J[1].dot(err), det = a11 * a22 - a12 * a12 || 1e-12;
      const q = [clampTo(p[0] + (g1 * a22 - g2 * a12) / det, rg.x), clampTo(p[1] + (a11 * g2 - a12 * g1) / det, zr)];
      const e2 = at(q);
      if (e2.lengthSq() < err.lengthSq()) { p = q; err = e2; lam = Math.max(1e-6, lam * 0.5); } else lam *= 4;
      if (lam > 1e6) break;
    }
    return { p, err };
  };
  const seeds = [[init[0], init[1]]];
  for (const sx of [-180, -135, -90, -45, 0, 45]) for (const sz of [zr[0] * 0.5, 0, zr[1] * 0.5]) seeds.push([sx * D2R, sz * D2R]);
  let best = null, bestCost = Infinity;
  for (const s of seeds) {
    const r = descend([clampTo(s[0], rg.x), clampTo(s[1], zr)]);
    const cost = r.err.length() + 0.01 * Math.hypot(r.p[0] - init[0], r.p[1] - init[1]);
    if (cost < bestCost) { bestCost = cost; best = r; }
  }
  const p = best.p, err = best.err;
  pose([p[0], p[1], k]);
  // A target out of reach isn't an error: the limb reaches as far as it goes toward it.
  if (err.length() > 0.03 && process.env.GETUP_VERBOSE) console.log(`    ${limb}: ${err.length().toFixed(3)} m short of its target`);
  return [p[0], p[1], k];
}

function poseBeat(rig, beat, prev) {
  const inst = rigs.get(rig).create({});
  const R = inst.R, rest = inst.rest;
  const qT = qOf(beat.turn);
  const hips = new THREE.Vector3(...beat.hips);
  if (rig === 'zombie') {
    // The zombie's pelvis joint is the hips, and carries the torso.
    R.pelvis.position.copy(hips); R.pelvis.quaternion.copy(qT);
    R.spine.quaternion.copy(qOf(beat.spine));
  } else {
    // The marine's lower body sits on the ground with the hips 0.62 up it, and the torso is its
    // sibling, pivoting 0.08 above the hips: both are placed so they turn together about the hips.
    R.pelvis.quaternion.copy(qT);
    R.pelvis.position.copy(hips).sub(new THREE.Vector3(0, MARINE.hipY, 0).applyQuaternion(qT));
    R.spine.quaternion.copy(qT).multiply(qOf(beat.spine));
    R.spine.position.copy(hips).add(new THREE.Vector3(0, MARINE.torsoY - MARINE.hipY, 0).applyQuaternion(qT));
  }
  R.head.quaternion.copy(qOf(beat.head));
  inst.group.updateWorldMatrix(true, true);
  for (const [limb, [a, b]] of Object.entries(LIMBS)) {
    const side = limb.endsWith('L') ? 'L' : 'R', kind = limb.startsWith('hand') ? 'hands' : 'feet';
    const want = beat[kind][side];
    const restP = () => { const ea = new THREE.Euler().setFromQuaternion(rest.get(R[a]).q, 'XYZ'), eb = new THREE.Euler().setFromQuaternion(rest.get(R[b]).q, 'XYZ'); return [ea.x, ea.z, eb.x]; };
    if (want === 'rest') { R[a].quaternion.copy(rest.get(R[a]).q); R[b].quaternion.copy(rest.get(R[b]).q); prev[limb] = restP(); }
    else if (want.rot) { R[a].quaternion.copy(qOf(want.rot)); R[b].quaternion.copy(qOf(want.mid || [0, 0, 0])); prev[limb] = [want.rot[0] * D2R, want.rot[2] * D2R, (want.mid || [0])[0] * D2R]; }
    else prev[limb] = fitLimb(inst, limb, new THREE.Vector3(...want).applyMatrix4(inst.group.matrixWorld), prev[limb] || restP());
    inst.group.updateWorldMatrix(true, true);
  }
  return inst;
}

// A joint's turn as XYZ degrees, the representation nearest the one before (so keys don't wrap).
function eulerNear(q, prev) {
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  const cands = [[e.x, e.y, e.z], [e.x + Math.PI, Math.PI - e.y, e.z + Math.PI]].map((v) => v.map((x, i) => (prev ? x + 2 * Math.PI * Math.round((prev[i] - x) / (2 * Math.PI)) : x)));
  const cost = (v) => v.reduce((s, x, i) => s + (x - (prev ? prev[i] : 0)) ** 2, 0);
  return cost(cands[0]) <= cost(cands[1]) ? cands[0] : cands[1];
}

function buildClip(ref, def) {
  const [rig, name] = ref.split('/');
  const joints = ['pelvis', 'spine', 'head', ...Object.values(LIMBS).flat()];
  const tracks = {};
  const prev = {}, fit = {};
  for (const beat of def.beats) {
    const inst = poseBeat(rig, beat, fit);
    // A limb's joints are written as fitted (swing x and z, bend x), unwrapped against the beat
    // before; the hips, spine and head as read back off the rig.
    const limbRad = {};
    for (const [limb, [ja, jb]] of Object.entries(LIMBS)) { const f = fit[limb]; limbRad[ja] = [f[0], 0, f[1]]; limbRad[jb] = [f[2], 0, 0]; }
    for (const j of joints) {
      const o = inst.R[j];
      const unwrap = (v) => v.map((x, i) => (prev[j] ? x + 2 * Math.PI * Math.round((prev[j][i] - x) / (2 * Math.PI)) : x));
      const rad = limbRad[j] ? unwrap(limbRad[j]) : eulerNear(o.quaternion, prev[j]);
      prev[j] = rad;
      const tr = (tracks[j] ||= {});
      const key = (v) => (beat.ease ? [beat.t, v, beat.ease] : [beat.t, v]);
      (tr.rot ||= []).push(key(rad.map((x) => r1(x * R2D))));
      // The hips (both rigs) and the marine's torso are placed as well as turned.
      if (j === 'pelvis' || (j === 'spine' && rig === 'marine')) (tr.pos ||= []).push(key(o.position.toArray().map(r3)));
    }
  }
  return { format: 'dw-clip/1', name, rig, length: def.length, loop: false, notes: def.notes, tracks, events: [[def.beats[1].t, 'push'], [def.beats[def.beats.length - 2].t, 'rise']] };
}

const write = (ref, clip) => {
  const f = path.join(HERE, 'clips', ref + '.json');
  fs.writeFileSync(f, JSON.stringify(clip, null, 1).replace(/\n\s+(-?[\d.]+|"[^"]*")(,?)(?=\n)/g, ' $1$2').replace(/\[\s+/g, '[').replace(/\s+\]/g, ']') + '\n');
  console.log('wrote', path.relative(process.cwd(), f));
};

// --- Checking a clip as the player plays it ---------------------------------------------------
// The worst one-frame turn at 60 fps (at the fastest a preset plays it: rate = length / getup.time),
// how far under the ground any end goes, and whether it ends where the rig stands.
export function checkGetup(ref, json, rate = 1) {
  const [rig] = ref.split('/');
  const clip = loadClip(json);
  const inst = rigs.get(rig).create({});
  const player = createPlayer(inst).play(clip);
  const ends = ['handL', 'handR', 'ankleL', 'ankleR', 'head'].filter((k) => inst.R[k]);
  const prevQ = new Map(), w = new THREE.Vector3();
  // A standing zombie's feet sit 0.21 under its root (the game's own; P-73), so its floor is lower.
  const floor = rig === 'zombie' ? -0.26 : -0.02;
  let turn = 0, where = '', low = Infinity, lowAt = '';
  const steps = Math.ceil((clip.length / rate) * 60);
  for (let i = 0; i <= steps; i++) {
    player.update(i === 0 ? 0 : clip.length / steps);
    for (const o of Object.values(inst.R)) {
      if (!o || !o.isObject3D) continue;
      const q = prevQ.get(o);
      if (q) { const a = 2 * Math.acos(Math.min(1, Math.abs(q.dot(o.quaternion)))); if (a > turn) { turn = a; where = `${o.name} at ${(i / steps * clip.length).toFixed(2)}`; } }
      prevQ.set(o, o.quaternion.clone());
    }
    for (const k of ends) { w.setFromMatrixPosition(inst.R[k].matrixWorld); if (w.y < low) { low = w.y; lowAt = `${k} at ${(i / steps * clip.length).toFixed(2)}`; } }
  }
  // The last frame against the rig's rest.
  const ref0 = rigs.get(rig).create({});
  ref0.group.updateWorldMatrix(true, true);
  let off = 0;
  for (const [k, o] of Object.entries(inst.R)) {
    if (!o || !o.isObject3D || !ref0.R[k]) continue;
    off = Math.max(off, new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).distanceTo(new THREE.Vector3().setFromMatrixPosition(ref0.R[k].matrixWorld)));
  }
  return { turn, where, low, lowAt, floor, off };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const only = process.argv.includes('--check');
  // The fastest each clip is played at: the shortest getup.time among the presets that name it.
  const { presets } = await import('./motion/index.js');
  for (const [ref, def] of Object.entries(CLIPS)) {
    const clip = only ? JSON.parse(fs.readFileSync(path.join(HERE, 'clips', ref + '.json'), 'utf8')) : buildClip(ref, def);
    if (!only) write(ref, clip);
    const times = presets.names().map((n) => presets.json(n)).filter((p) => p.getup && (p.getup.front === ref || p.getup.back === ref)).map((p) => p.getup.time);
    const rate = times.length ? clip.length / Math.min(...times) : 1;
    const c = checkGetup(ref, clip, rate);
    console.log(`  ${ref.padEnd(20)} at ${rate.toFixed(2)}x: worst turn ${c.turn.toFixed(3)} rad (${c.where})${c.turn > 0.3 ? '  SNAP' : ''}; lowest end ${c.low.toFixed(3)} m (${c.lowAt})${c.low < c.floor ? '  UNDER' : ''}; ends ${c.off.toFixed(3)} m from rest`);
  }
}

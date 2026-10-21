// studio/retarget-ual.mjs — CL-84 (P-93): the marine's walk and run, retargeted from the reference library (UAL, CC0).
//
//   node --import ./studio/node-three.mjs studio/retarget-ual.mjs [walk|run ...]
//
// Writes studio/clips/marine/<name>.json from a reference clip (assets/anim/reference/ual.json): the mannequin is posed
// frame by frame and its hips, feet and knees, spine and head are read in the world; the marine (a shorter, stockier
// body: legs 0.52 m against the mannequin's 0.82) gets the same motion at his own size:
//   - each foot: an IK target from his own hip, the mannequin's hip-to-ankle line scaled by the leg ratio; the knee's
//     pole from the mannequin's knee; level (the sole flat) while the foot is down;
//   - the pelvis and the spine: the mannequin's hip bob and sway, scaled, and its chest's turn and lean;
//   - the head: the mannequin's head turn and nod, on top of the chest's.
// The arms are left out: in the game they hold his gun (holdWeapon), whatever his legs do. In place, like the
// reference (the game moves him); "stride" in the notes is the ground speed it's matched to.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { loadReference, makeMannequin, poseReference } from './reference.js';
import { MARINE, MARINE_CHAINS } from './marine.js';
import { loadClip } from './clip.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF = loadReference(JSON.parse(fs.readFileSync(path.join(HERE, '..', 'assets', 'anim', 'reference', 'ual.json'), 'utf8')));
const OUT = path.join(HERE, 'clips', 'marine');

export const JOBS = {
  // yaw, lean: how much of the chest's swing and forward lean he keeps (his rifle is in his hands: a jogger's 40 degree
  // shoulder swing would throw his aim about); the head looks ahead, against the chest's swing.
  walk: { from: 'Walk_Loop', fps: 15, yaw: 0.6, lean: 1, notes: 'CL-84 v1, from the reference Walk_Loop at his size: legs, hips and chest; the arms are the gun\'s (holdWeapon).' },
  run: { from: 'Jog_Fwd_Loop', fps: 30, yaw: 0.3, lean: 0.55, notes: 'CL-84 v1, from the reference Jog_Fwd_Loop at his size: legs, hips and chest; the arms are the gun\'s (holdWeapon).' }
};

const D = 180 / Math.PI;
const r3 = (v) => v.map((x) => Math.round(x * 1000) / 1000);
const r1 = (v) => v.map((x) => Math.round(x * 10) / 10);

export function retarget(job) {
  const clip = REF.clip(job.from);
  const man = makeMannequin(REF);
  const B = (n) => man.byName.get(n);
  // The mannequin's packs face -Z (its knees point there): turned half round onto our +Z, left on -X like the marine's.
  const RY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), RYi = RY.clone().invert();
  const W = (n) => { const v = B(n).getWorldPosition(new THREE.Vector3()); return v.set(-v.x, v.y, -v.z); };
  const Q = (n) => RY.clone().multiply(B(n).getWorldQuaternion(new THREE.Quaternion())).multiply(RYi);
  // The rest pose (frame 0 of the idle) as the baseline for the chest's and head's turns, and the hip height.
  poseReference(man, REF.clip('Idle_Loop'), 0);
  const hipMid0 = W('thigh_l').add(W('thigh_r')).multiplyScalar(0.5);
  const qChest0 = Q('spine_03'), qHead0 = Q('Head');
  const ualLeg = B('calf_l').position.length() + B('foot_l').position.length();
  const marineLeg = MARINE_CHAINS.footL.lengths[0] + MARINE_CHAINS.footL.lengths[1];
  const k = marineLeg / ualLeg;
  const N = Math.max(2, Math.round(clip.length * job.fps));
  const tracks = { pelvis: { pos: [] }, spine: { pos: [], rot: [] }, head: { rot: [] }, footL: { ik: [], pole: [], level: [] }, footR: { ik: [], pole: [], level: [] } };
  let lowest = Infinity;
  const frames = [];
  for (let f = 0; f <= N; f++) {
    const t = (f / N) * clip.length;
    poseReference(man, clip, t);
    const hl = W('thigh_l'), hr = W('thigh_r'), mid = hl.clone().add(hr).multiplyScalar(0.5);
    const al = W('foot_l'), ar = W('foot_r'), kl = W('calf_l'), kr = W('calf_r');
    lowest = Math.min(lowest, al.y, ar.y);
    frames.push({ t, hl, hr, mid, al, ar, kl, kr, qc: Q('spine_03'), qh: Q('Head') });
  }
  const downs = {};
  for (const fr of frames) {
    const t = Math.round(fr.t * 10000) / 10000;
    const dx = (fr.mid.x - hipMid0.x) * k, dy = (fr.mid.y - hipMid0.y) * k;
    tracks.pelvis.pos.push([t, r3([dx, dy, 0]), 'linear']);
    tracks.spine.pos.push([t, r3([dx, MARINE.torsoY + dy, 0]), 'linear']);
    // the chest's turn from rest, as the marine's spine rotation (degrees, XYZ)
    const dc = fr.qc.clone().multiply(qChest0.clone().invert());
    const ec = new THREE.Euler().setFromQuaternion(dc, 'XYZ');
    tracks.spine.rot.push([t, r1([ec.x * D, ec.y * D, ec.z * D]), 'linear']);
    const rel = fr.qc.clone().invert().multiply(fr.qh), rel0 = qChest0.clone().invert().multiply(qHead0);
    const dh = rel.multiply(rel0.invert());   // the head's turn on the chest, from rest
    const eh = new THREE.Euler().setFromQuaternion(dh, 'XYZ');
    tracks.head.rot.push([t, r1([eh.x * D, eh.y * D, eh.z * D]), 'linear']);
    for (const [S, hip, ank, knee, side] of [['L', fr.hl, fr.al, fr.kl, -1], ['R', fr.hr, fr.ar, fr.kr, 1]]) {
      const mHip = new THREE.Vector3(side * MARINE.hipX + dx, MARINE.hipY + dy, 0);
      const target = mHip.clone().add(ank.clone().sub(hip).multiplyScalar(k));
      // Never quite straight: at full stretch the knee's angle swings on a hair's change in the foot (a snap).
      const reach = target.clone().sub(mHip), maxR = marineLeg * 0.93;
      if (reach.length() > maxR) target.copy(mHip).add(reach.setLength(maxR));
      tracks['foot' + S].ik.push([t, r3(target.toArray()), 'linear']);
      const along = ank.clone().sub(hip), mid = hip.clone().add(along.clone().multiplyScalar(0.5));
      const pole = knee.clone().sub(mid); pole.addScaledVector(along.normalize(), -pole.dot(along));
      // A straight leg has no knee direction to read: the knee points ahead, as his always do (no flip at full stretch).
      pole.multiplyScalar(Math.min(1, pole.length() / 0.04) / Math.max(1e-6, pole.length())).add(new THREE.Vector3(0, 0, 0.6));
      tracks['foot' + S].pole.push([t, r3(pole.normalize().toArray()), 'linear']);
      const lv = Math.max(0, Math.min(1, 1 - (ank.y - lowest - 0.03) / 0.2));   // flat as it comes down, eased
      tracks['foot' + S].level.push([t, Math.round(lv * 100) / 100, 'linear']);
      (downs[S] = downs[S] || []).push(ank.y - lowest < 0.04);
    }
  }
  // The idle stands a little turned; the walk faces straight ahead. Keep the chest's and the head's swing and lean,
  // not the idle's stance: their turn (y) and roll (z) are taken about the clip's own mean.
  for (const tr of [tracks.spine.rot, tracks.head.rot]) for (const ax of [1, 2]) {
    const mean = tr.reduce((a, k) => a + k[1][ax], 0) / tr.length;
    for (const k of tr) k[1][ax] = Math.round((k[1][ax] - mean) * 10) / 10;
  }
  // The sole lifts off over a few frames, not in one (a toe-off is fast; the flat-foot hold mustn't snap).
  for (const S of ['L', 'R']) {
    const lv = tracks['foot' + S].level, n = lv.length - 1, src = lv.map((k) => k[1]), w = Math.max(1, Math.round(job.fps / 15));
    for (let i = 0; i <= n; i++) { let a = 0; for (let d = -w; d <= w; d++) a += src[((i + d) % n + n) % n]; lv[i][1] = Math.round(a / (2 * w + 1) * 100) / 100; }
    lv[n][1] = lv[0][1];
  }
  const yawK = job.yaw ?? 1, leanK = job.lean ?? 1;
  tracks.spine.rot.forEach((k, i) => {
    k[1][0] = Math.round(k[1][0] * leanK * 10) / 10; k[1][1] = Math.round(k[1][1] * yawK * 10) / 10;
    const h = tracks.head.rot[i][1];   // eyes ahead: the head turns back against what's left of the chest's swing
    h[0] = Math.round((h[0] * leanK - k[1][0] * 0.5) * 10) / 10; h[1] = Math.round(-k[1][1] * 0.8 * 10) / 10;
  });
  const json = {
    format: 'dw-clip/1', name: job.name, rig: 'marine', length: Math.round(clip.length * 10000) / 10000, loop: true,
    reference: job.from, notes: job.notes, tracks,
    events: (() => {   // a footfall as each foot comes down
      const ev = [];
      for (const S of ['L', 'R']) {
        const lv = tracks['foot' + S].level, dn = downs[S];
        for (let i = 1; i < lv.length; i++) if (dn[i] && !dn[i - 1]) ev.push([lv[i][0], 'footfall', { limb: 'foot' + S }]);
      }
      return ev.sort((a, b) => a[0] - b[0]);
    })()
  };
  loadClip(json);   // refuses anything malformed, with every problem named
  return json;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
  for (const name of want) {
    const job = { name, ...JOBS[name] };
    if (!JOBS[name]) throw new Error(`no job "${name}" (have: ${Object.keys(JOBS).join(', ')})`);
    const json = retarget(job);
    fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(json, null, 1) + '\n');
    console.log(`studio/clips/marine/${name}.json: ${json.length} s from ${job.from}, ${json.tracks.footL.ik.length} keys a foot, ${json.events.length} footfalls`);
  }
}

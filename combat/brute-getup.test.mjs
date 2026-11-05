// combat/brute-getup.test.mjs - GB-277: the live brute's get-up reads the studio's keys.
//   node --import ./studio/node-three.mjs --test combat/brute-getup.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { makeZombieRig } from '../studio/zombie.js';
import { getupSpan, sampleGetupKeys } from '../studio/motion.js';
import { parseBruteGetUp, createBruteGetUp, plantShift, NAMES, BLEND } from './brute-getup.js';

const json = JSON.parse(readFileSync(new URL('../studio/motion/zombie/brute.json', import.meta.url), 'utf8'));
const getup = parseBruteGetUp(json);

// The sampler as studio/motion.js wrote it inline before GB-277 (index of the key pair, smoothstep between), written out here.
function reference(keys, u, name) {
  u = Math.max(0, Math.min(1, u));
  let k = 0; while (k < keys.length - 2 && u > keys[k + 1].t) k++;
  const a = keys[k], b = keys[k + 1];
  let v = (u - a.t) / (b.t - a.t); v = Math.max(0, Math.min(1, v)); v = v * v * (3 - 2 * v);
  const p = a.pose[name] || [0, 0, 0], q = b.pose[name] || [0, 0, 0];
  return p.map((x, i) => x + (q[i] - x) * v);
}

test('GB-277: the pure key sampler gives the keys the get-up has always blended, for every point at many times', () => {
  let worst = 0;
  for (let i = 0; i <= 200; i++) for (const n of NAMES) {
    const u = i / 200, got = sampleGetupKeys(getup.keys, u, n), want = reference(getup.keys, u, n);
    for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(got[c] - want[c]));
  }
  assert.ok(worst < 1e-12, 'worst difference ' + worst);
  // the keys themselves: the first key's own values at 0, the standing zero at 1, and a key's value at its own time
  assert.deepEqual(sampleGetupKeys(getup.keys, 0, 'chest'), getup.keys[0].pose.chest);
  assert.deepEqual(sampleGetupKeys(getup.keys, 1, 'chest'), [0, 0, 0]);
  const mid = sampleGetupKeys(getup.keys, 0.35, 'handL');
  assert.ok(mid.every((x, i) => Math.abs(x - getup.keys[1].pose.handL[i]) < 1e-9), 'the .35 key reads back at .35');
  assert.equal(getupSpan(getup.keys, 0.5).b.t, 0.7);
});

// A brute stand-in on the live mesh's joint layout (index.html makeZombieMesh): every offset times s, the mesh itself unscaled.
function liveBrute(s) {
  const g = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.81 * s; g.add(hips);
  const torso = new THREE.Group(); torso.position.y = 0.28 * s; hips.add(torso);
  const leg = (side) => {
    const L = new THREE.Group(); L.position.set(side * 0.13 * s, -0.02 * s, 0); hips.add(L);
    const sh = new THREE.Group(); sh.position.y = -0.38 * s; L.add(sh); L.userData.shinG = sh; return L;
  };
  const legLG = leg(-1), legRG = leg(1);
  const arm = (side) => {
    const A = new THREE.Group(); A.position.set(side * 0.42 * s, 0.42 * s, 0); torso.add(A);
    const e = new THREE.Group(); e.position.y = -0.34 * s; A.add(e); A.userData.elbowG = e; A.rotation.x = -0.45; return A;
  };
  const armLG = arm(-1), armRG = arm(1);
  const head = new THREE.Group(); head.position.set(0, 0.58 * s, 0); torso.add(head);
  g.userData = { hips, torso, head, armLG, armRG, legLG, legRG };
  return g;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('GB-277: the live brute\'s joints read the keys back; a bone keeps its length; it ends on the animation; restore() gives the joints back', () => {
  const s = 1.38, mesh = liveBrute(s), g = createBruteGetUp(mesh, s, getup);
  mesh.rotation.y = 0.7; mesh.position.set(3, 0, -2); mesh.updateWorldMatrix(true, true);
  const saved = Object.values(mesh.userData).map((j) => j.quaternion.clone());
  const hitH0 = 2.9;
  const bone = (p, a, b) => dist(p[a], p[b]);
  g.pose(0, hitH0); const rest = g.animated();
  const restLen = { thigh: bone(rest, 'hipL', 'kneeL'), shin: bone(rest, 'kneeL', 'footL'), upper: bone(rest, 'shoulderL', 'elbowL'), fore: bone(rest, 'elbowL', 'handL') };
  g.restore();
  mesh.updateWorldMatrix(true, true);
  assert.ok(Object.values(mesh.userData).every((j, i) => j.quaternion.angleTo(saved[i]) < 1e-12), 'restore() puts every joint back');

  const rows = [];
  for (const u of [0, 0.15, 0.35, 0.5, 0.7, 0.85, 1]) {
    mesh.position.set(3, 0, -2);
    const dz = g.plant(u); mesh.position.x += Math.sin(0.7) * dz; mesh.position.z += Math.cos(0.7) * dz;
    g.pose(u, hitH0);
    const live = g.points(), want = g.targets();
    // live in the mesh's frame
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert(), tw = (p) => new THREE.Vector3(...p);
    let worst = 0;
    for (const n of NAMES) worst = Math.max(worst, dist(live[n], want[n]));
    const len = { thigh: bone(live, 'hipL', 'kneeL'), shin: bone(live, 'kneeL', 'footL'), upper: bone(live, 'shoulderL', 'elbowL'), fore: bone(live, 'elbowL', 'handL') };
    for (const k of Object.keys(len)) assert.ok(Math.abs(len[k] - restLen[k]) < 0.005, k + ' keeps its length at u=' + u + ' (' + len[k].toFixed(3) + ' vs ' + restLen[k].toFixed(3) + ')');
    rows.push({ u, worst: +worst.toFixed(3), hitH: +g.hitH.toFixed(2), chestY: +(live.chest[1]).toFixed(2), pelvisY: +(live.pelvis[1]).toFixed(2), shift: +dz.toFixed(2) });
    assert.ok(worst < 0.15, 'at u=' + u + ' every joint is within 15 cm of the (bone-length-kept) keyed target (' + worst.toFixed(3) + ')');
    g.restore();
  }
  if (process.env.GB277_ROWS) console.log(JSON.stringify(rows));
  // the keys' own shape reads in the live groups: hands-and-knees low at .15-.35, chest rising to standing by 1
  const at = (u) => { mesh.position.set(3, 0, -2); const dz = g.plant(u); mesh.position.x += Math.sin(0.7) * dz; mesh.position.z += Math.cos(0.7) * dz; g.pose(u, hitH0); const p = g.points(); g.restore(); return { p, h: g.hitH }; };
  const low = at(0.35), hi = at(0.7), end = at(1);
  const stand = rest.chest[1], standP = rest.pelvis[1];
  assert.ok(low.p.chest[1] < 0.45 * stand && low.p.pelvis[1] < 0.65 * standP, 'at .35 the chest and pelvis are low (chest ' + low.p.chest[1].toFixed(2) + ', pelvis ' + low.p.pelvis[1].toFixed(2) + ')');
  assert.ok(hi.p.chest[1] > low.p.chest[1] + 0.2, 'the chest has come up by .7');
  assert.ok(end.p.chest[1] > 0.97 * stand, 'standing again at 1 (chest ' + end.p.chest[1].toFixed(2) + ')');
  // the animation's own pose is what u=1 hands back
  mesh.position.set(3, 0, -2); g.pose(1, hitH0); const ani = g.animated(), fin = g.points();
  let back = 0; for (const n of NAMES) back = Math.max(back, dist(ani[n], fin[n]));
  assert.ok(back < 0.01, 'at u=1 the joints are where the animation had them (' + back.toFixed(4) + ' m)');
  g.restore();
  // the hit column follows the body: low while down, the full column standing
  assert.ok(low.h < 0.5 * hitH0 && end.h > 0.97 * hitH0 && hi.h > low.h, 'hit height low ' + low.h.toFixed(2) + ', .7 ' + hi.h.toFixed(2) + ', end ' + end.h.toFixed(2));
});
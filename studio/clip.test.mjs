// studio/clip.test.mjs — the clip format and the player (CL-58).
//   node --import ./studio/node-three.mjs --test studio/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { validateClip, loadClip, sampleClip, blendPoses, clipEvents, clipTime, applyPose, createPlayer, EASES } from './clip.js';
import { rigs, rigCost } from './rigs.js';

const base = (tracks, extra = {}) => ({ format: 'dw-clip/1', name: 't', rig: 'guardian', length: 1, tracks, ...extra });
const deg = (q) => new THREE.Euler().setFromQuaternion(q, 'XYZ').x * 180 / Math.PI;

test('a bad clip is refused with every problem named', () => {
  const errs = validateClip({ format: 'x', rig: 'guardian', length: 0, tracks: { spine1: { rot: [[0.5, [1, 2, 3]], [0.2, [1, 2]]], wiggle: [[0, 1]] } } });
  const text = errs.join('\n');
  for (const want of ['"format"', '"name"', '"length"', 'time order', 'must be [x, y, z]', 'unknown channel']) assert.match(text, new RegExp(want.replace(/[[\]]/g, '\\$&')));
  assert.throws(() => loadClip({ format: 'x' }), /is not valid/);
});

test('keys ease between values, hold outside, and step', () => {
  const c = loadClip(base({ spine1: { rot: [[0, [0, 0, 0]], [1, [90, 0, 0], 'linear']] }, jaw: { rot: [[0, [0, 0, 0]], [0.5, [40, 0, 0], 'step']] } }));
  assert.ok(Math.abs(deg(sampleClip(c, 0.5).joints.spine1.rot) - 45) < 1e-6);
  assert.ok(Math.abs(deg(sampleClip(c, 2).joints.spine1.rot) - 90) < 1e-6);
  assert.ok(Math.abs(deg(sampleClip(c, 0.49).joints.jaw.rot)) < 1e-6);
  assert.equal(Math.round(deg(sampleClip(c, 0.5).joints.jaw.rot)), 40);
  assert.ok(EASES.back(0.7) > 1, 'back overshoots');
});

test('loops wrap time and events', () => {
  const c = loadClip(base({ spine1: { rot: [[0, [0, 0, 0]]] } }, { loop: true, events: [[0.25, 'footfall'], [0.75, 'footfall']] }));
  assert.equal(clipTime(c, 2.25), 0.25);
  assert.deepEqual(clipEvents(c, 0.5, 1.5).map((e) => e.t), [0.75, 0.25]);
  const once = loadClip(base({ spine1: { rot: [[0, [0, 0, 0]]] } }, { events: [[0.25, 'grab']] }));
  assert.equal(clipEvents(once, 0, 3).length, 1);
});

test('blending two poses slerps rotations and mixes targets', () => {
  const a = loadClip(base({ spine1: { rot: [[0, [0, 0, 0]]] }, handR: { ik: [[0, [0, 0, 1]]] } }));
  const b = loadClip(base({ spine1: { rot: [[0, [60, 0, 0]]] }, handR: { ik: [[0, '@ankle']] } }));
  const m = blendPoses(sampleClip(a, 0), sampleClip(b, 0), 0.5);
  assert.ok(Math.abs(deg(m.joints.spine1.rot) - 30) < 1e-6);
  assert.equal(m.chains.handR.ik.length, 2);
});

test('the guardian builds, has a rest pose and stays in budget', () => {
  const inst = rigs.get('guardian').create({ scale: 1 });
  const cost = rigCost(inst.group);
  const bud = rigs.def('guardian').budget;
  assert.ok(cost.draws <= bud.draws && cost.triangles <= bud.triangles, JSON.stringify(cost));
  // On all fours at rest: hands and feet on the ground.
  const w = (n) => new THREE.Vector3().setFromMatrixPosition(inst.R[n].matrixWorld);
  inst.group.updateWorldMatrix(true, true);
  for (const n of ['wristL', 'wristR', 'ankleL', 'ankleR']) assert.ok(w(n).y < 0.25, n + ' on the ground: ' + w(n).y.toFixed(2));
});

test('a hand goes to a live target, wherever the rig stands', () => {
  const inst = rigs.get('guardian').create({ scale: 1.3 });
  inst.group.position.set(5, 0, -3); inst.group.rotation.y = 0.7;
  const c = loadClip(base({ handR: { ik: [[0, '@ankle']] } }));
  inst.group.updateWorldMatrix(true, true);
  // Somewhere well inside the arm's reach: out from the shoulder, forward and down.
  const sh = new THREE.Vector3().setFromMatrixPosition(inst.R.shoulderR.matrixWorld);
  const ankle = sh.clone().add(new THREE.Vector3(0.9, -1.4, 0.8));
  applyPose(inst, sampleClip(c, 0), { targets: { ankle } });
  const wr = new THREE.Vector3().setFromMatrixPosition(inst.R.wristR.matrixWorld);
  assert.ok(wr.distanceTo(ankle) < 0.02, 'wrist on the ankle: ' + wr.distanceTo(ankle).toFixed(3) + ' m');
});

test('a planted foot stays put while the body moves over it', () => {
  const inst = rigs.get('guardian').create({ scale: 1 });
  const c = loadClip(base({ footL: { ik: [[0, [-0.34, 0.1, 0.4]], [1, [-0.34, 0.1, -0.6], 'linear']], plant: [[0, 1]] } }));
  const p = createPlayer(inst).play(c);
  p.update(0);
  const at0 = new THREE.Vector3().setFromMatrixPosition(inst.R.ankleL.matrixWorld);
  p.update(0.5);
  const at1 = new THREE.Vector3().setFromMatrixPosition(inst.R.ankleL.matrixWorld);
  assert.ok(at0.distanceTo(at1) < 0.01, 'slid ' + at0.distanceTo(at1).toFixed(3));
});

test('a held foot lets go of its plant by as much as it is held, and blends turn the short way', () => {
  const inst = rigs.get('guardian').create({ scale: 1 });
  const c = loadClip(base({ footL: { ik: [[0, [-0.34, 0.1, 0.4]], [1, [-0.34, 0.1, -0.6], 'linear']], plant: [[0, 1]] } }));
  const ankle = () => new THREE.Vector3().setFromMatrixPosition(inst.R.ankleL.matrixWorld);
  applyPose(inst, sampleClip(c, 0), {});
  const pin = ankle();
  // A quarter held (plant 0.75) is still half on its pin; fully held, it goes where the clip wants it.
  applyPose(inst, sampleClip(c, 0.5), { free: { footL: 0.25 } });
  const quarter = ankle();
  applyPose(inst, sampleClip(c, 0.5), { free: { footL: 1 } });
  const loose = ankle();
  assert.ok(quarter.distanceTo(pin) < loose.distanceTo(pin) - 0.05, 'a quarter hold still mostly pinned: ' + quarter.distanceTo(pin).toFixed(2) + ' vs ' + loose.distanceTo(pin).toFixed(2));
  // q and -q are the same turn: a half blend toward either is 45° from where it started.
  const q90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const neg = new THREE.Quaternion(-q90.x, -q90.y, -q90.z, -q90.w);
  const a = blendPoses({ joints: { j: { rot: new THREE.Quaternion() } }, chains: {}, head: {} }, { joints: { j: { rot: neg } }, chains: {}, head: {} }, 0.5).joints.j.rot;
  assert.ok(Math.abs(2 * Math.acos(Math.min(1, Math.abs(a.w))) - Math.PI / 4) < 0.01, 'half blend turned ' + (2 * Math.acos(Math.abs(a.w)) * 180 / Math.PI).toFixed(1) + '°');
});

// The snap measure (the biggest one-frame joint turn at 60 fps; over 0.3 rad reads as a pop) is what
// the renderer reports for Jerry. It's printed here, not asserted: the baked v1 gallop snaps at the
// hips (1.2 rad), exactly as the CL-56 code did, and that is one of the things CL-62 fixes.
test('every guardian clip on disk loads and plays through with a finite pose', () => {
  const dir = new URL('./clips/guardian/', import.meta.url);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 7, files.join(', '));
  for (const f of files) {
    const clip = loadClip(JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')));
    const inst = rigs.get('guardian').create({ scale: 1 });
    const stage = (JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')).stage) || rigs.def('guardian').stage.targets;
    const targets = Object.fromEntries(Object.entries(stage).map(([k, v]) => [k, new THREE.Vector3(...v)]));
    const player = createPlayer(inst).play(clip);
    const prev = new Map();
    let worst = 0, where = '';
    const steps = Math.ceil(clip.length * 60);
    for (let i = 0; i <= steps; i++) {
      player.update(i === 0 ? 0 : clip.length / steps, { targets });
      for (const j of inst.def ? Object.values(inst.R).filter((o) => o && o.isObject3D) : []) {
        const q = prev.get(j);
        if (q) { const a = 2 * Math.acos(Math.min(1, Math.abs(q.dot(j.quaternion)))); if (a > worst) { worst = a; where = j.name + ' at ' + (i / 60).toFixed(2); } }
        prev.set(j, j.quaternion.clone());
      }
    }
    assert.ok(Number.isFinite(worst), f + ': pose went non-finite');
    for (const o of Object.values(inst.R)) if (o && o.isObject3D) assert.ok(Number.isFinite(o.quaternion.w), f + ': ' + o.name + ' is NaN');
    console.log(`  ${f.padEnd(12)} worst one-frame turn ${worst.toFixed(2)} rad (${where})${worst > 0.3 ? '  SNAP' : ''}`);
  }
});

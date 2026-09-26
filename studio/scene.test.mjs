// studio/scene.test.mjs — scenes (D-41, CL-63).   node --import ./studio/node-three.mjs --test "studio/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { validateScene, loadScene, createScene } from './scene.js';
import { rigs } from './rigs.js';
import { MARINE, makeMarineRig } from './marine.js';

const clipFile = (ref) => JSON.parse(fs.readFileSync(new URL(`./clips/${ref}.json`, import.meta.url), 'utf8'));
const w = (o) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
const still = (rig) => ({ format: 'dw-clip/1', name: 'still', rig, length: 1, loop: true, tracks: { [rig === 'marine' ? 'spine' : 'spine1']: { rot: [[0, [0, 0, 0]]] } } });
const clips = (extra = {}) => (ref) => extra[ref] || (ref.endsWith('/still') ? still(ref.split('/')[0]) : clipFile(ref));
const base = (over = {}) => ({
  format: 'dw-scene/1', name: 't', length: 2,
  actors: { marine: { rig: 'marine', at: [0, 0, 0], clips: [[0, 'marine/still']] } },
  ...over
});

test('a bad scene is refused with every problem named', () => {
  const errs = validateScene({
    format: 'x', length: 0,
    actors: {
      a: { rig: 'dragon', path: 'nowhere', clips: [] },
      b: { rig: 'marine', clips: [[0, 'marine/still']] },
      c: { rig: 'guardian', clips: [[0, 'guardian/stand']] }
    },
    holds: [
      { from: 'b.footL', to: 'c.handR', reach: [[0, 1]] },
      { from: 'c.tail', to: 'b.head', lift: [[0, 1]] },
      { from: 'c.handR', to: 'b.footL' }
    ]
  }).join('\n');
  for (const want of ['"format"', '"name"', '"length"', 'registered rig', 'no path "nowhere"', '"clips" needs', 'not a limb of guardian', '"lift" needs "to" to be a limb', 'give at least one of reach, tow, lift']) assert.ok(text(errs).includes(want), 'missing: ' + want + '\n' + errs);
  // Holds that go round in a loop can't be played.
  const loop = validateScene(base({
    actors: { a: { rig: 'marine', at: [0, 0, 0], clips: [[0, 'marine/still']] }, b: { rig: 'marine', at: [1, 0, 0], clips: [[0, 'marine/still']] } },
    holds: [{ from: 'a.handR', to: 'b.footL', reach: [[0, 1]] }, { from: 'b.handR', to: 'a.footL', reach: [[0, 1]] }]
  }));
  assert.match(loop.join('\n'), /loop/);
  assert.throws(() => loadScene(base({ actors: { m: { rig: 'marine', at: [0, 0, 0], clips: [[0, 'marine/nope']] } } }), () => null), /marine\/nope/);
});
const text = (s) => String(s);

test('actors travel their path at its speed, face along it, and keep their spacing', () => {
  const sc = loadScene(base({
    actors: {
      lead: { rig: 'marine', path: 'p', clips: [[0, 'marine/still']] },
      back: { rig: 'marine', path: 'p', along: -1.5, side: 0.5, face: 'back', clips: [[0, 'marine/still']] }
    },
    paths: { p: { points: [[0, 0, 0], [0, 0, 20]], speed: [[0, 2]] } }
  }), clips());
  const sp = createScene(sc);
  const r = sp.seek(1);
  const lead = sp.actors.lead.inst.group, back = sp.actors.back.inst.group;
  assert.ok(Math.abs(w(lead).z - 2) < 1e-3, 'lead at 2 m: ' + w(lead).z);
  assert.ok(Math.abs(w(back).z - 0.5) < 1e-3, 'back 1.5 m behind: ' + w(back).z);
  assert.ok(Math.abs(w(back).x + 0.5) < 1e-3, 'side is to the right (-X when facing +Z): ' + w(back).x);
  const fwd = new THREE.Vector3(0, 0, 1);
  assert.ok(fwd.clone().applyQuaternion(lead.getWorldQuaternion(new THREE.Quaternion())).z > 0.99, 'lead faces +Z');
  assert.ok(fwd.clone().applyQuaternion(back.getWorldQuaternion(new THREE.Quaternion())).z < -0.99, 'back faces -Z');
  assert.ok(Math.abs(r.checks.speed.lead.value - 2) < 0.01, 'measured speed ' + r.checks.speed.lead.value);
});

test('a stride plays the clip at the ground speed', () => {
  const walk = { ...still('marine'), name: 'walk', length: 0.8 };
  const sc = loadScene(base({
    actors: { m: { rig: 'marine', path: 'p', clips: [[0, 'marine/walk', { stride: 1.6 }]] } },
    paths: { p: { points: [[0, 0, 0], [0, 0, 20]], speed: [[0, 3]] } }
  }), clips({ 'marine/walk': walk }));
  const sp = createScene(sc);
  sp.update(1 / 60);
  assert.ok(Math.abs(sp.actors.m.rate - (3 * 0.8) / 1.6) < 1e-9, 'rate ' + sp.actors.m.rate);
});

test('a hand reaches a joint on another body, wherever that body is', () => {
  const sc = loadScene(base({
    actors: {
      marine: { rig: 'marine', at: [0.4, 0, 1.2], face: 90, clips: [[0, 'marine/still']] },
      guardian: { rig: 'guardian', at: [0, 0, 0], clips: [[0, 'guardian/stand']] }
    },
    holds: [{ from: 'guardian.handR', to: 'marine.footL', reach: [[0, 1]] }]
  }), clips());
  const sp = createScene(sc);
  const r = sp.seek(0.5);
  const gap = w(sp.actors.guardian.inst.R.wristR).distanceTo(w(sp.actors.marine.inst.R.ankleL));
  assert.ok(gap < 0.02, 'hand on the ankle: ' + gap.toFixed(3));
  assert.ok(r.checks.gap['guardian.handR>marine.footL'].value < 0.02);
});

test('a towed body follows the hand, and its held leg is lifted to it', () => {
  const sc = loadScene(base({
    actors: {
      marine: { rig: 'marine', path: 'p', along: -1.2, tilt: [[0, [-80, 0, 0]]], rise: [[0, 0.12]], clips: [[0, 'marine/lie']] },
      guardian: { rig: 'guardian', path: 'p', clips: [[0, 'guardian/stand']] }
    },
    paths: { p: { points: [[0, 0, 0], [0, 0, 20]], speed: [[0, 0], [0.3, 1.5]] } },
    holds: [{ from: 'guardian.handR', to: 'marine.footL', tow: [[0, 1]], lift: [[0, 1]] }]
  }), clips());
  const sp = createScene(sc);
  const r = sp.seek(1.5);
  const hand = w(sp.actors.guardian.inst.R.wristR), ank = w(sp.actors.marine.inst.R.ankleL);
  assert.ok(Math.hypot(hand.x - ank.x, hand.z - ank.z) < 0.02, 'ankle under the hand: ' + Math.hypot(hand.x - ank.x, hand.z - ank.z).toFixed(3));
  // The check reports what's left (the leg may not reach the hand's height) instead of hiding it.
  const g = r.checks.gap['guardian.handR>marine.footL'];
  assert.ok(Math.abs(g.value - hand.distanceTo(ank)) < 1e-6);
  assert.ok(r.checks.speed.marine.value > 1.4, 'the marine travels with it: ' + r.checks.speed.marine.value);
});

// A foot swept back under the body for half the clip, then picked up, carried forward and set down. With the stride that
// matches the sweep the foot holds still on the ground; with half that stride it glides.
test('feet on the ground: a matched stride holds, a wrong one is caught sliding', () => {
  const inst = rigs.get('guardian').create({ scale: 1 });
  inst.group.updateWorldMatrix(true, true);
  const rest = w(inst.R.ankleL);
  const step = { format: 'dw-clip/1', name: 'step', rig: 'guardian', length: 1, loop: true, tracks: {
    footL: { ik: [[0, [rest.x, 0, rest.z + 0.5]], [0.5, [rest.x, 0, rest.z - 0.5], 'linear'], [0.56, [rest.x, 0.15, rest.z - 0.5], 'linear'],
      [0.75, [rest.x, 0.35, rest.z], 'linear'], [0.94, [rest.x, 0.15, rest.z + 0.5], 'linear'], [1, [rest.x, 0, rest.z + 0.5], 'linear']] }
  } };
  const run = (stride) => {
    const sc = loadScene(base({
      actors: { g: { rig: 'guardian', path: 'p', scale: 1, clips: [[0, 'guardian/step', { stride }]] } },
      paths: { p: { points: [[0, 0, 0], [0, 0, 40]], speed: [[0, 1.5]] } }
    }), clips({ 'guardian/step': step }));
    const sp = createScene(sc);
    sp.seek(3);
    return sp.worst['slide:g.footL'] ? sp.worst['slide:g.footL'].value : 0;
  };
  const good = run(2), bad = run(1);
  assert.ok(good < 0.08, 'matched stride slides ' + good.toFixed(3));
  assert.ok(bad > 0.3, 'half stride slides ' + bad.toFixed(3));
});

test('seek gives the same pose every time', () => {
  const sc = loadScene(JSON.parse(fs.readFileSync(new URL('./scenes/demo-drag.json', import.meta.url), 'utf8')), clips());
  const sp = createScene(sc);
  const snap = () => Object.values(sp.actors).flatMap((a) => Object.values(a.inst.R).filter((j) => j && j.isObject3D).map((j) => j.quaternion.toArray().map((x) => x.toFixed(6)).join()));
  sp.seek(1.3); const a = snap();
  sp.seek(2.2); sp.seek(1.3); const b = snap();
  assert.deepEqual(a, b);
});

test('the game marine is adopted where it hangs, and the stand-in matches its joints', () => {
  // index.html's makeMarine() still has the offsets studio/marine.js copied.
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const s of ['legG.position.set(side * 0.13, 0.62, 0)', 'knee.position.set(0, -0.27, 0)', 'ankle.position.set(0, -0.25, 0.01)', 'const TORSO_PIVOT_Y = 0.7', 'armG.position.set(side * 0.34, 1.08 - TORSO_PIVOT_Y, 0.02)', 'elbowG.position.set(0, -0.28, 0)', 'gripL.position.set(0.02, -0.27, 0.13)', 'gripR.position.set(-0.01, -0.26, 0.12)', 'const HEAD_PIVOT_Y = 1.22'])
    assert.ok(html.includes(s), 'makeMarine changed: ' + s + ' (update MARINE in studio/marine.js)');
  assert.equal(MARINE.hipY, 0.62);
  // A stand-in for the game's marine: the same joints under the names makeMarine() gives them,
  // hung off a moved, turned parent like the player's roll pivot.
  const g = makeMarineRig(), R = g.userData.rig;
  Object.assign(g.userData, { lowerBody: R.pelvis, legLG: R.hipL, kneeLG: R.kneeL, ankleLG: R.ankleL, legRG: R.hipR, kneeRG: R.kneeR, ankleRG: R.ankleR, torsoG: R.spine, armLG: R.shoulderL, elbowLG: R.elbowL, gripL: R.handL, armRG: R.shoulderR, elbowRG: R.elbowR, gripR: R.handR, headG: R.head });
  delete g.userData.rig;
  const player = new THREE.Group(); player.position.set(10, 0, -4); player.rotation.y = 1.1;
  const pivot = new THREE.Group(); pivot.position.y = 0.7; player.add(pivot); pivot.add(g);
  const body = rigs.get('marine').create({ group: g });
  assert.equal(body.R.ankleL, R.ankleL);
  assert.throws(() => rigs.get('marine').create({ group: new THREE.Group() }), /not a game marine/);
  const sc = loadScene(base({ actors: { marine: { rig: 'marine', at: [2, 0, 3], face: 0, clips: [[0, 'marine/still']] } } }), clips());
  const sp = createScene(sc, { bodies: { marine: body } });
  sp.seek(0.1);
  const at = g.getWorldPosition(new THREE.Vector3());
  assert.ok(at.distanceTo(new THREE.Vector3(2, 0, 3)) < 1e-6, 'placed in the scene, whatever its parent: ' + at.toArray());
  assert.equal(g.parent, pivot, 'left where the game hung it');
});

test('a body can face another, then turn to its path; lunge from "at" onto the path', () => {
  const sc = loadScene(base({
    actors: {
      marine: { rig: 'marine', at: [0, 0, 0], face: 180, clips: [[0, 'marine/still']] },
      guardian: {
        rig: 'guardian', path: 'haul', at: [[0, [0, 0, 3]], [0.5, [0, 0, 2]]], onPath: [[0.5, 0], [1, 1]],
        aim: { at: 'marine', w: [[0, 1], [0.6, 1], [1.2, 0]] }, clips: [[0, 'guardian/stand']]
      }
    },
    paths: { haul: { points: [[0, 0, 2], [0, 0, 20]], speed: [[0, 0], [1, 0], [1.5, 2]] } }
  }), clips());
  const sp = createScene(sc);
  const g = sp.actors.guardian.inst.group;
  const fwd = () => new THREE.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
  sp.seek(0.3);
  assert.ok(fwd().z < -0.99, 'faces the marine (−Z) while it lunges: ' + fwd().z.toFixed(2));
  assert.ok(w(g).z < 3 && w(g).z > 2, 'coming in from "at": ' + w(g).z.toFixed(2));
  sp.seek(1.4);
  assert.ok(fwd().z > 0.99, 'turned to go (+Z): ' + fwd().z.toFixed(2));
  sp.seek(2);
  assert.ok(Math.abs(w(g).z - 3.5) < 0.05, 'hauling along the path (0.5 m in the ramp, 1 m at 2 m/s): ' + w(g).z.toFixed(2));
});

test('the host lays the path, gives the ground, and hands its body over smoothly', () => {
  const sc = loadScene(base({
    actors: { m: { rig: 'marine', path: 'p', clips: [[0, 'marine/still']] } },
    paths: { p: { points: [[0, 0, 0], [0, 0, 5]], speed: [[0, 1]] } }
  }), clips());
  const parent = new THREE.Group(); parent.position.set(100, 3, 50); parent.rotation.y = Math.PI / 2;
  const sp = createScene(sc, {
    parent,
    paths: { p: [[0, 0, 0], [4, 0, 0]] },                       // along scene +X instead
    ground: (x, z) => 3 + 0.1 * (x - 100),                       // a slope, in world metres
    enter: { m: { position: new THREE.Vector3(100, 3, 49), yaw: 0, time: 0.5 } }
  });
  const m = sp.actors.m.inst.group;
  sp.seek(0);
  assert.ok(w(m).distanceTo(new THREE.Vector3(100, 3, 49)) < 1e-6, 'starts where the host had it');
  const r = sp.seek(1);
  // Scene +X is world −Z under a parent turned 90°: one metre along the path.
  const want = new THREE.Vector3(100, 0, 49);
  want.y = 3 + 0.1 * (want.x - 100);
  assert.ok(w(m).distanceTo(want) < 1e-3, 'on the laid path and the ground: ' + w(m).toArray().map((x) => x.toFixed(3)));
  assert.equal(sp.path('p').total, 4);
  assert.ok(Math.abs(sp.path('p').distance - 1) < 1e-3);
  assert.ok(r.checks.speed.m.value > 0.9);
});

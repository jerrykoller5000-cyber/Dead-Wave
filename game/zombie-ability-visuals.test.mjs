import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import {
  attachZombieAbilityVisuals,
  resetZombieAbilityVisuals,
  updateZombieAbilityVisuals,
  getZombieAbilityLaunch
} from './zombie-ability-visuals.js';

// The real sculpted zombie uses these shoulder/elbow/palm coordinates. A small
// actual THREE hierarchy exercises transforms without Chrome or a fake renderer.
function zombie(typeKey, scale = 1) {
  const mesh = new THREE.Group(), torso = new THREE.Group();
  mesh.add(torso); mesh.userData.torso = torso;
  const shoulder = typeKey === 'demon' ? .42 : .32;
  for (let side = 0; side < 2; side++) {
    const arm = new THREE.Group(), elbow = new THREE.Group();
    arm.position.set((side ? 1 : -1) * shoulder * scale, .42 * scale, 0);
    arm.scale.set(typeKey === 'demon' ? 1.18 : 1.25, typeKey === 'demon' ? 1.12 : 1.15, typeKey === 'demon' ? 1.18 : 1.25);
    elbow.position.y = -.34 * scale;
    arm.add(elbow); arm.userData.elbowG = elbow; torso.add(arm);
    mesh.userData[side ? 'armRG' : 'armLG'] = arm;
  }
  const z = { mesh, alive: true, typeKey, partsLost: {} };
  const rig = attachZombieAbilityVisuals(THREE, mesh, typeKey, scale);
  return { z, rig, scale };
}

function legacyPose(rig) {
  for (const arm of rig.arms) {
    arm.rotation.set(-.45, 0, 0);
    arm.userData.elbowG.rotation.set(0, 0, 0);
  }
}

// Transparent DoubleSide materials normally need two WebGL passes. Include
// that cost so a second flame pass cannot silently defeat the crowd budget.
function extraDraws(mesh) {
  let draws = 0;
  mesh.traverseVisible(node => {
    if (!node.isMesh) return;
    assert(!Array.isArray(node.material), 'ability props should use one material per draw');
    draws += node.material.transparent && node.material.side === THREE.DoubleSide && !node.material.forceSinglePass ? 2 : 1;
  });
  return draws;
}

function pointNear(actual, expected, epsilon = 1e-7) {
  assert(actual.toArray().every(Number.isFinite), 'launch coordinates must stay finite');
  assert(actual.distanceTo(expected) < epsilon, `launch drift: ${actual.distanceTo(expected)}`);
}

test('a 48-body mixed crowd adds at most 36 idle ability draws', () => {
  let draws = 0;
  for (let i = 0; i < 12; i++) {
    for (const kind of ['demon', 'colossus']) {
      const { z, rig, scale } = zombie(kind, kind === 'colossus' ? 1.8 : 1.15);
      assert.equal(attachZombieAbilityVisuals(THREE, z.mesh, kind, scale), rig, 'reusing a body must not duplicate props');
      updateZombieAbilityVisuals(z, 0, { stage: 'idle' });
      draws += extraDraws(z.mesh);
    }
  }
  // Twelve spitters and twelve shamblers do not acquire attached ability props.
  assert(draws <= 36, `extra crowd draw budget exceeded: ${draws}`);
});

test('flame fists use a single transparent pass and stay attached while casting', () => {
  const { z, rig, scale } = zombie('demon', 1.15);
  z.mesh.position.set(8, 2, -4); z.mesh.rotation.set(.13, 1.2, -.05);
  z.mesh.scale.set(1.04, .96, .99);
  for (const anchor of rig.flameAnchors) {
    anchor.traverse(node => {
      if (node.isMesh && node.material.transparent && node.material.side === THREE.DoubleSide) assert.equal(node.material.forceSinglePass, true);
    });
  }
  for (let frame = 0; frame < 100; frame++) {
    legacyPose(rig);
    updateZombieAbilityVisuals(z, frame / 60, { kind: 'fireball', stage: 'windup', progress: frame / 99 });
    const actual = new THREE.Vector3();
    assert.equal(getZombieAbilityLaunch(z, 'fireball', actual), true);
    const expected = new THREE.Vector3(0, -.354 * scale, .02 * scale);
    rig.elbows[1].localToWorld(expected); pointNear(actual, expected);
    assert.equal(extraDraws(z.mesh), 2);
    for (const anchor of rig.flameAnchors) {
      anchor.traverse(node => {
        if (node.isMesh) assert([...node.geometry.attributes.position.array].every(Number.isFinite));
      });
    }
  }
});

test('a demon casts and launches from its surviving arm after either kind of limb loss', () => {
  for (const lostSide of [0, 1]) {
    for (const detection of ['partsLost', 'visibility']) {
      const { z, rig, scale } = zombie('demon');
      const side = 1 - lostSide;
      if (detection === 'partsLost') z.partsLost[lostSide ? 'armR' : 'armL'] = true;
      else rig.arms[lostSide].visible = false;
      legacyPose(rig);
      const lostRest = rig.arms[lostSide].quaternion.clone(), castRest = rig.arms[side].quaternion.clone();
      updateZombieAbilityVisuals(z, 1, { kind: 'fireball', stage: 'windup', progress: 1 });
      assert(rig.arms[side].quaternion.angleTo(castRest) > .1, 'the available arm must perform the cast');
      assert(rig.arms[lostSide].quaternion.angleTo(lostRest) < 1e-7, 'the missing arm must keep its pose');
      const actual = new THREE.Vector3(), expected = new THREE.Vector3(0, -.354 * scale, .02 * scale);
      assert.equal(getZombieAbilityLaunch(z, 'fireball', actual), true);
      rig.elbows[side].localToWorld(expected); pointNear(actual, expected);
      assert.equal(extraDraws(z.mesh), 1, 'a missing fist must not draw fire');
    }
  }
  const { z, rig } = zombie('demon');
  z.partsLost = { armL: true, armR: true };
  updateZombieAbilityVisuals(z, 0, { kind: 'fireball', stage: 'windup', progress: 1 });
  assert.equal(getZombieAbilityLaunch(z, 'fireball', new THREE.Vector3()), false);
  assert.equal(extraDraws(z.mesh), 0);
  assert(rig.flameAnchors.every(anchor => !anchor.visible));
});

for (const kind of ['demon', 'colossus']) {
  test(`${kind} death hides active props without changing corpse pose, and pooling restores the idle budget`, () => {
    const { z, rig } = zombie(kind);
    legacyPose(rig);
    updateZombieAbilityVisuals(z, 1, { kind: kind === 'demon' ? 'fireball' : 'stone', stage: 'windup', progress: 1, slot: 1 });
    const joints = [rig.torso, ...rig.arms, ...rig.elbows];
    const pose = joints.map(joint => joint.quaternion.clone());
    z.alive = false; updateZombieAbilityVisuals(z, 2, null);
    for (let i = 0; i < joints.length; i++) assert(joints[i].quaternion.angleTo(pose[i]) < 1e-7);
    assert.equal(getZombieAbilityLaunch(z, kind === 'demon' ? 'fireball' : 'stone', new THREE.Vector3()), false);
    if (kind === 'demon') assert.equal(extraDraws(z.mesh), 0);
    else assert.equal(rig.heldRock.visible, false);
    // Mirror the legacy reset which first turns every pooled child visible.
    z.mesh.traverse(node => { node.visible = true; });
    z.partsLost = {}; z.mesh.userData.partsLost = {}; z.alive = true;
    resetZombieAbilityVisuals(z.mesh);
    assert.equal(extraDraws(z.mesh), kind === 'demon' ? 2 : 1);
    if (rig.heldRock) assert.equal(rig.heldRock.visible, false);
  });
}

for (const scale of [.75, 1, 1.8]) {
  test(`colossus stone grab and release keep one continuous launch position at sculpture scale ${scale}`, () => {
    for (const slot of [0, 1, 2]) {
      const { z, rig } = zombie('colossus', scale);
      z.mesh.position.set(8, 3, -5); z.mesh.rotation.set(.08, 1.2, -.04); z.mesh.scale.set(1.04, .96, .99);
      legacyPose(rig);
      updateZombieAbilityVisuals(z, 0, { kind: 'stone', stage: 'windup', progress: .1, slot });
      assert.equal(rig.heldRock.visible, false, 'a stone stays on the back until the hands reach it');
      assert.equal(rig.backRocks[slot].visible, true);
      for (let frame = 0; frame <= 30; frame++) {
        legacyPose(rig);
        updateZombieAbilityVisuals(z, frame / 30, { kind: 'stone', stage: 'windup', progress: frame / 30, slot });
        if (frame >= 10) {
          assert.equal(rig.heldRock.visible, true);
          assert.equal(rig.backRocks[slot].visible, false, 'a carried stone must disappear from its rack');
        }
      }
      const carried = new THREE.Vector3(), released = new THREE.Vector3();
      assert.equal(getZombieAbilityLaunch(z, 'stone', carried), true);
      legacyPose(rig);
      updateZombieAbilityVisuals(z, 1.01, { kind: 'stone', stage: 'recovery', progress: 0, slot, release: true });
      assert.equal(getZombieAbilityLaunch(z, 'stone', released), true);
      pointNear(released, carried);
      assert.equal(rig.heldRock.visible, false);
    }
  });
}

test('missing and replenishing stones switch carrier rendering without duplicate idle draws', () => {
  const { z, rig } = zombie('colossus', 1.8);
  assert.equal(extraDraws(z.mesh), 1);
  legacyPose(rig);
  updateZombieAbilityVisuals(z, 1, { kind: 'stone', stage: 'windup', progress: 1, slot: 1 });
  assert.equal(extraDraws(z.mesh), 5, 'carrying draws the frame, straps, remaining stock and held stone once');
  legacyPose(rig);
  updateZombieAbilityVisuals(z, 1.01, { kind: 'stone', stage: 'recovery', progress: 0, slot: 1, release: true });
  assert.equal(extraDraws(z.mesh), 4, 'release removes the carried draw');
  updateZombieAbilityVisuals(z, 7.01, { stage: 'idle' });
  assert.equal(rig.backRocks[1].visible, false);
  assert.equal(extraDraws(z.mesh), 4, 'an empty stock slot must not be replaced by the full-stock batch');
  updateZombieAbilityVisuals(z, 8.01, { stage: 'idle' });
  assert.equal(rig.backRocks[1].visible, true);
  assert(rig.backRocks[1].scale.x > 0 && rig.backRocks[1].scale.x < rig.backRocks[0].scale.x);
  assert.equal(extraDraws(z.mesh), 5, 'a growing replacement keeps individual stock rendering');
  updateZombieAbilityVisuals(z, 9.01, { stage: 'idle' });
  assert.equal(extraDraws(z.mesh), 1, 'a replenished idle carrier returns to one batch');
  assert(rig.backRocks.every(rock => rock.visible));
});

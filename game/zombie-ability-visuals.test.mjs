import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import {
  attachZombieAbilityVisuals,
  resetZombieAbilityVisuals,
  updateZombieAbilityVisuals,
  getZombieAbilityLaunch,
  getZombieAbilityRock,
  getZombieAbilityRockRadius,
  COLOSSUS_ROCK
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

test('new demon flames are on both palms before the first animation tick', () => {
  const { z, rig, scale } = zombie('demon', 1.15);
  z.mesh.position.set(8, 2, -4);
  z.mesh.rotation.y = 1.2;
  z.mesh.updateMatrixWorld(true);
  for (let i = 0; i < 2; i++) {
    const instance = new THREE.Matrix4();
    rig.flameBatch.getMatrixAt(i, instance);
    const actual = new THREE.Vector3().setFromMatrixPosition(instance.premultiply(z.mesh.matrixWorld));
    const expected = new THREE.Vector3(0, -.354 * scale, .02 * scale);
    rig.elbows[i].localToWorld(expected);
    pointNear(actual, expected, 1e-6);
  }
});

test('flame fists use a single transparent pass and stay attached while casting', () => {
  const { z, rig, scale } = zombie('demon', 1.15);
  z.mesh.position.set(8, 2, -4); z.mesh.rotation.set(.13, 1.2, -.05);
  z.mesh.scale.set(1.04, .96, .99);
  assert(rig.flameBatch.isInstancedMesh && rig.flameBatch.count === 2);
  assert.equal(rig.flameBatch.material.forceSinglePass, true);
  for (let frame = 0; frame < 100; frame++) {
    legacyPose(rig);
    updateZombieAbilityVisuals(z, frame / 60, { kind: 'fireball', stage: 'windup', progress: frame / 99 });
    const actual = new THREE.Vector3();
    assert.equal(getZombieAbilityLaunch(z, 'fireball', actual), true);
    const expected = new THREE.Vector3(0, -.354 * scale, .02 * scale);
    rig.elbows[1].localToWorld(expected); pointNear(actual, expected);
    assert.equal(extraDraws(z.mesh), 1);
    assert([...rig.flameBatch.geometry.attributes.position.array].every(Number.isFinite));
    for (let i = 0; i < 2; i++) {
      const matrix = new THREE.Matrix4(); rig.flameBatch.getMatrixAt(i, matrix);
      assert([...matrix.elements].every(Number.isFinite), 'both fists keep finite instance transforms');
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
    assert.equal(extraDraws(z.mesh), kind === 'demon' ? 1 : 2);   // D-244: the colossus idles with sack + rope belt
    if (rig.heldRock) assert.equal(rig.heldRock.visible, false);
  });
}

// D-244 (Jerry): no back rack or back stones. He pulls rocks (~2x his fist) out of one sack on his right hip and
// pitches them with the right hand.
test('the colossus carries one sack and a rope belt, no rack or back stones', () => {
  const { z, rig, scale } = zombie('colossus', 1.8);
  const names = []; z.mesh.traverse(node => names.push(node.name));
  assert(!names.some(name => /rack|carrier|back-stone/.test(name)), 'the old stone rack must be gone: ' + names.join(','));
  const sack = z.mesh.getObjectByName('colossus-sack');
  assert(sack && sack.parent === rig.torso, 'the sack is one group on the torso');
  assert(sack.position.x > 0 && sack.position.z < 0, 'it hangs on his right hip, toward the back');
  assert(sack.userData.mouth?.isVector3, 'the motion gets the sack mouth');
  assert.equal(extraDraws(z.mesh), 2, 'sack + belt idle');
  assert.equal(rig.rockRadius, COLOSSUS_ROCK.radius * scale);
  assert.equal(getZombieAbilityRockRadius(z), COLOSSUS_ROCK.radius * scale);
  assert.equal(getZombieAbilityRockRadius(zombie('demon').z), 0);
  const rock = getZombieAbilityRock(THREE);
  assert.equal(rock.geometry, rig.heldRock.geometry, 'held and thrown rock share one shape');
  rock.geometry.computeBoundingSphere();
  assert(rock.geometry.boundingSphere.radius > .9 && rock.geometry.boundingSphere.radius < 1.35, 'unit-radius rock');
});

for (const scale of [.75, 1, 1.8]) {
  test(`colossus pitch: the rock shows in the right hand from the sack and launches where the hand was, scale ${scale}`, () => {
    const { z, rig } = zombie('colossus', scale);
    z.mesh.position.set(8, 3, -5); z.mesh.rotation.set(.08, 1.2, -.04); z.mesh.scale.set(1.04, .96, .99);
    legacyPose(rig);
    updateZombieAbilityVisuals(z, 0, { kind: 'stone', stage: 'windup', progress: .1 });
    assert.equal(rig.heldRock.visible, false, 'no rock until the hand is in the sack');
    const mouth = rig.sack.localToWorld(rig.sack.userData.mouth.clone());
    let nearest = Infinity;
    for (let frame = 0; frame <= 45; frame++) {
      legacyPose(rig);
      const progress = frame / 45;
      updateZombieAbilityVisuals(z, frame / 30, { kind: 'stone', stage: 'windup', progress });
      const at = rig.heldRock.getWorldPosition(new THREE.Vector3());
      assert(at.toArray().every(Number.isFinite));
      if (rig.heldRock.visible && nearest === Infinity) nearest = at.distanceTo(mouth) / scale;
      if (progress >= .34) assert.equal(rig.heldRock.visible, true, 'the rock stays in the hand to the release');
    }
    assert(nearest < .35, `the rock first shows at the sack mouth, not in the air (${nearest.toFixed(3)})`);
    assert.equal(extraDraws(z.mesh), 3, 'throwing adds only the held rock');
    const carried = new THREE.Vector3(), released = new THREE.Vector3();
    assert.equal(getZombieAbilityLaunch(z, 'stone', carried), true);
    const elbow = rig.elbows[1], palm = rig.rockPalm.clone(); elbow.localToWorld(palm);
    pointNear(carried, palm, 1e-6);
    legacyPose(rig);
    updateZombieAbilityVisuals(z, 1.51, { kind: 'stone', stage: 'recovery', progress: 0, release: true });
    assert.equal(getZombieAbilityLaunch(z, 'stone', released), true);
    pointNear(released, carried);
    assert.equal(rig.heldRock.visible, false);
    assert.equal(extraDraws(z.mesh), 2);
    for (const p of [.3, .7, 1]) { legacyPose(rig); updateZombieAbilityVisuals(z, 2, { kind: 'stone', stage: 'recovery', progress: p }); }
    updateZombieAbilityVisuals(z, 3, { stage: 'idle' });
    assert.equal(extraDraws(z.mesh), 2, 'back to the sack and belt');
  });
}

test('colossus lifts the full-size rock through its opening before carrying it sideways', () => {
  const { z, rig } = zombie('colossus', 2.3);
  const { closure, mouth, rockEntry, rockExit } = rig.sack.userData;
  assert.equal(closure[0], 1, 'the fabric mouth is folded at rest');
  const axis = rockExit.clone().sub(rockEntry).normalize();
  const shape = rig.heldRock.geometry.attributes.position;
  let radius = 0;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < shape.count; i++) {
    radius = Math.max(radius, vertex.fromBufferAttribute(shape, i).length());
  }
  assert(Math.abs(radius * rig.heldRock.scale.x - rig.rockRadius) < 1e-6);
  let prior = -Infinity;
  for (const time of [.36, .41, .46, .50, .53]) {
    updateZombieAbilityVisuals(z, time, {kind:'stone', stage:'windup', progress:time/1.65});
    assert(rig.heldRock.visible);
    assert.equal(closure[0], 0, 'the full opening is clear while the rock lifts');
    const center = rig.sack.worldToLocal(rig.heldRock.getWorldPosition(vertex)).sub(mouth);
    const rise = center.dot(axis);
    assert(rise > prior, 'the rock centre rises monotonically through the opening');
    assert(center.addScaledVector(axis, -rise).length() < .065, 'the rock stays over the opening as it lifts');
    prior = rise;
  }
  assert(prior > COLOSSUS_ROCK.radius, 'the rock clears the lip before moving sideways');
  updateZombieAbilityVisuals(z, 1.3, {kind:'stone', stage:'windup', progress:1.3/1.65});
  assert.equal(closure[0], 1, 'the sack folds down for the pitch');
});

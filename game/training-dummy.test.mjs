import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import * as FakeThree from '../tools/tests/fakethree.mjs';
import { buildTrainingGround, TRAINING } from '../world/training.js';
import { DUMMY_SPEC } from '../world/training-dummy.js';
import { createTrainingDummyExercise, TRAINING_DUMMY_SPOT, TRAINING_DUMMY_SAW_RADIUS } from './training-dummy.js';

test('GP-20101: dummy joins the range without blocking its targets, stations, or walking space', () => {
  const tg = buildTrainingGround(FakeThree);
  const targetCount = tg.targets.length, solidCount = tg.solids.length;
  const dummy = createTrainingDummyExercise(THREE, tg);
  const scene = new THREE.Scene();
  try {
    assert.equal(tg.solids.length, solidCount + 1);
    assert.equal(tg.solids.at(-1), dummy.solid);
    assert.equal(tg.targets.length, targetCount);
    assert.equal(TRAINING_DUMMY_SPOT.z < TRAINING.LINE_Z, true, 'dummy stays behind the firing line');
    assert.equal(dummy.model.group.position.x, tg.origin.x + TRAINING_DUMMY_SPOT.x);
    assert.equal(dummy.model.group.position.z, tg.origin.z + TRAINING_DUMMY_SPOT.z);
    const b = dummy.solid;
    const overlaps = tg.solids.filter(s => s !== b && s.minX < b.maxX && s.maxX > b.minX &&
      s.minZ < b.maxZ && s.maxZ > b.minZ && s.minY < b.maxY && s.maxY > b.minY);
    assert.deepEqual(overlaps, [], 'no built range solid overlaps the dummy');
    for (const station of Object.values(tg.stations)) {
      assert(Math.hypot(station.front.x - b.cx, station.front.z - b.cz) > 1.5,
        'station approach stays clear');
    }
    dummy.enter(scene);
    assert.equal(dummy.model.group.parent, scene);
    const start = { x: b.cx + 0.1, y: tg.floorY, z: b.cz + 0.1 };
    assert(dummy.pushOut(start, 0.36), 'walking into the dummy is resolved');
    assert(Math.abs(Math.hypot(start.x - b.cx, start.z - b.cz) - (DUMMY_SPEC.baseRadius + 0.36)) < 0.002);
    const contact = dummy.trace({ x: b.cx, y: tg.floorY + 1.2, z: b.cz + 1 },
      { x: b.cx, y: tg.floorY + 1.2, z: b.cz - 1 });
    assert(contact?.point, 'a round or blade finds the sculpted surface');
    const directSaw = dummy.sawContact({ ax: b.cx, ay: tg.floorY + 1.2, az: b.cz + 1,
      bx: b.cx, by: tg.floorY + 1.2, bz: b.cz - 1, r: 0.044 });
    assert(directSaw?.point && directSaw.source !== 'zombie-column', 'direct chain contact stays exact');
    const thirdPersonBar = { ax: b.cx + .118, ay: tg.floorY + 1.48, az: b.cz - .790,
      bx: b.cx + .118, by: tg.floorY + 1.92, bz: b.cz - .655, r: .044 };
    assert.equal(dummy.trace({ x: thirdPersonBar.ax, y: thirdPersonBar.ay, z: thirdPersonBar.az },
      { x: thirdPersonBar.bx, y: thirdPersonBar.by, z: thirdPersonBar.bz }, thirdPersonBar.r), null);
    const broadSaw = dummy.sawContact(thirdPersonBar);
    assert.equal(TRAINING_DUMMY_SAW_RADIUS, .52);
    assert.equal(broadSaw?.source, 'zombie-column', 'third-person saw uses the zombie melee column');
    assert(Math.abs(broadSaw.point.x - thirdPersonBar.ax) < .001);
    dummy.strike({ kind: 'knife', point: contact.point, damage: 26 });
    assert.equal(dummy.state().hits, 1);
    dummy.reset();
    assert.equal(dummy.state().hits, 0);
    dummy.leave();
    assert.equal(dummy.model.group.parent, null);
  } finally {
    dummy.dispose();
    tg.dispose();
  }
  assert.equal(tg.solids.length, solidCount, 'disposing removes only the dummy collider');
});

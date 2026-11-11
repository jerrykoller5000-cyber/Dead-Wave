// world/training-dummy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { createTrainingDummy } from './training-dummy.js';

test('createTrainingDummy builds expected hierarchy, scale, and materials', () => {
  const dummy = createTrainingDummy(T, { x: 2, y: 0, z: -3, rotY: 0.5 });
  assert(dummy.group);
  assert.equal(dummy.group.name, 'training-melee-dummy');
  assert.equal(dummy.group.position.x, 2);
  assert.equal(dummy.group.position.y, 0);
  assert.equal(dummy.group.position.z, -3);

  // Check pivot and body
  assert(dummy.pivot);
  assert.equal(dummy.pivot.name, 'dummy-spring-pivot');
  assert.equal(dummy.pivot.position.y, 0.20);

  assert(dummy.bodyGroup);
  assert.equal(dummy.bodyGroup.name, 'dummy-body');

  // Check solid bounds
  assert(dummy.solid);
  assert.equal(dummy.solid.solid, true);
  assert.equal(dummy.solid.prop, true);
  assert.equal(dummy.solid.dummy, true);
  assert(dummy.solid.maxY >= 1.75 && dummy.solid.maxY <= 1.90);
  assert.equal(dummy.solid.minY, 0);
  assert.equal(dummy.solid.minX, 2 - 0.34);
  assert.equal(dummy.solid.maxX, 2 + 0.34);

  // Check decal mesh
  assert(dummy.decalMesh);
  assert.equal(dummy.decalMesh.name, 'dummy-decal-mesh');
  assert.equal(dummy.decalMesh.renderOrder, 1.2);
});

test('wobble physics responds to strikes, oscillates, and settles to rest', () => {
  const dummy = createTrainingDummy(T, { x: 0, y: 0, z: 0 });

  // Initial state is rest
  assert.equal(dummy.pivot.rotation.x, 0);
  assert.equal(dummy.pivot.rotation.z, 0);

  // Strike from front (+z)
  dummy.wobble({ x: 0, z: 1 }, 1.5, 1.4);

  // Step physics forward
  dummy.update(0.016);
  assert.notEqual(dummy.pivot.rotation.x, 0, 'dummy should tilt under impulse');

  // Simulate 3 seconds of updates - should settle back to rest
  for (let i = 0; i < 200; i++) {
    dummy.update(0.016);
  }
  assert.equal(dummy.pivot.rotation.x, 0, 'spring oscillation should decay to 0');
  assert.equal(dummy.pivot.rotation.z, 0, 'spring oscillation should decay to 0');
});

test('takeHit processes knife, chainsaw, bullet, and blunt weapons with appropriate decals and stats', () => {
  const dummy = createTrainingDummy(T, { x: 0, y: 0, z: 0 });

  // 1. Knife strike
  const resKnife = dummy.takeHit({
    weapon: 'knife',
    point: { x: 0, y: 1.2, z: 0.12 },
    normal: { x: 0, y: 0, z: 1 },
    damage: 35
  });
  assert.equal(resKnife.hit, true);
  assert.equal(resKnife.markType, 'slash');
  assert.equal(resKnife.damage, 35);

  // 2. Chainsaw strike
  const resSaw = dummy.takeHit({
    weapon: 'chainsaw',
    point: { x: 0.05, y: 1.1, z: 0.12 },
    normal: { x: 0, y: 0, z: 1 },
    damage: 150
  });
  assert.equal(resSaw.markType, 'chainsaw');

  // 3. Bullet hit
  const resBullet = dummy.takeHit({
    weapon: 'rifle',
    point: { x: -0.05, y: 1.4, z: 0.12 },
    normal: { x: 0, y: 0, z: 1 },
    damage: 45
  });
  assert.equal(resBullet.markType, 'bullet');

  // 4. Blunt hit
  const resBlunt = dummy.takeHit({
    weapon: 'fist',
    point: { x: 0, y: 1.0, z: 0.12 },
    normal: { x: 0, y: 0, z: 1 },
    damage: 15
  });
  assert.equal(resBlunt.markType, 'blunt');

  const stats = dummy.getStats();
  assert.equal(stats.hits, 4);
  assert.equal(stats.damage, 245);
  assert.equal(stats.slashes, 1);
  assert.equal(stats.scorches, 1);
  assert.equal(stats.bullets, 1);
  assert.equal(stats.blunt, 1);

  // Reset stats
  dummy.resetStats();
  const resetStats = dummy.getStats();
  assert.equal(resetStats.hits, 0);
  assert.equal(resetStats.damage, 0);
});

test('prepareWarmup primes decal draw range for WebGPU compilation and restores safely', () => {
  const dummy = createTrainingDummy(T);
  const restore = dummy.prepareWarmup();
  assert.equal(dummy.decalMesh.geometry.drawRange.count, 6);
  restore();
  assert.equal(dummy.decalMesh.geometry.drawRange.count, 0);
});

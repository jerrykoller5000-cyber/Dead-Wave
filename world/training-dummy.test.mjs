// world/training-dummy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import { buildTrainingDummy, DUMMY_SPEC, RECOMMENDED_DUMMY_SPOT, normalizeDummyHitKind } from './training-dummy.js';

test('buildTrainingDummy builds expected baked hierarchy, human scale, flush floor seating, and draw budget', () => {
  const dummy = buildTrainingDummy(THREE, { x: 2, y: 0, z: -3, yaw: 0.5 });
  assert.equal(dummy.group.name, 'training-melee-dummy');
  assert.equal(dummy.baseGroup.name, 'training-dummy-base');
  assert.equal(dummy.pivot.name, 'training-dummy-pivot');
  assert.equal(dummy.pivot.position.y, DUMMY_SPEC.hingeY);

  const box = new THREE.Box3();
  let visibleDraws = 0;
  dummy.group.updateMatrixWorld(true);
  dummy.group.traverse((o) => {
    if (o.isMesh && o.visible) {
      visibleDraws++;
      box.expandByObject(o);
    }
  });

  // Flush on y = 0.000 m, human height ~1.79 m, <= 4 opaque draws unmarked
  assert(Math.abs(box.min.y) < 0.0005, `expected flush floor contact, got minY=${box.min.y}`);
  assert(Math.abs(box.max.y - DUMMY_SPEC.height) < 0.01, `expected height ${DUMMY_SPEC.height}, got ${box.max.y}`);
  assert.equal(visibleDraws, 4, 'unmarked dummy should bake to 4 opaque draws (base rubber/steel + pivot vinyl/steel)');

  // Solid collider descriptor (no string target property)
  assert.equal(dummy.solid.prop, true);
  assert.equal(dummy.solid.dummy, true);
  assert.equal(dummy.solid.target, undefined);
  assert.equal(dummy.solid.minY, 0);
  assert.equal(dummy.solid.maxY, DUMMY_SPEC.height);
  assert(Math.abs(dummy.solid.cx - 2) < 1e-6);
  assert(Math.abs(dummy.solid.cz - (-3)) < 1e-6);

  // Decal mesh sorted strictly beneath transparent effects (renderOrder < 0, transparent, depthWrite false)
  assert.equal(dummy.marksMesh.renderOrder, -0.5);
  assert.equal(dummy.marksMesh.material.transparent, true);
  assert.equal(dummy.marksMesh.material.depthWrite, false);
  assert(RECOMMENDED_DUMMY_SPOT);
  dummy.dispose();
});

test('traceSegment, pushOut, strike wobble physics, weapon mark kinds, and reset work end-to-end', () => {
  const dummy = buildTrainingDummy(THREE, { x: 0, y: 0, z: 0, yaw: 0 });

  // Segment trace hits head, torso, post, and base accurately
  for (const [zone, y] of [['head', 1.68], ['torso', 1.24], ['post', 0.56], ['base', 0.08]]) {
    const hit = dummy.traceSegment({ x: 0, y, z: 1.2 }, { x: 0, y, z: -0.5 });
    assert(hit, `expected hit at y=${y}`);
    assert.equal(hit.zone, zone);
  }

  // Horizontal cylinder pushOut prevents walking inside the base/body
  const pos = { x: 0.15, y: 0, z: 0.10 };
  assert.equal(dummy.pushOut(pos, 0.36), true);
  assert(Math.abs(Math.hypot(pos.x, pos.z) - (DUMMY_SPEC.baseRadius + 0.36)) < 0.002);

  // Strike with knife, machete, katana, chainsaw, scorch, and bullet
  for (const [raw, canon, y] of [
    ['knife', 'knife', 1.28],
    ['machete', 'machete', 1.16],
    ['katana', 'katana', 1.35],
    ['chainsaw', 'chainsaw', 1.02],
    ['flamethrower', 'scorch', 1.08],
    ['pistol', 'bullet', 1.66]
  ]) {
    assert.equal(normalizeDummyHitKind(raw), canon);
    const res = dummy.strike({
      kind: raw,
      point: { x: 0.03, y, z: 0.14 },
      direction: { x: -0.1, y: 0, z: -1 },
      slashDir: { x: 0.8, y: -0.5, z: 0 },
      damage: 25,
      forceMark: true
    });
    assert.equal(res.hit, true);
    assert.equal(res.kind, canon);
  }

  const st0 = dummy.state();
  assert.equal(st0.hits, 6);
  assert.equal(st0.damage, 150);
  assert.equal(st0.markCount, 6);
  assert.equal(dummy.marksMesh.visible, true);

  // Step spring oscillation: tilts on impact, oscillates, and decays cleanly back to rest
  dummy.update(0.08);
  assert(dummy.state().tiltRad > 0.05, 'expected non-zero wobble tilt after strikes');
  for (let i = 0; i < 220; i++) dummy.update(1 / 60);
  assert.equal(dummy.pivot.rotation.x, 0);
  assert.equal(dummy.pivot.rotation.z, 0);

  // Reset clears marks, tilt, and stats
  dummy.reset();
  const stReset = dummy.state();
  assert.equal(stReset.hits, 0);
  assert.equal(stReset.damage, 0);
  assert.equal(stReset.markCount, 0);
  assert.equal(dummy.marksMesh.visible, false);
  dummy.dispose();
});

test('prepareWarmup primes decal drawRanges during compile and restores cleanly', () => {
  const dummy = buildTrainingDummy(THREE);
  assert.equal(dummy.marksMesh.visible, false);
  const restore = dummy.prepareWarmup();
  assert.equal(dummy.marksMesh.visible, true);
  assert.equal(dummy.marksMesh.geometry.drawRange.count, 6);
  restore();
  assert.equal(dummy.marksMesh.visible, false);
  assert.equal(dummy.marksMesh.geometry.drawRange.count, 0);
  dummy.dispose();
});

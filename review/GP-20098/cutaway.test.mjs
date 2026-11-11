import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../vendor/three/three.webgpu.js';
import { partitionTrainingShell } from '../../world/training-cutaway.js';

test('Training wall fade reuses prebuilt render states across repeated crossings', () => {
  const root = new T.Group();
  const source = new T.MeshStandardMaterial({ color: 0x889977, depthWrite: true });
  const wall = new T.Mesh(new T.BoxGeometry(0.2, 4, 8), source);
  wall.position.set(-44, 2, 0);
  root.add(wall);
  const cutaway = partitionTrainingShell(T, root, new T.Vector3());
  const solid = wall.material;
  assert.notEqual(solid, source);
  assert.equal(solid.transparent, false);
  assert.equal(solid.depthWrite, true);

  const restoreWarmup = cutaway.prepareWarmup();
  const fade = wall.material;
  assert.notEqual(fade, solid);
  assert.equal(fade.transparent, true);
  assert.equal(fade.depthWrite, false);
  restoreWarmup();
  assert.equal(wall.material, solid);

  const solidVersion = solid.version, fadeVersion = fade.version;
  const camera = new T.Vector3(-50, 2, 0);
  const inside = new T.Vector3(-40, 2, 0);
  const outside = new T.Vector3(-50, 2, 0);
  for (let i = 0; i < 3; i++) {
    cutaway.update(camera, inside, 0.1);
    assert.equal(wall.material, fade);
    assert.ok(fade.opacity < 1);
    cutaway.update(camera, outside, 0.5);
    assert.equal(wall.material, solid);
    assert.equal(solid.opacity, 1);
    assert.equal(solid.version, solidVersion);
    assert.equal(fade.version, fadeVersion);
  }
  source.color.setHex(0x334455);
  cutaway.syncMaterials();
  assert.equal(solid.color.getHex(), 0x334455);
  assert.equal(fade.color.getHex(), 0x334455);
  cutaway.dispose();
});

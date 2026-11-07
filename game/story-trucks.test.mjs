// game/story-trucks.test.mjs - Unit tests for AG-246 story trucks.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from '../tools/tests/fakethree.mjs';
import { buildEscortTruck, buildCrashedTruck, getStoryTruckMaterials } from './story-trucks.js';

test('getStoryTruckMaterials returns vehicle materials', () => {
  const mats = getStoryTruckMaterials(T);
  assert.ok(mats.olive, 'olive material exists');
  assert.ok(mats.darkOlive, 'darkOlive material exists');
  assert.ok(mats.steel, 'steel material exists');
  assert.ok(mats.dark, 'dark material exists');
  assert.ok(mats.rubber, 'rubber material exists');
  assert.ok(mats.rust, 'rust material exists');
  assert.ok(mats.glass, 'glass material exists');
  assert.ok(mats.lamp, 'lamp material exists');
  assert.ok(mats.cable, 'cable material exists');
});

test('buildEscortTruck constructs cargo truck with removable front-bumper winch', () => {
  const truck = buildEscortTruck(T);
  assert.ok(truck, 'truck group created');
  assert.equal(truck.name, 'story-escort-truck');

  assert.ok(truck.userData.inner, 'truck has userData.inner');
  assert.ok(truck.userData.winch, 'truck has userData.winch');

  // Verify winch is mounted at front bumper (positive x = nose)
  const winch = truck.userData.winch;
  assert.equal(winch.name, 'escort-truck-winch');
  assert.ok(winch.position.x > 3.0, 'winch is at front bumper (positive x)');
  assert.ok(winch.children.length >= 3, 'winch has drum, cable, motor and remote components');

  // Verify inner meshes have vertices
  const inner = truck.userData.inner;
  const meshes = inner.children.filter(c => c.isMesh);
  assert.ok(meshes.length >= 6, 'has merged body, steel, dark, rubber, glass, and lamp meshes');
  for (const m of meshes) {
    assert.ok(m.geometry.attributes.position.count > 0, 'mesh has vertices');
  }

  // Verify nose is along local +x:
  // Points at x > 0 correspond to hood and bumper, while x < 0 correspond to cargo bed
  const bodyMesh = meshes[0];
  const posAttr = bodyMesh.geometry.attributes.position;
  let maxX = -Infinity, minX = Infinity;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
  }
  assert.ok(maxX > 2.5, 'nose extends past x = +2.5');
  assert.ok(minX < -2.5, 'cargo bed extends past x = -2.5');
});

test('buildCrashedTruck constructs crashed truck with winchMount and lineAt matching story expectations', () => {
  const truck = buildCrashedTruck(T);
  assert.ok(truck, 'truck group created');
  assert.equal(truck.name, 'story-crashed-truck');

  assert.ok(truck.userData.inner, 'truck has userData.inner');
  const inner = truck.userData.inner;
  assert.ok(Math.abs(inner.rotation.z - (-0.07)) < 1e-4, 'inner has nose-down pitch rotation.z = -0.07');

  // Verify winchMount and lineAt hooks for story gates / winch drag
  assert.ok(truck.userData.winchMount, 'userData.winchMount exists');
  assert.ok(truck.userData.lineAt, 'userData.lineAt exists');

  assert.equal(truck.userData.winchMount.position.x, 3.55);
  assert.equal(truck.userData.winchMount.position.y, 0.45);
  assert.equal(truck.userData.winchMount.position.z, 0);

  assert.equal(truck.userData.lineAt.position.x, 3.62);
  assert.equal(truck.userData.lineAt.position.y, 0.62);
  assert.equal(truck.userData.lineAt.position.z, 0);

  // Verify nose is along local +x
  const meshes = inner.children.filter(c => c.isMesh);
  assert.ok(meshes.length >= 6, 'has merged meshes');
  const bodyMesh = meshes[0];
  const posAttr = bodyMesh.geometry.attributes.position;
  let maxX = -Infinity, minX = Infinity;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
  }
  assert.ok(maxX > 2.5, 'nose extends past x = +2.5');
  assert.ok(minX < -2.5, 'cargo bed extends past x = -2.5');
});

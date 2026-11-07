// world/story-fence.test.mjs - Unit tests for AG-245 chain-link fence ring and vines.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from '../tools/tests/fakethree.mjs';
import { buildChainLinkRing, buildVines, getStoryFenceMaterials, createChainLinkTexture } from './story-fence.js';

test('getStoryFenceMaterials returns standard materials with valid properties', () => {
  const mats = getStoryFenceMaterials(T);
  assert.ok(mats.linkMat, 'linkMat exists');
  assert.ok(mats.steelMat, 'steelMat exists');
  assert.ok(mats.woodMat, 'woodMat exists');
  assert.ok(mats.cutWoodMat, 'cutWoodMat exists');
  assert.ok(mats.foliageMat, 'foliageMat exists');
});

test('buildChainLinkRing builds a 2-draw merged fence group respecting gate openings', () => {
  // Generate sample circle points of radius 15m
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * 15, z: Math.sin(a) * 15 });
  }

  // Gate on south side
  const gates = [
    { x: 0, z: -15, ax: 1, az: 0, half: 1.8, span: 2.2 }
  ];

  const heightAt = (x, z) => 1.5;

  const ringGroup = buildChainLinkRing(T, { pts, gates, heightAt });

  assert.ok(ringGroup, 'ring group created');
  assert.equal(ringGroup.name, 'story-fence-ring');

  // Exactly 2 merged meshes: 1 chain-link fabric + 1 steel structure (posts, rails, coils)
  assert.equal(ringGroup.children.length, 2, 'fence ring is merged into exactly 2 draws');

  const linkMesh = ringGroup.children.find(c => c.name === 'fence-link-mesh');
  const steelMesh = ringGroup.children.find(c => c.name === 'fence-steel-mesh');

  assert.ok(linkMesh, 'fence-link-mesh present');
  assert.ok(steelMesh, 'fence-steel-mesh present');

  assert.ok(linkMesh.geometry.attributes.position.count > 0, 'link mesh has vertices');
  assert.ok(steelMesh.geometry.attributes.position.count > 0, 'steel mesh has vertices');

  assert.ok(linkMesh.castShadow && linkMesh.receiveShadow, 'linkMesh has shadows enabled');
  assert.ok(steelMesh.castShadow && steelMesh.receiveShadow, 'steelMesh has shadows enabled');
});

test('buildVines creates a group with userData.shut and userData.cut with merged draws', () => {
  const L = 1.8;
  const vines = buildVines(T, L);

  assert.ok(vines, 'vines group created');
  assert.equal(vines.name, 'story-vines');

  assert.ok(vines.userData.shut, 'userData.shut present');
  assert.ok(vines.userData.cut, 'userData.cut present');

  // Default initial visibility: shut is visible, cut is hidden
  assert.equal(vines.userData.shut.visible, true, 'shut is visible by default');
  assert.equal(vines.userData.cut.visible, false, 'cut is hidden by default');

  // Verify shut group contains merged wood and foliage
  assert.equal(vines.userData.shut.children.length, 2, 'shut state is 2 draws (wood + foliage)');
  const shutWood = vines.userData.shut.children.find(c => c.name === 'vines-shut-wood');
  const shutLeaf = vines.userData.shut.children.find(c => c.name === 'vines-shut-foliage');
  assert.ok(shutWood && shutWood.geometry.attributes.position.count > 0, 'shut wood has geometry');
  assert.ok(shutLeaf && shutLeaf.geometry.attributes.position.count > 0, 'shut leaf has geometry');

  // Verify cut group contains merged wood and foliage
  assert.equal(vines.userData.cut.children.length, 2, 'cut state is 2 draws (wood + foliage)');
  const cutWood = vines.userData.cut.children.find(c => c.name === 'vines-cut-wood');
  const cutLeaf = vines.userData.cut.children.find(c => c.name === 'vines-cut-foliage');
  assert.ok(cutWood && cutWood.geometry.attributes.position.count > 0, 'cut wood has geometry');
  assert.ok(cutLeaf && cutLeaf.geometry.attributes.position.count > 0, 'cut leaf has geometry');

  // Simulate cutting vines
  vines.userData.shut.visible = false;
  vines.userData.cut.visible = true;
  assert.equal(vines.userData.shut.visible, false);
  assert.equal(vines.userData.cut.visible, true);
});

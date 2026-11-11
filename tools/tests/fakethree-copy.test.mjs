// CB-307 (ChatGPT 2's GT-20081 returns): the suite's three.js stand-in copies an object as three.js does, and its materials
// carry their type and real defaults, so world/bake.js foldStatic folds plain meshes in the harness as it does in the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './fakethree.mjs';
import { TSL } from './fakethree.mjs';
import { foldStatic } from '../../world/bake.js';

test('Group.copy keeps the name, the visibility and the children (tgt20076: a hidden named optic came out unnamed and shown)', () => {
  const src = new THREE.Group(); src.name = 'optic.rmr'; src.visible = false; src.renderOrder = 3; src.userData.k = 1;
  const kid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial()); kid.name = 'lens'; src.add(kid);
  src.position.set(1, 2, 3);
  const out = new THREE.Group().copy(src);
  assert.equal(out.name, 'optic.rmr');
  assert.equal(out.visible, false);
  assert.equal(out.renderOrder, 3);
  assert.equal(out.userData.k, 1);
  assert.equal(out.position.z, 3);
  assert.equal(out.children.length, 1);
  assert.equal(out.getObjectByName('lens').name, 'lens');
  assert.notEqual(out.children[0], kid);   // a copy, not the same child moved
  assert.equal(src.children.length, 1);
  assert.equal(new THREE.Group().copy(src, false).children.length, 0);
});

test('materials carry their type and three.js defaults, not truthy stubs', () => {
  const m = new THREE.MeshStandardMaterial({ color: 0x808080 });
  assert.equal(m.type, 'MeshStandardMaterial');
  assert.equal(new THREE.MeshBasicMaterial().type, 'MeshBasicMaterial');
  assert.equal(new THREE.MeshPhysicalMaterial().type, 'MeshPhysicalMaterial');
  for (const k of ['wireframe', 'flatShading', 'vertexColors', 'polygonOffset']) assert.equal(m[k], false, k);
  assert.equal(m.alphaTest, 0);
  assert.equal(m.clone().type, 'MeshStandardMaterial');
});

test('foldStatic folds two plain meshes into one, and leaves a transparent one', () => {
  const g = new THREE.Group();
  const mat = () => new THREE.MeshStandardMaterial({ color: 0x777777 });
  const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat()), b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat());
  b.position.set(2, 0, 0);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 }));
  g.add(a, b, glass);
  const r = foldStatic(THREE, TSL, g);
  assert.equal(r.folded, 1);
  assert.equal(r.removed, 2);
  assert.ok(g.children.includes(glass));
  const out = g.children.find((o) => o.userData.folded === 2);
  assert.ok(out, 'one folded mesh holds both');
});

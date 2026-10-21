// CU-155 (GB-185): the suite's three.js stand-in has to hit a triangle, or a round never lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BufferGeometry, Float32BufferAttribute, InstancedMesh, Line, Mesh, Raycaster, Vector3 } from './fakethree.mjs';

function triangle(indexed) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3));
  if (indexed) g.setIndex([0, 1, 2]);
  const m = new Mesh(g);
  m.updateWorldMatrix(true, false);
  return m;
}

test('a ray through a triangle hits it, and a miss stays empty', () => {
  const mesh = triangle(false);
  const hit = new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1)).intersectObject(mesh, false);
  assert.equal(hit.length, 1);
  assert.ok(Math.abs(hit[0].distance - 2) < 1e-6);
  assert.ok(Math.abs(hit[0].point.z) < 1e-6);
  assert.equal(hit[0].object, mesh);
  const miss = new Raycaster(new Vector3(5, 5, 2), new Vector3(0, 0, -1)).intersectObject(mesh, false);
  assert.equal(miss.length, 0);
});

test('an index, a child, and near/far are honoured', () => {
  const mesh = triangle(true);
  mesh.position.set(0, 0, 3);
  mesh.updateWorldMatrix(true, false);
  const hits = [];
  new Raycaster(new Vector3(0, 0, 6), new Vector3(0, 0, -1), 0, 2).intersectObject(mesh, false, hits);
  assert.equal(hits.length, 0);
  const got = new Raycaster(new Vector3(0, 0, 6), new Vector3(0, 0, -1), 0, 4).intersectObject(mesh, false);
  assert.equal(got.length, 1);
  assert.ok(Math.abs(got[0].distance - 3) < 1e-6);
  const parent = new Mesh();
  parent.add(mesh);
  const deep = new Raycaster(new Vector3(0, 0, 6), new Vector3(0, 0, -1)).intersectObject(parent, true);
  assert.equal(deep.length, 1);
  assert.equal(deep[0].object, mesh);
});

test('lines and instanced meshes still do not report a triangle', () => {
  const g = triangle(false).geometry;
  const line = new Line(g);
  line.updateWorldMatrix(true, false);
  assert.equal(new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1)).intersectObject(line, false).length, 0);
  const inst = new InstancedMesh(g, null, 1);
  inst.updateWorldMatrix(true, false);
  assert.equal(new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1)).intersectObject(inst, false).length, 0);
});

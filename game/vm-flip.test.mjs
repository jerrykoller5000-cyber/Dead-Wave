// game/vm-flip.test.mjs - CL-281 (AG-168 v2): the mirrored view gun's geometry twins (game/vm-flip.js).
import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from '../vendor/three/three.core.js';
import { flippedTwin, originalOf, needsFlip } from './vm-flip.js';

// A triangle's facing as the eye sees it after a matrix: +1 counter-clockwise (front by default), -1 clockwise.
function facing(geo, m, tri = 0) {
  const P = geo.attributes.position, I = geo.index;
  const v = [0, 1, 2].map((k) => { const i = I ? I.getX(tri * 3 + k) : tri * 3 + k; return new T.Vector3().fromBufferAttribute(P, i).applyMatrix4(m); });
  const e1 = v[1].clone().sub(v[0]), e2 = v[2].clone().sub(v[0]);
  return Math.sign(e1.cross(e2).z);   // looking down -z: +z normal is toward the eye
}

test('a box mirrored in x turns its windings over; its twin turns them back', () => {
  const box = new T.BoxGeometry(1, 1, 1);
  const front = new T.Matrix4();   // the +z face's triangles: find one facing the eye
  let tri = -1;
  for (let t = 0; t < box.index.count / 3; t++) if (facing(box, front, t) > 0) { tri = t; break; }
  assert.ok(tri >= 0);
  const mirror = new T.Matrix4().makeScale(-1, 1, 1);
  assert.equal(facing(box, mirror, tri), -1, 'the mirror turns the triangle clockwise (culled as a back face on WebGPU)');
  const tw = flippedTwin(T, box);
  assert.equal(facing(tw, mirror, tri), 1, 'its twin under the mirror is counter-clockwise again');
  assert.equal(tw.attributes.position, box.attributes.position, 'the twin shares the positions');
  assert.equal(tw.attributes.normal, box.attributes.normal, 'and the normals');
  assert.equal(flippedTwin(T, box), tw, 'the same twin on a second call');
  assert.equal(flippedTwin(T, tw), tw, 'a twin passed in comes back as it is');
  assert.equal(originalOf(tw), box);
  assert.deepEqual(tw.groups.map((g) => [g.start, g.count, g.materialIndex]), box.groups.map((g) => [g.start, g.count, g.materialIndex]), 'the groups carry over');
});

test('non-indexed geometry gets an index running the other way', () => {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1], 3));
  const tw = flippedTwin(T, g);
  assert.deepEqual(Array.from(tw.index.array), [0, 2, 1, 3, 5, 4]);
  assert.equal(facing(tw, new T.Matrix4().makeScale(-1, 1, 1), 0), facing(g, new T.Matrix4(), 0));
});

test('a new index on the original makes a new twin; normals recomputed through a twin come out as the original\'s', () => {
  const g = new T.PlaneGeometry(1, 1, 2, 2);
  const t1 = flippedTwin(T, g);
  const n0 = Array.from(g.attributes.normal.array);
  t1.computeVertexNormals();
  assert.deepEqual(Array.from(g.attributes.normal.array).map((v) => +v.toFixed(5)), n0.map((v) => +v.toFixed(5)), 'outward as before, not turned in');
  g.setIndex(Array.from(g.index.array).slice(0, 6));
  const t2 = flippedTwin(T, g);
  assert.notEqual(t2, t1);
  assert.equal(t2.index.count, 6);
});

test('only the WebGPU backend under a mirror needs them', () => {
  assert.equal(needsFlip({ backend: { isWebGPUBackend: true } }, true), true);
  assert.equal(needsFlip({ backend: { isWebGLBackend: true } }, true), false);
  assert.equal(needsFlip({ backend: { isWebGPUBackend: true } }, false), false);
  assert.equal(needsFlip(null, true), false);
});

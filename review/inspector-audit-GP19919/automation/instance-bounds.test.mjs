import test from 'node:test';
import assert from 'node:assert/strict';
import * as Real from '../../../vendor/three/three.core.js';
import * as Fake from '../../../tools/tests/fakethree.mjs';

function pair(transforms) {
  const real = new Real.InstancedMesh(new Real.BoxGeometry(2, 3, 4), new Real.MeshBasicMaterial(), transforms.length);
  const fake = new Fake.InstancedMesh(new Fake.BoxGeometry(2, 3, 4), new Fake.MeshBasicMaterial(), transforms.length);
  for (const [i, [p, r, s]] of transforms.entries()) {
    const matrix = new Real.Matrix4().compose(new Real.Vector3(...p), new Real.Quaternion().setFromEuler(new Real.Euler(...r)), new Real.Vector3(...s));
    const values = new Float32Array(matrix.elements);
    real.setMatrixAt(i, new Real.Matrix4().fromArray(values)); fake.setMatrixAt(i, new Fake.Matrix4().fromArray(values));
  }
  return { real, fake };
}
function sameBounds(real, fake) {
  real.computeBoundingBox(); fake.computeBoundingBox(); assert.equal(fake.boundingBox.isEmpty(), real.boundingBox.isEmpty());
  for (const side of ['min', 'max']) for (const axis of ['x', 'y', 'z']) {
    const a = fake.boundingBox[side][axis], b = real.boundingBox[side][axis];
    assert.equal(a === b || Math.abs(a - b) < 1e-9, true, side + '.' + axis + ': fake ' + a + ', Three ' + b);
  }
}
test('fake instance bounds match pinned Three for translated instances', () => {
  const { real, fake } = pair([[[5, 2, -3], [0, 0, 0], [1, 1, 1]], [[-10, 0, 8], [0, 0, 0], [1, 1, 1]]]); sameBounds(real, fake);
});
test('fake instance bounds match Three for rotation and nonuniform/negative scale', () => {
  const { real, fake } = pair([[[7, -3, 2], [0.7, 0.3, 0.2], [2, 0.5, -1]], [[-3, 2, 4], [1.2, -0.6, 0.1], [0.4, 3, 1.7]]]); sameBounds(real, fake);
});
test('recomputing bounds follows changed instance matrices and active instance count', () => {
  const { real, fake } = pair([[[0, 0, 0], [0, 0, 0], [1, 1, 1]], [[50, 1, 2], [0, 0.7, 0], [1, 2, 1]]]); sameBounds(real, fake);
  const matrix = new Real.Matrix4().makeTranslation(-80, 12, 0); real.setMatrixAt(1, matrix); fake.setMatrixAt(1, new Fake.Matrix4().fromArray(matrix.elements)); sameBounds(real, fake);
  real.count = fake.count = 1; sameBounds(real, fake);
});
test('zero instances produce the same empty box as Three', () => { const { real, fake } = pair([]); sameBounds(real, fake); });
test('fake namespace supports the native THREE.TSL attribute chain', () => { assert.equal(typeof Fake.TSL.attribute, 'function'); assert.equal(typeof Fake.TSL.attribute('opacity', 'float').mul, 'function'); });

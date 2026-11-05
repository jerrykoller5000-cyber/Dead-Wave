import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Vector3 } from 'three';
import { makeOptic } from './weapon-optics.js';

test('three optic studies expose usable local eye, dot, and mount points', () => {
  for (const kind of ['mini-reflex', 'reflex', 'holo']) {
    const optic = makeOptic(kind);
    assert.equal(optic.isGroup, true, kind);
    const { eye, dot } = optic.userData.sight;
    const mount = optic.userData.mount;
    for (const point of [eye, dot, mount]) {
      assert.equal(point.length, 3, kind);
      assert.ok(point.every(Number.isFinite), kind);
    }
    assert.ok(dot[2] > eye[2], `${kind}: dot is ahead of eye`);
    assert.ok(dot[1] > mount[1], `${kind}: window above foot`);
    const bounds = new Box3().setFromObject(optic);
    assert.ok(bounds.containsPoint(new Vector3(...mount)), `${kind}: mount inside foot`);
    assert.ok(bounds.containsPoint(new Vector3(...dot)), `${kind}: dot inside optic`);
    let triangles = 0;
    optic.traverse(o => { if (o.isMesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
    assert.ok(triangles > 100 && triangles < 3000, `${kind}: ${triangles} triangles`);
  }
  assert.throws(() => makeOptic('prism'), RangeError);
});

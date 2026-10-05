// world/bake.test.mjs — CL-117: bakeStatic merges a group's still meshes into one per material and leaves the rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { bakeStatic } from './bake.js';

test('one mesh per material, moving parts left alone, positions carried through', () => {
  const g = new T.Group();
  const steel = new T.MeshStandardMaterial({ color: 0x444444 }), paint = new T.MeshStandardMaterial({ color: 0xffcc00 });
  const mk = (mat, x, y, z, parent = g) => { const m = new T.Mesh(new T.BoxGeometry(1, 1, 1), mat); m.position.set(x, y, z); parent.add(m); return m; };
  mk(steel, 0, 0, 0); mk(steel, 4, 0, 0); mk(paint, 0, 3, 0); mk(paint, 2, 3, 0);
  const fan = new T.Group(); fan.name = 'fan'; g.add(fan); mk(steel, 0, 5, 0, fan);
  const lone = mk(new T.MeshStandardMaterial({ color: 0x00ff00 }), 9, 9, 9);
  const r = bakeStatic(T, g, { skip: (o) => o.userData && o.userData.keep });
  assert.deepEqual(r, { merged: 2, removed: 4 });
  const meshes = []; g.traverse((o) => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 4, 'two baked, the fan blade, the lone one');
  assert.ok(meshes.includes(lone) && fan.children.length === 1, 'the named fan and the lone mesh are untouched');
  const baked = meshes.find((m) => m.material === steel && m.userData.baked);
  assert.equal(baked.userData.baked, 2);
  const P = baked.geometry.attributes.position; let maxX = -1; for (let i = 0; i < P.count; i++) maxX = Math.max(maxX, P.getX(i));
  assert.ok(Math.abs(maxX - 4.5) < 1e-6, 'the second box sits at x 4 (' + maxX + ')');
  assert.ok(baked.geometry.attributes.uv && baked.geometry.attributes.normal, 'uvs and normals carried');
});

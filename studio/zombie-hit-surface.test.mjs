import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import { zombieSurface } from '../game/zombie-headshots.js';

test('a round intersects the hidden rigid surface retained under a skinned zombie', () => {
  const root = new T.Group();
  const hips = new T.Group(), torso = new T.Group(), head = new T.Group();
  hips.position.y = 0.9;
  torso.position.y = 0.45;
  root.add(hips); hips.add(torso); torso.add(head);
  root.userData = { hips, torso, head };
  const retained = new T.Mesh(new T.BoxGeometry(0.55, 0.65, 0.35), new T.MeshBasicMaterial());
  retained.visible = false;
  retained.userData.skinSrc = true;
  torso.add(retained);
  const z = { mesh: root, typeKey: 'shambler' };
  const hit = zombieSurface(T, z, new T.Vector3(0, 1.35, -2), new T.Vector3(0, 1.35, 2));
  assert(hit, 'the retained collision surface remains raycastable while hidden for rendering');
  assert(hit.t > 0 && hit.t < 1);
  assert.equal(hit.headHit, false);

});

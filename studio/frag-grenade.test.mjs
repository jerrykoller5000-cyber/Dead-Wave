// GB-171: the M67-style frag grenade builds with its named parts and keeps the old grenade's size and origin.
//   node --import ./studio/node-three.mjs --test studio/frag-grenade.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeFragGrenade } from './frag-grenade.js';

const box = (o) => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };

test('named parts: body, fuse, spoon, pin, ring', () => {
  const g = makeFragGrenade({ THREE, r: 0.05 });
  for (const n of ['body', 'fuse', 'spoon', 'pin', 'ring']) {
    const o = g.getObjectByName(n);
    assert.ok(o && o.isMesh, n);
    assert.ok(o.geometry.attributes.position.count > 0, n + ' has geometry');
  }
  assert.ok(g.getObjectByName('body').geometry.attributes.color, 'body carries its paint in vertex colours');
});

test('in-hand size and origin like the old one (r 0.05, 1.18 tall body, ring on top)', () => {
  const b = box(makeFragGrenade({ THREE, r: 0.05 })), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  // old: 0.1 wide, ~0.139 tall (body -0.059 .. ring 0.08), 0.1 deep
  assert.ok(s.x > 0.085 && s.x < 0.13, 'width ' + s.x);
  assert.ok(s.y > 0.11 && s.y < 0.17, 'height ' + s.y);
  assert.ok(s.z > 0.085 && s.z < 0.13, 'depth ' + s.z);
  assert.ok(Math.abs(c.x) < 0.02 && Math.abs(c.z) < 0.02 && c.y > 0 && c.y < 0.025, 'centre near the old origin ' + c.toArray().map((v) => v.toFixed(3)));
  assert.ok(b.min.y > -0.065 && b.min.y < -0.05, 'bottom ' + b.min.y);
});

test('thrown size scales with r (r 0.11)', () => {
  const s = box(makeFragGrenade({ THREE, r: 0.11 })).getSize(new THREE.Vector3());
  assert.ok(s.x > 0.2 && s.x < 0.29 && s.y > 0.24 && s.y < 0.38, s.toArray().join(','));
});

test('the spoon hugs the body (every vertex within 0.12 r of the skin, outside it)', () => {
  const g = makeFragGrenade({ THREE, r: 1 }), sp = g.getObjectByName('spoon').geometry.attributes.position, tall = 1.12;
  let worst = 0, inside = 0;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i);
    if (y > 1.0) continue;                                  // the part over the fuse
    const d = Math.hypot(x, z, y / tall) - 1;
    worst = Math.max(worst, d); if (d < -0.01) inside++;
  }
  assert.ok(worst < 0.12, 'gap ' + worst); assert.equal(inside, 0);
});

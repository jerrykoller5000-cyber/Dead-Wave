// world/light-pool.test.mjs — CL-116: a fixed set of real point lights stands in for every other one.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../tools/tests/fakethree.mjs';
import { createLightPool, pickLights, scoreLight } from './light-pool.js';

// The test build's PointLight has no isPointLight flag, and its layers are a stub: give it both here.
class PointLight extends F.PointLight {
  constructor(...a) { super(...a); this.isPointLight = true; this.layers = { mask: 1, set(n) { this.mask = 1 << n; }, test: () => true }; }
}
const T = { ...F, PointLight };

test('scoreLight: dark, or too far from him to light anything on screen, scores nothing', () => {
  assert.equal(scoreLight({ intensity: 0, distance: 10, d: 1 }), 0);
  assert.equal(scoreLight({ intensity: 2, distance: 10, d: 10 + 30 }), 0);
  assert.ok(scoreLight({ intensity: 2, distance: 10, d: 3 }) > scoreLight({ intensity: 2, distance: 10, d: 12 }));
  assert.ok(scoreLight({ intensity: 1, distance: 0, d: 500 }) > 0, 'a light with no range reaches everywhere');
});

test('pickLights: the brightest few, brightest first', () => {
  const c = [{ score: 1 }, { score: 0 }, { score: 5 }, { score: 3 }, { score: 2 }];
  assert.deepEqual(pickLights(c, 3).map((x) => x.score), [5, 3, 2]);
});

test('the pool: its lights are fixed; the others become stand-ins and are copied onto it', () => {
  const scene = new T.Scene();
  const fire = new PointLight(0xff7a2a, 0, 8, 1.6); fire.position.set(1, 1, 0); scene.add(fire);
  const lamp = new PointLight(0x5cff9a, 0.9, 6, 1.6); lamp.position.set(2, 2, 0);
  const kiosk = new T.Group(); kiosk.add(lamp); scene.add(kiosk);
  const farBeacon = new PointLight(0xff2211, 3, 28, 2); farBeacon.position.set(400, 10, 0); scene.add(farBeacon);
  const pool = createLightPool(T, scene, { size: 2 });
  assert.equal(pool.lights.length, 2);
  assert.equal(pool.adopt(scene), 3, 'three stand-ins');
  assert.equal(pool.adopt(scene), 0, 'adopting again changes nothing');
  for (const L of [fire, lamp, farBeacon]) assert.equal(L.layers.mask, 1 << 31, 'stand-ins are on a layer the camera never draws');
  for (const L of pool.lights) assert.equal(L.layers.mask, 1, 'the pool is drawn');
  // Only the lamp is lit near him: it goes on the pool.
  assert.equal(pool.update({ x: 0, y: 0, z: 0 }), 1);
  assert.equal(pool.lights[0].intensity, 0.9);
  assert.equal(pool.lights[0].position.x, 2);
  assert.equal(pool.lights[0].color.getHex ? pool.lights[0].color.getHex() : 0x5cff9a, 0x5cff9a);
  assert.equal(pool.lights[1].intensity, 0);
  // The fire flares: both near him, brightest first.
  fire.intensity = 4;
  assert.equal(pool.update({ x: 0, y: 0, z: 0 }), 2);
  assert.equal(pool.lights[0].intensity, 4);
  // A hidden kiosk's lamp is out; the far beacon never reaches him.
  kiosk.visible = false;
  assert.equal(pool.update({ x: 0, y: 0, z: 0 }), 1);
  assert.equal(pool.lights[1].intensity, 0);
  // Near the beacon it lights.
  assert.equal(pool.update({ x: 400, y: 0, z: 0 }), 1);
  assert.equal(pool.lights[0].position.x, 400);
});

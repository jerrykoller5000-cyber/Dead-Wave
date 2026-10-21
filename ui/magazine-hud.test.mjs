import test from 'node:test';
import assert from 'node:assert/strict';
import { ammoReserveUnit, magazineHudItems } from './magazine-hud.js';

test('reserve label follows the gun and its ammunition form', () => {
  assert.equal(ammoReserveUnit('m4', true), 'mags');
  assert.equal(ammoReserveUnit('revolver', true), 'loaders');
  assert.equal(ammoReserveUnit('shotgun', false), 'shells');
  assert.equal(ammoReserveUnit('launcher', false), 'rounds');
});

test('each spare magazine retains its own visible fullness', () => {
  assert.deepEqual(magazineHudItems({ size:12, spare:[12, 6, 1, 0] }), [
    { rounds:12, size:12, fullness:100 }, { rounds:6, size:12, fullness:50 },
    { rounds:1, size:12, fullness:8 }, { rounds:0, size:12, fullness:0 }
  ]);
  assert.deepEqual(magazineHudItems(null), []);
});

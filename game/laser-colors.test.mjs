import test from 'node:test';
import assert from 'node:assert/strict';
import { LASER_COLORS, laserColorOpen, laserColorsOpen } from './laser-colors.js';

test('seven colours, red first, white on day 18', () => {
  assert.equal(LASER_COLORS.length, 7);
  assert.equal(LASER_COLORS[0].id, 'red');
  assert.equal(LASER_COLORS[0].night, 1);
  assert.equal(LASER_COLORS.at(-1).id, 'white');
  assert.equal(LASER_COLORS.at(-1).night, 18);
  assert.deepEqual(LASER_COLORS.map((c) => c.night), [1, 4, 7, 10, 13, 16, 18]);
});

test('a new run has red; later nights open the rest in order', () => {
  assert.deepEqual(laserColorsOpen(1).map((c) => c.id), ['red']);
  assert.equal(laserColorOpen('blue', 6), false);
  assert.equal(laserColorOpen('blue', 7), true);
  assert.equal(laserColorOpen('white', 17), false);
  assert.equal(laserColorOpen('white', 18), true);
  assert.equal(laserColorsOpen(18).length, 7);
  assert.equal(laserColorOpen('gold', 18), false);
});

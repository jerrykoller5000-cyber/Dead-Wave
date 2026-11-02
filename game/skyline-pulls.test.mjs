import test from 'node:test';
import assert from 'node:assert/strict';
import { hqGlowOpacity } from './skyline-pulls.js';

test('the HQ haze appears only in the distant powered dusk/night view', () => {
  assert.equal(hqGlowOpacity(100, false), 0);
  assert.equal(hqGlowOpacity(0, true), 0);
  assert.equal(hqGlowOpacity(24, true), 0);
  assert.equal(hqGlowOpacity(255, true), 0);
  assert.ok(hqGlowOpacity(60, true) > 0.1);
  assert.ok(hqGlowOpacity(150, true) > 0.1);
  assert.ok(hqGlowOpacity(200, true) < hqGlowOpacity(150, true));
  assert.equal(hqGlowOpacity(Infinity, true), 0);
});

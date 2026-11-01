import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNightWarnings } from './night-warnings.js';

const base = [14.8, true, true, true, true];
const sound = { kind: 'brush', x: 8, z: -9, distance: 14.8, volume: 0.22, pan: -0.6, night: true, type: 'shambler' };

test('first approach through dark cover is eligible well outside strike range', () => {
  const gate = createNightWarnings(), zombie = {};
  assert.equal(gate.ready(zombie, ...base), true);
  assert.equal(gate.emit(zombie, sound).distance, 14.8);
  assert.equal(gate.events()[0].pan, -0.6);
});

test('a body cannot repeat inside a second and a pack cannot all sound at once', () => {
  const gate = createNightWarnings(), first = {}, second = {};
  gate.emit(first, sound);
  assert.equal(gate.ready(first, ...base), false);
  assert.equal(gate.ready(second, ...base), false);
  gate.advance(0.31);
  assert.equal(gate.ready(second, ...base), true);
  gate.emit(second, sound);
  gate.advance(0.95);
  assert.equal(gate.ready(first, ...base), false);
  gate.advance(0.8);
  assert.equal(gate.ready(first, ...base), true);
});

test('day warnings are rarer; sleepers, visible, stationary, distant and disabled are silent', () => {
  const gate = createNightWarnings(), zombie = {};
  for (const args of [[14.8, false, true, true, true], [14.8, true, false, true, true],
    [14.8, true, true, false, true], [16, true, true, true, true],
    [2, true, true, true, true], [14.8, true, true, true, false]]) assert.equal(gate.ready(zombie, ...args), false);
  gate.emit(zombie, { ...sound, night: false });
  gate.advance(2);
  assert.equal(gate.ready(zombie, ...base), false);
  gate.advance(3.3);
  assert.equal(gate.ready(zombie, ...base), true);
});

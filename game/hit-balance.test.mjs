import test from 'node:test';
import assert from 'node:assert/strict';
import {HIT_PERCENT, HIT_SHELL, ZOMBIE_HP, listedBodyDamage} from './hit-balance.js';

test('D-86 rotary and breacher rows scale Jerry\'s originals to one decimal', () => {
  const kinds = Object.keys(ZOMBIE_HP);
  const original = {
    minigun: [40, 70, 60, 13, 30, 10, 4, 35, 35, 35, 6, 1, 2],
    aa12: [150, 330, 170, 88, 115, 35, 15, 102.9, 75, 102.9, 40, 4, 6]
  };
  for (const [weapon, scale] of [['minigun', 1.6], ['aa12', 1.4]]) {
    for (const [i, kind] of kinds.entries()) {
      assert.equal(HIT_PERCENT[weapon][kind], Math.round(original[weapon][i] * scale * 10) / 10, `${weapon} on ${kind}`);
    }
  }
  assert.equal(HIT_SHELL.aa12, 5);
});

test('sheet damage reads this body\'s max HP and still divides a whole shell into pellets', () => {
  assert.equal(listedBodyDamage('pistol', 'feral', undefined, 73), 73);
  assert.equal(listedBodyDamage('pistol', 'feral', undefined, 146), 146);
  assert.equal(listedBodyDamage('aa12', 'shambler', undefined, 100), 42);
  assert.equal(listedBodyDamage('aa12', 'shambler', 10, 100), 21);
  assert.equal(listedBodyDamage('pistol', 'feral'), ZOMBIE_HP.feral);
  assert.equal(listedBodyDamage('unknown', 'feral', undefined, 73), null);
  assert.equal(listedBodyDamage('pistol', 'feral', undefined, 0), null);
});

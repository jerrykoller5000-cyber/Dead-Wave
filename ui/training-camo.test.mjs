// GB-168: every camo open at the CIF in training; the real game and the saved profile unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnlocks, FREE_CAMOS } from './unlocks.js';
import { CAMO_KEYS } from '../core/camo.js';
import { trainingCamoGate } from './training-camo.js';

test('training: all camos unlocked; real game: unchanged; profile not written', () => {
  let saved = JSON.stringify({ version: 1, unlocked: ['khaki'] }), writes = 0, training = false;
  const u = trainingCamoGate(createUnlocks({ load: () => saved, save: (v) => { writes++; saved = v; } }), () => training);
  const before = saved;
  const realOpen = CAMO_KEYS.filter((k) => u.isUnlocked(k));
  assert.deepEqual(realOpen.sort(), [...FREE_CAMOS, 'khaki'].sort(), 'real game: free four + what he earned');
  training = true;
  assert.ok(CAMO_KEYS.every((k) => u.isUnlocked(k)), 'training: every pattern open');
  assert.ok(!u.isUnlockedReal('multicam'), 'the real set is still asked underneath');
  training = false;
  assert.deepEqual(CAMO_KEYS.filter((k) => u.isUnlocked(k)).sort(), realOpen.sort(), 'back in the real game: as before');
  assert.equal(writes, 0); assert.equal(saved, before, 'the unlock profile was never written');
  assert.equal(trainingCamoGate(u, () => true), u); assert.ok(!u.isUnlocked('multicam'), 'not wrapped twice');
});

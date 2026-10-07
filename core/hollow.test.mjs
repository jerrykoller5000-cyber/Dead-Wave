// node --test core/hollow.test.mjs   (CU-86: the runtime's snapshot for the HUD and the HQ board)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHollow } from './hollow.js';

const warren = (entryY = -400) => ({ entry: { x: 0, y: entryY, z: 0 }, groundAt: () => entryY, group: null });
const RING = [{ cave: 0, theme: 'root' }, { cave: 2, theme: 'shale' }, { cave: 3, theme: 'iron' }, { cave: 4, theme: 'wet' }, { cave: 5, theme: 'hill' }];

test('depth is live: from where he stands against the mouth, 4 m a floor, a ramp counts from its middle', () => {
  const at = { x: 0, y: -400, z: 0 };
  const h = createHollow({ where: () => at });
  assert.equal(h.state().depth, 1, 'topside is 1');
  h.enter({ cave: 0, theme: 'root' }, warren());
  for (const [y, want] of [[-399.95, 1], [-401.9, 1], [-402, 2], [-404, 2], [-405.9, 2], [-406, 3], [-408, 3], [-420, 3], [-390, 1]]) {
    at.y = y;
    assert.equal(h.state().depth, want, 'y ' + y + ' -> ' + want);
  }
  at.y = -408;
  h.leave('mouth');
  assert.equal(h.state().depth, 1, 'and 1 again once he is up');
});

test('the secret\'s heart counts as the Deep, whatever its floor', () => {
  const at = { x: 0, y: -900, z: 0 };
  const h = createHollow({ where: () => at });
  h.enter({ cave: 1, theme: 'iron', place: 'heart' }, warren(-900));
  assert.equal(h.state().depth, 3);
  assert.equal(h.state().place, 'heart');
  h.leave('heart'); h.enter({ cave: 1, theme: 'iron' }, warren());
  assert.equal(h.state().place, 'warren', 'back in the warren it is a warren again');
});

test('every warren is listed in compass order with its clearance, and a cleared one opens its passage', () => {
  const h = createHollow({ ring: () => RING });
  let s = h.state();
  assert.deepEqual(s.warrens.map((w) => w.cave), [0, 2, 3, 4, 5]);
  assert.ok(s.warrens.every((w) => !w.cleared && w.passage && !w.passage.open), 'nothing cleared, nothing open at first');
  assert.deepEqual(s.warrens.map((w) => w.passage.to), [2, 3, 4, 5, 0], 'each passage leads to the next round the compass, the last back to the first');
  h.enter({ cave: 3, theme: 'iron' }, warren());
  h.markCleared();
  s = h.state();
  assert.deepEqual(s.clearedCaves, [3]);
  assert.equal(s.cleared, true, 'this warren is cleared');
  const w3 = s.warrens.find((w) => w.cave === 3);
  assert.deepEqual(w3, { cave: 3, theme: 'iron', cleared: true, passage: { to: 4, open: true } });
  assert.equal(s.warrens.filter((w) => w.passage.open).length, 1, 'only that one is open');
  h.markCleared();
  assert.deepEqual(h.state().clearedCaves, [3], 'clearing twice is one');
  h.leave('mouth');
  assert.deepEqual(h.state().clearedCaves, [3], 'it is held for the run, not for the visit');
  assert.equal(h.state().cleared, false, 'and "this warren" is nothing while he is up');
});

test('a new run closes them all', () => {
  const h = createHollow({ ring: () => RING });
  h.enter({ cave: 0, theme: 'root' }, warren()); h.markCleared(); h.note(10, 10); h.leave('mouth');
  h.enter({ cave: 2, theme: 'shale' }, warren()); h.markCleared(); h.note(10, 10); h.leave('mouth');
  assert.deepEqual(h.state().clearedCaves, [0, 2]);
  h.reset();
  const s = h.state();
  assert.deepEqual(s.clearedCaves, []);
  assert.ok(s.warrens.every((w) => !w.cleared && !w.passage.open));
});

test('no ring, one warren: no passages to speak of, and nothing throws', () => {
  assert.deepEqual(createHollow().state().warrens, []);
  const one = createHollow({ ring: () => [{ cave: 4, theme: 'wet' }] });
  assert.equal(one.state().warrens[0].passage, null, 'a passage needs somewhere to go');
  assert.equal(createHollow({ ring: () => null }).state().warrens.length, 0);
});

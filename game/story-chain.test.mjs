// CL-263: the story chain's rules (docs/specs/story-chain.md §3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoryChain, LEADS, leadForSite, CHAIN_RULES } from './story-chain.js';

const play = (c, day, doneToday = []) => { const o = c.dawn(day); for (const id of doneToday) c.done(id); return o; };

test('day 1 opens nothing; day 2 opens the generator', () => {
  const c = createStoryChain();
  assert.deepEqual(c.dawn(1), []);
  assert.deepEqual(c.read().open, []);
  assert.deepEqual(c.dawn(2), ['generator']);
  assert.equal(c.stateOf('relay'), 'closed');
});

test('each lead opens the dawn after its cause is done, in order, one a dawn', () => {
  const c = createStoryChain();
  const want = { 2: 'generator', 3: 'relay', 4: 'medical', 5: 'missing', 6: 'truck', 7: 'search', 8: 'oldman', 9: 'below' };
  for (let d = 1; d <= 9; d++) {
    const o = c.dawn(d);
    assert.deepEqual(o, want[d] ? [want[d]] : [], 'day ' + d);
    if (want[d] && want[d] !== 'below') c.done(want[d]);   // he does each lead the day it opens
  }
  assert.deepEqual(c.read().done, ['generator', 'relay', 'medical', 'missing', 'truck', 'search', 'oldman']);
});

test('never before its earliest day, even when its cause is done early', () => {
  const c = createStoryChain();
  c.dawn(2); c.done('generator');
  c.open('relay'); c.done('relay');   // he went to the mast on his own on day 2
  assert.deepEqual(c.dawn(3), []);   // the medical run's earliest is day 4
  assert.deepEqual(c.dawn(4), ['medical']);
});

test('a cause left undone for two dawns lets the next lead open anyway', () => {
  const c = createStoryChain();
  c.dawn(2);                          // generator open, ignored
  assert.deepEqual(c.dawn(3), []);    // one dawn: the relay waits
  assert.deepEqual(c.dawn(4), ['relay']);   // two dawns: the relay opens anyway
  assert.deepEqual(c.read().open, ['generator', 'relay']);
});

test('never more than two open', () => {
  const c = createStoryChain();
  for (let d = 1; d <= 12; d++) c.dawn(d);   // he does nothing for twelve days
  assert.equal(c.read().open.length, CHAIN_RULES.maxOpen);
  c.done('generator');
  const o = c.dawn(13);
  assert.equal(o.length, 1, 'one more opens once one is done');
});

test('a jump over several days still opens at most one a dawn', () => {
  const c = createStoryChain();
  c.dawn(2); c.done('generator');
  const o = c.dawn(6);   // days 3-6 at once (a dev jump), nothing done meanwhile
  assert.deepEqual(o, ['relay', 'medical']);   // the relay on day 3; the medical run on day 5 by the two-dawn fallback
  assert.deepEqual(c.read().log.filter((e) => e.what === 'open').map((e) => e.day), [2, 3, 5]);
});

test('the two threads: the truck and the search both follow the missing', () => {
  const c = createStoryChain();
  play(c, 2, ['generator']); play(c, 3, ['relay']); play(c, 4, ['medical']); play(c, 5, ['missing']);
  assert.deepEqual(c.dawn(6), ['truck']);
  assert.deepEqual(c.dawn(7), ['search']);   // the truck still open: a second lead
  assert.deepEqual(c.read().open, ['truck', 'search']);
  assert.deepEqual(c.dawn(8), []);           // two open, and the old man waits for the search anyway
  c.done('search');
  assert.deepEqual(c.dawn(9), ['oldman']);
});

test('sites: a site without a lead is always open; a lead\'s site is open once its lead is', () => {
  const c = createStoryChain();
  assert.equal(c.siteOpen('somewhere-else'), true);
  assert.equal(c.siteOpen('objective:radio-repair'), false);
  c.dawn(2);
  assert.equal(c.siteOpen('objective:fuel-depot'), true);
  assert.equal(leadForSite('objective:trapper-cache').id, 'oldman');
  assert.equal(new Set(LEADS.map((l) => l.site).filter(Boolean)).size, 7, 'seven sites, one lead each');
});

test('reset, openAll and the log', () => {
  const c = createStoryChain();
  assert.equal(c.openAll(), LEADS.length);
  assert.equal(c.read().open.length, LEADS.length);
  c.reset();
  assert.deepEqual(c.read().open, []);
  c.dawn(2); c.done('generator');
  assert.deepEqual(c.read().log.map((e) => e.what + ':' + e.id), ['open:generator', 'done:generator']);
});

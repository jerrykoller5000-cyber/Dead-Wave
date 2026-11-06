// game/chain-line.test.mjs - CL-303 (D-116): the straight-line chain and the story places' new locks behind ?gates=1
// (story-chain.js LINE_RULES, chain-gates.js line). Jerry, 6 Nov: "You cannot complete the one until you finish the other."
import assert from 'node:assert/strict';
import test from 'node:test';
import { createStoryChain, LEADS, LINE_RULES } from './story-chain.js';
import { createChainGates, GATES, LINE_GATES, gateById, gateOfKey } from './chain-gates.js';

const ORDER = ['generator', 'relay', 'medical', 'missing', 'truck', 'search', 'oldman', 'below'];

test('the line: one lead at a time, in order, each the dawn after the one before is done and stamped', () => {
  const c = createStoryChain({ rules: LINE_RULES });
  assert.deepEqual(c.dawn(1), []);
  let day = 2;
  for (const id of ORDER) {
    assert.deepEqual(c.dawn(day), [id], 'day ' + day);
    assert.deepEqual(c.read().open, [id], 'only ' + id + ' open');
    assert.deepEqual(c.dawn(day), [], 'nothing more the same day');
    if (id === 'below') break;
    assert.ok(c.done(id));
    assert.equal(c.due(), id);
    assert.deepEqual(c.dawn(day + 1), [], 'done but not stamped: nothing opens');
    assert.ok(c.stamp(id)); assert.equal(c.due(), null);
    day += 2;
  }
  assert.equal(c.stateOf('below'), 'open');
});

test('the line: search waits for the truck (the fork is gone)', () => {
  const c = createStoryChain({ rules: LINE_RULES });
  let day = 2;
  for (const id of ['generator', 'relay', 'medical', 'missing']) { c.dawn(day); c.done(id); c.stamp(id); day++; }
  assert.deepEqual(c.dawn(day), ['truck']);
  for (let d = day + 1; d < day + 6; d++) assert.deepEqual(c.dawn(d), [], 'no fallback: day ' + d);
  assert.equal(c.stateOf('search'), 'closed');
  c.done('truck'); c.stamp('truck');
  assert.deepEqual(c.dawn(day + 6), ['search']);
});

test('the line: no fallback, a closed lead cannot be done, an unstamped lead never lets the next open', () => {
  const c = createStoryChain({ rules: LINE_RULES });
  c.dawn(2);
  assert.equal(c.done('relay'), false, 'the mast before the depot: refused');
  assert.equal(c.stateOf('relay'), 'closed');
  for (let d = 3; d < 12; d++) assert.deepEqual(c.dawn(d), [], 'the depot undone: nothing opens, day ' + d);
  assert.equal(c.stamp('generator'), false, 'not done: nothing to stamp');
  c.done('generator');
  for (let d = 12; d < 15; d++) assert.deepEqual(c.dawn(d), [], 'done, not stamped: day ' + d);
  c.stamp('generator');
  assert.deepEqual(c.dawn(15), ['relay']);
});

test('the old rules are unchanged without the line', () => {
  const c = createStoryChain();
  c.dawn(2); c.dawn(3); c.dawn(4);
  assert.deepEqual(c.read().open, ['generator', 'relay'], 'fallback and two open, as before');
  assert.equal(gateById('mast-yard').key, 'sato-key');
  assert.equal(gateById('trail-chain').key, 'chain-key');
  assert.equal(GATES.length, LINE_GATES.length);
});

test('the line gates: vines and the machete at the mast, the crashed truck and the winch at the hikers', () => {
  const mast = gateById('mast-yard', true), trail = gateById('trail-chain', true);
  assert.deepEqual([mast.blocker, mast.key, mast.kind, mast.source, mast.ready], ['vines', 'machete', 'tool', 'depot-shed', 'start']);
  assert.deepEqual([trail.blocker, trail.key, trail.kind, trail.source, trail.ready], ['crashed-truck', 'winch', 'tool', 'convoy-escort-truck', 'start']);
  assert.equal(gateOfKey('machete', true).gate, 'mast-yard');
  assert.equal(gateById('ranger-gate', true).key, 'ranger-gate-key', 'the rangers keep their stone and key');
  assert.equal(gateById('depot-shed', true).key, 'price-key', 'the depot keeps its stone and key');
  assert.equal(gateById('toolbox-chain', true).key, 'bolt-cutters', 'the bolt cutters stay Clarke\'s toolbox\'s');
});

test('the line gates: a tool or key got early waits for its lead; no spares; the katana counts for the vines', () => {
  const chain = createStoryChain({ rules: LINE_RULES });
  let katana = false;
  const g = createChainGates({ line: true, leadOpen: (l) => chain.isOpen(l), hasTool: (k) => k === 'machete' && katana });
  // The bolt cutters lie at the mine from day 1: taken, they still can't cut Clarke's toolbox before the truck's turn.
  assert.ok(g.take('bolt-cutters'));
  assert.equal(g.canOpen('toolbox-chain'), false); assert.equal(g.whyShut('toolbox-chain'), 'not-yet');
  // The machete lies in the depot shed from day 1 (inside the depot's ring, so it comes with the depot's turn).
  assert.equal(g.keyState('machete'), 'ready');
  chain.dawn(2); chain.done('generator');
  assert.equal(g.canOpen('mast-yard'), false, 'the relay lead is not open yet (stamp pending)');
  chain.stamp('generator'); chain.dawn(3);
  assert.equal(g.whyShut('mast-yard'), 'no-key');
  katana = true; assert.equal(g.canOpen('mast-yard'), true, 'the katana cuts vines'); katana = false;
  assert.ok(g.take('machete')); assert.ok(g.open('mast-yard'));
  // No spares, however long a lead waits.
  for (let d = 3; d < 20; d++) assert.deepEqual(g.dawn(d, chain.read()), []);
  // The winch lies at the convoy from day 1, and can't move the truck before the hikers' turn.
  assert.ok(g.take('winch')); assert.equal(g.whyShut('trail-chain'), 'not-yet');
});

test('every lead of the line can always be finished: its gate opens with what the place before hands over', () => {
  const chain = createStoryChain({ rules: LINE_RULES });
  const g = createChainGates({ line: true, leadOpen: (l) => chain.isOpen(l) });
  const EV = { 'hq-power': 'generator', 'vault-first-lift': 'relay', 'lead-done:generator': 'generator', 'lead-done:medical': 'medical',
    'toolbox-open': 'truck', 'search-log-read': 'search', 'cellar-open': 'oldman', 'hush-wired': 'oldman', start: null };
  let day = 2;
  for (const id of ORDER) {
    chain.dawn(day);
    assert.equal(chain.stateOf(id), 'open', id + ' open on day ' + day);
    const spec = LINE_GATES.find((x) => x.lead === id);
    if (spec.also) g.event(spec.also);
    if (g.keyState(spec.key) === 'ready') g.take(spec.key);
    assert.ok(g.open(spec.gate), id + ': its gate opens (' + g.whyShut(spec.gate) + ')');
    chain.done(id); chain.stamp(id);
    // What finishing this place hands the next.
    for (const [ev, lead] of Object.entries(EV)) if (lead === id) g.event(ev);
    day++;
  }
});

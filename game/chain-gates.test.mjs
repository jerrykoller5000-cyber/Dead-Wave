// game/chain-gates.test.mjs - CL-285 part C: the chain's blockers and keys (game/chain-gates.js).
import assert from 'node:assert/strict';
import test from 'node:test';
import { createChainGates, GATES, gateOfLead, gateById, gateOfKey, SPARE_DAWNS } from './chain-gates.js';
import { LEADS, createStoryChain } from './story-chain.js';

test('one gate for every lead of the chain, in its order, each key from the place before', () => {
  assert.deepEqual(GATES.map((g) => g.lead), LEADS.map((l) => l.id).filter((id) => gateOfLead(id)));
  assert.equal(GATES.length, 8);
  for (const l of LEADS) assert.ok(gateOfLead(l.id), 'a gate for ' + l.id);
  assert.equal(new Set(GATES.map((g) => g.key)).size, 8, 'eight different keys');
  assert.equal(gateById('trail-chain').key, 'chain-key');
  assert.equal(gateOfKey('ranger-gate-key').source, 'clarke-toolbox');
});

test('Price\'s key is there from the start; Sato\'s only once the HQ has power', () => {
  const c = createChainGates();
  assert.equal(c.keyState('price-key'), 'ready');
  assert.equal(c.keyState('sato-key'), 'unseen');
  assert.equal(c.take('sato-key'), false, 'the drawer is shut without power');
  assert.deepEqual(c.event('hq-power'), ['sato-key']);
  assert.deepEqual(c.event('hq-power'), [], 'twice is once');
  assert.equal(c.take('sato-key'), true);
  assert.equal(c.keyState('sato-key'), 'held');
});

test('a gate opens with its key held, stays open, and opens its lead\'s site', () => {
  const c = createChainGates();
  assert.equal(c.leadPast('generator'), false);
  assert.equal(c.whyShut('depot-shed'), 'no-key');
  assert.equal(c.open('depot-shed'), false);
  c.take('price-key');
  assert.equal(c.whyShut('depot-shed'), null);
  assert.equal(c.open('depot-shed'), true);
  assert.equal(c.isOpen('depot-shed'), true);
  assert.equal(c.whyShut('depot-shed'), 'open');
  assert.equal(c.open('depot-shed'), false, 'already open');
  assert.equal(c.leadPast('generator'), true);
  assert.equal(c.leadPast('nonesuch'), true, 'a lead with no gate is never held up');
});

test('the mine\'s iron gate wants the trapper\'s key ring and the Hush wired', () => {
  const c = createChainGates();
  c.event('cellar-open'); c.take('trapper-keyring');
  assert.equal(c.whyShut('mine-iron-gate'), 'needs:hush-wired');
  assert.equal(c.open('mine-iron-gate'), false);
  c.event('hush-wired');
  assert.equal(c.open('mine-iron-gate'), true);
});

test('the combination is learned from the search log, not found lying about', () => {
  const c = createChainGates();
  assert.equal(c.take('trapper-combination'), false);
  c.event('search-log-read');
  assert.equal(c.take('trapper-combination'), true);
  assert.equal(c.open('trapper-fence'), true);
});

test('a lead the chain opened by its fallback gets a spare key at the HQ after ' + SPARE_DAWNS + ' dawns', () => {
  const chain = createStoryChain(), c = createChainGates();
  // the generator never done: the relay opens by the chain's fallback on day 4
  for (let d = 1; d <= 4; d++) chain.dawn(d);
  assert.equal(chain.stateOf('relay'), 'open');
  assert.equal(c.keyState('sato-key'), 'unseen', 'no power, no drawer');
  assert.deepEqual(c.dawn(5, chain.read()), [], 'one dawn open: not yet');
  assert.deepEqual(c.dawn(6, chain.read()), ['mast-yard']);
  assert.equal(c.keyState('sato-key'), 'ready');
  assert.equal(c.keySource('sato-key'), 'hq-board');
  assert.deepEqual(c.dawn(7, chain.read()), [], 'once');
  // a key already ready never needs a spare
  assert.equal(c.keySource('price-key'), 'hq-generator');
});

test('read and load round-trip; reset starts over', () => {
  const c = createChainGates();
  c.take('price-key'); c.open('depot-shed'); c.event('hq-power');
  const saved = JSON.parse(JSON.stringify(c.read()));
  const d = createChainGates(); d.load(saved);
  assert.deepEqual(d.read(), c.read());
  d.reset();
  assert.equal(d.isOpen('depot-shed'), false);
  assert.equal(d.keyState('price-key'), 'ready');
  assert.equal(d.keyState('sato-key'), 'unseen');
});

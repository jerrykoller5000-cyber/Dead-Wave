// game/utilities.test.mjs - CL-289 (D-106): the HQ's utilities, one a mini-game (game/utilities.js).
import assert from 'node:assert/strict';
import test from 'node:test';
import { createUtilities, UTILITIES, utilityOfLead } from './utilities.js';
import { LEADS } from './story-chain.js';

test('one utility for every lead of the chain', () => {
  assert.equal(UTILITIES.length, 8);
  for (const l of LEADS) assert.ok(utilityOfLead(l.id), 'a utility for ' + l.id);
  assert.equal(utilityOfLead('missing').id, 'plumbing');
});

test('the generator done: the power comes on by itself', () => {
  const u = createUtilities();
  assert.equal(u.whyOff('power'), 'not-earned');
  assert.deepEqual(u.leadDone('generator'), ['power']);
  assert.equal(u.isOn('power'), true);
  assert.deepEqual(u.leadDone('generator'), [], 'once');
});

test('plumbing waits on the power, then on him at the pump', () => {
  const u = createUtilities();
  u.leadDone('missing');
  assert.equal(u.whyOff('plumbing'), 'needs:power');
  assert.equal(u.installAt('hq-pump'), null);
  assert.equal(u.install('plumbing'), false);
  u.leadDone('generator');
  assert.equal(u.whyOff('plumbing'), 'install');
  assert.equal(u.installAt('hq-pump'), 'plumbing');
  assert.equal(u.install('plumbing'), true);
  assert.equal(u.isOn('plumbing'), true);
  assert.equal(u.install('plumbing'), false, 'once');
});

test('a utility not yet earned can\'t be set up', () => {
  const u = createUtilities();
  u.leadDone('generator');
  assert.equal(u.install('alarm'), false);
  assert.equal(u.whyOff('alarm'), 'not-earned');
});

test('iron is a supply: four horseshoe sets to hang, used one at a time', () => {
  const u = createUtilities();
  u.leadDone('oldman');
  assert.equal(u.isOn('iron'), true);
  assert.equal(u.supply('horseshoes'), 4);
  assert.equal(u.use('horseshoes'), true);
  assert.equal(u.supply('horseshoes'), 3);
  assert.equal(u.use('horseshoes', 5), false);
});

test('read and load round-trip; reset starts over', () => {
  const u = createUtilities();
  u.leadDone('generator'); u.leadDone('truck'); u.install('workshop'); u.leadDone('oldman'); u.use('horseshoes');
  const v = createUtilities(); v.load(JSON.parse(JSON.stringify(u.read())));
  assert.deepEqual(v.read(), u.read());
  v.reset();
  assert.equal(v.isOn('power'), false);
  assert.equal(v.supply('horseshoes'), 0);
});

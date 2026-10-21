import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirstRunChoice } from './first-run-choice.js';

test('a profile with no completed runs sees the invitation once across sessions', () => {
  let stored = null;
  const make = () => createFirstRunChoice({ load: () => stored, save: value => { stored = value; } });
  const first = make();
  assert.equal(first.offer(0), true);
  assert.equal(first.offer(0), false);
  assert.equal(stored, 'seen');
  assert.equal(make().offer(0), false);
});

test('a returning profile is never offered the invitation', () => {
  const choice = createFirstRunChoice();
  assert.equal(choice.offer(1), false);
  assert.equal(choice.offer(12), false);
});

test('storage denial still leaves only one invitation in this session', () => {
  const choice = createFirstRunChoice({ load: () => { throw Error('denied'); }, save: () => { throw Error('denied'); } });
  assert.equal(choice.offer(0), true);
  assert.equal(choice.offer(0), false);
});

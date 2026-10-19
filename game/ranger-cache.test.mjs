// node game/ranger-cache.test.mjs — CL-217
import assert from 'node:assert/strict';
import test from 'node:test';
import { RANGER, createRangerCache } from './ranger-cache.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('three clues, each 1-9, and the code is them in the lid order', () => {
  for (let k = 0; k < 200; k++) {
    const c = createRangerCache();
    const s = c.state;
    assert.equal(s.code.length, RANGER.LEN);
    assert.deepEqual([...s.order].sort(), ['board', 'radio', 'truck']);
    for (const src of RANGER.SOURCES) assert.ok(s.clues[src] >= 1 && s.clues[src] <= 9);
    assert.deepEqual(s.code, s.order.map((o) => s.clues[o]));
  }
});

test('the right code opens it; a wrong one clears the entry with no penalty', () => {
  const c = createRangerCache(seq([0.1, 0.5, 0.9, 0.3, 0.7]));
  const code = c.state.code.slice();
  const wrong = code.map((d) => (d % 9) + 1);
  assert.equal(c.enter(wrong[0]), 'more');
  assert.equal(c.enter(wrong[1]), 'more');
  assert.equal(c.enter(wrong[2]), 'wrong');
  assert.deepEqual(c.state.entry, []);
  assert.equal(c.unlocked(), false);
  assert.equal(c.enter(code[0]), 'more');
  assert.equal(c.enter(code[1]), 'more');
  assert.equal(c.enter(code[2]), 'open');
  assert.equal(c.unlocked(), true);
  assert.equal(c.enter(1), 'done');
});

test('no 0 and nothing that is not a digit', () => {
  const c = createRangerCache();
  assert.equal(c.enter(0), 'more'); assert.equal(c.enter(10), 'more'); assert.equal(c.enter(2.5), 'more');
  assert.deepEqual(c.state.entry, []);
});

test('reset deals a new code and shuts it again', () => {
  const c = createRangerCache(seq([0.05, 0.15, 0.25, 0.35, 0.45]));
  const c1 = c.state.code.join('');
  for (const d of c.state.code) c.enter(d);
  assert.equal(c.unlocked(), true);
  c.reset(seq([0.95, 0.85, 0.75, 0.65, 0.55]));
  assert.equal(c.unlocked(), false);
  assert.notEqual(c.state.code.join(''), c1);
});

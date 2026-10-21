import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuardianEscapeFeedback } from './guardian-escape.js';
import { text } from './strings.js';

test('the escape prompt tracks each press, closes at the lip, and shows the lost bag only after escape', () => {
  const views = [];
  const feedback = createGuardianEscapeFeedback({ onView: view => views.push(view) });
  feedback.handle({ type: 'run-reset', runId: 9 });
  feedback.handle({ type: 'cave-guardian', runId: 9, phase: 'aggro', state: 'open' });
  assert.equal(feedback.read().mode, 'hidden');
  feedback.handle({ type: 'cave-guardian', runId: 9, phase: 'escape', state: 'open', presses: 0, need: 5 });
  for (let presses = 1; presses <= 4; presses++) {
    feedback.handle({ type: 'cave-guardian', runId: 9, phase: 'escape', state: 'press', presses, need: 5 });
    assert.equal(feedback.read().presses, presses);
  }
  feedback.handle({ type: 'cave-guardian', runId: 9, phase: 'escape', state: 'free', presses: 5, need: 5 });
  assert.equal(feedback.read().mode, 'hidden');
  feedback.handle({ type: 'guardian-kick-free', runId: 9, receiptId: 'kick-free:9:1', lostCount: 7 });
  assert.deepEqual(feedback.read(), { mode: 'result', presses: 0, need: 0, lostCount: 7, runId: 9 });
  feedback.handle({ type: 'guardian-kick-free', runId: 9, receiptId: 'kick-free:9:1', lostCount: 7 });
  assert.equal(views.filter(view => view.mode === 'result').length, 1);
  assert.equal(text('guardian.escape.prompt'), 'Kick free! (E)');
  assert.equal(text('guardian.escape.lostSkulls'), 'It took your skulls.');
  feedback.clearResult();
  assert.equal(feedback.read().mode, 'hidden');
  feedback.handle({ type: 'cave-guardian', runId: 9, phase: 'escape', state: 'open', presses: 0, need: 5 });
  feedback.handle({ type: 'cave-guardian', runId: 9, phase: 'escape', state: 'closed', presses: 0, need: 5 });
  assert.equal(feedback.read().mode, 'hidden');
});

test('a new run clears the notice and receipts; stale events and empty-bag claims stay honest', () => {
  const feedback = createGuardianEscapeFeedback();
  feedback.handle({ type: 'run-reset', runId: 2 });
  feedback.handle({ type: 'cave-guardian', runId: 1, phase: 'escape', state: 'open', presses: 0, need: 5 });
  assert.equal(feedback.read().mode, 'hidden');
  feedback.handle({ type: 'guardian-kick-free', runId: 2, receiptId: 'kick-free:2:1', lostCount: 0 });
  assert.equal(feedback.read().lostCount, 0);
  assert.equal(text('guardian.escape.free'), 'You kicked free.');
  feedback.handle({ type: 'run-reset', runId: 3 });
  assert.equal(feedback.read().mode, 'hidden');
  feedback.handle({ type: 'guardian-kick-free', runId: 2, receiptId: 'kick-free:2:1', lostCount: 7 });
  assert.equal(feedback.read().mode, 'hidden');
});

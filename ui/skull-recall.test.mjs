import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkullRecallFeedback } from './skull-recall.js';
import { text } from './strings.js';

test('last-kill recalled skulls make one chime and show the accumulated count', () => {
  const counts = [], calls = [];
  const cue = createSkullRecallFeedback({ onCount: n => counts.push(n), onChime: () => calls.push('chime') });
  cue.handle({ type: 'wave-last-kill', runId: 5 });
  cue.handle({ type: 'skull-pickup', runId: 5, count: 1, recalled: true });
  cue.handle({ type: 'skull-pickup', runId: 5, count: 2, recalled: true });
  cue.handle({ type: 'skull-pickup', runId: 5, count: 1, recalled: true });
  assert.deepEqual(counts, [1, 3, 4]);
  assert.deepEqual(calls, ['chime']);
  assert.equal(text('hud.skullRecall', { count: 4 }), '+4 skulls');
  assert.equal(text('hud.skullRecall', { count: 1 }), '+1 skull');
});

test('ordinary and zip pickups do not enter the recall batch', () => {
  const counts = [], calls = [];
  const cue = createSkullRecallFeedback({ onCount: n => counts.push(n), onChime: () => calls.push('chime') });
  cue.handle({ type: 'skull-pickup', runId: 1, count: 1, recalled: true });
  cue.handle({ type: 'wave-last-kill', runId: 1 });
  cue.handle({ type: 'skull-pickup', runId: 1, count: 1, zipped: true });
  cue.handle({ type: 'skull-pickup', runId: 1, count: 1 });
  cue.handle({ type: 'skull-pickup', runId: 0, count: 1, recalled: true });
  cue.handle({ type: 'skull-pickup', runId: 1, count: 0, recalled: true });
  assert.deepEqual(counts, []);
  assert.deepEqual(calls, []);
});

test('a new run and the next wave each start a fresh single-chime batch', () => {
  let chimes = 0, cleared = 0;
  const cue = createSkullRecallFeedback({ onChime: () => chimes++, onClear: () => cleared++ });
  cue.handle({ type: 'wave-last-kill', runId: 1 });
  cue.handle({ type: 'skull-pickup', runId: 1, count: 1, recalled: true });
  cue.handle({ type: 'alarm-started', runId: 1 });
  cue.handle({ type: 'skull-pickup', runId: 1, count: 1, recalled: true });
  cue.handle({ type: 'wave-last-kill', runId: 1 });
  cue.handle({ type: 'skull-pickup', runId: 1, count: 1, recalled: true });
  cue.handle({ type: 'run-reset', runId: 2 });
  cue.handle({ type: 'wave-last-kill', runId: 2 });
  cue.handle({ type: 'skull-pickup', runId: 2, count: 1, recalled: true });
  assert.equal(chimes, 3);
  assert.equal(cleared, 5);
  assert.equal(cue.read().count, 1);
});

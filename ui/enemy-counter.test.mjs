import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTER } from '../game/weaknesses.js';
import { createEnemyCounterCards } from './enemy-counter.js';
import { text } from './strings.js';

test('first encounter cards use the shared counter kinds once each and queue simultaneous kinds', () => {
  const views = [];
  const cards = createEnemyCounterCards({ onView: view => views.push(view) });
  cards.handle({ type: 'run-reset', runId: 4 });
  cards.handle({ type: 'enemy-first-seen', runId: 4, kind: 'brute' });
  cards.handle({ type: 'enemy-first-seen', runId: 4, kind: 'screamer' });
  cards.handle({ type: 'enemy-first-seen', runId: 4, kind: 'brute' });
  cards.handle({ type: 'enemy-first-seen', runId: 4, kind: '__proto__' });
  assert.deepEqual(cards.read().queued, ['screamer']);
  assert.equal(views.filter(Boolean).length, 1);
  assert.equal(views[1].title, `New threat: ${text('enemy.brute.name')}`);
  assert.equal(views[1].line, text('counter.brute'));
  cards.advance();
  assert.equal(views[2].kind, 'screamer');
  assert.equal(views[2].line, text('counter.screamer'));
  cards.advance();
  assert.equal(cards.read().current, null);
  assert.equal(views[3], null);
  assert.deepEqual(Object.keys(COUNTER).length, 13);
});

test('run reset clears pending cards and permits the next run; stale and unknown events stay hidden', () => {
  const cards = createEnemyCounterCards();
  cards.handle({ type: 'run-reset', runId: 1 });
  cards.handle({ type: 'enemy-first-seen', runId: 1, kind: 'feral' });
  cards.handle({ type: 'enemy-first-seen', runId: 1, kind: 'demon' });
  cards.handle({ type: 'run-reset', runId: 2 });
  assert.deepEqual(cards.read(), { runId: 2, current: null, queued: [], seen: [] });
  cards.handle({ type: 'enemy-first-seen', runId: 1, kind: 'feral' });
  cards.handle({ type: 'enemy-first-seen', runId: 2, kind: 'caveguard' });
  assert.equal(cards.read().current, null);
  cards.handle({ type: 'enemy-first-seen', runId: 2, kind: 'feral' });
  assert.equal(cards.read().current, 'feral');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaitQueue, boundedNumber } from '../../studio/inspector/async.js';
import { makeCatalog } from '../../studio/inspector/catalog.js';

test('game wait only resolves at its time and removes the finished entry', async () => {
  const q = createWaitQueue(); let done = false; const p = q.wait({ at: 0.5 }).then(() => { done = true; });
  q.flush(0.49); await Promise.resolve(); assert.equal(done, false); assert.equal(q.size, 1);
  q.flush(0.5); await p; assert.equal(done, true); assert.equal(q.size, 0);
});
test('aborted move wait rejects immediately and cannot mutate a later move', async () => {
  const q = createWaitQueue(), c = new AbortController(); let fired = false;
  const p = q.wait({ at: 99, signal: c.signal }).then(() => { fired = true; });
  c.abort(); await assert.rejects(p, { name: 'AbortError' }); q.flush(); assert.equal(fired, false); assert.equal(q.size, 0);
});
test('stalled frame wait expires without leaving a pending callback', async () => {
  const q = createWaitQueue(); await assert.rejects(q.wait({ timeout: 10 }), /timed out/); assert.equal(q.size, 0);
});
test('a failing frame rejects all dependents and still accepts subsequent requests', async () => {
  const q = createWaitQueue(), p = q.wait(), p2 = q.wait(); const a = assert.rejects(p, /render failed/), b = assert.rejects(p2, /render failed/);
  q.cancel(new Error('render failed')); await Promise.all([a, b]); const next = q.wait(); q.flush(); await next; assert.equal(q.size, 0);
});
test('bad finite/count parameters are rejected before operations allocate or loop', () => {
  for (const v of [NaN, Infinity, -1, 33, 2.5]) assert.throws(() => boundedNumber(v, 'views', 1, 32, { integer: true }));
  assert.equal(boundedNumber(8, 'views', 1, 32, { integer: true }), 8);
});
test('duplicate catalog IDs fail explicitly instead of renaming public agent IDs', () => {
  assert.throws(() => makeCatalog({ T: {}, D: { WEAPON_ORDER: ['m4', 'm4'] }, B: {} }), /Duplicate inspector subject id: weapon.m4/);
});

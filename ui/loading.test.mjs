import test from 'node:test';
import assert from 'node:assert/strict';
import { loadingView, observeLoading } from './loading.js';

const snapshot = (sequence = 0, extra = {}) => ({ loadId: 'current', sequence, state: 'loading', stages: {}, steps: [], ...extra });
test('no synthetic overall percentage or unknown internal label', () => {
  const view = loadingView(snapshot(0, { steps: [{ state: 'active', stageId: '<internal>' }] }));
  assert.equal(view.headline, 'Preparing game…');
  assert(view.rows.every(row => row.total === null && row.units === ''));
  assert(!JSON.stringify(view).includes('%'));
});
test('concurrent stages and real per-stage units remain distinct', () => {
  const view = loadingView(snapshot(2, { stages: {
    world: { state: 'active', completedUnits: 2, totalUnits: 5 },
    zombies: { state: 'active', completedUnits: 0, totalUnits: 1 }
  }, steps: [{ state: 'active', stageId: 'zombies' }] }));
  assert.equal(view.headline, 'Preparing enemies…');
  assert.equal(view.rows.filter(row => row.state === 'active').length, 2);
  assert.equal(view.rows[1].units, '2 / 5');
  assert.equal(view.rows[2].units, '0 / 1');
});
test('invalid counts remain indeterminate', () => {
  for (const [completedUnits, totalUnits] of [[2, 1], [-1, 5], [0, 0], [0, Infinity], [1.5, 4], [undefined, 3]]) {
    const view = loadingView(snapshot(0, { stages: { terrain: { state: 'active', completedUnits, totalUnits } } }));
    assert.equal(view.rows[0].total, null);
  }
});
test('stage completion never invents ready; explicit ready allows background work', () => {
  const stages = Object.fromEntries(['terrain','world','zombies','shaders'].map(id => [id, { state: 'complete' }]));
  assert.equal(loadingView(snapshot(5, { stages })).state, 'loading');
  assert.equal(loadingView(snapshot(6, { state: 'ready', stages: { shaders: { state: 'active' } } })).headline, 'Ready');
});
test('replay, duplicate/out-of-order events, old load, failure and retry', () => {
  let push, disposed = false;
  const received = [];
  const channel = { loadId: 'current', subscribe(fn) { push = fn; fn(snapshot(4)); return () => { disposed = true; }; } };
  const stop = observeLoading(channel, view => received.push(view));
  push(snapshot(3)); push(snapshot(4)); push(snapshot(90, { loadId: 'previous' }));
  assert.equal(received.length, 1);
  push(snapshot(5, { state: 'failed', errorCode: '<unsafe internal detail>' }));
  push(snapshot(6, { state: 'ready' }));
  assert.equal(received.length, 2); assert.equal(received[1].headline, "Couldn't finish loading.");
  stop(); assert(disposed);
  const retry = [];
  observeLoading({ loadId: 'retry', subscribe(fn) { fn(snapshot(0, { loadId: 'retry', state: 'ready' })); return () => {}; } }, v => retry.push(v));
  assert.equal(retry[0].headline, 'Ready');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSawStart, stepSawStart, SAW_START } from './chainsaw-animation.js';

const tick = (state, opts = {}, dt = 0.1) => stepSawStart(state, dt, { equipped: true, ...opts });
const ready = () => {
  const state = createSawStart();
  tick(state);
  for (let i = 0; i < Math.ceil(SAW_START.return / 0.1); i++) tick(state);
  assert.equal(state.phase, 'ready');
  return state;
};

test('started saw idles through each temporary hand action without another pull', () => {
  for (const reason of ['knife', 'vault', 'dive', 'draw', 'reload']) {
    const state = ready();
    const starts = state.starts;
    for (let i = 0; i < 20; i++) tick(state, { interrupted: true });
    assert.equal(state.phase, 'ready', reason);
    tick(state);
    assert.equal(state.phase, 'ready', reason);
    assert.equal(state.starts, starts, reason);
  }
});

test('interrupting a partly pulled cord requires a fresh full pull', () => {
  const state = createSawStart();
  tick(state); tick(state);
  assert.equal(state.phase, 'starting');
  tick(state, { interrupted: true });
  assert.equal(state.phase, 'off');
  assert.equal(state.t, 0);
  tick(state);
  assert.equal(state.phase, 'starting');
  assert.equal(state.starts, 2);
});

test('put-away and empty tank stop the engine; next draw pulls once', () => {
  const state = ready();
  tick(state, { equipped: false });
  assert.equal(state.phase, 'off');
  tick(state);
  assert.equal(state.starts, 2);
  for (let i = 0; i < 11; i++) tick(state);
  assert.equal(state.phase, 'ready');
  tick(state, { available: false });
  assert.equal(state.phase, 'off');
});

test('pause and shop suspension preserve the starter state', () => {
  const state = createSawStart();
  tick(state);
  const t = state.t;
  tick(state, { suspended: true });
  assert.equal(state.phase, 'starting');
  assert.equal(state.t, t);
});

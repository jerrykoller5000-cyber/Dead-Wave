import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaceEvents } from './place-events.js';

const far = { fuel: Infinity, mast: Infinity, hikers: Infinity, rangers: Infinity, trapper: Infinity, mine: Infinity };
const frame = (change = {}) => ({ runId: 1, day: 1, clock: 0.5, dt: 1,
  phase: 'prep', active: true, combat: false, alarm: false, raining: false,
  stormIn: 200, near: far, ...change });

test('depot cough belongs to the late prep light, near the depot, once on eligible days', () => {
  const e = createPlaceEvents();
  assert.deepEqual(e.step(frame({ clock: 0.63, near: { ...far, fuel: 20 } })), []);
  assert.deepEqual(e.step(frame({ clock: 0.68, near: { ...far, fuel: 50 } })), []);
  assert.deepEqual(e.step(frame({ clock: 0.68, near: { ...far, fuel: 20 } })), ['fuel-cough']);
  assert.deepEqual(e.step(frame({ clock: 0.68, near: { ...far, fuel: 20 } })), []);
  assert.deepEqual(e.step(frame({ day: 2, clock: 0.68, near: { ...far, fuel: 20 } })), []);
});

test('mast wires sing once per approaching storm, then re-arm for the next', () => {
  const e = createPlaceEvents();
  const near = { ...far, mast: 20 };
  assert.deepEqual(e.step(frame({ near, stormIn: 90 })), []);
  assert.deepEqual(e.step(frame({ near, stormIn: 65 })), ['mast-wire']);
  assert.deepEqual(e.step(frame({ near, stormIn: 40 })), []);
  assert.deepEqual(e.step(frame({ near, raining: true, stormIn: 0 })), []);
  assert.deepEqual(e.step(frame({ near, stormIn: 60 })), ['mast-wire']);
});

test('the hikers phone rings by day within 30m on alternating runs', () => {
  const e = createPlaceEvents();
  const near = { ...far, hikers: 29 };
  assert.deepEqual(e.step(frame({ runId: 1, near })), []);
  assert.deepEqual(e.step(frame({ runId: 2, near, clock: 0.75 })), []);
  assert.deepEqual(e.step(frame({ runId: 2, near })), ['hikers-phone']);
  assert.deepEqual(e.step(frame({ runId: 2, near })), []);
});

test('the rangers radio is wordless and rare by trigger, once on one run in three', () => {
  const e = createPlaceEvents();
  const near = { ...far, rangers: 35 };
  assert.deepEqual(e.step(frame({ runId: 1, near })), ['rangers-radio']);
  assert.deepEqual(e.step(frame({ runId: 1, near })), []);
  assert.deepEqual(e.step(frame({ runId: 2, near })), []);
  assert.deepEqual(e.step(frame({ runId: 4, near })), ['rangers-radio']);
});

test('trapper chimes sound in prep and stop at the alarm', () => {
  const e = createPlaceEvents();
  const near = { ...far, trapper: 20 };
  assert.deepEqual(e.step(frame({ near })), ['trapper-chime']);
  for (let i = 0; i < 6; i++) assert.deepEqual(e.step(frame({ near })), []);
  assert.deepEqual(e.step(frame({ near })), ['trapper-chime']);
  assert.deepEqual(e.step(frame({ near, alarm: true })), []);
  assert.deepEqual(e.step(frame({ near, alarm: false })), []);
});

test('mine mist only drifts in the dawn window near the mine', () => {
  const e = createPlaceEvents();
  const near = { ...far, mine: 50 };
  assert.deepEqual(e.step(frame({ near, clock: 0.4 })), []);
  assert.deepEqual(e.step(frame({ near, clock: 0.33 })), ['mine-mist']);
  assert.deepEqual(e.step(frame({ near, clock: 0.33, dt: 0.4 })), []);
  assert.deepEqual(e.step(frame({ near, clock: 0.33, dt: 0.5 })), ['mine-mist']);
});

test('no event sounds or draws during a fight or when events are disabled', () => {
  const e = createPlaceEvents();
  const allNear = Object.fromEntries(Object.keys(far).map(k => [k, 1]));
  assert.deepEqual(e.step(frame({ near: allNear, clock: 0.68, stormIn: 10, combat: true })), []);
  assert.deepEqual(e.step(frame({ near: allNear, clock: 0.68, stormIn: 10, active: false })), []);
});

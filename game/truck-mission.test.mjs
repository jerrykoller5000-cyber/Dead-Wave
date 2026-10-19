// node game/truck-mission.test.mjs — CL-216
import assert from 'node:assert/strict';
import test from 'node:test';
import { TRUCK, createTruckMission } from './truck-mission.js';

test('the chain wants the bolt cutters first', () => {
  const m = createTruckMission();
  assert.equal(m.hold(1), 'need-cutters');
  assert.equal(m.state.cut, 0);
  assert.equal(m.unlocked(), false);
  assert.equal(m.takeCutters(), true);
  assert.equal(m.takeCutters(), false, 'one pair');
});

test('held E cuts it in CUT_S, and letting go keeps the progress', () => {
  const m = createTruckMission(); m.takeCutters();
  assert.equal(m.hold(0.25), 'cutting'); assert.equal(m.hold(0.25), 'cutting');
  m.release();
  assert.equal(m.hold(0.25), 'cutting'); assert.equal(m.hold(0.25), 'cutting');
  assert.ok(Math.abs(m.progress() - 1 / 1.5) < 1e-9, 'a second away, 1 of 1.5 s is kept');
  assert.equal(m.hold(0.25), 'cutting');
  assert.equal(m.hold(0.25), 'cut');
  assert.equal(m.state.stage, 'alarm');
  assert.equal(m.unlocked(), true);
  assert.equal(m.hold(1), 'done');
});

test('a long frame never cuts it at once', () => {
  const m = createTruckMission(); m.takeCutters();
  assert.equal(m.hold(5), 'cutting', 'dt is capped at 0.25 s');
});

test('the alarm wails ALARM_S, then the site is an ordinary cache', () => {
  const m = createTruckMission(); m.takeCutters();
  for (let i = 0; i < 8; i++) m.hold(0.25);
  assert.equal(m.state.stage, 'alarm');
  let s = null;
  for (let t = 0; t < TRUCK.ALARM_S - 0.5; t += 0.5) s = m.tick(0.5);
  assert.equal(s, 'alarm');
  assert.equal(m.tick(1), 'quiet');
  assert.equal(m.state.stage, 'open');
  assert.equal(m.tick(1), null);
  assert.equal(m.unlocked(), true);
});

test('it calls 6 dead on day 1 and 10 from day 20; reset brings the chain back', () => {
  const m = createTruckMission();
  assert.equal(m.calledFor(1), 6);
  assert.equal(m.calledFor(20), 10);
  assert.equal(m.calledFor(40), 10);
  assert.ok(m.calledFor(10) > 6 && m.calledFor(10) < 10);
  m.takeCutters(); for (let i = 0; i < 8; i++) m.hold(0.25);
  m.reset();
  assert.deepEqual(m.state, { stage: 'chained', cutters: false, cut: 0, alarm: 0 });
});

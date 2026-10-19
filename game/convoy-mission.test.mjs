import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConvoyMission, CONVOY } from './convoy-mission.js';

const kinds = events => events.map(e => e.kind);
const beat = mission => { mission.step(CONVOY.beat); return mission.tap(); };

test('the first E starts the jack; eight beat taps unlock the cooler', () => {
  const mission = createConvoyMission();
  assert.deepEqual(kinds(mission.tap()), ['start']);
  for (let i = 1; i <= 8; i++) {
    assert.deepEqual(kinds(beat(mission)), i === 8 ? ['pump', 'ready'] : ['pump']);
    assert.equal(mission.read().pumps, i);
  }
  assert.equal(mission.read().done, true);
  assert.deepEqual(mission.tap(), []);
  mission.reset();
  assert.equal(mission.read().phase, 'idle');
  assert.equal(mission.read().sleeperAlive, true);
});

test('the 0.18 second window accepts the edge and misses just beyond it', () => {
  const mission = createConvoyMission(); mission.start();
  mission.step(CONVOY.beat - CONVOY.window / 2);
  assert.deepEqual(kinds(mission.tap()), ['pump']);
  mission.step(CONVOY.beat - 0.001);
  assert.deepEqual(kinds(mission.tap()), ['slip', 'cab-bang']);
  assert.equal(mission.read().pumps, 0);
  assert.equal(mission.read().misses, 1);
});

test('two missed beats slip the jack, warn for half a second, then spit while open', () => {
  const mission = createConvoyMission(); mission.start();
  assert.deepEqual(kinds(mission.step(CONVOY.beat + CONVOY.window / 2)), ['slip', 'cab-bang']);
  assert.deepEqual(kinds(mission.step(CONVOY.beat)), ['slip', 'cab-bang', 'heavy-thump']);
  assert.equal(mission.read().phase, 'warning');
  assert.deepEqual(mission.step(0.49), []);
  assert.deepEqual(kinds(mission.step(0.01)), ['door-open']);
  assert.equal(mission.read().doorOpen, true);
  assert.deepEqual(kinds(mission.step(CONVOY.spitAt)), ['spit']);
  assert.deepEqual(kinds(mission.step(CONVOY.doorOpen - CONVOY.spitAt)), ['door-close']);
  assert.equal(mission.read().phase, 'pumping');
  assert.equal(mission.read().misses, 0);
});

test('the sleeper can die only while exposed; a kill prevents the puke', () => {
  const mission = createConvoyMission(); mission.start();
  assert.deepEqual(mission.killSleeper(), []);
  mission.tap(); mission.tap();
  assert.equal(mission.read().phase, 'warning');
  assert.deepEqual(mission.killSleeper(), []);
  mission.step(CONVOY.warning);
  assert.deepEqual(kinds(mission.killSleeper()), ['sleeper-killed']);
  assert.deepEqual(kinds(mission.step(CONVOY.doorOpen)), ['door-close']);
  assert.equal(mission.read().sleeperAlive, false);
  mission.tap(); mission.tap();
  assert.equal(mission.read().phase, 'pumping');
});

test('walking away pauses the beat without resetting earned pumps', () => {
  const mission = createConvoyMission(); mission.start();
  assert.deepEqual(mission.step(8, { engaged: false }), []);
  assert.equal(mission.read().phase, 'pumping');
  assert.deepEqual(kinds(beat(mission)), ['pump']);
  assert.equal(mission.read().pumps, 1);
});

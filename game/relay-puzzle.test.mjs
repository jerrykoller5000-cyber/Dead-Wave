// game/relay-puzzle.test.mjs — CL-183: the radio relay's breakers, tuning, number station, reboot and locker code.
// CL-184: the reboot runs by itself once started, and the day sets its length and its dead.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RELAY, createRelayPuzzle, stationPlan, bootHoldSeconds, relayDayPlan } from './relay-puzzle.js';

const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test("breakers in Sato's order 2, 1, 4; a wrong one trips them all and the panel is hot for a moment", () => {
  const p = createRelayPuzzle(seeded(3));
  assert.equal(p.flip(1), 'wrong');
  assert.deepEqual(p.state.on, [false, false, false, false]);
  assert.equal(p.flip(2), 'hot', 'too hot to touch right after');
  p.step(RELAY.LOCKOUT_S + 0.01);
  assert.equal(p.flip(2), 'ok');
  assert.equal(p.flip(1), 'ok');
  assert.equal(p.flip(3), 'wrong', '3 stays off');
  p.step(2);
  for (const n of [2, 1]) p.flip(n);
  assert.equal(p.flip(4), 'done');
  assert.equal(p.state.stage, 'tuning');
  assert.equal(p.state.trips, 2);
});

test('tuning: static far off, clearer as the dial nears, locked after holding it clear', () => {
  const p = createRelayPuzzle(seeded(5));
  for (const n of RELAY.ORDER) p.flip(n);
  const f = p.state.freq;
  assert.ok(f >= RELAY.BAND[0] + 4 && f <= RELAY.BAND[1] - 2);
  p.setDial(f - 3); const far = p.clarity();
  p.setDial(f - 1); const mid = p.clarity();
  p.setDial(f + 0.1); const on = p.clarity();
  assert.ok(far < mid && mid < on && on === 1, far + ' ' + mid + ' ' + on);
  p.setDial(f - 1);
  for (let i = 0; i < 30; i++) p.step(0.1);
  assert.equal(p.state.stage, 'tuning', 'not clear: no lock');
  p.setDial(f);
  let r = null; for (let i = 0; i < 20 && !r; i++) r = p.step(0.1);
  assert.equal(r, 'locked'); assert.equal(p.state.stage, 'lever', 'CL-257: locked in, the lever is next');
  assert.equal(p.tune(500), RELAY.BAND[1], 'the dial stops at the end of the band');
});

test('the number station: a digit is that many beeps, and the code is 1-9s', () => {
  const plan = stationPlan([3, 1, 5]);
  assert.equal(plan.beeps.length, 9);
  assert.deepEqual(plan.beeps.map((b) => b.digit), [0, 0, 0, 1, 2, 2, 2, 2, 2]);
  assert.ok(plan.beeps[3].t - plan.beeps[2].t > RELAY.BEEP_S + RELAY.DIGIT_GAP_S - 1e-9, 'a pause between digits');
  for (let s = 1; s < 50; s++) assert.ok(createRelayPuzzle(seeded(s)).state.code.every((d) => d >= 1 && d <= 9));
  assert.equal(stationPlan([0]).beeps[0].long, true);
});

test('CL-257: the lever reboots it, then it runs by itself; only the code opens the vault', () => {
  const p = createRelayPuzzle(seeded(9));
  for (const n of RELAY.ORDER) p.flip(n);
  assert.equal(p.pullLever(), false, 'no lever before the station is locked in');
  p.setDial(p.state.freq); for (let i = 0; i < 20; i++) p.step(0.1);
  assert.equal(p.state.stage, 'lever');
  assert.equal(p.heardCode(), false, 'heardCode no longer moves anything on');
  assert.equal(p.startBoot(30), false, 'no reboot before the lever');
  assert.equal(p.pullLever(), true); assert.equal(p.state.stage, 'boot'); assert.equal(p.state.lever, true);
  assert.equal(p.pullLever(), false, 'once');
  assert.equal(p.boot(5), false); assert.equal(p.bootFrac(), 0, 'nothing runs before it is started');
  assert.equal(p.startBoot(30), true); assert.equal(p.startBoot(30), false, 'once');
  p.boot(8); p.boot(4);
  assert.ok(Math.abs(p.bootFrac() - 12 / 30) < 1e-9);
  assert.ok(Math.abs(p.bootLeft() - 18) < 1e-9);
  assert.ok(Math.abs(bootHoldSeconds(p.bootFrac()) - 12 / 30 * 6) < 1e-9);
  assert.equal(p.boot(18), true); assert.equal(p.state.stage, 'locker'); assert.equal(p.bootFrac(), 1);
  const code = p.state.code, wrong = code.map((d) => (d % 9) + 1);
  assert.equal(p.enter(wrong[0]), 'more'); p.enter(wrong[1]);
  assert.equal(p.enter(wrong[2]), 'wrong'); assert.equal(p.state.unlocked, false);
  p.enter(code[0]); p.enter(code[1]);
  assert.equal(p.enter(code[2]), 'open'); assert.equal(p.state.unlocked, true); assert.equal(p.state.stage, 'done');
});

test('CL-184: the later the day, the longer the reboot and the more (and worse) the dead', () => {
  const d1 = relayDayPlan(1), d10 = relayDayPlan(10), d20 = relayDayPlan(20);
  assert.equal(d1.bootS, RELAY.BOOT_S);
  assert.ok(d1.bootS < d10.bootS && d10.bootS < d20.bootS);
  assert.ok(d1.first < d10.first && d10.first < d20.first);
  assert.ok(d1.every > d20.every && d20.every >= 2);
  assert.ok(d1.cap < d20.cap && d20.cap <= 48);
  assert.equal(relayDayPlan(40).day, RELAY.FINAL_DAY); assert.equal(relayDayPlan(0).day, 1);
  assert.ok(d1.mixDay > 1);
});

test('CL-184: the station pauses a while before it reads the code again', () => {
  const plan = stationPlan([2, 2, 2]);
  const last = plan.beeps[plan.beeps.length - 1].t;
  assert.ok(plan.length - last >= 4, 'a gap of ' + (plan.length - last).toFixed(2) + ' s before the loop');
});

test('a restored run with the radio already up skips to the end', () => {
  const p = createRelayPuzzle(seeded(2));
  p.unlock();
  assert.equal(p.state.unlocked, true); assert.equal(p.bootFrac(), 1); assert.equal(p.flip(2), 'ignored');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFuelRun, FUEL, ignites, smellCall } from './fuel-depot.js';

const kinds = (events) => events.map((e) => e.kind);
const filled = () => { const r = createFuelRun(); for (let i = 0; i < 400 && r.read().phase === 'at-pump'; i++) r.holdFill(0.05, true, true); return r; };

test('hold E at the pump for fillS fills the can; away from the pump or letting go does not', () => {
  const r = createFuelRun();
  assert.deepEqual(r.holdFill(1, true, false), []); assert.equal(r.read().fill, 0);
  r.holdFill(1, true, true); r.holdFill(1, false, true);
  assert.equal(r.read().fill, 1); assert.equal(r.read().phase, 'at-pump');
  assert.deepEqual(kinds(r.holdFill(2.5, true, true)), ['filled']);
  assert.equal(r.read().phase, 'carried'); assert.equal(r.read().slow, FUEL.slow);
});

test('carried, he is slowed as with the mortar (0.62); down, not', () => {
  const r = filled();
  assert.equal(r.read().slow, 0.62);
  r.putDown(1, 2); assert.equal(r.read().slow, 1);
});

test('only fire and acid set it off', () => {
  for (const c of ['fire', 'flame', 'flamer', 'burning', 'acid', 'spitter', 'napalm', 'FIRE']) assert.ok(ignites(c), c);
  for (const c of ['bullet', 'bite', 'shambler', 'fall', 'drop', 'explosion', '', null, undefined]) assert.ok(!ignites(c), String(c));
  const r = filled();
  assert.deepEqual(r.ignite('bullet'), []); assert.deepEqual(r.ignite('shambler'), []);
  assert.equal(r.read().phase, 'carried');
  const e = r.ignite('acid');
  assert.deepEqual(kinds(e), ['boom']); assert.equal(e[0].at, null);
  assert.equal(r.read().phase, 'at-pump'); assert.equal(r.read().fill, 0); assert.equal(r.read().booms, 1);
});

test('put down and picked up: dropping never sets it off; it can burn where it lies', () => {
  const r = filled();
  assert.deepEqual(kinds(r.putDown(3, 4)), ['put-down']);
  assert.equal(r.read().phase, 'down'); assert.deepEqual(r.read().down, { x: 3, z: 4 });
  assert.deepEqual(r.pickUp(FUEL.pickR + 0.5), []);
  assert.deepEqual(kinds(r.pickUp(1)), ['picked-up']); assert.equal(r.read().phase, 'carried');
  r.putDown(5, 6);
  const e = r.ignite('fire'); assert.deepEqual(e[0].at, { x: 5, z: 6 });
  assert.equal(r.read().phase, 'at-pump');
});

test('an empty can at the pump cannot go up', () => {
  const r = createFuelRun();
  assert.deepEqual(r.ignite('fire'), []);
});

test('it leaks: a drip every 1.6 m walked, the smell calls the dead every 14 s (first after 6)', () => {
  const r = filled();
  let ev = [];
  for (let i = 0; i < 100; i++) ev.push(...r.carry(0.1, 0.4, 1));   // 10 s, 40 m
  assert.equal(ev.filter((e) => e.kind === 'drip').length, Math.floor(40 / FUEL.dripEvery));
  const calls = ev.filter((e) => e.kind === 'smell-call');
  assert.equal(calls.length, 1); assert.equal(calls[0].n, 1);
  ev = [];
  for (let i = 0; i < 140; i++) ev.push(...r.carry(0.1, 0, 20));
  assert.equal(ev.filter((e) => e.kind === 'drip').length, 0, 'standing still drips nothing');
  assert.equal(ev.filter((e) => e.kind === 'smell-call').length, 1);
  r.putDown(0, 0); assert.deepEqual(r.carry(30, 50, 1), [], 'down, it leaks nothing more');
});

test('the call grows with the day', () => {
  assert.equal(smellCall(1), 1); assert.equal(smellCall(7), 2); assert.equal(smellCall(13), 3); assert.equal(smellCall(20), 4); assert.equal(smellCall(40), 4);
});

test('E at the generator pours it: done, once', () => {
  const r = filled();
  assert.deepEqual(r.pour(false), []);
  assert.deepEqual(kinds(r.pour(true)), ['poured']);
  assert.ok(r.read().done); assert.equal(r.read().phase, 'poured');
  assert.deepEqual(r.pour(true), []); assert.deepEqual(r.ignite('fire'), []);
  assert.deepEqual(r.holdFill(5, true, true), []);
});

test('down, it cannot be poured; reset starts the run over', () => {
  const r = filled(); r.putDown(0, 0);
  assert.deepEqual(r.pour(true), []);
  r.reset(); assert.equal(r.read().phase, 'at-pump'); assert.equal(r.read().done, false);
});
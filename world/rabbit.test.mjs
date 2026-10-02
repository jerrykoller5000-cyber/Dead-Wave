// world/rabbit.test.mjs — CL-93: the mound's rabbit, its moves, and the holy grenade's throw.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RABBIT, pickMoundSite, createRabbit, wakeRabbit, holdRabbit, killRabbit, stepRabbit, lobVelocity, rabbitAwake,
  buildMound, buildKillerRabbit, buildHolyGrenade, buildReliquary } from './rabbit.js';

test('the mound goes where it is furthest from every trail and landmark', () => {
  const c = [{ x: 0, z: 0, path: 40, poi: 60, ok: true }, { x: 1, z: 1, path: 80, poi: 30, ok: true }, { x: 2, z: 2, path: 90, poi: 90, ok: false }, { x: 3, z: 3, path: 60, poi: 70, ok: true }];
  assert.deepEqual(pickMoundSite(c), { x: 3, z: 3, score: 56 });
  assert.equal(pickMoundSite([{ x: 0, z: 0, path: 1, poi: 1, ok: false }]), null);
});

test('asleep it does nothing; a shot wakes it, it stares, then it goes for him and bites', () => {
  const r = createRabbit({ x: 0, z: 0, yaw: 0 });
  const him = { x: 0, z: 10, alive: true };
  assert.deepEqual(stepRabbit(r, 1, him), []);
  assert.equal(r.mode, 'asleep');
  assert.ok(wakeRabbit(r) && !wakeRabbit(r));
  const ev = [];
  let t = 0;
  for (; t < 5 && !ev.includes('bite'); t += 1 / 60) ev.push(...stepRabbit(r, 1 / 60, him));
  assert.deepEqual(ev, ['out', 'lunge', 'bite']);
  assert.ok(t < RABBIT.OUT_S + RABBIT.STARE_S + 1.2, 'it is quick: ' + t.toFixed(2) + ' s');
  assert.equal(r.mode, 'recover');
});

test('the choir holds it where it is; the holy blast ends it; asleep it cannot be held', () => {
  const r = createRabbit({ x: 0, z: 0, yaw: 0 });
  assert.equal(holdRabbit(r), false);
  wakeRabbit(r);
  for (let i = 0; i < 100; i++) stepRabbit(r, 1 / 60, { x: 0, z: 20, alive: true });
  assert.equal(r.mode, 'lunge');
  holdRabbit(r);
  const x = r.x, z = r.z;
  for (let i = 0; i < 60; i++) stepRabbit(r, 1 / 60, { x: 0, z: 20, alive: true });
  assert.equal(r.mode, 'held'); assert.equal(r.x, x); assert.equal(r.z, z);
  assert.ok(killRabbit(r)); assert.equal(rabbitAwake(r), false);
  assert.deepEqual(stepRabbit(r, 1, { x: 0, z: 1, alive: true }), []);
});

test('if he runs far enough it goes home and sleeps again', () => {
  const r = createRabbit({ x: 0, z: 0, yaw: 0 });
  wakeRabbit(r);
  const ev = [];
  for (let i = 0; i < 1200 && r.mode !== 'asleep'; i++) ev.push(...stepRabbit(r, 1 / 60, { x: 0, z: 200, alive: true }));
  assert.ok(ev.includes('home') && r.mode === 'asleep', ev.join(','));
});

test('the lob lands where it is aimed', () => {
  const from = { x: 0, y: 1.5, z: 0 }, to = { x: 8, y: 0.2, z: -5 }, g = 16, T = RABBIT.HOLY_FLIGHT_S;
  const v = lobVelocity(from, to, g, T);
  const land = { x: from.x + v.x * T, y: from.y + v.y * T - 0.5 * g * T * T, z: from.z + v.z * T };
  for (const k of ['x', 'y', 'z']) assert.ok(Math.abs(land[k] - to[k]) < 1e-9, k);
});

test('the models build', () => {
  const m = buildMound(THREE);
  assert.ok(m.getObjectByName('rabbit-mound-skull') && m.getObjectByName('rabbit-mound-bones') && m.getObjectByName('rabbit-mound-mouth'));
  assert.equal(buildKillerRabbit(THREE).name, 'killer-rabbit');
  assert.ok(buildHolyGrenade(THREE).getObjectByName('holy-grenade-pin'));
  assert.ok(buildReliquary(THREE).userData.grenade);
});

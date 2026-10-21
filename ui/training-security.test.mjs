import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { TRAINING, buildTrainingGround, clampToRects } from '../world/training.js';
import { traceTraining } from '../world/training-ballistics.js';
import { createTrainingSecurity } from './training-security.js';
const controller = () => createTrainingSecurity({ x: -8, minZ: -9.5, maxZ: -6.5 });

test('countdown closes immediately; living zombies hold lock; last death unlocks without opening', () => {
  const d = controller();
  d.sync({ remaining: 5 }, 0);
  assert.deepEqual(d.read(), { open: false, locked: true, amount: 0, blocked: true });
  assert.equal(d.toggle(), false);
  d.sync(null, 3); d.tick(10); assert.equal(d.read().locked, true);
  d.sync(null, 1); assert.equal(d.toggle(), false);
  d.sync(null, 0); assert.equal(d.read().locked, false); assert.equal(d.read().blocked, true);
  assert.equal(d.toggle(), true); d.tick(.2); assert.equal(d.read().blocked, true);
  d.tick(.3); assert.equal(d.read().blocked, false);
});

test('manual close/open, repeated calls, cancellation and re-entry cannot strand a lock', () => {
  const d = controller(); d.toggle(); assert.equal(d.read().blocked, true);
  d.tick(.5); assert.equal(d.read().amount, 0); d.toggle(); d.tick(.5);
  d.sync(true, 0); d.sync(true, 0); assert.equal(d.read().locked, true);
  d.sync(null, 0); assert.equal(d.toggle(), true);
  d.sync(true, 4); d.reset();
  assert.deepEqual(d.read(), { open: true, locked: false, amount: 1, blocked: false });
});

test('closed door blocks both directions, sprint tunneling and threshold occupants', () => {
  const d = controller(); d.toggle();
  assert.ok(d.constrain({ x: -12, z: -8 }, { x: -5, z: -8 }).x > -8);
  assert.ok(d.constrain({ x: -5, z: -8 }, { x: -12, z: -8 }).x < -8);
  assert.ok(d.constrain({ x: -8, z: -8 }, { x: -8.1, z: -8 }).x < -8);
  assert.ok(d.constrain({ x: -8, z: -8 }, { x: -7.9, z: -8 }).x > -8);
  assert.equal(d.constrain({ x: -12, z: 0 }, { x: -5, z: 0 }).moved, false);
  d.toggle(); d.tick(1);
  assert.equal(d.constrain({ x: -12, z: -8 }, { x: -5, z: -8 }).moved, false);
});

test('fourfold floor, reachable relocated stations, live shutter geometry and ballistic seal', () => {
  const b = TRAINING.BUILD;
  assert.equal((b.maxX-b.minX)*(b.maxZ-b.minZ), 4*18*20);
  const tg = buildTrainingGround(T), door = tg.securityDoor;
  const d = createTrainingSecurity({ ...door, onChange: s => door.setState(s) });
  const a = { x: door.x+2, y: tg.floorY+1.4, z: door.z }, end = { ...a, x: door.x-2 };
  assert.equal(traceTraining(tg, a, end), null);
  d.sync(true, 0);
  assert.equal(traceTraining(tg, a, end).solid.securityDoor, true);
  assert.equal(door.shutter.position.y, 0);
  d.sync(false, 0); d.toggle(); d.tick(1);
  assert.equal(traceTraining(tg, a, end), null);
  assert.equal(door.shutter.position.y, 3.12);
  for (const st of Object.values(tg.stations)) assert.equal(clampToRects(tg.walk, st.front.x, st.front.z).moved, false);
  assert.equal(clampToRects([tg.zombieRect], tg.gate.x, tg.gate.z).moved, false);
  assert.equal(clampToRects(tg.walk, tg.bed.stand.x, tg.bed.stand.z).moved, false);
  const newCorner = { x: tg.origin.x+b.minX+2, z: tg.origin.z+b.maxZ-2 };
  assert.equal(tg.floorAt(newCorner.x, newCorner.z), tg.floorY);
  assert.equal(clampToRects(tg.walk, newCorner.x, newCorner.z).moved, false);
  tg.dispose();
});

// world/training.test.mjs — CL-115: the Training Ground. Keeping a body inside the rooms, rounds meeting boxes, and
// the build (with the test build of three: no canvas in Node, so the textures are left out).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { TRAINING, clampToRects, segmentBox, buildTrainingGround } from './training.js';

test('clampToRects: inside stays, outside goes to the nearest edge of the nearest room', () => {
  const rooms = [{ minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, { minX: 10, maxX: 12, minZ: 4, maxZ: 6 }, { minX: 12, maxX: 20, minZ: 0, maxZ: 10 }];
  assert.deepEqual(clampToRects(rooms, 5, 5), { x: 5, z: 5, moved: false });
  assert.deepEqual(clampToRects(rooms, 11, 5), { x: 11, z: 5, moved: false }, 'through the doorway');
  const wall = clampToRects(rooms, 11, 8);
  assert.ok(wall.moved && (wall.x === 10 || wall.x === 12) && wall.z === 8, 'beside the doorway: back to a room');
  assert.deepEqual(clampToRects(rooms, -3, 5), { x: 0, z: 5, moved: true });
});

test('segmentBox: where a round first meets a box', () => {
  const b = { minX: -1, maxX: 1, minY: 0, maxY: 2, minZ: 4, maxZ: 5 };
  assert.equal(segmentBox({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 10 }, b), 0.4);
  assert.equal(segmentBox({ x: 3, y: 1, z: 0 }, { x: 3, y: 1, z: 10 }, b), null, 'passes beside');
  assert.equal(segmentBox({ x: 0, y: 3, z: 0 }, { x: 0, y: 3, z: 10 }, b), null, 'passes over');
  assert.equal(segmentBox({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 3 }, b), null, 'falls short');
});

test('the build: two rooms past the map, five targets downrange, every station on a wall facing in', () => {
  const tg = buildTrainingGround(T);
  const O = TRAINING.ORIGIN;
  assert.ok(Math.hypot(O.x, O.z) > 400, 'well past the land (220 m)');
  assert.equal(tg.targets.length, 5);
  tg.targets.forEach((t, i) => {
    assert.equal(t.lane, i + 1);
    assert.ok(t.box.minZ > O.z + TRAINING.LINE_Z + 5, 'downrange of the line');
  });
  for (const t of tg.targets.slice(1)) assert.ok(t.range > tg.targets[0].range, 'lane 1 is the nearest');
  // Stations: the CIF, the supply terminal and the Armory on the range's left wall; the panel and the window in the build room.
  for (const k of ['cif', 'kiosk', 'armory']) {
    const s = tg.stations[k];
    assert.ok(Math.abs(s.x - (O.x + TRAINING.RANGE.maxX)) < 0.1 && s.front.x < s.x, k + ' on his left (+x) wall as he faces downrange, facing in');
  }
  for (const k of ['hqPanel', 'skullWindow']) {
    const s = tg.stations[k];
    assert.ok(s.x > O.x + TRAINING.BUILD.minX && s.x <= O.x + TRAINING.BUILD.maxX, k + ' in the build room');
    assert.ok(clampToRects(tg.walk, s.front.x, s.front.z).moved === false, k + "'s front can be reached");
  }
  // He can walk from the range through the door into the build room; the dead stay in the build room.
  const door = { x: O.x + TRAINING.DOOR.x, z: O.z + (TRAINING.DOOR.minZ + TRAINING.DOOR.maxZ) / 2 };
  assert.equal(clampToRects(tg.walk, door.x, door.z).moved, false, 'the doorway is open to him');
  assert.equal(clampToRects([tg.zombieRect], door.x + 2, door.z).moved, true, 'not to them');
  assert.ok(TRAINING.BUILD.maxX <= TRAINING.RANGE.minX, 'the build room is on his right (-x)');
  assert.ok(tg.targets[0].x > tg.targets[4].x, 'lane 1 on his left');
  assert.equal(clampToRects(tg.walk, tg.spawn.x, tg.spawn.z).moved, false, 'he starts inside, behind the line');
  assert.ok(tg.spawn.z < O.z + TRAINING.LINE_Z);
  assert.equal(clampToRects([tg.zombieRect], tg.gate.x, tg.gate.z).moved, false, 'the gate opens into their room');
  assert.equal(clampToRects(tg.walk, tg.bed.stand.x, tg.bed.stand.z).moved, false, 'he wakes up beside the bed, inside');
  // A target goes down when shot, stays down, then stands up again.
  assert.ok(tg.hitTarget(2));
  assert.equal(tg.hitTarget(2), false, 'not twice while it falls');
  for (let i = 0; i < 10; i++) tg.update(0.05);
  assert.equal(tg.targets[2].state, 'down');
  for (let i = 0; i < Math.ceil((TRAINING.DOWN_S + TRAINING.RISE_S) / 0.05) + 2; i++) tg.update(0.05);
  assert.equal(tg.targets[2].state, 'up');
  assert.equal(tg.targets[2].pivot.rotation.x, 0);
  assert.equal(tg.targets[2].hits, 1);
  // Every wall stops rounds; a round fired down lane 3 meets its target before the far wall.
  const a = { x: O.x, y: O.y + 1.2, z: O.z - 4 }, b = { x: O.x, y: O.y + 1.2, z: O.z + 40 };
  let first = null, ft = 2;
  for (const s of tg.solids) { const t = segmentBox(a, b, s); if (t !== null && t < ft) { ft = t; first = s; } }
  assert.equal(first && first.target, 2);
  assert.equal(tg.floorAt(O.x, O.z), O.y);
  assert.equal(tg.floorAt(0, 0), null, 'the map is not its floor');
  tg.dispose();
});

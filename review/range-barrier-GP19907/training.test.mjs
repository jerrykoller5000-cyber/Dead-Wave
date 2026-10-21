// world/training.test.mjs — CL-115: the Training Ground. Keeping a body inside the rooms, rounds meeting boxes, and
// the build (with the test build of three: no canvas in Node, so the textures are left out).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../tools/tests/fakethree.mjs';
import { TRAINING, clampToRects, segmentBox, buildTrainingGround, fallSign } from './training.js';

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
  assert.ok(tg.hitTarget(0, -1));
  tg.update(0.05);
  assert.ok(tg.targets[0].pivot.rotation.x < 0, 'shot from behind, it falls the other way');
  const O2 = TRAINING.ORIGIN, line = O2.z + TRAINING.LINE_Z;
  assert.ok(clampToRects(tg.walk, O2.x, line + 1).moved, 'firing bench keeps bodies on the shooter side');
  assert.ok(tg.solids.some(s=>s.firingFence), 'upper fence has a physical shot surface');
  assert.equal(fallSign(O2.z + tg.targets[4].z + 2, O2.z, tg.targets[4].z), -1);
  assert.equal(fallSign(line - 1, O2.z, tg.targets[4].z), 1);
  // Every wall stops rounds; a round fired down lane 3 meets its target before the far wall.
  const a = { x: O.x, y: O.y + 1.6, z: O.z - 4 }, b = { x: O.x, y: O.y + 1.6, z: O.z + 40 };   // CL-144: the doubled plates' chest
  let first = null, ft = 2;
  for (const s of tg.solids) { const t = segmentBox(a, b, s); if (t !== null && t < ft) { ft = t; first = s; } }
  assert.equal(first && first.target, 2);
  assert.equal(tg.floorAt(O.x, O.z), O.y);
  assert.equal(tg.floorAt(0, 0), null, 'the map is not its floor');
  tg.dispose();
});

test('CL-143: the build room is a hangar, and building stays five squares clear of the zombie gate', () => {
  const tg = buildTrainingGround(T, { grid: 2 });
  const O = TRAINING.ORIGIN, B = TRAINING.BUILD, b = tg.build;
  const walls = tg.solids.filter((s) => s.wall && s.minX >= O.x + B.minX - 0.5 && s.minX < O.x + B.maxX - 0.05 && s.maxX <= O.x + B.maxX + 0.5 && s.minZ >= O.z + B.minZ - 0.5 && s.maxZ <= O.z + B.maxZ + 0.5);
  assert.ok(walls.length >= 5 && walls.every((s) => s.maxY - O.y >= TRAINING.HANGAR_H), 'the build room walls stand ' + TRAINING.HANGAR_H + ' m');
  assert.ok(TRAINING.HANGAR_H >= 22, 'above the mortar\'s highest shell (about 20.5 m)');
  // every square of the lattice inside the room is either buildable or has a reason; the gate's apron is five deep
  const cell = (lx, lz) => [Math.round((O.x + lx) / 2), Math.round((O.z + lz) / 2)];
  const at = (lx, lz) => b.refusal(...cell(lx, lz));
  for (let k = 1; k <= TRAINING.GATE_CLEAR; k++) assert.equal(at(tg.gate.x - O.x, B.maxZ - 2 * k), 'gate', k + ' squares out from the gate');
  assert.equal(at(tg.gate.x - O.x, B.maxZ - 2 * TRAINING.GATE_CLEAR - 2), null, 'the sixth square is open');
  assert.equal(at(0, 10), 'outside', 'not on the range');
  assert.equal(at(B.maxX - 2, (TRAINING.DOOR.minZ + TRAINING.DOOR.maxZ) / 2), 'door');
  assert.equal(at((B.minX + B.maxX) / 2, 4), null, 'the middle of the room');
  assert.ok(b.gateCells.length > 20 && b.gateCells.every(([gx, gz]) => b.refusal(gx, gz) === 'gate'), 'the painted squares are the refused ones');
});

test('CL-144: the plates are twice the size, and a hit scores by its ring and the lane', async () => {
  const { scoreZone, onSilhouette, PLATE_ART } = await import('./training.js');
  const tg = buildTrainingGround(T);
  const t0 = tg.targets[0], b = t0.box;
  assert.ok(Math.abs((b.maxX - b.minX) - 1.28) < 1e-6 && Math.abs((b.maxY - b.minY) - 2.24) < 1e-6, 'plate 1.28 x 2.24 m');
  // canvas units: the head ring, the chest bullseye and ring, the rest, and the cut-away corner
  const A = PLATE_ART;
  assert.equal(scoreZone(A.head.u, A.head.v).zone, 'head');
  assert.equal(scoreZone(A.chest.u, A.chest.v).zone, 'bull');
  assert.equal(scoreZone(A.chest.u + 40, A.chest.v).zone, 'ring');
  assert.equal(scoreZone(A.chest.u, 400).zone, 'plate');
  assert.equal(onSilhouette(10, 20), false, 'the top corner is cut away');
  assert.equal(scoreZone(10, 20), null);
  // in the world: the middle of the chest on lane 5 is a bullseye times 3
  const t4 = tg.targets[4], cx = (t4.box.minX + t4.box.maxX) / 2;
  const chestY = t4.box.maxY - A.chest.v / A.H * (t4.box.maxY - t4.box.minY);
  const s = tg.scoreHit(4, { x: cx, y: chestY, z: t4.box.minZ });
  assert.equal(s.zone, 'bull'); assert.equal(s.mult, 3); assert.equal(s.total, 30);
  assert.equal(tg.scoreHit(0, null).total, 2, 'a blade or a blast: the plate, lane 1');
  assert.equal(tg.onPlate(4, { x: t4.box.minX + 0.01, y: t4.box.maxY - 0.01, z: t4.box.minZ }), false, 'a corner of the box is not the plate');
});

test('CL-146: the door has a keypad each side, and nothing in the hangar touches the shared wall', () => {
  const tg = buildTrainingGround(T, { grid: 2 });
  const O = TRAINING.ORIGIN, B = TRAINING.BUILD, kp = tg.securityDoor.keypads;
  assert.equal(kp.length, 2);
  assert.deepEqual(kp.map((k) => k.side).sort(), [-1, 1], 'the range side and the build room side');
  for (const k of kp) {
    assert.equal(clampToRects(tg.walk, k.front.x, k.front.z).moved, false, 'he can stand at the keypad');
    assert.ok(Math.hypot(k.front.x - tg.securityDoor.x, k.front.z - tg.securityDoor.z) > 1.5, 'not the doorway');
  }
  for (const s of tg.solids.filter((s) => s.column)) assert.ok(s.maxX < O.x + B.maxX - 0.02 && s.minX > O.x + B.minX + 0.02, 'columns stand off the walls');
  // every box in the hangar's roof and frame stops short of the shared wall's plane (x = B.maxX)
  const wx = O.x + B.maxX; let touching = 0;
  tg.group.updateMatrixWorld(true);
  tg.group.traverse((m) => {
    if (!m.isMesh || !m.geometry || !m.geometry.parameters || m.geometry.type !== 'BoxGeometry' || m.position.y < 6.5) return;
    const p = m.geometry.parameters, hx = p.width / 2;
    if (Math.abs(m.rotation.y) < 1e-6 && Math.abs(m.rotation.z) < 1e-6 && Math.abs((m.position.x + O.x + hx) - wx) < 0.01) touching++;
  });
  assert.equal(touching, 0, 'no box face in the shared wall\'s plane above the range walls');
  // and nothing of the hangar's leaks over the range at the height of its wall tops (a ledge lost its turn once and ran
  // 17 m out across the range)
  let over = 0; const v = new T.Vector3();
  const firingFixture = tg.group.getObjectByName('training-firing-bench');
  tg.group.traverse((m) => {
    const P = m.isMesh && m.geometry && m.geometry.attributes && m.geometry.attributes.position;
    if (!P) return;
    // GP-19907 intentionally adds overhead fencing at the existing firing line.
    let owner=m;while(owner&&owner!==firingFixture)owner=owner.parent;
    if(owner===firingFixture&&firingFixture)return;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
      const lx = v.x - O.x, ly = v.y - O.y;
      if (lx > TRAINING.RANGE.minX + 0.6 && lx < TRAINING.RANGE.maxX - 0.6 && ly > 5.7 && ly < 6.3) over++;
    }
  });
  assert.equal(over, 0, 'nothing hangs over the range at 6 m');
});

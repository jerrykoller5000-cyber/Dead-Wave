import test from 'node:test';
import assert from 'node:assert/strict';
import { pickStoneSites, crackLine, mulberry, MARROW_DOOR, GLOW } from './first-people.js';

test('the stones take the highest clear ground, spaced apart', () => {
  const cands = [
    { x: 0, z: 0, y: 10 }, { x: 10, z: 0, y: 12 }, { x: 200, z: 0, y: 9 }, { x: 0, z: 150, y: 11 },
    { x: 90, z: 90, y: 30, clear: false }, { x: -120, z: 40, y: 8 }
  ];
  const s = pickStoneSites(cands, { count: 3, sep: 70 });
  assert.equal(s.length, 3);
  assert.deepEqual(s[0], cands[1], 'the highest clear one first');
  assert.ok(!s.includes(cands[4]), 'a spot with something standing on it is skipped');
  for (const a of s) for (const b of s) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 70);
  assert.deepEqual(pickStoneSites(cands, { count: 3, sep: 70 }), s, 'the same every time: the terrain picks them');
});

test('the door\'s crack opens into a hole at its foot, wide enough for the dead and no more', () => {
  const pts = crackLine(mulberry(7), 7.4);
  assert.equal(pts[0].y, 0);
  assert.ok(Math.abs(pts[pts.length - 1].y - 7.4) < 1e-9, 'it runs to the top');
  assert.ok(Math.abs(pts[0].half - MARROW_DOOR.holeHalf) < 1e-9, 'the hole at the floor');
  for (const p of pts) {
    if (p.y > MARROW_DOOR.crackTop) assert.ok(p.half <= 0.07, 'above the hole it is a crack: ' + p.half.toFixed(3));
    assert.ok(Math.abs(p.x) <= 0.35, 'it wanders, but stays in the middle');
  }
  assert.deepEqual(crackLine(mulberry(7), 7.4), pts, 'its own dice: the same every run');
});

test('the carvings glow at night, barely by day, and go dark when the tone is silenced', () => {
  assert.ok(GLOW.NIGHT > 0.5 && GLOW.DAY < 0.1 && GLOW.SILENCED < 0.1);
});

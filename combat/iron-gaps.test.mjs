import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringGapSpots, shortcutSpot, ironPush, ironBlockCircles, nearestSpot, createIronGaps, IRON_THICK } from './iron-gaps.js';
import { hqRingPoints, ringTrailGaps, makeWallBand, resolveWallBand } from '../game/wall-bands.js';

// The ring with three trails: one square across the north, two side by side through the south (one opening).
const trails = [
  [{ x: 0, z: 20 }, { x: 0, z: 100 }],
  [{ x: -1.5, z: -20 }, { x: -1.5, z: -100 }],
  [{ x: 1.5, z: -20 }, { x: 1.5, z: -100 }],
];
const ring = makeWallBand({ pts: hqRingPoints(60), width: 4, gaps: ringTrailGaps(trails, 60, 4) });
ring.radius = 60;

test('a spot over each opening in the ring, side by side trails as one', () => {
  const s = ringGapSpots(ring);
  assert.equal(s.length, 2);
  const north = s.find((q) => q.z > 0), south = s.find((q) => q.z < 0);
  assert.ok(Math.abs(north.x) < 0.2 && Math.abs(north.z - 60) < 0.01);
  assert.ok(Math.abs(Math.abs(north.ux) - 1) < 1e-3);
  assert.ok(south.half > north.half + 1);
});

test('the line closes its opening: no way through on the centre circle past its ends', () => {
  for (const s of ringGapSpots(ring)) {
    for (const t of [-1, 1]) {
      // just past each end of the line the ring is solid to a body
      const x = s.x + s.ux * t * (s.half - 0.2), z = s.z + s.uz * t * (s.half - 0.2);
      const r = resolveWallBand(ring, x, z, 0.35);
      assert.ok(Math.hypot(r.x - x, r.z - z) > 1e-3, 'end ' + t + ' of ' + s.id + ' sits in the thicket');
    }
    const c = resolveWallBand(ring, s.x, s.z, 0.35);
    assert.ok(Math.hypot(c.x - s.x, c.z - s.z) < 1e-6, s.id + ' centre is open ground');
  }
});
test('a cut deadfall has a spot over its kerf; an uncut one none', () => {
  const band = { id: 'sc-1', cut: false, pts: [{ x: 0, z: 0 }, { x: 10, z: 0 }], middle: { x: 5, z: 0 } };
  assert.equal(shortcutSpot(band), null);
  band.cut = true;
  const s = shortcutSpot(band);
  assert.equal(s.id, 'cut:sc-1'); assert.equal(s.x, 5); assert.equal(s.ux, 1);
});

test('the dead are pushed back to the side they came from', () => {
  const s = ringGapSpots(ring).find((q) => q.z > 0);
  const r = 0.35;
  const s0 = { ...s, x: 0, z: 60, ux: 1, uz: 0, segs: undefined };
  const fromOut = ironPush(s0, 0, 60.1, r, 0, 60.6);   // walking inward (toward -z) from outside
  assert.ok(fromOut && fromOut.z >= 60 + IRON_THICK + r - 1e-9);
  const fromIn = ironPush(s0, 0, 60.2, r, 0, 59.0);   // stepped across from inside
  assert.ok(fromIn && fromIn.z <= 60 - IRON_THICK - r + 1e-9);
  assert.equal(ironPush(s0, 0, 62, r, 0, 62.2), null);    // well clear
  assert.equal(ironPush(s0, s0.half + 1, 60, r, s0.half + 1, 60.5), null);    // off the line's end
});

test('the field circles run the line end to end', () => {
  const s = ringGapSpots(ring).find((q) => q.z > 0);
  const c = ironBlockCircles(s);
  assert.ok(c.length >= 4);
  assert.ok(Math.abs(c[0].x + c[c.length - 1].x) < 0.05 && Math.abs(c[0].x) > s.half - 0.3);
});

test('a long oblique opening is strung along the ring in short chords that stay on it', () => {
  const oblique = [[{ x: 40, z: -30 }, { x: 70, z: 20 }]];   // crosses the ring at a shallow angle
  const band = makeWallBand({ pts: hqRingPoints(60), width: 4, gaps: ringTrailGaps(oblique, 60, 4) }); band.radius = 60;
  const [s] = ringGapSpots(band);
  assert.ok(s && s.half * 2 > 8, 'a long opening (' + (s && s.half * 2).toFixed(1) + ' m)');
  assert.ok(s.segs.length >= 3 && s.segs.every((g) => g.half * 2 <= 4.01));
  for (const g of s.segs) for (const t of [-1, 0, 1]) {
    const x = g.x + g.ux * g.half * t, z = g.z + g.uz * g.half * t;
    assert.ok(Math.abs(Math.hypot(x, z) - 60) < 0.05, 'the chord stays on the ring');
  }
  // a body walking straight across anywhere in the opening is held on its side
  for (let f = -0.9; f <= 0.9; f += 0.15) {
    const a = Math.atan2(s.z, s.x) + f * s.half / 60;
    const p = ironPush(s, Math.cos(a) * 60.1, Math.sin(a) * 60.1, 0.35, Math.cos(a) * 61, Math.sin(a) * 61);
    assert.ok(p && Math.hypot(p.x, p.z) > 60.4, 'held outside at ' + f.toFixed(2));
  }
});

test('the river opening is the river\'s', () => {
  const band = makeWallBand({ pts: hqRingPoints(60), width: 4, gaps: [{ id: 'river-0', kind: 'river', at: 10, width: 12 }] }); band.radius = 60;
  assert.equal(ringGapSpots(band).length, 1);
  assert.equal(ringGapSpots(band, { isWater: (x, z) => Math.abs(Math.atan2(z, x) * 60 - 10) < 6 }).length, 0);
});

test('hang takes a set, take down gives it back, none left none hung', () => {
  let n = 4;
  const supply = { count: () => n, take: () => (n > 0 ? (n--, true) : false), give: () => { n++; } };
  const iron = createIronGaps(supply);
  const spots = [0, 1, 2, 3, 4].map((i) => ({ id: 's' + i, x: i * 10, z: 0, ux: 1, uz: 0, half: 2 }));
  for (let i = 0; i < 4; i++) assert.ok(iron.hang(spots[i]));
  assert.equal(n, 0);
  assert.equal(iron.hang(spots[4]), false);
  assert.equal(iron.hang(spots[0]), false);
  assert.ok(iron.takeDown('s2')); assert.equal(n, 1); assert.equal(iron.takeDown('s2'), false);
  assert.ok(iron.hang(spots[4])); assert.equal(n, 0);
  assert.equal(nearestSpot(spots, 41, 1).id, 's4');
  assert.equal(nearestSpot(spots, 45, 0), null);
  const saved = iron.read();
  iron.reset(); assert.equal(iron.count(), 0);
  iron.load(saved, new Map(spots.map((s) => [s.id, s])));
  assert.deepEqual(iron.hung().map((s) => s.id).sort(), ['s0', 's1', 's3', 's4']);
  assert.deepEqual(iron.prune(new Set(['s0', 's1', 's3'])), ['s4']); assert.equal(n, 1);
});
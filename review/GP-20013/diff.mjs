// Compare the original resolver with the allocation-free resolver at identical
// collision inputs, copying coordinates before the scratch result is reused.
import assert from 'node:assert/strict';
import * as before from './wall-bands-baseline.js';
import * as after from '../../game/wall-bands.js';

const trails = [[{ x: 0, z: 30 }, { x: 0, z: 90 }]];
const ring = before.makeWallBand({ pts: before.hqRingPoints(60), width: 4,
  gaps: before.ringTrailGaps(trails, 60, 4) });
ring.radius = 60;
const bent = before.makeWallBand({ pts: [
  { x: 0, z: 0 }, { x: 8, z: 3 }, { x: 14, z: 12 }, { x: 18, z: 20 },
], width: 5, gaps: [before.bandWalkGap('walk', 12, 4, 5),
  { id: 'water', kind: 'river', at: 21, width: 8 }] });
const straight = before.makeWallBand({ pts: [
  { x: -10, z: 0 }, { x: 10, z: 0 },
], width: 1.4, gaps: [{ id: 'cut', kind: 'cut', at: 10, width: 5 }] });
let checks = 0;
for (const band of [ring, bent, straight]) {
  for (let x = -70; x <= 70; x += 2.5) {
    for (let z = -70; z <= 70; z += 2.5) {
      for (const bodyR of [0.2, 0.35, 0.8]) {
        const a = before.resolveWallBand(band, x, z, bodyR);
        const b = after.resolveWallBand(band, x, z, bodyR);
        assert.ok(Object.is(a.x, b.x) && Object.is(a.z, b.z),
          `mismatch at ${band === ring ? 'ring' : band === bent ? 'bent' : 'straight'} ${x},${z},${bodyR}`);
        checks++;
      }
    }
  }
}
console.log(`resolveWallBand parity: ${checks} inputs, 0 mismatches`);

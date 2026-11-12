// Compare the broadphase camera trace to the same slab trace with only the new skip removed.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { trainingCameraContact } from '../../game/training-camera-collision.js';
const source = fs.readFileSync(fileURLToPath(new URL('../../game/training-camera-collision.js', import.meta.url)), 'utf8');
const skip = /b\.maxX<rayMinX\|\|b\.minX>rayMaxX\|\|\s*b\.maxY<rayMinY\|\|b\.minY>rayMaxY\|\|b\.maxZ<rayMinZ\|\|b\.minZ>rayMaxZ\|\|\s*/;
if (!skip.test(source)) throw Error('Broadphase anchor changed');
const reference = (await import('data:text/javascript,' + encodeURIComponent(source.replace(skip, '')))).trainingCameraContact;
let seed = 0x20122;
function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; }
const boxes = Array.from({ length: 293 }, (_, i) => {
  const x = rnd() * 90 - 45, y = rnd() * 15, z = rnd() * 90 - 45;
  return { minX: x, maxX: x + rnd() * 5, minY: y, maxY: y + rnd() * 5, minZ: z, maxZ: z + rnd() * 5,
    ...(i % 13 === 0 ? { target: i } : {}), ...(i % 17 === 0 ? { floor: true } : {}),
    ...(i % 19 === 0 ? { ceiling: true } : {}), ...(i % 23 === 0 ? { infirmaryFence: true } : {}) };
});
for (let i = 0; i < 5000; i++) {
  const from = { x: rnd() * 90 - 45, y: rnd() * 15, z: rnd() * 90 - 45 };
  const to = { x: from.x + rnd() * 10 - 5, y: from.y + rnd() * 4 - 2, z: from.z + rnd() * 10 - 5 };
  const got = trainingCameraContact(from, to, boxes), want = reference(from, to, boxes);
  if (got?.box !== want?.box || got?.t !== want?.t) throw Error(`Mismatch ray ${i}: ${JSON.stringify({ got, want })}`);
}
console.log('PASS 5000 deterministic Training camera rays: broadphase returns the same box and distance');
const extras = boxes.slice(0, 15).map(b => ({ ...b, floor: false, target: null }));
for (let i = 0; i < 5000; i++) {
  const from = { x: rnd() * 90 - 45, y: rnd() * 15, z: rnd() * 90 - 45 };
  const to = { x: from.x + rnd() * 10 - 5, y: from.y + rnd() * 4 - 2, z: from.z + rnd() * 10 - 5 };
  const raised = i % 2 === 0;
  const base = boxes.filter(b => !b.floor && !b.ceiling && b.target == null && (!b.infirmaryFence || raised));
  const want = reference(from, to, [...base, ...extras]);
  const got = trainingCameraContact(from, to, boxes, .12, extras, raised);
  if (got?.box !== want?.box || got?.t !== want?.t) throw Error(`Pull mismatch ray ${i}: ${JSON.stringify({ got, want })}`);
}
console.log('PASS 5000 Training pull rays: direct solids and extras match filtered candidates');

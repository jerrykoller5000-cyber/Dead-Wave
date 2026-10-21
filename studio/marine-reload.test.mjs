// node --test studio/marine-reload.test.mjs — CL-84 part 2: the reload's hand path clip.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateHandPath, handKeysAt, handPointAt, catmullRom, magAt } from './marine-reload.js';

const clip = validateHandPath(JSON.parse(fs.readFileSync(new URL('./clips/marine/reload-rifle.json', import.meta.url), 'utf8')));
// A stand-in body: the places where they sit on a marine facing +z with the gun out in front.
const PL = { fore: { x: -0.05, y: 1.2, z: 0.7 }, well: { x: 0.0, y: 1.05, z: 0.45 }, pouch: { x: -0.12, y: 0.97, z: 0.25 }, below: { x: 0.0, y: 0.95, z: 0.45 } };
const AX = { side: { x: -1, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 }, fwd: { x: 0, y: 0, z: 1 } };
const at = (u) => handPointAt(clip, u, (n) => PL[n], AX);
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

test('the clip reads', () => {
  assert.equal(clip.name, 'reload-rifle');
  assert.deepEqual(clip.weapons, ['m4', 'ak', 'aa12']);
});
test('a bad clip is refused', () => {
  assert.throws(() => validateHandPath({ format: 'dw-hand-path/1', hand: [{ t: 0, at: 'fore' }] }));
  assert.throws(() => validateHandPath({ ...clip, hand: [{ t: 0, at: 'fore' }, { t: 1, at: 'well' }] }), /end where it started/);
  assert.throws(() => validateHandPath({ ...clip, mag: [{ t: 0.2, do: 'juggle' }] }), /unknown mag state/);
});
test('it starts and ends on the support grip, and goes to the pouch and back to the well', () => {
  assert.ok(d(at(0), PL.fore) < 1e-9 && d(at(1), PL.fore) < 1e-9);
  assert.ok(d(at(0.32), { x: PL.pouch.x, y: PL.pouch.y + 0.02, z: PL.pouch.z + 0.03 }) < 1e-9, 'at the pouch at 0.32');
  assert.ok(d(at(0.60), PL.well) < 1e-9, 'at the well when the magazine seats');
});
test('the path is smooth: no jump between frames at 60 fps over a 2.2 s reload', () => {
  let prev = at(0), worst = 0;
  for (let f = 1; f <= 132; f++) { const p = at(f / 132); worst = Math.max(worst, d(p, prev)); prev = p; }
  // A quick hand peaks near 3 m/s in a real magazine change: 0.06 m a frame at 60 fps.
  assert.ok(worst < 0.06, 'biggest step ' + worst.toFixed(3) + ' m');
});
test('going to the pouch and coming back it swings out in front of the body, never through the chest', () => {
  // The chest's front is about z 0.2 at pouch height; the hand stays in front of it on the way.
  for (let u = 0.16; u <= 0.5; u += 0.01) assert.ok(at(u).z > 0.2, 'u ' + u.toFixed(2) + ' z ' + at(u).z.toFixed(3));
});
test('the magazine: seated, dropped, gone, in the hand from the pouch, seated', () => {
  assert.equal(magAt(clip, 0.02).state, 'seated');
  assert.equal(magAt(clip, 0.1).state, 'drop');
  assert.equal(magAt(clip, 0.25).state, 'gone');
  assert.equal(magAt(clip, 0.4).state, 'hand');
  assert.equal(magAt(clip, 0.7).state, 'seated');
  assert.ok(magAt(clip, 0.33).state === 'hand' && clip.hand.some((k) => k.at === 'pouch' && k.t <= 0.33), 'he has the hand at the pouch when he takes it');
});
test('catmullRom passes through its middle points', () => {
  const p = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }, { x: 3, y: 1, z: 0 }];
  assert.deepEqual(catmullRom(...p, 0), { x: 1, y: 0, z: 0 });
  assert.deepEqual(catmullRom(...p, 1), { x: 2, y: 1, z: 0 });
  assert.equal(handKeysAt(clip, 0.5).k1.t, 0.45);
});

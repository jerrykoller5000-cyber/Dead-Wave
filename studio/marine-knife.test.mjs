// CL-122: the knife arm's slash (studio/clips/marine/knife-slash.json), read by the hand path player.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateHandPath, handPointAt } from './marine-reload.js';

const clip = validateHandPath(JSON.parse(fs.readFileSync(new URL('./clips/marine/knife-slash.json', import.meta.url), 'utf8')));
// Marine axes: side = out to the knife side, up, fwd. rest = where the pose has the hand; chest = in front of the chest.
const axes = { side: { x: 1, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 }, fwd: { x: 0, y: 0, z: 1 } };
const P = { rest: { x: 0.25, y: 0.9, z: 0.1 }, chest: { x: 0, y: 1.22, z: 0.12 } };
const at = (u) => handPointAt(clip, u, (k) => P[k], axes);

test('the slash starts and ends where the pose has the hand', () => {
  for (const u of [0, 1]) { const p = at(u); assert.ok(Math.hypot(p.x - P.rest.x, p.y - P.rest.y, p.z - P.rest.z) < 1e-9); }
});

test('a short cock, a thrust out in front, then a small cut across', () => {
  const cock = at(0.14), thrust = at(0.40), cut = at(0.58);
  assert.ok(cock.x > 0.1 && cock.z < 0.15, 'cock ' + JSON.stringify(cock));
  assert.ok(thrust.z > 0.45 && Math.abs(thrust.x) < 0.12, 'thrust ' + JSON.stringify(thrust));
  assert.ok(cut.x < -0.05 && cut.z < thrust.z, 'cut ' + JSON.stringify(cut));
});

const chop = validateHandPath(JSON.parse(fs.readFileSync(new URL('./clips/marine/machete-chop.json', import.meta.url), 'utf8')));
const atChop = (u) => handPointAt(chop, u, (k) => P[k], axes);

test('the machete chop rises, comes down in front, and follows through low', () => {
  const high = atChop(0.34), down = atChop(0.50), through = atChop(0.66);
  assert.ok(high.y > 1.5 && high.z < down.z, 'raised ' + JSON.stringify(high));
  assert.ok(down.z > 0.45 && down.y < high.y - 0.2, 'the chop ' + JSON.stringify(down));
  assert.ok(through.x < -0.15 && through.y < down.y, 'follow-through ' + JSON.stringify(through));
  let prev = atChop(0), worst = 0;
  for (let i = 1; i <= 1000; i++) { const p = atChop(i / 1000); worst = Math.max(worst, Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)); prev = p; }
  assert.ok(worst < 0.01, 'machete path jumps ' + worst.toFixed(4));
});

test('no jump: the path is continuous (1000 steps over the swing, none over 1 cm)', () => {
  let prev = at(0), worst = 0;
  for (let i = 1; i <= 1000; i++) { const p = at(i / 1000); worst = Math.max(worst, Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)); prev = p; }
  assert.ok(worst < 0.01, 'worst step ' + worst.toFixed(4));
});

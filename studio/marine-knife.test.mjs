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

test('wind-up out to the knife side and high, the cut in front at reach, the follow-through across and low', () => {
  const w = at(0.22), c = at(0.40), f = at(0.55);
  assert.ok(w.x > 0.25 && w.y > 1.35, 'wind-up ' + JSON.stringify(w));
  assert.ok(c.z > 0.4 && Math.abs(c.x) < 0.15, 'the cut ' + JSON.stringify(c));
  assert.ok(f.x < -0.05 && f.y < c.y, 'follow-through ' + JSON.stringify(f));
});

test('no jump: the path is continuous (1000 steps over the swing, none over 1 cm)', () => {
  let prev = at(0), worst = 0;
  for (let i = 1; i <= 1000; i++) { const p = at(i / 1000); worst = Math.max(worst, Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)); prev = p; }
  assert.ok(worst < 0.01, 'worst step ' + worst.toFixed(4));
});

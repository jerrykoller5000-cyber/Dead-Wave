// studio/tune-grab-turn.mjs — places the guardian through its turn so the hand holding the ankle stays
// still (CL-64). A creature that has something by the leg turns by walking its body round the grip,
// it doesn't swing the victim through the air. This moves the guardian's keyed "at" during the turn
// (and where the haul path starts) until the hand holds its place, then writes the scene back.
//
//   node --import ./studio/node-three.mjs studio/tune-grab-turn.mjs
import fs from 'node:fs';
import * as THREE from 'three';
import { loadScene, createScene } from './scene.js';

const FILE = new URL('./scenes/guardian-grab-drag.json', import.meta.url);
const clipOf = (ref) => JSON.parse(fs.readFileSync(new URL(`./clips/${ref}.json`, import.meta.url), 'utf8'));
const T0 = 0.85, T1 = 2.15, STEP = 0.1;
const json = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const g = json.actors.guardian;
const r3 = (x) => Math.round(x * 1000) / 1000;
// Start from the keys up to the turn, then one key every STEP through it.
const before = g.at.filter((k) => k[0] <= T0 + 1e-9);
const start = before[before.length - 1][1];
let keys = [];
for (let t = T0 + STEP; t <= T1 + 1e-9; t += STEP) keys.push([r3(t), [...start], 'linear']);
const handAt = (sp, t) => { sp.seek(t); return new THREE.Vector3().setFromMatrixPosition(sp.actors.guardian.inst.R.wristR.matrixWorld); };
for (let it = 0; it < 6; it++) {
  g.at = [...before, ...keys];
  g.at[before.length] = [...g.at[before.length]];
  const end = keys[keys.length - 1][1];
  json.paths.haul.points[0] = [r3(end[0]), 0, r3(end[2])];
  json.paths.haul.points[1] = [r3(end[0]), 0, 20];
  const sp = createScene(loadScene(json, clipOf));
  const h0 = handAt(sp, T0);
  let worst = 0;
  keys = keys.map(([t, p, e]) => {
    const h = handAt(sp, t);
    const dx = h0.x - h.x, dz = h0.z - h.z;
    worst = Math.max(worst, Math.hypot(dx, dz));
    return [t, [r3(p[0] + dx), p[1], r3(p[2] + dz)], e];
  });
  console.log(`pass ${it + 1}: the hand moved up to ${worst.toFixed(3)} m through the turn`);
  if (worst < 0.02) break;
}
g.at = [...before, ...keys];
const end = keys[keys.length - 1][1];
json.paths.haul.points = [[r3(end[0]), 0, r3(end[2])], [r3(end[0]), 0, 20]];
fs.writeFileSync(FILE, JSON.stringify(json, null, 2) + '\n');
console.log('wrote', FILE.pathname.split('/').slice(-3).join('/'), '— the haul starts at', end.map(r3).join(', '));

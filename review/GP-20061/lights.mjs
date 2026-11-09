// GP-20061: the deployed mortar at gameplay scale under four lights.
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const out = path.resolve('review/GP-20061/after');
fs.mkdirSync(out, { recursive: true });
const E = new Engine({ warm: 'none', size: '1280x720' });
try {
  await E.open();
  const captures = [];
  for (const light of [
    { name: 'noon', time: 'noon', rain: false },
    { name: 'overcast', time: 'noon', rain: true },
    { name: 'dusk', time: 'dusk', rain: false },
    { name: 'night', time: 'night', rain: false }
  ]) {
    await E.page.evaluate(`(() => { const w = TT.weather; w.raining = ${light.rain}; w.rainTimeLeft = ${light.rain ? 100 : 0}; w.intensity = ${light.rain ? 1 : 0}; })()`);
    const result = await E.run({ cmd: 'shot', target: 'weapon:mortar', view: 'three', time: light.time,
      out: path.join(out, `mortar-${light.name}.png`) });
    captures.push({ light: light.name, file: result.shots[0].file });
  }
  const carried = await E.run({ cmd: 'shot', target: 'weapon:mortarCarried', view: 'three', time: 'noon',
    out: path.join(out, 'mortar-collapsed.png') });
  captures.push({ light: 'carried', file: carried.shots[0].file });
  fs.writeFileSync(path.join(out, 'lights.json'), JSON.stringify({ renderer: E.renderer, loadSec: E.loadSec, captures }, null, 2) + '\n');
  console.log(JSON.stringify({ renderer: E.renderer, captures: captures.length, loadSec: E.loadSec }));
} finally { await E.close(); }

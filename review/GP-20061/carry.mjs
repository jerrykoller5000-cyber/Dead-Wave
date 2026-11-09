// GP-20061: inspect the rebuilt mortar in the marine's carry and crew poses.
import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const out = path.resolve('review/GP-20061/after');
fs.mkdirSync(out, { recursive: true });
const E = new Engine({ inspect: true, warm: 'none', size: '1280x720' });
try {
  await E.open();
  const states = [];
  for (const [move, file] of [['mortar-carry', 'marine-carry.png'], ['mortar', 'marine-crew.png']]) {
    const state = await E.page.evaluate(`(async () => {
      await DWInspect.show('marine');
      await DWInspect.marine.play(${JSON.stringify(move)}, { loop: false });
      DWInspect.play();
      await new Promise(r => setTimeout(r, 650));
      return DWInspect.marine.state();
    })()`);
    states.push({ move, state });
    await E.run({ cmd: 'shot', target: 'marine', view: 'three', out: path.join(out, file) });
  }
  fs.writeFileSync(path.join(out, 'carry.json'), JSON.stringify({ renderer: E.renderer, states }, null, 2) + '\n');
  console.log(JSON.stringify({ renderer: E.renderer, moves: states.map(s => s.move), errors: E.page.errors?.length || 0 }));
} finally { await E.close(); }

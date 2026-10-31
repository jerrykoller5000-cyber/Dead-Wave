import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../tools/camera.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const QA_DIR = path.join(ROOT, 'qa', '2026-10-29-AG-159');

async function main() {
  console.log('Testing marine moves in inspector...');
  const engine = new Engine({ inspect: true, warm: 'none', size: [1600, 900] });
  try {
    await engine.open();
    console.log(`Inspector loaded in ${engine.loadSec.toFixed(1)}s, renderer: ${engine.renderer}`);

    const res = await engine.page.evaluate(`(async () => {
      const api = window.DWInspect;
      await api.show('marine');
      
      const results = {};
      
      // Test 1: play 'walk' and step
      await api.marine.play('walk', { loop: false });
      api.pause();
      api.view('side');
      const shot1 = await api.shot();
      await api.stepAsync(20);
      const shot2 = await api.shot();
      results.walk = { shot1Len: shot1.length, shot2Len: shot2.length };

      // Test 2: dive pose
      const { applyDivePose } = await import('./tools/marine-inspector.js').catch(async () => {
        return await import('./studio/marine-dive-pose.js');
      });
      const marine = window.DWInspectHost.marine;
      results.hasMarine = !!marine;
      if (applyDivePose && marine) {
        applyDivePose(marine, 0.4, 'full');
        api.view('side');
        const diveSide = await api.shot();
        api.view('three');
        const diveThree = await api.shot();
        results.dive = { diveSideLen: diveSide.length, diveThreeLen: diveThree.length };
      }

      return results;
    })()`);

    console.log('Test evaluation results:', JSON.stringify(res, null, 2));
  } finally {
    await engine.close();
  }
}

main().catch(err => {
  console.error('Test moves failed:', err);
  process.exit(1);
});

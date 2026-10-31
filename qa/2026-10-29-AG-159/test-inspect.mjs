import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../tools/camera.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const QA_DIR = path.join(ROOT, 'qa', '2026-10-29-AG-159');

async function main() {
  console.log('Testing Engine with inspect: true and DWInspect.shot()...');
  const engine = new Engine({ inspect: true, warm: 'none', size: [1600, 900] });
  try {
    await engine.open();
    console.log(`Inspector loaded in ${engine.loadSec.toFixed(1)}s, renderer: ${engine.renderer}`);

    const res = await engine.page.evaluate(`(async () => {
      const api = window.DWInspect;
      await api.show('marine');
      api.view('side');
      const dataSide = await api.shot();
      api.view('three');
      const dataThree = await api.shot();
      return { dataSide, dataThree };
    })()`);

    const bufSide = Buffer.from(res.dataSide.split(',')[1], 'base64');
    fs.writeFileSync(path.join(QA_DIR, 'test-side.png'), bufSide);
    console.log('Captured test-side.png via DWInspect.shot():', bufSide.length, 'bytes');

    const bufThree = Buffer.from(res.dataThree.split(',')[1], 'base64');
    fs.writeFileSync(path.join(QA_DIR, 'test-three.png'), bufThree);
    console.log('Captured test-three.png via DWInspect.shot():', bufThree.length, 'bytes');

  } finally {
    await engine.close();
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

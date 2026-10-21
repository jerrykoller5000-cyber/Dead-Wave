import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-96');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const libCode = fs.readFileSync(path.resolve(ROOT, 'tools/tests/lib.js'), 'utf8');

const server = await serve(ROOT, 0);

async function shootTgArmory(suffix, queryExtra = '') {
  const browser = await launch({
    headless: false,
    args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer${queryExtra}`, { timeout: 120000 });
    await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
        return true;
      })()`);
      await sleep(300);
    }
    await page.waitFor('!!window.TT', { timeout: 120000 });
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
    await sleep(400);
    await page.evaluate(libCode);

    await page.evaluate(`(async () => {
      const T = window.TT;
      await startMatch(T, 'AG96');
      T.trainingDbg.enter();
      await new Promise(r => setTimeout(r, 250));
      T.grantAllWeapons();
      await new Promise(r => setTimeout(r, 650));
      const tg = T.trainingDbg.tg();
      T.player.position.set(tg.origin.x, tg.origin.y + 0.1, tg.origin.z + 10);
      const THREE = T.THREE;
      const cp = T.trainingDbg.state().copies.armory.copy;
      cp.updateMatrixWorld(true);
      const wPos = new THREE.Vector3();
      cp.getWorldPosition(wPos);
      const q = cp.getWorldQuaternion(new THREE.Quaternion());
      const t = wPos.clone().add(new THREE.Vector3(0.76, 2.2, 0.35).applyQuaternion(q));
      const p = wPos.clone().add(new THREE.Vector3(0.76, 2.25, 3.1).applyQuaternion(q));
      T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: 50 });
      await new Promise(r => setTimeout(r, 250));
    })()`, 120000);
    await page.screenshot(path.join(OUT_DIR, `16-training-armory-${suffix}.png`));
  } finally {
    await browser.close();
  }
}

try {
  await shootTgArmory('before', '&fold=0');
  await shootTgArmory('after', '');
} finally {
  await server.close();
}

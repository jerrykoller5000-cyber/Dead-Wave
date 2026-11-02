import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Must run under the shared game-test slot');

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT = path.join(ROOT, 'qa', '2026-11-02-AG-193');
const WIDTH = 1280, HEIGHT = 720;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: [`--window-size=${WIDTH},${HEIGHT}`] });

try {
  const page = await browser.newPage({ width: WIDTH, height: HEIGHT });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!await page.waitFor('!!window.TT', { timeout: 600000 })) throw new Error('TT did not boot');
  await page.evaluate('DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG193Wall');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.setWorldTime(0.50);
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'uzi'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));
      await new Promise(r => setTimeout(r, 150));
    }
    T.setViewFirstDbg(true);
    await new Promise(r => setTimeout(r, 2000));
    // Place player right in front of HQ south wall facing -z (toward the wall)
    T.player.position.set(0, -3.17, -4.62);
    T.setOtsAimDbg(Math.PI, 0);
    await new Promise(r => setTimeout(r, 1500));
  })()`);

  await sleep(1500);
  await page.screenshot(path.join(OUT, '15-wall-hip.png'));
  console.log('Retaken 15-wall-hip.png');

  await page.evaluate('TT.setZoomHeldDbg(true)');
  await sleep(2500);
  await page.screenshot(path.join(OUT, '16-wall-ads.png'));
  console.log('Retaken 16-wall-ads.png');

} finally {
  await browser.close();
  await server.close();
}

// Now do ?vm=0 against the exact same wall
const serverOld = await serve(ROOT, 0);
const browserOld = await launch({ headless: false, args: [`--window-size=${WIDTH},${HEIGHT}`] });

try {
  const pageOld = await browserOld.newPage({ width: WIDTH, height: HEIGHT });
  await pageOld.goto(`${serverOld.origin}/index.html?debug=1&raf=timer&vm=0`, { timeout: 300000 });
  if (!await pageOld.waitFor('!!window.TT', { timeout: 600000 })) throw new Error('TT did not boot on ?vm=0');
  await pageOld.evaluate('DWOpening?.dismissForTesting?.()');
  await pageOld.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 60000 });
  await pageOld.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));

  await pageOld.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG193OldWall');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    T.setWorldTime(0.50);
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'uzi'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));
      await new Promise(r => setTimeout(r, 150));
    }
    T.setViewFirstDbg(true);
    await new Promise(r => setTimeout(r, 2000));
    T.player.position.set(0, -3.17, -4.62);
    T.setOtsAimDbg(Math.PI, 0);
    await new Promise(r => setTimeout(r, 1500));
  })()`);

  await sleep(1500);
  await pageOld.screenshot(path.join(OUT, '19-old-wall-hip.png'));
  console.log('Retaken 19-old-wall-hip.png');

} finally {
  await browserOld.close();
  await serverOld.close();
}

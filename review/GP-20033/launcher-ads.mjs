// One real-renderer launcher sight picture. Run through the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20033');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'] });
try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate('(() => { window.DWOpening?.dismissForTesting?.(); })()');
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  const state = await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    await startMatch(T, 'GP20033');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons(); T.setViewFirstDbg(true);
    for (let i = 0; i < 100 && T.fpDbg().w < 0.99; i++) await wait(100);
    if (T.isUnarmed()) T.toggleHolster();
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'launcher'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('launcher')); await wait(200);
    }
    T.setZoomHeldDbg(true);
    for (let i = 0; i < 100 && (T.viewmodelDbg()?.info?.key !== 'launcher' || T.viewmodelDbg()?.info?.raise < 0.99 || T.fpDbg().ads < 0.99); i++) await wait(100);
    await wait(400);
    return { weapon: T.getCurrentWeapon(), first: T.fpDbg().first, ads: T.fpDbg().ads,
      viewGun: T.viewmodelDbg()?.info?.key, backend: T.getRendererBackend() };
  })()`);
  if (state.weapon !== 'launcher' || !state.first || state.ads < 0.99 || state.viewGun !== 'launcher') throw new Error('not in launcher ADS: ' + JSON.stringify(state));
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(out, 'launcher-ads-after.png'), Buffer.from(shot.data, 'base64'));
  fs.writeFileSync(path.join(out, 'launcher-ads-after.json'), JSON.stringify(state, null, 2) + '\n');
  console.log(JSON.stringify(state));
  if (page.errors.length) throw new Error('page errors: ' + page.errors.slice(0, 3).join(' | '));
} finally { await browser.close(); await server.close(); }

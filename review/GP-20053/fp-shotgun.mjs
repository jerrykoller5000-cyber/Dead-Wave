// GP-20053: first-person shotgun in the real game. Shared slot only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20053/after/fp');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`window.DWOpening?.dismissForTesting?.()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  const setup = await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await wait(60); } return false; };
    await startMatch(T, 'GP20051SHOTGUN'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true);
    T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));
    if (!await until(() => T.getCurrentWeapon() === 'shotgun' && T.fpDbg().w > .99 && T.viewmodelDbg()?.info.active && T.viewmodelDbg().info.key === 'shotgun' && T.viewmodelDbg().info.raise > .99, 15000)) throw new Error('shotgun did not settle');
    return { backend: T.getRendererBackend(), weapon: T.getCurrentWeapon(), view: T.viewmodelDbg().info };
  })()`);
  for (const light of [
    { name: 'noon', time: 0.40, rain: false },
    { name: 'overcast-rain', time: 0.40, rain: true },
    { name: 'dusk', time: 0.68, rain: false },
    { name: 'night-flashlight', time: 0.0, rain: false },
  ]) {
    await page.evaluate(`(async () => {
      const T = window.TT, v = ${JSON.stringify(light)};
      T.weather.raining = v.rain; T.weather.rainTimeLeft = v.rain ? 100 : 0; T.weather.intensity = v.rain ? 1 : 0;
      T.setWorldTime(v.time); await new Promise(r => setTimeout(r, 900));
    })()`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${light.name}-hip.png`), Buffer.from(shot.data, 'base64'));
    if (light.name === 'noon' || light.name === 'night-flashlight') {
      await page.evaluate(`(async () => {
        const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms)); T.setZoomHeldDbg(true);
        const end = Date.now() + 9000; while (Date.now() < end && T.fpDbg().ads < .99) await wait(60);
        if (T.fpDbg().ads < .99) throw new Error('ADS did not settle'); await wait(250);
      })()`);
      const ads = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(out, `${light.name}-ads.png`), Buffer.from(ads.data, 'base64'));
      await page.evaluate(`window.TT.setZoomHeldDbg(false)`);
      await page.evaluate(`new Promise(r => setTimeout(r, 600))`);
    }
  }
  fs.writeFileSync(path.join(out, 'samples.json'), JSON.stringify({ setup, errors: page.errors }, null, 2) + '\n');
  console.log(JSON.stringify({ backend: setup.backend, captures: 6, errors: page.errors.length }));
  if (page.errors.length) throw new Error(page.errors[0]);
} finally { await browser.close(); await server.close(); }

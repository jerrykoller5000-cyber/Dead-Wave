// GP-20063: live FP re-shoot after CL-322, through the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20063/post-integration');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const results = { captures: [], errors: [] };
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 45000 })) {
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, 'boot-failure.png'), Buffer.from(shot.data, 'base64'));
    throw new Error('TT did not boot: ' + JSON.stringify(page.errors));
  }
  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  results.setup = await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'GP20063POST'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true); T.setWorldTime(.4);
    return { backend: T.getRendererBackend(), fp: T.fpDbg().w };
  })()`);
  async function capture(name) {
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(shot.data, 'base64'));
    results.captures.push(name);
  }
  async function select(weapon) {
    const state = await page.evaluate(`(async () => {
      const T = window.TT, w = ${JSON.stringify(weapon)}, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(false); T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      const end = Date.now() + 20000;
      while (Date.now() < end && !(T.getCurrentWeapon() === w && T.fpDbg().w > .99 && T.viewmodelDbg()?.info.active && T.viewmodelDbg().info.key === w && T.viewmodelDbg().info.raise > .99)) await wait(60);
      if (T.getCurrentWeapon() !== w || T.viewmodelDbg()?.info.key !== w) throw new Error(w + ' did not settle');
      await wait(300);
      return { weapon: T.getCurrentWeapon(), view: T.viewmodelDbg().info.key };
    })()`);
    return state;
  }
  for (const weapon of ['minigun', 'chainsaw']) {
    results[weapon] = await select(weapon);
    await capture(`${weapon}-hip`);
    results[weapon].ads = await page.evaluate(`(async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(true); const end = Date.now() + 9000;
      while (Date.now() < end && T.fpDbg().ads < .99) await wait(60);
      if (T.fpDbg().ads < .99) throw new Error('ADS did not settle');
      await wait(300); return T.fpDbg().ads;
    })()`);
    await capture(`${weapon}-ads`);
  }
  results.launcher = await select('launcher');
  results.launcher.reload = await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    T.setAmmoDbg('launcher', 0); T.startReload();
    const end = Date.now() + 4000;
    while (Date.now() < end && !T.isReloading()) await wait(40);
    if (!T.isReloading()) throw new Error('launcher did not start reloading');
    return true;
  })()`);
  for (const [name, u, expected] of [
    ['swing', .18, 'drumOut'], ['insert1', .44, 'load'], ['insert2', .61, 'load'],
    ['wind', .83, 'wind'], ['close', .96, 'fore']
  ]) {
    const actual = await page.evaluate(`(async () => {
      const T = window.TT; T.reloadClipDbg.hold(${u});
      await new Promise(r => setTimeout(r, 250));
      return T.viewmodelDbg()?.info?.handPlace;
    })()`);
    if (actual !== expected) throw new Error(`launcher ${name}: expected ${expected}, got ${actual}`);
    results.launcher[name] = { u, handPlace: actual };
    await capture(`launcher-${name}`);
  }
  await page.evaluate('window.TT.reloadClipDbg.hold(null)');
  results.errors = page.errors;
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ backend: results.setup.backend, captures: results.captures.length, errors: results.errors.length }));
  if (results.errors.length) throw new Error(results.errors[0]);
} finally { await browser.close(); await server.close(); }

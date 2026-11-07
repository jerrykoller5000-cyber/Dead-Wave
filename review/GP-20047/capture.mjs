// GP-20047: compare the shotgun's hip yaw in the live first-person view.
// Run only through crew.mjs slot run; optional JSON overrides VM_POSES.*.hip in memory.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const args = process.argv.slice(2);
const phase = args[0];
if (!phase || !/^[a-z0-9-]+$/.test(phase)) throw new Error('give a phase label');
const overridePath = args[1];
const overrides = overridePath ? JSON.parse(fs.readFileSync(overridePath, 'utf8')) : {};
const keys = ['shotgun'];
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20047', phase);
fs.mkdirSync(out, { recursive: true });

const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => window.DWOpening?.dismissForTesting?.())()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'GP20047'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true);
  })()`);
  const samples = [];
  for (const key of keys) {
    const sample = await page.evaluate(`(async () => {
      const T = window.TT, key = ${JSON.stringify(key)}, override = ${JSON.stringify(overrides[key] || null)};
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const until = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await wait(60); } return false; };
      const hip = (await import('./game/viewmodel-poses.js')).VM_POSES[key].hip;
      if (override) for (const k of ['at', 'yaw', 'pitch', 'roll']) if (override[k] != null) hip[k] = k === 'at' ? [...override[k]] : override[k];
      T.setWeapon(T.WEAPON_ORDER.indexOf(key));
      if (!await until(() => T.getCurrentWeapon() === key && T.fpDbg().w > .99 && T.viewmodelDbg()?.info.active && T.viewmodelDbg().info.key === key && T.viewmodelDbg().info.raise > .99, 15000))
        throw new Error('view gun did not settle: ' + key + ' ' + JSON.stringify(T.viewmodelDbg()?.info));
      await wait(250);
      return { key, hip: { at: [...hip.at], yaw: hip.yaw, pitch: hip.pitch, roll: hip.roll },
        weapon: T.getCurrentWeapon(), backend: T.getRendererBackend(), hipInfo: { ...T.viewmodelDbg().info },
        hipFp: { first: T.fpDbg().first, ads: T.fpDbg().ads } };
    })()`);
    const hipShot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${key}-hip.png`), Buffer.from(hipShot.data, 'base64'));
    const ads = await page.evaluate(`(async () => {
      const T = window.TT, key = ${JSON.stringify(key)}, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setZoomHeldDbg(true);
      const end = Date.now() + 9000;
      while (Date.now() < end && T.fpDbg().ads < .99) await wait(60);
      if (T.fpDbg().ads < .99) throw new Error('ADS did not settle: ' + key + ' ' + T.fpDbg().ads);
      await wait(300);
      return { ads: T.fpDbg().ads, info: { ...T.viewmodelDbg().info } };
    })()`);
    const adsShot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${key}-ads.png`), Buffer.from(adsShot.data, 'base64'));
    await page.evaluate(`(async () => {
      const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms)); T.setZoomHeldDbg(false);
      const end = Date.now() + 9000; while (Date.now() < end && T.fpDbg().ads > .02) await wait(60);
    })()`);
    samples.push({ ...sample, ads });
    console.log(`${phase} ${key}: hip and ADS, ${sample.backend}`);
  }
  fs.writeFileSync(path.join(out, 'samples.json'), JSON.stringify({ phase, samples, errors: page.errors }, null, 2) + '\n', 'utf8');
  if (page.errors.length) throw new Error('page errors: ' + page.errors.length);
  console.log(`captured ${samples.length} gun, ${samples.length * 2} frames, 0 page errors`);
} finally { await browser.close(); await server.close(); }

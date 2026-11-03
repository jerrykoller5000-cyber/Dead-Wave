// Capture the flamer stream from both camera modes on the real renderer.
// Run only through crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20018/flamer-origin-post-hip');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'] });
try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = window.TT, wait = ms => new Promise(r => setTimeout(r, ms));
    await startMatch(T, 'GP20018');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('flamer'));
    T.setAmmoDbg('flamer', 9999);
    T.setViewFirstDbg(true);
    for (let i = 0; i < 100 && (T.getCurrentWeapon() !== 'flamer' || T.fpDbg().w < .99 || !T.viewmodelDbg()?.showing('flamer')); i++) await wait(100);
  })()`);
  const results = {};
  for (const first of [true, false]) {
    const key = first ? 'first-person' : 'third-person';
    results[key] = await page.evaluate(`(async () => {
      const T = window.TT, first = ${first}, wait = ms => new Promise(r => setTimeout(r, ms));
      T.setMouseFireDbg(false); T.setViewFirstDbg(first);
      for (let i = 0; i < 100 && (first ? T.fpDbg().w < .99 : T.fpDbg().w > .01); i++) await wait(100);
      await wait(400);
      T.setMouseFireDbg(true); await wait(650);
      const vm = T.viewmodelDbg(), gun = T.weaponMeshes.flamer;
      gun.updateMatrixWorld(true);
      const body = gun.localToWorld(gun.userData.muzzleLocal.clone());
      const view = vm?.showing('flamer') ? vm.muzzleWorld(new T.THREE.Vector3()) : null;
      const state = { first: T.fpDbg().first, weapon: T.getCurrentWeapon(),
        vmActive: vm?.info.active, vmKey: vm?.info.key, vmRaise: vm?.info.raise,
        bodyMuzzle: body.toArray(), viewMuzzle: view?.toArray(),
        muzzleSeparationM: view?.distanceTo(body) ?? null,
        backend: T.getRendererBackend() };
      return state;
    })()`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${key}.png`), Buffer.from(shot.data, 'base64'));
    await page.evaluate(`(() => window.TT.setMouseFireDbg(false))()`);
  }
  fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(results, null, 2));
  if (!results['first-person'].first || !results['first-person'].vmActive || results['first-person'].vmKey !== 'flamer') throw new Error('first-person view gun not active');
  if (results['third-person'].first) throw new Error('third-person transition did not finish');
  if (page.errors.length) throw new Error('page errors: ' + page.errors.slice(0, 3).join(' | '));
} finally { await browser.close(); await server.close(); }

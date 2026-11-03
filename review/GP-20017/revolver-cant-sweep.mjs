// Temporary view pose experiment. Run only through the shared crew game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20017/cant-sweep');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'] });
try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => { window.DWOpening?.dismissForTesting?.(); })()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = window.TT; await startMatch(T, 'GP20017');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('revolver'));
    for (let i=0; i<100 && (T.getCurrentWeapon() !== 'revolver' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg()?.info?.raise < .99); i++)
      await new Promise(r => setTimeout(r, 100));
  })()`);
  const samples = [];
  for (const yaw of [0.25, 0.4, 0.55, 0.7]) {
    const data = await page.evaluate(`(async () => {
      const T=window.TT, poses=(await import('./game/viewmodel-poses.js')).VM_POSES;
      poses.revolver.hip.yaw=${yaw};
      await new Promise(r=>setTimeout(r, 600));
      const vm=T.viewmodelDbg(), fp=T.fpDbg();
      return {yaw:poses.revolver.hip.yaw,weapon:T.getCurrentWeapon(),first:fp.first,
        active:vm.info.active,key:vm.info.key,raise:vm.info.raise,
        muzzle:vm.ndc(vm.viewPoint(T.weaponMeshes.revolver.userData.muzzleLocal.clone()))};
    })()`);
    if (data.weapon !== 'revolver' || !data.first || !data.active || data.key !== 'revolver' || data.raise < .99) throw new Error('view gun not ready: ' + JSON.stringify(data));
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `revolver-yaw-${String(Math.round(yaw*100)).padStart(3,'0')}.png`), Buffer.from(shot.data, 'base64'));
    samples.push(data);
  }
  fs.writeFileSync(path.join(out, 'samples.json'), JSON.stringify({backend: await page.evaluate('window.TT.getRendererBackend()'),samples,errors:page.errors}, null, 2)+'\n');
  console.log(JSON.stringify({samples,errors:page.errors}, null, 2));
  if (page.errors.length) throw new Error('page errors');
} finally { await browser.close(); await server.close(); }

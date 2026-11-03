// Runtime-only shotgun/Breacher hip pose comparison. Use the shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20017/receiver-cant-sweep');
const sweepKeys = process.argv.slice(2);
const keys = sweepKeys.length ? sweepKeys : ['shotgun', 'aa12'];
if (keys.some((key) => !['shotgun', 'aa12', 'launcher'].includes(key))) throw new Error('unknown sweep key');
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
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons(); T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
  })()`);
  const samples = [];
  for (const key of keys) {
    await page.evaluate(`(async () => {
      const T=window.TT, key=${JSON.stringify(key)}; T.setWeapon(T.WEAPON_ORDER.indexOf(key));
      for(let i=0;i<100 && (T.getCurrentWeapon()!==key || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg()?.info?.raise<.99);i++)
        await new Promise(r=>setTimeout(r,100));
    })()`);
    for (const yaw of [0.03, 0.15, 0.25, 0.35]) {
      const data = await page.evaluate(`(async () => {
        const T=window.TT, key=${JSON.stringify(key)}, poses=(await import('./game/viewmodel-poses.js')).VM_POSES;
        poses[key].hip.yaw=${yaw};
        await new Promise(r=>setTimeout(r,600));
        const vm=T.viewmodelDbg(), fp=T.fpDbg();
        return {key,yaw:poses[key].hip.yaw,weapon:T.getCurrentWeapon(),first:fp.first,
          active:vm.info.active,vmKey:vm.info.key,raise:vm.info.raise,
          muzzle:vm.ndc(vm.viewPoint(T.weaponMeshes[key].userData.muzzleLocal.clone()))};
      })()`);
      if (data.weapon!==key || !data.first || !data.active || data.vmKey!==key || data.raise<.99)
        throw new Error('view gun not ready: '+JSON.stringify(data));
      const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      fs.writeFileSync(path.join(out, `${key}-yaw-${String(Math.round(yaw*100)).padStart(3,'0')}.png`), Buffer.from(shot.data,'base64'));
      samples.push(data);
    }
  }
  fs.writeFileSync(path.join(out,sweepKeys.length ? `samples-${keys.join('-')}.json` : 'samples.json'),JSON.stringify({backend:await page.evaluate('window.TT.getRendererBackend()'),samples,errors:page.errors},null,2)+'\n');
  console.log(JSON.stringify({samples,errors:page.errors},null,2));
  if(page.errors.length) throw new Error('page errors');
} finally { await browser.close(); await server.close(); }

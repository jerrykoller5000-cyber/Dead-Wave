// Real-renderer check for AG-201's sleeve and sniper scope findings. Run through the game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20016/j63');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'] });
try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => window.DWOpening?.dismissForTesting?.())()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = window.TT; await startMatch(T, 'GP20016-J63');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons(); T.setViewFirstDbg(true);
    for (let i = 0; i < 100 && T.fpDbg().w < .99; i++) await new Promise(r => setTimeout(r, 100));
    T.setWeapon(T.WEAPON_ORDER.indexOf('sniper'));
  })()`);
  const sample = async (state) => {
    const data = await page.evaluate(`(async () => {
      const T=window.TT, state=${JSON.stringify(state)}, wait=ms=>new Promise(r=>setTimeout(r,ms));
      T.setZoomHeldDbg(state === 'scope');
      for (let i=0;i<100;i++) {
        const vm=T.viewmodelDbg(), fp=T.fpDbg();
        if (vm?.info?.key === 'sniper' && vm.info.raise > .99 &&
            (state === 'scope' ? fp.ads >= .99 : fp.ads <= .01)) break;
        await wait(100);
      }
      await wait(250);
      const vm=T.viewmodelDbg(), fp=T.fpDbg();
      const sleeves=[]; T.marine?.traverse(o => { if (o.isMesh && o.name === 'live-sleeve') sleeves.push(o); });
      const bodyGun=T.weaponMeshes.sniper;
      const laser=bodyGun.userData.laser;
      const bodyGunMeshes=[]; bodyGun.traverse(o => { if (o.isMesh && o !== laser) bodyGunMeshes.push(o); });
      return {backend:T.getRendererBackend(),state,ads:fp.ads,vm:{active:vm.info.active,key:vm.info.key,visible:vm.root.visible,filtering:vm.filtering},
        sleeves:sleeves.map(o=>({name:o.name,parent:o.parent?.name,hidden:vm.isEyeHidden(o)})),
        bodyGunMeshes:bodyGunMeshes.length,bodyGunHidden:bodyGunMeshes.filter(o=>vm.isEyeHidden(o)).length};
    })()`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `${state}.png`), Buffer.from(shot.data, 'base64'));
    return data;
  };
  const data = { hip: await sample('hip'), scope: await sample('scope') };
  fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(data, null, 2));
  for (const state of [data.hip, data.scope]) {
    if (state.backend !== 'WebGPU' || !state.vm.active || !state.vm.filtering ||
        state.sleeves.length < 2 || state.sleeves.some(s => !s.hidden || !s.parent.endsWith('-live')) ||
        !state.bodyGunMeshes || state.bodyGunHidden !== state.bodyGunMeshes)
      throw new Error(`${state.state}: eye hide failed`);
  }
  if (data.hip.vm.visible !== true || data.scope.vm.visible !== false || data.scope.ads < .99)
    throw new Error('sniper scope state failed');
  if (page.errors.length) throw new Error('page errors: ' + page.errors.slice(0, 3).join(' | '));
} finally { await browser.close(); await server.close(); }

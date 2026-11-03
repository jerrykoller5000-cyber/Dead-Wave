// Runtime-only J18 eye-relief comparison. Run through crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20017/minigun-ads-sweep');
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
    const T=window.TT; await startMatch(T,'GP20017-J18');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons(); T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('minigun'));
    T.setZoomHeldDbg(true);
    for(let i=0;i<120 && (T.getCurrentWeapon()!=='minigun'||T.fpDbg().w<.99||T.fpDbg().ads<.99||!T.viewmodelDbg()?.info?.active||T.viewmodelDbg()?.info?.raise<.99);i++)
      await new Promise(r=>setTimeout(r,100));
  })()`);
  const samples=[];
  for(const rear of [0.50,0.64,0.76,0.88,1.00]) {
    const data=await page.evaluate(`(async () => {
      const T=window.TT, rear=${rear}, poses=(await import('./game/viewmodel-poses.js')).VM_POSES;
      poses.minigun.ads.rear=rear;
      await new Promise(r=>setTimeout(r,700));
      const vm=T.viewmodelDbg(), fp=T.fpDbg(), V=T.THREE.Vector3;
      const ndc=(p)=>vm.ndc(vm.viewPoint(new V(...p)));
      return {rear,backend:T.getRendererBackend(),weapon:T.getCurrentWeapon(),first:fp.first,ads:fp.ads,
        active:vm.info.active,key:vm.info.key,raise:vm.info.raise,
        dot:ndc([0,.330,.0355]),hoodTop:ndc([0,.369,.0355]),housingTop:ndc([0,.30,-.18])};
    })()`);
    if(data.weapon!=='minigun'||!data.first||data.ads<.99||!data.active||data.key!=='minigun'||data.raise<.99)
      throw new Error('view gun not ready: '+JSON.stringify(data));
    const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(out,`rear-${Math.round(rear*100)}.png`),Buffer.from(shot.data,'base64'));
    samples.push(data);
  }
  fs.writeFileSync(path.join(out,'samples.json'),JSON.stringify({samples,errors:page.errors},null,2)+'\n');
  console.log(JSON.stringify({samples,errors:page.errors},null,2));
  if(page.errors.length) throw new Error('page errors');
} finally { await browser.close(); await server.close(); }

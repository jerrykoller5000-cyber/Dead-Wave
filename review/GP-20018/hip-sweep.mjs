// Runtime-only first-person hip placement study. Run through crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const args = process.argv.slice(2);
const mid = args.includes('--mid');
const heavy = args.includes('--heavy');
if (mid && heavy) throw new Error('choose one sweep mode');
const keys = args.filter(arg => !arg.startsWith('--')).length ? args.filter(arg => !arg.startsWith('--')) : ['m4'];
if (keys.some(key => !['m4', 'ak', 'uzi', 'shotgun', 'aa12', 'sniper', 'launcher', 'minigun', 'flamer'].includes(key))) throw new Error('unknown long gun');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080'] });
try {
  const page = await browser.newPage({ width: 1920, height: 1080 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`(() => window.DWOpening?.dismissForTesting?.())()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T=window.TT, wait=ms=>new Promise(r=>setTimeout(r,ms));
    await startMatch(T,'GP20018'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if(T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true);
  })()`);
  for (const key of keys) {
    const out = path.join(root, 'review/GP-20018', `hip-sweep-${key}${mid ? '-mid' : heavy ? '-heavy' : ''}`);
    fs.mkdirSync(out, { recursive: true });
    await page.evaluate(`(async () => {
      const T=window.TT, key=${JSON.stringify(key)}, wait=ms=>new Promise(r=>setTimeout(r,ms));
      T.setWeapon(T.WEAPON_ORDER.indexOf(key));
      for(let i=0;i<100 && (T.getCurrentWeapon()!==key || T.fpDbg().w<.99 || !T.viewmodelDbg()?.showing(key));i++) await wait(100);
    })()`);
    const variants = heavy ? [
      { id: 'baseline' },
      { id: 'side-25', at: [0.30, -0.22, -0.65], yaw: 0.25 },
      { id: 'side-35', at: [0.32, -0.22, -0.65], yaw: 0.35 },
      { id: 'side-45', at: [0.36, -0.22, -0.65], yaw: 0.45 }
    ] : mid ? [
      { id: 'baseline' },
      { id: 'mid-55-yaw003', at: [0.18, -0.19, -0.55], yaw: 0.03 },
      { id: 'mid-55-yaw015', at: [0.18, -0.19, -0.55], yaw: 0.15 },
      { id: 'mid-65-yaw003', at: [0.19, -0.20, -0.65], yaw: 0.03 },
      { id: 'mid-65-yaw015', at: [0.19, -0.20, -0.65], yaw: 0.15 }
    ] : [
      { id: 'baseline' },
      { id: 'close-40-yaw003', at: [0.16, -0.17, -0.40], yaw: 0.03 },
      { id: 'close-40-yaw015', at: [0.16, -0.17, -0.40], yaw: 0.15 },
      { id: 'close-36-yaw003', at: [0.15, -0.16, -0.36], yaw: 0.03 }
    ];
    const samples = [];
    for (const variant of variants) {
    const data = await page.evaluate(`(async () => {
      const T=window.TT, key=${JSON.stringify(key)}, variant=${JSON.stringify(variant)};
      const poses=(await import('./game/viewmodel-poses.js')).VM_POSES;
      const hip=poses[key].hip;
      window.__gp20018Base ||= {};
      if (!window.__gp20018Base[key]) window.__gp20018Base[key]={at:[...hip.at],yaw:hip.yaw};
      hip.at=[...(variant.at || window.__gp20018Base[key].at)];
      hip.yaw=variant.yaw ?? window.__gp20018Base[key].yaw;
      await new Promise(r=>setTimeout(r,650));
      for (let i=0;i<100 && (!T.viewmodelDbg().info.active || T.viewmodelDbg().info.key!==key || T.viewmodelDbg().info.raise<.99);i++) await new Promise(r=>setTimeout(r,100));
      const vm=T.viewmodelDbg(), fp=T.fpDbg(), muzzle=T.weaponMeshes[key].userData.muzzleLocal;
      return {variant:variant.id,key,at:[...hip.at],yaw:hip.yaw,weapon:T.getCurrentWeapon(),first:fp.first,
        active:vm.info.active,vmKey:vm.info.key,raise:vm.info.raise,
        muzzleNdc:muzzle?vm.ndc(vm.viewPoint(muzzle.clone())):null,backend:T.getRendererBackend()};
    })()`);
    if (data.weapon!==key || !data.first || !data.active || data.vmKey!==key || data.raise<.99) throw new Error('view gun not ready: '+JSON.stringify(data));
    const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(out, `${variant.id}.png`), Buffer.from(shot.data,'base64'));
    samples.push(data);
    }
    fs.writeFileSync(path.join(out,'samples.json'),JSON.stringify({samples,errors:page.errors},null,2)+'\n','utf8');
    console.log(JSON.stringify({key,samples,errors:page.errors},null,2));
  }
  if(page.errors.length) throw new Error('page errors');
} finally { await browser.close(); await server.close(); }

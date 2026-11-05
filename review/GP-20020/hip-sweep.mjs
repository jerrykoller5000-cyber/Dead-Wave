// Runtime-only reference-placement sweep. Run through crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const targetOnly = process.argv.includes('--target');
const keys = process.argv.slice(2).filter(arg => arg !== '--target');
if (!keys.length) throw new Error('name at least one weapon');
const out = path.join(root, 'review/GP-20020/hip-sweep');
fs.mkdirSync(out, { recursive: true });
const variants = [
  ['base', {}], ['x+04', {x: 0.04}], ['y-04', {y: -0.04}],
  ['yaw+10', {yaw: 0.10}], ['yaw-10', {yaw: -0.10}],
  ['pitch+05', {pitch: 0.05}], ['roll+10', {roll: 0.10}],
];
const targets = {
  pistol: [['pistol-low', {y: -0.05}], ['pistol-upright', {y: -0.05, roll: -0.12}]],
  revolver: [['revolver-low', {x: 0.02, y: -0.06, yaw: -0.20}]],
  sniper: [['sniper-reference', {y: -0.08, yaw: -0.15}], ['sniper-right', {x: 0.04, y: -0.09, yaw: -0.15}]],
  shotgun: [['shotgun-target', {x: 0.02, y: -0.04, yaw: -0.15}]],
  ak: [['ak-target', {x: 0.02, y: -0.04, yaw: -0.10}]],
  m4: [['m4-target', {x: 0.02, y: -0.04, yaw: -0.10}]],
  aa12: [['breacher-target', {x: 0.03, y: -0.05, yaw: -0.15}]],
  flamer: [['rust-target', {x: 0.02, y: -0.04, yaw: -0.08}]],
  launcher: [['launcher-target', {x: 0.03, y: -0.02, yaw: -0.15}]],
};
const server = await serve(root, 0);
const browser = await launch({headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1920,1080']});
try {
  const page = await browser.newPage({width: 1920, height: 1080});
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, {timeout: 240000});
  if (!await page.waitFor('!!window.TT', {timeout: 400000})) throw new Error('TT did not boot');
  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  await page.evaluate(`(async()=>{
    const T=window.TT; await startMatch(T,'GP20020');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons(); T.setViewFirstDbg(true);
    if(T.isUnarmed()) T.toggleHolster();
  })()`);
  const samples=[];
  for (const key of keys) {
    const weaponDir=path.join(out,key);
    fs.mkdirSync(weaponDir,{recursive:true});
    await page.evaluate(`(async()=>{
      const T=window.TT,key=${JSON.stringify(key)},wait=ms=>new Promise(r=>setTimeout(r,ms));
      T.setZoomHeldDbg(false);
      for(let i=0;i<30 && T.getCurrentWeapon()!==key;i++) {T.setWeapon(T.WEAPON_ORDER.indexOf(key)); await wait(150)}
      for(let i=0;i<100 && (T.fpDbg().w<.99||T.viewmodelDbg()?.info?.key!==key||T.viewmodelDbg()?.info?.raise<.99);i++) await wait(100);
    })()`);
    for (const [label,delta] of (targetOnly ? [['base',{}], ...(targets[key] || [])] : [...variants, ...(targets[key] || [])])) {
      const data=await page.evaluate(`(async()=>{
        const T=window.TT,key=${JSON.stringify(key)},label=${JSON.stringify(label)},delta=${JSON.stringify(delta)};
        const P=(await import('./game/viewmodel-poses.js')).VM_POSES[key].hip;
        if(!window.__gp20020Base) window.__gp20020Base={};
        const base=window.__gp20020Base[key]??={at:[...P.at],yaw:P.yaw,pitch:P.pitch,roll:P.roll};
        P.at[0]=base.at[0]+(delta.x||0); P.at[1]=base.at[1]+(delta.y||0); P.at[2]=base.at[2]+(delta.z||0);
        P.yaw=base.yaw+(delta.yaw||0); P.pitch=base.pitch+(delta.pitch||0); P.roll=base.roll+(delta.roll||0);
        const wait=ms=>new Promise(r=>setTimeout(r,ms));
        await wait(650);
        for(let i=0;i<80 && (T.getCurrentWeapon()!==key||!T.viewmodelDbg()?.info?.active||T.viewmodelDbg()?.info?.key!==key||T.viewmodelDbg()?.info?.raise<.99);i++) {
          if(T.isUnarmed()) T.toggleHolster();
          if(T.getCurrentWeapon()!==key) T.setWeapon(T.WEAPON_ORDER.indexOf(key));
          await wait(100);
        }
        const vm=T.viewmodelDbg(), fp=T.fpDbg(), src=T.weaponMeshes[key];
        const muzzle=src?.userData?.muzzleLocal ? vm.ndc(vm.viewPoint(src.userData.muzzleLocal.clone())) : null;
        const wrist=side=>vm.wrists?.[side]?.p ? vm.ndc(vm.wrists[side].p) : null;
        return {key,label,delta,weapon:T.getCurrentWeapon(),unarmed:T.isUnarmed(),backend:T.getRendererBackend(),first:fp.first,ads:fp.ads,active:vm.info.active,
          vmKey:vm.info.key,raise:vm.info.raise,muzzle,wristR:wrist('r'),wristL:wrist('l')};
      })()`);
      if(data.key!==data.weapon||data.key!==data.vmKey||!data.first||data.ads>.01||!data.active||data.raise<.99||data.backend!=='WebGPU')
        throw new Error('view gun not ready: '+JSON.stringify(data));
      const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      fs.writeFileSync(path.join(weaponDir,`${label}.png`),Buffer.from(shot.data,'base64'));
      samples.push(data);
      fs.writeFileSync(path.join(out,'samples.json'),JSON.stringify({samples,errors:page.errors},null,2)+'\n');
    }
  }
  fs.writeFileSync(path.join(out,'samples.json'),JSON.stringify({samples,errors:page.errors},null,2)+'\n');
  console.log(JSON.stringify({samples: samples.map(s=>({key:s.key,label:s.label,muzzle:s.muzzle,wristL:s.wristL,wristR:s.wristR})),errors:page.errors},null,2));
  if(page.errors.length) throw new Error('page errors');
} finally {await browser.close(); await server.close();}

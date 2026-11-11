import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew game-test slot');
const batch = Number(process.argv[2] || 0);
const groups = [
  ['pistol','m4','ak','uzi'],
  ['shotgun','aa12','revolver','sniper'],
  ['launcher','flamer','chainsaw','minigun']
];
assert(groups[batch], 'batch must be 0, 1, or 2');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20105');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const report = { at:new Date().toISOString(), batch, guns:[], errors:[] };
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
const shot = (w,kind) => path.join(out,`weapon-${w}-${kind}.png`);
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20105 weapons';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:20000}));
  const init=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg();T.grantAllWeapons();T.setUnarmedDbg(false);
    T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-10);T.setVelDbg(0,0);T.setAimYawDbg(Math.PI);
    T.setViewFirstDbg(false);for(let i=0;i<40;i++)T.stepFrame(.016);
    return {position:T.player.position.toArray(),order:T.WEAPON_ORDER};})()`);
  report.init=init;
  for(const w of groups[batch]){
    const prep=await page.evaluate(`(()=>{const T=TT,w=${JSON.stringify(w)};
      T.setMouseFireDbg(false);T.takeOutGun(w);T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      for(let i=0;i<95;i++)T.stepFrame(.016);
      const vm=T.viewmodelDbg();return {w,current:T.getCurrentWeapon(),mag:T.magazinesDbg(w),ammo:T.getAmmo()[w],fuel:T.getSawFuel(),
      vmActive:vm?.info?.active,vmGun:vm?.gun?.key,vmShowing:vm?.showing?.(),vmRootVisible:vm?.root?.visible};})()`);
    await page.screenshot(shot(w,'third-draw'));
    const fired=await page.evaluate(`(()=>{const T=TT,w=${JSON.stringify(w)},before=T.magazinesDbg(w)?.loaded?.[0]??T.getAmmo()[w],fuelBefore=T.getSawFuel();
      T.setMouseFireDbg(true);for(let i=0;i<45;i++)T.stepFrame(.016);T.setMouseFireDbg(false);
      return {before,after:T.magazinesDbg(w)?.loaded?.[0]??T.getAmmo()[w],fuelBefore,fuelAfter:T.getSawFuel(),saw:T.sawCutDbg?.()};})()`);
    await page.screenshot(shot(w,'third-fire'));
    const first=await page.evaluate(`(()=>{const T=TT;T.setViewFirstDbg(true);for(let i=0;i<90;i++)T.stepFrame(.016);
      const vm=T.viewmodelDbg();return {fp:T.fpDbg(),vmActive:vm?.info?.active,vmGun:vm?.gun?.key,vmShowing:vm?.showing?.(),vmRootVisible:vm?.root?.visible};})()`);
    await pause(100);
    await page.screenshot(shot(w,'first-draw'));
    const firstFired=await page.evaluate(`(()=>{const T=TT,w=${JSON.stringify(w)},before=T.magazinesDbg(w)?.loaded?.[0]??T.getAmmo()[w],fuelBefore=T.getSawFuel();
      T.setMouseFireDbg(true);for(let i=0;i<45;i++)T.stepFrame(.016);T.setMouseFireDbg(false);
      return {before,after:T.magazinesDbg(w)?.loaded?.[0]??T.getAmmo()[w],fuelBefore,fuelAfter:T.getSawFuel(),saw:T.sawCutDbg?.()};})()`);
    await page.screenshot(shot(w,'first-fire'));
    await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'right',clickCount:1});
    const ads=await page.evaluate(`(()=>{const T=TT;for(let i=0;i<50;i++)T.stepFrame(.016);return {fp:T.fpDbg(),vm:T.viewmodelDbg()?.info?.active};})()`);
    await page.screenshot(shot(w,'first-ads'));
    await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'right',clickCount:1});
    const near=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;
      T.player.position.set(f.x,tg.floorY,f.z);T.setVelDbg(0,0);T.setAimYawDbg(Math.PI/2);
      for(let i=0;i<55;i++)T.stepFrame(.016);return {player:T.player.position.toArray(),fp:T.fpDbg(),vm:T.viewmodelDbg()?.info?.active};})()`);
    await page.screenshot(shot(w,'first-wall'));
    report.guns.push({w,prep,fired,first,firstFired,ads,near});
    await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg();T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-10);T.setVelDbg(0,0);T.setAimYawDbg(Math.PI);T.setViewFirstDbg(false);
      for(let i=0;i<50;i++)T.stepFrame(.016);})()`);
  }
  report.errors=page.errors.slice();
  assert.deepEqual(report.errors,[]);
  console.log(`GP-20105 weapons batch ${batch}: ${report.guns.map(g=>g.w+':'+g.prep.current+'/'+g.fired.before+'>'+g.fired.after).join(' ')}; 0 page errors`);
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,`weapons-live-${batch}.json`),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}

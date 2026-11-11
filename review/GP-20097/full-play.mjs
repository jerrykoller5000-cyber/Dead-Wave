import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use the crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20097');
const log=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
let page;
const evalIn=async(code)=>page.evaluate(code);
const shot=async(name,code)=>{const data=code?await evalIn(code):null;log.push({name,data});await pause(120);await page.screenshot(path.join(out,`play-${name}.png`));return data;};
const state=()=>`(()=>({weapon:TT.getCurrentWeapon(),ammo:TT.getAmmo()[TT.getCurrentWeapon()],reload:TT.getReloadDbg(),hits:TT.trainingDbg.state().hits,panels:{shop:TT.isShopOpen(),cif:TT.isCIFOpen(),armory:!document.getElementById('armoryPanel').hidden,range:TT.rangeDbg.feature().isOpen()},prompt:document.getElementById('kioskPrompt')?.textContent,errors:document.querySelectorAll('[role=alert]').length}))()`;
const stand=site=>`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.stations[${JSON.stringify(site)}];T.player.position.set(s.front.x,tg.floorY,s.front.z);T.setShotView({x:s.front.x,y:tg.floorY+1.65,z:s.front.z,tx:s.x??s.front.x,ty:tg.floorY+1.45,tz:(s.z??s.front.z)+1,fov:60});return {site:${JSON.stringify(site)},action:T.trainingDbg.action()};})()`;
try{
 page=await browser.newPage({width:1280,height:720});
 await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
 assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
 await evalIn(`(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Full walkthrough';document.getElementById('modeTraining').click()})()`);
 assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
 assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:60000}),'opening finished before player actions');
 await pause(1800);
 await shot('01-entry',state());

 // Supply Terminal: a real MedPen button, not a debug grant.
 assert.equal((await evalIn(stand('kiosk'))).action,'kiosk');
 await evalIn('TT.doAction()');
 await shot('02-kiosk-before',`(()=>({med:TT.getMedkits(),cash:TT.getBank(),text:document.getElementById('shop').innerText.slice(0,700)}))()`);
 const kiosk=await evalIn(`(()=>{const b=[...document.querySelectorAll('#shop button')].find(e=>e.textContent.trim()==='$35'&&!e.disabled);if(b)b.click();return {buttons:[...document.querySelectorAll('#shop button')].map(x=>x.textContent.trim().slice(0,50)),found:!!b}})()`);
 log.push({name:'kiosk-buttons',data:kiosk});
 const med=await shot('03-kiosk-bought',`(()=>({med:TT.getMedkits(),cash:TT.getBank(),text:document.getElementById('shop').innerText.slice(0,700)}))()`);
 assert(med.med>=1,'MedPen bought from terminal');
 await evalIn('TT.closeShop()');

 // CIF: choose an issued uniform finish using the real swatch.
 assert.equal((await evalIn(stand('cif'))).action,'cif');await evalIn('TT.doAction()');
 await shot('04-cif-before',`(()=>({tabs:[...document.querySelectorAll('#cifTabs button')].map(x=>x.textContent.trim()),items:[...document.querySelectorAll('#cifItems button')].map(x=>x.textContent.trim()),camo:TT.getCamo(),wardrobe:TT.getWardrobe()}))()`);
 const uniform=await evalIn(`(()=>{document.querySelector('#cifTabs [data-cif-tab="body"]')?.click();const item=document.querySelector('#cifItems [data-cif-item="shirt"]');item?.click();const swatch=[...document.querySelectorAll('#cifList [data-camo]')].find(x=>!x.disabled&&!x.classList.contains('on'));const chosen=swatch?.dataset.camo;swatch?.click();return {item:item?.dataset.cifItem,swatch:chosen,shirt:TT.getWardrobe().items.shirt.camo,wardrobe:TT.getWardrobe()}})()`);
 log.push({name:'uniform-choice',data:uniform});await shot('05-cif-uniform',state());await evalIn('TT.closeCIF()');
 assert(uniform.swatch && uniform.shirt===uniform.swatch,'issued shirt finish selected');

 // Armory: buy from the catalogue, take off the shelf, stow, and take out again.
 assert.equal((await evalIn(stand('armory'))).action,'armory');await evalIn('TT.doAction()');await shot('06-armory-before',`(()=>({read:TT.armoryDbg.ui().armory.read(),owned:TT.getWeaponOwned()}))()`);
 const arm=await evalIn(`(()=>{const q=s=>document.querySelector(s),read=()=>TT.armoryDbg.ui().armory.read();q('[data-buy-gun="m4"]')?.click();const purchased=read();q('[data-gun="m4"]')?.click();const taken=read();q('[data-slot="primary:0"]')?.click();q('#armoryPanel .armory-actions button')?.click();const stowed=read();q('[data-gun="m4"]')?.click();const retaken=read();return {purchased,taken,stowed,retaken,rack:TT.armoryDbg.rack(),owned:TT.getWeaponOwned()}})()`);
 log.push({name:'armory-transactions',data:arm});
 assert(arm.owned.m4,'M4 bought in Armory');
 await shot('07-armory-retaken',state());await evalIn('TT.armoryDbg.ui().close();TT.closeCIF()');

 // The console: every visible card's briefing and start path, one at a time.
 await evalIn('TT.grantAllWeapons();TT.setUnarmedDbg(false)');
 assert.equal((await evalIn(stand('rangeConsole'))).action,'rangeConsole');await evalIn('TT.doAction()');
 await shot('08-console-menu',`(()=>({text:document.getElementById('rangeConsole').innerText.slice(0,1500)}))()`);
 await evalIn(`(()=>{const T=TT,tg=T.trainingDbg.tg();T.rangeDbg.exit();T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-5);T.setShotView(null)})()`);
 await pause(900);
 const drills=await evalIn(`(async()=>{const {RANGE_DRILLS}=await import('/ui/range-drills.js');const out=[];for(const d of RANGE_DRILLS){TT.rangeDbg.open();const root=document.getElementById('rangeConsole');root.querySelector('[data-weapon="'+d.weapon+'"]')?.click();const card=root.querySelector('[data-drill="'+d.id+'"]');card?.click();const brief=root.querySelector('.rd-briefing')?.innerText||'';const enabled=!root.querySelector('[data-start]')?.disabled;const title=root.querySelector('.rd-detail-heading h3')?.innerText||'';const r=TT.rangeDbg.start(d);out.push({weapon:d.weapon,id:d.id,title,brief:brief.slice(0,250),card:!!card,enabled,start:r,state:TT.rangeDbg.read()?.state});TT.rangeDbg.feature().abort('cancel');TT.rangeDbg.exit();}return out})()`);
 log.push({name:'drill-walkthrough',data:drills});
 assert.equal(drills.length,45,'all 45 drills visited');
 assert(drills.every(d=>d.card&&d.enabled&&d.start?.ok),'every drill card is available and starts');
 await shot('09-console-after-all',`(()=>({runs:${drills.length},read:TT.rangeDbg.read(),open:TT.rangeDbg.feature().isOpen()}))()`);
 const sample=await evalIn(`(async()=>{const {RANGE_DRILLS}=await import('/ui/range-drills.js');TT.rangeDbg.open();return TT.rangeDbg.start(RANGE_DRILLS.find(d=>d.id==='first-steps'))})()`);
 assert(sample.ok,'intro drill started');
 assert(await page.waitFor('TT.rangeDbg.read()?.state==="ACTIVE"',{timeout:25000}),'intro drill countdown reaches active shooting');
 await shot('09a-drill-active',`(()=>({state:TT.rangeDbg.read().state,hud:document.getElementById('rangeDrillHud').innerText}))()`);
 await evalIn(`(()=>{TT.rangeDbg.feature().abort('cancel');TT.rangeDbg.exit()})()`);

 // Range: actual trigger and reload for every gun. Trigger snapshots are saved separately.
 const guns=[];
 for(const weapon of ['pistol','uzi','m4','ak','shotgun','aa12','revolver','sniper','minigun','chainsaw']){
  const before=await evalIn(`(()=>{const T=TT,tg=T.trainingDbg.tg(),b=tg.targets[2].box,cx=(b.minX+b.maxX)/2;T.setWeapon(T.WEAPON_ORDER.indexOf(${JSON.stringify(weapon)}));T.setUnarmedDbg(false);T.player.position.set(cx,tg.floorY,b.minZ-${weapon==='chainsaw'?2:9});T.setAimYawDbg(0);T.setAimTargetDbg(cx,b.minZ);T.setShotView(null);return {weapon:T.getCurrentWeapon(),ammo:T.getAmmo()[${JSON.stringify(weapon)}],hits:T.trainingDbg.state().hits}})()`);
  await pause(1500);
  await evalIn('TT.setMouseFireDbg(true)');await pause(weapon==='minigun'?1400:weapon==='chainsaw'?650:500);await evalIn('TT.setMouseFireDbg(false)');
  const fired=await evalIn(`(()=>({weapon:TT.getCurrentWeapon(),ammo:TT.getAmmo()[${JSON.stringify(weapon)}],hits:TT.trainingDbg.state().hits,flags:TT.vaultDbg.flags()}))()`);
  const reloadStart=await evalIn(`(()=>{TT.startReload();return TT.getReloadDbg()})()`);
  await pause(weapon==='chainsaw'?100:350);
  const reloading=await evalIn('TT.getReloadDbg()');
  guns.push({weapon,before,fired,reloadStart,reloading});
  if(weapon!=='chainsaw')assert(fired.ammo<before.ammo,`${weapon} fired a real round`);
  if(weapon!=='chainsaw')assert(reloadStart.timer>0,`${weapon} began a reload`);
  await page.screenshot(path.join(out,`play-gun-${weapon}.png`));
  await pause(1800);
 }
 log.push({name:'guns-fired-reloaded',data:guns});

 // The shotgun's distinct loads are selected by the ammo switch, not by altering state.
 const shells=[];
 await evalIn(`(()=>{TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'));TT.setUnarmedDbg(false)})()`);await pause(500);
 const types=await evalIn(`(()=>TT.ammoTypeState('shotgun'))()`);log.push({name:'shotgun-types',data:types});
 for(const type of ['buckshot','slug','birdshot']){
  const change=await evalIn(`(()=>{const s=TT.ammoTypeState('shotgun');const bought=TT.buyAmmoType('shotgun',${JSON.stringify(type)});const started=TT.ammoDbg.start(${JSON.stringify(type)});return {before:s,bought,started,after:TT.ammoTypeState('shotgun')}})()`);
  shells.push({type,...change});
  assert(change.started,`${type} ammo switch started`);
  assert(await page.waitFor(`TT.ammoTypeState('shotgun').loaded===${JSON.stringify(type)} && !TT.ammoTypeState('shotgun').switching`,{timeout:20000}),`${type} load finished`);
 }
 log.push({name:'shotgun-switches',data:shells});await shot('10-shotgun-loads',state());

 // One actual flamer burn, then launcher blast on another plate. These intentionally disable the console.
 const burn=async(weapon,index,offset,limit)=>{
  const setup=await evalIn(`(()=>{const T=TT,tg=T.trainingDbg.tg(),b=tg.targets[${index}].box,cx=(b.minX+b.maxX)/2;T.setWeapon(T.WEAPON_ORDER.indexOf(${JSON.stringify(weapon)}));T.setUnarmedDbg(false);T.setViewFirstDbg(false);T.player.position.set(cx,tg.floorY,b.minZ-${offset});T.setAimYawDbg(0);T.setAimTargetDbg(cx,${weapon==='flamer'?'b.minZ+6':'b.minZ'});T.setShotView(null);return {cx,face:b.minZ,ammo:T.getAmmo()[${JSON.stringify(weapon)}]}})()`);
  await pause(1400);await evalIn('TT.setMouseFireDbg(true)');
  let result=null;
  for(let i=0;i<limit;i++){await pause(200);result=await evalIn(`(()=>{const T=TT,tg=T.trainingDbg.tg(),b=tg.targets[${index}].box,cx=(b.minX+b.maxX)/2;T.player.position.set(cx,tg.floorY,b.minZ-${offset});T.setAimYawDbg(0);T.setAimTargetDbg(cx,${weapon==='flamer'?'b.minZ+6':'b.minZ'});return {state:tg.targets[${index}].state,wreck:T.trainingDbg.wreck().debug().find(x=>x.index===${index}),ammo:T.getAmmo()[${JSON.stringify(weapon)}]}})()`);if(result.state==='wrecked')break;}
  await evalIn('TT.setMouseFireDbg(false)');
  const reloadStart=await evalIn(`(()=>{TT.startReload();return TT.getReloadDbg()})()`);
  return {setup,result,reloadStart};
 };
 const flamer=await burn('flamer',0,4,60);log.push({name:'flamer-burn',data:flamer});await shot('11-flamer-ash',state());
 assert.equal(flamer.result?.state,'wrecked','flamer burns target');
 assert(flamer.reloadStart.timer>0,'flamer reload starts');
 const launcher=await burn('launcher',2,6,60);log.push({name:'launcher-blast',data:launcher});await shot('12-launcher-pieces',state());
 assert.equal(launcher.result?.state,'wrecked','launcher blows target');
 assert(launcher.reloadStart.timer>0,'launcher reload starts');
 await evalIn("TT.trainingDbg.act('rangeConsole')");await shot('13-console-after-wreck',`(()=>({open:TT.rangeDbg.feature().isOpen(),wreck:TT.trainingDbg.wreck().count(),prompt:document.getElementById('kioskPrompt')?.textContent}))()`);

 // Light switch, reset (fresh visit), and leave.
 await evalIn(stand('lightSwitch'));await evalIn('TT.doAction()');await shot('14-lights-off',`(()=>({lights:TT.trainingDbg.lights(),prompt:document.getElementById('kioskPrompt')?.textContent}))()`);
 await evalIn('TT.doAction()');await shot('15-lights-on',`(()=>({lights:TT.trainingDbg.lights()}))()`);
 await evalIn('TT.trainingDbg.leave()');await shot('16-left',`(()=>({active:TT.trainingDbg.state().active,body:document.body.className}))()`);
 await evalIn('TT.trainingDbg.enter()');assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:20000}));
 await shot('17-reset',`(()=>({active:TT.trainingDbg.state().active,wreck:TT.trainingDbg.wreck().count(),targets:TT.trainingDbg.tg().targets.map(x=>x.state),cash:TT.getBank()}))()`);
 await evalIn('TT.trainingDbg.leave()');
 assert.deepEqual(page.errors,[]);
 console.log(`PASS GP-20097 full play: ${drills.length} drills, ${guns.length} guns, ${shells.length} shell types, ${log.length} snapshots, ${page.errors.length} page errors`);
}finally{try{await evalIn('TT.setMouseFireDbg(false)')}catch{}fs.writeFileSync(path.join(out,'full-play.json'),JSON.stringify({log,errors:page?.errors||[]},null,2));await browser.close();await server.close();}

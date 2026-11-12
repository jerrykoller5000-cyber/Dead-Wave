// GP-20124 Training QA: first/third person weapon action sweep.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20124',process.argv.includes('--repeat')?'repeat':'');
const report={at:new Date().toISOString(),stages:[],spikes:[],errors:[],warnings:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:400000});
 if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:400000}))throw Error('load');
 await page.evaluate('DWOpening.dismissForTesting()');
 await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:500000});
 await page.evaluate('(()=>{window.__qa={stage:"entry",last:0,spikes:[]};const tick=t=>{const q=__qa;if(q.last&&t-q.last>100)q.spikes.push({stage:q.stage,ms:+(t-q.last).toFixed(1)});q.last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);document.getElementById("playerName").value="GP-20124 Combat";document.getElementById("modeTraining").click()})()');
 if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:400000}))throw Error('Training entry');
 async function stage(name,expr,ms=500){await page.evaluate('__qa.stage='+JSON.stringify(name));const data=await page.evaluate(expr,120000);await pause(ms);await page.screenshot(path.join(out,name+'.png'));report.stages.push({name,data});console.log(name,JSON.stringify(data).slice(0,500));return data;}
 async function key(code,down){await page.send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:code.slice(3).toLowerCase(),code,windowsVirtualKeyCode:code.charCodeAt(code.length-1)});}
 await stage('action-setup','(()=>{const T=TT,tg=T.trainingDbg.tg();T.setWorldTime(.5);T.weather.raining=false;T.grantAllWeapons();T.setUnarmedDbg(false);T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-10);T.takeOutGun("m4");T.setWeapon(T.WEAPON_ORDER.indexOf("m4"));T.setViewFirstDbg(true);T.setLasersDbg(true);T.toggleFlashlightDbg();return {gun:T.getCurrentWeapon(),first:T.fpDbg().first,laser:T.laserAimDbg(),gear:T.getGearOwned().laserLight};})()',850);
 await key('KeyF',true);await pause(100);await key('KeyF',false);
 await stage('action-knife-m4-1p','({knifeT:TT.getKnifeAnimT(),gun:TT.getCurrentWeapon(),laser:TT.laserAimDbg(),first:TT.fpDbg().first})',120);
 await stage('action-knife-m4-3p','(()=>{TT.setViewFirstDbg(false);return {knifeT:TT.getKnifeAnimT(),gun:TT.getCurrentWeapon(),first:TT.fpDbg().first};})()',300);
 for(const gun of ['pistol','uzi']){
  await stage('action-akimbo-'+gun+'-3p','(()=>{const T=TT,w="'+gun+'",A=T.armoryDbg.ui().armory;T.setDualOwnedDbg(w,true);A.stow("secondary",0);A.stow("secondary",1);A.buy({id:w+":second",kind:w},{store:true});if(w==="uzi")A.buy({id:"uzi",kind:"uzi"},{store:true});const equip=w==="pistol"?[A.take("pistol:second","secondary",0)]:[A.take("uzi","secondary",0),A.take("uzi:second","secondary",1)];T.takeOutGun(w);T.setWeapon(T.WEAPON_ORDER.indexOf(w));T.toggleDualWieldDbg();const p=T.player.position;T.setShotView({x:p.x+1.5,y:p.y+2.2,z:p.z-4.2,tx:p.x,ty:p.y+1.1,tz:p.z,fov:55});return {gun:T.getCurrentWeapon(),equip,slots:A.loadout(),flags:T.vaultDbg.flags(),first:T.fpDbg().first};})()',550);
  await stage('action-akimbo-'+gun+'-1p','(()=>{TT.setShotView(null);TT.setViewFirstDbg(true);return {gun:TT.getCurrentWeapon(),flags:TT.vaultDbg.flags(),vm:TT.viewmodelDbg()?.info?.active,first:TT.fpDbg().first};})()',550);
  await page.evaluate('TT.toggleDualWieldDbg()');
  await page.evaluate('TT.setViewFirstDbg(false)');
 }
 await stage('action-saw-draw-1p','(()=>{const T=TT;T.takeOutGun("chainsaw");T.setWeapon(T.WEAPON_ORDER.indexOf("chainsaw"));T.setViewFirstDbg(true);return {gun:T.getCurrentWeapon(),saw:T.sawCutDbg()};})()',900);
 await page.evaluate('TT.setMouseFireDbg(true)');await pause(550);
 await stage('action-saw-running-1p','({saw:TT.sawCutDbg(),knifeT:TT.getKnifeAnimT()})',100);
 await key('KeyF',true);await pause(110);await key('KeyF',false);
 await stage('action-saw-knife-1p','({saw:TT.sawCutDbg(),knifeT:TT.getKnifeAnimT()})',170);
 await page.evaluate('TT.setMouseFireDbg(false)');
 await stage('action-saw-back-3p','(()=>{TT.setViewFirstDbg(false);return {saw:TT.sawCutDbg(),gun:TT.getCurrentWeapon()};})()',500);
 await stage('action-launcher-draw-1p','(()=>{const T=TT;T.takeOutGun("launcher");T.setWeapon(T.WEAPON_ORDER.indexOf("launcher"));T.setViewFirstDbg(true);return {gun:T.getCurrentWeapon(),ammo:T.getAmmo().launcher};})()',900);
 await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'left',clickCount:1});await pause(100);
 await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'left',clickCount:1});
 await stage('action-launcher-fired-1p','({gun:TT.getCurrentWeapon(),ammo:TT.getAmmo().launcher})',300);
 await page.evaluate('TT.setMouseFireDbg(false);TT.setShotView(null)');
 for(const gun of ['pistol','revolver','uzi','m4','ak','shotgun','aa12','sniper','minigun','launcher','flamer','chainsaw']){
  for(const first of [true,false]){
   const tag='sweep-'+gun+'-'+(first?'eye':'hip');
   await stage(tag+'-draw','(()=>{const T=TT,w='+JSON.stringify(gun)+';T.takeOutGun(w);T.setWeapon(T.WEAPON_ORDER.indexOf(w));T.setViewFirstDbg('+first+');T.setShotView(null);if(!'+first+'){const p=T.player.position;T.setShotView({x:p.x+1.3,y:p.y+1.8,z:p.z-2.7,tx:p.x,ty:p.y+1.15,tz:p.z,fov:50});}return {gun:T.getCurrentWeapon(),first:T.fpDbg().first,ammo:T.getAmmo()[w]};})()',700);
   await page.evaluate('__qa.stage='+JSON.stringify(tag+'-fire'));
   await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'left',clickCount:1});await pause(gun==='minigun'?1400:350);
   await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'left',clickCount:1});
   await stage(tag+'-fired','({gun:TT.getCurrentWeapon(),ammo:TT.getAmmo()['+JSON.stringify(gun)+'],cases:TT.casings.length})',100);
   await key('KeyR',true);await pause(70);await key('KeyR',false);
   await stage(tag+'-reload','({gun:TT.getCurrentWeapon(),reloading:TT.isReloading(),ammo:TT.getAmmo()['+JSON.stringify(gun)+']})',650);
   await pause(2200);
  }
 }
 report.spikes=await page.evaluate('__qa.spikes');report.errors=page.errors.slice();
 report.warnings=page.console.filter(x=>/warn|error/i.test(x.type)||/WebGPU|validation/i.test(x.text)).map(x=>x.type+': '+x.text.slice(0,240));
 console.log('summary',JSON.stringify({spikes:report.spikes.length,errors:report.errors.length,warnings:report.warnings.length}));
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'combat-actions.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}

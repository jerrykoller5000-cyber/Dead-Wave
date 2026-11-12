import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20124',process.argv.includes('--repeat')?'repeat':'');
const report={stages:[],errors:[],spikes:[]},pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:240000});
 if(!await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000}))throw Error('load');
 await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
 await page.evaluate('document.getElementById("playerName").value="GP-20124 Supplement";document.getElementById("modeTraining").click()');
 await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")');
 await page.evaluate('window.__qa={stage:"settle",last:0,spikes:[]};const tick=t=>{if(__qa.last&&t-__qa.last>100)__qa.spikes.push({stage:__qa.stage,ms:t-__qa.last});__qa.last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick)');
 const stage=async(name,expr,ms=600)=>{await page.evaluate('__qa.stage='+JSON.stringify(name));const data=await page.evaluate(expr);await pause(ms);await page.screenshot(path.join(out,name+'.png'));report.stages.push({name,data});console.log(name,JSON.stringify(data).slice(0,500));return data;};
 const key=async(code,ms=100)=>{await page.send('Input.dispatchKeyEvent',{type:'keyDown',code,key:code.slice(3).toLowerCase(),windowsVirtualKeyCode:code.charCodeAt(code.length-1)});await pause(ms);await page.send('Input.dispatchKeyEvent',{type:'keyUp',code,key:code.slice(3).toLowerCase(),windowsVirtualKeyCode:code.charCodeAt(code.length-1)});};
 await stage('cif-real-open','(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.cif.front;T.player.position.set(f.x,tg.floorY,f.z);T.doAction();return {open:T.isCIFOpen()};})()');
 await stage('cif-real-camo','(()=>{document.querySelector("[data-camo=marpat]")?.click();return {open:TT.isCIFOpen(),camo:TT.getCamo()};})()');
 await stage('armory-real-rack','(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;T.closeCIF();T.player.position.set(f.x,tg.floorY,f.z);T.doAction();return {open:!document.getElementById("armoryPanel").hidden};})()');
 await page.evaluate('TT.armoryDbg.ui().close();TT.grantAllWeapons();TT.setUnarmedDbg(false);const t=TT.trainingDbg.tg();TT.player.position.set(t.origin.x,t.floorY,t.origin.z-10);const picks={};for(const id of Object.keys(TT.weaponMeshes))picks[id]="multicam";TT.dressGuns({guns:picks})');
 for(const w of ['pistol','revolver','uzi','m4','ak','shotgun','aa12','sniper','minigun','launcher','flamer','chainsaw'])await stage('camo-'+w,'(()=>{TT.setViewFirstDbg(true);TT.takeOutGun('+JSON.stringify(w)+');TT.setWeapon(TT.WEAPON_ORDER.indexOf('+JSON.stringify(w)+'));return {gun:TT.getCurrentWeapon()};})()');
 for(const blade of ['knife','machete','katana']){
  await page.evaluate('TT.takeOutGun("m4");TT.setWeapon(TT.WEAPON_ORDER.indexOf("m4"));TT.setMacheteOwned('+JSON.stringify(blade==='machete')+');TT.setKatanaOwned('+JSON.stringify(blade==='katana')+');TT.setShotView(null);TT.setViewFirstDbg(true)');
  await pause(700);await key('KeyF',90);await page.evaluate('TT.handsDbg.knifeHold('+(blade==='katana'?.35:.42)+')');
  await stage('blade-'+blade+'-eye','(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const v=TT.viewmodelDbg();return {t:TT.getKnifeAnimT(),machete:TT.isMacheteOwned(),katana:TT.isKatanaOwned(),gun:TT.getCurrentWeapon(),blade:v?.info?.blade,raise:v?.info?.raise,gunVisible:v?.gun?.root?.visible,u:TT.handsDbg.knife().u};})()',200);
  await page.evaluate('TT.handsDbg.knifeHold(null)');await pause(1200);await page.evaluate('TT.setViewFirstDbg(false)');await key('KeyF',90);await page.evaluate('TT.handsDbg.knifeHold(.42)');await stage('blade-'+blade+'-hip','({t:TT.getKnifeAnimT(),u:TT.handsDbg.knife().u})',200);await page.evaluate('TT.handsDbg.knifeHold(null)');await pause(1100);
 }
 await page.evaluate('TT.setGrenadesDbg(3);TT.setViewFirstDbg(true)');await key('KeyG',600);await stage('grenade-release','(()=>{const g=TT.grenadeAnimDbg();return {phase:g.phase,t:g.t,inHand:g.inHand,queued:g.queued};})()',150);
 await pause(1800);
 await stage('watchman-mounted','(()=>{const T=TT,p=T.player.position,b=T.spawnBuild("m240",p.x+1.2,p.z);return {mounted:T.mountMortar(b),state:T.m240Dbg()};})()');
 await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'left',clickCount:1});await pause(800);await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'left',clickCount:1});
 await stage('watchman-fired','TT.m240Dbg()');
 await stage('watchman-carried','(()=>{TT.shoulderMortar();TT.setViewFirstDbg(false);return {carried:TT.getMortarCarried()};})()');
 report.spikes=await page.evaluate('__qa.spikes');report.errors=page.errors.slice();console.log('summary',JSON.stringify({spikes:report.spikes.length,errors:report.errors}));
}catch(e){report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'supplement.json'),JSON.stringify(report,null,2));await browser.close();await server.close();}

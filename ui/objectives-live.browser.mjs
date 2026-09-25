// Production GP-11 integration; fake renderer, real world/input/inventory/UI.
// The probe only arranges inventory and inspects state, never supplies wiring.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),shots=path.join(root,'Claude outputs/shots/gp11-live');
fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(src.includes('window.TT = {'));
src=src.replace(/<script type="importmap">[\s\S]*?<\/script>/,()=>'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
 .replace('window.TT = {',()=>`window.gp11={
   state:()=>objectiveRuntime?.read(), update:()=>objectiveRuntime?.update(),
   markers:()=>objectiveRuntime?.markers(),
   med:n=>{medkits=n===null?MAX_MEDKITS-1:n;return medkits;},
   ammoGap:n=>{reserveAmmo['.45']=reserveCap('.45')-n;return reserveAmmo['.45'];},
   intel:()=>fieldIntelOwned,
   save:()=>objectiveRuntime.save(),restore:blob=>objectiveRuntime.restore(blob),
   emptyGrenades:()=>{grenades=0;},
   reset:()=>resetHQ()
 }; window.TT = {`);
const server=await serve(root,0);let browser;
try {
 browser=await chromium.launch({executablePath:process.env.UI_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',route=>route.fulfill({body:src,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&window.DWLoad?.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Objective Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>window.gp11?.state()&&!document.body.classList.contains('deploying'),null,{timeout:30000});
 await page.evaluate(()=>{window.objectiveCues=[];const original=TT.AudioSys.musicCue;TT.AudioSys.musicCue=function(name){if(name==='objective')objectiveCues.push(name);return original.call(this,name);};});
 await page.evaluate(()=>TT.runDevCommand('godmode'));
 await page.screenshot({path:path.join(shots,'before.png')});
 const id=name=>'objective:'+name;
 const state=name=>page.evaluate(id=>gp11.state().sites.find(s=>s.id===id),id(name));
 async function visit(name){
   await page.evaluate(id=>{const p=TT.getObjectiveProps().props[id].approach;TT.player.position.set(p.x,p.y,p.z);gp11.update();},id(name));
   await page.waitForFunction(id=>TT.getObjectiveInteraction(id).reachable,id(name));
 }
 await visit('radio-repair');
 await page.keyboard.down('KeyE');
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:radio-repair').progress>.3);
 assert((await state('radio-repair')).progress>.3,'real E advances radio');
 await page.keyboard.up('KeyE');
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:radio-repair').progress===0&&TT.getObjectiveInteraction('objective:radio-repair').cancelled==='released');
 assert.equal((await state('radio-repair')).progress,0,'release interrupts');
 await page.keyboard.down('KeyE');
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:radio-repair').progress>.1);
 await page.evaluate(()=>{TT.runDevCommand('godmode off');TT.damagePlayer(1,'shambler');TT.runDevCommand('godmode');});
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:radio-repair').progress===0&&TT.getObjectiveInteraction('objective:radio-repair').cancelled==='damage');
 assert.equal((await state('radio-repair')).progress,0,'damage event interrupts');
 await page.keyboard.up('KeyE');await page.keyboard.down('KeyE');
 await page.waitForFunction(()=>gp11.state().revealed,null,{timeout:15000});
 await page.keyboard.up('KeyE');
 assert.equal((await state('radio-repair')).state,'ready-to-claim');
 assert.equal(await page.evaluate(()=>gp11.markers().length),1);
 assert.equal(await page.evaluate(()=>gp11.intel()),false,'radio does not unlock Field Intel');
 assert.equal(await page.evaluate(()=>TT.getObjectiveProps().props['objective:radio-repair'].state),'repaired');
 await page.screenshot({path:path.join(shots,'radio.png')});
 await page.keyboard.press('Tab');
 assert.equal(await page.locator('[data-site="objective:medical-convoy"]').count(),0,'GP-39: distant medical site stays hidden even after radio repair');
 await page.screenshot({path:path.join(shots,'map.png')});
 await page.keyboard.press('Escape');await page.keyboard.press('Tab');
 await visit('medical-convoy');
 const before=await page.evaluate(()=>gp11.med(null));
 await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:medical-convoy').feedback==='partial');
 assert.equal(await page.evaluate(()=>TT.getMedkits()),before+1);
 assert.equal((await state('medical-convoy')).remaining,1);
 assert.equal((await state('medical-convoy')).feedback,'partial');
 assert.equal(await page.evaluate(()=>objectiveCues.length),0,'partial supply and radio repair awaiting claim are not complete');
 await page.screenshot({path:path.join(shots,'partial.png')});
 await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:medical-convoy').feedback==='full');
 assert.equal((await state('medical-convoy')).feedback,'full');
 assert.equal(await page.evaluate(()=>objectiveCues.length),0,'full inventory does not play completion');
 assert.match(await page.locator('#objectiveHud').innerText(),/Supplies remaining: \+1 MedPen/);
 await page.evaluate(()=>gp11.med(0));await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:medical-convoy').state==='claimed');
 assert.equal(await page.evaluate(()=>TT.getMedkits()),1);
 assert.equal((await state('medical-convoy')).state,'claimed');
 await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>TT.getMedkits()),1);
 assert.equal(await page.evaluate(()=>objectiveCues.length),1,'one cue for completed claim; none for repeat E');
 assert.equal(await page.evaluate(()=>TT.getObjectiveProps().props['objective:medical-convoy'].state),'empty');
 await visit('ranger-cache');
 await page.locator('#objectiveHud select').focus();
 const posBefore=await page.evaluate(()=>({x:TT.player.position.x,z:TT.player.position.z}));
 await page.keyboard.down('KeyD');
 try {await page.waitForFunction(p=>Math.hypot(TT.player.position.x-p.x,TT.player.position.z-p.z)>.5,posBefore,{timeout:10000});}
 finally {await page.keyboard.up('KeyD');}
 const moved=await page.evaluate(p=>Math.hypot(TT.player.position.x-p.x,TT.player.position.z-p.z),posBefore);
 assert(moved>.5,'cache selection must release WASD to gameplay without Stop tracking');
 await visit('ranger-cache');
 await page.locator('#objectiveHud select').focus();
 const ammoBefore=await page.evaluate(()=>gp11.ammoGap(10));
 await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:ranger-cache').feedback==='partial');
 assert.equal(await page.evaluate(()=>TT.getReserve()['.45']),ammoBefore+10);
 assert.equal((await state('ranger-cache')).remaining,26);
 assert(await page.locator('#objectiveHud select').isDisabled(),'partial pack locks choice');
 assert.equal(await page.evaluate(()=>objectiveCues.length),1,'partial ammo grant does not play completion');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(shots,'mobile.png')});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 await page.setViewportSize({width:1280,height:720});
 for(const name of ['hikers-cache','trapper-cache','fuel-depot','wreck-salvage','radio-repair']){
   await visit(name);
   await page.evaluate(()=>{gp11.med(0);gp11.ammoGap(100);gp11.emptyGrenades();});
   await page.keyboard.press('KeyE');
   await page.waitForFunction(id=>gp11.state().sites.find(s=>s.id===id).state==='claimed',id(name));
   const row=await state(name);
   assert.equal(row.state,'claimed',name);
 }
 assert.equal(await page.evaluate(()=>objectiveCues.length),6,'one cue for each completed site');
 assert(await page.evaluate(()=>gp11.restore(gp11.save())));
 // Exercise repeated real adapter polls explicitly before checking for duplicate cues.
 await page.evaluate(()=>{gp11.update();gp11.update();gp11.update();});
 assert.equal(await page.evaluate(()=>objectiveCues.length),6,'restoring and polling completed objectives stay silent');
 const run=await page.evaluate(()=>gp11.state().runId);
 await page.evaluate(()=>gp11.reset());
 await page.waitForFunction(run=>gp11.state().runId!==run,run);
 assert.notEqual(await page.evaluate(()=>gp11.state().runId),run);
 assert.equal(await page.evaluate(()=>gp11.state().revealed),false);
 assert.equal((await state('medical-convoy')).remaining,null);
 assert.equal(await page.evaluate(()=>objectiveCues.length),6,'reset stays silent');
 await visit('medical-convoy');await page.evaluate(()=>gp11.med(0));await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>gp11.state().sites.find(s=>s.id==='objective:medical-convoy').state==='claimed');
 assert.equal((await state('medical-convoy')).state,'claimed');
 assert.equal(await page.evaluate(()=>objectiveCues.length),7,'completion can cue again in a fresh run');
 await page.evaluate(()=>{TT.runDevCommand('godmode off');TT.beginScriptedKill('cave',TT.POI.caves[0]);TT.finishScriptedKill();});
 await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('#win.show'));
 assert.equal(await page.locator('#watchAgain, .replay-tile').count(),0,'D-20 replay controls removed');
 assert(await page.locator('#winMsg .deathlog').isVisible(),'death catalogue retained');
 await page.screenshot({path:path.join(shots,'death-no-replay.png')});
 assert.deepEqual(errors,[]);
 console.log('PASS GP-11/15 production integration: real E hold/release, damage cancellation, all seven sites, focused-selector movement and E, .45 partial supply/lock, map, reset, mobile overflow; GP-14 death catalogue retained without replay controls.');
 console.log('Renderer is a stand-in; real GPU, route playthrough and frame/load budgets remain for crew QA.');
 console.log('PASS GP-20 objective music cue: exactly once per completed claim; partial/full/repeated E/restore/poll/reset stay silent; new-run completion cues again.');
}finally{if(browser)await browser.close();server.close();}

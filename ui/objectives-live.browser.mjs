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
   ammoGap:n=>{reserveAmmo['9mm']=reserveCap('9mm')-n;return reserveAmmo['9mm'];},
   intel:()=>fieldIntelOwned,
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
 await page.evaluate(()=>{document.getElementById('openingSkip').click();document.getElementById('openingSkip').click();});
 await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Objective Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>window.gp11?.state()&&!document.body.classList.contains('deploying'),null,{timeout:30000});
 await page.evaluate(()=>TT.runDevCommand('godmode'));
 await page.screenshot({path:path.join(shots,'before.png')});
 const id=name=>'objective:'+name;
 const state=name=>page.evaluate(id=>gp11.state().sites.find(s=>s.id===id),id(name));
 async function visit(name){
   await page.evaluate(id=>{const p=TT.getObjectiveProps().props[id].approach;TT.player.position.set(p.x,p.y,p.z);gp11.update();},id(name));
   await page.waitForFunction(id=>TT.getObjectiveInteraction(id).reachable,id(name));
 }
 await visit('radio-repair');
 await page.keyboard.down('KeyE');await page.waitForTimeout(1000);
 assert((await state('radio-repair')).progress>.3,'real E advances radio');
 await page.keyboard.up('KeyE');await page.waitForTimeout(200);
 assert.equal((await state('radio-repair')).progress,0,'release interrupts');
 await page.keyboard.down('KeyE');await page.waitForTimeout(500);
 await page.evaluate(()=>{TT.runDevCommand('godmode off');TT.damagePlayer(1,'shambler');TT.runDevCommand('godmode');});
 await page.waitForTimeout(200);assert.equal((await state('radio-repair')).progress,0,'damage event interrupts');
 await page.keyboard.up('KeyE');await page.keyboard.down('KeyE');
 await page.waitForFunction(()=>gp11.state().revealed,null,{timeout:15000});
 await page.keyboard.up('KeyE');
 assert.equal((await state('radio-repair')).state,'ready-to-claim');
 assert.equal(await page.evaluate(()=>gp11.markers().length),7);
 assert.equal(await page.evaluate(()=>gp11.intel()),false,'radio does not unlock Field Intel');
 assert.equal(await page.evaluate(()=>TT.getObjectiveProps().props['objective:radio-repair'].state),'repaired');
 await page.screenshot({path:path.join(shots,'radio.png')});
 await page.keyboard.press('Tab');
 await page.locator('[data-site="objective:medical-convoy"]').click();
 assert.match(await page.locator('#objectiveHud').innerText(),/medical/i);
 await page.screenshot({path:path.join(shots,'map.png')});
 await page.keyboard.press('Escape');await page.keyboard.press('Tab');
 await visit('medical-convoy');
 const before=await page.evaluate(()=>gp11.med(null));
 await page.keyboard.press('KeyE');await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>TT.getMedkits()),before+1);
 assert.equal((await state('medical-convoy')).remaining,1);
 assert.equal((await state('medical-convoy')).feedback,'partial');
 await page.screenshot({path:path.join(shots,'partial.png')});
 await page.keyboard.press('KeyE');await page.waitForTimeout(200);
 assert.equal((await state('medical-convoy')).feedback,'full');
 assert.match(await page.locator('#objectiveHud').innerText(),/Supplies remaining: \+1 MedPen/);
 await page.evaluate(()=>gp11.med(0));await page.keyboard.press('KeyE');await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>TT.getMedkits()),1);
 assert.equal((await state('medical-convoy')).state,'claimed');
 await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>TT.getMedkits()),1);
 assert.equal(await page.evaluate(()=>TT.getObjectiveProps().props['objective:medical-convoy'].state),'empty');
 await visit('ranger-cache');
 const ammoBefore=await page.evaluate(()=>gp11.ammoGap(10));
 await page.keyboard.press('KeyE');await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>TT.getReserve()['9mm']),ammoBefore+10);
 assert.equal((await state('ranger-cache')).remaining,50);
 assert(await page.locator('#objectiveHud select').isDisabled(),'partial pack locks choice');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(shots,'mobile.png')});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 await page.setViewportSize({width:1280,height:720});
 for(const name of ['hikers-cache','trapper-cache','fuel-depot','wreck-salvage','radio-repair']){
   await visit(name);
   await page.evaluate(()=>{gp11.med(0);gp11.ammoGap(100);gp11.emptyGrenades();});
   await page.keyboard.press('KeyE');await page.waitForTimeout(200);
   const row=await state(name);
   assert.equal(row.state,'claimed',name);
 }
 const run=await page.evaluate(()=>gp11.state().runId);
 await page.evaluate(()=>gp11.reset());await page.waitForTimeout(200);
 assert.notEqual(await page.evaluate(()=>gp11.state().runId),run);
 assert.equal(await page.evaluate(()=>gp11.state().revealed),false);
 assert.equal((await state('medical-convoy')).remaining,null);
 assert.deepEqual(errors,[]);
 console.log('PASS GP-11 production integration: real E hold/release, damage cancellation, seven radio reveals, map tracking, partial/full/exact remaining supply claims, no repeat grants, pack lock, prop states, reset and mobile overflow.');
 console.log('Renderer is a stand-in; real GPU, route playthrough and frame/load budgets remain for crew QA.');
}finally{if(browser)await browser.close();server.close();}

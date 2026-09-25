// GP-16/17 HUD integration: actual page, renderer substitute, setup probe only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
import {waitForPresentation} from './browser-poll.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before'),ember=process.argv.includes('--ember'),edges=process.argv.includes('--edges');
const shots=path.join(root,'Claude outputs/shots',edges?'gp23':ember?'gp17':'gp16');fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8')
 .replace(/<script type="importmap">[\s\S]*?<\/script>/,()=>'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
 .replace('window.TT = {',()=>`window.hudProbe={streak:()=>{combo=12;comboT=100;},notice:()=>{showBanner('FIELD SUPPLIES','Return to the HQ window to bank your skulls',100);ammoByWeapon.pistol=0;updateAmmoHud();spawnSkullDrop(player.position.x,player.position.z,12,'shambler');},alarm:v=>{hq.seq=v?{t:0,fired:0}:null;},day4:()=>{day=3;startPrep();},wave:()=>{phase='wave';}};window.TT = {`);
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','HUD Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:30000});
 await page.evaluate(()=>{TT.runDevCommand('godmode');hudProbe.streak();});
 await page.waitForFunction(()=>document.getElementById('combo').classList.contains('show'));
 if(edges){await page.evaluate(()=>hudProbe.notice());await waitForPresentation(page,['#bigBanner','#reloadPrompt','#combo']);}
 for(const [name,width,height] of [['desktop',1280,720],['small',390,844]]){
   await page.setViewportSize({width,height});
   await page.waitForFunction(size=>innerWidth===size.width&&innerHeight===size.height,{width,height});
   await waitForPresentation(page,['#prepTimer','#combo']);
   await page.screenshot({path:path.join(shots,(before?'before-':'after-')+name+'.png')});
   if(!before){
     assert(await page.locator('#hudTopLeft #prepTimer').isVisible());
     const r=await page.locator('#prepTimer').boundingBox(),c=await page.locator('#combo').boundingBox();
     assert(r.x+r.width<=c.x||c.x+c.width<=r.x||r.y+r.height<=c.y||c.y+c.height<=r.y,'Ready and streak do not overlap');
     const p=await page.locator('#prepChecklist').boundingBox();assert(!p||p.y>=r.y+r.height,'checklist follows Ready');
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     if(edges){
       for(const sel of ['#centerHud','#combo','#bigBanner','#reloadPrompt','#firstMinuteCoach','#objectiveHud','#kioskPrompt','#placeBanner']){
         const el=page.locator(sel);if(!await el.isVisible())continue;const b=await el.boundingBox();if(!b?.height)continue;
         assert(b.x+b.width<=width*.34||b.x>=width*.66||b.y+b.height<=height*.4||b.y>=height*.6,sel+' leaves the central aiming corridor clear');
       }
       const a=await page.locator('#hudTopLeft').boundingBox(),m=await page.locator('#minimapFrame').boundingBox();assert(a.x+a.width<=m.x,'health and map stay separate');
     }
   }
 }
 if(ember){
   await page.setViewportSize({width:1280,height:720});
   await page.evaluate(()=>hudProbe.day4());
   await page.waitForFunction(()=>document.getElementById('timeLine').textContent.includes('Ember Night'));
   await waitForPresentation(page,['#bigBanner']);
   await page.screenshot({path:path.join(shots,(before?'before':'after')+'-banner.png')});
   if(!before){assert.match(await page.locator('#bigBanner .t').innerText(),/EMBER NIGHT/);assert.match(await page.locator('#timeLine').innerText(),/Ember Night/);}
   await page.evaluate(()=>{const q=TT.HQ_PANEL_FRONT;TT.player.position.set(q.x,TT.sampleHeight(q.x,q.z),q.z);});
   await page.waitForFunction(()=>TT.actionTarget()==='hqPanel');
   await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.classList.contains('briefing'));
   await page.screenshot({path:path.join(shots,(before?'before':'after')+'-briefing.png')});
   if(!before){assert.match(await page.locator('#hqBriefing').innerText(),/Ember Night/);assert(!/blood moon/i.test(await page.locator('body').innerText()));}
   await page.keyboard.press('Escape');
 }
 if(!before){
   await page.evaluate(()=>hudProbe.alarm(true));await page.waitForFunction(()=>document.querySelector('#prepTimer .clock').textContent==='INBOUND');
   await page.evaluate(()=>{hudProbe.alarm(false);hudProbe.wave();});await page.waitForFunction(()=>!document.getElementById('prepTimer').classList.contains('on'));
 }
 assert.deepEqual(errors,[]);console.log(before?'Captured before shots.':'PASS GP-16 Ready contained in left panel; no streak/checklist overlap at desktop/390px, INBOUND and wave-hide states, no page errors.'+(ember?' GP-17 Ember Night banner, HUD and HQ wave preview.':''));
}finally{if(browser)await browser.close();server.close();}

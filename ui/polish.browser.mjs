// GP-32: actual menu/kiosk/death UI; only the renderer and banner setup are substituted.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp32');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8')
 .replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
 .replace('window.TT = {',`window.polishBanner=()=>showBanner('DAY 1 CLEARED','Use the prep — repair, build, resupply, turn in skulls',60);window.TT = {`);
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const shot=n=>page.screenshot({path:path.join(shots,`${before?'before':'after'}-${n}.png`)});
 const intersects=async(a,b)=>page.evaluate(([a,b])=>{a=document.querySelector(a).getBoundingClientRect();b=document.querySelector(b).getBoundingClientRect();return a.width&&b.width&&Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);},[a,b]);
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 for(const [width,height] of [[1280,720],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await shot(`menu-${width}`);
  if(!before){assert(!await intersects('#nameRow','.menu-footer'),'footer clear of callsign');assert(await page.locator('#playerName').isVisible());}
 }
 await page.setViewportSize({width:1280,height:720});await page.fill('#playerName','Polish Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{TT.openShop(true);TT.setShopTabDbg('weapons');});await shot('kiosk');
 if(!before)assert.deepEqual(await page.locator('[data-weapon]').evaluateAll(es=>es.map(e=>e.dataset.weapon)),['pistol','uzi','shotgun','revolver','m4','chainsaw','ak','flamer','sniper','launcher','aa12','minigun']);
 await page.keyboard.press('Escape');await page.evaluate(()=>polishBanner());
 await page.waitForFunction(()=>getComputedStyle(document.getElementById('bigBanner')).opacity==='1');
 for(const [width,height] of [[1280,720],[390,844]]){await page.setViewportSize({width,height});await shot(`banner-${width}`);if(!before)assert(!await intersects('#bigBanner','#minimapFrame'),'banner clear of minimap');}
 await page.evaluate(()=>TT.endGame(false));await page.waitForFunction(()=>document.getElementById('win').classList.contains('show'));await shot('death');
 if(!before){assert.equal(await page.locator('.deathlog .locked').count(),Object.keys(await page.evaluate(()=>TT.DEATH_WAYS)).length);assert.equal(await page.locator('.deathlog .locked svg').count(),21);assert(!(await page.locator('.deathlog').innerText()).includes('???'));assert(await page.locator('.deathlog .locked').first().getAttribute('aria-label'));}
 assert.deepEqual(errors,[]);console.log(before?'Captured GP-32 before UI.':'PASS GP-32 weapon price order, accessible locked badges, menu footer and minimap/banner separation; no page errors.');
}finally{if(browser)await browser.close();server.close();}

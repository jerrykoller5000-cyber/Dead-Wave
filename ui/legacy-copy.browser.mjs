// GP-36: actual menu, HUD, alarm and banners; renderer is substituted.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp36');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8')
 .replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
 ;
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const shot=n=>page.screenshot({path:path.join(shots,`${before?'before':'after'}-${n}.png`)});
 const checkCopy=async()=>{if(before)return;const result=await page.evaluate(async()=>{const {text}=await import('/ui/strings.js');return [...document.querySelectorAll('[data-dw-text]')].filter(e=>e.textContent!==text(e.dataset.dwText)).map(e=>e.dataset.dwText);});assert.deepEqual(result,[]);};
 const intersects=async(a,b)=>page.evaluate(([a,b])=>{a=document.querySelector(a).getBoundingClientRect();b=document.querySelector(b).getBoundingClientRect();return a.width&&b.width&&Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);},[a,b]);
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 for(const [width,height] of [[1280,720],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await shot(`menu-${width}`);await checkCopy();
  if(!before){assert(!await intersects('#nameRow','.menu-footer'),'footer clear of callsign');assert(await page.locator('#playerName').isVisible());}
 }
 await page.setViewportSize({width:1280,height:720});await page.fill('#playerName','Polish Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 if(!before)assert.match(await page.locator('#timeLine').innerText(),/^Daylight/);
 await checkCopy();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('pause').classList.contains('show'));await shot('pause');await page.click('#tipsBtn');await shot('tips');await page.keyboard.press('Escape');await page.evaluate(()=>{TT.openShop(true);TT.setShopTabDbg('weapons');});await shot('kiosk');
 if(!before)assert.deepEqual(await page.locator('[data-weapon]').evaluateAll(es=>es.map(e=>e.dataset.weapon)),['pistol','uzi','shotgun','revolver','m4','chainsaw','ak','flamer','sniper','launcher','aa12','minigun']);
 await page.keyboard.press('Escape');await page.evaluate(()=>TT.startPrep());
 await page.waitForFunction(()=>getComputedStyle(document.getElementById('bigBanner')).opacity==='1');
 for(const [width,height] of [[1280,720],[390,844]]){await page.setViewportSize({width,height});await shot(`banner-${width}`);if(!before)assert(!await intersects('#bigBanner','#minimapFrame'),'banner clear of minimap');}
 if(!before){
  assert.equal(await page.locator('#bigBanner .t').innerText(),'DAY 1 CLEARED');
  await page.evaluate(()=>TT.hqStartWave());await page.waitForFunction(()=>document.querySelector('#bigBanner .t').textContent==='ALARM');await shot('alarm-390');
  assert.match(await page.locator('#bigBanner .s').innerText(),/Day 2.*they heard that/);
  await page.waitForFunction(()=>TT.getPhase()==='wave'&&document.querySelector('#bigBanner .t').textContent==='DAY 2 — HORDE INBOUND',null,{timeout:15000});await shot('inbound-390');assert.match(await page.locator('#waveLine').innerText(),/Wave Day 2.*Zombies left/);
 }
 await page.evaluate(()=>TT.endGame(false));await page.waitForFunction(()=>document.getElementById('win').classList.contains('show'));await shot('death');
 if(!before){assert.equal(await page.locator('.deathlog .locked').count(),Object.keys(await page.evaluate(()=>TT.DEATH_WAYS)).length);assert.equal(await page.locator('.deathlog .locked svg').count(),21);assert(!(await page.locator('.deathlog').innerText()).includes('???'));assert(await page.locator('.deathlog .locked').first().getAttribute('aria-label'));}
 assert.deepEqual(errors,[]);console.log(before?'Captured GP-36 before UI.':'PASS GP-36 keyed menu, pause/tips and HUD copy; kiosk, death and banner regression checks; no page errors.');
}finally{if(browser)await browser.close();server.close();}

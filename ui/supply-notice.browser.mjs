import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const shots=path.join(root,'Claude outputs/shots/gp56');fs.mkdirSync(shots,{recursive:true});
const server=await serve(root,0);
let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.fill('#playerName','Notice Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{window.testDrop=TT.spawnSupplyDrop();});
 assert.match(await page.locator('#supplyNotice').textContent(),/^SUPPLY DROP INBOUND/);
 assert(await page.locator('#supplyNotice').isVisible());
 assert.doesNotMatch(await page.locator('#bigBanner .t').textContent(),/SUPPLY DROP/);
 for(const width of [1280,390]){await page.setViewportSize({width,height:width===390?844:720});await page.screenshot({path:path.join(shots,`inbound-${width}-gpu.png`)});}
 const claimed=await page.evaluate(()=>{
  for(let i=0;i<700&&!TT.supplyDrops.some(s=>s.state==='landed');i++)TT.updateSupplyDrops(0.05);
  const s=TT.supplyDrops.find(s=>s.state==='landed');
  if(s)TT.claimSupplyDrop(s);
  return !!s&&s.state==='open';
 });
 assert(claimed);
 assert.match(await page.locator('#supplyNotice').textContent(),/^SUPPLY DROP · (Ammo restocked|Ammo full) · (\+\d MedPens?|MedPens full)$/);
 assert.doesNotMatch(await page.locator('#bigBanner .t').textContent(),/SUPPLY DROP/);
 for(const width of [1280,390]){await page.setViewportSize({width,height:width===390?844:720});await page.screenshot({path:path.join(shots,`claimed-${width}-gpu.png`)});}
 assert.deepEqual(errors,[]);
 console.log('PASS GP-56 WebGPU: event-driven compact HUD notice inbound/claimed at 1280/390, old banners absent, no page errors.');
} finally {if(browser)await browser.close();server.close();}

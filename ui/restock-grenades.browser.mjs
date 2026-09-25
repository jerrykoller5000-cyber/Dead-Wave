// GP-40: actual kiosk transaction and receipt tests; only inventory setup is injected.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp40');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>').replace('window.TT = {',`window.grenadeStock={setup:({cash=500,nades=2,rank=0,ammo=168}={})=>{bank=cash;grenades=nades;perkLevels.grenadier=rank;weaponOwned={pistol:true};reserveAmmo['.45']=ammo;renderShop();},read:()=>({cash:bank,nades:grenades,ammo:reserveAmmo['.45']}),buy:()=>buyAllAmmo(),gun:()=>buyWeaponAmmo('pistol')};window.TT = {`);
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Grenade Tester');await page.click('#modeHunt');await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{TT.openShop(true);grenadeStock.setup();window.grenadeReceipts=[];window.addEventListener('dw-game',({detail:e})=>{if(e.type==='purchase-delivered')grenadeReceipts.push(e);});});
 const all=page.locator('[data-restock-all] button');
 for(const width of [1280,390]){await page.setViewportSize({width,height:width===390?844:720});await page.screenshot({path:path.join(shots,(before?'before':'after')+'-'+width+'.png')});}
 if(!before){
  assert.equal(await all.textContent(),'Restock $36');await all.click();assert.deepEqual(await page.evaluate(()=>grenadeStock.read()),{cash:464,nades:5,ammo:168});
  assert.equal(await page.evaluate(()=>grenadeReceipts.filter(e=>e.itemId==='grenade').reduce((n,e)=>n+e.cashSpent,0)),36);assert(await all.isDisabled());await page.evaluate(()=>grenadeStock.buy());assert.equal(await page.evaluate(()=>TT.getBank()),464);
  await page.evaluate(()=>grenadeStock.setup({cash:59,nades:2,ammo:132}));assert.equal(await all.textContent(),'Restock $44');
  await page.evaluate(()=>grenadeStock.setup({cash:43,nades:2,ammo:132}));assert(await all.isDisabled());await page.evaluate(()=>grenadeStock.buy());assert.deepEqual(await page.evaluate(()=>grenadeStock.read()),{cash:43,nades:2,ammo:132},'insufficient total cannot partially spend');
  await page.evaluate(()=>grenadeStock.setup({nades:2,ammo:132}));await page.evaluate(()=>grenadeStock.gun());assert.deepEqual(await page.evaluate(()=>grenadeStock.read()),{cash:492,nades:2,ammo:168},'gun-only refill leaves grenades alone');
  await page.evaluate(()=>grenadeStock.setup({nades:0,rank:3}));assert.equal(await all.textContent(),'Restock $96');await all.click();assert.deepEqual(await page.evaluate(()=>grenadeStock.read()),{cash:404,nades:8,ammo:168},'Grenadier capacity respected');
  await page.evaluate(()=>grenadeStock.setup({nades:8,rank:0}));assert(await all.isDisabled());await page.evaluate(()=>grenadeStock.buy());assert.equal(await page.evaluate(()=>TT.getBank()),500,'over-cap inventory never charged or reduced');
 }
 assert.deepEqual(errors,[]);console.log(before?'GP-40 before restock shots captured.':'PASS GP-40: grenade-only refill, exact price/receipts, full/over-cap guards, total shortfall atomicity, gun-only isolation, Grenadier capacity, desktop/mobile.');
}finally{if(browser)await browser.close();server.close();}

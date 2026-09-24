// GP-18 actual kiosk/purchase paths. Only setup uses a probe; renderer is substituted.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp18');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8')
 .replace(/<script type="importmap">[\s\S]*?<\/script>/,()=>'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
 .replace('window.TT = {',()=>`window.stockProbe={
 setup:()=>{bank=500;weaponOwned={pistol:true,uzi:true,shotgun:true,aa12:true,chainsaw:true};buildUnlocked.mortar=false;for(const c of Object.keys(reserveAmmo))reserveAmmo[c]=0;reserveAmmo['.45']=36;reserveAmmo['9mm']=200;reserveAmmo['12ga']=90;sawFuel=59.5;ammoByWeapon.pistol=3;shopTab='weapons';},
 cash:n=>{bank=n;renderShop();},fuel:()=>sawFuel,
 refresh:()=>renderShop(),restock:w=>buyWeaponAmmo(w),all:()=>buyAllAmmo()
 };window.TT = {`);
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>{document.getElementById('openingSkip').click();document.getElementById('openingSkip').click();});
 await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Restock Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:30000});
 await page.evaluate(()=>{stockProbe.setup();TT.openShop(true);window.stockReceipts=[];window.addEventListener('dw-game',({detail:e})=>{if(e.type==='purchase-delivered')stockReceipts.push(e);});});
 const shot=name=>page.screenshot({path:path.join(shots,(before?'before-':'after-')+name+'.png')});
 await shot('weapons');
 if(!before){
   const pistol=page.locator('[data-weapon="pistol"] [data-restock]');
   assert.equal(await pistol.textContent(),'Restock $36');
   assert(await page.locator('[data-weapon="m4"] [data-restock]').isDisabled());
   await pistol.click();
   assert.deepEqual(await page.evaluate(()=>({cash:TT.getBank(),pistol:TT.getReserve()['.45'],uzi:TT.getReserve()['9mm'],loaded:TT.getAmmo().pistol})),{cash:464,pistol:120,uzi:200,loaded:3});
   assert(await pistol.isDisabled());
   assert.equal(await page.evaluate(()=>stockReceipts.filter(e=>e.itemId==='ammo:.45'&&e.source==='kiosk').reduce((n,e)=>n+e.cashSpent,0)),36);
   await page.evaluate(()=>stockProbe.restock('m4'));assert.equal(await page.evaluate(()=>TT.getBank()),464);
   await page.evaluate(()=>stockProbe.cash(13));
   const uzi=page.locator('[data-weapon="uzi"] [data-restock]');assert.equal(await uzi.textContent(),'Restock $14');assert(await uzi.isDisabled());
   await page.evaluate(()=>stockProbe.restock('uzi'));assert.equal(await page.evaluate(()=>TT.getReserve()['9mm']),200);assert.equal(await page.evaluate(()=>TT.getBank()),13);
   await page.evaluate(()=>stockProbe.cash(500));
   const all=page.locator('[data-restock-all] button');assert.equal(await all.textContent(),'Restock $52');
   await all.click();
   assert.deepEqual(await page.evaluate(()=>({cash:TT.getBank(),uzi:TT.getReserve()['9mm'],shells:TT.getReserve()['12ga'],fuel:stockProbe.fuel()})),{cash:448,uzi:220,shells:110,fuel:60});
   assert(await all.isDisabled());await page.evaluate(()=>stockProbe.all());assert.equal(await page.evaluate(()=>TT.getBank()),448);
   await shot('full');
   await page.evaluate(()=>{stockProbe.setup();stockProbe.cash(60);});
   assert.equal(await all.textContent(),'Restock $88');assert(await all.isDisabled());
   await page.evaluate(()=>stockProbe.all());assert.equal(await page.evaluate(()=>TT.getBank()),60);assert.equal(await page.evaluate(()=>TT.getReserve()['.45']),36);
 }
 await page.evaluate(()=>TT.setShopTabDbg('ammo'));await shot('ammo');
 if(!before){assert.match(await page.locator('#shopHint').textContent(),/pistol uses \.45/);assert.equal(await page.locator('[data-restock-all] button').textContent(),'Restock $88');}
 await page.evaluate(()=>TT.setShopTabDbg('weapons'));await page.setViewportSize({width:390,height:844});await shot('small');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log(before?'Captured GP-18 before shots.':'PASS GP-18 actual kiosk: scoped .45 purchase/cost/receipts, no free magazine reload, unowned/full/shortfall guards, Restock all shared-calibre dedup + fractional fuel, no partial spend, both tabs and 390px, no page errors.');
}finally{if(browser)await browser.close();server.close();}

// GP-41 real kiosk pricing and transaction checks; substituted renderer only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
import {equipmentStocked,GUN_STOCK_NIGHT} from '../game/economy.js';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp61');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>').replace('window.TT = stampDebugHooks({',`window.econProbe={setup:(n,cash=10000)=>{day=n;bank=cash;weaponOwned={pistol:true};gearOwned=GEAR_NONE();resetSkills(localPlayer);PLAYER_MAX_HP=100;extMag={};dualOwned={};macheteOwned=false;sawTankUpgraded=false;medkits=0;magazineStore=createMagazineStore();localPlayer.magazines=magazineStore;issueWeaponMagazines('pistol',12,START_RESERVE_45);shopTab='weapons';renderShop();},cash:n=>{bank=n;renderShop();},quotes:()=>({weapons:Object.fromEntries(Object.keys(WEAPON_PRICE).map(w=>[w,weaponPrice(w)])),med:MEDKIT_PRICE,pistol:AMMO_PACK['.45'].cost,gas:AMMO_PACK.chainsaw.cost,tank:SAW_TANK_PRICE}),wheel:()=>buildWheelItems('weapon'),dawn:n=>dawnScreen.show({day:n,kills:0,skulls:0,best:0}),buyMed:()=>buyMedkit(),buyMag:()=>buyExtMag('pistol'),buyPair:()=>buyDualWield('pistol'),buyMachete:()=>buyMachete(),buyTank:()=>buySawTank(),reset:()=>resetMatchToSpawn()};window.TT = stampDebugHooks({`);
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Economy Tester');await page.click('#modeHunt');await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});await page.evaluate(()=>TT.openShop(true));
 for(const night of [1,4,10,20]){await page.evaluate(n=>econProbe.setup(n),night);for(const width of [1280,390]){await page.setViewportSize({width,height:width===390?844:720});await page.screenshot({path:path.join(shots,(before?'before':'after')+'-night-'+night+'-'+width+'.png')});}}
 if(!before){
  const base=await page.evaluate(()=>TT.WEAPON_PRICE);
  for(let night=1;night<=20;night++){
   await page.evaluate(n=>econProbe.setup(n),night);const q=await page.evaluate(()=>econProbe.quotes());
   for(const [w,price]of Object.entries(q.weapons)){assert.equal(price,base[w]);if(w!=='pistol'){const button=page.locator('[data-weapon="'+w+'"] .weapon-actions button').first(),label=equipmentStocked(w,night)?'$'+price:'Arrives night '+GUN_STOCK_NIGHT[w];assert.equal(await button.textContent(),label);assert.equal(await button.isDisabled(),!equipmentStocked(w,night),w+' stock night '+night);assert.equal((await page.evaluate(()=>econProbe.wheel())).find(item=>item.key===w).meta,label);}}
   assert.equal(await page.locator('[data-shop-page="perks"]').count(),0);assert.deepEqual([q.med,q.pistol,q.gas,q.tank],[35,8,18,85]);
  }
  await page.evaluate(()=>{econProbe.setup(3,10000);window.economyReceipts=[];window.addEventListener('dw-game',({detail:e})=>{if(e.type==='purchase-delivered')economyReceipts.push(e);});});
  const m4=page.locator('[data-weapon="m4"] .weapon-actions button').first();assert(await m4.isDisabled());await page.evaluate(()=>TT.buyWeapon('m4'));assert.equal(await page.evaluate(()=>TT.getBank()),10000,'unstocked API purchase refused');
  await page.evaluate(()=>econProbe.setup(4,179));assert(await m4.isDisabled());await page.evaluate(()=>TT.buyWeapon('m4'));assert.equal(await page.evaluate(()=>TT.getBank()),179);
  await page.evaluate(()=>econProbe.cash(180));await m4.click();assert.equal(await page.evaluate(()=>TT.getBank()),0);assert.equal(await page.evaluate(()=>economyReceipts.at(-1).cashSpent),180);await page.evaluate(()=>TT.buyWeapon('m4'));assert.equal(await page.evaluate(()=>TT.getBank()),0);
  await page.evaluate(()=>econProbe.setup(20,10000));
  const check=async(action,price,id)=>{const cash=await page.evaluate(()=>TT.getBank());await page.evaluate(action);assert.equal(await page.evaluate(()=>TT.getBank()),cash-price);const receipt=await page.evaluate(()=>economyReceipts.at(-1));assert.equal(receipt.cashSpent,price);assert.equal(receipt.itemId,id);};
  await check(()=>TT.buyWeapon('chainsaw'),190,'weapon:chainsaw');await check(()=>econProbe.buyTank(),85,'saw-tank');
  await check(()=>econProbe.buyMed(),35,'medpen');await check(()=>econProbe.buyMag(),45,'magazine:pistol');await check(()=>econProbe.buyPair(),120,'dual:pistol');await check(()=>econProbe.buyMachete(),85,'machete');
  await check(()=>TT.buyGear(TT.GEAR.find(g=>g.key==='helmet')),70,'gear:helmet');
  await page.evaluate(()=>{econProbe.reset();TT.openShop(true);});assert.equal(await page.evaluate(()=>econProbe.quotes().weapons.m4),180,'new run keeps fixed price');
  for(const [completed,expected]of [[1,'New at the kiosk: Uzi, Shotgun.'],[3,'New at the kiosk: M4, Chainsaw.'],[9,'New at the kiosk: AA-12.'],[10,''],[19,'']]){
   await page.evaluate(n=>econProbe.dawn(n),completed);assert.equal(await page.locator('#dawnCard .dawn-stock').textContent(),expected);assert.equal(await page.locator('#dawnCard .dawn-stock').isHidden(),!expected);
   if(completed===9){await page.evaluate(()=>{TT.closeShop();document.getElementById('perf').style.display='none';});await page.waitForTimeout(600);await page.locator('#dawnCard').screenshot({path:path.join(shots,'after-dawn-aa12-1280.png')});}
  }
 }
 assert.deepEqual(errors,[]);console.log(before?'GP-61 before kiosk shots captured.':'PASS GP-61 arrival copy across 20 nights in kiosk and wheel, dawn stock notices, fixed-price purchases, reset, desktop/mobile.');
}finally{if(browser)await browser.close();server.close();}

// GP-41 real kiosk pricing and transaction checks; substituted renderer only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
import {equipmentPrice} from '../game/economy.js';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp41');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>').replace('window.TT = {',`window.econProbe={setup:(n,cash=10000)=>{day=n;bank=cash;weaponOwned={pistol:true};gearOwned=GEAR_NONE();resetPerks();extMag={};dualOwned={};macheteOwned=false;sawTankUpgraded=false;medkits=0;shopTab='weapons';renderShop();},cash:n=>{bank=n;renderShop();},quotes:()=>({weapons:Object.fromEntries(Object.keys(WEAPON_PRICE).map(w=>[w,typeof weaponPrice==='function'?weaponPrice(w):WEAPON_PRICE[w]])),perks:PERKS.map(p=>({base:p.base,cost:perkCost(p)})),med:MEDKIT_PRICE,pistol:AMMO_PACK['.45'].cost,gas:AMMO_PACK.chainsaw.cost,tank:SAW_TANK_PRICE}),buyMed:()=>buyMedkit(),buyMag:()=>buyExtMag('pistol'),buyPair:()=>buyDualWield('pistol'),buyMachete:()=>buyMachete(),buyTank:()=>buySawTank(),reset:()=>resetMatchToSpawn()};window.TT = {`);
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Economy Tester');await page.click('#modeHunt');await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});await page.evaluate(()=>TT.openShop(true));
 for(const night of [1,10,20]){await page.evaluate(n=>econProbe.setup(n),night);for(const width of [1280,390]){await page.setViewportSize({width,height:width===390?844:720});await page.screenshot({path:path.join(shots,(before?'before':'after')+'-night-'+night+'-'+width+'.png')});}}
 if(!before){
  const base=await page.evaluate(()=>TT.WEAPON_PRICE);
  for(let night=1;night<=20;night++){
   await page.evaluate(n=>econProbe.setup(n),night);const q=await page.evaluate(()=>econProbe.quotes());
   for(const [w,price]of Object.entries(q.weapons)){assert.equal(price,w==='chainsaw'?190:equipmentPrice(base[w],night));if(w!=='pistol')assert.equal(await page.locator('[data-weapon="'+w+'"] .weapon-actions button').first().textContent(),'$'+price);}
   for(const p of q.perks)assert.equal(p.cost,equipmentPrice(p.base,night));assert.deepEqual([q.med,q.pistol,q.gas,q.tank],[35,8,18,85]);
  }
  await page.evaluate(()=>{econProbe.setup(20,434);window.economyReceipts=[];window.addEventListener('dw-game',({detail:e})=>{if(e.type==='purchase-delivered')economyReceipts.push(e);});});
  const m4=page.locator('[data-weapon="m4"] .weapon-actions button').first();assert(await m4.isDisabled());await page.evaluate(()=>TT.buyWeapon('m4'));assert.equal(await page.evaluate(()=>TT.getBank()),434);
  await page.evaluate(()=>econProbe.cash(435));await m4.click();assert.equal(await page.evaluate(()=>TT.getBank()),0);assert.equal(await page.evaluate(()=>economyReceipts.at(-1).cashSpent),435);await page.evaluate(()=>TT.buyWeapon('m4'));assert.equal(await page.evaluate(()=>TT.getBank()),0);
  await page.evaluate(()=>econProbe.setup(20,10000));
  const check=async(action,price,id)=>{const cash=await page.evaluate(()=>TT.getBank());await page.evaluate(action);assert.equal(await page.evaluate(()=>TT.getBank()),cash-price);const receipt=await page.evaluate(()=>economyReceipts.at(-1));assert.equal(receipt.cashSpent,price);assert.equal(receipt.itemId,id);};
  await check(()=>TT.buyWeapon('chainsaw'),190,'weapon:chainsaw');await check(()=>econProbe.buyTank(),85,'saw-tank');
  await check(()=>econProbe.buyMed(),35,'medpen');await check(()=>econProbe.buyMag(),125,'magazine:pistol');await check(()=>econProbe.buyPair(),325,'dual:pistol');await check(()=>econProbe.buyMachete(),230,'machete');
  await check(()=>TT.buyGear(TT.GEAR.find(g=>g.key==='helmet')),190,'gear:helmet');await check(()=>TT.buyPerk(TT.PERKS.find(p=>p.key==='power')),165,'perk:power');
  await page.evaluate(()=>{econProbe.reset();TT.openShop(true);});assert.equal(await page.evaluate(()=>econProbe.quotes().weapons.m4),160,'new run resets price tier');
 }
 assert.deepEqual(errors,[]);console.log(before?'GP-41 before kiosk shots captured.':'PASS GP-41: all 20 nights match display/quotes, fixed resupply/saw, insufficient funds and repeat guards, exact weapon/gear/perk/mag/pair/blade/tank/medicine charges and receipts, fresh-run reset, desktop/mobile.');
}finally{if(browser)await browser.close();server.close();}

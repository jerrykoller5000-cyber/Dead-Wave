import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentPrice,equipmentMarkup,equipmentStocked,GUN_STOCK_NIGHT} from '../game/economy.js';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('equipment, gear and upgrades keep one price on every night',()=>{
 for(const day of [1,2,3,4,10,14,20,99])for(const base of [0,45,70,83,120,420,850]){
  assert.equal(equipmentPrice(base,day),base);assert.equal(equipmentMarkup(day),0);
 }
});
test('guns arrive by act and stay stocked thereafter',()=>{
 assert.deepEqual(Object.keys(GUN_STOCK_NIGHT).sort(),['aa12','ak','chainsaw','flamer','launcher','m4','minigun','pistol','revolver','shotgun','sniper','uzi']);
 assert.deepEqual([GUN_STOCK_NIGHT.m4,GUN_STOCK_NIGHT.ak,GUN_STOCK_NIGHT.aa12,GUN_STOCK_NIGHT.minigun],[4,5,10,14]);
 for(const [gun,arrival] of Object.entries(GUN_STOCK_NIGHT)){
  for(let night=1;night<=20;night++)assert.equal(equipmentStocked(gun,night),night>=arrival,gun+' night '+night);
 }
 assert.equal(equipmentStocked('unknown',20),false);
});
test('invalid quotes cannot create a negative, fractional, unsafe or NaN charge',()=>{
 for(const base of [-1,NaN,Infinity,2.5,'70'])assert.throws(()=>equipmentPrice(base,4),TypeError);
 for(const day of [0,-1,NaN,Infinity,2.5,'4'])assert.throws(()=>equipmentPrice(70,day),TypeError);
 assert.equal(equipmentPrice(Number.MAX_SAFE_INTEGER,20),Number.MAX_SAFE_INTEGER);
 assert.throws(()=>equipmentStocked('m4',0),TypeError);
});
test('twenty-night budget includes the late skull trim and purchasable mod sinks',()=>{
 const rows=JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('./economy-balance.mjs',import.meta.url))],{encoding:'utf8'}));
 assert.equal(rows.length,20);
 // GB-237 (rule 13): reset to the live roster. D-86 (CL-244/GP-19955) doubled the shambler's skull (cashDrop 1 -> 2) and
 // retuned NIGHT_PLAN's totals, and GB-230 reshaped night 1; the old list (15,74,200,...,3766) predates both.
 const raw=[30,116,270,424,742,945,862,1185,1249,1752,1736,2154,2188,2129,2769,2947,3049,3716,3993,4877];
 for(const r of rows){
  assert.equal(r.raw,raw[r.night-1],'GB-53 rewards are unchanged');
  const beforeTrim=r.night===1?15:Math.floor(r.raw*(r.night%4===0?1.5:1)*.95);
  assert.equal(r.bankedBeforeTrim,beforeTrim,'GB-61 skull recovery is modelled');
  // GB-237 (rule 13): D-86 replaced GB-113's flat x0.67 from night 11 with x(1 - 0.04 (n - 8)) from night 9, floor 0.60;
  // D-93 (Jerry, 2026-10-26) made it x(1 - 0.06 (n - 7)) from night 8, floor 0.40.
  assert.equal(r.banked,r.night>=8?Math.floor(beforeTrim*Math.max(.4,1-.06*(r.night-7))):beforeTrim,'D-93 late kill payout is modelled');
  assert(r.cost>0);assert(r.available>=r.cost,'Night '+r.night+' cannot fund '+r.purchase);
  assert.equal(r.openingCash,r.night===1?0:rows[r.night-2].afterPurchase);
  assert.equal(r.available,r.openingCash+r.standaloneAvailable);
  assert.equal(r.stocked,true,'unstocked purchase in model: '+r.purchase);
  assert.equal(r.afterPurchase,r.available-r.cost);
  assert.doesNotMatch(r.purchase,/perk|stopping power|scavenger|flashlight/i);
  assert.equal(r.ammo,Math.ceil(r.shots/(r.weapon==='pistol'?12:30))*(r.weapon==='pistol'?3:12),'full-mag upkeep');
 }
 assert.equal(rows[0].cost,39);assert.equal(rows[1].upkeep,36);assert.equal(rows[2].upkeep,110);
 assert.equal(rows[6].purchase,'Laser sight + AK suppressor');
 assert.equal(rows[7].purchase,'Helmet + night vision + AK extended mag + heavy barrel');
 assert.equal(rows[7].cost,400,'the heavy barrel is a paid mod alongside the extended mag');
 assert.match(rows[11].purchase,/M4 suppressor/);
 assert.equal(rows[11].cost,565,'the launcher and second suppressor are both counted');
 for(const night of [11,13,15,16,17,18,19,20])assert(rows[night-1].cost>=500,'Night '+night+' needs a useful late sink');
 assert.match(rows[19].purchase,/Mk III/);
 assert.equal(rows[19].afterPurchase,4206,'D-93 (Jerry): the late payout and the owned sinks end night 20 at about $4,200');
 // D-93: from night 11 the reserve holds near Jerry's ~$4,200 (it was GB-53's 2-3k band).
 for(const r of rows.slice(10))assert(r.afterPurchase>=3500&&r.afterPurchase<=5000,'night '+r.night+' stays near the D-93 reserve');
});

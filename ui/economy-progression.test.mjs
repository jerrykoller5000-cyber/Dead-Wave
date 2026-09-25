import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentPrice,equipmentMarkup} from '../game/economy.js';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('teaching-night equipment prices are unchanged, including already-rounded perk ranks',()=>{
 for(const day of [1,2,3])for(const base of [0,45,70,83,120,420])assert.equal(equipmentPrice(base,day),base);
});
test('later equipment quotes rise steadily in five-Cash steps and stop rising after night twenty',()=>{
 assert.equal(equipmentPrice(160,4),180);assert.equal(equipmentPrice(160,10),275);assert.equal(equipmentPrice(160,20),435);
 for(const base of [45,70,85,160,420]){let previous=base;for(let day=4;day<=25;day++){const value=equipmentPrice(base,day);assert(value>=previous);assert.equal(value%5,0);previous=value;}assert.equal(equipmentPrice(base,25),equipmentPrice(base,20));}
 assert.equal(equipmentMarkup(20),170);assert.equal(equipmentMarkup(999),170);assert.equal(equipmentPrice(0,20),0);
});
test('invalid quotes cannot create a negative, fractional, unsafe or NaN charge',()=>{
 for(const base of [-1,NaN,Infinity,2.5,'70'])assert.throws(()=>equipmentPrice(base,4),TypeError);
 for(const day of [0,-1,NaN,Infinity,2.5,'4'])assert.throws(()=>equipmentPrice(70,day),TypeError);
 assert.throws(()=>equipmentPrice(Number.MAX_SAFE_INTEGER,20),RangeError);
});
test('GB-53 budget model leaves a priced useful option after upkeep on all twenty nights',()=>{
 const rows=JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('./economy-balance.mjs',import.meta.url))],{encoding:'utf8'}));
 assert.equal(rows.length,20);
 const raw=[15,74,200,308,666,709,522,1008,1122,1498,1056,1574,1833,1526,2358,2416,1874,2565,3096,3766];
 for(const r of rows){assert.equal(r.raw,raw[r.night-1],'GB-53 rewards are unchanged');assert(r.cost>0);assert(r.available>=r.cost,'Night '+r.night+' cannot fund '+r.purchase);assert.equal(r.afterPurchase,r.available-r.cost);}
 assert.equal(rows[0].cost,39);assert.equal(rows[1].upkeep,32);assert.equal(rows[2].upkeep,107);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkullValueAccumulator } from '../game/economy.js';
import { buildBriefing } from './wave-preview.js';

test('five-kill streak bonuses settle as whole skull value without disappearing',()=>{
 const ledger=createSkullValueAccumulator();
 assert.deepEqual([1.25,1.25,1.25,1.25].map(n=>ledger.credit(n)),[1,1,1,2]);
 assert.equal(ledger.remainder(),0);
});
test('fraction survives plain rewards and decimal perk combinations',()=>{
 const ledger=createSkullValueAccumulator();
 assert.equal(ledger.credit(1.5),1);assert.equal(ledger.credit(1),1);assert.equal(ledger.credit(1.5),2);
 let paid=0;for(let i=0;i<100;i++)paid+=ledger.credit(1.12);
 assert.equal(paid,112);assert.equal(ledger.remainder(),0);
});
test('new run clears fractions and invalid rewards cannot corrupt them',()=>{
 const ledger=createSkullValueAccumulator();ledger.credit(1.25);
 for(const n of [-1,NaN,Infinity,'2'])assert.throws(()=>ledger.credit(n),TypeError);
 assert.throws(()=>ledger.credit(Number.MAX_VALUE),RangeError);
 assert.equal(ledger.remainder(),0.25);ledger.reset();assert.equal(ledger.remainder(),0);
 assert.equal(ledger.credit(1.75),1);assert.equal(ledger.credit(0),0);
});
test('day-one earnings explain banking, without promising a streak or exposing later rosters',()=>{
 const preview={day:1,total:15,byTypeAndCave:[{typeKey:'shambler',count:15,caveIndex:0}]};
 const view=buildBriefing({preview,day:1});assert.match(view.earnings,/1 skull value before bonuses/);assert.match(view.earnings,/HQ window/);
 assert.equal(buildBriefing({preview:{...preview,day:2},day:2}).earnings,null);
 assert.equal(buildBriefing({preview:null,day:1}).earnings,null);
});

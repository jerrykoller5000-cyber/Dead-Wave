import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCalls, createDailyCall } from './radio-call.js';
const state = (extra = {}) => ({ runId:1,day:2,phase:'prep',repaired:true,callable:true,owned:{},...extra });

test('relay draw has three distinct eligible cards, no early blackout or invented fallback',()=>{
 for(let i=0;i<10;i++) {
  const cards=drawCalls(()=>i/10,2);assert.equal(cards.length,3);assert.equal(new Set(cards).size,3);assert(!cards.includes('blackout'));
 }
 assert.deepEqual(new Set(drawCalls(()=>.5,4,{allTurrets:true,fieldIntel:true})),new Set(['ammo','medical','blackout']));
 assert.deepEqual(drawCalls(()=>.5,2,{allTurrets:true,fieldIntel:true}),[]);
 assert.deepEqual(drawCalls(()=>NaN,4),[]);
});
test('daily offers freeze across repeated reads, require repair, and accept one valid receipt',()=>{
 let draws=0, claims=0;const c=createDailyCall({rng:()=>{draws++;return .5;},claim:r=>{claims++;return {...r,receiptId:'day:'+r.day};}});
 c.reset(1);c.update(state({repaired:false}));assert.deepEqual(c.read().cards,[]);
 c.update(state());const first=c.read(),count=draws;c.update(state());assert.deepEqual(c.read(),first);assert.equal(draws,count);
 assert.equal(c.pick('invalid'),null);const pick=first.cards[0].id;assert(c.pick(pick));assert.equal(c.pick(pick),null);assert.equal(claims,1);
 c.update(state());assert.deepEqual(c.read().cards,[]);
 c.update(state({day:3}));assert.equal(c.read().cards.length,3);
});
test('alarm, stale packets, reset and newly owned unlocks cannot produce an invalid pick',()=>{
 const c=createDailyCall({rng:()=>.99,claim:r=>({...r,receiptId:'ok'})});c.reset(1);c.update(state());
 c.update(state({owned:{allTurrets:true}}));assert.equal(c.pick('hardware'),null);
 c.update(state({alarm:true}));c.update(state());assert.deepEqual(c.read().cards,[]);
 assert.equal(c.update(state({runId:0})),false);
 c.reset(2);assert.deepEqual(c.read().cards,[]);assert.equal(c.pick('ammo'),null);
});
test('failed or mismatched delivery preparation does not spend the UI selection',()=>{
 const c=createDailyCall({rng:()=>.99,claim:()=>({runId:99,day:2,card:'ammo',receiptId:'bad'})});
 c.reset(1);c.update(state());assert.equal(c.pick('ammo'),null);assert.equal(c.read().cards.length,3);
});

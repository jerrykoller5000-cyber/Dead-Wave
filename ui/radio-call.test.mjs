import test from 'node:test';
import assert from 'node:assert/strict';
import { restockRows } from './cache-intel.js';
import { drawCalls, createDailyCall, cheapestTurretBlueprint, buildRadioCallView } from './radio-call.js';
const state = (extra = {}) => ({ runId:1,day:2,phase:'prep',repaired:true,callable:true,hardwareBlueprint:'light',owned:{},...extra });

test('relay draw has three distinct eligible cards, no early blackout or invented fallback',()=>{
 for(let i=0;i<10;i++) {
  const cards=drawCalls(()=>i/10,2);assert.equal(cards.length,3);assert.equal(new Set(cards).size,3);assert(!cards.includes('blackout'));
 }
 assert.deepEqual(new Set(drawCalls(()=>.5,4,{allTurrets:true,fieldIntel:true})),new Set(['ammo','medical','blackout']));
 assert.deepEqual(new Set(drawCalls(()=>.5,2,{allTurrets:true,fieldIntel:true})),new Set(['ammo','medical']));
 assert.deepEqual(drawCalls(()=>NaN,4),[]);
});
test('daily offers freeze across repeated reads, require repair, and accept one valid receipt',()=>{
 let draws=0, claims=0;const c=createDailyCall({rng:()=>{draws++;return .5;},claim:r=>{claims++;return {...r,receiptId:'day:'+r.day};}});
 c.reset(1);c.update(state({repaired:false}));assert.deepEqual(c.read().cards,[]);
 c.update(state());const first=c.read(),count=draws;c.update(state());assert.deepEqual(c.read(),first);assert.equal(draws,count);
 assert.equal(c.pick('invalid'),null);const pick=first.cards[0].id;const receipt=c.pick(pick);assert(receipt);assert.deepEqual(c.pick(pick),receipt);assert.equal(claims,1);
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


test('hardware is the cheapest unowned turret at draw time, with no replacement after buying it',()=>{
 const prices={light:55,flame:75,heavy:110,mortar:120};
 assert.equal(cheapestTurretBlueprint(prices,{}),'light');
 assert.equal(cheapestTurretBlueprint(prices,{light:true}),'flame');
 assert.equal(cheapestTurretBlueprint(prices,{light:true,flame:true,heavy:true,mortar:true}),null);
 const events=[],c=createDailyCall({rng:()=>.99,claim:r=>({...r,receiptId:'ok'}),publish:e=>events.push(e)});
 c.reset(1);c.update(state());
 c.update(state({hardwareBlueprint:'flame',owned:{blueprints:{light:true}}}));
 assert.equal(c.read().cards.find(c=>c.id==='hardware').blueprint,'light');
 assert.equal(c.pick('hardware'),null);assert.equal(events.length,0);
 c.update(state({day:3,hardwareBlueprint:'flame',owned:{blueprints:{light:true}}}));
 assert.equal(c.pick('hardware').blueprint,'flame');assert.equal(events[0].blueprint,'flame');
});

test('a committed pick publishes exactly once through repeats, re-entry and reopening',()=>{
 let c;const events=[];c=createDailyCall({rng:()=>.99,claim:r=>({...r,receiptId:'daily'}),publish:r=>{events.push(r);assert.deepEqual(c.pick(r.card),r);}});
 c.reset(1);c.update(state());const receipt=c.pick('medical');
 c.update(state({receipt,callable:false}));assert.deepEqual(c.pick('medical'),receipt);
 assert.equal(c.pick('ammo'),null);assert.equal(events.length,1);
 const hydrated=createDailyCall({publish:()=>assert.fail('replayed receipt')});hydrated.reset(1);hydrated.update(state({receipt,callable:false}));
 assert.equal(hydrated.read().status,'picked');assert.deepEqual(hydrated.pick('medical'),receipt);
});

test('empty draw is frozen rather than rerolled, and alarm disables a stale offer',()=>{
 let draws=0;const c=createDailyCall({rng:()=>{draws++;return NaN;}});c.reset(1);c.update(state());c.update(state());
 assert.equal(draws,1);assert.equal(buildRadioCallView(c.read()).note,'Nothing to call in tonight.');
 const live=createDailyCall({rng:()=>.99,claim:r=>({...r,receiptId:'ok'})});live.reset(1);live.update(state());
 live.update(state({phase:'wave'}));assert.equal(live.pick('ammo'),null);live.update(state());assert.equal(live.pick('ammo'),null);
 live.reset(2);assert.equal(live.read().status,'down');assert.equal(live.pick('ammo'),null);
});

test('every card and relay state renders keyed player copy, including exact blueprint',()=>{
 for(const id of ['ammo','medical','hardware','intel','blackout']){
   const v=buildRadioCallView({status:'available',cards:[{id,enabled:true,blueprint:'light'}]});
   assert(v.cards[0].name);assert(v.cards[0].description);assert(!v.cards[0].description.includes('{'));
   if(id==='hardware')assert(v.cards[0].description.includes('Light turret'));
 }
 assert(buildRadioCallView({status:'down'}).note.includes('Relay down'));
 assert(buildRadioCallView({status:'closed'}).note.includes('before the alarm'));
 assert(buildRadioCallView({status:'picked',picked:'intel'}).note.includes('now available'));
 assert.equal(buildRadioCallView({status:'picked',picked:'medical'}).note,'Requested: Medical crate');
});


test('actual HQ adapter consumes the objective receipt, grants Intel once, and rejects closed or stale requests',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
 const {createObjectives}=await import('../game/objectives.js');
 const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('    // UI-owned modal adapter;'),source.indexOf('    // Sound the alarm: three klaxon blasts'));
 assert(code.includes('dailyRadioCall.pick'));
 const model=createObjectives(1),events=[];let receive;
 const ctx={createDailyCall:options=>createDailyCall({...options,rng:()=>0}),cheapestTurretBlueprint,restockRows,
   objectiveRuntime:{read:()=>model.snapshot(),snapshot:()=>model.snapshot(),beginRadioCall:r=>model.beginRadioCall(r)},
   uiRunId:1,day:2,phase:'prep',fieldIntelOwned:false,buildUnlocked:{},
   BUILD_UNLOCK_PRICE:{light:55,flame:75,heavy:110,mortar:120},hq:{seq:null},
   gameStarted:true,gameOver:false,won:false,paused:false,devNoZombies:false,
   getWaveDirectorState:()=>({day:ctx.day,phase:ctx.phase}),getWavePreview:()=>null,getBounties:()=>[],nearHQPanel:()=>true,
   publishPrepState:()=>model.setRadioDay({runId:ctx.uiRunId,day:ctx.day,phase:ctx.phase,alarm:!!ctx.hq.seq}),
   setPaused:v=>{ctx.paused=v;},publishUI:(type,details={})=>events.push({type,...details}),
   window:{addEventListener:(_,fn)=>{receive=fn;}},console};
 runInNewContext(code,ctx);
 ctx.openHQBriefing();assert.equal(events.at(-1).radioCall.status,'down');ctx.closeHQBriefing();
 model.update({runId:1,active:true,held:true,holdSeconds:6,targetId:'objective:radio-repair',
   sites:[{id:'objective:radio-repair',exists:true,discovered:true,reachable:true}]});
 ctx.openHQBriefing();assert(events.at(-1).radioCall.cards.some(c=>c.id==='intel'));
 const request={type:'radio-call-request',card:'intel',day:2,runId:1};
 receive({detail:{...request,runId:0}});assert.equal(ctx.fieldIntelOwned,false);
 receive({detail:request});assert.equal(ctx.fieldIntelOwned,true);
 assert.equal(events.at(-1).intelOwned,true);assert.equal(events.at(-1).radioCall.status,'picked');
 receive({detail:request});assert.equal(events.filter(e=>e.type==='radio-call').length,1);
 assert.equal(model.snapshot().radioCall.receipt.card,'intel');
 ctx.closeHQBriefing();ctx.day=3;ctx.openHQBriefing();
 assert(!events.at(-1).radioCall.cards.some(c=>c.id==='intel'));
 ctx.hq.seq={};receive({detail:{type:'alarm-started'}});
 receive({detail:{...request,day:3,card:'medical'}});
 assert.equal(events.filter(e=>e.type==='radio-call').length,1);
 model.reset(2);ctx.uiRunId=2;ctx.fieldIntelOwned=false;ctx.hq.seq=null;receive({detail:{type:'run-reset',runId:2}});
 ctx.openHQBriefing();assert.equal(events.at(-1).radioCall.status,'down');
});

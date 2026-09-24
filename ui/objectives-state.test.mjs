import test from 'node:test';
import assert from 'node:assert/strict';
import {createObjectives,OBJECTIVE_IDS} from '../game/objectives.js';
const radio='objective:radio-repair', ranger='objective:ranger-cache', med='objective:medical-convoy';
const pack={id:'556',kind:'ammo',quantity:60}, alternate={id:'9mm',kind:'ammo',quantity:90};
function frame(model,overrides={}) {
  return model.update({runId:'run',active:true,dt:.25,damageRevision:0,targetId:radio,held:false,
    sites:OBJECTIVE_IDS.map(id=>({id,exists:true,discovered:id===radio,reachable:true})),...overrides});
}
const site=(m,id)=>m.snapshot().sites.find(s=>s.id===id);
function open(m,id=ranger){frame(m,{sites:OBJECTIVE_IDS.map(key=>({id:key,exists:true,discovered:key===id,reachable:key===id}))});}
const deliver=(m,r,accepted)=>m.settleClaim({...r,accepted,remaining:r.quantity-accepted});

test('radio requires six continuous gameplay seconds and reveals without awarding inventory',()=>{
  const m=createObjectives('run');for(let i=0;i<23;i++)frame(m,{held:true});
  assert.equal(site(m,radio).state,'active');assert.equal(m.snapshot().revealed,false);
  frame(m,{held:true});assert.equal(site(m,radio).state,'ready-to-claim');assert(m.snapshot().revealed);
  assert(m.snapshot().sites.every(s=>s.state!=='undiscovered'));assert.equal(site(m,radio).pack,null);
  const r=m.beginClaim({id:radio,choiceId:pack.id,choices:[pack]});assert.equal(r.quantity,60);
  deliver(m,r,0);assert(m.snapshot().revealed);assert.equal(site(m,radio).feedback,'full');
});
test('release, damage, lost reach, modal/death pause, and missing prop interrupt radio',()=>{
  for(const stop of [{held:false},{damageRevision:1},{active:false},{targetId:null},{sites:[]},
    {sites:OBJECTIVE_IDS.map(id=>({id,exists:true,discovered:true,reachable:false}))}]){
    const m=createObjectives('run');frame(m,{held:true});frame(m,{held:true,...stop});
    assert.equal(site(m,radio).state,'available');assert.equal(site(m,radio).progress,0);
    assert.equal(site(m,radio).feedback,'interrupted');
  }
});
test('large/invalid dt cannot complete a repair instantly and stale run is ignored',()=>{
  const m=createObjectives('run');frame(m,{held:true,dt:100});assert.equal(site(m,radio).progress,.25);
  for(const dt of [NaN,-1,Infinity])frame(m,{held:true,dt});assert.equal(site(m,radio).progress,.25);
  const before=m.save();assert.equal(frame(m,{runId:'old',held:true}),false);assert.deepEqual(m.save(),before);
});
test('approved owner hold time drives repair and resets on owner cancellation',()=>{
  const m=createObjectives('run');frame(m,{held:true,holdSeconds:5.8});assert.equal(site(m,radio).progress,5.8);
  frame(m,{held:true,holdSeconds:0});assert.equal(site(m,radio).progress,0);
  frame(m,{held:true,holdSeconds:6});assert.equal(site(m,radio).state,'ready-to-claim');
});
test('undiscovered, unreachable, paused, and unrepaired radio cannot yield supplies',()=>{
  const m=createObjectives('run');frame(m);assert.equal(m.beginClaim({id:ranger,choiceId:pack.id,choices:[pack]}),null);
  assert.equal(m.beginClaim({id:radio,choiceId:pack.id,choices:[pack]}),null);
  open(m);frame(m,{active:false});assert.equal(m.beginClaim({id:ranger,choiceId:pack.id,choices:[pack]}),null);
});
test('zero delivery allows changing pack; positive partial fixes pack and prevents duplicate delivery',()=>{
  const m=createObjectives('run');open(m);
  const a=m.beginClaim({id:ranger,choiceId:pack.id,choices:[pack,alternate]});
  assert.deepEqual(m.beginClaim({id:ranger,choiceId:alternate.id,choices:[alternate]}),a);
  deliver(m,a,0);const b=m.beginClaim({id:ranger,choiceId:alternate.id,choices:[pack,alternate]});
  assert.equal(b.pack.id,alternate.id);assert.equal(b.quantity,90);deliver(m,b,40);
  assert.equal(deliver(m,b,40),false);
  const c=m.beginClaim({id:ranger,choiceId:pack.id,choices:[pack]});assert.equal(c.pack.id,alternate.id);assert.equal(c.quantity,50);
  deliver(m,c,50);assert.equal(site(m,ranger).state,'claimed');assert.equal(m.beginClaim({id:ranger}),null);
});
test('fixed supplies respect reported capacity and malformed acceptance cannot consume receipt',()=>{
  const m=createObjectives('run');open(m,med);const r=m.beginClaim({id:med});assert.equal(r.quantity,2);
  assert.equal(m.settleClaim({...r,accepted:3,remaining:0}),false);
  assert.equal(m.settleClaim({...r,accepted:.5,remaining:1.5}),false);
  assert.equal(m.settleClaim({...r,accepted:1,remaining:2}),false);
  assert(deliver(m,r,1));assert.equal(site(m,med).remaining,1);
  const last=m.beginClaim({id:med});deliver(m,last,1);assert.equal(site(m,med).state,'claimed');
});
test('fuel choices require fuel site, valid owned catalogue options and explicit selection',()=>{
  const m=createObjectives('run');open(m);const fuel={id:'saw',kind:'fuel',quantity:45};
  assert.equal(m.beginClaim({id:ranger,choiceId:'saw',choices:[fuel]}),null);
  assert.equal(m.beginClaim({id:ranger,choices:[pack]}),null);
  open(m,'objective:fuel-depot');assert.equal(m.beginClaim({id:'objective:fuel-depot',choiceId:'saw',choices:[fuel]}).quantity,45);
});
test('pending delivery survives atomic restore; old run and repeated receipts cannot grant again',()=>{
  const m=createObjectives('run');open(m);const a=m.beginClaim({id:ranger,choiceId:pack.id,choices:[pack]});
  const n=createObjectives('new');assert(n.restore(m.save()));open(n);assert.deepEqual(n.beginClaim({id:ranger}),a);
  assert(deliver(n,a,20));const restored=createObjectives('x');assert(restored.restore(n.save()));open(restored);
  assert.equal(deliver(restored,a,20),false);assert.equal(restored.beginClaim({id:ranger}).quantity,40);
  restored.reset('fresh');assert.equal(deliver(restored,a,20),false);assert.equal(site(restored,ranger).state,'undiscovered');
});
test('restore cancels hold, invalid blob is atomic, and caller data is detached',()=>{
  const m=createObjectives('run');frame(m,{held:true});const saved=m.save();assert(m.restore(saved));
  assert.equal(site(m,radio).progress,0);assert.equal(m.snapshot().active,false);
  saved.sites[0].state='claimed';assert.equal(site(m,radio).state,'available');
  const before=m.save(),bad=m.save();bad.sites[1].state='bogus';assert.equal(m.restore(bad),false);assert.deepEqual(m.save(),before);
});
test('removed props are unavailable and cannot resurrect on later owner snapshots',()=>{
  const m=createObjectives('run');open(m);const r=m.beginClaim({id:ranger,choiceId:pack.id,choices:[pack]});
  frame(m,{sites:[{id:ranger,exists:false}]});assert.equal(site(m,ranger).state,'unavailable');
  assert(deliver(m,r,30));open(m);assert.equal(site(m,ranger).state,'unavailable');assert.equal(m.beginClaim({id:ranger}),null);
});

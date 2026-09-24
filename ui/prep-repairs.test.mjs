import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrepRepairReader } from './prep-repairs.js';
import { createPrepChecklist } from './prep-checklist.js';

const target = (extra={}) => ({id:'wall@1,2:base:L0',type:'wall',hp:40,maxHp:100,cost:8,affordable:true,reachable:true,...extra});
const context = {runId:1,day:1,phase:'prep'};
const frame = repairs => ({...context,repairs,cash:40,skulls:0,ammo:[],canAlarm:true});

test('owner full-HP cost-zero snapshot ticks the selected repair goal',()=>{
  let row=target();const read=createPrepRepairReader({getTarget:()=>row,getSnapshot:()=>row});
  const checklist=createPrepChecklist();checklist.snapshot(frame(read(context)));
  assert.equal(checklist.read().goals[0].done,false);
  row=target({hp:100,cost:0});checklist.snapshot(frame(read(context)));
  assert.equal(checklist.read().goals[0].done,true);
  assert.equal(checklist.read().summary,'Prep 1/2');
});
test('removed target becomes unavailable and cannot be replaced by a reused cell ID',()=>{
  let row=target();const read=createPrepRepairReader({getTarget:()=>row,getSnapshot:()=>row});
  const checklist=createPrepChecklist();checklist.snapshot(frame(read(context)));
  row=null;checklist.snapshot(frame(read(context)));assert.equal(checklist.read().goals[0].unavailable,true);
  row=target({hp:100,cost:0});checklist.snapshot(frame(read(context)));
  assert.equal(checklist.read().goals[0].done,false);assert.deepEqual(read(context),[]);
});
test('selection is once per prep; moving aim or losing affordability does not shuffle it',()=>{
  let calls=0;const row=target();
  const read=createPrepRepairReader({getTarget:()=>{calls++;return row;},getSnapshot:id=>{assert.equal(id,row.id);return {...row,reachable:false,affordable:false};}});
  assert.equal(read(context)[0].id,row.id);assert.equal(read(context)[0].reachable,false);
  assert.equal(calls,1);assert.deepEqual(read({...context,phase:'wave'}),[]);assert.equal(calls,1);
  read({...context,day:2});assert.equal(calls,2);read({...context,runId:2});assert.equal(calls,3);
});
test('unaffordable, full, unknown and unreachable targets stay out of this prep',()=>{
  for(const overrides of [{affordable:false},{reachable:false},{hp:100,cost:0},{type:'missing'},{hp:NaN},{cost:-1}]) {
    let calls=0;const read=createPrepRepairReader({getTarget:()=>target(overrides),getSnapshot:()=>{calls++;return target();}});
    assert.deepEqual(read(context),[]);assert.deepEqual(read(context),[]);assert.equal(calls,0);
  }
});
test('completion tolerance matches owner repair targeting, with no premature tick',()=>{
  let row=target();const read=createPrepRepairReader({getTarget:()=>row,getSnapshot:()=>row});
  const checklist=createPrepChecklist();checklist.snapshot(frame(read(context)));
  row=target({hp:99.49,cost:1});checklist.snapshot(frame(read(context)));assert.equal(checklist.read().goals[0].done,false);
  row=target({hp:99.5,cost:0});checklist.snapshot(frame(read(context)));assert.equal(checklist.read().goals[0].done,true);
});

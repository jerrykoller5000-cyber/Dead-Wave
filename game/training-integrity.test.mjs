import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrainingIntegrity} from './training-integrity.js';
const devices=[{id:'strip1',kind:'light'},{id:'armory',kind:'terminal'},
  {id:'hq',kind:'terminal',hasCover:true},{id:'bank',kind:'terminal',hasCover:true}];

test('a damaging hit disables one device once; duplicate pellets cannot replay destruction',()=>{
 const destroyed=[],changed=[],c=createTrainingIntegrity(devices,{onDestroyed:(...v)=>destroyed.push(v),onChange:(...v)=>changed.push(v)});
 assert(c.canUse('armory'));assert.equal(c.damage('armory',24),'destroyed');
 for(let i=0;i<18;i++)assert.equal(c.damage('armory',3.5),'wrecked');
 assert(!c.canUse('armory'));assert.deepEqual(destroyed,[['armory','terminal']]);assert.deepEqual(changed,[['armory','destroyed']]);
 assert(c.intact('strip1'));assert.equal(c.damage('strip1',1),'destroyed');assert(!c.intact('strip1'));assert(!c.canUse('strip1'));
 assert(c.canUse('hq'));
});

test('alarm cover travel gates deployment and controls, then reopens after the alarm',()=>{
 const c=createTrainingIntegrity(devices);assert(!c.deploymentReady());assert(c.setAlarm(true));assert(!c.setAlarm(true));
 assert(!c.canUse('hq'));assert(c.canUse('armory'));c.update(.25);assert.equal(c.cover('hq'),.5);assert(!c.deploymentReady());
 c.update(.25);assert.equal(c.cover('hq'),1);assert(c.deploymentReady());
 c.setAlarm(false);assert(!c.deploymentReady());assert(!c.canUse('hq'));c.update(.25);assert(!c.canUse('hq'));c.update(.25);assert(c.canUse('hq'));
});

test('an obstructed physical cover stops and prevents deployment while other covers can finish',()=>{
 const events=[],c=createTrainingIntegrity(devices,{onChange:(...v)=>events.push(v)});c.setAlarm(true);
 const blocked=(id,from,to)=>id!=='hq'||to<=.4;
 for(let i=0;i<6;i++)c.update(.1,blocked);
 assert.equal(c.cover('hq'),.4);assert.equal(c.cover('bank'),1);assert(!c.deploymentReady());
 assert.equal(events.filter(([id,e])=>id==='hq'&&e==='blocked').length,1,'one obstruction does not spam events');
 c.update(.3);assert.equal(c.cover('hq'),1);assert(c.deploymentReady());
 assert(events.some(([id,e])=>id==='hq'&&e==='clear'));
});

test('only a real cover hit protects the terminal; closed cover state creates no invisible immunity',()=>{
 const c=createTrainingIntegrity(devices);c.setAlarm(true);c.update(1);
 assert.equal(c.damage('hq',100,'cover'),'cover');assert(c.intact('hq'));
 assert.equal(c.damage('hq',100,'device'),'destroyed','a valid unoccluded hit through another path still damages');
 assert.equal(c.damage('armory',100,'cover'),'ignored','unshielded terminals cannot acquire an imaginary cover');
 assert(c.intact('armory'));
});

test('re-entry restores all equipment, covers and usability without replaying damage effects',()=>{
 const destroyed=[],c=createTrainingIntegrity(devices,{onDestroyed:id=>destroyed.push(id)});
 c.damage('strip1',1);c.damage('hq',1);c.setAlarm(true);c.update(1,()=>false);c.reset();
 assert.deepEqual(c.snapshot(),createTrainingIntegrity(devices).snapshot());assert.deepEqual(destroyed,['strip1','hq']);
 assert.equal(c.damage('hq',1),'destroyed','a new visit may break the same device again');assert.deepEqual(destroyed,['strip1','hq','hq']);
});

test('invalid damage, unknown ids and invalid time never change the room',()=>{
 const c=createTrainingIntegrity(devices),before=c.snapshot();
 for(const n of [0,-1,NaN,Infinity])assert.equal(c.damage('hq',n),'ignored');
 assert.equal(c.damage('absent',1),'missing');assert.equal(c.damage('hq',1,'unknown'),'ignored');
 for(const dt of [0,-1,NaN,Infinity])assert.equal(c.update(dt),false);
 assert.deepEqual(c.snapshot(),before);assert(!c.canUse('absent'));
});

test('cover timing is independent of frame partitions and never overshoots',()=>{
 for(const rate of [30,60,120]){
  const c=createTrainingIntegrity(devices);c.setAlarm(true);for(let i=0;i<rate/2;i++)c.update(1/rate);
  assert.equal(c.cover('hq'),1);assert(c.deploymentReady(),'deployment is ready at the stated travel time');
  c.setAlarm(false);c.update(5);assert.equal(c.cover('hq'),0);assert(c.canUse('hq'));
 }
});

test('ids cannot alias different pieces of equipment and snapshots cannot mutate live state',()=>{
 assert.throws(()=>createTrainingIntegrity([{id:'x',kind:'light'},{id:'x',kind:'terminal'}]),/Unique/);
 assert.throws(()=>createTrainingIntegrity([{id:'door',kind:'utility'}]),/Only Training/);
 assert.throws(()=>createTrainingIntegrity([{id:'light',kind:'light',hasCover:true}]),/Only terminals/);
 assert.throws(()=>createTrainingIntegrity(devices,{coverSeconds:0}),/Positive/);
 const c=createTrainingIntegrity(devices);c.snapshot().devices[0].intact=false;assert(c.intact('strip1'));
});

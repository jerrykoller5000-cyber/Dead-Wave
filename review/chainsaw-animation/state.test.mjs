import test from 'node:test';
import assert from 'node:assert/strict';
import {createSawStart,stepSawStart,sawStartPose} from '../../game/chainsaw-animation.js';
const equipped={equipped:true};
test('one complete pull per draw and no repeated starts while holding',()=>{
  const s=createSawStart();stepSawStart(s,1/60,equipped);
  let peak=0;
  for(let i=0;i<240;i++){stepSawStart(s,1/60,equipped);peak=Math.max(peak,sawStartPose(s).cord);}
  assert.equal(s.phase,'ready');assert.equal(s.starts,1);assert(peak>.99);
  assert.deepEqual(sawStartPose(s),{take:0,cord:0});
});
test('pause freezes start and resumes the same pull',()=>{
  const s=createSawStart();stepSawStart(s,0,equipped);stepSawStart(s,.1,equipped);
  const frozen={...s};for(let i=0;i<100;i++)stepSawStart(s,.1,{...equipped,suspended:true});
  assert.deepEqual(s,frozen);stepSawStart(s,.1,equipped);assert(s.t>frozen.t);assert.equal(s.starts,1);
});
test('switch/holster/death or unavailable fuel cancels; next eligible draw starts fresh',()=>{
  for(const why of [{equipped:false},{equipped:true,available:false}]){
    const s=createSawStart();stepSawStart(s,0,equipped);stepSawStart(s,.1,equipped);
    stepSawStart(s,.1,why);assert.equal(s.phase,'off');assert.equal(s.t,0);
    assert.deepEqual(sawStartPose(s),{take:0,cord:0});
    stepSawStart(s,.1,equipped);assert.equal(s.phase,'starting');assert.equal(s.t,0);assert.equal(s.starts,2);
  }
});
test('pose stays continuous and within bounds at all phase boundaries',()=>{
  const s=createSawStart();s.phase='starting';
  for(const t of [.22,.48,.67,1.02]){
    s.t=t-1e-6;const a=sawStartPose(s);s.t=t+1e-6;const b=sawStartPose(s);
    assert(Math.abs(a.take-b.take)<.0001);assert(Math.abs(a.cord-b.cord)<.0001);
  }
});

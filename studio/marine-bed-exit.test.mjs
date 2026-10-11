import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleBedExit,BED_EXIT_SECONDS} from './marine-bed-exit.js';
const bed={x:-39.87,y:-199.32,z:-650,yaw:Math.PI/2,stand:{x:-40.25,z:-648.7,yaw:0}},floor=-200;
test('recovery progresses from lying through sit, side swing, foot plant and upright',()=>{
 const lie=sampleBedExit(1,bed,floor),sit=sampleBedExit(2.25,bed,floor),side=sampleBedExit(3.15,bed,floor),plant=sampleBedExit(3.75,bed,floor),end=sampleBedExit(BED_EXIT_SECONDS,bed,floor);
 assert.equal(lie.pitch,-Math.PI/2);assert.equal(sit.pitch,0);assert(sit.thigh<-1.4);assert.equal(side.yaw,bed.stand.yaw);assert(side.knee>1.3);
 assert(plant.hip.z>side.hip.z);assert(plant.hip.y<side.hip.y);assert.equal(end.hip.x,bed.stand.x);assert.equal(end.hip.z,bed.stand.z);assert.equal(end.hip.y,floor+.62);assert.equal(end.thigh,0);assert.equal(end.knee,0);assert(end.done);
});
test('no root, facing or joint discontinuity at any phase boundary',()=>{
 for(const t of [1.35,2.25,3.15,3.75,4.65,5]){
  const a=sampleBedExit(t-.0001,bed,floor),b=sampleBedExit(t+.0001,bed,floor);
  for(const k of ['pitch','yaw','thigh','knee','ankle'])assert(Math.abs(a[k]-b[k])<.003,k+' at '+t);
  assert(Math.hypot(a.hip.x-b.hip.x,a.hip.y-b.hip.y,a.hip.z-b.hip.z)<.001);
 }
});
test('boots remain planted while the pelvis rises over them',()=>{
 for(let t=3.75;t<=4.65;t+=.03){
  const p=sampleBedExit(t,bed,floor);
  const ankleY=p.hip.y-.27*Math.cos(p.thigh)-.25*Math.cos(p.thigh+p.knee);
  const ankleZ=p.hip.z-.27*Math.sin(p.thigh)-.25*Math.sin(p.thigh+p.knee);
  assert(Math.abs(ankleY-(floor+.10))<.001);assert(Math.abs(ankleZ-(bed.stand.z+.01))<.001);
 }
});
test('clamps late/hitched sampling to the final standing pose',()=>{
 assert.deepEqual({...sampleBedExit(50,bed,floor),t:5},sampleBedExit(5,bed,floor));
 assert.equal(sampleBedExit(-3,bed,floor).t,0);
});

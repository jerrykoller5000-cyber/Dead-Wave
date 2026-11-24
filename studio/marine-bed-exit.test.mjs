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
test('the current player keeps his boot planted through standing and the handoff to gameplay',()=>{
 const leg={hipY:.785,thigh:.355,shin:.33,ankleZ:.01};
 for(let frame=225;frame<=300;frame++){
  const p=sampleBedExit(frame/60,bed,floor,leg), bend=p.thigh+p.knee;
  const y=p.hip.y-leg.thigh*Math.cos(p.thigh)-leg.shin*Math.cos(bend)-leg.ankleZ*Math.sin(bend);
  const z=p.hip.z-leg.thigh*Math.sin(p.thigh)-leg.shin*Math.sin(bend)+leg.ankleZ*Math.cos(bend);
  assert(Math.abs(y-(floor+leg.hipY-leg.thigh-leg.shin))<.0002,'vertical plant at frame '+frame);
  assert(Math.abs(z-(bed.stand.z+leg.ankleZ))<.0002,'horizontal plant at frame '+frame);
 }
 const end=sampleBedExit(5,bed,floor,leg);
 assert.equal(end.hip.y,floor+leg.hipY);assert.equal(end.knee,0);assert.equal(end.thigh,0);
});

test('both fitted heel corners clear the mattress through the seated turn',()=>{
 const pad={x:.98,y:.68,z:0,yaw:Math.PI/2,stand:{x:.60,z:1.30,yaw:0}};
 const leg={hipY:.785,thigh:.355,shin:.33,ankleZ:.01,recline:.55};
 let nearest=Infinity;
 for(let frame=0;frame<=225;frame++){
  const p=sampleBedExit(frame/60,pad,0,leg),thigh=p.pitch+p.thigh,shin=thigh+p.knee,foot=shin+p.ankle;
  // Heel corners measured on both fitted boots, in the ankle joint's local frame.
  const y=p.hip.y-leg.thigh*Math.cos(thigh)-leg.shin*Math.cos(shin)-leg.ankleZ*Math.sin(shin)
    -.103*Math.cos(foot)+.103*Math.sin(foot);
  const z=-leg.thigh*Math.sin(thigh)-leg.shin*Math.sin(shin)+leg.ankleZ*Math.cos(shin)
    -.103*Math.sin(foot)-.103*Math.cos(foot);
  for(const side of [-1,1])for(const corner of [-.03978,.03978]){
   const x=side*.1053+corner;
   const wx=p.hip.x+x*Math.cos(p.yaw)+z*Math.sin(p.yaw);
   const wz=p.hip.z-x*Math.sin(p.yaw)+z*Math.cos(p.yaw);
   if(Math.abs(wx)>1 || Math.abs(wz)>.47)continue;
   nearest=Math.min(nearest,y-pad.y);
   assert(y>=pad.y-.0002,'heel below mattress at frame '+frame);
  }
 }
 assert(nearest<.002,'his heels take weight on the pad before he swings off it');
});

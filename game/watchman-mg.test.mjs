import test from 'node:test';
import assert from 'node:assert/strict';
import {WATCHMAN,createWatchman,stepWatchman,watchmanPose,watchmanLeg,watchmanCarry} from './watchman-mg.js';
const O={x:0,y:0.84,z:0};
test('cursor over the gun or operator never flips the last bearing',()=>{
  const s=createWatchman(.7);
  for(const t of [{x:0,y:0,z:0},{x:.01,y:0,z:-.1},{x:-.3,y:0,z:.4}])stepWatchman(s,O,t,1/60);
  assert.equal(s.yaw,.7);assert.equal(s.pitch,0);
});
test('traverse takes the short path across the angle seam and remains within the cradle arc',()=>{
  const s=createWatchman(Math.PI-.02);
  for(let i=0;i<120;i++)stepWatchman(s,O,{x:-.5,y:1,z:-20},1/60);
  assert(Math.abs(s.yaw-(Math.PI+.025))<.002);
  const b=createWatchman(0);
  for(let i=0;i<120;i++)stepWatchman(b,O,{x:1,y:1,z:-20},1/60);
  assert(b.limited);assert(Math.abs(b.yaw-WATCHMAN.swing)<.001);
});
test('bearing settles consistently at 30, 60 and 120 fps without instantaneous traverse',()=>{
  const ys=[];
  for(const fps of [30,60,120]){const s=createWatchman();stepWatchman(s,O,{x:20,y:3,z:20},1/fps);assert(s.yaw<=5/fps);for(let i=1;i<fps;i++)stepWatchman(s,O,{x:20,y:3,z:20},1/fps);ys.push(s.yaw);}
  assert(Math.max(...ys)-Math.min(...ys)<.001);
});
test('elevation stays within the real gun articulation',()=>{
  for(const y of [-1000,1000]){const s=createWatchman();for(let i=0;i<120;i++)stepWatchman(s,O,{x:0,y,z:10},1/60);assert(s.pitch>=WATCHMAN.minPitch&&s.pitch<=WATCHMAN.maxPitch);}
});
test('mount, recoil and belt change have continuous, distinct motion',()=>{
  const s=createWatchman();assert.equal(watchmanPose(s).weight,0);
  s.age=WATCHMAN.mountS/2;assert.equal(watchmanPose(s).weight,.5);
  s.age=WATCHMAN.mountS;s.kick=WATCHMAN.kickS;assert.equal(watchmanPose(s).weight,1);assert.equal(watchmanPose(s).kick,1);
  stepWatchman(s,O,O,.05);assert(watchmanPose(s).kick<1);
  assert(watchmanPose(s,1.6).feed>.99);assert(watchmanPose(s,.45).charge>.5);
});
test('braced legs land their ankle targets and keep the soles level',()=>{
  for(const drop of [0,.04,.10,.16])for(const stanceZ of [-.06,.10]){
    const z=stanceZ*drop/.16;
    const hip=.62-drop,f=.104,r=watchmanLeg(hip,f,z);
    const y=hip-.27*Math.cos(r.thigh)-.25*Math.cos(r.thigh+r.knee);
    const actualZ=-.27*Math.sin(r.thigh)-.25*Math.sin(r.thigh+r.knee);
    assert(Math.abs(y-f)<.002);assert(Math.abs(actualZ-z)<.002);assert(Math.abs(r.thigh+r.knee+r.ankle)<1e-8);
  }
});
test('the folded gun rises onto the shoulder and the support hand releases after the lift',()=>{
  const a=watchmanCarry(0),b=watchmanCarry(WATCHMAN.carryS/2),c=watchmanCarry(2);
  assert(a.y<b.y&&b.y<c.y);assert(a.pitch<b.pitch&&b.pitch<c.pitch);
  assert.equal(a.support,1);assert.equal(c.support,0);assert.equal(c.weight,1);
});

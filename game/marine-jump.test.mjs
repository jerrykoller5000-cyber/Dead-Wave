import test from 'node:test';
import assert from 'node:assert/strict';
import {createJumpState,stepJump,landJump,jumpPose,JUMP_FEEL,resetJump} from './marine-jump.js';
const standing={grounded:true,canJump:true};
test('a press loads the legs before launch and holding does not requeue',()=>{
 const s=createJumpState();assert.equal(stepJump(s,.01,{...standing,pressed:true}),false);
 let launches=0;for(let i=0;i<100;i++)if(stepJump(s,.01,standing))launches++;
 assert.equal(launches,1);assert.equal(s.launches,1);
});
test('landing recovery blocks rapid presses, then honors one fresh queued press',()=>{
 const s=createJumpState();landJump(s,8);const recovery=s.recover;
 assert.equal(stepJump(s,.01,{...standing,pressed:true}),false);
 for(let t=.01;t<recovery-.02;t+=.01)assert.equal(stepJump(s,.01,standing),false);
 let launches=0;for(let i=0;i<30;i++)if(stepJump(s,.01,standing))launches++;
 assert.equal(launches,1);assert.equal(s.buffer,0);
});
test('early air press buffers until near landing but a stale air press expires',()=>{
 const s=createJumpState();stepJump(s,.01,{pressed:true,grounded:false});
 stepJump(s,.04,{grounded:false});landJump(s,7);
 let launches=0;for(let i=0;i<60;i++)if(stepJump(s,.01,standing))launches++;
 assert.equal(launches,1);
 const old=createJumpState();stepJump(old,.01,{pressed:true,grounded:false});stepJump(old,.2,{grounded:false});landJump(old,7);
 for(let i=0;i<60;i++)assert.equal(stepJump(old,.01,standing),false);
});
test('disabled actions and loss of coyote footing cancel preparation',()=>{
 const s=createJumpState();stepJump(s,.01,{...standing,pressed:true});assert(s.prepare>0);
 stepJump(s,.01,{grounded:false,canJump:false});assert.equal(s.prepare,0);
 stepJump(s,.01,{...standing,pressed:true});stepJump(s,.01,{...standing,enabled:false});assert.equal(s.prepare,0);assert.equal(s.buffer,0);
});
test('a short press launches after loading even if released during preparation',()=>{
 const s=createJumpState();stepJump(s,.01,{...standing,pressed:true});let launched=false;
 for(let i=0;i<15;i++)launched=stepJump(s,.01,standing)||launched;
 assert(launched);assert.equal(JUMP_FEEL.minRise,.08);
});
test('knees compact near apex and extend for touchdown; no exaggerated leg split',()=>{
 const s=createJumpState(),up=jumpPose(s,7.9),top=jumpPose(s,0),down=jumpPose(s,-7.9);
 assert(top.knee>up.knee+.4);assert.deepEqual(up,down);assert(top.knee<.8);assert(top.thigh>-.1);
});
test('landing compression is continuous, peaks early and settles with stronger hard falls',()=>{
 const a=createJumpState(),b=createJumpState();landJump(a,4);landJump(b,14);
 assert.equal(jumpPose(a,0).land,0);assert(b.recover>a.recover);assert(b.strength>a.strength);
 a.landAge=.2*a.landDuration;const peak=jumpPose(a,0).land;assert.equal(peak,a.strength);
 a.landAge=.75*a.landDuration;assert(jumpPose(a,0).land<peak);
 a.landAge=a.landDuration;assert.equal(jumpPose(a,0).land,0);resetJump(a);assert.equal(a.recover,0);assert.equal(a.prepare,0);
});
test('push-off duration and landing envelope agree at 30/60/144Hz',()=>{
 for(const hz of [30,60,144]){const s=createJumpState(),dt=1/hz;stepJump(s,dt,{...standing,pressed:true});let elapsed=0;
 while(elapsed<.3){elapsed+=dt;if(stepJump(s,dt,standing))break;}
 assert(elapsed>=JUMP_FEEL.prepare-1e-8&&elapsed<JUMP_FEEL.prepare+dt+.00001);
 landJump(s,8);stepJump(s,.1,standing);const v=jumpPose(s,0).land;assert(v>.6&&v<=s.strength);
 }
});

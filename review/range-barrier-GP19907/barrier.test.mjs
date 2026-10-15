import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../../tools/tests/fakethree.mjs';
import {buildTrainingGround,clampToRects,fallSign} from './training.js';import {traceTraining} from './training-ballistics.js';
import {FIRING_LINE} from './firing-line.js';
const tg=buildTrainingGround(T),O=tg.origin,world=(x,y,z)=>({x:O.x+x,y:O.y+y,z:O.z+z});
test('bench and overhead fence seal both wall ends; the shot slot is truly open',()=>{
 const bench=tg.solids.find(s=>s.firingLine&&!s.firingFence&&!s.firingFrame),fence=tg.solids.find(s=>s.firingFence);
 for(const s of [bench,fence]){assert.equal(s.minX,O.x-8);assert.equal(s.maxX,O.x+8);}
 assert.equal(bench.maxY,O.y+FIRING_LINE.top);assert.equal(fence.minY,O.y+FIRING_LINE.gapTop);
 for(const x of [6,3,0,-3,-6]){const hit=traceTraining(tg,world(x,1.6,-.61),world(x,1.6,29));assert.notEqual(hit?.solid.target,null);assert.equal(hit.solid.target,[6,3,0,-3,-6].indexOf(x));}
});
test('permanent containment stops runs, airborne crossings and wall-end bypasses without a scoring foul',()=>{
 for(let x=-7.5;x<=7;x+=.25)for(const z of [.1,.9,3,29]){const q=clampToRects(tg.walk,O.x+x,O.z+z);assert(q.moved);assert(q.z<=O.z+FIRING_LINE.front-.42+.00001||q.x<O.x-8,'a point returns to the shooter side or adjacent build room, never the target floor');}
 assert.equal(clampToRects(tg.walk,tg.spawn.x,tg.spawn.z).moved,false);
 assert.equal(clampToRects(tg.walk,O.x-8,O.z-8).moved,false,'build-room doorway remains open');
});
test('the shooting slot has no support posts obstructing cross-lane fire',()=>{
 for(const from of [-6,-3,0,3,6])for(const target of tg.targets){
  const hit=traceTraining(tg,world(from,1.1,-.61),world(target.x,1.6,target.z));
  assert.equal(hit?.solid.target,tg.targets.indexOf(target),'clear from lane '+from+' to target '+target.x);
 }
});
test('fixture geometry is bounded to the line and below the range ceiling',()=>{
 const group=tg.group.getObjectByName('training-firing-bench'),box=new T.Box3().setFromObject(group);
 assert(box.min.x>=O.x-8.13&&box.max.x<=O.x+8.13);assert(box.min.z>=O.z+.15&&box.max.z<=O.z+.89);assert(box.min.y>=O.y-.001&&box.max.y<=O.y+6.001);
});
test('low shots hit the bench; high shots hit the upper fence; camera aiming sees through the upper mesh',()=>{
 assert(traceTraining(tg,world(0,.5,-2),world(0,.5,3)).solid.firingLine);
 const a=world(0,3,-2),b=world(0,3,3);assert(traceTraining(tg,a,b).solid.firingFence);assert.equal(traceTraining(tg,a,b,{throughGlass:true}),null);
 assert(traceTraining(tg,world(0,3,-2),world(0,1.6,tg.targets[2].z),{throughGlass:true}).solid.target===2);
});
test('rear-origin strikes and blast direction keep the plate falling toward the firing line',()=>{
 const i=2,t=tg.targets[i],rear=world(0,1.6,t.z+3);const hit=traceTraining(tg,rear,world(0,1.6,t.z-1));assert.equal(hit.solid.target,i);
 assert.equal(fallSign(rear.z,O.z,t.z),-1);assert(tg.hitTarget(i,fallSign(rear.z,O.z,t.z)));tg.update(.05);assert(t.pivot.rotation.x<0);
});
test.after(()=>tg.dispose());

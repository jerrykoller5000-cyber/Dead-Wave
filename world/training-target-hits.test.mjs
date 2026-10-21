import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingMeleeHits,trainingBlastHits} from './training-target-hits.js';
function room(){const targets=[0,1,2].map(i=>({state:'up',box:{minX:-.32,maxX:.32,minY:.66,maxY:1.78,minZ:2+i*3,maxZ:2.14+i*3}}));return {floorY:0,origin:{x:0,z:0},targets,solids:targets.map((t,i)=>({...t.box,target:i}))};}
test('melee uses plate reach, facing and height; misses behind and out of reach',()=>{
 const tg=room(),p={x:0,y:.9,z:.6},f={x:0,z:1};
 assert.deepEqual(trainingMeleeHits(tg,p,f,1.5,.4).map(h=>h.index),[0]);
 assert.equal(trainingMeleeHits(tg,p,{x:0,z:-1},1.5,.4).length,0);
 assert.equal(trainingMeleeHits(tg,p,f,1.3,.4).length,0);
 assert.equal(trainingMeleeHits(tg,{...p,y:4},f,1.5,.4).length,0);
});
test('down/rising plates do not score and nearest plates respect hit limits',()=>{
 const tg=room();tg.targets[0].state='down';tg.targets[1].state='rising';
 assert.equal(trainingMeleeHits(tg,{x:0,y:1,z:0},{x:0,z:1},10,0).length,1);
 tg.targets[0].state='up';tg.targets[1].state='up';
 // Offset plates so the nearer one does not occlude the farther one.
 tg.targets.forEach((t,i)=>{t.box.minX+=i;t.box.maxX+=i;});tg.solids=tg.targets.map((t,i)=>({...t.box,target:i}));
 assert.equal(trainingMeleeHits(tg,{x:-3,y:1,z:0},{x:1,z:1},20,0,1).length,1);
 assert.equal(trainingMeleeHits(tg,{x:-3,y:1,z:0},{x:1,z:1},20,0,0).length,0);
});
test('blast tests three-dimensional distance to steel and can topple multiple plates',()=>{
 const tg=room(),p={x:2,y:.2,z:3.5};
 assert.deepEqual(trainingBlastHits(tg,p,3).map(h=>h.index),[0,1]);
 assert.equal(trainingBlastHits(tg,{...p,y:10},3).length,0);
 tg.targets[0].state='falling';assert.deepEqual(trainingBlastHits(tg,p,3).map(h=>h.index),[1]);
});
test('walls block both blades and grenade shockwaves',()=>{
 const tg=room();tg.solids.push({minX:-5,maxX:5,minY:0,maxY:5,minZ:1,maxZ:1.2});
 assert.equal(trainingMeleeHits(tg,{x:0,y:.9,z:0},{x:0,z:1},10,0).length,0);
 assert.equal(trainingBlastHits(tg,{x:0,y:.2,z:0},10).length,0);
});

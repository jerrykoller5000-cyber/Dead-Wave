import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingStationShoulder} from '../../game/training-camera-collision.js';

test('the station shoulder starts before the collision envelope and moves continuously',()=>{
  const directions=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [nx,nz] of directions){
    const station={x:0,y:0,z:0,front:{x:nx*.6,z:nz*.6}};
    let last=null,maxStep=0;
    for(let i=90;i>=0;i--){
      const d=i*.1;
      const head={x:station.front.x+nx*d,y:1.6,z:station.front.z+nz*d};
      const eye={x:head.x+nx*8,y:head.y+7,z:head.z+nz*8};
      const look={x:head.x,y:1.3,z:head.z};
      const chosen=trainingStationShoulder(head,eye,look,{station},()=>{});
      if(d>=8.5)assert.equal(chosen,null);
      if(d<=3.8)assert.equal(chosen,station);
      if(last)maxStep=Math.max(maxStep,Math.hypot(eye.x-last.x,eye.y-last.y,eye.z-last.z));
      last={...eye};
    }
    assert.ok(maxStep<.55,`${nx},${nz}: ${maxStep.toFixed(3)} m step`);
  }
});

test('the station shoulder only selects an approach from its front',()=>{
  const station={x:0,y:0,z:0,front:{x:.6,z:0}};
  const head={x:-1,y:1.6,z:0},eye={x:-2,y:2,z:0},look={x:0,y:0,z:0};
  assert.equal(trainingStationShoulder(head,eye,look,{station},()=>{}),null);
});

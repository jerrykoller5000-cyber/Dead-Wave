import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingCloseFraming,trainingStationShoulder} from '../../game/training-camera-collision.js';

const station={x:-7.98,y:0,z:-644.6,front:{x:-6.5245,z:-644.6}};
const sample=(x,z)=>{
  const head={x,y:1.6,z},eye={x:x+2,y:2.5,z:z+.5},look={x:x-2,y:1.5,z};
  const selected=trainingStationShoulder(head,eye,look,{rangeConsole:station},()=>{}, {x:1,z:0});
  return {selected,eye,look};
};

test('a corridor walker outside the station face keeps the ordinary camera',()=>{
  const r=sample(-6.2,-642);
  assert.equal(r.selected,null);
  assert.deepEqual(r.look,{x:-8.2,y:1.5,z:-642});
});

test('the shoulder remains at the console and fades smoothly across its face',()=>{
  const centre=sample(station.front.x,station.front.z);
  assert.equal(centre.selected,station);
  let last=null,maxStep=0;
  for(let z=-644.6;z<=-642.2;z+=.025){
    const r=sample(-6.2,z);
    const displacement=Math.hypot(r.look.x-(-8.2),r.look.z-z);
    if(last!==null)maxStep=Math.max(maxStep,Math.abs(displacement-last));
    last=displacement;
  }
  assert.ok(maxStep<.1,`blend moved ${maxStep.toFixed(3)}m in one 2.5cm step`);
  assert.equal(sample(-6.2,-642.2).selected,null);
});

test('a close collision eye drops beside the marine and stays clear',()=>{
  const head={x:0,y:1.6,z:0},eye={x:-1.35,y:2.95,z:0},look={x:3.5,y:1.75,z:0};
  let pulled=false;
  trainingCloseFraming(head,eye,look,{x:1,z:0},()=>{pulled=true;});
  assert.ok(eye.y<2.1,`eye height ${eye.y.toFixed(3)}`);
  assert.ok(pulled,'recheck collision after moving the eye');
});

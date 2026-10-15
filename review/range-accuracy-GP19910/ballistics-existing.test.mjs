import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../tools/tests/fakethree.mjs';
import {buildTrainingGround,TRAINING} from '../../world/training.js';
import {traceTraining,trainingFloorHit} from './ballistics.js';
test('all five target centres are hittable from firing line and targets down let shots through',()=>{
  const tg=buildTrainingGround(T),o=tg.origin;
  for(let i=0;i<5;i++){
    const target=tg.targets[i],a={x:o.x+target.x,y:o.y+1.35,z:o.z-1},b={x:o.x+target.x,y:o.y+1.22,z:o.z+target.z+1};
    assert.equal(traceTraining(tg,a,b).solid.target,i);
    tg.hitTarget(i);assert.equal(traceTraining(tg,a,b),null);
  }
});
test('level and upward training rays never latch onto the distant outdoor terrain',()=>{
  const tg=buildTrainingGround(T),a={x:1,y:-198.65,z:-641};
  assert.equal(trainingFloorHit(tg,a,{x:0,y:0,z:1}),null);
  assert.equal(trainingFloorHit(tg,a,{x:0,y:.01,z:1}),null);
  assert.equal(trainingFloorHit(tg,a,{x:0,y:-.001,z:1}),null);
  const hit=traceTraining(tg,a,{x:1,y:-198,z:-600});
  assert(hit.solid.backstop);assert.equal(hit.normal.z,-1);
});
test('floor and side walls win over surfaces beyond them; mark normals face the shooter',()=>{
  const tg=buildTrainingGround(T);
  const floor=traceTraining(tg,{x:1,y:-199,z:-645},{x:1,y:-201,z:-642});
  assert(floor.solid.floor);assert.equal(floor.point.y,-200);assert.equal(floor.normal.y,1);
  const wall=traceTraining(tg,{x:0,y:-198,z:-641},{x:20,y:-198,z:-641});
  assert(wall.solid.wall);assert.equal(wall.normal.x,-1);
  assert.equal(traceTraining(tg,{x:0,y:-199,z:-645},{x:0,y:-198,z:-644}),null);
});
test('the camera ray looks through the near wall and aims at the floor; a round from inside still hits that wall',()=>{
  const tg=buildTrainingGround(T),o=tg.origin,B=TRAINING.BUILD;
  // The hangar wall is 24 m. A high camera outside it, like the overhead view, hits that
  // glass before the floor. The aim ray goes on; a round fired back at it does not.
  const cam={x:o.x+(B.minX+B.maxX)/2,y:o.y+10,z:o.z+B.minZ-4};
  const floor={x:cam.x,y:o.y,z:o.z+4};
  assert.equal(traceTraining(tg,cam,floor).solid.wall,true);
  const aim=traceTraining(tg,cam,floor,{throughGlass:true});
  assert.equal(aim.solid.floor,true);
  assert.equal(aim.point.y,o.y);
  const back=traceTraining(tg,{x:cam.x,y:o.y+1.4,z:o.z},{x:cam.x,y:o.y+1.4,z:o.z+B.minZ-2},{throughGlass:true});
  assert.equal(back.solid.wall,true);
  const lane=tg.targets[2];
  const low={x:o.x,y:o.y+2,z:o.z+TRAINING.RANGE.minZ-3};
  const plate=traceTraining(tg,low,{x:o.x+lane.x,y:o.y+1.3,z:o.z+lane.z},{throughGlass:true});
  assert.equal(plate.solid.target,2);
});

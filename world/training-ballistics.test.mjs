import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import {buildTrainingGround,TRAINING} from './training.js';
import {traceTraining,trainingFloorHit,createTrainingImpacts,createTrainingChar,CHAR_LIFE,IMPACT_LIFE} from './training-ballistics.js';
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
test('GP-19910: a round meets a target on its drawn plate, not the front of its box, and the mark faces the side it came from',()=>{
  const tg=buildTrainingGround(T),o=tg.origin;
  for(const i of [0,2,4]){
    const t=tg.targets[i],plane=o.z+t.z,box=tg.solids.find(s=>s.target===i);
    assert.ok(box.minZ<plane-0.05&&box.maxZ>plane+0.05,'the broad-phase box is thicker than the plate');
    const front=traceTraining(tg,{x:o.x+t.x,y:o.y+1.35,z:o.z-1},{x:o.x+t.x,y:o.y+1.22,z:plane+1});
    assert.equal(front.solid.target,i);
    assert.ok(Math.abs(front.point.z-plane)<1e-9,'on the plate, not its box front ('+(front.point.z-plane).toFixed(3)+' m)');
    assert.equal(front.normal.z,-1,'faces the firing line');
    const back=traceTraining(tg,{x:o.x+t.x,y:o.y+1.22,z:plane+1},{x:o.x+t.x,y:o.y+1.35,z:o.z-1});
    assert.equal(back.solid.target,i);
    assert.ok(Math.abs(back.point.z-plane)<1e-9,'from behind, also on the plate');
    assert.equal(back.normal.z,1,'and faces downrange, the way the round came');
  }
});
test('createTrainingChar and createTrainingImpacts create renderOrder 1 batches on group and targets and record hits',()=>{
  const tg=buildTrainingGround(T);
  const char=createTrainingChar(T,tg);
  const impacts=createTrainingImpacts(T,tg);
  assert.equal(char.count(),0);
  assert.equal(impacts.count(),0);

  // Group child mesh for char marks has renderOrder === 1
  const charMesh = tg.group.children.find(c => c.name === 'training-char-marks');
  assert.ok(charMesh, 'char mesh added to tg.group');
  assert.equal(charMesh.renderOrder, 1, 'char mesh renderOrder is 1 (flames at 3 draw over decals)');

  // Warmup primes and restores
  const restoreChar = char.prepareWarmup();
  assert.equal(charMesh.geometry.drawRange.count, 6);
  restoreChar();
  assert.equal(charMesh.geometry.drawRange.count, 0);

  // Trace a shot hitting the back wall
  const wallHit = traceTraining(tg, {x:0, y:-198, z:-641}, {x:20, y:-198, z:-641});
  assert.ok(wallHit);
  char.add(wallHit);
  assert.equal(char.count(), 1, 'wall hit added char mark');
  assert.equal(charMesh.geometry.drawRange.count, 6);

  // Trace a shot hitting target 0
  const o = tg.origin, target0 = tg.targets[0];
  const targetHit = traceTraining(tg, {x:o.x+target0.x, y:o.y+1.35, z:o.z-1}, {x:o.x+target0.x, y:o.y+1.22, z:o.z+target0.z+1});
  assert.ok(targetHit);
  assert.equal(targetHit.solid.target, 0);
  char.add(targetHit);
  assert.equal(char.count(), 2, 'target hit added to target pivot batch');

  // Update decays and removes after lifetime
  char.update(CHAR_LIFE - 1);
  assert.equal(char.count(), 2, 'still alive before expiration');
  char.update(2);
  assert.equal(char.count(), 0, 'expired marks cleared');

  // Clear works
  char.add(wallHit);
  assert.equal(char.count(), 1);
  char.clear();
  assert.equal(char.count(), 0);

  char.dispose();
  impacts.dispose();
});

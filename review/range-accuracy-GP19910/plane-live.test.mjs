import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../../tools/tests/fakethree.mjs';import {buildTrainingGround,scoreZone} from '../../world/training.js';import {traceTraining} from '../../world/training-ballistics.js';
const tg=buildTrainingGround(T),O=tg.origin,target=tg.targets[2],point=(u,v)=>({x:target.x+(128-u)/256*1.28,y:O.y+2.9-v/448*2.24,z:O.z+target.z});
for(const [name,from,opts]of[['muzzle',{x:0,y:O.y+1.05,z:O.z-2},{}],['high camera',{x:0,y:O.y+7,z:O.z-5},{throughGlass:true}],['rear',{x:0,y:O.y+1.1,z:O.z+20},{}]])test(name+': exact rings and silhouette edges score at the rendered surface',()=>{
 for(const[u,v]of[[128,89.9],[128,285.9],[128,50.1],[153.9,260],[128,121.9],[128,122.1],[215,40],[128,260],[128,70]]){
  const p=point(u,v),hit=traceTraining(tg,from,p,opts),expected=scoreZone(u,v);
  if(!expected){assert.notEqual(hit?.solid.target,2,'transparent pixel cannot hit');continue;}
  assert.equal(hit?.solid.target,2,'visible pixel must hit '+u+'/'+v);assert(Math.abs(hit.point.z-p.z)<1e-9);
  assert.equal(tg.scoreHit(2,hit.point).zone,expected.zone);assert.equal(tg.scoreHit(2,hit.point).points,expected.points);
  assert.equal(hit.normal.z,name==='rear'?1:-1);
 }
});
test('ring boundary sweep cannot disagree with the drawn silhouette or scoring zone',()=>{
 const a={x:0,y:O.y+1.05,z:O.z-2};
 for(const[cu,cv,r]of[[128,70,20],[128,260,26],[128,260,54],[128,70,52]])for(let i=0;i<64;i++)for(const offset of[-.15,.15]){
  const angle=i*Math.PI/32,u=cu+Math.cos(angle)*(r+offset),v=cv+Math.sin(angle)*(r+offset),p=point(u,v),expect=scoreZone(u,v),hit=traceTraining(tg,a,p);
  if(expect){assert.equal(hit?.solid.target,2);assert.equal(tg.scoreHit(2,hit.point).zone,expect.zone);}else assert.notEqual(hit?.solid.target,2);
 }
});
test('a frame reaching only the old proxy front cannot score before it reaches the plate',()=>{
 const p=point(128,260),a={...p,z:p.z-.2},b={...p,z:p.z-.03};assert.equal(traceTraining(tg,a,b),null);
 assert.equal(traceTraining(tg,b,{...p,z:p.z+.01}).solid.target,2);
});
test('the bench still blocks low shots and an edge miss passes through to the backstop',()=>{
 assert(traceTraining(tg,{x:0,y:O.y+.5,z:O.z-2},{x:0,y:O.y+.5,z:O.z+4}).solid.firingLine);
 const p=point(215,40),a={...p,z:O.z+15},b={...p,z:O.z+29.6};assert(traceTraining(tg,a,b).solid.backstop);
});

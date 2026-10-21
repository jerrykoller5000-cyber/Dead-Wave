import test from 'node:test';
import assert from 'node:assert/strict';
import {marineAimPoint,AIM_PERSONAL_SPACE as S} from './marine-aim-safety.js';
const root={x:3,y:-200,z:-643},sample=(target,yaw=0,options)=>marineAimPoint(root,target,yaw,{},options);
test('cursor under/on the marine retains facing and a comfortable forward hold',()=>{
 for(const x of [-.3,0,.3])for(const z of [-.3,0,.3]){
  const p=sample({x:root.x+x,y:root.y,z:root.z+z},Math.PI/2);
  assert.equal(p.x,root.x+S.weaponRange);assert(Math.abs(p.z-root.z)<1e-8);assert.equal(p.y,root.y+S.readyHeight);
 }
});
test('a ray through the head cannot aim backward even when its floor pick is far behind',()=>{
 const p=sample({x:root.x,y:root.y,z:root.z-5},0,{self:true});
 assert.equal(p.z,root.z+S.weaponRange);assert.equal(p.y,root.y+S.readyHeight);
});
test('outside the body, close aiming follows the requested side without moving the raw pick',()=>{
 const target={x:root.x+1,y:root.y,z:root.z},copy={...target},p=sample(target);
 assert.equal(p.x,root.x+S.weaponRange);assert.equal(p.z,root.z);assert(p.y>target.y);assert.deepEqual(target,copy);
});
test('clamp releases continuously at the comfortable range; ordinary distant aim is exact',()=>{
 const near=sample({x:root.x,y:root.y+.2,z:root.z+S.weaponRange-.00001});
 const edge=sample({x:root.x,y:root.y+.2,z:root.z+S.weaponRange});
 assert(Math.hypot(near.x-edge.x,near.y-edge.y,near.z-edge.z)<.00002);
 const far={x:root.x+15,y:root.y+5,z:root.z-20};assert.deepEqual(sample(far),far);
});
test('scope retains its actual sight line; crouch gets a lower ready pose',()=>{
 const target={x:root.x,y:root.y,z:root.z};assert.deepEqual(sample(target,0,{scoped:true,self:true}),target);
 const low=sample(target,0,{crouch:true});assert(low.y<sample(target).y);assert(low.y>root.y);
});

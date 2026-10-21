import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../vendor/three/three.core.js';
import {createTrainingInfirmaryFence,INFIRMARY_FENCE} from './training-infirmary-fence.js';
import {buildTrainingGround} from '../world/training.js';
const setup=()=>{const tg={origin:{x:0,y:-200,z:-640},floorY:-200,bed:{centre:{x:-40.85,z:-650}},group:new T.Group(),solids:[]};return {tg,f:createTrainingInfirmaryFence(T,tg)};};
const p=(x,z,y=-200)=>({x,z,y});
test('enclosure starts raised on the two open edges, joins both room walls and stays batched',()=>{
 const {tg,f}=setup();assert.deepEqual(f.state(),{raised:true,amount:1,awaitExit:false});assert.equal(tg.solids.length,2);
 assert.equal(f.bay.minX,-44);assert.equal(f.bay.maxZ,-647.85);assert.equal(f.solids[0].maxY,-197);
 let meshes=0;f.group.traverse(m=>{if(m.isMesh){meshes++;for(const n of m.geometry.attributes.position.array)assert(Number.isFinite(n));}});assert.equal(meshes,3);f.dispose();assert.equal(tg.solids.length,0);
});
test('recovery lowers immediately and does not rise until the player is over two feet outside',()=>{
 const {f}=setup();f.lowerForRecovery();assert.deepEqual(f.state(),{raised:false,amount:0,awaitExit:true});
 f.update(1,p(-40,-648.7),false);assert(!f.state().raised);
 f.update(1,p(-40,f.bay.maxZ+.6),false);assert(!f.state().raised);
 f.update(.1,p(-40,f.bay.maxZ+.62),false);assert(f.state().raised);assert(f.state().amount>0&&f.state().amount<1);
 f.update(1,p(-40,f.bay.maxZ+.62),false);assert.equal(f.state().amount,1);f.dispose();
});
test('scripted recovery, pause, another floor and invalid elapsed time cannot close the enclosure',()=>{
 const {f}=setup();f.lowerForRecovery();const outside=p(-40,-646);
 f.update(1,outside,true);f.update(0,outside);f.update(NaN,outside);f.update(-1,outside);f.update(1,{...outside,y:0});assert(!f.state().raised);f.dispose();
});
test('sprint/roll cannot enter or tunnel across a raised bay; walking away remains free',()=>{
 const {f}=setup();const from=p(-40,-646),v=f.constrain(p(-40,-650),from,.42);assert(Math.abs(v.z-(f.bay.maxZ+.42))<1e-6);assert(v.blockZ);
 const crossing=f.constrain(p(-40,-650),p(-33,-650),.42);assert(Math.abs(crossing.x-(f.bay.maxX+.42))<1e-6);
 assert(!f.constrain(p(-40,-645),p(v.x,v.z),.42).moved);f.lowerForRecovery();assert(!f.constrain(p(-40,-650),from,.42).moved);f.dispose();
});
test('zombies are kept out, ejected toward open space if already inside, and slide around the corner',()=>{
 const {f}=setup(),z={radius:.6,mesh:{position:p(-40,-649)}};f.keepZombie(z);assert(z.mesh.position.z>f.bay.maxZ);
 const a={radius:.4,mesh:{position:p(-36,-646)}};f.keepZombie(a);a.mesh.position.x=-38;a.mesh.position.z=-649;f.keepZombie(a);assert(a.mesh.position.z>=f.bay.maxZ+.46-1e-6);assert.equal(a.mesh.position.x,-38);
 f.lowerForRecovery();z.mesh.position=p(-40,-649);f.keepZombie(z);assert.equal(z.mesh.position.z,-649);f.dispose();
});
test('a body inside the rear corner is ejected to an open edge instead of into the room wall',()=>{
 const {f}=setup();for(const at of [p(-40,-651.5),p(-43,-650),p(-43,-651.5)]){const v=f.constrain(at,at,.42);assert(v.x>=f.bay.maxX+.42-1e-6||v.z>=f.bay.maxZ+.42-1e-6);}
 f.dispose();
});
test('reset and repeated visits cannot duplicate solids or leave the fence down',()=>{
 const {tg,f}=setup();f.reset();f.reset();assert.equal(tg.solids.length,2);f.lowerForRecovery();assert.equal(tg.solids.length,0);f.lowerForRecovery();f.reset();assert.equal(tg.solids.length,2);assert.equal(f.state().amount,1);f.dispose();
});
test('medical furniture no longer belongs to the south-wall fade batch',()=>{
 const tg=buildTrainingGround(T),x=tg.bed.centre.x-tg.origin.x+2.72,z=tg.bed.centre.z-tg.origin.z-1.28;
 let cabinetVerts=0;
 const group=tg.group.getObjectByName('training-cutaway-south');
 group.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)if(Math.abs(a.getX(i)-x)<.95&&Math.abs(a.getZ(i)-z)<.51&&a.getY(i)>.1&&a.getY(i)<1.8)cabinetVerts++;});
 assert.equal(cabinetVerts,0,'cabinet and monitor must remain ordinary props while the wall fades');tg.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import {createTrainingArmoryCollision} from './training-armory-collision.js';

const p=(x,z,y=-200)=>({x,z,y});
function fixture() {
  const copy=new THREE.Group();copy.position.set(7.98,-200,-643);copy.rotation.y=-Math.PI/2;
  const casing=new THREE.Mesh(new THREE.BoxGeometry(4.5,4.12,1.13));casing.position.set(.76,2.49,.535);copy.add(casing);
  const rack=new THREE.Group();rack.name='armoryRack';copy.add(rack);
  rack.add(new THREE.Mesh(new THREE.BoxGeometry(20,20,20)));
  const hidden=new THREE.Group();hidden.visible=false;hidden.add(new THREE.Mesh(new THREE.BoxGeometry(30,30,30)));copy.add(hidden);
  return createTrainingArmoryCollision(THREE,copy);
}
const near=(v,n)=>assert(Math.abs(v-n)<1e-5,`${v} != ${n}`);
test('a fast roll stops at the physical counter, ignoring display weapons and invisible props',()=>{
  const v=fixture().constrain(p(9,-642.24),p(5,-642.24),.42);near(v.x,6.46);assert(v.blockX);
});
test('approach remains in range of the Armory E interaction',()=>{
  const v=fixture().constrain(p(7.2,-643),p(6,-643),.42);near(v.x,6.46);
  assert(Math.hypot(v.x-6.98,v.z+643)<1.6);
});
test('moving along the front or past either side stays free',()=>{
  const c=fixture();
  const v=c.constrain(p(6.46,-641),p(6.46,-643),.42);assert(!v.moved);
  for(const z of[-645.1,-639.4])assert(!c.constrain(p(7.2,z),p(6,z),.42).moved);
});
test('landing inside ejects out of the cabinet, and motion above it is free',()=>{
  const c=fixture(),v=c.constrain(p(7.2,-642.24),p(7.2,-642.24),.42);near(v.x,6.46);
  assert(!c.constrain(p(7.2,-642.24,-194),p(6,-642.24,-194),.42).moved);
});

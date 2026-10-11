import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import {createTrainingDanger} from './training-danger.js';
function setup(){
 let on=true;
 const lamp=new T.MeshStandardMaterial({color:0xffffff,emissive:0xf4fbff,emissiveIntensity:.8});
 const beacon=new T.MeshStandardMaterial({color:0x65451b,emissive:0xf2a329,emissiveIntensity:.06});
 const tg={group:new T.Group(),buildLamp:lamp,releaseGate:{lamp:beacon},origin:{x:0,z:-640},gate:{x:-26,z:-613.4},stations:{hqPanel:{x:-44,z:-637.65}},lightsOn:()=>on};
 return {tg,beacon,danger:createTrainingDanger(T,tg,beacon),off:()=>{on=false;}};
}
test('encounter pulses and rotates after gate release, pause freezes it, clear restores light materials',()=>{
 const {danger,tg,beacon}=setup();const before=beacon.emissive.getHex();
 danger.update(.8,true);let a=danger.state();assert.equal(a.amount,1);assert.equal(a.red,0xff9a32);assert.equal(a.color,0xff9a32);
 const root=tg.group.getObjectByName('training-danger-lighting');
 const spots=root.children.filter(n=>n.isSpotLight&&n.color.getHex()===0xff9a32);
 assert.equal(spots.length,3,'one beam on each alarm');
 assert.ok(!root.children.some(n=>n.isPointLight&&n.distance>20),'no room-centre wash');
 const gx=tg.gate.x-tg.origin.x,gz=tg.gate.z-tg.origin.z+.91;
 assert.ok(spots.filter(l=>Math.abs(l.position.z-gz)<1&&Math.abs(l.position.x-gx)>2).length===2,'gate beams sit on the two beacon lenses');
 danger.update(.2,true);let b=danger.state();assert.notEqual(a.angle,b.angle);assert.notEqual(a.pulse,b.pulse);
 danger.update(0,true);assert.deepEqual(danger.state(),b);
 const lights=[{intensity:1},{intensity:2}];danger.dim(lights);assert(lights[0].intensity<.13);
 danger.update(.8,false);assert.equal(danger.state().amount,0);assert.equal(tg.buildLamp.color.getHex(),0xffffff);assert.equal(beacon.emissive.getHex(),before);assert.equal(beacon.emissiveIntensity,.06);
});
test('clear respects manual lights off; reset removes red state without removing pooled lamps',()=>{
 const {danger,tg,off}=setup();off();danger.update(1,true);assert(danger.state().fill>0);
 danger.reset();assert.equal(tg.buildLamp.emissiveIntensity,0);assert.equal(danger.state().fill,0);assert.equal(danger.state().amount,0);
 const root=tg.group.getObjectByName('training-danger-lighting');assert.equal(root.children.filter(n=>n.isLight).length,7);
 danger.dispose();assert.equal(tg.group.children.length,0);
});

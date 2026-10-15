import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../vendor/three/three.core.js';
import {createTrainingFacilityAudio} from './training-facility-audio.js';
import {createTrainingDanger} from './training-danger.js';
import {createTrainingInfirmaryFence} from '../game/training-infirmary-fence.js';
test('fence sounds only actual motion, no startup/reset or duplicate lowering sounds',()=>{
 const events=[],tg={origin:{x:0,y:-200,z:-640},floorY:-200,bed:{centre:{x:-40.85,z:-650}},group:new T.Group(),solids:[]};
 const f=createTrainingInfirmaryFence(T,tg,{onMotion:up=>events.push(up)});f.reset();assert.deepEqual(events,[]);
 f.lowerForRecovery();f.lowerForRecovery();assert.deepEqual(events,[false]);
 f.update(.1,{x:-40,y:-200,z:-646},true);assert.deepEqual(events,[false]);
 f.update(.1,{x:-40,y:-200,z:-646},false);f.update(1,{x:-40,y:-200,z:-646},false);assert.deepEqual(events,[false,true]);f.dispose();
});
test('contact is paced, four turrets share a motor, shot accents continue, pause and exit stop it',()=>{
 let now=0;const events=[];const a=createTrainingFacilityAudio({clock:()=>now,move:up=>events.push(up),bump:()=>events.push('bump'),shot:()=>events.push('shot'),motor:on=>events.push('motor:'+on)});
 a.cue('fence-bump');for(let i=0;i<40;i++)a.cue('fence-bump');assert.equal(a.state().bump,1);now=.9;a.cue('fence-bump');assert.equal(a.state().bump,2);
 for(let i=0;i<4;i++)a.cue('containment-shot');assert.equal(a.state().shot,1);
 for(let i=0;i<12;i++){now+=.02;a.cue('containment-shot');}assert(a.state().shot>=4);a.tick();assert(a.state().moving);
 now+=.3;a.tick();assert(!a.state().moving);const n=events.length;a.tick();assert.equal(events.length,n);
 a.cue('containment-shot');a.tick(true);assert(!a.state().moving);a.cue('containment-shot');a.reset();assert(!a.state().moving);assert(!a.cue('unknown'));
});
test('death uses red on tubes, gate and rotating beams until recovery ends with no zombies',()=>{
 const lamp=new T.MeshStandardMaterial({color:0xffffff,emissive:0xf4fbff,emissiveIntensity:.8}),beacon=new T.MeshStandardMaterial();
 const tg={group:new T.Group(),buildLamp:lamp,releaseGate:{lamp:beacon},origin:{x:0,z:-640},gate:{x:-26,z:-613.4},stations:{hqPanel:{x:-44,z:-637.65}},lightsOn:()=>true};
 const d=createTrainingDanger(T,tg,beacon);d.update(1,true);assert.equal(d.state().color,0xff9a32);
 d.update(.1,true,true);assert.equal(lamp.color.getHex(),0xff3024);assert.equal(beacon.color.getHex(),0xff3024);
 for(let i=0;i<40;i++)d.update(.1,false,true);assert.equal(d.state().amount,1);assert(d.state().active);
 const beams=tg.group.getObjectByName('training-danger-lighting').children.filter(x=>x.isLight&&x.distance!==35);assert(beams.every(b=>b.color.getHex()===0xff3024));
 d.update(.8,false,false);assert.equal(lamp.color.getHex(),0xffffff);assert.equal(d.state().amount,0);d.reset();d.dispose();
});

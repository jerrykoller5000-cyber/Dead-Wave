import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildTrainingGround} from '../../world/training.js';
import {buildTrainingGround as buildBefore} from './before-training-node.js';
import {viewCrossesPlane} from '../../world/training-cutaway.js';
import {traceTraining} from '../../world/training-ballistics.js';
const P=(x,z,y=0)=>({x,y:y-200,z:z-640});
const side=(tg,key)=>tg.cutaway.state().filter(e=>e.side===key);
test('reported reverse view reproduces on baseline and cuts away on current real room',()=>{
  const before=buildBefore(T),after=buildTrainingGround(T),c=P(-30,-2,16),p=P(0,8);
  before.cutaway.update(c,p,1);after.cutaway.update(c,p,1);
  assert.ok(side(before,'east').every(e=>!e.hidden&&e.opacity===1));
  assert.ok(side(after,'east').every(e=>e.hidden&&Math.abs(e.opacity-.06)<1e-9));
  assert.deepEqual(after.solids,before.solids,'collision geometry unchanged');
  before.dispose();after.dispose();
});
test('bounded plane responds in both directions, rejects background and out-of-span walls',()=>{
  const a={x:-30,y:16,z:8},b={x:0,y:1,z:8},bounds=[['z',-12,30],['y',0,24]];
  assert.equal(viewCrossesPlane(a,b,'x',-8,bounds),true);
  assert.equal(viewCrossesPlane(b,a,'x',-8,bounds),true);
  assert.equal(viewCrossesPlane(a,{...b,x:-15},'x',-8,bounds),false);
  assert.equal(viewCrossesPlane({...a,z:80},{...b,z:80},'x',-8,bounds),false);
  assert.equal(viewCrossesPlane({...a,y:60},{...b,y:60},'x',-8,bounds),false);
  assert.equal(viewCrossesPlane({...a,x:-8.2},b,'x',-8,bounds),true);
  assert.equal(viewCrossesPlane({...a,x:-8.2},{...b,x:-8.2},'x',-8,bounds),true);
});
test('both rooms preserve rear wall, restore clear views, and ease through the doorway',()=>{
  const tg=buildTrainingGround(T);
  for(const[c,p]of [[P(10,-2,16),P(-15,8)],[P(-30,-2,16),P(0,8)]]){
    tg.cutaway.update(c,p,1);assert.ok(side(tg,'east').every(e=>e.hidden));assert.ok(side(tg,'west').every(e=>!e.hidden));
  }
  tg.cutaway.update(P(0,-25,16),P(0,-8),1);assert.ok(tg.cutaway.state().every(e=>e.opacity===1&&!e.hidden));
  tg.cutaway.update(P(-30,-2,16),P(0,8),.016);const fade=side(tg,'east')[0].opacity;assert.ok(fade<1&&fade>.06);
  for(let i=0;i<30;i++)tg.cutaway.update(P(-30,-2,16),P(0,8),1/60);assert.ok(side(tg,'east').every(e=>Math.abs(e.opacity-.06)<1e-9));
  tg.cutaway.update(P(0,-25,16),P(0,-8),1);assert.ok(tg.cutaway.state().every(e=>e.opacity===1&&!e.hidden));
  tg.cutaway.update(P(-30,8,16),P(-8,-8),1);assert.ok(side(tg,'east').every(e=>e.hidden),'focus on shared boundary has no disabled seam');
  tg.cutaway.update(P(-50,8,16),P(-48,8),1);assert.ok(tg.cutaway.state().every(e=>!e.hidden));tg.dispose();
});
test('four exterior directions remain usable and camera-only transparency never changes bullet collision',()=>{
  const tg=buildTrainingGround(T),p=P(-26,8,1.5);
  for(const [key,c]of [['west',P(-53,8,16)],['east',P(3,8,16)],['south',P(-26,-26,16)],['north',P(-35,39,16)]]){
    tg.cutaway.update(c,p,1);assert.ok(side(tg,key).every(e=>e.hidden),key);
  }
  for(const [c,p]of [[P(-30,-2,16),P(0,8,1.5)],[P(10,-2,16),P(-15,8,1.5)]]){
    tg.cutaway.update(c,p,1);assert.equal(!!traceTraining(tg,c,p)?.solid.wall,true);assert.equal(!!traceTraining(tg,c,p,{throughGlass:true})?.solid.wall,false);
  }
  assert.equal(tg.cutaway.ignoreSolid({...tg.solids.find(s=>s.wall),target:0}),false);tg.dispose();
});
test('lighting copies follow their source while faded and after restoring, without touching props or tunnel',()=>{
  const tg=buildTrainingGround(T);tg.cutaway.update(P(-30,-2,16),P(0,8),1);tg.setLights(false);
  let glow=0;tg.group.traverse(m=>{if(m.isMesh&&m.material?.emissive?.getHex()===0xf4fbff)glow=Math.max(glow,m.material.emissiveIntensity);});assert.equal(glow,0);
  tg.setLights(true);tg.cutaway.update(P(0,-25,16),P(0,-8),1);let lamps=0;tg.group.traverse(m=>{if(m.isMesh&&m.material?.emissive?.getHex()===0xf4fbff){lamps++;assert.equal(m.material.emissiveIntensity,.8);assert.equal(m.material.opacity,1);}});assert.ok(lamps>0);tg.dispose();
});

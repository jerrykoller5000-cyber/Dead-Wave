import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../vendor/three/three.core.js';
import {SPITTER_MOTION,steerSpitter,spitterFacing,spitterSpitPose,prepareSpitterJaw,restoreSpitterMotion,resetSpitterMotion,applySpitterMotion,spitterMotionState} from './spitter-motion.js';
const zombie=()=>{const mesh=new T.Group(),hips=new T.Group(),torso=new T.Group(),head=new T.Group();mesh.add(hips);hips.add(torso);torso.add(head);hips.position.y=.8;
 const u=mesh.userData={typeKey:'spitter',hips,torso,head,baseHipsY:.8,rest:{},eyes:[]};
 for(const side of ['L','R']){const leg=new T.Group(),shin=new T.Group(),ankle=new T.Group(),arm=new T.Group(),elbow=new T.Group();
  leg.position.set(side==='L'?-.13:.13,-.02,0);shin.position.y=-.38;ankle.position.set(0,-.36,.04);hips.add(leg);leg.add(shin);shin.add(ankle);torso.add(arm);arm.add(elbow);
  leg.userData={shinG:shin,shamblerAnkle:ankle,shamblerFootY:.04};arm.userData.elbowG=elbow;u['leg'+side+'G']=leg;u['arm'+side+'G']=arm;}
 return {typeKey:'spitter',mesh,alive:true,partsLost:{}};};
test('a Spitter takes time to reverse and steering agrees at 30, 60 and 144 Hz',()=>{
 const yaw=[];for(const hz of [30,60,144]){const z=zombie();let first;
  for(let i=0;i<hz;i++){const t=steerSpitter(z,0,-1,1/hz);first??=t;assert(Math.abs(t.rate)<=SPITTER_MOTION.turnRate+1e-8);z.mesh.rotation.y=t.yaw;}
  assert(Math.abs(first.yaw)<.01);assert(Math.abs(z.mesh.rotation.y)<2);yaw.push(z.mesh.rotation.y);}
 assert(Math.max(...yaw)-Math.min(...yaw)<.015);
});
test('a jittering target directly behind does not flip the committed turn direction',()=>{
 const z=zombie();let side=0;for(let i=0;i<80;i++){const old=z.mesh.rotation.y,t=steerSpitter(z,i%2?.001:-.001,-1,1/60);z.mesh.rotation.y=t.yaw;
  const d=Math.atan2(Math.sin(t.yaw-old),Math.cos(t.yaw-old));side ||= Math.sign(d);assert(Math.sign(d)===side||Math.abs(d)<1e-6);}
});
test('melee wind-ups hold their facing, and rising/crawling bodies keep existing control',()=>{
 const z=zombie();z.attackWindup=.2;assert.equal(steerSpitter(z,1,0,1/60).yaw,0);z.attackWindup=0;
 for(const property of ['crawling','hopping','riseT','knockT','windowClimb']){z[property]=1;assert.equal(steerSpitter(z,1,0,1/60),null);z[property]=0;}
 assert(!spitterFacing(z,0,-1));assert(spitterFacing(z,0,1));
});
test('spit preload opens the jaw, leans back, then releases and settles continuously',()=>{
 const poses=Array.from({length:61},(_,i)=>i<=36?spitterSpitPose(Math.max(.000001,.6-i/60),0):spitterSpitPose(0,Math.max(0,.25-(i-36)/60)));
 assert(Math.max(...poses.map(p=>p.jaw))>.6);assert(Math.min(...poses.map(p=>p.head))<-.35);
 assert(Math.max(...poses.map(p=>p.head))>.15);assert.deepEqual(spitterSpitPose(),{head:0,torso:0,jaw:0,brace:0});
 assert(Math.max(...poses.slice(1).map((p,i)=>Math.abs(p.head-poses[i].head)))<.13);
});
test('phase follows resolved distance and stops rather than marching when blocked',()=>{
 const z=zombie();applySpitterMotion(z,1/60);for(let i=0;i<60;i++){restoreSpitterMotion(z);z.mesh.position.z+=.01;applySpitterMotion(z,1/60);}
 const p=spitterMotionState(z).phase;assert(p>2);for(let i=0;i<40;i++){restoreSpitterMotion(z);applySpitterMotion(z,1/60);}assert.equal(spitterMotionState(z).phase,p);
 assert(spitterMotionState(z).weight<.01);
});
test('motion restores every saved transform and reset discards pending shots and gait state',()=>{
 const z=zombie(),u=z.mesh.userData;u.armLG.rotation.x=.17;u.torso.rotation.y=.14;applySpitterMotion(z,1/60);restoreSpitterMotion(z);
 assert.equal(u.armLG.rotation.x,.17);assert.equal(u.torso.rotation.y,.14);z.spitterShot={x:1,z:2};resetSpitterMotion(z);
 assert.equal(z.spitterShot,undefined);assert.equal(spitterMotionState(z).phase,undefined);
});
test('detached legs and hit reactions keep the existing pose',()=>{
 const z=zombie();z.partsLost.legL=true;const x=z.mesh.userData.armLG.rotation.x;applySpitterMotion(z,1/60);assert.equal(z.mesh.userData.armLG.rotation.x,x);
 z.partsLost.legL=false;z.hitReact=1;applySpitterMotion(z,1/60);assert.equal(spitterMotionState(z).phase,undefined);
});
test('jaw preparation preserves the complete surface while adding an articulated lower-jaw joint',()=>{
 const z=zombie(),u=z.mesh.userData,m=new T.Mesh(new T.BoxGeometry(.2,.12,.14),new T.MeshStandardMaterial());m.position.set(0,-.15,.1);u.head.add(m);
 const count=m.geometry.toNonIndexed().attributes.position.count;prepareSpitterJaw(T,z.mesh,1);const jaw=u.spitterJaw;assert.equal(jaw,u.jaw);assert.equal(jaw.parent,u.head);
 let n=0;u.head.traverse(o=>{if(o.isMesh)n+=o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count;});assert.equal(n,count);
 const size=u.head.children.length;prepareSpitterJaw(T,z.mesh,1);assert.equal(u.head.children.length,size);
 assert(jaw.children.length>0);assert.equal(jaw.name,'spitter-jaw');
});

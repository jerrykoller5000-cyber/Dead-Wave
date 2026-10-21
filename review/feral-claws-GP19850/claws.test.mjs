import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeZombieRig} from '../../studio/zombie.js';
import {applyFeralClaws,resetFeralClaws,feralPose} from '../../game/feral-motion.js';
function rig(){const mesh=makeZombieRig({type:'feral'}),r=mesh.userData.rig;Object.assign(mesh.userData,{hips:r.pelvis,torso:r.spine,armLG:r.shoulderL,armRG:r.shoulderR});return {mesh,typeKey:'feral',alive:true,partsLost:{},swingSide:1};}
test('palms face down and claws remain separated through runs, turns, windup and rakes',()=>{
  const z=rig(),u=z.mesh.userData,origin=new T.Vector3(),palm=new T.Vector3(),p=new T.Vector3(),q=new T.Quaternion();let minSpace=Infinity,minFold=Infinity;
  for(const mode of ['run','wind','slash'])for(let i=0;i<90;i++){
    const phase=i/90*Math.PI*2;z.mesh.rotation.y=phase;u.hips.rotation.z=Math.sin(phase)*.11;u.torso.rotation.set(.55+Math.sin(phase*2)*.18,Math.sin(phase)*.1,Math.cos(phase)*.15);
    z.attackWindup=mode==='wind'?.22*(1-i/90):0;z.swingT=mode==='slash'?.28*(1-i/90):0;
    resetFeralClaws(z);applyFeralClaws(T,z,phase,1);z.mesh.updateMatrixWorld(true);u.torso.getWorldPosition(origin);
    const right=new T.Vector3(Math.cos(phase),0,-Math.sin(phase)),positions=[];
    for(const side of [-1,1]){
      const arm=side<0?u.armLG:u.armRG,el=arm.userData.elbowG;
      el.getWorldQuaternion(q);palm.set(0,0,1).applyQuaternion(q);assert.ok(palm.y<-.94,`palm ${palm.y}`);
      p.set(0,-.48,.04).applyMatrix4(el.matrixWorld).sub(origin);const lateral=p.dot(right);assert.ok(lateral*side>.22,`${mode}: crossed claw ${lateral}`);positions.push(lateral);
      // Angle between humerus and forearm: a clear elbow fold, never beyond anatomical range.
      const upper=new T.Vector3(0,-1,0).applyQuaternion(arm.getWorldQuaternion(new T.Quaternion()));
      const fore=new T.Vector3(0,-1,0).applyQuaternion(q);const fold=upper.angleTo(fore);minFold=Math.min(minFold,fold);assert.ok(fold<2.3);
    }
    minSpace=Math.min(minSpace,positions[1]-positions[0]);
  }
  assert.ok(minSpace>.5);assert.ok(minFold>.75,`minimum bend ${minFold}`);
});
test('twist and lateral offsets reset before maimed/reaction poses; missing arms stay untouched',()=>{
  const z=rig(),u=z.mesh.userData;applyFeralClaws(T,z,2,1);u.hips.position.x=.08;resetFeralClaws(z);
  for(const arm of [u.armLG,u.armRG]){assert.equal(arm.rotation.y,0);assert.equal(arm.userData.elbowG.rotation.y,0);assert.equal(arm.userData.elbowG.rotation.z,0);}assert.equal(u.hips.position.x,0);
  z.crawling=true;const before=u.armLG.quaternion.clone();applyFeralClaws(T,z,3,1);assert.ok(u.armLG.quaternion.equals(before));
  z.crawling=false;z.partsLost.armL=true;applyFeralClaws(T,z,4,1);assert.ok(u.armLG.quaternion.equals(before));
});
test('runner weight shifts to both legs, with positive bounce that stops when stationary',()=>{
  const samples=Array.from({length:120},(_,i)=>feralPose(i/60,i/120*Math.PI*2,1));
  assert.ok(Math.max(...samples.map(p=>p.bounce))>=.074);assert.ok(Math.min(...samples.map(p=>p.bounce))>=0);
  assert.ok(Math.min(...samples.map(p=>p.weight))<-.05&&Math.max(...samples.map(p=>p.weight))>.05);
  const stopped=feralPose(1,2,0);assert.equal(stopped.bounce,0);assert.ok(stopped.weight===0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import { createTurnSteps, createMarineTurn, turnAngle, TWIST, PIVOT, stepShape } from './marine-turn.js';
const near = (a,b,e=1e-7) => assert(Math.abs(a-b)<e, `${a} != ${b}`);

test('small aim changes retain stance; left/right/180 turns settle both feet', () => {
  const idle = createTurnSteps(); idle.step(.05,.1); assert.equal(idle.state.count,0);
  for (const yaw of [-Math.PI,-1.5,1.5,Math.PI]) {
    const c = createTurnSteps(); let lifts = new Set();
    for(let i=0;i<180;i++) { const s=c.step(1/60,yaw); if(s.swing>=0)lifts.add(s.swing); }
    near(turnAngle(c.state.yaw-yaw),0); assert.equal(lifts.size,2);
    for(const f of c.state.feet)near(turnAngle(f-yaw),0);
  }
});
test('yaw wrap takes the short path and simulation is independent of frame rate', () => {
  for(const hz of [30,60,144]) {
    const c=createTurnSteps(3); for(let i=0;i<hz;i++)c.step(1/hz,-3);
    near(turnAngle(c.state.yaw+3),0); assert(c.state.count<=2);
  }
  const ys=[30,60,144].map(hz=>{const c=createTurnSteps();for(let i=0;i<hz*.5;i++)c.step(1/hz,Math.PI);return c.state.yaw;});
  near(ys[0],ys[1]);near(ys[1],ys[2]);
});
test('reversing a turn and continuous rotation never strands a foot', () => {
  const c=createTurnSteps();for(let i=0;i<20;i++)c.step(1/60,2);
  for(let i=0;i<200;i++)c.step(1/60,-2);near(turnAngle(c.state.yaw+2),0);
  for(let i=0;i<1000;i++){const s=c.step(1/60,i*.03);assert(Math.abs(turnAngle(s.feet[1]-s.feet[0]))<=Math.PI/2+1e-6);}
});
function rig() {
  const root=new THREE.Group(), marine=new THREE.Group();root.add(marine);
  const u=marine.userData;u.lowerBody=new THREE.Group();marine.add(u.lowerBody);
  for(const [i,s]of ['L','R'].entries()) {
    const l=u['leg'+s+'G']=new THREE.Group(),k=u['knee'+s+'G']=new THREE.Group(),a=u['ankle'+s+'G']=new THREE.Group();
    l.position.set(i?.13:-.13,.62,0);k.position.set(0,-.27,0);a.position.set(0,-.25,.01);
    u.lowerBody.add(l);l.add(k);k.add(a);
  }
  return {root,marine,turn:createMarineTurn({THREE,marine})};
}
// CU-99: a planted boot may turn on the ground, about its heel or its ball (one of the two stays exactly where it was).
const soleAt=(a,z)=>{a.updateWorldMatrix(true,false);return a.localToWorld(new THREE.Vector3(0,-.104,z));};
const turnsOnHeelOrBall=(a,before)=>Math.min(soleAt(a,PIVOT.heel).distanceTo(before[0]),soleAt(a,PIVOT.ball).distanceTo(before[1]));
test('support boots stay on the ground turning on the heel or the ball, swing clears ground, root and aim untouched', () => {
  const {root,marine,turn}=rig(),u=marine.userData;
  turn.apply(1/60,{eligible:true,yaw:0});let maxLift=0;
  const v=new THREE.Vector3(), previous=[null,null], heights=[0,0];
  for(let n=0;n<90;n++) {
    const last=turn.debug.swing;
    [u.ankleLG,u.ankleRG].forEach((a,i)=>{previous[i]=[soleAt(a,PIVOT.heel),soleAt(a,PIVOT.ball)];heights[i]=a.getWorldPosition(v).y;});
    turn.restore();root.rotation.y=Math.PI;turn.apply(1/60,{eligible:true,yaw:Math.PI});
    const now=turn.debug.swing;
    [u.ankleLG,u.ankleRG].forEach((a,i)=>{if(i!==last&&i!==now){near(turnsOnHeelOrBall(a,previous[i]),0,1e-6);near(a.getWorldPosition(v).y,heights[i],1e-6);}});
    assert(turn.debug.plantedError<1e-6,`plant error ${turn.debug.plantedError}`);
    maxLift=Math.max(maxLift,turn.debug.lift);near(root.rotation.y,Math.PI);near(root.position.length(),0);
  }
  assert(maxLift>.06);near(turnAngle(turn.debug.yaw-Math.PI),0);
  turn.restore();turn.apply(.016,{eligible:false,yaw:0});assert(!turn.debug.active);near(marine.rotation.y,0);
  for(const l of [u.legLG,u.legRG])near(l.quaternion.angleTo(new THREE.Quaternion()),0);
});
test('teleport and excluded actions discard the planted stance', () => {
  const {root,turn}=rig();turn.apply(.016,{eligible:true,yaw:0});turn.restore();root.position.x=5;
  turn.apply(.016,{eligible:true,yaw:1});assert(!turn.debug.active);
  turn.apply(.016,{eligible:true,yaw:1});assert(turn.debug.active);near(turn.debug.yaw,1);
  turn.reset();assert(!turn.debug.active);
});
test('initial pose transitions cannot leave hovering boots; both feet settle on the sampled floor', () => {
  const {root,marine,turn}=rig(),u=marine.userData;
  root.position.y=-200;u.kneeLG.rotation.x=.8;u.kneeRG.rotation.x=.8;
  const ground=()=>-200;
  turn.apply(1/60,{eligible:true,yaw:0,ground});
  for(let i=0;i<90;i++){turn.restore();root.rotation.y=1.5;turn.apply(1/60,{eligible:true,yaw:1.5,ground});}
  const v=new THREE.Vector3();for(const foot of [u.ankleLG,u.ankleRG])near(foot.getWorldPosition(v).y,-199.896);
});
test('armed flicks keep the chest on aim while the hips and feet step round', () => {
  const {root,marine,turn}=rig();turn.apply(.016,{eligible:true,yaw:0,aimLocked:true});
  turn.restore();root.rotation.y=Math.PI;turn.apply(.016,{eligible:true,yaw:Math.PI,aimLocked:true});
  near(marine.rotation.y,0);near(turn.debug.visualYaw,Math.PI);
  // GB-149: the feet still lag and step, but never further than the twist cap plus the hips' lead (the rest is a pivot).
  const lagged=Math.abs(turnAngle(turn.debug.yaw-Math.PI));
  assert(lagged>1&&lagged<=TWIST.cap+TWIST.hip+1e-6,`feet lag ${lagged}`);assert(Math.abs(turn.debug.twist)<=TWIST.cap+1e-6);assert(turn.debug.lift>0);
});
test('crouched pivots use smaller steps and settle both feet at every tested frame rate', () => {
  for(const hz of [30,60,144])for(const yaw of [-Math.PI,-1.5,1.5,Math.PI]) {
    const c=createTurnSteps();let maxSpread=0;
    for(let n=0;n<hz*2;n++){const s=c.step(1/hz,yaw,1);maxSpread=Math.max(maxSpread,Math.abs(turnAngle(s.feet[1]-s.feet[0])));}
    near(turnAngle(c.state.yaw-yaw),0);assert(maxSpread<=Math.PI/3+1e-6);assert(c.state.count>=2);
  }
});
test('crouched support feet stay fixed with bent knees, low swing and unchanged body height', () => {
  for(const yaw of [-Math.PI,Math.PI]) {
    const {root,marine,turn}=rig(),u=marine.userData;marine.position.y=-.2;
    const ground=()=>0,options={eligible:true,yaw:0,ground,crouch:1,aimLocked:true};
    turn.apply(1/60,options);let maxLift=0;
    for(let i=0;i<100;i++){
      turn.restore();root.rotation.y=yaw;turn.apply(1/60,{...options,yaw});
      assert(turn.debug.plantedError<1e-6);maxLift=Math.max(maxLift,turn.debug.lift);
      near(marine.position.y,-.208);near(root.position.y,0);near(marine.rotation.y,0);
      for(const k of [u.kneeLG,u.kneeRG])assert(k.quaternion.angleTo(new THREE.Quaternion())>1,'knees remain bent');
    }
    assert(maxLift>.03&&maxLift<=.035);near(turnAngle(turn.debug.yaw-yaw),0);
    const v=new THREE.Vector3();for(const foot of [u.ankleLG,u.ankleRG])near(foot.getWorldPosition(v).y,.104);
    turn.restore();near(marine.position.y,-.2);
    turn.apply(.016,{...options,eligible:false});marine.position.y=0;
    turn.apply(.016,{eligible:true,yaw,ground,crouch:0,aimLocked:true});near(marine.position.y,-.018);
  }
});
test('crouched pivots plant the entire sole on a slope after changing facing', () => {
  const {root,marine,turn}=rig();marine.position.y=-.2;
  const ground=(x,z)=>.2*x+.15*z;
  turn.apply(1/60,{eligible:true,yaw:0,crouch:1,ground});
  for(const yaw of [Math.PI/2,-Math.PI/2,Math.PI]){
    for(let i=0;i<100;i++){turn.restore();root.rotation.y=yaw;turn.apply(1/60,{eligible:true,yaw,crouch:1,ground});}
    for(const foot of [marine.userData.ankleLG,marine.userData.ankleRG])for(const x of [-.06,.06])for(const z of [-.10,.17]){
      const p=foot.localToWorld(new THREE.Vector3(x,-.104,z));near(p.y,ground(p.x,p.z),1e-6);
    }
  }
});
// CU-99 (Jerry, 2026-10-09: "Player takes to many steps while rotating and standing. You would expect a bit more of a
// pivot and slide on the foot before he lifts his foot up and places it back down. Same for crouch.")
const D=Math.PI/180;
function steps(aimAt,secs,crouch=0,hz=60){const c=createTurnSteps(0);for(let i=0;i<secs*hz;i++)c.step(1/hz,aimAt(i/hz),crouch);return c;}
test('small turns pivot on the ground without a step, standing and crouched', () => {
  for(const crouch of [0,1])for(const deg of [-30,-15,15,30]){
    const c=steps(()=>deg*D,1.5,crouch);
    assert.equal(c.state.count,0,`${deg} deg (crouch ${crouch}) took ${c.state.count} steps (it took 2)`);
    near(turnAngle(c.state.yaw-deg*D),0);for(const f of c.state.feet)near(turnAngle(f-deg*D),0);
  }
  for(const crouch of [0,1]){const c=steps((t)=>20*D*Math.sin(t*Math.PI),6,crouch);assert.equal(c.state.count,0,`swaying 20 deg took ${c.state.count} steps (it took 24)`);}
});
test('bigger turns take few steps and still settle both feet on the aim', () => {
  for(const crouch of [0,1]){
    const tag=crouch?'crouched':'standing';
    let c=steps(()=>45*D,2,crouch);assert.equal(c.state.count,1,`${tag} 45 deg: ${c.state.count} steps`);near(turnAngle(c.state.yaw-45*D),0);
    c=steps(()=>90*D,2,crouch);assert(c.state.count<=(crouch?3:2),`${tag} 90 deg: ${c.state.count} steps`);near(turnAngle(c.state.yaw-90*D),0);
    c=steps((t)=>Math.min(120,30*t)*D,6,crouch);assert(c.state.count<=6,`${tag} 120 deg at 30 deg/s: ${c.state.count} steps (it took 16)`);near(turnAngle(c.state.yaw-120*D),0);
    c=steps((t)=>Math.min(360,90*t)*D,6,crouch);assert(c.state.count<=12,`${tag} 360 deg at 90 deg/s: ${c.state.count} steps (it took 23)`);
  }
});
test('a step slides round on the ground before it lifts; a flick far behind lifts at once', () => {
  const S=PIVOT.slide;
  for(let u=0;u<S;u+=.02){const p=stepShape(u,S);assert.equal(p.lift,0);assert(p.pos<=.12+1e-9);}
  assert(stepShape(S,S).rot>.25,'a quarter of the turn or more is done on the ground');
  assert(stepShape((1+S)/2,S).lift>.99,'it still lifts as high');near(stepShape(1,S).pos,1);near(stepShape(1,S).rot,1);
  for(const u of [.1,.3,.5,.8]){const p=stepShape(u,0),s=u*u*(3-2*u);near(p.pos,s);near(p.rot,s);near(p.lift,Math.sin(Math.PI*u)**2);}
  let c=createTurnSteps(0);c.step(1/60,45*D);assert(c.state.swing>=0&&c.state.slide>.2&&c.state.lift===0,'a 45 degree step starts on the ground');
  c=createTurnSteps(0);c.step(1/60,179*D);assert(c.state.swing>=0&&c.state.slide===0&&c.state.lift>0,'a 179 degree flick lifts at once');
});
test('a planted boot turns on its heel when it leads the turn and on its ball when it trails; its knee follows the toes', () => {
  const {root,marine,turn}=rig(),u=marine.userData,ground=()=>0,ankles=[u.ankleLG,u.ankleRG];
  turn.apply(1/60,{eligible:true,yaw:0,ground});
  const heel0=ankles.map((a)=>soleAt(a,PIVOT.heel)),ball0=ankles.map((a)=>soleAt(a,PIVOT.ball));
  for(let n=0;n<40;n++){turn.restore();root.rotation.y=25*D;turn.apply(1/60,{eligible:true,yaw:25*D,ground});assert(turn.debug.plantedError<1e-6);}
  assert.equal(turn.debug.steps,0);
  // +yaw turns toward his +x side, where foot 1 (legRG) stands: it leads.
  near(soleAt(ankles[1],PIVOT.heel).distanceTo(heel0[1]),0,1e-6);near(soleAt(ankles[0],PIVOT.ball).distanceTo(ball0[0]),0,1e-6);
  assert(soleAt(ankles[0],PIVOT.heel).distanceTo(heel0[0])>.04,'the trailing heel swings out');
  // The way each knee bends out from the line hip to ankle, against the way its boot and his hips face.
  const w=(o)=>o.getWorldPosition(new THREE.Vector3()),yawOf=(o)=>{const v=new THREE.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion()));return Math.atan2(v.x,v.z);};
  const bend=(i)=>{const h=w([u.legLG,u.legRG][i]),k=w([u.kneeLG,u.kneeRG][i]).sub(h),d=w(ankles[i]).sub(h).normalize();k.addScaledVector(d,-k.dot(d));return Math.atan2(k.x,k.z);};
  let seen=0;
  for(let n=0;n<60;n++){
    turn.restore();root.rotation.y=70*D;turn.apply(1/60,{eligible:true,yaw:70*D,ground});
    for(const i of [0,1]){
      if(i===turn.debug.swing)continue;
      const boot=yawOf(ankles[i]),hips=yawOf(u.lowerBody),off=Math.abs(turnAngle(hips-boot));
      if(off<8*D)continue;seen++;
      assert(Math.abs(turnAngle(bend(i)-boot))<off,`knee ${i} bends toward its toes (boot ${(boot/D).toFixed(0)}, hips ${(hips/D).toFixed(0)}, knee ${(bend(i)/D).toFixed(0)} deg)`);
    }
  }
  assert(seen>3,`a boot turned away from the hips on ${seen} frames`);
});

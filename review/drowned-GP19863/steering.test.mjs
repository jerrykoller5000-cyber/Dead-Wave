import test from 'node:test';import assert from 'node:assert/strict';
import {steerDrowned,DROWNED_MOTION,drownedCanReach,setDrownedMotionEnabled} from '../../game/drowned-motion.js';
const turnDelta=v=>Math.atan2(Math.sin(v),Math.cos(v));
const zombie=()=>({typeKey:'drowned',alive:true,mesh:{rotation:{y:0}}});
const tick=(z,x,y,dt)=>{const p=steerDrowned(z,x,y,dt);if(p)z.mesh.rotation.y=p.yaw;return p;};
test('opposite target builds turn speed gradually, reverses late, and travels along the turning body',()=>{
 const z=zombie(),a=tick(z,0,-1,1/60);assert.ok(Math.abs(a.yaw)<.003);assert.ok(a.z>.99);assert.equal(a.pace,.24);
 let elapsed=1/60,half=null,done=null,prev=a;
 while(elapsed<4){const p=tick(z,0,-1,1/60);elapsed+=1/60;assert.ok(Math.abs(turnDelta(p.yaw-prev.yaw))<=DROWNED_MOTION.turnRate/60+1e-8);assert.ok(Math.hypot(p.x,p.z)>.999);if(half===null&&Math.abs(p.yaw)>=Math.PI/2)half=elapsed;if(Math.abs(turnDelta(Math.PI-p.yaw))<.05){done=elapsed;break;}prev=p;}
 assert.ok(half>1.1);assert.ok(done>2.1&&done<3.5);
});
test('small changes ease to target without overshoot and straight pursuit retains full pace',()=>{
 const z=zombie();assert.equal(tick(z,0,1,.016).pace,1);let last=0;
 for(let i=0;i<120;i++){const p=tick(z,Math.sin(.18),Math.cos(.18),1/60);assert.ok(p.yaw>=last-1e-9&&p.yaw<=.18+1e-9);last=p.yaw;}
 assert.ok(Math.abs(last-.18)<.001);
});
test('a target crossing behind him cannot flip the chosen turn shoulder every frame',()=>{
 const z=zombie();const rates=[];for(let i=0;i<50;i++){const a=Math.PI+(i%2?.02:-.02),p=tick(z,Math.sin(a),Math.cos(a),1/60);rates.push(p.rate);}
 assert.ok(rates.every(v=>v>=0));assert.ok(z.mesh.rotation.y>.7);
});
test('pursuit timing and angular acceleration stay consistent at30/60/144 FPS',()=>{
 const results=[];for(const fps of [30,60,144]){const z=zombie();let oldRate=0;for(let i=0;i<fps;i++){const p=tick(z,1,0,1/fps);assert.ok(Math.abs(p.rate-oldRate)<=DROWNED_MOTION.turnAccel/fps+1e-8);oldRate=p.rate;}results.push(z.mesh.rotation.y);}
 assert.ok(Math.max(...results)-Math.min(...results)<.002);
});
test('committed swings cannot swivel, then normal steering resumes smoothly',()=>{
 const z=zombie();tick(z,1,0,.1);const yaw=z.mesh.rotation.y;z.attackWindup=.22;assert.equal(tick(z,-1,0,.1).yaw,yaw);z.attackWindup=0;z.swingT=.28;assert.equal(tick(z,-1,0,.1).yaw,yaw);z.swingT=0;assert.ok(Math.abs(turnDelta(tick(z,-1,0,1/60).yaw-yaw))<.003);
});
test('special poses and other zombies are untouched; resuming begins at live mesh heading',()=>{
 const fields=[{typeKey:'feral'},{typeKey:'military'},{alive:false},{crawling:true},{hopping:true},{knockT:1},{windowClimb:{}},{riseT:1}];
 for(const f of fields){const z=zombie();tick(z,1,0,.1);Object.assign(z,f);assert.equal(steerDrowned(z,-1,0,.016),null);}
 const z=zombie();tick(z,1,0,.1);z.knockT=1;steerDrowned(z,1,0,.1);z.mesh.rotation.y=1;z.knockT=0;assert.ok(Math.abs(tick(z,0,-1,1/60).yaw-1)<.003);
});
test('Drowned player melee reaches only the front; legs lost retain existing attack behavior',()=>{
 const z=zombie();assert.equal(drownedCanReach(z,0,1),true);assert.equal(drownedCanReach(z,0,-1),false);assert.equal(drownedCanReach(z,1,0),false);assert.equal(drownedCanReach(z,Math.sin(.8),Math.cos(.8)),true);z.typeKey='feral';assert.equal(drownedCanReach(z,0,-1),true);z.typeKey='drowned';z.crawling=true;assert.equal(drownedCanReach(z,0,-1),true);
});
test('QA switch restores prior steering and reach checks without leaving state',()=>{
 const z=zombie();tick(z,1,0,.1);setDrownedMotionEnabled(false);assert.equal(steerDrowned(z,1,0,.1),null);assert.equal(drownedCanReach(z,0,-1),true);setDrownedMotionEnabled(true);assert.ok(tick(z,-1,0,1/60).rate<0);
});

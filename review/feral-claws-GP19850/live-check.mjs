import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1200x850'}),proof={};
try{
  await E.open();
  await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-26,D.tg().floorY,-632);window.group=[];for(let i=0;i<48;i++){const a=i*2.399,r=4+Math.floor(i/12)*2;const z=T.spawnZombie(-26+Math.sin(a)*r,-632+Math.cos(a)*r,'feral',true,true);z.trainingZ=true;z.mesh.position.y=D.tg().floorY;z.hp=100000;group.push(z);}T.setShotView({x:-26,y:-184,z:-650,tx:-26,ty:-199,tz:-632,fov:54});return true;`);
  // Same actors, room and camera. Four seconds settling time includes first echo allocation / transparent pipeline warmup; first-toggle results are retained separately.
  proof.performance=await E.ev(`const sample=async enabled=>{T.feralMotionDbg.setEnabled(enabled);await wait(4000);const ts=[];await new Promise(done=>{const frame=t=>{ts.push(t);if(ts.length===241)done();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});const spans=ts.slice(1).map((t,i)=>t-ts[i]).sort((a,b)=>a-b);return {fps:240000/(ts.at(-1)-ts[0]),p95Ms:spans[Math.floor(spans.length*.95)],effects:T.feralMotionDbg.state(),alive:T.zombies.filter(z=>z.alive).length};};return {off:await sample(false),on:await sample(true),offAgain:await sample(false),onAgain:await sample(true)};`,40000);
  assert.equal(proof.performance.on.alive,48);assert.ok(proof.performance.on.effects.actors<=8);assert.ok(proof.performance.on.effects.echoes<=24);
  assert.ok(proof.performance.on.fps>57&&proof.performance.onAgain.fps>57,'48-Feral FPS stays near 60');
  proof.death=await E.ev(`const z=group[0];T.killZombie(z);await wait(150);return {alive:z.alive,count:T.feralMotionDbg.state(),echoes:T.scene.children.filter(o=>o.userData.feralEcho).length};`);
  assert.equal(proof.death.alive,false);
  proof.clear=await E.ev(`D.clear();await wait(150);return T.feralMotionDbg.state();`);assert.equal(proof.clear.actors,0);
  // Pool reuse: spawn a fresh actor, then maim it while the effect is active.
  proof.reuse=await E.ev(`const z=T.spawnZombie(-32,-632,'feral',true,true);z.trainingZ=true;z.mesh.position.y=D.tg().floorY;z.hp=10000;await wait(700);const before=T.feralMotionDbg.state();T.dismemberDbg(z,'legL');await wait(500);return {before,after:T.feralMotionDbg.state(),hopping:z.hopping,finite:z.mesh.position.toArray().every(Number.isFinite)};`);
  assert.ok(proof.reuse.finite);assert.equal(proof.reuse.after.actors,0);
  proof.claws=await E.ev(`D.clear();const z=T.spawnZombie(-30,-632,'feral',true,true);z.trainingZ=true;z.mesh.position.y=D.tg().floorY;z.hp=10000;await wait(500);const u=z.mesh.userData,Q=new T.THREE.Quaternion(),V=new T.THREE.Vector3(),O=new T.THREE.Vector3(),right=new T.THREE.Vector3(),upper=new T.THREE.Vector3(),fore=new T.THREE.Vector3();let frames=0,worstPalm=-1,minSide=Infinity,minFold=Infinity,maxFold=0,attackFrames=0,minH=Infinity,maxH=-Infinity;await new Promise(done=>{const frame=()=>{frames++;T.player.position.set(-26+Math.sin(frames*.025)*5,D.tg().floorY,-632+Math.cos(frames*.025)*5);z.mesh.updateMatrixWorld(true);u.torso.getWorldPosition(O);right.set(Math.cos(z.mesh.rotation.y),0,-Math.sin(z.mesh.rotation.y));for(const side of [-1,1]){const arm=side<0?u.armLG:u.armRG,el=arm.userData.elbowG;el.getWorldQuaternion(Q);worstPalm=Math.max(worstPalm,V.set(0,0,1).applyQuaternion(Q).y);minSide=Math.min(minSide,side*V.set(0,-.48*.88,.04*.88).applyMatrix4(el.matrixWorld).sub(O).dot(right));fore.set(0,-1,0).applyQuaternion(Q);upper.set(0,-1,0).applyQuaternion(arm.getWorldQuaternion(Q));const fold=upper.angleTo(fore);minFold=Math.min(minFold,fold);maxFold=Math.max(maxFold,fold);}if(z.attackWindup>0||z.swingT>0)attackFrames++;else{minH=Math.min(minH,u.hips.position.y);maxH=Math.max(maxH,u.hips.position.y);}if(frames>=180)done();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});return {worstPalm,minSide,minFold,maxFold,attackFrames,bounceRange:maxH-minH};`);
  assert.ok(proof.claws.worstPalm<-.9,'actual sculpted palms stay downward');
  assert.ok(proof.claws.minSide>.15,'actual claws remain outside the chest center');
  assert.ok(proof.claws.minFold>.65&&proof.claws.maxFold<2.3,'clear elbow bend stays bounded');
  assert.ok(proof.claws.bounceRange>.05,'actual hips have a visible bounce');
  await E.ev('D.clear();D.leave();await wait(300);return true;');
  proof.leave=await E.ev('return T.feralMotionDbg.state();');assert.equal(proof.leave.actors,0);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  console.log('PASS: 48 real Ferals; bounded 8 actors/24 echoes; death, clear, pool reuse/maiming and exit cleanup; zero browser errors.');
  console.log(JSON.stringify(proof.performance));
}finally{fs.writeFileSync('review/feral-claws-GP19850/live-proof.json',JSON.stringify(proof,null,2));await E.close();}
process.exit(0);

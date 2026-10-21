import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1200x850'}),proof={};
try{
  await E.open();
  await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-26,D.tg().floorY,-632);window.group=[];for(let i=0;i<48;i++){const a=i*2.399,r=4+Math.floor(i/12)*2;const z=T.spawnZombie(-26+Math.sin(a)*r,-632+Math.cos(a)*r,'feral',true,true);z.trainingZ=true;z.mesh.position.y=D.tg().floorY;z.hp=100000;group.push(z);}T.setShotView({x:-26,y:-184,z:-650,tx:-26,ty:-199,tz:-632,fov:54});return true;`);
  // Same actors, room and camera; compare the effect on/off without reloading.
  proof.performance=await E.ev(`const sample=async enabled=>{T.feralMotionDbg.setEnabled(enabled);await wait(1400);const ts=[];await new Promise(done=>{const frame=t=>{ts.push(t);if(ts.length===241)done();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});const spans=ts.slice(1).map((t,i)=>t-ts[i]).sort((a,b)=>a-b);return {fps:240000/(ts.at(-1)-ts[0]),p95Ms:spans[Math.floor(spans.length*.95)],effects:T.feralMotionDbg.state(),alive:T.zombies.filter(z=>z.alive).length};};return {off:await sample(false),on:await sample(true),offAgain:await sample(false),onAgain:await sample(true)};`,40000);
  assert.equal(proof.performance.on.alive,48);assert.ok(proof.performance.on.effects.actors<=8);assert.ok(proof.performance.on.effects.echoes<=24);
  assert.ok(proof.performance.on.fps>57&&proof.performance.onAgain.fps>57,'48-Feral FPS stays near 60');
  proof.death=await E.ev(`const z=group[0];T.killZombie(z);await wait(150);return {alive:z.alive,count:T.feralMotionDbg.state(),echoes:T.scene.children.filter(o=>o.userData.feralEcho).length};`);
  assert.equal(proof.death.alive,false);
  proof.clear=await E.ev(`D.clear();await wait(150);return T.feralMotionDbg.state();`);assert.equal(proof.clear.actors,0);
  // Pool reuse: spawn a fresh actor, then maim it while the effect is active.
  proof.reuse=await E.ev(`const z=T.spawnZombie(-32,-632,'feral',true,true);z.trainingZ=true;z.mesh.position.y=D.tg().floorY;z.hp=10000;await wait(700);const before=T.feralMotionDbg.state();T.dismemberDbg(z,'legL');await wait(500);return {before,after:T.feralMotionDbg.state(),hopping:z.hopping,finite:z.mesh.position.toArray().every(Number.isFinite)};`);
  assert.ok(proof.reuse.finite);assert.equal(proof.reuse.after.actors,0);
  await E.ev('D.clear();D.leave();await wait(300);return true;');
  proof.leave=await E.ev('return T.feralMotionDbg.state();');assert.equal(proof.leave.actors,0);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  console.log('PASS: 48 real Ferals; bounded 8 actors/24 echoes; death, clear, pool reuse/maiming and exit cleanup; zero browser errors.');
  console.log(JSON.stringify(proof.performance));
}finally{fs.writeFileSync('review/feral-arms-GP19849/live-proof.json',JSON.stringify(proof,null,2));await E.close();}
process.exit(0);

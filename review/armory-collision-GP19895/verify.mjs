import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const dir='review/armory-collision-GP19895',E=new Engine({training:true,warm:'none',size:'1400x900'}),proof={};
try {
 await E.open();proof.loadSec=E.loadSec;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');window.D=T.trainingDbg;window.tg=D.tg();window.s=tg.stations.armory;window.f=tg.floorY;`);
 proof.collision=await E.ev(`T.player.position.set(s.x-2,f,s.z-.76);T.setVelDbg(0,0);await wait(150);T.player.position.x=s.x-.5;await wait(150);return T.player.position.toArray();`);
 assert(proof.collision[0]<=6.461);
 await E.shoot({cam:{x:7.98-8,y:-193,z:-643+5,tx:7.98-.5,ty:-198.4,tz:-643-.76,fov:48},out:dir+'/after-blocked.png'});
 proof.menu=await E.ev(`R.release();T.player.position.set(s.front.x,f,s.front.z);T.setVelDbg(0,0);await wait(400);const action=D.action(),position=T.player.position.toArray();T.doAction();await wait(150);return {action,position,cif:T.isCIFOpen(),armory:document.querySelector('.armory-only')!==null};`);
 assert.equal(proof.menu.action,'armory');assert(proof.menu.cif&&proof.menu.armory);await E.page.screenshot(dir+'/after-armory-menu.png');
 await E.ev(`T.closeCIF();T.closeShop();await wait(100);`);
 proof.motion=await E.ev(`const states=[];for(const z of[s.z-2.2,s.z+3.7]){T.player.position.set(6,f,z);T.setVelDbg(0,0);await wait(100);T.player.position.x=7.2;await wait(120);states.push(T.player.position.toArray());}
 T.player.position.set(6.46,f,s.z);T.setVelDbg(0,0);await wait(100);T.player.position.z=s.z+1.5;await wait(150);const tangent=T.player.position.toArray();
 T.player.position.set(5.8,f,s.z+.76);T.setVelDbg(120,0);await wait(180);const fast=T.player.position.toArray();return {sides:states,tangent,fast};`);
 for(const p of proof.motion.sides)assert(Math.abs(p[0]-7.2)<.001);assert(Math.abs(proof.motion.tangent[2]-(-641.5))<.001);assert(proof.motion.fast[0]<=6.461);
 proof.reentry=await E.ev(`const c=D.state().armoryCollision;D.leave();D.enter();await wait(250);D.panel().close();return {same:c===D.state().armoryCollision,exists:!!D.state().armoryCollision};`);assert(proof.reentry.same&&proof.reentry.exists);
 proof.performance=await E.ev(`R.release();D.panel().close();T.player.position.set(-27,f,-632);T.setVelDbg(0,0);for(let i=0;i<48;i++){const z=T.spawnZombie(-35+(i%8)*2,-625+Math.floor(i/8)*2,'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=f;}T.setShotView({x:-25,y:-180,z:-655,tx:-27,ty:-199,tz:-630,fov:48});await wait(1500);const saved=D.state().armoryCollision,results=[];for(const enabled of[false,true,false,true]){D.state().armoryCollision=enabled?saved:null;await wait(200);const times=[];await new Promise(done=>{const start=performance.now();let prev=start;function frame(t){times.push(t-prev);prev=t;t-start>1300?done():requestAnimationFrame(frame);}requestAnimationFrame(frame);});results.push({enabled,fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),worst:Math.max(...times),over50:times.filter(t=>t>50).length});}D.state().armoryCollision=saved;D.clear();return results;`);
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log('PASS native Armory collision, menu, fast movement, both side aisles, tangent movement and reentry',JSON.stringify(proof));
}finally{fs.writeFileSync(dir+'/after-proof.json',JSON.stringify({...proof,errors:E.page.errors},null,2));await E.close();}process.exit(0);

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'), dir='review/shambler-miss-GP19853',proof={};
const E=new Engine({training:true,warm:'none',size:'1200x850'});
if(before)E.load=async function(){const goto=this.page.goto.bind(this.page);this.page.goto=(url,...args)=>goto(url.replace('/index.html?',`/${dir}/before.html?`),...args);try{await Engine.prototype.load.call(this);}finally{this.page.goto=goto;}};
try{
  await E.open();proof.loadSec=E.loadSec;
  await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.setArmor(100);T.player.position.set(-26,D.tg().floorY,-632);window.M=await import('/game/shambler-recovery.js');window.F=T.spawnZombie(-27,-632,'shambler',true,true);F.trainingZ=true;F.mesh.position.y=D.tg().floorY;F.hp=10000;F.riseT=0;F.attackCd=0;return true;`);
  if(!before){
    proof.hit=await E.ev(`const start=T.getArmor();let n=0;while(T.getArmor()===start&&n++<250)await wait(16);return {armorBefore:start,armorAfter:T.getArmor(),state:M.shamblerRecoveryState(F),alive:F.alive};`,6000);
    assert.ok(proof.hit.armorAfter<proof.hit.armorBefore,'successful actual melee damaged armor');
    assert.equal(proof.hit.state,null,'successful hit does not start frustration');
    proof.interruption=await E.ev(`T.player.position.set(F.mesh.position.x+1.1,D.tg().floorY,F.mesh.position.z);let n=0;while(F.attackWindup<=0&&n++<250)await wait(16);if(F.attackWindup<=0)throw Error('no second real windup');T.player.position.z+=3.2;n=0;while(!F.shamblerRecoveryActive&&n++<150)await wait(16);const active=!!F.shamblerRecoveryActive;T.damageZombie(F,1,{kind:'bullet',hitY:F.mesh.position.y+.9,dir:{x:1,z:0}});await wait(70);return {activeBeforeShot:active,hp:F.hp,state:M.shamblerRecoveryState(F),activeAfterShot:!!F.shamblerRecoveryActive,hitPartT:F.hitPartT};`,8000);
    assert.ok(proof.interruption.activeBeforeShot);assert.equal(proof.interruption.state,null);assert.equal(proof.interruption.activeAfterShot,false);
  }
  await E.ev(`D.clear();T.player.position.set(-26,D.tg().floorY,-632);window.Z=[];for(let i=0;i<48;i++){const a=i*2.399,r=4+Math.floor(i/12)*2;const z=T.spawnZombie(-26+Math.sin(a)*r,-632+Math.cos(a)*r,'shambler',true,true);z.trainingZ=true;z.mesh.position.y=D.tg().floorY;z.hp=100000;z.riseT=0;z.attackCd=100;Z.push(z);}T.setShotView({x:-26,y:-184,z:-650,tx:-26,ty:-199,tz:-632,fov:54});return true;`);
  proof.performance=await E.ev(`await wait(2500);const ts=[];let maxActive=0,last=0;const exercise=${!before};await new Promise(done=>{const frame=t=>{if(exercise&&t-last>1400){for(const z of Z)M.shamblerLungeResult(z,false);last=t;}maxActive=Math.max(maxActive,Z.filter(z=>z.shamblerRecoveryActive).length);ts.push(t);if(ts.length===361)done();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});const spans=ts.slice(1).map((t,i)=>t-ts[i]).sort((a,b)=>a-b);return {count:Z.length,fps:360000/(ts.at(-1)-ts[0]),p95Ms:spans[Math.floor(spans.length*.95)],maxActive};`,13000);
  if(!before)assert.equal(proof.performance.maxActive,48);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log(JSON.stringify(proof));
}finally{fs.writeFileSync(`${dir}/${before?'before':'after'}-live-proof.json`,JSON.stringify(proof,null,2));await E.close();}process.exit(0);

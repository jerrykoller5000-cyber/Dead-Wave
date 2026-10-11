import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={};
const kinds=['shambler','feral','leaper','drowned','military','brute','spitter','screamer','bomber','spider','demon','colossus','guardian','caveguard'];
try{
  await E.open();proof.loadSeconds=E.loadSec;
  await E.page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:1000,y:450,button:'left',clickCount:1});await E.page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:1000,y:450,button:'left',clickCount:1});
  proof.setup=await E.ev(`R.release();T.clearZombies();T.skipGrace();T.setHp(100000);T.AudioSys.setMuted(false);T.AudioSys.setMusicVolume(0);T.AudioSys.unlock();await wait(3500);const tg=T.trainingDbg.tg(),room=tg.zombieRoom;T.player.position.set((room.minX+room.maxX)/2,tg.floorY,(room.minZ+room.maxZ)/2);await wait(100);return {training:T.trainingDbg.state().active,mix:T.AudioSys.mixState()};`);assert(proof.setup.training);assert.equal(proof.setup.mix.ctx,'running');
  proof.events=[];
  for(const type of kinds){const r=await E.ev(`
    T.clearZombies();const A=T.AudioSys,P=T.player.position,type=${JSON.stringify(type)};
    const z=T.spawnZombie(P.x+3,P.z,type,true,true);z.trainingZ=true;z.tactics='direct';z.speed=z.baseSpeed=0;z.hp=z.maxHp=100000;
    const before={...A.voiceCount};T.damageZombie(z,1,{kind:'generic'});await wait(350);
    const hurt=(A.voiceCount[type+':hurt']||0)-(before[type+':hurt']||0);
    const counts={...A.voiceCount};T.damageZombie(z,10000000,{kind:'generic'});await wait(80);
    const fatalHurt=(A.voiceCount[type+':hurt']||0)-(counts[type+':hurt']||0),death=(A.voiceCount[type+':death']||0)-(counts[type+':death']||0);
    const other=T.spawnZombie(P.x+3,P.z,type,true,true);other.trainingZ=true;other.tactics='direct';other.speed=other.baseSpeed=0;const d0=A.voiceCount[type+':death']||0;T.killZombie(other,false);await wait(100);
    return {type,hurt,fatalHurt,death,noRewardDeath:(A.voiceCount[type+':death']||0)-d0};
  `);proof.events.push(r);assert.equal(r.hurt,1,type+' first hit');assert.equal(r.fatalHurt,0,type+' fatal pain');assert.equal(r.death,1,type+' death');assert.equal(r.noRewardDeath,1,type+' no-reward death');}
  proof.live=[];
  for(const [type,distance] of [['shambler',.75],['spitter',9],['spider',8],['demon',10],['guardian',2],['colossus',2],['bomber',1.2],['screamer',5]]){
    const r=await E.ev(`T.clearZombies();const A=T.AudioSys,P=T.player.position,type=${JSON.stringify(type)},before={...A.voiceCount};const z=T.spawnZombie(P.x+${distance},P.z,type,true,true);z.trainingZ=true;z.groanCd=.001;z.spitCd=.001;z.chargeCd=.001;z.slamCd=.001;z.screamCd=.001;z.attackCd=0;z.speed=z.baseSpeed=0;z.hp=z.maxHp=100000;await wait(2200);return {type,idle:(A.voiceCount[type+':idle']||0)-(before[type+':idle']||0),chase:(A.voiceCount[type+':chase']||0)-(before[type+':chase']||0),attack:(A.voiceCount[type+':attack']||0)-(before[type+':attack']||0),death:(A.voiceCount[type+':death']||0)-(before[type+':death']||0),position:z.mesh?.position.toArray()??null,player:P.toArray(),tactics:z.tactics,alive:z.alive};`);proof.live.push(r);assert(r.attack>0,type+' live attack');
  }
  proof.mute=await E.ev(`T.clearZombies();const A=T.AudioSys,b={...A.voiceCount};A.setMuted(true);A.zombieVoice('guardian','idle');A.zombieVoice('guardian','attack');A.zombieHit(1,0,false,'guardian');A.zombieDeath(1,0,true,'guardian');A.setMuted(false);return JSON.stringify(b)===JSON.stringify(A.voiceCount);`);assert(proof.mute);
  proof.performance=await E.ev(`T.clearZombies();const A=T.AudioSys,P=T.player.position,tg=T.trainingDbg.tg(),types=['shambler','feral','leaper','drowned','military','brute','spitter','screamer','bomber','spider','demon','colossus','guardian','caveguard'];for(let i=0;i<48;i++){const z=T.spawnZombie(P.x-8+i%8*2,P.z-8+Math.floor(i/8)*2,types[i%types.length],true,true);z.trainingZ=true;z.speed=z.baseSpeed=0;z.tactics='direct';z.attackCd=100;z.hp=z.maxHp=100000;}await wait(800);const sample=async muted=>{A.setMuted(muted);let frames=0,start=performance.now();await new Promise(resolve=>{const tick=now=>{frames++;if(now-start>=3000)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});return frames*1000/(performance.now()-start);};const silent=await sample(true),voiced=await sample(false);T.clearZombies();return {bodies:48,silentFps:silent,voicedFps:voiced,ratio:voiced/silent};`);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  fs.writeFileSync('review/zombie-audio/gameplay-proof.json',JSON.stringify(proof,null,2));console.log('PASS: 14 actual first-hit/death/no-reward-death paths, no fatal pain; eight live attack paths; Training audible; mute preserved; zero page errors');
}finally{fs.writeFileSync('review/zombie-audio/gameplay-progress.json',JSON.stringify(proof,null,2));await E.close();}

process.exit(0);

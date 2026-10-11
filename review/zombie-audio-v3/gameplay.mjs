import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={};
const kinds=['shambler','feral','leaper','drowned','military','brute','spitter','screamer','bomber','spider','demon','colossus','guardian','caveguard'];
try{
  await E.open();proof.loadSeconds=E.loadSec;
  await E.page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:1000,y:450,button:'left',clickCount:1});await E.page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:1000,y:450,button:'left',clickCount:1});
  proof.setup=await E.ev(`R.release();T.clearZombies();T.skipGrace();T.setHp(100000);T.AudioSys.setMuted(false);T.AudioSys.setMusicVolume(0);T.AudioSys.unlock();await wait(3500);const tg=T.trainingDbg.tg(),room=tg.zombieRoom;T.player.position.set((room.minX+room.maxX)/2,tg.floorY,(room.minZ+room.maxZ)/2);await wait(100);return {training:T.trainingDbg.state().active,mix:T.AudioSys.mixState()};`);assert(proof.setup.training);assert.equal(proof.setup.mix.ctx,'running');
  await E.ev(`window.voiceProbe={calls:[],original:{}};for(const name of ['zombieVoice','zombieHit','zombieDeath','deadStep']){const original=T.AudioSys[name];voiceProbe.original[name]=original;T.AudioSys[name]=(...args)=>{voiceProbe.calls.push({name,args});return original(...args);};}`);
  proof.events=[];
  for(const type of kinds){const r=await E.ev(`
    T.clearZombies();voiceProbe.calls.length=0;const A=T.AudioSys,P=T.player.position,type=${JSON.stringify(type)};
    const z=T.spawnZombie(P.x+3,P.z,type,true,true);z.trainingZ=true;z.tactics='direct';z.speed=z.baseSpeed=0;z.hp=z.maxHp=100000;
    const before={...A.voiceCount};T.damageZombie(z,1,{kind:'generic'});await wait(350);
    const hurt=(A.voiceCount[type+':hurt']||0)-(before[type+':hurt']||0);
    const counts={...A.voiceCount};T.damageZombie(z,10000000,{kind:'generic'});await wait(80);
    const fatalHurt=(A.voiceCount[type+':hurt']||0)-(counts[type+':hurt']||0),death=(A.voiceCount[type+':death']||0)-(counts[type+':death']||0);
    const other=T.spawnZombie(P.x+3,P.z,type,true,true);other.trainingZ=true;other.tactics='direct';other.speed=other.baseSpeed=0;const d0=A.voiceCount[type+':death']||0;T.killZombie(other,false);await wait(100);
    const hit=voiceProbe.calls.find(c=>c.name==='zombieHit'),deaths=voiceProbe.calls.filter(c=>c.name==='zombieDeath');
    return {type,hurt,fatalHurt,death,noRewardDeath:(A.voiceCount[type+':death']||0)-d0,emitterPassed:hit?.args[4]===z&&deaths[0]?.args[4]===z&&deaths[1]?.args[4]===other};
  `);proof.events.push(r);assert.equal(r.hurt,1,type+' first hit');assert.equal(r.fatalHurt,0,type+' fatal pain');assert.equal(r.death,1,type+' death');assert.equal(r.noRewardDeath,1,type+' no-reward death');assert(r.emitterPassed,type+' hit/death identity');}
  proof.live=[];
  for(const [type,distance] of [['shambler',.75],['spitter',9],['spider',8],['demon',10],['guardian',2],['colossus',2],['bomber',1.2],['screamer',5]]){
    const r=await E.ev(`T.clearZombies();const A=T.AudioSys,P=T.player.position,type=${JSON.stringify(type)},before={...A.voiceCount};const z=T.spawnZombie(P.x+${distance},P.z,type,true,true);z.trainingZ=true;z.groanCd=.001;z.spitCd=.001;z.chargeCd=.001;z.slamCd=.001;z.screamCd=.001;z.attackCd=0;z.speed=z.baseSpeed=0;z.hp=z.maxHp=100000;await wait(2200);return {type,idle:(A.voiceCount[type+':idle']||0)-(before[type+':idle']||0),chase:(A.voiceCount[type+':chase']||0)-(before[type+':chase']||0),attack:(A.voiceCount[type+':attack']||0)-(before[type+':attack']||0),charge:(A.voiceCount[type+':charge']||0)-(before[type+':charge']||0),death:(A.voiceCount[type+':death']||0)-(before[type+':death']||0),position:z.mesh?.position.toArray()??null,player:P.toArray(),tactics:z.tactics,alive:z.alive};`);proof.live.push(r);assert((type==='demon'?r.charge:r.attack)>0,type+' live action');
  }
  proof.movement=[];
  for(const type of ['leaper','colossus']){const r=await E.ev(`T.clearZombies();const A=T.AudioSys,tg=T.trainingDbg.tg(),w=tg.zombieRoom,P=T.player.position;P.set((w.minX+w.maxX)/2,tg.floorY,(w.minZ+w.maxZ)/2);const type='${type}',state=type==='leaper'?'move':'step',before=A.voiceCount[type+':'+state]||0;const z=T.spawnZombie(P.x+10,P.z,type,true,true);z.trainingZ=true;z.leapCd=100;z.slamCd=100;z.groanCd=100;z.attackCd=100;await wait(2300);return {type,state,count:(A.voiceCount[type+':'+state]||0)-before};`);proof.movement.push(r);assert(r.count>0,type+' actual movement sound');}
  proof.emitters=await E.ev(`const kinds=['zombieVoice','zombieHit','zombieDeath','deadStep'];const result=Object.fromEntries(kinds.map(name=>{const calls=voiceProbe.calls.filter(c=>c.name===name);return [name,{calls:calls.length,allHaveEmitter:calls.every(c=>c.args[4]&&typeof c.args[4]==='object')}];}));for(const name of kinds)T.AudioSys[name]=voiceProbe.original[name];delete window.voiceProbe;return result;`);
  for(const [name,r]of Object.entries(proof.emitters))assert(r.allHaveEmitter,name+' live caller omitted identity');
  // Legacy optional-argument calls intentionally have no emitter; keep this mute probe out of the live-caller audit.
  proof.mute=await E.ev(`T.clearZombies();const A=T.AudioSys,b={...A.voiceCount};A.setMuted(true);A.zombieVoice('guardian','idle');A.zombieVoice('guardian','attack');A.zombieHit(1,0,false,'guardian');A.zombieDeath(1,0,true,'guardian');A.setMuted(false);return JSON.stringify(b)===JSON.stringify(A.voiceCount);`);assert(proof.mute);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  fs.writeFileSync('review/zombie-audio-v3/gameplay-proof.json',JSON.stringify(proof,null,2));console.log('PASS: 14 actual first-hit/death/no-reward-death paths and emitter identity, no fatal pain; eight live actions; movement voices; Training audible; mute preserved; zero page errors');
}finally{fs.writeFileSync('review/zombie-audio-v3/gameplay-progress.json',JSON.stringify(proof,null,2));await E.close();}

process.exit(0);

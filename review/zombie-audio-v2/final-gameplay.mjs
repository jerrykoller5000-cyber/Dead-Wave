import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';

const proof={at:new Date().toISOString()};
const types=['shambler','feral','leaper','drowned','military','brute','spitter','screamer','bomber','spider','demon','colossus','guardian','caveguard'];
for(const mode of ['training','match']){
  const E=new Engine({[mode]:true,warm:'none',size:'1440x900'});
  try{
    await E.open();
    await E.page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:1000,y:450,button:'left',clickCount:1});
    await E.page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:1000,y:450,button:'left',clickCount:1});
    await E.ev(`R.release();T.clearZombies();T.skipGrace();T.setHp(100000);T.AudioSys.setMuted(false);T.AudioSys.setMusicVolume(0);T.AudioSys.unlock();await wait(500);`);
    if(mode==='training'){
      proof.performance=await E.ev(`
        const A=T.AudioSys,P=T.player.position,tg=T.trainingDbg.tg(),room=tg.zombieRoom,types=${JSON.stringify(types)};
        P.set((room.minX+room.maxX)/2,tg.floorY,(room.minZ+room.maxZ)/2);
        for(let i=0;i<48;i++){
          const z=T.spawnZombie(P.x-8+i%8*2,P.z-8+Math.floor(i/8)*2,types[i%types.length],true,true);
          z.trainingZ=true;z.speed=z.baseSpeed=0;z.tactics='direct';z.attackCd=100;z.hp=z.maxHp=100000;z.groanCd=.05+i*.08;
        }
        await wait(1000);
        const sample=async muted=>{
          A.setMuted(muted);let frames=0,start=performance.now();
          await new Promise(resolve=>{const tick=now=>{frames++;if(now-start>=3000)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
          return frames*1000/(performance.now()-start);
        };
        const silent=await sample(true),before={...A.voiceCount},voiced=await sample(false);
        const cries=Object.entries(A.voiceCount).filter(([k])=>k.includes(':')).reduce((n,[k,v])=>n+v-(before[k]||0),0);
        T.clearZombies();
        return {bodies:48,silentFps:silent,voicedFps:voiced,ratio:voiced/silent,actualCries:cries};
      `);
      assert(proof.performance.actualCries>0,'performance sample really voices zombies');
    }else{
      proof.worldScreamer=await E.ev(`
        const A=T.AudioSys,P=T.player.position,before=A.voiceCount['screamer:attack']||0,original=A.scream;let legacyCalls=0;
        A.scream=(...args)=>{legacyCalls++;return original?.(...args);};
        try{
          const z=T.spawnZombie(P.x+5,P.z,'screamer',true,true);z.screamCd=.001;z.groanCd=100;z.speed=z.baseSpeed=0;z.hp=z.maxHp=100000;
          await wait(1600);
          return {training:T.trainingDbg.state().active,newAttackCues:(A.voiceCount['screamer:attack']||0)-before,legacyCalls,tactics:z.tactics,context:A.mixState().ctx};
        }finally{A.scream=original;T.clearZombies();}
      `);
      assert.equal(proof.worldScreamer.training,false);
      assert.equal(proof.worldScreamer.context,'running');
      assert(proof.worldScreamer.newAttackCues>0,'world special emits revised screamer');
      assert.equal(proof.worldScreamer.legacyCalls,0,'world special no longer uses legacy cue');
    }
    proof[mode]={loadSeconds:E.loadSec,renderer:E.renderer,errors:E.page.errors};
    assert.equal(E.page.errors.length,0);
  }finally{await E.close();}
}
fs.writeFileSync('review/zombie-audio-v2/final-gameplay-proof.json',JSON.stringify(proof,null,2));
console.log('PASS: isolated 48-body voiced comparison; actual main-game screamer special uses revised voice, zero legacy calls or page errors');
console.log(JSON.stringify(proof,null,2));
process.exit(0);

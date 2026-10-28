// GP-19977: same 48-body stress fixture as GP-19853, without overwriting its saved proof.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';

const out='handoffs/GP-19977/performance.json';
const engine=new Engine({training:true,warm:'none',size:'1100x780'});
const proof={};
try{
  await engine.open();proof.loadSec=engine.loadSec;
  await engine.ev(`
    R.release();window.D=T.trainingDbg;D.panel().close();D.clear();
    T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-26,D.tg().floorY,-632);
    window.M=await import('/game/shambler-recovery.js');window.Z=[];
    for(let i=0;i<48;i++){
      const a=i*2.399,r=4+Math.floor(i/12)*2;
      const z=T.spawnZombie(-26+Math.sin(a)*r,-632+Math.cos(a)*r,'shambler',true,true);
      z.trainingZ=true;z.mesh.position.y=D.tg().floorY;z.hp=100000;z.riseT=0;z.attackCd=100;Z.push(z);
    }
    T.setShotView({x:-26,y:-184,z:-650,tx:-26,ty:-199,tz:-632,fov:54});return true;
  `);
  proof.performance=await engine.ev(`
    await wait(2500);const ts=[];let maxActive=0,last=0;
    await new Promise(done=>{const frame=t=>{
      if(t-last>1400){for(const z of Z)M.shamblerLungeResult(z,false);last=t;}
      maxActive=Math.max(maxActive,Z.filter(z=>z.shamblerRecoveryActive).length);
      ts.push(t);if(ts.length===361)done();else requestAnimationFrame(frame);
    };requestAnimationFrame(frame);});
    const spans=ts.slice(1).map((t,i)=>t-ts[i]).sort((a,b)=>a-b);
    return {count:Z.length,fps:360000/(ts.at(-1)-ts[0]),p95Ms:spans[Math.floor(spans.length*.95)],maxActive};
  `,16000);
  proof.errors=engine.page.errors;
  assert.equal(proof.performance.count,48);
  assert.equal(proof.performance.maxActive,48);
  assert.equal(proof.errors.length,0);
  console.log(JSON.stringify(proof));
}finally{fs.writeFileSync(out,JSON.stringify(proof,null,2));await engine.close();}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const E=new Engine({training:true,warm:'none',size:'1280x720'}),out='review/GP-20086/corpse-perf-bone.json',proof={};
try{
  await E.open();
  proof.runs=await E.ev(`R.release();const D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');const f=D.tg().floorY;T.player.position.set(-10,f,-614);T.setVelDbg(0,0);T.setShotView({x:-17,y:f+19,z:-610,tx:-26,ty:f+1,tz:-634,fov:50});const runs=[];for(const settle of[false,true]){T.clearZombies();const pack=[];for(let i=0;i<18;i++){const x=-36+(i%6)*4,z=-644+Math.floor(i/6)*6,b=T.spawnZombie(x,z,'shambler',true,true);b.trainingZ=true;b.riseT=0;b.speed=b.baseSpeed=0;b.hp=b.maxHp=1000;b.mesh.position.set(x,f,z);pack.push(b)}T.stepFrame(.016);for(const b of pack)T.killZombie(b,false,{kind:'bullet',dir:{x:1,z:0},raw:0});const corpses=T.getCorpses();if(!settle)for(const c of corpses)c.trainingSettled=true;const times=[];for(let i=0;i<90;i++){const a=performance.now();T.stepFrame(.016);times.push(performance.now()-a)}times.sort((a,b)=>a-b);runs.push({settle,corpses:corpses.length,mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)],max:times.at(-1),lift:corpses.map(c=>c.trainingLift||0)})}return runs;`,25000);
  assert(proof.runs.every(r=>r.corpses===18));
  assert.deepEqual(E.page.errors,[]);
  console.log(JSON.stringify(proof.runs.map(({lift,...r})=>({...r,meanLift:lift.reduce((a,b)=>a+b,0)/lift.length}))));
}finally{fs.writeFileSync(out,JSON.stringify(proof,null,2));await E.close()}

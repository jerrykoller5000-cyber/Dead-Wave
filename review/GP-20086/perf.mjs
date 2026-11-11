import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const E=new Engine({training:true,warm:'none',size:'1280x720'}),out='review/GP-20086/perf.json',proof={};
try{
  await E.open();
  proof.loadSec=E.loadSec;
  proof.runs=await E.ev(`R.release();const D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');const f=D.tg().floorY;T.player.position.set(-10,f,-614);T.setVelDbg(0,0);const pack=[];for(let i=0;i<48;i++){const x=-38+(i%8)*2.6,z=-644+Math.floor(i/8)*3,b=T.spawnZombie(x,z,'shambler',true,true);b.trainingZ=true;b.mesh.position.y=f;b.riseT=0;b.hp=b.maxHp=1e5;b.speed=b.baseSpeed=0;pack.push(b)}T.setShotView({x:-17,y:f+20,z:-610,tx:-25,ty:f+1,tz:-634,fov:50});const C=D.state().zombieCollision,saved=C.keep;await new Promise(r=>setTimeout(r,1000));const runs=[];for(const on of[false,true,false,true]){C.keep=on?saved:()=>{};await new Promise(r=>setTimeout(r,250));let last=performance.now(),start=last,times=[];while(performance.now()-start<2300){await new Promise(r=>requestAnimationFrame(r));const next=performance.now();times.push(next-last);last=next}const sorted=times.slice().sort((a,b)=>a-b);runs.push({on,fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),p95:sorted[Math.floor(sorted.length*.95)],frames:times.length,alive:pack.filter(z=>z.alive).length})}C.keep=saved;return runs;`,25000);
  assert(proof.runs.every(r=>r.alive===48),'48 zombies alive');
  assert.deepEqual(E.page.errors,[]);
  console.log(JSON.stringify(proof));
}finally{fs.writeFileSync(out,JSON.stringify(proof,null,2));await E.close()}

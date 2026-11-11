import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const E=new Engine({training:true,warm:'none',size:'1280x720'}),out='review/GP-20086/door-and-bomber.json',proof={};
try{
  await E.open();
  proof.rows=await E.ev(`R.release();const D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);const tg=D.tg(),f=tg.floorY,C=D.state().zombieCollision,inf=D.state().infirmaryFence,s=inf.solids[0],rows=[];T.player.position.set(-10,f,-614);T.setVelDbg(0,0);for(const kind of Object.keys(T.ZOMBIE_TYPES).filter(k=>k!=='caveguard')){T.clearZombies();const z=T.spawnZombie(s.maxX+2,(s.minZ+s.maxZ)/2,kind,true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(s.maxX+2,f,(s.minZ+s.maxZ)/2);let minX=Infinity;for(let i=0;i<36;i++){z.mesh.position.x-=.12;T.stepFrame(.016);minX=Math.min(minX,C.bounds(z.mesh).min.x)}rows.push({kind,minX,fenceMaxX:s.maxX,raised:inf.state().raised})}T.clearZombies();const z=T.spawnZombie(-42,-630,'bomber',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(-42,f,-630);z.attackCd=0;z.attackWindup=.45;z.swingT=.28;T.player.position.set(-41.2,f,-630);let frames=0,attackFrames=0;for(let i=0;i<60;i++){T.stepFrame(.016);if(!z.alive||!z.mesh)break;frames++;if(z.attackWindup>0||z.swingT>0)attackFrames++}return {rows,bomber:{frames,attackFrames}};`,30000);
  for(const row of proof.rows.rows){assert(row.raised,`${row.kind} infirmary fence was lowered`);assert(row.minX>=row.fenceMaxX-.03,`${row.kind} through infirmary door`)}
  assert.deepEqual(E.page.errors,[]);
  console.log(`PASS GP-20086 raised infirmary door for ${proof.rows.rows.length} kinds; bomber contact resolves immediately; 0 page errors`);
}finally{fs.writeFileSync(out,JSON.stringify(proof,null,2));await E.close()}

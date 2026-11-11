import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const E=new Engine({training:true,warm:'none',size:'1280x720'}),out='review/GP-20086/guardian-poses.json',rows=[];
try{await E.open();for(const [pose,fallWay,style] of [['sprawl','back','topple'],['facedown','forward','topple'],['reach','forward','topple'],['crumple','back','crumple']]){
  const row=await E.ev(`R.release();const D=T.trainingDbg;D.panel().close();T.clearZombies();const f=D.tg().floorY;T.AudioSys.setMuted(true);T.player.position.set(-10,f,-614);T.setVelDbg(0,0);T.setShotView({x:-25,y:f+6,z:-623,tx:-30,ty:f+2,tz:-630,fov:44});for(const c of T.getCorpses()){c.mesh.visible=false;c.pool.visible=false}const z=T.spawnZombie(-30,-630,'guardian',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(-30,f,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});const c=T.getCorpses().at(-1);c.pose='${pose}';c.fallWay='${fallWay}';c.style='${style}';c.tip=1;c.twist=0;c.jitter=0;c.fallT=${style==='crumple'?.8:.6};for(let i=0;i<75;i++)T.stepFrame(.016);const b=D.state().zombieCollision.bounds(c.mesh);return {pose:'${pose}',lift:c.trainingLift,rootY:c.mesh.position.y,boxMin:b.min.y,boxMax:b.max.y};`,30000);
  rows.push(row);await E.page.screenshot(`review/GP-20086/guardian-${pose}.png`);
}console.log(JSON.stringify(rows));}finally{fs.writeFileSync(out,JSON.stringify(rows,null,2));await E.close()}

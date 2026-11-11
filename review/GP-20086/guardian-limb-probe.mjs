import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const E=new Engine({training:true,warm:'none',size:'1280x720'});
try {
  await E.open();
  const proof=await E.ev(`R.release();return (()=>{const T=TT,D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);const f=D.tg().floorY;T.player.position.set(-10,f,-614);T.setVelDbg(0,0);T.setShotView({x:-25,y:f+6,z:-623,tx:-30,ty:f+2,tz:-630,fov:44});const z=T.spawnZombie(-30,-630,'guardian',true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;z.mesh.position.set(-30,f,-630);T.stepFrame(.016);T.killZombie(z,false,{kind:'bullet',dir:{x:-1,z:0},raw:120});for(let i=0;i<75;i++)T.stepFrame(.016);const c=T.getCorpses().at(-1),u=c.mesh.userData,B=g=>{const b=new T.THREE.Box3().setFromObject(g);return{min:[b.min.x,b.min.y,b.min.z],max:[b.max.x,b.max.y,b.max.z],center:[(b.min.x+b.max.x)/2,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2]}};return {floor:f,root:{position:c.mesh.position.toArray(),rotation:c.mesh.rotation.toArray()},body:B(c.mesh),limbs:Object.fromEntries(['armLG','armRG','legLG','legRG'].map(k=>[k,{rotation:u[k].rotation.toArray(),box:B(u[k]),name:u[k].name,children:u[k].children.map(o=>o.name)}]))};})()`);
  fs.writeFileSync('review/GP-20086/guardian-limb-probe.json',JSON.stringify(proof,null,2));
  console.log(JSON.stringify(proof,null,2));
} finally {await E.close();}

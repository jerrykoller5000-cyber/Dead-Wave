import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1100x780'}),dir='review/drowned-GP19860',proof={};
try{
  await E.open();proof.loadSec=E.loadSec;
  await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.setArmor(10000);window.floor=D.tg().floorY;T.player.position.set(-30,floor,-633);T.setVelDbg(0,0);window.F=T.spawnZombie(-30,-632,'drowned',true,true);F.trainingZ=true;F.mesh.position.y=floor;F.riseT=0;F.hp=10000;F.mesh.rotation.y=Math.PI;T.setShotView({x:-26,y:floor+3.5,z:-636,tx:-30,ty:floor+.8,tz:-632.8,fov:44});`);
  proof.fire=await E.ev(`const hp=F.hp;T.damageZombie(F,20,{kind:'generic',fire:true,defense:true});const direct=hp-F.hp;return {direct,burn:T.weakShare(F,'burn'),demon:T.weakShare({typeKey:'demon'},'fire')};`);
  await E.ev(`await wait(700);`);await E.shoot({target:'player',cam:{x:-26,y:-196.5,z:-636,tx:-30,ty:-199.2,tz:-632.8,fov:44},out:dir+'/before.png'});
  proof.errors=E.page.errors;console.log(JSON.stringify(proof));
}finally{fs.writeFileSync(dir+'/before-proof.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

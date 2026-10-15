import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const dir='review/armory-collision-GP19895',E=new Engine({training:true,warm:'none',size:'1400x900'});
try {
 await E.open();
 const proof=await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');
 const tg=T.trainingDbg.tg(),arm=tg.group.getObjectByName('training-armory');arm.updateMatrixWorld(true);
 const bounds=new T.THREE.Box3().setFromObject(arm),s=tg.stations.armory;
 T.player.position.set(s.x-2,tg.floorY,s.z-.76);T.setVelDbg(0,0);await wait(150);
 T.player.position.x=s.x-.5;await wait(150);
 return {station:s,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},player:T.player.position.toArray(),loadSec:${'E.loadSec'},errors:[]};`.replace('loadSec:E.loadSec','loadSec:0'));
 await E.shoot({cam:{x:proof.station.x-8,y:-193,z:proof.station.z+5,tx:proof.station.x-.5,ty:-198.4,tz:proof.station.z-.76,fov:48},out:dir+'/before-clipping.png'});
 proof.errors=E.page.errors;proof.loadSec=E.loadSec;fs.writeFileSync(dir+'/before-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
}finally{await E.close();}process.exit(0);

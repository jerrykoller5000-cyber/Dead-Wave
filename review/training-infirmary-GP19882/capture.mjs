import fs from 'node:fs';
import path from 'node:path';
import {Engine} from '../../tools/camera.mjs';
const phase=process.argv[2]||'before',out=path.resolve('review/training-infirmary-GP19882',phase);fs.mkdirSync(out,{recursive:true});
const E=new Engine({training:true,warm:'none',size:'1200x800'});
try{
 await E.open();
 const result=await E.ev(`R.release();T.AudioSys.setMuted(true);T.setVelDbg(0,0);const tg=T.trainingDbg.tg(),b=tg.bed.centre,f=tg.floorY;
 T.setShotView({x:b.x+5.7,y:f+7.4,z:b.z+7.6,tx:b.x+1,ty:f+.65,tz:b.z-.1,fov:38});
 window.infirmaryProof={floor:f,bed:tg.bed,radius:T.PLAYER_RADIUS_DBG,cases:[]};
 T.player.position.set(b.x,f,b.z);await wait(900);infirmaryProof.cases.push({name:'bed',position:T.player.position.toArray()});return infirmaryProof;`);
 await E.page.screenshot(path.join(out,'bed.png'));
 const c=await E.ev(`const tg=T.trainingDbg.tg(),b=tg.bed.centre;T.player.position.set(b.x+2.72,tg.floorY,b.z-1.28);T.setVelDbg(0,0);await wait(500);infirmaryProof.cases.push({name:'cabinet',position:T.player.position.toArray()});return infirmaryProof;`);
 await E.page.screenshot(path.join(out,'cabinet.png'));
 c.errors=E.page.errors;c.loadSec=E.loadSec;fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify(c,null,2));console.log(JSON.stringify(c));
}finally{await E.close();}process.exit(0);

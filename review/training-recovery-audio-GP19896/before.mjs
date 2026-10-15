import fs from 'node:fs';import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1400x900'}),dir='review/training-recovery-audio-GP19896',proof={};
try{await E.open();await E.ev(`R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);T.runDevCommand('godmode');window.D=T.trainingDbg;window.tg=D.tg();T.player.position.set(-30,-200,-636);T.setVelDbg(0,0);D.spawn('shambler',48);await wait(1100);`);
 const cam={x:-32,y:-181,z:-659,tx:-34,ty:-199,tz:-637,fov:48};await E.shoot({cam,out:dir+'/before-alive.png'});
 proof.alive=await E.ev('return D.state().danger.state();');await E.ev('D.blackout();await wait(900);');proof.death=await E.ev('return {wake:D.state().wake?.purge,danger:D.state().danger.state()};');await E.shoot({cam,out:dir+'/before-death.png'});
 proof.bed=await E.ev('const start=performance.now();while(D.state().wake?.purge&&performance.now()-start<12000)await wait(50);while(!D.state().wake?.lit&&performance.now()-start<16000)await wait(50);return {wake:!!D.state().wake,danger:D.state().danger.state()};',18000);await E.shoot({cam:{x:-33,y:-192,z:-642,tx:-40,ty:-199,tz:-650,fov:48},out:dir+'/before-recovery.png'});
 proof.errors=E.page.errors;console.log(JSON.stringify(proof));
}finally{fs.writeFileSync(dir+'/before-proof.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

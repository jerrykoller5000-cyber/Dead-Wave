import fs from 'node:fs';import {Engine} from '../../tools/camera.mjs';
const dir='review/training-recovery-audio-GP19896',E=new Engine({training:true,warm:'none',size:'1400x900'}),proof={};
try{await E.open();proof.samples=await E.ev(`const A=T.AudioSys,D=T.trainingDbg,cue=A.trainingCue,result=[];A.setMuted(false);T.runDevCommand('godmode');
 for(const before of[true,false]) {
  R.release();D.leave();D.enter();D.panel().close();D.clear();const tg=D.tg();T.player.position.set(-27,tg.floorY,-632);T.setVelDbg(0,0);
  A.trainingCue=kind=>before&&kind==='containment-shot'?A.turretShot('m240',.42,0):cue(kind);
  for(let i=0;i<48;i++){const z=T.spawnZombie(-35+(i%8)*2,-625+Math.floor(i/8)*2,'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=tg.floorY;}
  T.setShotView({x:-25,y:-180,z:-655,tx:-27,ty:-199,tz:-630,fov:48});await wait(1200);D.blackout();await wait(500);
  const times=[];await new Promise(done=>{const start=performance.now();let prev=start;function step(t){times.push(t-prev);prev=t;t-start>2500?done():requestAnimationFrame(step);}requestAnimationFrame(step);});
  result.push({before,fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),worst:Math.max(...times),over50:times.filter(x=>x>50).length,remaining:D.alive(),shots:D.state().containment.read().shots,drawCalls:T.renderer.info.render.calls});
 }A.trainingCue=cue;D.leave();return result;`,16000);proof.errors=E.page.errors;console.log(JSON.stringify(proof));
}finally{fs.writeFileSync(dir+'/performance.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

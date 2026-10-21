import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const dir='review/training-perimeter-GP19897',E=new Engine({training:true,warm:'none',size:'1400x900'}),proof={};
try {
 await E.open();await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.player.position.set(-26,-200,-636);T.setVelDbg(0,0);window.D=T.trainingDbg;window.tg=D.tg();window.P=D.state().perimeter;`);
 proof.aim=await E.ev(`const {traceTraining}=await import('./world/training-ballistics.js');const a={x:-49,y:-198,z:-630},b={x:-26,y:-199,z:-630};P.update(a,b,1);return {cameraHit:!!traceTraining(tg,a,b,{throughGlass:true}),roundHit:!!traceTraining(tg,a,b),faded:P.state()[0].opacity};`);assert(!proof.aim.cameraHit);assert(proof.aim.roundHit);
 await E.shoot({cam:{x:-49,y:-198,z:-630,tx:-26,ty:-199,tz:-630,fov:55},out:dir+'/after-foreground-cutaway.png'});
 await E.ev(`D.spawn('shambler',1);`);
 proof.release=await E.ev(`const start=performance.now();while(performance.now()-start<12000&&(!D.alive()||T.zombies.some(z=>z.alive&&z.trainingEntry)))await wait(50);return {alive:D.alive(),entries:T.zombies.filter(z=>z.alive&&z.trainingEntry).length,positions:T.zombies.filter(z=>z.alive).map(z=>z.mesh.position.toArray()),pending:D.state().deployment.read()};`,13000);assert.equal(proof.release.alive,1);assert.equal(proof.release.entries,0);assert.equal(proof.release.pending,null);
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log('PASS native faded fence aims through, bullets still collide, real alarm/gate deployment enters room',JSON.stringify(proof));
} finally {fs.writeFileSync(dir+'/final-view-proof.json',JSON.stringify({...proof,errors:E.page.errors},null,2));await E.close();}process.exit(0);

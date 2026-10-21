import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const dir='review/range-GP19901',E=new Engine({training:true,warm:'none',size:'1400x900'}),proof={};
const measure=`const samples=[];for(let j=0;j<3;j++){let last=performance.now(),a=[];for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();a.push(now-last);last=now;}samples.push({fps:1000/(a.reduce((a,b)=>a+b,0)/a.length),worst:Math.max(...a),hitches:a.filter(x=>x>50).length});}return {samples,alive:T.trainingDbg.alive(),memory:T.renderer.info.memory};`;
try{
 await E.open();proof.loadSec=E.loadSec;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.player.position.set(-27,-200,-631.4);T.setVelDbg(0,0);for(let i=0;i<48;i++){const z=T.spawnZombie(-35+(i%8)*2.5,-622+Math.floor(i/8),'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=-200;}T.setShotView({x:-15,y:-176,z:-658,tx:-27,ty:-199,tz:-628,fov:48});await wait(1800);`);
 proof.enabled=await E.ev(measure);console.log('ENABLED',JSON.stringify(proof.enabled));
 // Transient diagnostic only: keep the same game, camera, enemies and equipment,
 // then bypass the new feature's idle update and hide its one console prop.
 await E.ev(`window.__rangeTick=T.rangeDbg.feature().tick;window.__rangeCheck=T.rangeDbg.feature().check;T.rangeDbg.feature().tick=()=>{};T.rangeDbg.feature().check=()=>{};T.trainingDbg.tg().group.getObjectByName('training-range-console').visible=false;await wait(500);`);
 proof.bypassed=await E.ev(measure);console.log('BYPASSED',JSON.stringify(proof.bypassed));
 await E.ev(`T.rangeDbg.feature().tick=__rangeTick;T.rangeDbg.feature().check=__rangeCheck;T.trainingDbg.tg().group.getObjectByName('training-range-console').visible=true;await wait(500);`);
 proof.restored=await E.ev(measure);console.log('RESTORED',JSON.stringify(proof.restored));
 for(const p of [proof.enabled,proof.bypassed,proof.restored])assert.equal(p.alive,48);
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
}finally{fs.writeFileSync(dir+'/live-perf-proof.json',JSON.stringify({...proof,errors:E.page?.errors},null,2));await E.close();}process.exit(0);

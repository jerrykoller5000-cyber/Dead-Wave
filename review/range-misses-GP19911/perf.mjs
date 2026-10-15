import fs from 'node:fs';
import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),{Engine}=await import(before?'./camera-before.mjs':'../../tools/camera.mjs');
const dir='review/range-misses-GP19911',name=before?'before':'after',E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={};
try{
 await E.open();proof.loadSec=E.loadSec;
 await E.ev('R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);const tg=T.trainingDbg.tg();T.player.position.set(tg.spawn.x,tg.floorY,tg.spawn.z);T.setVelDbg(0,0);');
 await new Promise(r=>setTimeout(r,3000));await E.ev('T.resetPerf();');
 await new Promise(r=>setTimeout(r,3500));proof.performance=await E.ev('return T.perfSnapshot();');
 assert(proof.performance.frames>=30,'live rolling frame window must be populated (60-sample cap)');assert.deepEqual(E.page.errors,[]);
 console.log(name,JSON.stringify(proof));
}finally{proof.errors=E.page?.errors;fs.writeFileSync(dir+'/'+name+'-perf.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

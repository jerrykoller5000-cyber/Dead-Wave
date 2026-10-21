import fs from 'node:fs';import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),{Engine}=await import(before?'./camera-before.mjs':'../../tools/camera.mjs');
const dir='review/range-cues-GP19908',prefix=before?'before':'after',E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={mode:prefix};
try{
 await E.open();proof.load=E.loadSec;await E.ev(`R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);`);
 for(const[name,cam,look,fov]of[
  ['overview',[2.5,-195.5,-640.8],[-3.5,-198.75,-647],60],
  ['controls',[-3.8,-198,-645.2],[-7.85,-198.6,-645.2],55],
 ])await E.run({cmd:'shot',cam:{x:cam[0],y:cam[1],z:cam[2],tx:look[0],ty:look[1],tz:look[2],fov},out:dir+'/'+prefix+'-'+name+'.png'});
 proof.stations=await E.ev(`return {console:T.trainingDbg.tg().stations.rangeConsole,lights:T.trainingDbg.tg().stations.lightSwitch};`);
 await E.ev('R.release();T.resetPerf();');await new Promise(r=>setTimeout(r,3500));proof.performance=await E.ev('return T.perfSnapshot();');
 assert.equal(E.page.errors.length,0);console.log('PASS '+prefix+' shots and geometry; errors0');
}finally{proof.errors=E.page?.errors;fs.writeFileSync(dir+'/'+prefix+'-proof.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

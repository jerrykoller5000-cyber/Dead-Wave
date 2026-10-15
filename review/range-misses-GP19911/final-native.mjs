import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const dir='review/range-misses-GP19911',E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={};
try{
 await E.open();await E.ev('R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);T.grantAllWeapons();T.trainingDbg.clear();');
 proof.bannerBefore=await E.ev("return getComputedStyle(document.getElementById('trainingHud')).display;");assert.notEqual(proof.bannerBefore,'none');
 proof.started=await E.ev("const D=await import('/ui/range-drills.js');const O=T.trainingDbg.tg().origin;T.player.position.set(3,O.y,O.z-2);T.setVelDbg(0,0);return T.rangeDbg.start(D.findDrill('pistol','bullseye'));");assert(proof.started.ok);
 await new Promise(r=>setTimeout(r,350));proof.bannerDuring=await E.ev("return getComputedStyle(document.getElementById('trainingHud')).display;");assert.equal(proof.bannerDuring,'none');
 await E.ev('T.rangeDbg.exit();');proof.bannerAfter=await E.ev("return getComputedStyle(document.getElementById('trainingHud')).display;");assert.notEqual(proof.bannerAfter,'none');
 await E.ev('R.release();T.resetPerf();');await new Promise(r=>setTimeout(r,3500));proof.performance=await E.ev('return T.perfSnapshot();');
 assert(proof.performance.frames>=30);assert.equal(E.page.errors.length,0);console.log('PASS practice banner hidden only during drill; restored on exit; '+JSON.stringify(proof.performance));
}finally{proof.errors=E.page?.errors;fs.writeFileSync(dir+'/final-native.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

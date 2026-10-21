import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine,jobReq} from '../../tools/camera.mjs';
const engine=new Engine({training:true,warm:'none',size:'1440x900'});
try {
 await engine.open();
 const check=JSON.parse(fs.readFileSync('review/training-props/live-check.json','utf8'));
 const result=await engine.run(check);
 fs.writeFileSync('review/training-props/live-proof.json',JSON.stringify({...result,loadSeconds:engine.loadSec,renderer:engine.renderer},null,2)+'\n','utf8');
 assert(result.ok,result.error);assert(result.value.checks.every(x=>x.pass));assert.equal(result.value.errors.length,0);
 console.log('PASS '+result.value.checks.length+' live checks, zero errors; renderer '+engine.renderer);
 console.log(JSON.stringify(result.value.samples));
 const job=JSON.parse(fs.readFileSync('review/training-props/after-shots.json','utf8'));
 const pics=await engine.run(jobReq(job));assert(pics.ok,pics.error);
 fs.writeFileSync('review/training-props/final-shots.json',JSON.stringify(pics,null,2)+'\n','utf8');
 console.log('PASS final comparison shots');
 const occupied=await engine.run({cmd:'shot',target:'player',cam:job.shots[1].cam,size:'1440x900',out:'review/training-props/infirmary-occupied.png',pre:'T.trainingDbg.blackout(); await wait(1400);'});
 assert(occupied.ok,occupied.error);console.log('PASS occupied infirmary screenshot');
} finally {await engine.close();}

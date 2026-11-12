import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),results={};
try{
 for(const phase of ['before','after']){
  const browser=await launch({headless:false});
  try{
   const page=await browser.newPage({width:960,height:540});
   let verify;
   {
    const {trialGuard}=await import('./trial-source.mjs'),{replayArtwork}=await import('../GT-20076/replay-artwork.mjs');
    const source=await readFile(new URL('pre-final-source.txt',import.meta.url),'utf8');
    verify=await replayArtwork(page,server.origin,'/studio/weapon-sidearms.js',phase==='after'?trialGuard(source):source);
   }
   await page.goto(server.origin+'/index.html?debug=1');
   assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
   await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
   await page.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));

   results[phase]=await page.evaluate(`(async()=>{const {clipCheck}=await import('/tools/tests/clip-check.js'),out=[];await clipCheck(TT,['uzi'],(ok,s)=>out.push((ok?'PASS ':'FAIL ')+s),out);return out;})()`,180000);
   verify?.();assert.deepEqual(page.errors,[]);console.log(phase,results[phase]);
  }finally{await browser.close();}
 }
 await writeFile(new URL('hands-trial.json',import.meta.url),JSON.stringify(results,null,2));

 console.log('Recorded native Wasp before/candidate contacts');
}finally{await server.close();}

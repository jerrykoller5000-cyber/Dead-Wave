import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 let verify;
 if(process.argv.includes('--trial')||process.argv.includes('--baseline')){
  const {trialGuard}=await import('./trial-source.mjs'),{replayArtwork}=await import('../GT-20076/replay-artwork.mjs');
  const source=await readFile(new URL('pre-final-source.txt',import.meta.url),'utf8');
  verify=await replayArtwork(page,server.origin,'/studio/weapon-sidearms.js',process.argv.includes('--trial')?trialGuard(source):source);
 }
 await page.goto(server.origin+'/index.html?debug=1');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 const result=await page.evaluate("import('/review/GT-20093/measure.mjs').then(m=>m.measureWasp(TT))");
 await writeFile(new URL(process.argv.includes('--trial')?'trial.json':'baseline.json',import.meta.url),JSON.stringify(result,null,2));
 console.log('Wasp native guard rows',result.rows,'pin',result.pin);
 verify?.();assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}

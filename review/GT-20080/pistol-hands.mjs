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
   await page.goto(server.origin+'/index.html?debug=1');
   assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
   await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
   await page.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));
   if(phase==='before')await page.evaluate("(()=>{const u=TT.weaponMeshes.pistol.userData,real=u.setMagazineRounds;u.setMagazineRounds=function(){return real.call(this,0)};return true})()");
   results[phase]=await page.evaluate(`(async()=>{const {clipCheck}=await import('/tools/tests/clip-check.js'),out=[];await clipCheck(TT,['pistol'],(ok,s)=>out.push((ok?'PASS ':'FAIL ')+s),out);const source=TT.weaponMeshes.pistol.userData.magazineTopRound,pair=TT.viewmodelDbg().gun.pairs.find(([s])=>s===source);if(!pair)throw Error('Round missing from first-person copy');return {lines:out,worldRound:source.visible,viewRound:pair[1].visible};})()`,180000);
   assert.deepEqual(page.errors,[]);console.log(phase,results[phase]);
  }finally{await browser.close();}
 }
 await writeFile(new URL('pistol-live/hands.json',import.meta.url),JSON.stringify(results,null,2));
 assert.deepEqual(results.after.lines,results.before.lines,'Round changed a hand contact');
 assert(!results.before.worldRound&&!results.before.viewRound,'Empty comparison must hide both cartridges');
 assert(results.after.worldRound&&results.after.viewRound,'Loaded comparison must show both cartridges');
 console.log('PASS identical native first-person pistol hand contacts');
}finally{await server.close();}

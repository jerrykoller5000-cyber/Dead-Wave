import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 const result=await page.evaluate(`(async()=>{
  const T=TT,G=T.THREE,B=T.inspectHost().builders,{makePistolModel}=await import('/studio/weapon-sidearms.js');
  const gun=makePistolModel({...B.weaponContext(),finishGun:g=>g,mergeRigidMeshes:()=>{}}),u=gun.userData;
  u.setMagazineRounds(5);
  function pose(){
   gun.updateMatrixWorld(true);
   const matrix=u.mag.matrixWorld.clone().invert().multiply(u.magazineTopRound.matrixWorld);
   return {matrix:matrix.toArray(),visible:u.magazineTopRound.visible,parent:u.magazineTopRound.parent.name};
  }
  const before=pose();B.gunExtLook(gun,'pistol',true);u.setMagazineRounds(5);const extended=pose();
  B.gunExtLook(gun,'pistol',false);u.setMagazineRounds(0);const empty=pose();
  return {before,extended,empty,feedY:u.magStretch.userData.feedY};
 })()`);
 await writeFile(new URL('pistol-live/extension.json',import.meta.url),JSON.stringify(result,null,2));
 console.log('Native extension result',result);
 const difference=Math.max(...result.before.matrix.map((v,i)=>Math.abs(v-result.extended.matrix[i])));
 assert(difference<1e-10,'Extension transformed the fixed round: '+difference);
 assert(result.extended.visible&&!result.empty.visible);
 assert.deepEqual(page.errors,[]);
 console.log('PASS extended magazine keeps live cartridge shape and placement');
}finally{await browser.close();await server.close();}

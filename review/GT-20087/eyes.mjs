import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';

const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','shared'].includes(phase));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Glove fit';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
 await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.guardViews=m.makeViews(TT);return true})");
 for(const id of ['m4','uzi','aa12']){
   const folder=new URL('./'+phase+'/'+id+'/',import.meta.url);await mkdir(folder,{recursive:true});
   await page.evaluate('guardViews.equip('+JSON.stringify(id)+')');
   const camera=await page.evaluate('guardViews.pose("hip")');
   if(phase==='shared'){
     const proof=await page.evaluate("import('/review/GT-20087/shared.mjs').then(m=>m.verifyShared(TT,"+JSON.stringify(id)+"))",120000);
     await save(new URL('fit.json',folder),JSON.stringify(proof,null,2)+'\n');
     console.log('PASS shared, eye and carried native faces',id,proof.matches,'difference from photographed vertices',proof.maxDifference);continue;
   }
   if(phase==='after'){
     const proof=await page.evaluate("import('/review/GT-20087/verify.mjs').then(m=>m.inspectEye(TT,"+JSON.stringify(id)+"))",120000);
     await save(new URL('fit.json',folder),JSON.stringify(proof,null,2)+'\n');
     assert.equal(proof.raw.added.length,0);assert.equal(proof.raw.loose[0],proof.raw.loose[1]);assert.equal(proof.raw.open[0],proof.raw.open[1]);
     assert.equal(proof.raw.parts[0],proof.raw.parts[1]);console.log('PASS native eye and raw fitter',id,proof.moved,proof.max.delta);
   }
   for(const light of ['noon','overcast','dusk','night']){
     await page.evaluate('guardViews.light('+JSON.stringify(light)+')');
     const shot=await page.send('Page.captureScreenshot',{format:'png'});await save(new URL(light+'.png',folder),Buffer.from(shot.data,'base64'));
   }
   await save(new URL('camera.json',folder),JSON.stringify(camera,null,2)+'\n');
   console.log('PASS',id,phase,'real first-person glove, four lights');
 }
 assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}

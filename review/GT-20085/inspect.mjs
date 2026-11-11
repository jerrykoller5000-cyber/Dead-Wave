import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
import {replayArtwork} from '../GT-20076/replay-artwork.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const folder=new URL('./'+phase+'/inspector/',import.meta.url);await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});let verify;
 if(phase==='before'){
  const path='/studio/weapon-heavy.js',live=await readFile(new URL('../../studio/weapon-heavy.js',import.meta.url),'utf8');
  const begin=live.indexOf('    // Pose the bound artwork as a single piece'),end=live.indexOf('\n    }',begin);
  assert(begin>=0 && end>begin && live.indexOf('    // Pose the bound artwork as a single piece',begin+1)===-1);
  verify=await replayArtwork(page,server.origin,path,live.slice(0,begin)+live.slice(end+'\n    }'.length));
 }
 await page.goto(server.origin+'/index.html?inspect&debug=1&raf=timer');
 assert(await page.waitFor('window.DWInspect?.ready && !TT.trainingDbg.state().warming'));
 const models={};
 for(const id of ['m240','m240-folded']){
  const detail=await page.evaluate('DWInspect.show('+JSON.stringify('weapon.'+id)+',{instant:true})');assert.equal(detail.id,'weapon.'+id);models[id]=detail;
  for(const [view,light] of [['side','noon'],['three','overcast'],['rear3','dusk'],['three','night']]){
   await page.evaluate('DWInspect.light('+JSON.stringify(light)+');DWInspect.view('+JSON.stringify(view)+',{instant:true})');
   const data=await page.evaluate("(async()=>{await DWInspect.stepAsync(5);return DWInspect.shot({type:'image/jpeg',quality:.92})})()");
   const bytes=Buffer.from(data.split(',')[1],'base64');assert(bytes.length>4000);
   await save(new URL(id+'-'+light+'.jpg',folder),bytes);
  }
 }
 const audit=await page.evaluate(`(async()=>{
  const H=TT.inspectHost(),{makeM240Model}=await import('/studio/weapon-heavy.js'),{auditWeapon}=await import('/tools/tests/weapon-seating.js');
  const folded=H.builders.m240(true),ctx={...H.builders.weaponContext(),M240_PIVOT:folded.userData.elev.position.clone(),finishGun:g=>g};
  const result=auditWeapon(makeM240Model(ctx,true));return result;
 })()`,120000);
 await save(new URL('seating.json',folder),JSON.stringify(audit,null,2)+'\n');
 await save(new URL('models.json',folder),JSON.stringify(models,null,2)+'\n');
 if(verify)verify();assert.deepEqual(page.errors,[]);
 console.log('PASS',phase,'deployed and folded Inspector, 4 lights each; raw pairs',audit.rawOverlaps.length,'islands',audit.parts,'loose',audit.loose.length);
}finally{await browser.close();await server.close();}

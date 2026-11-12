import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const phase='before';assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../',import.meta.url),out=new URL('./'+phase+'/',import.meta.url);await mkdir(out,{recursive:true});
const reference=JSON.parse(await readFile(new URL('../GT-20076/catalog-fix-nose-arch/audit.json',import.meta.url),'utf8')).sniper;
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Guard review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT,'"+(phase==='before'?'record':'replay')+"',true);return views.equip('sniper')})");
  const profiles=await page.evaluate(`import('/review/GT-20094/guard.mjs').then(m=>[false,true].flatMap(extended=>[0,1].map(count=>({extended,count,...m.measure(TT,{extended,count})}))))`,180000);
  assert(profiles.every(p=>p.hash===reference.artworkFingerprint&&p.firstContact[1]<.019));
  await save(new URL('fits.json',out),JSON.stringify(profiles,null,2)+'\n');
  console.log('PASS',profiles.map(p=>[p.extended,p.count,p.firstContact,p.emptyGap]));
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}

import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN&&['before','after'].includes(phase));
const root=new URL('../../',import.meta.url),out=new URL('./'+phase+'/',import.meta.url);await mkdir(out,{recursive:true});
const reference=JSON.parse(await readFile(new URL('../GT-20076/catalog-fix-wasp-base-ring/audit.json',import.meta.url),'utf8')).ak;
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Guard review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT,'"+(phase==='before'?'record':'replay')+"',true);return views.equip('ak')})");
  if(phase==='after')await page.evaluate("fetch('/review/GT-20096/before/cameras.json').then(r=>r.json()).then(c=>{window.recordedArtViews=c;return true})");
  const cameras={};for(const view of ['hip','held-right-open','held-left-open']){
    cameras[view]=await page.evaluate('views.pose('+JSON.stringify(view)+')');
    if(view==='hip'){
      const result=await page.evaluate("import('/review/GT-20096/guard.mjs').then(m=>m.measure(TT,"+JSON.stringify(phase)+","+JSON.stringify(reference.artworkFingerprint)+"))",120000);
      await save(new URL('guard.json',out),JSON.stringify(result,null,2)+'\n');
      console.log('PASS',phase,'native trigger and available room',result.hash,result.pin,result.targetRows);
    }
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('views.light('+JSON.stringify(light)+')');
      const png=await page.send('Page.captureScreenshot',{format:'png'});await save(new URL(view+'-'+light+'.png',out),Buffer.from(png.data,'base64'));
    }
  }
  await save(new URL('cameras.json',out),JSON.stringify(cameras,null,2)+'\n');
  assert.deepEqual(page.errors,[]);console.log('PASS hip and both held sides under four lights');
}finally{await browser.close();await server.close();}

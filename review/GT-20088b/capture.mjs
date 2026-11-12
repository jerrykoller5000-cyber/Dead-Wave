import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=fileURLToPath(new URL('../../',import.meta.url)),dir=new URL('./after/',import.meta.url);await mkdir(dir,{recursive:true});
const original='/review/GT-20076/visible-repairs/revolver/clear-rotating-frame-before';
const hashes=await Promise.all(['catalog-fix-case-stamp','catalog-fix-revolver-guard-front'].map(async k=>JSON.parse(await readFile(new URL('../GT-20076/'+k+'/audit.json',import.meta.url),'utf8')).revolver.artworkFingerprint));
const server=await serve(root,0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Trim comparison';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.v=m.makeViews(TT,'replay',true);return true})");
  await page.evaluate('fetch('+JSON.stringify(original+'/cameras.json')+').then(r=>r.json()).then(a=>{window.recordedArtViews=a;return true})');
  await page.evaluate("v.equip('revolver')");
  const cameras={};
  for(const view of ['hip','held-right']){
    cameras[view]=await page.evaluate('v.pose('+JSON.stringify(view)+')');
    if(view==='hip'){
      const actual=await page.evaluate("import('/review/GT-20088b/outline.mjs').then(m=>m.verifyGuardFront(TT,"+hashes.map(hash=>JSON.stringify(hash)).join(',')+"))",180000);
      await save(new URL('outline.json',dir),JSON.stringify(actual,null,2)+'\n');
      const centre=actual.widths.filter(r=>r.x===0);
      console.log('PASS entire baseline reproduced; forward-only displacement',actual.peak,'guard faces',actual.copies,'cylinder gap',actual.minCylinderGapMm,'centre widths',centre);
    }
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('v.light('+JSON.stringify(light)+')');
      const frame=await page.send('Page.captureScreenshot',{format:'png'});await save(new URL(view+'-'+light+'.png',dir),Buffer.from(frame.data,'base64'));
    }
  }
  await save(new URL('cameras.json',dir),JSON.stringify(cameras,null,2)+'\n');
  assert.deepEqual(page.errors,[]);console.log('PASS both native views in four lights');
}finally{await browser.close();await server.close();}

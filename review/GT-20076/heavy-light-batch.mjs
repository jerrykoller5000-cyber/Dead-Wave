import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Trim comparison';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT);return true})");
  for(const [id,angles] of [['launcher',['hip','rack']],['chainsaw',['hip']],['minigun',['hip','rack']]]){
    const dir=new URL('./visible-repairs/'+id+'/clear-trim-'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
    await page.evaluate('views.equip('+JSON.stringify(id)+')');
    const cameras={};
    for(const view of angles){
      cameras[view]=await page.evaluate('views.pose('+JSON.stringify(view)+')');
      for(const light of ['noon','overcast','dusk','night']){
        await page.evaluate('views.light('+JSON.stringify(light)+')');
        const shot=await page.send('Page.captureScreenshot',{format:'png'});await save(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
      }
    }
    await save(new URL('cameras.json',dir),JSON.stringify(cameras,null,2)+'\n');
    console.log('PASS',phase,id,angles.join(', '),'in four lights');
  }
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}

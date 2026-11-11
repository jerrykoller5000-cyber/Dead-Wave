import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from './save.mjs';
import {originalSawCovers} from './replay-artwork.mjs';

const [id,phase]=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && /^[a-z0-9]+$/.test(id) && ['before','after','trim','final-trim','joins','rear-join','side-inset','crown','contact-trim','relief','closed-relief','floor-before','floor-after'].includes(phase));
const dir=new URL('./visible-repairs/'+id+'/'+phase+'/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  const replay=process.argv.includes('--original-saw-covers');
  if(replay) assert(id==='chainsaw' && phase==='floor-before');
  const verify=replay?await originalSawCovers(page,server.origin):null;
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Panel proof';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate('import("/review/GT-20076/visibility-camera.mjs").then(m=>{window.vis=m.makeViews(TT);return true})');
  await page.evaluate('vis.equip('+JSON.stringify(id)+')');
  const cameras={};
  const views=['hip','aimed','held-left','held-right',...(id==='chainsaw'?[]:['rack'])];
  if(phase.startsWith('floor-')) views.push('held-left-open','held-right-open');
  for(const view of views){
    cameras[view]=await page.evaluate('vis.pose('+JSON.stringify(view)+')');
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('vis.light('+JSON.stringify(light)+')');
      const shot=await page.send('Page.captureScreenshot',{format:'png'});
      await save(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
    }
  }
  if(verify)await verify();
  if(process.argv.includes('--check-saw-covers')){
    assert.equal(id,'chainsaw');
    const proof=await page.evaluate("import('/review/GT-20076/chainsaw-cover-proof.mjs').then(m=>m.compareSideCovers(TT.inspectHost().builders.weaponContext()))");
    await save(new URL('cover-proof.json',dir),JSON.stringify(proof,null,2)+'\n');
    assert.equal(proof.panels.length,2); assert.equal(proof.instances,42); assert.equal(proof.moved,42);
    for(const p of proof.panels){assert(p.closed && p.before>10);assert.equal(p.missing+p.added,0);assert.equal(p.outerMotion,0);assert(Math.abs(p.inner-.136)<1e-7);}
    console.log('PASS both exterior covers retain all exposed tuples, both are closed, and all 42 chain graphics move');
  }
  await save(new URL('cameras.json',dir),JSON.stringify(cameras,null,2)+'\n');
  await save(new URL('renderer-log.json',dir),JSON.stringify({errors:page.errors,warnings:page.console.filter(v=>['error','warning'].includes(v.type)).slice(0,30)},null,2)+'\n');
  assert.deepEqual(page.errors,[]);console.log('PASS',id,phase,Object.keys(cameras).length,'gameplay views in all four lights');
}finally{await browser.close();await server.close();}

import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from './save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const flamer=['flamer',[.235,-.071,-.246],[0,-.075,-.145],36];
const series={
  '--frame':['catalog-fix-revolver-guard-front','frame-detail','rotating-frame-proof','checkRotatingFrame',[
    ['revolver',[.26,.101,-.126],[0,.056,-.006],34],['shotgun',[.175,-.052,-.396],[0,-.085,-.365],31]]],
  '--stock-mount':['catalog-fix-rotating-frame-swept','stock-mount-detail','stock-mount-proof','stockMountProof',[
    ['launcher',[.25,.115,-.415],[0,.041,-.265],30],flamer]],
  '--stock-tail':['catalog-fix-rotating-frame-swept','stock-mount-tail-detail','stock-mount-proof','stockMountProof',[flamer]],
  '--port-sight':['catalog-fix-stock-mount-tail','port-sight-detail','port-sight-proof','portSightProof',[
    ['uzi',[.226,.043,.151],[.05,.029,.083],32],['m4',[.211,.139,-.213],[0,.094,-.14],29]]]
};
const run=process.argv[2]||'--frame';
assert(Object.hasOwn(series,run));
const [phase,folder,moduleName,proofName,shots]=series[run];
const baseline=JSON.parse(await readFile(new URL('./'+phase+'/audit.json',import.meta.url),'utf8'));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Model review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT);return true})");
  for(const [id,eye,target,fov] of shots){
    const dir=new URL('./visible-repairs/'+id+'/'+folder+'/',import.meta.url);
    await mkdir(dir,{recursive:true});
    await page.evaluate('views.equip('+JSON.stringify(id)+').then(()=>views.pose("rack"))');
    const config={id,eye,target,fov,moduleName,proofName,hash:baseline[id].artworkFingerprint};
    const setup=await page.evaluate('('+install.toString()+')('+JSON.stringify(config)+')');
    assert.equal(setup.hash,config.hash);
    for(const light of ['noon','overcast','dusk','night'])for(const phase of ['before','after']){
      await page.evaluate('reviewArt.show('+JSON.stringify(phase)+');views.light('+JSON.stringify(light)+')');
      const frame=await page.send('Page.captureScreenshot',{format:'png'});
      await save(new URL(phase+'-'+light+'.png',dir),Buffer.from(frame.data,'base64'));
    }
    await save(new URL('setup.json',dir),JSON.stringify({...config,...setup},null,2)+'\n');
    console.log('PASS native before/after side detail in all four lights',id,setup.hash);
  }
  assert.deepEqual(page.errors,[]);
} finally {await browser.close();await server.close();}

// Both revisions occupy the same world transform, under the same camera and light.
async function install({id,eye,target,fov,moduleName,proofName,hash}){
  if(window.reviewArt)TT.scene.remove(reviewArt.model);
  const proofs=await import('/review/GT-20076/'+moduleName+'.mjs');
  window.reviewArt=proofs[proofName](TT,id,hash,true);
  const model=reviewArt.model,G=TT.THREE;
  model.position.copy(TT.player.position).add(new G.Vector3(0,2,2));
  TT.scene.add(model);model.updateWorldMatrix(true,true);
  const p=model.localToWorld(new G.Vector3(...eye)),t=model.localToWorld(new G.Vector3(...target));
  TT.setShotView({x:p.x,y:p.y,z:p.z,tx:t.x,ty:t.y,tz:t.z,fov});
  return {hash:reviewArt.hash,eyeWorld:p.toArray(),targetWorld:t.toArray()};
}

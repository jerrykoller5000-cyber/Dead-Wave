import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../',import.meta.url),dir=new URL('./detail/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Guard profile';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.v=m.makeViews(TT);return v.equip('ak')}).then(()=>v.pose('rack'))");
  const setup=await page.evaluate('('+setupSide.toString()+')()');console.log('Native baseline and final guard',setup);
  for(const view of ['detail','held-left-open','held-right-open']){
    if(view!=='detail'){
      (setup.held ||= {})[view]=await page.evaluate('v.pose('+JSON.stringify(view)+')');
      await page.evaluate(`(()=>{const w=TT.weaponMeshes.ak;w.updateWorldMatrix(true,false);w.matrixWorld.decompose(reviewRig.position,reviewRig.quaternion,reviewRig.scale);reviewRig.updateMatrixWorld(true);return true})()`);
    }
  for(const light of ['noon','overcast','dusk','night']){
    await page.evaluate('v.light('+JSON.stringify(light)+')');await page.evaluate('TT.inspectHost().loop(false)');
    if(view!=='detail')await page.evaluate('TT.weaponMeshes.ak.visible=false');
    try{
      for(const phase of ['before','after']){
        await page.evaluate('window.showGuard('+JSON.stringify(phase)+');TT.inspectHost().render();true');
        const png=await page.send('Page.captureScreenshot',{format:'png'});
        await save(new URL((view==='detail'?'':view+'-')+phase+'-'+light+'.png',dir),Buffer.from(png.data,'base64'));
      }
    }finally{if(view!=='detail')await page.evaluate('TT.weaponMeshes.ak.visible=true');await page.evaluate('TT.inspectHost().loop(true)');}
  }
  }
  await save(new URL('setup.json',dir),JSON.stringify(setup,null,2)+'\n');assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
async function setupSide(){
  const T=TT,G=T.THREE;
  const {buildReviewArt}=await import('/review/GT-20096/guard.mjs');
  const {artworkFingerprint,visiblePieces}=await import('/tools/tests/weapon-seating.js');
  const [before,after]=await Promise.all(['before','after'].map(p=>fetch('/review/GT-20096/'+p+'/guard.json').then(r=>r.json())));
  const {model,trigger}=buildReviewArt(T),u=model.userData;
  const ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  model.scale.copy(T.weaponMeshes.ak.scale);model.visible=true;
  window.showGuard=phase=>{trigger.position.fromArray((phase==='before'?before:after).pin);model.updateMatrixWorld(true);};
  for(const [phase,expected] of [['before',before.hash],['after',after.hash]]){
    showGuard(phase);if(artworkFingerprint(visiblePieces(model,1.8/1.655,ignore))!==expected)throw Error('Wrong '+phase+' model');
  }
  window.reviewRig=model;
  model.position.copy(T.player.position).add(new G.Vector3(0,2,2));T.scene.add(model);model.updateMatrixWorld(true);
  const e=model.localToWorld(new G.Vector3(.35,-.063,-.05)),t=model.localToWorld(new G.Vector3(0,-.055,-.028));
  T.setShotView({x:e.x,y:e.y,z:e.z,tx:t.x,ty:t.y,tz:t.z,fov:23});
  return {before:before.hash,after:after.hash,eye:e.toArray(),target:t.toArray(),fov:23};
}

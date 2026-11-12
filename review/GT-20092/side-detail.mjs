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
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.v=m.makeViews(TT);return v.equip('aa12')}).then(()=>v.pose('rack'))");
  const setup=await page.evaluate('('+setupSide.toString()+')()');console.log('Native baseline and final guard',setup);
  for(const light of ['noon','overcast','dusk','night'])for(const phase of ['before','after']){
    await page.evaluate('window.showGuard('+JSON.stringify(phase)+');v.light('+JSON.stringify(light)+')');
    const png=await page.send('Page.captureScreenshot',{format:'png'});
    await save(new URL(phase+'-'+light+'.png',dir),Buffer.from(png.data,'base64'));
  }
  await save(new URL('setup.json',dir),JSON.stringify(setup,null,2)+'\n');assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
async function setupSide(){
  const T=TT,G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
  const {makeAa12Model}=await import('/studio/weapon-longarms.js');
  const {artworkFingerprint,visiblePieces}=await import('/tools/tests/weapon-seating.js');
  const [before,after]=await Promise.all(['before','after'].map(p=>fetch('/review/GT-20092/'+p+'/guard.json').then(r=>r.json())));
  let guard,old;
  const g=makeAa12Model({...ctx,finishGun:r=>r,mergeRigidMeshes:()=>{},gunKit:r=>{
    const k=ctx.gunKit(r);return {...k,slab(p,w,m,o){
      const part=k.slab(p,w,m,o);if(w===.03&&p.length===12&&o?.bevel===.0035){guard=part;old=part.geometry.clone();}return part;
    }};
  }});
  old.setAttribute('position',new G.Float32BufferAttribute(before.points,3));old.computeBoundingSphere();
  const current=guard.geometry,u=g.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  g.visible=true;g.scale.copy(T.weaponMeshes.aa12.scale);
  window.showGuard=phase=>{guard.geometry=phase==='before'?old:current;g.updateMatrixWorld(true);};
  for(const [phase,expected] of [['before',before.hash],['after',after.hash]]){
    showGuard(phase);if(artworkFingerprint(visiblePieces(g,1.8/1.655,ignore))!==expected)throw Error('Wrong '+phase+' model');
  }
  g.position.copy(T.player.position).add(new G.Vector3(0,2,2));T.scene.add(g);g.updateMatrixWorld(true);
  const e=g.localToWorld(new G.Vector3(.44,-.107,-.07)),t=g.localToWorld(new G.Vector3(0,-.116,-.076));
  T.setShotView({x:e.x,y:e.y,z:e.z,tx:t.x,ty:t.y,tz:t.z,fov:22});
  return {before:before.hash,after:after.hash,eye:e.toArray(),target:t.toArray()};
}

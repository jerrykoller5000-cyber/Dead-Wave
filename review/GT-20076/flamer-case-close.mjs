import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from './save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const dir=new URL('./visible-repairs/flamer/case-underside/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Case underside';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  const setup=await page.evaluate(`(async()=>{
    const T=TT,G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
    window.v=(await import('/review/GT-20076/visibility-camera.mjs')).makeViews(T);
    await v.equip('flamer');await v.pose('rack');
    let original;
    const {makeFlamerModel}=await import('/studio/weapon-heavy.js');
    const model=makeFlamerModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
      const k=ctx.gunKit(root);
      return {...k,slab(...a){const m=k.slab(...a);if(a[1]===.11&&a[0][0][0]===-.17)original=m.geometry.clone();return m;}};
    }});
    const mesh=model.children[0],revised=mesh.geometry;
    for(const child of model.children)child.visible=child===mesh;
    model.position.copy(T.player.position).add(new G.Vector3(0,2,2));
    model.rotation.z=2.25;
    T.scene.add(model);model.updateWorldMatrix(true,true);
    const eyeLocal=new G.Vector3(.17,-.41,-.145),atLocal=new G.Vector3(0,-.028,.075);
    const eye=model.localToWorld(eyeLocal.clone()),at=model.localToWorld(atLocal.clone());
    T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:at.x,ty:at.y,tz:at.z,fov:39});
    window.showCase=phase=>{mesh.geometry=phase==='before'?original:revised;};
    return {eye:eyeLocal.toArray(),target:atLocal.toArray(),roll:model.rotation.z,original:original.attributes.position.count/3,revised:revised.attributes.position.count/3};
  })()`);
  assert(setup.original===92&&setup.revised>setup.original);
  for(const light of ['noon','overcast','dusk','night'])for(const phase of ['before','after']){
    await page.evaluate('showCase('+JSON.stringify(phase)+');v.light('+JSON.stringify(light)+')');
    const frame=await page.send('Page.captureScreenshot',{format:'png'});
    await save(new URL(phase+'-'+light+'.png',dir),Buffer.from(frame.data,'base64'));
  }
  assert.deepEqual(page.errors,[]);
  await save(new URL('setup.json',dir),JSON.stringify(setup,null,2)+'\n');
  console.log('PASS original and revised underside in the same native scene, four lights',setup);
} finally {await browser.close();await server.close();}

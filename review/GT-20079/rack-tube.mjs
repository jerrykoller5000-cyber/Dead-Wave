import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../',import.meta.url),out=new URL('./rack-tube/',import.meta.url);await mkdir(out,{recursive:true});
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Guard review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT); TT.modsOwnAllDbg();return true})");
  await page.evaluate("views.equip('shotgun')");
  const setup=await page.evaluate('('+prepare.toString()+')()');assert.equal(setup,'extended tube');
  const records={};
  for(const phase of ['before','after']){
    records[phase]=await page.evaluate('window.rackTube('+JSON.stringify(phase)+')');
    assert.equal(records[phase].rackPresent,96);
    for(const view of ['world','eye','rack'])assert.equal(records[phase][view],phase==='after'?96:0,phase+' '+view);
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('views.light('+JSON.stringify(light)+')');
      const png=await page.send('Page.captureScreenshot',{format:'png'});
      await save(new URL(phase+'-'+light+'.png',out),Buffer.from(png.data,'base64'));
    }
  }
  await save(new URL('setup.json',out),JSON.stringify(records,null,2)+'\n');assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}

async function prepare(){
  const T=window.TT,G=T.THREE,id='shotgun',g=T.weaponMeshes[id],ctx=T.inspectHost().builders.weaponContext();
  T.addCash(10000);T.buyExtMag(id);if(!T.armoryDbg.fit(id,'ext',true))throw Error('Missing normal Armory tube fit');
  const key=T.armoryFinishDbg.list(id).list.find(o=>o.key&&!o.locked).key;
  if(!T.armoryFinishDbg.paint(id,key))throw Error('Missing selected finish');
  await views.pose('hip');const tube=g.userData.tubeExt.children[0],painted=tube.material;
  const {tubeCoverage}=await import('/review/GT-20079/registry-coverage.mjs');
  window.rackTube=async phase=>{
    // The single artwork change wraps the same gunDark mesh in a paint role.
    // Restore that exact factory material on the source mesh for the old rack.
    tube.material=phase==='before'?ctx.gunDark:painted;
    await views.pose('hip');const result=tubeCoverage(T);await views.pose('rack');
    const rack=T.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
    const subject=rack.children.find(o=>o.userData.rackKind===id),inner=T.carryGunCopyDbg(id).children[0];inner.updateMatrix();
    subject.updateWorldMatrix(true,false);const basis=subject.matrixWorld.clone().multiply(inner.matrix);
    const eye=new G.Vector3(-.48,.10,.94).applyMatrix4(basis),target=new G.Vector3(0,-.026,.825).applyMatrix4(basis);
    T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:30});
    return {...result,cameraEye:eye.toArray(),cameraTarget:target.toArray(),swatch:key};
  };
  return painted.userData.weaponFinishRole;
}

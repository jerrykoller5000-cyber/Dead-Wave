import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {replayArtwork} from '../GT-20076/replay-artwork.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN&&['before','after'].includes(phase));
const root=new URL('../../',import.meta.url),out=new URL('./bracket-'+phase+'/',import.meta.url);await mkdir(out,{recursive:true});
const server=await serve(fileURLToPath(root),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  if(phase==='before'){
    const path='/studio/weapon-model-hooks.js',source=await readFile(new URL('../..'+path,import.meta.url),'utf8'),line='        this.updateWorldMatrix(true, true);';
    assert.equal(source.split(line).length,2);
    const verify=await replayArtwork(page,server.origin,path,source.replace(line,''));
    await page.goto(server.origin+'/index.html?debug=1&raf=timer');verify();
  }else await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Finish review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT);return views.equip('ak')}).then(()=>views.pose('held-left-open'))");
  const setup=await page.evaluate('('+closeup.toString()+')()');
  await save(new URL('setup.json',out),JSON.stringify(setup)+'\n');console.log(phase,setup);
  for(const light of ['noon','overcast','dusk','night']){
    await page.evaluate('views.light('+JSON.stringify(light)+')');
    const frame=await page.send('Page.captureScreenshot',{format:'png'});
    await save(new URL(light+'.png',out),Buffer.from(frame.data,'base64'));
  }
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
async function closeup(){
  const T=window.TT,G=T.THREE,g=T.weaponMeshes.ak;
  if(!T.opticDbg.grant('ak','acog')||!T.opticDbg.fit('ak','acog'))throw Error('Missing fitted optic');
  const swatch=T.armoryFinishDbg.list('ak').list.find(o=>o.key&&!o.locked)?.key;
  if(!swatch||!T.armoryFinishDbg.paint('ak',swatch))throw Error('Missing selected finish');
  const group=g.userData.opticPlate,web=group.getObjectByName('KR-7 bracket web');
  if(!web||!web.material.map)throw Error('Bracket is not coated');
  const copy=T.cloneLean(g);
  copy.visible=true;copy.position.copy(T.player.position).add(new G.Vector3(0,2,2));copy.rotation.set(0,0,0);T.scene.add(copy);copy.updateMatrixWorld(true);
  const e=copy.localToWorld(new G.Vector3(-.44,.134,.12)),t=copy.localToWorld(new G.Vector3(-.027,.055,.066));
  T.setShotView({x:e.x,y:e.y,z:e.z,tx:t.x,ty:t.y,tz:t.z,fov:25});
  const uv=web.geometry.attributes.uv;return {uv:[uv.getX(0),uv.getY(0)],swatch,eye:e.toArray(),target:t.toArray()};
}

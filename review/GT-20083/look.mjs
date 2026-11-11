import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
import {originalHandle} from './original-handle.mjs';

const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && /^(before|after|refined|fitted|ends|boss)$/.test(phase));
const webgl=process.argv.includes('--webgl');
const dir=new URL('./'+phase+(webgl?'-webgl':'')+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  const verify=phase==='before'&&process.argv.includes('--original-handle')?await originalHandle(page,server.origin):null;
  await page.goto(server.origin+'/index.html?debug=1&raf=timer'+(webgl?'&renderer=webgl':''));
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Handle review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.vis=m.makeViews(TT);return vis.equip('chainsaw')})");
  const backend=await page.evaluate('TT.inspectHost().renderer.backend.constructor.name');
  if(webgl)assert.match(backend,/WebGL/);
  await save(new URL('backend.txt',dir),backend+'\n');
  const states={};
  for(const view of ['hip','held-left-open','held-right-open','close']){
    states[view]=await page.evaluate('vis.pose('+JSON.stringify(view==='close'?'held-right-open':view)+')');
    if(view==='close')states.close.camera=await page.evaluate(`(()=>{
      const g=TT.weaponMeshes.chainsaw,V=TT.THREE.Vector3;
      const aim=g.localToWorld(new V(-.015,.169,-.048)),eye=g.localToWorld(new V(.45,.52,.40));
      const camera={x:eye.x,y:eye.y,z:eye.z,tx:aim.x,ty:aim.y,tz:aim.z,fov:32};
      TT.setShotView(camera);return camera;
    })()`);
    for(const light of ['noon','overcast','dusk','night']){
      await page.evaluate('vis.light('+JSON.stringify(light)+')');
      const shot=await page.send('Page.captureScreenshot',{format:'png'});
      await save(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
    }
  }
  await save(new URL('cameras.json',dir),JSON.stringify(states,null,2)+'\n');
  if(['fitted','ends','boss'].includes(phase)){
    await page.goto(server.origin+'/index.html?inspect&debug=1&raf=timer'+(webgl?'&renderer=webgl':''));
    assert(await page.waitFor('window.DWInspect?.ready && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:60000}));
    await page.evaluate("DWInspect.show('weapon.chainsaw',{instant:true})");
    for(const [angle,light] of [['side','noon'],['three','overcast'],['rear3','dusk'],['three','night']]){
      await page.evaluate('DWInspect.light('+JSON.stringify(light)+');DWInspect.view('+JSON.stringify(angle)+',{instant:true})');
      const shot=await page.evaluate("(async()=>{await DWInspect.stepAsync(6);return DWInspect.shot({type:'image/jpeg',quality:.88})})()");
      const bytes=Buffer.from(shot.split(',')[1],'base64');assert(bytes.length>4000);
      await save(new URL('inspector-'+light+'.jpg',dir),bytes);
    }
  }
  if(verify)await verify();
  assert.deepEqual(page.errors,[]);
  console.log('PASS',phase,'eye, held left/right and close, four lights each');
}finally{await browser.close();await server.close();}

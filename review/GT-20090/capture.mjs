import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN&&['before','after'].includes(phase));
const dir=new URL('./'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const p=await browser.newPage({width:960,height:540});await p.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await p.waitFor('window.TT&&DWLoad.snapshot().state==="ready"'));await p.evaluate('DWOpening.dismissForTesting()');assert(await p.waitFor('!DWOpening.active'));
  await p.evaluate("document.getElementById('playerName').value='GW-4 fit';document.getElementById('modeTraining').click()");
  assert(await p.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await p.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.v=m.makeViews(TT,"+JSON.stringify(phase==='before'?'record':'replay')+",true);return true})");
  if(phase==='after')await p.evaluate("fetch('/review/GT-20090/before/cameras.json').then(r=>r.json()).then(c=>{window.recordedArtViews=c;return true})");
  await p.evaluate("v.equip('m4')");const cameras={};
  for(const view of ['hip','held-right-open','side']){
    if(view==='side'){
      await p.evaluate("v.pose('rack')");
      cameras.side=await p.evaluate(`import('/review/GT-20090/landmark.mjs').then(m=>{
        const G=TT.THREE,{model}=m.buildArtwork(TT);TT.scene.add(model);model.position.copy(TT.player.position).add(new G.Vector3(0,2,2));model.updateWorldMatrix(true,true);
        const eye=model.localToWorld(new G.Vector3(.21,-.067,-.077)),aim=model.localToWorld(new G.Vector3(0,-.078,-.048));
        TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:aim.x,ty:aim.y,tz:aim.z,fov:35});return {eye:eye.toArray(),aim:aim.toArray()};
      })`);
    }else cameras[view]=await p.evaluate('v.pose('+JSON.stringify(view)+')');
    for(const light of ['noon','overcast','dusk','night']){
      await p.evaluate('v.light('+JSON.stringify(light)+')');
      const shot=await p.send('Page.captureScreenshot',{format:'png'});
      await writeFile(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
    }
    if(view==='hip'){
      const proof=await p.evaluate("import('/review/GT-20090/landmark.mjs').then(m=>m.check(TT,"+JSON.stringify(phase)+",'59f3fedc'))",120000);
      await writeFile(new URL('landmark.json',dir),JSON.stringify(proof,null,2)+'\n');
      console.log(phase,proof.current,proof.pin,proof.copies,proof.widths);
    }
  }
  await writeFile(new URL('cameras.json',dir),JSON.stringify(cameras,null,2)+'\n');
  assert.deepEqual(p.errors,[]);console.log('PASS three views in four lights');
}finally{await browser.close();await server.close();}

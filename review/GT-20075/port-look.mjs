import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const dir=new URL('./gw4-port/'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='GW-4 window';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
 await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.vis=m.makeViews(TT);return vis.equip('m4')})");
 const cameras={};
 for(const view of ['hip','window']){
   cameras[view]=await page.evaluate('vis.pose('+JSON.stringify(view==='hip'?'hip':'held-right-open')+')');
   if(view==='window')cameras.local=await page.evaluate(`(()=>{
     const t=TT,G=t.THREE,g=t.weaponMeshes.m4,target=new G.Vector3(...g.userData.ejectPort);
     const eye=target.clone().add(new G.Vector3(.43,.105,-.205));
     const e=g.localToWorld(eye.clone()),c=g.localToWorld(target.clone());
     t.setShotView({x:e.x,y:e.y,z:e.z,tx:c.x,ty:c.y,tz:c.z,fov:21});
     return {eye:eye.toArray(),target:target.toArray(),fov:21};
   })()`);
   for(const light of ['noon','overcast','dusk','night']){
     await page.evaluate('vis.light('+JSON.stringify(light)+')');
     const shot=await page.send('Page.captureScreenshot',{format:'png'});await save(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
   }
 }
 await save(new URL('cameras.json',dir),JSON.stringify(cameras,null,2)+'\n');
 const pose=await page.evaluate(`(()=>{
   const g=TT.weaponMeshes.m4,u=g.userData,group=u.recoilBolt,values=[];
   for(const weight of [0,.5,1,0]){
     u.recoilBoltPose(group,u.portStroke*weight);values.push(group.children.map(p=>[p.visible,p.scale.z,p.position.z]));
   }
   return {anchor:u.ejectPort,stroke:u.portStroke,values};
 })()`);assert.deepEqual(pose.values[0],pose.values[3]);
 await save(new URL('animation.json',dir),JSON.stringify(pose,null,2)+'\n');assert.deepEqual(page.errors,[]);
 console.log('PASS',phase,'four lights at the eye and on the presented side, native artwork poses and reset');
}finally{await browser.close();await server.close();}

import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const dir=new URL('./'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const p=await browser.newPage({width:960,height:540});await p.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await p.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
 await p.evaluate('DWOpening.dismissForTesting()');assert(await p.waitFor('!DWOpening.active'));
 await p.evaluate("document.getElementById('playerName').value='Walnut comparison';document.getElementById('modeTraining').click()");
 assert(await p.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
 await p.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.vis=m.makeViews(TT);return vis.equip('revolver')})");
 const cameras={};
 for(const view of ['eye','walnut']){
   cameras[view]=await p.evaluate('vis.pose('+JSON.stringify(view==='eye'?'hip':'held-right-open')+')');
   if(view==='walnut')cameras.walnutLocal=await p.evaluate(`(()=>{
     const t=TT,G=t.THREE,copy=t.carryGunCopyDbg('revolver');t.scene.add(copy);
     copy.position.copy(t.player.position).add(new G.Vector3(0,2.5,1.2));copy.updateMatrixWorld(true);
     const model=copy.children[0],c=new G.Vector3(.006,-.059,-.071),e=c.clone().add(new G.Vector3(.36,.115,-.30));
     const target=model.localToWorld(c.clone()),eye=model.localToWorld(e.clone());
     t.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:29});
     return {target:c.toArray(),eye:e.toArray(),fov:29};
   })()`);
   for(const light of ['noon','overcast','dusk','night']){
     await p.evaluate('vis.light('+JSON.stringify(light)+')');
     const png=await p.send('Page.captureScreenshot',{format:'png'});await save(new URL(view+'-'+light+'.png',dir),Buffer.from(png.data,'base64'));
   }
 }
 await save(new URL('cameras.json',dir),JSON.stringify(cameras,null,2)+'\n');
 if(phase==='after'){
   const panels=await p.evaluate("import('/review/GT-20076/walnut-panel-proof.mjs').then(m=>m.checkWalnutPanels(TT.inspectHost().builders.weaponContext()))");
   assert.equal(panels.length,2);
   for(const item of panels){
     assert(item.closed && item.woodTexture && !item.paintRole && item.before>10);
     assert.equal(item.missing+item.added,0);assert.equal(item.outerMotion,0);
     assert(Math.abs(item.inner-(item.side>0?.029:.033))<1e-7);
   }
   await save(new URL('panel-seats.json',dir),JSON.stringify(panels,null,2)+'\n');
 }
 const art=await p.evaluate("import('/review/GT-20088/wood.mjs').then(m=>m.readWood(TT))",120000);
 await save(new URL('art.json',dir),JSON.stringify(art)+'\n');assert.deepEqual(p.errors,[]);
 console.log('PASS',phase,'normal eye, isolated carried copy, four lights,',art.meshes.length,'native meshes recorded');
}finally{await browser.close();await server.close();}

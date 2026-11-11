import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const dir=new URL('./'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 const probe=await page.evaluate("import('/review/GT-20086/probe.mjs').then(m=>m.probePad(TT,"+(phase==='before')+"))",90000);
 await save(new URL('clearance.json',dir),JSON.stringify(probe,null,2)+'\n');assert(probe.closed);
 console.log('Raw gap and contact',probe.rows[0],probe.contact);
 if(phase==='after'){
   for(const r of probe.stroke){assert(!r.woodGap.penetrating && r.woodGap.lowerMm>0);assert(!r.shellGap.penetrating && r.shellGap.upperMm<.01);assert(Math.abs(r.visibleTravel-r.amount*.001)<1e-6);}
   assert.deepEqual(probe.contact.map(n=>Number(n.toFixed(6))),[0,-.002,-.0674]);
 }
 await page.evaluate("document.getElementById('playerName').value='KR-7 light return';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
 await page.evaluate(`(async()=>{
  const {makeViews}=await import('/review/GT-20076/visibility-camera.mjs');
  window.vis=makeViews(TT);window.padArt=await import('/review/GT-20084/motion.mjs');TT.modsOwnAllDbg();TT.addCash(100000);
  await vis.equip('ak');if(!TT.armoryDbg.fit('ak','laserLight',true))throw Error('Could not fit the light');await vis.equip('ak');
 })()`);
 const hip=await page.evaluate('vis.pose("hip")');
 for(const light of ['noon','overcast','dusk','night']){
   await page.evaluate('vis.light('+JSON.stringify(light)+')');
   const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});await save(new URL('eye-'+light+'.jpg',dir),Buffer.from(shot.data,'base64'));
 }
 const motion=await page.evaluate("padArt.inspectSwitches(TT,'ak')");await save(new URL('motion.json',dir),JSON.stringify(motion,null,2)+'\n');
 assert.deepEqual(motion.axis,[0,0,1]);assert.equal(motion.travel,.001);
 for(const r of Object.values(motion.copies)){assert(r.moved>0 && r.stationary>0);assert(Math.abs(r.furthest-.001)<1e-6 && r.reset<1e-7 && r.lateral<1e-7 && r.otherCopyDrift<1e-7);}
 await page.evaluate('vis.pose("held-right-open")');
 const guide=phase==='after'?JSON.parse(await readFile(new URL('./before/camera.json',import.meta.url),'utf8')).local:null;
 const local=await page.evaluate(`(async()=>{
   const T=TT,G=T.THREE,g=T.weaponMeshes.ak,marker=g.getObjectByName(g.userData.controls.lightSwitch),unit=marker.parent,camera=T.inspectHost().camera;
   const guide=${JSON.stringify(guide)};
   if(guide){const e=unit.localToWorld(new G.Vector3(...guide.eye)),c=unit.localToWorld(new G.Vector3(...guide.target));T.setShotView({x:e.x,y:e.y,z:e.z,tx:c.x,ty:c.y,tz:c.z,fov:guide.fov});}
   else padArt.setSwitchShot(T,'ak');
   await vis.light('noon');const eye=unit.worldToLocal(camera.getWorldPosition(new G.Vector3()));
   return {eye:eye.toArray(),target:guide?.target||unit.worldToLocal(marker.getWorldPosition(new G.Vector3())).toArray(),fov:camera.fov};
 })()`);
 await save(new URL('camera.json',dir),JSON.stringify({hip,local},null,2)+'\n');
 if(guide){assert(Math.hypot(...local.eye.map((x,i)=>x-guide.eye[i]))<1e-5);assert(Math.abs(local.fov-guide.fov)<1e-6);}
 const states={};
 for(const light of ['noon','overcast','dusk','night'])for(const pressed of [false,true]){
   await page.evaluate("padArt.setSwitchPress(TT,'ak',"+pressed+");vis.light("+JSON.stringify(light)+")");
   states[light+'/'+pressed]=await page.evaluate("padArt.switchRenderState(TT,'ak')");
   const shot=await page.send('Page.captureScreenshot',{format:'png'});await save(new URL('close-'+light+'-'+(pressed?'pressed':'rest')+'.png',dir),Buffer.from(shot.data,'base64'));
 }
 await save(new URL('states.json',dir),JSON.stringify(states,null,2)+'\n');assert.deepEqual(page.errors,[]);
 console.log('PASS',phase,'matched eye and lamp camera in four lights, all copies return to rest');
}finally{await browser.close();await server.close();}

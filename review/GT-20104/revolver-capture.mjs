import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const phase=process.argv[2];assert(['before','after'].includes(phase));
const dir=new URL('revolver/'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const previous=phase==='after'?JSON.parse(await readFile(new URL('revolver/before/records.json',import.meta.url),'utf8')):null;
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Revolver scale';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.revolverViews=m.makeViews(TT);return revolverViews.equip('revolver')})");
 const records=[];
 for(const pose of ['rest','empty-open'])for(const view of (pose==='rest'?['hip','aimed','held-right','rack']:['hip','held-right'])){
  if(pose==='empty-open')await page.evaluate("TT.setAmmoDbg('revolver',0);TT.startReload();TT.reloadClipDbg.hold(.45);true");
  await page.evaluate('revolverViews.pose('+JSON.stringify(view)+')');
  const saved=previous?.records.find(r=>r.pose===pose&&r.view===view)?.camera;
  if(saved)await page.evaluate('TT.setShotView('+JSON.stringify(saved)+');true');
  for(const light of ['noon','overcast','dusk','night']){
   await page.evaluate('revolverViews.light('+JSON.stringify(light)+')');
   const state=await page.evaluate(`(()=>{const T=TT,G=T.THREE,H=T.inspectHost(),g=T.weaponMeshes.revolver,c=H.camera,p=c.getWorldPosition(new G.Vector3()),d=c.getWorldDirection(new G.Vector3()),ud=g.userData;return {camera:{x:p.x,y:p.y,z:p.z,tx:p.x+d.x,ty:p.y+d.y,tz:p.z+d.z,fov:c.fov},scale:g.scale.toArray(),worldScale:g.getWorldScale(new G.Vector3()).toArray(),sizes:T.getWeaponSizeDbg(),triggerPin:ud.triggerPin,cylinderPosition:ud.cylinder.position.toArray(),cylinderRotation:ud.cylinder.rotation.toArray(),reload:T.getReloadDbg()}})()`);
   if(saved)assert(Math.hypot(state.camera.x-saved.x,state.camera.y-saved.y,state.camera.z-saved.z)<1e-5,'Camera moved from BEFORE');
   const shot=await page.send('Page.captureScreenshot',{format:'png'});
   const file=pose+'-'+view+'-'+light+'.png';await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));
   records.push({pose,view,light,file,...state});
  }
 }
 await writeFile(new URL('records.json',dir),JSON.stringify({at:new Date().toISOString(),records},null,2));
 assert.deepEqual(page.errors,[]);console.log('PASS native revolver '+phase+'24four-light shots: eye/aim/held/rack and empty cylinder open');
}finally{await browser.close();await server.close();}

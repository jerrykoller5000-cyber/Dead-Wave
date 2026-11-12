import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const [id,phase]=process.argv.slice(2);
assert(['pistol','revolver','uzi'].includes(id)&&['before','after'].includes(phase));
const folder=new URL(id+'/'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:960,height:540});
 let verifyOriginal;
 if(process.argv.includes('--trial')){
  const {trialGuard}=await import('./trial-source.mjs'),{replayArtwork}=await import('../GT-20076/replay-artwork.mjs');
  const source=await readFile(new URL('pre-final-source.txt',import.meta.url),'utf8');
  verifyOriginal=await replayArtwork(page,server.origin,'/studio/weapon-sidearms.js',trialGuard(source));
 }
 if(phase==='before'&&process.argv.includes('--saved-source')){
  const {replayArtwork}=await import('../GT-20076/replay-artwork.mjs');
  const source=await readFile(new URL('pre-revolver-source.txt',import.meta.url),'utf8');
  verifyOriginal=await replayArtwork(page,server.origin,'/studio/weapon-sidearms.js',source);
 }
 if(phase==='before'&&id==='pistol'&&process.argv.includes('--replay-original')){
  const {pistolOriginal}=await import('./pistol-original.mjs');
  const {replayArtwork}=await import('../GT-20076/replay-artwork.mjs');
  const source=await readFile(new URL('../../studio/weapon-sidearms.js',import.meta.url),'utf8');
  verifyOriginal=await replayArtwork(page,server.origin,'/studio/weapon-sidearms.js',pistolOriginal(source));
 }
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');
 assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Sidearm detail';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.views=m.makeViews(TT,"+JSON.stringify(phase==='before'?'record':'replay')+",true);return true})");
 if(phase==='after'){
  const cameras=JSON.parse(await readFile(new URL(id+'/before/cameras.json',import.meta.url),'utf8'));
  await page.evaluate('window.recordedArtViews='+JSON.stringify(cameras));
 }
 await page.evaluate('views.equip('+JSON.stringify(id)+')');
 const cameras={};
 for(const pose of (process.argv.includes('--check-only')?[]:process.argv.includes('--rack-only')?['rack']:['aimed','hip','rack'])){
  cameras[pose]=await page.evaluate('views.pose('+JSON.stringify(pose)+')');
  if(pose==='rack'){
   const cameraFile=new URL(id+'/rack-camera.json',import.meta.url);
   const saved=phase==='after'?JSON.parse(await readFile(cameraFile,'utf8')):null;
   const detail=await page.evaluate('('+function(id,saved){
    const T=TT,G=T.THREE,rack=T.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
    const subject=rack.children.find(o=>o.userData.rackKind===id);
    rack.updateWorldMatrix(true,true);
    let target,eye;
    if(saved){target=new G.Box3().setFromObject(subject).getCenter(new G.Vector3());const offset=rack.localToWorld(new G.Vector3(...saved.eye)).sub(rack.localToWorld(new G.Vector3(...saved.target)));eye=target.clone().add(offset);}
    else{
     target=new G.Box3().setFromObject(subject).getCenter(new G.Vector3());
     eye=target.clone().add(new G.Vector3(.07,.06,1).normalize().applyQuaternion(rack.getWorldQuaternion(new G.Quaternion())).multiplyScalar(.25));
    }
    T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:90});
    return {eye:rack.worldToLocal(eye).toArray(),target:rack.worldToLocal(target).toArray()};
   }.toString()+')('+JSON.stringify(id)+','+JSON.stringify(saved)+')');
   if(phase==='before')await writeFile(cameraFile,JSON.stringify(detail));
  }
  for(const light of ['noon','overcast','dusk','night']){
   await page.evaluate('views.light('+JSON.stringify(light)+')');
   const shot=await page.send('Page.captureScreenshot',{format:'png'});
   await writeFile(new URL(pose+'-'+light+'.png',folder),Buffer.from(shot.data,'base64'));
  }
 }
 if(!process.argv.includes('--check-only')&&!process.argv.includes('--rack-only'))await writeFile(new URL('cameras.json',folder),JSON.stringify(cameras,null,2));
 if(phase==='after'){
  await page.evaluate('views.equip('+JSON.stringify(id)+').then(()=>views.pose("hip"))');
  const result=await page.evaluate("import('/review/GT-20097/finish.mjs').then(m=>m.checkFinish(TT,"+JSON.stringify(id)+"))");
  await writeFile(new URL('finish.json',folder),JSON.stringify(result,null,2));
 }
 const controls=await page.evaluate('(()=>{const g=TT.weaponMeshes['+JSON.stringify(id)+'];return {controls:g.userData.controls,triggerPin:g.userData.triggerPin}})()');
 await writeFile(new URL('controls.json',folder),JSON.stringify(controls,null,2));
 verifyOriginal?.();
 assert.deepEqual(page.errors,[]);
 console.log('PASS',id,phase,'aimed hip rack, four lights');
}finally{await browser.close();await server.close();}

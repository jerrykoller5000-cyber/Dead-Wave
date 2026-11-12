import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const standardOnly=process.argv.includes('--standard-only');
const [phase,...ids]=process.argv.slice(2).filter(arg=>!arg.startsWith('--'));assert(['before','after'].includes(phase)&&ids.length&&ids.every(id=>['pistol','revolver','uzi','aa12'].includes(id)));
const folder=new URL('final-visible-2026-11-12/',import.meta.url),server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Visible final';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.finalViews=m.makeViews(TT,"+JSON.stringify(phase==='before'?'record':'replay')+",true);return true})");
 for(const id of ids){
  const dir=new URL(id+'/'+phase+'/',folder);await mkdir(dir,{recursive:true});
  if(phase==='after')await page.evaluate('window.recordedArtViews='+await readFile(new URL(id+'/before/cameras.json',folder),'utf8'));
  await page.evaluate('finalViews.equip('+JSON.stringify(id)+')');
  const cameras=standardOnly?JSON.parse(await readFile(new URL('cameras.json',dir),'utf8')):{};
  for(const view of (standardOnly?['standard-open']:['aimed','hip','rack','standard-open','held-left-open','held-right-open'])){
   cameras[view]=await page.evaluate('finalViews.pose('+JSON.stringify(view)+')');
   if(view==='rack'){
    const cameraFile=new URL(id+'/rack-camera.json',folder),saved=phase==='after'?JSON.parse(await readFile(cameraFile,'utf8')):null;
    const record=await page.evaluate('('+function(id,saved){
     const T=TT,G=T.THREE,rack=T.scene.getObjectByName('training-armory').getObjectByName('armoryRack'),subject=rack.children.find(o=>o.userData.rackKind===id);
     rack.updateWorldMatrix(true,true);const box=new G.Box3().setFromObject(subject),target=box.getCenter(new G.Vector3()),size=box.getSize(new G.Vector3());
     const distance=Math.max(size.y,size.x/(16/9),size.z)*.5/Math.tan(25*Math.PI/180)*1.15;
     const offset=saved?rack.localToWorld(new G.Vector3(...saved.eye)).sub(rack.localToWorld(new G.Vector3(...saved.target))):new G.Vector3(.07,.06,1).normalize().applyQuaternion(rack.getWorldQuaternion(new G.Quaternion())).multiplyScalar(distance);
     const eye=target.clone().add(offset);T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:50});
     return {eye:rack.worldToLocal(eye).toArray(),target:rack.worldToLocal(target).toArray()};
    }.toString()+')('+JSON.stringify(id)+','+JSON.stringify(saved)+')');
    if(phase==='before')await writeFile(cameraFile,JSON.stringify(record,null,2));
   }
   for(const light of ['noon','overcast','dusk','night']){
    await page.evaluate('finalViews.light('+JSON.stringify(light)+')');
    const shot=await page.send('Page.captureScreenshot',{format:'png'});
    await writeFile(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
   }
  }
  await writeFile(new URL('cameras.json',dir),JSON.stringify(cameras,null,2));
  console.log('PASS native',id,phase,'aimed hip rack standard third-person and two held sides, four lights');
 }
 assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}

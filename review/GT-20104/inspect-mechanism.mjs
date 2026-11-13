import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const dir=new URL('mechanism-final/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?inspect&raf=timer');
 assert(await page.waitFor('window.DWInspect&&DWInspect.ready',{timeout:240000}));
 await page.evaluate("import('/tools/camera-rig.js').then(m=>window.CamRig=m.install())");
 await page.evaluate("import('/review/GT-20104/mechanism-stage.mjs').then(m=>window.mechanismStage=m.stage)");
 const records=[],cameras={};
 for(const view of ['side','three']){
  await page.evaluate("mechanismStage(TT,'before',.07,'noon')");
  cameras[view]=(await page.evaluate('CamRig.aim('+JSON.stringify({target:'weapon.pistol',view,margin:1.5,settle:1400})+')')).cam;
 }
 for(const travel of [0,.07])for(const view of ['side','three'])for(const light of ['noon','overcast','dusk','night'])for(const version of ['before','candidate']){
  const state=await page.evaluate('mechanismStage(TT,'+JSON.stringify(version)+','+travel+','+JSON.stringify(light)+')');
  const camera=await page.evaluate('CamRig.aim('+JSON.stringify({target:'weapon.pistol',cam:cameras[view],settle:1400})+')');
  let shot,valid=false,attempt;
  for(attempt=0;attempt<4;attempt++){
   await page.evaluate('TT.inspectHost().render();true');
   await new Promise(r=>setTimeout(r,220));
   shot=await page.send('Page.captureScreenshot',{format:'png'});
   valid=await page.evaluate(`(async()=>{const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,${shot.data}')).blob()),c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();const d=ctx.getImageData(0,0,1280,720).data;for(let i=0;i<d.length;i+=64)if(d[i]>35||d[i+1]>35||d[i+2]>35)return true;return false})()`);
   if(valid)break;
  }
  assert(valid,'Black native frame '+version+view+light+travel);
  const drawnCamera=await page.evaluate('TT.inspectHost().camera.getWorldPosition(new TT.THREE.Vector3()).toArray()');
  assert(Math.hypot(drawnCamera[0]-camera.cam.x,drawnCamera[1]-camera.cam.y,drawnCamera[2]-camera.cam.z)<1e-5,'Actual camera drifted');
  const file=version+'-'+travel+'-'+view+'-'+light+'.png';
  await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));
  const recipe=await page.evaluate('DWInspect.session()');
  assert.equal(recipe.display.light,light);assert.deepEqual(camera.cam,cameras[view]);
  records.push({file,state,camera:camera.cam,drawnCamera,light:recipe.display.light,retries:attempt});
 }
 await writeFile(new URL('records.json',dir),JSON.stringify({reviewOnlyPose:true,productionMotionPending:true,cameras,records},null,2));
 assert.deepEqual(page.errors,[]);console.log('PASS native model-contract before/candidate32stills, fixed cameras,4actual lights, no black frames');
}finally{await browser.close();await server.close();}

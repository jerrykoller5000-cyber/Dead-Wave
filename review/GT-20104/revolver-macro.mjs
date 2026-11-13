import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const dir=new URL('revolver/macros/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?inspect&raf=timer');
 assert(await page.waitFor('window.DWInspect&&DWInspect.ready',{timeout:240000}));
 await page.evaluate("import('/tools/camera-rig.js').then(m=>window.CamRig=m.install())");
 await page.evaluate("import('/review/GT-20104/revolver-stage.mjs').then(m=>window.revStage=m.stage)");
 const records=[],cameras={};
 for(const part of ['hammer','cylinder-rear','cylinder-front']){
  cameras[part]=(await page.evaluate('revStage(TT,"before",'+JSON.stringify(part)+',"noon")')).camera;
  for(const light of ['noon','overcast','dusk','night'])for(const version of ['before','after']){
   const state=await page.evaluate('revStage(TT,'+JSON.stringify(version)+','+JSON.stringify(part)+','+JSON.stringify(light)+')');
   await page.evaluate('CamRig.aim('+JSON.stringify({target:'weapon.revolver',cam:cameras[part],settle:1200})+')');
   let shot,valid=false,attempt;
   for(attempt=0;attempt<4;attempt++){
    await page.evaluate('TT.inspectHost().render();true');await new Promise(r=>setTimeout(r,220));shot=await page.send('Page.captureScreenshot',{format:'png'});
    valid=await page.evaluate(`(async()=>{const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,${shot.data}')).blob()),c=document.createElement('canvas');c.width=1280;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();const d=ctx.getImageData(0,0,1280,720).data;for(let i=0;i<d.length;i+=64)if(d[i]>35||d[i+1]>35||d[i+2]>35)return true;return false})()`);if(valid)break;
   }
   assert(valid,'Black macro');
   const camera=await page.evaluate('TT.inspectHost().camera.getWorldPosition(new TT.THREE.Vector3()).toArray()'),expected=cameras[part];
   assert(Math.hypot(camera[0]-expected.x,camera[1]-expected.y,camera[2]-expected.z)<1e-5);
   assert.equal((await page.evaluate('DWInspect.session()')).display.light,light);
   const file=version+'-'+part+'-'+light+'.png';await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));records.push({file,state,camera:expected,actualCamera:camera,retries:attempt});
  }
 }
 await writeFile(new URL('records.json',dir),JSON.stringify({emptyCylinderPosedForConstruction:true,records},null,2));assert.deepEqual(page.errors,[]);
 console.log('PASS native revolver24macro before/after shots, fixed actual cameras and4lights');
}finally{await browser.close();await server.close();}

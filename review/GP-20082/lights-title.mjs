import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20082');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
 if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:90000}))throw Error('game not ready');
 await page.evaluate('DWOpening.dismissForTesting()');
 if(!await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}))throw Error('opening not dismissed');
 const details=await page.evaluate(`(async()=>{
   const T=TT.THREE,cif=TT.scene.getObjectByName('hq-cif');if(!cif)throw Error('CIF missing');
   cif.updateMatrixWorld(true);const p=(x,y,z)=>cif.localToWorld(new T.Vector3(x,y,z));
   const eye=p(0,1.62,2.6),aim=p(0,.95,.32);
   const cam={x:eye.x,y:eye.y,z:eye.z,tx:aim.x,ty:aim.y,tz:aim.z,fov:43};
   window.CifCam=(await import('/tools/camera-rig.js')).install();
   return {cam,position:cif.getWorldPosition(new T.Vector3()).toArray()};
 })()`);
 const captures=[];
 for(const light of ['noon','overcast','dusk','night']){
   await page.evaluate(`(async()=>{TT.weather.raining=${light==='overcast'};TT.weather.intensity=${light==='overcast'?1:0};await CifCam.aim({cam:${JSON.stringify(details.cam)},time:'${light}',ui:false,settle:700});})()`);
   const file=path.join(out,`final-hq-eye-${light}.png`);await page.screenshot(file);
   captures.push({light,bytes:fs.statSync(file).size});console.log(light,fs.statSync(file).size);
 }
 fs.writeFileSync(path.join(out,'lights-title-final.json'),JSON.stringify({details,captures,errors:page.errors},null,2));
 if(captures.some(c=>c.bytes<50000)||page.errors.length)process.exitCode=1;
}finally{await browser.close();await server.close();}
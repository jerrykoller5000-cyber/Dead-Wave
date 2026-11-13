import assert from 'node:assert/strict';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const dir=new URL('impacts-final/',import.meta.url);await mkdir(dir,{recursive:true});
const paths=['world/training-ballistics.js','studio/weapon-effects.js'];const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const start=await hashes(),server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Paired impact proof';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate(`(async()=>{
 const T=TT,G=T.THREE,H=T.inspectHost(),st=T.trainingDbg.state(),tg=T.trainingDbg.tg();
 T.flightHold(true);T.setViewFirstDbg(false);T.player.visible=false;
 document.head.append(Object.assign(document.createElement('style'),{textContent:'body > :not(canvas):not(script):not(style){visibility:hidden!important}'}));
 const saved=await(await fetch('/review/GT-20105/training-ballistics.before.js')).text();
 const url=URL.createObjectURL(new Blob([saved.replaceAll("from './","from '"+location.origin+"/world/")],{type:'text/javascript'}));
 const before=await import(url);URL.revokeObjectURL(url);const after=await import('/world/training-ballistics.js');
 const camera={x:tg.origin.x+5.7,y:tg.floorY+1.55,z:tg.origin.z+16,tx:tg.origin.x+8,ty:tg.floorY+1.55,tz:tg.origin.z+16,fov:46};
 T.setShotView(camera);for(let i=0;i<3;i++)T.stepFrame(0);
 const {effectReviewLights}=await import('/review/GT-20105/lights.mjs'),lights=effectReviewLights(T,H,{x:camera.x,y:camera.y,z:camera.z},{x:camera.tx,y:camera.ty,z:camera.tz});
 window.impactPair={T,G,H,st,tg,camera,before,after,lights};
 })()`);
 const records=[];
 for(const version of ['before','after']){
  const state=await page.evaluate(`(()=>{
   const {T,H,st,tg,lights}=impactPair;lights.hold(false);st.impacts.dispose();st.impacts=impactPair[${JSON.stringify(version)}].createTrainingImpacts(T.THREE,tg);
   for(let i=0;i<8;i++){const z=tg.origin.z+16+(i%4-1.5)*.32,y=tg.floorY+1.28+Math.floor(i/4)*.35;T.fireRoundDbg(tg.origin.x+5,y,z,1,0,0,25,180,0);for(let n=0;n<5;n++)T.stepProjectilesDbg(.008);}
   for(let i=0;i<65;i++)T.stepFrame(1/60);lights.hold(true);
   return {marks:st.impacts.count()};
  })()`);assert.equal(state.marks,8);
  for(const light of ['noon','overcast','dusk','night']){
   const row=await page.evaluate(`(async()=>{
    const {T,G,H,lights}=impactPair,actual=await lights.select(${JSON.stringify(light)});
    const p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());
    return {actualLight:actual,camera:{x:p.x,y:p.y,z:p.z,tx:p.x+d.x,ty:p.y+d.y,tz:p.z+d.z,fov:H.camera.fov},marks:impactPair.st.impacts.count()};
   })()`);
   await new Promise(r=>setTimeout(r,350));const shot=await page.send('Page.captureScreenshot',{format:'png'}),file=version+'-'+light+'.png';await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));records.push({version,light,file,...row});
  }
 }
 const end=await hashes();assert.deepEqual(end,start,'effect source changed during final proof');
 for(const light of ['noon','overcast','dusk','night']){const a=records.find(r=>r.light===light&&r.version==='before'),b=records.find(r=>r.light===light&&r.version==='after');for(const k in a.camera)assert(Math.abs(a.camera[k]-b.camera[k])<1e-6,k);assert.deepEqual(a.actualLight,b.actualLight);}
 await writeFile(new URL('records.json',dir),JSON.stringify({mode:'same native game page: original visual factory vs production visual factory; live projectile path',sources:start,records,errors:page.errors},null,2));assert.deepEqual(page.errors,[]);console.log('PASS8live impacts per version;4actual light presets asserted;exactpaired cameras;unchanged effect sources');
}finally{await browser.close();await server.close();}

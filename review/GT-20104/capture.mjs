import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const phase=process.argv[2];assert(['before','after','candidate'].includes(phase));
const dir=new URL('pistol/'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Pistol mechanism';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.mechanismViews=m.makeViews(TT);return mechanismViews.equip('pistol')})");
 if(phase==='candidate')await page.evaluate(`(()=>{
  const T=TT,H=T.inspectHost(),step=T.stepFrame;
  window.candidatePose=true;
  T.stepFrame=function(dt){
   const result=step(dt),u=T.weaponMeshes.pistol.userData,part=u.barrelAssembly;
   const travel=u.baseSlidePos.z-u.slide.position.z,joint=Math.min(Math.max(0,travel),.004),unlock=Math.max(0,Math.min(1,(travel-.004)/.004));
   part.position.set(0,.05-.010*unlock,.075-joint);part.rotation.set(-.05*unlock,0,0);part.updateMatrix();
   const eye=T.viewmodelDbg()?.gun?.pairs.find(([source])=>source===part)?.[1];
   if(eye){eye.position.copy(part.position);eye.quaternion.copy(part.quaternion);eye.updateMatrix();}
   H.render();return result;
  };return true;
 })()`);
 await page.evaluate("TT.setAmmoDbg('pistol',0);TT.startReload();true");
 const records=[];
 for(const fraction of [.70,.80,.88,.96])for(const view of ['hip','held-right']){
  await page.evaluate('TT.reloadClipDbg.hold('+fraction+');true');
  const camera=await page.evaluate('mechanismViews.pose('+JSON.stringify(view)+')');
  for(const light of ['noon','overcast','dusk','night']){
   await page.evaluate('mechanismViews.light('+JSON.stringify(light)+')');
   const data=await page.evaluate(`(()=>{const T=TT,g=T.weaponMeshes.pistol,u=g.userData,vm=T.viewmodelDbg(),state=T.getReloadDbg();return {candidatePose:!!window.candidatePose,state,slide:u.slide.position.toArray(),frame:u.frame.position.toArray(),barrel:u.barrelAssembly?{position:u.barrelAssembly.position.toArray(),quaternion:u.barrelAssembly.quaternion.toArray()}:null,eyeSlide:vm.gun?.slide?.position.toArray(),triggerPin:u.triggerPin,scale:g.scale.toArray()}})()`);
   assert.equal(data.state.weapon,'pistol');assert(Math.abs(1-data.state.timer/data.state.anim-fraction)<.003);
   const shot=await page.send('Page.captureScreenshot',{format:'png'});
   await writeFile(new URL(view+'-'+fraction+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
   records.push({fraction,view,light,camera,...data});
  }
 }
 await writeFile(new URL('records.json',dir),JSON.stringify(records,null,2));
 await page.evaluate('TT.reloadClipDbg.hold(null);true');
 assert.deepEqual(page.errors,[]);console.log('PASS native pistol reload70/80/88/96%, eye+held right, four lights,32 shots');
}finally{await browser.close();await server.close();}

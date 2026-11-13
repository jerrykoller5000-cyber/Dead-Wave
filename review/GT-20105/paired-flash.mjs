import assert from 'node:assert/strict';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const phase='paired';
const dir=new URL('flash-paired/',import.meta.url);await mkdir(dir,{recursive:true});
const sources=['index.html','studio/weapon-effects.js','game/viewmodel.js'];const snapshot=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));const sourceStart=await snapshot();
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Live flash';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.liveFx={views:m.makeViews(TT),stage:null};true})");
 const records=[];
 for(const gun of ['pistol','m4']){
  await page.evaluate(`(async()=>{if(liveFx.stage)liveFx.stage.hold(false);await liveFx.views.equip(${JSON.stringify(gun)});})()`);
  for(const view of (gun==='pistol'?['hip','held-right']:['hip']))for(const light of ['noon','overcast','dusk','night']){
   const row=await page.evaluate(`(async()=>{
    const T=TT,G=T.THREE,H=T.inspectHost();if(liveFx.stage)liveFx.stage.hold(false);
    await liveFx.views.pose(${JSON.stringify(view)});
    const eye=H.camera.getWorldPosition(new G.Vector3()),aim=eye.clone().addScaledVector(H.camera.getWorldDirection(new G.Vector3()),3),{effectReviewLights}=await import('/review/GT-20105/lights.mjs');
    const stage=liveFx.stage=effectReviewLights(T,H,{x:eye.x,y:eye.y,z:eye.z},{x:aim.x,y:aim.y,z:aim.z},{nightLamp:true});await stage.select(${JSON.stringify(light)});
    const g=T.weaponMeshes[${JSON.stringify(gun)}],ud=g.userData;T.setAmmoDbg(${JSON.stringify(gun)},${gun==='pistol'?12:30});T.resetSprayDbg();ud.shots=0;
    stage.hold(false);T.setMouseFireDbg(false);T.stepFrame(1/60);
    const original=Math.random;let seed=1707;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    let steps=0;
    try{T.setMouseFireDbg(true);while(!(ud.shots>0)&&steps++<50)T.stepFrame(1/120);}finally{T.setMouseFireDbg(false);Math.random=original;}
    stage.hold(true);T.stepFrame(0);const actual=await stage.select(${JSON.stringify(light)});
    if(!(ud.shots>0&&ud.flashT>0&&ud.flash.material.opacity>0&&ud.flash.material.visible))throw Error('Native shot did not light flash '+JSON.stringify({shots:ud.shots,t:ud.flashT,opacity:ud.flash.material.opacity,visible:ud.flash.material.visible}));
    const p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3()),f=ud.flash,vm=T.viewmodelDbg().gun;
    return {gun:${JSON.stringify(gun)},view:${JSON.stringify(view)},light:${JSON.stringify(light)},actualLight:actual,shots:ud.shots,steps,flashT:ud.flashT,opacity:f.material.opacity,visible:f.material.visible,triangles:(f.geometry.index?.count||f.geometry.attributes.position.count)/3,map:!!f.material.map,scale:f.scale.toArray(),roll:f.rotation.z,depthWrite:f.material.depthWrite,suppressed:!!ud.suppressed,eyeFlash:vm?.flash?{opacity:vm.flash.material.opacity,visible:vm.flash.material.visible,triangles:(vm.flash.geometry.index?.count||vm.flash.geometry.attributes.position.count)/3}:null,camera:{x:p.x,y:p.y,z:p.z,tx:p.x+d.x,ty:p.y+d.y,tz:p.z+d.z,fov:H.camera.fov}};
   })()`);
   assert(row.shots>0&&row.opacity>0&&row.visible&&!row.depthWrite);assert.equal(row.triangles,8);
   for(const version of ['before','after']){
    const picture=await page.evaluate('(()=>{const T=TT,G=T.THREE,H=T.inspectHost(),key='+JSON.stringify(gun)+',version='+JSON.stringify(version)+';const ud=T.weaponMeshes[key].userData,vm=T.viewmodelDbg().gun;'+
     'if(version==="before"){const flashes=[ud.flash];if(vm?.flash)flashes.push(vm.flash);liveFx.visuals=flashes.map(f=>({f,geometry:f.geometry,map:f.material.map,color:f.material.color.clone(),side:f.material.side,single:f.material.forceSinglePass,scale:f.scale.clone(),roll:f.rotation.z}));'+
     'for(const a of liveFx.visuals){const f=a.f,scale=a.scale.y/(1.06-((ud.shots|0)%3)*.06);f.geometry=new G.SphereGeometry(key==="pistol"?.045:.06,6,6);f.material.map=null;f.material.color.copy(new G.Color(0xffcc66).multiplyScalar(a.color.r>1.01?2.4:1));f.material.side=G.FrontSide;f.material.forceSinglePass=false;f.material.needsUpdate=true;f.scale.setScalar(scale);f.rotation.z=0;}}'+
     'else{for(const a of liveFx.visuals){const f=a.f;f.geometry=a.geometry;f.material.map=a.map;f.material.color.copy(a.color);f.material.side=a.side;f.material.forceSinglePass=a.single;f.material.needsUpdate=true;f.scale.copy(a.scale);f.rotation.z=a.roll;}}'+
     'const p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());return{camera:{x:p.x,y:p.y,z:p.z,tx:p.x+d.x,ty:p.y+d.y,tz:p.z+d.z,fov:H.camera.fov},opacity:ud.flash.material.opacity,flashT:ud.flashT};})()');
    await page.evaluate('TT.inspectHost().render()');await page.evaluate('TT.inspectHost().render()');
    await new Promise(r=>setTimeout(r,200));
    const shot=await page.send('Page.captureScreenshot',{format:'png'}),file=version+'-'+gun+'-'+view+'-'+light+'.png';
    await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));
    const held=await page.evaluate('(()=>{const u=TT.weaponMeshes['+JSON.stringify(gun)+'].userData;return {flashT:u.flashT,opacity:u.flash.material.opacity};})()');
    assert(Math.abs(held.flashT-row.flashT)<1e-8&&Math.abs(held.opacity-row.opacity)<1e-8,'flash faded during paired art capture');
    records.push({file,version,...row,camera:picture.camera,legacyConstruction:version==='before'});
   }
   const faded=await page.evaluate(`(()=>{liveFx.stage.hold(false);for(let n=0;n<30;n++)TT.stepFrame(1/60);liveFx.stage.hold(true);const f=TT.weaponMeshes[${JSON.stringify(gun)}].userData.flash;return {opacity:f.material.opacity,visible:f.material.visible};})()`);assert.equal(faded.opacity,0);assert.equal(faded.visible,false);
  }
 }
 const offhand=await page.evaluate(`(()=>{const rows=[];for(const[k,g]of Object.entries(TT.offhandMeshes)){const f=g.userData.flash;if(!f)continue;const m=f.material,d=Object.getOwnPropertyDescriptor(m,'opacity'),old=m.opacity;m.opacity=.8;rows.push({gun:k,setter:!!d?.set,litVisible:m.visible,litOpacity:m.opacity});m.opacity=old;rows[rows.length-1].restVisible=m.visible;}return rows;})()`);
 await writeFile(new URL('records.json',dir),JSON.stringify({phase,sourceStart,sourceEnd:await snapshot(),mode:'same native live-fired pose/camera/light: original sphere geometry/color/scalar reconstructed from original parameters, versus actual production gas plume; native45ms fade verified',records,offhand,errors:page.errors},null,2));assert.deepEqual(page.errors,[]);console.log('PASS same-shot paired flash artwork,12native poses24images+fade,4lights incl task lamp; offhand setter probe '+JSON.stringify(offhand));
}finally{await browser.close();await server.close();}

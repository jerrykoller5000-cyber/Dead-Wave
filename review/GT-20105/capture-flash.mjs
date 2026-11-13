import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const phase=process.argv[2];assert(['before','draft','after'].includes(phase));
const dir=new URL('flash/'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Flash construction';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.fxViews=m.makeViews(TT);return fxViews.equip('pistol')})");
 const records=[];
 for(const view of ['hip','held-right']){
  await page.evaluate('fxViews.pose('+JSON.stringify(view)+')');
  for(const light of ['noon','overcast','dusk','night']){
   await page.evaluate('fxViews.light('+JSON.stringify(light)+')');
   const row=await page.evaluate(`(async()=>{
    const T=TT,G=T.THREE,H=T.inspectHost(),g=T.weaponMeshes.pistol,vm=T.viewmodelDbg().gun;
    const flashes=[g.userData.flash,vm?.flash].filter(Boolean);
    if(${phase==='draft'}){
     const f=await import('/studio/weapon-effects.js'),geo=f.createMuzzleFlashGeometry(G,.045),map=f.createMuzzleFlashTexture(G);
     for(const flash of flashes){flash.geometry=geo;flash.material.map=map;flash.material.side=G.DoubleSide;flash.material.forceSinglePass=true;flash.material.color.setHex(0xffffff);flash.material.needsUpdate=true;flash.rotation.z=.75;}
    }
    g.userData.flashT=.04;
    for(const flash of flashes){flash.visible=true;flash.material.visible=true;flash.material.opacity=.85;flash.scale.setScalar(1.5/(g.userData.sizeK||1));}
    await H.render();
    const p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());
    return {view:${JSON.stringify(view)},light:${JSON.stringify(light)},camera:{x:p.x,y:p.y,z:p.z,tx:p.x+d.x,ty:p.y+d.y,tz:p.z+d.z,fov:H.camera.fov},flashes:flashes.map(f=>({triangles:(f.geometry.index?.count||f.geometry.attributes.position.count)/3,opacity:f.material.opacity,scale:f.scale.toArray(),position:f.position.toArray()}))};
   })()`);
   await new Promise(r=>setTimeout(r,200));const s=await page.send('Page.captureScreenshot',{format:'png'}),file=view+'-'+light+'.png';
   await writeFile(new URL(file,dir),Buffer.from(s.data,'base64'));records.push({file,...row});
  }
 }
 await writeFile(new URL('records.json',dir),JSON.stringify({phase,mode:'posed construction only; live shot timing not verified',records,errors:page.errors},null,2));
 assert.deepEqual(page.errors,[]);console.log('PASS '+phase+' flash construction:hip/side4lights');
}finally{await browser.close();await server.close();}

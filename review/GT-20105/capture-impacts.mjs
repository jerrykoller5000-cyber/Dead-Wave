import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN,'crew slot required');
const phase=process.argv[2];assert(['before','draft','draft2','after'].includes(phase));
const dir=new URL('impacts/'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try {
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Impact review';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 const setup=await page.evaluate(`(async()=>{
 const T=TT,G=T.THREE,H=T.inspectHost(),tg=T.trainingDbg.tg(),st=T.trainingDbg.state();
 T.flightHold(true);T.setViewFirstDbg(false);T.player.visible=false;
 document.head.append(Object.assign(document.createElement('style'),{textContent:'body > :not(canvas):not(script):not(style){visibility:hidden!important}'}));
 st.impacts.clear();st.char.clear();
 const hitRows=[];
 for(let i=0;i<8;i++){
  const z=tg.origin.z-6+(i%4-1.5)*.32,y=tg.floorY+1.28+Math.floor(i/4)*.35;
  T.fireRoundDbg(tg.origin.x+5,y,z,1,0,0,25,180,0);for(let s=0;s<5;s++)T.stepProjectilesDbg(.008);
 }
 const camera={x:tg.origin.x+5.7,y:tg.floorY+1.55,z:tg.origin.z-6,tx:tg.origin.x+8,ty:tg.floorY+1.55,tz:tg.origin.z-6,fov:46};
 T.setShotView(camera);for(let n=0;n<65;n++)T.stepFrame(1/60);
 const {LIGHTS}=await import('/studio/inspector/stage.js');
 window.fxReview={T,G,H,tg,st,LIGHTS,camera,light:null};
 H.attach({held:()=>true,scale:dt=>dt,frame:()=>{}});
 return {camera,marks:st.impacts.count(),solids:tg.solids.filter(s=>s.mesh).map(s=>({name:s.mesh.name,minX:s.minX,maxX:s.maxX,minY:s.minY,maxY:s.maxY,minZ:s.minZ,maxZ:s.maxZ}))};
 })()`);
 assert.equal(setup.marks,8);
 if(phase.startsWith('draft')) await page.evaluate(`(async()=>{
 const {T,G,tg}=fxReview,{createImpactAtlas,impactAppearance,impactUV}=await import('/studio/weapon-effects.js');
 const map=createImpactAtlas(G),corner=[[-.5,-.5],[.5,-.5],[-.5,.5],[.5,-.5],[.5,.5],[-.5,.5]];
 tg.group.traverse(o=>{
  if(o.name!=='training-impact-marks')return;
  const geo=o.geometry,a=geo.attributes.position,uv=geo.attributes.uv;
  o.material.map=map;o.material.needsUpdate=true;
  for(let s=0;s<geo.drawRange.count/6;s++){
   const get=i=>new G.Vector3().fromBufferAttribute(a,s*6+i),p=get(0),u=get(1).sub(p).normalize(),v=get(2).sub(p).normalize();
   const center=get(0).add(get(4)).multiplyScalar(.5),look=impactAppearance(s);
   const uu=u.clone().multiplyScalar(Math.cos(look.roll)).addScaledVector(v,Math.sin(look.roll)),vv=v.clone().multiplyScalar(Math.cos(look.roll)).addScaledVector(u,-Math.sin(look.roll));
   corner.forEach(([x,y],i)=>{const q=center.clone().addScaledVector(uu,x*look.width).addScaledVector(vv,y*look.height);a.setXYZ(s*6+i,q.x,q.y,q.z);uv.setXY(s*6+i,...impactUV(look.cell,x,y));});
  }
  a.needsUpdate=uv.needsUpdate=true;
 });
 })()`);

 const records=[];
 for(const light of ['noon','overcast','dusk','night']){
  const record=await page.evaluate(`(async()=>{
   const {T,G,H,tg,LIGHTS,camera}=fxReview,L=LIGHTS[${JSON.stringify(light)}];
   H.sun.position.set(camera.x,camera.y,camera.z).addScaledVector(new G.Vector3(...L.dir).normalize(),85);
   H.sun.target.position.set(camera.tx,camera.ty,camera.tz);H.sun.target.updateMatrixWorld();
   H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
   T.stepFrame(0);
   const p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());
   await H.render();
   return {camera:{x:p.x,y:p.y,z:p.z,tx:p.x+d.x,ty:p.y+d.y,tz:p.z+d.z,fov:H.camera.fov},light:${JSON.stringify(light)},marks:fxReview.st.impacts.count(),draws:H.renderer.info.render.calls};
  })()`);
  assert(Math.hypot(record.camera.x-setup.camera.x,record.camera.y-setup.camera.y,record.camera.z-setup.camera.z)<1e-6,'camera moved');
  await new Promise(r=>setTimeout(r,350));
  const shot=await page.send('Page.captureScreenshot',{format:'png'});
  const file='wall-'+light+'.png';await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));records.push({file,...record});
 }
 await writeFile(new URL('records.json',dir),JSON.stringify({setup,records,errors:page.errors},null,2));
 assert.deepEqual(page.errors,[]);console.log('PASS '+phase+':8native bullet impacts,4light fixedcamera');
}finally{await browser.close();await server.close();}

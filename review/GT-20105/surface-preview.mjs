import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const dir=new URL('surface-preview/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Surface footprint';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 const setup=await page.evaluate(`(async()=>{
 const T=TT,G=T.THREE,H=T.inspectHost(),st=T.trainingDbg.state(),tg=T.trainingDbg.tg();
 T.flightHold(true);T.setViewFirstDbg(false);T.player.visible=false;st.char.clear();st.impacts.clear();
 document.head.append(Object.assign(document.createElement('style'),{textContent:'body > :not(canvas):not(script):not(style){visibility:hidden!important}'}));
 const {traceTraining}=await import('/world/training-ballistics.js'),{exactLayer}=await import('/world/training-exact.js'),{clipSurfaceMark}=await import('/studio/weapon-effects.js');
 const layer=exactLayer(tg);let hit=null,probe=null;
 outer:for(const part of layer.parts){
  if(part.maxX<7||part.minZ>tg.origin.z-9||part.maxZ<tg.origin.z-11.5)continue;
  const bank=part.tri;
  for(let k=0;k<bank.length;k+=12){
   if(Math.abs(bank[k+9])<.8)continue;
   const p={x:bank[k]+(bank[k+3]+bank[k+6])/3,y:bank[k+1]+(bank[k+4]+bank[k+7])/3,z:bank[k+2]+(bank[k+5]+bank[k+8])/3};
   if(p.y<tg.floorY+.7||p.y>tg.floorY+2.8)continue;
   const sign=bank[k+9]>0?-1:1,n={x:bank[k+9]*sign,y:bank[k+10]*sign,z:bank[k+11]*sign};
   const a={x:p.x+n.x*.5,y:p.y+n.y*.5,z:p.z+n.z*.5},b={x:p.x-n.x*.1,y:p.y-n.y*.1,z:p.z-n.z*.1};
   const candidate=traceTraining(tg,a,b);
   if(candidate?.exact&&candidate.solid===part.solid){hit=candidate;probe={a,b};break outer;}
  }
 }
 if(!hit)throw Error('No actual CIF prop face found among '+layer.parts.length+'sourceparts');
 st.char.add({...hit,size:.85},.94);
 const source=tg.group.getObjectByName('training-char-marks'),banks=exactLayer(tg).parts.filter(p=>p.solid===hit.solid).map(p=>p.tri);
 const mark=clipSurfaceMark(banks,[hit.point.x,hit.point.y,hit.point.z],[hit.normal.x,hit.normal.y,hit.normal.z],.85,.85,0,64);
 if(!mark.triangles)throw Error('No clipped footprint: '+JSON.stringify({hit,banks:banks.length}));
 const geo=new G.BufferGeometry();geo.setAttribute('position',new G.Float32BufferAttribute(mark.positions,3));
 const uv=mark.uv.map((v,i)=>(i%2?.535:.035)+v*.43);geo.setAttribute('uv',new G.Float32BufferAttribute(uv,2));
 geo.setAttribute('color',new G.Float32BufferAttribute(new Float32Array(mark.positions.length/3*4).fill(1),4));geo.computeVertexNormals();
 const mesh=new G.Mesh(geo,source.material);mesh.name='PRIVATE-surface-clipped-preview';mesh.renderOrder=source.renderOrder;mesh.frustumCulled=false;T.scene.add(mesh);mesh.visible=false;
 const camera={x:hit.point.x+hit.normal.x*1.5,y:hit.point.y+.2+hit.normal.y*1.5,z:hit.point.z+.25+hit.normal.z*1.5,tx:hit.point.x,ty:hit.point.y,tz:hit.point.z,fov:46};T.setShotView(camera);for(let n=0;n<3;n++)T.stepFrame(0);
 const {LIGHTS}=await import('/studio/inspector/stage.js');H.attach({held:()=>true,scale:dt=>dt,frame:()=>{}});
 window.surfaceReview={T,G,H,tg,source,mesh,LIGHTS,camera};
 return {camera,hit,banks:banks.length,clippedTriangles:mark.triangles,truncated:mark.truncated,positions:mark.positions,uv:mark.uv};
 })()`);
 const records=[];
 for(const light of ['noon','overcast','dusk','night'])for(const version of ['before','draft']){
  const row=await page.evaluate(`(async()=>{
   const {T,G,H,source,mesh,LIGHTS,camera}=surfaceReview,L=LIGHTS[${JSON.stringify(light)}];
   source.visible=${version==='before'};mesh.visible=${version==='draft'};
   H.sun.position.set(camera.x,camera.y,camera.z).addScaledVector(new G.Vector3(...L.dir).normalize(),85);H.sun.target.position.set(camera.tx,camera.ty,camera.tz);H.sun.target.updateMatrixWorld();
   H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;T.stepFrame(0);await H.render();
   const p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());return {light:${JSON.stringify(light)},version:${JSON.stringify(version)},position:p.toArray(),direction:d.toArray(),fov:H.camera.fov};
  })()`);
  await new Promise(r=>setTimeout(r,250));const shot=await page.send('Page.captureScreenshot',{format:'png'}),file=version+'-'+light+'.png';await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));records.push({file,...row});
 }
 await writeFile(new URL('records.json',dir),JSON.stringify({mode:'private geometry preview, production char unchanged',setup,records,errors:page.errors},null,2));assert.deepEqual(page.errors,[]);console.log('PASS native clipped prop footprint: '+setup.clippedTriangles+'triangles,4lights same-page before/draft');
}finally{await browser.close();await server.close();}

import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const dir=new URL('surface-final/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Surface clipping proof';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 const setup=await page.evaluate(`(async()=>{
 const T=TT,G=T.THREE,H=T.inspectHost(),st=T.trainingDbg.state(),tg=T.trainingDbg.tg();
 T.flightHold(true);T.setViewFirstDbg(false);T.player.visible=false;st.impacts.clear();
 document.head.append(Object.assign(document.createElement('style'),{textContent:'body > :not(canvas):not(script):not(style){visibility:hidden!important}'}));
 const {traceTraining}=await import('/world/training-ballistics.js'),{exactLayer}=await import('/world/training-exact.js'),{clipSurfaceMark}=await import('/studio/weapon-effects.js');
 const layer=exactLayer(tg);let hit=null,banks=null,area=0,trialCount=0;
 outer:for(const part of layer.parts){
  if(part.maxX<7||part.minZ>tg.origin.z-9||part.maxZ<tg.origin.z-11.5)continue;
  const t=part.tri;
  for(let k=0;k<t.length;k+=12){
   if(Math.abs(t[k+9])<.8)continue;
   for(const f of [.04,.92]){
    const p={x:t[k]+t[k+3]*f+t[k+6]*.04,y:t[k+1]+t[k+4]*f+t[k+7]*.04,z:t[k+2]+t[k+5]*f+t[k+8]*.04};
    if(p.y<tg.floorY+.7||p.y>tg.floorY+2.8)continue;
    const sign=t[k+9]>0?-1:1,n={x:t[k+9]*sign,y:t[k+10]*sign,z:t[k+11]*sign};
    const a={x:p.x+n.x*.5,y:p.y+n.y*.5,z:p.z+n.z*.5},b={x:p.x-n.x*.1,y:p.y-n.y*.1,z:p.z-n.z*.1};
    const h=traceTraining(tg,a,b);trialCount++;if(!h?.exact||h.solid!==part.solid)continue;
    const bs=layer.parts.filter(q=>q.solid===h.solid).map(q=>q.tri),mark=clipSurfaceMark(bs,[h.point.x,h.point.y,h.point.z],[h.normal.x,h.normal.y,h.normal.z],.85,.85,0,64);
    let ar=0;
    for(let j=0;j<mark.positions.length;j+=9){const a=new G.Vector3(...mark.positions.slice(j,j+3)),b=new G.Vector3(...mark.positions.slice(j+3,j+6)),c=new G.Vector3(...mark.positions.slice(j+6,j+9));ar+=new G.Triangle(a,b,c).getArea();}
    if(ar>.006&&ar<.85*.85*.58&&!mark.truncated){hit=h;banks=bs;area=ar;break outer;}
   }
  }
 }
 if(!hit)throw Error('No confirmed prop edge in '+trialCount+'native triangle probes');
 const raw=await(await fetch('/review/GT-20105/training-ballistics.before.js')).text(),url=URL.createObjectURL(new Blob([raw.replaceAll("from './","from '"+location.origin+"/world/")],{type:'text/javascript'}));
 const before=await import(url);URL.revokeObjectURL(url);const after=await import('/world/training-ballistics.js');
 const camera={x:hit.point.x+hit.normal.x*1.5,y:hit.point.y+.2+hit.normal.y*1.5,z:hit.point.z+.25+hit.normal.z*1.5,tx:hit.point.x,ty:hit.point.y,tz:hit.point.z,fov:60};
 T.setShotView(camera);for(let n=0;n<3;n++)T.stepFrame(0);
 const {effectReviewLights}=await import('/review/GT-20105/lights.mjs'),lights=effectReviewLights(T,H,{x:camera.x,y:camera.y,z:camera.z},{x:camera.tx,y:camera.ty,z:camera.tz},{nightLamp:true});
 window.surfaceFinal={T,G,H,st,tg,hit,banks,before,after,camera,lights};
 return {hit,trialCount,clippedArea:area,unclippedArea:.85*.85,camera};
 })()`);
 const records=[],geometry=[];
 for(const version of ['before','after']){
  const measured=await page.evaluate(`(()=>{
   const {T,G,H,st,tg,hit,banks,lights}=surfaceFinal;st.char.dispose();st.char=surfaceFinal[${JSON.stringify(version)}].createTrainingChar(G,tg);
   const old=Math.random;let seed=77;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   try{st.char.add({...hit,size:.85},.94);}finally{Math.random=old;}
   const mesh=tg.group.children.find(o=>o.name===${JSON.stringify(version==='after'?'training-char-projected-marks':'training-char-marks')});
   mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position,col=mesh.geometry.attributes.color,valid=[];
   for(let i=0;i<mesh.geometry.drawRange.count;i++)if(col.getW(i)>0){const p=new G.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);valid.push(p);}
   const triangles=[];
   for(const bank of banks)for(let k=0;k<bank.length;k+=12){const a=new G.Vector3(bank[k],bank[k+1],bank[k+2]);triangles.push(new G.Triangle(a,a.clone().add(new G.Vector3(bank[k+3],bank[k+4],bank[k+5])),a.clone().add(new G.Vector3(bank[k+6],bank[k+7],bank[k+8]))));}
   let maximum=0;const closest=new G.Vector3();
   const samples=[...valid];for(let i=0;i+2<valid.length;i+=3)samples.push(valid[i].clone().add(valid[i+1]).add(valid[i+2]).multiplyScalar(1/3));
   for(const p of samples){let d=Infinity;for(const t of triangles)d=Math.min(d,t.closestPointToPoint(p,closest).distanceTo(p));maximum=Math.max(maximum,d);}
   return {version:${JSON.stringify(version)},marks:st.char.count(),vertices:valid.length,maxDistance:maximum};
  })()`);
  console.log('SURFACE '+JSON.stringify(measured));assert.equal(measured.marks,1);assert(measured.vertices>0);
  if(version==='after'){assert(measured.maxDistance<.0013,'projected mark floats off actual source triangles');assert(measured.vertices<192,'footprint hit its triangle limit');}
  geometry.push(measured);
  for(const light of ['noon','overcast','dusk','night']){
   const row=await page.evaluate(`(async()=>{const {T,G,H,lights}=surfaceFinal,actual=await lights.select(${JSON.stringify(light)}),p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());return {actualLight:actual,position:p.toArray(),direction:d.toArray(),fov:H.camera.fov};})()`);
   await new Promise(r=>setTimeout(r,250));const shot=await page.send('Page.captureScreenshot',{format:'png'}),file=version+'-'+light+'.png';await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));records.push({version,light,file,...row});
  }
 }
 await writeFile(new URL('records.json',dir),JSON.stringify({mode:'production char constructors, fixed seeded footprint, exact native prop edge',setup,geometry,records,errors:page.errors},null,2));assert.deepEqual(page.errors,[]);console.log('PASS native prop edge '+JSON.stringify(geometry));
}finally{await browser.close();await server.close();}

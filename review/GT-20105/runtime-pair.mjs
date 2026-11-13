import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';const sources=['studio/weapon-effects.js','world/training-ballistics.js','world/training.js','game/viewmodel.js','index.html'];const hashes=async()=>Object.fromEntries(await Promise.all(sources.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));const start=await hashes();
assert(process.env.DW_GAME_TEST_TOKEN);const dir=new URL('runtime-pair/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1');
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
 await page.evaluate('surfaceFinal.lights.hold(false);TT.flightHold(false);true');
 const records=[];
 for(const [pass,version]of ['before','after','after','before'].entries()){
 const setup=await page.evaluate(`(async()=>{const R=surfaceFinal,{T,G,H,st,tg,hit}=R;st.char.dispose();st.impacts.dispose();st.char=R[${JSON.stringify(version)}].createTrainingChar(G,tg);st.impacts=R[${JSON.stringify(version)}].createTrainingImpacts(G,tg);
 const old=Math.random;let seed=77;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let elapsed;
 try{const t=performance.now();for(let n=0;n<64;n++)st.impacts.add(hit,{weapon:'m4'});st.char.add({...hit,size:.85},.94);elapsed=performance.now()-t;}finally{Math.random=old;}
 await R.lights.select('noon');await H.render();const p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());return{impacts:st.impacts.count(),scorch:st.char.count(),insertMs:elapsed,camera:{position:p.toArray(),direction:d.toArray(),fov:H.camera.fov},light:'noon'};})()`);
 if(records.length)assert.deepEqual(setup.camera,records[0].setup.camera,'native camera changed between runtime phases');
 assert.equal(setup.impacts,64);assert.equal(setup.scorch,1);await new Promise(r=>setTimeout(r,2000));await page.evaluate('TT.resetPerf()');const windows=[];
 for(let n=0;n<6;n++){await new Promise(r=>setTimeout(r,1000));windows.push(await page.evaluate(`(()=>{const R=surfaceFinal,T=TT,i=T.renderer.info.render;return{...T.perfSnapshot(),draws:i.drawCalls??i.calls??0,triangles:i.triangles,impacts:R.st.impacts.count(),scorch:R.st.char.count()};})()`));}
 await writeFile(new URL('phase-'+pass+'.json',dir),JSON.stringify({pass,version,setup,windows},null,2));const usable=windows.filter(w=>w.fps>0);assert(usable.length>=4,'native FPS samples');assert(windows.every(w=>w.impacts===64&&w.scorch===1),'fixture did not stay full');const fps=usable.reduce((s,w)=>s+w.fps,0)/usable.length;
 records.push({pass,version,setup,windows,fps});console.log('RUNTIME '+JSON.stringify({pass,version,fps,insertMs:setup.insertMs,windows:usable.length}));
 }
 const end=await hashes();
 await writeFile(new URL('records.json',dir),JSON.stringify({start,end,mode:'Same native game page, A/B/B/A original/production factories, 64 coincident confirmed-prop impacts + one .85m scorch, warmed fixed camera/noon. Steady mark rendering, not continuous construction or shot/flash load; insertion time separate.',setup,records,errors:page.errors},null,2));assert.deepEqual(end,start,'sources changed during matched runtime comparison');assert.deepEqual(page.errors,[]);const mean=v=>{const r=records.filter(r=>r.version===v);return r.reduce((s,r)=>s+r.fps,0)/r.length;};const before=mean('before'),after=mean('after');assert(after>=before*.95,'steady-mark FPS regressed over5%');console.log('PASS matched steady prop-mark rendering '+JSON.stringify({before,after}));
 }finally{await browser.close();await server.close();}

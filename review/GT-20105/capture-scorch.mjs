import assert from 'node:assert/strict';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const phase=process.argv[2];assert(['before','after','before-lamp','after-lamp'].includes(phase));
const dir=new URL('scorch/'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 if(phase==='before-lamp'){
  let html=(await readFile('index.html','utf8')).replace(/\r\n/g,'\n');
  const edits=[
   ["const tHit = trainingTraceExact(training.tg, rangePrev, p);   // GT-20105: the dummy's moving surface, as rounds and lasers","const tHit = traceTraining(training.tg, rangePrev, p);"],
   ["                  if (tHit.solid.dummy) training.dummy?.model?.addMark({ kind: 'scorch', point: tHit.point, normal: tHit.normal });\n                  else training.char?.add({ ...tHit, size: cSize }, tHit.solid.target != null ? 0.84 : 0.94);","                  training.char?.add({ ...tHit, size: cSize }, tHit.solid.target != null ? 0.84 : 0.94);"],
   ["                  if (tHit.solid.dummy) training.dummy?.model?.addMark({ kind: 'scorch', point: tHit.point, normal: tHit.normal });\n                  else training.char?.add({ ...tHit, size: 0.50 + Math.random() * 0.34 }, 0.74);","                  training.char?.add({ ...tHit, size: 0.50 + Math.random() * 0.34 }, 0.74);"]
  ];
  for(const [a,b]of edits){assert.equal(html.split(a).length,2);html=html.replace(a,()=>b);}
  page.conn.onEvent(msg=>{if(msg.sessionId===page.sessionId&&msg.method==='Fetch.requestPaused')page.send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'}],body:Buffer.from(html).toString('base64')}).catch(e=>page.errors.push(String(e)));});
  await page.send('Fetch.enable',{patterns:[{urlPattern:'*/index.html*',requestStage:'Request'}]});
 }
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));
 await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Scorch contact';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.fxViews=m.makeViews(TT);return fxViews.equip('flamer')})");
 const probe=await page.evaluate(`(async()=>{
 const T=TT,G=T.THREE,H=T.inspectHost(),st=T.trainingDbg.state(),tg=T.trainingDbg.tg(),d=st.dummy,s=d.solid;
 H.attach({held:()=>false,scale:dt=>dt,frame:()=>{}});T.flightHold(true);T.setShotView(null);T.setViewFirstDbg(true);
 T.player.position.set(s.cx+3,tg.floorY,s.cz);T.setOtsAimDbg(-Math.PI/2,0);for(let n=0;n<70;n++)T.stepFrame(1/60);
 T.setMouseFireDbg(true);for(let n=0;n<12;n++)T.stepFrame(1/60);T.setMouseFireDbg(false);
 T.flameDbg.clear();st.char.clear();d.reset();
 T.setMouseFireDbg(true);T.stepFrame(1/30);T.setMouseFireDbg(false);
 const particles=T.flameDbg.particles();if(!particles.length)throw Error('Native flamer emitted no particles');
 const p=particles[0];for(let n=1;n<particles.length;n++){particles[n].life=.001;particles[n].age=1;}
 Object.assign(p,{x:s.cx+.65,y:tg.floorY+1.25,z:s.cz,vx:-22,vy:0,vz:0,ox:s.cx+1,oy:tg.floorY+1.25,oz:s.cz,ux:0,uz:-1,age:.02,life:2,edge:false,quenched:false,grounded:false,splashed:false,charred:false,charSlide:0});
 const states=[];
 for(let n=0;n<6;n++){T.stepFrame(1/60);states.push({x:p.x,y:p.y,z:p.z,charred:p.charred,splashed:p.splashed,charCount:st.char.count(),dummy:d.state()});}
 T.flameDbg.clear();T.player.visible=false;
 const camera={x:s.cx+1.65,y:tg.floorY+1.30,z:s.cz+1.30,tx:s.cx,ty:tg.floorY+1.1,tz:s.cz,fov:46};
 T.setShotView(camera);for(let n=0;n<4;n++)T.stepFrame(0);
 const {LIGHTS}=await import('/studio/inspector/stage.js');window.scorchReview={T,G,H,tg,st,d,camera,LIGHTS};
 const {effectReviewLights}=await import('/review/GT-20105/lights.mjs');scorchReview.stage=effectReviewLights(T,H,{x:camera.x,y:camera.y,z:camera.z},{x:camera.tx,y:camera.ty,z:camera.tz},{nightLamp:true});
 return {mode:'native emitted particle conditioned immediately before contact; production flame collision path',solid:s,states,camera,char:st.char.count(),dummy:d.state()};
 })()`);
 const records=[];
 for(const light of ['noon','overcast','dusk','night']){
  const row=await page.evaluate(`(async()=>{
   const {T,G,H,camera,stage}=scorchReview,actual=await stage.select(${JSON.stringify(light)});
   const p=H.camera.getWorldPosition(new G.Vector3()),d=H.camera.getWorldDirection(new G.Vector3());return {actualLight:actual,light:${JSON.stringify(light)},camera:{x:p.x,y:p.y,z:p.z,tx:p.x+d.x,ty:p.y+d.y,tz:p.z+d.z,fov:H.camera.fov}};
  })()`);
  await new Promise(r=>setTimeout(r,250));const shot=await page.send('Page.captureScreenshot',{format:'png'}),file='dummy-'+light+'.png';await writeFile(new URL(file,dir),Buffer.from(shot.data,'base64'));records.push({file,...row});
 }
 await writeFile(new URL('records.json',dir),JSON.stringify({phase,probe,records,errors:page.errors},null,2));assert.deepEqual(page.errors,[]);console.log('SCORCH '+JSON.stringify({char:probe.char,dummy:probe.dummy,states:probe.states.map(s=>({x:s.x,charred:s.charred,splashed:s.splashed,char:s.charCount}))}));
}finally{await browser.close();await server.close();}

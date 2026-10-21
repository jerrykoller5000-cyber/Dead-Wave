// Actual renderer, original-vs-concept measurements, all recipes, pooling, poses and views.
// --before disables only the new cosmetic hooks in served responses, never edits source.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
import {CONCEPT_TYPES} from '../studio/zombie-concepts.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const before=process.argv.includes('--before'),perfOnly=process.argv.includes('--perf-only');
const out='review/zombie-concepts/'+(before?'original':'final');fs.mkdirSync(out,{recursive:true});
const server=await serve(process.cwd()),errors=[];let browser;
if(process.argv.includes('--contact-only')){
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const p=await b.newPage({viewport:{width:1200,height:1000}});
  for(const view of ['front','back','gameplay']){
   await p.setContent('<style>body{margin:0;padding:18px;background:#111715;color:#e9ebdf;font:18px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:#252d28}img{width:100%;display:block}figcaption{padding:9px;text-transform:capitalize}</style><h2>Grave Shift · GPT concepts · '+view+'</h2><main>'+CONCEPT_TYPES.map(k=>'<figure><img src="'+server.origin+'/review/zombie-concepts/final/'+k+'-'+view+'.png"><figcaption>'+k+'</figcaption></figure>').join('')+'</main>');
   await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await p.screenshot({path:'review/zombie-concepts/'+view+'-contact.png',fullPage:true});
  }
 }finally{await b.close();await server.close();}process.exit(0);
}
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:900,height:900}});p.on('pageerror',e=>errors.push(e.message));
 if(before){await p.route('**/index.html*',async route=>{const r=await route.fetch(),body=(await r.text()).replace('applyZombieConcept({ THREE, g, typeKey, scale: s, rbox });','').replace("zom.typeKey === 'guardian' || zom.typeKey === 'caveguard'","zom.typeKey === 'guardian'");await route.fulfill({response:r,body});});
  await p.route('**/world/cave-guardian.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("applyGuardianConcept({ THREE, g, rbox, kind: d.conceptKind || 'caveguard' });",'')});});}
 const behavior=process.argv.find(a=>/^--behavior=t\d+$/.test(a))?.split('=')[1];
 if(behavior){
  let html=fs.readFileSync('index.html','utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">'+JSON.stringify({imports:{three:'/tools/tests/fakethree.mjs','three/webgpu':'/tools/tests/fakethree.mjs','three/tsl':'/tools/tests/faketsl.mjs','three/addons/':'/tools/tests/addons/'}})+'</script>');
  if(before)html=html.replace('applyZombieConcept({ THREE, g, typeKey, scale: s, rbox });','').replace("zom.typeKey === 'guardian' || zom.typeKey === 'caveguard'","zom.typeKey === 'guardian'");
  await p.route('**/index.html*',route=>route.fulfill({contentType:'text/html',body:html}));
  await p.goto(server.origin+'/index.html?debug=1&raf=timer');await p.waitForFunction(()=>!!window.TT,null,{timeout:120000});
  await p.evaluate(()=>DWOpening.dismissForTesting());await p.waitForFunction(()=>!DWOpening.active);
  await p.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));const result=await p.evaluate(fs.readFileSync('tools/tests/'+behavior+'.js','utf8'));
  fs.writeFileSync(out+'/'+behavior+'.log',result+'\n','utf8');console.log(result);await browser.close();await server.close();process.exit(result.includes('FAIL')?1:0);
 }
 const boot=Date.now();await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});const readyMs=Date.now()-boot;
 await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Concept review';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'),null,{timeout:60000});await p.waitForTimeout(3500);
 await p.evaluate(()=>{
  const D=TT.trainingDbg,tg=D.tg();for(const t of tg.targets)t.pivot.parent.visible=false;
  const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
  for(let e=c;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
  TT.clearZombies();TT.runDevCommand('godmode');window.reviewMeshes=[];
  window.modelMetrics=g=>{let meshes=0,vertices=0,triangles=0,finite=true;g.updateMatrixWorld(true);g.traverse(o=>{if(!o.isMesh)return;for(let a=o;a;a=a.parent)if(!a.visible||a.scale.y<.01)return;meshes++;const pos=o.geometry.getAttribute('position');vertices+=pos.count;triangles+=(o.geometry.index?.count||pos.count)/3;finite&&=[...pos.array,...o.matrixWorld.elements].every(Number.isFinite);});return {meshes,vertices,triangles,finite};};
 });
 const models=[];
 if(!perfOnly)for(const k of CONCEPT_TYPES){
  const r=await p.evaluate(k=>{
   const T=TT,tg=T.trainingDbg.tg(),O=tg.origin;T.clearZombies();T.player.position.set(O.x+4,tg.floorY,O.z+2);
   // Lock per-model variation for paired camera/geometry checks.
   const random=Math.random;let seed=12345;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
   let z;try{z=T.spawnZombie(O.x,tg.origin.z+5,k,true,true);}finally{Math.random=random;}
   z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;window.reviewZombie=z;
   return {k,hp:z.hp,maxHp:z.maxHp,hitH:z.hitH,...modelMetrics(z.mesh),concept:z.mesh.userData.concept||null};
  },k);
  await p.waitForTimeout(150);
  for(const [view,yaw,elev]of [['front',-.40,.25],['back',2.65,.25],['gameplay',-.4,.9]]){
   await p.evaluate(({yaw,elev})=>{
    const T=TT,tg=T.trainingDbg.tg(),z=reviewZombie,m=z.mesh;const i=T.zombies.indexOf(z);if(i>=0)T.zombies.splice(i,1);
    m.position.set(tg.origin.x,tg.floorY,tg.origin.z+4);m.rotation.set(0,yaw,0);m.updateMatrixWorld(true);const b=new T.THREE.Box3().setFromObject(m),c=b.getCenter(new T.THREE.Vector3()),v=b.getSize(new T.THREE.Vector3());
    const dist=Math.max(v.y,Math.hypot(v.x,v.z)*.8)*2.6+1;
    T.setShotView({x:c.x,y:c.y+Math.sin(elev)*dist,z:c.z+Math.cos(elev)*dist,tx:c.x,ty:c.y,tz:c.z,fov:30});T.player.position.set(tg.origin.x+10,tg.floorY,tg.origin.z+28);
   },{yaw,elev});await p.waitForTimeout(150);await p.screenshot({path:`${out}/${k}-${view}.png`});
  }
  const pool=await p.evaluate(k=>{const z=reviewZombie,m=z.mesh,T=TT,tg=T.trainingDbg.tg();T.zombies.push(z);z.mesh.userData.legLG.visible=false;T.clearZombies();const again=T.spawnZombie(tg.origin.x,tg.origin.z+5,k,true,true);again.trainingZ=true;again.riseT=0;const r={sameMesh:again.mesh===m,...modelMetrics(again.mesh),restored:again.mesh.userData.legLG.visible};T.clearZombies();return r;},k);
  assert(r.finite&&pool.finite,k+' finite rendering');if(!before){assert.equal(r.concept?.type,k);assert(pool.restored,k+' restored leg');}
  models.push({...r,pool});console.log('model',k,JSON.stringify(r));
 }
 // The scripted cave rig is measured and posed independently of its training wrapper.
 const guardian=await p.evaluate(async()=>{
  const C=await import('./world/cave-guardian.js'),out=[];
  for(const kind of ['guardian','caveguard']){const g=C.makeCaveGuardianRig({conceptKind:kind}),R=g.userData.rig;let valid=true;
   for(let i=0;i<120;i++){C.guardianGallop(g,R,i*.11,.8,i/60,null);g.updateMatrixWorld(true);g.traverse(o=>{valid&&=o.matrixWorld.elements.every(Number.isFinite);});}
   C.guardianStand(g,R,1,null,{open:.8});out.push({kind,valid,eyes:R.eyes.length,...modelMetrics(g)});
  }return out;
 });
 assert(guardian.every(g=>g.valid&&g.finite));if(!before){assert.deepEqual(guardian.map(g=>g.eyes),[4,2]);assert(guardian.every(g=>g.meshes<65));}
 // Warm the same 48 bodies and view before sampling. Counts are independent of machine speed.
 const horde=await p.evaluate(()=>{
  const T=TT,tg=T.trainingDbg.tg(),O=tg.origin;T.clearZombies();T.player.position.set(O.x,tg.floorY,O.z+26);
  const all=[],t0=performance.now();for(let i=0;i<48;i++){const z=T.spawnZombie(O.x-24+(i%8)*2,O.z-7+Math.floor(i/8)*2.4,['shambler','feral','military','drowned','spitter','bomber'][i%6],true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;all.push(modelMetrics(z.mesh));}
  const ms=performance.now()-t0;T.setShotView({x:O.x-17,y:tg.floorY+23,z:O.z+25,tx:O.x-17,ty:tg.floorY+1,tz:O.z,fov:45});return {spawnMs:ms,meshes:all.reduce((a,b)=>a+b.meshes,0),triangles:all.reduce((a,b)=>a+b.triangles,0)};
 });
 await p.waitForTimeout(4000);await p.evaluate(()=>TT.resetPerf());await p.waitForTimeout(6000);
 const perf=await p.evaluate(()=>TT.perfSnapshot());horde.onScreen=await p.evaluate(()=>TT.zombies.filter(z=>{const v=z.mesh.getWorldPosition(new TT.THREE.Vector3());v.y+=.8;v.project(TT.camera);return z.alive&&z.mesh.visible&&Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1;}).length);await p.screenshot({path:out+'/horde-48.png'});assert.equal(horde.onScreen,48,'all 48 measured zombies are in the rendered view');
 const result={before,readyMs,models,guardian,horde,perf,errors};fs.writeFileSync(out+(perfOnly?'/performance.json':'/checks.json'),JSON.stringify(result,null,2));
 assert.deepEqual(errors,[]);console.log('PASS concept rendering and rig checks',JSON.stringify({readyMs,guardian,horde,perf}));
}finally{await browser?.close();await server.close();}

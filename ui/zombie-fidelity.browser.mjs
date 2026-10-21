// GP-162: actual-renderer comparison against the saved GP-161 concept meshes.
// --before serves baseline-source.js without changing any production files.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {serve} from '../tools/serve.mjs';
import {CONCEPT_TYPES} from '../review/zombie-fidelity/baseline-source.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const before=process.argv.includes('--before'),perfOnly=process.argv.includes('--perf-only');
const selected=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
if(selected)assert(selected.every(k=>CONCEPT_TYPES.includes(k)),'known preview types');
const root='review/zombie-fidelity',out=root+'/'+(selected?'preview-':'')+(before?'before':'after');
const sourcePaths=[before?root+'/baseline-source.js':'studio/zombie-concepts.js','studio/zombie-detail.js','studio/zombie-guardian-detail.js','world/cave-guardian.js'];
const sourceHash=()=>Object.fromEntries(sourcePaths.filter(p=>fs.existsSync(p)).map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const sourceHashes=sourceHash();
fs.mkdirSync(out,{recursive:true});
const server=await serve(process.cwd()),errors=[];let browser;
const views=[['front',-.40,.25],['back',2.65,.25],['gameplay',-.4,.9],['face',-.20,.08]];
const baseline=!before&&fs.existsSync(root+'/before/checks.json')?JSON.parse(fs.readFileSync(root+'/before/checks.json','utf8')):null;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:900,height:900}});p.on('pageerror',e=>errors.push(e.message));
 p.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|zombie-concepts|zombie-detail/.test(m.text()))errors.push(m.text());});
 p.on('requestfailed',r=>{if(/zombie-(?:concepts|detail|guardian-detail)\.js/.test(r.url()))errors.push(r.url()+': '+r.failure()?.errorText);});
 if(process.argv.includes('--contact-only')){
  await p.setViewportSize({width:1440,height:1100});
  const style='<style>body{margin:0;padding:20px;background:#101512;color:#e8eddf;font:19px Arial}h1{font-size:26px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:#202a23}img{width:100%;display:block}figcaption{padding:8px;text-transform:capitalize}.pair{display:grid;grid-template-columns:1fr 1fr}.pair small{display:block;text-align:center;font-size:12px;padding:4px;color:#b3bdb3}</style>';
  for(const [view]of views){
   await p.setContent(style+'<h1>Grave Shift · Fidelity pass · '+view+'</h1><main>'+CONCEPT_TYPES.map(k=>'<figure><img src="'+server.origin+'/'+root+'/after/'+k+'-'+view+'.png"><figcaption>'+k+'</figcaption></figure>').join('')+'</main>');
   await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await p.screenshot({path:root+'/'+view+'-contact.png',fullPage:true});
   await p.setContent(style+'<h1>Grave Shift · First pass / Fidelity pass · '+view+'</h1><main>'+CONCEPT_TYPES.map(k=>'<figure><div class="pair">'+['before','after'].map(pass=>'<div><small>'+pass+'</small><img src="'+server.origin+'/'+root+'/'+pass+'/'+k+'-'+view+'.png"></div>').join('')+'</div><figcaption>'+k+'</figcaption></figure>').join('')+'</main>');
   await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await p.screenshot({path:root+'/'+view+'-comparison.png',fullPage:true});
  }
  console.log('PASS four contact sheets and four paired comparisons');
 }else{
  if(before)await p.route(/\/studio\/zombie-concepts\.js(?:\?.*)?$/,route=>route.fulfill({contentType:'text/javascript; charset=utf-8',body:fs.readFileSync(root+'/baseline-source.js','utf8')}));
  const boot=Date.now();await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});const readyMs=Date.now()-boot;
  await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Fidelity review';document.getElementById('modeTraining').click();});
  await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'),null,{timeout:60000});await p.waitForTimeout(3500);
  await p.evaluate(()=>{
   const tg=TT.trainingDbg.tg();for(const t of tg.targets)t.pivot.parent.visible=false;
   const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
   for(let e=c;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
   TT.clearZombies();TT.runDevCommand('godmode');
   window.modelMetrics=g=>{let meshes=0,vertices=0,triangles=0,finite=true;g.updateMatrixWorld(true);g.traverse(o=>{if(!o.isMesh)return;for(let a=o;a;a=a.parent)if(!a.visible||a.scale.y<.01)return;meshes++;const pos=o.geometry.getAttribute('position');vertices+=pos.count;triangles+=(o.geometry.index?.count||pos.count)/3;finite&&=[...pos.array,...o.matrixWorld.elements].every(Number.isFinite);});return {meshes,vertices,triangles,finite};};
   window.withReviewSeed=fn=>{const random=Math.random;let seed=12345;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{return fn();}finally{Math.random=random;}};
  });
  const models=[];
  if(!perfOnly)for(const k of selected||CONCEPT_TYPES){
   const r=await p.evaluate(async ({k,prior})=>{
    const T=TT,tg=T.trainingDbg.tg(),O=tg.origin;T.clearZombies();T.player.position.set(O.x+4,tg.floorY,O.z+2);
    // Existing startup pools may contain random body variants. Pick the standard
    // legal body size for both passes, then seed the warm spawn independently of UUIDs.
    const warm=withReviewSeed(()=>T.spawnZombie(O.x,O.z+5,k,true,true)),u=warm.mesh.userData;
    u.variant={...u.variant,height:1,width:k==='bomber'?1.15:1,gait:1,phase:1};
    if(prior?.rest)u.rest={...prior.rest};
    T.clearZombies();
    const z=withReviewSeed(()=>T.spawnZombie(O.x,O.z+5,k,true,true));
    const stats={hp:z.hp,maxHp:z.maxHp,speed:z.speed,baseSpeed:z.baseSpeed,radius:z.radius,damage:z.damage,armor:z.armor,reward:z.reward,scale:z.scale,tactics:z.tactics};
    z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;window.reviewZombie=z;
    T.zombies.splice(T.zombies.indexOf(z),1);
    if(z.mesh.userData.bossRig){const C=await import('./world/cave-guardian.js'),B=z.mesh.userData.bossRig;C.guardianStand(B.userData.rigRoot,B.userData.rig,0,null,{open:.35});}
    return {k,stats,hitH:z.hitH,rest:{...z.mesh.userData.rest},...modelMetrics(z.mesh),concept:z.mesh.userData.concept||null,cameras:{}};
   },{k,prior:baseline?.models.find(m=>m.k===k)||null});
   for(const [view,yaw,elev]of views){
    const camera=await p.evaluate(({yaw,elev,view,saved})=>{
     const T=TT,tg=T.trainingDbg.tg(),z=reviewZombie,m=z.mesh;
     m.position.set(tg.origin.x,tg.floorY,tg.origin.z+4);m.rotation.set(0,yaw,0);m.updateMatrixWorld(true);
     let camera=saved;
     if(!camera){
      const target=view==='face'?(m.userData.bossRig?.userData.rig.head||m.userData.head):m;
      const b=new T.THREE.Box3().setFromObject(target),c=b.getCenter(new T.THREE.Vector3()),v=b.getSize(new T.THREE.Vector3());
      const dist=view==='face'?Math.max(v.y,v.x,v.z)*3.1+.2:Math.max(v.y,Math.hypot(v.x,v.z)*.8)*2.6+1;
      camera={x:c.x,y:c.y+Math.sin(elev)*dist,z:c.z+Math.cos(elev)*dist,tx:c.x,ty:c.y,tz:c.z,fov:30};
     }
     T.setShotView(camera);T.player.position.set(tg.origin.x+10,tg.floorY,tg.origin.z+28);return camera;
    },{yaw,elev,view,saved:baseline?.models.find(m=>m.k===k)?.cameras?.[view]||null});
    r.cameras[view]=camera;await p.waitForTimeout(150);await p.screenshot({path:`${out}/${k}-${view}.png`});
   }
   const pool=await p.evaluate(k=>{const z=reviewZombie,m=z.mesh,T=TT,tg=T.trainingDbg.tg();T.zombies.push(z);z.mesh.userData.legLG.visible=false;T.clearZombies();const again=T.spawnZombie(tg.origin.x,tg.origin.z+5,k,true,true);again.trainingZ=true;again.riseT=0;const r={sameMesh:again.mesh===m,...modelMetrics(again.mesh),restored:again.mesh.userData.legLG.visible};T.clearZombies();return r;},k);
   assert(r.finite&&pool.finite,k+' finite rendering');assert.equal(r.concept?.type,k);assert(pool.restored,k+' restored leg');
   if(baseline)assert.deepEqual(r.stats,baseline.models.find(m=>m.k===k).stats,k+' gameplay stats unchanged');
   models.push({...r,pool});console.log('model',k,JSON.stringify(r));
  }
  const guardian=await p.evaluate(async()=>{
   const C=await import('./world/cave-guardian.js'),out=[];
   for(const kind of ['guardian','caveguard']){const g=C.makeCaveGuardianRig({conceptKind:kind}),R=g.userData.rig;let valid=true;
    for(let i=0;i<120;i++){C.guardianGallop(g,R,i*.11,.8,i/60,null);g.updateMatrixWorld(true);g.traverse(o=>{valid&&=o.matrixWorld.elements.every(Number.isFinite);});}
    C.guardianStand(g,R,1,null,{open:.8});out.push({kind,valid,eyes:R.eyes.length,...modelMetrics(g)});
   }return out;
  });
  assert(guardian.every(g=>g.valid&&g.finite));assert.deepEqual(guardian.map(g=>g.eyes),[4,2]);assert(guardian.every(g=>g.meshes<65));
  const horde=await p.evaluate(()=>{
   const T=TT,tg=T.trainingDbg.tg(),O=tg.origin;T.clearZombies();T.player.position.set(O.x,tg.floorY,O.z+26);
   const all=[],t0=performance.now();for(let i=0;i<48;i++){const z=T.spawnZombie(O.x-24+(i%8)*2,O.z-7+Math.floor(i/8)*2.4,['shambler','feral','military','drowned','spitter','bomber'][i%6],true,true);z.trainingZ=true;z.riseT=0;z.speed=z.baseSpeed=0;all.push(modelMetrics(z.mesh));}
   const ms=performance.now()-t0;T.setShotView({x:O.x-17,y:tg.floorY+23,z:O.z+25,tx:O.x-17,ty:tg.floorY+1,tz:O.z,fov:45});return {spawnMs:ms,meshes:all.reduce((a,b)=>a+b.meshes,0),triangles:all.reduce((a,b)=>a+b.triangles,0)};
  });
  await p.waitForTimeout(4000);await p.evaluate(()=>TT.resetPerf());await p.waitForTimeout(6000);
  const perf=await p.evaluate(()=>TT.perfSnapshot());horde.onScreen=await p.evaluate(()=>TT.zombies.filter(z=>{const v=z.mesh.getWorldPosition(new TT.THREE.Vector3());v.y+=.8;v.project(TT.camera);return z.alive&&z.mesh.visible&&Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1;}).length);
  await p.screenshot({path:out+'/horde-48.png'});assert.equal(horde.onScreen,48,'all 48 measured zombies visible');
  const sourceUnchanged=JSON.stringify(sourceHashes)===JSON.stringify(sourceHash());
  const result={before,readyMs,sourceHashes,sourceUnchanged,models,guardian,horde,perf,errors};fs.writeFileSync(out+(perfOnly?'/performance.json':'/checks.json'),JSON.stringify(result,null,2));
  assert(sourceUnchanged,'model sources stayed unchanged throughout rendering');
  assert.deepEqual(errors,[]);console.log('PASS fidelity rendering, pooled restoration, gameplay stats and rig checks',JSON.stringify({readyMs,guardian,horde,perf}));
 }
}finally{await browser?.close();await server.close();}

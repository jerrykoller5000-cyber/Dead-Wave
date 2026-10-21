// GP-122: bounded real-renderer cemetery layout review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const out='review/coldwater/layout',before=process.argv.includes('--before'),prefix=before?'before':'after';
fs.mkdirSync(out,{recursive:true});
const server=await serve(process.cwd(),0);let browser;
const stop=setTimeout(()=>process.exit(2),120000);
try {
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(before){
    const old=JSON.parse(fs.readFileSync(out+'/index-before.json','utf8'));
    await page.route('**/index.html*',route=>{
      let s=fs.readFileSync('index.html','utf8');
      s=s.replace(/    function buildGraveyard\([\s\S]*?(?=    function buildDock\()/,old.graveyard)
        .replace(/      \/\/ Coldwater, by the old cemetery:[\s\S]*?(?=      \/\/ The Cordon)/,old.coldwater)
        .replace(/^.*clearFoliageInSquare.*GP-122:.*\r?\n/gm,'');
      return route.fulfill({contentType:'text/html',body:s});
    });
    await page.route('**/assets/world/landmark-details.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(out+'/landmark-before.js','utf8')}));
  }
  await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
  await page.evaluate(()=>DWOpening.dismissForTesting());
  await page.waitForFunction(()=>document.getElementById('opening').hidden);
  await page.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));
  await page.evaluate(()=>startMatch(TT,'Cemetery review'));
  const state=await page.evaluate(()=>{
    const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
    for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);
    for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
    TT.setWorldTime(.4);
    const grave=TT.POI.graveyard;
    const history=TT.historyProps.group.children.map(o=>{
      o.updateWorldMatrix(true,true);const box=new TT.THREE.Box3().setFromObject(o);
      return {name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray(),min:box.min.toArray(),max:box.max.toArray()};
    });
    return {grave,plots:Array.from({length:6},(_,i)=>TT.plotSpot(i)),history,
      sites:TT.getObjectiveProps().sites,paths:TT.PATHS,trees:TT.trees.map(t=>({x:t.x,z:t.z})),
      nearSolids:TT.worldSolids.filter(s=>Math.hypot(s.x-grave.x,s.z-grave.z)<50).map(s=>({x:s.x,z:s.z,r:s.radius,kind:s.owner?.kind})),
      nearTrees:TT.trees.filter(t=>Math.hypot(t.x-grave.x,t.z-grave.z)<50).map(t=>({x:t.x-grave.x,z:t.z-grave.z,r:t.trunkRadius})),
      stones:TT.landmarks.find(l=>l.kind==='graveyard').colliders.slice(0,9).map(s=>({x:s.x,z:s.z,path:TT.rabbitDbg.distToPath(s.x,s.z)})),
      landmark:TT.landmarks.find(l=>l.kind==='graveyard').mesh.userData};
  });
  if(!before){
    const old=JSON.parse(fs.readFileSync(out+'/before-checks.json','utf8')).state;
    for(const key of ['grave','plots','sites','paths','trees'])assert.deepEqual(state[key],old[key],key+' unchanged');
    const unrelated=a=>a.filter(o=>!/coldwater|grave/.test(o.name));
    assert.deepEqual(unrelated(state.history),unrelated(old.history),'Unrelated history props unchanged');
    assert.equal(state.history.filter(o=>/coldwater|grave/.test(o.name)).length,8,'All eight Coldwater pieces retained');
  }
  fs.writeFileSync(out+'/'+prefix+'-checks.json',JSON.stringify({state,pageErrors:errors},null,2));
  for(const [id,eye,target] of [
    ['overview',[-26,30,31],[0,0,8]],['plots',[0,17,17],[0,0,4.5]],
    ['plan',[0,61,1],[0,0,1]],['approach',[-10,13,-23],[0,0,0]],
    ['church',[16,18,5],[2,1,21]]
  ]) {
    await page.evaluate(({eye,target})=>{const g=TT.POI.graveyard,y=TT.sampleHeight(g.x,g.z);TT.setShotView({x:g.x+eye[0],y:y+eye[1],z:g.z+eye[2],tx:g.x+target[0],ty:y+target[1],tz:g.z+target[2],fov:52});},{eye,target});
    await page.waitForTimeout(280);
    await page.screenshot({path:out+'/'+prefix+'-'+id+'.jpg',type:'jpeg',quality:93});
  }
  const checks=await page.evaluate(()=>{
    TT.scene.updateMatrixWorld(true);
    const T=TT.THREE,blockers=[TT.historyProps.group,...TT.landmarks.map(l=>l.mesh).filter(Boolean),...TT.trees.map(t=>t.group),...TT.rocks.map(r=>r.mesh).filter(Boolean)],rays=[];
    for(let i=0;i<6;i++){
      const p=TT.plotSpot(i);let blocked=0;
      for(const x of[-.5,0,.5])for(const z of[-.95,-.5,0,.5,.95]){
        const ray=new T.Raycaster(new T.Vector3(p.x+x,p.gy+20,p.z+z),new T.Vector3(0,-1,0),0,19.85);
        if(ray.intersectObjects(blockers,true).some(h=>h.object.visible&&h.object.material?.visible!==false))blocked++;
      }
      rays.push({plot:i,blocked});
    }
    const burial=[];
    for(let i=0;i<6;i++){
      TT.startDeathCine();TT.skipDeathCine();const c=TT.getCine();
      burial.push({plot:c.rec.plot,kind:c.rec.kind,position:c.rec.g.position.toArray(),diggers:c.diggers.map(d=>({x:d.x,z:d.z,finite:[d.x,d.z,d.gy,d.aHit].every(Number.isFinite)}))});
      TT.endDeathCine();
    }
    const g=TT.POI.graveyard,y=TT.sampleHeight(g.x,g.z);
    TT.setShotView({x:g.x,y:y+17,z:g.z+17,tx:g.x,ty:y,tz:g.z+4.5,fov:52});
    return{rays,burial};
  });
  await page.waitForTimeout(300);
  await page.screenshot({path:out+'/'+prefix+'-occupied.jpg',type:'jpeg',quality:93});
  fs.writeFileSync(out+'/'+prefix+'-burial.json',JSON.stringify(checks,null,2));
  assert(checks.burial.every((b,i)=>b.kind==='grave'&&b.plot===i&&b.diggers.every(d=>d.finite)),'All six burial setups complete');
  if(!before)assert(checks.rays.every(r=>r.blocked===0),'Every plot clear of scenery on 90 sampled rays');
  assert.deepEqual(errors,[]);
  console.log('PASS '+prefix+': six real-renderer views; six burial setups; no page errors.');
  console.log(JSON.stringify({rays:checks.rays,oldStonePathClearance:Math.min(...state.stones.map(s=>s.path))}));
} finally {clearTimeout(stop);await browser?.close();server.close();}

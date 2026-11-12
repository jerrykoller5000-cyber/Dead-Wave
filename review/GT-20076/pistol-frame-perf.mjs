import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from './save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('../../',import.meta.url);
const pump=process.argv.includes('--pump-port');
const pumpStock=process.argv.includes('--pump-stock');
const pumpGripWeb=process.argv.includes('--pump-grip-web');
const bands=process.argv.includes('--gw-mag-bands');
const rim=process.argv.includes('--drum-ribs');
const saw=process.argv.includes('--saw-boot');
const waspBase=process.argv.includes('--wasp-base');
const krBand=process.argv.includes('--kr-band');
const breacherVents=process.argv.includes('--breacher-vents');
const minigunPanel=process.argv.includes('--minigun-panel');
const waspCatch=process.argv.includes('--wasp-catch');
const gwGrip=process.argv.includes('--gw-grip');
const nose=process.argv.includes('--launcher-nose');
const path=(nose||saw||minigunPanel)?'/studio/weapon-heavy.js':(pump||bands||rim||gwGrip||pumpStock||krBand||breacherVents||pumpGripWeb)?'/studio/weapon-longarms.js':'/studio/weapon-sidearms.js';
const current=await readFile(new URL('../..'+path,import.meta.url),'utf8');
const gripCall='  fitPistolGripSeam(THREE, cover, grip);';
const cases={
  frame:['pistol','  fitPistolFrameSeam(THREE, cover, tang);','clear-tang-cheek-after','catalog-fix-plate-ribs','catalog-fix-tang-cheek-final-caps'],
  grip:['pistol',gripCall,'clear-grip-seam-after','catalog-fix-gw-collar-indicators','catalog-fix-pistol-grip-local'],
  hood:['pistol','  fitPistolTopPanel(THREE, barrelPanel, slide.position.y + .024);','clear-pistol-hood-after','catalog-fix-launcher-nose','catalog-fix-pistol-hood'],
  nose:['launcher','  fitLauncherNose(THREE, barrel, noseBack);','clear-launcher-nose-after','catalog-fix-gw-mag-bands','catalog-fix-launcher-nose'],
  breacherVents:['aa12','      fitBreacherVent(THREE, vent, sx, RW / 2);','clear-breacher-vents-after','catalog-fix-minigun-side-final','catalog-fix-breacher-side-vents'],
  minigunPanel:['minigun','    if (sx === 1) plate.geometry = minigunSidePanelGeometry(THREE);','clear-minigun-panel-after','catalog-fix-kr-front-band','catalog-fix-minigun-side-final'],
  krBand:['ak','    if (z === 0.512) band.geometry = krHandguardBandGeometry(THREE);','clear-kr-band-after','catalog-fix-wasp-catch','catalog-fix-kr-front-band'],
  waspCatch:['uzi','  fitWaspCoverCatch(THREE, coverCatch);','clear-wasp-catch-after','catalog-fix-pump-stock','catalog-fix-wasp-catch'],
  pumpGripWeb:['shotgun','  grip.geometry = pumpGripWebGeometry(THREE, grip.geometry);','clear-pump-grip-web-after','catalog-fix-breacher-side-vents','catalog-fix-pump-grip-web'],
  pumpStock:['shotgun','    fitPumpStockFront(THREE, stockBody);','clear-pump-stock-after','catalog-fix-gw-grip','catalog-fix-pump-stock'],
  gwGrip:['m4','  fitM4GripHousing(THREE, gripBody);','clear-gw-grip-after','catalog-fix-ak-index','catalog-fix-gw-grip'],
  waspBase:['uzi','  gripTrim.geometry = waspGripTrimGeometry(THREE);','clear-wasp-base-after','catalog-fix-saw-boot-edge','catalog-fix-wasp-base-ring'],
  saw:['chainsaw','  fitSawBoot(THREE, boot);','clear-saw-boot-after','catalog-fix-breacher-rim','catalog-fix-saw-boot-edge'],
  rim:['aa12','    fitDrumRib(THREE, rib, i);','clear-drum-ribs-after','catalog-fix-pistol-hood','catalog-fix-breacher-rim'],
  bands:['m4','    fitM4MagazineBand(THREE, band, ribOutlines, magOutline);','clear-gw-mag-bands-after','catalog-fix-wasp-collar-final','catalog-fix-gw-mag-bands'],
  pump:['shotgun',current.match(/  trimPanelBack\(THREE, boltSide, 1, HW - \.009\);[\s\S]*?boltSide\.geometry\.computeBoundingSphere\(\);/)?.[0],'clear-pump-port-after','catalog-fix-revolver-joint-final','catalog-fix-pump-port'],
  collar:['uzi','  fitWaspFrontArt(THREE, foreEnd, collar, barrel);','clear-wasp-collar-after','catalog-fix-wasp-pad','catalog-fix-wasp-collar'],
  pad:['uzi','  fitWaspSidePad(THREE, sidePad, receiverWidth);','clear-wasp-pad-after','catalog-fix-rear-shield','catalog-fix-wasp-pad'],
  shield:['revolver','  fitShieldToRearFrame(THREE, shield);','clear-rear-shield-after','catalog-fix-pump-port-final','catalog-fix-rear-shield'],
  revolver:['revolver','  seatRevolverBridge(THREE, shield, bridge);','clear-rv-bridge-after','catalog-fix-kr-port-flat','catalog-fix-revolver-joint-final']
};
const kind=pumpGripWeb?'pumpGripWeb':breacherVents?'breacherVents':minigunPanel?'minigunPanel':krBand?'krBand':waspCatch?'waspCatch':pumpStock?'pumpStock':gwGrip?'gwGrip':waspBase?'waspBase':saw?'saw':rim?'rim':process.argv.includes('--pistol-hood')?'hood':nose?'nose':bands?'bands':pump?'pump':process.argv.includes('--wasp-collar')?'collar':process.argv.includes('--wasp-pad')?'pad':process.argv.includes('--rear-shield')?'shield':process.argv.includes('--revolver-joint')?'revolver':process.argv.includes('--grip')?'grip':'frame';
const [id,call,folder,...catalogs]=cases[kind];
assert(call,'Missing artwork call');
const source=kind==='frame'?current.replace(gripCall,'').replace(cases.hood[1],''):kind==='grip'?current.replace(cases.hood[1],''):kind==='revolver'?current.replace(cases.shield[1],''):
  kind==='pad'?current.replace(cases.collar[1],''):current;assert.equal(source.split(call).length,2);
const originalIndex=await readFile(new URL('index.html',root));
const light=process.argv.includes('--light');
if(light)assert(process.argv.includes('--hands'));
const index=light?Buffer.from(originalIndex.toString('utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/, 
  '<script type="importmap">'+JSON.stringify({imports:{three:'/tools/tests/fakethree.mjs','three/webgpu':'/tools/tests/fakethree.mjs','three/tsl':'/tools/tests/faketsl.mjs','three/addons/':'/tools/tests/addons/'}})+'</script>')):originalIndex;
if(light)assert(!index.equals(originalIndex));
const server=await serve(fileURLToPath(root),0),reverse=process.argv.includes('--reverse');
let browser=await launch({headless:false});
const stow=process.argv.includes('--stow');
const hands=process.argv.includes('--hands');
if(hands)assert(waspBase||waspCatch||gwGrip||pumpStock||krBand||minigunPanel||breacherVents||pumpGripWeb);
if(stow)assert.equal(kind,'pad');
const webgl=process.argv.includes('--gl');
if(webgl)assert(stow);
const records={renderer:webgl?'WebGL':'WebGPU',indexSha:createHash('sha256').update(originalIndex).digest('hex'),reverse};
try{
  const order=reverse?['after','before']:['before','after'];
  for(const phase of order){
    if((stow||hands)&&phase!==order[0]){
      await browser.close();
      browser=await launch({headless:false});
    }
    const page=await browser.newPage({width:1280,height:720});
    if(stow)await page.send('Page.addScriptToEvaluateOnNewDocument',{source:'('+traceCanvasFailure.toString()+')()'});
    const oldKeep='gun.userData.shotgunBoltParts = [boltSide, boltFace, boltClaw];';
    const phaseSource=pump&&phase==='before'?source.replace(oldKeep,''):source;
    const calls=[call];
    if(minigunPanel)calls.push("      if (sx === 1 && i >= 2) rib.geometry = minigunSidePanelGeometry(THREE, i === 2 ? 'upperStrip' : 'lowerStrip');");
    let art=phaseSource;
    for(const line of calls){
      assert.equal(art.split(line).length,2);
      const conditional=krBand||minigunPanel;
      const end=conditional?line.indexOf(') ')+2:0;
      const measured="const t0=performance.now();"+line.slice(end)+"(window.frameSeamBuilds||(window.frameSeamBuilds=[])).push(performance.now()-t0);";
      art=art.replace(line,phase==='before'?'':conditional?line.slice(0,end)+'{'+measured+'}':measured);
    }
    const seen=new Set();
    page.conn.onEvent(msg=>{
      if(msg.sessionId!==page.sessionId||msg.method!=='Fetch.requestPaused')return;
      const u=new URL(msg.params.request.url);assert.equal(u.origin,server.origin);
      const html=u.pathname==='/index.html';assert(html||u.pathname===path);
      if(msg.params.responseStatusCode!==200){
        page.send('Fetch.continueRequest',{requestId:msg.params.requestId}).catch(e=>page.errors.push(e.message));
        return;
      }
      seen.add(u.pathname);
      page.send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:html?'text/html; charset=utf-8':'text/javascript; charset=utf-8'}],body:(html?index:Buffer.from(art)).toString('base64')}).catch(e=>page.errors.push(e.message));
    });
    await page.send('Fetch.enable',{patterns:[path,'/index.html'].map(p=>({urlPattern:server.origin+p+'*',requestStage:'Response'}))});
    await page.goto(server.origin+'/index.html?debug=1'+(stow?'&raf=timer':'')+(webgl?'&renderer=webgl':''));
    let ready=false;
    for(let i=0;i<24&&!ready&&!page.errors.length;i++){
      ready=await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:10000});
    }
    if(!ready)assert.fail('Boot failed '+JSON.stringify({errors:page.errors,loaded:await page.evaluate('window.DWLoad?.snapshot().state'),canvas:await page.evaluate('window.__fitCanvasFailure??null')}));
    await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
    if(hands){
      await page.evaluate(await readFile(new URL('tools/tests/lib.js',root),'utf8'));
      const diagnostic=light?await page.evaluate("import('/review/GT-20076/locate-wasp-glove.mjs').then(m=>m.locateWaspGlove(TT))",180000):null;
      const lines=diagnostic?.out||await page.evaluate(`(async()=>{
        const {clipCheck}=await import('/tools/tests/clip-check.js'),out=[];
        await clipCheck(TT,[${JSON.stringify(id)}],(pass,s)=>out.push((pass?'PASS ':'FAIL ')+s),out);
        return out;
      })()`,180000);
      await save(new URL('./visible-repairs/'+id+'/'+folder+'/hands-'+phase+(light?'-light':'')+'.json',import.meta.url),JSON.stringify({indexSha:records.indexSha,lines,...(diagnostic?{diagnostic}:null)},null,2)+'\n');
      console.log(light?'lightweight':'real',phase,lines);
      assert(lines.some(s=>s.includes('1 of 1'))&&lines.some(s=>s.includes('deepest per gun')));
      assert.equal(seen.size,2);assert.deepEqual(page.errors,[]);
      await page.send('Page.close',{});continue;
    }
    if(stow){
      await page.evaluate(await readFile(new URL('tools/tests/lib.js',root),'utf8'));
      const lines=await page.evaluate(await readFile(new URL('tools/tests/t189.js',root),'utf8'),300000);
      records[phase]=lines.split('\n').filter(Boolean);
      await save(new URL('./visible-repairs/'+id+'/'+folder+'/stowed-'+phase+(webgl?'-gl':'')+'.json',import.meta.url),JSON.stringify({indexSha:records.indexSha,lines:records[phase]},null,2)+'\n');
      assert(records[phase].some(l=>l.includes('23 gun/spot pairs')));
      assert.equal(seen.size,2);assert.deepEqual(page.errors,[]);
      await page.send('Page.close',{});
      console.log(phase,records[phase].filter(l=>/^FAIL|uzi@/.test(l)));
      continue;
    }
    await page.evaluate("document.getElementById('playerName').value='Frame timing';document.getElementById('modeTraining').click()");
    assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')"));
    records[phase]=await page.evaluate('('+measure.toString()+')('+JSON.stringify(id)+')',120000);
    if(pumpStock||pumpGripWeb)records[phase].pump=await page.evaluate("import('/review/GT-20076/pump-port-proof.mjs').then(m=>m.pumpCycle(TT))");
    if(saw)records[phase].chain=await page.evaluate("(()=>{const u=TT.weaponMeshes.chainsaw.userData;return {count:u.chainTeeth.length,cap:u.fuelCap.position.toArray(),starter:u.starterHome.toArray(),exit:u.starterExit.toArray(),chainCount:u.chainInst.count,links:u.chainGroup.position.toArray()}})()");
    if(nose)records[phase].anchors=await page.evaluate("(()=>{const g=TT.weaponMeshes.launcher;return {heat:g.getObjectByName('heatParts-barrel').position.toArray(),muzzle:g.userData.muzzleLocal.toArray(),flash:g.userData.flash.position.toArray()}})()");
    if(bands||rim||waspBase||gwGrip||waspCatch||krBand||minigunPanel||breacherVents)records[phase].reload=await page.evaluate('('+magazineReload.toString()+')('+JSON.stringify(id)+','+waspCatch+')');
    const expected=JSON.parse(await readFile(new URL('./'+catalogs[phase==='before'?0:1]+'/audit.json',import.meta.url),'utf8'))[id].artworkFingerprint;
    assert.equal(records[phase].hash,expected);assert.equal(seen.size,2);assert.deepEqual(page.errors,[]);
    await page.send('Page.close',{});
    const {reload,pump:cycle,...brief}=records[phase];
    if(cycle)console.log('pump cycle',phase,cycle.shot,cycle.travel,cycle.frames.length);
    console.log(phase,brief,reload?'reload '+reload.samples.length+' phases':'');
  }
  const filename=stow?(webgl?'stowed-fits-gl':'stowed-fits'):'frame-timing'+(reverse?'-reverse':'');
  if(!hands)await save(new URL('./visible-repairs/'+id+'/'+folder+'/'+filename+'.json',import.meta.url),JSON.stringify(records,null,2)+'\n');
  if((pumpStock||pumpGripWeb)&&!hands){const a=records.before.pump,b=records.after.pump;assert.deepEqual(b.frames,a.frames);assert.equal(b.travel,a.travel);}
  if(saw)assert.deepEqual(records.after.chain,records.before.chain);
  if(nose)assert.deepEqual(records.after.anchors,records.before.anchors);
  if(!hands&&(bands||rim||waspBase||gwGrip||waspCatch||krBand||minigunPanel||breacherVents)){
    const a=records.before.reload,b=records.after.reload;
    assert(Math.abs(a.travel-b.travel)<1e-6&&b.travel>.05);
    assert(a.foot.every((v,i)=>Math.abs(v-b.foot[i])<1e-7)&&a.base.every((v,i)=>v===b.base[i]));
    for(let i=0;i<a.samples.length;i++){
      assert(a.samples[i].every((v,j)=>Math.abs(v-b.samples[i][j])<1e-5),'Magazine motion changed at '+i);
    }
    console.log('PASS original and revised world/eye magazine transforms through '+b.samples.length+' reload phases',b.travel);
  }
  if(stow){
    const failures=rows=>rows.filter(l=>l.startsWith('FAIL')).map(l=>l.split(':')[0]);
    assert.deepEqual(failures(records.after),failures(records.before));
    const wasp=rows=>rows.filter(l=>l.includes('uzi@'));
    assert(wasp(records.after).length>0);
    assert.deepEqual(wasp(records.after),wasp(records.before));
  }
}finally{await browser.close();await server.close();}

function traceCanvasFailure(){
  if(!window.GPUQueue)return;
  const made=new WeakMap(),contexts=new WeakMap(),create=document.createElement;
  document.createElement=function(name,...rest){
    const el=create.call(this,name,...rest);
    if(el instanceof HTMLCanvasElement)made.set(el,new Error().stack.split('\n').slice(2,8));
    return el;
  };
  const context=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){
    const c=context.call(this,type,...args);contexts.set(this,{type,valid:!!c});return c;
  };
  const copy=GPUQueue.prototype.copyExternalImageToTexture;
  GPUQueue.prototype.copyExternalImageToTexture=function(input,...args){
    try{return copy.call(this,input,...args);}
    catch(e){
      const src=input.source;
      window.__fitCanvasFailure={type:src?.constructor?.name,width:src?.width,height:src?.height,
        created:made.get(src),context:contexts.get(src)};
      throw e;
    }
  };
}

function magazineReload(id,observeHandle=false){
  const T=TT,g=T.weaponMeshes[id],w=g.userData.mag,v=T.viewmodelDbg().gun.mag||new Map(T.viewmodelDbg().gun.pairs).get(w);
  if(!v)throw Error('Missing eye magazine');
  const H=T.inspectHost(),pose=T.gaitDbg.pose();
  H.loop(false);
  // Match the real idle inputs to the hand solver before sampling either revision.
  pose.idleT=0;pose.breathP=0;T.gaitDbg.setWinded(0);
  for(let j=0;j<180;j++)T.stepFrame(1/60);
  const base=w.position.clone(),samples=[];
  const handle=observeHandle?g.userData.work:null,eyeHandle=handle?new Map(T.viewmodelDbg().gun.pairs).get(handle):null;
  if(observeHandle&&!eyeHandle)throw Error('No eye charging knob');
  const handleRest=handle?.position.clone(),eyeHandleRest=eyeHandle?.position.clone();let handleTravel=0,eyeHandleTravel=0;
  w.updateWorldMatrix(true,true);
  const G=T.THREE,inv=w.matrixWorld.clone().invert(),bounds=new G.Box3(),point=new G.Vector3();
  w.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const matrix=inv.clone().multiply(mesh.matrixWorld),p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++)bounds.expandByPoint(point.fromBufferAttribute(p,i).applyMatrix4(matrix));
  });
  const foot=bounds.getCenter(new G.Vector3());foot.y=bounds.min.y;
  T.setAmmoDbg(id,0);T.startReload();
  let travel=0;
  try{
    for(let i=0;i<48;i++){
      const phase=i/48;T.reloadClipDbg.hold(phase);for(let j=0;j<3;j++)T.stepFrame(1/60);
      const state=T.getReloadDbg();
      if(state.weapon!==id||Math.abs(1-state.timer/state.anim-phase)>.002)throw Error('Wrong reload phase '+phase);
      samples.push([phase,...w.position.toArray(),...w.quaternion.toArray(),...v.position.toArray(),...v.quaternion.toArray(),+w.visible,+v.visible]);
      if(handle){samples.at(-1).push(...handle.position.toArray(),...eyeHandle.position.toArray());handleTravel=Math.max(handleTravel,handle.position.distanceTo(handleRest));eyeHandleTravel=Math.max(eyeHandleTravel,eyeHandle.position.distanceTo(eyeHandleRest));}
      travel=Math.max(travel,w.position.distanceTo(base));
    }
  }finally{T.reloadClipDbg.hold(null);H.loop(true);}
  return {travel,samples,base:base.toArray(),foot:foot.toArray(),...(handle?{handleTravel,eyeHandleTravel,handleRest:handleRest.toArray(),eyeHandleRest:eyeHandleRest.toArray()}:null)};
}

async function measure(id){
  const T=TT;
  T.flightHold(true);T.grantAllWeapons();T.setViewFirstDbg(true);if(T.isUnarmed())T.toggleHolster();
  for(let i=0;i<18&&T.getCurrentWeapon()!==id;i++){T.setWeapon(T.WEAPON_ORDER.indexOf(id));for(let j=0;j<15;j++)T.stepFrame(1/30);}
  if(T.getCurrentWeapon()!==id)throw Error(id+' did not equip');
  const range=T.trainingDbg.tg();T.player.position.set(range.origin.x,range.floorY,range.origin.z-5);
  T.setZoomHeldDbg(false);T.setOtsAimDbg(0,-.08);for(let j=0;j<75;j++)T.stepFrame(1/30);
  const {currentModel}=await import('/review/GT-20076/rank-visibility.mjs');
  const {artworkFingerprint}=await import('/tools/tests/weapon-seating.js');
  const hash=artworkFingerprint(currentModel(T,id));
  const renderer=T.renderer,backend=renderer.backend;
  const gpuAvailable=!!(backend?.isWebGPUBackend&&backend.device.features.has('timestamp-query'));
  if(gpuAvailable)backend.trackTimestamp=true;
  const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  for(let i=0;i<60;i++)await raf();
  const frames=[],gpuSamples=[];let last=await raf(),busy=false;
  for(let i=0;i<150;i++){
    const t=await raf();frames.push(t-last);last=t;
    if(gpuAvailable&&!busy){
      busy=true;renderer.resolveTimestampsAsync('render').then(ms=>{if(ms>0&&ms<1000)gpuSamples.push(ms);}).finally(()=>{busy=false;});
    }
  }
  const quantiles=vals=>{
    const s=vals.slice().sort((a,b)=>a-b),at=p=>s.length?s[Math.floor((s.length-1)*p)]:null;
    return {count:s.length,p50:at(.5),p95:at(.95)};
  };
  return {hash,gun:T.getCurrentWeapon(),eye:T.viewmodelDbg().info.active,backend:backend?.constructor?.name,frames:quantiles(frames),gpu:quantiles(gpuSamples),seamBuildMs:window.frameSeamBuilds||[]};
}

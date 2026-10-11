// GP-163. Actual-renderer player-model reference, wardrobe, carry and grip checks.
// --before serves only the saved cosmetic modules and makeMarine block.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const diagnose=process.argv.includes('--diagnose-fit');
const before=process.argv.includes('--before'),only=process.argv.find(x=>x.startsWith('--only='))?.slice(7).split(','),testNames=process.argv.find(x=>x.startsWith('--tests='))?.slice(8).split(',')||(diagnose?['fit']:null);
const tag=process.argv.find(x=>x.startsWith('--tag='))?.slice(6);if(tag)assert(/^[a-z0-9-]+$/.test(tag),'safe artifact tag');
const root='review/player-fidelity',out=root+'/'+(testNames?'real-':only?'preview-':'')+(before?'before':'after')+(tag?'-'+tag:'');
fs.mkdirSync(out,{recursive:true});
const extract=s=>{const a=s.indexOf('function makeMarine('),b=s.indexOf("    await loadMark('trees');",a);assert(a>=0&&b>a,'makeMarine boundaries');return {a,b,text:s.slice(a,b).trimEnd()};};
const hashes=()=>{
 const files=before?[root+'/baseline-marine-body.js',root+'/baseline-marine-face.js',root+'/baseline-makeMarine.js']:['studio/marine-body.js','ui/marine-face.js','studio/marine-detail.js','studio/marine-headgear.js'];
 const data=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
 if(!before)data['index.html (makeMarine)']=createHash('sha256').update(extract(fs.readFileSync('index.html','utf8')).text).digest('hex');
 return data;
};
const externalHashes=()=>Object.fromEntries(['index.html','studio/marine-turn.js','studio/marine-draw.js','studio/clips/marine/walk.json','studio/clips/marine/run.json'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const externalSourcesAtStart=externalHashes();
const externalEvidence=()=>{const end=externalHashes();return {externalSourcesAtStart,externalSourcesAtEnd:end,externalSourcesUnchanged:JSON.stringify(externalSourcesAtStart)===JSON.stringify(end)};};
const sourceHashes=hashes(),baseline=!before&&fs.existsSync(root+'/before/checks.json')?JSON.parse(fs.readFileSync(root+'/before/checks.json','utf8')):null;
const shots=[
 ['front',0,{}],['back',Math.PI,{}],['quarter',.62,{}],['left',Math.PI/2,{}],['right',-Math.PI/2,{}],['top',.35,{top:true}],
 ['face',.35,{frame:'face'}],['face-side',Math.PI/2,{frame:'face'}],['nvg',.35,{frame:'face',nvg:true}],
 ['boots',.48,{frame:'boots'}],['pack',2.75,{frame:'pack'}],['vest',.4,{frame:'vest'}],['belt',.4,{frame:'belt'}],
 ['pistol-aim',.6,{weapon:'pistol'}],['pistol-crouch',.6,{weapon:'pistol',crouch:true}],['pistol-run',.6,{weapon:'pistol',run:true}],
 ['rifle-aim',.6,{weapon:'m4'}],['rifle-crouch',.6,{weapon:'m4',crouch:true}],['rifle-run',.6,{weapon:'m4',run:true}],
 ['shirt',.4,{kit:false}],['rolled-shorts',.4,{kit:false,rolled:true,shorts:true,gloves:false}],
 ['cover',.4,{hat:'cover',frame:'face'}],['boonie',.4,{hat:'boonie',frame:'face'}],['ballcap',.4,{hat:'ballcap',frame:'face'}],['ballcap-back',2.4,{hat:'ballcapBack',frame:'face'}],
 ['bare-face',.4,{hat:'cover',frame:'face',mask:false,eyewear:'none'}],['goggles',.4,{hat:'cover',frame:'face',eyewear:'goggles'}],
 ['slung-loadout',2.7,{carried:true,weapon:'pistol'}],['rifle-drawn',2.7,{carried:true,weapon:'m4'}]
];
const jointKeys=['lowerBody','hip','torsoG','headG','legLG','legRG','kneeLG','kneeRG','ankleLG','ankleRG','armLG','armRG','elbowLG','elbowRG','gripL','gripR','weaponMount','hipGrip'];
const server=await serve(process.cwd()),errors=[],pageErrorDetails=[];let browser,activeTest=null;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:1000,height:1000}});
 p.on('pageerror',e=>{errors.push(e.message);pageErrorDetails.push({test:activeTest,message:e.message,stack:e.stack});});p.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|marine-(?:body|face|detail|headgear)/.test(m.text()))errors.push(m.text());});
 if(process.argv.includes('--contact-only')){
  await p.setViewportSize({width:1400,height:1000});
  for(const [category,names]of [
   ['reference',['front','left','back','right','top','quarter']],
   ['details',['face','face-side','nvg','vest','pack','belt','boots']],
   ['poses',['pistol-aim','pistol-crouch','pistol-run','rifle-aim','rifle-crouch','rifle-run']],
   ['wardrobe',['shirt','rolled-shorts','cover','boonie','ballcap','ballcap-back','bare-face','goggles','slung-loadout','rifle-drawn']]
  ])for(const pair of [false,true]){
   const html='<style>body{margin:0;padding:18px;background:#111713;color:#e7e8dc;font:18px Arial}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0;background:#233027}img{width:100%;display:block}figcaption{padding:8px;text-transform:capitalize}.pair{display:grid;grid-template-columns:1fr 1fr}small{display:block;text-align:center;padding:4px;color:#b8c2b9}</style><h2>Grave Shift · Player fidelity · '+category+(pair?' · Before / After':'')+'</h2><main>'+names.map(k=>'<figure>'+(pair?'<div class="pair">'+['before','after'].map(pass=>'<div><small>'+pass+'</small><img src="'+server.origin+'/'+root+'/'+pass+'/'+k+'.png"></div>').join('')+'</div>':'<img src="'+server.origin+'/'+root+'/after/'+k+'.png">')+'<figcaption>'+k.replaceAll('-',' ')+'</figcaption></figure>').join('')+'</main>';
   await p.setContent(html);await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await p.screenshot({path:root+'/'+category+(pair?'-comparison':'-contact')+'.png',fullPage:true});
  }
  console.log('PASS four player contact sheets and four paired comparisons');
 }else{
  await p.route('**/index.html*',route=>{
   let s=fs.readFileSync('index.html','utf8');
   if(before){const b=extract(s);s=s.slice(0,b.a)+fs.readFileSync(root+'/baseline-makeMarine.js','utf8')+'\n\n'+s.slice(b.b);const faceImport=/import\s*\{[^}]*\}\s*from '\.\/ui\/marine-face\.js';/;s=s.replace(faceImport,fs.readFileSync(root+'/baseline-index.html','utf8').match(faceImport)[0]);}
   const hook=`window.playerFidelityPose=(o)=>{crouching=!!o.crouch;aimYaw=0;aimTarget.set(player.position.x,player.position.y+1.2,player.position.z+20);swapT=0;weaponMount.visible=true;GAIT.holdU=o.run?.18:null;GAIT.holdRun=!!o.run;POSE.idleT=0;POSE.winded=0;for(let i=0;i<60;i++){updateMarinePose(.04,!!o.run,!!o.run,false);holdWeapon(.04);}return {dip:marine.position.y+ROLL_PIVOT_Y,grounded,bodyDip:POSE.bodyDip,feetLift:POSE.feetLift,handR:_HAND_R.toArray(),handL:_HAND_L.toArray(),hold:WEAPON_HOLD[currentWeapon]};}; `;
   assert(s.includes('window.TT = stampDebugHooks({'),'debug insertion point');s=s.replace('window.TT = stampDebugHooks({',hook+'window.TT = stampDebugHooks({');
   return route.fulfill({contentType:'text/html; charset=utf-8',body:s});
  });
  if(before)for(const [file,snapshot]of [['studio/marine-body.js','baseline-marine-body.js'],['ui/marine-face.js','baseline-marine-face.js']])await p.route('**/'+file+'*',route=>route.fulfill({contentType:'text/javascript; charset=utf-8',body:fs.readFileSync(root+'/'+snapshot,'utf8')}));
  if(testNames){
   const results={};
   for(const name of testNames){
    activeTest=name;
    assert(diagnose||/^t\d+$/.test(name),'existing behavior test name');
    await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
    if(!diagnose){await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Player rig validation';document.getElementById('modeHunt').click();});
    await p.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:180000});}
    // The actual match is already running; these tests' shared start helper has finished its work.
    await p.evaluate(()=>{window.startMatch=async()=>{};});
    const result=await p.evaluate(fs.readFileSync(diagnose?root+'/fit-diagnostic.js':'tools/tests/'+name+'.js','utf8'));
    fs.writeFileSync(out+'/'+name+'.txt',result);console.log(name+'\n'+result);
    results[name]={pass:(result.match(/^PASS /gm)||[]).length,fail:(result.match(/^FAIL /gm)||[]).length,skip:(result.match(/^SKIP /gm)||[]).length};
   }
   const sourceUnchanged=JSON.stringify(sourceHashes)===JSON.stringify(hashes());
   fs.writeFileSync(out+'/checks.json',JSON.stringify({before,sourceHashes,sourceUnchanged,...externalEvidence(),results,errors,pageErrorDetails},null,2));
   assert(sourceUnchanged,'cosmetic sources unchanged through real-renderer tests');assert.deepEqual(errors,[]);
   assert(Object.values(results).every(r=>r.fail===0),'real-renderer checks: '+JSON.stringify(results));console.log(diagnose?'PASS static fit diagnostic with unchanged sources':'PASS real-renderer existing behavior checks',JSON.stringify(results));
  }else{
  const boot=Date.now();await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});const readyMs=Date.now()-boot;
  await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Player fidelity review';document.getElementById('modeTraining').click();});
  await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'),null,{timeout:60000});
  const initial=await p.evaluate(async keys=>{
   TT.clearZombies();TT.runDevCommand('godmode');TT.grantAllWeapons();TT.getMarine().visible=false;
   const tg=TT.trainingDbg.tg();TT.player.position.set(tg.origin.x+20,tg.floorY,tg.origin.z+20);
   const m=TT.makeMarine();m.position.set(tg.origin.x,tg.floorY,tg.origin.z-7);TT.scene.add(m);window.PF={m,home:m.position.clone(),keys};
   const fill=new TT.THREE.HemisphereLight(0xcad8df,0x7a8272,.45);TT.scene.add(fill);
   const {rigs}=await import('./studio/rigs.js'),{loadClip,sampleClip,applyPose}=await import('./studio/clip.js');
   PF.inst=rigs.get('marine').create({group:m});PF.sampleClip=sampleClip;PF.applyPose=applyPose;PF.clips={};
   for(const k of ['stand','walk','run'])PF.clips[k]=loadClip(await(await fetch('./studio/clips/marine/'+k+'.json')).json());
   const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
   for(let e=canvas;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
   PF.metrics=()=>{let meshes=0,triangles=0,vertices=0,finite=true;m.updateMatrixWorld(true);m.traverse(o=>{if(!o.isMesh)return;for(let a=o;a;a=a.parent)if(!a.visible)return;const p=o.geometry.getAttribute('position');meshes++;vertices+=p.count;triangles+=(o.geometry.index?.count||p.count)/3;finite&&=[...p.array,...o.matrixWorld.elements].every(Number.isFinite);});return {meshes,triangles,vertices,finite};};
   return {joints:Object.fromEntries(keys.map(k=>[k,{position:m.userData[k].position.toArray(),quaternion:m.userData[k].quaternion.toArray(),scale:m.userData[k].scale.toArray(),parent:m.userData[k].parent?.name||null}])),wardrobe:Object.keys(m.userData.wardrobe).sort(),gear:Object.keys(m.userData.gearParts).sort(),...PF.metrics()};
  },jointKeys);
  if(baseline){assert.deepEqual(initial.joints,baseline.initial.joints,'all animated joints and grip mounts unchanged');assert.deepEqual(initial.wardrobe,baseline.initial.wardrobe,'all wardrobe items retained');assert.deepEqual(initial.gear,baseline.initial.gear,'gear categories retained');}
  const states={};
  for(const [id,angle,o]of shots.filter(([id])=>!only||only.includes(id))){
   states[id]=await p.evaluate(({id,angle,o,saved})=>{
    const {m,home}=PF,T=TT.THREE,u=m.userData;m.position.copy(home);m.rotation.set(0,angle,0);
    const state=structuredClone(TT.getWardrobe());state.items.shirt.sleeves=o.rolled?'rolled':'down';state.items.trousers.cut=o.shorts?'shorts':'trousers';state.items.gloves.worn=o.gloves!==false;state.items.boots.colour='black';state.items.cap.style=o.hat||'cover';state.items.eyewear.style=o.eyewear||'none';
    for(const k of ['shirt','trousers','helmet','cap'])state.items[k].camo='m81';state.items.mask.camo='coyoteBrown';
    TT.dressMarine(m,state);
    const show=o.hat?['bareHead','vest','pads']:o.kit===false?['bareHead','bareTorso']:['helmet','vest','pads','nvg'];
    for(const[k,list]of Object.entries(u.gearParts))for(const a of list)a.visible=show.includes(k);
    for(const a of u.wardrobe.mask.meshes)a.visible=o.mask!==false;
    PF.applyPose(PF.inst,PF.sampleClip(PF.clips.stand,0));
    const weapon=o.weapon||'pistol';TT.setWeapon(TT.WEAPON_ORDER.indexOf(weapon));
    const hold=playerFidelityPose(o),live=TT.getMarine().userData;
    for(const k of PF.keys){u[k].position.copy(live[k].position);u[k].quaternion.copy(live[k].quaternion);u[k].scale.copy(live[k].scale);}
    m.position.y=home.y+hold.dip;
    if(u.nvgPivot)u.nvgPivot.rotation.x=o.nvg?0:-1.35;if(u.eyewearG)u.eyewearG.visible=!o.nvg;
    if(PF.gun)PF.gun.removeFromParent();PF.gun=TT.weaponMeshes[weapon].clone();PF.gun.visible=true;u.weaponMount.add(PF.gun);
    const loadout=o.carried?{primary:['m4','shotgun'],secondary:['uzi','revolver']}:{primary:[],secondary:[]};
    const carry=TT.carryPreview(m,{loadout,inHand:weapon,akimbo:false,dualOwned:{},vest:o.kit!==false,grenades:3});
    m.updateMatrixWorld(true);
    const grip=u.elbowRG.localToWorld(new T.Vector3(...hold.handR)).distanceTo(PF.gun.localToWorld(new T.Vector3(...hold.hold.grip)));
    const support=u.elbowLG.localToWorld(new T.Vector3(...hold.handL)).distanceTo(PF.gun.localToWorld(new T.Vector3(...hold.hold.fore)));
    const d=u.dress,wardrobe={sleevesDown:d.sleeveDown.every(x=>x.visible===!o.rolled),sleevesRolled:d.sleeveRolled.every(x=>x.visible===!!o.rolled),longLegs:d.legLong.every(x=>x.visible===!o.shorts),shortLegs:d.legShort.every(x=>x.visible===!!o.shorts),gloves:d.gloveOn.every(x=>x.visible===(o.gloves!==false)),bareHands:d.handBare.every(x=>x.visible===(o.gloves===false)),mask:u.wardrobe.mask.meshes.every(x=>x.visible===(o.mask!==false)),hat:d.hats[o.hat||'cover'].visible,boots:u.wardrobe.boots.mats.filter(x=>x.userData.dress==='colour').every(x=>x.color.getHex()===TT.BOOT_HEX.black),nvgPose:Math.abs(u.nvgPivot.rotation.x-(o.nvg?0:-1.35))<1e-9};
    let cy=.9,dist=4.0,elev=.16,fov=32;
    if(o.frame==='face'){cy=1.46;dist=1.1;elev=.03;fov=35;}else if(o.frame==='boots'){cy=.15;dist=1.05;elev=.08;}else if(o.frame==='pack'){cy=1.03;dist=1.7;elev=.12;}else if(o.frame==='vest'){cy=1.04;dist=1.45;elev=.05;}else if(o.frame==='belt'){cy=.78;dist=1.4;elev=.04;}else if(o.crouch){cy=.68;dist=3.5;}
    if(o.top){cy=.93;dist=3.8;elev=2.9;}
    const camera=saved||{x:home.x,y:home.y+cy+elev,z:home.z+dist,tx:home.x,ty:home.y+cy,tz:home.z,fov};TT.setShotView(camera);
    const footY=['ankleLG','ankleRG'].map(k=>{let min=Infinity;u[k].traverse(n=>{if(!n.isMesh||!n.visible)return;const pos=n.geometry.getAttribute('position'),v=new T.Vector3();for(let i=0;i<pos.count;i++)min=Math.min(min,n.localToWorld(v.fromBufferAttribute(pos,i)).y-home.y);});return min;});
    return {camera,weapon,grip,support,wardrobe,pose:{grounded:hold.grounded,bodyDip:hold.bodyDip,rootOffset:hold.dip,feetLift:hold.feetLift,footY},carry:{slings:carry.slings.map(s=>s.kind),holsters:carry.holsters.map(s=>s.kind),hip:carry.hip.kind},...PF.metrics()};
   },{id,angle,o,saved:baseline?.states[id]?.camera||null});
   assert(states[id].finite,id+' finite geometry');assert(Object.values(states[id].wardrobe).every(Boolean),id+' wardrobe variants agree with selections');
   assert(states[id].grip<.035,id+' firing hand retains grip: '+states[id].grip);assert(states[id].support<.045,id+' support hand retains grip: '+states[id].support);
   assert(states[id].pose.footY.every(Number.isFinite),id+' boot bounds remain finite');
   if(!o.run){const sole=Math.min(...states[id].pose.footY);assert(sole>-.025&&sole<.03,id+' grounded pose retains floor contact: '+sole);}
   assert.equal(states[id].carry.hip,(o.weapon||'pistol')==='pistol'?null:'pistol',id+' held pistol never duplicates in holster');
   if(id==='slung-loadout')assert.deepEqual(states[id].carry.slings,['m4','shotgun']);
   if(id==='rifle-drawn')assert.deepEqual(states[id].carry.slings,[null,'shotgun']);
   await p.waitForTimeout(160);
   states[id].renderInfo=await p.evaluate(()=>({...TT.renderer.info.render}));
   if(id==='front'){
    await p.waitForTimeout(1000);await p.evaluate(()=>TT.resetPerf());const samples=[];
    for(let i=0;i<4;i++){await p.waitForTimeout(1250);samples.push(await p.evaluate(()=>TT.perfSnapshot()));}
    states[id].perf={meanFps:samples.reduce((n,s)=>n+s.fps,0)/samples.length,minFps:Math.min(...samples.map(s=>s.fps)),worstMs:Math.max(...samples.map(s=>s.worst)),samples};
   }
   await p.screenshot({path:out+'/'+id+'.png'});console.log('view',id,JSON.stringify(states[id]));
  }
  // Evaluate every joint through the existing clips without creating new animations.
  const motion=await p.evaluate(()=>{
   const r=[];for(const name of ['stand','walk','run']){let finite=true;for(let i=0;i<120;i++){PF.applyPose(PF.inst,PF.sampleClip(PF.clips[name],i/120*PF.clips[name].length));PF.m.updateMatrixWorld(true);PF.m.traverse(o=>{finite&&=o.matrixWorld.elements.every(Number.isFinite);});}r.push({name,finite,frames:120});}return r;
  });assert(motion.every(x=>x.finite),'original animation clips remain finite');
  const sourceUnchanged=JSON.stringify(sourceHashes)===JSON.stringify(hashes());
  const result={before,readyMs,sourceHashes,sourceUnchanged,...externalEvidence(),initial,states,motion,errors};fs.writeFileSync(out+'/checks.json',JSON.stringify(result,null,2));
  assert(sourceUnchanged,'cosmetic sources unchanged during capture');assert.deepEqual(errors,[]);
  console.log('PASS player fidelity render, original rig, wardrobe, carry and two-hand grip checks',JSON.stringify({views:Object.keys(states).length,readyMs,motion,maxGrip:Math.max(...Object.values(states).map(s=>s.grip)),maxSupport:Math.max(...Object.values(states).map(s=>s.support)),sourceUnchanged}));
  }
 }
}catch(e){if(errors.length)console.error('Page/renderer errors:',JSON.stringify(errors));throw e;}
finally{await browser?.close();await server.close();}

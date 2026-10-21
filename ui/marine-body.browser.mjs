// GP-106: short real-renderer comparison of two bodies on the same rig.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),shots=path.join(root,'review/marine-base/v1');fs.mkdirSync(shots,{recursive:true});
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-106 quick-check timeout');process.exit(2);},120000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('window.TT = stampDebugHooks({', 'window.bodyPoseProbe = (low) => { crouching = !!low; aimYaw = 0; aimTarget.set(player.position.x, player.position.y + 1.05, player.position.z + 20); swapT=0; weaponMount.visible=true; for(let i=0;i<24;i++){updateMarinePose(.05,false,false,false);holdWeapon(.05);} return {grip:WEAPON_HOLD[currentWeapon].grip,hand:_HAND_R.toArray(),dip:POSE.bodyDip}; }; window.TT = stampDebugHooks({');
 await page.route('**/index.html?*',r=>r.fulfill({body:source,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Marine Review');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{TT.grantAllWeapons();TT.setWeapon(TT.WEAPON_ORDER.indexOf('m4'));TT.getMarine().visible=false;TT.player.position.set(40,TT.sampleHeight(40,22),22);});
 const initial=await page.evaluate(async()=>{
  const T=await import('three'),{rigs}=await import('./studio/rigs.js'),{loadClip,sampleClip,applyPose}=await import('./studio/clip.js');
  window.bodyReview={T,rigs,sampleClip,applyPose,clips:{}};
  for(const name of ['stand','walk','run'])bodyReview.clips[name]=loadClip(await (await fetch('./studio/clips/marine/'+name+'.json')).json());
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
  const keep=new Set();for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  TT.setWorldTime(.4);
  bodyReview.models=[true,false].map((legacyBody,i)=>{
   const m=TT.makeMarine({legacyBody});m.position.set(14+(i? .72:-.72),TT.sampleHeight(14,22),22);TT.scene.add(m);
   return m;
  });
  bodyReview.inst=bodyReview.models.map(group=>rigs.get('marine').create({group}));
  bodyReview.home=bodyReview.models.map(m=>m.position.clone());
  bodyReview.pose=(name,t=0)=>bodyReview.inst.forEach((inst,i)=>{inst.group.position.copy(bodyReview.home[i]);applyPose(inst,sampleClip(bodyReview.clips[name],t));});
  const count=m=>{let meshes=0,vertices=0;m.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;}});return {meshes,vertices};};
  const joints=['lowerBody','hip','legLG','legRG','kneeLG','kneeRG','ankleLG','ankleRG','torsoG','headG','armLG','armRG','elbowLG','elbowRG','gripL','gripR','weaponMount'];
  const positions=bodyReview.models.map(m=>Object.fromEntries(joints.map(k=>[k,m.userData[k].position.toArray()])));
  return {positions,counts:bodyReview.models.map(count),items:bodyReview.models.map(m=>Object.keys(m.userData.wardrobe).sort())};
 });
 assert.deepEqual(initial.positions[0],initial.positions[1],'every joint and weapon attachment retains its position');
 assert.deepEqual(initial.items[0],initial.items[1],'all clothing items retained');
 console.log('Rig/wardrobe equality PASS; geometry counts:',JSON.stringify(initial.counts));
 async function shot(name,{angle=0,pose='stand',t=0}={}){
  await page.evaluate(({angle,pose,t})=>{
   bodyReview.pose(pose,t);const y=TT.sampleHeight(14,22);
   for(const m of bodyReview.models)m.rotation.y=angle;
   TT.setShotView({x:14,y:y+1.25,z:26.3,tx:14,ty:y+.84,tz:22,fov:36});
  },{angle,pose,t});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:path.join(shots,name+'.png')});
 }
 await shot('uniform-front');await shot('uniform-quarter',{angle:Math.PI/4});await shot('uniform-back',{angle:Math.PI});
 await shot('walk',{pose:'walk',t:.25,angle:.4});await shot('run',{pose:'run',t:.2,angle:.7});
 if(process.argv.includes('--motion'))for(const clip of ['walk','run']) {
  const bytes=await page.evaluate(clip=>new Promise((resolve,reject)=>{
   const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
   const stream=canvas.captureStream(30),chunks=[],rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2500000});
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onerror=e=>reject(Error(e.error?.message||'recording failed'));
   rec.onstop=async()=>{for(const track of stream.getTracks())track.stop();resolve([...new Uint8Array(await new Blob(chunks).arrayBuffer())]);};
   const start=performance.now();rec.start();
   const step=now=>{const t=(now-start)/1000;bodyReview.pose(clip,t%bodyReview.clips[clip].length);if(t<3.2)requestAnimationFrame(step);else rec.stop();};requestAnimationFrame(step);
  }),clip);
  fs.writeFileSync(path.join(shots,clip+'.webm'),Buffer.from(bytes));assert(bytes.length>10000,'motion recording contains frames');
 }

 await page.evaluate(()=>{for(const m of bodyReview.models){const st=structuredClone(TT.getWardrobe());st.items.shirt.sleeves='rolled';st.items.trousers.cut='shorts';st.items.gloves.worn=false;TT.dressMarine(m,st);}});
 await shot('rolled-shorts');
 await page.evaluate(()=>{for(const m of bodyReview.models){const st=structuredClone(TT.getWardrobe());st.items.shirt.sleeves='down';st.items.trousers.cut='trousers';st.items.gloves.worn=true;st.items.mask.camo='marpat';TT.dressMarine(m,st);for(const [k,list] of Object.entries(m.userData.gearParts))for(const o of list)o.visible=['helmet','vest','pads','nvg'].includes(k);}});
 await shot('kit-front');await shot('kit-quarter',{angle:Math.PI/4});await shot('kit-back',{angle:Math.PI});
 for(const low of [false,true]) {
  const errors=await page.evaluate(low=>{
   const hold=bodyPoseProbe(low),source=TT.getMarine().userData,T=bodyReview.T,dist=[];
   for(const m of bodyReview.models){
    m.position.y=bodyReview.home[bodyReview.models.indexOf(m)].y+hold.dip;const u=m.userData;for(const key of ['lowerBody','hip','torsoG','headG','armLG','armRG','elbowLG','elbowRG','legLG','legRG','kneeLG','kneeRG','ankleLG','ankleRG','weaponMount']){u[key].position.copy(source[key].position);u[key].quaternion.copy(source[key].quaternion);}
    if(!u.reviewGun){u.reviewGun=TT.weaponMeshes.m4.clone();u.reviewGun.visible=true;u.weaponMount.add(u.reviewGun);}
    m.rotation.y=.45;m.updateMatrixWorld(true);
    const hand=u.elbowRG.localToWorld(new T.Vector3(...hold.hand)),grip=u.reviewGun.localToWorld(new T.Vector3(...hold.grip));dist.push(hand.distanceTo(grip));
   }
   const y=TT.sampleHeight(14,22);TT.setShotView({x:14,y:y+1.25,z:26.3,tx:14,ty:y+.84,tz:22,fov:36});return dist;
  },low);
  assert(errors.every(n=>n<.025),'actual weapon grip stays in each right hand: '+errors);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:path.join(shots,low?'crouched-aim.png':'rifle-grip.png')});
 }
 const variants=await page.evaluate(()=>bodyReview.models.map(m=>{
  const d=m.userData.dress;return {down:d.sleeveDown.every(x=>x.visible),rolled:d.sleeveRolled.every(x=>!x.visible),gloved:d.gloveOn.every(x=>x.visible),bare:d.handBare.every(x=>!x.visible),mask:m.userData.wardrobe.mask.meshes.every(x=>x.visible),camo:m.userData.wardrobe.mask.mats.every(x=>!!x.map)};
 }));
 assert(variants.every(v=>Object.values(v).every(Boolean)),'sleeve/glove visibility and mask camo preserved');assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(shots,'checks.json'),JSON.stringify({initial,variants,pageErrors:errors},null,2));
 console.log('PASS GP-106: existing stand/walk/run clips, issued/full kit, rolled sleeves/shorts, rifle mounting, camo and wardrobe visibility; no page errors.');
}finally{clearTimeout(hard);if(browser)await browser.close();server.close();}

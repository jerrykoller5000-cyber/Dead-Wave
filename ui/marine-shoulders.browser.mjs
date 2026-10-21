// GP-124: current production body and all survivor identities, matched cameras.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),out='review/marine-base/shoulders',before=process.argv.includes('--before'),prefix=before?'before':'after';
const server=await serve(process.cwd(),0);let browser;const stop=setTimeout(()=>process.exit(2),120000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/index.html*',route=>{
  let s=fs.readFileSync('index.html','utf8');
  s=s.replace('window.TT = stampDebugHooks({','window.anatomyPose=(low)=>{crouching=low;aimYaw=0;aimTarget.set(player.position.x,player.position.y+1.05,player.position.z+20);swapT=0;weaponMount.visible=true;for(let i=0;i<24;i++){updateMarinePose(.05,false,false,false);holdWeapon(.05);}return{dip:POSE.bodyDip,hand:_HAND_R.toArray(),grip:WEAPON_HOLD[currentWeapon].grip};}; window.TT = stampDebugHooks({');
  return route.fulfill({contentType:'text/html',body:s});
 });
 if(before)await p.route('**/studio/marine-body.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(out+'/body-before.js','utf8')}));
 await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await p.evaluate(()=>DWOpening.dismissForTesting());await p.waitForFunction(()=>document.getElementById('opening').hidden);
 await p.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));await p.evaluate(()=>startMatch(TT,'Anatomy review'));
 const state=await p.evaluate(async()=>{
  TT.grantAllWeapons();TT.setWeapon(TT.WEAPON_ORDER.indexOf('m4'));TT.getMarine().visible=false;
  const T=TT.THREE,{rigs}=await import('./studio/rigs.js'),{loadClip,sampleClip,applyPose}=await import('./studio/clip.js');
  const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
  // Review staging only: clear foreground foliage/rocks so every model is visible.
  TT.clearFoliageInSquare(17,24,8);for(const r of TT.rocks)if(r.mesh&&Math.hypot(r.x-17,r.z-24)<10)r.mesh.visible=false;
  TT.setWorldTime(.4);const models=['player','okafor','brandt','pike'].map((who,i)=>{const m=who==='player'?TT.makeMarine():TT.makeSurvivorFigure(who);m.position.set(14+i*1.5,TT.sampleHeight(14+i*1.5,22),22);TT.scene.add(m);return m;});
  const clips={};for(const n of['stand','walk','run'])clips[n]=loadClip(await(await fetch('./studio/clips/marine/'+n+'.json')).json());
  const inst=models.map(group=>rigs.get('marine').create({group}));window.AR={models,inst,clips,sampleClip,applyPose,y:models[0].position.y,homeYs:models.map(m=>m.position.y)};
  const joints=['lowerBody','hip','torsoG','headG','legLG','legRG','kneeLG','kneeRG','ankleLG','ankleRG','armLG','armRG','elbowLG','elbowRG','gripL','gripR','weaponMount'];
  return models.map(m=>{let meshes=0,vertices=0;m.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;}});return{joints:Object.fromEntries(joints.map(k=>[k,m.userData[k].position.toArray()])),wardrobe:Object.keys(m.userData.wardrobe).sort(),meshes,vertices,mask:m.userData.wardrobe.mask.meshes.map(o=>o.visible)};});
 });
 if(!before){const old=JSON.parse(fs.readFileSync(out+'/before-checks.json','utf8'));for(let i=0;i<4;i++){assert.deepEqual(state[i].joints,old.state[i].joints);assert.deepEqual(state[i].wardrobe,old.state[i].wardrobe);assert.deepEqual(state[i].mask,old.state[i].mask);}}
 async function shot(id,{who=0,angle=0,face=false,group=false,pose='stand',time=0,rolled=false,kit=false}={}){
  await p.evaluate(({who,angle,face,group,pose,time,rolled,kit})=>{
   const {models,inst,clips,sampleClip,applyPose,homeYs}=AR;
   models.forEach((m,i)=>{m.visible=group?i>0:i===who;m.position.y=homeYs[i];applyPose(inst[i],sampleClip(clips[pose],time));m.rotation.y=angle;});
   const m=models[who],y=group?homeYs[2]:homeYs[who];
   if(who===0){const st=structuredClone(TT.getWardrobe());st.items.shirt.sleeves=rolled?'rolled':'down';st.items.trousers.cut=rolled?'shorts':'trousers';st.items.gloves.worn=!rolled;TT.dressMarine(m,st);for(const[k,list]of Object.entries(m.userData.gearParts))for(const o of list)o.visible=(kit?['helmet','vest','pads']:['bareHead','bareTorso']).includes(k);}
   const x=group?17:m.position.x;TT.setShotView({x,y:y+(face?1.43:1.13),z:22+(face?1.1:group?6.2:3.7),tx:x,ty:y+(face?1.40:.85),tz:22,fov:face?29:35});
  },{who,angle,face,group,pose,time,rolled,kit});
  await p.waitForTimeout(180);await p.screenshot({path:out+'/'+prefix+'-'+id+'.jpg',type:'jpeg',quality:94});
 }
 await shot('uniform');await shot('quarter',{angle:.65});await shot('profile',{angle:Math.PI/2});await shot('rolled',{rolled:true});await shot('kit',{kit:true,angle:.35});
 await shot('walk',{pose:'walk',time:.25,angle:.6});await shot('run',{pose:'run',time:.2,angle:.6});
 await shot('survivors',{group:true});
 for(const[who,id]of [[1,'okafor'],[2,'brandt'],[3,'pike']])await shot(id,{who,face:true,angle:.3});
 const grips=[];
 for(const low of [false,true]){
  grips.push(await p.evaluate(low=>{const hold=anatomyPose(low),source=TT.getMarine().userData,m=AR.models[0],u=m.userData,T=TT.THREE;AR.models.forEach((o,i)=>o.visible=i===0);m.position.y=AR.y+hold.dip;m.rotation.y=.55;
   for(const key of ['lowerBody','hip','torsoG','headG','armLG','armRG','elbowLG','elbowRG','legLG','legRG','kneeLG','kneeRG','ankleLG','ankleRG','weaponMount']){u[key].position.copy(source[key].position);u[key].quaternion.copy(source[key].quaternion);}
   if(!u.reviewGun){u.reviewGun=TT.weaponMeshes.m4.clone();u.reviewGun.visible=true;u.weaponMount.add(u.reviewGun);}m.updateMatrixWorld(true);
   const hand=u.elbowRG.localToWorld(new T.Vector3(...hold.hand)),grip=u.reviewGun.localToWorld(new T.Vector3(...hold.grip));
   TT.setShotView({x:m.position.x,y:AR.y+1.1,z:25.7,tx:m.position.x,ty:AR.y+.75,tz:22,fov:35});return hand.distanceTo(grip);
  },low));await p.waitForTimeout(180);await p.screenshot({path:out+'/'+prefix+'-'+(low?'crouch':'rifle')+'.jpg',type:'jpeg',quality:94});
 }
 assert(grips.every(d=>d<.025));assert.deepEqual(errors,[]);
 if(!before&&!process.argv.includes('--views-only')){const result=await p.evaluate(fs.readFileSync('tools/tests/t184.js','utf8'));fs.writeFileSync(out+'/crouch-checks.txt',result);assert(!result.includes('FAIL '),result);console.log('PASS current production crouch test t184: '+result.split('\n').filter(l=>l.startsWith('PASS ')).length+' checks');}
 fs.writeFileSync(out+'/'+prefix+'-checks.json',JSON.stringify({state,grips,errors},null,2));
 console.log('PASS '+prefix+': 13 model views, three survivors, standing/crouched rifle grips; '+(!before?'original joints, clothing items and player/survivor mask visibility unchanged; ':'')+'no page errors.');
 console.log(JSON.stringify({counts:state.map(s=>({meshes:s.meshes,vertices:s.vertices})),grips}));
}finally{clearTimeout(stop);await browser?.close();server.close();}

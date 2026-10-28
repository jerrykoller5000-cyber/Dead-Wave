// GP-19974 native integration proof. One game/browser, through the machine-wide slot.
import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const out='handoffs/GP-19974/after';fs.mkdirSync(out,{recursive:true});
const e=new Engine({match:true,warm:'none',size:[1280,720]});
const logs=[],must=(c,m)=>{logs.push((c?'PASS ':'FAIL ')+m);if(!c)throw Error(m);};
const stage=setInterval(()=>console.log(JSON.stringify({stage:'native verification',pageErrors:e.page?.errors?.slice(-3)||[]})),20000);
let watcher;
try{
 await Promise.race([e.open(),new Promise((resolve,reject)=>{watcher=setInterval(()=>{if(e.page?.errors?.length)reject(Error(e.page.errors[0]));},1000);})]);
 clearInterval(watcher);clearInterval(stage);
 if(process.argv.includes('--compose')){
  await e.page.evaluate(`(()=>{
   const T=TT;T.runDevCommand('godmode');T.clearZombies();T.runDevCommand('site truck cutters');T.setWorldTime(.69);
   T.POI.caves.find(c=>c.theme==='iron').eyeRig?.removeFromParent();
   window._clipHidden=[...document.body.children].filter(el=>el!==T.renderer.domElement&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.style.visibility]);
   for(const [el]of _clipHidden)el.style.visibility='hidden';
   const c=T.POI.caves.find(c=>c.theme==='iron');T.player.position.set(c.x+12,T.sampleHeight(c.x+12,c.z),c.z);
  })()`);
  const composed=[];
  for(const [id,lx,lz,h,tx,tz,ty,fov]of[['g',3,3.5,1.35,.4,.2,.6,100],['h',3.1,3.8,1.4,.6,.3,.65,94]]){
   const pose=await e.page.evaluate(`(async()=>{
    const T=TT,c=T.POI.caves.find(c=>c.theme==='iron'),s=Math.sin(c.yaw),co=Math.cos(c.yaw),at=(x,z)=>({x:c.x+co*x+s*z,z:c.z-s*x+co*z});
    const eye=at(${lx},${lz}),target=at(${tx},${tz}),v={x:eye.x,y:T.sampleHeight(eye.x,eye.z)+${h},z:eye.z,tx:target.x,ty:c.gy+${ty},tz:target.z,fov:${fov}};
    T.setShotView(v);T.camera.up.set(0,1,0).applyAxisAngle(new T.THREE.Vector3(v.tx-v.x,v.ty-v.y,v.tz-v.z).normalize(),.055);
    await new Promise(r=>setTimeout(r,400));return v;
   })()`);
   const file='handoffs/GP-19974/source/mine-reframe-'+id+'.png';await e.page.screenshot(file);composed.push({id,file,pose});
  }
  const flag='handoffs/GP-19974/source/choice-'+Date.now()+'.json';
  fs.writeFileSync('handoffs/GP-19974/source/composition-ready.json',JSON.stringify({flag,composed},null,2));
  console.log('COMPOSITION READY: inspect source/mine-reframe-g.png and h.png; save runtime JPG, then write '+flag);
  const limit=Date.now()+120000;while(!fs.existsSync(flag)){if(Date.now()>limit)throw Error('Composition selection timeout; closing browser');await new Promise(r=>setTimeout(r,500));}
  await e.page.evaluate(`(()=>{for(const [el,v]of _clipHidden)el.style.visibility=v;delete window._clipHidden;TT.camera.up.set(0,1,0);TT.setShotView(null);})()`);
 }
 await e.page.evaluate(`TT.storyDbg.gate(false);TT.runDevCommand('godmode');TT.clearZombies();TT.startPrep()`);
 const initial=await e.page.evaluate(`(()=>{const D=TT.storyAftermathDbg;return {facts:D.read(),radio:D.open('convoy-radio'),camera:D.open('hiker-camera')};})()`);
 must(!initial.radio&&!initial.camera,'recordings are unavailable before actual recovery');
 await e.page.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));
 const convoy=await e.page.evaluate(fs.readFileSync('tools/tests/t265.js','utf8'),120000);
 fs.writeFileSync(out+'/t265.log',String(convoy));
 must(String(convoy).split('\n').filter(l=>l.startsWith('PASS ')).length===30&&!String(convoy).includes('FAIL '),'existing native convoy behavior check passes all 30 assertions');
 const aftermath=await e.page.evaluate(`(()=>{
  TT.clearZombies();const D=TT.storyAftermathDbg;D.sync();const parts=TT.convoyDbg.parts();
  return {facts:D.read(),cooler:TT.getObjectiveProps().props['objective:medical-convoy'].group.visible,
   door:parts.door.rotation.y,rear:parts.rearDoors.map(d=>d.pivot.rotation.y),remote:D.open('convoy-radio')};
 })()`);
 must(aftermath.facts.medicalTaken&&!aftermath.cooler,'actual cooler claim leaves no empty cooler behind');
 must(aftermath.door>1&&aftermath.rear.every(v=>Math.abs(v)>1),'cab and rear doors remain open after claim');
 await e.page.evaluate(`(()=>{const T=TT,D=T.storyAftermathDbg,p=D.at('convoy-radio');D.close();T.player.position.set(p.x+1.2,T.sampleHeight(p.x+1.2,p.z),p.z);T.setViewFirstDbg(true);return true;})()`);
 must(await e.page.evaluate(`TT.storyAftermathDbg.open('convoy-radio')`),'cab radio opens only within its real prop reach');
 must(await e.page.evaluate(`(()=>{const s=document.querySelector('#storyPlayback .story-playback-screen');return s.hidden&&s.getBoundingClientRect().height===0;})()`),'radio log has no empty screen above its words');
 await e.page.screenshot(out+'/radio-fp-day-1280.png');
 await e.page.setViewport(390,844);await e.page.screenshot(out+'/radio-fp-day-390.png');await e.page.setViewport(1280,720);
 const guarded=await e.page.evaluate(`(()=>{
  const D=TT.storyAftermathDbg,runId=D.read().runId;
  for(const change of [{runId:'stale'},{kind:'hiker-camera'}])dispatchEvent(new CustomEvent('dw-game',{detail:{type:'story-recording-close-request',runId,kind:'convoy-radio',...change}}));
  return {open:D.modal(),locked:!!document.pointerLockElement,dialog:document.querySelector('#storyPlayback').open};
 })()`);
 must(guarded.open==='convoy-radio'&&guarded.dialog&&!guarded.locked,'stale/wrong-device close refused and first-person pointer released');
 await e.page.evaluate(`new Promise(r=>setTimeout(r,8200))`);
 must(await e.page.evaluate(`TT.storyAftermathDbg.read().radioHeard`),'eight-second radio log becomes learned evidence');
 await e.page.evaluate(`TT.storyAftermathDbg.close()`);
 // Recover the actual loose kit by firing across the rope, then claiming it with E.
 const kit=await e.page.evaluate(`(async()=>{
  const T=TT,wait=ms=>new Promise(r=>setTimeout(r,ms)),press=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));};
  T.setHp(25);press('KeyH');await wait(1600);T.runDevCommand('site hikers dry');await wait(300);
  const rope=T.hikersDbg().rope;if(!rope)throw Error('Hiker rope missing');
  const [a,b]=rope[1],x=(a.x+b.x)/2,y=(a.y+b.y)/2,z=(a.z+b.z)/2;
  T.fireRoundDbg(x-1,y,z,1,0,0,20,90,0);for(let i=0;i<20;i++)T.stepProjectilesDbg(.016);
  await wait(1800);const bag=T.hikersDbg().bag;if(!bag)throw Error('Loose kit missing');
  T.player.position.set(bag.x,T.sampleHeight(bag.x,bag.z),bag.z);await wait(200);press('KeyE');await wait(600);
  T.storyAftermathDbg.sync();return {kit:T.hikersDbg().kit,facts:T.storyAftermathDbg.read(),camera:!!T.storyAftermathDbg.camera()};
 })()`);
 must(kit.kit?.done&&kit.facts.kitRecovered&&kit.camera,'the real recovered kit places its camera on the camp pouch');
 const cameraModel=await e.page.evaluate(`(()=>{
  const T=TT,D=T.storyAftermathDbg,p=D.at('hiker-camera'),m=D.camera();T.setWorldTime(.5);
  T.setShotView({x:p.x+.6,y:p.y+.5,z:p.z+.65,tx:p.x,ty:p.y+.08,tz:p.z,fov:42});
  let meshes=0,triangles=0;m.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
  return {meshes,triangles,position:p.toArray(),parent:m.parent?.name,visible:m.visible};
 })()`);
 await e.page.evaluate(`new Promise(r=>setTimeout(r,300))`);await e.page.screenshot(out+'/recovered-camera-prop.png');
 must(cameraModel.visible&&cameraModel.meshes>0,'recovered camera is built and visible in the actual world');
 await e.page.evaluate(`TT.setShotView(null)`);
 await e.page.evaluate(`(()=>{const T=TT,D=T.storyAftermathDbg,p=D.at('hiker-camera');T.player.position.set(p.x+.7,T.sampleHeight(p.x+.7,p.z),p.z);T.setViewFirstDbg(false);return D.open('hiker-camera');})()`);
 await e.page.evaluate(`new Promise(r=>setTimeout(r,600))`);
 must(await e.page.evaluate(`(()=>{const s=document.querySelector('#storyPlayback .story-playback-screen'),im=s.querySelector('img');return !s.hidden&&s.getBoundingClientRect().height>0&&im.complete&&im.naturalWidth>0;})()`),'switching from radio to camera restores the loaded picture');
 await e.page.screenshot(out+'/camera-camp.png');
 await e.page.evaluate(`new Promise(r=>setTimeout(r,3000))`);await e.page.screenshot(out+'/camera-lake.png');
 await e.page.evaluate(`new Promise(r=>setTimeout(r,3600))`);await e.page.screenshot(out+'/camera-mine.png');
 await e.page.evaluate(`new Promise(r=>setTimeout(r,1200))`);
 must(await e.page.evaluate(`TT.storyAftermathDbg.read().cameraViewed`),'full camera playback records its clue after eight seconds');
 await e.page.evaluate(`TT.storyAftermathDbg.close()`);
 for(const first of [false,true])for(const night of [false,true])for(const width of [1280,390]){
  await e.page.setViewport(width,width===390?844:720);
  const state=await e.page.evaluate(`(async()=>{
   const T=TT,D=T.storyAftermathDbg;D.close();T.setViewFirstDbg(${first});T.setWorldTime(${night?.92:.5});
   const p=D.at('hiker-camera');T.player.position.set(p.x+.7,T.sampleHeight(p.x+.7,p.z),p.z);
   if(!D.open('hiker-camera'))throw Error('Camera reopen refused');await new Promise(r=>setTimeout(r,300));
   const d=document.querySelector('#storyPlayback');return {open:d.open,first:T.fpDbg().first,pointer:!!document.pointerLockElement,overflow:d.scrollWidth>d.clientWidth+1};
  })()`);
  console.log('layout',JSON.stringify({first,night,width,...state}));
  fs.writeFileSync(out+'/layout-latest.json',JSON.stringify({requestedFirst:first,night,width,...state},null,2));
  must(state.open&&state.first===first&&!state.pointer&&!state.overflow,'camera layout '+[first?'fp':'tp',night?'night':'day',width].join('/'));
  await e.page.screenshot(out+'/camera-'+(first?'fp':'tp')+'-'+(night?'night':'day')+'-'+width+'.png');
  await e.page.evaluate(`TT.storyAftermathDbg.close()`);
 }
 await e.page.setViewport(1280,720);
 const posters=await e.page.evaluate(`(async()=>{
  const T=TT,D=T.storyAftermathDbg;D.close();D.sync();await new Promise(r=>setTimeout(r,300));
  const board=T.historyProps.parts['trailhead-board'];
  return board.userData.posters.map(p=>({id:p.userData.hiker.id,note:D.read().notes[p.userData.hiker.id],
   sameTexture:p.material.map===p.userData.tex,sameCanvas:p.material.map.image===p.userData.canvas,
   png:p.userData.canvas.toDataURL('image/png')}));
 })()`);
 for(const p of posters){fs.writeFileSync(out+'/pencil-'+p.id+'.png',Buffer.from(p.png.split(',')[1],'base64'));delete p.png;}
 must(posters.length===6&&posters.every(p=>p.note&&p.sameTexture&&p.sameCanvas),'six learned pencil lines repaint the existing poster textures');
 await e.page.evaluate(`(()=>{
  const T=TT,b=T.historyProps.parts['trailhead-board'],V=T.player.position.constructor;
  T.setWorldTime(.5);const at=b.localToWorld(new V(0,1.45,0)),eye=b.localToWorld(new V(0,1.52,2.9));
  T.player.position.set(eye.x+3,T.sampleHeight(eye.x+3,eye.z),eye.z);
  T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:at.x,ty:at.y,tz:at.z,fov:45});return true;
 })()`);
 await e.page.evaluate(`new Promise(r=>setTimeout(r,300))`);await e.page.screenshot(out+'/trailhead-pencil-notes.png');
 const end=await e.page.evaluate(`(()=>{
  const T=TT,D=T.storyAftermathDbg;D.close();T.setShotView(null);T.runDevCommand('site convoy');
  const p=T.POI.wrecks[0];T.setWorldTime(.5);T.setShotView({x:p.x+5,y:T.sampleHeight(p.x,p.z)+5,z:p.z+5,tx:p.x,ty:T.sampleHeight(p.x,p.z)+1,tz:p.z,fov:50});
  return D.read();
 })()`);
 await e.page.screenshot(out+'/ambulance-after.png');
 fs.writeFileSync(out+'/report.json',JSON.stringify({logs,convoyPass:String(convoy).split('\n').filter(l=>l.startsWith('PASS ')).length,cameraModel,posters,end,errors:e.page.errors,renderer:e.renderer},null,2));
 console.log(logs.join('\n'));must(e.page.errors.length===0,'no page errors');
}catch(error){
 fs.writeFileSync(out+'/failure.json',JSON.stringify({error:String(error.stack||error),logs,errors:e.page?.errors||[]},null,2));
 console.error(error);process.exitCode=1;
}finally{clearInterval(watcher);clearInterval(stage);await e.close();}

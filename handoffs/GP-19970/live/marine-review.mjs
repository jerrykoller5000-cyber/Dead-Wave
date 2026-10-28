import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../../tools/camera.mjs';

// Evidence collection only: the inspector drives the actual rig and game inputs.
// This does not assign an anatomy/contact score or replace the visual review.
const out=process.argv[2]||'handoffs/GP-19970/live/marine';
fs.mkdirSync(out,{recursive:true});
const e=new Engine({inspect:true,warm:'none',size:[1280,720]});
const shots=[];let watcher,checks=[];
const ev=code=>e.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
async function capture(key,context=null){
 const result=await ev(`const data=await I.shot({type:'image/jpeg',quality:.94});
  const s=I.marine.state(),u=TT.marine.userData;
  return {data,subject:I.current(),camera:I.camera(),time:I.time(),
   state:{move:s.move,error:s.error,holds:s.holds,first:TT.fpDbg().first},
   renderedCamera:{position:TT.camera.position.toArray(),quaternion:TT.camera.quaternion.toArray(),fov:TT.camera.fov},
   waist:u.waist?.debug(),mask:!!u.balaclava,idle:{phase:TT.marineIdleDbg().state.phase,propsVisible:TT.marineIdleDbg().props.root.visible},recipe:I.session()};`);
 assert(result.waist?.vertices>0&&result.mask,`${key}: fitted helpers absent`);
 assert(!result.state.error,`${key}: ${result.state.error}`);
 if(key.includes('-standing'))assert(!result.idle.propsVisible,`${key}: prior smoke state leaked into standing fixture`);
 const file=out+'/'+key+'.jpg';
 fs.writeFileSync(file,Buffer.from(result.data.split(',')[1],'base64'));
 delete result.data;shots.push({file,context,...result});
 fs.writeFileSync(out+'/progress.json',JSON.stringify({shots},null,2));
}
try{
 await Promise.race([e.open(),new Promise((_,reject)=>{watcher=setInterval(()=>{
  if(e.page?.errors?.length)reject(Error(e.page.errors[0]));
 },1000);})]);clearInterval(watcher);
 const discovery=await ev(`return {capabilities:I.capabilities(),moves:I.marine.moves(),
  subjects:I.list('marine'),wardrobe:TT.getWardrobe()};`);
 assert(discovery.capabilities.realGame&&discovery.capabilities.apiVersion===1);
 for(const move of ['stand-armed','walk','crouch-walk','turn-left'])
  assert(discovery.moves.some(m=>m.id===move),'Missing actual move '+move);
 fs.writeFileSync(out+'/discovery.json',JSON.stringify(discovery,null,2));
 checks=await ev("return await I.check({only:'marine',variants:false,frames:2});");
 assert(checks.length&&checks.every(r=>r.ok),'Marine inspector geometry/build check');
 for(const kit of ['light','full']){
  await ev(`await I.show('marine');I.marine.stop();TT.marineIdleDbg().reset();TT.setViewFirstDbg(false);
   I.marine.weapon('${kit==='light'?'pistol':'m4'}');
   I.marine.gear('helmet',${kit==='full'});I.marine.gear('vest',${kit==='full'});
   I.marine.gear('pads',${kit==='full'});I.marine.gear('nvg',false);
   I.marine.camo('m81');I.marine.item('mask',{camo:'coyoteBrown'});
   await I.marine.play('stand-armed',{loop:false});I.pause();await I.stepAsync(30);`);
  for(const light of ['noon','overcast','dusk','night']){
   for(const view of ['head','torso']){
    await ev(`I.light('${light}');I.view('${view}',{instant:true});await I.stepAsync(1);`);
    await capture(`${kit}-${light}-${view}-standing`);
   }
  }
  await ev(`I.light('noon');`);
  for(const move of ['walk','crouch-walk','turn-left']){
   await ev(`await I.marine.play('${move}',{loop:false});I.pause();`);
   for(let phase=0;phase<4;phase++){
    if(phase)await ev(`await I.stepAsync(15);`);
    for(const view of ['head','torso']){
     await ev(`I.view('${view}',{instant:true});`);
     await capture(`${kit}-${move}-f${phase*15}-${view}`);
    }
   }
  }
  for(const first of [false,true])for(const light of ['noon','night']){
   for(const move of ['walk','crouch-walk','turn-left']){
    // Drive uses the normal game clock; inspector review jobs require leaving it.
    const context=await ev(`I.drive(true);TT.setViewFirstDbg(${first});I.light('${light}');
     await I.marine.play('${move}',{loop:false});
     await new Promise(r=>setTimeout(r,900));I.pause();
     const c=TT.camera;c.updateWorldMatrix(true,false);const m=c.matrixWorld.elements;
     const cam={x:c.position.x,y:c.position.y,z:c.position.z,
      tx:c.position.x-m[8],ty:c.position.y-m[9],tz:c.position.z-m[10],fov:c.fov};
     const u=TT.marine.userData;TT.marine.updateWorldMatrix(true,true);
     const pose={lower:u.lowerBody.matrixWorld.toArray(),torso:u.torsoG.matrixWorld.toArray(),head:u.headG.matrixWorld.toArray()};
     const sample={move:'${move}',first:TT.fpDbg().first,time:I.time(),camera:cam,pose};
     I.drive(false);I.pause();I.camera(cam);return sample;`);
    assert.equal(context.first,first,'gameplay view selection');
    await capture(`${kit}-gameplay-${first?'fp':'tp'}-${light}-${move}`,context);
   }
   await ev(`TT.setViewFirstDbg(false);I.pause();`);
  }
  await ev("TT.setViewFirstDbg(false);I.light('noon');await I.marine.play('smoke',{loop:false});I.pause();await I.stepAsync(360);I.view('head',{instant:true});");
  await capture(`${kit}-smoke-head`);
  console.log(`Captured ${kit} kit: head/waist four-light stills, actual frame-stepped moves, gameplay cameras.`);
 }
 const errors=await ev('return I.errors();');assert.deepEqual(errors,[]);assert.deepEqual(e.page.errors,[]);
 fs.writeFileSync(out+'/report.json',JSON.stringify({renderer:e.renderer,loadSec:e.loadSec,
  purpose:'Review evidence only; no passing visual or animation score inferred from collection.',
  shots,checks,errors,pageErrors:e.page.errors},null,2));
 console.log(`PASS collection: ${shots.length} native marine helper captures; no inspector/page errors. Visual scoring remains required.`);
}catch(error){
 fs.writeFileSync(out+'/failure.json',JSON.stringify({error:String(error.stack||error),shots,pageErrors:e.page?.errors||[]},null,2));throw error;
}finally{
 clearInterval(watcher);
 try{if(e.page)await ev('I.marine.stop();I.drive(false);await I.still(false);');}catch{}
 await e.close();
}

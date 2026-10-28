import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../../tools/camera.mjs';
const out='handoffs/GP-19970/live/zombie-motion';
fs.mkdirSync(out,{recursive:true});
const e=new Engine({inspect:true,warm:'none',size:[1280,720]});
const shots=[];let watcher;
const ev=code=>e.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
async function capture(id,action,frame,view){
 const r=await ev(`I.view('${view}',{instant:true});
  const z=I.zombie.get(),data=await I.shot({type:'image/jpeg',quality:.92});
  return {data,subject:I.current(),time:I.time(),camera:I.camera(),
   actor:{alive:z.alive,hp:z.hp,position:z.mesh.position.toArray(),yaw:z.mesh.rotation.y},recipe:I.session()};`);
 assert(r.actor.alive,`${id}: unintended death during structural sample`);
 const file=`${out}/${id}-${action}-f${frame}-${view}.jpg`;
 fs.writeFileSync(file,Buffer.from(r.data.split(',')[1],'base64'));delete r.data;
 shots.push({file,id,action,sampledFrame:frame,view,...r});
}
try{
 await Promise.race([e.open(),new Promise((_,reject)=>{watcher=setInterval(()=>{
  if(e.page?.errors?.length)reject(Error(e.page.errors[0]));
 },1000);})]);clearInterval(watcher);
 const entries=await ev("return I.list().filter(e=>e.kind==='zombie');");
 assert(entries.length>0,'No live zombie catalog entries');
 fs.writeFileSync(out+'/catalog.json',JSON.stringify(entries,null,2));
 const checks=await ev("return await I.check({only:'zombie.',variants:false,frames:2});");
 assert(checks.length&&checks.every(r=>r.ok),'Zombie real-builder check');
 for(const {id}of entries){
  await ev(`await I.show('${id}',{mode:'walk',instant:true});I.light('noon');I.pause();`);
  for(let frame=0;frame<=100;frame+=20){
   if(frame)await ev('await I.stepAsync(20);');
   for(const view of ['front','side'])await capture(id,'walk',frame,view);
  }
  await ev("I.zombie.hit('body',1);");
  for(let frame=0;frame<=20;frame+=10){
   if(frame)await ev('await I.stepAsync(10);');
   for(const view of ['front','side'])await capture(id,'body-hit',frame,view);
  }
  fs.writeFileSync(out+'/progress.json',JSON.stringify({shots},null,2));
  console.log(`Captured ${id}: actual walking and body-hit samples, front/side.`);
 }
 const errors=await ev('return I.errors();');assert.deepEqual(errors,[]);assert.deepEqual(e.page.errors,[]);
 fs.writeFileSync(out+'/report.json',JSON.stringify({renderer:e.renderer,entries,checks,shots,errors,pageErrors:e.page.errors,
  scope:'Structural motion samples only. No full-model, full-cycle or gameplay-camera acceptance inferred.'},null,2));
 console.log(`PASS collection: ${entries.length} live types, ${shots.length} native motion samples, zero inspector/page errors. Visual review still required.`);
}catch(error){fs.writeFileSync(out+'/failure.json',JSON.stringify({error:String(error.stack||error),shots,pageErrors:e.page?.errors||[]},null,2));throw error;}
finally{clearInterval(watcher);try{if(e.page)await ev('await I.still(false);');}catch{}await e.close();}

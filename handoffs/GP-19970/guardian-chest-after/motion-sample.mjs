import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../../tools/camera.mjs';

const out='handoffs/GP-19970/guardian-chest-after';
const e=new Engine({inspect:true,warm:'none',size:[1280,720]});
const ev=code=>e.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
const shots=[];
async function capture(id,frame,view){
  const r=await ev(`I.view('${view}',{instant:true});const z=I.zombie.get(),data=await I.shot({type:'image/jpeg',quality:.92});
    return {data,subject:I.current(),time:I.time(),camera:I.camera(),actor:{alive:z.alive,hp:z.hp}};`);
  assert(r.actor.alive,`${id}: unintended death during sample`);
  const file=`${out}/zombie.${id}-walk-f${frame}-${view}.jpg`;
  fs.writeFileSync(file,Buffer.from(r.data.split(',')[1],'base64'));
  delete r.data;shots.push({file,id,frame,view,...r});
}
try{
  await e.open();
  for(const id of ['guardian','caveguard']){
    await ev(`await I.show('zombie.${id}',{mode:'walk',instant:true});I.light('noon');I.pause();`);
    for(const frame of [0,20,40]){
      if(frame)await ev('await I.stepAsync(20);');
      for(const view of ['front','side'])await capture(id,frame,view);
    }
  }
  const errors=await ev('return I.errors();');assert.deepEqual(errors,[]);assert.deepEqual(e.page.errors,[]);
  fs.writeFileSync(`${out}/motion-report.json`,JSON.stringify({renderer:e.renderer,shots,errors,pageErrors:e.page.errors},null,2));
  console.log(`PASS ${shots.length} guardian/caveguard walk frames, zero inspector/page errors.`);
}finally{
  try{if(e.page)await ev('await I.still(false);');}catch{}
  await e.close();
}

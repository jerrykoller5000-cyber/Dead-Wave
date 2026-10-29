import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../../tools/camera.mjs';

const out='handoffs/GP-19970/guardian-throat';
fs.mkdirSync(out,{recursive:true});
const e=new Engine({inspect:true,warm:'none',size:[1280,720]});
const ev=code=>e.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
const shots=[];
async function capture(kind,label,light,view){
  let r;
  for(let attempt=0;attempt<6;attempt++){
    r=await ev(`I.light('${light}');
      const z=I.zombie.get(),TH=TT.THREE,R=z.mesh.userData.bossRig?.userData.rig||z.mesh.userData.rig;
      if('${view}'==='throat'){
        R.neck.updateWorldMatrix(true,false);const p=R.neck.getWorldPosition(new TH.Vector3());
        I.camera({x:p.x+3.0,y:p.y-.32,z:p.z+.16,tx:p.x,ty:p.y-.32,tz:p.z+.16,fov:35});
      }else I.view({yaw:30,pitch:8,dist:8},{instant:true});
      const image=await I.shot({type:'image/jpeg',quality:.94});
      return {image,subject:I.current(),camera:I.camera(),actor:{alive:z.alive,headWorld:R.head.getWorldPosition(new TH.Vector3()).toArray()}};`);
    if(r.image.length>30000&&r.actor.alive)break;
  }
  assert(r.image.length>30000&&r.actor.alive,`blank/dead ${kind} ${label} ${light} ${view}`);
  const file=`${out}/${kind}-${label}-${light}-${view}.jpg`;
  fs.writeFileSync(file,Buffer.from(r.image.split(',')[1],'base64'));
  delete r.image;shots.push({file,kind,label,light,view,...r});
}
try{
  await e.open();
  for(const kind of ['guardian','caveguard']){
    await ev(`await I.show('zombie.${kind}',{mode:'walk',instant:true});I.pause();`);
    for(const light of ['noon','overcast','dusk','night'])await capture(kind,'rest',light,'throat');
    await capture(kind,'rest','noon','gameplay');
    for(const frame of [0,20,40]){
      if(frame)await ev('await I.stepAsync(20);');
      await capture(kind,`walk-f${frame}`,'noon','throat');
    }
  }
  const errors=await ev('return I.errors();');assert.deepEqual(errors,[]);assert.deepEqual(e.page.errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({renderer:e.renderer,shots,errors,pageErrors:e.page.errors},null,2));
  console.log(`PASS ${shots.length} guardian/caveguard throat stills, zero inspector/page errors.`);
}finally{
  try{if(e.page)await ev('await I.still(false);');}catch{}
  await e.close();
}

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../../tools/camera.mjs';

const out=process.argv[2]||'handoffs/GP-19970/active-warnings';
fs.mkdirSync(out,{recursive:true});
const e=new Engine({inspect:true,warm:'none',size:[1280,720]});
const ev=code=>e.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
const shots=[];
async function capture(kind,label,light,view){
  let result;
  for(let attempt=0;attempt<6;attempt++){
    result=await ev(`I.light('${light}');I.view(${view==='gameplay'?'{yaw:30,pitch:8,dist:8}':'{yaw:90,pitch:0,dist:4}'},{instant:true});
      const z=I.zombie.get(),image=await I.shot({type:'image/jpeg',quality:.93});
      const u=z.mesh.userData;return {image,subject:I.current(),camera:I.camera(),state:{type:z.typeKey,spitWind:z.spitWind||0,fuseT:z.fuseT||0,chargeWind:z.chargeWind||0,
        belly:u.pulseMats?.[0]?.emissiveIntensity??null,vein:u.pulseMats?.[1]?.emissiveIntensity??null,fire:u.emberMat?.emissiveIntensity??null}};`);
    if(result.image.length>30_000&&result.state.type===kind)break;
  }
  assert(result.image.length>30_000&&result.state.type===kind,`blank or wrong subject: ${kind} ${label} ${light} ${view}`);
  const file=`${out}/${kind}-${label}-${light}-${view}.jpg`;
  fs.writeFileSync(file,Buffer.from(result.image.split(',')[1],'base64'));
  delete result.image;shots.push({file,...result});
}
try{
  await e.open();
  for(const kind of ['spitter','bomber','demon']){
    await ev(`await I.show('zombie.${kind}',{mode:'walk',instant:true});I.pause();I.light('noon');`);
    await capture(kind,'idle','noon','gameplay');
    if(kind==='spitter')await ev("const z=I.zombie.get();z.spitWind=.55;z.spitCd=10;await I.stepAsync(9);");
    if(kind==='bomber')await ev("const z=I.zombie.get();z.fuseT=0;await I.stepAsync(12);");
    if(kind==='demon')await ev("const z=I.zombie.get();z.chargeWind=.55;z.chargeCd=10;await I.stepAsync(12);");
    for(const light of ['noon','overcast','dusk','night'])await capture(kind,'active',light,'side');
    await capture(kind,'active','noon','gameplay');
    if(kind==='bomber'){
      await ev('await I.stepAsync(6);');
      for(const light of ['noon','overcast','dusk','night'])await capture(kind,'peak',light,'side');
      for(const light of ['noon','overcast','dusk','night'])await capture(kind,'peak',light,'gameplay');
    }
  }
  const errors=await ev('return I.errors();');assert.deepEqual(errors,[]);assert.deepEqual(e.page.errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({renderer:e.renderer,shots,errors,pageErrors:e.page.errors},null,2));
  console.log(`PASS ${shots.length} active warning stills, zero inspector/page errors.`);
}finally{
  try{if(e.page)await ev('await I.still(false);');}catch{}
  await e.close();
}

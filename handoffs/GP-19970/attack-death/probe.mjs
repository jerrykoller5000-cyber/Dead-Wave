import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../../tools/camera.mjs';

const kind=process.argv[2]||'shambler';
assert(['shambler','feral','military','brute','colossus'].includes(kind),'unsupported melee type');
const out=`handoffs/GP-19970/attack-death${kind==='shambler'?'':`/${kind}`}`;
fs.mkdirSync(out,{recursive:true});
const e=new Engine({inspect:true,warm:'none',size:[1280,720]});
const ev=code=>e.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
const frames=[];
async function shot(phase,n){
  let r;
  for(let attempt=0;attempt<6;attempt++){
    r=await ev(`${phase==='death'?'':'I.view({yaw:30,pitch:8,dist:8},{instant:true});'}
      const z=I.zombie.get(),corpse=TT.getCorpses().at(-1),m=${phase==='death'?'corpse?.mesh':'z.mesh'},u=m?.userData||{},image=await I.shot({type:'image/jpeg',quality:.93});
      return {image,state:{alive:z.alive,dying:z.dying||false,attackWindup:z.attackWindup||0,swingT:z.swingT||0,deathT:z.deathT||0,
        corpseT:corpse?.t??null,corpseRX:m?.rotation.x??null,corpseRZ:m?.rotation.z??null,
        hipsZ:u.hips?.position.z??null,hipsY:u.hips?.position.y??null,armL:u.armLG?.rotation.x??null,armR:u.armRG?.rotation.x??null},
        subject:I.current(),camera:I.camera()};`);
    if(r.image.length>30000)break;
  }
  assert(r.image.length>30000,`blank ${phase} ${n}`);
  const file=`${out}/${kind}-${phase}-f${String(n).padStart(2,'0')}.jpg`;
  fs.writeFileSync(file,Buffer.from(r.image.split(',')[1],'base64'));
  delete r.image;frames.push({file,phase,n,...r});
}
try{
  await e.open();
  await ev(`await I.show('zombie.${kind}',{mode:'walk',instant:true});I.pause();I.light('noon');`);
  await shot('idle',0);
  await ev("const z=I.zombie.get();z.attackWindup=.22;z._pendingAttack={type:'player',dmg:0};z.attackCd=10;");
  for(const n of [1,2,3,4,5,6,7,8,9,10,12,14,16,18,20,22,24,26,30]){
    await ev(`await I.stepAsync(${n-(frames.at(-1)?.phase==='attack'?frames.at(-1).n:0)});`);
    await shot('attack',n);
  }
  await ev('I.zombie.kill();');
  await shot('death',0);
  for(const n of [1,2,3,4,6,8,12,20,40,80]){
    await ev(`await I.stepAsync(${n-(frames.at(-1)?.phase==='death'?frames.at(-1).n:0)});`);
    await shot('death',n);
  }
  const errors=await ev('return I.errors();');assert.deepEqual(errors,[]);assert.deepEqual(e.page.errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({renderer:e.renderer,frames,errors,pageErrors:e.page.errors},null,2));
  console.log(`PASS ${frames.length} native ${kind} attack/death frames, zero inspector/page errors.`);
}finally{
  try{if(e.page)await ev('await I.still(false);');}catch{}
  await e.close();
}

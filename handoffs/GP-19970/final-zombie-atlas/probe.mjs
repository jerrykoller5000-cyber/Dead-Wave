// Current-tree appearance survey: 14 real zombie builders, four lights, two angles,
// a gameplay-distance view and a walk side. Run only through the crew test slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/final-zombie-atlas';
const kinds=['shambler','feral','leaper','spider','drowned','military','brute',
  'spitter','screamer','bomber','demon','colossus','guardian','caveguard'];
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({inspect:true,warm:'none',size:[1280,720]});
const report={at:new Date().toISOString(),kinds,shots:[],errors:[],pageErrors:[]};
const ev=code=>engine.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,180000);
async function capture(kind,light,view,label='rest'){
  let result;
  for(let attempt=0;attempt<5;attempt++){
    result=await ev(`
      I.light('${light}');
      ${view==='gameplay'?"I.view({yaw:30,pitch:8,dist:8},{instant:true});":`I.view('${view}',{instant:true});`}
      await I.stepAsync(1);
      const data=await I.shot({type:'image/jpeg',quality:.93});
      const z=I.zombie.get();
      return {data,current:I.current(),camera:I.camera(),alive:z?.alive,
        type:z?.typeKey,inspectorErrors:I.errors()};
    `);
    if(result.data.length>30000&&result.alive&&result.type===kind&&!result.inspectorErrors.length)break;
  }
  if(result.data.length<=30000||!result.alive||result.type!==kind||result.inspectorErrors.length)
    throw Error(`${kind} ${light} ${view} ${label}: blank/broken capture`);
  const bytes=Buffer.from(result.data.split(',')[1],'base64');
  const file=`${kind}-${label}-${light}-${view}.jpg`;
  await fs.writeFile(path.join(dir,file),bytes);
  delete result.data;
  report.shots.push({file,kind,light,view,label,bytes:bytes.length,...result});
}
try{
  await engine.open();report.renderer=engine.renderer;report.loadSec=engine.loadSec;
  report.checks=await ev("return await I.check({only:'zombie',variants:false,frames:2});");
  if(report.checks.length!==14||report.checks.some(x=>!x.ok))throw Error('all-14 builder check failed');
  for(const kind of kinds){
    await ev(`await I.show('zombie.${kind}',{mode:'walk',instant:true});I.pause();await I.stepAsync(1);`);
    for(const light of ['noon','overcast','dusk','night'])
      for(const view of ['front','side'])await capture(kind,light,view);
    await capture(kind,'noon','gameplay');
    await ev("I.light('noon');await I.stepAsync(20);");
    await capture(kind,'noon','side','walk-f20');
    await fs.writeFile(path.join(dir,'progress.json'),JSON.stringify({completed:kind,shots:report.shots.length},null,2));
    console.log(`${kind}: 10 current-tree images`);
  }
  report.errors=await ev('return I.errors();');report.pageErrors=engine.page.errors||[];
}finally{
  await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
  try{if(engine.page)await ev('await I.still(false);return true;');}catch{}
  await engine.close();
}
if(report.shots.length!==140||report.errors.length||report.pageErrors.length)process.exitCode=1;
else console.log('PASS current-tree zombie atlas: 14/14 builders, 140 four-light/angle/gameplay/walk images, zero Inspector/page errors');

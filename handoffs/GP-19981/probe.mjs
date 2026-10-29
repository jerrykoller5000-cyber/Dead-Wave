// GP-19981: matched native Brandt beard views. Run through crew game-test slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../tools/camera.mjs';

const stage=process.argv[2];
if(!/^(?:before|after\d*)$/.test(stage))throw Error('pass before or an after iteration');
const dir=`handoffs/GP-19981/${stage}`;
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({inspect:true,warm:'none',size:[1600,900]});
const report={at:new Date().toISOString(),stage,shots:[],errors:[],pageErrors:[]};
const ev=code=>engine.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
let headAt;
async function shot(light,view){
  const config=view==='gameplay'?{yaw:30,pitch:8,dist:8,fov:35}:
    view==='full-front'?{yaw:0,pitch:0,dist:3.5,fov:35}:
    {yaw:view==='close-side'?90:0,pitch:0,dist:1.0,fov:31,at:headAt};
  let r;
  for(let i=0;i<5;i++){
    r=await ev(`I.light('${light}');I.view(${JSON.stringify(config)},{instant:true});await I.stepAsync(1);
      const data=await I.shot({type:'image/jpeg',quality:.94});return {data,current:I.current(),camera:I.camera(),errors:I.errors()};`);
    if(r.data.length>30000&&!r.errors.length)break;
  }
  if(r.data.length<=30000||r.errors.length)throw Error(`blank/error ${light} ${view}`);
  const file=`brandt-${light}-${view}.jpg`,bytes=Buffer.from(r.data.split(',')[1],'base64');
  await fs.writeFile(path.join(dir,file),bytes);delete r.data;
  report.shots.push({file,light,view,bytes:bytes.length,...r});
}
try{
  await engine.open();report.renderer=engine.renderer;report.loadSec=engine.loadSec;
  report.check=await ev("return await I.check({only:'person.brandt',variants:false,frames:2});");
  if(report.check.length!==1||!report.check[0].ok)throw Error('Brandt build failed');
  await ev("await I.show('person.brandt',{instant:true});I.pause();return true;");
  const subject=await ev('return I.current();');
  headAt={x:subject.center.x,y:subject.center.y+subject.size.y*.41,z:subject.center.z};
  for(const light of ['noon','overcast','dusk','night'])for(const view of ['close-front','close-side'])await shot(light,view);
  await shot('noon','full-front');await shot('noon','gameplay');
  report.errors=await ev('return I.errors();');report.pageErrors=engine.page.errors||[];
}finally{
  await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
  try{if(engine.page)await ev('await I.still(false);return true;');}catch{}
  await engine.close();
}
if(report.shots.length!==10||report.errors.length||report.pageErrors.length)process.exitCode=1;
else console.log(`PASS ${stage} Brandt beard: 1 builder, 10 four-light/close/gameplay images, zero errors`);

// Native Inspector waist views from both kits, actual moves and two lights.
// Run only through the crew game-test slot.
import fs from 'node:fs/promises';
import path from 'node:path';
import {Engine} from '../../../tools/camera.mjs';

const dir='handoffs/GP-19970/marine-waist-review';
await fs.mkdir(dir,{recursive:true});
const engine=new Engine({inspect:true,warm:'none',size:[1280,720]});
const report={at:new Date().toISOString(),shots:[],errors:[]};
const ev=code=>engine.page.evaluate(`(async()=>{const I=DWInspect;${code}})()`,120000);
async function capture(key,kit,pose,light,angle){
  const sample=await ev(`
    I.view('torso',{instant:true});await I.stepAsync(1);
    const f=I.camera(),dx=f.x-f.tx,dz=f.z-f.tz;
    const a=${angle==='side'?'Math.PI/2':'Math.PI'},c=Math.cos(a),s=Math.sin(a);
    I.camera({x:f.tx+dx*c-dz*s,y:f.y-.24,z:f.tz+dx*s+dz*c,
      tx:f.tx,ty:f.ty-.24,tz:f.tz,fov:f.fov});
    await I.stepAsync(1);
    const data=await I.shot({type:'image/jpeg',quality:.94});
    return {data,camera:I.camera(),waist:TT.marine.userData.waist?.debug(),
      state:I.marine.state(),time:I.time(),errors:I.errors()};
  `);
  if(!sample.waist?.vertices||sample.errors.length||sample.state.error)throw Error(key+' Inspector/helper failure');
  const bytes=Buffer.from(sample.data.split(',')[1],'base64');
  if(bytes.length<10000)throw Error(key+' blank image: '+bytes.length);
  const file=`${key}.jpg`;await fs.writeFile(path.join(dir,file),bytes);
  delete sample.data;report.shots.push({file,kit,pose,light,angle,bytes:bytes.length,...sample});
}
try{
  await engine.open();report.renderer=engine.renderer;report.loadSec=engine.loadSec;
  report.checks=await ev("return await I.check({only:'marine',variants:false,frames:2});");
  if(!report.checks.length||report.checks.some(x=>!x.ok))throw Error('marine build check failed');
  for(const kit of ['light','full']){
    await ev(`await I.show('marine');I.marine.stop();TT.marineIdleDbg().reset();TT.setViewFirstDbg(false);
      I.marine.weapon('${kit==='light'?'pistol':'m4'}');
      I.marine.gear('helmet',${kit==='full'});I.marine.gear('vest',${kit==='full'});
      I.marine.gear('pads',${kit==='full'});I.marine.gear('nvg',false);
      I.marine.camo('m81');I.marine.item('mask',{camo:'coyoteBrown'});`);
    for(const pose of ['stand-armed','walk','crouch-walk','turn-left']){
      await ev(`await I.marine.play('${pose}',{loop:false});I.pause();await I.stepAsync(30);I.light('noon');`);
      for(const angle of ['side','back'])await capture(`${kit}-${pose}-f30-noon-${angle}`,kit,pose,'noon',angle);
      if(pose==='stand-armed'){
        await ev("I.light('night');await I.stepAsync(1);");
        for(const angle of ['side','back'])await capture(`${kit}-${pose}-f30-night-${angle}`,kit,pose,'night',angle);
      }
    }
    console.log(`${kit}: 10 waist side/back shots`);
  }
  report.errors=await ev('return I.errors();');
  report.pageErrors=engine.page.errors||[];
}finally{
  await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
  try{if(engine.page)await ev('I.marine.stop();I.drive(false);await I.still(false);return true;');}catch{}
  await engine.close();
}
if(report.shots.length!==20||report.errors.length||report.pageErrors.length)process.exitCode=1;
else console.log(`PASS native marine waist capture: ${report.checks.length} builder, 20 images, zero Inspector/page errors`);

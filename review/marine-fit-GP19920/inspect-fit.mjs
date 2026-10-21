import fs from 'node:fs';import path from 'node:path';import{Engine}from'../../tools/camera.mjs';
const out=path.resolve('review/marine-fit-GP19920',process.argv[2]||'detail');fs.mkdirSync(out,{recursive:true});
const E=new Engine({inspect:true,warm:'none',size:'1440x1000'}),checks=[];
const ev=s=>E.ev(s);
async function shot(name,view='three',move){await E.run({cmd:'shot',target:'marine',view,move,out:path.join(out,name+'.png')});const d=await ev('return DWInspect.shot();');fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(d.split(',')[1],'base64'));}
try{await E.open();console.log('ready',E.loadSec);
 await ev(`await DWInspect.show('marine');await DWInspect.marine.preset('full');await DWInspect.marine.play('stand');await wait(1500);DWInspect.pause();return true;`);
 for(const v of ['front','left','back'])await shot(v,v);
 await shot('helmet','three',{zoom:2.8,pan:[0,.5]});
 const stand=await ev(`const u=T.getMarine().userData;return {knee:[u.kneeLG.rotation.x,u.kneeRG.rotation.x],thigh:[u.legLG.rotation.x,u.legRG.rotation.x],dip:T.gaitDbg.pose().bodyDip,turn:u.turn,root:T.getMarine().position.toArray()};`);checks.push({stand});console.log('stand',JSON.stringify(stand));
 await ev(`await DWInspect.marine.preset('hot');await DWInspect.marine.play('stand');DWInspect.play();await wait(500);DWInspect.pause();return true;`);
 await shot('wrist','front',{zoom:2.5,pan:[.3,-.1]});
 for(const t of [1,2.8,4.5,7.5]){
  await ev(`const s=T.marineIdleDbg().state;Object.assign(s,{phase:'smoking',time:${t},quiet:29+${t},lit:true});await DWInspect.stepAsync(1);return true;`);
  await shot('smoke-'+t,'three',{zoom:2.5,pan:[0,.43]});
  checks.push(await ev(`const idle=T.marineIdleDbg(),c=idle.props.cig,TH=T.THREE,p=new TH.Vector3();const wr=T.getMarine().userData.elbowRG.userData.wrist;return {smokeTime:idle.state.time,pinch:c.userData.pinch,cig:c.localToWorld(p.set(0,0,.016)).toArray(),wristAngle:wr.quaternion.angleTo(new TH.Quaternion()),lip:c.localToWorld(p.set(0,0,0)).toArray()};`));
 }
 await ev(`await DWInspect.marine.play('crouch');DWInspect.play();await wait(650);DWInspect.pause();return true;`);await shot('crouch','left');
 const fps=await ev(`await DWInspect.marine.play('stand');DWInspect.play();const f=DWInspect.time().frames,t=performance.now();await wait(3000);return (DWInspect.time().frames-f)*1000/(performance.now()-t);`);checks.push({fps,errors:await ev('return DWInspect.errors();')});
 fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify({loadSec:E.loadSec,renderer:E.renderer,checks},null,2));console.log(JSON.stringify(checks));
}finally{await E.close();}

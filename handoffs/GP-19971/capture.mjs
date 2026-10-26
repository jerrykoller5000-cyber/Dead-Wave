import fs from 'node:fs';
import path from 'node:path';
import {Engine,jobReq} from '../../tools/camera.mjs';
const pass=process.argv[2]||'after',out=`handoffs/GP-19971/${pass}`;
if(pass==='before'&&fs.existsSync(`${out}/result.json`))throw Error('Baseline is archived; use after for the current source.');
fs.mkdirSync(out,{recursive:true});
const engine=new Engine({inspect:true,warm:'none',size:[1200,900]});
// Read the inspector's synchronous render/copy: the desktop compositor can return
// a blank WebGPU buffer even after camera.mjs has presented the correct frame.
const cameraShot=engine.shoot.bind(engine);
engine.shoot=async req=>{
 const r=await cameraShot(req);
 const data=await engine.page.evaluate(`(async()=>{const png=await DWInspect.shot();const im=new Image();im.src=png;await im.decode();const c=document.createElement('canvas');c.width=400;c.height=300;const g=c.getContext('2d');g.drawImage(im,0,0,400,300);const pixels=g.getImageData(0,0,400,300).data;let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>12)lit++;if(lit<500)throw Error('blank capture');return {png,thumb:c.toDataURL('image/jpeg',.9).split(',')[1]};})()`);
 fs.writeFileSync(r.file,Buffer.from(data.png.split(',')[1],'base64'));r.thumb=data.thumb;return r;
};
const setup=(phase,light,face=false,view='front',seconds=2)=>`
 const I=DWInspect; await I.show('zombie.screamer',{mode:'live',instant:true}); I.pause(); I.light('${light}'); I.backdrop('studio');
 const B=await import('/game/screamer-behavior.js'); const z=T.zombies.find(z=>z.alive&&z.typeKey==='screamer');
 if(!z)throw Error('no live screamer');
 B.resetScreamer(z); z.bob=0; z.mesh.rotation.set(0,0,0);z.screamT=0;z.sonicOpenT=0;
 for(const k of ['riseT','belowRiseT','knockT','getUpT','hitReact','hitPartT','attackWindup','swingT'])z[k]=0;
 z.inWater=z.farLod=z.sleeping=z.crawling=z.hopping=false;
 for(let f=0;f<${Math.round(seconds*60)};f++){B.restoreScreamerPose(z);z.screamT=${phase==='scream'?'.55':'0'};z.sonicOpenT=${phase==='exposed'?'1.7':'0'};B.applyScreamerPose(z,1/60);}
 z.mesh.updateMatrixWorld(true);z.mesh.userData.screamerFx?.hide();
 ${face?`const p=z.mesh.userData.head.getWorldPosition(z.mesh.position.clone());const yaw=${view==='profile'?90:view==='three'?35:0}*Math.PI/180;await R.aim({cam:{x:p.x+Math.sin(yaw)*1.35,y:p.y-.08,z:p.z+Math.cos(yaw)*1.35,tx:p.x,ty:p.y-.08,tz:p.z+.06,fov:35}});`:''}
 `;
try{
 await engine.open();
 const shots=[];
 for(const phase of ['drift','scream','exposed'])for(const view of ['front','three','right'])shots.push({target:'zombie.screamer',view,pre:setup(phase,'overcast'),out:`${out}/arms-${phase}-${view}.png`,caption:`${pass}: ${phase} / ${view}`});
 for(const light of ['noon','overcast','dusk','night'])for(const phase of ['drift','scream'])for(const view of ['front','three','profile'])shots.push({pre:setup(phase,light,true,view),out:`${out}/face-${phase}-${light}-${view}.png`,caption:`${pass}: ${phase} / ${light} / ${view}`});
 const result=await engine.run(jobReq({shots,sheet:true,cols:3,tile:400,sheetFile:`${out}/sheet.jpg`}));
 fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));
 const info=await engine.page.evaluate(`(()=>{const z=TT.zombies.find(z=>z.alive&&z.typeKey==='screamer'),u=z.mesh.userData;return {subject:DWInspect.current(),errors:DWInspect.errors(),rig:['hips','torso','head','armLG','armRG'].map(k=>({name:k,p:u[k].position.toArray(),r:u[k].rotation.toArray(),s:u[k].scale.toArray()})),render:TT.renderer.info.render};})()`);
 fs.writeFileSync(`${out}/info.json`,JSON.stringify(info,null,2));
 console.log(JSON.stringify({ok:result.ok,shots:result.shots.length,failures:result.shots.filter(s=>s.error),sheet:result.sheet,info},null,2));
 if(!result.ok)process.exitCode=1;
 if(pass!=='before'){
  const check=await engine.run({cmd:'check',only:'zombie.screamer',out:`${out}/check`});
  console.log('INSPECTOR '+JSON.stringify(check));if(!check.ok)process.exitCode=1;
 }
}finally{await engine.close();}

import fs from 'node:fs';import {Engine} from '../../tools/camera.mjs';
const dir='review/screamer-opacity-GP19874',tag=process.argv[2]||'before';
if(tag==='before'&&fs.existsSync(`${dir}/before-proof.json`))throw Error('Historical before is preserved');
fs.mkdirSync(`${dir}/${tag}`,{recursive:true});
const E=new Engine({training:true,warm:'none',size:'1200x800'});
try{await E.open();
 await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');window.floor=D.tg().floorY;
 T.player.position.set(-30,floor,-626);T.setVelDbg(0,0);window.Z=T.spawnZombie(-32,-634,'screamer',true,true);Z.trainingZ=true;Z.mesh.position.y=floor;Z.riseT=0;Z.hp=Z.maxHp=10000;Z.screamCd=2;
 window.nextFrame=()=>new Promise(r=>requestAnimationFrame(r));return true;`);
 const data=await E.ev(`const chunks=[],rec=new MediaRecorder(T.renderer.domElement.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});
 rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start();const start=performance.now(),samples=[];
 while(performance.now()-start<12000){await nextFrame();const t=(performance.now()-start)/1000;
 if(t<7){const a=t*.5;T.player.position.set(-32+Math.sin(a)*7,floor,-634+Math.cos(a)*7);}
 else if(t<11)T.player.position.set(-26,floor,-634);
 else {const a=(t-11)*.55+Math.PI*.5;T.player.position.set(-32+Math.sin(a)*7,floor,-634+Math.cos(a)*7);}
 T.setVelDbg(0,0);const p=Z.mesh.position;
 if(t<7)T.setShotView({x:p.x+3.8,y:floor+2.2,z:p.z+4.3,tx:p.x,ty:floor+1.05,tz:p.z,fov:36});
 else T.setShotView({x:-22,y:floor+12,z:-620,tx:-31,ty:floor+.2,tz:-633,fov:48});
 if(samples.length===0||t-samples[samples.length-1].t>.08){const u=Z.mesh.userData;samples.push({t,x:p.x,z:p.z,y:p.y,yaw:Z.mesh.rotation.y,screamT:Z.screamT||0,sonicOpenT:Z.sonicOpenT||0,shieldVisible:!!u.screamerFx?.shield.visible,head:u.head.rotation.x,torso:u.torso.rotation.x,hips:u.hips.rotation.y,jaw:u.jaw?.rotation.x,legs:[u.legLG.rotation.x,u.legRG.rotation.x]});}}
 rec.stop();await done;const blob=new Blob(chunks,{type:rec.mimeType});const video=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(blob);});return {video,samples};`,20000);
 fs.writeFileSync(`${dir}/${tag}.webm`,Buffer.from(data.video,'base64'));
 await E.page.screenshot(`${dir}/${tag}/scene.png`);
 const read=await E.ev(`return {zombieAlive:Z.alive,acidMeshes:T.scene.children.filter(x=>x.visible&&(x.name.includes('acid')||x.material?.color?.getHex()===0x9ccc22)).map(x=>({name:x.name,position:x.position.toArray(),opacity:x.material?.opacity})),ability:T.zombieAbilityDbg?.read?.()};`);
 fs.writeFileSync(`${dir}/${tag}-proof.json`,JSON.stringify({samples:data.samples,read,errors:E.page.errors,loadSeconds:E.loadSec,renderer:E.renderer},null,2)+'\n');
 console.log(tag,JSON.stringify({samples:data.samples.length,screams:data.samples.filter(x=>x.screamT>0).length,openFrames:data.samples.filter(x=>x.sonicOpenT>0).length,loadSeconds:E.loadSec,errors:E.page.errors}));
}finally{await E.close();}process.exit(0);

import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const dir='review/zombie-pose-GP19890',tag=process.argv[2]||'before',E=new Engine({training:true,warm:'none',size:'1200x800'}),proof={};
if(tag==='before'&&fs.existsSync(dir+'/before-proof.json'))throw Error('Preserve baseline');
if(tag==='baseline'){const load=E.load.bind(E);E.load=async()=>{const go=E.page.goto.bind(E.page);E.page.goto=(url,o)=>go(url.replace('/index.html?','/'+dir+'/baseline.html?'),o);try{return await load();}finally{E.page.goto=go;}};}
try{await E.open();proof.loadSec=E.loadSec;await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');window.floor=D.tg().floorY;window.frame=()=>new Promise(r=>requestAnimationFrame(r));`);
 for(const type of ['screamer','bomber']){
 await E.ev(`D.clear();T.player.position.set(-30,floor,-624);T.setVelDbg(0,0);window.Z=T.spawnZombie(-32,-642,'${type}',true,true);Z.trainingZ=true;Z.mesh.position.y=floor;Z.riseT=0;Z.hp=Z.maxHp=1e5;Z.mesh.rotation.y=0;Z.bob=0;Z.screamCd=100;Z.attackCd=100;await wait(400);`);
 const data=await E.ev(`const chunks=[],rec=new MediaRecorder(T.renderer.domElement.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start();const start=performance.now(),samples=[];
 while(performance.now()-start<6000){await frame();const t=(performance.now()-start)/1000,p=Z.mesh.position,u=Z.mesh.userData;const distance='${type}'==='screamer'?7:t<3?10:4.4;
 T.player.position.set(p.x,floor,p.z+distance);T.setVelDbg(0,0);const side=t>5;
 T.setShotView({x:p.x+(side?4.4:2.1),y:floor+2.0,z:p.z+(side?2.0:5.2),tx:p.x,ty:floor+1.1,tz:p.z,fov:35});
 samples.push({t,distance,alive:Z.alive,open:Z.sonicOpenT||0,root:p.y-floor,hips:u.hips.position.y,torsoX:u.torso.rotation.x,chest:u.torso.scale.toArray(),arms:[u.armLG.rotation.toArray().slice(0,3),u.armRG.rotation.toArray().slice(0,3)],elbows:[u.armLG.userData.elbowG.rotation.toArray().slice(0,3),u.armRG.userData.elbowG.rotation.toArray().slice(0,3)],legs:[u.legLG.rotation.x,u.legRG.rotation.x],belly:u.bomberBelly?.scale.toArray()});}
 rec.stop();await done;const blob=new Blob(chunks);const video=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(blob);});return {video,samples};`,15000);
 fs.writeFileSync(dir+'/'+tag+'-'+type+'.webm',Buffer.from(data.video,'base64'));proof[type]=data.samples;
 await E.page.screenshot(dir+'/'+tag+'-'+type+'.png');assert(data.samples.every(s=>s.alive));assert(await E.ev('return Z.alive;'));
 }
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log(JSON.stringify({tag,loadSec:proof.loadSec,screamer:proof.screamer.length,bomber:proof.bomber.length,errors:proof.errors}));
}finally{fs.writeFileSync(dir+'/'+tag+'-proof.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const d='review/spitter-GP19870',tag=process.argv[2]||'final',E=new Engine({training:true,warm:'none',size:'1200x800'});
if(tag==='before'){const load=E.load.bind(E);E.load=async()=>{const go=E.page.goto.bind(E.page);E.page.goto=(u,o)=>go(u.replace('/index.html?','/review/spitter-GP19870/baseline.html?'),o);try{return await load();}finally{E.page.goto=go;}};}
fs.mkdirSync(`${d}/${tag}`,{recursive:true});
try{await E.open();
 const proof=await E.ev(`R.release();const D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');window.floor=D.tg().floorY;
 T.player.position.set(-30,floor,-626);T.setVelDbg(0,0);window.Z=T.spawnZombie(-30,-634,'spitter',true,true);Z.trainingZ=true;Z.mesh.position.y=floor;Z.mesh.rotation.y=0;Z.riseT=0;Z.hp=Z.maxHp=10000;Z.spitCd=.01;
 const u=Z.mesh.userData;return {jawAttached:!!u.jaw?.parent,jawName:u.jaw?.name,actualJawBone:u.skinMesh?.skeleton.bones.includes(u.jaw),skinDraws:u.skinMeshes?.length};`);
 // Capture the actual retch, articulated jaw, mouth launch and splash, not a manually placed decal.
 let born,glob,originError;
 for(let i=0;i<130;i++){
  const r=await E.ev(`Z.mesh.position.x=-30;Z.mesh.position.z=-634;T.player.position.set(-30,floor,-626);T.setVelDbg(0,0);
   T.setShotView({x:-27,y:floor+2.1,z:-630.8,tx:-30,ty:floor+1.2,tz:-634,fov:32});
   const g=T.acidGlobs.find(g=>!g.web),pool=T.scene.children.find(m=>m.visible&&m.name==='spitter-acid-pool');
   let error=null;if(g&&g.age<.035){const p=Z.mesh.userData.head.localToWorld(new T.THREE.Vector3(0,-.11*Z.scale,.25*Z.scale));error=Math.hypot(g.x-g.vx*g.age-p.x,g.y-g.vy*g.age-p.y,g.z-g.vz*g.age-p.z);}
   return {wind:Z.spitWind||0,snap:Z.spitSnap||0,glob:!!g,pool:!!pool,error};`);
  if(r.error!==null)originError=r.error;
  if(r.wind>.15&&r.wind<.3){await E.page.screenshot(`${d}/${tag}/spit-wind.png`);}
  if(r.glob&&!glob){glob=true;await E.page.screenshot(`${d}/${tag}/spit-release.png`);}
  if(tag==='before'&&glob){const pool=await E.ev(`return T.acidGlobs.length===0;`);if(pool){born=true;break;}}
  if(r.pool){born=true;break;}
  await new Promise(r=>setTimeout(r,20));
 }
 assert(glob&&born,'real spit must launch and land');
 await E.ev(`Z.spitCd=100;T.setShotView({x:-26,y:floor+4,z:-622.8,tx:-30,ty:floor,tz:-626,fov:35});return true;`);
 await E.page.screenshot(`${d}/${tag}/acid-pool.png`);
 proof.mouthOriginError=originError;
 const movie=await E.ev(`const chunks=[],rec=new MediaRecorder(T.renderer.domElement.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5000000});rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start();await new Promise(r=>setTimeout(r,4600));rec.stop();await done;
 const blob=new Blob(chunks,{type:rec.mimeType});return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(blob);});`,8000);
 fs.writeFileSync(`${d}/${tag}-pool.webm`,Buffer.from(movie,'base64'));
 proof.expired=await E.ev(`return T.scene.children.filter(m=>m.visible&&m.name==='spitter-acid-pool').length===0;`);
 proof.errors=E.page.errors;fs.writeFileSync(`${d}/${tag}-effects.json`,JSON.stringify(proof,null,2)+'\n');
 if(tag!=='before'){assert(proof.jawAttached&&proof.actualJawBone,'animated jaw must be attached to the rendered skin');assert.equal(proof.skinDraws,1,'jaw keeps one skin draw');assert(originError<.11,'glob follows the posed mouth');assert(proof.expired,'original 4.2s expiry');}
 assert.equal(proof.errors.length,0);console.log(tag,JSON.stringify(proof));
}finally{await E.close();}process.exit(0);

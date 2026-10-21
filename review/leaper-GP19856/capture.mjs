import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/leaper-GP19856',proof={};
if(before&&!fs.existsSync(`${dir}/before.html`))fs.writeFileSync(`${dir}/before.html`,fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="/">'));
const E=new Engine({training:true,warm:'none',size:'1100x780'});
if(before)E.load=async function(){const goto=this.page.goto.bind(this.page);this.page.goto=(url,...args)=>goto(url.replace('/index.html?',`/${dir}/before.html?`),...args);try{await Engine.prototype.load.call(this);}finally{this.page.goto=goto;}};
try{
 await E.open();proof.loadSec=E.loadSec;
 proof.rig=await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-22,D.tg().floorY,-632);window.F=T.spawnZombie(-33,-632,'leaper',true,true);F.trainingZ=true;F.mesh.position.y=D.tg().floorY;F.mesh.rotation.y=Math.PI/2;F.hp=10000;F.riseT=0;F.attackCd=100;F.leapCd=1.15;window.samples=[];window.stopPreview=false;window.takeAt=performance.now();const u=F.mesh.userData,part=o=>({pos:o.position.toArray(),rot:o.rotation.toArray().slice(0,3),scale:o.scale.toArray()});return {baseSpeed:F.baseSpeed,rest:u.rest,baseHipsY:u.baseHipsY,hips:part(u.hips),torso:part(u.torso),head:part(u.head),arm:part(u.armLG),elbow:part(u.armLG.userData.elbowG),leg:part(u.legLG),shin:part(u.legLG.userData.shinG)};`);
 const encoded=await E.ev(`const canvas=T.renderer.domElement,chunks=[];const recorder=new MediaRecorder(canvas.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const end=new Promise(r=>recorder.onstop=r);recorder.start();window.still=null;
 const frame=()=>{if(stopPreview)return;const t=(performance.now()-takeAt)/1000,p=F.mesh.position,u=F.mesh.userData;
 // Keep a real moving player within leap range; the AI picks and performs each jump.
 if(t>2.7){const a=Math.min(Math.PI,(t-2.7)*1.3);T.player.position.set(-26+Math.cos(a)*5,D.tg().floorY,-632-Math.sin(a)*5);}
 samples.push({t,x:p.x,z:p.z,y:p.y,floor:D.tg().floorY,leapT:F.leapT||0,leapDur:F.leapDur||0,hips:u.hips.position.y,hipPitch:u.hips.rotation.x,torsoPitch:u.torso.rotation.x,arm:u.armLG.rotation.x,elbow:u.armLG.userData.elbowG.rotation.x,knee:u.legLG.userData.shinG.rotation.x});
 T.setShotView({x:p.x+3.2,y:p.y+2.1,z:p.z+4.2,tx:p.x,ty:p.y+.8,tz:p.z,fov:40});if(!still&&t>1.4)still=canvas.toDataURL('image/png').split(',')[1];requestAnimationFrame(frame);};frame();await wait(7400);stopPreview=true;recorder.stop();await end;const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);`,15000);
 fs.writeFileSync(`${dir}/${before?'before':'after'}.webm`,Buffer.from(encoded,'base64'));
 const still=await E.ev(`return still;`);fs.writeFileSync(`${dir}/${before?'before':'after'}-motion-frame.png`,Buffer.from(still,'base64'));
 proof.samples=await E.ev(`return samples;`);assert.ok(proof.samples.some(s=>s.leapT>0),'actual AI leap');
 await E.ev(`D.openPanel();D.panel().element.hidden=true;return true;`);
 const cam=await E.ev(`const p=F.mesh.position;return {x:p.x+3.2,y:p.y+2.1,z:p.z+4.2,tx:p.x,ty:p.y+.8,tz:p.z,fov:40};`);
 await E.shoot({target:'player',cam,out:`${dir}/${before?'before':'after'}.png`});
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log(JSON.stringify({loadSec:proof.loadSec,frames:proof.samples.length,airFrames:proof.samples.filter(s=>s.leapT>0).length,rig:proof.rig,errors:proof.errors}));
}finally{fs.writeFileSync(`${dir}/${before?'before':'after'}-proof.json`,JSON.stringify(proof,null,2));await E.close();}process.exit(0);

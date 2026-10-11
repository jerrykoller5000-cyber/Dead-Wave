import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/spider-GP19857',proof={};
if(before&&!fs.existsSync(`${dir}/before.html`))fs.writeFileSync(`${dir}/before.html`,fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="/">'));
const E=new Engine({training:true,warm:'none',size:'1100x780'});
if(before)E.load=async function(){const go=this.page.goto.bind(this.page);this.page.goto=(url,...a)=>go(url.replace('/index.html?',`/${dir}/before.html?`),...a);try{await Engine.prototype.load.call(this);}finally{this.page.goto=go;}};
try{
 await E.open();proof.loadSec=E.loadSec;
 proof.rig=await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-18,D.tg().floorY,-632);window.F=T.spawnZombie(-30,-632,'spider',true,true);F.trainingZ=true;F.mesh.position.y=D.tg().floorY;F.mesh.rotation.y=Math.PI/2;F.hp=10000;F.riseT=0;F.spitCd=.8;F.strafeDir=1;F.strafeT=3;window.actor=F.mesh;window.samples=[];window.stopPreview=false;window.takeAt=performance.now();window.dead=false;const u=F.mesh.userData;return {hips:u.hips.position.toArray(),head:u.head.position.toArray(),rest:u.rest,limbs:u.crawlLimbs.map(l=>({pos:l.root.position.toArray(),knee:l.knee.position.toArray(),base:l.baseQ.toArray(),bend:l.bendAxis.toArray()}))};`);
 const encoded=await E.ev(`const canvas=T.renderer.domElement,chunks=[],recorder=new MediaRecorder(canvas.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const end=new Promise(r=>recorder.onstop=r);recorder.start();window.still=null;
 const frame=()=>{if(stopPreview)return;const t=(performance.now()-takeAt)/1000,p=actor.position,u=actor.userData;
 if(t>3.2&&t<7){const a=(t-3.2)*1.85;T.player.position.set(-30+Math.cos(a)*11,D.tg().floorY,-632-Math.sin(a)*11);}
 if(t>7&&!dead){dead=true;T.killZombie(F,false,{kind:'melee',dir:{x:1,z:.4},raw:30});}
 samples.push({t,alive:F.alive,yaw:actor.rotation.y,pitch:actor.rotation.x,roll:actor.rotation.z,headPitch:u.head.rotation.x,hips:u.hips.position.y,wind:F.spiderSpitWind||0,limb:u.crawlLimbs[0].root.quaternion.toArray(),knee:u.crawlLimbs[0].knee.quaternion.toArray()});
 T.setShotView({x:p.x+3,y:p.y+2.1,z:p.z+3.4,tx:p.x,ty:p.y+.5,tz:p.z+.2,fov:43});if(!still&&t>2)still=canvas.toDataURL('image/png').split(',')[1];requestAnimationFrame(frame);};frame();await wait(9500);stopPreview=true;recorder.stop();await end;const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);`,15000);
 fs.writeFileSync(`${dir}/${before?'before':'after'}.webm`,Buffer.from(encoded,'base64'));
 fs.writeFileSync(`${dir}/${before?'before':'after'}-spit.png`,Buffer.from(await E.ev(`return still;`),'base64'));
 proof.samples=await E.ev(`return samples;`);assert.ok(proof.samples.some(s=>!s.alive));
 await E.ev(`D.openPanel();D.panel().element.hidden=true;return true;`);
 const cam=await E.ev(`const p=actor.position;return {x:p.x+2,y:p.y+2,z:p.z+2.4,tx:p.x,ty:p.y+.3,tz:p.z,fov:43};`);
 await E.shoot({target:'player',cam,out:`${dir}/${before?'before':'after'}-death.png`});
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log(JSON.stringify({loadSec:proof.loadSec,frames:proof.samples.length,death:proof.samples.at(-1),rig:proof.rig,errors:proof.errors}));
}finally{fs.writeFileSync(`${dir}/${before?'before':'after'}-proof.json`,JSON.stringify(proof,null,2));await E.close();}process.exit(0);

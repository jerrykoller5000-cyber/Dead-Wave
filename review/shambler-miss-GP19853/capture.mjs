import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/shambler-miss-GP19853',proof={};const E=new Engine({training:true,warm:'none',size:'1100x780'});
if(before)E.load=async function(){const goto=this.page.goto.bind(this.page);this.page.goto=(url,...args)=>goto(url.replace('/index.html?',`/${dir}/before.html?`),...args);try{await Engine.prototype.load.call(this);}finally{this.page.goto=goto;}};
try{
  await E.open();proof.loadSec=E.loadSec;
  await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-26,D.tg().floorY,-632);window.F=T.spawnZombie(-31,-632,'shambler',true,true);F.trainingZ=true;F.mesh.position.y=D.tg().floorY;F.hp=10000;F.riseT=0;F.attackCd=0;window.M=await import('/game/shambler-recovery.js');window.previewStop=false;window.previewSamples=[];window.dodged=false;window.previewT=performance.now();return true;`);
  const encoded=await E.ev(`const canvas=T.renderer.domElement,chunks=[];const recorder=new MediaRecorder(canvas.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const end=new Promise(r=>recorder.onstop=r);recorder.start();const frame=()=>{if(previewStop)return;const t=(performance.now()-previewT)/1000;
    if(!dodged&&F.attackWindup>0){dodged=true;window.dodgeAt=t;T.player.position.z+=3.2;}
    const state=M.shamblerRecoveryState(F),u=F.mesh.userData;
    previewSamples.push({t,wind:F.attackWindup,swing:F.swingT,state,x:F.mesh.position.x,z:F.mesh.position.z,headY:u.head.rotation.y,armL:u.armLG.rotation.z,knee:u.legLG.userData.shinG.rotation.x});
    const p=F.mesh.position;T.setShotView({x:p.x+3.3,y:p.y+2.5,z:p.z+4.3,tx:p.x,ty:p.y+.95,tz:p.z,fov:39});requestAnimationFrame(frame);};frame();await wait(5600);previewStop=true;recorder.stop();await end;const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);`,15000);
  fs.writeFileSync(`${dir}/${before?'before':'after'}.webm`,Buffer.from(encoded,'base64'));
  proof.case=await E.ev(`return {dodged,dodgeAt,samples:previewSamples,hp:document.querySelector('#hpText')?.textContent||null};`);
  assert.ok(proof.case.dodged,'actual windup triggered dodge');
  if(!before){const active=proof.case.samples.filter(s=>s.state?.active);assert.ok(active.length>40,'actual missed melee triggers recovery');assert.ok(active.every(s=>s.wind<=0),'no attacks during recovery');assert.ok(Math.max(...active.map(s=>Math.abs(s.headY)))>.3,'visible angry headshake');}
  // A second actual dodge, paused mid-reaction, for the camera before/after still.
  await E.ev(`F.attackWindup=0;F.swingT=0;F.attackCd=0;T.player.position.set(-26,D.tg().floorY,-632);F.mesh.position.set(-27,D.tg().floorY,-632);let n=0;while(F.attackWindup<=0&&n++<80)await wait(16);T.player.position.z+=3.2;await wait(900);D.openPanel();D.panel().element.hidden=true;return true;`,4000);
  const cam=await E.ev(`const p=F.mesh.position,c={x:p.x+3.3,y:p.y+2.5,z:p.z+4.3,tx:p.x,ty:p.y+.95,tz:p.z,fov:39};T.camera.position.set(c.x,c.y,c.z);T.camera.lookAt(c.tx,c.ty,c.tz);T.camera.fov=c.fov;T.camera.updateProjectionMatrix();return c;`);
  await E.shoot({target:'player',cam,out:`${dir}/${before?'before':'after'}.png`});
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log(JSON.stringify({loadSec:proof.loadSec,dodged:proof.case.dodged,activeFrames:proof.case.samples.filter(s=>s.state?.active).length,errors:proof.errors}));
}finally{fs.writeFileSync(`${dir}/${before?'before':'after'}-proof.json`,JSON.stringify(proof,null,2));await E.close();}process.exit(0);

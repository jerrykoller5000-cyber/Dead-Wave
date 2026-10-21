import fs from 'node:fs';
import { Engine } from '../../tools/camera.mjs';
const before=process.argv.includes('--before'), dir='review/feral-claws-GP19850';
const E=new Engine({training:true,warm:'none',size:'1100x780'}), proof={};
if(before)E.load=async function(){const goto=this.page.goto.bind(this.page);this.page.goto=(url,...args)=>goto(url.replace('/index.html?',`/${dir}/before.html?`),...args);try{await Engine.prototype.load.call(this);}finally{this.page.goto=goto;}};
try{
  await E.open();proof.loadSec=E.loadSec;
  await E.ev(`R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.setHp(10000);T.player.position.set(-26,D.tg().floorY,-632);D.spawn('feral',1);await wait(6500);window.F=T.zombies.find(z=>z.trainingZ&&z.alive);F.hp=10000;F.mesh.position.set(-30,D.tg().floorY,-634);return true;`);
  proof.rig=await E.ev(`return {floor:D.tg().floorY,speed:F.baseSpeed,skins:F.mesh.userData.skinMeshes?.length,bones:F.mesh.userData.skinMesh?.skeleton.bones.length};`);
  // Move the player around the actual Feral: its own steering and pose code run normally.
  await E.ev(`window.previewStop=false;window.previewT=performance.now();const frame=()=>{if(previewStop)return;const t=(performance.now()-previewT)/1000;T.player.position.set(-26+Math.sin(t*1.15)*7,D.tg().floorY,-632+Math.cos(t*1.15)*6);T.getMarine().visible=false;const p=F.mesh.position;T.setShotView({x:p.x+3,y:p.y+2.3,z:p.z+4,tx:p.x,ty:p.y+.95,tz:p.z,fov:37});requestAnimationFrame(frame);};frame();await wait(2500);return true;`);
  proof.fps=await E.ev(`const ts=[];await new Promise(done=>{const frame=t=>{ts.push(t);if(ts.length===121)done();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});return 120000/(ts.at(-1)-ts[0]);`);
  const encoded=await E.ev(`const canvas=T.renderer.domElement, chunks=[];const recorder=new MediaRecorder(canvas.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const end=new Promise(r=>recorder.onstop=r);recorder.start();await wait(6000);recorder.stop();await end;const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);`,30000);
  fs.writeFileSync(`${dir}/${before?'before':'after'}.webm`,Buffer.from(encoded,'base64'));
  await E.ev(`window.previewStop=true;D.openPanel();D.panel().element.hidden=true;return true;`);
  const cam=await E.ev(`const p=F.mesh.position;const c={x:p.x+3,y:p.y+2.3,z:p.z+4,tx:p.x,ty:p.y+.95,tz:p.z,fov:37};T.camera.position.set(c.x,c.y,c.z);T.camera.lookAt(c.tx,c.ty,c.tz);T.camera.fov=c.fov;T.camera.updateProjectionMatrix();return c;`);
  await E.shoot({target:'player',cam,out:`${dir}/${before?'before':'after'}.png`});
  proof.effects=await E.ev(`return T.feralMotionDbg?.state()||null;`);
  proof.errors=E.page.errors;
  console.log(JSON.stringify(proof));
}finally{fs.writeFileSync(`${dir}/${before?'before':'after'}-proof.json`,JSON.stringify(proof,null,2));await E.close();}
process.exit(0);

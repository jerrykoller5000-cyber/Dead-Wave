import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const dir='review/unarmed-motion-GP19869',tag=process.argv[2]||'before';
if(tag==='before'&&fs.existsSync(dir+'/before-proof.json'))throw Error('The historical before capture is preserved; choose a new tag for another live capture.');
const E=new Engine({training:true,warm:'none',size:'1000x750'});
const clock=fs.readFileSync('tools/posesheet.mjs','utf8').match(/const PAGE = String\.raw`([\s\S]*?)`;/)[1]
  .replace('=> window.dispatchEvent(new KeyboardEvent','=> document.body.dispatchEvent(new KeyboardEvent');
fs.mkdirSync(`${dir}/${tag}`,{recursive:true});
try {
 await E.open();
 await E.ev(`R.release();T.trainingDbg.panel().close();T.clearZombies();T.setHp(100000);T.grantAllWeapons();T.AudioSys.setMuted(true);
 const tg=T.trainingDbg.tg();window.__S={x:tg.origin.x,y:tg.floorY,z:tg.origin.z+4};
 T.player.position.set(__S.x,__S.y,__S.z);T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));return true;`);
 await E.page.evaluate(clock);await new Promise(r=>setTimeout(r,150));
 await E.ev(`__weapon('pistol');__step(90);if(!T.isUnarmed())T.toggleHolster();__step(110);
 window.sampleArms=()=>{const u=T.getMarine().userData,V=T.THREE.Vector3;T.player.updateMatrixWorld(true);const p=T.player.position;
 const hands=['L','R'].map(side=>{const a=u['arm'+side+'G'],e=u['elbow'+side+'G'],w=e.userData.wrist;
 const palm=w.localToWorld(w.userData.hand.point('palm',new V()).sub(w.position));
 return {side,arm:a.rotation.toArray().slice(0,3),elbow:e.rotation.x,thigh:u['leg'+side+'G'].rotation.x,
 palm:[palm.x-p.x,palm.y-p.y,palm.z-p.z],wrist:w.rotation.toArray().slice(0,3)};});
 return {phase:T.smoothDbg.phase(),run:T.gaitDbg.run(),pose:structuredClone(T.smoothDbg.pose()),hands};};return true;`);
 const proof={renderer:E.renderer,loadSeconds:E.loadSec,states:{}};
 for(const [name,keys] of [['idle',[]],['walk',['KeyW']],['run',['KeyW','ShiftLeft']],['crouch-walk',['KeyC','KeyW']],['backward',['KeyS']],['strafe',['KeyA']]]){
  proof.states[name]=await E.ev(`for(const k of ${JSON.stringify(keys)})__key(k,true);__step(100);
  const samples=[];for(let i=0;i<80;i++){__step(1);samples.push(sampleArms());}return samples;`);
  for(const [view,v] of [['side',{cam:[3.3,1.1,.15],look:[0,.8,0],fov:32}],['front',{cam:[.3,1.2,3.3],look:[0,.8,0],fov:32}]]){
   for(let beat=0;beat<4;beat++){await E.ev(`__step(10);__view(${JSON.stringify(v)});__step(1);return true;`);await E.page.screenshot(`${dir}/${tag}/${name}-${view}-${beat}.png`);}
  }
  await E.ev(`for(const k of ${JSON.stringify(keys)})__key(k,false);__step(110);return true;`);
 }
 proof.transition=await E.ev(`__key('KeyW',true);__step(100);__key('ShiftLeft',true);const samples=[];
 for(let i=0;i<40;i++){__step(1);samples.push(sampleArms());}__key('ShiftLeft',false);
 for(let i=0;i<40;i++){__step(1);samples.push(sampleArms());}__key('KeyW',false);
 for(let i=0;i<50;i++){__step(1);samples.push(sampleArms());}return samples;`);
 // Real update pipeline and keys, fixed 60 Hz clock; movement pinned for comparison.
 const video=await E.ev(`__key('KeyW',false);__key('ShiftLeft',false);__step(100);
 const chunks=[],rec=new MediaRecorder(T.renderer.domElement.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6000000});
 rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start();
 for(let i=0;i<660;i++){if(i===40)__key('KeyW',true);if(i===220)__key('ShiftLeft',true);if(i===460)__key('ShiftLeft',false);if(i===580)__key('KeyW',false);
 const v=i<330?{cam:[3.3,1.1,.15],look:[0,.8,0],fov:32}:{cam:[2.6,1.7,2.6],look:[0,.8,0],fov:32};
 __view(v);__step(1);await new Promise(r=>setTimeout(r,1000/60));}rec.stop();await done;
 const blob=new Blob(chunks,{type:rec.mimeType});return await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);reader.readAsDataURL(blob);});`,30000);
 fs.writeFileSync(`${dir}/${tag}.webm`,Buffer.from(video,'base64'));
 proof.armed=await E.ev(`T.toggleHolster();__step(140);return {unarmed:T.isUnarmed(),sample:sampleArms()};`);
 proof.errors=E.page.errors;
 fs.writeFileSync(`${dir}/${tag}-proof.json`,JSON.stringify(proof,null,2)+'\n');
 for(const name of ['walk','run']){const samples=proof.states[name],hs=samples.map(x=>x.hands);console.log(name,JSON.stringify(['L','R'].map((side,j)=>({side,arm:[Math.min(...hs.map(h=>h[j].arm[0])),Math.max(...hs.map(h=>h[j].arm[0]))],thigh:[Math.min(...hs.map(h=>h[j].thigh)),Math.max(...hs.map(h=>h[j].thigh))],palmFwd:[Math.min(...hs.map(h=>h[j].palm[2])),Math.max(...hs.map(h=>h[j].palm[2]))]}))));}
 console.log(tag,JSON.stringify({loadSeconds:E.loadSec,errors:proof.errors}));
}finally{await E.close();}
process.exit(0);

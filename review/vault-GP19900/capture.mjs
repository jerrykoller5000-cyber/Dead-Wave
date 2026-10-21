import fs from 'node:fs';import {Engine as Staged} from './camera.mjs';import {Engine as Live} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),tag=before?'before':'after',dir='review/vault-GP19900',E=new (before?Live:Staged)({training:true,warm:'none',size:'1000x750'}),proof={};
let clock=fs.readFileSync('tools/posesheet.mjs','utf8').match(/const PAGE = String\.raw`([\s\S]*?)`;/)[1]
 .replace('=> window.dispatchEvent(new KeyboardEvent','=> document.body.dispatchEvent(new KeyboardEvent')
 .replace('p.x = S.x; p.z = S.z; ','');
try{
 await E.open();proof.loadSec=E.loadSec;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.grantAllWeapons();if(T.isUnarmed())T.toggleHolster();T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));await wait(500);T.player.position.set(-27,-200,-631.4);T.setVelDbg(0,0);window.__S={x:-27,y:-200,z:-631.4};T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));`);
 await E.shoot({cam:{x:-23.6,y:-196.6,z:-628,tx:-27,ty:-198.7,tz:-630.3,fov:38},out:dir+'/'+tag+'-setup.png'});
 await E.page.evaluate(clock);await new Promise(r=>setTimeout(r,150));
 const data=await E.ev(`const chunks=[],rec=new MediaRecorder(T.renderer.domElement.captureStream(60),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6000000});rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start();
  for(const type of ['sandbag','barricade','railing']) {
   for(const b of [...T.builds])T.removeBuild(b,true);T.player.position.set(-27,-200,-631.4);T.setVelDbg(0,0);${before?'':'T.vaultDbg.hold(null);'}
   const b=T.spawnBuild(type,-27,-631);R.caption('${tag.toUpperCase()} - '+type.toUpperCase());T.setMouseFireDbg(false);__step(20);
   for(let i=0;i<88;i++) {
    if(i===15)__key('Space',true);if(i===16)__key('Space',false);if(i===22)T.setMouseFireDbg(true);if(i===51)T.setMouseFireDbg(false);
    __step(1);await new Promise(r=>setTimeout(r,1000/60));
   }
  }
  rec.stop();await done;const blob=new Blob(chunks,{type:rec.mimeType});return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});`,15000);
 fs.writeFileSync(dir+'/'+tag+'.webm',Buffer.from(data,'base64'));proof.errors=E.page.errors;
 console.log(tag,JSON.stringify(proof));
}finally{fs.writeFileSync(dir+'/'+tag+'-capture-proof.json',JSON.stringify({...proof,errors:E.page?.errors},null,2));await E.close();}process.exit(0);

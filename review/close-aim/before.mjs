import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1440x900'});
try {
 await E.open();
 const cam={x:4,y:-191.5,z:-633,tx:0,ty:-199.1,tz:-643,fov:42};
 await E.run({cmd:'shot',target:'player',cam,out:'review/close-aim/before-far.png',pre:`R.release();T.trainingDbg.clear();T.player.position.set(0,-200,-643);T.grantAllWeapons();for(const k of ['helmet','vest','pads'])T.setGearDbg(k);T.applyGearVisibility();T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));T.setAimYawDbg(0);T.aimTarget.set(0,-198.9,-628);await wait(900);`});
 const result=await E.run({cmd:'eval',code:`
 const p=T.player.position,canvas=T.renderer.domElement,r=canvas.getBoundingClientRect(),samples=[];
 for(const d of [.05,.2,.4,.6,.9,1.2,1.5]){
  const a=new T.THREE.Vector3(p.x,p.y,p.z+d).project(T.camera);
  canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+(a.x+1)*r.width/2,clientY:r.top+(1-a.y)*r.height/2,bubbles:true}));
  await wait(180);const gun=T.weaponMeshes?.ak||T.weaponDbg?.ak;
  const dir=T.getAimDirDbg();samples.push({distance:d,raw:T.aimTarget.clone(),dir:{x:dir.x,y:dir.y,z:dir.z}});
 }
 return {samples};`});
 fs.writeFileSync('review/close-aim/before-proof.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 await E.run({cmd:'shot',target:'player',cam,out:'review/close-aim/before-close.png',pre:`const p=T.player.position,v=new T.THREE.Vector3(p.x,p.y,p.z+.4).project(T.camera),c=T.renderer.domElement,r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+(v.x+1)*r.width/2,clientY:r.top+(1-v.y)*r.height/2,bubbles:true}));await wait(220);`});
}finally{await E.close();}
process.exit(0);

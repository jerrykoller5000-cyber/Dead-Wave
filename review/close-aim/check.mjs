import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1440x900'});
try {
 await E.open();
 const cam={x:4,y:-191.5,z:-633,tx:0,ty:-199.1,tz:-643,fov:42};
 await E.run({cmd:'shot',target:'player',cam,out:'review/close-aim/after-far.png',pre:`R.release();T.trainingDbg.clear();T.player.position.set(0,-200,-643);T.grantAllWeapons();for(const k of ['helmet','vest','pads'])T.setGearDbg(k);T.applyGearVisibility();T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));T.setAimYawDbg(0);T.aimTarget.set(0,-198.9,-628);await wait(900);`});
 const result=await E.run({cmd:'eval',timeout:90000,code:`
 const p=T.player.position,canvas=T.renderer.domElement,r=canvas.getBoundingClientRect(),checks=[],samples=[];
 const ok=(v,m)=>{checks.push({pass:!!v,what:m});if(!v)throw Error(m);};
 window.closeAimErrors=[];window.addEventListener('error',e=>closeAimErrors.push(e.message));
 const pointer=(world)=>{const a=world.clone().project(T.camera);canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+(a.x+1)*r.width/2,clientY:r.top+(1-a.y)*r.height/2,bubbles:true}));};
 for(const d of [.05,.2,.4,.6,.9,1.2,1.5]){pointer(new T.THREE.Vector3(p.x,p.y,p.z+d));await wait(180);const point=T.getWeaponAimDbg(),dir=T.getAimDirDbg();samples.push({d,raw:T.aimTarget.clone(),point:point.clone(),dir:dir.clone()});ok(dir.y<.35&&Number.isFinite(dir.x),'close cursor has finite comfortable shot direction at '+d);ok(Math.hypot(point.x-p.x,point.z-p.z)>=2.24,'near aim stays beyond the muzzle at '+d);}
 pointer(new T.THREE.Vector3(p.x,p.y+1.05,p.z));await wait(150);ok(T.aimSafetyDbg().self,'cursor over torso detects the marine before the floor');const yaw=T.aimSafetyDbg().yaw;
 pointer(new T.THREE.Vector3(p.x+.08,p.y+1.5,p.z));await wait(150);ok(Math.abs(T.aimSafetyDbg().yaw-yaw)<.01,'cursor across own head does not flip facing');
 canvas.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));
 document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit0',bubbles:true}));
 const matrix=[];
 for(const w of T.WEAPON_ORDER){
  T.setWeapon(T.WEAPON_ORDER.indexOf(w));await wait(750);
  for(const d of [-.2,0,.3,1.2]){
   T.setAimYawDbg(0);T.aimTarget.set(p.x,p.y,p.z+d);await wait(150);
   const gun=T.weaponMeshes[w],f=new T.THREE.Vector3(0,0,1).applyQuaternion(gun.getWorldQuaternion(new T.THREE.Quaternion())),safe=T.getWeaponAimDbg();
   const muzzle=gun.localToWorld((gun.userData.muzzleLocal||new T.THREE.Vector3(0,0,1)).clone());
   const grip=gun.localToWorld(new T.THREE.Vector3(...T.getShoulderDbg().holds[w].grip));
   const hand=T.handsDbg.gripPoint('R');const error=hand.distanceTo(grip);
   matrix.push({weapon:w,d,forward:f.z,muzzleY:muzzle.y-p.y,handError:error});
   ok(f.z>.45,w+' cannot point back through marine at '+d);
   ok(muzzle.y>p.y+.25,w+' muzzle stays above floor at '+d);
   ok(error<.045,w+' firing hand remains attached at '+d+' ('+error.toFixed(4)+')');
  }
 }
 T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));T.setAimYawDbg(0);T.aimTarget.set(p.x+4,p.y+2,p.z+15);await wait(250);ok(T.getWeaponAimDbg().distanceTo(T.aimTarget)<1e-8,'ordinary distant aim is unchanged');
 T.setWeapon(T.WEAPON_ORDER.indexOf('sniper'));T.aimTarget.set(p.x,p.y+1,p.z+20);await wait(800);T.setZoomHeldDbg(true);await wait(1200);ok(T.getWeaponAimDbg().distanceTo(T.aimTarget)<1e-8,'scoped sight line is exact');T.setZoomHeldDbg(false);await wait(1300);
 document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'Digit0',bubbles:true}));
 ok(closeAimErrors.length===0,'zero runtime errors');return {checks,matrix,samples,errors:closeAimErrors};`});
 fs.writeFileSync('review/close-aim/live-proof.json',JSON.stringify({...result,loadSeconds:E.loadSec,renderer:E.renderer},null,2)+'\n');assert(result.ok,result.error);assert(result.value.checks.every(c=>c.pass));console.log('PASS '+result.value.checks.length+' live assertions across '+result.value.matrix.length+' weapon/distance combinations; zero errors');
 await E.run({cmd:'shot',target:'player',cam,out:'review/close-aim/after-close.png',pre:`const p=T.player.position;T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));T.setAimYawDbg(0);await wait(600);const v=new T.THREE.Vector3(p.x,p.y,p.z+.4).project(T.camera),c=T.renderer.domElement,r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+(v.x+1)*r.width/2,clientY:r.top+(1-v.y)*r.height/2,bubbles:true}));await wait(220);`});
 await E.run({cmd:'shot',target:'player',cam:{x:2,y:-195.8,z:-638.8,tx:0,ty:-199.2,tz:-643,fov:35},out:'review/close-aim/after-detail.png'});
}finally{await E.close();}
process.exit(0);

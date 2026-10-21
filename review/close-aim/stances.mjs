import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1440x900'});
try {
 await E.open();
 await E.run({cmd:'shot',target:'player',cam:{x:4,y:-191.5,z:-633,tx:0,ty:-199.1,tz:-643,fov:42},out:'review/close-aim/stance-setup.png',pre:`R.release();T.trainingDbg.clear();T.player.position.set(0,-200,-643);T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('ak'));T.setAimYawDbg(0);T.aimTarget.set(0,-199,-628);await wait(700);`});
 const result=await E.run({cmd:'eval',timeout:60000,code:`
 const p=T.player.position,c=T.renderer.domElement,r=c.getBoundingClientRect(),checks=[],poses=[];
 const ok=(v,m)=>{checks.push({pass:!!v,what:m});if(!v)throw Error(m);};
 const pointer=v=>{const a=v.clone().project(T.camera);c.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+(a.x+1)*r.width/2,clientY:r.top+(1-a.y)*r.height/2,bubbles:true}));};
 const key=(type,code)=>document.body.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
 const measure=w=>{const g=T.weaponMeshes[w],f=new T.THREE.Vector3(0,0,1).applyQuaternion(g.getWorldQuaternion(new T.THREE.Quaternion())),m=g.localToWorld((g.userData.muzzleLocal||new T.THREE.Vector3(0,0,1)).clone()),grip=g.localToWorld(new T.THREE.Vector3(...T.getShoulderDbg().holds[w].grip));return {w,forward:f.z,muzzleY:m.y-p.y,handError:T.handsDbg.gripPoint('R').distanceTo(grip)};};
 key('keydown','Digit0');key('keydown','KeyC');await wait(800);ok(T.getCrouching(),'crouch active');
 for(const w of ['pistol','m4','ak','shotgun','sniper','minigun']){T.setWeapon(T.WEAPON_ORDER.indexOf(w));await wait(750);T.setAimYawDbg(0);pointer(new T.THREE.Vector3(p.x,p.y+.6,p.z));await wait(250);const a=measure(w);poses.push(a);ok(T.aimSafetyDbg().self,w+' crouch cursor over body');ok(a.forward>.45&&a.muzzleY>.2,w+' crouch gun remains forward above floor');ok(a.handError<.045,w+' crouch hand remains attached');c.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));}
 key('keyup','KeyC');await wait(700);T.setWeapon(T.WEAPON_ORDER.indexOf('sniper'));T.setAimYawDbg(0);await wait(900);pointer(new T.THREE.Vector3(p.x,p.y+1.1,p.z));await wait(200);ok(T.aimSafetyDbg().self,'scope starts with cursor over torso');T.setZoomHeldDbg(true);
 for(const ms of [50,150,300,650]){await wait(ms);const a=measure('sniper');poses.push({scopeMs:ms,...a});ok(a.forward>.45,'sniper scope raise stays forward at '+ms);ok(a.handError<.045,'sniper scope raise hand remains attached at '+ms);}
 ok(T.getWeaponAimDbg().distanceTo(T.aimTarget)<1e-8,'scoped ray remains exact after safe raise');T.setZoomHeldDbg(false);await wait(1300);c.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));key('keyup','Digit0');T.resetPerf();await wait(2500);return {checks,poses,perf:T.perfSnapshot()};`});
 fs.writeFileSync('review/close-aim/stance-proof.json',JSON.stringify({...result,loadSeconds:E.loadSec,renderer:E.renderer},null,2)+'\n');assert(result.ok,result.error);console.log('PASS '+result.value.checks.length+' crouch/scope checks; '+JSON.stringify(result.value.perf));
} finally {await E.close();}
process.exit(0);

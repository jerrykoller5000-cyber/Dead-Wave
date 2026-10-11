import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine,jobReq} from '../../tools/camera.mjs';
const engine=new Engine({training:true,warm:'none',size:'1440x900'});
try {
 await engine.open();
 const result=await engine.run({cmd:'eval',timeout:90000,code:`
 R.release();const D=T.trainingDbg,tg=D.tg(),p=T.player.position,checks=[],frames=[];
 window.recoveryErrors=[];window.addEventListener('error',e=>recoveryErrors.push(e.message));
 const ok=(v,m)=>{checks.push({pass:!!v,what:m});if(!v)throw Error(m);};
 const key=(code,up=false)=>document.body.dispatchEvent(new KeyboardEvent(up?'keyup':'keydown',{code,bubbles:true}));
 const front=(i,gap=.8)=>{const b=tg.targets[i].box;p.set((b.minX+b.maxX)/2,tg.floorY,b.minZ-gap);T.setAimYawDbg(0);T.setKnifeCd(0);};
 D.clear();tg.resetTargets();const n0=D.state().hits;
 front(0);key('KeyF');key('KeyF',true);ok(tg.targets[0].state==='falling','F knife strike drops target');
 const count=D.state().hits;T.setKnifeCd(0);key('KeyF');key('KeyF',true);ok(D.state().hits===count,'already dropped target cannot score twice');
 await wait(3300);ok(tg.targets[0].state==='up','knife target rises automatically');
 front(0,4);key('KeyF');key('KeyF',true);ok(tg.targets[0].state==='up','knife misses outside blade reach');
 front(0);T.setAimYawDbg(Math.PI);key('KeyF');key('KeyF',true);ok(tg.targets[0].state==='up','knife misses behind player');
 T.buyMachete();ok(T.isMacheteOwned(),'machete purchased from practice funds');front(1);key('KeyF');key('KeyF',true);ok(tg.targets[1].state==='falling','machete strike drops target');
 await wait(700);T.buyWeapon('chainsaw');T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));front(2);T.setMouseFireDbg(true);T.stepFireDbg(.2);T.setMouseFireDbg(false);ok(tg.targets[2].state==='falling','running chainsaw drops target');
 tg.resetTargets();p.set(0,tg.floorY,tg.origin.z);const t=tg.targets[0],b=t.box;
 T.explodeGrenade({pos:new T.THREE.Vector3((b.minX+b.maxX)/2,tg.floorY+.2,b.minZ+.5),mesh:new T.THREE.Group(),damage:55});
 ok(t.state==='falling','grenade explosion drops target');ok(tg.targets[4].state==='up','blast leaves distant target upright');
 await wait(3300);ok(t.state==='up','blast target rises automatically');
 T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));tg.resetTargets();front(0,5.5);T.setGrenadesDbg(2);
 T.aimTarget.set((b.minX+b.maxX)/2,tg.floorY,b.minZ);key('KeyG');await wait(40);key('KeyG',true);
 let thrown=false,landed=false;for(let i=0;i<40;i++){T.aimTarget.set((b.minX+b.maxX)/2,tg.floorY,b.minZ);if(T.grenadesInFlight.length)thrown=true;if(t.state!=='up')landed=true;await wait(60);}
 ok(thrown&&T.grenadeArcDbg().n===1,'G key releases a carried grenade');ok(landed,'player-thrown grenade knocks down pop-up target');
 T.resetPerf();await wait(1500);const idlePerf=T.perfSnapshot();T.resetPerf();
 D.blackout();key('KeyW');key('KeyF');key('KeyF',true);key('KeyG');key('KeyG',true);
 const grenades=T.grenadeArcDbg().n;
 while(D.state().wake){const w=D.state().wake,ud=T.getMarine().userData;frames.push({t:w.t,phase:w.phase,x:p.x,y:p.y,z:p.z,thigh:ud.legLG.rotation.x,knee:ud.kneeLG.rotation.x,weapon:ud.weaponMount.visible});if(w.t>4.6)key('KeyW',true);await wait(70);if(frames.length>180)throw Error('wake timeout');}
 key('KeyW',true);
 ok(['lying','sit','swing','plant','stand'].every(phase=>frames.some(f=>f.phase===phase)),'real frames show all five recovery phases');
 ok(Math.abs(p.x-tg.bed.stand.x)<.05&&Math.abs(p.z-tg.bed.stand.z)<.05&&Math.abs(p.y-tg.floorY)<.02,'recovery finishes beside bed on floor');
 ok(T.grenadeArcDbg().n===grenades,'cannot throw during recovery');
 const steps=frames.slice(1).map((f,i)=>Math.hypot(f.x-frames[i].x,f.y-frames[i].y,f.z-frames[i].z));ok(Math.max(...steps)<.25,'root moves continuously through recovery');
 ok(frames.filter(f=>f.t<4.65).every(f=>!f.weapon),'weapon stowed during recovery');
 ok(!document.querySelector('#trainingBlackout').classList.contains('on'),'blackout clears before stand');
 ok(!D.state().security.read().locked,'recovery leaves security door unlocked');
 ok(recoveryErrors.length===0,'no browser runtime errors');
 return {checks,frames,hits:D.state().hits-n0,errors:recoveryErrors,perf:{idle:idlePerf,recovery:T.perfSnapshot()}};`});
 fs.writeFileSync('review/training-recovery/live-proof.json',JSON.stringify({...result,loadSeconds:engine.loadSec,renderer:engine.renderer},null,2)+'\n');
 assert(result.ok,result.error);assert(result.value.checks.every(c=>c.pass));
 console.log('PASS '+result.value.checks.length+' live checks; '+result.value.frames.length+' recovery frames; zero errors');
 console.log('Perf '+JSON.stringify(result.value.perf));
 await engine.run({cmd:'shot',target:'player',cam:{x:9,y:-194,z:-640,tx:3,ty:-198.8,tz:-628,fov:48},out:'review/training-recovery/after-targets.png',pre:`const D=T.trainingDbg,tg=D.tg(),b=tg.targets[0].box;tg.resetTargets();T.player.position.set((b.minX+b.maxX)/2,tg.floorY,b.minZ-.8);T.setAimYawDbg(0);T.setKnifeCd(0);T.knifeAttack();const c=tg.targets[1].box;T.explodeGrenade({pos:new T.THREE.Vector3((c.minX+c.maxX)/2,tg.floorY+.2,c.minZ+.5),mesh:new T.THREE.Group(),damage:55});await wait(250);`});
 const cam={x:-37.2,y:-196.7,z:-646.8,tx:-40.6,ty:-199.05,tz:-650,fov:42};
 const setup=await engine.run({cmd:'eval',code:"document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'Escape',bubbles:true}));T.trainingDbg.blackout(); return true;"});assert(setup.ok);
 const times=[1.2,2.25,3.15,3.75,4.35,5];
 await engine.run({cmd:'eval',code:'T.renderer.setAnimationLoop(()=>{T.camera.position.set(-37.2,-196.7,-646.8);T.camera.lookAt(new T.THREE.Vector3(-40.6,-199.05,-650));T.camera.fov=42;T.camera.updateProjectionMatrix();T.renderFrame();});return true;'});
 const pics=await engine.run(jobReq({cols:3,out:'review/training-recovery',shots:times.map((t,i)=>({target:'player',cam,out:'review/training-recovery/after-bed-'+i+'.png',caption:['Wake','Sit up','Swing legs','Plant boots','Stand','Ready'][i],pre:'T.trainingDbg.state().wake.t='+t+';T.trainingDbg.update(0);'}))}));
 fs.writeFileSync('review/training-recovery/shots-proof.json',JSON.stringify(pics,null,2)+'\n');assert(pics.ok,pics.error);
 console.log('PASS recovery phase screenshots');
}finally{await engine.close();}
process.exit(0);

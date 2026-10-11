import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),tag=before?'before':'after';
const E=new Engine({training:true,warm:'none',size:'1440x900'});
const cam={x:3,y:-195,z:-636,tx:0,ty:-198.6,tz:-643,fov:44};
try {
 await E.open();
 await E.run({cmd:'shot',target:'player',cam,out:`review/marine-jump/${tag}-idle.png`,pre:`R.release();T.trainingDbg.clear();T.player.position.set(0,-200,-643);T.setAimYawDbg(0);T.aimTarget.set(0,-198.9,-628);T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));await wait(800);`});
 const result=await E.run({cmd:'eval',timeout:30000,code:`
 const samples=[],shots=[],keys=(type,code)=>document.body.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
 window.jumpErrors=[];window.addEventListener('error',e=>jumpErrors.push(e.message));
 keys('keydown','Digit0');const start=T.getSimTime(),floor=T.player.position.y;let i=0;const times=[.04,.16,.42,.73,.95,1.2];
 keys('keydown','Space');
 while(T.getSimTime()-start<3){await wait(15);const p=T.player.position,m=T.getMarine(),u=m.userData,P=T.smoothDbg.pose(),v=T.smoothDbg.vel();
 const s={t:T.getSimTime()-start,y:p.y-floor,vy:v.y,dip:P.bodyDip,landT:P.landT,knees:[u.kneeLG.rotation.x,u.kneeRG.rotation.x],thighs:[u.legLG.rotation.x,u.legRG.rotation.x],boots:[u.ankleLG.getWorldPosition(new T.THREE.Vector3()).y-floor,u.ankleRG.getWorldPosition(new T.THREE.Vector3()).y-floor],jump:T.jumpFeelDbg?T.jumpFeelDbg():null};samples.push(s);
 if(i<times.length&&s.t>=times[i]){T.renderer.render(T.scene,T.camera);shots.push({time:times[i],actual:s.t,png:T.renderer.domElement.toDataURL('image/png')});i++;}}
 keys('keyup','Space');await wait(850);keys('keyup','Digit0');
 return {samples,shots,errors:jumpErrors};`});
 assert(result.ok,result.error);const {shots,...proof}=result.value;
 for(const s of shots)fs.writeFileSync(`review/marine-jump/${tag}-${s.time.toFixed(2)}.png`,Buffer.from(s.png.split(',')[1],'base64'));
 const launches=proof.samples.filter((s,i,a)=>s.vy>4&&(i===0||a[i-1].vy<=0)).length;
 fs.writeFileSync(`review/marine-jump/${tag}-proof.json`,JSON.stringify({...proof,launches,cam,loadSeconds:E.loadSec,renderer:E.renderer},null,2)+'\n');
 console.log(JSON.stringify({tag,launches,maxHeight:Math.max(...proof.samples.map(s=>s.y)),minDip:Math.min(...proof.samples.map(s=>s.dip)),errors:proof.errors}));
 if(!before){assert.equal(launches,1,'held Space must not repeat');assert.equal(proof.errors.length,0);}
} finally {await E.close();}
process.exit(0);

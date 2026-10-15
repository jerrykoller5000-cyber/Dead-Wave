import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const dir='review/range-barrier-GP19907',E=new Engine({training:true,warm:'none',size:'1400x900'}),resume=process.argv.includes('--resume'),proof=resume?JSON.parse(fs.readFileSync(dir+'/native-proof.json','utf8')):{guns:[],rules:[]};if(resume)proof.guns=proof.guns.filter(g=>g.s.score>0);
let clock=fs.readFileSync('tools/posesheet.mjs','utf8').match(/const PAGE = String.raw`([\s\S]*?)`;/)[1];
clock=clock.replace(/const pin = \(\) => \{[^\n]*\};/,"const pin = () => {if(!window.__freeMove){p.x=S.x;p.z=S.z;}if(window.__target){T.aimTarget.copy(window.__target);T.setAimYawDbg(Math.atan2(__target.x-p.x,__target.z-p.z));}};").replace("window.dispatchEvent(new KeyboardEvent","document.body.dispatchEvent(new KeyboardEvent");
try{
 await E.open();proof.loadSec=E.loadSec;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.grantAllWeapons();window.DRILLS=(await import('/ui/range-drills.js')).RANGE_DRILLS;window.__S={x:0,y:-200,z:-640.61};window.__target=new T.THREE.Vector3(0,-198.4,-632);`);
 await E.page.evaluate(clock);await E.ev('await wait(100);__step(2);');
 await E.ev(`window.begin=(w,id)=>{T.rangeDbg.exit();__S.x=0;__S.z=-640.61;T.player.position.set(__S.x,-200,__S.z);T.setVelDbg(0,0);const d=DRILLS.find(d=>d.weapon===w&&(!id||d.id===id));const r=T.rangeDbg.start(d);__step(545);return {r,s:T.rangeDbg.read()};};window.aim=(i,zone='bull')=>{const t=T.trainingDbg.tg().targets[5+i];__target.set(t.x,-200+2.9-(zone==='head'?.35:1.3),-640+t.z);T.resetSprayDbg();__step(4);};window.fire=(n=12)=>{T.setMouseFireDbg(true);__step(n);T.setMouseFireDbg(false);__step(50);};`);

proof.grenades=[];
for(const z of [-640.61,-642.5]){
const r=await E.ev("T.rangeDbg.exit();__S.x=0;__S.z="+z+";T.player.position.set(0,-200,__S.z);T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));__target.set(0,-198.4,-632);__step(90);T.setGrenadesDbg(4);T.startGrenadeCharge();__step(12);const arc=T.grenadeArcDbg();T.releaseGrenadeCharge();let maxZ=-Infinity,crossed=false;for(let j=0;j<100;j++){__step(1);for(const g of T.grenadesInFlight){maxZ=Math.max(maxZ,g.pos.z);if(g.pos.z>-639.18)crossed=true;}}return {z:"+z+",arc,crossed,maxZ,last:T.grenadeArcDbg().last};");proof.grenades.push(r);console.log(JSON.stringify(r));assert(r.crossed,'a short hand throw passes the shooting slot');
}
proof.rear=await E.ev(`T.rangeDbg.exit();const tg=T.trainingDbg.tg();tg.resetTargets();const t=tg.targets[2],before=T.trainingDbg.state().score;const round={prev:{x:t.x,y:-198.4,z:tg.origin.z+t.z+1},pos:{x:t.x,y:-198.4,z:tg.origin.z+t.z-1},hit:false};const processed=T.trainingDbg.round(round);tg.update(.15);return {processed,hit:round.hit,fall:t.fall,rotation:t.pivot.rotation.x,scoreBefore:before,scoreAfter:T.trainingDbg.state().score};`);
assert(proof.rear.processed&&proof.rear.hit);assert.equal(proof.rear.fall,-1);assert(proof.rear.rotation<0);assert(proof.rear.scoreAfter>proof.rear.scoreBefore);console.log('PASS rear-origin target round scores and falls toward the line');
proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
}finally{fs.writeFileSync(dir+'/live-grenade-proof.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

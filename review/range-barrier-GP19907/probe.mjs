import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from './camera.mjs';
const dir='review/range-barrier-GP19907',E=new Engine({training:true,warm:'none',size:'1400x900'}),resume=process.argv.includes('--resume'),proof=resume?JSON.parse(fs.readFileSync(dir+'/weapons-proof.json','utf8')):{guns:[],rules:[]};if(resume)proof.guns=proof.guns.filter(g=>g.s.score>0);
let clock=fs.readFileSync('tools/posesheet.mjs','utf8').match(/const PAGE = String.raw`([\s\S]*?)`;/)[1];
clock=clock.replace(/const pin = \(\) => \{[^\n]*\};/,"const pin = () => {if(!window.__freeMove){p.x=S.x;p.z=S.z;}if(window.__target){T.aimTarget.copy(window.__target);T.setAimYawDbg(Math.atan2(__target.x-p.x,__target.z-p.z));}};").replace("window.dispatchEvent(new KeyboardEvent","document.body.dispatchEvent(new KeyboardEvent");
try{
 await E.open();proof.loadSec=E.loadSec;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.grantAllWeapons();window.DRILLS=(await import('/review/range-barrier-GP19907/range-drills.js')).RANGE_DRILLS;window.__S={x:0,y:-200,z:-640.61};window.__target=new T.THREE.Vector3(0,-198.4,-632);`);
 await E.page.evaluate(clock);await E.ev('await wait(100);__step(2);');
 await E.ev(`window.begin=(w,id)=>{T.rangeDbg.exit();__S.x=0;__S.z=-640.61;T.player.position.set(__S.x,-200,__S.z);T.setVelDbg(0,0);const d=DRILLS.find(d=>d.weapon===w&&(!id||d.id===id));const r=T.rangeDbg.start(d);__step(545);return {r,s:T.rangeDbg.read()};};window.aim=(i,zone='bull')=>{const t=T.trainingDbg.tg().targets[5+i];__target.set(t.x,-200+2.9-(zone==='head'?.35:1.3),-640+t.z);T.resetSprayDbg();__step(4);};window.fire=(n=12)=>{T.setMouseFireDbg(true);__step(n);T.setMouseFireDbg(false);__step(50);};`);

for(const w of ['pistol','m4','ak','shotgun','sniper','launcher','minigun','flamer','chainsaw']) {
const r=await E.ev("begin('"+w+"');const i=T.rangeDbg.read().plan.ids[0];aim(i);__step(120);const m=T.getMuzzleWorld().clone();const tr=await import('/review/range-barrier-GP19907/training-ballistics.js');const hit=tr.traceTraining(T.trainingDbg.tg(),m,__target);fire(30);return {w:'"+w+"',m:m.toArray(),target:__target.toArray(),hit,stats:T.rangeDbg.read().stats};"); console.log(JSON.stringify(r));
}
}finally{await E.close();}process.exit(0);

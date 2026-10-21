import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {Engine as Live} from '../../tools/camera.mjs';
const dir='review/range-GP19901',hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const spec=JSON.parse(fs.readFileSync(dir+'/patches.json','utf8')).find(p=>p.file==='index.html'),applied=JSON.parse(fs.readFileSync(dir+'/applied.json','utf8')).find(p=>p.file==='index.html');
let baseline=fs.readFileSync('index.html','utf8');assert.equal(hash(baseline),applied.afterHash,'live source changed: review before building diagnostic baseline');
for(const p of [...spec.patches].reverse()){assert(baseline.includes(p.newText));baseline=baseline.replace(p.newText,p.oldText);}
assert.equal(hash(baseline),applied.baseHash,'baseline must exactly recover the pre-integration source');
fs.writeFileSync(dir+'/baseline-reentry.html',baseline.replace('<head>','<head><base href="/">'),'utf8');
fs.writeFileSync(dir+'/baseline-camera.mjs',fs.readFileSync(dir+'/camera.mjs','utf8').replace('/review/range-GP19901/index.html?','/review/range-GP19901/baseline-reentry.html?'),'utf8');
const {Engine:Before}=await import('./baseline-camera.mjs'),proof={baselineHash:applied.baseHash,liveHash:applied.afterHash};
const measure=`const samples=[];for(let j=0;j<3;j++){let last=performance.now(),a=[];for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();a.push(now-last);last=now;}samples.push({fps:1000/(a.reduce((a,b)=>a+b,0)/a.length),worst:Math.max(...a),hitches:a.filter(x=>x>50).length});}return {samples,alive:T.trainingDbg.alive(),memory:T.renderer.info.memory};`;
for(const [name,C]of [['before',Before],['live',Live]]){
 const E=new C({training:true,warm:'none',size:'1400x900'}),p=proof[name]={};
 try{
  await E.open();
  await E.ev(`R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));if(T.isUnarmed())T.toggleHolster();T.setDualOwnedDbg('pistol');await wait(650);T.toggleDualWieldDbg();T.setMagazinesDbg('pistol',4,[3,2],5);T.trainingDbg.leave();T.trainingDbg.enter();await wait(1800);T.player.position.set(-27,-200,-631.4);T.setVelDbg(0,0);for(let i=0;i<48;i++){const z=T.spawnZombie(-35+(i%8)*2.5,-622+Math.floor(i/8),'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=-200;}T.setShotView({x:-15,y:-176,z:-658,tx:-27,ty:-199,tz:-628,fov:48});await wait(1800);`);
  p.perf=await E.ev(measure);assert.equal(p.perf.alive,48);p.errors=E.page.errors;assert.equal(p.errors.length,0);console.log(name.toUpperCase(),JSON.stringify(p));
 }finally{fs.writeFileSync(dir+'/reentry-perf-proof.json',JSON.stringify(proof,null,2));await E.close();}
}
process.exit(0);

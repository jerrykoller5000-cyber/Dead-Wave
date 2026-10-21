import fs from 'node:fs';
import {Engine as Live} from '../../tools/camera.mjs';
import {Engine as Staged} from './camera.mjs';
import {scan,violations} from '../../tools/check-players.mjs';
const dir='review/vault-GP19900',proof={};
const bad=violations(scan(fs.readFileSync(dir+'/index.html','utf8')));
if(bad.length)throw Error(JSON.stringify(bad));
console.log('PASS staged player-read preflight');
for(const [name,C] of [['before',Live],['after',Staged]]) {
 const E=new C({training:true,warm:'none',size:'1400x900'}),p=proof[name]={};
 try{
  await E.open();p.loadSec=E.loadSec;
  p.perf=await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.player.position.set(-27,-200,-631.4);T.setVelDbg(0,0);for(let i=0;i<48;i++){const z=T.spawnZombie(-35+(i%8)*2.5,-622+Math.floor(i/8),'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=-200;}T.setShotView({x:-15,y:-176,z:-658,tx:-27,ty:-199,tz:-628,fov:48});await wait(1800);const samples=[];for(let j=0;j<3;j++){let last=performance.now(),a=[];for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();a.push(now-last);last=now;}samples.push({fps:1000/(a.reduce((a,b)=>a+b,0)/a.length),worst:Math.max(...a),hitches:a.filter(x=>x>50).length});}return {samples,alive:T.trainingDbg.alive()};`);
  await E.page.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));
  for(const id of ['t142','t215']) {
   p[id]=await E.page.evaluate(fs.readFileSync('tools/tests/'+id+'.js','utf8'),90000);
   console.log(name+' '+id+'\n'+p[id]);
  }
  p.errors=E.page.errors;console.log(name,JSON.stringify({loadSec:p.loadSec,perf:p.perf,errors:p.errors}));
 }finally{fs.writeFileSync(dir+'/audit-proof.json',JSON.stringify(proof,null,2));await E.close();}
}
process.exit(0);

import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine as Live} from '../../tools/camera.mjs';import {Engine as Staged} from './camera.mjs';import {scan,violations} from '../../tools/check-players.mjs';
const dir='review/range-GP19901',proof={};assert.deepEqual(violations(scan(fs.readFileSync(dir+'/index.html','utf8'))),[]);console.log('PASS staged player-read preflight');
const measure=`const samples=[];for(let j=0;j<3;j++){let last=performance.now(),a=[];for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();a.push(now-last);last=now;}samples.push({fps:1000/(a.reduce((a,b)=>a+b,0)/a.length),worst:Math.max(...a),hitches:a.filter(x=>x>50).length});}return {samples,alive:T.trainingDbg.alive(),draws:T.renderer.info.render.calls};`;
for(const [name,C]of [['before',Live],['after',Staged]]){
 const E=new C({training:true,warm:'none',size:'1400x900'}),p=proof[name]={};
 try{
  await E.open();p.loadSec=E.loadSec;
  await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.player.position.set(0,-200,-650.45);T.setVelDbg(0,0);T.setShotView({x:4,y:-195.5,z:-645,tx:0,ty:-198.8,tz:-651.8,fov:45});await wait(600);`);
  await E.shoot({live:true,ui:true,out:dir+'/station-'+name+'.png'});
  p.station=await E.ev('return T.trainingDbg.action();');if(name==='after')assert.equal(p.station,'rangeConsole');
  if(name==='after'){
   await E.ev(`document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',bubbles:true}));await wait(200);`);p.menu=await E.ev(`return !document.getElementById('rangeConsole').hidden;`);assert(p.menu);await E.shoot({live:true,ui:true,out:dir+'/console-final.png'});
   await E.ev(`T.rangeDbg.exit();T.player.position.set(0,-200,-640.61);T.setVelDbg(0,0);T.setShotView({x:10,y:-184,z:-654,tx:0,ty:-199,tz:-632,fov:48});const d=(await import('/ui/range-drills.js')).RANGE_DRILLS[0];const r=T.rangeDbg.start(d);if(!r.ok)throw Error(r.reason);await wait(1800);`);await E.shoot({live:true,ui:true,out:dir+'/countdown-final.png'});
   await E.ev('await wait(7200);');await E.shoot({live:true,ui:true,out:dir+'/active-final.png'});p.activePerf=await E.ev(measure);await E.ev('T.rangeDbg.exit();');
  }
  await E.ev(`T.player.position.set(-27,-200,-631.4);T.setVelDbg(0,0);for(let i=0;i<48;i++){const z=T.spawnZombie(-35+(i%8)*2.5,-622+Math.floor(i/8),'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=-200;}T.setShotView({x:-15,y:-176,z:-658,tx:-27,ty:-199,tz:-628,fov:48});await wait(1800);`);
  p.perf=await E.ev(measure);assert.equal(p.perf.alive,48);
  await E.page.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));p.t215=await E.page.evaluate(fs.readFileSync('tools/tests/t215.js','utf8'),90000);console.log(name+' t215\n'+p.t215);
  p.errors=E.page.errors;assert.equal(p.errors.length,0);console.log(name,JSON.stringify({loadSec:p.loadSec,perf:p.perf,active:p.activePerf,errors:p.errors}));
 }finally{fs.writeFileSync(dir+'/audit-proof.json',JSON.stringify(proof,null,2));await E.close();}
}
console.log('PASS E console, final screenshots, paired native 48-enemy samples and baseline encoding check');process.exit(0);

import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const phase=process.argv[2]||'before',dir='review/training-perimeter-GP19897';
const E=new Engine({training:true,warm:'none',size:'1600x900'});
try {
 await E.open();await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.player.position.set(-26,-200,-635);T.setVelDbg(0,0);`);
 for(const [name,cam] of [
  ['alarm-side',{x:-14,y:-172,z:-620,tx:-35,ty:-199,tz:-638,fov:48}],
  ['door-side',{x:-35,y:-172,z:-620,tx:-15,ty:-199,tz:-638,fov:48}],
  ['medical-side',{x:-17,y:-174,z:-620,tx:-26,ty:-199,tz:-650,fov:48}]
 ]) await E.shoot({cam,out:dir+'/'+phase+'-'+name+'.png'});
 const perf=await E.ev(`T.trainingDbg.clear();for(let i=0;i<48;i++){let z=T.spawnZombie(-35+(i%8)*2.5,-630+Math.floor(i/8)*2,'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=-200;}T.player.position.set(-26,-200,-641);T.setShotView({x:-15,y:-176,z:-658,tx:-27,ty:-199,tz:-628,fov:48});await wait(1000);let times=[],last=performance.now();for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);let now=performance.now();times.push(now-last);last=now;}return {fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),worst:Math.max(...times),hitches:times.filter(x=>x>50).length,alive:T.trainingDbg.alive(),renderer:T.renderer.info.render};`);
 fs.writeFileSync(dir+'/'+phase+'-capture.json',JSON.stringify({perf,errors:E.page.errors},null,2));console.log(JSON.stringify({phase,perf,errors:E.page.errors}));
} finally {await E.close();}process.exit(0);

// Inspector does not populate the gameplay perf overlay. Measure real rAF intervals.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const out=path.resolve('review/demon-GP19921/performance');fs.mkdirSync(out,{recursive:true});
const E=new Engine({inspect:true,warm:'none',size:'1440x1000'}),report={};
try{
 await E.open();report.loadSeconds=E.loadSec;
 report.crowd=await E.ev(`
   await DWInspect.show('zombie.demon',{mode:'walk'});DWInspect.pause();
   const first=DWInspect.zombie.get(),p=first.mesh.position.clone(),crowd=[first];
   for(let i=1;i<48;i++){const z=T.spawnZombie(p.x-4+(i%8)*1.2,p.z+2+Math.floor(i/8)*1.2,'demon',true,true);if(z){z.trainingZ=true;z.hp=z.maxHp=100000;crowd.push(z);}}
   T.player.position.set(p.x+6,p.y,p.z+4);
   DWInspect.camera({x:p.x+20,y:p.y+16,z:p.z+28,tx:p.x+1,ty:p.y+1.5,tz:p.z+3,fov:48});
   DWInspect.play();await wait(1800);
   const ms=await new Promise(resolve=>{const a=[];let start,last;function tick(t){if(start===undefined)start=t;if(last!==undefined)a.push(t-last);last=t;if(t-start>=6000)resolve(a);else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
   DWInspect.pause();const slow=[...ms].sort((a,b)=>b-a),n=Math.max(1,Math.ceil(ms.length*.01));
   return {spawned:crowd.length,alive:crowd.filter(z=>z.alive).length,frames:ms.length,fps:1000/(ms.reduce((a,b)=>a+b,0)/ms.length),low:1000/(slow.slice(0,n).reduce((a,b)=>a+b,0)/n),worst:slow[0],over50:ms.filter(v=>v>50).length,errors:DWInspect.errors()};
 `,30000);
 assert.equal(report.crowd.spawned,48);assert.equal(report.crowd.alive,48);assert(report.crowd.frames>100);assert.equal(report.crowd.errors.length,0);
 const data=await E.ev('return DWInspect.shot();');fs.writeFileSync(path.join(out,'crowd-48.png'),Buffer.from(data.split(',')[1],'base64'));
 console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await E.close();}

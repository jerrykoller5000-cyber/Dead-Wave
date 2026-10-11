import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const engine=new Engine({training:true,warm:'none',size:'1440x900'});
try {
 await engine.open();
 const result=await engine.run({cmd:'eval',timeout:90000,code:`
 const D=T.trainingDbg,tg=D.tg();D.clear();R.release();T.player.position.set(-24,tg.floorY,-638);
 const source=(await (await fetch('/review/training-props/before-world-training.js')).text()).replace("'./bake.js'",JSON.stringify(new URL('/world/bake.js',location.href).href));
 const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
 const old= (await import(url)).buildTrainingGround(T.THREE,{securityLabel:'SECURITY DOOR'});URL.revokeObjectURL(url);
 for(const k of ['cif','kiosk','armory','hqPanel','skullWindow']) {
   const c=D.state().copies[k]?.copy;if(!c)continue;const clone=c.clone(true),s=old.stations[k];
   clone.position.set(s.x-old.origin.x,0,s.z-old.origin.z);clone.rotation.set(0,s.yaw,0);old.group.add(clone);
 }
 T.scene.add(old.group);old.group.visible=false;
 const measure=async(label,group)=>{tg.group.visible=group===tg.group;old.group.visible=group===old.group;await wait(2000);T.resetPerf();const samples=[];for(let i=0;i<3;i++){await wait(1000);samples.push(T.perfSnapshot());}return {label,samples};};
 const runs=[];
 try {runs.push(await measure('old',old.group));runs.push(await measure('new',tg.group));runs.push(await measure('old-repeat',old.group));runs.push(await measure('new-repeat',tg.group));}
 finally {tg.group.visible=true;old.dispose();}
 return {runs};`});
 assert(result.ok,result.error);
 fs.writeFileSync('review/training-props/performance.json',JSON.stringify({...result,loadSeconds:engine.loadSec},null,2)+'\n','utf8');
 for(const r of result.value.runs)console.log(r.label+' '+(r.samples.reduce((n,p)=>n+p.fps,0)/r.samples.length).toFixed(2)+' fps');
} finally {await engine.close();}

process.exit(0);

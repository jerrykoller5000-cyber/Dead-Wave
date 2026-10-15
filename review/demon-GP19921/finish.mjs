// Finish only the checks not reached by the resumed run. One browser, closed in finally.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const out=path.resolve('review/demon-GP19921/finish');fs.mkdirSync(out,{recursive:true});
const report={},E=new Engine({inspect:true,warm:'none',size:'1440x1000'});
try {
 await E.open();report.loadSeconds=E.loadSec;
 report.death=await E.ev(`
   await DWInspect.show('zombie.demon',{mode:'walk'});DWInspect.pause();
   const z=DWInspect.zombie.get(),mesh=z.mesh;
   DWInspect.zombie.kill();await DWInspect.stepAsync(6);
   return {alive:z.alive,released:z.mesh===null,detached:!mesh.parent,flames:mesh.userData.abilityVisuals.flameAnchors.map(a=>a.visible),errors:DWInspect.errors()};
 `);
 assert.equal(report.death.alive,false);assert(report.death.detached||report.death.flames.every(v=>!v));assert.equal(report.death.errors.length,0);
 report.cached=await E.ev(`await DWInspect.show('zombie.demon',{mode:'statue'});DWInspect.pause();return DWInspect.current();`);
 assert.equal(report.cached.info.tris,13540);assert.equal(report.cached.info.drawables,6);
 console.log('PASS death removes live flame rig; cached rebuild remains 6 draws / 13540 triangles');
 report.catalog=await E.run({cmd:'check',only:['zombie.demon'],outDir:path.join(out,'catalog')});assert(report.catalog.ok);
 console.log('PASS inspector catalog build and picture');
 report.crowd=await E.ev(`
   await DWInspect.show('zombie.demon',{mode:'walk'});DWInspect.pause();
   const first=DWInspect.zombie.get(),p=first.mesh.position.clone(),crowd=[first];
   for(let i=1;i<48;i++){const z=T.spawnZombie(p.x-3+(i%8)*.9,p.z+3+Math.floor(i/8)*.9,'demon',true,true);if(z){z.trainingZ=true;z.hp=z.maxHp=100000;crowd.push(z);}}
   T.player.position.set(p.x+22,p.y,p.z+5);
   DWInspect.camera({x:p.x+13,y:p.y+10,z:p.z+20,tx:p.x+1,ty:p.y+1.5,tz:p.z+4,fov:45});
   DWInspect.play();await wait(2200);T.resetPerf();const samples=[];
   for(let i=0;i<6;i++){await wait(1000);samples.push(T.perfSnapshot());}
   DWInspect.pause();
   return {spawned:crowd.length,alive:crowd.filter(z=>z.alive).length,samples,renderer:{...T.renderer.info.render},errors:DWInspect.errors()};
 `,30000);
 assert.equal(report.crowd.spawned,48);assert.equal(report.crowd.alive,48);assert.equal(report.crowd.errors.length,0);
 const data=await E.ev('return DWInspect.shot();');fs.writeFileSync(path.join(out,'crowd-48.png'),Buffer.from(data.split(',')[1],'base64'));
 console.log('PASS 48 live demons; FPS: '+report.crowd.samples.map(s=>s.fps.toFixed(2)).join(', '));
 console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await E.close();}

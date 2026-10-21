import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Engine } from '../../tools/camera.mjs';
const out=path.resolve('review/demon-GP19921',process.argv[2]||'verified');fs.mkdirSync(out,{recursive:true});
const E=new Engine({inspect:true,warm:'none',size:'1440x1000'});
const report={};
async function shot(name){const data=await E.ev('return DWInspect.shot();');fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));}
try{
 await E.open();report.loadSeconds=E.loadSec;console.log('Inspector ready, one browser: '+E.loadSec+' s');
 report.build=await E.ev(`await DWInspect.show('zombie.demon',{mode:'statue'});DWInspect.pause();return DWInspect.current();`);
 await E.run({cmd:'shot',target:'zombie.demon:statue',view:'three',out:path.join(out,'three.png')});await shot('three');
 for(const view of ['front','left','back']){await E.run({cmd:'shot',target:'zombie.demon:statue',view,out:path.join(out,view+'.png')});await shot(view);}
 report.statue=await E.ev(`
   DWInspect.pause();
   let mesh;T.scene.traverse(o=>{if(o.userData?.abilityVisuals?.typeKey==='demon')mesh=o;});
   if(!mesh)throw Error('No statue demon');
   const rig=mesh.userData.abilityVisuals,geo=rig.cache.flameGeo;
   const sample=()=>Array.from(geo.attributes.position.array);
   const pose=()=>rig.arms.flatMap(a=>[...a.quaternion.toArray(),...a.userData.elbowG.quaternion.toArray()]);
   const a=sample(),p=pose();await wait(200);const b=sample();await DWInspect.stepAsync(12);const c=sample();
   const delta=(x,y)=>Math.max(...x.map((v,i)=>Math.abs(v-y[i])));
   return {pauseDelta:delta(a,b),stepDelta:delta(b,c),poseDelta:delta(p,pose()),vertices:c.length/3,finite:c.every(Number.isFinite),time:DWInspect.time()};
 `);
 assert.equal(report.statue.pauseDelta,0);assert(report.statue.stepDelta>.04);assert.equal(report.statue.poseDelta,0);assert(report.statue.finite);console.log('PASS statue fire moves, pauses and frame-steps without moving arms');
 await E.run({cmd:'shot',target:'zombie.demon:statue',view:'three',out:path.join(out,'flame-0.png')});await shot('flame-0');
 await E.ev('await DWInspect.stepAsync(12);');await shot('flame-1');
 await E.ev('await DWInspect.stepAsync(12);');await shot('flame-2');
 report.live=await E.ev(`
   await DWInspect.show('zombie.demon',{mode:'walk'});DWInspect.pause();
   const z=DWInspect.zombie.get(),u=z.mesh.userData,rig=u.abilityVisuals;
   const snapshots=[];let minChin=Infinity,maxDrift=0,nonFinite=0;
   for(let i=0;i<8;i++){
     await DWInspect.stepAsync(24);z.mesh.updateMatrixWorld(true);
     // Lower face point in torso space; compare with breastplate collar at .455*s.
     const s=rig.scale,v=new T.THREE.Vector3(0,-.18*s,.07*s);u.head.localToWorld(v);u.torso.worldToLocal(v);minChin=Math.min(minChin,v.y/s-.455);
     for(const anchor of rig.flameAnchors){const a=anchor.getWorldPosition(new T.THREE.Vector3()),b=anchor.parent.localToWorld(new T.THREE.Vector3(0,-.354*s,.02*s));maxDrift=Math.max(maxDrift,a.distanceTo(b));}
     z.mesh.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.position&&!Array.from(o.geometry.attributes.position.array).every(Number.isFinite))nonFinite++;});
     snapshots.push({charge:z.chargeT,windup:z.chargeWind,head:u.head.rotation.toArray(),x:z.mesh.position.x});
   }
   return {minChinAboveCollar:minChin,maxAnchorDrift:maxDrift,nonFinite,snapshots,info:DWInspect.current(),errors:DWInspect.errors()};
 `);
 assert(report.live.minChinAboveCollar>0);assert(report.live.maxAnchorDrift<1e-6);assert.equal(report.live.nonFinite,0);assert.equal(report.live.errors.length,0);
 await E.ev("DWInspect.view('three');");await shot('walking');
 report.casting=await E.ev(`
   const z=DWInspect.zombie.get(),rig=z.mesh.userData.abilityVisuals;
   const {updateZombieAbilityVisuals,getZombieAbilityLaunch}=await import('/game/zombie-ability-visuals.js');
   updateZombieAbilityVisuals(z,8,{kind:'fireball',stage:'windup',windupProgress:1});
   z.mesh.updateMatrixWorld(true);
   const launch=new T.THREE.Vector3(),launched=getZombieAbilityLaunch(z,'fireball',launch);
   return {launched,launch:launch.toArray(),rightArm:rig.arms[1].rotation.x,errors:DWInspect.errors()};
 `);
 await shot('casting');assert(report.casting.launched);assert.equal(report.casting.errors.length,0);console.log('PASS walking clearance and actual fireball launch vector');
 report.reactions=await E.ev(`
   const z=DWInspect.zombie.get(),u=z.mesh.userData;
   z.abilityBusy=false;z.chargeWind=.6;z.chargeDX=1;z.chargeDZ=0;
   await DWInspect.stepAsync(8);
   const wind={head:u.head.rotation.toArray(),ember:u.emberMat.emissiveIntensity};
   await DWInspect.stepAsync(38);
   const charge={remaining:z.chargeT,head:u.head.rotation.toArray()};
   DWInspect.zombie.hit('body',1);await DWInspect.stepAsync(8);
   return {wind,charge,hp:z.hp,errors:DWInspect.errors()};
 `);assert.equal(report.reactions.errors.length,0);await shot('charge-reaction');
 report.limbLoss=await E.ev(`
   const z=DWInspect.zombie.get(),{updateZombieAbilityVisuals,getZombieAbilityLaunch}=await import('/game/zombie-ability-visuals.js');
   DWInspect.zombie.lose('armR');await DWInspect.stepAsync(2);
   updateZombieAbilityVisuals(z,12,{kind:'fireball',stage:'windup',windupProgress:1});
   const p=new T.THREE.Vector3(),ok=getZombieAbilityLaunch(z,'fireball',p);
   const rig=z.mesh.userData.abilityVisuals,left=rig.flameAnchors.find(a=>a.userData.armIndex===0).getWorldPosition(new T.THREE.Vector3());
   return {ok,launchDrift:left.distanceTo(p),lost:z.partsLost,visible:rig.flameAnchors.map(a=>a.visible),errors:DWInspect.errors()};
 `);assert(report.limbLoss.ok);assert(report.limbLoss.launchDrift<1e-6);assert.equal(report.limbLoss.errors.length,0);await shot('surviving-hand');
 report.death=await E.ev(`const z=DWInspect.zombie.get(),mesh=z.mesh;DWInspect.zombie.kill();await DWInspect.stepAsync(6);return {alive:z.alive,released:z.mesh===null,detached:!mesh.parent,flames:mesh.userData.abilityVisuals.flameAnchors.map(a=>a.visible),errors:DWInspect.errors()};`);
 assert.equal(report.death.alive,false);assert(report.death.detached||report.death.flames.every(v=>!v));assert.equal(report.death.errors.length,0);
 report.cached=await E.ev(`await DWInspect.show('zombie.demon',{mode:'statue'});DWInspect.pause();return DWInspect.current();`);
 assert.equal(report.cached.info.tris,report.build.info.tris);assert.equal(report.cached.info.drawables,6);
 console.log('PASS charge/reaction, surviving hand, death and cached rebuild');
 report.catalog=await E.run({cmd:'check',only:['zombie.demon'],outDir:path.join(out,'catalog')});assert(report.catalog.ok);
 report.crowd=await E.ev(`
   await DWInspect.show('zombie.demon',{mode:'walk'});DWInspect.pause();
   const first=DWInspect.zombie.get(),p=first.mesh.position.clone(),crowd=[first];
   for(let i=1;i<48;i++){const z=T.spawnZombie(p.x-3+(i%8)*.9,p.z+3+Math.floor(i/8)*.9,'demon',true,true);if(z){z.trainingZ=true;z.hp=z.maxHp=100000;crowd.push(z);}}
   T.player.position.set(p.x+22,p.y,p.z+5);
   DWInspect.camera({x:p.x+13,y:p.y+10,z:p.z+20,tx:p.x+1,ty:p.y+1.5,tz:p.z+4,fov:45});
   DWInspect.play();await wait(2200);T.resetPerf();const samples=[];
   for(let i=0;i<6;i++){await wait(1000);samples.push(T.perfSnapshot());}
   DWInspect.pause();
   return {spawned:crowd.length,alive:crowd.filter(z=>z.alive).length,samples,renderer:T.renderer.info.render,errors:DWInspect.errors()};
 `,30000);assert.equal(report.crowd.spawned,48);assert.equal(report.crowd.errors.length,0);await shot('crowd-48');
 console.log('PASS 48-demon live crowd, FPS samples: '+report.crowd.samples.map(s=>s.fps.toFixed(2)).join(', '));
 console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await E.close();}

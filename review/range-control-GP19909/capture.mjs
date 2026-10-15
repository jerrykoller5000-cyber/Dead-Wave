import fs from 'node:fs';import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),{Engine}=await import(before?'./camera-before.mjs':'../../tools/camera.mjs');
const dir='review/range-control-GP19909',prefix=before?'before':'after',E=new Engine({training:true,warm:'none',size:'1440x900'}),proof={mode:prefix};
try{
 await E.open();proof.load=E.loadSec;await E.ev(`R.release();T.trainingDbg.panel().close();T.AudioSys.setMuted(true);`);
 for(const[name,cam,look,fov]of[
  ['overview',[2.5,-195.5,-640.8],[-3.5,-198.75,-647],60],
  ['controls',[-3.8,-198,-645.2],[-7.85,-198.6,-645.2],55],
  ['detail',[-5.6,-198.05,-643.8],[-7.865,-198.6,-644.6],38],
 ])await E.run({cmd:'shot',cam:{x:cam[0],y:cam[1],z:cam[2],tx:look[0],ty:look[1],tz:look[2],fov},out:dir+'/'+prefix+'-'+name+'.png'});
 if(!before){proof.model=await E.ev("const tg=T.trainingDbg.tg(),g=tg.group.getObjectByName('training-range-console');let meshes=0,triangles=0;g.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});const p=tg.stations.rangeConsole.front;T.player.position.set(p.x,tg.floorY,p.z);T.setVelDbg(0,0);return {meshes,triangles,action:T.trainingDbg.action()};");assert.equal(proof.model.action,'rangeConsole');assert(proof.model.meshes<=6);
  proof.cutaway=await E.ev("const tg=T.trainingDbg.tg(),s=tg.stations.rangeConsole;T.player.position.set(s.front.x,tg.floorY,s.front.z);T.camera.position.set(s.x-2,tg.floorY+3,s.z);T.trainingDbg.update(.5);const g=tg.group.getObjectByName('training-range-console');return g.children.filter(o=>o.isMesh).map(o=>({opacity:o.material.opacity,transparent:o.material.transparent}));");assert(proof.cutaway.every(m=>m.transparent&&m.opacity<.1));console.log('PASS relocated E interaction and all model materials cut away');}
 proof.stations=await E.ev(`return {console:T.trainingDbg.tg().stations.rangeConsole,lights:T.trainingDbg.tg().stations.lightSwitch};`);
 await E.ev('const tg=T.trainingDbg.tg();T.player.position.set(tg.spawn.x,tg.floorY,tg.spawn.z);T.setVelDbg(0,0);R.release();T.resetPerf();');await new Promise(r=>setTimeout(r,3500));proof.performance=await E.ev('return T.perfSnapshot();');
 assert.equal(E.page.errors.length,0);console.log('PASS '+prefix+' shots and geometry; errors0');
}finally{proof.errors=E.page?.errors;fs.writeFileSync(dir+'/'+prefix+'-proof.json',JSON.stringify(proof,null,2));await E.close();}process.exit(0);

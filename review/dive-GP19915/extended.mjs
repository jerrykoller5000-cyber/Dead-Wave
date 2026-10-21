import fs from 'node:fs';import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const dir='review/dive-GP19915',E=new Engine({training:true,warm:'none',size:'1280x900'}),proof={runs:[]};
const source=fs.readFileSync(`${dir}/native.mjs`,'utf8');
const clockPart=source.slice(source.indexOf('let clock='),source.indexOf('try{'));
const clock=new Function('fs',`${clockPart};return clock;`)(fs);
try{
 await E.open();await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.grantAllWeapons();T.runDevCommand('godmode');window.__S={x:0,y:-200,z:-645};window.__aimTarget=new T.THREE.Vector3(0,-198.5,-600);`);await E.page.evaluate(clock);await E.ev('await wait(100);__step(3);');
 const prepCode=source.match(/await E.ev\(`(window.prep=[\s\S]*?)`\);/)[1].replace("T.setWeapon(T.WEAPON_ORDER.indexOf(w));if(T.isUnarmed())T.toggleHolster();","if(T.isUnarmed())T.toggleHolster();T.setWeapon(T.WEAPON_ORDER.indexOf(w));");await E.ev(prepCode);
 for(const [tag,w,key,dual]of [['side','m4','KeyA',false],['back','ak','KeyS',false],['dual','pistol','KeyD',true],['unarmed','pistol','KeyA',false]]){
  const r=await E.ev(`prep('${w}');${dual?"T.setDualOwnedDbg('pistol');T.toggleDualWieldDbg();__step(100);":''}${tag==='unarmed'?'T.toggleHolster();__step(100);':''}__key('${key}',true);__key('KeyV',true);__key('KeyV',false);__step(75);__key('${key}',false);const d=T.diveDbg(),a=T.getAmmo()['${w}'];T.setMouseFireDbg(${tag!=='unarmed'});__step(18);T.setMouseFireDbg(false);photo();__step(1);return {tag:'${tag}',phase:d.phase,dir:[d.dirX,d.dirZ],spent:a-T.getAmmo()['${w}'],muzzle:T.getMuzzleWorld().toArray(),quaternion:T.getMarine().userData.torsoG.getWorldQuaternion(new T.THREE.Quaternion()).toArray()};`);
  console.log('RUN',JSON.stringify(r));proof.runs.push(r);assert.equal(r.phase,'air');assert(r.quaternion.every(Number.isFinite));if(tag!=='unarmed')assert(r.spent>0);await E.page.screenshot(`${dir}/after-${tag}-air.png`);
  await E.ev(`let n=0;while(T.diveDbg().phase==='air'&&n++<650)__step(1);__key('KeyW',true);__step(8);__key('KeyW',false);while(T.diveDbg().phase==='down'&&n++<850)__step(1);__step(3);photo();__step(1);`);await E.page.screenshot(`${dir}/after-${tag}-early-rise.png`);
  if(dual)await E.ev('T.toggleDualWieldDbg();');
 }
 proof.wall=await E.ev(`prep('m4',6.45,-646,Math.PI/2);__key('KeyV',true);__key('KeyV',false);let maxMuzzle=-Infinity,maxBody=-Infinity,contact=false;for(let i=0;i<300;i++){__step(1);maxMuzzle=Math.max(maxMuzzle,T.getMuzzleWorld().x);maxBody=Math.max(maxBody,T.player.position.x);contact||=T.diveDbg().contact>0;}return {maxMuzzle,maxBody,contact};`);
 assert(proof.wall.maxMuzzle<8,'rifle muzzle must stay inside the range wall');
 await E.ev(`prep('pistol');window.fixture={minX:-2,maxX:2,minZ:-642,maxZ:-641.9,minY:-200,maxY:-198,material:'metal'};T.trainingDbg.tg().solids.push(fixture);__key('KeyV',true);__key('KeyV',false);`);
 proof.prop=await E.ev(`let maxZ=-Infinity,contact=false;for(let i=0;i<330;i++){__step(1);maxZ=Math.max(maxZ,T.player.position.z);contact||=T.diveDbg().contact>0;}T.trainingDbg.tg().solids.splice(T.trainingDbg.tg().solids.indexOf(fixture),1);return {maxZ,contact};`);assert(proof.prop.contact);assert(proof.prop.maxZ<-642.3);
 assert.deepEqual(E.page.errors,[]);console.log(JSON.stringify(proof));
}finally{proof.errors=E.page?.errors;fs.writeFileSync(`${dir}/extended-native.json`,JSON.stringify(proof,null,2));await E.close();}process.exit(0);

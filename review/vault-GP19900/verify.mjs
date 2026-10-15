import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine as Staged} from './camera.mjs';import {Engine as Live} from '../../tools/camera.mjs';
const live=process.argv.includes('--live'),Engine=live?Live:Staged;
const dir='review/vault-GP19900',E=new Engine({training:true,warm:'none',size:'1400x900'}),proof={cases:[]};
try {
 await E.open();proof.loadSec=E.loadSec;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.grantAllWeapons();
 window.key=(type,code)=>document.body.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
 window.mouse=(type)=>T.renderer.domElement.dispatchEvent(new MouseEvent(type,{button:0,bubbles:true}));
 window.createCover=async(type,gun='pistol')=>{T.vaultDbg.hold(null);await wait(850);for(const q of [...T.builds])T.removeBuild(q,true);T.player.position.set(-29,-200,-634);T.setVelDbg(0,0);if(T.isUnarmed())T.toggleHolster();T.setWeapon(T.WEAPON_ORDER.indexOf(gun));await wait(450);window.b=T.spawnBuild(type,-27,-631);T.player.position.set(b.x,-200,b.z-.4);T.setVelDbg(0,0);T.setAimTargetDbg(b.x,b.z+12);await wait(80);T.setAimYawDbg(0);return {x:b.x,z:b.z};};`);
 for(const type of ['sandbag','barricade','railing']) {
  const result=await E.ev(`await createCover('${type}');T.vaultDbg.hold(.46);const started=T.tryVault();await wait(80);const v=T.vaultDbg.state(),u=T.getMarine().userData,wr=u.elbowLG.userData.wrist,w=wr.getWorldPosition(new T.THREE.Vector3()),c=v?.contact;
   return {type:'${type}',started,v,p:T.player.position.toArray(),contactError:c?Math.hypot(w.x-c.x,w.y-c.y-.034,w.z-c.z+.025):null,feet:[u.ankleLG,u.ankleRG].map(q=>q.getWorldPosition(new T.THREE.Vector3()).toArray()),shoulder:u.armLG.getWorldPosition(new T.THREE.Vector3()).toArray()};`);
  assert(result.started,type);assert(result.contactError<.16,type+' palm contact');proof.cases.push(result);
  await E.shoot({cam:{x:-23.5,y:-197.2,z:-626.7,tx:-27,ty:-198.8,tz:-630.2,fov:38},out:dir+'/after-'+type+'-front.png'});
  await E.shoot({cam:{x:-23.5,y:-194.8,z:-635.6,tx:-27,ty:-198.6,tz:-630.2,fov:40},out:dir+'/after-'+type+'-game.png'});
  const landed=await E.ev(`const to=T.vaultDbg.state().to;T.vaultDbg.hold(null);await wait(600);return {active:T.isVaulting(),p:T.player.position.toArray(),to};`);
  assert(!landed.active);assert(Math.abs(landed.p[1]+200)<.05);assert(Math.abs(landed.p[2]-landed.to[2])<.15);result.landed=landed;
 }
 for(const gun of ['pistol','revolver','uzi','m4']) {
  const r=await E.ev(`await createCover('sandbag','${gun}');T.setAmmoDbg('${gun}',20);T.vaultDbg.hold(.46);const started=T.tryVault();await wait(80);const a=T.magazinesDbg('${gun}'),count=T.projectiles.length;T.setMouseFireDbg(true);await wait(210);T.stepFireDbg(.016);T.setMouseFireDbg(false);const b=T.magazinesDbg('${gun}');return {gun:'${gun}',started,before:a,after:b,projectiles:T.projectiles.length-count,flags:T.vaultDbg.flags()};`);
  console.log('GUN',JSON.stringify(r));proof.cases.push(r);const a=r.before.loaded[0],b=r.after.loaded[0];assert(r.started);assert(gun==='m4'?a===b:b<a,gun+' firing rule');
 }
 proof.dual=await E.ev(`await createCover('sandbag','pistol');T.setDualOwnedDbg('pistol');T.toggleDualWieldDbg();T.setMagazinesDbg('pistol',12,[18],12);await wait(80);T.vaultDbg.hold(.46);const started=T.tryVault();await wait(80);const a=T.magazinesDbg('pistol');T.setMouseFireDbg(true);await wait(180);T.setMouseFireDbg(false);const b=T.magazinesDbg('pistol'),off=T.offhandMeshes.pistol.parent.visible;T.vaultDbg.hold(null);await wait(650);return {started,before:a,after:b,off,restored:T.offhandMeshes.pistol.parent.visible};`);
 assert(proof.dual.started);assert(proof.dual.after.loaded[0]<proof.dual.before.loaded[0]);assert.equal(proof.dual.after.loaded[1],proof.dual.before.loaded[1]);assert.equal(proof.dual.off,false);assert(proof.dual.restored);
 proof.blocked=await E.ev(`await createCover('sandbag');const wall=T.spawnBuild('wall',-27,-630);const no=T.tryVault();wall.hp=0;wall.mesh.visible=false;const yes=T.tryVault();await wait(900);return {no,yes};`);assert.equal(proof.blocked.no,false);assert(proof.blocked.yes);
 proof.direction=await E.ev(`await createCover('sandbag');T.setAimYawDbg(Math.PI/2);return T.tryVault();`);assert.equal(proof.direction,false);
 proof.alarmFence=await E.ev(`T.player.position.set(-41.6,-200,-630);return T.vaultDbg.clearAt(-42,-199.5,-630,1.2,null);`);assert.equal(proof.alarmFence,false);
 proof.dynamic=await E.ev(`await createCover('barricade');T.vaultDbg.hold(.32);T.tryVault();await wait(80);const w=T.spawnBuild('wall',-27,T.player.position.z-.84);await wait(80);const r={active:T.isVaulting(),p:T.player.position.toArray()};w.hp=0;w.mesh.visible=false;T.vaultDbg.hold(null);return r;`);assert(!proof.dynamic.active);
 proof.perf=await E.ev(`await createCover('sandbag');T.trainingDbg.clear();for(let i=0;i<48;i++){const z=T.spawnZombie(-35+(i%8)*2.5,-622+Math.floor(i/8),'shambler',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=-200;}T.setShotView({x:-15,y:-176,z:-658,tx:-27,ty:-199,tz:-628,fov:48});await wait(1000);let times=[],last=performance.now();for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();times.push(now-last);last=now;}return {fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),worst:Math.max(...times),hitches:times.filter(x=>x>50).length,alive:T.trainingDbg.alive(),draws:T.renderer.info.render.calls};`);
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log('PASS native three cover vaults, palm contact, landings, primary gun fire, rifle lockout, paired-gun restoration, blocked route, direction, fence and dynamic blocker');console.log(JSON.stringify(proof.perf));
}finally{fs.writeFileSync(dir+(live?'/live-proof.json':'/native-proof.json'),JSON.stringify({...proof,errors:E.page?.errors},null,2));await E.close();}process.exit(0);

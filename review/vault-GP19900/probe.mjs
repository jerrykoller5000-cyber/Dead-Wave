import fs from 'node:fs';import assert from 'node:assert/strict';
import {Engine as Staged} from './camera.mjs';import {Engine as Live} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/vault-GP19900',E=new (before?Live:Staged)({training:true,warm:'none',size:'1400x900'}),proof={};
try {
 await E.open();proof.loadSec=E.loadSec;
 await E.ev(`R.release();T.trainingDbg.panel().close();T.trainingDbg.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));await wait(600);
 if(T.isUnarmed())T.toggleHolster();await wait(450);window.b=T.spawnBuild('sandbag',-27,-631);T.player.position.set(b.x,-200,b.z-.8);T.setVelDbg(0,0);T.setAimTargetDbg(b.x,b.z+8);await wait(80);`);
 proof.setup=await E.ev(`return {piece:{type:b.type,x:b.x,z:b.z,y:b.mesh.position.y,yaw:b.yaw},p:T.player.position.toArray(),weapon:T.getCurrentWeapon(),errors:[]};`);
 console.log('SETUP',JSON.stringify(proof.setup));
 const {x,z}=proof.setup.piece,cam={x:x+3.7,y:-198,z:z-4.4,tx:x,ty:-198.8,tz:z,fov:40};
 if(before){proof.vault=await E.ev(`return T.tryVault();`);await E.shoot({cam,wait:180,out:dir+'/before-sandbag.png'});}
 else {
  proof.vault=await E.ev(`T.vaultDbg.hold(.42);return T.tryVault();`);console.log('START',proof.vault);assert(proof.vault);
  await E.ev(`await wait(160);`);
  proof.mid=await E.ev(`const M=T.getMarine(),u=M.userData,v=T.vaultDbg.state();return {v,p:T.player.position.toArray(),wrist:u.elbowLG.userData.wrist.getWorldPosition(new T.THREE.Vector3()).toArray(),shoulder:u.armLG.getWorldPosition(new T.THREE.Vector3()).toArray(),offhand:T.offhandMeshes.pistol?.parent?.visible};`);
  console.log('MID',JSON.stringify(proof.mid));
  await E.shoot({cam,out:dir+'/after-sandbag.png'});
 }
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
} finally {fs.writeFileSync(dir+'/'+(before?'before':'probe')+'-proof.json',JSON.stringify({...proof,errors:E.page?.errors},null,2));await E.close();}process.exit(0);

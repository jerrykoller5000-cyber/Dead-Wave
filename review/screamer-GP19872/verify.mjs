import fs from 'node:fs';import assert from 'node:assert/strict';import {Engine} from '../../tools/camera.mjs';
const E=new Engine({training:true,warm:'none',size:'1200x800'}),dir='review/screamer-GP19872';
try{await E.open();const proof=await E.ev(`R.release();const D=T.trainingDbg;D.panel().close();D.clear();T.AudioSys.setMuted(true);T.runDevCommand('godmode');const floor=D.tg().floorY;
 const M=await import('/game/screamer-behavior.js');T.player.position.set(-30,floor,-626);T.setVelDbg(0,0);
 const mk=()=>{const z=T.spawnZombie(-30,-634,'screamer',true,true);z.trainingZ=true;z.riseT=0;z.mesh.position.y=floor;z.hp=z.maxHp=1000000;z.speed=z.baseSpeed=0;z.screamCd=100;return z;};
 const ratios=[];
 for(const [kind,weapon,extra]of [['bullet','pistol',{}],['pellet','shotgun',{pelletOf:7}],['generic','flamer',{fire:true}],['melee','knife',{}],['chainsaw','chainsaw',{}],['explosive',null,{}],['crush',null,{}]]){
  const z=mk(),info={kind,hitWeapon:weapon,dir:{x:0,z:1},hitY:z.mesh.position.y+z.hitH*.45,...extra},before=z.hp;T.damageZombie(z,10,info);const closed=before-z.hp;
  z.sonicOpenT=2.4;const mid=z.hp;T.damageZombie(z,10,info);const opened=mid-z.hp;ratios.push({kind,closed,opened,ratio:closed/opened});}
 D.clear();const z=mk(),u=z.mesh.userData;for(let i=0;i<20;i++)T.damageZombie(z,100,{kind:'bullet',dir:{x:0,z:1},hitY:z.mesh.position.y+z.hitH*.9});
 const noShieldDismember=!z.partsLost.head&&!z.partsLost.armL&&!z.partsLost.armR,shieldHit=z.sonicHitT===.18;
 const C=u.skinMesh.geometry.attributes.color;let black=0,pink=0;for(let i=0;i<C.count;i++){if(C.getX(i)+C.getY(i)+C.getZ(i)<.001)black++;else if(C.getX(i)>.4&&C.getZ(i)>.15)pink++;}
 const appearance={singleSkin:u.skinMeshes.length===1,jawBone:u.skinMesh.skeleton.bones.includes(u.screamerJaw),tongueBone:u.skinMesh.skeleton.bones.includes(u.screamerTongue),ankles:[u.legLG,u.legRG].every(l=>u.skinMesh.skeleton.bones.includes(l.userData.shamblerAnkle)),blackFraction:black/C.count,pinkVertices:pink,particles:u.screamerFx.smoke.count};
 z.screamCd=.02;const pause=ms=>new Promise(r=>setTimeout(r,ms)),until=async fn=>{const end=performance.now()+5000;while(!fn()&&performance.now()<end)await pause(10);return !!fn();};
 await until(()=>z.screamT>0);const singingProtected=M.screamerProtected(z);await until(()=>z.sonicOpenT>0);const started=T.getSimTime(),opened=z.sonicOpenT;await pause(250);const hiddenDuringOpen=!u.screamerFx.shield.visible;await until(()=>M.screamerProtected(z));const exposureSeconds=T.getSimTime()-started;await pause(300);const rebuilt=u.screamerFx.shield.visible;
 T.dismemberDbg(z,'head');z.screamCd=.01;await pause(400);const headlessNoPower=!M.screamerProtected(z)&&!(z.screamT>0)&&!u.screamerFx.shield.visible;
 D.clear();const noOrphanEffects=!u.screamerFx.shield.visible&&!u.screamerFx.smoke.visible;
 const fresh=mk();await pause(200);const resetProtected=M.screamerProtected(fresh)&&fresh.mesh.userData.screamerFx.shield.visible;const freshFx=fresh.mesh.userData.screamerFx;T.killZombie(fresh,false);const corpseNoEffects=!freshFx.shield.visible&&!freshFx.smoke.visible;
 D.clear();const A=T.AudioSys;A.unlock();const voices0={...A.voiceCount};const fallback=await A.levelDbg(()=>A.zombieVoice('screamer','chase',1,0,{}),.8,false);const fallbackNoPhrase=Object.keys(A.voiceCount).filter(k=>k.startsWith('screamer:')&&k.includes(':phrase:')).every(k=>A.voiceCount[k]===(voices0[k]||0));
 return {ratios,noShieldDismember,shieldHit,appearance,singingProtected,opened,hiddenDuringOpen,exposureSeconds,rebuilt,headlessNoPower,noOrphanEffects,resetProtected,corpseNoEffects,fallback,fallbackNoPhrase};`,22000);
 fs.writeFileSync(dir+'/verification.json',JSON.stringify({...proof,errors:E.page.errors},null,2)+'\n');console.log(JSON.stringify(proof));
 for(const r of proof.ratios)assert(Math.abs(r.ratio-.03)<1e-7,r.kind);for(const k of ['noShieldDismember','shieldHit','singingProtected','hiddenDuringOpen','rebuilt','headlessNoPower','noOrphanEffects','resetProtected','corpseNoEffects','fallbackNoPhrase'])assert(proof[k],k);
 for(const k of ['singleSkin','jawBone','tongueBone','ankles'])assert(proof.appearance[k],k);assert(proof.appearance.blackFraction>.9);assert(proof.appearance.pinkVertices>0);assert(proof.exposureSeconds>2.3&&proof.exposureSeconds<2.5);assert.equal(proof.fallback.peak,0);assert.equal(E.page.errors.length,0);console.log('PASS native damage, scream window, appearance, lifecycle and silent legacy fallback');
 const lib=fs.readFileSync('tools/tests/lib.js','utf8');for(const id of ['t93','t215']){const check=fs.readFileSync('tools/tests/'+id+'.js','utf8');const result=await E.page.evaluate('(async()=>{'+lib+'\nconst result='+check+';return await result;})()',120000);fs.writeFileSync(dir+'/after-'+id+'.log',result+'\n');console.log(id,result);}
}finally{await E.close();}process.exit(0);

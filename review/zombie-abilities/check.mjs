import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
fs.mkdirSync('review/zombie-abilities/before',{recursive:true});fs.mkdirSync('review/zombie-abilities/after',{recursive:true});
const proof={};let E;const reuseBefore=process.argv.includes('--reuse-before'),production=process.argv.includes('--production');
const setup=`R.release();T.clearZombies();T.skipGrace();T.setHp(10000);T.setArmor(0);T.AudioSys.setMuted(true);const tg=T.trainingDbg.tg(),room=tg.zombieRoom;T.player.position.set(room.minX+6,tg.floorY,(room.minZ+room.maxZ)/2);await wait(200);return {training:T.trainingDbg.state().active,room,floor:tg.floorY};`;
try{
  if(reuseBefore){const old=JSON.parse(fs.readFileSync('review/zombie-abilities/gameplay-proof.json','utf8'));for(const k of ['beforeLoadSeconds','beforeSetup','beforePerf','beforeErrors'])proof[k]=old[k];}else{
  E=new Engine({training:true,warm:'none',size:'1440x900'});await E.open();proof.beforeLoadSeconds=E.loadSec;
  proof.beforeSetup=await E.ev(setup);
  for(const [type,view]of [['demon','three'],['colossus','rear3']])await E.shoot({target:'zombie:'+type,view,time:'noon',out:'review/zombie-abilities/before/'+type+'.png'});
  await E.ev(`R.release();T.clearZombies();const P=T.player.position;for(let i=0;i<48;i++){const z=T.spawnZombie(P.x+8+(i%6)*1.2,P.z+Math.floor(i/6)*1.1,['demon','spitter','colossus','shambler'][i%4],true,true);z.trainingZ=true;z.speed=z.baseSpeed=0;z.chargeCd=z.spitCd=z.slamCd=z.attackCd=1000;}T.resetPerf();await wait(1500);`);
  proof.beforePerf=await E.ev(`T.resetPerf();await wait(2200);return T.perfSnapshot();`);proof.beforeErrors=E.page.errors;assert.equal(proof.beforeErrors.length,0);await E.close();}
  E=new Engine({training:true,warm:'none',size:'1440x900'});
  const originalLoad=E.load.bind(E);
  E.load=async()=>{const goto=E.page.goto.bind(E.page);E.page.goto=(url,options)=>goto(production?url:url.replace('/index.html?','/.tmp-zombie-abilities.html?'),options);let timer;const guard=new Promise((_,reject)=>{timer=setInterval(()=>{if(E.page.errors.length)reject(new Error('Game boot: '+E.page.errors.join(' | ')));},500);});try{return await Promise.race([originalLoad(),guard]);}finally{clearInterval(timer);E.page.goto=goto;}};
  await E.open();console.log('Preview loaded in '+E.loadSec+' seconds.');proof.afterLoadSeconds=E.loadSec;proof.setup=await E.ev(setup);assert(proof.setup.training);
  for(const [type,view]of [['demon','three'],['colossus','rear3']])await E.shoot({target:'zombie:'+type,view,time:'noon',out:'review/zombie-abilities/after/'+type+'.png'});
  await E.ev(setup);
  proof.attacks=[];
  for(const type of ['demon','colossus']){
    const r=await E.ev(`T.clearZombies();T.setHp(10000);T.setArmor(0);const P=T.player.position,type='${type}',z=T.spawnZombie(P.x+24,P.z,type,true,true);z.trainingZ=true;z.speed=z.baseSpeed=0;z.chargeCd=z.slamCd=z.attackCd=1000;z.hp=z.maxHp=100000;await wait(60);z.rangedAbility.remaining=0;const before=T.enemyAbilitiesDbg.read(),hp=T.getHp();await wait(350);const winding=z.rangedAbility.stage;const start=z.mesh.position.clone();await wait(3600);return{type,winding,damage:hp-T.getHp(),shots:z.rangedAbility.shots,state:T.enemyAbilitiesDbg.read(),delta:{fireballs:T.enemyAbilitiesDbg.read().counts.fireballs-before.counts.fireballs,stones:T.enemyAbilitiesDbg.read().counts.stones-before.counts.stones},movement:z.mesh.position.distanceTo(start),props:!!z.mesh.userData.abilityVisuals};`);
    proof.attacks.push(r);assert.equal(r.winding,'windup',type+' visible tell');assert(r.props);assert.equal(r.shots,1,type+' one shot');assert.equal(r.damage,type==='colossus'?80:24,type+' direct hit');assert(r.movement<.01,type+' planted feet');
    console.log(type+': one telegraphed shot hit for '+r.damage+'; feet stayed planted.');
  }
  proof.closeDemon=await E.ev(`T.clearZombies();const P=T.player.position,z=T.spawnZombie(P.x+10,P.z,'demon',true,true);z.trainingZ=true;z.speed=z.baseSpeed=0;z.chargeCd=0;z.attackCd=1000;await wait(40);z.rangedAbility.remaining=0;await wait(300);return{stage:z.rangedAbility.stage,fireballs:z.rangedAbility.shots,charging:z.chargeWind>0||z.chargeT>0};`);assert.equal(proof.closeDemon.fireballs,0);assert(proof.closeDemon.charging);
  proof.trail=await E.ev(`T.clearZombies();const P=T.player.position,z=T.spawnZombie(P.x+5,P.z,'spitter',true,true);z.trainingZ=true;z.spitCd=1000;z.speed=z.baseSpeed=0;await wait(40);const before=T.enemyAbilitiesDbg.read().counts.trailDrops;for(let i=0;i<4;i++){z.mesh.position.x+=.8;await wait(40);}const drops=T.enemyAbilitiesDbg.read().counts.trailDrops-before;const end=z.mesh.position.clone();await wait(180);const stationary=T.enemyAbilitiesDbg.read().counts.trailDrops-before;T.killZombie(z,false,{kind:'melee',dir:{x:0,z:1}});T.setHp(1000);P.copy(end);await wait(850);const damage=1000-T.getHp();const dummyId=T.addDummyPlayer(end.x,end.z),dummy=T.playerById(dummyId);dummy.position.set(end.x,end.y+3,end.z);P.x-=3;await wait(650);const elevatedDamage=dummy.damage;T.removeDummyPlayer(dummyId);T.clearZombies();const cleared=T.enemyAbilitiesDbg.read();return{drops,stationary,damage,elevatedDamage,cleared};`);assert.equal(proof.trail.drops,4);assert.equal(proof.trail.stationary,4);assert(proof.trail.damage>=8&&proof.trail.damage<=12);assert.equal(proof.trail.elevatedDamage,0);assert.equal(proof.trail.cleared.trails,0);
  console.log('Spitter: movement-only trail; floor burn ticks; raised player safe; clear removes hazards.');
  // A short real moving path supplies the after screenshot.
  await E.ev(setup);await E.ev(`const P=T.player.position,z=T.spawnZombie(P.x+8,P.z,'spitter',true,true);z.trainingZ=true;z.spitCd=1000;z.tactics='direct';await wait(2200);`);
  await E.shoot({target:'live:spitter',view:'three',margin:2.4,ui:true,out:'review/zombie-abilities/after/spitter-trail.png'});
  await E.ev(setup);
  proof.death=await E.ev(`const P=T.player.position,z=T.spawnZombie(P.x+24,P.z,'demon',true,true);z.trainingZ=true;z.speed=z.baseSpeed=0;await wait(40);const body=z.mesh;T.killZombie(z,false,{kind:'melee',dir:{x:0,z:1}});return body.userData.abilityVisuals.flameAnchors.every(a=>!a.visible);`);assert(proof.death,'dead demon fire stopped');
  proof.clear=await E.ev(`T.clearZombies();return T.enemyAbilitiesDbg.read();`);assert.equal(proof.clear.shots,0);assert.equal(proof.clear.trails,0);
  await E.ev(`const P=T.player.position;for(let i=0;i<48;i++){const z=T.spawnZombie(P.x+8+(i%6)*1.2,P.z+Math.floor(i/6)*1.1,['demon','spitter','colossus','shambler'][i%4],true,true);z.trainingZ=true;z.speed=z.baseSpeed=0;z.chargeCd=z.spitCd=z.slamCd=z.attackCd=1000;await wait(1);}await wait(60);for(const z of T.zombies)if(z.rangedAbility)z.rangedAbility.remaining=1000;await wait(1500);`);
  proof.afterPerf=await E.ev(`T.resetPerf();await wait(2200);return T.perfSnapshot();`);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0,JSON.stringify(proof.errors));
  proof.summary='PASS: demon fireball24, charge priority, colossus raw80 hit, planted tells, walking acid/floor immunity/cleanup, dead fists extinguish; zero browser errors.';
  console.log(proof.summary);console.log('Short48-body comparison: '+proof.beforePerf.fps+' -> '+proof.afterPerf.fps+' FPS');
}catch(e){proof.failure=String(e.stack||e);throw e;}
finally{fs.writeFileSync('review/zombie-abilities/'+(production?'final-gameplay-proof.json':'gameplay-proof.json'),JSON.stringify(proof,null,2)+'\n');await E?.close();}
process.exit(0);

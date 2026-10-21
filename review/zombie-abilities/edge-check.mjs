// GP-179: live edge checks against the isolated integration preview by default.
// Changes are limited to temporary debug fixtures in this browser session.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';

const production = process.argv.includes('--production');
const proof = {at: new Date().toISOString(), url: production ? 'index.html' : '.tmp-zombie-abilities.html', lethal: [], cover: []};
let engine;
const fixture = `
  R.release();
  const recoveryStart=Date.now();
  while(T.trainingDbg.state().wake&&Date.now()-recoveryStart<8000)await wait(50);
  if(T.trainingDbg.state().wake)throw new Error('Training bed recovery did not finish');
  T.clearZombies();T.skipGrace();T.setHp(10000);T.setArmor(0);T.AudioSys.setMuted(true);
  const tg=T.trainingDbg.tg(),room=tg.zombieRoom,P=T.player.position;
  P.set(room.minX+6,tg.floorY,(room.minZ+room.maxZ)/2);
  await wait(120);
  const spawn=async(type,distance=24)=>{
    const z=T.spawnZombie(P.x+distance,P.z,type,true,true);
    z.trainingZ=true;z.speed=z.baseSpeed=0;z.hp=z.maxHp=100000;
    z.chargeCd=z.slamCd=z.spitCd=z.attackCd=1000;
    await wait(60);
    if(type!=='spitter'&&!z.rangedAbility)throw new Error('Ranged ability was not initialized');
    if(z.rangedAbility)z.rangedAbility.remaining=1000;
    return z;
  };
  const cover=()=>({minX:P.x+11.7,maxX:P.x+12.3,minY:tg.floorY-1,maxY:tg.floorY+14,minZ:P.z-3,maxZ:P.z+3,edgeFixture:true});
  const poll=async(predicate,timeout=7000)=>{
    const start=Date.now();while(!predicate()&&Date.now()-start<timeout)await wait(25);
    if(!predicate())throw new Error('Edge fixture timed out');
  };
`;

try {
  engine = new Engine({training: true, warm: 'none', size: '1440x900'});
  const load = engine.load.bind(engine);
  engine.load = async () => {
    const goto = engine.page.goto.bind(engine.page);
    engine.page.goto = (url, options) => goto(production ? url : url.replace('/index.html?', '/.tmp-zombie-abilities.html?'), options);
    let timer;
    const guard = new Promise((_, reject) => {
      timer = setInterval(() => {
        if (engine.page.errors.length) reject(new Error('Game boot: ' + engine.page.errors.join(' | ')));
      }, 500);
    });
    try { return await Promise.race([load(), guard]); }
    finally { clearInterval(timer); engine.page.goto = goto; }
  };
  await engine.open();
  proof.loadSeconds = engine.loadSec;
  assert.equal(await engine.ev('return !!T.enemyAbilitiesDbg;'), true, 'integration runtime exposed');

  for (const type of ['demon', 'colossus']) {
    const result = await engine.ev(fixture + `
      const z=await spawn('${type}'),before=T.enemyAbilitiesDbg.read();
      z.rangedAbility.remaining=0;
      const start=Date.now();
      // Keep lethal health below regen while awaiting the actual ranged impact.
      while(!T.trainingDbg.state().wake&&Date.now()-start<7000){T.setHp(1);await wait(25);}
      const waking=!!T.trainingDbg.state().wake,after=T.enemyAbilitiesDbg.read();
      return {type:'${type}',waking,hp:T.getHp(),after,
        directHits:after.counts.directHits-before.counts.directHits,
        fireballs:after.counts.fireballs-before.counts.fireballs,
        stones:after.counts.stones-before.counts.stones,
        alive:T.trainingDbg.alive()};
    `);
    proof.lethal.push(result);
    assert(result.waking, type + ' triggered Training bed recovery');
    assert.equal(result.hp, 100, type + ' restored health');
    assert.equal(result.alive, 0, type + ' cleared enemies');
    assert.equal(result.directHits, 1, type + ' one projectile contact');
    assert.equal(result[type === 'demon' ? 'fireballs' : 'stones'], 1, type + ' fired once');
    assert.equal(result.after.shots, 0, type + ' cleared in-flight shots');
    assert.equal(result.after.trails, 0, type + ' cleared floor hazards');
    console.log(type + ': lethal ranged hit recovered safely, hazards cleared.');
  }

  proof.lethalAcid = await engine.ev(fixture + `
    const z=await spawn('spitter',5),before=T.enemyAbilitiesDbg.read();
    for(let i=0;i<3;i++){z.mesh.position.x+=.8;await wait(40);}
    const endpoint=z.mesh.position.clone(),laid=T.enemyAbilitiesDbg.read();
    T.killZombie(z,false,{kind:'melee',dir:{x:0,z:1}});await wait(100);
    P.copy(endpoint);const start=Date.now();
    while(!T.trainingDbg.state().wake&&Date.now()-start<3000){T.setHp(1);await wait(25);}
    const after=T.enemyAbilitiesDbg.read();
    return {waking:!!T.trainingDbg.state().wake,hp:T.getHp(),alive:T.trainingDbg.alive(),
      drops:laid.counts.trailDrops-before.counts.trailDrops,
      acidHits:after.counts.acidHits-before.counts.acidHits,after};
  `);
  assert(proof.lethalAcid.drops >= 3, 'walking spitter laid acid');
  assert(proof.lethalAcid.waking, 'acid triggered Training bed recovery');
  assert.equal(proof.lethalAcid.hp, 100);
  assert.equal(proof.lethalAcid.alive, 0);
  assert.equal(proof.lethalAcid.acidHits, 1);
  assert.equal(proof.lethalAcid.after.shots, 0);
  assert.equal(proof.lethalAcid.after.trails, 0);
  console.log('Acid: lethal floor tick recovered safely after owner death.');

  proof.acidBatch = await engine.ev(fixture + `
    const z=await spawn('spitter',5);
    for(let i=0;i<6;i++){z.mesh.position.x+=.8;await wait(40);}
    await wait(120);
    const batches=[];T.scene.traverse(o=>{if(o.name==='spitter-acid-trail-batch')batches.push(o);});
    const batch=batches[0],color=batch?.geometry.getAttribute('color');
    const activeAlpha=color?Array.from({length:color.count},(_,i)=>color.getW(i)).filter(a=>a>0):[];
    return {trails:T.enemyAbilitiesDbg.read().trails,totalMeshes:batches.length,
      activeMeshes:batches.filter(m=>m.visible).length,itemSize:color?.itemSize,
      alpha:activeAlpha,visible:batch?.visible,material:batch?.material.type,
      explicitAlphaNode:!!batch?.material.opacityNode};
  `);
  assert.equal(proof.acidBatch.trails, 6);
  assert.equal(proof.acidBatch.totalMeshes, 1, 'one pooled acid batch exists');
  assert.equal(proof.acidBatch.activeMeshes, 1, 'all acid shares one visible mesh');
  assert.equal(proof.acidBatch.itemSize, 4, 'actual buffer uses vertex RGBA');
  assert.equal(proof.acidBatch.alpha.length, 36);
  assert(proof.acidBatch.alpha.every(a=>Math.abs(a-.8)<.001), 'fresh acid vertex alpha is .8');
  assert(proof.acidBatch.explicitAlphaNode, 'WebGPU material explicitly reads vertex alpha');
  proof.acidBatch.shot = await engine.shoot({target:'live:spitter',view:'three',margin:3.1,time:'noon',ui:true,out:'review/zombie-abilities/after/spitter-trail.png'});
  proof.acidFade = await engine.ev(`
    const z=T.zombies.find(z=>z.alive&&z.typeKey==='spitter');
    T.killZombie(z,false,{kind:'melee',dir:{x:0,z:1}});
    await wait(4750);
    let batch;T.scene.traverse(o=>{if(o.name==='spitter-acid-trail-batch')batch=o;});
    const color=batch.geometry.getAttribute('color'),alpha=Array.from({length:color.count},(_,i)=>color.getW(i)).filter(a=>a>0);
    const fading={trails:T.enemyAbilitiesDbg.read().trails,alpha,visible:batch.visible};
    await wait(1400);
    const expired={trails:T.enemyAbilitiesDbg.read().trails,visible:batch.visible,drawCount:batch.geometry.drawRange.count,
      alpha:Array.from({length:color.count},(_,i)=>color.getW(i)).filter(a=>a>0)};
    return {fading,expired};
  `);
  assert(proof.acidFade.fading.trails > 0, 'acid persists after spitter dies');
  assert(proof.acidFade.fading.alpha.every(a=>a>0&&a<.79), 'vertex alpha fades before expiry');
  assert.equal(proof.acidFade.expired.trails, 0);
  assert.equal(proof.acidFade.expired.visible, false, 'expired acid mesh hidden');
  assert.equal(proof.acidFade.expired.drawCount, 0);
  assert.equal(proof.acidFade.expired.alpha.length, 0);
  console.log('Acid render: six patches share one RGBA batch; vertex alpha fades, dead-owner trail expires and batch hides.');

  proof.armour = await engine.ev(fixture + `
    const z=await spawn('colossus'),before=T.enemyAbilitiesDbg.read();
    T.setHp(100);T.setArmor(100);z.rangedAbility.remaining=0;
    await poll(()=>T.enemyAbilitiesDbg.read().counts.directHits>before.counts.directHits);
    return {hp:T.getHp(),armor:T.getArmor(),directHits:T.enemyAbilitiesDbg.read().counts.directHits-before.counts.directHits};
  `);
  assert.equal(proof.armour.directHits, 1);
  assert(Math.abs(proof.armour.hp - 72) < .01, '80-raw stone costs 28 health');
  assert(Math.abs(proof.armour.armor - 48) < .01, '80-raw stone costs 52 armour');
  console.log('Stone armour: 80 raw damage became 28 health plus 52 armour.');

  await engine.ev(fixture + `await spawn('colossus');`);
  proof.throwShot = await engine.shoot({target:'live:colossus',view:'three',margin:1.7,time:'noon',settle:1,
    pre:`const z=T.zombies.find(z=>z.alive&&z.typeKey==='colossus');z.rangedAbility.remaining=0;await wait(900);`,
    out:'review/zombie-abilities/after/colossus-throw.png'});
  proof.throwPose = await engine.ev(`const z=T.zombies.find(z=>z.alive&&z.typeKey==='colossus'),rig=z.mesh.userData.abilityVisuals;
    return {stage:z.rangedAbility.stage,elapsed:z.rangedAbility.elapsed,heldVisible:rig.heldRock.visible,
      movingPack:rig.packDetails.visible,batchedPack:rig.idlePack.visible,
      plantedSpeed:z.speed,shots:z.rangedAbility.shots};`);
  assert.equal(proof.throwPose.stage, 'windup');
  assert.equal(proof.throwPose.heldVisible, true, 'actual throw screenshot shows lifted stone');
  assert.equal(proof.throwPose.movingPack, true);
  assert.equal(proof.throwPose.batchedPack, false);
  assert.equal(proof.throwPose.shots, 0);
  console.log('Colossus: captured live mid-windup with carried stone lifted into actual hands.');

  for (const type of ['demon', 'colossus']) {
    const result = await engine.ev(fixture + `
      const wall=cover();tg.solids.push(wall);
      try{
        const z=await spawn('${type}'),before=T.enemyAbilitiesDbg.read(),hp=T.getHp();
        z.rangedAbility.remaining=0;await wait(2100);
        const after=T.enemyAbilitiesDbg.read();
        return {type:'${type}',shots:z.rangedAbility.shots,hpLost:hp-T.getHp(),busy:!!z.abilityBusy,
          stage:z.rangedAbility.stage,blocked:after.counts.blocked-before.counts.blocked};
      }finally{const i=tg.solids.indexOf(wall);if(i>=0)tg.solids.splice(i,1);}
    `);
    proof.cover.push({when: 'before windup', ...result});
    assert.equal(result.shots, 0, type + ' respects blocked launch LOS');
    assert.equal(result.hpLost, 0);
    assert.equal(result.busy, false);
  }

  for (const type of ['demon', 'colossus']) {
    const result = await engine.ev(fixture + `
      const z=await spawn('${type}'),before=T.enemyAbilitiesDbg.read(),hp=T.getHp(),wall=cover();
      z.rangedAbility.remaining=0;
      await poll(()=>T.enemyAbilitiesDbg.read().shots>0);
      const activeAtInsert=T.enemyAbilitiesDbg.read().shots;tg.solids.push(wall);
      try{
        await poll(()=>T.enemyAbilitiesDbg.read().shots===0);
        const after=T.enemyAbilitiesDbg.read();
        return {type:'${type}',activeAtInsert,shots:z.rangedAbility.shots,hpLost:hp-T.getHp(),
          directHits:after.counts.directHits-before.counts.directHits,
          blocked:after.counts.blocked-before.counts.blocked};
      }finally{const i=tg.solids.indexOf(wall);if(i>=0)tg.solids.splice(i,1);}
    `);
    proof.cover.push({when: 'after launch', ...result});
    assert.equal(result.activeAtInsert, 1);
    assert.equal(result.shots, 1);
    assert.equal(result.hpLost, 0, type + ' midflight cover protected player');
    assert.equal(result.directHits, 0);
    assert.equal(result.blocked, 1, type + ' earliest obstruction consumed projectile');
  }
  console.log('Cover: both abilities respect initial LOS and newly inserted midflight cover.');

  proof.farTell = await engine.ev(fixture + `
    const z=await spawn('demon',28),rig=z.mesh.userData.abilityVisuals;
    T.setShotView({x:P.x-25,y:tg.floorY+8,z:P.z,tx:z.mesh.position.x,ty:tg.floorY+2,tz:P.z,fov:40});
    await wait(150);
    const fist=rig.flameAnchors.find(a=>a.userData.armIndex===1)||rig.flameAnchors[1];
    const sample=()=>{const v=new T.THREE.Vector3();fist.getWorldPosition(v);
      return {hand:v.toArray(),matrixAutoUpdate:fist.parent.matrixAutoUpdate,armMatrixAutoUpdate:rig.arms[1].matrixAutoUpdate,
        farLod:!!z.farLod,visible:z.mesh.visible,stage:z.rangedAbility.stage,
        playerDistance:z.mesh.position.distanceTo(P),cameraDistance:z.mesh.position.distanceTo(T.camera.position)};};
    const idle=sample();z.rangedAbility.remaining=0;
    await poll(()=>z.rangedAbility.stage==='windup');await wait(80);const early=sample();
    await wait(300);const late=sample();
    const movement=new T.THREE.Vector3(...early.hand).distanceTo(new T.THREE.Vector3(...late.hand));
    return {idle,early,late,movement};
  `);
  assert(proof.farTell.idle.cameraDistance > 40, 'camera distance activates far LOD');
  assert(proof.farTell.idle.playerDistance >= 24 && proof.farTell.idle.playerDistance <= 34);
  assert.equal(proof.farTell.idle.matrixAutoUpdate, false, 'idle far joints frozen');
  assert.equal(proof.farTell.early.stage, 'windup');
  assert.equal(proof.farTell.late.stage, 'windup');
  assert.equal(proof.farTell.late.matrixAutoUpdate, true, 'casting elbow matrices animate');
  assert.equal(proof.farTell.late.armMatrixAutoUpdate, true, 'casting arm matrices animate');
  assert.equal(proof.farTell.late.visible, true, 'casting tell remains visible');
  assert.equal(proof.farTell.late.farLod, false);
  assert(proof.farTell.movement > .03, 'actual world-space fist moved during tell');
  console.log('Distant cast: frozen idle joints wake and real fist anchor moves during visible tell.');

  await engine.ev('R.release();T.clearZombies();return T.enemyAbilitiesDbg.read();');
  proof.errors = [...engine.page.errors];
  assert.equal(proof.errors.length, 0, JSON.stringify(proof.errors));
  proof.summary = 'PASS: lethal Training projectile/acid recovery, 80-raw armour mitigation, launch LOS, earliest midflight cover and distant cast joint/anchor animation; zero browser errors.';
  console.log(proof.summary);
} catch (error) {
  proof.failure = String(error.stack || error);
  if (engine?.page) proof.errors = [...engine.page.errors];
  throw error;
} finally {
  fs.writeFileSync('review/zombie-abilities/edge-proof.json', JSON.stringify(proof, null, 2) + '\n', 'utf8');
  await engine?.close();
}
process.exit(0);

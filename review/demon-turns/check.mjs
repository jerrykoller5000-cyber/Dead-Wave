import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const proof = {at: new Date().toISOString()}, fixture = `
R.release();T.clearZombies();T.skipGrace();T.setHp(10000);T.setArmor(0);T.AudioSys.setMuted(true);
const tg=T.trainingDbg.tg(),room=tg.zombieRoom,P=T.player.position;
P.set(room.minX+6,tg.floorY,(room.minZ+room.maxZ)/2);
window.turnPack=[];
for(let i=0;i<3;i++){const z=T.spawnZombie(P.x+24,P.z+(i-1)*2,'demon',true,true);z.trainingZ=true;z.speed=z.baseSpeed=0;z.chargeCd=z.attackCd=1000;z.hp=z.maxHp=100000;turnPack.push(z);}
await wait(100);for(const z of turnPack)z.rangedAbility.remaining=0;
window.turnStarts=turnPack.map(()=>null);
window.turnWatch=setInterval(()=>{for(let i=0;i<turnPack.length;i++){const a=turnPack[i].rangedAbility;
  if(turnStarts[i]===null&&a.stage==='windup')turnStarts[i]=T.enemyAbilitiesDbg.read().clock-a.elapsed;}},20);
await wait(250);return turnPack.map(z=>({stage:z.rangedAbility.stage,elapsed:z.rangedAbility.elapsed}));`;
let E, failed = false;
async function load(baseline) {
  E = new Engine({training: true, warm: 'none', size: '1440x900'});
  if (baseline) {
    const load = E.load.bind(E);
    E.load = async () => {
      const goto = E.page.goto.bind(E.page);
      E.page.goto = (url, opts) => goto(url.replace('/index.html?', '/.tmp-demon-turns-before.html?'), opts);
      try { return await load(); } finally { E.page.goto = goto; }
    };
  }
  await E.open();
}
try {
  for (const baseline of [true, false]) {
    await load(baseline);
    const key = baseline ? 'before' : 'after', entry = {poses: await E.ev(fixture)};
    await E.shoot({target: 'live:demon', view: 'three', dist: 18, ui: true, out: 'review/demon-turns/' + key + '.png'});
    entry.timing = await E.ev(`R.release();const end=T.enemyAbilitiesDbg.read().clock+3.5,deadline=Date.now()+12000;
      while(T.enemyAbilitiesDbg.read().clock<end&&Date.now()<deadline)await wait(20);
      clearInterval(turnWatch);
      return{starts:turnStarts,clock:T.enemyAbilitiesDbg.read().clock,end,shots:T.enemyAbilitiesDbg.read().counts.fireballs,hp:T.getHp(),stages:turnPack.map(z=>z.rangedAbility.stage)};`);
    entry.errors = E.page.errors; assert.equal(entry.errors.length, 0); proof[key] = entry;
    await E.close(); E = null;
  }
  assert.equal(proof.before.poses.filter(s => s.stage === 'windup').length, 3);
  assert.equal(proof.after.poses.filter(s => s.stage === 'windup').length, 1);
  assert(proof.after.timing.clock >= proof.after.timing.end);
  assert(proof.after.timing.starts.every(Number.isFinite));
  const times = proof.after.timing.starts.slice().sort((a, b) => a - b);
  proof.gaps = times.slice(1).map((time, i) => time - times[i]);
  // Elapsed-pose timestamps are reconstructed from sampled frames; allow one
  // 30ms integration slice. Unit tests assert the exact shared start-event clock.
  assert(proof.gaps.every(gap => gap >= 1.17));
  assert.equal(proof.after.timing.shots, 3);
  proof.summary = 'PASS: baseline three simultaneous tells; revised one initial tell, all three casts serviced about1.2s apart, zero browser errors.';
  fs.writeFileSync('review/demon-turns/proof.json', JSON.stringify(proof, null, 2) + '\n', 'utf8');
  console.log(proof.summary); console.log(JSON.stringify(proof.gaps));
} catch (error) { failed = true; proof.failure=error.message;
  fs.writeFileSync('review/demon-turns/proof.json', JSON.stringify(proof, null, 2) + '\n', 'utf8'); console.error(error); }
finally { if (E) await E.close(); }
process.exit(failed ? 1 : 0); // Camera closed; do not retain old reload/socket timers.

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
import {TRAINING_TRACKS} from '../../ui/training-encounter.js';
const dir='review/zombie-intros-GP195',proof={tracks:{}};
const E=new Engine({training:true,warm:'none',size:'1000x700'});
try{
 await E.open();
 await E.ev('R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.setHp(10000);T.AudioSys.setMuted(false);T.AudioSys.unlock();T.player.position.set(-26,D.tg().floorY,-651);return true;');
 proof.roster=await E.ev("D.panel().render();return [...D.panel().element.querySelectorAll('[data-kind]')].map(e=>e.dataset.kind);");
 assert.deepEqual([...proof.roster].sort(),[...TRAINING_TRACKS].sort());assert.equal(proof.roster.length,13);
 for(const kind of TRAINING_TRACKS){
  const row=proof.tracks[kind]={};
  row.alarm=await E.ev(`D.clear();const accepted=D.spawn('${kind}',2);await wait(2800);return {accepted,audio:T.AudioSys.trainingState().encounters};`);
  assert.equal(row.alarm.accepted,2);assert.equal(row.alarm.audio.selected,null);assert(row.alarm.audio.tracks[kind].ready);
  row.release=await E.ev('await wait(2700);return {audio:T.AudioSys.trainingState().encounters,danger:D.state().danger.state(),gate:D.state().release.read(),alive:D.alive()};');
  assert.equal(row.release.audio.selected,kind);assert(row.release.audio.tracks[kind].playing);assert(row.release.audio.tracks[kind].looping);assert(row.release.danger.active);
  row.partial=await E.ev(`T.zombies.find(z=>z.alive&&z.trainingIntro&&z.typeKey==='${kind}').alive=false;await wait(100);return T.AudioSys.trainingState().encounters.selected;`);assert.equal(row.partial,kind);
  if(kind==='screamer') await E.ev("const a=T.spawnZombie(-32,-621,'shambler',true,true),b=T.spawnZombie(-29,-621,'feral',true,true);a.trainingZ=b.trainingZ=true;return true;");
  row.dead=await E.ev(`for(const z of T.zombies)if(z.typeKey==='${kind}'&&z.trainingIntro)z.alive=false;await wait(120);return {audio:T.AudioSys.trainingState().encounters,alive:D.alive(),danger:D.state().danger.state()};`);
  assert.equal(row.dead.audio.selected,null);assert(row.dead.audio.tracks[kind].fading);
  if(kind==='screamer'){assert(row.dead.alive>=2);assert(row.dead.danger.active);assert.equal(await E.ev("return D.spawn('guardian',1);"),0);}
  await new Promise(r=>setTimeout(r,2150));row.faded=await E.ev(`return T.AudioSys.trainingState().encounters.tracks['${kind}'];`);assert(!row.faded.fading);
  console.log(`PASS ${kind}: ${row.faded.seconds.toFixed(2)}s, gate start, partial survival, final death fade, no browser errors so far.`);
  fs.writeFileSync(`${dir}/proof.json`,JSON.stringify(proof,null,2));
 }
 proof.left=await E.ev('D.clear();D.leave();return T.AudioSys.trainingState();');assert(!proof.left.enabled);
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
 console.log('PASS all 13 Training types covered; Screamer adds never start their own intro; no browser errors.');
}finally{proof.errors=E.page?.errors;fs.writeFileSync(`${dir}/proof.json`,JSON.stringify(proof,null,2));await E.close();}
process.exit(0);

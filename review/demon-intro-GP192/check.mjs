import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../tools/camera.mjs';
const E = new Engine({ training: true, warm: 'none', size: '1000x700' });
const proof = {};
try {
  await E.open();
  await E.ev('R.release();T.AudioSys.setMuted(false);T.AudioSys.unlock();T.trainingDbg.panel().close();T.trainingDbg.clear();T.setHp(10000);return true;');

  await E.ev('window.D=T.trainingDbg;T.player.position.set(-26,D.tg().floorY,-643);await wait(120);return true;');
  for(let i=0;i<40;i++) { if(await E.ev('return T.AudioSys.trainingState().demon.ready;')) break; await new Promise(r=>setTimeout(r,250)); }
  const state = () => E.ev('return T.AudioSys.trainingState();');
  proof.idle = await state(); assert(proof.idle.demon.ready); assert(!proof.idle.demon.playing);
  proof.alarm = await E.ev("D.spawn('demon',2);await wait(4000);return T.AudioSys.trainingState();");
  assert(!proof.alarm.demon.playing);
  proof.release = await E.ev('await wait(1600);return {audio:T.AudioSys.trainingState(),pending:D.state().deployment.read(),gate:D.state().release.read(),demons:T.zombies.filter(z=>z.alive&&z.trainingZ).map(z=>({kind:z.typeKey,entry:!!z.trainingEntry}))};');
  assert(proof.release.audio.demon.playing); assert.equal(proof.release.gate.amount,1);
  proof.partial = await E.ev("T.zombies.find(z=>z.alive&&z.typeKey==='demon').alive=false;await wait(120);return T.AudioSys.trainingState();");
  assert(proof.partial.demon.playing);
  proof.mixed = await E.ev("D.spawn('shambler',1);await wait(5600);for(const z of T.zombies)if(z.typeKey==='demon')z.alive=false;await wait(120);return {audio:T.AudioSys.trainingState(),alive:D.alive()};");
  assert.equal(proof.mixed.alive,1);assert(!proof.mixed.audio.demon.playing);assert(proof.mixed.audio.demon.fading);
  await new Promise(r=>setTimeout(r,2300));proof.faded=await state();assert(!proof.faded.demon.fading);
  proof.repeat=await E.ev("D.spawn('demon',1);await wait(5600);return T.AudioSys.trainingState();");assert(proof.repeat.demon.playing);
  proof.clear=await E.ev('D.clear();await wait(120);return T.AudioSys.trainingState();');assert(!proof.clear.demon.playing);
  proof.mute=await E.ev("T.AudioSys.setMuted(true);D.spawn('demon',1);await wait(5600);T.AudioSys.setMuted(false);await wait(120);return T.AudioSys.trainingState();");assert(proof.mute.demon.playing);
  proof.blackout=await E.ev('D.blackout();await wait(120);return T.AudioSys.trainingState();');assert(!proof.blackout.demon.playing);
  proof.left=await E.ev('D.leave();return T.AudioSys.trainingState();');assert(!proof.left.enabled);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  console.log('PASS: live Ogg decoding, alarm timing, release, remaining demon, mixed group, fade completion, repeat, clear, mute recovery, blackout, exit; no browser errors.');
} finally { proof.errors=E.page?.errors;fs.writeFileSync('review/demon-intro-GP192/proof.json',JSON.stringify(proof,null,2));await E.close(); }
process.exit(0);

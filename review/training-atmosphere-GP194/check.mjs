import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const before=process.argv.includes('--before'),dir='review/training-atmosphere-GP194';
const E=new Engine({training:true,warm:'none',size:'1200x850'}),proof={};
try{
 await E.open();
 await E.ev('R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.setHp(10000);T.AudioSys.setMuted(false);T.AudioSys.unlock();T.player.position.set(-26,D.tg().floorY,-651);return true;');
 const shot=async(name)=>E.shoot({target:'player',cam:{x:-10,y:-174,z:-670,tx:-26,ty:-197,tz:-631,fov:52},out:`${dir}/${before?'before':'after'}-${name}.png`});
 await shot('idle');
 await E.ev("D.spawn('demon',1);await wait(8400);return true;");
 await shot('combat');
 proof.combat=await E.ev('return {alive:D.alive(),release:D.state().release.read(),audio:T.AudioSys.trainingState(),danger:D.state().danger?.state()};');
 if(!before){
  assert(proof.combat.danger.active);assert.equal(proof.combat.release.active,false);
  const a=await E.ev('return D.state().danger.state();');
  await E.ev('await wait(400);return true;');
  const b=await E.ev('return D.state().danger.state();');assert.notEqual(a.angle,b.angle);assert.notEqual(a.pulse,b.pulse);
  await shot('pulse');
  proof.door=await E.ev("D.clear();await wait(120);D.state().security.toggle();await wait(900);D.state().security.toggle();await wait(900);return T.AudioSys.trainingState();");
  assert(Math.abs(proof.door.door.seconds-.6)<.01);assert(proof.door.door.plays>=2);assert.equal(proof.door.door.active,0);
  assert(proof.door.introGain>proof.door.musicGain*3);
  await E.ev('D.clear();await wait(1500);return true;');
  proof.cleared=await E.ev('return D.state().danger.state();');assert(!proof.cleared.active);assert.equal(proof.cleared.amount,0);
  await shot('cleared');
  proof.deaths=await E.ev('D.spawn("shambler",3);await wait(5400);const zs=T.zombies.filter(z=>z.alive&&z.trainingZ);zs[0].alive=false;await wait(120);const partial=D.state().danger.state();for(const z of zs)z.alive=false;await wait(1100);return {partial,last:D.state().danger.state()};');
  assert(proof.deaths.partial.active);assert(!proof.deaths.last.active);assert.equal(proof.deaths.last.amount,0);
  proof.switch=await E.ev('D.toggleLights();D.spawn("shambler",1);await wait(5400);D.clear();await wait(1300);return {lights:D.lights(),danger:D.state().danger.state()};');
  assert(!proof.switch.lights.on);assert(!proof.switch.danger.active);
  await E.ev('D.toggleLights();D.spawn("shambler",1);await wait(5400);D.blackout();await wait(1300);return true;');
  proof.blackout=await E.ev('return D.state().danger.state();');assert(!proof.blackout.active);
  proof.left=await E.ev('D.leave();return D.state().danger.state();');assert(!proof.left.active);assert.equal(proof.left.amount,0);
 }
 proof.errors=E.page.errors;assert.equal(proof.errors.length,0);console.log(`${before?'BEFORE':'PASS'}: ${JSON.stringify(proof)}`);
}finally{proof.errors=E.page?.errors;fs.writeFileSync(`${dir}/${before?'before':'proof'}.json`,JSON.stringify(proof,null,2));await E.close();}
process.exit(0);

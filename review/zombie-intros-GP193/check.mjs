import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Engine } from '../../tools/camera.mjs';
const dir='review/zombie-intros-GP193';
const E=new Engine({training:true,warm:'none',size:'1200x850'}), proof={};
try {
  await E.open();
  await E.ev('R.release();window.D=T.trainingDbg;D.panel().close();D.clear();T.setHp(10000);T.AudioSys.setMuted(false);T.AudioSys.unlock();T.player.position.set(-26,D.tg().floorY,-651);return true;');
  proof.idle=await E.ev('return T.AudioSys.trainingState().encounters;');assert.equal(proof.idle.selected,null);
  for(const kind of ['colossus','screamer','bomber','demon']) {
    const p=proof[kind]={};
    p.alarm=await E.ev(`D.clear();const accepted=D.spawn('${kind}',2);await wait(3000);return {accepted,audio:T.AudioSys.trainingState().encounters,pending:D.state().deployment.read()};`);
    assert.equal(p.alarm.accepted,2);assert.equal(p.alarm.audio.selected,null);assert(p.alarm.audio.tracks[kind].ready);
    p.release=await E.ev(`await wait(2400);return {audio:T.AudioSys.trainingState().encounters,gate:D.state().release.read(),alive:D.alive(),rejected:D.spawn('feral',3)};`);
    assert.equal(p.release.audio.selected,kind);assert(p.release.audio.tracks[kind].playing);assert(p.release.audio.tracks[kind].looping);assert.equal(p.release.rejected,0);
    if(kind==='colossus') {
      await E.ev("D.openPanel();D.panel().pick('colossus',2);return true;");
      p.panel=await E.ev("const b=D.panel().element.querySelector('.tp-spawn');const before=D.state().deployment.read();b.dispatchEvent(new MouseEvent('click',{bubbles:true}));return {disabled:b.disabled,status:D.panel().element.querySelector('.tp-status').textContent,before,after:D.state().deployment.read()};");
      assert(p.panel.disabled);assert.equal(p.panel.after,null);
      await E.shoot({live:true,ui:true,out:`${dir}/after-panel.png`});
      // Reconstruct the previous panel presentation for a same-scene visual comparison.
      await E.ev("const root=D.panel().element;window.panelBefore={status:root.querySelector('.tp-status').textContent,title:root.querySelector('.tp-spawn').title};root.querySelector('.tp-status').textContent='2 zombies in the build room';root.querySelector('.tp-spawn').disabled=false;root.querySelector('.tp-spawn').title='';return true;");
      await E.shoot({live:true,ui:true,out:`${dir}/before-panel-reconstructed.png`});
      await E.ev('D.panel().render();D.panel().close();return true;');
    }
    p.partial=await E.ev(`T.zombies.find(z=>z.alive&&z.trainingZ&&z.typeKey==='${kind}').alive=false;await wait(120);return T.AudioSys.trainingState().encounters;`);
    assert.equal(p.partial.selected,kind);
    if(kind==='screamer') await E.ev("const z=T.spawnZombie(-30,-620,'shambler',true,true);z.trainingZ=true;return true;");
    p.dead=await E.ev(`for(const z of T.zombies)if(z.typeKey==='${kind}'&&z.trainingZ)z.alive=false;await wait(120);return {audio:T.AudioSys.trainingState().encounters,alive:D.alive(),rejected:D.spawn('feral',1)};`);
    assert.equal(p.dead.audio.selected,null);assert(p.dead.audio.tracks[kind].fading);
    if(kind==='screamer'){assert(p.dead.alive>0);assert.equal(p.dead.rejected,0);}
    else {assert.equal(p.dead.rejected,1);await E.ev('D.clear();return true;');}
    await new Promise(r=>setTimeout(r,2200));
    p.faded=await E.ev(`return T.AudioSys.trainingState().encounters.tracks['${kind}'];`);assert(!p.faded.fading);
    await E.ev('D.clear();D.openPanel();return true;');
    p.unlocked=await E.ev("return !D.panel().element.querySelector('.tp-spawn').disabled;");assert(p.unlocked);
    await E.ev('D.panel().close();return true;');
  }
  proof.cancel=await E.ev("D.spawn('bomber',1);await wait(500);D.clear();await wait(5200);return {audio:T.AudioSys.trainingState().encounters,alive:D.alive()};");assert.equal(proof.cancel.alive,0);assert.equal(proof.cancel.audio.selected,null);
  proof.left=await E.ev('D.leave();return T.AudioSys.trainingState();');assert(!proof.left.enabled);
  proof.errors=E.page.errors;assert.equal(proof.errors.length,0);
  console.log('PASS: four decoded tracks, preload during alarm, gate release, loops, partial/last death and fade, Screamer summon hold, call-in/button locks, unlock on clear, canceled alarm, exit; zero browser errors.');
} finally { proof.errors=E.page?.errors;fs.writeFileSync(`${dir}/proof.json`,JSON.stringify(proof,null,2));await E.close(); }
process.exit(0);

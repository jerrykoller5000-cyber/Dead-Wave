// GP-19969: restored repaired-relay state, real radio owner and UI. Through the slot.
import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const e=new Engine({match:true,warm:'none',size:[1280,720]}),out='handoffs/GP-19969/after';
try {
 await e.open();
 await e.page.evaluate(`(async()=>{
  TT.runDevCommand('godmode');TT.clearZombies();TT.setDay(4);TT.setRelayUpDbg(true);TT.startPrep();
  const r=TT.radioCuesDbg().runtime,b=r.save();b.state.revealed=true;
  if(!r.restore(b))throw Error('repaired relay fixture refused');
  const p=TT.HQ_RADIO_FRONT;TT.player.position.set(p.x,TT.house.group.position.y+1,p.z);
  await new Promise(r=>setTimeout(r,200));TT.openHQBriefingDbg({panel:'radio'});
  const buttons=[...document.querySelectorAll('.radio-call-card')];
  if(!buttons.some(b=>!b.disabled))throw Error('no radio choices at actual radio');
 })()`);
 await e.page.screenshot(`${out}/radio-choices-1280.png`);
 await e.page.setViewport(390,844);
 await e.page.evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
 await e.page.screenshot(`${out}/radio-choices-390.png`);
 const proof=await e.page.evaluate(`(async()=>{
  const T=TT,r=T.radioCuesDbg().runtime,logs=[],ok=(c,m)=>logs.push((c?'PASS ':'FAIL ')+m);
  const send=d=>dispatchEvent(new CustomEvent('dw-game',{detail:{type:'radio-call-request',...d}}));
  const offered=document.querySelector('.radio-call-card:not(:disabled)').dataset.card;
  const base={runId:r.read().runId,day:T.getDay(),card:offered},pos=T.player.position.clone();
  send({...base,runId:-1});ok(!r.read().radioCall.receipt,'radio stale run refused');
  send({...base,day:base.day-1});ok(!r.read().radioCall.receipt,'radio stale day refused');
  T.player.position.x+=100;send(base);ok(!r.read().radioCall.receipt,'radio remote request refused');T.player.position.copy(pos);
  document.querySelector('.briefing-close').click();const p=T.HQ_DUTY_BOARD_FRONT;T.player.position.set(p.x,T.house.group.position.y+1,p.z);
  await new Promise(r=>setTimeout(r,180));T.openHQBriefingDbg({panel:'duty'});send(base);ok(!r.read().radioCall.receipt,'radio request from duty mode refused');
  document.querySelector('.briefing-close').click();T.player.position.copy(pos);await new Promise(r=>setTimeout(r,180));T.openHQBriefingDbg({panel:'radio'});
  document.querySelector('.radio-call-card[data-card='+offered+']').click();
  ok(r.read().radioCall.receipt?.card===offered,'actual offered radio choice accepted by owner');
  send({...base,card:offered==='medical'?'ammo':'medical'});ok(r.read().radioCall.receipt?.card===offered,'second different radio choice refused');
  const d=document.getElementById('hqBriefing');ok(d.open&&d.dataset.panel==='radio','choice refresh stays at the radio');
  return logs;
 })()`);
 fs.writeFileSync(`${out}/radio.log`,proof.join('\n')+'\n');console.log(proof.join('\n'));
 if(proof.some(s=>s.startsWith('FAIL'))||e.page.errors.length)throw Error(JSON.stringify(e.page.errors));
}finally{await e.close();}

// GP-19969: the actual HQ stations, lead flow, reach/run guards and alarm separation.
(async () => {
 const T=window.TT,out=[],ok=(c,m)=>out.push((c?'PASS ':'FAIL ')+m),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const send=(type,fields={})=>window.dispatchEvent(new CustomEvent('dw-game',{detail:{type,...fields}}));
 const press=()=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code:'KeyE',key:'e',bubbles:true}));};
 let data=null;const receive=({detail})=>{if(detail?.type==='briefing-open')data=detail;};window.addEventListener('dw-game',receive);
 const dialog=()=>document.getElementById('hqBriefing');
 const close=()=>{if(dialog()?.open)dialog().querySelector('.briefing-close').click();};
 const runtime=()=>T.radioCuesDbg().runtime;
 async function open(panel){close();const p=panel==='alarm'?T.HQ_PANEL_FRONT:panel==='duty'?T.HQ_DUTY_BOARD_FRONT:T.HQ_RADIO_FRONT;T.player.position.set(p.x,T.house.group.position.y+1,p.z);await wait(160);press();await wait(100);return dialog()?.open&&dialog().dataset.panel===panel;}
 try {
  if(T.getPhase()==='idle')await startMatch(T,'Story panels');
  T.runDevCommand('godmode');T.clearZombies();
  if(!T.house.dutyBoard||!T.house.radioSet||!T.HQ_DUTY_BOARD_FRONT||!T.HQ_RADIO_FRONT){ok(false,'AG-125 exports both real station centres');return out.join('\n');}
  ok(true,'AG-125 exports both real station centres');
  T.storyDbg.chain.reset();T.setDay(1);T.storyDbg.sync();await wait(180);
  ok(await open('duty'),'E at the real duty board opens its panel');
  ok(!dialog().querySelector('.story-lead'),'day 1 has no lead cards');close();
  // A new dawn, never proximity, puts this lead on the map and tracker.
  T.setDay(2);T.storyDbg.sync();await wait(220);
  ok(document.getElementById('storyLeadCard')?.dataset.lead==='generator'&&!document.getElementById('storyLeadCard').hidden,'day 2 shows the generator dawn card');
  ok(runtime().markers().some(m=>m.id==='objective:fuel-depot'),'open generator gets a remote marker');
  ok(!runtime().markers().some(m=>m.id==='objective:medical-convoy'),'closed medical lead has no marker');
  const ids=['generator','relay','medical','missing','truck','search','oldman','below'];
  for(let day=2;day<=9;day++) {
   T.setDay(day);T.storyDbg.sync();await wait(120);await open('duty');
   const rows=[...dialog().querySelectorAll('.story-lead')];
   ok(rows.length===day-1&&rows[0]?.dataset.lead===ids[day-2],`day ${day}: only earned cards, open ${ids[day-2]} first`);
   ok(!dialog().querySelector('.briefing-nav')&&dialog().querySelector('.briefing-alarm').hidden,`day ${day}: no alarm control beside leads`);
   if(day===2) {
    const base={runId:data.runId,day:data.day,id:'generator',site:'objective:fuel-depot'};
    send('story-track-request',{...base,runId:-1});ok(dialog().open,'stale-run Track refused');
    send('story-track-request',{...base,site:'objective:medical-convoy'});ok(dialog().open,'mismatched lead/site Track refused');
    const p=T.player.position.clone();T.player.position.x+=100;
    send('story-track-request',base);ok(dialog().open,'remote Track refused');T.player.position.copy(p);
    send('alarm-request');ok(dialog().open&&T.getPhase()==='prep','alarm request from duty mode refused');
    dialog().querySelector('[data-track=generator]').click();await wait(120);
    ok(!dialog().open&&runtime().markers().some(m=>m.id===base.site&&m.selected),'Track closes board and selects actual objective');
   }
   close();if(day<9)T.runDevCommand('story done '+ids[day-2]);
  }
  for(const first of [false,true]) {
   T.setViewFirstDbg(first);
   ok(await open('alarm'),`${first?'1P':'3P'} E at alarm opens alarm mode`);
   ok(!dialog().querySelector('.story-lead,.briefing-radio,.quest-panel')&&!dialog().querySelector('.briefing-nav'),'alarm DOM contains only its report/actions');
   ok(dialog().querySelector('.briefing-extraction').hidden,'Heron is absent from alarm');close();
   ok(await open('radio'),`${first?'1P':'3P'} E at radio opens radio mode`);
   ok(dialog().querySelector('.briefing-alarm').hidden&&!dialog().querySelector('.story-lead'),'radio has no alarm or duty cards');
   const yaw=T.otsDbg().yaw;window.dispatchEvent(new MouseEvent('mousemove',{movementX:80,movementY:20}));
   ok(T.otsDbg().yaw===yaw&&!document.pointerLockElement,'open station holds camera and frees pointer');close();
  }
  T.setDay(20);T.setRelayUpDbg(true);await open('radio');
  const boat=dialog().querySelector('.briefing-extraction');ok(!boat.hidden&&!boat.disabled,'Heron offered at radio on night 20');
  send('extraction-request',{runId:data.runId,day:data.day});ok(T.getWaveDirectorState().extraction.state==='offered','unconfirmed extraction refused');
  boat.click();ok(!dialog().querySelector('.heron-confirm').hidden&&T.getWaveDirectorState().extraction.state==='offered','first Heron click only opens confirmation');
  dialog().querySelector('.heron-confirm button').click();ok(dialog().querySelector('.heron-confirm').hidden&&T.getPhase()==='prep','cancel keeps preparations');
  boat.click();dialog().querySelector('.heron-confirm button:last-child').click();
  ok(T.getWaveDirectorState().extraction.state==='called'&&!dialog().open,'confirmed Heron call accepted once and closes radio');
 } catch(error){ok(false,error.stack||String(error));}
 finally {close();window.removeEventListener('dw-game',receive);}
 return out.join('\n');
})()

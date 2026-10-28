// GP-19969 native game proof; invoke through crew slot run. One browser, serial work.
import fs from 'node:fs';
import {Engine} from '../tools/camera.mjs';
const mode=process.argv[2]||'all',out='handoffs/GP-19969/after';
fs.mkdirSync(out,{recursive:true});
const engine=new Engine({match:true,warm:'none',size:[1280,720]}),results=[];
try {
 await engine.open();
 // A real match asks before leaving; accept only this proof browser's reload.
 engine.page.conn.onEvent(event=>{
  if(event.sessionId===engine.page.sessionId&&event.method==='Page.javascriptDialogOpening'&&event.params.type==='beforeunload')
   engine.page.send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
 });
 if(mode!=='shots') {
  const proof=await engine.page.evaluate(fs.readFileSync('tools/tests/t301.js','utf8'),180000);
  fs.writeFileSync(`${out}/t301.log`,proof,'utf8');console.log(proof);
  if(proof.includes('FAIL ')){process.exitCode=1;throw Error('t301 failed');}
  if(mode==='all')await engine.load();
 }
 if(mode!=='checks') {
  await engine.page.evaluate(`(async()=>{TT.setDay(2);TT.storyDbg.sync();await new Promise(r=>setTimeout(r,220));})()`);
  await engine.page.screenshot(`${out}/dawn-lead-1280.png`);
  await engine.page.evaluate(`(async()=>{TT.runDevCommand('godmode');TT.clearZombies();for(const [day,id]of [[2,'generator'],[3,'relay'],[4,'medical']]){TT.setDay(day-1);TT.startPrep();TT.storyDbg.sync();TT.runDevCommand('story done '+id);}TT.setRelayUpDbg(true);TT.startPrep();TT.storyDbg.sync();await new Promise(r=>setTimeout(r,200));window.gpStoryData=null;addEventListener('dw-game',({detail})=>{if(detail?.type==='briefing-open')window.gpStoryData=detail;});})()`);
  for(const [width,height]of (process.argv.includes('--narrow')?[[390,844]]:[[1280,720],[390,844]])) {
   await engine.page.evaluate(`(async()=>{document.querySelector('#hqBriefing[open] .briefing-close')?.click();TT.setViewFirstDbg(false);await new Promise(r=>setTimeout(r,250));})()`);
   await engine.page.setViewport(width,height);
   await engine.page.evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
   for(const first of [false,true])for(const light of ['day','night']) {
    for(const panel of ['alarm','duty','radio']) {
     const state=await engine.page.evaluate(`(async()=>{
      document.querySelector('#hqBriefing[open] .briefing-close')?.click();
      TT.setViewFirstDbg(${first});TT.setWorldTime(${light==='day'?.5:.02});
      const p=${JSON.stringify(panel)}==='alarm'?TT.HQ_PANEL_FRONT:${JSON.stringify(panel)}==='duty'?TT.HQ_DUTY_BOARD_FRONT:TT.HQ_RADIO_FRONT;
      if(!p)throw Error('Missing actual station');TT.player.position.set(p.x,TT.house.group.position.y+1,p.z);
      await new Promise(r=>setTimeout(r,180));
      for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code:'KeyE',key:'e',bubbles:true}));
      await new Promise(r=>setTimeout(r,160));const d=document.getElementById('hqBriefing'),c=d.querySelector('.briefing-content');
      if(!d.open||d.dataset.panel!==${JSON.stringify(panel)})throw Error('E did not open '+${JSON.stringify(panel)});
      return {panel:d.dataset.panel,first:TT.fpDbg().first,overflow:c.scrollWidth>c.clientWidth+1||d.scrollWidth>d.clientWidth+1,dimensions:{content:[c.scrollWidth,c.clientWidth],dialog:[d.scrollWidth,d.clientWidth]},pointerLocked:!!document.pointerLockElement,story:window.gpStoryData?.story,position:TT.player.position.toArray()};
     })()`);
     const file=`${out}/${panel}-${first?'fp':'tp'}-${light}-${width}.png`;
     await engine.page.screenshot(file);results.push({file,...state});
     fs.writeFileSync(`${out}/capture-progress.json`,JSON.stringify({results,errors:engine.page.errors,warnings:engine.page.console.filter(c=>c.type==='warning'||c.type==='warn')},null,2));
     if(state.overflow||state.pointerLocked||state.first!==first)throw Error('layout/view/pointer check failed '+file+' '+JSON.stringify(state));
    }
   }
  }
  await engine.page.setViewport(1280,720);
  await engine.page.evaluate(`(async()=>{document.querySelector('#hqBriefing[open] .briefing-close')?.click();TT.setDay(20);TT.setRelayUpDbg(true);const p=TT.HQ_RADIO_FRONT;TT.player.position.set(p.x,TT.house.group.position.y+1,p.z);await new Promise(r=>setTimeout(r,180));TT.openHQBriefingDbg({panel:'radio'});document.querySelector('.briefing-extraction').click();})()`);
  await engine.page.screenshot(`${out}/heron-confirm-1280.png`);
 }
 const result={results,errors:engine.page.errors,renderer:engine.renderer,loadSec:engine.loadSec};
 fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({captures:results.length,errors:result.errors,renderer:result.renderer,loadSec:result.loadSec}));
 if(result.errors.length)process.exitCode=1;
} finally {await engine.close();}

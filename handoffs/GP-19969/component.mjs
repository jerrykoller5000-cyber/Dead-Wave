// Native-rendered presentation check while AG-125 builds the physical stations.
// The panel payload is substituted; this is not E-entry/reach acceptance.
import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const out='handoffs/GP-19969/component',engine=new Engine({match:true,warm:'none',size:[1280,720]});
fs.mkdirSync(out,{recursive:true});
const results=[];
try {
 await engine.open();
 await engine.page.evaluate(`(async()=>{
  TT.runDevCommand('godmode');TT.clearZombies();for(const [day,id]of [[2,'generator'],[3,'relay'],[4,'medical']]){TT.setDay(day);TT.storyDbg.sync();TT.runDevCommand('story done '+id);}TT.setDay(5);TT.storyDbg.sync();
  addEventListener('dw-game',({detail})=>{if(detail?.type==='briefing-open'&&detail.panel==='alarm')window.gpPresentation=detail;});
  const p=TT.HQ_PANEL_FRONT;TT.player.position.set(p.x,TT.house.group.position.y+1,p.z);await new Promise(r=>setTimeout(r,200));TT.openHQBriefingDbg();
  if(!window.gpPresentation)throw Error('missing live data');
 })()`);
 for(const [width,height]of [[1280,720],[390,844]]) {
  await engine.page.setViewport(width,height);
  for(const panel of ['alarm','duty','radio']) {
   await engine.page.evaluate(`(()=>{const data={...window.gpPresentation,panel:'${panel}',canUsePanel:true};dispatchEvent(new CustomEvent('dw-game',{detail:data}));})()`);
   const state=await engine.page.evaluate(`(()=>{const d=document.getElementById('hqBriefing'),c=d.querySelector('.briefing-content');return {mode:d.dataset.panel,open:d.open,overflow:c.scrollWidth>c.clientWidth+1||d.scrollWidth>d.clientWidth+1};})()`);
   const file=`${out}/${panel}-${width}.png`;await engine.page.screenshot(file);results.push({file,...state});if(state.overflow)throw Error('overflow '+file);
  }
 }
 await engine.page.setViewport(1280,720);
 await engine.page.evaluate(`(()=>{dispatchEvent(new CustomEvent('dw-game',{detail:{...window.gpPresentation,panel:'radio',day:20,goalNight:20,extraction:'offered',relayReady:true,canUsePanel:true}}));document.querySelector('.briefing-extraction').click();})()`);
 await engine.page.screenshot(`${out}/heron-confirm.png`);
 const result={scope:'Presentation only; substituted panel mode over real game data',results,errors:engine.page.errors,renderer:engine.renderer};
 fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.errors.length)process.exitCode=1;
}finally{await engine.close();}

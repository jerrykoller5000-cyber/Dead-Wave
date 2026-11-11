import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20084');
const phase = process.argv[2] || 'before';
if (!['before', 'after'].includes(phase)) throw Error('Phase must be before or after');
fs.mkdirSync(out, {recursive:true});
const server = await serve(root, 0);
const browser = await launch({headless:false,args:['--window-size=1280,720']});
const report = {phase, stations:[], panels:[], lights:[], errors:[]};
const snap = async (page,name) => page.screenshot(path.join(out, `${phase}-${name}.png`));
try {
  const page = await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20084 Eye';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate('document.getElementById("perf")?.classList.remove("on")');
  const stations=['cif','kiosk','armory','hqPanel','skullWindow','lightSwitch','rangeConsole'];
  const modes=[['noon',.5,true],['overcast',.5,false],['dusk',.74,true],['night',.02,false]];
  for(const [light,time,on] of modes){
    await page.evaluate(`(()=>{const T=TT;T.setWorldTime(${time});const s=T.trainingDbg.lights();if(s.on!==${on})T.trainingDbg.toggleLights();})()`);
    report.lights.push({light,state:await page.evaluate('TT.trainingDbg.lights()')});
    for(const width of [1280,390]){
      await page.setViewport(width,width===390?844:720);
      for(const station of stations){
        const state=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.stations[${JSON.stringify(station)}],f=s.front;T.player.position.set(f.x,tg.floorY,f.z);T.setShotView({x:f.x,y:tg.floorY+1.65,z:f.z,tx:s.x,ty:tg.floorY+1.4,tz:s.z,fov:65});return {station:${JSON.stringify(station)},width:innerWidth,action:T.trainingDbg.action(),hint:document.getElementById('trainingHud')?.innerText||'',front:f,stationAt:{x:s.x,z:s.z}}})()`);
        report.stations.push({...state,light});
        await new Promise(r=>setTimeout(r,120));
        await snap(page,`${light}-${width}-${station}-eye`);
      }
    }
  }
  await page.evaluate('TT.setWorldTime(.5); if(!TT.trainingDbg.lights().on) TT.trainingDbg.toggleLights()');
  for(const width of [1280,390]){
    await page.setViewport(width,width===390?844:720);
    for(const [station,action,selector,close] of [
      ['cif','cif','#cif','cif'],['kiosk','kiosk','#shop','shop'],['armory','armory','#armoryPanel','armory'],
      ['hqPanel','trainingPanel','#trainingPanel','trainingPanel'],['rangeConsole','rangeConsole','#rangeConsole','rangeConsole']]){
      const state=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.stations[${JSON.stringify(station)}],f=s.front;T.player.position.set(f.x,tg.floorY,f.z);T.setShotView({x:f.x,y:tg.floorY+1.65,z:f.z,tx:s.x,ty:tg.floorY+1.4,tz:s.z,fov:65});T.trainingDbg.act(${JSON.stringify(action)});const p=document.querySelector(${JSON.stringify(selector)});return {station:${JSON.stringify(station)},width:innerWidth,action:T.trainingDbg.action(),found:!!p,hidden:p?.hidden,preview:p?.innerText?.slice(0,500),scrollWidth:document.documentElement.scrollWidth}})()`);
      report.panels.push(state);
      await new Promise(r=>setTimeout(r,100));
      await snap(page,`${width}-${station}-panel`);
      await page.evaluate(`(()=>{const T=TT;if(${JSON.stringify(close)}==='rangeConsole')T.rangeDbg.exit();else if(${JSON.stringify(close)}==='trainingPanel')T.trainingDbg.panel()?.close();else T.closeMenuDbg(${JSON.stringify(close)})})()`);
    }
  }
  if(phase==='after'){
    const runner=fs.readFileSync(path.join(root,'review/GP-20081/drills-page.js'),'utf8');
    await page.setViewport(1280,720);
    report.drill=await page.evaluate(`(async()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.rangeConsole.front,F=T.rangeDbg.feature(),d=(await import('/ui/range-drills.js')).RANGE_DRILLS[40];T.player.position.set(f.x,tg.floorY,f.z);T.setShotView({x:f.x,y:tg.floorY+1.65,z:f.z,tx:tg.stations.rangeConsole.x,ty:tg.floorY+1.4,tz:tg.stations.rangeConsole.z,fov:65});F.open();const start=F.start(d);for(let i=0;i<42;i++){tg.update(.25);F.tick(.25);if(i%8===7)await new Promise(requestAnimationFrame)}return {start,hud:document.getElementById('rangeDrillHud')?.innerText||'',state:F.read().state}})()`);
    await snap(page,'1280-drill-active');
    await page.setViewport(390,844); await snap(page,'390-drill-active');
    await page.evaluate('TT.rangeDbg.open(); TT.rangeDbg.exit(); window.GP20081={index:40}');
    await page.setViewport(1280,720);
    report.result=await page.evaluate(runner,300000);
    await page.evaluate('TT.rangeDbg.open()');
    await snap(page,'1280-drill-result');
    await page.setViewport(390,844); await snap(page,'390-drill-result');
    report.resultLayout=await page.evaluate(`(()=>{const p=document.querySelector('#rangeConsole .rd-last-run'),r=p.getBoundingClientRect();return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,left:r.left,right:r.right,top:r.top,text:p.innerText.slice(0,400)}})()`);
  }
  report.errors=page.errors;
  assert.deepEqual(report.errors,[]);
  console.log(`PASS GP-20084 ${phase} eye audit: ${report.stations.length} physical station views, ${report.panels.length} panels, ${report.errors.length} page errors`);
} finally {
  fs.writeFileSync(path.join(out,`${phase}-eye-audit.json`),JSON.stringify(report,null,2));
  await browser.close(); await server.close();
}

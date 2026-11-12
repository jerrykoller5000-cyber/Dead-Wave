import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use exclusive crew slot');
const root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20126');
const traced=process.argv.includes('--trace'),traceEvents=[];
const report={at:new Date().toISOString(),traced,actions:[],errors:[]},pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),browser=await launch({headless:false,args:['--disable-background-timer-throttling','--window-size=1280,720']});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:240000});
 if(!await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000}))throw Error('load');
 await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
 await page.evaluate('document.getElementById("playerName").value="GP-20126 Clean";document.getElementById("modeTraining").click()');
 if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000}))throw Error('Training');
 await page.evaluate(`(()=>{const T=TT,t=T.trainingDbg.tg();T.player.position.set(t.origin.x,t.floorY,t.origin.z-10);T.grantAllWeapons();T.setUnarmedDbg(false);T.setWorldTime(.5);T.weather.raining=false;})()`);
 await pause(2000);
 await page.evaluate(`(()=>{window.Q={stage:'idle',last:0,gaps:[],longtasks:[],marks:[],frames:0,prev:null};
 const snap=()=>({t:performance.now(),heap:performance.memory?.usedJSHeapSize||0,pipelines:TT.renderer._pipelines?.caches?.size??-1,geometries:TT.renderer.info.memory.geometries,textures:TT.renderer.info.memory.textures});
 window.markAction=name=>{Q.stage=name;Q.marks.push({name,...snap()});performance.mark(name);return snap();};
 const tick=t=>{const now=snap();if(Q.last&&t-Q.last>50)Q.gaps.push({action:Q.stage,ms:+(t-Q.last).toFixed(2),raf:t,before:Q.prev,after:now});Q.last=t;Q.prev=now;Q.frames++;requestAnimationFrame(tick);};requestAnimationFrame(tick);
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())Q.longtasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:false});}catch{} })()`);
 let traceDone,traceOnBrowser=false;
 if(traced){
  traceDone=new Promise(resolve=>page.conn.onEvent(msg=>{if(msg.method==='Tracing.dataCollected')traceEvents.push(...msg.params.value);if(msg.method==='Tracing.tracingComplete')resolve();}));
  const cfg={transferMode:'ReportEvents',traceConfig:{includedCategories:['v8','disabled-by-default-v8.gc','devtools.timeline','blink.user_timing','gpu'],recordMode:'recordContinuously'}};
  try{await page.send('Tracing.start',cfg);}catch{traceOnBrowser=true;await page.conn.send('Tracing.start',cfg);}
 }
 if(process.argv.includes('--cpu')){await page.send('Profiler.enable',{});await page.send('Profiler.setSamplingInterval',{interval:1000});await page.send('Profiler.start',{});}
 const selected=process.argv.find(x=>x.startsWith('--guns='));
 const guns=selected?selected.slice(7).split(','):['pistol','revolver','uzi','m4','ak','shotgun','aa12','sniper','minigun','launcher','flamer','chainsaw'];
 const mark=async name=>page.evaluate('markAction('+JSON.stringify(name)+')');
 const snapshot=()=>page.evaluate('({gun:TT.getCurrentWeapon(),first:TT.fpDbg().first,ammo:TT.getAmmo()[TT.getCurrentWeapon()],reloading:TT.isReloading(),t:performance.now()})');
 for(let pass=1;pass<=2;pass++)for(const view of ['eye','hip'])for(const gun of guns){
  const tag=(pass===1?'first':'repeat')+'/'+view+'/'+gun;
  await mark(tag+'/draw');
  await page.evaluate('TT.setShotView(null);TT.setViewFirstDbg('+(view==='eye')+');TT.takeOutGun('+JSON.stringify(gun)+');TT.setWeapon(TT.WEAPON_ORDER.indexOf('+JSON.stringify(gun)+'))');
  await pause(800);const drawn=await snapshot();
  await mark(tag+'/fire');
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'left',clickCount:1});await pause(gun==='minigun'?1300:350);
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'left',clickCount:1});await pause(250);const fired=await snapshot();
  await mark(tag+'/reload');
  await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'r',code:'KeyR',windowsVirtualKeyCode:82});await pause(70);await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'r',code:'KeyR',windowsVirtualKeyCode:82});
  await pause(150);const reloading=await snapshot();
  if(!await page.waitFor('!TT.isReloading()',{timeout:20000}))throw Error('reload stuck '+tag);
  await pause(300);const settled=await snapshot();report.actions.push({tag,drawn,fired,reloading,settled});
  console.log(tag,JSON.stringify({draw:drawn.ammo,fired:fired.ammo,reload:reloading.reloading,settled:settled.ammo}));
 }
 await mark('idle-final');await pause(2000);
 report.measure=await page.evaluate('Q');report.errors=page.errors.slice();report.warnings=page.console.filter(x=>x.type==='warning'||x.type==='error');
 if(process.argv.includes('--cpu'))report.cpu=(await page.send('Profiler.stop',{})).profile;
 if(traced){
  if(traceOnBrowser)await page.conn.send('Tracing.end',{});else await page.send('Tracing.end',{});
  await Promise.race([traceDone,pause(30000)]);
  const anchor=report.measure.marks.find(m=>traceEvents.some(e=>e.name===m.name&&e.cat?.includes('user_timing')));
  const ev=anchor&&traceEvents.find(e=>e.name===anchor.name&&e.cat?.includes('user_timing'));
  const offset=ev?ev.ts/1000-anchor.t:null;
  report.trace={offset,eventCount:traceEvents.length,threads:traceEvents.filter(e=>e.name==='thread_name'),events:traceEvents.filter(e=>e.ph==='X'&&e.dur>=1000)};
  if(offset!=null)report.trace.gaps=report.measure.gaps.map(g=>{const lo=g.raf-g.ms+offset,hi=g.raf+offset;return {action:g.action,ms:g.ms,overlap:report.trace.events.filter(e=>e.ts/1000<hi&&(e.ts+e.dur)/1000>lo).sort((a,b)=>b.dur-a.dur).slice(0,15).map(e=>({name:e.name,ms:e.dur/1000,pid:e.pid,tid:e.tid,cat:e.cat,args:e.args}))};});
 }
 console.log('SUMMARY',JSON.stringify({actions:report.actions.length,frames:report.measure.frames,gaps:report.measure.gaps.length,errors:report.errors}));
}catch(e){report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,process.argv.includes('--cpu')?'cpu-trace.json':traced?'trace.json':'clean.json'),JSON.stringify(report,null,2));await browser.close();await server.close();}

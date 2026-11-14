import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN,'Use exclusive game slot');
const out=path.resolve('review/GP-20143/corrected');fs.mkdirSync(out,{recursive:true});const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const source=fs.readFileSync('index.html','utf8'),archived=fs.readFileSync('_DELETE ME/claude7-index-before-cg6-note40.html','utf8');
assert(archived.includes('new THREE.HemisphereLight(0xddeeff, 0x445566, 1.1)'),'exact old hemisphere');
assert(/brightness = 1; vibrancy = 1;/.test(archived),'exact old grade');
let patched=source;const replace=(a,b)=>{assert.equal(patched.split(a).length,2,a);patched=patched.replace(a,b);};
replace('brightness = 1.05; vibrancy = 1.15;','brightness = window.__n40After ? 1.05 : 1; vibrancy = window.__n40After ? 1.15 : 1;');
replace('b == null ? 1.05 :','b == null ? (window.__n40After ? 1.05 : 1) :');
replace('v == null ? 1.15 :','v == null ? (window.__n40After ? 1.15 : 1) :');
replace('if (training.active && !training.lightsOff) hemi.intensity = Math.max(hemi.intensity, 1.15);','if (window.__n40After && training.active && !training.lightsOff) hemi.intensity = Math.max(hemi.intensity, 1.15);');
function install(){
 const originalDay=updateDayNight,originalAdvance=advanceSkyClock;
 const Q=window.__n40={enabled:false,time:.5,rain:false,measuring:false,done:false,frames:[],rows:[],
  light(t,rain=false){this.time=t;this.rain=rain;this.enabled=true;this.applyDay();},
  applyDay(){worldTime=this.time;skyLoop.mode='hold';skyLoop.tween=null;weather.raining=this.rain;weather.intensity=this.rain?1:0;weather.rainTimeLeft=this.rain?900:0;weather.timer=900;originalDay(0);if(this.rain)updateWeatherFog();},
  setAfter(on){window.__n40After=!!on;hemi.color.setHex(on?0xf3f1ea:0xddeeff);hemi.groundColor.setHex(on?0x8c877c:0x445566);localStorage.removeItem('tt_brightness');localStorage.removeItem('tt_vibrancy');applyPictureSettings();if(this.enabled)this.applyDay();},
  state(){return{after:window.__n40After,training:training.active,lightsOff:training.lightsOff,worldTime,rain:weather.raining,hemi:{sky:hemi.color.getHexString(),ground:hemi.groundColor.getHexString(),intensity:hemi.intensity},sun:sun.intensity,picture:pictureState(),camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov},player:player.position.toArray(),first:viewFirst,zombies:zombies.filter(z=>z.alive).length,shadow:{targetHidden:training.hidWorld?.includes?.(sun.target)||false,local:sun.target.position.toArray(),world:sun.target.matrixWorld.elements.slice(12,15)},prof:PROF.on,gpuQueries:renderer.backend.trackTimestamp,backend:renderer.backend.isWebGPUBackend?'WebGPU':'other'};},
  installClock(){if(!showPerf)throw Error('Raw production clock missing');const push=perfSamples.push;perfSamples.push=function(sample){if(Q.measuring){if(Q.first)Q.frames.push(sample.ms);else Q.first=true;if(sample.t-Q.t0>=4500){Q.measuring=false;Q.done=true;}}return push.call(this,sample);};},
  start(){this.frames=[];this.first=false;this.t0=performance.now();this.done=false;this.measuring=true;},
  render(on){this.setAfter(on);sun.shadow.needsUpdate=true;renderFrame();return this.state();}
 };
 advanceSkyClock=function(dt){return Q.enabled?(training.active&&training.lightsOff?0:Q.time):originalAdvance(dt);};
 updateDayNight=function(dt){if(Q.enabled)Q.applyDay();else originalDay(dt);};
}
const cut=patched.lastIndexOf('</script>');assert(cut>0);const body=patched.slice(0,cut)+'\n('+install.toString()+')();\n'+patched.slice(cut);
const report={scope:'Look-only matched lighting deltas on one immutable current index snapshot; BEFORE reproduces only C7 pre-D183 hemisphere/default-grade/Training-fill settings. No archived whole index served, no production write. Timings before every PNG, raw production clock, profiler/query off, both variants warmed; 12 interleaved phases, not full GP33 acceptance.',sourceSha256:sha(source),archivedLightingReferenceSha256:sha(archived),recipeSha256:sha(fs.readFileSync('review/CG-6/note40-native.mjs')),frames:[],timings:[]};
const backend=await serve(process.cwd(),0);const proxy=http.createServer((req,res)=>{if(new URL(req.url,'http://local').pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(body);return;}const p=http.request(new URL(req.url,backend.origin),{method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});p.on('error',e=>{res.writeHead(500);res.end(String(e));});req.pipe(p);});await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+proxy.address().port;
const pause=ms=>new Promise(r=>setTimeout(r,ms));let browser,page;
const save=()=>fs.writeFileSync(path.join(out,'native-receipts.json'),JSON.stringify(report,null,2));
async function boot(environment){
 browser=await launch({headless:false});page=await browser.newPage({width:1600,height:900});
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__n40After=true;localStorage.setItem("tt_gfx","high");localStorage.removeItem("tt_brightness");localStorage.removeItem("tt_vibrancy")'});
 await page.goto(origin+'/index.html?debug=1',{waitUntil:'none',timeout:300000});assert(await page.waitFor('!!window.DWOpening',{timeout:60000}));for(let i=0;i<2;i++){await page.evaluate('DWOpening.dismissForTesting()');await pause(250);}assert(await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:300000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active',{timeout:150000}));
 await page.evaluate('document.getElementById("playerName").value="N40 native";document.getElementById('+JSON.stringify(environment==='training'?'modeTraining':'modeHunt')+').click()');
 assert(await page.waitFor(environment==='training'?'TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!TT.trainingDbg.state().bgWarming&&!document.getElementById("trainingBlackout")?.classList.contains("on")':'TT.getPhase()==="prep"&&!document.body.classList.contains("deploying")',{timeout:180000}));
 await page.evaluate('TT.closeCIF();TT.trainingDbg.panel()?.close();TT.clearZombies();TT.grantAllWeapons();TT.setWeapon(TT.WEAPON_ORDER.indexOf("m4"));TT.setViewFirstDbg(true);TT.setAimYawDbg(.6);__n40.light(.5,false)');await pause(2000);assert.equal(await page.evaluate('TT.getGfx()'),'high');assert.equal(await page.evaluate('TT.renderer.backend.isWebGPUBackend'),true);
}
async function proof(environment,label,t,rain,off=false){
 await page.evaluate('TT.flightHold(false);__n40.light('+t+','+rain+');if(TT.trainingDbg.state().active&&!!TT.trainingDbg.state().lightsOff!=='+off+')TT.trainingDbg.toggleLights()');
 for(const first of [true,false]){
  await page.evaluate('TT.setViewFirstDbg('+first+');TT.setAimYawDbg(.6)');await pause(1500);await page.evaluate('TT.flightHold(true);document.querySelectorAll("body > *:not(canvas):not(script)").forEach(e=>{e.dataset.gpN40=e.style.visibility;e.style.visibility="hidden";})');
  const fixture=await page.evaluate('__n40.state()');assert.equal(fixture.worldTime,off?0:t,'requested four-light clock is actually used');if(environment==='training')assert.equal(!!fixture.lightsOff,off,'actual light switch state');
  const pair=[];
  for(const after of [false,true]){const state=await page.evaluate('__n40.render('+after+')');await pause(120);const file=environment+'-'+label+'-'+(first?'eye':'3p')+'-'+(after?'after':'before')+'.png';await page.screenshot(path.join(out,file));const row={environment,label,first,after,file,state};report.frames.push(row);pair.push(row);save();console.log('shot',file,JSON.stringify(state.hemi));}
  assert.deepEqual(pair[0].state.camera,pair[1].state.camera,'matched frozen camera');assert.deepEqual(pair[0].state.player,pair[1].state.player);assert.equal(pair[0].state.shadow.targetHidden,false,'real Training sun target is kept');
  await page.evaluate('document.querySelectorAll("[data-gp-n40]").forEach(e=>{e.style.visibility=e.dataset.gpN40;delete e.dataset.gpN40;});TT.flightHold(false)');
 }
}
try{
 await boot('training');
 const earlier=JSON.parse(fs.readFileSync('review/GP-20143/native-receipts.json','utf8'));assert.equal(earlier.timings.length,12);report.timings=earlier.timings;report.timingSource={file:'../native-receipts.json',sourceSha256:earlier.sourceSha256,scope:'All twelve valid timing phases precede every screenshot in that browser. Initial Training photo fixture rejected: unset lightsOff boolean toggled first scene, and Training clock forced noon. Corrected photos here; no repeated timing claim.'};
 for(const [label,t,rain]of [['noon',.5,false],['overcast',.5,true],['dusk',.71,false],['night',0,false]])await proof('training',label,t,rain);
 await proof('training','lights-off',.5,false,true);report.trainingErrors=page.errors;report.trainingConsole=page.console;assert.equal(page.errors.length,0);await browser.close();browser=null;page=null;
 await boot('outdoor');for(const [label,t,rain]of [['noon',.5,false],['overcast',.5,true],['dusk',.71,false],['night',0,false]])await proof('outdoor',label,t,rain);report.outdoorErrors=page.errors;report.outdoorConsole=page.console;assert.equal(page.errors.length,0);
 console.log('PASS corrected matched36PNGs; twelve prior timing phases retained separately; inspect receipts');
}catch(e){report.failure=String(e.stack||e);report.errors=page?.errors;report.console=page?.console;console.error(report.failure);process.exitCode=1;}finally{report.endSourceSha256=sha(fs.readFileSync('index.html','utf8'));save();await browser?.close();await new Promise(r=>proxy.close(r));await backend.close();}
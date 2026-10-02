// GP-101: brief visual/component check on the actual renderer, no full run.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)), shots=path.join(root,'Claude outputs/shots/gp101');
fs.mkdirSync(shots,{recursive:true});
const before=process.argv.includes('--before'), prefix=before?'before':'after';
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-101 component check time limit');process.exit(2);},120000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Alarm Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'));
 await page.evaluate(()=>{TT.player.position.set(TT.HQ_PANEL_FRONT.x,TT.house.group.position.y+1,TT.HQ_PANEL_FRONT.z);TT.openHQBriefingDbg();});
 await page.waitForFunction(()=>document.querySelector('#hqBriefing[open]'));
 for(const width of [1280,390]) {
  await page.setViewportSize({width,height:width===390?844:800});
  await page.screenshot({path:path.join(shots,`${prefix}-menu-${width}.png`)});
  const box=await page.locator('#hqBriefing').boundingBox();assert(box.x>=0&&box.x+box.width<=width);
  if(!before) {
   for(const name of ['Fieldwork','Relay','Threat report'])await page.getByRole('button',{name,exact:true}).click();
   assert(await page.locator('.briefing-alarm').isVisible());
   assert.equal(await page.locator('#hqBriefing').evaluate(el=>el.scrollWidth>el.clientWidth),false);
  }
 }
 await page.keyboard.press('Escape');assert.equal(await page.locator('#hqBriefing[open]').count(),0);
 await page.evaluate(()=>TT.openHQBriefingDbg());
 await page.getByRole('button',{name:'Sound alarm',exact:true}).click();
 await page.waitForFunction(()=>!!TT.hq.seq&&!document.querySelector('#hqBriefing[open]'));
 assert.equal(await page.evaluate(()=>TT.getPhase()),'prep');
 await page.setViewportSize({width:1280,height:800});
 await page.evaluate(()=>{
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
  const keep=new Set();for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  const y=TT.house.group.position.y;TT.player.position.set(12,y+1,0);TT.setWorldTime(.4);
  TT.setShotView({x:TT.HQ_PANEL_FRONT.x-1.3,y:y+2.25,z:-9.3,tx:TT.HQ_PANEL_FRONT.x,ty:y+1.8,tz:-5.2,fov:38});
 });
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:path.join(shots,prefix+'-cabinet.png')});
 if(!before) {
  const component=await browser.newPage({viewport:{width:1280,height:800}});
  component.on('pageerror',e=>errors.push(e.message));
  await component.route('**/alarm-component.html',r=>r.fulfill({contentType:'text/html',body:'<link rel="stylesheet" href="/vendor/fonts/fonts.css"><link rel="stylesheet" href="/ui/wave-preview.css"><style>:root{--font-hud:"Chakra Petch",sans-serif;--font-display:"Black Ops One",sans-serif}body{background:#17201a}</style><script type="module" src="/ui/wave-preview.js"></script>'}));
  await component.goto(server.origin+'/alarm-component.html');
  await component.waitForSelector('#hqBriefing',{state:'attached'});
  await component.evaluate(()=>{
   window.receipts=[];addEventListener('dw-game',e=>receipts.push(e.detail));
   window.fixture={type:'briefing-open',day:4,runId:101,phase:'prep',canSoundAlarm:true,relayReady:true,
    relayStory:{line:'Ridgeline. Hold where you are.'},
    radioCall:{status:'available',cards:[{id:'ammo',enabled:true},{id:'medical',enabled:true},{id:'intel',enabled:true}]},
    restocks:[{name:'Ranger camp',reward:'Supplies',collected:false}],
    bounties:[{day:4,kind:'campsite',index:0,labelKey:'world.trapper',reward:25,guards:4,alive:3,state:'open'}]};
   dispatchEvent(new CustomEvent('dw-game',{detail:fixture}));
  });
  await component.getByRole('button',{name:'Fieldwork',exact:true}).click();
  assert(await component.locator('.bounty-post').isVisible());assert(await component.locator('.briefing-restocks').isVisible());
  await component.screenshot({path:path.join(shots,'after-fieldwork.png')});
  await component.getByRole('button',{name:'Relay',exact:true}).click();
  await component.locator('.radio-call-card').first().click();
  assert.deepEqual(await component.evaluate(()=>receipts.find(e=>e.type==='radio-call-request')),{type:'radio-call-request',card:'ammo',day:4,runId:101});
  await component.evaluate(()=>{fixture.radioCall={status:'picked',picked:'ammo'};dispatchEvent(new CustomEvent('dw-game',{detail:fixture}));});
  assert(await component.locator('#briefing-relay').isVisible(),'radio refresh preserves the selected section');
  await component.screenshot({path:path.join(shots,'after-relay.png')});
  await component.evaluate(()=>{fixture.day=20;fixture.goalNight=20;fixture.extraction='offered';dispatchEvent(new CustomEvent('dw-game',{detail:fixture}));});
  await component.locator('.briefing-extraction').click();
  assert.deepEqual(await component.evaluate(()=>receipts.find(e=>e.type==='extraction-request')),{type:'extraction-request',day:20,runId:101});
  for(const patch of [{canSoundAlarm:false},{canSoundAlarm:true,alarmActive:true},{alarmActive:false,phase:'wave'},{phase:'prep',disabled:true}]) {
   await component.evaluate(patch=>{Object.assign(fixture,patch);dispatchEvent(new CustomEvent('dw-game',{detail:fixture}));},patch);
   assert(await component.locator('.briefing-alarm').isDisabled());
  }
  await component.close();
  console.log('PASS GP-101 component: fieldwork visibility, radio payload and refresh, extraction payload, remote/active/wave/disabled alarm guards.');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS GP-101 '+prefix+': real WebGPU menu at 1280/390, Escape/reopen, guarded alarm launch, cabinet shot; no page errors.');
} finally {clearTimeout(hard);if(browser)await browser.close();server.close();}

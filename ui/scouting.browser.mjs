// GP-42/GP-67: production prep plans and HQ interaction, with optional real WebGPU.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before'),gpu=process.argv.includes('--gpu');
const shots=path.join(root,'Claude outputs/shots',gpu?'gp67-gpu':'gp67');fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!gpu)src=src.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
src=src.replace('window.TT = stampDebugHooks({',`window.scoutProbe={prep:n=>{closeHQBriefing();clearZombies();day=n-1;startPrep();const p=HQ_PANEL_FRONT;player.position.set(p.x,sampleHeight(p.x,p.z),p.z);},open:openHQBriefing,close:closeHQBriefing,reset:resetMatchToSpawn,intel:v=>{fieldIntelOwned=v;},map:()=>{let marks=0;const original=minimapCtx.stroke;minimapCtx.stroke=function(...args){if(this.strokeStyle==='#ead399'&&this.lineWidth===2&&Math.abs(this.getTransform().e)>0)marks++;return original.apply(this,args);};try{minimapTick=0;drawMinimap(0);return marks;}finally{minimapCtx.stroke=original;}} };window.TT = stampDebugHooks({`);
const server=await serve(root,0);let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Scout Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 for(let n=1;n<=20;n++) {
  await page.evaluate(n=>scoutProbe.prep(n),n);
  assert.equal(await page.locator('#hqBriefing').isVisible(),false,'prep must not open the report');
  const plan=await page.evaluate(()=>JSON.stringify(TT.getWavePreview()));
  // Open through the same E action a player uses at the panel.
  await page.waitForFunction(()=>TT.actionTarget()==='hqPanel');await page.evaluate(()=>TT.doAction());
  await page.waitForFunction(()=>document.getElementById('hqBriefing').open);
  if(!before) {
   const view=await page.evaluate(async()=>{const {buildScoutingReport}=await import('./ui/scouting.js');return buildScoutingReport({preview:TT.getWavePreview(),day:TT.getDay(),phase:TT.getPhase()});});
   assert(view);assert.notEqual(view.trick,'Tactics unconfirmed');const body=await page.locator('.briefing-scouting').innerText();
   for(const line of [view.title,view.caves,view.pushes,view.trick,...(view.rest?[view.rest]:[])])assert(body.includes(line),`night ${n}: ${line}`);
   const kinds=new Set((await page.evaluate(()=>TT.getWavePreview().byTypeAndCave)).filter(row=>row.count>0).map(row=>row.typeKey));
   assert.equal(view.counters.length,kinds.size,`night ${n}: one counter per planned kind`);
   for(const counter of view.counters)assert(body.includes(`${counter.name} · ${counter.line}`),`night ${n}: ${counter.kind} counter`);
   assert.equal(await page.locator('.briefing-total').count(),0,'exact roster remains paid Intel');
   if(n===14||n===18){const warning=n===14?'Fog Night':"The siege · they'll go for your walls";
    assert((await page.locator('#hqBriefing .briefing-warning').allTextContents()).includes(warning),`night ${n}: special warning`);
    assert.match(view.trick,n===14?/dense fog/:/smash your walls/);
   }
   assert.equal(await page.evaluate(()=>JSON.stringify(TT.getWavePreview())),plan,'reading must not reroll the plan');
   await page.evaluate(()=>{scoutProbe.close();scoutProbe.open();});assert.equal(await page.locator('.briefing-scouting').innerText(),body);
  }
  if([1,9,11,14,18].includes(n))for(const width of [1280,390]) {
   await page.setViewportSize({width,height:width===390?844:720});
   await page.screenshot({path:path.join(shots,`${before?'before':'after'}-night-${n}-${width}.png`)});
   if(!before&&(n===14||n===18)) {await page.locator('#hqBriefing .briefing-warning').filter({hasText:n===14?'Fog Night':'The siege'}).first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(shots,`warning-night-${n}-${width}.png`)});}
   const box=await page.locator('#hqBriefing').boundingBox();assert(box.x>=0&&box.x+box.width<=width);if(!before){const footer=await page.locator('#hqBriefing footer').boundingBox();assert(footer.y+footer.height<=box.y+box.height,'actions stay inside the dialog without scrolling');}
  }
  const marks=await page.evaluate(()=>{scoutProbe.close();return {drawn:scoutProbe.map(),planned:TT.getWavePreview().caveIndices.length};});if(!before)assert.equal(marks.drawn,marks.planned,`night ${n}: actual minimap draws all planned cave markers`);
  if(n===11){await page.locator('#minimap').screenshot({path:path.join(shots,`${before?'before':'after'}-map.png`)});const png=await page.locator('#minimap').evaluate(el=>el.toDataURL().split(',')[1]);fs.writeFileSync(path.join(shots,`${before?'before':'after'}-map-canvas.png`),Buffer.from(png,'base64'));}
 }
 if(!before) {
  await page.evaluate(()=>{scoutProbe.intel(true);scoutProbe.open();});assert.equal(await page.locator('.briefing-total').count(),1);
  await page.evaluate(()=>{scoutProbe.close();TT.setPhase('wave');scoutProbe.open();});assert.equal(await page.evaluate(()=>scoutProbe.map()),0);assert.equal(await page.locator('.briefing-scouting').count(),0,'prep report ends at wave');
  await page.evaluate(()=>{scoutProbe.close();scoutProbe.reset();});assert.equal(await page.locator('#hqBriefing').isVisible(),false);
 }
 assert.deepEqual(errors,[]);console.log(before?'GP-67 before shots captured.':'PASS GP-67: all 20 frozen prep plans, Fog Night and siege warnings/advice, HQ E action, counters, no rerolls, Field Intel, wave/reset, desktop/mobile.');
} finally {if(browser)await browser.close();server.close();}

// GP-43: actual bounty producer, HQ interaction and map; substituted renderer only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp43');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8')
 .replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
 .replace('window.TT = {',`window.bountyProbe={prep:n=>{closeHQBriefing();clearZombies();day=n-1;startPrep();const p=HQ_PANEL_FRONT;player.position.set(p.x,sampleHeight(p.x,p.z),p.z);},close:closeHQBriefing,reset:resetMatchToSpawn,map:()=>{let marks=0;const stroke=minimapCtx.stroke;minimapCtx.stroke=function(...args){if(this.strokeStyle==='#9ed7dc'&&this.lineWidth===2)marks++;return stroke.apply(this,args);};try{minimapTick=0;drawMinimap(0);return marks;}finally{minimapCtx.stroke=stroke;}}};window.TT = {`);
const server=await serve(root,0);let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Bounty Tester');await page.click('#modeHunt');await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:60000});await page.evaluate(()=>TT.runDevCommand('godmode'));
 const open=async()=>{await page.waitForFunction(()=>TT.actionTarget()==='hqPanel');await page.evaluate(()=>TT.doAction());await page.waitForFunction(()=>document.getElementById('hqBriefing').open);};
 const capture=async(name)=>{for(const width of [1280,390]){await page.setViewportSize({width,height:width===390?844:720});await page.screenshot({path:path.join(shots,`${before?'before':'after'}-${name}-${width}.png`)});if(!before&&await page.locator('#hqBriefing').isVisible()){const b=await page.locator('#hqBriefing').boundingBox(),f=await page.locator('#hqBriefing footer').boundingBox();assert(b.x>=0&&b.x+b.width<=width);assert(f.y+f.height<=b.y+b.height);}}};
 await page.evaluate(()=>bountyProbe.prep(1));await open();if(!before)assert.equal(await page.locator('.briefing-bounties').count(),0);await page.evaluate(()=>bountyProbe.close());
 for(const [night,reward]of [[2,25],[4,60],[8,150],[14,300]]) {
  await page.evaluate(n=>bountyProbe.prep(n),night);await page.waitForFunction(n=>TT.getBounties().length===(n>=8?2:1),night);
  const posts=await page.evaluate(()=>TT.getBounties());assert(posts.every(b=>b.reward===reward));
  assert.equal(await page.locator('#hqBriefing').isVisible(),false);assert.equal(await page.locator('#campCleared').isVisible(),false);
  assert.equal(await page.evaluate(()=>bountyProbe.map()),0,'unread bounties have no minimap mark');
  await open();
  if(!before) {
   assert.equal(await page.locator('.bounty-post').count(),posts.length);
   const text=await page.locator('.briefing-bounties').innerText();for(const p of posts){const label=await page.evaluate(async key=>(await import('./ui/strings.js')).text(key),p.labelKey);assert(text.includes(label));assert(text.includes(`${p.alive} guards remaining`));assert(text.includes(`${reward} skull value`));}assert(text.includes('Before the alarm'));
   assert.equal(await page.evaluate(()=>bountyProbe.map()),posts.length,'reading reveals exactly the posted sites');
  }
  await capture('night-'+night);if(!before){await page.locator('.briefing-content').evaluate(el=>{const panel=el.querySelector('.briefing-bounties');el.scrollTop+=panel.getBoundingClientRect().top-el.getBoundingClientRect().top;});await capture('bounties-'+night);}await page.evaluate(()=>bountyProbe.close());await open();if(!before)assert.equal(await page.locator('.bounty-post').count(),posts.length);await page.evaluate(()=>bountyProbe.close());
  if(night===8){await page.evaluate(()=>bountyProbe.map());await page.locator('#minimap').screenshot({path:path.join(shots,`${before?'before':'after'}-map.png`)});}
  if(!before&&night===8){await page.evaluate(()=>{const b=TT.getBounties()[0];const z=TT.zombies.find(z=>z.alive&&z.poiGuard?.bounty&&z.poiGuard.kind===b.kind&&z.poiGuard.index===b.index);TT.damageZombie(z,99999,{kind:'bullet'});});await open();assert((await page.locator('.bounty-post').first().innerText()).includes(`${posts[0].alive-1} guards remaining`),'reopening refreshes remaining guards');await page.evaluate(()=>bountyProbe.close());}
  // The real producer emits poi-cleared then bounty-done synchronously. Observe rendered notices.
  await page.evaluate(()=>{window.noticeFrames=[];const el=document.getElementById('campCleared');window.noticeObserver=new MutationObserver(()=>{if(!el.hidden)noticeFrames.push(el.textContent);});noticeObserver.observe(el,{subtree:true,childList:true,attributes:true});});
  const paid=await page.evaluate(()=>{const b=TT.getBounties()[0],cash=TT.getBank(),bag=TT.getSkullBag().value;for(const z of TT.zombies.slice())if(z.alive&&z.poiGuard?.bounty&&z.poiGuard.kind===b.kind&&z.poiGuard.index===b.index)TT.damageZombie(z,99999,{kind:'bullet'});return {cash,bag,post:b,afterCash:TT.getBank(),afterBag:TT.getSkullBag().value};});
  assert.equal(paid.cash,paid.afterCash);assert.equal(paid.afterBag-paid.bag,reward);
  await page.waitForFunction(()=>!document.getElementById('campCleared').hidden);
  if(!before){const name=await page.evaluate(async k=>(await import('./ui/strings.js')).text(k),paid.post.labelKey);assert.equal(await page.locator('#campCleared').innerText(),`Bounty: ${name} +${reward} skull value`);assert.deepEqual(await page.evaluate(()=>[...new Set(noticeFrames)]),[`Bounty: ${name} +${reward} skull value`]);assert.equal(await page.evaluate(()=>bountyProbe.map()),posts.length-1);}
  await capture('paid-'+night);await page.waitForFunction(()=>document.getElementById('campCleared').hidden,null,{timeout:3500});await page.evaluate(()=>noticeObserver.disconnect());
  await open();if(!before){assert.equal(await page.locator('.bounty-post[data-state="done"]').count(),1);assert((await page.locator('.briefing-bounties').innerText()).includes('Collected'));}await page.evaluate(()=>bountyProbe.close());
  // Expiration uses the real alarm event producer path, preserving reward/guard ownership.
  await page.evaluate(()=>TT.hqStartWave());if(!before)assert.equal(await page.evaluate(()=>bountyProbe.map()),0);
  assert.equal(await page.locator('#campCleared').isVisible(),false);assert.equal(await page.locator('#hqBriefing').isVisible(),false);
  await page.waitForFunction(()=>!TT.bountyDbg().seq,null,{timeout:60000});
 }
 await page.evaluate(()=>bountyProbe.reset());assert.equal(await page.evaluate(()=>bountyProbe.map()),0);assert.equal(await page.locator('#campCleared').isVisible(),false);
 assert.deepEqual(errors,[]);console.log(before?'GP-43 before shots captured.':'PASS GP-43: actual D-38 bands, guard counts, real HQ E/read-gated map, reopen, single paid notice, bag not Cash, done/expired/new-day/reset, desktop/mobile.');
}finally{if(browser)await browser.close();server.close();}

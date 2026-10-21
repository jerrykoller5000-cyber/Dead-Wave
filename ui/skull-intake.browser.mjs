// GP-102: one real deposit and short visual checks; no playthrough or benchmark.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),shots=path.join(root,'Claude outputs/shots/gp102');
fs.mkdirSync(shots,{recursive:true});
const before=process.argv.includes('--before'),prefix=before?'before':'after';
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-102 quick-check timeout');process.exit(2);},120000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Intake Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'));
 const initial=await page.evaluate(()=>{
  window.intakeReceipts=[];addEventListener('dw-game',e=>{if(e.detail?.type.startsWith('deposit-'))intakeReceipts.push(e.detail);});
  const p=TT.HQ_WINDOW_FRONT;TT.player.position.set(p.x,TT.sampleHeight(p.x,p.z),p.z);TT.player.visible=false;
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
  const keep=new Set();for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  TT.setWorldTime(.4);const y=TT.house.group.position.y;
  TT.setShotView({x:-11,y:y+3.2,z:p.z-1.5,tx:-5.15,ty:y+2.0,tz:p.z,fov:42});
  return TT.getBank();
 });
 const shot=async state=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:path.join(shots,prefix+'-'+state+'.png')});};
 await shot('idle');
 await page.evaluate(()=>{Object.assign(TT.getSkullBag(),{count:3,value:37});TT.doAction();});
 await page.waitForFunction(()=>TT.hq.dep==='process');
 assert.equal(await page.evaluate(()=>TT.getBank()),initial,'no credit before processing completes');
 if(!before){assert.equal(await page.evaluate(()=>TT.house.intakeDisplay.read().value),'37 SKULL VALUE');assert.equal(await page.evaluate(()=>TT.house.lampMat.color.getHex()),0xffb347);}
 await shot('processing');
 await page.waitForFunction(()=>TT.hq.dep==='green');
 assert.equal(await page.evaluate(()=>TT.getBank()),initial+37);
 assert.equal(await page.evaluate(()=>intakeReceipts.filter(e=>e.type==='deposit-complete').length),1);
 assert.equal(await page.evaluate(()=>TT.getSkullBag().count),0);
 if(!before)assert.equal(await page.evaluate(()=>TT.house.intakeDisplay.read().value),'+37 CASH');
 await shot('paid');
 if(!before){
  await page.evaluate(()=>TT.setWorldTime(.85));await shot('night');
  // A second batch during the green hold must replace the old receipt, not pay twice.
  await page.evaluate(()=>{Object.assign(TT.getSkullBag(),{count:1,value:12});TT.doAction();});
  await page.waitForFunction(()=>TT.hq.dep==='process');
  assert.equal(await page.evaluate(()=>TT.house.intakeDisplay.read().value),'12 SKULL VALUE');
  await page.waitForFunction(()=>TT.hq.dep==='green');
  assert.equal(await page.evaluate(()=>TT.getBank()),initial+49);
  assert.equal(await page.evaluate(()=>intakeReceipts.filter(e=>e.type==='deposit-complete').length),2);
  assert.equal(await page.evaluate(()=>TT.house.intakeDisplay.read().value),'+12 CASH');
  await page.evaluate(()=>{TT.player.position.set(12,TT.sampleHeight(12,0),0);TT.setWorldTime(.4);});
  await shot('detail');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS GP-102 '+prefix+': real WebGPU deposit, delayed exact payout, one receipt per batch, idle/process/paid shots'+(!before?', repeat during green hold, night readability':'')+'; no page errors.');
} finally {clearTimeout(hard);if(browser)await browser.close();server.close();}

// GP-37: real DOM/input checks; component-only, not a GPU/game-loop substitute.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp37');fs.mkdirSync(shots,{recursive:true});
const server=await serve(root,0);let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/night-card-fixture',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><style>body{background:#15251d;--font-hud:monospace}</style><link rel="stylesheet" href="/ui/hud-layout.css"><button id="origin">Game</button><script type="module">import {mountDawn} from '/ui/dawn.js';window.calls={morning:0,night:0,show:0,gameKeys:0};window.card=mountDawn({onMorning:()=>calls.morning++,onNextNight:()=>calls.night++,onShow:()=>calls.show++});window.addEventListener('keydown',()=>calls.gameKeys++);document.querySelector('#origin').focus();card.show({day:4,kills:52,skulls:49,best:21});</script>`}));
 await page.goto(server.origin+'/night-card-fixture');await page.waitForFunction(()=>window.card?.dialog.open);
 for(const [width,height] of [[1280,720],[390,844]]){
  await page.setViewportSize({width,height});await page.screenshot({path:path.join(shots,(before?'before':'after')+'-'+width+'.png')});
  const b=await page.locator('#dawnCard').boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height);
 }
 if(!before){
  assert.equal(await page.locator('#dawnTitle').innerText(),'Night 4 Complete');assert.equal(await page.locator('.dawn-eyebrow').count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Proceed to Morning');
  await page.keyboard.press('w');assert.equal(await page.evaluate(()=>calls.gameKeys),0,'game keys blocked');
  await page.keyboard.press('Enter');assert.deepEqual(await page.evaluate(()=>[calls.morning,calls.night,card.dialog.open]),[1,0,false]);
  await page.evaluate(()=>card.show({day:5,kills:61,skulls:58,best:17}));await page.getByRole('button',{name:'Next Night',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>[calls.morning,calls.night]),[1,1]);
  await page.evaluate(()=>card.show({day:6,kills:71,skulls:64,best:11}));await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(()=>[calls.morning,calls.night,calls.gameKeys]),[2,1,0]);
  await page.evaluate(()=>{card.show({day:7,kills:9,skulls:3,best:4});card.addPickups(2);});assert.equal(await page.locator('[data-stat="skulls"]').innerText(),'5');
  await page.evaluate(()=>{card.close();card.close();});assert.deepEqual(await page.evaluate(()=>[calls.morning,calls.night]),[2,1],'programmatic reset has no choice side effects');
 }
 assert.deepEqual(errors,[]);console.log(before?'GP-37 before component shots captured.':'PASS GP-37: labels, retained stats, default Enter, both choices, Escape, input guard, reset, late pickups, desktop/mobile bounds.');
} finally {if(browser)await browser.close();server.close();}

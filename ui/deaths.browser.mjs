// GP-81: production death UI, with a fixture selecting the cause (no combat simulation).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const shots=path.join(root,'Claude outputs/shots/gp81');fs.mkdirSync(shots,{recursive:true});
const before=process.argv.includes('--before');
let src=fs.readFileSync(path.join(root,'index.html'),'utf8');
src=src.replace('window.TT = stampDebugHooks({',`window.gp81Probe = {
 death:cause=>{lastDeathCause=cause;endGame(false);},
 rabbit:()=>publishUI('rabbit',{phase:'killed',x:10,z:10})
};window.TT = stampDebugHooks({`);
assert(src.includes('window.gp81Probe ='));
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-81 browser time limit');process.exit(2);},140000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 for(const cause of ['lightning','rabbit']) {
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
  await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
  try {await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});}
  catch(e){console.error(errors);throw e;}
  await page.evaluate(()=>DWOpening.dismissForTesting());await page.fill('#playerName','Tombstone Tester');await page.click('#modeHunt');
  await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
  if(!before&&cause==='rabbit') {
   await page.evaluate(()=>{gp81Probe.rabbit();gp81Probe.rabbit();});
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_badges')).unlocked.filter(id=>id==='choir-practice').length),1);
  }
  await page.evaluate(c=>gp81Probe.death(c),cause);
  await page.waitForFunction(()=>document.getElementById('win').classList.contains('show'),null,{timeout:25000});
  if(!before){
   assert.equal(await page.locator('[data-death-cause="'+cause+'"].got.now').count(),1);
   assert.equal(await page.locator('#winMsg .reason').textContent(),cause==='lightning'?'Struck down by lightning.':'Lost his head to a rabbit.');
   const seen=await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_death_log')));
   assert(seen.includes(cause));if(cause==='rabbit')assert(seen.includes('lightning'));
   if(cause==='lightning')assert.equal(await page.locator('[data-death-cause="rabbit"].locked').count(),1);
  }
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:width===390?844:800});
   await page.screenshot({path:path.join(shots,`${before?'before':'after'}-${cause}-${width}.png`)});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS GP-81 '+(before?'before screenshots':'WebGPU: both death cards, locked/unlocked states, persistent collection, rabbit award once, desktop/390 and no page errors'));
}finally{clearTimeout(hard);if(browser)await browser.close();server.close();}

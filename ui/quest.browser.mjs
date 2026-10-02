// Short GP-70 production-adapter check, no wave simulations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const shots=path.join(root,'Claude outputs/shots/gp70');fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8');
src=src.replace('window.TT = stampDebugHooks({',`window.gp70Probe={
 prepare:()=>{day=14;phase='prep';relayUpDbg=true;hq.seq=null;devNoZombies=false;quest.dawn(14);quest.hear({number:14});
 localPlayer.position.set(HQ_PANEL_FRONT.x,house.group.position.y,HQ_PANEL_FRONT.z);openHQBriefing();},
 next:()=>{day++;quest.dawn(day);publishHQBriefing();},
 ending:()=>publishUI('quest',{kind:'ending'}),
 stale:()=>publishUI('quest-submit-request',{runId:-1,day,glyphs:quest.read().order}),
 view:()=>quest.view()
};window.TT = stampDebugHooks({`);
assert(src.includes('window.gp70Probe='));
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-70 browser time limit');process.exit(2);},110000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 try{await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});}catch(e){console.error('Boot errors',errors);throw e;}
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Quest Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>gp70Probe.prepare());assert.equal(await page.locator('.quest-panel .quest-mark').count(),10);
 assert.equal(await page.evaluate(()=>gp70Probe.view().order),undefined);
 await page.evaluate(()=>gp70Probe.stale());assert.equal(await page.evaluate(()=>TT.getQuestState().triedDay),-1);
 await page.locator('.quest-panel summary').click();
 const order=await page.evaluate(()=>TT.getQuestState().order);
 for(const k of [...order].reverse())await page.locator('[data-glyph="'+k+'"]').click();
 await page.getByRole('button',{name:'Send',exact:true}).click();assert.equal(await page.locator('.quest-failed').textContent(),'The tone swallows it. Tomorrow.');
 assert.equal(await page.evaluate(()=>TT.getQuestState().triedDay),14);assert.equal(await page.locator('.quest-entry canvas').count(),0);
 await page.evaluate(()=>gp70Probe.next());await page.locator('.quest-panel summary').click();
 for(const k of order)await page.locator('[data-glyph="'+k+'"]').click();
 await page.getByRole('button',{name:'Send',exact:true}).click();assert.equal(await page.evaluate(()=>TT.getQuestState().silenced),true);
 for(const width of [1280,390]){await page.setViewportSize({width,height:width===390?844:720});await page.locator('.quest-panel').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(shots,'silenced-'+width+'.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.evaluate(()=>gp70Probe.ending());assert.equal(await page.locator('#win h2').textContent(),'The lake is quiet.');
 assert.match(await page.locator('.true-ending-relay').textContent(),/Ridgeline.*Heron/);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_best_run')));assert.equal(saved.trueEndings,1);assert.equal(saved.evacuated,0);
 assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_badges')).unlocked)).includes('silence'));
 await page.screenshot({path:path.join(shots,'true-ending-390.png')});assert.deepEqual(errors,[]);
 console.log('PASS GP-70 WebGPU: wrong/right sends, stale guard, next dawn, public view, 1280/390, true ending and Silence persisted; no page errors.');
}finally{clearTimeout(hard);if(browser)await browser.close();server.close();}

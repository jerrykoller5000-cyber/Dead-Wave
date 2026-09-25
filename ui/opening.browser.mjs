// GP-27: real opening markup/controller; deterministic media stand-in, headless only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const src=fs.readFileSync(path.join(root,'index.html'),'utf8');
const markup=src.slice(src.indexOf('  <div id="opening"'),src.indexOf('  <div id="nvgOverlay"'));
assert(markup.includes('openingVideo'));
const css=src.match(/href="(assets\/intro\/opening\.css[^\"]*)"/)[1];
const js=src.match(/src="(assets\/intro\/opening\.js[^\"]*)"/)[1];
assert(new URL(css,'http://fixture/').searchParams.get('v'),'opening CSS URL is versioned');
assert(new URL(js,'http://fixture/').searchParams.get('v'),'opening script URL is versioned');
const html=`<!doctype html><link rel="stylesheet" href="/${css}"><body class="opening frontend">${markup}<div id="hud"></div><input id="playerName"><script src="/${js}"></script>`;
const shots=path.join(root,'Claude outputs/shots/gp27');fs.mkdirSync(shots,{recursive:true});
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Model the stale, unversioned controller that requires the removed Skip button.
 await page.route(url=>url.pathname==='/assets/intro/opening.js'&&!url.search,
   r=>r.fulfill({contentType:'text/javascript',body:"document.getElementById('openingSkip').onclick=function(){};"}));
 await page.addInitScript(()=>{
   window.rejectMedia=true;
   HTMLMediaElement.prototype.play=function(){return rejectMedia?Promise.reject(new Error('gesture required')):Promise.resolve();};
   HTMLMediaElement.prototype.pause=function(){};
 });
 await page.route('**/opening-check',r=>r.fulfill({body:html,contentType:'text/html'}));
 await page.route('**/caracal.mp4',r=>r.abort());
 // Remove src in the fixture so browser decoder errors cannot advance the mocked video.
 await page.unroute('**/opening-check');
 await page.route('**/opening-check',r=>r.fulfill({body:html.replace('src="assets/intro/caracal.mp4"',''),contentType:'text/html'}));
 await page.clock.install();
 await page.goto(server.origin+'/opening-check');
 await page.waitForFunction(()=>window.DWOpening&&!document.getElementById('openingPlay').hidden);
 for(const width of [1280,390]){
   await page.setViewportSize({width,height:width===390?844:720});
   await page.screenshot({path:path.join(shots,(before?'before':'after')+'-'+width+'.png')});
 }
 if(before){console.log('Captured opening before shots (mocked media, no game renderer).');}
 else{
   assert.equal(await page.locator('#openingSkip').count(),0,'no player Skip button');
   assert.equal(await page.evaluate(()=>document.getElementById('openingVideo').muted),false,'studio sound defaults on');
   const phase=()=>page.locator('#opening').getAttribute('data-phase');
   await page.keyboard.press('Escape');assert.equal(await phase(),'video');
   await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('Space');assert.equal(await phase(),'video');
   await page.evaluate(()=>{rejectMedia=false;});await page.click('#openingPlay');
   assert(await page.locator('#openingPlay').isHidden(),'autoplay-denied gesture still starts playback');
   await page.evaluate(()=>document.getElementById('openingVideo').dispatchEvent(new Event('ended')));
   assert.equal(await phase(),'intro');
   await page.keyboard.press('Escape');assert.equal(await phase(),'intro');
   await page.clock.runFor(3201);assert.equal(await phase(),'loading');
   await page.clock.runFor(1000);assert.equal(await phase(),'loading','never exits before real ready');
   await page.evaluate(()=>DWOpening.ready());await page.clock.runFor(1100);
   assert(await page.locator('#opening').isHidden());assert.equal(await page.evaluate(()=>document.activeElement.id),'playerName');
   await page.reload();await page.waitForFunction(()=>window.DWOpening);
   await page.evaluate(()=>DWOpening.dismissForTesting());assert.equal(await phase(),'loading');
   await page.evaluate(()=>{DWOpening.fail();DWOpening.ready();});await page.clock.runFor(1500);
   assert.equal(await phase(),'error');assert(await page.locator('#openingRetry').isVisible());
   await page.reload();await page.waitForFunction(()=>window.DWOpening);
   await page.evaluate(()=>document.getElementById('openingVideo').dispatchEvent(new Event('error')));
   assert.equal(await phase(),'intro','failed video retains automatic recovery');
   await page.evaluate(()=>{DWOpening.dismissForTesting();DWOpening.ready();});await page.clock.runFor(1100);
   assert(await page.locator('#opening').isHidden(),'code-only dismissal remains usable');
   // Older/incomplete markup can lack controls; media and readiness must still advance.
   const missing=html.replace(/id="(?:openingSound|openingPlay|openingRetry|openingStatus|openingProgress|openingPercent|hud|playerName)"/g,'');
   await page.unroute('**/opening-check');
   await page.route('**/opening-check',r=>r.fulfill({body:missing.replace('src="assets/intro/caracal.mp4"',''),contentType:'text/html'}));
   await page.reload();await page.waitForFunction(()=>window.DWOpening);
   await page.evaluate(()=>{DWOpening.progress(40,'World');document.getElementById('openingVideo').dispatchEvent(new Event('ended'));});
   assert.equal(await phase(),'intro','missing controls do not break ended wiring');
   await page.clock.runFor(3201);assert.equal(await phase(),'loading');
   await page.evaluate(()=>DWOpening.ready());await page.clock.runFor(1100);
   assert(await page.locator('#opening').isHidden(),'missing controls still reach menu');
   await page.reload();await page.waitForFunction(()=>window.DWOpening);
   await page.evaluate(()=>{DWOpening.dismissForTesting();DWOpening.fail();});
   assert.equal(await phase(),'error','missing retry/status still handles load failure');
   assert.deepEqual(errors,[]);
   console.log('PASS GP-27/28 versioned assets; no button/Escape/Space skip; default sound, gesture, ended/intro/loading/ready, failure recovery, code-only dismissal, missing optional controls and no page errors.');
 }
}finally{if(browser)await browser.close();server.close();}

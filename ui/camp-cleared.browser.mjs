// GP-38 actual game shell with substituted renderer. --live requires combat's event producer.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),live=process.argv.includes('--live');
const shots=path.join(root,'Claude outputs/shots/gp38');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>').replace('window.TT = {','window.noticeDebug=publishUI;window.TT = {');
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Camp Tester');await page.click('#modeHunt');await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying')&&TT.getPoiGuards().zombies.length,null,{timeout:45000});
 for(const [width,height] of [[1280,720],[390,844]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(shots,'before-'+width+'.png')});}
 await page.setViewportSize({width:1280,height:720});
 if(live)await page.evaluate(()=>{TT.runDevCommand('godmode');for(const z of TT.getPoiGuards().zombies.slice())TT.damageZombie(z,9999,{kind:'bullet'});});
 else await page.evaluate(()=>noticeDebug('poi-cleared',{kind:'campsite',index:0}));
 await page.waitForFunction(()=>!document.getElementById('campCleared').hidden,null,{timeout:5000});assert.equal(await page.locator('#campCleared').innerText(),'Ranger Camp · Cleared');
 for(const [width,height] of [[1280,720],[390,844]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(shots,(live?'live-after':'after')+'-'+width+'.png')});const b=await page.locator('#campCleared').boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height);assert(!(b.x<width/2&&b.x+b.width>width/2&&b.y<height/2&&b.y+b.height>height/2),'reticle stays clear');}
 await page.waitForFunction(()=>document.getElementById('campCleared').hidden,null,{timeout:3000});
 assert.deepEqual(errors,[]);console.log('PASS GP-38 '+(live?'real last-guard kill':'injected presentation event')+': localized name, desktop/mobile edge layout, 2s expiry, no page errors.');
}finally{if(browser)await browser.close();server.close();}

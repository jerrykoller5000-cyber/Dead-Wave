// GP-39 quiet exploration: actual interaction range/reach, substituted renderer.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp39');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>').replace('window.TT = {','window.discovery={update:()=>objectiveRuntime.update(),state:()=>objectiveRuntime?.read(),markers:()=>objectiveRuntime.markers(),emptyMed:()=>{medkits=0;}};window.TT = {');
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Explorer');await page.click('#modeHunt');await page.waitForFunction(()=>discovery.state()&&!document.body.classList.contains('deploying'),null,{timeout:45000});await page.evaluate(()=>TT.runDevCommand('godmode'));
 const visit=async(id,offset=0)=>page.evaluate(async({id,offset})=>{const p=TT.getObjectiveProps().props[id].approach;TT.player.position.set(p.x+offset,offset?TT.sampleHeight(p.x+offset,p.z):p.y,p.z);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));discovery.update();},{id,offset});
 const snap=async(name)=>page.screenshot({path:path.join(shots,(before?'before':'after')+'-'+name+'.png')});
 await visit('objective:medical-convoy',15);await snap('approach');
 if(!before)assert.equal(await page.evaluate(()=>discovery.markers().length),0,'15m proximity cannot disclose a site');
 await visit('objective:medical-convoy');await page.waitForFunction(()=>TT.getObjectiveInteraction('objective:medical-convoy').reachable);await page.waitForFunction(()=>document.querySelector('.objective-prompt').textContent.includes('E'));
 await snap('local');await visit('objective:medical-convoy',15);await snap('departed');
 if(!before){
  assert.equal(await page.locator('.objective-tracker').isVisible(),false,'leaving interaction range hides card');assert.equal(await page.evaluate(()=>discovery.markers().length),0);
  await visit('objective:medical-convoy');await page.evaluate(()=>discovery.emptyMed());await page.keyboard.press('e');await page.waitForFunction(()=>discovery.state().sites.find(s=>s.id==='objective:medical-convoy').state==='claimed');assert.equal(await page.evaluate(()=>TT.getMedkits()),2,'E still supplies medicine');
  assert.equal(await page.locator('.objective-notice').innerText(),'','no lingering completion announcement');
  await visit('objective:radio-repair');await page.keyboard.down('KeyE');try{await page.waitForFunction(()=>discovery.state().revealed,null,{timeout:15000});}finally{await page.keyboard.up('KeyE');}
  assert.equal(await page.evaluate(()=>discovery.markers().length),1,'repaired radio cannot announce all distant sites');
  await visit('objective:radio-repair',15);assert.equal(await page.evaluate(()=>discovery.markers().length),0);
  for(const width of [1280,390]){await page.setViewportSize({width,height:width===390?844:720});await visit('objective:ranger-cache');await page.waitForFunction(()=>document.querySelector('.objective-prompt').textContent.includes('E'));await snap('ranger-'+width);assert(await page.locator('.objective-choice select').isVisible(),'local ammo choice stays usable');}
 }
 assert.deepEqual(errors,[]);console.log(before?'GP-39 before discovery shots captured.':'PASS GP-39: no distant disclosure, local E prompt, departure hides, medical claim, radio reveal stays quiet, local ammo choices, desktop/mobile, no page errors.');
}finally{if(browser)await browser.close();server.close();}

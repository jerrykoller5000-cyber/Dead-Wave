import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp35');fs.mkdirSync(shots,{recursive:true});
const src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.guardNotice=null;window.addEventListener('dw-game',({detail})=>{if(detail?.type==='poi-guards')window.guardNotice=detail;});});
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Coach Tester');await page.click('#modeHunt');await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying')&&guardNotice,null,{timeout:45000});
 if(!before){await page.waitForFunction(()=>!document.getElementById('firstMinuteCoach').hidden);const expected=await page.evaluate(async()=>{const {text}=await import('/ui/strings.js');return text('coach.poi',{poi:text(guardNotice.labelKey)});});assert((await page.locator('#firstMinuteCoach').innerText()).includes(expected));}
 const shot=async n=>page.screenshot({path:path.join(shots,(before?'before':'after')+'-'+n+'.png')});
 for(const [width,height]of [[1280,720],[390,844]]){await page.setViewportSize({width,height});await shot('poi-'+width);}
 await page.evaluate(()=>{TT.runDevCommand('godmode');const z=TT.zombies.find(z=>z.alive&&z.poiGuard);if(!z)throw Error('missing guard');TT.player.position.set(z.mesh.position.x,TT.sampleHeight(z.mesh.position.x,z.mesh.position.z),z.mesh.position.z);TT.damageZombie(z,9999,{kind:'bullet'});});
 await page.waitForFunction(()=>!document.getElementById('firstMinuteCoach').hidden&&document.getElementById('firstMinuteCoach').textContent.includes('Skulls collected'),null,{timeout:15000});await shot('pickup-390');
 await page.evaluate(()=>{const p=TT.HQ_WINDOW_FRONT;TT.player.position.set(p.x,TT.sampleHeight(p.x,p.z),p.z);});await page.waitForFunction(()=>document.getElementById('firstMinuteCoach').textContent.includes('Press E to bank'));await shot('bank-390');
 assert.deepEqual(errors,[]);console.log(before?'Captured GP-35 before coach.':'PASS GP-35 actual guard location -> named first coach -> real guard kill/pickup -> bank prompt; desktop/mobile; no page errors.');
}finally{if(browser)await browser.close();server.close();}

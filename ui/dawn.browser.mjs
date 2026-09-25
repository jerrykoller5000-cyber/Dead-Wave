// GP-34: real alarm -> wave -> finisher -> prep flow, substituted renderer only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp34');fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
.replace("onShow: () => AudioSys.musicCue('dawn'),","onShow: () => {window.dawnChimes=(window.dawnChimes||0)+1;AudioSys.musicCue('dawn');},")
.replace('window.TT = {','window.dawnDbg={show:showDawnSummary,screen:dawnScreen};window.TT = {');
if(before)src=src.replace('if (dawnSummary) showDawnSummary(dawnSummary);','/* before dawn presentation */');
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Dawn Tester');await page.click('#modeHunt');await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{TT.runDevCommand('godmode');TT.clearZombies();TT.hqStartWave();TT.player.position.set(25,TT.sampleHeight(25,25),25);});
 await page.waitForFunction(()=>TT.getPhase()==='wave',null,{timeout:15000});
 const total=await page.evaluate(async()=>{let killed=0;const end=Date.now()+60000;while(Date.now()<end){for(const z of TT.zombies.slice()){if(z.alive&&!z.dying){TT.damageZombie(z,9999,{kind:'bullet'});killed++;}}if(TT.getWaveFinisher())return killed;await new Promise(r=>setTimeout(r,50));}throw Error('finisher did not start');});
 assert.equal(total,15);assert.equal(await page.locator('#dawnCard').isVisible(),false,'no card during kill camera');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&TT.getDay()===2&&!TT.getWaveFinisher(),null,{timeout:45000});
 if(!before){await page.waitForFunction(()=>document.getElementById('dawnCard').open);assert.equal(await page.locator('[data-stat="kills"]').innerText(),'15');const collection=await page.evaluate(()=>({bag:TT.getSkullBag().count,loose:TT.cashDrops.filter(c=>c.skull&&!c.taken).length}));assert.equal(Number(await page.locator('[data-stat="skulls"]').innerText()),collection.bag);assert(collection.bag>0);console.log('Dawn collection snapshot: '+JSON.stringify(collection));assert(Number(await page.locator('[data-stat="best"]').innerText())>0);assert.equal(await page.evaluate(()=>dawnChimes),1);}
 for(const [width,height]of [[1280,720],[390,844]]){await page.setViewportSize({width,height});await page.screenshot({path:path.join(shots,(before?'before':'after')+'-dawn-'+width+'.png')});if(!before){const b=await page.locator('#dawnCard').boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height);assert(Math.abs(b.x+b.width/2-width/2)<2&&Math.abs(b.y+b.height/2-height/2)<2,'card centered');}}
 if(!before){
  await page.getByRole('button',{name:'Continue to briefing'}).click();assert.equal(await page.locator('#dawnCard').isVisible(),false);await page.waitForFunction(()=>document.getElementById('hqBriefing').open);assert.match(await page.locator('#briefingTitle').innerText(),/Day 2/);assert(await page.getByRole('button',{name:'Sound alarm'}).isDisabled());assert.match(await page.locator('#hqBriefing').innerText(),/Visit the HQ panel/);await page.screenshot({path:path.join(shots,'after-briefing-390.png')});
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.evaluate(()=>dawnDbg.show({day:2,kills:9,skulls:3,best:4}));await page.keyboard.press('Escape');assert.equal(await page.locator('#dawnCard').isVisible(),false);assert.equal(await page.locator('#pause').isVisible(),false);
  await page.evaluate(()=>{dawnDbg.show({day:3,kills:1,skulls:0,best:1});dispatchEvent(new CustomEvent('dw-game',{detail:{type:'run-reset',runId:999}}));});assert.equal(await page.locator('#dawnCard').isVisible(),false);
 }
 assert.deepEqual(errors,[]);console.log(before?'Captured GP-34 before dawn presentation.':'PASS GP-34: natural 15-kill wave, camera-return ordering, actual pickup count, night streak, one chime, desktop/mobile layout, next briefing, remote alarm guard, Escape and reset.');
}finally{if(browser)await browser.close();server.close();}

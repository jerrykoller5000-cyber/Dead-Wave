// GP-33 UI proof. Real page logic, stand-in renderer; briefing uses a frozen fixture.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const shots=path.join(root,'Claude outputs/shots/gp33');fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
if(before)src=src.replace("    quitMenuBtn.textContent = dwText('pause.quit');",'').replace("    document.querySelector('#pauseMainView > p').textContent = dwText('pause.description');",'').replace("(SHOP_HINT[shopTab] || '') + (day === 1 ? ' ' + dwText('economy.dayOne') : '')","SHOP_HINT[shopTab] || ''");
const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const shot=n=>page.screenshot({path:path.join(shots,`${before?'before':'after'}-${n}.png`)});
 if(before)await page.route('**/ui/wave-preview.js',r=>r.fulfill({body:fs.readFileSync(path.join(root,'ui/wave-preview.js'),'utf8').replace("    if(view.earnings)line(content,'p',view.earnings,'briefing-earnings');",''),contentType:'text/javascript'}));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Economy Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{TT.openShop(true);TT.setShopTabDbg('weapons');});await shot('kiosk');
 if(!before)assert.match(await page.locator('#shopHint').innerText(),/1 skull value before bonuses/);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>dispatchEvent(new CustomEvent('dw-game',{detail:{type:'briefing-open',day:1,phase:'prep',preview:{day:1,total:15,byTypeAndCave:[{typeKey:'shambler',count:15,caveIndex:0,caveName:'North Cave'}],caveIndices:[0],bearings:[Math.PI/2]}}})));
 await page.waitForFunction(()=>document.getElementById('hqBriefing').open);await shot('briefing');
 if(!before)assert.match(await page.locator('#hqBriefing').innerText(),/1 skull value before bonuses/);
 await page.evaluate(()=>dispatchEvent(new CustomEvent('dw-game',{detail:{type:'briefing-closed'}})));
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('pause').classList.contains('show'));await shot('pause');
 if(!before){assert.match(await page.locator('#quitMenuBtn').innerText(),/End run/i);assert.match(await page.locator('#pauseMainView').innerText(),/starts a new run/);}
 if(!before){
  await page.keyboard.press('Escape');
  const reward=await page.evaluate(()=>{
   TT.clearZombies();
   const before=new Set(TT.cashDrops);const cash=TT.getBank();
   for(let i=0;i<8;i++){const z=TT.spawnZombie(40+i*2,40,'shambler',true,true);TT.damageZombie(z,9999,{kind:'bullet'});}
   const drops=TT.cashDrops.filter(c=>!before.has(c)&&c.skull&&!c.taken);
   const result={count:drops.length,value:drops.reduce((n,c)=>n+c.value,0),fraction:TT.getSkullLedger().remainder(),cashBefore:cash,cashAfter:TT.getBank()};
   window.firstReward=drops[0];return result;
  });
  assert.equal(reward.count,8);assert.equal(reward.value,9);assert.equal(reward.fraction,0);assert.equal(reward.cashAfter,reward.cashBefore);
  await page.evaluate(()=>{const p=firstReward.mesh.position;TT.player.position.set(p.x,TT.sampleHeight(p.x,p.z),p.z);});
  await page.waitForFunction(()=>TT.getSkullBag().count>0&&!document.getElementById('firstMinuteCoach').hidden,null,{timeout:15000});
  assert.match(await page.locator('#firstMinuteCoach').innerText(),/Skulls collected/);await shot('first-pickup');
  console.log('PASS live combat: 8 kills -> 8 skulls worth 9, no direct Cash, first pickup displays coach.');
 }
 assert.deepEqual(errors,[]);console.log(before?'Captured GP-33 before UI.':'PASS GP-33 day-one kiosk/briefing earnings and end-run wording; no page errors.');
}finally{if(browser)await browser.close();server.close();}

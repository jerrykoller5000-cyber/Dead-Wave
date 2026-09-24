// Supplemental UI integration checks when the shared CDP runner cannot start here.
// Uses an already-installed Playwright via NODE_PATH; does not install dependencies.
// node ui/browser-checks.mjs [--coach | --prep | --repair] [--simulate-controls-ready]
// --repair --preview-repair-hook tests the pending production adapter in memory only.
// The explicit simulation flag is only for verifying the coach before CU-9 lands.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const coachMode = process.argv.includes('--coach');
const prepMode = process.argv.includes('--prep');
const repairMode = process.argv.includes('--repair');
const shots = path.join(root, 'Claude outputs/shots', repairMode ? (process.argv.includes('--preview-repair-hook') ? 'gp7-repair-preview' : 'gp7-repair') : prepMode ? 'gp7' : coachMode ? 'gp4' : 'gp5');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root,'index.html'),'utf8')
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>`)
  .replace('window.TT = {', `window.uiProbe={spawnSkullDrop,startPrep,publishPrepState,mapWarnings:uiCaveWarnings,getIntel:()=>fieldIntelOwned,setCash:v=>bank=v,dropPreview:()=>wavePreview=null,getPaused:()=>paused}; window.TT = {`);
if (repairMode && process.argv.includes('--preview-repair-hook')) {
  assert(src.includes('repairs: [] }'),'preview expects the unwired production adapter');
  src=src.replace("import * as THREE from 'three';", "import * as THREE from 'three';\nimport { createPrepRepairReader } from './ui/prep-repairs.js';")
    .replace('let prepUISampleTime = 0;', 'const readPrepRepairs=createPrepRepairReader({getTarget:getRepairTarget,getSnapshot:getRepairSnapshot});\nlet prepUISampleTime = 0;')
    .replace('repairs: [] }', "repairs: readPrepRepairs({runId:uiRunId,day,phase:enabled?phase:'inactive'}) }");
  console.log('PREVIEW repair hook: production index unchanged; owner helpers and real repair path are used.');
}
const server = await serve(root,0);
let browser;
try {
  browser = await chromium.launch({executablePath:process.env.UI_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-background-timer-throttling']});
  const page = await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/index.html?*',route=>route.fulfill({body:src,contentType:'text/html'}));
  await page.addInitScript(()=>{window.uiReceipts=[];window.addEventListener('dw-game',({detail:d})=>{
    if(['controls-ready','skull-pickup','deposit-accepted','deposit-complete','purchase-delivered'].includes(d.type))uiReceipts.push(d);
  });});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  await page.waitForFunction(()=>window.DWLoad?.snapshot().state==='ready'&&window.TT,null,{timeout:120000});
  await page.evaluate(()=>{document.getElementById('openingSkip').click();document.getElementById('openingSkip').click();});
  await page.waitForFunction(()=>document.getElementById('opening').hidden);
  await page.fill('#playerName','UI Tester'); await page.click('#modeHunt');
  await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:20000});
  const shot = name=>page.screenshot({path:path.join(shots,name+'.png')});
  if(repairMode) {
    await page.waitForFunction(()=>!document.getElementById('prepChecklist').hidden);await shot('before');
    const initial=await page.evaluate(()=>{
      const T=TT;T.unlockAllBuilds();T.addCash(10000);
      const gx=T.gridIndex(32),gz=T.gridIndex(32),cx=T.gridCentre(gx),cz=T.gridCentre(gz),y=T.sampleHeight(cx,cz);
      T.levelGroundRect(T.gridCentre(gx-3),T.gridCentre(gz-3),T.gridCentre(gx+3),T.gridCentre(gz+3),y,4);
      T.player.position.set(cx,T.sampleHeight(cx,cz),cz);
      const wall=T.placeBuildAt('wall',gx+1,gz,0);if(!wall)throw Error('repair fixture wall did not place');
      wall.hp=wall.maxHp*.4;window.repairFixture=wall;
      const target=T.getRepairTarget();if(!target)throw Error('owner did not nominate fixture wall');
      uiProbe.startPrep();uiProbe.publishPrepState(0,true);return {id:target.id,cost:target.cost,cash:T.getBank()};
    });
    const row=page.locator('#prepChecklist li').filter({hasText:'Repair the damaged Wall'});
    await row.waitFor({state:'attached'});await page.locator('#prepChecklist summary').click();
    assert.equal(await row.getAttribute('data-state'),'pending');await shot('pending');
    await page.keyboard.press('t');
    await page.waitForFunction(()=>repairFixture.hp>=repairFixture.maxHp-.5);
    await page.waitForFunction(()=>document.querySelector('#prepChecklist [data-state="done"]'));
    assert.equal(await row.getAttribute('data-state'),'done');
    assert.equal(await page.evaluate(()=>TT.getBank()),initial.cash-initial.cost);
    assert.equal(await page.evaluate(id=>TT.getRepairSnapshot(id).cost,initial.id),0);
    assert(await page.evaluate(cost=>uiReceipts.some(e=>e.type==='purchase-delivered'&&e.source==='repair'&&e.cashSpent===cost),initial.cost));
    await shot('complete');
    await page.evaluate(()=>{const q=TT.HQ_PANEL_FRONT;TT.player.position.set(q.x,TT.sampleHeight(q.x,q.z),q.z);});
    await page.waitForFunction(()=>TT.actionTarget()==='hqPanel');await page.keyboard.press('e');
    assert(await page.locator('#hqBriefing').isVisible());
    assert.equal(await page.locator('#hqBriefing li').filter({hasText:'Repair the damaged Wall'}).getAttribute('data-state'),'done');
    await shot('hq-complete');await page.keyboard.press('Escape');
    await page.evaluate(()=>{
      TT.player.position.set(repairFixture.x-2,TT.sampleHeight(repairFixture.x-2,repairFixture.z),repairFixture.z);
      repairFixture.hp=repairFixture.maxHp*.4;uiProbe.startPrep();uiProbe.publishPrepState(0,true);
    });
    assert.equal(await row.getAttribute('data-state'),'pending');
    await page.evaluate(()=>{TT.removeBuild(repairFixture);uiProbe.publishPrepState(0,true);});
    assert.equal(await row.getAttribute('data-state'),'unavailable');
    assert.equal(await page.evaluate(id=>TT.getRepairSnapshot(id),initial.id),null);await shot('removed');
    await page.evaluate(()=>TT.runDevCommand('Reset'));
    await page.waitForFunction(()=>document.querySelector('#prepChecklist summary').textContent==='Prep 0/1');
    console.log('PASS repair: paid T repair ticks HUD/HQ; cost-zero existing target completes; removed target unavailable; purchase receipt and Reset.');
  } else if(prepMode) {
    await page.waitForFunction(()=>!document.getElementById('prepChecklist').hidden);
    assert.equal(await page.locator('#prepChecklist summary').textContent(),'Prep 0/1');await shot('collapsed');
    await page.evaluate(()=>{uiProbe.spawnSkullDrop(TT.player.position.x,TT.player.position.z,12,'shambler');});
    await page.waitForFunction(()=>TT.getSkullBag().count===1);
    await page.evaluate(()=>{TT.getAmmo().pistol=0;TT.getReserve()['.45']=0;uiProbe.startPrep();uiProbe.publishPrepState(0,true);});
    await page.waitForFunction(()=>document.querySelector('#prepChecklist summary').textContent==='Prep 0/3');
    await page.locator('#prepChecklist summary').click();await shot('three-pending');
    const bounds=await page.locator('#prepChecklist').boundingBox();assert(bounds.x>=0&&bounds.y>=0);
    await page.setViewportSize({width:390,height:640});await shot('mobile');await page.setViewportSize({width:1280,height:720});
    await page.evaluate(()=>{TT.buyAmmo('.45');uiProbe.publishPrepState(0,true);});
    assert.equal(await page.locator('#prepChecklist [data-goal="ammo:pistol"]').getAttribute('data-state'),'done');
    await page.evaluate(()=>{const p=TT.HQ_WINDOW_FRONT;TT.player.position.set(p.x,TT.sampleHeight(p.x,p.z),p.z);});
    await page.waitForFunction(()=>TT.actionTarget()==='hqWindow');await page.evaluate(()=>TT.doAction());
    await page.waitForFunction(()=>TT.hq.dep==='process');
    assert.equal(await page.locator('#prepChecklist [data-goal="bank"]').getAttribute('data-state'),'pending');
    await page.waitForFunction(()=>TT.hq.dep==='green');
    assert.equal(await page.locator('#prepChecklist [data-goal="bank"]').getAttribute('data-state'),'done');await shot('mixed');
    await page.evaluate(()=>{const p=TT.HQ_PANEL_FRONT;TT.player.position.set(p.x,TT.sampleHeight(p.x,p.z),p.z);});
    await page.waitForFunction(()=>TT.actionTarget()==='hqPanel');await page.keyboard.press('e');
    assert(await page.locator('#hqBriefing').isVisible(),'E must return to the game after expanding the checklist');
    assert.equal(await page.locator('#hqBriefing .briefing-prep h3').textContent(),'Prep 2/3');await shot('briefing');
    await page.locator('#hqBriefing button').filter({hasText:'Sound alarm'}).click();
    assert.equal(await page.locator('#prepChecklist summary').textContent(),'Prep 3/3');
    assert.equal(await page.locator('#prepChecklist').getAttribute('open'),null);
    await page.waitForFunction(()=>TT.getPhase()==='wave');await page.waitForFunction(()=>document.getElementById('prepChecklist').hidden);
    await page.evaluate(()=>TT.runDevCommand('Reset'));
    await page.waitForFunction(()=>document.querySelector('#prepChecklist summary').textContent==='Prep 0/1');
    console.log('PASS prep: stable three goals, ammo inventory, pending/credited bank, HQ mirror, explicit alarm, wave hide and Reset.');
  } else if(coachMode) {
    const ready=await page.evaluate(()=>uiReceipts.some(e=>e.type==='controls-ready'));
    if(!ready&&process.argv.includes('--simulate-controls-ready')) {
      console.log('SIMULATED controls-ready: CU-9 hook not present; this is not live activation proof.');
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dw-game',{detail:{type:'controls-ready'}})));
    } else assert(ready,'CU-9 must dispatch controls-ready before the coach is live');
    await page.waitForFunction(()=>!document.querySelector('#bigBanner.show')); await shot('before');
    const cash=await page.evaluate(()=>{const n=TT.getBank();uiProbe.spawnSkullDrop(TT.player.position.x,TT.player.position.z,12,'shambler');return n;});
    await page.waitForFunction(()=>TT.getSkullBag().count===1&&!document.getElementById('firstMinuteCoach').hidden);
    assert.equal(await page.locator('#firstMinuteCoach strong').textContent(),'Skulls collected.');
    assert.equal(await page.evaluate(()=>TT.getBank()),cash); await shot('pickup');
    await page.evaluate(()=>{const q=TT.HQ_WINDOW_FRONT;TT.player.position.set(q.x,TT.sampleHeight(q.x,q.z),q.z);});
    await page.waitForFunction(()=>document.querySelector('#firstMinuteCoach strong').textContent==='Press E to bank your skulls.');await shot('bank');
    await page.evaluate(()=>TT.doAction()); await page.waitForFunction(()=>TT.hq.dep==='process');
    assert(await page.locator('#firstMinuteCoach').isHidden());
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dw.coach.v1')).banked),false);await shot('processing');
    await page.waitForFunction(()=>TT.hq.dep==='green');assert.equal(await page.evaluate(()=>TT.getBank()),cash+12);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dw.coach.v1')).banked),true);
    await page.evaluate(()=>TT.buyAmmo('.45'));
    await page.waitForFunction(()=>!document.getElementById('firstMinuteCoach').hidden&&document.querySelector('#firstMinuteCoach strong').textContent==='Purchase ready.');await shot('purchase');
    console.log('PASS coach: real pickup, pending versus completed bank credit, profile persistence and paid ammo delivery.');
  } else {
    const warningStates=await page.evaluate(()=>{
      const i=TT.POI.caves.findIndex(c=>c.theme==='shale');
      TT.caveWarn(i,1);const preparing=uiProbe.mapWarnings.get(i);
      TT.caveWarn(i,2);const spawning=uiProbe.mapWarnings.get(i);
      TT.caveWarn(i,0);return {preparing,spawning,cleared:!uiProbe.mapWarnings.has(i)};
    });
    assert.deepEqual(warningStates,{preparing:1,spawning:2,cleared:true});
    await page.evaluate(()=>{const q=TT.HQ_PANEL_FRONT;TT.player.position.set(q.x,TT.sampleHeight(q.x,q.z),q.z);});
    await page.waitForFunction(()=>TT.actionTarget()==='hqPanel'); await shot('before');
    const plan=await page.evaluate(()=>JSON.stringify(TT.getWavePreview())); await page.keyboard.press('e');
    assert(await page.locator('#hqBriefing').isVisible());assert.equal(await page.evaluate(()=>TT.hq.seq),null);
    assert.equal(await page.evaluate(()=>uiProbe.getPaused()),true);
    assert((await page.locator('#hqBriefing').textContent()).includes('Field Intel reveals'));
    assert(!(await page.locator('#hqBriefing').textContent()).includes('Total:'));
    const bounds=await page.locator('#hqBriefing').boundingBox(); assert(Math.abs(bounds.x+bounds.width/2-640)<2,'dialog centered');
    await shot('basic'); await page.setViewportSize({width:390,height:640});await shot('mobile');await page.setViewportSize({width:1280,height:720});
    await page.keyboard.press('Escape');assert(await page.locator('#hqBriefing').isHidden());
    assert.equal(await page.evaluate(()=>uiProbe.getPaused()),false);assert.equal(await page.evaluate(()=>JSON.stringify(TT.getWavePreview())),plan);
    await page.evaluate(()=>{TT.openShop(true);TT.setShopTabDbg('upgrades');});
    assert.equal(await page.locator('[data-item="field-intel"] button').textContent(),'Need 80 more Cash');await shot('shortfall');
    await page.evaluate(()=>{uiProbe.setCash(200);TT.setShopTabDbg('upgrades');});await page.locator('[data-item="field-intel"] button').click();
    assert.equal(await page.evaluate(()=>TT.getBank()),80);assert.equal(await page.evaluate(()=>uiProbe.getIntel()),true);
    await page.evaluate(()=>{for(let i=0;i<3;i++)window.dispatchEvent(new CustomEvent('dw-game',{detail:{type:'intel-purchase-request'}}));});
    assert.equal(await page.evaluate(()=>TT.getBank()),80);await shot('owned');await page.evaluate(()=>TT.closeShop());
    await page.keyboard.press('e');assert((await page.locator('#hqBriefing').textContent()).includes('Total:'));await shot('full');
    await page.keyboard.press('Escape');await page.evaluate(()=>uiProbe.dropPreview());await page.keyboard.press('e');
    assert((await page.locator('#hqBriefing').textContent()).includes('Briefing unavailable'));
    const alarm=page.locator('#hqBriefing button').filter({hasText:'Sound alarm'});assert(await alarm.isEnabled());await shot('unavailable');
    await alarm.click();assert(await page.locator('#hqBriefing').isHidden());assert.equal(await page.evaluate(()=>!!TT.hq.seq),true);
    await page.evaluate(()=>TT.runDevCommand('Reset'));assert.equal(await page.evaluate(()=>uiProbe.getIntel()),false);
    console.log('PASS briefing: basic/full/unavailable, plan stable, E/Escape, pause restore, 120 Cash charged once, Reset, explicit alarm.');
  }
  assert.deepEqual(errors,[]);console.log('PASS no page errors. Stand-in renderer: no GPU or performance claim.');
} finally { if(browser)await browser.close();server.close(); }

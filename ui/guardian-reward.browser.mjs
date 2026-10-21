// GP-12 production-hook checks. Only the renderer and inspection probes are
// substituted; the reward listener and delivery adapter come from index.html.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),shots=path.join(root,'Claude outputs/shots/gp12-live');
fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(src.includes('window.TT = {'),'debug export anchor exists');
src=src.replace(/<script type="importmap">[\s\S]*?<\/script>/,()=>'<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
  .replace('window.TT = {',()=>`
  window.gp12Preview={
    reward:guardianReward, clearBlueprint:()=>{delete buildUnlocked.mortar;},
    emit:(extra={})=>publishUI('guardian-first-blood',{receiptId:'guardian-night-first',typeKey:'guardian',playerCredit:true,planned:true,x:32,z:32,...extra}),
    drops:()=>cashDrops.filter(d=>d.rewardReceipt).map(d=>({id:d.rewardReceipt,value:d.value,taken:d.taken,x:d.mesh.position.x,z:d.mesh.position.z})),
    reset:()=>resetHQ()
  }; window.TT = {`);
const server=await serve(root,0);let browser;
try {
  browser=await chromium.launch({executablePath:process.env.UI_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/index.html?*',route=>route.fulfill({body:src,contentType:'text/html'}));
  await page.addInitScript(()=>{window.gp12Purchases=[];window.addEventListener('dw-game',({detail:d})=>{if(d.type==='purchase-delivered')gp12Purchases.push(d);});});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  await page.waitForFunction(()=>window.TT&&window.DWLoad?.snapshot().state==='ready',null,{timeout:120000});
  await page.evaluate(()=>DWOpening.dismissForTesting());
  await page.waitForFunction(()=>document.getElementById('opening').hidden);
  await page.fill('#playerName','Reward Tester');await page.click('#modeHunt');
  await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:30000});
  await page.screenshot({path:path.join(shots,'before.png')});
  const blueprint=await page.evaluate(()=>{
    gp12Preview.clearBlueprint();const cash=TT.getBank();gp12Preview.emit({planned:false});
    if(gp12Preview.reward.read()!==null)throw Error('unplanned event consumed reward');
    gp12Preview.emit();gp12Preview.emit();
    return {cashBefore:cash,cashAfter:TT.getBank(),owned:TT.getBuildUnlocked().mortar,receipt:gp12Preview.reward.read(),drops:gp12Preview.drops(),purchases:gp12Purchases.length};
  });
  assert(blueprint.owned);assert.equal(blueprint.cashAfter,blueprint.cashBefore);
  assert.equal(blueprint.receipt.reward,'mortar-blueprint');assert.equal(blueprint.drops.length,0);assert.equal(blueprint.purchases,0);
  await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('bigBanner')).opacity)>.95);
  await page.screenshot({path:path.join(shots,'blueprint.png')});
  const bonus=await page.evaluate(()=>{
    gp12Preview.reset();const cash=TT.getBank();gp12Preview.emit();gp12Preview.emit();
    return {cashBefore:cash,cashAfter:TT.getBank(),receipt:gp12Preview.reward.read(),drops:gp12Preview.drops(),purchases:gp12Purchases.length};
  });
  assert.equal(bonus.cashAfter,bonus.cashBefore);assert.equal(bonus.receipt.reward,'skull-value');
  assert.equal(bonus.drops.length,1);assert.equal(bonus.drops[0].value,80);assert.equal(bonus.purchases,0);
  assert(Math.abs(bonus.drops[0].x-32)<.3&&Math.abs(bonus.drops[0].z-32)<.3,'drop uses kill position');
  await page.screenshot({path:path.join(shots,'bonus.png')});assert.deepEqual(errors,[]);
  console.log('PASS GP-12 production hook: free blueprint, one 80-value skull drop at kill position, duplicate/unplanned events rejected, run-reset, no Cash or purchase events, no page errors.');
  console.log('Stand-in renderer with injected event fixtures; real GPU and combat-to-event path are not claimed by this check.');
} finally {if(browser)await browser.close();server.close();}

// Short production CIF smoke check; --before records the old layout only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const shots=path.join(root,'Claude outputs/shots/gp97');fs.mkdirSync(shots,{recursive:true});
const before=process.argv.includes('--before');
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-97 browser time limit');process.exit(2);},110000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 try {await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});}
 catch(error) {console.error('Boot errors:',errors);throw error;}
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.fill('#playerName','CIF Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>TT.openCIF());
 await page.waitForFunction(()=>document.querySelector('#cifMarine').dataset.ready==='true');
 for(const width of [1280,390]) {
  await page.setViewportSize({width,height:width===390?844:800});
  await page.screenshot({path:path.join(shots,(before?'before-':'after-')+width+'.png')});
 }
 if(!before) {
  await page.setViewportSize({width:1280,height:800});
  const original=await page.evaluate(()=>({w:TT.getWardrobe(),bank:TT.getBank()}));
  assert.equal(await page.locator('#cifList button[data-camo]:not([hidden])').count(),4);
  assert.equal(await page.locator('#enemyCounterCard').isVisible(),false);
  await page.locator('[data-camo="marpat"]').click();
  const changed=await page.evaluate(()=>({w:TT.getWardrobe(),bank:TT.getBank()}));
  assert.equal(changed.w.items.cap.camo,'marpat');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_wardrobe')).items.cap.camo),'marpat');
  assert.equal(await page.locator('[data-camo="marpat"]').getAttribute('aria-pressed'),'true');
  assert.equal(changed.bank,original.bank);delete changed.w.items.cap.camo;delete original.w.items.cap.camo;
  assert.deepEqual(changed.w,original.w);
  assert.equal(await page.locator('[data-filter="locked"]').count(),0,'GP-138: no locked-items browsing control');
  assert(await page.locator('[data-camo="dcu"]').isDisabled());
  assert.equal(await page.locator('[data-camo="dcu"]').isVisible(),false,'GP-138: unearned finishes stay hidden');
  const lockedBefore=await page.evaluate(()=>JSON.stringify(TT.getWardrobe()));
  await page.locator('[data-camo="dcu"]').dispatchEvent('click');
  assert.equal(await page.evaluate(()=>JSON.stringify(TT.getWardrobe())),lockedBefore);
  await page.screenshot({path:path.join(shots,'unlocked-only-1280.png')});
  await page.locator('[data-cif-tab="body"]').click();
  await page.locator('[data-cif-item="shirt"]').click();
  await page.locator('#cifOptions button').last().click();
  assert.equal((await page.evaluate(()=>TT.getWardrobe())).items.shirt.sleeves,'rolled');
  await page.locator('#cifReset').click();
  assert.equal((await page.evaluate(()=>TT.getWardrobe())).items.shirt.sleeves,'down');
  assert.equal((await page.evaluate(()=>TT.getWardrobe())).items.cap.camo,'marpat');
  assert.equal(await page.locator('[data-cif-tab="guns"]').count(),0,'CL-114 (Jerry): gun camo is chosen in the Armory, not the CIF');
  await page.locator('[data-cif-tab="him"]').click();
  assert.equal(await page.locator('#cifFilters').isVisible(),false);
  for(const width of [390,1280]) {
   await page.setViewportSize({width,height:width===390?844:800});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const close=await page.locator('#cifClose').boundingBox();assert(close.y+close.height<= (width===390?844:800));
   assert(close.x>=0 && close.x+close.width<=width);
  }
  await page.locator('#cifClose').focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'cifRotate');
  await page.locator('#cifClose').click();assert.equal(await page.evaluate(()=>TT.isCIFOpen()),false);
  await page.evaluate(()=>TT.openCIF());await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>TT.isCIFOpen()),false);
  await page.evaluate(()=>{const p=TT.HQ_ARMORY_FRONT;TT.player.position.set(p.x,TT.sampleHeight(p.x,p.z),p.z);});
  await page.waitForFunction(()=>TT.actionTarget()==='armory');await page.evaluate(()=>TT.doAction());
  assert(await page.locator('#armoryPanel').isVisible());
  assert.equal(await page.locator('#cif > .card').isVisible(),false);
  // CL-114: the gun's finish, at the Armory's workbench.
  await page.evaluate(()=>TT.armoryDbg.ui().bench('m4'));
  assert.equal(await page.locator('#armoryPanel [data-finish="rune"]').count(),0,'unearned rune finish is not offered');
  await page.locator('#armoryPanel .armory-swatch[data-finish="marpat"]').click();
  assert.equal((await page.evaluate(()=>TT.getWardrobe())).guns.m4,'marpat');
  await page.locator('#armoryPanel .armory-actions button').last().click();
  await page.waitForFunction(()=>!TT.isCIFOpen());
  if(process.argv.includes('--rune')) {
   // CL-114: the rune finish is chosen at the Armory's workbench.
   const bench=async()=>{await page.evaluate(()=>TT.openCIF());await page.locator('#armoryOpen').click();await page.evaluate(()=>TT.armoryDbg.ui().bench('m4'));};
   await bench();
   await page.screenshot({path:path.join(shots,'before-rune-guns.png')});
   await page.evaluate(()=>TT.runeFinishDbg.unlock());
   await page.locator('#armoryPanel .armory-swatch[data-finish="rune"]').click();
   assert.equal((await page.evaluate(()=>TT.getWardrobe())).guns.m4,'rune');
   assert.equal(await page.evaluate(()=>TT.runeFinishDbg.readWardrobe().guns.m4),'rune');
   assert.equal(await page.evaluate(()=>TT.CAMO_KEYS.length),49);
   assert.equal(await page.evaluate(()=>TT.armoryFinishDbg.list('m4').list.length),51,'factory, the rune finish and 49 camos');
   assert.equal(await page.locator('#armoryPanel .armory-swatch[data-finish="rune"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#armoryPanel .armory-finish-current').textContent(),'Rune finish');
   for(const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:800});
    await page.locator('#armoryPanel .armory-swatch[data-finish="rune"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(shots,'after-rune-'+width+'.png')});
   }
   await page.locator('#armoryPanel .armory-actions button').last().click();await page.evaluate(()=>TT.closeCIF());
   await page.evaluate(()=>TT.openCIF());
   await page.locator('[data-cif-tab="head"]').click();
   assert.equal(await page.locator('[data-camo="rune"]').count(),0,'no rune clothing');
   assert.equal(await page.locator('#cifList [data-camo]:not([hidden])').count(),4);
   await page.evaluate(()=>TT.closeCIF());
   await bench();
   const rune=await page.locator('#armoryPanel .armory-swatch[data-finish="rune"]').elementHandle();
   await page.evaluate(()=>TT.armoryFinishDbg.paint('m4','marpat'));await page.evaluate(()=>TT.runeFinishDbg.lock());
   await rune.evaluate(b=>b.click());
   assert.equal((await page.evaluate(()=>TT.getWardrobe())).guns.m4,'marpat','stale rune choice rechecks entitlement');
   console.log('PASS GP-98 (CL-114: at the Armory): earned rune choice, live unlock event, exact saved gun field, reload validator, 49 standard camos, no rune clothing, stale lock guard.');
  }
  assert.deepEqual(errors,[]);
 }
 console.log('PASS GP-97 '+(before?'before screenshots':'WebGPU: four issued camos, locked finishes, scoped wardrobe edits, gun finish, appearance, responsive footer, close/Escape, no page errors'));
} finally {clearTimeout(hard);if(browser)await browser.close();server.close();}

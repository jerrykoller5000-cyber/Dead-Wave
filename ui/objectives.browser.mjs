// Standalone GP-9 fixture checks; no game or shared index.html changes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),shots=path.join(root,'Claude outputs/shots/gp11-choices');
fs.mkdirSync(shots,{recursive:true});
const server=await serve(root,0);let browser;
try {
  browser=await chromium.launch({executablePath:process.env.UI_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1150,height:780}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.origin+'/ui/objectives.fixture.html');await page.waitForFunction(()=>window.objectiveFixture);
  const shot=name=>page.screenshot({path:path.join(shots,name+'.png')});
  assert.equal(await page.locator('.objective-marker').count(),7);assert(await page.locator('.objective-tracker').isHidden());await shot('before');
  const marker=page.locator('[data-site="objective:radio-repair"]');await marker.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.objective-tracker h2').textContent(),'Restore the radio mast');
  assert.equal(await marker.getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>objectiveFixture.tick());assert(await marker.evaluate(el=>document.activeElement===el),'marker retains keyboard focus on updates');
  await shot('tracked');
  await page.locator('[data-site="objective:medical-convoy"]').click();
  assert.equal(await page.locator('.objective-marker[aria-pressed="true"]').count(),1);
  assert.equal(await page.locator('.objective-tracker h2').textContent(),'Recover medical supplies');
  await page.locator('.objective-tracker button').click();assert(await page.locator('.objective-tracker').isHidden());
  for(const state of ['available','active','interrupted','full','partial','claimed','unavailable','hidden']) {
    await page.evaluate(state=>objectiveFixture.scenario(state),state);
    if(state==='active')assert.equal(await page.locator('progress').getAttribute('value'),'0.55');
    if(state==='interrupted')assert.equal(await page.locator('.objective-status').textContent(),'Repair interrupted');
    if(state==='full')assert.equal(await page.locator('.objective-status').textContent(),'Inventory full — supplies remain');
    if(state==='partial')assert.match(await page.locator('.objective-tracker').textContent(),/Supplies remaining: \+18 rounds/);
    if(['claimed','unavailable'].includes(state))assert(await page.locator('.objective-tracker').isHidden());
    if(state==='hidden')assert.equal(await page.locator('.objective-marker').count(),1);
    await shot(state);
  }
  await page.evaluate(()=>objectiveFixture.scenario('active'));await page.setViewportSize({width:390,height:844});await shot('mobile');
  const box=await page.locator('.objective-tracker').boundingBox();assert(box.x>=0&&box.x+box.width<=390);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  await page.locator('.objective-tracker button').focus();await page.keyboard.press('Enter');assert(await page.locator('.objective-tracker').isHidden());
  await page.evaluate(()=>{
    objectiveFixture.scenario('available');const s=objectiveFixture.snapshot(),r=s.sites[0];
    r.choices=[{id:'556',reward:{key:'objectives.packChoice',params:{calibre:'5.56',pack:'60 rounds'}}},
      {id:'9mm',reward:{key:'objectives.packChoice',params:{calibre:'9mm',pack:'90 rounds'}}}];
    r.choiceId='556';s.sequence++;objectiveFixture.app.update(s);
  });
  const choice=page.locator('.objective-choice select');assert(await choice.isVisible());await choice.focus();
  await page.keyboard.press('ArrowDown');assert(await choice.evaluate(el=>document.activeElement===el));
  await choice.selectOption('9mm');assert.equal(await choice.inputValue(),'9mm');
  await shot('choices');
  await page.evaluate(()=>{const s=objectiveFixture.snapshot();s.sites[0].choiceId='9mm';s.sites[0].choiceLocked=true;s.sequence++;objectiveFixture.app.update(s);});
  assert(await choice.isDisabled());assert.equal(await choice.inputValue(),'9mm');
  await page.evaluate(()=>{const s=objectiveFixture.snapshot();s.sequence++;s.active=false;objectiveFixture.app.update(s);});
  assert(await page.locator('.objective-markers').isHidden());
  assert.deepEqual(errors,[]);
  console.log('PASS objectives fixture: seven markers, one tracker, keyboard/focus, progress, interruption, full/partial inventory, terminal/hidden sites and narrow viewport.');
  console.log('PASS no page errors. Stub sites only; no world, rewards or GPU performance claim.');
} finally {if(browser)await browser.close();server.close();}

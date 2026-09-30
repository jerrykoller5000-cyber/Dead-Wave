// GP-69: actual HQ board clue and end-screen lines on the real renderer.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'Claude outputs/shots', gpu ? 'gp69-gpu' : 'gp69');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
src = src.replace('window.TT = stampDebugHooks({', `window.gp69Probe = {
  board: () => {
    day=3;
    bounties=[{kind:'campsite',index:2,x:POI.campsites[2].x,z:POI.campsites[2].z,
      dist:120,reward:75,guards:3,day,state:'open',survivor:{style:'trapper',state:'waiting'}}];
    player.position.set(HQ_PANEL_FRONT.x,house.group.position.y+1,HQ_PANEL_FRONT.z);hq.seq=null;
    openHQBriefing();
  },
  win: () => {survivors=[{style:'hikers',camp:1,day:3},{style:'ranger',camp:0,day:5},{style:'trapper',camp:2,day:7}];endGame(true);}
};window.TT = stampDebugHooks({`);
assert(src.includes('window.gp69Probe ='),'probe anchor missing');

const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true });
  const page = await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/index.html?*',route=>route.fulfill({body:src,contentType:'text/html'}));
  await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
  await page.evaluate(()=>DWOpening.dismissForTesting());
  await page.waitForFunction(()=>document.getElementById('opening').hidden);
  await page.fill('#playerName','Survivor Tester');await page.click('#modeHunt');
  await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
  await page.evaluate(()=>gp69Probe.board());
  assert.match(await page.locator('.bounty-post').textContent(),/Someone lit a fire at the trapper's camp/);
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:720});
    await page.locator('.bounty-post').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(shots,`board-survivor-${width}.png`)});
  }
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>gp69Probe.win());
  assert.equal(await page.locator('#winMsg .survivors-aboard').textContent(),'Survivors aboard: 3');
  assert.deepEqual(await page.locator('#winMsg .survivor-aboard-line').allTextContents(),[
    'Dr. Reyes, Medic-4. Still counting who she couldn\'t save.',
    'Ranger Voss. Says the dogs are owed a better island.',
    "Kettle, the trapper. First boat he's taken in forty years."
  ]);
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:720});
    await page.screenshot({path:path.join(shots,`victory-survivors-${width}.png`)});
    const card=await page.locator('#win .card').boundingBox();assert(card.x>=0&&card.x+card.width<=width);
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS GP-69 (${gpu?'WebGPU':'stand-in renderer'}): waiting survivor board clue, three named aboard lines and count, 1280/390; no page errors.`);
} finally {if(browser)await browser.close();server.close();}

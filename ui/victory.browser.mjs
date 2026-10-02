// GP-64: exercise the production end screen with the real renderer.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'Claude outputs/shots', gpu ? 'gp64-gpu' : 'gp64');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
src = src.replace('window.TT = stampDebugHooks({', `window.gp64Probe = {
  win: (night, hot) => {
    day = night; matchStats.hotExtraction = hot; matchStats.kills = 248;
    matchStats.headshots = 47; matchStats.skullsTurnedIn = 321; comboBest = 18;
    endGame(true);
  }
};window.TT = stampDebugHooks({`);
assert(src.includes('window.gp64Probe ='),'probe anchor missing');

const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true });
  const context = await browser.newContext({ viewport:{width:1280,height:720} });
  for (const [night,hot] of [[20,false],[21,true]]) {
    const page = await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/index.html?*',route=>route.fulfill({body:src,contentType:'text/html'}));
    await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
    try { await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000}); }
    catch (error) { console.error('boot diagnostics', errors, await page.evaluate(()=>({load:window.DWLoad?.snapshot?.(),probe:!!window.gp64Probe,body:document.body.innerText.slice(-800)}))); throw error; }
    await page.evaluate(()=>DWOpening.dismissForTesting());
    await page.waitForFunction(()=>document.getElementById('opening').hidden);
    if (night===21) assert.match(await page.locator('#menuBestRecord').textContent(),/Heron took you out on night 20/);
    await page.fill('#playerName','Victory Tester');await page.click('#modeHunt');
    await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
    await page.evaluate(({night,hot})=>gp64Probe.win(night,hot),{night,hot});
    assert(await page.locator('#win.show.victory').count());
    assert.equal(await page.locator('#win h2').textContent(),'Evacuated');
    assert.equal(await page.locator('#winMsg .reason').textContent(),hot
      ? `Heron took you out on night ${night}, with the dead still on the dock.` : `Heron took you out on night ${night}.`);
    assert.equal(await page.locator('#winMsg .st').count(),5);
    assert.match(await page.locator('#winMsg .survivors-aboard').textContent(),/Survivors aboard: 0/);
    assert.match(await page.locator('#winMsg .best-record').textContent(),new RegExp(`Heron took you out on night ${night}`));
    assert.equal(await page.locator('#winMsg .deathlog').count(),0);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_best_run')).escapeNight),night);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_best_run')).hotEscapeNight),hot?night:0);
    for (const width of [1280,390]) {
      await page.setViewportSize({width,height:width===390?844:720});
      await page.screenshot({path:path.join(shots,`victory-${hot?'hot':'quiet'}-${width}.png`)});
      const card=await page.locator('#win .card').boundingBox();
      assert(card.x>=0 && card.x+card.width<=width,`card exceeds ${width}px`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    assert.deepEqual(errors,[]);
    await page.close();
  }
  console.log(`PASS GP-64 (${gpu?'WebGPU':'stand-in renderer'}): quiet/hot victory closing lines, five stats, survivor count, persisted evacuation record, 1280/390 layout; no page errors.`);
} finally {if(browser)await browser.close();server.close();}

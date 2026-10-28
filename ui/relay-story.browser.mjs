// GP-66: actual morning hook and HQ board, with renderer choice kept explicit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const shots = path.join(root, 'handoffs/GP-19973', gpu ? 'native' : 'stand-in');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
src = src.replace('window.TT = stampDebugHooks({', `window.gp66Probe={
  advance:(target,up,board)=>{relayUpDbg=up;if(board)hush.board=board;while(day<target)startPrep();
    hq.seq=null;},
  read:()=>relayStory.read(relayUp()),open:(panel='radio')=>{const p=hqStation(panel).approach;player.position.set(p.x,p.y,p.z);openHQBriefing({panel});}
};window.TT = stampDebugHooks({`);
assert(src.includes('window.gp66Probe='),'debug probe anchor missing');

const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true });
  const page = await browser.newPage({ viewport:{width:1280,height:720} });
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/index.html?*',route=>route.fulfill({body:src,contentType:'text/html'}));
  await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
  await page.evaluate(()=>DWOpening.dismissForTesting());
  await page.waitForFunction(()=>document.getElementById('opening').hidden);
  await page.fill('#playerName','Relay Tester');await page.click('#modeHunt');
  await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
  await page.evaluate(()=>{gp66Probe.advance(3,false);gp66Probe.open('duty');});
  assert.equal(await page.locator('.briefing-orders p').count(),4);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>gp66Probe.open());
  assert.equal(await page.locator('.briefing-relay .relay-story-line').textContent(),'RELAY · SILENT');
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:720});
    await page.screenshot({path:path.join(shots,`board-silent-${width}.png`)});
  }
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>gp66Probe.advance(4,true,'none'));
  assert.deepEqual(await page.evaluate(()=>gp66Probe.read().lines.map(item=>item.number)),[2,1], 'repair alone does not invent a recovered board');
  await page.evaluate(()=>gp66Probe.advance(5,true,'carried'));
  assert.deepEqual(await page.evaluate(()=>gp66Probe.read().lines.map(item=>item.number)),[null,4,3]);
  assert.match(await page.evaluate(()=>gp66Probe.read().line),/vault lift.*HQ radio set/);
  for(const [night,expected] of [[5,[null,4,3]],[10,[10]],[16,[16]],[18,[18]],[19,[19]],[20,[20]]]) {
    await page.evaluate(({night})=>gp66Probe.advance(night,true),{night});
    assert.deepEqual(await page.evaluate(()=>gp66Probe.read().lines.map(item=>item.number)),expected);
    await page.evaluate(()=>gp66Probe.open());
    assert.equal(await page.locator('.briefing-relay .relay-story-line').count(),expected.length);
    assert.match(await page.locator('.briefing-relay .relay-story-line').first().textContent(),night===20?/Tonight's the night/:/./);
    for(const width of [1280,390]) if([5,10,16,18,20].includes(night)) {
      await page.setViewportSize({width,height:width===390?844:720});
      await page.locator('.briefing-relay').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(shots,`board-night-${night}-${width}.png`)});
      const box=await page.locator('#hqBriefing').boundingBox();assert(box.x>=0&&box.x+box.width<=width);
    }
    await page.getByRole('button',{name:'Close',exact:true}).click();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(shots,'report.json'),JSON.stringify({renderer:await page.evaluate(()=>TT.getRendererBackend()),errors,checks:['unrepaired relay silent','repair without board has numbered lines only','carried board guidance names vault lift and HQ radio','guidance appears once','catch-up preserved','boat dispatches 18–20 preserved','radio panel at 1280 and 390 within viewport']},null,2));
  console.log(`PASS GP-19973 (${gpu?'native':'stand-in renderer'}): relay silent; repair alone does not reveal board; actual dawn adapter adds carried-board guidance once; catch-up and boat lines preserved; radio mornings 5/10/16/18/20 at 1280/390; no page errors.`);
} finally {if(browser)await browser.close();server.close();}

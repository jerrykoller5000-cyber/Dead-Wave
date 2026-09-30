// GP-63 production briefing check with a substituted renderer.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const shots = path.join(root, 'Claude outputs/shots/gp63');
fs.mkdirSync(shots, { recursive: true });
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<script type="importmap">[\s\S]*?<\/script>/,
    '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>')
  .replace('window.TT = stampDebugHooks({', `window.gp63Probe={
    setup:(n,up)=>{day=n;phase='prep';hq.seq=null;relayUpDbg=up;
      player.position.set(HQ_PANEL_FRONT.x,house.group.position.y+1,HQ_PANEL_FRONT.z);},
    open:()=>openHQBriefing(),due:()=>{extractionState='due';extractionDay=day;hq.seq=null;phase='prep';},
    dockPixel:()=>{minimapTick=0;drawMinimap(1);
      const p=projectScoutCave(POI.dock,{x:player.position.x,z:player.position.z,yaw:camYawCurrent,
        center:MAP_PX/2,scale:(MAP_PX/2-4)/MINI_R,rim:MAP_PX/2-7-8-28});
      return [...minimapCtx.getImageData(Math.round(p.x),Math.round(p.y),1,1).data];}
  };window.TT = stampDebugHooks({`);

const server = await serve(root, 0);
let browser;
try {
  browser = await chromium.launch({ executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true });
  const page = await browser.newPage({ viewport:{width:1280,height:720} });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/index.html?*', route => route.fulfill({ body:source, contentType:'text/html' }));
  await page.goto(server.origin + '/index.html?debug=1&raf=timer');
  await page.waitForFunction(() => window.TT && DWLoad.snapshot().state === 'ready', null, {timeout:120000});
  await page.evaluate(() => DWOpening.dismissForTesting());
  await page.waitForFunction(() => document.getElementById('opening').hidden);
  await page.fill('#playerName','Boat Tester');
  await page.click('#modeHunt');
  await page.waitForFunction(() => TT.getPhase() === 'prep' && !document.body.classList.contains('deploying'), null, {timeout:45000});
  await page.evaluate(() => { window.gp63Events=[];window.addEventListener('dw-game',({detail})=>{if(detail?.type==='extraction')gp63Events.push(detail);}); });

  await page.evaluate(() => {gp63Probe.setup(19,false);gp63Probe.open();});
  assert(await page.locator('#hqBriefing').evaluate(el => el.open));
  assert(await page.getByRole('button',{name:'Call the boat'}).isHidden());
  assert.equal(await page.getByText('Relay down — repair the radio mast to call the boat.').count(),0);
  await page.getByRole('button',{name:'Close',exact:true}).click();

  await page.evaluate(() => {gp63Probe.setup(20,false);gp63Probe.open();});
  assert(await page.getByRole('button',{name:'Call the boat'}).isHidden());
  assert(await page.getByText('Relay down — repair the radio mast to call the boat.').isVisible());
  assert(await page.getByRole('button',{name:'Sound alarm'}).isEnabled());
  await page.screenshot({path:path.join(shots,'relay-down-1280.png')});
  await page.getByRole('button',{name:'Close',exact:true}).click();

  await page.evaluate(() => {gp63Probe.setup(20,true);gp63Probe.open();});
  const boat=page.getByRole('button',{name:'Call the boat'});
  assert(await boat.isVisible());assert(await boat.isEnabled());
  assert.equal(await page.getByText('Relay down — repair the radio mast to call the boat.').count(),0);
  await page.screenshot({path:path.join(shots,'boat-offered-1280.png')});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(shots,'boat-offered-390.png')});
  await boat.click();
  assert.deepEqual(await page.evaluate(() => gp63Events.map(e=>[e.phase,e.day])),[['called',20]]);
  assert.equal(await page.evaluate(() => TT.getWaveDirectorState().extraction.state),'called');
  assert.equal(await page.evaluate(() => document.getElementById('hqBriefing').open),false);
  await page.evaluate(() => gp63Probe.due());
  assert.equal(await page.evaluate(() => TT.getWaveDirectorState().extraction.state),'due');
  const dockPixel=await page.evaluate(() => gp63Probe.dockPixel());
  assert([186,57].includes(dockPixel[0]) && dockPixel[2]>dockPixel[1] && dockPixel[1]>dockPixel[0],`dock cue pixel ${dockPixel}`);
  await page.locator('#minimap').screenshot({path:path.join(shots,'dock-due-minimap-390.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS GP-63 production briefing: pre-goal hides boat, relay-down line, offered call sends one extraction event and starts the night, due dock cue draws; desktop/mobile.');
} finally {
  if(browser)await browser.close();
  server.close();
}

// GP-91: Story v2: E at nine existing note sites; HQ is stencil-only reads a nonblocking card in the real game.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const gpu = process.argv.includes('--gpu');
const historyOnly = process.argv.includes('--history'), before = process.argv.includes('--before');
const shots = path.join(root, 'Claude outputs/shots', historyOnly ? 'gp99' : gpu ? 'gp91-gpu' : 'gp91');
fs.mkdirSync(shots, { recursive: true });
let src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!gpu) src = src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
src = src.replace('window.TT = stampDebugHooks({', `window.gp91Probe = {
  objective: id => {const p=objectiveProps.props[id].approach; player.position.set(p.x,p.y,p.z);},
  hq: () => {player.position.set(HQ_PANEL_FRONT.x,house.group.position.y+1,HQ_PANEL_FRONT.z);hq.seq=null;},
  dock: () => player.position.set(POI.dock.x,POI.dock.deckY,POI.dock.z),
  tower: () => {player.position.set(tower.x,tower.deckY,tower.z);onTowerDeck=true;},
  history: id => {const s=historyProps.spots.find(p=>p.id===id);if(!s)throw Error('Missing '+id);
    for(let k=0;k<16;k++){const a=k*Math.PI/8,p={x:s.x+Math.cos(a)*s.r*.6,z:s.z+Math.sin(a)*s.r*.6};
      if(storyPropInReach(p)===id){player.position.set(p.x,sampleHeight(p.x,p.z)+.1,p.z);return;}}
    throw Error('No readable approach '+id);},
  hide: () => propNoteCard.hide(), seen: id => propNotes.seen(id)
};window.TT = stampDebugHooks({`);
assert(src.includes('window.gp91Probe ='),'probe anchor missing');

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
  await page.fill('#playerName','Note Tester');await page.click('#modeHunt');
  await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
  if(historyOnly) {
    for(const id of ['cordon','trailhead']) {
      await page.evaluate(id=>{gp91Probe.hide();gp91Probe.history(id);},id);
      await page.waitForFunction(id=>TT.storyPropInReach(TT.player.position)===id,id,{timeout:10000});
      await page.keyboard.press('e');
      if(!before) {
        await page.waitForFunction(id=>document.querySelector('#propNoteCard:not([hidden])')?.dataset.site===id,id,{timeout:10000});
        assert(await page.evaluate(id=>gp91Probe.seen(id),id));
      } else assert.equal(await page.locator('#propNoteCard:not([hidden])').count(),0);
      for(const width of [1280,390]) {
        await page.setViewportSize({width,height:width===390?844:720});
        await page.screenshot({path:path.join(shots,(before?'before-':'after-')+id+'-'+width+'.png')});
        if(!before){const box=await page.locator('#propNoteCard').boundingBox();assert(box.x>=0&&box.x+box.width<=width);}
      }
      await page.evaluate(()=>gp91Probe.hide());await page.keyboard.press('e');
      assert.equal(await page.locator('#propNoteCard:not([hidden])').count(),0);
    }
    assert.deepEqual(errors,[]);console.log('PASS GP-99 '+(before?'before screenshots':'WebGPU: real E at Cordon and trailhead, keyed cards, once-per-run, 1280/390, no errors'));
  } else {
  const ids=['objective:radio-repair','objective:medical-convoy','objective:wreck-salvage',
    'objective:ranger-cache','objective:hikers-cache','objective:trapper-cache','objective:fuel-depot'];
  for(const id of ids) {
    await page.evaluate(id=>{gp91Probe.hide();gp91Probe.objective(id);},id);
    await page.waitForFunction(id=>TT.getObjectiveInteraction(id)?.reachable,id,{timeout:10000});
    await page.keyboard.press('e');
    await page.waitForFunction(id=>document.querySelector('#propNoteCard:not([hidden])')?.dataset.site===id,id,{timeout:10000});
    assert(await page.evaluate(id=>gp91Probe.seen(id),id));
  }
  await page.evaluate(()=>{gp91Probe.hide();gp91Probe.dock();});await page.keyboard.press('e');
  await page.waitForFunction(()=>document.querySelector('#propNoteCard:not([hidden])')?.dataset.site==='dock');
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:720});
    await page.screenshot({path:path.join(shots,`dock-note-${width}.png`)});
    const box=await page.locator('#propNoteCard').boundingBox();assert(box.x>=0&&box.x+box.width<=width);
  }
  await page.evaluate(()=>{gp91Probe.hide();gp91Probe.tower();});await page.keyboard.press('e');
  await page.waitForFunction(()=>document.querySelector('#propNoteCard:not([hidden])')?.dataset.site==='watchtower');
  await page.evaluate(()=>{gp91Probe.hide();gp91Probe.hq();});await page.keyboard.press('e');
  await page.waitForFunction(()=>document.querySelector('#hqBriefing[open]'));
  assert.equal(await page.locator('#propNoteCard:not([hidden])').count(),0,'Story v2 HQ uses its wall stencil, no field-note card');
  await page.screenshot({path:path.join(shots,'hq-stencil-only-390.png')});
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>gp91Probe.hide());await page.keyboard.press('e');
  assert.equal(await page.locator('#propNoteCard:not([hidden])').count(),0,'HQ note does not repeat');
  assert.deepEqual(errors,[]);
  console.log(`PASS GP-91 (${gpu?'WebGPU':'stand-in renderer'}): seven objective notes plus dock and tower on E; HQ stencil-only; once-per-run; 1280/390; no page errors.`);
  }
} finally {if(browser)await browser.close();server.close();}

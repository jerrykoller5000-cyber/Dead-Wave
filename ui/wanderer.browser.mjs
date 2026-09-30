// GP-68: production wanderer post, moving trail row, and paid completion notice.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const gpu=process.argv.includes('--gpu');
const shots=path.join(root,'Claude outputs/shots',gpu?'gp68-gpu':'gp68');fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!gpu)src=src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
  '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
src=src.replace('window.TT = stampDebugHooks({',`window.gp68Probe={
  setup:(d)=>{day=d;phase='prep';hq.seq=null;bounties.length=0;
    player.position.set(HQ_PANEL_FRONT.x,house.group.position.y+1,HQ_PANEL_FRONT.z);
    return d===9?!!spawnWanderer(d,()=>0.2):true;},
  open:()=>openHQBriefing(),post:()=>getBounties().find(b=>b.kind==='wanderer'),
  frame:()=>{const post=bounties.find(b=>b.wanderer),z=zombies.find(z=>z.poiGuard===post);
    if(!z)return false;const p=z.mesh.position;
    setShotView({x:p.x+25,y:p.y+6,z:p.z+18,tx:p.x,ty:p.y+3,tz:p.z,fov:42});return true;},
  kill:()=>{const post=bounties.find(b=>b.wanderer),z=zombies.find(z=>z.poiGuard===post);
    if(!z)return false;killZombie(z,true,{kind:'explosive',dir:{x:1,z:0}});return post.state==='done';}
};window.TT = stampDebugHooks({`);
assert(src.includes('window.gp68Probe='),'probe anchor missing');

const server=await serve(root,0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',route=>route.fulfill({body:src,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Wanderer Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{gp68Probe.setup(8);gp68Probe.open();});
 assert.equal(await page.locator('.bounty-post').count(),0);
 await page.screenshot({path:path.join(shots,'board-before-1280.png')});
 await page.getByRole('button',{name:'Close',exact:true}).click();
 assert(await page.evaluate(()=>gp68Probe.setup(9)),'wanderer spawned');
 const post=await page.evaluate(()=>gp68Probe.post());assert(post&&post.wanderer&&post.reward===150);
 await page.evaluate(()=>gp68Probe.open());
 const row=page.locator('.bounty-post[data-bounty*="wanderer"]');
 assert.equal(await row.count(),1);
 assert.match(await row.locator('h4').textContent(),/^A colossus is walking the (north|south|east|west) trail$/);
 assert.match(await row.textContent(),/150 skull value/);
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:width===390?844:720});
  await row.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(shots,`board-after-${width}.png`)});
 }
 await page.getByRole('button',{name:'Close',exact:true}).click();
 assert(await page.evaluate(()=>gp68Probe.frame()));
 await page.setViewportSize({width:1280,height:720});await page.screenshot({path:path.join(shots,'wanderer-30m.png')});
 const before=await page.evaluate(()=>TT.getSkullBag().value);
 assert(await page.evaluate(()=>gp68Probe.kill()));
 await page.waitForFunction(()=>document.getElementById('campCleared').textContent.includes('Wandering colossus'));
 assert.equal(await page.locator('#campCleared').textContent(),'Bounty: Wandering colossus +150 skull value');
 assert.equal(await page.locator('#bigBanner .t').textContent(),'COLOSSUS DOWN');
 assert((await page.evaluate(()=>TT.getSkullBag().value))-before>=150);
 await page.screenshot({path:path.join(shots,'colossus-down-1280.png')});
 assert.deepEqual(errors,[]);
 console.log(`PASS GP-68 (${gpu?'WebGPU':'stand-in renderer'}): real wanderer post, board direction/reward, 30m view, kill notice and >=150 skull value, 1280/390, no page errors.`);
}finally{if(browser)await browser.close();server.close();}

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20105');fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const report={at:new Date().toISOString(),steps:[],errors:[]};
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20105 HQ';document.getElementById('modeHunt').click()})()`);
  assert(await page.waitFor('document.body.classList.contains("playing")',{timeout:30000}));
  assert(await page.waitFor('TT.getPhase()==="prep"',{timeout:30000}));
  assert(await page.waitFor('!TT.insertionDbg.rig()',{timeout:30000}));
  report.steps.push(await page.evaluate(`(()=>{const T=TT,L=T.hqLadderAt();T.player.position.set(L.x,L.y,L.z);T.setVelDbg(0,0);T.setViewFirstDbg(false);
    for(let i=0;i<50;i++)T.stepFrame(.016);return {name:'ladder-foot-third',L,player:T.player.position.toArray(),roof:T.onHqRoof()};})()`));
  await page.screenshot(path.join(out,'30-hq-ladder-foot-third.png'));
  report.steps.push(await page.evaluate(`(()=>{const T=TT,L=T.hqLadderAt();T.setViewFirstDbg(true);T.setOtsAimDbg(Math.PI/2,0);T.setAimYawDbg(Math.PI/2);for(let i=0;i<85;i++)T.stepFrame(.016);
    return {name:'ladder-foot-first',fp:T.fpDbg().first,blend:T.fpDbg().w,yaw:T.otsDbg().yaw,L,player:T.player.position.toArray()};})()`));
  await page.screenshot(path.join(out,'31-hq-ladder-foot-first.png'));
  report.steps.push(await page.evaluate(`(()=>{const T=TT;let last;for(let i=0;i<23;i++)last=T.stepHqLadder(1,.05);
    for(let i=0;i<5;i++)T.stepFrame(.016);return {name:'ladder-mid-first',last,yaw:T.otsDbg().yaw,dir:T.camera.getWorldDirection(new T.THREE.Vector3()).toArray(),player:T.player.position.toArray()};})()`));
  await page.screenshot(path.join(out,'32-hq-ladder-mid-first.png'));
  report.steps.push(await page.evaluate(`(()=>{const T=TT;let last;for(let i=0;i<80&&!T.onHqRoof();i++)last=T.stepHqLadder(1,.05);
    for(let i=0;i<10;i++)T.stepFrame(.016);return {name:'roof-first',last,roof:T.onHqRoof(),player:T.player.position.toArray()};})()`));
  await page.screenshot(path.join(out,'33-hq-roof-first.png'));
  report.steps.push(await page.evaluate(`(()=>{const T=TT;T.setViewFirstDbg(false);for(let i=0;i<80;i++)T.stepFrame(.016);
    return {name:'roof-third',roof:T.onHqRoof(),player:T.player.position.toArray()};})()`));
  await page.screenshot(path.join(out,'34-hq-roof-third.png'));
  report.steps.push(await page.evaluate(`(()=>{const T=TT,L=T.hqLadderAt();let last;for(let i=0;i<90&&T.player.position.y>L.y;i++)last=T.stepHqLadder(-1,.05);
    for(let i=0;i<5;i++)T.stepFrame(.016);return {name:'ladder-down',last,roof:T.onHqRoof(),player:T.player.position.toArray()};})()`));
  await page.screenshot(path.join(out,'35-hq-ladder-down-third.png'));
  report.errors=page.errors.slice();
  assert.equal(report.steps.find(x=>x.name==='roof-first').roof,true);
  assert.equal(report.steps.find(x=>x.name==='ladder-down').roof,false);
  assert.deepEqual(report.errors,[]);
  console.log(`GP-20105 HQ ladder: first/third climb, roof and descent PASS; ${report.errors.length} page errors`);
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'hq-ladder.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}

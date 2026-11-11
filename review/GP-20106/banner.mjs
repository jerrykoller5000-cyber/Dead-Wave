import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20106');fs.mkdirSync(out,{recursive:true});
const phase=process.argv[2]||'before';
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const report={phase,at:new Date().toISOString(),views:[],errors:[]};
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20106';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:20000}));
  const state=()=>page.evaluate(`(()=>{const b=document.getElementById('bigBanner'),p=document.getElementById('armoryPanel');return {
    title:b.querySelector('.t').textContent,show:b.classList.contains('show'),visibility:getComputedStyle(b).visibility,
    panelOpen:!p.hidden,cifOpen:document.getElementById('cif').classList.contains('armory-show'),
    fp:TT.fpDbg().first,blend:TT.fpDbg().w,
    camera:TT.camera.position.toArray().map(n=>+n.toFixed(3)),dir:TT.camera.getWorldDirection(new TT.THREE.Vector3()).toArray().map(n=>+n.toFixed(3))};})()`);
  for(const view of ['third','first']){
    await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;
      T.player.position.set(f.x,tg.floorY,f.z);T.setVelDbg(0,0);T.setViewFirstDbg(${view==='first'});
      for(let i=0;i<100;i++)T.stepFrame(.016);T.doAction();T.addCash(1000000);})()`);
    const bought=await page.evaluate(`(()=>{const p=document.getElementById('armoryPanel'),b=[...p.querySelectorAll('[data-buy-gun]')].find(b=>!b.disabled);
      if(!b)throw Error('No gun available to purchase');const gun=b.dataset.buyGun;b.click();return gun;})()`);
    const open=await state();
    await page.screenshot(path.join(out,`${phase}-${view}-armory-open.png`));
    await page.evaluate('TT.armoryDbg.ui().close()');
    const closed=await state();
    await page.screenshot(path.join(out,`${phase}-${view}-armory-closed.png`));
    report.views.push({view,bought,open,closed});
    if(view==='third')await page.evaluate('TT.closeMenuDbg("cif")');
  }
  report.errors=page.errors.slice();
  assert.deepEqual(report.errors,[]);
  for(const v of report.views){assert.equal(v.open.panelOpen,true);assert.equal(v.open.show,true);assert.equal(v.closed.panelOpen,false);assert.equal(v.closed.show,true);if(phase==='after'){assert.equal(v.open.visibility,'hidden');assert.equal(v.closed.visibility,'visible');}}
  console.log(`GP-20106 ${phase}: ${report.views.map(v=>v.view+' '+v.bought+' '+v.open.visibility+'→'+v.closed.visibility).join(', ')}; 0 page errors`);
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,`${phase}.json`),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}

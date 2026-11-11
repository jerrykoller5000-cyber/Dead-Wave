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
const report={at:new Date().toISOString(),windows:[],errors:[]};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20105 perf';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:20000}));
  await pause(3000);
  await page.evaluate('TT.resetPerf()');await pause(6000);
  report.windows.push({view:'third',perf:await page.evaluate('TT.perfSnapshot()')});
  await page.screenshot(path.join(out,'40-perf-third.png'));
  await page.evaluate('TT.setViewFirstDbg(true)');
  assert(await page.waitFor('TT.fpDbg().w>.99',{timeout:15000}));
  await page.evaluate('TT.resetPerf()');await pause(6000);
  report.windows.push({view:'first',perf:await page.evaluate('TT.perfSnapshot()')});
  await page.screenshot(path.join(out,'41-perf-first.png'));
  await page.evaluate(`(()=>{TT.trainingDbg.toggleLights();TT.resetPerf()})()`);await pause(6000);
  report.windows.push({view:'first-dark',perf:await page.evaluate('TT.perfSnapshot()')});
  await page.screenshot(path.join(out,'42-perf-first-dark.png'));
  await page.evaluate('TT.resetPerf()');await pause(6000);
  report.windows.push({view:'first-dark-late',perf:await page.evaluate('TT.perfSnapshot()')});
  await page.screenshot(path.join(out,'42b-perf-first-dark-late.png'));
  report.exit=await page.evaluate(`(()=>{TT.openMenuDbg('pause');const p=document.getElementById('pause');return {pause:p?.classList.contains('show'),training:TT.trainingDbg.state().active};})()`);
  await page.screenshot(path.join(out,'43-pause-exit.png'));
  await page.evaluate('document.getElementById("quitMenuBtn").click()');
  report.exit.after=await page.evaluate(`(()=>({training:TT.trainingDbg.state().active,frontend:document.body.classList.contains('frontend'),mode:document.getElementById('modeSelect')?.classList.contains('show'),quitConfirm:document.getElementById('pauseQuitView')?.classList.contains('on')}))()`);
  if(report.exit.after.quitConfirm){await page.evaluate('document.getElementById("quitConfirmBtn").click()');report.exit.after=await page.evaluate(`(()=>({training:TT.trainingDbg.state().active,frontend:document.body.classList.contains('frontend'),mode:document.getElementById('modeSelect')?.classList.contains('show')}))()`);}
  await page.screenshot(path.join(out,'44-title-after-exit.png'));
  report.errors=page.errors.slice();
  assert.equal(report.exit.after.training,false);
  assert.deepEqual(report.errors,[]);
  console.log(`GP-20105 perf+exit: ${report.windows.map(w=>w.view+'='+w.perf.fps.toFixed(1)+'fps/'+w.perf.worst.toFixed(0)+'ms/'+w.perf.hitches+' hitches').join(' ')}; title exit, 0 page errors`);
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'perf-exit.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}

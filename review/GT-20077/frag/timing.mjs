import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../../tools/serve.mjs';
import {launch} from '../../../tools/cdp.mjs';
import {save} from '../../GT-20076/save.mjs';

const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','unmarked'].includes(phase));
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1280,height:720}),start=Date.now();
  await page.goto(server.origin+'/index.html?debug=1',{waitUntil:'none'});
  assert(await page.waitFor('window.DWOpening'));await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const readyMs=Date.now()-start;assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("TT.applyGraphicsPreset('high');document.getElementById('playerName').value='Held prop';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate("TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();TT.setGrenadesDbg(3);TT.holdGrenadeAnim('raise',.105)");
  const active="TT.grenadeAnimDbg().inHand && TT.viewmodelDbg().info.active && TT.viewmodelDbg().root.getObjectByName('vm-grenade')?.children.some(o=>o.visible)";
  assert(await page.waitFor(active));
  const samples=[];
  for(let i=0;i<12;i++){
    await wait(1000);const s=await page.evaluate('({held:!!('+active+'),high:TT.getGfx(),...TT.perfSnapshot()})');
    assert(s.held && s.high==='high');samples.push(s);
  }
  const stable=samples.slice(2),mean=k=>Math.round(10*stable.reduce((a,s)=>a+s[k],0)/stable.length)/10;
  const result={readyMs,high:true,fps:mean('fps'),low:mean('low'),samples};
  await save(new URL('./'+phase+'/timing.json',import.meta.url),JSON.stringify(result,null,2));assert.deepEqual(page.errors,[]);
  console.log('PASS held at the eye all twelve samples:',readyMs,'ms ready,',result.fps,'fps,',result.low,'low');
}finally{await browser.close();await server.close()}

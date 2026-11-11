import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setTimeout as wait} from 'node:timers/promises';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1152,height:648});
  await page.goto(server.origin+'/index.html?debug=1');assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Rendering sample';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate("TT.grantAllWeapons();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();TT.setWeapon(TT.WEAPON_ORDER.indexOf('launcher'));TT.applyGraphicsPreset('high')");
  assert(await page.waitFor('TT.viewmodelDbg()?.info.key==="launcher" && TT.viewmodelDbg().info.raise>.98'));
  await page.evaluate("TT.setAmmoDbg('launcher',3);TT.getReserve()['40mm']=12;TT.startReload();TT.reloadClipDbg.hold(.34)");
  assert(await page.waitFor('TT.isReloading() && TT.viewmodelDbg()?.gun?.loadRound?.visible'));
  const cpuMs=await page.evaluate(`(async()=>{
    const T=TT.THREE,root=TT.viewmodelDbg().gun.root,source=TT.weaponMeshes.launcher;
    const {renderIndividualReference}=await import('/review/GT-20081/verify.mjs');
    const {updateArtworkInstances}=await import('/studio/weapon-model-hooks.js');
    const samples=[];
    for(let pass=0;pass<8;pass++){
      const start=performance.now();for(let i=0;i<400;i++){updateArtworkInstances(T,source);updateArtworkInstances(T,root)}
      samples.push((performance.now()-start)/400);
    }
    let mode=false;window.setRenderPath=individual=>{mode=individual};
    const refresh=()=>renderIndividualReference(T,root,mode);
    TT.inspectHost().attach({held:()=>false,scale:dt=>dt,frame:refresh});
    return samples;
  })()`);
  const runs=[];
  for(const mode of ['instances','individual','instances']){
    await page.evaluate('setRenderPath('+(mode==='individual')+')');await wait(2000);
    const samples=[];
    for(let i=0;i<10;i++){
      await wait(1000);
      const s=await page.evaluate("({active:TT.viewmodelDbg()?.gun?.loadRound?.visible,gfx:TT.getGfx(),...TT.perfSnapshot()})");
      assert(s.active&&s.gfx==='high');samples.push({fps:s.fps,low:s.low});
    }
    const mean=k=>samples.reduce((sum,x)=>sum+x[k],0)/samples.length;
    runs.push({mode,fps:mean('fps'),low:mean('low'),samples});
  }
  await save(new URL('./paired-perf.json',import.meta.url),JSON.stringify({cpuMs,runs},null,2));
  assert.deepEqual(page.errors,[]);console.log('PASS High on one unchanged reload',runs.map(r=>[r.mode,r.fps.toFixed(1),r.low.toFixed(1)]),'CPU milliseconds per held and eye update',cpuMs.map(v=>v.toFixed(3)));
}finally{await browser.close();await server.close()}

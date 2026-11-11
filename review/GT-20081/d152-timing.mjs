import assert from 'node:assert/strict';
import {setTimeout as wait} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const ids=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN && ids.length && ids.every(id=>/^[a-z0-9]+$/.test(id)));
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  const adapter=await page.evaluate(`(()=>{
    const gl=document.createElement('canvas').getContext('webgl2');
    const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    const name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  })()`);
  assert.match(adapter,/RTX 5080/i);
  await page.evaluate("TT.applyGraphicsPreset('high');document.getElementById('playerName').value='Draw budget';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate('TT.grantAllWeapons();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster()');
  const result={adapter,preset:'high',size:[1280,720],guns:{}};
  for(const id of ids){
    await page.evaluate('window.benchGun='+JSON.stringify(id));
    await page.evaluate(`(async()=>{
      const slot=TT.WEAPON_ORDER.indexOf(benchGun);
      if(slot<0)throw Error('Missing '+benchGun);
      for(let i=0;i<30&&TT.getCurrentWeapon()!==benchGun;i++){
        TT.setWeapon(slot);await new Promise(r=>setTimeout(r,120));
      }
    })()`);
    assert(await page.waitFor('TT.viewmodelDbg().info.key===benchGun && TT.viewmodelDbg().info.raise>.98 && TT.fpDbg().w>.98'));
    await wait(2000);
    const samples=await page.evaluate(`(async()=>{
      const times=[],start=performance.now();let last=null;
      const metrics=[];
      while(performance.now()-start<10000){
        const now=await new Promise(requestAnimationFrame);
        if(last!==null)times.push(now-last);
        last=now;
        if(!metrics.length||now-metrics.at(-1).at>=990){
          const info=TT.viewmodelDbg().info;
          if(info.key!==benchGun||!info.active||TT.getGfx()!=='high')throw Error('In-hand state changed');
          const s=TT.perfSnapshot();metrics.push({at:now,fps:s.fps,low:s.low});
        }
      }
      return {times,metrics};
    })()`,20000);
    assert(samples.times.length>0 && samples.metrics.length>0);
    const avg=a=>a.reduce((s,v)=>s+v,0)/a.length, sorted=samples.times.slice().sort((a,b)=>a-b);
    result.guns[id]={meanMs:avg(samples.times),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],
      frames:sorted.length,fps:avg(samples.metrics.map(s=>s.fps)),low:avg(samples.metrics.map(s=>s.low)),...samples};
    console.log('PASS',id,result.guns[id].meanMs.toFixed(2),'ms mean animation-frame interval,',
      result.guns[id].p95Ms.toFixed(2),'ms p95,',result.guns[id].fps.toFixed(1),'fps');
  }
  await save(new URL('./d152-time-'+ids.join('-')+'.json',import.meta.url),JSON.stringify(result,null,2));
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close()}

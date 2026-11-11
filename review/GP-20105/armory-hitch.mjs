import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Run through crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20105');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const report={at:new Date().toISOString(),runs:[],errors:[]};
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20105 hitch';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:20000}));
  await pause(2500);
  for(const [view,gun] of [['third','uzi'],['first','shotgun']]){
    await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;
      T.player.position.set(f.x,tg.floorY,f.z);T.setVelDbg(0,0);T.setViewFirstDbg(${view==='first'});})()`);
    await pause(1200);
    await page.evaluate('TT.doAction()');
    assert(await page.waitFor('!document.getElementById("armoryPanel").hidden',{timeout:5000}));
    await page.evaluate(`(()=>{TT.addCash(1000000);TT.resetPerf();const h=window.__armoryHitch={gaps:[],last:0,running:true};
      function tick(t){if(h.last)h.gaps.push(t-h.last);h.last=t;if(h.running)requestAnimationFrame(tick)}requestAnimationFrame(tick);})()`);
    const event=await page.evaluate(`(()=>{const b=document.querySelector('#armoryPanel [data-buy-gun="${gun}"]');
      if(!b||b.disabled)throw Error('purchase unavailable: ${gun}');const a=performance.now();b.click();const bought=performance.now();
      TT.armoryDbg.ui().close();return {buyMs:bought-a,closeMs:performance.now()-bought,gun:'${gun}',open:!document.getElementById('armoryPanel').hidden};})()`);
    await pause(4000);
    const sample=await page.evaluate(`(()=>{const h=window.__armoryHitch;h.running=false;const g=h.gaps.slice();
      return {maxGapMs:Math.max(0,...g),over50:g.filter(x=>x>50).length,over100:g.filter(x=>x>100).length,
        topGaps:g.sort((a,b)=>b-a).slice(0,8),frames:g.length,perf:TT.perfSnapshot(),banner:document.getElementById('bigBanner').classList.contains('show')};})()`);
    report.runs.push({view,event,sample});
    await page.screenshot(path.join(out,`armory-hitch-${view}-after-close.png`));
    if(view==='third')await page.evaluate('TT.closeMenuDbg("cif")');
  }
  report.errors=page.errors.slice();assert.deepEqual(report.errors,[]);
  console.log(`GP-20105 Armory normal RAF: ${report.runs.map(r=>r.view+' '+r.event.gun+' buy '+r.event.buyMs.toFixed(0)+'ms close '+r.event.closeMs.toFixed(0)+'ms maxgap '+r.sample.maxGapMs.toFixed(0)+'ms >50 '+r.sample.over50).join('; ')}; 0 page errors`);
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'armory-hitch.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}

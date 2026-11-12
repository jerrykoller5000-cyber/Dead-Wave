import path from 'node:path'; import { pathToFileURL } from 'node:url';
if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('slot');
const ROOT='C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT,'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT,'tools/cdp.mjs')).href);
const srv = await serve(ROOT, 0);
const origin = srv.origin;
const browser = await launch({ headless:false, args:['--window-position=-3800,-3800','--window-size=1280,720','--disable-features=CalculateNativeWinOcclusion'] });
try {
  const page = await browser.newPage({ width:1280, height:720 });
  await page.goto(`${origin}/index.html?debug=1`, { timeout:120000 });
  await page.waitFor('!!window.DWOpening',{timeout:30000});
  await page.evaluate(`(()=>{window.DWOpening?.dismissForTesting?.();})()`);
  await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready" && !window.DWOpening?.active',{timeout:120000});
  const out = await page.evaluate(`(async()=>{
    const T=TT, H=T.inspectHost?T.inspectHost():null, res={};
    const dump=(label,scene)=>{const a=[];scene.traverse(o=>{if(o.isSpotLight)a.push({d:o.distance,p:o.penumbra,ang:+o.angle.toFixed(3),int:o.intensity,uuid:o.uuid.slice(0,6),chain:(()=>{let c=[],n=o;while(n&&c.length<5){c.push(n.name||n.type);n=n.parent;}return c.join('<')})()});});res[label]=a;};
    const R=T.renderer, ev=[]; const t00=performance.now(); const mk=(n,extra)=>ev.push({n,at:+(performance.now()-t00).toFixed(0),...extra});
    const wrap=(obj,k,label)=>{const o=obj[k]; if(typeof o!=='function')return; obj[k]=function(...a){const s=performance.now(); mk(label+' start'); const r=o.apply(this,a); if(r&&r.then){return r.then(v=>{mk(label+' end',{ms:+(performance.now()-s).toFixed(0)});return v;});} mk(label+' end',{ms:+(performance.now()-s).toFixed(0)}); return r;};};
    wrap(R,'compileAsync','compileAsync'); wrap(R,'compile','compile');
    const longs=[]; try{ new PerformanceObserver(l=>{for(const e of l.getEntries()) if(e.startTime>=t00) longs.push([+(e.startTime-t00).toFixed(0),+e.duration.toFixed(0)]);}).observe({entryTypes:['longtask']}); }catch(_){}
    let sawBlack=false; const blk=document.getElementById('trainingBlackout');
    document.getElementById('playerName').value='AG309';
    mk('click enterTraining');
    H.enterTraining();
    const tEnter=performance.now();
    let sawActive=false;
    while(performance.now()-tEnter<60000){
      const on=!!document.getElementById('trainingBlackout')?.classList.contains('on');
      if(!sawActive && T.trainingDbg.state().active && T.trainingDbg.tg()){sawActive=true;mk('training active (world built)');}
      if(on && !sawBlack){sawBlack=true;mk('blackout on');}
      if(sawBlack && !on){mk('blackout lifted');break;}
      await new Promise(r=>setTimeout(r,50));
    }
    res.totalMs=+(performance.now()-tEnter).toFixed(0); res.events=ev; res.longTasks=longs.filter(x=>x[1]>=200).slice(0,25); res.longTaskTotal=longs.reduce((s,x)=>s+x[1],0);    return JSON.stringify(res);
  })()`);
  console.log('PROBE', out);
} finally { await browser.close().catch(()=>{}); try{srv.close?.();}catch(_){} }
process.exit(0);




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
    const R=T.renderer; let phase='boot'; const stats={}; const slow=[];
    const oR=R.render; let mainMs=[];
    R.render=function(s,c){const t=performance.now();const r=oR.call(this,s,c);const d=performance.now()-t; if(this===R){mainMs.push(d); if(d>50)slow.push({phase,at:+t.toFixed(0),renderMs:+d.toFixed(0)});} return r;};
    let last=performance.now(), gaps=[]; (function mon(now){gaps.push(now-last);last=now;requestAnimationFrame(mon);})(performance.now());
    const lt=[]; try{new PerformanceObserver(l=>{for(const e of l.getEntries()) if(e.duration>=80) lt.push({phase,dur:Math.round(e.duration)});}).observe({entryTypes:['longtask']});}catch(_){}
    const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
    const end=(name)=>{ const g=gaps.slice().sort((a,b)=>a-b), m=mainMs.slice().sort((a,b)=>a-b); const q=(a,p)=>a.length?+a[Math.min(a.length-1,Math.floor(a.length*p))].toFixed(1):null; stats[name]={frames:g.length,gapMed:q(g,.5),gapP95:q(g,.95),gapMax:q(g,1),over50:g.filter(x=>x>50).length,renderMed:q(m,.5),renderMax:q(m,1)}; gaps=[]; mainMs=[]; };
    document.getElementById('playerName').value='AG313'; phase='entry'; H.enterTraining();
    const t0=performance.now(); let sawB=false;
    while(performance.now()-t0<60000){ const on=!!document.getElementById('trainingBlackout')?.classList.contains('on'); if(on)sawB=true; if(sawB&&!on)break; await sleep(50); }
    end('entry (3P)'); res.entryMs=Math.round(performance.now()-t0);
    phase='idle 3P'; await sleep(5000); end('idle 3P (5 s)');
    T.grantAllWeapons();
    phase='weapon cycle 3P'; for(const w of T.WEAPON_ORDER){ T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await sleep(400);} end('weapon cycle 3P');
    T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
    phase='knife 3P'; try{T.knifeAttack();}catch(e){res.knifeErr=String(e)} await sleep(1500); end('knife stab 3P');
    phase='armory 3P'; T.openMenuDbg('armory'); await sleep(2500); T.closeCIF(); await sleep(800); end('armory open+close 3P');
    phase='to 1P'; T.setViewFirstDbg(true); await sleep(1500); end('switch to 1P');
    phase='idle 1P'; await sleep(5000); end('idle 1P (5 s)');
    phase='weapon cycle 1P'; for(const w of T.WEAPON_ORDER){ T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await sleep(400);} end('weapon cycle 1P');
    phase='armory 1P'; T.openMenuDbg('armory'); await sleep(2500); T.closeCIF(); await sleep(800); end('armory open+close 1P');
    res.stats=stats; res.slow=slow.slice(0,40); res.longTasks=lt.slice(0,30); res.gpuLine=(document.querySelector('#perf, .perf, #perfOverlay')||{}).textContent||null;    return JSON.stringify(res);
  })()`);
  console.log('PROBE', out);
} finally { await browser.close().catch(()=>{}); try{srv.close?.();}catch(_){} }
process.exit(0);




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
    const R=T.renderer, slow=[]; let t00=performance.now(); const oR=R.render; 
    R.render=function(s,c){const t=performance.now();const r=oR.call(this,s,c);const d=performance.now()-t;if(d>20)slow.push([+(t-t00).toFixed(0),+d.toFixed(0)]);return r;};
    const dbg=()=>{try{const m=T.marineShadowDbg(); return {builds:m.builds??m.marineShadowBuilds,warm:m.warm,ms:m.ms,diff:m.diff,keys:Object.keys(m).slice(0,12)};}catch(e){return String(e);}};
    res.dbg0=dbg();
    document.getElementById('playerName').value='AG309';
    H.enterTraining();
    const tE=performance.now(); let lifted=0,sawBlack=false;
    while(performance.now()-tE<60000){ const on=!!document.getElementById('trainingBlackout')?.classList.contains('on'); if(on)sawBlack=true; if(sawBlack&&!on){lifted=performance.now()-t00;break;} await new Promise(r=>setTimeout(r,20)); }
    res.liftAt=+lifted.toFixed(0); res.dbgAtLift=dbg();
    await new Promise(r=>setTimeout(r,5000));
    res.dbgAfter=dbg(); res.slowRenders=slow.filter(x=>x[0]>=lifted-300).map(x=>[x[0]-Math.round(lifted),x[1]]);    return JSON.stringify(res);
  })()`);
  console.log('PROBE', out);
} finally { await browser.close().catch(()=>{}); try{srv.close?.();}catch(_){} }
process.exit(0);




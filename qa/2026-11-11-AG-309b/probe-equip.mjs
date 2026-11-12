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
    const mod = await import('/core/audio.js'); const A = mod.AudioSys || mod.default;
    const calls=[]; res.hasAudio=!!A;
    if(A) for(const k of Object.keys(A)){ if(typeof A[k]!=='function') continue; if(!/chainsaw|reload|weaponSwitch|equip|cylinder|launcher|revolver|drum|spin|swap/i.test(k)) continue; const o=A[k]; A[k]=function(...a){const t=performance.now();const r=o.apply(this,a);const d=performance.now()-t;if(d>2)calls.push([k,+d.toFixed(1)]);return r;}; }
    document.getElementById('playerName').value='AG309';
    H.enterTraining();
    const t0=performance.now();
    while(performance.now()-t0<25000){ if(T.trainingDbg.state().active&&T.trainingDbg.tg())break; await new Promise(r=>setTimeout(r,100)); }
    const t1=performance.now();
    while(performance.now()-t1<20000 && document.getElementById('trainingBlackout')?.classList.contains('on')) await new Promise(r=>setTimeout(r,100));
    await new Promise(r=>setTimeout(r,2000));
    T.grantAllWeapons(); T.setViewFirstDbg(true);
    await new Promise(r=>setTimeout(r,1500));
    res.kinds={};
    for(const kind of ['revolver','launcher','chainsaw']){
      calls.length=0;
      const frames=[]; let last=performance.now(); let on=true;
      const mon=(now)=>{ if(!on)return; frames.push(+(now-last).toFixed(1)); last=now; requestAnimationFrame(mon); }; requestAnimationFrame(mon);
      const ts=performance.now(); T.setWeapon(T.WEAPON_ORDER.indexOf(kind)); const sw=+(performance.now()-ts).toFixed(1);
      await new Promise(r=>setTimeout(r,900)); on=false;
      res.kinds[kind]={setWeaponSyncMs:sw,maxFrame:Math.max(...frames),over30:frames.filter(f=>f>30),audioCalls:calls.slice(0,8)};
    }    return JSON.stringify(res);
  })()`);
  console.log('PROBE', out);
} finally { await browser.close().catch(()=>{}); try{srv.close?.();}catch(_){} }
process.exit(0);




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
    const pen=(l)=>{let f=null;H.scene.traverse(o=>{if(o.isSpotLight&&o.distance===26)f=o;});return f?+f.penumbra:null;};
    res.stages=[]; const st=(n)=>res.stages.push([n,pen()]);
    st('boot');
    document.getElementById('playerName').value='AG309';
    H.enterTraining();
    const t0=performance.now();
    while(performance.now()-t0<25000){ if(T.trainingDbg.state().active&&T.trainingDbg.tg())break; await new Promise(r=>setTimeout(r,100)); }
    st('training active');
    const t1=performance.now();
    while(performance.now()-t1<15000 && document.getElementById('trainingBlackout')?.classList.contains('on')) await new Promise(r=>setTimeout(r,100));
    st('blackout off');
    await new Promise(r=>setTimeout(r,6000)); st('+6s');
    T.grantAllWeapons(); st('grantAll');
    T.setWeapon(T.WEAPON_ORDER.indexOf('pistol')); if (T.isUnarmed()) T.toggleHolster(); st('pistol');
    T.setViewFirstDbg(true); st('first person');
    T.trainingDbg.state().lightsOff=true; T.trainingDbg.tg().setLights(false); st('lights off');
    for(let k=0;k<14;k++) T.stepFrame(0.05); st('stepped');
    if(!(T.toggleFlashlightDbg())) T.toggleFlashlightDbg(); st('flash on');
    for(let k=0;k<10;k++) T.stepFrame(0.05); st('stepped2');    return JSON.stringify(res);
  })()`);
  console.log('PROBE', out);
} finally { await browser.close().catch(()=>{}); try{srv.close?.();}catch(_){} }
process.exit(0);



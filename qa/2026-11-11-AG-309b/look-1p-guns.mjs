import path from 'node:path'; import { pathToFileURL } from 'node:url';
if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('slot');
const ROOT='C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT,'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT,'tools/cdp.mjs')).href);
const srv = await serve(ROOT, 0);
const origin = srv.origin;

let browser=null; for(let w=0;w<30&&!browser;w++){ try{ browser = await launch({ headless:false, args:['--window-position=-3800,-3800','--window-size=1280,720','--disable-features=CalculateNativeWinOcclusion'] }); }catch(e){ if(!/one game instance already exists/.test(String(e))) throw e; await new Promise(r=>setTimeout(r,2000)); } }
try {
  const page = await browser.newPage({ width:1280, height:720 });
  await page.setViewport(1280,720);
  await page.goto(`${origin}/index.html?debug=1`, { timeout:120000 });
  await page.waitFor('!!window.DWOpening',{timeout:30000});
  await page.evaluate(`(()=>{window.DWOpening?.dismissForTesting?.();})()`);
  await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready" && !window.DWOpening?.active',{timeout:120000});
  await page.evaluate(`(async()=>{const T=TT,H=T.inspectHost(); document.getElementById('playerName').value='AG1P'; T.setViewFirstDbg(true); H.enterTraining(); const t0=performance.now(); let sawB=false; while(performance.now()-t0<60000){const on=!!document.getElementById('trainingBlackout')?.classList.contains('on'); if(on)sawB=true; if(sawB&&!on)break; await new Promise(r=>setTimeout(r,50));} await new Promise(r=>setTimeout(r,2000)); T.grantAllWeapons(); if(T.isUnarmed&&T.isUnarmed()) T.toggleHolster(); await new Promise(r=>setTimeout(r,500)); })()`);
  const out=[];
  for(const w of ['ak','uzi','pistol']){
    await page.evaluate(`(async()=>{const T=TT; T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,1500));})()`);
    const f=`C:/Users/Zero/Desktop/Tiny Trek/review/AG-1P-guns/1p3-${w}.png`;
    await page.screenshot(f); out.push(f);
    const info=await page.evaluate('(()=>{const T=TT;const v=T.viewmodelDbg&&T.viewmodelDbg();const g=v&&v.gun;const fp=T.fpDbg&&T.fpDbg();return JSON.stringify({unarmed:T.isUnarmed&&T.isUnarmed(),first:fp&&fp.first,vm:!!v,active:!!(v&&v.info&&v.info.active),gunVisible:g&&g.visible,parentVisible:g&&g.parent&&g.parent.visible,kids:g&&g.children&&g.children.length,headHidden:fp&&fp.headHidden,armHidden:fp&&fp.armHidden});})()');
    console.log('INFO',w,info);
  }
  const errs=await page.evaluate(`JSON.stringify(window.__errs||[])`).catch(()=>'[]');
  console.log('PROBE', JSON.stringify({shots:out,pageErrors:[...page.errors].slice(0,5)}));
} finally { await browser.close().catch(()=>{}); try{srv.close?.();}catch(_){} }
process.exit(0);


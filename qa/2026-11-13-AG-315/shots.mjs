import path from 'node:path'; import { pathToFileURL } from 'node:url';
if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('slot');
const ROOT='C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT,'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT,'tools/cdp.mjs')).href);
const srv = await serve(ROOT, 0);
const origin = srv.origin;

let browser=null; for(let w=0;w<30&&!browser;w++){ try{ browser = await launch({ headless:false, args:['--window-position=-3800,-3800','--window-size=1280,720','--disable-features=CalculateNativeWinOcclusion'] }); }catch(e){ if(!/one game instance already exists/.test(String(e))) throw e; await new Promise(r=>setTimeout(r,2000)); } }
const R='C:/Users/Zero/Desktop/Tiny Trek/review/';
const log={};
try {
  const page = await browser.newPage({ width:1280, height:720 });
  await page.setViewport(1280,720);
  await page.goto(`${origin}/index.html?debug=1`, { timeout:120000 });
  await page.waitFor('!!window.DWOpening',{timeout:30000});
  await page.evaluate(`(()=>{window.DWOpening?.dismissForTesting?.();})()`);
  await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready" && !window.DWOpening?.active',{timeout:120000});
  await page.evaluate(`(async()=>{const T=TT,H=T.inspectHost(); document.getElementById('playerName').value='AG315'; H.enterTraining(); const t0=performance.now(); let sawB=false; while(performance.now()-t0<60000){const on=!!document.getElementById('trainingBlackout')?.classList.contains('on'); if(on)sawB=true; if(sawB&&!on)break; await new Promise(r=>setTimeout(r,50));} await new Promise(r=>setTimeout(r,2500)); T.grantAllWeapons(); if(T.isUnarmed&&T.isUnarmed()) T.toggleHolster(); })()`);
  const ev=(s)=>page.evaluate(s);
  log.hooks=await ev(`JSON.stringify({player:!!TT.player,rotate:typeof TT.rotateCamera,toggle:typeof (TT.trainingDbg&&TT.trainingDbg.toggleLights),aim:typeof TT.setAimYawDbg,fire:typeof TT.setMouseFireDbg,origin:TT.trainingDbg.tg().origin,lights:TT.trainingDbg.tg().lightsOn&&TT.trainingDbg.tg().lightsOn()})`);
  const spots=[['A',0,-10.8,0],['B',-42.5,8,Math.PI],['C',-9.5,15,-Math.PI/2],['D',0,2,0]];
  let lastRot=0;
  for(const [n,x,z,rot] of spots){
    await ev(`(()=>{const T=TT,O=T.trainingDbg.tg().origin; const P=T.player||T.getPlayer&&T.getPlayer(); P.position.set(O.x+${x},O.y,O.z+${z}); if(${rot}!==0) T.rotateCamera(${rot}); })()`);
    await new Promise(r=>setTimeout(r,2500));
    for(const lights of ['on','off']){
      const want=lights==='on';
      await ev(`(()=>{const T=TT; const on=!T.trainingDbg.state().lightsOff; if(on!==${want}) T.trainingDbg.toggleLights();})()`);
      await new Promise(r=>setTimeout(r,1500));
      await page.screenshot(R+`CB-327/spot${n}-lights-${lights}.png`);
    }
    await ev(`(()=>{const T=TT; if(T.trainingDbg.state().lightsOff) T.trainingDbg.toggleLights();})()`);
    if(rot!==0) await ev(`TT.rotateCamera(${-rot})`);
    await new Promise(r=>setTimeout(r,800));
  }
  // CB-328: chainsaw on the dummy
  await ev(`(()=>{const T=TT,O=T.trainingDbg.tg().origin; const P=T.player; P.position.set(O.x-5.95,O.y,O.z-2.1); T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw')); if(T.isUnarmed&&T.isUnarmed()) T.toggleHolster(); T.setAimYawDbg(-Math.PI/2);})()`);
  await new Promise(r=>setTimeout(r,2000));
  for(const lights of ['on','off']){
    const want=lights==='on';
    await ev(`(()=>{const T=TT; const on=!T.trainingDbg.state().lightsOff; if(on!==${want}) T.trainingDbg.toggleLights();})()`);
    await new Promise(r=>setTimeout(r,1200));
    await ev(`TT.setMouseFireDbg(true)`);
    await new Promise(r=>setTimeout(r,1800));
    await page.screenshot(R+`CB-328/saw-front-lights-${lights}.png`);
    await ev(`TT.setMouseFireDbg(false)`);
    await new Promise(r=>setTimeout(r,600));
  }
  log.aim=await ev(`JSON.stringify({pos:TT.player.position,cur:TT.getCurrentWeapon&&TT.getCurrentWeapon()})`);
  console.log('PROBE', JSON.stringify({log,pageErrors:[...page.errors].slice(0,5)}));
} finally { await browser.close().catch(()=>{}); try{srv.close?.();}catch(_){} }
process.exit(0);

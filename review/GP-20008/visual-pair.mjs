// Same gameplay camera before/after default quarter walls, sequential loads.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('run through the shared game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const server=await serve(root,0);
try {
  // The off-mode shot was saved by the first queued run; its in-game reload
  // timed out, so finish the matched on-mode shot in a fresh browser.
  for(const mode of ['after']) {
    const browser=await launch({headless:true});
    try {
    const page=await browser.newPage({width:1280,height:720});
    const extra=mode==='before'?'&quarterwalls=0':'';
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl${extra}`,{waitUntil:'none'});
    await page.waitFor('!!window.DWOpening',{timeout:60000});
    for(let i=0;i<2;i++){await page.evaluate('DWOpening.dismissForTesting()');await page.evaluate('new Promise(r=>setTimeout(r,250))');}
    if(!await page.waitFor('!!window.TT',{timeout:300000})) throw new Error(`TT timeout in ${mode}`);
    await page.waitFor('window.DWOpening.active === false',{timeout:120000});
    await page.evaluate(`(() => {
      const name=document.getElementById('playerName'); if(name)name.value='QuarterPair';
      document.getElementById('modeHunt')?.click();
    })()`);
    if(!await page.waitFor('TT.getPhase() === "prep"',{timeout:30000})) throw new Error(`prep timeout ${mode}`);
    if(!await page.waitFor('!document.body.classList.contains("deploying")',{timeout:180000})) throw new Error(`insertion timeout ${mode}`);
    await page.evaluate(`(() => {
      const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
      const keep=new Set();for(let e=c;e&&e!==document.body;e=e.parentElement)keep.add(e);
      for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
      TT.setWorldTime(.42);
      TT.setShotView({x:-53,y:TT.sampleHeight(-53,115)+46,z:91,
        tx:-50,ty:TT.sampleHeight(-50,115),tz:115,fov:54});
    })()`);
    await page.evaluate('new Promise(r=>setTimeout(r,1000))');
    await page.screenshot(path.join(root,`review/GP-20008/quarter-game-${mode}.png`));
    console.log(`${mode}: ${JSON.stringify(await page.evaluate('({on:TT.wallBandsDbg.quartersOn,draws:TT.wallBandsDbg.draws()})'))}`);
    if(page.errors.length) throw new Error(`Page errors ${mode}: ${page.errors.slice(0,3)}`);
    } finally { await browser.close(); }
  }
} finally {await server.close();}

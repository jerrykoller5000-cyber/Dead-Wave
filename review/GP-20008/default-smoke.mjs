// Sequential off/default title loads: one page, one game at a time.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('run through the shared game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const server=await serve(root,0), browser=await launch({headless:true});
const page=await browser.newPage({width:960,height:540}), rows=[];
try {
  for(const mode of ['off','default','default','off']) {
    const url=`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl${mode==='off'?'&quarterwalls=0':''}`;
    const start=Date.now();
    await page.goto(url,{waitUntil:'none'});
    await page.waitFor('!!window.DWOpening',{timeout:60000});
    for(let i=0;i<2;i++) { await page.evaluate('DWOpening.dismissForTesting()'); await page.evaluate('new Promise(r=>setTimeout(r,250))'); }
    if(!await page.waitFor('!!window.TT',{timeout:300000})) throw new Error(`TT timeout in ${mode}`);
    const readyMs=Date.now()-start;
    const facts=await page.evaluate(`(() => ({on:TT.wallBandsDbg.quartersOn,
      count:TT.wallBandsDbg.bands().filter(b=>b.kind.startsWith('quarter-')).length,
      draws:TT.wallBandsDbg.draws()}))()`);
    const row={mode,readyMs,...facts};rows.push(row);console.log(JSON.stringify(row));
    if((mode==='default') !== facts.on || facts.count !== (mode==='default'?4:0))
      throw new Error(`quarterwalls default/override incorrect in ${mode}`);
  }
  const median=a=>{a.sort((x,y)=>x-y);return(a[0]+a[1])/2;};
  const result={rows,medianMs:Object.fromEntries(['off','default'].map(mode=>[mode,
    median(rows.filter(r=>r.mode===mode).map(r=>r.readyMs))]))};
  fs.writeFileSync(path.join(root,'review/GP-20008/default-smoke.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result.medianMs));
  const capture=async(name)=>{
    await page.waitFor('window.DWOpening.active === false',{timeout:120000});
    await page.evaluate(`(() => {
      const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
      const keep=new Set();for(let e=c;e&&e!==document.body;e=e.parentElement)keep.add(e);
      for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
      TT.setWorldTime(.42);
      const gx=-50,gz=115,gy=TT.sampleHeight(gx,gz);
      TT.setShotView({x:-43,y:TT.sampleHeight(-43,105)+4,z:105,tx:gx,ty:gy+2,tz:gz,fov:55});
    })()`);
    await page.evaluate('new Promise(r=>setTimeout(r,700))');
    await page.screenshot(path.join(root,`review/GP-20008/${name}.png`));
  };
  await capture('quarter-before');
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`,{waitUntil:'none'});
  await page.waitFor('!!window.DWOpening',{timeout:60000});
  for(let i=0;i<2;i++) { await page.evaluate('DWOpening.dismissForTesting()'); await page.evaluate('new Promise(r=>setTimeout(r,250))'); }
  if(!await page.waitFor('!!window.TT',{timeout:300000})) throw new Error('TT timeout in final screenshot');
  await capture('quarter-after');
  if(page.errors.length) throw new Error(`Page errors: ${page.errors.slice(0,3)}`);
} finally {await browser.close();await server.close();}

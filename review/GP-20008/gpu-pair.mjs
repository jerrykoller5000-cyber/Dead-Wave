// Matched WebGPU before/after screenshots on Jerry's GPU, sequential instances.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw new Error('run through the shared game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20008');
const lib=fs.readFileSync(path.join(root,'tools/tests/lib.js'),'utf8');
const server=await serve(root,0);
try{
  for(const mode of ['before','after']){
    const browser=await launch({headless:false,args:['--window-size=1280,720']});
    try{
      const page=await browser.newPage({width:1280,height:720});
      const extra=mode==='before'?'&quarterwalls=0':'';
      await page.goto(`${server.origin}/index.html?debug=1&raf=timer${extra}`,{timeout:300000});
      if(!await page.waitFor('!!window.TT',{timeout:600000}))throw new Error(`TT timeout ${mode}: ${page.errors.slice(0,3)}`);
      await page.evaluate('DWOpening?.dismissForTesting?.()');
      await page.waitFor('!window.DWOpening||DWOpening.active===false',{timeout:60000});
      await page.evaluate(lib);
      await page.evaluate(`(async()=>{
        await startMatch(TT,'QuarterGPU');
        TT.clearZombies();TT.setHp(1e5);TT.runDevCommand('godmode');
        if(TT.skipGrace)TT.skipGrace();
        TT.setWorldTime(.42);
        if(TT.weather){TT.weather.raining=false;TT.weather.intensity=0;}
        TT.setShotView({x:-70.1,y:160,z:110.1,tx:-70,ty:0,tz:110,fov:55});
        for(let i=0;i<20;i++)TT.stepFrame(.04);
      })()`);
      await new Promise(r=>setTimeout(r,500));
      const facts=await page.evaluate('({on:TT.wallBandsDbg.quartersOn,count:TT.wallBandsDbg.bands().filter(b=>b.kind.startsWith("quarter-")).length,backend:TT.getRendererBackend()})');
      await page.screenshot(path.join(out,`quarter-ne-rtx-${mode}.png`));
      console.log(JSON.stringify({mode,...facts}));
      if(facts.backend!=='WebGPU'||facts.on!==(mode==='after')||facts.count!==(mode==='after'?4:0))throw new Error(`GPU state incorrect ${mode}`);
      if(page.errors.length)throw new Error(`Page errors ${mode}: ${page.errors.slice(0,3)}`);
    }finally{await browser.close();}
  }
}finally{await server.close();}

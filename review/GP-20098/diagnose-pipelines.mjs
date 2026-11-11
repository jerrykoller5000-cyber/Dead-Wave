import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0), browser = await launch({headless:false,args:['--window-size=1280,720']});
let page;
try {
  page = await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000})) throw Error('boot timed out');
  await page.evaluate(`(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='GP-20098 pipeline diagnosis';document.getElementById('modeTraining').click()})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000})) throw Error('Training timed out');
  const result = await page.evaluate(`(async()=>{
    const T=TT,R=T.renderer,tg=T.trainingDbg.tg(),O=tg.origin;
    T.setWorldTime(.46);T.setShotView(null);T.setViewFirstDbg(false);T.setZoomHeldDbg(false);
    const events=[],pipes=R._pipelines,orig=pipes._getRenderPipeline;
    pipes._getRenderPipeline=function(ro,vs,fs,key,promises){
      const o=ro.object,m=ro.material;
      events.push({x:+(T.player.position.x-O.x).toFixed(2),z:+(T.player.position.z-O.z).toFixed(2),name:o?.name||'',parent:o?.parent?.name||'',material:m?.name||'',materialId:m?.id,transparent:m?.transparent,castShadow:o?.castShadow,scene:ro.scene?.name||'',key:String(key).slice(0,140)});
      return orig.call(this,ro,vs,fs,key,promises);
    };
    try{
      const pts=[
        {x:-5.2,z:-8,lx:-12,ly:1.5,lz:-8},
        {x:-11.5,z:-8,lx:-18,ly:1.5,lz:-8.5},
        {x:-18,z:-9.2,lx:-24,ly:1.2,lz:-10.5},
        {x:-24,z:-7.5,lx:-29,ly:1.5,lz:-6.5}
      ];
      for(let i=0;i<pts.length-1;i++)for(let s=0;s<=20;s++){
        const a=pts[i],b=pts[i+1],u=s/20;
        const x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;
        const lx=a.lx+(b.lx-a.lx)*u,ly=a.ly+(b.ly-a.ly)*u,lz=a.lz+(b.lz-a.lz)*u;
        const yaw=Math.atan2(lx-x,lz-z),pitch=Math.atan2(ly-1.55,Math.hypot(lx-x,lz-z));
        T.player.position.set(O.x+x,tg.floorY,O.z+z);
        T.setAimYawDbg(yaw);T.setOtsAimDbg(yaw,pitch);
        T.flightInput({keys:['w']});
        await new Promise(r=>setTimeout(r,70));
      }
      T.flightInput({keys:[]});
    }finally{pipes._getRenderPipeline=orig;}
    return {events,cutaway:tg.cutaway.state()};
  })()`);
  const dest=path.join(root,'review/GP-20098/pipeline-events-r2.json');
  fs.writeFileSync(dest,JSON.stringify(result,null,2));
  console.log(`Pipeline creations: ${result.events.length}`);
  for(const e of result.events)console.log(`${e.x},${e.z} ${e.parent}/${e.name} mat=${e.materialId} transparent=${e.transparent} shadow=${e.castShadow}`);
}finally{if(page)await page.close();await browser.close();await server.close();}

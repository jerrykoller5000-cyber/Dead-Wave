import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Run through crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20107');fs.mkdirSync(out,{recursive:true});
const phase=process.argv[2]||'before';
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const report={phase,at:new Date().toISOString(),lights:[],errors:[]};
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20107';document.getElementById('modeHunt').click()})()`);
  assert(await page.waitFor('document.body.classList.contains("playing")',{timeout:30000}));
  assert(await page.waitFor('!TT.insertionDbg.rig()',{timeout:30000}));
  report.house=await page.evaluate(`(()=>{const T=TT,h=T.house,g=h.group,B=new T.THREE.Box3().setFromObject(g),c=B.getCenter(new T.THREE.Vector3()),s=B.getSize(new T.THREE.Vector3());
    let meshes=0,visible=0;g.traverse(o=>{if(o.isMesh){meshes++;if(o.visible)visible++;}});
    T.setShotView({x:c.x+s.x*.88,y:c.y+s.y*.58,z:c.z+s.z*1.22,tx:c.x,ty:c.y, tz:c.z,fov:54});
    return {baked:h.baked,folded:h.folded,meshes,visible,hushBoardVisible:h.hushWiredBoard?.visible,
      box:{center:c.toArray(),size:s.toArray()},camera:T.camera.position.toArray()};})()`);
  for(const [name,time] of [['noon',.5],['overcast',.43],['dusk',.74],['night',.02]]){
    const state=await page.evaluate(`((time)=>{TT.setWorldTime(time);return {worldTime:time,houseVisible:TT.house.group.visible};})(${time})`);
    await pause(1800);
    state.perf=await page.evaluate('TT.perfSnapshot()');
    state.draws=await page.evaluate('TT.renderer.info.render.drawCalls ?? TT.renderer.info.render.calls ?? 0');
    state.camera=await page.evaluate('TT.camera.position.toArray()');
    report.lights.push({name,...state});
    await page.screenshot(path.join(out,`${phase}-${name}.png`));
  }
  report.bakeWarnings=page.console.filter(x=>x.text.includes('HQ bake skipped'));
  report.errors=page.errors.slice();
  assert.deepEqual(report.errors,[]);
  assert(report.house.baked?.merged>0,'HQ static bake did not merge geometry');
  if(phase==='after')assert.equal(report.bakeWarnings.length,0,'HQ bake warning remains');
  console.log(`GP-20107 ${phase}: baked ${report.house.baked.merged} groups/${report.house.baked.removed} meshes, folded ${report.house.folded?.folded??0}/${report.house.folded?.removed??0}, visible ${report.house.visible}/${report.house.meshes}, HQ warnings ${report.bakeWarnings.length}, draws ${report.lights.map(x=>x.name+':'+x.draws).join(' ')}, 0 page errors`);
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,`${phase}.json`),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}

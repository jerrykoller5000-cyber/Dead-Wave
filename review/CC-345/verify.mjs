// CC-345: the steady comparison must still rebake a source whose visible state changes.
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew slot');
const root=path.resolve(import.meta.dirname,'../..');
const result={at:new Date().toISOString(),errors:[]};
const server=await serve(root,0);
const browser=await launch({headless:false,args:['--window-size=1280,720']});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1',{timeout:400000});
  if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:120000}))throw Error('Load not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:500000});
  await page.evaluate('(()=>{document.getElementById("playerName").value="CC-345 verify";document.getElementById("modeTraining").click()})()');
  if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:400000}))throw Error('Training entry not ready');
  result.before=await page.evaluate(`(()=>{
    const rigs=[];TT.scene.traverse(o=>{if(o.userData?.rigSkin)rigs.push(o.userData.rigSkin)});
    const rig=rigs.find(r=>r.sources.some(s=>s.baked&&s.o.visible&&!s.bend));
    if(!rig)throw Error('No active baked source');
    const src=rig.sources.find(s=>s.baked&&s.o.visible&&!s.bend);
    window.__cc345={rig,src};
    return {rigs:rigs.length,sources:rig.sources.length,skins:rig.skins.length,bakes:rig.bakes,source:src.o.name||src.o.type};
  })()`);
  await page.evaluate('__cc345.src.o.visible=false');
  await pause(250);
  result.hidden=await page.evaluate('({bakes:__cc345.rig.bakes,visible:__cc345.src.o.visible,baked:__cc345.src.baked})');
  await page.evaluate('__cc345.src.o.visible=true');
  await pause(250);
  result.restored=await page.evaluate('({bakes:__cc345.rig.bakes,visible:__cc345.src.o.visible,baked:__cc345.src.baked})');
  result.colorBefore=await page.evaluate(`(()=>{
    const s=__cc345.rig.sources.find(s=>s.baked&&s.o.material?.color&&!s.bend);
    if(!s)throw Error('No baked colored source');
    __cc345.colorSource=s;__cc345.originalRed=s.o.material.color.r;
    return {bakes:__cc345.rig.bakes,red:__cc345.originalRed,source:s.o.name||s.o.type};
  })()`);
  await page.evaluate('__cc345.colorSource.o.material.color.r=__cc345.originalRed+0.07');
  await pause(250);
  result.colorChanged=await page.evaluate('({bakes:__cc345.rig.bakes,red:__cc345.colorSource.o.material.color.r})');
  await page.evaluate('__cc345.colorSource.o.material.color.r=__cc345.originalRed');
  await pause(250);
  result.colorRestored=await page.evaluate('({bakes:__cc345.rig.bakes,red:__cc345.colorSource.o.material.color.r})');
  result.errors=page.errors.slice();
  result.pass=result.hidden.bakes>result.before.bakes&&result.restored.bakes>result.hidden.bakes&&result.restored.visible&&
    result.colorChanged.bakes>result.colorBefore.bakes&&result.colorRestored.bakes>result.colorChanged.bakes&&result.errors.length===0;
  console.log(JSON.stringify(result));
  if(!result.pass)process.exitCode=1;
}catch(e){result.failure=String(e?.stack||e);console.error(result.failure);process.exitCode=1}
finally{fs.writeFileSync(path.join(root,'review/CC-345/verify.json'),JSON.stringify(result,null,2)+'\n','utf8');await browser.close();await server.close()}

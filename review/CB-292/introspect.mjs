import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/CB-292');fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
let report={};
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-292 sweep';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:90000}));
  report=await page.evaluate(`(()=>{
    const T=TT,t=T.trainingDbg.state(),tg=t.tg,m=T.getMarine();
    const box=b=>({min:[b.minX,b.minY,b.minZ],max:[b.maxX,b.maxY,b.maxZ],flags:Object.keys(b).filter(k=>b[k]===true)});
    const parts=[];m.traverse(o=>{if(o.name&&/arm|hand|leg|foot|boot|knee|elbow|wrist|shoulder|hip/i.test(o.name))parts.push({name:o.name,type:o.type,meshes:o.children.filter(c=>c.isMesh).length})});
    return {origin:tg.origin,floorY:tg.floorY,walk:tg.walk,trainingKeys:Object.keys(t),marineKeys:Object.keys(m.userData),parts:parts.slice(0,180),solidCount:tg.solids.length,solids:tg.solids.filter(b=>b.minY<tg.floorY+2.5&&b.maxY>tg.floorY+.1).map(box).slice(0,250),stations:Object.fromEntries(Object.entries(tg.stations).map(([k,s])=>[k,{front:s.front,mesh:s.mesh?.name||s.group?.name||null}])),stationCollisionKeys:Object.keys(t.stationCollision||{}),armoryCollisionKeys:Object.keys(t.armoryCollision||{})};
  })()`);
  report.errors=page.errors.slice();
  assert.deepEqual(report.errors,[]);
  console.log(`CB-292 introspect: ${report.solidCount} solids, ${report.parts.length} named body parts, ${Object.keys(report.stations).length} stations, 0 page errors`);
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1}
finally{fs.writeFileSync(path.join(out,'introspect.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close()}

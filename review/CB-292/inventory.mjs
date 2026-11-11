import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/CB-292');
fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-292';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:20000}));
  const inventory=await page.evaluate(`(()=>{
    const T=TT,tg=T.trainingDbg.tg(),g=tg.group,B=T.THREE.Box3,V=T.THREE.Vector3;
    g.updateMatrixWorld(true);
    const box=o=>{const b=new B().setFromObject(o),v=new V();return {min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(v).toArray()}};
    const describe=o=>({name:o.name||'',type:o.type,visible:o.visible,children:o.children?.length||0,position:o.position.toArray(),box:box(o)});
    const top=g.children.map(describe);
    const stations=Object.fromEntries(Object.entries(tg.stations).map(([k,s])=>[k,{...s}]));
    const targets=tg.targets.map((t,i)=>({i,lane:t.lane,range:t.range,pivot:t.pivot.parent.position.toArray(),box:box(t.pivot.parent)}));
    const all=[];g.traverse(o=>{if(o.isMesh&&o.geometry){const b=box(o);if(b.size.every(Number.isFinite))all.push({name:o.name||'',parent:o.parent?.name||'',...b,flags:o.userData});}});
    return {origin:tg.origin,floorY:tg.floorY,top,stations,targets,solids:tg.solids,all};
  })()`);
  fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(inventory,null,2));
  console.log(`CB-292 inventory: ${inventory.top.length} top children, ${inventory.all.length} meshes, ${inventory.solids.length} solids, ${inventory.targets.length} targets; 0 script errors`);
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}

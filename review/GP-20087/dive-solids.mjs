import assert from 'node:assert/strict';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20087 Dive';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  const rows=await page.evaluate(`(async()=>{
    const {constrainDiveBody}=await import('./studio/marine-dive-contact.js');
    const tr=TT.trainingDbg.state(),tg=tr.tg,extra=tr.cameraCollision.diveSolids;
    const all=[...tg.solids.filter(s=>s.target==null&&!s.floor),...extra];
    const rows=[];
    for(const name of ['cif','kiosk','armory','hqPanel','skullWindow','lightSwitch','rangeConsole']){
      const s=tg.stations[name],f=s.front,L=Math.hypot(f.x-s.x,f.z-s.z),nx=(f.x-s.x)/L,nz=(f.z-s.z)/L;
      const from={x:f.x+nx*.8,y:tg.floorY,z:f.z+nz*.8};
      const to={x:s.x,y:tg.floorY,z:s.z};
      const hit=constrainDiveBody(from,to,-nx,-nz,1,1.3,all);
      rows.push({name,from,to,hit});
    }
    const walls=[
      {name:'corridorWall',from:{x:-6.2,y:tg.floorY,z:-642},to:{x:-8.2,y:tg.floorY,z:-642},dirX:-1,dirZ:0,hip:1.3},
      {name:'rangeBench',from:{x:0,y:tg.floorY,z:-640.5},to:{x:0,y:tg.floorY,z:-639},dirX:0,dirZ:1,hip:.75}
    ];
    for(const w of walls)rows.push({name:w.name,from:w.from,to:w.to,hit:constrainDiveBody(w.from,w.to,w.dirX,w.dirZ,1,w.hip,all)});
    return rows;
  })()`);
  for(const row of rows){
    assert(row.hit.hit,`${row.name}: no dive contact`);
    assert(Math.hypot(row.hit.x-row.to.x,row.hit.z-row.to.z)>.15,`${row.name}: dive reached surface`);
  }
  assert.deepEqual(page.errors,[]);
  console.log(`PASS GP-20087 dormant dive envelope: ${rows.length} real Training collider spots stopped, 0 page errors`);
}finally{await browser.close();await server.close();}

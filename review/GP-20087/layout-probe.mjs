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
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20087 Probe';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  const data=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),tr=T.trainingDbg.state(); return {
    player:{x:T.player.position.x,y:T.player.position.y,z:T.player.position.z},
    camera:{x:T.camera.position.x,y:T.camera.position.y,z:T.camera.position.z},
    stations:Object.fromEntries(Object.entries(tg.stations).map(([k,v])=>[k,{x:v.x,z:v.z,front:v.front}])),
    solids:tg.solids.map(v=>({name:v.name,station:v.station,door:v.door,infirmaryFence:v.infirmaryFence,target:v.target,floor:v.floor,minX:v.minX,maxX:v.maxX,minY:v.minY,maxY:v.maxY,minZ:v.minZ,maxZ:v.maxZ})),
    extra:tr.cameraCollision.boxes,
    cameraState:{yaw:T.fpDbg().yaw,first:T.fpDbg().first},
    keys:Object.keys(T.keys||{})
  }})()`);
  console.log(JSON.stringify(data));
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}

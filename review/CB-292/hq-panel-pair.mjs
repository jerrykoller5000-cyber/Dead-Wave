import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/CB-292');
const original=JSON.parse(fs.readFileSync(path.join(out,'inventory.json'),'utf8'));
const oldMin=original.top.find(x=>x.name==='training-hqPanel').box.min[0];
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
  const before=await page.evaluate(`(oldMin=>{
    const T=TT,tg=T.trainingDbg.tg(),s=tg.stations.hqPanel,c=tg.group.getObjectByName('training-hqPanel');
    T.setWorldTime(.5);T.player.position.set(s.x+2.3,tg.floorY,s.z);
    T.setShotView({x:s.x+2.3,y:tg.floorY+1.6,z:s.z,tx:s.x,ty:tg.floorY+1.6,tz:s.z,fov:50});
    for(let i=0;i<45;i++)T.stepFrame(.016);
    const box=new T.THREE.Box3().setFromObject(c),at=box.min.x;
    c.position.x+=oldMin-at;tg.group.updateMatrixWorld(true);T.renderer.render(T.scene,T.camera);
    return {camera:T.camera.position.toArray(),originalMin:oldMin,currentMin:at};
  })(${oldMin})`);
  await page.screenshot(path.join(out,'before-hqPanel-noon.png'));
  const after=await page.evaluate(`(()=>{
    const T=TT,tg=T.trainingDbg.tg(),c=tg.group.getObjectByName('training-hqPanel');
    const s=tg.stations.hqPanel,box=new T.THREE.Box3().setFromObject(c);
    c.position.x+=tg.origin.x-44-box.min.x;tg.group.updateMatrixWorld(true);T.renderer.render(T.scene,T.camera);
    return {camera:T.camera.position.toArray(),minX:new T.THREE.Box3().setFromObject(c).min.x};
  })()`);
  await page.screenshot(path.join(out,'after-hqPanel-noon.png'));
  assert.deepEqual(before.camera,after.camera);
  assert(Math.abs(after.minX+44)<.0005);
  assert.deepEqual(page.errors,[]);
  console.log(`PASS CB-292 HQ panel same-camera before/after: x ${before.originalMin.toFixed(4)} -> ${after.minX.toFixed(4)}, 0 page errors`);
}finally{await browser.close();await server.close();}

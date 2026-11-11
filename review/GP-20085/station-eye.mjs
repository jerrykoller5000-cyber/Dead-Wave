import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const mode = process.argv[2] || 'before';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20085');
const server = await serve(root, 0), browser = await launch({headless:false,args:['--window-size=1280,720']});
const rows = [];
try {
  const page = await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20085 Eye';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate('document.getElementById("perf")?.classList.remove("on")');
  // Reconstruct the previous collision behavior without altering the checked-in game.
  if (mode==='before-contact') await page.evaluate(`(()=>{
    TT.trainingDbg.state().stationCollision.constrain=()=>({moved:false});
    TT.rangeDbg.feature().constrain=()=>({moved:false});
  })()`);
  for(const station of ['cif','kiosk','armory','hqPanel','skullWindow','lightSwitch','rangeConsole']) {
    const row = await page.evaluate(`(()=>{
      const T=TT,tg=T.trainingDbg.tg(),s=tg.stations[${JSON.stringify(station)}],f=s.front;
      const dx=f.x-s.x,dz=f.z-s.z,len=Math.hypot(dx,dz),nx=dx/len,nz=dz/len;
      const c=T.trainingDbg.state().copies?.[${JSON.stringify(station)}]?.copy;
      const mesh=c||(${JSON.stringify(station)}==='rangeConsole'?tg.group.getObjectByName('training-range-console')
        :${JSON.stringify(station)}==='lightSwitch'?tg.group.getObjectByName('training-light-switch-lever')?.parent:null);
      tg.group.updateMatrixWorld(true);
      const b=mesh?new T.THREE.Box3().setFromObject(mesh):null;
      const face=b?(Math.abs(nx)>.5?(nx>0?b.max.x:b.min.x):(nz>0?b.max.z:b.min.z)):null;
      const p=T.player.position;
      p.set(b?(Math.abs(nx)>.5?face+nx*.2:s.x):f.x,tg.floorY,b?(Math.abs(nz)>.5?face+nz*.2:s.z):f.z);
      T.setViewFirstDbg(true);T.setOtsAimDbg(Math.atan2(-nx,-nz),-Math.PI/3);T.setVelDbg(0,0);
      T.stepFrame(.016);
      const range=tg.solids.find(q=>q.station==='rangeConsole')||null;
      const eye=T.fpDbg().eye;
      return {station:${JSON.stringify(station)},front:f,at:{x:s.x,z:s.z},face,normal:{x:nx,z:nz},player:{x:p.x,z:p.z},eye:eye?{x:eye.x,y:eye.y,z:eye.z}:null,action:T.trainingDbg.action(),
        bounds:b?{minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z}:null,
        rangeSolid:range?{minX:range.minX,maxX:range.maxX,minZ:range.minZ,maxZ:range.maxZ}:null,
        stationBoxes:T.trainingDbg.state().stationCollision?.boxes.map(v=>v.name)||[]};
    })()`);
    await new Promise(r=>setTimeout(r,100));
    await page.screenshot(path.join(out,`${mode}-${station}-eye.png`));
    rows.push(row);
    if(mode.startsWith('after') && row.face!=null) {
      const axis=Math.abs(row.normal.x)>.5?'x':'z',normal=row.normal[axis];
      assert((row.player[axis]-row.face)*normal>=.41,`${station}: player not at least radius from face`);
      assert((row.eye[axis]-row.face)*normal>=.02,`${station}: eye inside the station`);
    }
  }
  assert.deepEqual(page.errors,[]);
  console.log(`PASS GP-20085 ${mode}: ${rows.length} station eye views, 0 page errors`);
} finally {
  fs.writeFileSync(path.join(out,`${mode}-eye.json`),JSON.stringify(rows,null,2));
  await browser.close();await server.close();
}

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20087');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const rows=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20087 Camera';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate(`(()=>{document.getElementById('perf')?.classList.remove('on');TT.setViewFirstDbg(false)})()`);
  const spots=['cif','kiosk','armory','hqPanel','skullWindow','lightSwitch','rangeConsole','corridor','armoryRoom','rangeBench'];
  let previousYaw=0;
  for(const spot of spots){
    const base=await page.evaluate(`((spot,previousYaw)=>{
      const T=TT,tr=T.trainingDbg.state(),tg=tr.tg,cc=tr.cameraCollision;
      let px,pz,nx,nz;
      if(tg.stations[spot]){
        const s=tg.stations[spot],f=s.front,L=Math.hypot(f.x-s.x,f.z-s.z);
        nx=(f.x-s.x)/L;nz=(f.z-s.z)/L;px=f.x;pz=f.z;
      }else if(spot==='corridor'){px=-6.2;pz=-642;nx=1;nz=0;}
      else if(spot==='armoryRoom'){px=6.95;pz=-641.5;nx=-1;nz=0;}
      else {px=0;pz=-640.5;nx=0;nz=-1;}
      const yaw=Math.atan2(nx,nz),p=T.player.position;
      T.rotateCamera(yaw-previousYaw);T.setVelDbg(0,0);p.set(px,tg.floorY,pz);
      T.camera.position.set(px,tg.floorY+1.6,pz);
      cc._savedPull=cc.pull;cc.pull=()=>null;
      for(let i=0;i<90;i++)T.stepFrame(.016);
      const before={x:T.camera.position.x,y:T.camera.position.y,z:T.camera.position.z};
      return {spot,yaw,player:{x:p.x,y:p.y,z:p.z},before};
    })(${JSON.stringify(spot)},${previousYaw})`);
    previousYaw=base.yaw;
    // The baseline and fixed image share the player position and orbit heading.
    await page.screenshot(path.join(out,`before-${spot}.png`));
    const row=await page.evaluate(`((base)=>{
      const T=TT,tr=T.trainingDbg.state(),cc=tr.cameraCollision,tg=tr.tg,p=T.player.position;
      cc.pull=cc._savedPull;delete cc._savedPull;
      for(let i=0;i<3;i++)T.stepFrame(.016);
      const after={x:T.camera.position.x,y:T.camera.position.y,z:T.camera.position.z};
      const before=base.before;
      const all=[...tg.solids.filter(s=>s.target==null&&!s.floor&&(!s.infirmaryFence||tr.infirmaryFence?.state().raised)),...cc.boxes];
      const inside=(v,b)=>v.x>b.minX&&v.x<b.maxX&&v.y>b.minY&&v.y<b.maxY&&v.z>b.minZ&&v.z<b.maxZ;
      return {...base,after,travel:Math.hypot(after.x-before.x,after.y-before.y,after.z-before.z),beforeInside:all.filter(b=>inside(before,b)).map(b=>b.name||b.station||'solid'),afterInside:all.filter(b=>inside(after,b)).map(b=>b.name||b.station||'solid')};
    })(${JSON.stringify(base)})`);
    await page.screenshot(path.join(out,`after-${spot}.png`));
    rows.push(row);
    assert.deepEqual(row.afterInside,[],`${spot}: camera inside solid`);
    if(spot==='corridor')assert(row.player.x>-7.7,`${spot}: player left the playable lane`);
  }
  assert.deepEqual(page.errors,[]);
  console.log(`PASS GP-20087 camera views: ${rows.length} spots, ${rows.filter(r=>r.travel>.1).length} pulled, 0 inside, 0 page errors`);
}finally{
  fs.writeFileSync(path.join(out,'camera-views.json'),JSON.stringify(rows,null,2));
  await browser.close();await server.close();
}

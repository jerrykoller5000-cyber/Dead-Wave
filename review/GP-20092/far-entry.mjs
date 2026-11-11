import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20092');
const stations=['cif'];
const lights=[['noon',.5]];
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const results=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20092 Sweep';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate(`(()=>{TT.setViewFirstDbg(false);document.getElementById('perf')?.classList.remove('on')})()`);
  let previousYaw=0;
  for(const [light,time] of lights){
    for(const station of stations){
      for(const phase of ['before','after']){
        const result=await page.evaluate(`((station,light,time,phase,previousYaw)=>{
          const T=TT,tr=T.trainingDbg.state(),tg=tr.tg,s=tg.stations[station],f=s.front;
          const L=Math.hypot(f.x-s.x,f.z-s.z),nx=(f.x-s.x)/L,nz=(f.z-s.z)/L,yaw=Math.atan2(nx,nz);
          T.rotateCamera(yaw-previousYaw);T.setAimYawDbg(-yaw);window.__GP91_BASELINE=phase==='before';
          T.setVelDbg(0,0);T.player.position.set(f.x+nx*9,tg.floorY,f.z+nz*9);
          T.camera.position.set(T.player.position.x,T.player.position.y+1.6,T.player.position.z);
          T.setWorldTime(time);for(let j=0;j<90;j++)T.stepFrame(.016);
          const rows=[],boxes=[...tg.solids.filter(b=>b.target==null&&!b.floor&&(!b.infirmaryFence||tr.infirmaryFence?.state().raised)),...tr.cameraCollision.boxes];
          for(let i=90;i>=0;i--){
            T.player.position.set(f.x+nx*i*.1,tg.floorY,f.z+nz*i*.1);T.setVelDbg(0,0);T.stepFrame(.016);
            const c=T.camera.position,v=new T.THREE.Vector3(s.x,s.y+1.4,s.z).project(T.camera);
            rows.push({d:i*.1,eye:{x:c.x,y:c.y,z:c.z},station:{x:v.x,y:v.y,z:v.z},actualPlayer:{x:T.player.position.x,z:T.player.position.z},inside:boxes.filter(b=>c.x>b.minX&&c.x<b.maxX&&c.y>b.minY&&c.y<b.maxY&&c.z>b.minZ&&c.z<b.maxZ).map(b=>b.name||b.station||'solid')});
          }
          return {yaw,rows};
        })(${JSON.stringify(station)},${JSON.stringify(light)},${time},${JSON.stringify(phase)},${previousYaw})`);
        previousYaw=result.yaw;
        const {rows}=result;
        let maxStep=0;
        for(let i=1;i<rows.length;i++)maxStep=Math.max(maxStep,Math.hypot(rows[i].eye.x-rows[i-1].eye.x,rows[i].eye.y-rows[i-1].eye.y,rows[i].eye.z-rows[i-1].eye.z));
        results.push({light,station,phase,maxStep,rows});
        if(phase==='after'){
          assert.ok(maxStep<.55,`${light}/${station}: ${maxStep.toFixed(3)} m step`);
          assert.deepEqual(rows.flatMap(r=>r.inside),[],`${light}/${station}: camera inside solid`);
          for(const r of rows.filter(r=>r.d<=2))assert.ok(Math.abs(r.station.x)<=1&&Math.abs(r.station.y)<=1,`${light}/${station}: station offscreen at ${r.d.toFixed(1)} m`);
        }
      }
    }
  }
  assert.deepEqual(page.errors,[]);
  console.log(`PASS GP-20092 far entry: 9 m to station in 91 steps, 0 jumps over 0.55 m, 0 inside, 0 page errors`);
}finally{
  fs.writeFileSync(path.join(out,'far-entry.json'),JSON.stringify(results,null,2));
  await browser.close();await server.close();
}

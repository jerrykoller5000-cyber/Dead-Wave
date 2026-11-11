import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Pass before or after');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20091');
const spots=['cif','kiosk','armory','hqPanel','skullWindow','lightSwitch','rangeConsole','corridor','armoryRoom','rangeBench'];
const lights=[['noon',.5],['overcast',.5],['dusk',.76],['night',.02]];
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const rows=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20091 Camera';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate(`(()=>{document.getElementById('perf')?.classList.remove('on');TT.setViewFirstDbg(false)})()`);
  await page.evaluate(`window.__GP91_BASELINE=${phase==='before'}`);
  let previousYaw=0;
  for(const [light,time] of lights){
    for(const spot of spots){
      const row=await page.evaluate(`((spot,previousYaw,time,light)=>{
        const T=TT,tr=T.trainingDbg.state(),tg=tr.tg,p=T.player.position;
        let px,pz,nx,nz;
        if(tg.stations[spot]){
          const s=tg.stations[spot],f=s.front,L=Math.hypot(f.x-s.x,f.z-s.z);
          nx=(f.x-s.x)/L;nz=(f.z-s.z)/L;px=f.x;pz=f.z;
        }else if(spot==='corridor'){px=-6.2;pz=-642;nx=1;nz=0;}
        else if(spot==='armoryRoom'){px=6.95;pz=-641.5;nx=-1;nz=0;}
        else {px=0;pz=-640.5;nx=0;nz=-1;}
        const yaw=Math.atan2(nx,nz);
        T.rotateCamera(yaw-previousYaw);T.setAimYawDbg(tg.stations[spot]?-yaw:yaw);T.setVelDbg(0,0);p.set(px,tg.floorY,pz);
        T.camera.position.set(px,tg.floorY+1.6,pz);
        T.setWorldTime(time);
        for(let i=0;i<90;i++)T.stepFrame(.016);
        if(light==='overcast'){
          T.sun.intensity*=.35;T.hemi.intensity*=.75;
          T.renderer.render(T.scene,T.camera);
        }
        const camera={x:T.camera.position.x,y:T.camera.position.y,z:T.camera.position.z};
        const forward=new T.THREE.Vector3();T.camera.getWorldDirection(forward);
        const s=tg.stations[spot];
        const station=s?new T.THREE.Vector3(s.x,s.y+1.4,s.z):null;
        const stationNdc=station?station.project(T.camera):null;
        const head=T.getMarine().userData.headG;
        const headMat=head?.children.find(o=>o.material)?.material;
        const boxes=[...tg.solids.filter(b=>b.target==null&&!b.floor&&(!b.infirmaryFence||tr.infirmaryFence?.state().raised)),...tr.cameraCollision.boxes];
        const cameraInside=boxes.filter(b=>camera.x>b.minX&&camera.x<b.maxX&&camera.y>b.minY&&camera.y<b.maxY&&camera.z>b.minZ&&camera.z<b.maxZ).map(b=>b.name||b.station||'solid');
        return {spot,light,time,yaw,player:{x:p.x,y:p.y,z:p.z},camera,forward:{x:forward.x,y:forward.y,z:forward.z},headDistance:Math.hypot(camera.x-p.x,camera.y-p.y-1.6,camera.z-p.z),stationNdc:stationNdc&&{x:stationNdc.x,y:stationNdc.y,z:stationNdc.z},headVisible:head?.visible,headOpacity:headMat?.opacity,cameraInside};
      })(${JSON.stringify(spot)},${previousYaw},${time},${JSON.stringify(light)})`);
      previousYaw=row.yaw;
      await page.screenshot(path.join(out,`${phase}-${light}-${spot}.png`));
      rows.push(row);
    }
  }
  assert.deepEqual(page.errors,[]);
  if(phase==='after')assert.deepEqual(rows.flatMap(r=>r.cameraInside.map(x=>`${r.light}/${r.spot}: ${x}`)),[]);
  console.log(`PASS GP-20091 ${phase}: ${rows.length} views, ${rows.filter(r=>r.headDistance<.6).length} close, 0 page errors`);
}finally{
  fs.writeFileSync(path.join(out,`${phase}-views.json`),JSON.stringify(rows,null,2));
  await browser.close();await server.close();
}

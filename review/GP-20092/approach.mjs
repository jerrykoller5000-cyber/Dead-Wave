import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20092');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const rows=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20091 Approach';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate(`(()=>{TT.setViewFirstDbg(false);document.getElementById('perf')?.classList.remove('on')})()`);
  const snapshots=new Set([40,32,24,16,8,0]);
  let baselineJump=0;
  for(const phase of ['before','after']){
    await page.evaluate(`(()=>{
      const T=TT,s=T.trainingDbg.state().tg.stations.cif,f=s.front,L=Math.hypot(f.x-s.x,f.z-s.z),nx=(f.x-s.x)/L,nz=(f.z-s.z)/L;
      window.__GP91_BASELINE=${phase==='before'};
      if(!window.__GP91_APPROACH_YAW){T.rotateCamera(Math.atan2(nx,nz));window.__GP91_APPROACH_YAW=true;}
      T.setVelDbg(0,0);T.player.position.set(f.x+nx*4,T.trainingDbg.state().tg.floorY,f.z+nz*4);
      T.camera.position.set(T.player.position.x,T.player.position.y+1.6,T.player.position.z);
      T.setWorldTime(.5);
      for(let i=0;i<90;i++)T.stepFrame(.016);
    })()`);
    let previous=null,maxStep=0,nearStep=0;
    for(let i=40;i>=0;i--){
      const row=await page.evaluate(`((i)=>{
        const T=TT,tr=T.trainingDbg.state(),tg=tr.tg,s=tg.stations.cif,f=s.front,L=Math.hypot(f.x-s.x,f.z-s.z),nx=(f.x-s.x)/L,nz=(f.z-s.z)/L;
        T.player.position.set(f.x+nx*i*.1,tg.floorY,f.z+nz*i*.1);T.setVelDbg(0,0);T.stepFrame(.016);
        const c=T.camera.position,head={x:T.player.position.x,y:T.player.position.y+1.6,z:T.player.position.z};
        const v=new T.THREE.Vector3(s.x,s.y+1.4,s.z).project(T.camera);
        const boxes=[...tg.solids.filter(b=>b.target==null&&!b.floor&&(!b.infirmaryFence||tr.infirmaryFence?.state().raised)),...tr.cameraCollision.boxes];
        const inside=boxes.filter(b=>c.x>b.minX&&c.x<b.maxX&&c.y>b.minY&&c.y<b.maxY&&c.z>b.minZ&&c.z<b.maxZ).map(b=>b.name||b.station||'solid');
        return {d:i*.1,eye:{x:c.x,y:c.y,z:c.z},headDistance:Math.hypot(c.x-head.x,c.y-head.y,c.z-head.z),station:{x:v.x,y:v.y,z:v.z},inside};
      })(${i})`);
      if(previous){
        const step=Math.hypot(row.eye.x-previous.x,row.eye.y-previous.y,row.eye.z-previous.z);
        maxStep=Math.max(maxStep,step);
        if(i<=36)nearStep=Math.max(nearStep,step);
      }
      previous=row.eye;
      rows.push({phase,...row});
      if(snapshots.has(i))await page.screenshot(path.join(out,`approach-${phase}-${i}.png`));
    }
    console.log(`GP-20092 ${phase} approach: max camera step ${maxStep.toFixed(3)} m (near station ${nearStep.toFixed(3)} m), ${rows.filter(r=>r.phase===phase&&r.inside.length).length} inside`);
    if(phase==='before')baselineJump=maxStep;
    if(phase==='after'){
      assert.ok(maxStep<.55,`camera jump ${maxStep.toFixed(3)} m; baseline ${baselineJump.toFixed(3)} m`);
      assert.ok(nearStep<.55,`new close-station camera jump ${nearStep.toFixed(3)} m`);
      assert.deepEqual(rows.filter(r=>r.phase===phase).flatMap(r=>r.inside),[]);
    }
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS GP-20092 approach: 41 steps, 12 filmstrip frames, 0 inside, 0 page errors');
}finally{
  fs.writeFileSync(path.join(out,'approach.json'),JSON.stringify(rows,null,2));
  await browser.close();await server.close();
}

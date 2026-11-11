import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20093');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const rows=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-305 Aim';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate('TT.setViewFirstDbg(false)');
  let prev=0;
  for(const spot of ['rangeBench','rangeConsole'])for(const phase of ['before','after'])for(const aim of ['hip','ads']){
    const row=await page.evaluate(`((spot,phase,aim,prev)=>{
      const T=TT,t=T.trainingDbg.state(),s=t.tg.stations[spot]||null,p=T.player.position;
      const x=spot==='rangeBench'?0:s.front.x,z=spot==='rangeBench'?-640.5:s.front.z;
      // Face down the target lane, keeping the same heading across camera variants.
      const yaw=0;
      T.rotateCamera(yaw-prev);T.setAimYawDbg(-yaw);T.setVelDbg(0,0);p.set(x,t.tg.floorY,z);
      T.camera.position.set(x,t.tg.floorY+1.6,z);
      window.__GP91_BASELINE=phase==='before';T.setZoomHeldDbg(aim==='ads');
      for(let i=0;i<100;i++)T.stepFrame(.016);
      const v=new T.THREE.Vector3();T.camera.getWorldDirection(v);
      const a=T.aimTarget.clone(),c=T.camera.position.clone(),q=T.getAimCamDbg();
      return {spot,phase,aim,yaw,camera:c.toArray(),forward:v.toArray(),aimTarget:a.toArray(),player:p.toArray(),aimCamera:q,
        lane:{x:0,z:1},station:s&&{x:s.x,z:s.z,front:s.front}};
    })(${JSON.stringify(spot)},${JSON.stringify(phase)},${JSON.stringify(aim)},${prev})`);
    prev=row.yaw;
    await page.screenshot(path.join(out,`aim-${spot}-${phase}-${aim}.png`));rows.push(row);
  }
  assert.deepEqual(page.errors,[]);
  console.log('PASS CB-305 aim check: '+rows.map(r=>`${r.spot}/${r.phase}/${r.aim} fwd ${r.forward.map(x=>x.toFixed(3)).join(',')}`).join(' | '));
}finally{
  fs.writeFileSync(path.join(out,'aim-check.json'),JSON.stringify(rows,null,2));
  await browser.close();await server.close();
}

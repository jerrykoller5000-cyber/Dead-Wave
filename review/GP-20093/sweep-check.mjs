import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20093');
const baseline=process.argv[2]==='baseline';
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const rows=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20093 Sweep';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate('TT.setViewFirstDbg(false)');
  await page.evaluate(`window.__GP91_BASELINE=${baseline}`);
  let prev=0;
  for(const deg of [0,15,30,45,60,75,90]){
    const yaw=deg*Math.PI/180;
    const row=await page.evaluate(`((yaw,prev,deg)=>{
      const T=TT,t=T.trainingDbg.state(),s=t.tg.stations.rangeConsole,p=T.player.position;
      p.set(s.front.x,t.tg.floorY,s.front.z);T.setVelDbg(0,0);T.rotateCamera(yaw-prev);T.setAimYawDbg(-yaw);
      for(let i=0;i<60;i++)T.stepFrame(.016);
      const dir=new T.THREE.Vector3();T.camera.getWorldDirection(dir);
      return {deg,camera:T.camera.position.toArray(),forward:dir.toArray(),aim:T.aimTarget.toArray()};
    })(${yaw},${prev},${deg})`);
    prev=yaw;rows.push(row);
    await page.screenshot(path.join(out,`sweep-${baseline?'baseline-':''}${String(deg).padStart(2,'0')}.png`));
  }
  assert.deepEqual(page.errors,[]);
  fs.writeFileSync(path.join(out,baseline?'sweep-baseline.json':'sweep.json'),JSON.stringify(rows,null,2));
  console.log(`PASS GP-20093 ${baseline?'baseline ':' '}sweep: ${rows.length} key views, 0 page errors`);
}finally{await browser.close();await server.close();}

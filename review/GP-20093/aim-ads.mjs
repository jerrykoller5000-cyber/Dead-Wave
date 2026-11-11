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
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20093 ADS';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate('TT.setViewFirstDbg(false)');
  for(const spot of ['rangeBench','rangeConsole'])for(const aim of ['hip','ads'])for(const phase of ['baseline','gated']){
    const row=await page.evaluate(`((spot,aim,phase)=>{
      const T=TT,t=T.trainingDbg.state(),s=t.tg.stations.rangeConsole,p=T.player.position;
      const x=spot==='rangeBench'?0:s.front.x,z=spot==='rangeBench'?-640.5:s.front.z;
      p.set(x,t.tg.floorY,z);T.setVelDbg(0,0);T.rotateCamera(0);T.setAimYawDbg(0);
      T.camera.position.set(x,t.tg.floorY+1.6,z);
      window.__GP91_BASELINE=phase==='baseline';
      T.renderer.domElement.dispatchEvent(new PointerEvent('pointerenter',{clientX:640,clientY:250,bubbles:true}));
      T.setZoomHeldDbg(aim==='ads');
      for(let i=0;i<120;i++)T.stepFrame(.016);
      const dir=new T.THREE.Vector3();T.camera.getWorldDirection(dir);
      return {spot,aim,phase,camera:T.camera.position.toArray(),forward:dir.toArray(),target:T.aimTarget.toArray(),player:p.toArray(),zoom:T.aimZoomDbg()};
    })(${JSON.stringify(spot)},${JSON.stringify(aim)},${JSON.stringify(phase)})`);
    rows.push(row);await page.screenshot(path.join(out,`pointer-${spot}-${aim}-${phase}.png`));
  }
  assert.deepEqual(page.errors,[]);
  fs.writeFileSync(path.join(out,'pointer-aim.json'),JSON.stringify(rows,null,2));
  console.log('PASS GP-20093 pointer aim '+rows.map(r=>`${r.spot}/${r.aim}/${r.phase} w ${r.zoom.w.toFixed(3)} fwd ${r.forward.map(v=>v.toFixed(3)).join(',')}`).join(' | '));
}finally{await browser.close();await server.close();}

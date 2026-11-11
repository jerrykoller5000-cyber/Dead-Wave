import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20091');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const rows=[];
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20091 Fade';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  await page.evaluate(`(()=>{TT.setViewFirstDbg(false);document.getElementById('perf')?.classList.remove('on');TT.rotateCamera(Math.PI/2)})()`);
  for(const phase of ['before','after']){
    const row=await page.evaluate(`((phase)=>{
      const T=TT,tr=T.trainingDbg.state(),tg=tr.tg,p=T.player.position;
      window.__GP91_BASELINE=phase==='before';
      p.set(-6.8,tg.floorY,-635);T.setVelDbg(0,0);
      T.camera.position.set(p.x,p.y+1.6,p.z);T.setWorldTime(.5);
      for(let i=0;i<90;i++)T.stepFrame(.016);
      const c=T.camera.position,head=T.getMarine().userData.headG;
      const material=head?.children.find(o=>o.material)?.material;
      const boxes=[...tg.solids.filter(b=>b.target==null&&!b.floor&&(!b.infirmaryFence||tr.infirmaryFence?.state().raised)),...tr.cameraCollision.boxes];
      return {phase,eye:{x:c.x,y:c.y,z:c.z},distance:Math.hypot(c.x-p.x,c.y-p.y-1.6,c.z-p.z),headOpacity:material?.opacity,inside:boxes.filter(b=>c.x>b.minX&&c.x<b.maxX&&c.y>b.minY&&c.y<b.maxY&&c.z>b.minZ&&c.z<b.maxZ).map(b=>b.name||b.station||'solid')};
    })(${JSON.stringify(phase)})`);
    rows.push(row);
    await page.screenshot(path.join(out,`fade-${phase}.png`));
  }
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(rows[1].inside,[]);
  assert.ok(rows[1].distance<.6,`fade spot not a close eye: ${rows[1].distance}`);
  assert.ok(rows[1].headOpacity<rows[0].headOpacity,'helmet did not fade');
  console.log(`PASS GP-20091 fade: ${rows[1].distance.toFixed(2)} m, helmet ${rows[0].headOpacity} → ${rows[1].headOpacity?.toFixed(2)}, 0 inside, 0 page errors`);
}finally{
  fs.writeFileSync(path.join(out,'fade.json'),JSON.stringify(rows,null,2));
  await browser.close();await server.close();
}

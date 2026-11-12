import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20109');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const report = { at: new Date().toISOString(), traces: [], shots: [], errors: [] };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const closeups = [
  { id: 'sprinkler-z1', pos: [-6.15, 5.55, 1.55], look: [-7.25, 5.66, 1], fov: 36 },
  { id: 'sprinkler-z9', pos: [-6.05, 5.52, 9.75], look: [-7.25, 5.78, 9], fov: 38 },
  { id: 'duct-z3', pos: [5.65, 5.42, 4.15], look: [7.25, 5.82, 3], fov: 42 },
  { id: 'baffle-z5_4', pos: [5.1, 4.85, 3.6], look: [6.4, 5.45, 5.4], fov: 46 },
  { id: 'lane-mid-back', pos: [0, 1.6, 14], look: [0, 13.6, 2], fov: 84 }
];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20109 proof';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }));
  report.traces = await page.evaluate(`(async()=>{
    const T=TT,tg=T.trainingDbg.tg(),{traceTraining}=await import('/world/training-ballistics.js');
    T.setViewFirstDbg(true);for(let i=0;i<8;i++)T.stepFrame(.016);
    tg.ceiling.root.updateWorldMatrix(true,true);
    const result=[];
    for(const z of [-.2,5.4,11,16.6,22.2,27.8]){
      const a={x:tg.origin.x,y:tg.floorY+5.4,z:tg.origin.z+z-1};
      const b={x:a.x,y:a.y,z:a.z+2};
      const hit=traceTraining(tg,a,b);
      const ray=new T.THREE.Raycaster(new T.THREE.Vector3(a.x,a.y,a.z),new T.THREE.Vector3(0,0,1),0,2);
      const visual=ray.intersectObject(tg.ceiling.root,true)[0];
      result.push({z,baffle:!!hit?.solid?.baffle,ceiling:!!hit?.solid?.ceiling,hit:hit?.point,visual:visual?.point?.toArray(),delta:visual&&hit?Math.abs(visual.point.z-hit.point.z):null});
    }
    return result;
  })()`);
  assert.equal(report.traces.length, 6);
  for (const row of report.traces) {
    assert.equal(row.baffle, true, `round missed baffle ${row.z}`);
    assert.equal(row.ceiling, true, `baffle ${row.z} cannot be cut away in 3P`);
    assert(row.visual && row.delta <= .015, `ballistic/visual surface mismatch ${row.z}: ${row.delta}`);
  }

  for (const c of closeups) {
    const state = await page.evaluate(`((c)=>{
      const T=TT,tg=T.trainingDbg.tg(),o=tg.origin,y=tg.floorY;
      if(!T.trainingDbg.lights().on)T.trainingDbg.toggleLights();
      if(!window.__repairLight){window.__repairLight=new T.THREE.PointLight(0xffffff,2,3);tg.group.add(window.__repairLight)}
      window.__repairLight.position.set(...c.pos);
      T.setShotView({x:o.x+c.pos[0],y:y+c.pos[1],z:o.z+c.pos[2],tx:o.x+c.look[0],ty:y+c.look[1],tz:o.z+c.look[2],fov:c.fov});
      for(let i=0;i<8;i++)T.stepFrame(.016);
      return {camera:T.camera.position.toArray(),draws:T.renderer.info.render.drawCalls??T.renderer.info.render.calls??0};
    })(${JSON.stringify(c)})`);
    await pause(180);
    const file = `after-${c.id}.png`;
    await page.screenshot(path.join(out,file));
    report.shots.push({ file, ...state });
  }
  report.third = await page.evaluate(`(()=>{
    const T=TT,tg=T.trainingDbg.tg();T.setShotView(null);window.__repairLight.removeFromParent();T.setViewFirstDbg(false);for(let i=0;i<8;i++)T.stepFrame(.016);
    return {visible:tg.ceiling.root.visible,baffleSolids:tg.solids.filter(s=>s.baffle).length,ignored:tg.solids.filter(s=>s.baffle).every(s=>tg.cutaway.ignoreSolid(s))};
  })()`);
  assert.equal(report.third.visible,false);
  assert.equal(report.third.baffleSolids,144);
  assert.equal(report.third.ignored,true);
  report.errors=page.errors.slice();
  assert.deepEqual(report.errors,[]);
  console.log(`GP-20109 proof: ${report.traces.length} baffles stop rounds within 15 mm of visible surface, ${report.shots.length} after shots, 3P ignored, ${report.errors.length} page errors`);
} catch(e) { report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1; }
finally { fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close(); }

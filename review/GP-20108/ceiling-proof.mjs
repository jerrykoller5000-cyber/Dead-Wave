import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20108');
const server = await serve(root, 0);
const browser = await launch({ headless:false, args:['--window-size=1280,720'] });
const report = { at:new Date().toISOString() };
const pause = ms => new Promise(r => setTimeout(r, ms));
try {
  const page = await browser.newPage({ width:1280, height:720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', {timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', {timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20108 proof';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', {timeout:90000}));
  report.hit = await page.evaluate(`(async()=>{
    const T=TT,tg=T.trainingDbg.tg(),tr=T.trainingDbg.state();
    T.trainingDbg.clear();T.setViewFirstDbg(true);for(let i=0;i<8;i++)T.stepFrame(.016);
    T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-3);
    T.setVelDbg(0,0);T.setOtsAimDbg(0,1.05);for(let i=0;i<8;i++)T.stepFrame(.016);
    const {traceTraining}=await import('/world/training-ballistics.js');
    const a={x:tg.origin.x,y:tg.floorY+1.55,z:tg.origin.z-3};
    const b={x:tg.origin.x,y:tg.floorY+8,z:tg.origin.z-3};
    const hit=traceTraining(tg,a,b),before=tr.impacts.count();
    if(hit?.solid.ceiling)tr.impacts.add(hit);
    return {solid:!!hit?.solid.ceiling,normal:hit?.normal,point:hit?.point,marksBefore:before,marksAfter:tr.impacts.count(),ceiling:tg.ceiling.state(),draws:T.renderer.info.render.drawCalls??T.renderer.info.render.calls??0};
  })()`);
  assert.equal(report.hit.solid, true, 'upward round missed the ceiling');
  assert.equal(report.hit.normal.y, -1, 'ceiling hit normal is not down');
  assert.equal(report.hit.marksAfter, report.hit.marksBefore+1, 'impact mark missing');
  await pause(250);
  await page.screenshot(path.join(out, 'final-range-on.png'));
  report.off = await page.evaluate(`(()=>{const T=TT;T.trainingDbg.toggleLights();for(let i=0;i<8;i++)T.stepFrame(.016);return {room:T.trainingDbg.lights(),ceiling:T.trainingDbg.tg().ceiling.state(),draws:T.renderer.info.render.drawCalls??T.renderer.info.render.calls??0};})()`);
  assert.equal(report.off.room.on, false);
  assert.equal(report.off.ceiling.on, false);
  await pause(250);
  await page.screenshot(path.join(out, 'final-range-off.png'));
  report.third = await page.evaluate(`(()=>{
    const T=TT,tg=T.trainingDbg.tg(),tr=T.trainingDbg.state();T.trainingDbg.toggleLights();T.setViewFirstDbg(false);
    T.setOtsAimDbg(0,0);for(let i=0;i<8;i++)T.stepFrame(.016);
    const eye=new T.THREE.Vector3(tg.origin.x,tg.floorY+9,tg.origin.z-3);
    const head=new T.THREE.Vector3(tg.origin.x,tg.floorY+1.6,tg.origin.z-3);
    const contact=tr.cameraCollision.pull(head,eye);
    T.setShotView({x:tg.origin.x,y:tg.floorY+10,z:tg.origin.z-18,tx:tg.origin.x,ty:tg.floorY+1,tz:tg.origin.z+12,fov:54});
    return {visible:tg.ceiling.root.visible,ignoredForCameraAim:tg.cutaway.ignoreSolid(tg.ceiling.solid),cameraContact:contact?.box?.ceiling||false,eye:eye.toArray(),draws:T.renderer.info.render.drawCalls??T.renderer.info.render.calls??0};
  })()`);
  assert.equal(report.third.visible,false);
  assert.equal(report.third.ignoredForCameraAim,true);
  assert.equal(report.third.cameraContact,false);
  await pause(250);
  await page.screenshot(path.join(out, 'final-third-person.png'));
  report.errors = page.errors.slice();
  assert.deepEqual(report.errors,[]);
  console.log(`GP-20108 proof: ceiling hit, down normal, impact mark ${report.hit.marksBefore}->${report.hit.marksAfter}, lights off, 3P cutaway and camera clear, ${report.errors.length} page errors`);
} catch(e) { report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1; }
finally { fs.writeFileSync(path.join(out,'final.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close(); }

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20108');
fs.mkdirSync(out, { recursive: true });
const phase = process.argv[2] || 'before';
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const report = { phase, at: new Date().toISOString(), spots: [], lights: [], errors: [] };
const pause = ms => new Promise(r => setTimeout(r, ms));
const spots = [
  ['range-firing', 0, -3, 0],
  ['range-lanes', 0, 13, 0],
  ['range-stations', 5, -7, -Math.PI / 2],
  ['apron-door', -11, -8, Math.PI / 2],
  ['infirmary', -38, -9, 0],
  ['hq-ladder', -41, 1, Math.PI / 2],
  ['hangar-center', -25, 7, 0],
  ['passage-gate', -26, 25, 0],
];
try {
  const page = await browser.newPage({ width:1280, height:720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', {timeout:90000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', {timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20108';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', {timeout:90000}));
  await page.evaluate(`(()=>{TT.setViewFirstDbg(true);TT.trainingDbg.clear();for(let i=0;i<8;i++)TT.stepFrame(.016)})()`);
  for (const [name, x, z, yaw] of spots) {
    const entry = { name, x, z };
    for (const [view, pitch] of [['up', 1.24], ['ahead', .06]]) {
      entry[view] = await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg();T.player.position.set(${x}+tg.origin.x,tg.floorY,${z}+tg.origin.z);T.setVelDbg(0,0);T.setOtsAimDbg(${yaw},${pitch});for(let i=0;i<8;i++)T.stepFrame(.016);return {player:T.player.position.toArray(),camera:T.camera.position.toArray(),aim:T.otsDbg(),draws:T.renderer.info.render.drawCalls??T.renderer.info.render.calls??0,ceiling:T.trainingDbg.tg().ceiling?.state?.()||null};})()`);
      await pause(160);
      await page.screenshot(path.join(out, `${phase}-${name}-${view}.png`));
    }
    report.spots.push(entry);
  }
  // Hold one range eye and camera position for the four lighting comparisons.
  for (const [name, time, off] of [['noon',.5,false], ['overcast',.43,false], ['dusk',.74,false], ['night',.02,false], ['lights-off',.5,true]]) {
    const state = await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg();T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-3);T.setVelDbg(0,0);T.setOtsAimDbg(0,1.05);T.setWorldTime(${time});if(T.trainingDbg.lights().on===${off})T.trainingDbg.toggleLights();for(let i=0;i<8;i++)T.stepFrame(.016);return {player:T.player.position.toArray(),camera:T.camera.position.toArray(),draws:T.renderer.info.render.drawCalls??T.renderer.info.render.calls??0,lights:T.trainingDbg.lights()};})()`);
    await pause(160);
    await page.screenshot(path.join(out, `${phase}-range-${name}.png`));
    report.lights.push({name,...state});
  }
  await page.evaluate(`(()=>{const T=TT;T.trainingDbg.toggleLights();T.setViewFirstDbg(false);for(let i=0;i<8;i++)T.stepFrame(.016)})()`);
  await pause(160);
  report.thirdPerson = await page.evaluate(`(()=>({camera:TT.camera.position.toArray(),draws:TT.renderer.info.render.drawCalls??TT.renderer.info.render.calls??0,cutaway:TT.trainingDbg.tg().cutaway?.state?.()}))()`);
  await page.screenshot(path.join(out, `${phase}-third-person.png`));
  report.errors = page.errors.slice();
  report.warnings = page.console.filter(c => ['warning','warn','error'].includes(c.type));
  assert.deepEqual(report.errors, []);
  console.log(`GP-20108 ${phase}: ${report.spots.length} spots up/ahead, 5 light states, third person, ${report.errors.length} page errors, ${report.warnings.length} warnings`);
} catch (e) { report.failure=String(e?.stack||e); console.error(report.failure); process.exitCode=1; }
finally { fs.writeFileSync(path.join(out, `${phase}.json`), JSON.stringify(report,null,2)+'\n'); await browser.close(); await server.close(); }

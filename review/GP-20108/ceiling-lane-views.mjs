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
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const report = { at: new Date().toISOString(), views: [], errors: [] };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20108 lane views';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }));
  await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg();T.trainingDbg.clear();T.setViewFirstDbg(true);T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-3);T.setVelDbg(0,0);T.setWorldTime(.5);for(let i=0;i<8;i++)T.stepFrame(.016)})()`);

  for (const name of ['lane-from-line', 'lane-mid-back']) {
    for (const off of [false, true]) {
      const state = await page.evaluate(`(()=>{
        const T=TT,tg=T.trainingDbg.tg(),o=tg.origin,y=tg.floorY;
        if (T.trainingDbg.lights().on===${off}) T.trainingDbg.toggleLights();
        const v=${JSON.stringify(name)}==='lane-from-line'
          ? {x:o.x,y:y+1.6,z:o.z-3,tx:o.x,ty:y+11.6,tz:o.z+7,fov:84}
          : {x:o.x,y:y+1.6,z:o.z+14,tx:o.x,ty:y+13.6,tz:o.z+2,fov:84};
        T.setShotView(v);for(let i=0;i<8;i++)T.stepFrame(.016);
        return {view:v,actualCamera:T.camera.position.toArray(),lights:T.trainingDbg.lights(),ceiling:tg.ceiling.state(),draws:T.renderer.info.render.drawCalls??T.renderer.info.render.calls??0};
      })()`);
      assert.equal(state.ceiling.visible, true);
      assert.equal(state.lights.on, !off);
      await pause(250);
      const file = `${name}-${off ? 'off' : 'noon'}.png`;
      await page.screenshot(path.join(out, file));
      report.views.push({ name, off, file, ...state });
    }
  }
  report.errors = page.errors.slice();
  assert.deepEqual(report.errors, []);
  console.log(`GP-20108 lane views: ${report.views.length} pictures, both eye directions and light states, ${report.errors.length} page errors`);
} catch (e) { report.failure = String(e?.stack || e); console.error(report.failure); process.exitCode = 1; }
finally { fs.writeFileSync(path.join(out, 'lane-views.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); await server.close(); }

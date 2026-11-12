import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20110');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720', '--disable-background-timer-throttling'] });
const report = {};
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&gp20110=sling`, { timeout: 120000 });
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 }), 'game ready');
  await page.evaluate(`(() => {
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'GP20110 sling';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }), 'Training visible');
  await new Promise(r => setTimeout(r, 12000));
  const camera = await page.evaluate(`(() => {
    const T=TT,tg=T.trainingDbg.tg();
    T.player.position.set(tg.origin.x-25,tg.floorY,tg.origin.z);
    T.setViewFirstDbg(false);T.setAimYawDbg(0);
    const p=T.player.position;
    return {x:p.x+0.8,y:p.y+3.2,z:p.z+1.4,tx:p.x,ty:p.y+1.05,tz:p.z,fov:32};
  })()`);
  report.camera = camera;
  const state = `(() => {
    const T=TT, rig=T.getMarine().userData.carry, c=T.carryDbg();
    return {slung:c.slung, slings:rig.slings.map((s,i)=>({index:i,kind:s.kind,gun:!!s.gun,
      visible:s.sling.visible,signature:s.sling.userData.signature??null,
      type:s.sling.geometry.type,positions:s.sling.geometry.getAttribute('position')?.count??0,
      placeholder:s.sling.geometry.type==='PlaneGeometry' && s.sling.geometry.parameters?.width===0.001,
      clips:s.sling.userData.clips?.length??0}))};
  })()`;
  const shoot = async name => {
    await page.evaluate(`TT.setShotView(${JSON.stringify(camera)})`);
    const file = path.join(out, name + '.png');
    for (let i=0;i<10;i++) {
      await new Promise(r => setTimeout(r, 450));
      await page.screenshot(file);
      if (fs.statSync(file).size > 100000) return;
    }
    throw Error('blank scene: ' + name);
  };
  await new Promise(r => setTimeout(r, 1200));
  report.noGuns = await page.evaluate(state);
  await shoot('sling-placeholder-no-guns-close');
  await page.evaluate('TT.grantAllWeapons()');
  await new Promise(r => setTimeout(r, 900));
  report.allGuns = await page.evaluate(state);
  await shoot('sling-placeholder-all-guns-close');
  assert(report.noGuns.slings.every(s => !s.gun && !s.visible), 'no-gun sling placeholders hidden');
  assert(report.allGuns.slings.every(s => s.gun && s.visible && !s.placeholder && s.positions > 4), 'guns use real ribbon geometry, not placeholders');
  assert.equal(page.errors.length, 0, 'page errors');
  console.log(JSON.stringify({noGuns:report.noGuns,allGuns:report.allGuns,pageErrors:page.errors}));
} catch (e) { report.error = String(e?.stack || e); console.error(report.error); process.exitCode = 1; }
finally { fs.writeFileSync(path.join(out, 'sling-placeholder-look.json'), JSON.stringify(report,null,2)+'\n'); await browser.close(); await server.close(); }

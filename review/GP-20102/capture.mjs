import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw Error('Usage: capture.mjs before|after');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20102');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const records = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20102';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 20000 }));
  const shot = async (name, time, cam, fall = 0) => {
    const rec = await page.evaluate(`((time,cam,fall)=>{
      const T=TT,tg=T.trainingDbg.tg(),target=tg.targets[2];
      T.setWorldTime(time);
      target.state='up';target.t=0;target.pivot.rotation.x=0;
      if(fall){tg.hitTarget(2,fall);for(let i=0;i<12;i++)tg.update(.02);}
      T.setShotView(cam);for(let i=0;i<5;i++)T.stepFrame(.016);
      return {time,fall,angle:target.pivot.rotation.x,camera:T.camera.position.toArray(),target:[target.x,target.z]};
    })(${time},${JSON.stringify(cam)},${fall})`);
    records.push({ name, ...rec });
    await page.screenshot(path.join(out, `${phase}-${name}.png`));
  };
  const front = { x: 0, y: -198.1, z: -633, tx: 0, ty: -198.3, tz: -624, fov: 38 };
  const side = { x: 2.2, y: -198.1, z: -624, tx: 0, ty: -198.5, tz: -624, fov: 43 };
  for (const [name, time] of [['noon', .5], ['overcast', .43], ['dusk', .74], ['night', .02]]) await shot(`front-${name}`, time, front);
  await shot('side-up', .5, side);
  await shot('side-downrange', .5, side, 1);
  await shot('side-toward-line', .5, side, -1);
  if (phase === 'after') {
    const rear = { x: 2.4, y: -197.9, z: -621.5, tx: 0, ty: -198.5, tz: -624, fov: 44 };
    const rearFall = { x: 4, y: -196.7, z: -618.5, tx: 0, ty: -199.4, tz: -624, fov: 50 };
    await shot('rear-three-up', .5, rear);
    await shot('rear-three-downrange', .5, rearFall, 1);
    await shot('rear-three-toward-line', .5, rearFall, -1);
  }
  fs.writeFileSync(path.join(out, `${phase}-records.json`), JSON.stringify(records, null, 2) + '\n');
  assert.deepEqual(page.errors, []);
  console.log(`PASS GP-20102 ${phase}: ${records.length} shots, both fall directions, 0 page errors`);
} finally {
  await browser.close();
  await server.close();
}

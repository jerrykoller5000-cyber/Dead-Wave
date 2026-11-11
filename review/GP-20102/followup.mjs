import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw Error('Usage: followup.mjs before|after');
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
  await page.evaluate(`(()=>{const c=TT.renderer.domElement,keep=new Set();for(let e=c;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const ch of document.body.children)if(!keep.has(ch))ch.style.setProperty('display','none','important')})()`);
  const shot = async (name, lane, fall, cam) => {
    const rec = await page.evaluate(`((lane,fall,cam)=>{
      const T=TT,tg=T.trainingDbg.tg(),t=tg.targets[lane];
      t.state='up';t.t=0;t.pivot.rotation.x=0;
      if(fall){tg.hitTarget(lane,fall);for(let i=0;i<12;i++)tg.update(.02);}
      T.setWorldTime(.5);T.setShotView(cam);for(let i=0;i<5;i++)T.stepFrame(.016);
      return {lane:t.lane,angle:t.pivot.rotation.x,camera:T.camera.position.toArray()};
    })(${lane},${fall},${JSON.stringify(cam)})`);
    records.push({ name, ...rec });
    await page.screenshot(path.join(out, `${phase}-${name}.png`));
  };
  const tg = await page.evaluate(`(()=>{const t=TT.trainingDbg.tg();return {origin:t.origin,targets:t.targets.map(q=>({x:q.x,z:q.z}))}})()`);
  for (let i=0;i<5;i++) {
    const t=tg.targets[i], x=tg.origin.x+t.x, z=tg.origin.z+t.z;
    await shot(`close-lane-${i+1}`, i, 0, { x, y: tg.origin.y+1.55, z:z-4.5, tx:x, ty:tg.origin.y+1.55, tz:z, fov:37 });
  }
  const t=tg.targets[2], x=tg.origin.x+t.x, z=tg.origin.z+t.z;
  const fallCam={x:x+3.5,y:tg.origin.y+2.5,z:z-1.2,tx:x,ty:tg.origin.y+.65,tz:z,fov:55};
  for (const [name,fall] of [['side-up',0],['side-downrange',1],['side-toward-line',-1]]) await shot(`clear-${name}`,2,fall,fallCam);
  if(phase==='after')await shot('far-all',2,0,{x:0,y:-198.1,z:-633,tx:0,ty:-198.3,tz:-624,fov:38});
  fs.writeFileSync(path.join(out, `${phase}-followup.json`), JSON.stringify(records,null,2)+'\n');
  assert.deepEqual(page.errors, []);
  console.log(`PASS GP-20102 ${phase} followup: ${records.length} clear shots, 0 page errors`);
} finally { await browser.close(); await server.close(); }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run --exclusive');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20100');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const start = source.indexOf('function heldWallPull('), end = source.indexOf('function heldWallPole(', start);
if (start < 0 || end < 0 || end - start > 3000) throw Error('Wall probe helper missing');
const measured = source.slice(start, end).replace('function heldWallPull(', 'function heldWallPullMeasured(');
const wrapper = `function heldWallPull(...args) { const t0 = performance.now(); const r = heldWallPullMeasured(...args); (window.__wallProbeTimes ||= []).push(performance.now() - t0); return r; }\n    `;
const file = path.join(out, 'probe-cost.html');
fs.writeFileSync(file, (source.slice(0, start) + measured + wrapper + source.slice(end)).replace('<head>', '<head>\n  <base href="/">'), 'utf8');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/review/GP-20100/probe-cost.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 90000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden', { timeout: 30000 });
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20100 probe cost';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 90000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 });
  await page.evaluate(`(()=>{
    const T=TT,y=T.trainingDbg.tg().floorY;
    T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(false);T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
    T.trainingDbg.tg().solids.push({minX:-1,maxX:1,minY:y,maxY:y+2.2,minZ:-640.42,maxZ:-640.32,wall:true});
    T.player.position.set(0,y,-641);T.setVelDbg(0,0);T.player.rotation.y=0;T.setOtsAimDbg(0,0);
    T.setShotView({x:2.2,y:y+1.9,z:-642.1,tx:0,ty:y+1.2,tz:-640.48,fov:42});
  })()`);
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(`(()=>{
    window.__wallProbeTimes=[]; TT.resetPerf(); const T=TT,y=T.trainingDbg.tg().floorY;
    window.__wallStarted=performance.now();window.__wallWalk=setInterval(()=>{
      const t=(performance.now()-window.__wallStarted)/1000;
      T.player.position.set(.35*Math.sin(t*.7),y,-641+.22*Math.sin(t*.31));
      T.setVelDbg(0,0);T.player.rotation.y=0;T.setOtsAimDbg(0,0);
    },16);
  })()`);
  await new Promise(r => setTimeout(r, 60000));
  const result = await page.evaluate(`(()=>{
    clearInterval(window.__wallWalk);
    const a=window.__wallProbeTimes.slice().sort((x,y)=>x-y),n=a.length,sum=a.reduce((x,y)=>x+y,0);
    return {durationMs:performance.now()-window.__wallStarted,calls:n,meanMs:sum/n,p50Ms:a[Math.floor(n*.5)],p95Ms:a[Math.floor(n*.95)],maxMs:a[n-1],fps:TT.perfSnapshot().fps};
  })()`);
  fs.writeFileSync(path.join(out, 'probe-cost.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (result.durationMs < 59000 || result.calls < 2000) throw Error('Insufficient 60 s wall walk samples');
} finally {
  await browser.close(); await server.close();
  try { fs.unlinkSync(file); } catch (e) { console.error('Temporary HTML cleanup failed:', e.message); }
}

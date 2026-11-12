// CB-311 (claude2): reproduce Jerry's J142a picture: Training, the Watchman MG shouldered, then knocked out (the infirmary).
// Pictures from the gameplay camera and from above at each step. Writes review/CB-311/repro-<step>-<view>.png and repro311.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-311');
const tag = process.env.TAG || 'before';
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const log = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-311';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
  await page.evaluate(`(()=>{ const T=TT; T.setViewFirstDbg(false); T.unlockAllBuilds && T.unlockAllBuilds(); window.__sim=async(s)=>{const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<90000) await new Promise(r=>setTimeout(r,40));};
    window.__state=()=>{ const M=T.m240VisDbg(), cg=M.carriedGun, p=T.player.position, THREE=T.THREE; let box=null; if (cg.visible){ cg.updateMatrixWorld(true); const b=new THREE.Box3().setFromObject(cg); box={min:b.min.toArray().map(v=>+(v).toFixed(2)),max:b.max.toArray().map(v=>+v.toFixed(2))}; }
      const ud=(T.getMarine?T.getMarine():window.worldMarine).userData; const sh=ud.armRG.getWorldPosition(new THREE.Vector3());
      const at=cg.getWorldPosition(new THREE.Vector3()); const ws=new THREE.Vector3(); cg.getWorldScale(ws);
      return { carried:M.carried, carryObj: !!T.getMortarCarried(), p:[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)], box, gunToShoulder:+at.distanceTo(sh).toFixed(3), scale:ws.toArray().map(v=>+v.toFixed(3)), wake: !!T.trainingDbg.state().wake, weaponShown: T.fuelDbg ? undefined : undefined }; };
    window.__top=()=>{ const p=T.player.position; T.setShotView({x:p.x-0.6,y:p.y+3.6,z:p.z-1.6,tx:p.x,ty:p.y+1.0,tz:p.z+0.1,fov:40}); };
  })()`);
  const shoot = async (step) => {
    for (const view of ['game', 'top']) {
      await page.evaluate(view === 'top' ? '__top()' : 'TT.setShotView(null)');
      await page.evaluate('__sim(0.3)', 60000);
      await page.screenshot(path.join(out, `repro-${tag}-${step}-${view}.png`));
    }
    const s = await page.evaluate('__state()');
    log.push({ step, ...s }); console.log(step, JSON.stringify(s));
  };
  await page.evaluate(`(async()=>{ const T=TT; T.grantAllWeapons(); await __sim(1); })()`, 120000);
  await shoot('1-armed');
  await page.evaluate(`(async()=>{ const T=TT, p=T.player.position, yaw=T.player.rotation.y; const g=T.spawnBuild('m240', p.x+Math.sin(yaw)*1.2, p.z+Math.cos(yaw)*1.2); T.mountMortar(g); await __sim(0.8); T.shoulderMortar(); await __sim(1.2); })()`, 180000);
  await shoot('2-shouldered');
  await page.evaluate(`(async()=>{ const T=TT; T.trainingDbg.blackout(); await __sim(1.0); })()`, 120000);
  await shoot('3-down');
  for (let i = 0; i < 6; i++) { await page.evaluate('__sim(3)', 120000); await shoot('4-wake' + i); }
  fs.writeFileSync(path.join(out, `repro311-${tag}.json`), JSON.stringify(log, null, 2));
} finally { await browser.close(); await server.close(); }

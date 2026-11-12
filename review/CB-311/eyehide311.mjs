// CB-311 (claude2): does first person's eye-hide (game/viewmodel.js setEyeHide: his arms, the gun in hand and the stowed
// guns' mounts left out of the main pass) stay on in third person after (A) shouldering the Watchman in first person,
// (B) dying in first person in Training (the blackout and the wake), (C) going back to third person by the view toggle?
// Pictures from close over his right shoulder (Jerry's camera) at each step. Writes review/CB-311/eye-<step>-<tag>.png, eyehide311-<tag>.json.
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
  await page.evaluate(`(()=>{ const T=TT; T.unlockAllBuilds && T.unlockAllBuilds(); T.grantAllWeapons(); T.setUnarmedDbg(false);
    window.__sim=async(s)=>{const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<120000) await new Promise(r=>setTimeout(r,40));};
    window.__st=()=>{ const vm=T.viewmodelDbg(), M=T.m240VisDbg(); const rig=T.carryDbg(); const hid=vm?[...vm.hidden]:[]; return { first: !!T.getViewFirst?.(), vmActive: vm?vm.info?.active:null, filtering: vm?vm.filtering:null, hidden: hid.length, hiddenOn: hid.filter(o=>vm.isEyeHidden(o)).length, carried:M.carried, slung:rig.slung, holstered:rig.holstered, weapon:T.getCurrentWeapon(), wake: !!T.trainingDbg.state().wake }; };
    window.__cam=()=>{ const p=T.player.position, y=T.player.rotation.y, c=Math.cos(y), s=Math.sin(y); const o=[0.9,2.6,-1.3], L=[0,1.1,0.1]; const tw=(v)=>({x:p.x+v[0]*c+v[2]*s, y:p.y+v[1], z:p.z-v[0]*s+v[2]*c}); const a=tw(o), b=tw(L); T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:40}); };
  })()`);
  const step = async (name, js, simS = 2) => {
    if (js) await page.evaluate(`(async()=>{ const T=TT; ${js} })()`, 240000);
    await page.evaluate(`__sim(${simS})`, 240000);
    const s = await page.evaluate('__st()'); log.push({ name, ...s }); console.log(name, JSON.stringify(s));
    await page.evaluate('__cam()'); await page.evaluate('__sim(0.3)', 60000);
    await page.screenshot(path.join(out, `eye-${name}-${tag}.png`));
    await page.evaluate('TT.setShotView(null)');
  };
  await step('0-3p', '');
  await step('1-1p', 'T.setViewFirstDbg(true);');
  await step('2-1p-shoulder', 'const p=T.player.position, yaw=T.player.rotation.y; const g=T.spawnBuild("m240", p.x+Math.sin(yaw)*1.2, p.z+Math.cos(yaw)*1.2); T.mountMortar(g); await __sim(0.8); T.shoulderMortar();');
  await step('3-setdown', 'const p=T.player.position, yaw=T.player.rotation.y; T.m240VisDbg().setDown(p.x+Math.sin(yaw)*2.5, p.z+Math.cos(yaw)*2.5, true);');
  await step('4-1p-again', 'T.setViewFirstDbg(true);');
  await step('5-1p-die', 'T.trainingDbg.blackout();', 9);
  await step('6-to-3p', 'T.setViewFirstDbg(false);');
  fs.writeFileSync(path.join(out, `eyehide311-${tag}.json`), JSON.stringify(log, null, 2));
} finally { await browser.close(); await server.close(); }

// CC-349 (claude3): Jerry's J152 note: his arms and hands at his sides, unarmed, standing, third person. Pictures from his
// right three-quarter, the right side, the front, and close on the right hand (side and front), in the Training Ground.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const phase = process.env.PHASE || 'before';
const LIGHTS = (process.env.LIGHTS || 'noon').split(','), LT = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
const out = path.join(root, 'review/CC-349', 'unarmed-' + phase); fs.mkdirSync(out, { recursive: true });
const V = { q34R: { cam: [1.7, 1.15, 1.25], look: [0, 0.95, 0] }, sideR: { cam: [2.2, 1.0, 0.0], look: [0, 0.95, 0] }, front: { cam: [0, 1.1, 2.3], look: [0, 0.95, 0] },
  handSide: { cam: [0.75, 0.85, 0.05], look: [0.2, 0.78, 0.05] }, handFront: { cam: [0.25, 0.85, 0.75], look: [0.2, 0.78, 0.02] } };
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const res = {};
// his right side is +x (armLG is on -x)
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 600000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 600000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 600000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CC-349';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 600000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 120000 });
  const sim = `(async (s)=>{ const T=TT; const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<90000) await new Promise(r=>setTimeout(r,40)); })`;
  await page.evaluate(`(()=>{ const T=TT; T.setViewFirstDbg(false); T.setUnarmedDbg(true); })()`);
  await page.evaluate(`${sim}(3)`, 120000);
  await new Promise((r) => setTimeout(r, 5000));
  res.pose = await page.evaluate(`(()=>{ const T=TT, m=T.getMarine(), u=m.userData; m.updateMatrixWorld(true); const W=(o)=>{const v=o.getWorldPosition(new T.THREE.Vector3()); return m.worldToLocal(v).toArray().map(x=>+x.toFixed(3));};
    return { unarmed:T.isUnarmed(), armR:u.armRG.rotation.toArray().slice(0,3).map(x=>+x.toFixed(3)), elbowR:u.elbowRG.rotation.toArray().slice(0,3).map(x=>+x.toFixed(3)), shoulderR:W(u.armRG), elbowRpos:W(u.elbowRG), handR: u.elbowRG.userData.wrist? W(u.elbowRG.userData.wrist):null, hipR: u.legRG? W(u.legRG):null }; })()`);
  console.log(JSON.stringify(res.pose));
  for (const light of LIGHTS) for (const [vid, v] of Object.entries(V)) {
    if (light !== 'noon' && vid.startsWith('hand')) continue;
    await page.evaluate(`(()=>{ const T=TT; T.setWorldTime(${LT[light]}); T.weather.raining=${light === 'overcast'}; const v=${JSON.stringify(v)};
      const yaw=T.player.rotation.y, c=Math.cos(yaw), s=Math.sin(yaw), p=T.player.position;
      const tw=(o)=>({x:p.x+o[0]*c+o[2]*s, y:p.y+o[1], z:p.z-o[0]*s+o[2]*c}); const a=tw(v.cam), b=tw(v.look);
      T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:40}); })()`);
    await page.evaluate(`${sim}(0.3)`, 60000);
    await page.screenshot(path.join(out, `${vid}-${light}.png`));
  }
} finally {
  fs.writeFileSync(path.join(root, 'review/CC-349', `unarmed-${phase}.json`), JSON.stringify(res, null, 1));
  await browser.close(); server.close && server.close(); setTimeout(() => process.exit(0), 2000);
}

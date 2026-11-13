// CC-347 (claude3): Jerry's fresh-load case: enter the Training Ground and look at the carry rig WITHOUT touching it
// (no carryDbg, which re-applies the plan): which straps, bands and shells show, and do their guns? Pictures rear/sides/top.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const phase = process.env.PHASE || 'before';
const LIGHTS = (process.env.LIGHTS || 'noon').split(','), LT = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
const out = path.join(root, 'review/CC-347', 'fresh-' + phase); fs.mkdirSync(out, { recursive: true });
const V = { game: null, rear: { cam: [-0.25, 1.45, -1.9], look: [0, 1.0, 0] }, sideR: { cam: [-1.9, 1.35, 0.15], look: [0, 1.0, 0] }, sideL: { cam: [1.9, 1.35, 0.15], look: [0, 1.0, 0] }, top: { cam: [0.5, 2.5, 1.1], look: [0, 0.95, -0.05] } };
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
let result = {};
const measure = `(()=>{ const T=TT, m=T.getMarine(); const rig=m.userData.carry; if(!rig) return {rig:false};
  const vis=(o)=>{ for(let q=o;q&&q!==m;q=q.parent) if(!q.visible) return false; return true; };
  const r={ bandolier: vis(rig.bandolier), belt40: vis(rig.belt40), harness: vis(rig.harness), straps: rig.slings.map(s=>vis(s.sling)&&!!s.sling.geometry&&s.sling.geometry.attributes.position.count>4), slungGuns: rig.slings.map(s=>!!s.gun),
    holsters: rig.holsters.map(h=>({g:vis(h.g), gun:!!h.gun, shell: h.shell?vis(h.shell):null})), pairs: rig.pairs.map(h=>({g:vis(h.g), gun:!!h.gun, shell: h.shell?vis(h.shell):null})),
    hip:{g:vis(rig.hip.g),gun:!!rig.hip.gun}, hipPair:{g:vis(rig.hipPair.g),gun:!!rig.hipPair.gun}, plan: rig.sig ? JSON.parse(rig.sig) : null };
  r.strayNoGun = []; rig.slings.forEach((s,i)=>{ if(r.straps[i] && !s.gun) r.strayNoGun.push('strap'+i); });
  if (r.bandolier && !(r.plan&&r.plan.bandolier)) r.strayNoGun.push('bandolier'); if (r.belt40 && !(r.plan&&r.plan.belt40)) r.strayNoGun.push('belt40');
  rig.pairs.forEach((h,i)=>{ if(vis(h.g) && !(r.plan&&r.plan.pairOn[i])) r.strayNoGun.push('pair'+i); }); if (vis(rig.hipPair.g) && !(r.plan&&r.plan.hipPairOn)) r.strayNoGun.push('hipPair');
  rig.holsters.forEach((h,i)=>{ if(vis(h.g) && !(r.plan&&r.plan.holsterOn[i])) r.strayNoGun.push('holster'+i); }); if (r.harness && !(r.plan&&r.plan.holsterOn.some(Boolean))) r.strayNoGun.push('harness');
  return r; })()`;
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 600000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 600000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 600000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CC-347';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 600000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 120000 });
  const sim = `(async (s)=>{ const T=TT; const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<90000) await new Promise(r=>setTimeout(r,40)); })`;
  await page.evaluate(`${sim}(1.5)`, 120000);
  result.afterWarm = await page.evaluate(measure); console.log('afterWarm', JSON.stringify(result.afterWarm));
  await page.evaluate(`(()=>{ const T=TT; T.setViewFirstDbg(false); const p=T.player.position; window.__home={x:p.x,y:p.y,z:p.z,yaw:T.player.rotation.y}; })()`);
  await page.evaluate(`${sim}(1.0)`, 120000);
  result.after3p = await page.evaluate(measure); console.log('after3p', JSON.stringify(result.after3p));
  for (const light of LIGHTS) for (const [vid, v] of Object.entries(V)) {
    await page.evaluate(`(()=>{ const T=TT; T.setWorldTime(${LT[light]}); T.weather.raining=${light === 'overcast'}; const v=${JSON.stringify(v)}; if(!v){ T.setShotView(null); return; }
      const h=window.__home, yaw=T.player.rotation.y, c=Math.cos(yaw), s=Math.sin(yaw), p=T.player.position;
      const tw=(o)=>({x:p.x+o[0]*c+o[2]*s, y:h.y+o[1], z:p.z-o[0]*s+o[2]*c}); const a=tw(v.cam), b=tw(v.look);
      T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:40}); })()`);
    await page.evaluate(`${sim}(0.3)`, 60000);
    await page.screenshot(path.join(out, `${vid}-${light}.png`));
  }
  result.end = await page.evaluate(measure);
} finally {
  fs.writeFileSync(path.join(root, 'review/CC-347', `fresh-${phase}.json`), JSON.stringify(result, null, 1));
  await browser.close(); server.close && server.close(); setTimeout(() => process.exit(0), 2000);
}

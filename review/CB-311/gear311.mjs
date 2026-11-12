// CB-311 (claude2): Jerry's J142a picture: the gear on his back in Training (third person from above).
// Shoulders the Watchman MG in the Training Ground and pictures it from the gameplay camera and from fixed rear/side/top
// cameras, in the four lights. PHASE=before|after (the page is index.html as it is; for before, run on the before tree).
// Writes review/CB-311/<view>-<light>-<phase>.png and gear311-<phase>.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-311');
const phase = process.env.PHASE || 'before';
const LIGHTS = process.env.LIGHTS ? Object.fromEntries(process.env.LIGHTS.split(',').map((k) => [k, { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 }[k]])) : { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
const MODE = process.env.MODE || 'm240';   // m240 | none
// offsets from him (he faces +z): cam, look
const VIEWS = [
  { id: 'game' },
  { id: 'top', cam: [-0.6, 3.6, -1.6], look: [0, 1.0, 0.1] },
  { id: 'rear', cam: [-0.4, 1.7, -2.6], look: [0, 1.2, 0] },
  { id: 'side', cam: [2.6, 1.5, 0.2], look: [0, 1.15, 0] },
];
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const results = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-311';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
  const info = await page.evaluate(`(async ()=>{ const T=TT; T.setViewFirstDbg(false); T.unlockAllBuilds && T.unlockAllBuilds(); T.setHp && T.setHp(100000);
    const y=T.trainingDbg.tg().floorY; const p=T.player.position; window.__home={x:p.x,y:p.y,z:p.z};
    const wait=(ms)=>new Promise(r=>setTimeout(r,ms)); const sim=async(s)=>{const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<60000) await wait(40);};
    let r={home:window.__home, floorY:y};
    if (${JSON.stringify(MODE)}==='m240') {
      const yaw=T.player.rotation.y; const gx=p.x+Math.sin(yaw)*1.2, gz=p.z+Math.cos(yaw)*1.2;
      const g=T.spawnBuild('m240', gx, gz); r.spawned=!!g; r.mounted=T.mountMortar(g); await sim(0.8); T.shoulderMortar(); await sim(1.2);
      const V=T.m240VisDbg(); r.carried=V.carried; r.carriedMortar=V.carriedMortar;
      const cg=V.carriedGun; cg.updateMatrixWorld(true); const THREE=T.THREE; const box=new THREE.Box3().setFromObject(cg); r.box={min:box.min.toArray().map(v=>+v.toFixed(2)),max:box.max.toArray().map(v=>+v.toFixed(2))};
      const ws=new THREE.Vector3(); cg.getWorldScale(ws); r.worldScale=ws.toArray().map(v=>+v.toFixed(3));
      r.playerScale=T.player.scale.toArray(); r.marineScale=(T.getMarine?T.getMarine():window.worldMarine).scale.toArray();
    }
    const h=T.player.position; window.__home={x:h.x,y:h.y,z:h.z,yaw:T.player.rotation.y}; r.home=window.__home;
    return r; })()`, 300000);
  console.log(JSON.stringify(info));
  for (const V of VIEWS) {
    for (const [light, t] of Object.entries(LIGHTS)) {
      const r = await page.evaluate(`(async (V,t,l)=>{ const T=TT; T.setWorldTime(t); T.weather.raining = l==='overcast';
        const h=window.__home, c=Math.cos(h.yaw), s=Math.sin(h.yaw); const tw=(o)=>({x:h.x+o[0]*c+o[2]*s, y:h.y+o[1], z:h.z-o[0]*s+o[2]*c});
        if (V.cam) { const a=tw(V.cam), b=tw(V.look); T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:40}); } else T.setShotView(null);
        const s0=T.getSimTime(), w0=Date.now(); while (T.getSimTime()-s0<0.6 && Date.now()-w0<30000) await new Promise(r=>setTimeout(r,50));
        const M=T.m240VisDbg(); return { carried:M.carried, carriedMortar:M.carriedMortar };
      })(${JSON.stringify(V)},${t},${JSON.stringify(light)})`, 120000);
      await page.screenshot(path.join(out, `${MODE}-${V.id}-${light}-${phase}.png`));
      results.push({ view: V.id, light, ...r });
      console.log(V.id, light, JSON.stringify(r));
    }
  }
  fs.writeFileSync(path.join(out, `gear311-${MODE}-${phase}.json`), JSON.stringify({ info, results }, null, 2));
} finally { await browser.close(); await server.close(); }

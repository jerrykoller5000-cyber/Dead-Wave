// CD-8 (claude2's part, J142d/e in third person): the support hand on the pistol (its thumb) and on the revolver, from close
// cameras round the hands, at rest aim and shouldered (RMB). Writes review/CD-8/tp-<gun>-<pose>-<view>-<tag>.png and tp-hands-<tag>.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CD-8');
const tag = process.env.TAG || 'before';
const LIGHT = +(process.env.LIGHT || 0.42);
// offsets from him (facing +z): cam, look
// cameras 0.55 m from the middle of his two hands (world offsets; he faces +z): his left, his right, above, from the front-left below
const VIEWS = [
  { id: 'left', d: [0.55, 0.08, 0.05] },
  { id: 'right', d: [-0.55, 0.08, 0.05] },
  { id: 'top', d: [0.02, 0.55, -0.05] },
  { id: 'front-low', d: [0.25, -0.25, 0.45] },
];
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
const res = [];
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const PAGE = process.env.PAGE || 'index.html';
  await page.goto(`${server.origin}/${PAGE}?debug=1&raf=timer`, { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CD-8';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
  await page.evaluate(`(()=>{ const T=TT; T.grantAllWeapons(); T.setUnarmedDbg(false); T.setViewFirstDbg(false); T.setWorldTime(${LIGHT}); if (${!!process.env.TINT}) { const ud=(T.getMarine?T.getMarine():window.worldMarine).userData; const red=new T.THREE.MeshBasicMaterial({color:0xff2020}); const blu=new T.THREE.MeshBasicMaterial({color:0x2060ff}); const wl=ud.elbowLG.userData.wrist, wr=ud.elbowRG.userData.wrist; if(wl) wl.traverse(o=>{ if(o.isMesh) o.material=red; }); if(wr) wr.traverse(o=>{ if(o.isMesh) o.material=blu; }); }
    const y=T.trainingDbg.tg().floorY; window.__home={x:0,y,z:-645}; window.__zoom=false;
    window.__sim=async(s)=>{const s0=T.getSimTime(),w0=Date.now(); while(T.getSimTime()-s0<s&&Date.now()-w0<90000) await new Promise(r=>setTimeout(r,40));};
    setInterval(()=>{ const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.setVelDbg(0,0); T.aimTarget.set(h.x, h.y+1.25, h.z+10); T.setZoomHeldDbg(window.__zoom); }, 5); })()`);
  for (const w of ['pistol', 'revolver']) {
    for (const pose of ['hold']) {
      const r = await page.evaluate(`(async()=>{ const T=TT; window.__zoom=${pose === 'aimed'}; for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++) T.setWeapon(i); await __sim(2.2);
        const H=T.handsDbg, gun=T.weaponMeshes['${w}']; const V=T.THREE.Vector3; const gr=H.gripPoint('R'), gl=H.gripPoint('L'); gun.updateMatrixWorld(true);
        const inGun=(p)=>gun.worldToLocal(p.clone()).toArray().map(v=>+v.toFixed(3));
        window.__mid=gr.clone().add(gl).multiplyScalar(0.5); return { weapon:T.getCurrentWeapon(), sh:T.getShoulderDbg().w, ads:T.getShoulderDbg().ads, gripR:inGun(gr), gripL:inGun(gl), lr:+gr.distanceTo(gl).toFixed(3), hits:T.bodyLimitsDbg().hits }; })()`, 180000);
      console.log(w, pose, JSON.stringify(r)); res.push({ w, pose, ...r });
      for (const V of VIEWS) {
        await page.evaluate(`(async()=>{ const T=TT,h=window.__home,V=${JSON.stringify(V)}; const m=window.__mid; T.setShotView({x:m.x+V.d[0],y:m.y+V.d[1],z:m.z+V.d[2],tx:m.x,ty:m.y,tz:m.z,fov:32}); await __sim(0.3); })()`, 60000);
        await page.screenshot(path.join(out, `tp-${w}-${pose}-${V.id}-${tag}.png`));
      }
      await page.evaluate('TT.setShotView(null)');
    }
  }
  fs.writeFileSync(path.join(out, `tp-hands-${tag}.json`), JSON.stringify(res, null, 2));
} finally { await browser.close(); await server.close(); }

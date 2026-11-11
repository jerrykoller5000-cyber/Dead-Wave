// CB-307 (claude2): the heavy barrel sleeve takes dressed camo (gunHeavyLook markPaintSurface) before/after,
// in the four lights, same cameras. 'before' is index.html without that line (the sleeve unpainted); 'after' is index.html
// as it is. Modelled on review/GP-20100/lights-final.mjs.
// Run through the slot: node crew/crew.mjs slot run <you> CB-307 --checks "CB-307 four lights" -- node review/CB-307/lights307.mjs
// (HEADLESS=1 for a box with no screen). Writes review/CB-307/<scene>-<light>-<phase>.png and lights307.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-307');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const key = "for (const part of g.children) markPaintSurface(part, 'heavy barrel');";
if (source.indexOf(key) < 0) throw Error('sleeve paint line missing');
const before = source.replace(key, '');
const pages = { before, after: source };
for (const [phase, html] of Object.entries(pages)) fs.writeFileSync(path.join(out, `live-${phase}.html`), html.replace('<head>', '<head>\n  <base href="/">'), 'utf8');
const LIGHTS = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
// he stands at home facing +z; aim, camera and look are offsets from home
const SCENES = [
  { id: 'm4-heavy-camo-side', w: 'm4', aim: [0, 1.25, 10], cam: [0.95, 1.45, 0.75], look: [0.1, 1.3, 0.75] },
  { id: 'm4-heavy-camo-front', w: 'm4', aim: [0, 1.25, 10], cam: [0.7, 1.55, 1.9], look: [0.1, 1.3, 0.7] },
];
const server = await serve(root, 0);
const headless = !!process.env.HEADLESS;
const browser = await launch({ headless, args: ['--window-size=1280,720'] });
const results = [];
try {
  for (const phase of ['before', 'after']) {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/review/CB-307/live-${phase}.html?debug=1${headless ? '&raf=timer' : ''}`, { timeout: 400000 });
    if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error(`${phase} load failed`);
    await page.evaluate('DWOpening.dismissForTesting()');
    if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error(`${phase}: the opening stayed up`);
    await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-290 lights';document.getElementById('modeTraining').click();})()`);
    if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error(`${phase} Training failed`);
    await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
    await page.evaluate(`(()=>{ const T=TT; T.grantAllWeapons(); T.setUnarmedDbg(false); T.setViewFirstDbg(false); T.addCash(10000); T.buyHeavyBarrel('m4'); T.fitWeaponMod('m4', 'heavy'); T.dressGuns({ guns: { m4: 'multicam' } });
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
      const y=T.trainingDbg.tg().floorY; window.__home={x:0,y,z:-645}; window.__aim=[0,1.25,10];
      setInterval(()=>{ const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.setVelDbg(0,0); T.aimTarget.set(h.x+__aim[0], h.y+__aim[1], h.z+__aim[2]); }, 5); })()`);
    for (const S of SCENES) {
      await page.evaluate(`(async (S)=>{ const T=TT; window.__aim=S.aim; T.marineIdleDbg && T.marineIdleDbg().reset();
        for (let i=0;i<16&&T.getCurrentWeapon()!==S.w;i++) T.setWeapon(i);
        await new Promise(r=>setTimeout(r,2600));
        const s0=T.getSimTime(), w0=Date.now(); while (T.getSimTime()-s0<2 && Date.now()-w0<60000) await new Promise(r=>setTimeout(r,50));
        const h=window.__home; T.setShotView({x:h.x+S.cam[0],y:h.y+S.cam[1],z:h.z+S.cam[2],tx:h.x+S.look[0],ty:h.y+S.look[1],tz:h.z+S.look[2],fov:40});
        return true; })(${JSON.stringify(S)})`, 300000);
      for (const [light, t] of Object.entries(LIGHTS)) {
        const r = await page.evaluate(`(async (S,t,l)=>{ const T=TT; T.setWorldTime(t); T.weather.raining = l==='overcast';
          const s0=T.getSimTime(), w0=Date.now(); while (T.getSimTime()-s0<0.5 && Date.now()-w0<30000) await new Promise(r=>setTimeout(r,50));
          const V=T.THREE.Vector3, gun=T.weaponMeshes[S.w]; gun.updateMatrixWorld(true);
          const fwd=new V(0,0,1).transformDirection(gun.matrixWorld), muz=gun.localToWorld(gun.userData.muzzleLocal.clone());
          const aimErr=Math.acos(Math.max(-1,Math.min(1,fwd.dot(new V().subVectors(T.getWeaponAimDbg(),muz).normalize()))))*180/Math.PI;
          return { weapon:T.getCurrentWeapon(), held: gun.visible, aimErr:+aimErr.toFixed(2), hits:T.bodyLimitsDbg().hits };
        })(${JSON.stringify(S)},${t},${JSON.stringify(light)})`, 120000);
        results.push({ phase, scene: S.id, light, ...r });
        await page.screenshot(path.join(out, `${S.id}-${light}-${phase}.png`));
        console.log(phase, S.id, light, JSON.stringify(r).slice(0, 160));
      }
    }
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'lights307.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); await server.close(); }

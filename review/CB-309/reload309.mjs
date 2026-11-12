// CB-307 (claude2, 11 Nov; CLAUDE DIRECTOR's (a)): the sniper's bolt worked by the FIRING hand in third person, before/after,
// same cameras. 'before' is index.html with the hand's move switched off (the knob line in holdShoulderGun); 'after' as it is.
// Real time, as Jerry plays it: a shot each picture, the picture taken as the cycle passes its moment (c, 0..1), the c it
// was taken at recorded (at a few frames a second here, within about 0.07 of the cycle). Stepped frames (flightHold +
// stepFrame) drew the arms as they were before the hold, so they are not used.
// Run: node crew/crew.mjs slot run <you> CB-307 --checks "CB-307 bolt pictures" -- node review/CB-309/reload309.mjs  (HEADLESS=1 with no screen)
// Writes review/CB-309/bolt-<view>-<light>-c<cycle>-<phase>.png and reload309.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-309');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const key = 'if (bw > 0 && sniperKnobWorld(';   // before: the firing hand never leaves the grip
if (source.indexOf(key) < 0) throw Error('the bolt hand line is missing');
const pages = { before: source.replace(key, 'if (false && sniperKnobWorld('), after: source };
for (const [phase, html] of Object.entries(pages)) fs.writeFileSync(path.join(out, `live-bolt-${phase}.html`), html.replace('<head>', '<head>\n  <base href="/">'), 'utf8');
const LIGHTS = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
// he stands at home facing +z (his right is +x); camera and look are offsets from home
// the cameras are offsets from the knob at rest (his right +x, up, forward +z): close on the action
const VIEWS = {
  side: { cam: [0.62, 0.12, 0.10] },
  rear: { cam: [0.42, 0.30, -0.55] },
};
const STRIP = [0.58, 0.66, 0.74, 0.82, 0.90];   // the reload: the magazine home, the bolt worked (0.62-0.96)
const server = await serve(root, 0);
const headless = !!process.env.HEADLESS;
const browser = await launch({ headless, args: ['--window-size=1280,720'] });
const results = [];
try {
  for (const phase of (process.env.PHASES || 'before,after').split(',')) {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/review/CB-309/live-bolt-${phase}.html?debug=1${headless ? '&raf=timer' : ''}`, { timeout: 400000 });
    if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 400000 })) throw Error(`${phase} load failed`);
    await page.evaluate('DWOpening.dismissForTesting()');
    if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 500000 })) throw Error(`${phase}: the opening stayed up`);
    await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-307 bolt';document.getElementById('modeTraining').click();})()`);
    if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 400000 })) throw Error(`${phase} Training failed`);
    await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 });
    await page.evaluate(`(async ()=>{ const T=TT; T.grantAllWeapons(); T.setUnarmedDbg(false); T.setViewFirstDbg(false);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));
      const y=T.trainingDbg.tg().floorY; window.__home={x:0,y,z:-645};
      window.__pin=()=>{ const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.setVelDbg(0,0); T.aimTarget.set(h.x, h.y+1.25, h.z+10); };
      setInterval(window.__pin, 5);
      for (let i=0;i<16&&T.getCurrentWeapon()!=='sniper';i++) T.setWeapon(i);
      await new Promise(r=>setTimeout(r,2600));
      const s0=T.getSimTime(), w0=Date.now(); while (T.getSimTime()-s0<2 && Date.now()-w0<60000) await new Promise(r=>setTimeout(r,50));
      const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style){visibility:hidden!important}';document.head.append(css);
      return true; })()`, 300000);
    // One moment of the reload (u, 0..1): the camera and the light set, a reload started with one round left, held at u
    // (TT.reloadClipDbg.hold), a few frames, the picture; then let go and wait for it to end.
    const shot = async (name, view, c, light) => {
      const r = await page.evaluate(`(async (V,t,l,u)=>{ const T=TT, gun=T.weaponMeshes.sniper, b=gun.userData.bolt, R=T.reloadClipDbg, W=()=>new T.THREE.Vector3();
        if (!b.userData.gb145Grab) throw Error('no knob grab point');
        if (!window.__look) window.__look = b.localToWorld(b.userData.gb145Grab.clone());
        const L=__look; T.setShotView({x:L.x+V.cam[0],y:L.y+V.cam[1],z:L.z+V.cam[2],tx:L.x,ty:L.y-0.03,tz:L.z+0.05,fov:34});
        T.setWorldTime(t); T.weather.raining = l==='overcast';
        T.setAmmoDbg('sniper', 1); if (T.setMagazinesDbg && T.magazinesDbg && T.magazinesDbg('sniper')) T.setMagazinesDbg('sniper', 1, [99, 99, 99], 1);
        T.startReload(); await new Promise(r=>setTimeout(r,200)); if (!T.getReloadDbg().weapon) return { started: false };
        R.hold(u); const s0=T.getSimTime(), w0=Date.now(); while (T.getSimTime()-s0<0.3 && Date.now()-w0<8000) await new Promise(r=>setTimeout(r,30));
        await new Promise(r=>setTimeout(r,800));
        const ud=(T.marine||window.worldMarine).userData, gp=T.handsDbg&&T.handsDbg.gripPoint, k=b.localToWorld(b.userData.gb145Grab.clone());
        const pr = gp ? gp('R', W()) : ud.gripR.getWorldPosition(W());
        return { started: true, u, firingToKnob: +pr.distanceTo(k).toFixed(3) }; })(${JSON.stringify(VIEWS[view])},${LIGHTS[light]},${JSON.stringify(light)},${c})`, 120000);
      await page.screenshot(path.join(out, `${name}-${phase}.png`));
      results.push({ phase, name, view, light, ...r }); console.log(phase, name, JSON.stringify(r));
      await page.evaluate(`(async ()=>{ TT.reloadClipDbg.hold(null); for (let i=0;i<100&&TT.getReloadDbg().weapon;i++) await new Promise(r=>setTimeout(r,100)); await new Promise(r=>setTimeout(r,300)); })()`, 60000);
    };
    for (const c of STRIP) await shot(`reload-side-noon-u${String(Math.round(c * 100)).padStart(2, '0')}`, 'side', c, 'noon');
    for (const light of Object.keys(LIGHTS)) for (const view of ['side', 'rear']) await shot(`reload-${view}-${light}-u78`, view, 0.78, light);
    await page.close();
  }
  fs.writeFileSync(path.join(out, `reload309-${(process.env.PHASES || 'all').replace(',', '-')}.json`), JSON.stringify(results, null, 2));
} finally { await browser.close(); await server.close(); }

// CB-307 (claude2, 11 Nov; CLAUDE DIRECTOR's (a)): the sniper's bolt worked by the FIRING hand in third person, before/after,
// same cameras. 'before' is index.html with the hand's move switched off (the knob line in holdShoulderGun); 'after' as it is.
// Real time, as Jerry plays it: a shot each picture, the picture taken as the cycle passes its moment (c, 0..1), the c it
// was taken at recorded (at a few frames a second here, within about 0.07 of the cycle). Stepped frames (flightHold +
// stepFrame) drew the arms as they were before the hold, so they are not used.
// Run: node crew/crew.mjs slot run <you> CB-307 --checks "CB-307 bolt pictures" -- node review/CB-307/bolt307.mjs  (HEADLESS=1 with no screen)
// Writes review/CB-307/bolt-<view>-<light>-c<cycle>-<phase>.png and bolt307.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/CB-307');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const key = 'if (bw > 0 && sniperKnobWorld(';
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
const STRIP = [0.1, 0.3, 0.5, 0.7, 0.85, 0.95];   // the cycle: the hand going, up, back, forward, down, the hand back
const server = await serve(root, 0);
const headless = !!process.env.HEADLESS;
const browser = await launch({ headless, args: ['--window-size=1280,720'] });
const results = [];
try {
  for (const phase of (process.env.PHASES || 'before,after').split(',')) {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/review/CB-307/live-bolt-${phase}.html?debug=1${headless ? '&raf=timer' : ''}`, { timeout: 400000 });
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
    // One moment: the camera and the light set, a full magazine, a shot, the picture as the bolt cycle reaches c.
    const shot = async (name, view, c, light) => {
      await page.evaluate(`(async (V,t,l)=>{ const T=TT, gun=T.weaponMeshes.sniper, b=gun.userData.bolt;
        if (!b.userData.gb145Grab) throw Error('no knob grab point');
        if (!window.__look) window.__look = b.localToWorld(b.userData.gb145Grab.clone());
        const L=__look; T.setShotView({x:L.x+V.cam[0],y:L.y+V.cam[1],z:L.z+V.cam[2],tx:L.x,ty:L.y-0.03,tz:L.z+0.05,fov:34});
        T.setWorldTime(t); T.weather.raining = l==='overcast'; T.setAmmoDbg('sniper', 5);
        const w0=Date.now(); while (Date.now()-w0<20000 && ((gun.userData.boltCycle||{}).active || T.getSwapDbg().fireCooldown > 0)) await new Promise(r=>setTimeout(r,50));
        const s0=T.getSimTime(); while (T.getSimTime()-s0<0.4 && Date.now()-w0<30000) await new Promise(r=>setTimeout(r,50));
        return true; })(${JSON.stringify(VIEWS[view])},${LIGHTS[light]},${JSON.stringify(light)})`, 120000);
      // The cycle held at c from inside the page (its clock set back to c every 5 ms), so the picture is that moment.
      await page.evaluate(`(()=>{ window.__freezeC = ${c}; if (!window.__freezer) window.__freezer = setInterval(() => { const S = TT.weaponMeshes.sniper.userData.boltCycle;
        if (S && S.active && window.__freezeC != null && S.c >= window.__freezeC - 0.08) S.t = S.from + window.__freezeC * (S.to - S.from); }, 5);
        TT.setMouseFireDbg(true); setTimeout(()=>TT.setMouseFireDbg(false), 300); })()`);
      const ok = await page.waitFor(`(()=>{ const S=TT.weaponMeshes.sniper.userData.boltCycle||{}; return S.active && S.c >= ${c} - 0.01; })()`, { timeout: 30000, every: 50 });
      await new Promise((res) => setTimeout(res, 1500));   // a few frames at that moment
      await page.screenshot(path.join(out, `${name}-${phase}.png`));
      const r = await page.evaluate(`(()=>{ const T=TT, gun=T.weaponMeshes.sniper, S=gun.userData.boltCycle||{}, ud=(T.marine||window.worldMarine).userData, b=gun.userData.bolt, W=()=>new T.THREE.Vector3();
        const k=b.localToWorld(b.userData.gb145Grab.clone()), wr=ud.elbowRG.getObjectByName('wrist'), ch=wr.localToWorld(W().copy(wr.userData.grip).sub(wr.position));
        const H=T.getShoulderDbg().holds.sniper, fore=gun.localToWorld(W().set(...H.fore)), pl=ud.elbowLG.localToWorld(W().set(0.02,-0.27,0.13));
        return { reached: ${ok}, c: +(S.c||0).toFixed(2), open: +(S.open||0).toFixed(2), back: +(S.back||0).toFixed(2), hand: +(S.hand||0).toFixed(2),
          firingToKnob: +ch.distanceTo(k).toFixed(3), supportToFore: +pl.distanceTo(fore).toFixed(3), hits: T.bodyLimitsDbg ? T.bodyLimitsDbg().hits : null }; })()`);
      results.push({ phase, name, view, light, want: c, ...r }); console.log(phase, name, JSON.stringify(r));
      await page.evaluate('window.__freezeC = null');
    };
    for (const c of STRIP) await shot(`bolt-side-noon-c${String(Math.round(c * 100)).padStart(2, '0')}`, 'side', c, 'noon');
    for (const light of Object.keys(LIGHTS)) for (const view of ['side', 'rear']) await shot(`bolt-${view}-${light}-c50`, view, 0.5, light);
    await page.close();
  }
  fs.writeFileSync(path.join(out, `bolt307-${(process.env.PHASES || 'all').replace(',', '-')}.json`), JSON.stringify(results, null, 2));
} finally { await browser.close(); await server.close(); }

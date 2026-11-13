// CC-347 part 2 (claude3): before/after pictures of the carried gear, same cameras, four lights. Training Ground, third
// person; each loadout applied through TT.carryDbg(o) (+ the real plate carrier on/off), the carry refresh held so the shot
// shows that plan. PHASE=before|after -> review/CC-347/cap-<phase>/<cfg>-<view>-<light>.png. One game instance (rule 16).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const phase = process.env.PHASE || 'before';
const out = path.join(root, 'review/CC-347', 'cap-' + phase); fs.mkdirSync(out, { recursive: true });
const LT = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
const LIGHTS = (process.env.LIGHTS || 'noon,overcast,dusk,night').split(',');
const VIEWS = { game: null, rear: { cam: [0.0, 1.15, -1.7], look: [0, 0.95, -0.1] }, sideR: { cam: [1.6, 1.1, -0.2], look: [0, 0.95, -0.1] },
  sideL: { cam: [-1.6, 1.1, -0.2], look: [0, 0.95, -0.1] }, front: { cam: [0.6, 1.35, 1.6], look: [0, 1.0, 0] } };
const ALL = { revolver: true, uzi: true, pistol: true };
const CONFIGS = [
  { id: 'A-rifles', o: { loadout: { primary: ['m4', 'shotgun'], secondary: ['revolver', 'uzi'] }, inHand: null, akimbo: false, vest: true, grenades: 4, dualOwned: ALL } },
  { id: 'B-heavy', o: { loadout: { primary: ['minigun', 'flamer'], secondary: ['pistol', 'revolver'] }, inHand: null, akimbo: false, vest: false, grenades: 2, dualOwned: {} } },
  { id: 'C-sniper', o: { loadout: { primary: ['sniper', 'launcher'], secondary: ['revolver', null] }, inHand: null, akimbo: false, vest: true, grenades: 3, dualOwned: {} } },
  { id: 'D-ak', o: { loadout: { primary: ['ak', 'aa12'], secondary: ['pistol', null] }, inHand: null, akimbo: false, vest: false, grenades: 4, dualOwned: { pistol: true } } },
  { id: 'E-saw', o: { loadout: { primary: ['chainsaw', 'flamer'], secondary: ['uzi', 'revolver'] }, inHand: null, akimbo: false, vest: true, grenades: 1, dualOwned: ALL } },
];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const server = await serve(root, 0);
const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 600000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 600000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 600000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CC-347';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 600000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 120000 });
  await page.evaluate(`(()=>{ const T=TT; T.setViewFirstDbg(false); const p=T.player.position; window.__home={x:p.x,y:p.y,z:p.z,yaw:T.player.rotation.y}; })()`);
  for (const C of CONFIGS) {
    if (only && !only.includes(C.id)) continue;
    const apply = `(()=>{ const T=TT, C=${JSON.stringify(C)}; const g=T.getGearOwned(); if(!!g.vest!==!!C.o.vest){ g.vest=!!C.o.vest; T.applyGearVisibility(); } const d=T.carryDbg(C.o); T.getMarine().userData.carry.t=1e6; return d; })()`;
    console.log(C.id, JSON.stringify(await page.evaluate(apply)));
    for (const [vid, V] of Object.entries(VIEWS)) for (const light of LIGHTS) {
      if (C.id !== 'A-rifles' && (light !== 'noon' || vid === 'front')) continue;   // four lights on Jerry's Training loadout; the rest at noon
      await page.evaluate(`(async ()=>{ const T=TT, V=${JSON.stringify(V)}; T.setWorldTime(${LT[light]}); T.weather.raining=${light === 'overcast'};
        if(!V){ T.setShotView(null); } else { const h=window.__home, c=Math.cos(h.yaw), s=Math.sin(h.yaw); const tw=(o)=>({x:h.x+o[0]*c+o[2]*s, y:h.y+o[1], z:h.z-o[0]*s+o[2]*c});
        const a=tw(V.cam), b=tw(V.look); T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:34}); }
        await new Promise(r=>setTimeout(r,500)); ${apply}; await new Promise(r=>setTimeout(r,150)); })()`, 120000);
      await page.screenshot(path.join(out, `${C.id}-${vid}-${light}.png`));
    }
  }
} catch (e) { console.log('ERR', e && e.stack || e); } finally {
  await browser.close(); server.close && server.close(); setTimeout(() => process.exit(0), 2000);
}

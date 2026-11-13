// CC-347 part 2 (claude3): before/after pictures of the carried gear, same cameras, four lights. capture2: the Director's set:
// back and three-quarter back, standing, walking mid-stride and crouched, with the revolver, two handguns and akimbo. Training Ground, third
// person; each loadout applied through TT.carryDbg(o) (+ the real plate carrier on/off), the carry refresh held so the shot
// shows that plan. PHASE=before|after -> review/CC-347/cap-<phase>/<cfg>-<view>-<light>.png. One game instance (rule 16).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const phase = process.env.PHASE || 'before';
const out = path.join(root, 'review/CC-347', 'pose-' + phase); fs.mkdirSync(out, { recursive: true });
const LT = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
const LIGHTS = (process.env.LIGHTS || 'noon,overcast,dusk,night').split(',');
const VIEWS = { back: { cam: [0.0, 1.25, -1.9], look: [0, 0.9, -0.1] }, q34: { cam: [1.3, 1.3, -1.4], look: [0, 0.9, -0.1] } };
const ALL = { revolver: true, uzi: true, pistol: true };
const CONFIGS = [
  { id: 'revolver', o: { loadout: { primary: ['m4', 'shotgun'], secondary: ['revolver', null] }, inHand: null, akimbo: false, vest: true, grenades: 4, dualOwned: {} } },
  { id: 'two', o: { loadout: { primary: ['ak', 'sniper'], secondary: ['pistol', 'revolver'] }, inHand: null, akimbo: false, vest: false, grenades: 4, dualOwned: {} } },
  { id: 'akimbo', o: { loadout: { primary: ['m4', 'shotgun'], secondary: ['revolver', 'uzi'] }, inHand: null, akimbo: false, vest: true, grenades: 4, dualOwned: ALL } },
];
const POSES = { stand: "press([]); step(20);", walk: "press(['KeyW']); step(13);", crouch: "press(['KeyC']); step(26);" };
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
    for (const [pid, pose] of Object.entries(POSES)) {
      console.log(C.id, pid, JSON.stringify(await page.evaluate(apply)).slice(0, 200));
      await page.evaluate(`(()=>{ const T=TT; const step=(n)=>{for(let i=0;i<n;i++) T.stepFrame(1/30);}; const press=(k)=>T.flightInput({keys:k,zoom:false});
        T.flightHold(true); const h=window.__home; T.player.position.set(h.x,h.y,h.z); T.player.rotation.y=h.yaw; press([]); step(12); ${pose} })()`, 120000);
      for (const [vid, V] of Object.entries(VIEWS)) for (const light of LIGHTS) {
        await page.evaluate(`(async ()=>{ const T=TT, V=${JSON.stringify(V)}; T.setWorldTime(${LT[light]}); T.weather.raining=${light === 'overcast'};
          const p=T.player.position, yaw=T.player.rotation.y, c=Math.cos(yaw), s=Math.sin(yaw); const tw=(o)=>({x:p.x+o[0]*c+o[2]*s, y:window.__home.y+o[1], z:p.z-o[0]*s+o[2]*c});
          const a=tw(V.cam), b=tw(V.look); T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:30}); T.stepFrame(0); })()`, 120000);
        if (!globalThis.__warm) { globalThis.__warm = 1; await page.screenshot(path.join(out, '_warmup.png')); }   // the first shot after the hold can miss the view
        await page.screenshot(path.join(out, `${C.id}-${pid}-${vid}-${light}.png`));
      }
      await page.evaluate(`(()=>{ const T=TT; T.flightInput({keys:[],zoom:false}); for(let i=0;i<20;i++) T.stepFrame(1/30); T.flightHold(false); })()`, 120000);
    }
  }
} catch (e) { console.log('ERR', e && e.stack || e); } finally {
  await browser.close(); server.close && server.close(); setTimeout(() => process.exit(0), 2000);
}

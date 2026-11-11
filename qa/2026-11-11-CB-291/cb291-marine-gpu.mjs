// qa/2026-11-11-CB-291/cb291-marine-gpu.mjs
// CB-291 (Claude 2): 3P marine body-table GPU look across 4 lights (noon/overcast/dusk/night)
// and 3 consistent cameras (gameplay OTS, 3/4 front close, side close) for all 8 requested cases.
// Strictly offscreen at (-3800, -3800). Saves into review/CB-291/ag/.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_DIR = path.join(ROOT, 'review/CB-291/ag');
fs.mkdirSync(OUT_DIR, { recursive: true });

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];
const TIME_MAP = { noon: 0.46, overcast: 0.50, dusk: 0.75, night: 0.02 };

async function moveOffscreen(page) {
  try {
    const win = await page.send('Browser.getWindowForTarget', {});
    if (win && win.windowId != null) {
      await page.send('Browser.setWindowBounds', {
        windowId: win.windowId,
        bounds: { left: -3800, top: -3800, width: 1280, height: 720, windowState: 'normal' }
      });
    }
  } catch (_) {}
}

const SETUP_FN = `(async () => {
  const T = window.TT, H = T.inspectHost();
  const { LIGHTS } = await import('/studio/inspector/stage.js');
  window.__LIGHTS = LIGHTS;
  window.agLight = 'noon';
  window.__holdSim = false;
  window.__illuminate = function illuminate() {
    const L = window.__LIGHTS[window.agLight] || window.__LIGHTS['noon'];
    const p = T.player.position;
    const dir = new H.THREE.Vector3(...L.dir).normalize();
    H.sun.position.copy(p).addScaledVector(dir, 85);
    H.sun.target.position.copy(p);
    H.sun.target.updateMatrixWorld();
    H.sun.color.setHex(L.sunColor);
    H.sun.intensity = L.sun;
    H.hemi.color.setHex(L.skyColor);
    H.hemi.groundColor.setHex(L.ground);
    H.hemi.intensity = L.sky;
    H.ambientFill.intensity = L.fill;
    H.moon.intensity = window.agLight === 'night' ? 0.45 : 0;
    const tg = T.trainingDbg.tg();
    if (tg && tg.setLights) {
      const wantRoom = window.agLight !== 'night';
      if (tg.lightsOn() !== wantRoom) tg.setLights(wantRoom);
    }
  };
  H.attach({ held: () => !!window.__holdSim, scale: (dt) => dt, frame: window.__illuminate });
  T.grantAllWeapons();
  if (T.isUnarmed()) T.toggleHolster();
  for (const sel of ['#hud', '#trainingHud', '#perfOverlay', '#minimapWrap', '#crosshair']) {
    const el = document.querySelector(sel);
    if (el) el.style.display = 'none';
  }
})()`;

// 9 captures covering all 8 Claude 2 cases (7 split into forward & backward sprint so both ankle/hip directions show clearly!)
const CASES = [
  {
    id: '01-aa12-reload',
    label: '(1) AA-12 reload @ 0.65',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.flightInput({ keys: [] }); T.setZoomHeldDbg(false); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 5.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('aa12'));
      T.marineIdleDbg().reset();
      await new Promise((r) => setTimeout(r, 380));
      T.marineIdleDbg().reset();
      T.setAmmoDbg('aa12', 0); T.startReload(); T.reloadClipDbg.hold(0.65);
      await new Promise((r) => setTimeout(r, 180));
      window.__holdSim = true;
    }`
  },
  {
    id: '02-launcher-reload',
    label: '(2) Launcher reload @ 0.80',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.flightInput({ keys: [] }); T.setZoomHeldDbg(false); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 5.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
      T.marineIdleDbg().reset();
      await new Promise((r) => setTimeout(r, 380));
      T.marineIdleDbg().reset();
      T.setAmmoDbg('launcher', 0); T.startReload(); T.reloadClipDbg.hold(0.8);
      await new Promise((r) => setTimeout(r, 180));
      window.__holdSim = true;
    }`
  },
  {
    id: '03-m4-reload',
    label: '(3) M4 reload @ 0.50',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.flightInput({ keys: [] }); T.setZoomHeldDbg(false); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 5.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.marineIdleDbg().reset();
      await new Promise((r) => setTimeout(r, 380));
      T.marineIdleDbg().reset();
      T.setAmmoDbg('m4', 0); T.startReload(); T.reloadClipDbg.hold(0.5);
      await new Promise((r) => setTimeout(r, 180));
      window.__holdSim = true;
    }`
  },
  {
    id: '04-m4-aimed',
    label: '(4) M4 aimed (ADS)',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.flightInput({ keys: [] }); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 5.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.marineIdleDbg().reset();
      T.setZoomHeldDbg(true);
      await new Promise((r) => setTimeout(r, 420));
      T.marineIdleDbg().reset();
      await new Promise((r) => setTimeout(r, 60));
      window.__holdSim = true;
    }`
  },
  {
    id: '05-shotgun-aimed',
    label: '(5) Shotgun aimed (ADS)',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.flightInput({ keys: [] }); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 5.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));
      T.marineIdleDbg().reset();
      T.setZoomHeldDbg(true);
      await new Promise((r) => setTimeout(r, 420));
      T.marineIdleDbg().reset();
      await new Promise((r) => setTimeout(r, 60));
      window.__holdSim = true;
    }`
  },
  {
    id: '06-smoking-idle',
    label: '(6) Smoking idle @ t=7.3s',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.flightInput({ keys: [] }); T.setZoomHeldDbg(false); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 5.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.marineIdleDbg().reset();
      await new Promise((r) => setTimeout(r, 380));
      const idle = T.marineIdleDbg();
      try { idle.state = { phase: 'smoking', time: 7.3, quiet: 40 }; } catch (_) {}
      if (idle.state && idle.state.phase !== 'smoking') Object.assign(idle.state, { phase: 'smoking', time: 7.3, quiet: 40 });
      await new Promise((r) => setTimeout(r, 60));
      window.__holdSim = true;
    }`
  },
  {
    id: '07a-sprint-forward',
    label: '(7a) Sprint forward (ankles & hips)',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.setZoomHeldDbg(false); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 8.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.marineIdleDbg().reset();
      T.flightInput({ keys: ['ShiftLeft', 'w'] });
      await new Promise((r) => setTimeout(r, 480));
      window.__holdSim = true;
      T.flightInput({ keys: [] });
    }`
  },
  {
    id: '07b-sprint-backward',
    label: '(7b) Backpedal / sprint back (ankles & hips)',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.setZoomHeldDbg(false); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 3.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.marineIdleDbg().reset();
      T.flightInput({ keys: ['ShiftLeft', 's'] });
      await new Promise((r) => setTimeout(r, 480));
      window.__holdSim = true;
      T.flightInput({ keys: [] });
    }`
  },
  {
    id: '08-turn-90-rifle',
    label: '(8) Standing 90-deg turn w/ rifle (hips follow >42 deg)',
    prep: `async () => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.flightInput({ keys: [] }); T.setZoomHeldDbg(false); T.reloadClipDbg.hold(null);
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 5.5);
      T.setAimYawDbg(0); T.setOtsAimDbg(0, -0.02); T.setViewFirstDbg(false);
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
      T.marineIdleDbg().reset();
      await new Promise((r) => setTimeout(r, 400));
      T.marineIdleDbg().reset();
      // Turn aim 90 degrees (+PI/2) while standing so torso & hips follow past the 42-deg deadband
      T.setAimYawDbg(Math.PI / 2);
      T.setOtsAimDbg(Math.PI / 2, -0.02);
      await new Promise((r) => setTimeout(r, 140));
      window.__holdSim = true;
    }`
  }
];

// Same 3 cameras relative to player's position & aim direction for every case!
const CAMS = ['gameplay', 'front34', 'side'];

async function main() {
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding'
    ]
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'CB291-GPU';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    await page.evaluate(SETUP_FN);
    await new Promise((r) => setTimeout(r, 400));

    for (const c of CASES) {
      await page.evaluate(`(${c.prep})()`);
      for (const cam of CAMS) {
        for (const light of LIGHTS) {
          await page.evaluate(`(async (cam, light, wTime, caseId) => {
            const T = window.TT;
            window.agLight = light;
            T.setWorldTime(wTime);
            const p = T.player.position;
            const yaw = caseId === '08-turn-90-rifle' ? Math.PI / 2 : 0;
            const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
            const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
            if (cam === 'gameplay') {
              T.setShotView(null);
            } else if (cam === 'front34') {
              // 3/4 front close camera (in front and slightly to marine's gun side so hands, gun, elbows, shoulders, hips & ankles read clearly)
              const cx = p.x + fwdX * 1.65 - rgtX * 1.15;
              const cz = p.z + fwdZ * 1.65 - rgtZ * 1.15;
              T.setShotView({ x: cx, y: p.y + 1.18, z: cz, tx: p.x, ty: p.y + 0.94, tz: p.z, fov: 46 });
            } else if (cam === 'side') {
              // Side close camera (gun/left-handed marine's weapon side)
              const cx = p.x - rgtX * 1.95 + fwdX * 0.25;
              const cz = p.z - rgtZ * 1.95 + fwdZ * 0.25;
              T.setShotView({ x: cx, y: p.y + 1.08, z: cz, tx: p.x, ty: p.y + 0.92, tz: p.z, fov: 46 });
            }
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          })(${JSON.stringify(cam)}, ${JSON.stringify(light)}, ${TIME_MAP[light]}, ${JSON.stringify(c.id)})`);
          const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
          fs.writeFileSync(path.join(OUT_DIR, `${c.id}-${cam}-${light}.jpg`), Buffer.from(shot.data, 'base64'));
        }
      }
      console.log(`[CB-291] Captured ${c.id} (3 cams x 4 lights)`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

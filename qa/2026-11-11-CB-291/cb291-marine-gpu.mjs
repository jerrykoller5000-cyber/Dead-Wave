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
  // Let direct 4-light sun shine cleanly onto the marine without the 8m hangar ceiling blocking directional sun!
  // (Marine and props still cast full self- and floor-shadows.)
  const tg0 = T.trainingDbg.tg();
  if (tg0 && tg0.group) {
    tg0.group.updateMatrixWorld(true);
    const box = new H.THREE.Box3();
    tg0.group.traverse((o) => {
      if (!o.isMesh) return;
      box.setFromObject(o);
      if (box.min.y - tg0.floorY > 6.5 || o.parent?.name === 'training-cutaway-overhead') {
        o.castShadow = false;
      }
    });
  }
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
  window.__resetClean = async function(gunKey, zOff = -2.0) {
    const tg = T.trainingDbg.tg(), O = tg.origin;
    window.__holdSim = false;
    T.setShotView(null);
    T.flightInput({ keys: [] });
    T.setZoomHeldDbg(false);
    T.reloadClipDbg.hold(null);
    // Switch away & back with full ammo so any prior reload or idle stow is 100% cleared!
    T.marineIdleDbg().reset();
    if (T.isUnarmed()) T.toggleHolster();
    const pistolIdx = T.WEAPON_ORDER.indexOf('pistol');
    const targetIdx = T.WEAPON_ORDER.indexOf(gunKey);
    T.setWeapon(targetIdx === pistolIdx ? T.WEAPON_ORDER.indexOf('ak') : pistolIdx);
    await new Promise((r) => setTimeout(r, 80));
    T.setAmmoDbg(gunKey, 30);
    T.setWeapon(targetIdx);
    if (T.isUnarmed()) T.toggleHolster();
    T.marineIdleDbg().reset();
    T.player.position.set(O.x + 0.0, tg.floorY, O.z + zOff);
    T.setAimYawDbg(0);
    T.setOtsAimDbg(0, 0.0);
    T.setViewFirstDbg(false);
    // Let live OTS gameplay camera converge cleanly onto the marine!
    await new Promise((r) => setTimeout(r, 420));
    T.marineIdleDbg().reset();
  };
})()`;

const CASES = [
  {
    id: '01-aa12-reload',
    label: '(1) AA-12 reload @ 0.65',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('aa12', -2.0);
      T.setAmmoDbg('aa12', 0); T.startReload(); T.reloadClipDbg.hold(0.65);
      await new Promise((r) => setTimeout(r, 160));
      window.__holdSim = true;
    }`
  },
  {
    id: '02-launcher-reload',
    label: '(2) Launcher reload @ 0.80',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('launcher', -2.0);
      T.setAmmoDbg('launcher', 0); T.startReload(); T.reloadClipDbg.hold(0.8);
      await new Promise((r) => setTimeout(r, 160));
      window.__holdSim = true;
    }`
  },
  {
    id: '03-m4-reload',
    label: '(3) M4 reload @ 0.50',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('m4', -2.0);
      T.setAmmoDbg('m4', 0); T.startReload(); T.reloadClipDbg.hold(0.5);
      await new Promise((r) => setTimeout(r, 160));
      window.__holdSim = true;
    }`
  },
  {
    id: '04-m4-aimed',
    label: '(4) M4 aimed (ADS)',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('m4', -2.0);
      T.setZoomHeldDbg(true);
      await new Promise((r) => setTimeout(r, 380));
      T.marineIdleDbg().reset();
      window.__holdSim = true;
    }`
  },
  {
    id: '05-shotgun-aimed',
    label: '(5) Shotgun aimed (ADS)',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('shotgun', -2.0);
      T.setZoomHeldDbg(true);
      await new Promise((r) => setTimeout(r, 380));
      T.marineIdleDbg().reset();
      window.__holdSim = true;
    }`
  },
  {
    id: '06-smoking-idle',
    label: '(6) Smoking idle @ t=7.3s',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('m4', -2.0);
      const idle = T.marineIdleDbg();
      try { idle.state = { phase: 'smoking', time: 7.3, quiet: 40 }; } catch (_) {}
      if (idle.state && idle.state.phase !== 'smoking') Object.assign(idle.state, { phase: 'smoking', time: 7.3, quiet: 40 });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      window.__holdSim = true;
    }`
  },
  {
    id: '07a-sprint-forward',
    label: '(7a) Sprint forward (ankles & hips)',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('m4', -5.5);
      T.flightInput({ keys: ['ShiftLeft', 'w'] });
      await new Promise((r) => setTimeout(r, 460));
      window.__holdSim = true;
      T.flightInput({ keys: [] });
    }`
  },
  {
    id: '07b-sprint-backward',
    label: '(7b) Backpedal / sprint back (ankles & hips)',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('m4', 0.5);
      T.flightInput({ keys: ['ShiftLeft', 's'] });
      await new Promise((r) => setTimeout(r, 460));
      window.__holdSim = true;
      T.flightInput({ keys: [] });
    }`
  },
  {
    id: '08-turn-90-rifle',
    label: '(8) Standing 90-deg turn w/ rifle (hips follow >42 deg)',
    prep: `async () => {
      const T = window.TT;
      await window.__resetClean('m4', -2.0);
      // Turn aim 90 degrees (+PI/2) while standing so torso & hips follow past the 42-deg deadband
      T.setAimYawDbg(Math.PI / 2);
      T.setOtsAimDbg(Math.PI / 2, 0.0);
      await new Promise((r) => setTimeout(r, 150));
      window.__holdSim = true;
    }`
  }
];

// Capture 'gameplay' FIRST while T.setShotView is still null (live OTS camera converged during prep!), then 'front34', then 'side'!
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
    await new Promise((r) => setTimeout(r, 300));

    for (const c of CASES) {
      await page.evaluate(`(${c.prep})()`);
      for (const cam of CAMS) {
        for (const light of LIGHTS) {
          await page.evaluate(`(async (cam, light, wTime, caseId) => {
            const T = window.TT;
            T.setWorldTime(wTime);
            window.agLight = light;
            window.__illuminate();
            const p = T.player.position;
            const yaw = caseId === '08-turn-90-rifle' ? Math.PI / 2 : 0;
            const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
            const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
            if (cam === 'gameplay') {
              T.setShotView(null);
            } else if (cam === 'front34') {
              const cx = p.x + fwdX * 1.65 - rgtX * 1.15;
              const cz = p.z + fwdZ * 1.65 - rgtZ * 1.15;
              T.setShotView({ x: cx, y: p.y + 1.18, z: cz, tx: p.x, ty: p.y + 0.94, tz: p.z, fov: 46 });
            } else if (cam === 'side') {
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
      console.log(`[CB-291-v2] Captured ${c.id} (3 cams x 4 lights)`);
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

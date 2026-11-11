// qa/2026-11-11-CE-6/ce6-gpu-look.mjs
// CE-6 (J136, Claude 5): Real RTX 5080 WebGPU 4-light verification & filmstrips in Training Ground:
//   (1) Revolver single (1P eye + 3P close cylinder/hammer/trigger camera): 6 pulls (mid-pull ~0.10s hammer cocked + post-shot rest) + reload jump check
//   (2) Revolver pair (1P akimbo + 3P close): 6 pulls (alternating guns, each indexing 60 deg independently)
//   (3) Grenade launcher (1P eye + 3P front-3/4 drum camera): 6 shots (~70ms spring drum index + drumRounds/drumNoses state) + reload jump check
//   (4) 4-light matrices (noon / overcast / dusk / night) saved to review/CE-6/gpu/ + ce6-metrics.json.
// Strictly offscreen at (-3800, -3800).

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

const OUT_DIR = path.join(ROOT, 'review/CE-6/gpu');
const STILLS = path.join(OUT_DIR, 'stills');
fs.mkdirSync(STILLS, { recursive: true });

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

const INIT_FN = `(async () => {
  const T = window.TT, H = T.inspectHost();
  const { LIGHTS } = await import('/studio/inspector/stage.js');
  window.__LIGHTS = LIGHTS;
  window.agLight = 'noon';
  window.__holdSim = false;
  window.__ce6Errs = [];
  window.addEventListener('error', (e) => window.__ce6Errs.push(String(e.message || e.error)));

  // Allow direct 4-light directional sun to illuminate close weapon cylinder/drum details clearly indoors
  const tg0 = T.trainingDbg.tg();
  if (tg0 && tg0.group) {
    tg0.group.updateMatrixWorld(true);
    const box = new H.THREE.Box3();
    tg0.group.traverse((o) => {
      if (!o.isMesh) return;
      box.setFromObject(o);
      if (box.max.y - tg0.floorY > 1.2 || o.parent?.name === 'training-cutaway-overhead') {
        o.castShadow = false;
      }
    });
  }

  window.__illuminate = function illuminate() {
    const L = window.__LIGHTS[window.agLight] || window.__LIGHTS['noon'];
    const p = T.camera.position;
    // Align L.dir horizontally with camera view (like studio/inspector/stage.js) so key light illuminates camera-facing cylinder/drum!
    const camBack = new H.THREE.Vector3(0, 0, 1).applyQuaternion(T.camera.quaternion);
    const camYaw = Math.atan2(camBack.x, camBack.z);
    const d0 = new H.THREE.Vector3(...L.dir).normalize();
    const cs = Math.cos(camYaw), sn = Math.sin(camYaw);
    const dir = new H.THREE.Vector3(d0.x * cs + d0.z * sn, d0.y, -d0.x * sn + d0.z * cs).normalize();
    H.sun.position.copy(p).addScaledVector(dir, 85);
    H.sun.target.position.copy(p);
    H.sun.target.updateMatrixWorld();
    H.sun.color.setHex(L.sunColor);
    H.sun.intensity = L.sun;
    H.sun.shadow.autoUpdate = true;
    H.sun.shadow.needsUpdate = true;
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

  T.clearZombies && T.clearZombies();
  T.setHp(1e6);
  T.grantAllWeapons();
  if (T.isUnarmed()) T.toggleHolster();
  for (const sel of ['#hud', '#trainingHud', '#perfOverlay', '#minimapWrap', '#crosshair']) {
    const el = document.querySelector(sel);
    if (el) el.style.display = 'none';
  }

  const THREE = H.THREE;
  const _p = new THREE.Vector3(), _c = new THREE.Vector3();
  window.__ce6Helpers = {
    steps(n, dt = 1 / 60) {
      const prev = window.__holdSim;
      window.__holdSim = false;
      for (let i = 0; i < n; i++) T.stepFrame(dt);
      window.__holdSim = prev;
    },
    turnOf(part, base) {
      if (!part || !base) return null;
      const q0 = new THREE.Quaternion().setFromEuler(base);
      const q = q0.invert().multiply(part.quaternion.clone());
      let a = 2 * Math.atan2(q.z, q.w);
      a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      return +(a / (Math.PI / 3)).toFixed(4);
    },
    wrap(x) {
      return +(x - 6 * Math.round(x / 6)).toFixed(4);
    },
    topOf(gun, part, rounds, drumR) {
      if (!gun || !part || !rounds) return -1;
      gun.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert();
      part.getWorldPosition(_c).applyMatrix4(inv);
      let best = -1, by = -1e9;
      rounds.forEach((r, i) => {
        if (drumR) {
          const a = i * Math.PI / 3;
          _p.set(Math.sin(a) * drumR, Math.cos(a) * drumR, 0).applyMatrix4(part.matrixWorld).applyMatrix4(inv);
        } else {
          r.getWorldPosition(_p).applyMatrix4(inv);
        }
        const y = _p.y - _c.y;
        if (y > by) { by = y; best = i; }
      });
      return best;
    },
    async take(w) {
      window.__holdSim = false;
      if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) {
        T.setWeapon(T.WEAPON_ORDER.indexOf(w));
        window.__ce6Helpers.steps(10);
      }
      for (let i = 0; i < 180 && T.getSwapDbg().swapT > 0; i++) T.stepFrame(1 / 60);
      window.__ce6Helpers.steps(24);
      return T.getCurrentWeapon() === w;
    },
    aimClose3PGun(gunObj, offsetLocal) {
      gunObj.updateMatrixWorld(true);
      const c = new THREE.Vector3();
      const targetPart = gunObj.userData.cylinder || gunObj.userData.drum || gunObj;
      targetPart.getWorldPosition(c);
      const camPos = new THREE.Vector3(...offsetLocal).applyMatrix4(gunObj.matrixWorld);
      T.setShotView({
        x: camPos.x, y: camPos.y, z: camPos.z,
        tx: c.x, ty: c.y, tz: c.z,
        fov: 32
      });
    }
  };
})()`;

async function snapLights(page, prefix, lightsToSnap) {
  for (const lt of lightsToSnap) {
    await page.evaluate(`(async (lt, wTime) => {
      const T = window.TT, H = T.inspectHost();
      T.setWorldTime(wTime);
      window.agLight = lt;
      window.__illuminate();
      H.render();
      window.__illuminate();
      H.render();
    })(${JSON.stringify(lt)}, ${TIME_MAP[lt]})`);
    const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
    fs.writeFileSync(path.join(STILLS, `${prefix}-${lt}.jpg`), Buffer.from(shot.data, 'base64'));
  }
}

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

  const metrics = {
    card: 'AG-303 (CE-6 / J136)',
    capturedAt: new Date().toISOString(),
    revolver1P: null,
    revolver3P: null,
    revolverReload: null,
    revolverPair1P: null,
    revolverPair3P: null,
    launcher1P: null,
    launcher3P: null,
    launcherReload: null,
    pageErrors: []
  };

  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1`, { timeout: 180000 });
    await moveOffscreen(page);
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'CE6-GPU';
      document.getElementById('modeTraining').click();
    })()`);
    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));
    await page.evaluate(INIT_FN);

    // Position marine in open lobby facing downrange (+Z toward range targets) so sun is unobstructed & shots fly downrange!
    await page.evaluate(`(() => {
      const T = window.TT, tg = T.trainingDbg.tg(), O = tg.origin;
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 2.5);
      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, 0);
      window.__ce6Helpers.steps(20);
    })()`);

    // =========================================================================
    // 1. REVOLVER SINGLE — 1P EYE (6 pulls: rest -> mid-pull ~0.10s -> post-shot)
    // =========================================================================
    await page.evaluate(`(async () => {
      const T = window.TT, H = window.__ce6Helpers;
      T.setShotView(null);
      await H.take('revolver');
      T.setViewFirstDbg(true);
      for (let i = 0; i < 90; i++) T.stepFrame(1 / 60);
      T.setAmmoDbg('revolver', 6);
      T.setRevolverSpentDbg(0);
      H.steps(30);
      window.__holdSim = true;
    })()`);
    await snapLights(page, 'rev1p-p0-rest', LIGHTS);

    const rev1pPulls = [];
    for (let k = 1; k <= 6; k++) {
      // Advance into mid-pull (t ~ 0.09..0.11s, right before break at ~0.12s: hammer cocked, live round rotated to top!)
      const midInfo = await page.evaluate(`(() => {
        const T = window.TT, H = window.__ce6Helpers;
        const G = T.weaponMeshes.revolver, ud = G.userData;
        const L0 = ud.chamberNoses.filter((n) => n.visible).length;
        const t0 = H.turnOf(ud.cylinder, ud.baseCylinderRot);
        window.__revPullTmp = { L0, t0 };
        window.__holdSim = false;
        T.setMouseFireDbg(true);
        let stepsTaken = 0;
        for (let f = 0; f < 10; f++) {
          T.stepFrame(1 / 60);
          stepsTaken++;
          const p = T.revolverPullDbg ? T.revolverPullDbg() : null;
          if (p && p.t >= 0.095) break;
        }
        window.__holdSim = true;
        const V = T.viewmodelDbg(), vg = V && V.gun;
        const vmAngleDeg = vg && vg.cylinder ? +(vg.cylinder.quaternion.angleTo(ud.cylinder.quaternion) * 180 / Math.PI).toFixed(2) : null;
        return {
          pull: ${k},
          stepsTaken,
          pullDbg: T.revolverPullDbg ? T.revolverPullDbg() : null,
          midTurn: H.turnOf(ud.cylinder, ud.baseCylinderRot),
          midTop: H.topOf(G, ud.cylinder, ud.chamberRounds),
          midTopLive: ud.chamberNoses[H.topOf(G, ud.cylinder, ud.chamberRounds)]?.visible ?? null,
          midHammerRotX: ud.hammer ? +ud.hammer.rotation.x.toFixed(3) : null,
          midTriggerRotX: ud.trigger ? +ud.trigger.rotation.x.toFixed(3) : null,
          chamberIndex: ud.chamberIndex ? { ...ud.chamberIndex } : null,
          vmAngleDeg
        };
      })()`);
      // Capture 4 lights on Pull 1 mid-pull & Noon+Night on Pulls 2..6 (keeps sheet dense & fast!)
      await snapLights(page, `rev1p-p${k}-mid`, k === 1 || k === 6 ? LIGHTS : ['noon', 'overcast']);

      // Complete the break & settle to rest (~0.45s = 28 frames)
      const afterInfo = await page.evaluate(`(() => {
        const T = window.TT, H = window.__ce6Helpers;
        const G = T.weaponMeshes.revolver, ud = G.userData;
        const { L0, t0 } = window.__revPullTmp;
        window.__holdSim = false;
        for (let f = 0; f < 25 && ud.chamberNoses.filter((n) => n.visible).length === L0; f++) {
          T.stepFrame(1 / 60);
        }
        T.setMouseFireDbg(false);
        for (let f = 0; f < 14 && !(T.isReloading && T.isReloading()); f++) T.stepFrame(1 / 60);
        // Check 5 extra idle frames for zero flicker back!
        const restTurns = [];
        for (let f = 0; f < 5 && !(T.isReloading && T.isReloading()); f++) { T.stepFrame(1 / 60); restTurns.push(H.turnOf(ud.cylinder, ud.baseCylinderRot)); }
        for (let f = 0; f < 10 && !(T.isReloading && T.isReloading()); f++) T.stepFrame(1 / 60);
        window.__holdSim = true;
        const t1 = H.turnOf(ud.cylinder, ud.baseCylinderRot);
        const V = T.viewmodelDbg(), vg = V && V.gun;
        const vmAngleDeg = vg && vg.cylinder ? +(vg.cylinder.quaternion.angleTo(ud.cylinder.quaternion) * 180 / Math.PI).toFixed(2) : null;
        const flicker = restTurns.length > 1 ? Math.max(...restTurns) - Math.min(...restTurns) : 0;
        return {
          liveBefore: L0,
          liveAfter: ud.chamberNoses.filter((n) => n.visible).length,
          deltaChambers: H.wrap(t1 - t0),
          topAfter: H.topOf(G, ud.cylinder, ud.chamberRounds),
          chamberIndexAfter: ud.chamberIndex ? { ...ud.chamberIndex } : null,
          restFlickerChambers: +flicker.toFixed(5),
          vmAngleDegAfter: vmAngleDeg
        };
      })()`);
      await snapLights(page, `rev1p-p${k}-after`, k === 1 || k === 6 ? LIGHTS : ['noon', 'overcast']);
      rev1pPulls.push({ ...midInfo, ...afterInfo });
    }
    metrics.revolver1P = rev1pPulls;
    console.log('[CE-6] Revolver 1P 6 pulls complete');

    // =========================================================================
    // 2. REVOLVER SINGLE — 3P CLOSE CYLINDER/HAMMER CAMERA (6 pulls + 1 reload)
    // =========================================================================
    await page.evaluate(`(() => {
      const T = window.TT, H = window.__ce6Helpers;
      window.__holdSim = false;
      for (let i = 0; i < 600 && (T.isReloading && T.isReloading()); i++) T.stepFrame(1 / 60);
      T.setViewFirstDbg(false);
      H.steps(20);
      T.setAmmoDbg('revolver', 6);
      T.setRevolverSpentDbg(0);
      H.steps(30);
      H.aimClose3PGun(T.weaponMeshes.revolver, [0.30, 0.12, -0.26]);
      window.__holdSim = true;
    })()`);
    await snapLights(page, 'rev3p-p0-rest', LIGHTS);

    const rev3pPulls = [];
    for (let k = 1; k <= 6; k++) {
      const mid3p = await page.evaluate(`(() => {
        const T = window.TT, H = window.__ce6Helpers;
        const G = T.weaponMeshes.revolver, ud = G.userData;
        const L0 = ud.chamberNoses.filter((n) => n.visible).length;
        const t0 = H.turnOf(ud.cylinder, ud.baseCylinderRot);
        window.__revPullTmp = { L0, t0 };
        window.__holdSim = false;
        T.setMouseFireDbg(true);
        for (let f = 0; f < 10; f++) {
          T.stepFrame(1 / 60);
          const p = T.revolverPullDbg ? T.revolverPullDbg() : null;
          if (p && p.t >= 0.095) break;
        }
        H.aimClose3PGun(G, [0.30, 0.12, -0.26]);
        window.__holdSim = true;
        return {
          pull: ${k},
          midTurn: H.turnOf(ud.cylinder, ud.baseCylinderRot),
          midTop: H.topOf(G, ud.cylinder, ud.chamberRounds),
          midHammerRotX: ud.hammer ? +ud.hammer.rotation.x.toFixed(3) : null
        };
      })()`);
      if (k === 1 || k === 3 || k === 6) await snapLights(page, `rev3p-p${k}-mid`, LIGHTS);

      const aft3p = await page.evaluate(`(() => {
        const T = window.TT, H = window.__ce6Helpers;
        const G = T.weaponMeshes.revolver, ud = G.userData;
        const { L0, t0 } = window.__revPullTmp;
        window.__holdSim = false;
        for (let f = 0; f < 25 && ud.chamberNoses.filter((n) => n.visible).length === L0; f++) T.stepFrame(1 / 60);
        T.setMouseFireDbg(false);
        for (let f = 0; f < 28 && !(T.isReloading && T.isReloading()); f++) T.stepFrame(1 / 60);
        H.aimClose3PGun(G, [0.30, 0.12, -0.26]);
        window.__holdSim = true;
        return {
          liveAfter: ud.chamberNoses.filter((n) => n.visible).length,
          deltaChambers: H.wrap(H.turnOf(ud.cylinder, ud.baseCylinderRot) - t0),
          topAfter: H.topOf(G, ud.cylinder, ud.chamberRounds)
        };
      })()`);
      if (k === 1 || k === 3 || k === 6) await snapLights(page, `rev3p-p${k}-after`, LIGHTS);
      rev3pPulls.push({ ...mid3p, ...aft3p });
    }
    metrics.revolver3P = rev3pPulls;

    // Revolver reload jump check (1P eye: start, mid-swing, end)
    metrics.revolverReload = await page.evaluate(`(() => {
      const T = window.TT, H = window.__ce6Helpers;
      window.__holdSim = false;
      T.setShotView(null);
      T.setViewFirstDbg(true);
      for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      T.setAmmoDbg('revolver', 2);
      T.setRevolverSpentDbg(4);
      H.steps(20);
      const G = T.weaponMeshes.revolver, ud = G.userData;
      let prev = H.turnOf(ud.cylinder, ud.baseCylinderRot), worst = 0, worstAt = 0, seen = false;
      T.startReload();
      for (let i = 0; i < 600; i++) {
        T.stepFrame(1 / 60);
        const rel = T.isReloading ? T.isReloading() : false;
        if (rel) seen = true;
        const cur = H.turnOf(ud.cylinder, ud.baseCylinderRot);
        const d = Math.abs(H.wrap(cur - prev));
        prev = cur;
        if (d > worst) { worst = +d.toFixed(4); worstAt = i; }
        if (seen && !rel) {
          for (let j = 0; j < 10; j++) {
            T.stepFrame(1 / 60);
            const c2 = H.turnOf(ud.cylinder, ud.baseCylinderRot);
            const d2 = Math.abs(H.wrap(c2 - prev));
            prev = c2;
            if (d2 > worst) { worst = +d2.toFixed(4); worstAt = i + j; }
          }
          break;
        }
      }
      window.__holdSim = true;
      return {
        seen,
        worstSingleFrameDeltaChambers: worst,
        worstAtFrame: worstAt,
        liveAfter: ud.chamberNoses.filter((n) => n.visible).length,
        topAfter: H.topOf(G, ud.cylinder, ud.chamberRounds)
      };
    })()`);
    console.log('[CE-6] Revolver 3P + Reload complete:', metrics.revolverReload);

    // =========================================================================
    // 3. REVOLVER PAIR — 1P AKIMBO EYE (6 pulls: alternating right & left!)
    // =========================================================================
    const pairReady = await page.evaluate(`(async () => {
      const T = window.TT, H = window.__ce6Helpers;
      window.__holdSim = false;
      T.setShotView(null);
      T.setViewFirstDbg(false);
      H.steps(10);
      T.setAmmoDbg('revolver', 6);
      T.setDualOwnedDbg('revolver', true);
      H.steps(5);
      if (T.armoryDbg && T.armoryDbg.fit) T.armoryDbg.fit('revolver', 'pair', true);
      H.steps(5);
      const arm = T.armoryDbg && T.armoryDbg.ui ? T.armoryDbg.ui().armory : null;
      const lo = arm ? arm.loadout() : null;
      if (arm && lo && !lo.secondary.includes('revolver')) {
        const st = arm.read(), free = st.slots.secondary.findIndex((g) => !g);
        if (!arm.has('revolver')) arm.buy({ id: 'revolver', kind: 'revolver', loaded: null }, { store: true });
        if (free >= 0) arm.take('revolver', 'secondary', free);
      }
      await H.take('revolver');
      for (let i = 0; i < 3 && !(T.offhandMeshes.revolver && T.offhandMeshes.revolver.visible); i++) {
        T.toggleDualWieldDbg();
        H.steps(30);
      }
      T.setViewFirstDbg(true);
      for (let i = 0; i < 80; i++) T.stepFrame(1 / 60);
      T.setAmmoDbg('revolver', 12);
      T.setRevolverSpentDbg(0);
      H.steps(30);
      window.__holdSim = true;
      return !!(T.offhandMeshes.revolver && T.offhandMeshes.revolver.visible);
    })()`);

    const pairPulls = [];
    if (pairReady) {
      await snapLights(page, 'pair1p-p0-rest', LIGHTS);
      for (let k = 1; k <= 6; k++) {
        const pInfo = await page.evaluate(`(() => {
          const T = window.TT, H = window.__ce6Helpers;
          const M = T.weaponMeshes.revolver, O = T.offhandMeshes.revolver;
          const m0 = H.turnOf(M.userData.cylinder, M.userData.baseCylinderRot);
          const o0 = H.turnOf(O.userData.cylinder, O.userData.baseCylinderRot);
          const mL0 = M.userData.chamberNoses.filter((n) => n.visible).length;
          const oL0 = O.userData.chamberNoses.filter((n) => n.visible).length;
          window.__holdSim = false;
          T.setMouseFireDbg(true);
          for (let f = 0; f < 10; f++) {
            T.stepFrame(1 / 60);
            const p = T.revolverPullDbg ? T.revolverPullDbg() : null;
            if (p && p.t >= 0.095) break;
          }
          window.__pairTmp = { m0, o0, mL0, oL0 };
          window.__holdSim = true;
          return { pull: ${k} };
        })()`);
        if (k === 1 || k === 2) await snapLights(page, `pair1p-p${k}-mid`, LIGHTS);

        const pAfter = await page.evaluate(`(() => {
          const T = window.TT, H = window.__ce6Helpers;
          const M = T.weaponMeshes.revolver, O = T.offhandMeshes.revolver;
          const { m0, o0, mL0, oL0 } = window.__pairTmp;
          window.__holdSim = false;
          for (let f = 0; f < 25; f++) {
            T.stepFrame(1 / 60);
            const mL = M.userData.chamberNoses.filter((n) => n.visible).length;
            const oL = O.userData.chamberNoses.filter((n) => n.visible).length;
            if (mL < mL0 || oL < oL0) break;
          }
          T.setMouseFireDbg(false);
          for (let f = 0; f < 30; f++) T.stepFrame(1 / 60);
          window.__holdSim = true;
          const m1 = H.turnOf(M.userData.cylinder, M.userData.baseCylinderRot);
          const o1 = H.turnOf(O.userData.cylinder, O.userData.baseCylinderRot);
          return {
            pull: ${k},
            mainDelta: H.wrap(m1 - m0),
            offhandDelta: H.wrap(o1 - o0),
            mainLive: M.userData.chamberNoses.filter((n) => n.visible).length,
            offhandLive: O.userData.chamberNoses.filter((n) => n.visible).length,
            mainChamberIndex: M.userData.chamberIndex ? { ...M.userData.chamberIndex } : null,
            offhandChamberIndex: O.userData.chamberIndex ? { ...O.userData.chamberIndex } : null
          };
        })()`);
        if (k === 1 || k === 2 || k === 6) await snapLights(page, `pair1p-p${k}-after`, LIGHTS);
        pairPulls.push(pAfter);
      }
      // Turn off dual wield cleanly before launcher
      await page.evaluate(`(() => {
        const T = window.TT, H = window.__ce6Helpers;
        window.__holdSim = false;
        if (T.offhandMeshes.revolver && T.offhandMeshes.revolver.visible) T.toggleDualWieldDbg();
        H.steps(30);
      })()`);
    }
    metrics.revolverPair1P = { pairReady, pulls: pairPulls };
    console.log('[CE-6] Revolver Pair 6 pulls complete:', pairPulls.length);

    // =========================================================================
    // 4. GRENADE LAUNCHER — 1P EYE + 3P FRONT-DRUM CLOSE (6 shots + 1 reload)
    // =========================================================================
    // First: 1P eye shots (1..6)
    await page.evaluate(`(async () => {
      const T = window.TT, H = window.__ce6Helpers, tg = T.trainingDbg.tg(), O = tg.origin;
      window.__holdSim = false;
      T.setShotView(null);
      // Stand in open lobby aiming downrange (+Z) so 40mm grenades land far downrange & sun is unobstructed!
      T.player.position.set(O.x + 0.0, tg.floorY, O.z - 2.5);
      T.setAimYawDbg(0);
      T.setOtsAimDbg(0, -0.04);
      await H.take('launcher');
      for (let i = 0; i < 600 && (T.isReloading && T.isReloading()); i++) T.stepFrame(1 / 60);
      T.setViewFirstDbg(true);
      for (let i = 0; i < 80; i++) T.stepFrame(1 / 60);
      T.setAmmoDbg('launcher', 6);
      H.steps(30);
      window.__holdSim = true;
    })()`);
    await snapLights(page, 'gl1p-s0-rest', LIGHTS);

    const gl1pShots = [];
    for (let k = 1; k <= 6; k++) {
      const sInfo = await page.evaluate(`(() => {
        const T = window.TT, H = window.__ce6Helpers;
        const G = T.weaponMeshes.launcher, ud = G.userData;
        const L0 = T.getAmmo().launcher;
        const t0 = H.turnOf(ud.drum, ud.baseDrumRot);
        const top0 = H.topOf(G, ud.drum, ud.drumRounds, 0.065);
        window.__holdSim = false;
        T.setHp(1e6);
        T.setMouseFireDbg(true);
        for (let f = 0; f < 20 && T.getAmmo().launcher === L0; f++) T.stepFrame(1 / 60);
        T.setMouseFireDbg(false);
        // Step 16 frames (~0.27s) so the ~70ms spring drum index completes and settles cleanly before empty auto-reload
        for (let f = 0; f < 16 && !(T.isReloading && T.isReloading()); f++) T.stepFrame(1 / 60);
        const restTurns = [];
        for (let f = 0; f < 5 && !(T.isReloading && T.isReloading()); f++) { T.stepFrame(1 / 60); restTurns.push(H.turnOf(ud.drum, ud.baseDrumRot)); }
        for (let f = 0; f < 24 && !(T.isReloading && T.isReloading()); f++) T.stepFrame(1 / 60);
        window.__holdSim = true;
        const t1 = H.turnOf(ud.drum, ud.baseDrumRot);
        const V = T.viewmodelDbg(), vg = V && V.gun;
        const vmDrumAngleDeg = vg && vg.drum ? +(vg.drum.quaternion.angleTo(ud.drum.quaternion) * 180 / Math.PI).toFixed(2) : null;
        return {
          shot: ${k},
          liveBefore: L0,
          liveAfter: T.getAmmo().launcher,
          topBefore: top0,
          topAfter: H.topOf(G, ud.drum, ud.drumRounds, 0.065),
          deltaChambers: H.wrap(t1 - t0),
          restFlickerChambers: restTurns.length > 1 ? +(Math.max(...restTurns) - Math.min(...restTurns)).toFixed(5) : 0,
          drumRoundsVisible: ud.drumRounds ? ud.drumRounds.map((r) => !!r.visible) : null,
          drumNosesVisible: ud.drumNoses ? ud.drumNoses.map((r) => !!r.visible) : null,
          chamberIndex: ud.chamberIndex ? { ...ud.chamberIndex } : null,
          vmDrumAngleDeg
        };
      })()`);
      if (k === 1 || k === 3 || k === 6) await snapLights(page, `gl1p-s${k}-after`, LIGHTS);
      gl1pShots.push(sInfo);
    }
    metrics.launcher1P = gl1pShots;

    // Second: 3P Front-3/4 Close Drum Camera (shows chambers turning + live noses vs spent cases across 6 shots!)
    await page.evaluate(`(() => {
      const T = window.TT, H = window.__ce6Helpers;
      window.__holdSim = false;
      for (let i = 0; i < 900 && (T.isReloading && T.isReloading()); i++) T.stepFrame(1 / 60);
      T.setViewFirstDbg(false);
      H.steps(25);
      T.setAmmoDbg('launcher', 6);
      H.steps(30);
      H.aimClose3PGun(T.weaponMeshes.launcher, [0.32, 0.12, 0.44]);
      window.__holdSim = true;
    })()`);
    await snapLights(page, 'gl3p-s0-full6', LIGHTS);

    const gl3pShots = [];
    for (let k = 1; k <= 6; k++) {
      const s3 = await page.evaluate(`(() => {
        const T = window.TT, H = window.__ce6Helpers;
        const G = T.weaponMeshes.launcher, ud = G.userData;
        const L0 = T.getAmmo().launcher;
        const t0 = H.turnOf(ud.drum, ud.baseDrumRot);
        window.__holdSim = false;
        T.setHp(1e6);
        T.setMouseFireDbg(true);
        for (let f = 0; f < 20 && T.getAmmo().launcher === L0; f++) T.stepFrame(1 / 60);
        T.setMouseFireDbg(false);
        for (let f = 0; f < 45 && !(T.isReloading && T.isReloading()); f++) T.stepFrame(1 / 60);
        H.aimClose3PGun(G, [0.32, 0.12, 0.44]);
        window.__holdSim = true;
        return {
          shot: ${k},
          liveAfter: T.getAmmo().launcher,
          deltaChambers: H.wrap(H.turnOf(ud.drum, ud.baseDrumRot) - t0),
          topAfter: H.topOf(G, ud.drum, ud.drumRounds, 0.065),
          drumRoundsVisibleCount: ud.drumRounds ? ud.drumRounds.filter((r) => r.visible).length : null,
          drumNosesVisibleCount: ud.drumNoses ? ud.drumNoses.filter((r) => r.visible).length : null
        };
      })()`);
      if (k === 1 || k === 3 || k === 6) await snapLights(page, `gl3p-s${k}-after`, LIGHTS);
      gl3pShots.push(s3);
    }
    metrics.launcher3P = gl3pShots;

    // Launcher reload jump check
    metrics.launcherReload = await page.evaluate(`(() => {
      const T = window.TT, H = window.__ce6Helpers;
      window.__holdSim = false;
      T.setShotView(null);
      T.setViewFirstDbg(true);
      for (let i = 0; i < 60; i++) T.stepFrame(1 / 60);
      T.setAmmoDbg('launcher', 2);
      H.steps(20);
      const G = T.weaponMeshes.launcher, ud = G.userData;
      let prev = H.turnOf(ud.drum, ud.baseDrumRot), worst = 0, worstAt = 0, seen = false;
      T.startReload();
      for (let i = 0; i < 900; i++) {
        T.stepFrame(1 / 60);
        const rel = T.isReloading ? T.isReloading() : false;
        if (rel) seen = true;
        const cur = H.turnOf(ud.drum, ud.baseDrumRot);
        const d = Math.abs(H.wrap(cur - prev));
        prev = cur;
        if (d > worst) { worst = +d.toFixed(4); worstAt = i; }
        if (seen && !rel) {
          for (let j = 0; j < 10; j++) {
            T.stepFrame(1 / 60);
            const c2 = H.turnOf(ud.drum, ud.baseDrumRot);
            const d2 = Math.abs(H.wrap(c2 - prev));
            prev = c2;
            if (d2 > worst) { worst = +d2.toFixed(4); worstAt = i + j; }
          }
          break;
        }
      }
      window.__holdSim = true;
      return {
        seen,
        worstSingleFrameDeltaChambers: worst,
        worstAtFrame: worstAt,
        liveAfter: T.getAmmo().launcher,
        topAfter: H.topOf(G, ud.drum, ud.drumRounds, 0.065)
      };
    })()`);

    metrics.pageErrors = await page.evaluate('window.__ce6Errs || []');
    fs.writeFileSync(path.join(OUT_DIR, 'ce6-metrics.json'), JSON.stringify(metrics, null, 2));
    console.log('[CE-6] All captures and metrics saved to review/CE-6/gpu/ce6-metrics.json');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

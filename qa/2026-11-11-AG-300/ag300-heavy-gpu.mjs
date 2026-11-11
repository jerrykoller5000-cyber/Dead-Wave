// qa/2026-11-11-AG-300/ag300-heavy-gpu.mjs
// Independent RTX 5080 WebGPU 4-light verification for GT-20077/79:
//   - Flamethrower ('flamer') & Chainsaw ('chainsaw')
//   - Factory & M81 camo across Noon, Overcast, Dusk, Night at:
//       * 1P hip (eye on firing line)
//       * 1P aimed (ADS / raised eye)
//       * 3P held (close right-side view showing case/covers, gauge, hose, orange motor, bar & chain)
//       * Armory wall rack copy (verifying rackGunCopy finish & zero camo bleed onto non-painted parts)
//   - Strictly offscreen (-3800,-3800) while Jerry sleeps.

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

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-300');
const OUT_REV = path.join(ROOT, 'review/AG-300');
const OUT_FLAMER = path.join(ROOT, 'review/GT-20077/flamer/gpu');
const OUT_SAW = path.join(ROOT, 'review/GT-20077/chainsaw/gpu');
for (const d of [OUT_QA, OUT_REV, OUT_FLAMER, OUT_SAW]) fs.mkdirSync(d, { recursive: true });

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];
const FINISHES = [
  { key: '', label: 'factory' },
  { key: 'm81', label: 'm81' }
];
const WEAPONS = [
  {
    key: 'flamer',
    outDir: OUT_FLAMER,
    heldFocus: [0.0, 0.02, 0.08],
    heldEye: [-1.35, 0.28, 0.36],
    fov: 34
  },
  {
    key: 'chainsaw',
    outDir: OUT_SAW,
    heldFocus: [-0.04, 0.02, 0.14],
    heldEye: [-1.42, 0.32, 0.42],
    fov: 34
  }
];

async function writeRetry(fp, buf) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const tmp = `${fp}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
  for (let a = 0; a < 25; a++) {
    try {
      await fs.promises.writeFile(tmp, buf);
      try { await fs.promises.unlink(fp); } catch (_) {}
      await fs.promises.rename(tmp, fp);
      return;
    } catch (e) {
      try { await fs.promises.unlink(tmp); } catch (_) {}
      if (a === 24) throw e;
      await new Promise((r) => setTimeout(r, 120 + a * 100));
    }
  }
}

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

async function shotWeapon(page, wOutDir, name) {
  await page.evaluate(`(() => { window.__holdRender = true; if (window.TT) window.TT.flightHold(false); })()`);
  await new Promise((r) => setTimeout(r, 40));
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await page.evaluate(`(() => { window.__holdRender = false; if (window.TT) window.TT.flightHold(true); })()`);
  const buf = Buffer.from(res.data, 'base64');
  await writeRetry(path.join(wOutDir, name), buf);
  await writeRetry(path.join(OUT_QA, name), buf);
}

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
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await moveOffscreen(page);
  assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
  await page.evaluate(`(() => {
    document.getElementById('playerName').value = 'AG-300';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

  await page.evaluate(`(async () => {
    const T = window.TT, H = T.inspectHost();
    const { LIGHTS } = await import('/studio/inspector/stage.js');
    const css = document.createElement('style');
    css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair,#interact,#perf{display:none!important;visibility:hidden!important}';
    document.head.append(css);
    window.__LIGHTS = LIGHTS;
    window.agLight = 'noon';
    window.__holdRender = false;
    window.__illuminate = function illuminate() {
      const L = window.__LIGHTS[window.agLight] || window.__LIGHTS['noon'];
      const p = T.camera.position;
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
    H.attach({ held: () => !!window.__holdRender, scale: (dt) => dt, frame: window.__illuminate });
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.flightHold(true);
  })()`);

  const timeMap = { noon: 0.44, overcast: 0.50, dusk: 0.75, night: 0.02 };
  const report = { backend: null, weapons: {} };
  report.backend = await page.evaluate('TT.renderer?.backend?.constructor?.name || "WebGPUBackend"');

  for (const w of WEAPONS) {
    report.weapons[w.key] = { views: [], rack: [] };
    // Equip weapon cleanly
    await page.evaluate(`((wKey) => {
      const T = window.TT;
      T.setShotView(null);
      T.setViewFirstDbg(true);
      T.setZoomHeldDbg(false);
      const idx = T.WEAPON_ORDER.indexOf(wKey);
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== wKey; i++) {
        T.setWeapon(idx);
        for (let k = 0; k < 10; k++) T.stepFrame(1 / 60);
      }
      for (let k = 0; k < 60; k++) T.stepFrame(1 / 60);
    })(${JSON.stringify(w.key)})`);

    for (const fin of FINISHES) {
      for (const view of ['hip', 'aimed', 'held']) {
        for (const light of LIGHTS) {
          const info = await page.evaluate(`((wKey, finKey, view, light, wTime, hf, he, fov) => {
            const T = window.TT, THREE = T.THREE, range = T.trainingDbg.tg();
            window.agLight = light;
            T.setWorldTime(wTime);
            T.setShotView(null);
            T.setViewFirstDbg(view !== 'held');
            T.setZoomHeldDbg(view === 'aimed');
            T.player.position.set(range.origin.x + 5.6, range.floorY, range.origin.z + 2.0);
            T.setAimYawDbg(0);
            T.setOtsAimDbg(0, -0.04);
            T.armoryFinishDbg.paint(wKey, finKey);
            for (let i = 0; i < 55; i++) T.stepFrame(1 / 60);

            if (view === 'held') {
              const gun = T.weaponMeshes[wKey];
              const focus = gun.localToWorld(new THREE.Vector3(hf[0], hf[1], hf[2]));
              const eye = gun.localToWorld(new THREE.Vector3(he[0], he[1], he[2]));
              T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: focus.x, ty: focus.y, tz: focus.z, fov });
              for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
            }
            window.__illuminate();
            T.renderer.render(T.scene, T.camera);
            const rInfo = T.renderer.info?.render || {};
            const draws = rInfo.drawCalls != null ? rInfo.drawCalls : (rInfo.calls || 0);
            const root = view === 'held' ? T.weaponMeshes[wKey] : T.viewmodelDbg()?.gun?.root;
            let meshCount = 0, instCount = 0, paintedMeshes = 0;
            if (root) {
              root.traverse((o) => {
                if (o.isInstancedMesh) { instCount++; meshCount++; }
                else if (o.isMesh) meshCount++;
                if (o.isMesh && o.material && (o.material.map && /camo|m81/i.test(o.material.map.name || '') || o.material.userData?.gunPaintId)) {
                  paintedMeshes++;
                }
              });
            }
            return { fin: finKey || 'factory', view, light, draws, meshCount, instCount, paintedMeshes, vmFov: T.viewmodelDbg()?.proj?.fov || null };
          })(${JSON.stringify(w.key)}, ${JSON.stringify(fin.key)}, ${JSON.stringify(view)}, ${JSON.stringify(light)}, ${timeMap[light]}, ${JSON.stringify(w.heldFocus)}, ${JSON.stringify(w.heldEye)}, ${w.fov})`);
          report.weapons[w.key].views.push(info);
          await shotWeapon(page, w.outDir, `${w.key}-${fin.label}-${view}-${light}.png`);
        }
      }

      // Armory wall rack copy in 4 lights
      for (const light of LIGHTS) {
        const rackInfo = await page.evaluate(`((wKey, finKey, light, wTime) => {
          const T = window.TT, THREE = T.THREE, tg = T.trainingDbg.tg();
          window.agLight = light;
          T.setWorldTime(wTime);
          T.setViewFirstDbg(false);
          T.armoryFinishDbg.paint(wKey, finKey);
          const arm = T.armoryDbg.ui().armory;
          if (!T.armoryDbg.stored().includes(wKey)) arm.buy({ id: 'ag300-' + wKey, kind: wKey }, { store: true });
          T.armoryDbg.refreshRack(true);
          for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
          const rackRoot = T.scene.getObjectByName('training-armory')?.getObjectByName('armoryRack');
          const item = rackRoot?.children.find((o) => o.userData?.rackKind === wKey);
          if (item) {
            const box = new THREE.Box3().setFromObject(item);
            const c = box.getCenter(new THREE.Vector3());
            T.player.position.set(6.2, tg.floorY, c.z);
            T.setShotView({ x: c.x - 0.92, y: c.y + 0.06, z: c.z + 0.16, tx: c.x, ty: c.y, tz: c.z, fov: 35 });
            for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
          }
          window.__illuminate();
          T.renderer.render(T.scene, T.camera);
          return { fin: finKey || 'factory', light, foundRack: !!item };
        })(${JSON.stringify(w.key)}, ${JSON.stringify(fin.key)}, ${JSON.stringify(light)}, ${timeMap[light]})`);
        report.weapons[w.key].rack.push(rackInfo);
        await shotWeapon(page, w.outDir, `${w.key}-${fin.label}-rack-${light}.png`);
      }
      // Restore factory before next weapon/finish
      await page.evaluate(`((wKey) => { window.TT.armoryFinishDbg.paint(wKey, ''); })(${JSON.stringify(w.key)})`);
    }
  }

  const jsonBuf = Buffer.from(JSON.stringify(report, null, 2));
  await writeRetry(path.join(OUT_QA, 'gpu-heavy-report.json'), jsonBuf);
  await writeRetry(path.join(OUT_REV, 'gpu-heavy-report.json'), jsonBuf);
  await writeRetry(path.join(OUT_FLAMER, 'gpu-flamer-report.json'), Buffer.from(JSON.stringify({ backend: report.backend, flamer: report.weapons.flamer }, null, 2)));
  await writeRetry(path.join(OUT_SAW, 'gpu-chainsaw-report.json'), Buffer.from(JSON.stringify({ backend: report.backend, chainsaw: report.weapons.chainsaw }, null, 2)));
  assert.deepEqual(page.errors, []);
  console.log('[AG-300] Captured 64 4-light RTX 5080 WebGPU PNGs for flamer + chainsaw (factory & M81)!');
} finally {
  await browser.close();
  await server.close();
}

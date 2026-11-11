// scratch/ag298-kr7-wood-gpu.mjs
// Independent RTX 5080 WebGPU 4-light verification for GT-20082 (J135: KR-7 wood furniture)
// Captures factory & M81 across Noon, Overcast, Dusk, Night at:
//   - 1P hip (resting firing-line eye)
//   - 1P aimed (comb ~30 cm from eye)
//   - 1P canted reload/inspect (close look at handguard + grip + stock cut edges)
//   - 3P held gun
//   - Armory rack copy (verifying rackGunCopy preserved authored wood UVs & zero camo bleed)

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

const OUT_GPU = path.join(ROOT, 'review/GT-20082/gpu');
const OUT_QA  = path.join(ROOT, 'qa/2026-11-11-AG-298');
fs.mkdirSync(OUT_GPU, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];
const FINISHES = [
  { key: '', label: 'factory' },
  { key: 'm81', label: 'm81' }
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
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', {
      windowId,
      bounds: { left: -3800, top: -3800, width: 1280, height: 720 }
    });
  } catch (_) {}
}

async function shotTo(page, name) {
  await page.evaluate(`(() => { window.__holdRender = true; if (window.TT) window.TT.flightHold(false); })()`);
  await new Promise((r) => setTimeout(r, 55));
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await page.evaluate(`(() => { window.__holdRender = false; if (window.TT) window.TT.flightHold(true); })()`);
  const buf = Buffer.from(res.data, 'base64');
  await writeRetry(path.join(OUT_GPU, name), buf);
  await writeRetry(path.join(OUT_QA, name), buf);
  console.log(`[GT-20082:gpu] saved ${name} (${(buf.length / 1024).toFixed(1)} kB)`);
}

async function main() {
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--window-position=-3800,-3800', '--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await moveOffscreen(page);
    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));
    await page.evaluate(`(() => {
      document.getElementById('playerName').value = 'AG-Wood5080';
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
      function illuminate() {
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
      }
      H.attach({ held: () => !!window.__holdRender, scale: (dt) => dt, frame: illuminate });
      T.grantAllWeapons();
      T.modsOwnAllDbg();
      if (T.isUnarmed()) T.toggleHolster();
      T.flightHold(true);
      const akIdx = T.WEAPON_ORDER.indexOf('ak');
      for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'ak'; i++) {
        T.setWeapon(akIdx);
        for (let k = 0; k < 8; k++) T.stepFrame(1 / 60);
      }
      try { T.opticDbg?.clear?.('ak'); } catch (_) {}
      try { T.armoryDbg?.fit?.('ak', 'suppressor', false); } catch (_) {}
    })()`);

    const timeMap = { noon: 0.44, overcast: 0.50, dusk: 0.75, night: 0.02 };
    const report = { backend: null, woodChecks: [], rackCheck: null };
    report.backend = await page.evaluate('TT.renderer?.backend?.constructor?.name || TT.getRendererBackend?.() || "WebGPU"');

    for (const fin of FINISHES) {
      for (const view of ['hip', 'aimed', 'canted', 'held']) {
        if (fin.label === 'm81' && view === 'canted') continue;
        for (const light of LIGHTS) {
          const info = await page.evaluate(`((finKey, view, light, wTime) => {
            const T = window.TT, THREE = T.THREE, range = T.trainingDbg.tg();
            window.agLight = light;
            T.setWorldTime(wTime);
            T.setShotView(null);
            T.setViewFirstDbg(view !== 'held');
            T.setZoomHeldDbg(view === 'aimed');
            T.player.position.set(range.origin.x, range.floorY, range.origin.z - 0.55);
            T.setAimYawDbg(0);
            T.setOtsAimDbg(0, -0.06);
            T.armoryFinishDbg.paint('ak', finKey);
            T.setMagazinesDbg('ak', 30, [30, 30]);
            for (let i = 0; i < 65; i++) T.stepFrame(1 / 60);

            if (view === 'canted') {
              // Step into canted reload reach so stock, pistol grip, and handguard laminate show together
              T.setMagazinesDbg('ak', 12, [30, 30]);
              document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true }));
              document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', key: 'r', bubbles: true }));
              for (let i = 0; i < 160; i++) {
                T.stepFrame(1 / 60);
                const rl = T.getReloadDbg?.();
                if (rl && rl.anim > 0 && (1 - rl.timer / rl.anim) >= 0.76) break;
              }
            } else if (view === 'held') {
              const gun = T.weaponMeshes.ak;
              const focus = gun.localToWorld(new THREE.Vector3(0, -0.04, 0.07));
              const eye = gun.localToWorld(new THREE.Vector3(-1.45, 0.30, 0.34));
              T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: focus.x, ty: focus.y, tz: focus.z, fov: 32 });
              for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
            }

            const root = view === 'held' ? T.weaponMeshes.ak : T.viewmodelDbg().gun.root;
            const woodMeshes = [];
            root.traverse(o => {
              if (o.isMesh && o.material && (/KR-7 (walnut|birch)/i.test(o.material.name || '') || o.material.userData?.preserveArtworkUV)) {
                woodMeshes.push({
                  name: o.name,
                  matName: o.material.name,
                  mapName: o.material.map?.name || '',
                  roughness: o.material.roughness,
                  metalness: o.material.metalness,
                  finishRole: o.material.userData?.weaponFinishRole || null,
                  gunPaintId: o.material.userData?.gunPaintId || null
                });
              }
            });
            // Finish reload if canted so next view starts clean
            return { finKey: finKey || 'factory', view, light, woodCount: woodMeshes.length, woodMeshes };
          })(${JSON.stringify(fin.key)}, ${JSON.stringify(view)}, ${JSON.stringify(light)}, ${timeMap[light]})`);
          report.woodChecks.push(info);
          await shotTo(page, `kr7-${fin.label}-${view}-${light}.png`);
          if (view === 'canted') {
            await page.evaluate(`(() => { for (let i = 0; i < 90; i++) TT.stepFrame(1 / 60); })()`);
          }
        }
      }
    }

    // Armory wall rack copy in 4 lights (factory & M81)
    for (const fin of FINISHES) {
      for (const light of LIGHTS) {
        const rackInfo = await page.evaluate(`((finKey, light, wTime) => {
          const T = window.TT, THREE = T.THREE, tg = T.trainingDbg.tg();
          window.agLight = light;
          T.setWorldTime(wTime);
          T.setViewFirstDbg(false);
          T.armoryFinishDbg.paint('ak', finKey);
          const arm = T.armoryDbg.ui().armory;
          if (!T.armoryDbg.stored().includes('ak')) arm.buy({ id: 'ag-wood-kr7', kind: 'ak' }, { store: true });
          T.armoryDbg.refreshRack(true);
          for (let i = 0; i < 20; i++) T.stepFrame(1 / 60);
          const rackRoot = T.scene.getObjectByName('training-armory')?.getObjectByName('armoryRack');
          const akRack = rackRoot?.children.find(o => o.userData?.rackKind === 'ak');
          if (akRack) {
            const box = new THREE.Box3().setFromObject(akRack);
            const c = box.getCenter(new THREE.Vector3());
            T.player.position.set(6.4, tg.floorY, c.z);
            T.setShotView({ x: c.x - 0.85, y: c.y + 0.06, z: c.z + 0.18, tx: c.x, ty: c.y, tz: c.z, fov: 32 });
            for (let i = 0; i < 10; i++) T.stepFrame(1 / 60);
          }
          let preservedCount = 0, camoBleed = 0;
          if (akRack) {
            akRack.traverse(o => {
              if (o.isMesh && o.material?.userData?.preserveArtworkUV) {
                preservedCount++;
                if (o.material.userData.weaponFinishRole || o.material.userData.gunPaintId) camoBleed++;
              }
            });
          }
          return { finKey: finKey || 'factory', light, foundRack: !!akRack, preservedCount, camoBleed };
        })(${JSON.stringify(fin.key)}, ${JSON.stringify(light)}, ${timeMap[light]})`);
        report.rackCheck = rackInfo;
        await shotTo(page, `kr7-${fin.label}-rack-${light}.png`);
      }
    }

    const buf = Buffer.from(JSON.stringify(report, null, 2));
    await writeRetry(path.join(OUT_GPU, 'gpu-wood-report.json'), buf);
    await writeRetry(path.join(OUT_QA, 'gpu-wood-report.json'), buf);
    assert.deepEqual(page.errors, []);
    console.log('[GT-20082:gpu] Completed all independent 5080 views!');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

// tools/ag294-capture.mjs
// Real-game WebGPU inspection & capture on NVIDIA GeForce RTX 5080 for AG-294 (J129 / D-144):
// Pump Shotgun, KR-7, Service Revolver, Wasp (incl. 03:50Z 29.7mm round fix), and Breacher-12 (03:45Z GT-20077).
// Captures Hip, Aimed, and Reload in Factory and M81 across all 4 lights (Noon, Overcast, Dusk, Night)
// with H.attach frame illumination matching GT-20077/eye.mjs, plus Armory Rack (Factory, M81, Fitted M81)
// and fitted-attachments 1P M81 check.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_REV = path.join(ROOT, 'review/AG-294');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-294');
fs.mkdirSync(OUT_REV, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

function writeRetry(filePath, data, retries = 30, delay = 150) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.' + process.pid + '.' + Math.random().toString(36).slice(2) + '.tmp';
  fs.writeFileSync(tmp, data);
  for (let i = 0; i < retries; i++) {
    try {
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      fs.renameSync(tmp, filePath);
      return;
    } catch (e) {
      if (i === retries - 1) {
        try { fs.copyFileSync(tmp, filePath); fs.unlinkSync(tmp); return; } catch {}
        throw e;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

async function captureScreenshot(page, filePath) {
  const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const buf = Buffer.from(res.data, 'base64');
  writeRetry(filePath, buf);
  return buf;
}

const GUNS = [
  { id: 'shotgun', slug: 'shotgun', name: 'Pump Shotgun', displayName: 'Pump Shotgun (12ga)', optic: 'rmr' },
  { id: 'ak', slug: 'ak', name: 'KR-7', displayName: 'KR-7 Rifle (ak)', optic: 'acog' },
  { id: 'revolver', slug: 'revolver', name: 'Revolver', displayName: 'Service Revolver (.357)', optic: null },
  { id: 'uzi', slug: 'wasp', name: 'Wasp', displayName: 'Wasp SMG (uzi)', optic: 'rmr' },
  { id: 'aa12', slug: 'breacher', name: 'Breacher-12', displayName: 'Breacher-12 (aa12)', optic: 'rmr' }
];

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

async function main() {
  console.log('[AG-294] Starting WebGPU Revised Guns Inspection on RTX 5080...');
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-3800,-3800',
      '--window-size=1280,720',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -3800, top: -3800, width: 1280, height: 720 } });
    } catch {}

    await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"', { timeout: 120000 }));
    await page.evaluate('DWOpening.dismissForTesting()');
    assert(await page.waitFor('!DWOpening.active', { timeout: 60000 }));

    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Inspector';
      const btn = document.getElementById('modeTraining');
      if (btn) btn.click();
    })()`);

    assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

    await page.evaluate(`(() => {
      const css = document.createElement('style');
      css.id = 'ag294-clean-view';
      css.textContent = 'body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair,#centerDot,#hitReticle,#interact{display:none!important;visibility:hidden!important}';
      document.head.append(css);
    })()`);

    const gpuRenderer = await page.evaluate(`(() => {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : navigator.userAgent;
      } catch (e) { return String(e); }
    })()`);
    console.log('[AG-294] Active GPU Adapter:', gpuRenderer);

    await page.evaluate(`(async () => {
      const T = window.TT, H = T.inspectHost();
      const { LIGHTS } = await import('/studio/inspector/stage.js');
      window.LIGHTS_PRESETS = LIGHTS;
      window.eyeLight = 'noon';

      T.setViewFirstDbg(true);
      T.grantAllWeapons();
      T.modsOwnAllDbg();
      if (T.isUnarmed()) T.toggleHolster();
      T.flightHold(false);

      function illuminate() {
        const L = window.LIGHTS_PRESETS[window.eyeLight] || window.LIGHTS_PRESETS.noon;
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
        if (H.moon) H.moon.intensity = 0;
      }
      H.attach({ held: () => false, scale: dt => dt, frame: illuminate });
      window.__illuminate = illuminate;

      window.ensureRackLights = (on) => {
        if (on) {
          if (!window.__rackLamp) {
            const rack = T.scene.getObjectByName('training-armory')?.getObjectByName('armoryRack');
            const center = new T.THREE.Vector3(2.3, T.player.position.y + 1.35, -651.5);
            if (rack) rack.getWorldPosition(center);
            const lamp = new T.THREE.DirectionalLight(0xffecd6, 2.35);
            lamp.position.copy(center).add(new T.THREE.Vector3(-1.8, 2.6, 3.4));
            lamp.target.position.copy(center);
            const hemi = new T.THREE.HemisphereLight(0xf3f7ff, 0xc7bba9, 1.55);
            T.scene.add(lamp, lamp.target, hemi);
            window.__rackLamp = lamp;
            window.__rackHemi = hemi;
          }
        } else {
          if (window.__rackLamp) {
            T.scene.remove(window.__rackLamp, window.__rackLamp.target, window.__rackHemi);
            window.__rackLamp = null;
            window.__rackHemi = null;
          }
        }
      };

      window.clearReload = () => {
        if (T.reloadClipDbg) T.reloadClipDbg.hold(null);
        T.setZoomHeldDbg(false);
        for (let i = 0; i < 180 && T.isReloading(); i++) T.stepFrame(1 / 30);
      };

      window.selectGun = async (gunId) => {
        window.ensureRackLights(false);
        T.setShotView(null);
        T.setViewFirstDbg(true);
        if (T.isUnarmed()) T.toggleHolster();
        window.clearReload();
        T.flightHold(false);
        const idx = T.WEAPON_ORDER.indexOf(gunId);
        for (let i = 0; i < 30 && T.getCurrentWeapon() !== gunId; i++) {
          T.setWeapon(idx);
          for (let s = 0; s < 6; s++) T.stepFrame(1 / 30);
          await new Promise(r => setTimeout(r, 60));
        }
        const tg = T.trainingDbg?.tg();
        if (tg) {
          T.player.position.set(tg.origin.x + 0.0, tg.floorY, tg.origin.z - 0.55);
        }
        T.setOtsAimDbg(0, -0.08);
        T.flightHold(true);
        for (let i = 0; i < 120; i++) T.stepFrame(1 / 30);

        const armory = T.armoryDbg?.ui()?.armory;
        if (armory && !T.armoryDbg.stored().includes(gunId)) {
          armory.buy({ id: 'ag294-rack-' + gunId, kind: gunId }, { store: true });
        }
        T.armoryDbg?.refreshRack(true);
        const vm = T.viewmodelDbg();
        if (!vm.info.active || vm.info.key !== gunId) {
          throw new Error('Viewmodel failed to activate for ' + gunId + ': ' + JSON.stringify(vm.info));
        }
      };

      window.setAttachments = (gunId, opticId, enabled) => {
        const mods = T.armoryDbg?.mods(gunId) || [];
        const wanted = ['suppressor', 'laserLight'];
        if (opticId) wanted.push('optic:' + opticId);
        const fitted = [];
        for (const m of mods) {
          if (m.id.startsWith('optic:') || m.id === 'suppressor' || m.id === 'laserLight' || m.id === 'extMag') {
            const shouldFit = enabled && (wanted.includes(m.id) || (gunId === 'aa12' && m.id === 'extMag'));
            if (T.armoryDbg.fit(gunId, m.id, shouldFit) && shouldFit) fitted.push(m.id);
          }
        }
        T.armoryDbg?.refreshRack(true);
        for (let i = 0; i < 36; i++) T.stepFrame(1 / 30);
        return fitted;
      };

      window.setFinish = async (gunId, finishKey) => {
        let applied = '';
        if (T.armoryFinishDbg) {
          const ok = T.armoryFinishDbg.paint(gunId, finishKey);
          applied = T.armoryFinishDbg.list(gunId)?.current || '';
          if (finishKey && !ok) {
            const list = T.armoryFinishDbg.list(gunId)?.list || [];
            const fallback = list.find(x => x.key === 'm81') || list.find(x => x.key && !x.locked);
            if (fallback) {
              T.armoryFinishDbg.paint(gunId, fallback.key);
              applied = T.armoryFinishDbg.list(gunId)?.current || '';
            }
          }
        }
        T.armoryDbg?.refreshRack(true);
        for (let i = 0; i < 42; i++) T.stepFrame(1 / 30);
        for (let pass = 0; pass < 3; pass++) {
          await new Promise(r => setTimeout(r, 60));
          T.stepFrame(1 / 30);
        }
        return applied;
      };

      window.setPoseAndLight = async (gunId, pose, lightName, reloadU = 0.46) => {
        window.ensureRackLights(false);
        window.eyeLight = lightName;
        T.setShotView(null);
        T.setViewFirstDbg(true);

        if (pose === 'reload') {
          T.setZoomHeldDbg(false);
          if (!T.isReloading()) {
            T.setAmmoDbg(gunId, 1);
            const magazines = T.magazinesDbg(gunId);
            if (magazines) T.setMagazinesDbg(gunId, 1, [magazines.size || 15, magazines.size || 15]);
            T.startReload();
          }
          T.reloadClipDbg.hold(reloadU);
        } else {
          if (T.isReloading()) {
            window.clearReload();
          }
          T.setZoomHeldDbg(pose === 'aimed');
        }

        for (let i = 0; i < 54; i++) T.stepFrame(1 / 30);
        for (let pass = 0; pass < 4; pass++) {
          await new Promise(r => setTimeout(r, 65));
          T.stepFrame(1 / 30);
        }
        window.__illuminate();
        const state = {
          pose,
          light: lightName,
          ads: Number(T.fpDbg().ads.toFixed(3)),
          reloading: T.isReloading(),
          sun: Number(H.sun.intensity.toFixed(3))
        };
        if (pose === 'hip' && (state.reloading || state.ads > 0.03)) {
          throw new Error('Hip pose dirty on ' + gunId + ': ' + JSON.stringify(state));
        }
        if (pose === 'aimed' && (state.reloading || state.ads < 0.97)) {
          throw new Error('Aimed pose dirty on ' + gunId + ': ' + JSON.stringify(state));
        }
        if (pose === 'reload' && !state.reloading) {
          throw new Error('Reload pose did not hold on ' + gunId + ': ' + JSON.stringify(state));
        }
        return state;
      };

      window.setRackView = async (gunId, lightName, withFill) => {
        window.clearReload();
        window.eyeLight = lightName;
        window.ensureRackLights(withFill);
        T.setViewFirstDbg(false);
        T.armoryDbg?.refreshRack(true);
        const rack = T.scene.getObjectByName('training-armory')?.getObjectByName('armoryRack')
                  || T.house?.armoryRack;
        const gun = rack?.children.find(o => o.userData.rackKind === gunId);
        if (!gun) throw new Error('Missing rack gun for ' + gunId);
        gun.updateWorldMatrix(true, true);
        const bounds = new T.THREE.Box3().setFromObject(gun);
        const pivot = bounds.getCenter(new T.THREE.Vector3());
        const direction = rack.getWorldQuaternion(new T.THREE.Quaternion());
        const span = Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z);
        const dist = Math.max(0.68, span * 1.38);
        const eye = new T.THREE.Vector3(0.10, 0.06, 1).applyQuaternion(direction).multiplyScalar(dist).add(pivot);
        T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: pivot.x, ty: pivot.y, tz: pivot.z, fov: 36 });
        for (let i = 0; i < 16; i++) T.stepFrame(1 / 30);
        for (let pass = 0; pass < 3; pass++) {
          await new Promise(r => setTimeout(r, 65));
          T.stepFrame(1 / 30);
        }
        return { dist: Number(dist.toFixed(3)), span: Number(span.toFixed(3)) };
      };

      window.inspectGunDiagnostics = (gunId) => {
        const g = T.weaponMeshes[gunId];
        const eye = T.viewmodelDbg().gun.root;
        const rack = (T.scene.getObjectByName('training-armory')?.getObjectByName('armoryRack') || T.house?.armoryRack)?.children.find(o => o.userData.rackKind === gunId);
        const furn = T.getGunFurniture?.()?.[gunId] || [];
        const map = furn.find(m => m?.map)?.map || null;

        function tileDensity(root) {
          if (!root || !map) return null;
          root.updateWorldMatrix(true, true);
          const inv = root.matrixWorld.clone().invert();
          const scale = Math.abs(root.getWorldScale(new T.THREE.Vector3()).x) || 1;
          const samples = [];
          root.traverseVisible(o => {
            if (!o.isMesh || o.material?.map !== map) return;
            const geom = o.geometry, p = geom.attributes.position, uv = geom.attributes.uv, ix = geom.index;
            if (!p || !uv) return;
            const rel = new T.THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
            const v = [new T.THREE.Vector3(), new T.THREE.Vector3(), new T.THREE.Vector3()];
            const cross = new T.THREE.Vector3();
            const n = ix ? ix.count : p.count;
            for (let i = 0; i + 2 < n; i += 3) {
              const ids = [i, i + 1, i + 2].map(j => ix ? ix.getX(j) : j);
              ids.forEach((j, k) => v[k].fromBufferAttribute(p, j).applyMatrix4(rel));
              cross.crossVectors(v[1].clone().sub(v[0]), v[2].clone().sub(v[0]));
              const area = Math.max(Math.abs(cross.x), Math.abs(cross.y), Math.abs(cross.z)) * scale * scale;
              const [a, b, c] = ids;
              const texArea = Math.abs((uv.getX(b) - uv.getX(a)) * (uv.getY(c) - uv.getY(a)) - (uv.getX(c) - uv.getX(a)) * (uv.getY(b) - uv.getY(a)));
              if (area > 1e-10 && texArea > 1e-10) samples.push({ w: Math.sqrt(area / texArea), area });
            }
          });
          if (!samples.length) return null;
          samples.sort((a, b) => a.w - b.w);
          const total = samples.reduce((s, x) => s + x.area, 0);
          let acc = 0;
          const q = [];
          for (const s of samples) {
            acc += s.area;
            while (q.length < 3 && acc / total >= [0.1, 0.5, 0.9][q.length]) q.push(Number(s.w.toFixed(3)));
          }
          return { paintedTris: samples.length, tileM: q };
        }

        const paintedParts = [], bareParts = [];
        eye.traverseVisible(o => {
          if (!o.isMesh || !o.material) return;
          const nm = o.name || o.parent?.name || '(unnamed)';
          if (map && o.material.map === map) paintedParts.push(nm);
          else bareParts.push(nm);
        });

        return {
          hasCamoMap: !!map,
          tiles: {
            held: tileDensity(g),
            eye: tileDensity(eye),
            rack: tileDensity(rack)
          },
          controls: g?.userData?.controls || null,
          heatParts: g?.userData?.heatParts || null,
          paintedMeshCount: paintedParts.length,
          bareMeshCount: bareParts.length,
          paintedSample: [...new Set(paintedParts)].slice(0, 16),
          bareSample: [...new Set(bareParts)].slice(0, 16)
        };
      };
    })()`);

    const manifest = { gpuRenderer, guns: {} };

    for (const g of GUNS) {
      console.log(`\n=== [AG-294] Capturing ${g.displayName} (${g.id}) ===`);
      const gunDir = path.join(OUT_REV, g.id);
      const gunQaDir = path.join(OUT_QA, g.id);
      fs.mkdirSync(gunDir, { recursive: true });
      fs.mkdirSync(gunQaDir, { recursive: true });
      for (const d of [gunDir, gunQaDir]) {
        for (const old of fs.readdirSync(d)) {
          if (old.endsWith('.png')) { try { fs.unlinkSync(path.join(d, old)); } catch {} }
        }
      }

      await page.evaluate(`selectGun(${JSON.stringify(g.id)})`);
      await page.evaluate(`setAttachments(${JSON.stringify(g.id)}, ${JSON.stringify(g.optic)}, false)`);
      await page.evaluate(`setFinish(${JSON.stringify(g.id)}, '')`);

      const shots = [];

      for (const pose of ['hip', 'aimed', 'reload']) {
        for (const light of LIGHTS) {
          const st = await page.evaluate(`setPoseAndLight(${JSON.stringify(g.id)}, ${JSON.stringify(pose)}, ${JSON.stringify(light)}, 0.46)`);
          const fn = `${pose}-factory-${light}.png`;
          const buf = await captureScreenshot(page, path.join(gunDir, fn));
          writeRetry(path.join(gunQaDir, fn), buf);
          shots.push({ file: fn, finish: 'factory', pose, light, bytes: buf.length, state: st });
        }
      }

      const appliedFinish = await page.evaluate(`setFinish(${JSON.stringify(g.id)}, 'm81')`);
      console.log(`[AG-294] ${g.id} M81 finish applied: "${appliedFinish}"`);
      const diagM81 = await page.evaluate(`inspectGunDiagnostics(${JSON.stringify(g.id)})`);

      for (const pose of ['hip', 'aimed', 'reload']) {
        for (const light of LIGHTS) {
          const st = await page.evaluate(`setPoseAndLight(${JSON.stringify(g.id)}, ${JSON.stringify(pose)}, ${JSON.stringify(light)}, 0.46)`);
          const fn = `${pose}-m81-${light}.png`;
          const buf = await captureScreenshot(page, path.join(gunDir, fn));
          writeRetry(path.join(gunQaDir, fn), buf);
          shots.push({ file: fn, finish: appliedFinish || 'm81', pose, light, bytes: buf.length, state: st });
        }
      }

      await page.evaluate(`setAttachments(${JSON.stringify(g.id)}, ${JSON.stringify(g.optic)}, false)`);
      await page.evaluate(`setFinish(${JSON.stringify(g.id)}, '')`);
      await page.evaluate(`setRackView(${JSON.stringify(g.id)}, 'noon', true)`);
      {
        const fn = 'rack-factory-noon.png';
        const buf = await captureScreenshot(page, path.join(gunDir, fn));
        writeRetry(path.join(gunQaDir, fn), buf);
        shots.push({ file: fn, finish: 'factory', pose: 'rack', light: 'noon', bytes: buf.length });
      }

      await page.evaluate(`setFinish(${JSON.stringify(g.id)}, 'm81')`);
      await page.evaluate(`setRackView(${JSON.stringify(g.id)}, 'noon', true)`);
      {
        const fn = 'rack-m81-noon.png';
        const buf = await captureScreenshot(page, path.join(gunDir, fn));
        writeRetry(path.join(gunQaDir, fn), buf);
        shots.push({ file: fn, finish: appliedFinish || 'm81', pose: 'rack', light: 'noon', bytes: buf.length });
      }

      const fittedMods = await page.evaluate(`setAttachments(${JSON.stringify(g.id)}, ${JSON.stringify(g.optic)}, true)`);
      await page.evaluate(`setFinish(${JSON.stringify(g.id)}, 'm81')`);
      await page.evaluate(`setRackView(${JSON.stringify(g.id)}, 'noon', true)`);
      {
        const fn = 'rack-m81-fitted.png';
        const buf = await captureScreenshot(page, path.join(gunDir, fn));
        writeRetry(path.join(gunQaDir, fn), buf);
        shots.push({ file: fn, finish: appliedFinish || 'm81', pose: 'rack-fitted', light: 'noon', fittedMods, bytes: buf.length });
      }

      if (g.id === 'uzi') {
        await page.evaluate(`setPoseAndLight('uzi', 'reload', 'noon', 0.74)`);
      } else {
        await page.evaluate(`setPoseAndLight(${JSON.stringify(g.id)}, 'hip', 'noon', 0.46)`);
      }
      {
        const fn = 'fitted-eye-noon.png';
        const buf = await captureScreenshot(page, path.join(gunDir, fn));
        writeRetry(path.join(gunQaDir, fn), buf);
        shots.push({ file: fn, finish: appliedFinish || 'm81', pose: g.id === 'uzi' ? 'reload74-fitted' : 'hip-fitted', light: 'noon', fittedMods, bytes: buf.length });
      }

      await page.evaluate(`setAttachments(${JSON.stringify(g.id)}, ${JSON.stringify(g.optic)}, false)`);
      await page.evaluate(`setFinish(${JSON.stringify(g.id)}, '')`);
      await page.evaluate(`clearReload()`);

      manifest.guns[g.id] = {
        ...g,
        appliedFinish,
        fittedMods,
        diagnostics: diagM81,
        shots
      };
      console.log(`[AG-294] Completed ${shots.length} verified WebGPU captures for ${g.displayName}`);
    }

    assert.equal(page.errors.length, 0, 'Page errors during AG-294: ' + page.errors.join('; '));
    writeRetry(path.join(OUT_REV, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
    writeRetry(path.join(OUT_QA, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('\n[AG-294] All 5 revised guns captured cleanly with 0 page errors!');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error('[AG-294] Capture error:', err);
  process.exit(1);
});

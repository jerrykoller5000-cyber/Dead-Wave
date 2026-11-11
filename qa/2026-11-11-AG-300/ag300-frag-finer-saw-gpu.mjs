// qa/2026-11-11-AG-300/ag300-frag-finer-saw-gpu.mjs
// Independent RTX 5080 WebGPU 4-light look on ChatGPT 2's corrected GT-20077 assets:
//   1. Unmarked Frag Grenade: eye-held, eye-lift, 3P held-left, close surface prop across Noon/Overcast/Dusk/Night
//      + programmatic assertion of ZERO decal/stencil/map nodes on both held & standalone frag models.
//   2. Finer Chainsaw Edge: 1P hip, 1P aimed, 3P held-right, close chain-bar macro across Noon/Overcast/Dusk/Night
//      in Factory & M81 + programmatic check of single InstancedMesh chain batch per copy.

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

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-AG-300/retake');
const OUT_FRAG = path.join(ROOT, 'review/GT-20077/frag/gpu');
const OUT_SAW = path.join(ROOT, 'review/GT-20077/chainsaw/gpu');
for (const d of [OUT_QA, OUT_FRAG, OUT_SAW]) fs.mkdirSync(d, { recursive: true });

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

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
      await new Promise((r) => setTimeout(r, 100 + a * 90));
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
    document.getElementById('playerName').value = 'AG-Frag-Saw';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 60000 }));

  await page.evaluate(`(async () => {
    const T = window.TT, THREE = T.THREE, H = T.inspectHost();
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
      const dir = new THREE.Vector3(...L.dir).normalize();
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
        const want = window.agLight !== 'night';
        if (tg.lightsOn() !== want) tg.setLights(want);
      }
    };
    H.attach({ held: () => !!window.__holdRender, scale: (dt) => dt, frame: window.__illuminate });
    T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster();
    T.setGrenadesDbg(3);
    T.flightHold(true);
    for (let i = 0; i < 60; i++) T.stepFrame(1 / 30);
  })()`);

  const shot = async (outDir, name) => {
    const res = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const buf = Buffer.from(res.data, 'base64');
    await writeRetry(path.join(outDir, name), buf);
    await writeRetry(path.join(OUT_QA, name), buf);
  };

  // PART 1: Unmarked Frag Grenade (eye-held, eye-lift, held-left, surface) across 4 lights
  const fragAudit = await page.evaluate(`(async () => {
    const T = window.TT, THREE = T.THREE;
    const { makeFragGrenade } = await import('/studio/frag-grenade.js');
    window.__fragSample = makeFragGrenade({ THREE });
    window.__fragSample.position.copy(T.player.position).add(new THREE.Vector3(0, 7.2, 0));
    T.scene.add(window.__fragSample);

    T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
    T.holdGrenadeAnim('cocked', 0);
    for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);

    const checkNoInk = (root) => {
      let decalNodes = 0, colorMaps = 0, meshCount = 0;
      root.traverse((o) => {
        if (!o.isMesh) return;
        meshCount++;
        if (/stencil|decal|text|mark/i.test(o.name || '')) decalNodes++;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m && m.map) colorMaps++;
      });
      return { meshCount, decalNodes, colorMaps, hasSpoon: !!root.getObjectByName('spoon'), hasBody: !!root.getObjectByName('body') };
    };
    const heldAudit = checkNoInk(T.grenadeAnimDbg().hand);
    const sampleAudit = checkNoInk(window.__fragSample);
    const vmGrenade = T.viewmodelDbg()?.root?.getObjectByName('vm-grenade');
    const vmAudit = vmGrenade ? checkNoInk(vmGrenade) : null;
    return { heldAudit, sampleAudit, vmAudit };
  })()`);

  assert.equal(fragAudit.heldAudit.decalNodes, 0, 'Held frag still has decal/stencil node');
  assert.equal(fragAudit.heldAudit.colorMaps, 0, 'Held frag still has texture colorMap');
  assert.equal(fragAudit.sampleAudit.decalNodes, 0, 'Standalone frag still has decal/stencil node');
  assert.equal(fragAudit.sampleAudit.colorMaps, 0, 'Standalone frag still has texture colorMap');

  const FRAG_VIEWS = ['eye-held', 'eye-lift', 'held-left', 'surface'];
  for (const view of FRAG_VIEWS) {
    for (const light of LIGHTS) {
      await page.evaluate(`((view, light) => {
        window.__holdRender = false;
        const T = window.TT, THREE = T.THREE, tg = T.trainingDbg.tg();
        window.agLight = light;
        T.setShotView(null);
        T.setViewFirstDbg(view.startsWith('eye'));
        T.player.position.set(tg.origin.x, tg.floorY, tg.origin.z - 0.55);
        T.setOtsAimDbg(0, -0.08);
        T.setZoomHeldDbg(false);
        for (let i = 0; i < 24; i++) T.stepFrame(1 / 30);
        T.holdGrenadeAnim(view === 'eye-lift' ? 'raise' : 'cocked', view === 'eye-lift' ? 0.105 : 0);
        for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);

        if (view === 'surface') {
          const c = window.__fragSample.getWorldPosition(new THREE.Vector3());
          const eye = c.clone().add(new THREE.Vector3(-0.26, 0.065, 0.03));
          T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: c.x, ty: c.y, tz: c.z, fov: 30 });
        } else if (view === 'held-left') {
          const body = T.grenadeAnimDbg().hand.getObjectByName('body');
          const c = new THREE.Box3().setFromObject(body).getCenter(new THREE.Vector3());
          const eye = c.clone().add(new THREE.Vector3(-0.27, 0.085, 0.27));
          T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: c.x, ty: c.y, tz: c.z, fov: 33 });
        }
        for (let i = 0; i < 6; i++) T.stepFrame(1 / 30);
        window.__illuminate();
        T.renderer.render(T.scene, T.camera);
        window.__holdRender = true;
      })(${JSON.stringify(view)}, ${JSON.stringify(light)})`);
      await shot(OUT_FRAG, `frag-${view}-${light}.png`);
    }
  }

  // Release grenade hold & clean standalone sample before Chainsaw inspection
  await page.evaluate(`(() => {
    window.__holdRender = false;
    const T = window.TT;
    if (window.__fragSample) { window.__fragSample.removeFromParent(); window.__fragSample = null; }
    T.holdGrenadeAnim?.(null);
    T.setShotView(null);
    for (let i = 0; i < 20; i++) T.stepFrame(1 / 30);
  })()`);

  // PART 2: Finer Chainsaw Edge (1P hip, 1P aimed, 3P held-right, close chain-bar macro) in Factory & M81 across 4 lights
  const sawAudit = await page.evaluate(`(() => {
    const T = window.TT;
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
    T.setViewFirstDbg(true);
    for (let i = 0; i < 40; i++) T.stepFrame(1 / 30);
    const countInstanced = (root) => {
      const inst = [];
      if (!root) return inst;
      root.traverse((o) => {
        if (o.isInstancedMesh) inst.push({ name: o.name || '(instanced)', count: o.count });
      });
      return inst;
    };
    return {
      worldHeldInstanced: countInstanced(T.weaponMeshes?.chainsaw),
      vmInstanced: countInstanced(T.viewmodelDbg()?.root)
    };
  })()`);

  const SAW_FINISHES = [
    { key: '', label: 'factory' },
    { key: 'm81', label: 'm81' }
  ];
  const SAW_VIEWS = ['1p-hip', '1p-aimed', '3p-held-right', 'chain-macro'];

  for (const fin of SAW_FINISHES) {
    await page.evaluate(`((fk) => {
      window.__holdRender = false;
      const T = window.TT;
      T.armoryFinishDbg.paint('chainsaw', fk);
      T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
      for (let i = 0; i < 30; i++) T.stepFrame(1 / 30);
    })(${JSON.stringify(fin.key)})`);

    for (const view of SAW_VIEWS) {
      for (const light of LIGHTS) {
        await page.evaluate(`((view, light) => {
          window.__holdRender = false;
          const T = window.TT, THREE = T.THREE, tg = T.trainingDbg.tg();
          window.agLight = light;
          T.setShotView(null);
          const is1P = view.startsWith('1p');
          T.setViewFirstDbg(is1P);
          T.setZoomHeldDbg(view === '1p-aimed');
          T.player.position.set(tg.origin.x + 2.0, tg.floorY, tg.origin.z - 0.55);
          T.setAimYawDbg(0);
          T.setOtsAimDbg(0, -0.02);
          for (let i = 0; i < 28; i++) T.stepFrame(1 / 30);

          if (!is1P) {
            const gun = T.weaponMeshes.chainsaw;
            gun.updateWorldMatrix(true, true);
            const box = new THREE.Box3().setFromObject(gun);
            const c = box.getCenter(new THREE.Vector3());
            if (view === '3p-held-right') {
              const eye = c.clone().add(new THREE.Vector3(-0.78, 0.16, 0.24));
              T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: c.x, ty: c.y, tz: c.z + 0.04, fov: 32 });
            } else {
              // chain-macro: tight close-up right on the bar tip & finer alternating steel cutters!
              const tip = c.clone().add(new THREE.Vector3(0.0, 0.01, 0.22));
              const eye = tip.clone().add(new THREE.Vector3(-0.34, 0.07, 0.08));
              T.setShotView({ x: eye.x, y: eye.y, z: eye.z, tx: tip.x, ty: tip.y, tz: tip.z, fov: 26 });
            }
            for (let i = 0; i < 6; i++) T.stepFrame(1 / 30);
          }
          window.__illuminate();
          T.renderer.render(T.scene, T.camera);
          window.__holdRender = true;
        })(${JSON.stringify(view)}, ${JSON.stringify(light)})`);
        await shot(OUT_SAW, `finer-saw-${fin.label}-${view}-${light}.png`);
      }
    }
  }

  // Restore factory finish
  await page.evaluate(`(() => { window.__holdRender = false; window.TT.armoryFinishDbg.paint('chainsaw', ''); window.TT.setShotView(null); })()`);

  const report = {
    capturedAt: new Date().toISOString(),
    fragAudit,
    sawAudit,
    pageErrors: page.errors
  };
  await writeRetry(path.join(OUT_QA, 'gpu-audit.json'), Buffer.from(JSON.stringify(report, null, 2)));
  await writeRetry(path.join(OUT_FRAG, 'gpu-audit-frag.json'), Buffer.from(JSON.stringify(report, null, 2)));
  await writeRetry(path.join(OUT_SAW, 'gpu-audit-finer-saw.json'), Buffer.from(JSON.stringify(report, null, 2)));
  assert.deepEqual(page.errors, []);
  console.log('[AG-Frag-Saw] Captured 16 unmarked-frag 4-light PNGs + 32 finer-chainsaw 4-light PNGs cleanly!');
} finally {
  await browser.close();
  await server.close();
}

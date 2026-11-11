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

const OUT_REV = path.join(ROOT, 'review/CE-4/shots');
const OUT_QA = path.join(ROOT, 'qa/2026-11-11-CE-4-ladder/shots');
fs.mkdirSync(OUT_REV, { recursive: true });
fs.mkdirSync(OUT_QA, { recursive: true });

const LIGHT_KEYS = ['noon', 'overcast', 'dusk', 'night'];

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

function writeSafe(p, buf) {
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, p);
}

function saveJpg(name, shotObj) {
  const buf = Buffer.from(shotObj.b64, 'base64');
  assert(buf.length > 10000, `Shot ${name} too small (${buf.length})`);
  writeSafe(path.join(OUT_REV, name), buf);
  try { writeSafe(path.join(OUT_QA, name), buf); } catch (_) {}
  return { name, bytes: buf.length, lumaMean: shotObj.lumaMean, lumaStd: shotObj.lumaStd };
}

function browserInitFn() {
  const T = window.TT, H = T.inspectHost(), G = T.THREE;
  for (let i = 0; i < 60; i++) T.stepFrame(0.05);

  const css = document.createElement('style');
  css.id = 'ce4-clean-hud';
  css.textContent = '#menu,#title,#hud,#interact,#perf,#trainingHud,#trainingPanel,#trainingBlackout{display:none!important;visibility:hidden!important}';
  document.head.appendChild(css);

  const LIGHTS = {
    noon:     { time: 0.42, sunCol: 0xfff5e2, sunInt: 2.35, hemiSky: 0x9ec5ef, hemiGnd: 0x5c584e, hemiInt: 0.92, amb: 0.42, fill: 0.28, bg: 0x9abde3, exp: 1.04 },
    overcast: { time: 0.30, sunCol: 0xd8e0ea, sunInt: 0.92, hemiSky: 0xaab7c7, hemiGnd: 0x55595f, hemiInt: 1.08, amb: 0.56, fill: 0.34, bg: 0x9ea8b4, exp: 1.02 },
    dusk:     { time: 0.72, sunCol: 0xff8d44, sunInt: 1.38, hemiSky: 0x7b6389, hemiGnd: 0x3b2f2a, hemiInt: 0.56, amb: 0.26, fill: 0.18, bg: 0x4b3d57, exp: 1.00 },
    night:    { time: 0.92, sunCol: 0x5b76a8, sunInt: 0.08, hemiSky: 0x1e2b45, hemiGnd: 0x10131a, hemiInt: 0.24, amb: 0.10, fill: 0.08, bg: 0x0b101b, exp: 1.05 }
  };

  window.__ce4Light = 'noon';
  window.__ce4ExtCam = null;

  const applyRig = () => {
    const key = window.__ce4Light;
    const L = LIGHTS[key];
    if (L) {
      H.renderer.toneMappingExposure = L.exp;
      H.scene.background = new G.Color(L.bg);
      if (H.scene.fog) H.scene.fog.color.setHex(L.bg);
      H.sun.color.setHex(L.sunCol);
      H.sun.intensity = L.sunInt;
      H.hemi.color.setHex(L.hemiSky);
      H.hemi.groundColor.setHex(L.hemiGnd);
      H.hemi.intensity = L.hemiInt;
      if (H.ambient) H.ambient.intensity = L.amb;
      if (H.ambientFill) H.ambientFill.intensity = L.fill;
      if (H.moon) H.moon.intensity = key === 'night' ? 0.20 : 0;
    }
    if (T.flashlight) {
      if (key === 'night') {
        T.flashlight.visible = true;
        T.flashlight.angle = 0.55;
        T.flashlight.penumbra = 0.80;
        T.flashlight.intensity = 7.5;
      } else {
        T.flashlight.visible = false;
      }
    }
  };

  window.__ce4PoseClimb = (lightKey, heightFraction) => {
    window.__ce4Light = lightKey;
    const L = T.hqLadderAt();
    const targetY = L.y + (L.roof - L.y) * heightFraction;
    T.player.position.set(L.x, targetY, L.z);
    T.stepHqLadder(1, 0.05);
    for (let i = 0; i < 5; i++) T.stepFrame(1 / 60);
    applyRig();
  };

  const cap = document.createElement('canvas');
  window.__ce4Capture = async (extSpec) => {
    const vm = T.viewmodelDbg ? T.viewmodelDbg() : null;
    const origPos = H.camera.position.clone();
    const origQuat = H.camera.quaternion.clone();
    const origFov = H.camera.fov;
    const origNear = H.camera.near;
    let origPlace = null;

    try {
      if (extSpec) {
        if (vm) {
          origPlace = vm.place;
          vm.place();
          vm.root.updateMatrixWorld(true);
          vm.place = () => {};
        }
        H.camera.near = 0.05;
        H.camera.fov = extSpec.fov || 45;
        H.camera.updateProjectionMatrix();
        H.camera.position.set(extSpec.pos[0], extSpec.pos[1], extSpec.pos[2]);
        if (extSpec.up) H.camera.up.set(extSpec.up[0], extSpec.up[1], extSpec.up[2]);
        H.camera.lookAt(extSpec.look[0], extSpec.look[1], extSpec.look[2]);
        H.camera.updateMatrixWorld(true);
      }
      await new Promise((r) => setTimeout(r, 0));
      applyRig();
      H.render();

      const src = H.renderer.domElement;
      cap.width = src.width;
      cap.height = src.height;
      const ctx = cap.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src, 0, 0);
      const img = ctx.getImageData(0, 0, cap.width, cap.height).data;
      let s1 = 0, s2 = 0, n = 0;
      for (let i = 0; i < img.length; i += 64) {
        const y = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
        s1 += y; s2 += y * y; n++;
      }
      const mean = s1 / n;
      const std = Math.sqrt(Math.max(0, s2 / n - mean * mean));
      return {
        b64: cap.toDataURL('image/jpeg', 0.94).split(',')[1],
        lumaMean: +mean.toFixed(2),
        lumaStd: +std.toFixed(2)
      };
    } finally {
      if (origPlace && vm) vm.place = origPlace;
      H.camera.up.set(0, 1, 0);
      H.camera.near = origNear;
      H.camera.fov = origFov;
      H.camera.position.copy(origPos);
      H.camera.quaternion.copy(origQuat);
      H.camera.updateProjectionMatrix();
      H.camera.updateMatrixWorld(true);
    }
  };

  const L = T.hqLadderAt();
  return {
    backend: T.renderer?.backend?.constructor?.name || 'unknown',
    ladder: { x: +L.x.toFixed(3), y: +L.y.toFixed(3), z: +L.z.toFixed(3), roof: +L.roof.toFixed(3) }
  };
}

async function main() {
  const server = await serve(ROOT, 0);
  const browser = await launch({
    args: [
      '--enable-unsafe-webgpu',
      '--use-webgpu-power-preference=high-performance',
      '--no-first-run',
      '--window-position=-3800,-3800',
      '--window-size=1280,720'
    ]
  });

  const summary = {
    timestamp: new Date().toISOString(),
    backend: 'unknown',
    ladderPos: null,
    shots: {},
    pageErrors: [],
    gpuWarnings: []
  };

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      const txt = typeof msg?.text === 'function' ? msg.text() : String(msg || '');
      if (/validation|dawn.*error|pipeline.*error/i.test(txt)) summary.gpuWarnings.push(txt);
      if (/contains on Node/i.test(txt)) summary.pageErrors.push('Console error: ' + txt);
    });
    page.on('pageerror', (err) => {
      summary.pageErrors.push(String(err?.message || err));
    });

    try {
      await moveOffscreen(page);
      await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
      await moveOffscreen(page);
      assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
      await page.evaluate('DWOpening.dismissForTesting()');
      assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

      // Enter normal match so HQ building and ladder are live
      await page.evaluate(`(async () => {
        document.getElementById('playerName').value = 'CE4Ladder';
        window.TT.startMatch('Ladder');
      })()`);
      assert(await page.waitFor('window.TT && window.TT.gameStarted && window.TT.hqLadderAt && window.TT.hqLadderAt()', { timeout: 60000 }));
      await moveOffscreen(page);

      summary.backend = await page.evaluate(`(${browserInitFn.toString()})()`);
      summary.ladderPos = summary.backend.ladder;
      const lad = summary.ladderPos;

      // 1. 1P Eye view climbing mid-way across 4 lights
      for (const lk of LIGHT_KEYS) {
        await page.evaluate(`window.__ce4PoseClimb(${JSON.stringify(lk)}, 0.50)`);
        const raw = await page.evaluate('window.__ce4Capture(null)');
        summary.shots[`eye-mid-${lk}`] = saveJpg(`ladder-eye-mid-${lk}.jpg`, raw);
      }

      // 2. 1P Eye view at low (foot) and high (near roof) in noon
      await page.evaluate('window.__ce4PoseClimb("noon", 0.15)');
      summary.shots['eye-low-noon'] = saveJpg('ladder-eye-low-noon.jpg', await page.evaluate('window.__ce4Capture(null)'));
      await page.evaluate('window.__ce4PoseClimb("noon", 0.88)');
      summary.shots['eye-high-noon'] = saveJpg('ladder-eye-high-noon.jpg', await page.evaluate('window.__ce4Capture(null)'));

      // 3. 3P Clean Side View across 4 lights (mid-climb)
      const sideLookMid = [lad.x, lad.y + (lad.roof - lad.y) * 0.50 + 0.5, lad.z];
      const sidePosMid = [lad.x - 2.4, lad.y + (lad.roof - lad.y) * 0.50 + 0.5, lad.z + 1.8];

      for (const lk of LIGHT_KEYS) {
        await page.evaluate(`window.__ce4PoseClimb(${JSON.stringify(lk)}, 0.50)`);
        const raw = await page.evaluate(`window.__ce4Capture(${JSON.stringify({
          fov: 38,
          pos: sidePosMid,
          look: sideLookMid
        })})`);
        summary.shots[`side-mid-${lk}`] = saveJpg(`ladder-side-mid-${lk}.jpg`, raw);
      }

      // 4. 3P Clean Side View at low climb and high climb in noon
      const sideLookLow = [lad.x, lad.y + (lad.roof - lad.y) * 0.20 + 0.5, lad.z];
      const sidePosLow = [lad.x - 2.4, lad.y + (lad.roof - lad.y) * 0.20 + 0.5, lad.z + 1.8];
      await page.evaluate('window.__ce4PoseClimb("noon", 0.20)');
      summary.shots['side-low-noon'] = saveJpg('ladder-side-low-noon.jpg', await page.evaluate(`window.__ce4Capture(${JSON.stringify({
        fov: 38,
        pos: sidePosLow,
        look: sideLookLow
      })})`));

      const sideLookHigh = [lad.x, lad.y + (lad.roof - lad.y) * 0.85 + 0.5, lad.z];
      const sidePosHigh = [lad.x - 2.4, lad.y + (lad.roof - lad.y) * 0.85 + 0.5, lad.z + 1.8];
      await page.evaluate('window.__ce4PoseClimb("noon", 0.85)');
      summary.shots['side-high-noon'] = saveJpg('ladder-side-high-noon.jpg', await page.evaluate(`window.__ce4Capture(${JSON.stringify({
        fov: 38,
        pos: sidePosHigh,
        look: sideLookHigh
      })})`));

      // 5. 3P Full ladder overview from ground to roof
      const fullLook = [lad.x, lad.y + (lad.roof - lad.y) * 0.5, lad.z];
      const fullPos = [lad.x - 4.2, lad.y + (lad.roof - lad.y) * 0.45, lad.z + 2.8];
      await page.evaluate('window.__ce4PoseClimb("noon", 0.50)');
      summary.shots['full-overview-noon'] = saveJpg('ladder-full-overview-noon.jpg', await page.evaluate(`window.__ce4Capture(${JSON.stringify({
        fov: 48,
        pos: fullPos,
        look: fullLook
      })})`));

      assert.equal(summary.pageErrors.length, 0, `Page errors: ${summary.pageErrors.join('; ')}`);
      assert.equal(summary.gpuWarnings.length, 0, `GPU warnings: ${summary.gpuWarnings.join('; ')}`);

      const sumPath = path.join(OUT_REV, 'ce4-ladder-summary.json');
      writeSafe(sumPath, Buffer.from(JSON.stringify(summary, null, 2), 'utf8'));
      console.log(JSON.stringify({
        ok: true,
        backend: summary.backend.backend,
        ladder: summary.ladderPos,
        shotCount: Object.keys(summary.shots).length
      }, null, 2));
    } finally {
      await page.close();
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

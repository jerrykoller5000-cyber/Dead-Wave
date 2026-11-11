// qa/2026-11-11-GT-20076-aa12/aa12-look-v2.mjs
// Independent 4-light RTX 5080 WebGPU look at Breacher (aa12) J128 surface return:
//   - Uses /review/GT-20076/visibility-camera.mjs (makeViews(TT)) for 1:1 camera & lighting parity with ChatGPT 2's J128 audit:
//       * hip (1P eye hip: rear curved-to-polymer crown seam)
//       * aimed (1P eye ADS: top sight & crown)
//       * held-right (3P in hand right: dark rectangular side inset, circular trim disc/beads, front casing-to-side outline)
//       * held-left (3P in hand left: left housing & trim)
//       * rack (Armory rack close-up: grip-side rubber graphics & fore-end contact)
//   - Finishes: Factory across all 5 views x 4 lights + M81 camo masking across hip/held-right/rack x 4 lights + Factory restore (paint('aa12', null))
//   - Plus standalone Marine Inspector (DWInspect.show('weapon.aa12')) 4-light check
//   - Captures directly via H.render() -> canvas.drawImage(H.renderer.domElement) in a fresh task (same pattern as DWInspect.shot())
//     so offscreen (-3800,-3800) Windows DWM occlusion never freezes screenshots while Jerry sleeps.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside game-test slot');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const OUT_QA = path.join(ROOT, 'qa/2026-11-11-GT-20076-aa12/shots');
const OUT_REV = path.join(ROOT, 'review/GT-20076/gpu-aa12/shots');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

function saveShot(name, b64) {
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(OUT_QA, name), buf);
  fs.writeFileSync(path.join(OUT_REV, name), buf);
  const sha = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  return { bytes: buf.length, sha };
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

const VIEW_MAP = [
  ['hip', 'eye-hip'],
  ['aimed', 'eye-ads'],
  ['held-right', 'held-right'],
  ['held-left', 'held-left'],
  ['rack', 'rack']
];

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

  const summary = {
    capturedAt: new Date().toISOString(),
    backend: null,
    cameras: {},
    shots: {},
    m81PaintCheck: null,
    inspectorShots: {},
    consoleWarnings: [],
    pageErrors: []
  };

  try {
    // Pass A: Live Training Ground using exact makeViews(TT) cameras & studio 4-light presets (no shadow-flag mutation!)
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      await moveOffscreen(page);
      await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
      await moveOffscreen(page);
      assert(await page.waitFor('window.TT && window.DWLoad && DWLoad.snapshot().state === "ready"', { timeout: 120000 }));
      await page.evaluate('DWOpening.dismissForTesting()');
      assert(await page.waitFor('!DWOpening.active', { timeout: 30000 }));

      await page.evaluate(`(() => {
        document.getElementById('playerName').value = 'AA12-LOOK';
        document.getElementById('modeTraining').click();
      })()`);
      assert(await page.waitFor(
        'TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
        { timeout: 60000 }
      ));

      summary.backend = await page.evaluate('TT.renderer?.backend?.constructor?.name || "unknown"');

      // Initialize makeViews(TT) and install single-draw same-task capture matching studio/inspector/inspector.js ix.capture
      await page.evaluate(`(async () => {
        const H = TT.inspectHost();
        const m = await import('/review/GT-20076/visibility-camera.mjs');
        window.vis = m.makeViews(TT);
        await window.vis.equip('aa12');

        const cap = document.createElement('canvas');
        window.__captureGpuJpeg = async (quality = 0.92) => {
          await new Promise((r) => setTimeout(r, 0));
          H.render();
          const src = H.renderer.domElement;
          cap.width = src.width;
          cap.height = src.height;
          const g = cap.getContext('2d', { willReadFrequently: true });
          g.fillStyle = '#000';
          g.fillRect(0, 0, cap.width, cap.height);
          g.drawImage(src, 0, 0);
          const sample = g.getImageData(Math.floor(cap.width * 0.2), Math.floor(cap.height * 0.2), Math.floor(cap.width * 0.6), Math.floor(cap.height * 0.6)).data;
          let sum = 0;
          for (let i = 0; i < sample.length; i += 16) {
            sum += 0.2126 * sample[i] + 0.7152 * sample[i + 1] + 0.0722 * sample[i + 2];
          }
          const meanLuma = +(sum / (sample.length / 16)).toFixed(2);
          return { b64: cap.toDataURL('image/jpeg', quality).split(',')[1], meanLuma };
        };
      })()`);

      for (const [visView, outSlug] of VIEW_MAP) {
        summary.cameras[outSlug] = await page.evaluate(`window.vis.pose(${JSON.stringify(visView)})`);
        const hashesForView = new Set();
        for (const light of LIGHTS) {
          await page.evaluate(`window.vis.light(${JSON.stringify(light)})`);
          const { b64, meanLuma } = await page.evaluate(`window.__captureGpuJpeg(0.92)`);
          const fname = `factory-${outSlug}-${light}.jpg`;
          const meta = saveShot(fname, b64);
          summary.shots[fname] = { ...meta, meanLuma };
          assert(meta.bytes > 8000, `Expected non-empty JPEG for ${fname}, got ${meta.bytes}`);
          hashesForView.add(meta.sha);
        }
        if (hashesForView.size !== 4) {
          console.error('Console logs on failure:', page.console.slice(-25));
        }
        assert.equal(hashesForView.size, 4, `Expected 4 distinct light renders for ${outSlug}, got ${hashesForView.size}`);
      }

      const noonViewHashes = new Set(VIEW_MAP.map(([, slug]) => summary.shots[`factory-${slug}-noon.jpg`].sha));
      assert.equal(noonViewHashes.size, 5, `Expected 5 distinct camera views at noon, got ${noonViewHashes.size}`);

      // Apply M81 camo and re-equip so 1P viewmodel, 3P weaponMeshes, and Armory rack all display M81 masking
      summary.m81PaintCheck = await page.evaluate(`(async () => {
        const ok = TT.armoryFinishDbg.paint('aa12', 'm81');
        TT.armoryDbg.refreshRack();
        await window.vis.equip('aa12');
        return { paintedM81: ok, finishNow: TT.runeFinishDbg.readWardrobe()?.guns?.aa12 || null };
      })()`);
      assert.equal(summary.m81PaintCheck.paintedM81, true, 'Expected M81 paint on aa12 to succeed');

      for (const [visView, outSlug] of [['hip', 'eye-hip'], ['held-right', 'held-right'], ['rack', 'rack']]) {
        await page.evaluate(`window.vis.pose(${JSON.stringify(visView)})`);
        for (const light of LIGHTS) {
          await page.evaluate(`window.vis.light(${JSON.stringify(light)})`);
          const { b64, meanLuma } = await page.evaluate(`window.__captureGpuJpeg(0.92)`);
          const fname = `m81-${outSlug}-${light}.jpg`;
          const meta = saveShot(fname, b64);
          summary.shots[fname] = { ...meta, meanLuma };
        }
        assert.notEqual(
          summary.shots[`m81-${outSlug}-noon.jpg`].sha,
          summary.shots[`factory-${outSlug}-noon.jpg`].sha,
          `Expected M81 noon shot for ${outSlug} to differ from Factory noon shot`
        );
      }

      // Restore Factory finish via paint('aa12', null)
      const factoryRestore = await page.evaluate(`(async () => {
        const ok = TT.armoryFinishDbg.paint('aa12', null);
        TT.armoryDbg.refreshRack();
        await window.vis.equip('aa12');
        return { restoredFactory: ok, finishNow: TT.runeFinishDbg.readWardrobe()?.guns?.aa12 || 'factory' };
      })()`);
      summary.m81PaintCheck.factoryRestore = factoryRestore;
      assert.equal(factoryRestore.restoredFactory, true, 'Expected Factory restore paint("aa12", null) to succeed');

      for (const [visView, outSlug] of [['hip', 'eye-hip'], ['held-right', 'held-right'], ['rack', 'rack']]) {
        await page.evaluate(`window.vis.pose(${JSON.stringify(visView)})`);
        await page.evaluate(`window.vis.light('noon')`);
        const { b64, meanLuma } = await page.evaluate(`window.__captureGpuJpeg(0.92)`);
        const fname = `restored-${outSlug}-noon.jpg`;
        const meta = saveShot(fname, b64);
        summary.shots[fname] = { ...meta, meanLuma };
        assert.notEqual(
          meta.sha,
          summary.shots[`m81-${outSlug}-noon.jpg`].sha,
          `Expected Factory-restored noon shot for ${outSlug} to differ from M81 noon shot`
        );
      }

      summary.consoleWarnings.push(
        ...page.console.filter((c) => ['error', 'warning'].includes(c.type) && !/404|powerPreference/i.test(c.text))
      );
      summary.pageErrors.push(...(page.errors || []));
    } finally {
      await page.close().catch(() => {});
    }

    // Pass B: Standalone Marine Inspector (?inspect&debug=1&raf=timer) 4-light close-ups of weapon.aa12
    const ipage = await browser.newPage({ width: 1280, height: 720 });
    try {
      await moveOffscreen(ipage);
      await ipage.goto(`${server.origin}/index.html?inspect&debug=1&raf=timer`, { timeout: 180000 });
      await moveOffscreen(ipage);
      assert(await ipage.waitFor(
        'window.DWInspect?.ready && !TT.trainingDbg.state().warming && !document.getElementById("trainingBlackout")?.classList.contains("on")',
        { timeout: 90000 }
      ));
      await ipage.evaluate(`DWInspect.show('weapon.aa12', { instant: true })`);
      for (const [view, light] of [['side', 'noon'], ['three', 'overcast'], ['rear3', 'dusk'], ['three', 'night']]) {
        const dataUrl = await ipage.evaluate(`(async () => {
          await DWInspect.light(${JSON.stringify(light)});
          DWInspect.view(${JSON.stringify(view)}, { instant: true });
          await DWInspect.stepAsync(3);
          return DWInspect.shot({ type: 'image/jpeg', quality: 0.92 });
        })()`);
        const fname = `inspector-aa12-${view}-${light}.jpg`;
        summary.inspectorShots[fname] = saveShot(fname, dataUrl.split(',')[1]);
      }
      summary.pageErrors.push(...(ipage.errors || []));
    } finally {
      await ipage.close().catch(() => {});
    }

    const jsonStr = JSON.stringify(summary, null, 2);
    fs.writeFileSync(path.join(ROOT, 'qa/2026-11-11-GT-20076-aa12/aa12-summary.json'), jsonStr);
    fs.writeFileSync(path.join(ROOT, 'review/GT-20076/gpu-aa12/aa12-summary.json'), jsonStr);
    assert.deepEqual(summary.pageErrors, [], 'Expected 0 pageErrors during Breacher GPU look');
    console.log('[GT-20076 aa12] Captured', Object.keys(summary.shots).length, 'live shots +', Object.keys(summary.inspectorShots).length, 'inspector shots, 0 errors.');
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

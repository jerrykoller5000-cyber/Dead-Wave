// AH-2: Normal Player WebGPU vs WebGL Training Freeze Reproduction (3x WebGPU + 3x WebGL)
// + Claude 2's Ready-Training Frame Signals (DWOpening.active & renderer._animation._animationLoop hook counts)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-2');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal pure-Node PNG decoder (RGBA/RGB, 8-bit) to measure exact 3D canvas pixel changes between two screenshots
function decodePngRgba(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('Not a PNG');
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    const data = buf.subarray(off + 8, off + 8 + len);
    off += 12 + len;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  assert.equal(bitDepth, 8, `Unsupported PNG bitDepth ${bitDepth}`);
  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 0);
  assert(bpp > 0, `Unsupported PNG colorType ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * bpp;
  const rgba = new Uint8Array(width * height * 4);
  const prev = new Uint8Array(stride);
  const curr = new Uint8Array(stride);
  let src = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    for (let i = 0; i < stride; i++) {
      const x = raw[src++];
      const a = i >= bpp ? curr[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 0) curr[i] = x;
      else if (filter === 1) curr[i] = (x + a) & 255;
      else if (filter === 2) curr[i] = (x + b) & 255;
      else if (filter === 3) curr[i] = (x + ((a + b) >> 1)) & 255;
      else if (filter === 4) curr[i] = (x + paeth(a, b, c)) & 255;
      else throw new Error(`Unknown PNG filter ${filter}`);
    }
    const rowOut = y * width * 4;
    for (let x = 0; x < width; x++) {
      const si = x * bpp;
      const di = rowOut + x * 4;
      rgba[di] = curr[si];
      rgba[di + 1] = curr[si + 1];
      rgba[di + 2] = curr[si + 2];
      rgba[di + 3] = bpp === 4 ? curr[si + 3] : 255;
    }
    prev.set(curr);
  }
  return { width, height, rgba };
}

// Compare central 3D region (x: 320..1600, y: 180..860) away from all HUD bars/cards/prompts
function compare3DRegion(pngFileA, pngFileB) {
  const a = decodePngRgba(fs.readFileSync(pngFileA));
  const b = decodePngRgba(fs.readFileSync(pngFileB));
  const x0 = 320, x1 = Math.min(1600, a.width), y0 = 180, y1 = Math.min(860, a.height);
  let total = 0, changed = 0, maxChannelDiff = 0, sumAbsDiff = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // Skip small center reticle box (940..980, 520..560)
      if (x >= 940 && x <= 980 && y >= 520 && y <= 560) continue;
      total++;
      const idx = (y * a.width + x) * 4;
      const dr = Math.abs(a.rgba[idx] - b.rgba[idx]);
      const dg = Math.abs(a.rgba[idx + 1] - b.rgba[idx + 1]);
      const db = Math.abs(a.rgba[idx + 2] - b.rgba[idx + 2]);
      const md = Math.max(dr, dg, db);
      if (md > maxChannelDiff) maxChannelDiff = md;
      sumAbsDiff += (dr + dg + db) / 3;
      if (md > 3) changed++;
    }
  }
  const changedPct = total > 0 ? Number(((changed / total) * 100).toFixed(3)) : 0;
  const meanDiff = total > 0 ? Number((sumAbsDiff / total).toFixed(3)) : 0;
  return {
    region: { x0, y0, x1, y1 },
    totalPixels: total,
    changedPixels: changed,
    changedPct,
    meanChannelDiff: meanDiff,
    maxChannelDiff,
    frozen3D: changedPct < 0.25,
  };
}

async function prepareForegroundWindow(page, w = 1920, h = 1080) {
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: w + 16, height: h + 88 } });
  } catch {}
  await page.setViewport(w, h, 1);
  try { await page.send('Page.bringToFront', {}); } catch {}
  try { await page.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
  await sleep(250);
}

async function realClickElement(page, selector) {
  const box = await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`);
  if (!box) return false;
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await sleep(40);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(50);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  return true;
}

async function tapKey(page, key, code, vk) {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await sleep(60);
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
}

// Claude 2's 20-RAF diagnostic probe on a ready frame (Title or Training) — strictly primitive JSON values!
async function sampleClaude2Hooks(page, label) {
  return await page.evaluate(`(async () => {
    const out = {
      label: String(${JSON.stringify(label)}),
      hasTT: Boolean(window.TT),
      dwOpeningExists: Boolean(window.DWOpening),
      dwOpeningActive: Boolean(window.DWOpening && window.DWOpening.active),
      openingPhase: String(document.getElementById('opening')?.dataset?.phase ?? ''),
      openingHidden: Boolean(document.getElementById('opening')?.hidden),
      visibilityState: String(document.visibilityState),
      hasFocus: Boolean(document.hasFocus()),
      perfHudTextBefore: String(document.getElementById('perf')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''),
      trainingBlackoutOn: Boolean(document.getElementById('trainingBlackout')?.classList?.contains('on')),
    };
    const TT = window.TT;
    if (!TT || !TT.renderer) return out;

    const r = TT.renderer;
    const ts = TT.trainingDbg?.state?.() || null;
    const fd = TT.flightDbg?.() || null;
    out.backendIsWebGPU = Boolean(r.backend?.isWebGPUBackend);
    out.backendName = String(r.backend?.constructor?.name ?? '');
    out.trainingState = ts ? {
      active: Boolean(ts.active),
      warming: Boolean(ts.warming),
      bgWarming: Boolean(ts.bgWarming),
      recovering: Boolean(ts.recovering),
    } : null;
    out.flightHold = fd ? Boolean(fd.hold) : null;
    out.cutawayKeepersStillInScene = (() => {
      let found = false;
      try {
        TT.scene?.traverse?.((o) => {
          if (o && o.name === 'training-cutaway-warm-keepers') found = true;
        });
      } catch {}
      return found;
    })();
    out.animLoopExists = Boolean(r._animation && r._animation._animationLoop);
    out.animLoopType = String(typeof r._animation?._animationLoop);
    out.animLoopName = String(r._animation?._animationLoop?.name || '');
    out.animRequestIdBefore = Number(r._animation?._requestId ?? -1);
    out.boundTargetBefore = r.getRenderTarget?.() ? String(r.getRenderTarget().texture?.name || 'bound-target') : null;
    out.infoBefore = {
      frame: Number(r.info?.frame ?? -1),
      calls: Number(r.info?.render?.calls ?? -1),
      drawCalls: Number(r.info?.render?.drawCalls ?? -1),
      triangles: Number(r.info?.render?.triangles ?? -1),
    };

    let animLoopEntries = 0;
    let rendererRenderEntries = 0;
    let renderSceneEntries = 0;
    let backendBeginRenderEntries = 0;
    let backendDrawEntries = 0;
    let renderThrown = null;

    const anim = r._animation;
    const origLoop = anim ? anim._animationLoop : null;
    const origRender = typeof r.render === 'function' ? r.render : null;
    const origRenderScene = typeof r._renderScene === 'function' ? r._renderScene : null;
    const backend = r.backend;
    const origBeginRender = backend && typeof backend.beginRender === 'function' ? backend.beginRender : null;
    const origDraw = backend && typeof backend.draw === 'function' ? backend.draw : null;

    const dev = backend?.device || null;
    let gpuScopedValidationErr = null;
    let gpuScopedOomErr = null;
    let gpuScopedInternalErr = null;
    const uncapturedErrors = [];
    const onUncaptured = (ev) => {
      try { uncapturedErrors.push(String(ev?.error?.message || ev?.error || 'uncaptured')); } catch {}
    };
    if (dev && typeof dev.addEventListener === 'function') {
      try { dev.addEventListener('uncapturederror', onUncaptured); } catch {}
    }
    let scopesPushed = false;
    if (dev && typeof dev.pushErrorScope === 'function') {
      try {
        dev.pushErrorScope('validation');
        dev.pushErrorScope('out-of-memory');
        dev.pushErrorScope('internal');
        scopesPushed = true;
      } catch {}
    }

    try {
      if (anim && typeof origLoop === 'function') {
        anim._animationLoop = function wrappedAnimLoop(...args) {
          animLoopEntries++;
          return origLoop.apply(this, args);
        };
      }
      if (origRender) {
        r.render = function wrappedRender(...args) {
          rendererRenderEntries++;
          try {
            return origRender.apply(this, args);
          } catch (err) {
            if (!renderThrown) renderThrown = String(err?.stack || err?.message || err);
            throw err;
          }
        };
      }
      if (origRenderScene) {
        r._renderScene = function wrappedRenderScene(...args) {
          renderSceneEntries++;
          return origRenderScene.apply(this, args);
        };
      }
      if (origBeginRender) {
        backend.beginRender = function wrappedBeginRender(...args) {
          backendBeginRenderEntries++;
          return origBeginRender.apply(this, args);
        };
      }
      if (origDraw) {
        backend.draw = function wrappedDraw(...args) {
          backendDrawEntries++;
          return origDraw.apply(this, args);
        };
      }

      await new Promise((resolve) => {
        let left = 20;
        const step = () => {
          if (--left <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    } finally {
      if (anim && typeof origLoop === 'function') anim._animationLoop = origLoop;
      if (origRender) r.render = origRender;
      if (origRenderScene) r._renderScene = origRenderScene;
      if (origBeginRender) backend.beginRender = origBeginRender;
      if (origDraw) backend.draw = origDraw;
      if (scopesPushed && dev && typeof dev.popErrorScope === 'function') {
        try {
          const eInt = await dev.popErrorScope();
          const eOom = await dev.popErrorScope();
          const eVal = await dev.popErrorScope();
          if (eInt) gpuScopedInternalErr = String(eInt.message || eInt);
          if (eOom) gpuScopedOomErr = String(eOom.message || eOom);
          if (eVal) gpuScopedValidationErr = String(eVal.message || eVal);
        } catch (popErr) {
          gpuScopedValidationErr = 'popErrorScope failed: ' + String(popErr?.message || popErr);
        }
      }
      if (dev && typeof dev.removeEventListener === 'function') {
        try { dev.removeEventListener('uncapturederror', onUncaptured); } catch {}
      }
    }

    out.rafSampleCount = 20;
    out.animLoopEntries = Number(animLoopEntries);
    out.rendererRenderEntries = Number(rendererRenderEntries);
    out.renderSceneEntries = Number(renderSceneEntries);
    out.backendBeginRenderEntries = Number(backendBeginRenderEntries);
    out.backendDrawEntries = Number(backendDrawEntries);
    out.renderThrown = renderThrown ? String(renderThrown) : null;
    out.gpuScopedValidationErr = gpuScopedValidationErr ? String(gpuScopedValidationErr) : null;
    out.gpuScopedOomErr = gpuScopedOomErr ? String(gpuScopedOomErr) : null;
    out.gpuScopedInternalErr = gpuScopedInternalErr ? String(gpuScopedInternalErr) : null;
    out.uncapturedErrors = uncapturedErrors.slice(0, 10);
    out.animRequestIdAfter = Number(r._animation?._requestId ?? -1);
    out.boundTargetAfter = r.getRenderTarget?.() ? String(r.getRenderTarget().texture?.name || 'bound-target') : null;
    out.perfHudTextAfter = String(document.getElementById('perf')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '');
    out.infoAfter = {
      frame: Number(r.info?.frame ?? -1),
      calls: Number(r.info?.render?.calls ?? -1),
      drawCalls: Number(r.info?.render?.drawCalls ?? -1),
      triangles: Number(r.info?.render?.triangles ?? -1),
    };
    return out;
  })()`);
}

// Run each trial in a fresh Chrome user-data-dir (just like Jerry opening Play Dead-Wave.bat fresh!)
// OR reuse within the same slot run (only 1 Chrome instance alive at a time!).
async function runTrialFreshBrowser(origin, spec) {
  const browser = await launch({
    headless: false,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--force_high_performance_gpu',
      '--disable-features=CalculateNativeWinOcclusion',
      '--window-size=1936,1168',
    ],
  });
  const t0 = Date.now();
  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    await prepareForegroundWindow(page, 1920, 1080);

    if (spec.enablePerfHudInStorage) {
      await page.goto(`${origin}/assets/intro/opening-perf.js`, { timeout: 30000 });
      await page.evaluate(`(() => {
        try { localStorage.setItem('tt_perf_hud', '1'); } catch {}
        return true;
      })()`);
    }

    page.errors.length = 0;
    page.console.length = 0;

    const fullUrl = `${origin}/${spec.relUrl}`;
    console.log(`[AH-2] Starting ${spec.id} -> ${spec.relUrl} (fresh profile, perfStorage=${Boolean(spec.enablePerfHudInStorage)})`);
    await page.goto(fullUrl, { timeout: 180000 });
    try { await page.send('Page.bringToFront', {}); } catch {}

    // 100% normal player wait: let the opening video + title card + loading finish naturally!
    const waitStart = Date.now();
    while (Date.now() - waitStart < 150000) {
      const state = await page.evaluate(`(() => {
        const op = document.getElementById('opening');
        const playBtn = document.getElementById('openingPlay');
        return {
          active: Boolean(window.DWOpening && window.DWOpening.active),
          hidden: Boolean(op?.hidden),
          playShown: Boolean(playBtn && !playBtn.hidden),
        };
      })()`);
      if (!state.active && state.hidden) break;
      if (state.playShown) {
        await realClickElement(page, '#openingPlay');
      }
      await sleep(350);
    }

    const titleReady = await page.waitFor(
      '!window.DWOpening?.active && Boolean(document.getElementById("modeTraining"))',
      { timeout: 60000 }
    );
    assert(titleReady, `${spec.id}: Title screen did not become ready`);
    await sleep(800);

    let titleHooks = null;
    if (spec.enablePerfHudInStorage) {
      await page.waitFor('Boolean(window.TT)', { timeout: 15000 });
      titleHooks = await sampleClaude2Hooks(page, `${spec.id}-title`);
    }

    const shotTitle = path.join(OUT_DIR, `${spec.id}-0-title.png`);
    await page.screenshot(shotTitle);

    // Type player name & click #modeTraining with a real mouse click, just like Jerry!
    await page.evaluate(`(() => {
      const inp = document.getElementById('playerName');
      if (inp && !inp.value.trim()) {
        inp.focus();
        inp.value = 'Jerry';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        inp.blur();
      }
      return true;
    })()`);
    await sleep(150);

    const tClickTraining = Date.now();
    const clicked = await realClickElement(page, '#modeTraining');
    assert(clicked, `${spec.id}: Could not click #modeTraining`);

    // Wait for #trainingBlackout to be created and then lift (.classList.contains('on') === false)
    await page.waitFor('Boolean(document.getElementById("trainingBlackout"))', { timeout: 30000 });
    const trainingReady = await page.waitFor(
      'Boolean(document.getElementById("trainingBlackout")) && !document.getElementById("trainingBlackout").classList.contains("on")',
      { timeout: 90000, every: 100 }
    );
    assert(trainingReady, `${spec.id}: #trainingBlackout never lifted`);
    const trainingBlackoutMs = Date.now() - tClickTraining;

    // Wait 2.0s after blackout lifts so any late warm-up promise or CSS transition settles
    await sleep(2000);

    const shotSpawn = path.join(OUT_DIR, `${spec.id}-a-spawn.png`);
    await page.screenshot(shotSpawn);

    // Real player input: walk forward-right (W + D) for 1.4s, then toggle 1P view (Digit5), wait 0.7s
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 960, y: 540, button: 'none' });
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68, nativeVirtualKeyCode: 68 });
    await sleep(1400);
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68, nativeVirtualKeyCode: 68 });
    await sleep(150);
    await tapKey(page, '5', 'Digit5', 53);
    await sleep(700);

    const shotAfterMove = path.join(OUT_DIR, `${spec.id}-b-after-move-1p.png`);
    await page.screenshot(shotAfterMove);

    const diff = compare3DRegion(shotSpawn, shotAfterMove);

    // After pure-player screenshots A & B are already saved, enable perf HUD if not yet enabled
    // so window.TT is stamped on the next unpaused tick and we get Claude 2's 20-RAF hook counts on ALL runs!
    let stampedAfterPerfClick = false;
    if (!spec.enablePerfHudInStorage) {
      await page.evaluate(`(() => {
        document.getElementById('perfHudToggle')?.click();
        return true;
      })()`);
      stampedAfterPerfClick = await page.waitFor('Boolean(window.TT)', { timeout: 3000, every: 100 });
      await sleep(1100); // let 1s perf HUD counter compute fps & draws
    }

    const trainingHooks = await sampleClaude2Hooks(page, `${spec.id}-training`);
    trainingHooks.stampedAfterPerfClick = stampedAfterPerfClick;

    const res = {
      id: spec.id,
      group: spec.group,
      relUrl: spec.relUrl,
      enablePerfHudInStorage: Boolean(spec.enablePerfHudInStorage),
      elapsedMs: Date.now() - t0,
      trainingBlackoutMs,
      screenshots: {
        title: `qa/AH-2/${path.basename(shotTitle)}`,
        spawn: `qa/AH-2/${path.basename(shotSpawn)}`,
        afterMove1P: `qa/AH-2/${path.basename(shotAfterMove)}`,
      },
      pixelComparison3D: diff,
      titleHooks,
      trainingHooks,
      pageErrors: [...page.errors],
      consoleErrorsAndWarnings: page.console.filter((c) => c.type === 'error' || c.type === 'warning').slice(0, 30),
    };
    console.log(
      `[AH-2] ${spec.id} DONE in ${(res.elapsedMs / 1000).toFixed(1)}s (blackout=${trainingBlackoutMs}ms) -> ` +
      `frozen3D=${diff.frozen3D} (changedPct=${diff.changedPct}%), DWOpening.active=${trainingHooks.dwOpeningActive}, ` +
      `animLoop=${trainingHooks.animLoopEntries ?? 'n/a'}/20, render=${trainingHooks.rendererRenderEntries ?? 'n/a'}, ` +
      `backendDraw=${trainingHooks.backendDrawEntries ?? 'n/a'}, perf="${trainingHooks.perfHudTextAfter ?? ''}"`
    );
    await page.close();
    return res;
  } finally {
    await browser.close();
    await sleep(400);
  }
}

const server = await serve(ROOT, 0);
const summary = {
  startedAt: new Date().toISOString(),
  trials: [],
};

try {
  const specs = [
    // 3x normal WebGPU runs (fresh profile each time, just like Play Dead-Wave.bat!)
    { id: 'webgpu-run1', group: 'webgpu', relUrl: 'index.html?solid=1', enablePerfHudInStorage: false },
    { id: 'webgpu-run2', group: 'webgpu', relUrl: 'index.html', enablePerfHudInStorage: false },
    { id: 'webgpu-run3', group: 'webgpu', relUrl: 'index.html?solid=1', enablePerfHudInStorage: true },
    // 3x normal WebGL runs
    { id: 'webgl-run1', group: 'webgl', relUrl: 'index.html?solid=1&renderer=webgl', enablePerfHudInStorage: false },
    { id: 'webgl-run2', group: 'webgl', relUrl: 'index.html?renderer=webgl', enablePerfHudInStorage: false },
    { id: 'webgl-run3', group: 'webgl', relUrl: 'index.html?solid=1&renderer=webgl', enablePerfHudInStorage: true },
  ];

  for (const spec of specs) {
    const trialRes = await runTrialFreshBrowser(server.origin, spec);
    summary.trials.push(trialRes);
  }

  summary.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('[AH-2] Wrote qa/AH-2/results.json successfully.');
} finally {
  await server.close();
}

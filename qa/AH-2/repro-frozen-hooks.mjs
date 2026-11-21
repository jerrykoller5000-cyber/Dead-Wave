// AH-2 Part 2: Test re-entering Training from Menu (Escape -> Quit -> Training)
// + 2nd page in same WebGPU browser (the exact task-312 normal-play freeze trigger)
// to capture Claude 2's live 20-RAF hook counts IN THE FROZEN STATE alongside dedicated screenshots.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-2');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodePngRgba(buf) {
  let off = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    const data = buf.subarray(off + 8, off + 8 + len);
    off += 12 + len;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const rgba = new Uint8Array(width * height * 4);
  const prev = new Uint8Array(stride), curr = new Uint8Array(stride);
  let src = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  };
  for (let y = 0; y < height; y++) {
    const f = raw[src++];
    for (let i = 0; i < stride; i++) {
      const x = raw[src++], a = i >= bpp ? curr[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      curr[i] = f === 0 ? x : f === 1 ? (x + a) & 255 : f === 2 ? (x + b) & 255 : f === 3 ? (x + ((a + b) >> 1)) & 255 : (x + paeth(a, b, c)) & 255;
    }
    for (let x = 0; x < width; x++) {
      const si = x * bpp, di = (y * width + x) * 4;
      rgba[di] = curr[si]; rgba[di + 1] = curr[si + 1]; rgba[di + 2] = curr[si + 2]; rgba[di + 3] = bpp === 4 ? curr[si + 3] : 255;
    }
    prev.set(curr);
  }
  return { width, height, rgba };
}

function compare3DRegion(fileA, fileB) {
  const a = decodePngRgba(fs.readFileSync(fileA));
  const b = decodePngRgba(fs.readFileSync(fileB));
  let total = 0, changed = 0;
  for (let y = 180; y < 860; y++) {
    for (let x = 320; x < 1600; x++) {
      if (x >= 940 && x <= 980 && y >= 520 && y <= 560) continue;
      total++;
      const i = (y * a.width + x) * 4;
      if (Math.max(Math.abs(a.rgba[i] - b.rgba[i]), Math.abs(a.rgba[i + 1] - b.rgba[i + 1]), Math.abs(a.rgba[i + 2] - b.rgba[i + 2])) > 3) changed++;
    }
  }
  const changedPct = Number(((changed / total) * 100).toFixed(3));
  return { changedPct, frozen3D: changedPct < 0.25 };
}

async function prepareWindow(page) {
  try {
    const { windowId } = await page.send('Browser.getWindowForTarget', {});
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: 1936, height: 1168 } });
  } catch {}
  await page.setViewport(1920, 1080, 1);
  try { await page.send('Page.bringToFront', {}); } catch {}
  try { await page.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
}

async function realClick(page, selector) {
  const box = await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null;
  })()`);
  if (!box) return false;
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await sleep(30);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(40);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  return true;
}

async function tapKey(page, key, code, vk) {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await sleep(60);
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
}

async function sampleHooks(page, label) {
  return await page.evaluate(`(async () => {
    const TT = window.TT;
    const r = TT?.renderer;
    const ts = TT?.trainingDbg?.state?.() || null;
    const out = {
      label: String(${JSON.stringify(label)}),
      hasTT: Boolean(TT),
      dwOpeningExists: Boolean(window.DWOpening),
      dwOpeningActive: Boolean(window.DWOpening && window.DWOpening.active),
      animLoopExists: Boolean(r?._animation?._animationLoop),
      animLoopName: String(r?._animation?._animationLoop?.name || ''),
      trainingWarming: ts ? Boolean(ts.warming) : null,
      trainingActive: ts ? Boolean(ts.active) : null,
      perfBefore: String(document.getElementById('perf')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''),
    };
    if (!r) return out;
    let animLoopEntries = 0, rendererRenderEntries = 0, backendDrawEntries = 0;
    const anim = r._animation, origLoop = anim?._animationLoop, origRender = r.render, backend = r.backend, origDraw = backend?.draw;
    try {
      if (anim && typeof origLoop === 'function') anim._animationLoop = function (...a) { animLoopEntries++; return origLoop.apply(this, a); };
      if (typeof origRender === 'function') r.render = function (...a) { rendererRenderEntries++; return origRender.apply(this, a); };
      if (backend && typeof origDraw === 'function') backend.draw = function (...a) { backendDrawEntries++; return origDraw.apply(this, a); };
      await new Promise((res) => { let n = 20; const f = () => (--n <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    } finally {
      if (anim && typeof origLoop === 'function') anim._animationLoop = origLoop;
      if (typeof origRender === 'function') r.render = origRender;
      if (backend && typeof origDraw === 'function') backend.draw = origDraw;
    }
    await new Promise((res) => setTimeout(res, 1050));
    out.animLoopEntries = animLoopEntries;
    out.rendererRenderEntries = rendererRenderEntries;
    out.backendDrawEntries = backendDrawEntries;
    out.perfAfter = String(document.getElementById('perf')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '');
    return out;
  })()`);
}

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--force_high_performance_gpu',
    '--disable-features=CalculateNativeWinOcclusion',
    '--window-size=1936,1168',
  ],
});

const extra = { startedAt: new Date().toISOString(), checks: [] };

try {
  // Page 1: Set tt_perf_hud='1', enter Training, quit to Menu via Escape -> Quit, re-enter Training!
  const p1 = await browser.newPage({ width: 1920, height: 1080 });
  await prepareWindow(p1);
  await p1.goto(`${server.origin}/assets/intro/opening-perf.js`);
  await p1.evaluate(`(() => { localStorage.setItem('tt_perf_hud', '1'); return true; })()`);
  await p1.goto(`${server.origin}/index.html?solid=1`, { timeout: 180000 });
  await p1.waitFor('!window.DWOpening?.active && Boolean(document.getElementById("modeTraining"))', { timeout: 120000 });
  await sleep(600);
  await p1.evaluate(`(() => { const i = document.getElementById('playerName'); if (i) { i.value = 'Jerry'; i.blur(); } return true; })()`);
  await realClick(p1, '#modeTraining');
  await p1.waitFor('Boolean(document.getElementById("trainingBlackout")) && !document.getElementById("trainingBlackout").classList.contains("on")', { timeout: 90000, every: 100 });
  await sleep(1500);

  // Now quit back to Title Menu like a player (Escape -> Quit to Menu) and click Training Ground again!
  await tapKey(p1, 'Escape', 'Escape', 27);
  await sleep(300);
  await realClick(p1, '#quitMenuBtn');
  await sleep(800);
  // In case quit confirm view opened:
  await realClick(p1, '#quitConfirmBtn');
  await p1.waitFor('!document.getElementById("modeSelect")?.classList?.contains("hidden") && getComputedStyle(document.getElementById("modeSelect")).display !== "none"', { timeout: 20000 });
  await sleep(600);
  const tReenter = Date.now();
  await realClick(p1, '#modeTraining');
  await p1.waitFor('Boolean(document.getElementById("trainingBlackout")) && !document.getElementById("trainingBlackout").classList.contains("on")', { timeout: 90000, every: 100 });
  const reenterBlackoutMs = Date.now() - tReenter;
  await sleep(1600);
  const reA = path.join(OUT_DIR, 'webgpu-reenter-a-spawn.png');
  await p1.screenshot(reA);
  await tapKey(p1, '5', 'Digit5', 53);
  await sleep(700);
  const reB = path.join(OUT_DIR, 'webgpu-reenter-b-after-1p.png');
  await p1.screenshot(reB);
  const reDiff = compare3DRegion(reA, reB);
  const reHooks = await sampleHooks(p1, 'webgpu-reenter-from-menu');
  extra.checks.push({ id: 'webgpu-reenter-from-menu', blackoutMs: reenterBlackoutMs, diff: reDiff, hooks: reHooks });
  console.log(`[AH-2-extra] reenter-from-menu (blackout=${reenterBlackoutMs}ms): frozen3D=${reDiff.frozen3D} (${reDiff.changedPct}%), animLoop=${reHooks.animLoopEntries}/20, render=${reHooks.rendererRenderEntries}`);
  await p1.close();
  await sleep(300);

  // Page 2 in same browser (exact task-312 Run 2 condition, now with tt_perf_hud='1' so TT is live if it freezes!)
  const p2 = await browser.newPage({ width: 1920, height: 1080 });
  await prepareWindow(p2);
  await p2.goto(`${server.origin}/index.html?solid=1`, { timeout: 180000 });
  await p2.waitFor('!window.DWOpening?.active && Boolean(document.getElementById("modeTraining"))', { timeout: 120000 });
  await sleep(600);
  await p2.evaluate(`(() => { const i = document.getElementById('playerName'); if (i) { i.value = 'Jerry'; i.blur(); } return true; })()`);
  const tP2 = Date.now();
  await realClick(p2, '#modeTraining');
  await p2.waitFor('Boolean(document.getElementById("trainingBlackout")) && !document.getElementById("trainingBlackout").classList.contains("on")', { timeout: 90000, every: 100 });
  const p2BlackoutMs = Date.now() - tP2;
  await sleep(2000);
  const p2A = path.join(OUT_DIR, 'webgpu-samebrowser2-a-spawn.png');
  await p2.screenshot(p2A);
  await tapKey(p2, '5', 'Digit5', 53);
  await sleep(700);
  const p2B = path.join(OUT_DIR, 'webgpu-samebrowser2-b-after-1p.png');
  await p2.screenshot(p2B);
  const p2Diff = compare3DRegion(p2A, p2B);
  const p2Hooks = await sampleHooks(p2, 'webgpu-samebrowser-page2');
  extra.checks.push({ id: 'webgpu-samebrowser-page2', blackoutMs: p2BlackoutMs, diff: p2Diff, hooks: p2Hooks });
  console.log(`[AH-2-extra] samebrowser-page2 (blackout=${p2BlackoutMs}ms): frozen3D=${p2Diff.frozen3D} (${p2Diff.changedPct}%), animLoop=${p2Hooks.animLoopEntries}/20, render=${p2Hooks.rendererRenderEntries}, perf="${p2Hooks.perfAfter}"`);
  await p2.close();

  extra.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT_DIR, 'extra-repro.json'), JSON.stringify(extra, null, 2), 'utf8');
} finally {
  await browser.close();
  await server.close();
}

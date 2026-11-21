// AH-6: Normal-Player Night 1 P0 Hunt (WebGPU & WebGL)
// Title -> Settings/Credits -> New Run (#firstRunCard) -> Insertion -> All HQ Stations ->
// Call Night 1 -> Fight all 15 Shamblers to Day 2 Dawn -> Bank Skulls -> Buy at Kiosk ->
// Call Night 2 & Die Naturally -> Burial Cine -> #win Game Over -> #again -> Redeploy Run #2 -> Quit to Title
// Usage: node qa/AH-6/play-night1-hunt.mjs <webgpu|webgl>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const backend = process.argv[2];
assert(backend === 'webgpu' || backend === 'webgl', 'Usage: node qa/AH-6/play-night1-hunt.mjs <webgpu|webgl>');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-6');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RUN_START_MS = Date.now();
const elapsedSec = () => Number(((Date.now() - RUN_START_MS) / 1000).toFixed(1));

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
  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 0);
  assert(bitDepth === 8 && bpp > 0, `Unsupported PNG format bitDepth=${bitDepth} colorType=${colorType}`);
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

function analyzeFrame(pngFile) {
  const img = decodePngRgba(fs.readFileSync(pngFile));
  const x0 = 320, x1 = Math.min(1600, img.width), y0 = 180, y1 = Math.min(860, img.height);
  let n = 0, sumLum = 0, sumSq = 0, nonDark = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      if (x >= 940 && x <= 980 && y >= 520 && y <= 560) continue;
      const idx = (y * img.width + x) * 4;
      const lum = 0.299 * img.rgba[idx] + 0.587 * img.rgba[idx + 1] + 0.114 * img.rgba[idx + 2];
      n++;
      sumLum += lum;
      sumSq += lum * lum;
      if (lum > 6) nonDark++;
    }
  }
  const meanLum = n > 0 ? sumLum / n : 0;
  const stdLum = n > 0 ? Math.sqrt(Math.max(0, sumSq / n - meanLum * meanLum)) : 0;
  return {
    meanLum: Number(meanLum.toFixed(2)),
    stdLum: Number(stdLum.toFixed(2)),
    nonDarkPct: n > 0 ? Number(((nonDark / n) * 100).toFixed(2)) : 0,
    isBlackOrSolid: meanLum < 2.5 || stdLum < 1.2,
  };
}

function compare3DRegion(pngA, pngB) {
  const a = decodePngRgba(fs.readFileSync(pngA));
  const b = decodePngRgba(fs.readFileSync(pngB));
  const x0 = 320, x1 = Math.min(1600, a.width), y0 = 180, y1 = Math.min(860, a.height);
  let total = 0, changed = 0, sumAbs = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x >= 940 && x <= 980 && y >= 520 && y <= 560) continue;
      total++;
      const idx = (y * a.width + x) * 4;
      const dr = Math.abs(a.rgba[idx] - b.rgba[idx]);
      const dg = Math.abs(a.rgba[idx + 1] - b.rgba[idx + 1]);
      const db = Math.abs(a.rgba[idx + 2] - b.rgba[idx + 2]);
      const md = Math.max(dr, dg, db);
      sumAbs += (dr + dg + db) / 3;
      if (md > 3) changed++;
    }
  }
  const changedPct = total > 0 ? Number(((changed / total) * 100).toFixed(3)) : 0;
  return {
    changedPct,
    meanChannelDiff: total > 0 ? Number((sumAbs / total).toFixed(3)) : 0,
    frozen3D: changedPct < 0.2,
  };
}

const KEY_DEFS = {
  KeyW: { key: 'w', code: 'KeyW', vk: 87 },
  KeyA: { key: 'a', code: 'KeyA', vk: 65 },
  KeyS: { key: 's', code: 'KeyS', vk: 83 },
  KeyD: { key: 'd', code: 'KeyD', vk: 68 },
  KeyE: { key: 'e', code: 'KeyE', vk: 69 },
  KeyF: { key: 'f', code: 'KeyF', vk: 70 },
  KeyR: { key: 'r', code: 'KeyR', vk: 82 },
  KeyV: { key: 'v', code: 'KeyV', vk: 86 },
  KeyB: { key: 'b', code: 'KeyB', vk: 66 },
  KeyQ: { key: 'q', code: 'KeyQ', vk: 81 },
  KeyM: { key: 'm', code: 'KeyM', vk: 77 },
  Digit5: { key: '5', code: 'Digit5', vk: 53 },
  Space: { key: ' ', code: 'Space', vk: 32 },
  Escape: { key: 'Escape', code: 'Escape', vk: 27 },
  ShiftLeft: { key: 'Shift', code: 'ShiftLeft', vk: 16 },
};

async function keyDown(page, code) {
  const k = KEY_DEFS[code];
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk });
}

async function keyUp(page, code) {
  const k = KEY_DEFS[code];
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk });
}

async function tapKey(page, code, holdMs = 65) {
  await keyDown(page, code);
  await sleep(holdMs);
  await keyUp(page, code);
}

async function releaseAllMoveKeys(page) {
  for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) {
    try { await keyUp(page, c); } catch {}
  }
}

async function realClickSelector(page, selector) {
  const box = await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) return null;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: (el.textContent || '').trim().slice(0, 60) };
  })()`);
  if (!box) return null;
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await sleep(35);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(45);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  return box;
}

async function clickXY(page, x, y, holdMs = 40) {
  const rx = Math.max(8, Math.min(1912, Math.round(x)));
  const ry = Math.max(8, Math.min(1072, Math.round(y)));
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rx, y: ry, button: 'none' });
  await sleep(18);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rx, y: ry, button: 'left', clickCount: 1 });
  await sleep(holdMs);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rx, y: ry, button: 'left', clickCount: 1 });
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
  await sleep(250);
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

const report = {
  backend,
  startedAt: new Date().toISOString(),
  steps: [],
  frameChecks: [],
  stationChecks: [],
  combatSummary: null,
  deathAndRestart: null,
  anomalies: [],
  pageErrors: [],
  consoleErrors: [],
  consoleWarnings: [],
};

function logStep(name, data = {}) {
  const entry = { tSec: elapsedSec(), name, ...data };
  report.steps.push(entry);
  console.log(`[AH-6 · ${backend} · +${entry.tSec}s] ${name}`, Object.keys(data).length ? JSON.stringify(data) : '');
}

async function shot(page, slug) {
  const file = `${backend}-${slug}.png`;
  const full = path.join(OUT_DIR, file);
  await page.screenshot(full);
  const stats = analyzeFrame(full);
  return { rel: `qa/AH-6/${file}`, full, ...stats };
}

async function verifyLive3DMovement(page, tag, slugPrefix, moveCode = 'KeyD', holdMs = 480) {
  const before = await shot(page, `${slugPrefix}-a`);
  const p0 = await page.evaluate(`(() => {
    const p = window.TT?.player?.position;
    return p ? { x: Number(p.x.toFixed(3)), y: Number(p.y.toFixed(3)), z: Number(p.z.toFixed(3)) } : null;
  })()`);
  await keyDown(page, moveCode);
  await sleep(holdMs);
  await keyUp(page, moveCode);
  await sleep(120);
  const after = await shot(page, `${slugPrefix}-b`);
  const p1 = await page.evaluate(`(() => {
    const p = window.TT?.player?.position;
    return {
      pos: p ? { x: Number(p.x.toFixed(3)), y: Number(p.y.toFixed(3)), z: Number(p.z.toFixed(3)) } : null,
      perfText: String(document.getElementById('perf')?.textContent?.replace(/\\s+/g, ' ').trim() || ''),
    };
  })()`);
  const diff = compare3DRegion(before.full, after.full);
  const distMoved = (p0 && p1.pos) ? Number(Math.hypot(p1.pos.x - p0.x, p1.pos.z - p0.z).toFixed(3)) : null;
  const check = {
    tSec: elapsedSec(),
    tag,
    shotA: before.rel,
    shotB: after.rel,
    meanLumA: before.meanLum,
    meanLumB: after.meanLum,
    isBlackA: before.isBlackOrSolid,
    isBlackB: after.isBlackOrSolid,
    changedPct: diff.changedPct,
    frozen3D: diff.frozen3D,
    distMoved,
    posBefore: p0,
    posAfter: p1.pos,
    perfText: p1.perfText,
  };
  report.frameChecks.push(check);
  if (before.isBlackOrSolid || after.isBlackOrSolid) {
    report.anomalies.push({ severity: 'P0', kind: 'black-or-solid-frame', tag, check });
  }
  if (diff.frozen3D) {
    report.anomalies.push({ severity: 'P0', kind: 'frozen-3d-frame', tag, check });
  }
  if (distMoved !== null && distMoved < 0.15) {
    report.anomalies.push({ severity: 'P1', kind: 'movement-input-blocked', tag, check });
  }
  logStep(`Frame/Input check [${tag}]`, { changedPct: diff.changedPct, frozen3D: diff.frozen3D, distMoved, meanLum: after.meanLum });
  return check;
}

// Steer around the HQ cabin perimeter (-9..9) using 1-2 corner waypoints when crossing the cabin footprint
async function walkToWorld(page, tx, tz, label, maxMs = 15000, tol = 0.95) {
  const cur = await page.evaluate(`(() => {
    const p = window.TT?.player?.position;
    return p ? { x: p.x, z: p.z } : { x: 0, z: -12 };
  })()`);

  const segHitsHouse = (ax, az, bx, bz) => {
    for (let i = 1; i <= 16; i++) {
      const t = i / 17;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      if (Math.abs(x) < 5.65 && Math.abs(z) < 5.65) return true;
    }
    return false;
  };

  const waypoints = [];
  if (segHitsHouse(cur.x, cur.z, tx, tz)) {
    const R = 9.0;
    const corners = [
      { x: -R, z: -R },
      { x: R, z: -R },
      { x: R, z: R },
      { x: -R, z: R },
    ];
    // Try single-corner path first, else 2-corner perimeter path
    let bestPath = null, bestLen = Infinity;
    for (const c1 of corners) {
      if (!segHitsHouse(cur.x, cur.z, c1.x, c1.z) && !segHitsHouse(c1.x, c1.z, tx, tz)) {
        const d = Math.hypot(c1.x - cur.x, c1.z - cur.z) + Math.hypot(tx - c1.x, tz - c1.z);
        if (d < bestLen) { bestLen = d; bestPath = [c1]; }
      }
    }
    if (!bestPath) {
      for (let i = 0; i < 4; i++) {
        for (const step of [1, 3]) {
          const c1 = corners[i], c2 = corners[(i + step) % 4];
          if (!segHitsHouse(cur.x, cur.z, c1.x, c1.z) && !segHitsHouse(c2.x, c2.z, tx, tz)) {
            const d = Math.hypot(c1.x - cur.x, c1.z - cur.z) + Math.hypot(c2.x - c1.x, c2.z - c1.z) + Math.hypot(tx - c2.x, tz - c2.z);
            if (d < bestLen) { bestLen = d; bestPath = [c1, c2]; }
          }
        }
      }
    }
    if (bestPath) waypoints.push(...bestPath);
  }
  waypoints.push({ x: tx, z: tz });

  const t0 = Date.now();
  const held = new Set();
  const setKey = async (code, want) => {
    if (want && !held.has(code)) { held.add(code); await keyDown(page, code); }
    else if (!want && held.has(code)) { held.delete(code); await keyUp(page, code); }
  };

  try {
    for (let wi = 0; wi < waypoints.length; wi++) {
      const wp = waypoints[wi];
      const isFinal = wi === waypoints.length - 1;
      const wpTol = isFinal ? tol : 1.7;
      while (Date.now() - t0 < maxMs) {
        const nav = await page.evaluate(`(() => {
          const TT = window.TT;
          if (!TT || !TT.player || !TT.camera) return null;
          const p = TT.player.position;
          const f = new TT.THREE.Vector3();
          TT.camera.getWorldDirection(f);
          let fx = f.x, fz = f.z;
          const fl = Math.hypot(fx, fz) || 1;
          fx /= fl; fz /= fl;
          const rx = -fz, rz = fx;
          return { px: p.x, pz: p.z, fx, fz, rx, rz };
        })()`);
        if (!nav) break;
        const dx = wp.x - nav.px;
        const dz = wp.z - nav.pz;
        const dist = Math.hypot(dx, dz);
        if (dist <= wpTol) break;
        // Walk without sprint inside 2.5m of final station so we don't overshoot!
        await setKey('ShiftLeft', !isFinal || dist > 2.5);
        const fwdDot = (dx * nav.fx + dz * nav.fz) / dist;
        const rightDot = (dx * nav.rx + dz * nav.rz) / dist;
        await setKey('KeyW', fwdDot > 0.24);
        await setKey('KeyS', fwdDot < -0.24);
        await setKey('KeyD', rightDot > 0.24);
        await setKey('KeyA', rightDot < -0.24);
        await sleep(60);
      }
    }
  } finally {
    for (const c of [...held]) {
      try { await keyUp(page, c); } catch {}
    }
  }
  await sleep(160); // let HUD prompt refresh (100ms cadence)

  const endPos = await page.evaluate(`(() => {
    const p = window.TT?.player?.position;
    const pr = document.getElementById('kioskPrompt');
    const shown = Boolean(pr && pr.classList.contains('on'));
    return {
      x: p ? Number(p.x.toFixed(2)) : null,
      z: p ? Number(p.z.toFixed(2)) : null,
      promptShown: shown,
      promptText: shown ? String(pr?.textContent?.replace(/\\s+/g, ' ').trim() || '') : '',
    };
  })()`);
  const finalDist = endPos.x != null ? Number(Math.hypot(endPos.x - tx, endPos.z - tz).toFixed(2)) : null;
  logStep(`Walked to ${label}`, { target: [Number(tx.toFixed(2)), Number(tz.toFixed(2))], pos: [endPos.x, endPos.z], dist: finalDist, prompt: endPos.promptText });
  return { ...endPos, dist: finalDist };
}

let page = null;
try {
  page = await browser.newPage({ width: 1920, height: 1080 });
  await prepareWindow(page);

  const relUrl = backend === 'webgl' ? 'index.html?renderer=webgl' : 'index.html';
  logStep(`Opening ${relUrl} (normal player URL, NO ?debug=1)`);
  await page.goto(`${server.origin}/${relUrl}`, { timeout: 180000 });
  try { await page.send('Page.bringToFront', {}); } catch {}

  await page.evaluate(`(() => {
    if (window.__ah6Mon) return true;
    const M = {
      rafCount: 0,
      maxRafGapMs: 0,
      hitches: [],
      dwEvents: [],
      hudState: null,
      winErrors: [],
      rejections: [],
      consoleErrs: [],
      consoleWarns: [],
      gpuUncaptured: [],
      webglContextLost: 0,
      phaseLabel: 'opening',
      gpuHooked: false,
    };
    window.__ah6Mon = M;
    window.addEventListener('error', (e) => {
      M.winErrors.push({ t: Math.round(performance.now()), msg: String(e.message || e), src: String(e.filename || '') + ':' + String(e.lineno || 0) });
    });
    window.addEventListener('unhandledrejection', (e) => {
      M.rejections.push({ t: Math.round(performance.now()), reason: String(e.reason?.stack || e.reason?.message || e.reason || 'rejection') });
    });
    const origErr = console.error.bind(console);
    const origWarn = console.warn.bind(console);
    console.error = (...args) => {
      M.consoleErrs.push({ t: Math.round(performance.now()), text: args.map(a => String(a?.stack || a?.message || a)).join(' ').slice(0, 400) });
      return origErr(...args);
    };
    console.warn = (...args) => {
      const txt = args.map(a => String(a?.message || a)).join(' ').slice(0, 300);
      if (M.consoleWarns.length < 80) M.consoleWarns.push({ t: Math.round(performance.now()), text: txt });
      return origWarn(...args);
    };
    window.addEventListener('dw-game', (ev) => {
      const d = ev?.detail;
      if (!d) return;
      if (d.type === 'hud-state') {
        M.hudState = {
          day: Number(d.day || 0),
          phase: String(d.phase || ''),
          cash: Number(d.cash || 0),
          skulls: Number(d.skulls || 0),
          hp: Number(d.hp || 0),
          maxHp: Number(d.maxHp || 100),
          medkits: Number(d.medkits || 0),
          active: Boolean(d.active),
          pendingDeposit: Boolean(d.pendingDeposit),
        };
      } else if (M.dwEvents.length < 180) {
        M.dwEvents.push({ t: Math.round(performance.now()), type: String(d.type || ''), day: d.day ?? null, panel: d.panel ?? null });
      }
    });
    let lastT = performance.now();
    const tick = (now) => {
      M.rafCount++;
      const dt = now - lastT;
      lastT = now;
      if (dt > M.maxRafGapMs && M.rafCount > 3 && M.phaseLabel !== 'opening') M.maxRafGapMs = Number(dt.toFixed(1));
      if (dt > 120 && M.rafCount > 3 && M.phaseLabel !== 'opening' && M.hitches.length < 100) {
        M.hitches.push({
          tMs: Math.round(now),
          gapMs: Number(dt.toFixed(1)),
          stage: M.phaseLabel,
          hudPhase: M.hudState?.phase || '',
          day: M.hudState?.day || 0,
        });
      }
      if (!M.gpuHooked && window.TT?.renderer) {
        M.gpuHooked = true;
        const r = window.TT.renderer;
        const dev = r.backend?.device;
        if (dev && typeof dev.addEventListener === 'function') {
          dev.addEventListener('uncapturederror', (ev) => {
            M.gpuUncaptured.push({ t: Math.round(performance.now()), msg: String(ev?.error?.message || ev?.error || 'gpu-uncaptured') });
          });
        }
        if (r.domElement) {
          r.domElement.addEventListener('webglcontextlost', () => { M.webglContextLost++; });
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return true;
  })()`);

  // 1. Opening -> Title Screen
  const openStart = Date.now();
  while (Date.now() - openStart < 150000) {
    const st = await page.evaluate(`(() => {
      const op = document.getElementById('opening');
      const playBtn = document.getElementById('openingPlay');
      return {
        active: Boolean(window.DWOpening && window.DWOpening.active),
        hidden: Boolean(op?.hidden),
        playShown: Boolean(playBtn && !playBtn.hidden),
      };
    })()`);
    if (!st.active && st.hidden) break;
    if (statePlayBtn(st)) await realClickSelector(page, '#openingPlay');
    await sleep(350);
  }
  function statePlayBtn(st) { return st.playShown; }

  const titleReady = await page.waitFor(
    '!window.DWOpening?.active && Boolean(document.getElementById("modeHunt")) && document.getElementById("modeSelect")?.classList.contains("show")',
    { timeout: 60000 }
  );
  assert(titleReady, `${backend}: Title screen did not appear`);
  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'title'; return true; })()`);
  await sleep(600);
  const titleShot = await shot(page, '01-title');
  logStep('Title screen ready', { meanLum: titleShot.meanLum });

  // 2. Title Screen Settings (turn ON FPS & HARDWARE) + Credits
  await realClickSelector(page, '#menuSettingsBtn');
  await sleep(350);
  const perfOnAlready = await page.evaluate(`Boolean(document.getElementById('perf')?.classList.contains('on'))`);
  if (!perfOnAlready) {
    await realClickSelector(page, '#perfHudToggle');
    await sleep(250);
  }
  await realClickSelector(page, '#settingsBackBtn');
  await sleep(300);

  const hasTT = await page.waitFor('Boolean(window.TT && window.TT.renderer)', { timeout: 10000 });
  assert(hasTT, 'window.TT was not stamped after turning FPS & HARDWARE ON');

  await realClickSelector(page, '#menuCreditsBtn');
  await sleep(300);
  await shot(page, '01b-title-credits');
  await realClickSelector(page, '#menuCreditsBack');
  await sleep(300);

  const backendVerify = await page.evaluate(`(() => ({
    isWebGPU: Boolean(window.TT?.renderer?.backend?.isWebGPUBackend),
    backendName: String(window.TT?.renderer?.backend?.constructor?.name || ''),
    gfx: String(window.TT?.getGfx?.() || ''),
    perfText: String(document.getElementById('perf')?.textContent?.replace(/\\s+/g, ' ').trim() || ''),
  }))()`);
  logStep('Renderer & Title verified', backendVerify);

  // 3. Callsign -> #modeHunt -> #firstRunCard -> #firstRunPlay
  await page.evaluate(`(() => {
    const inp = document.getElementById('playerName');
    if (inp) {
      inp.focus();
      inp.value = 'Jerry';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.blur();
    }
    return true;
  })()`);
  await sleep(150);

  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'first-run-dialog'; return true; })()`);
  await realClickSelector(page, '#modeHunt');
  await sleep(400);

  const firstRunOpen = await page.evaluate(`Boolean(document.getElementById('firstRunCard') && !document.getElementById('firstRunCard').hidden)`);
  if (firstRunOpen) {
    const frShot = await shot(page, '02-first-run-card');
    logStep('First-Run modal shown (#firstRunCard)', { shot: frShot.rel });
    await realClickSelector(page, '#firstRunPlay');
  }

  // 4. Full 9-second Marine Insertion -> wait until parachute touchdown completes!
  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'marine-insertion'; return true; })()`);
  await sleep(4500);
  const insMidShot = await shot(page, '03a-insertion-mid');
  logStep('Mid-insertion screenshot captured', { meanLum: insMidShot.meanLum, shot: insMidShot.rel });

  // Wait full remaining ~6.5s so the 9s insertion finishes completely and hands control to the player on the ground!
  await sleep(6800);
  const landed = await page.waitFor(
    'Boolean(window.__ah6Mon?.hudState?.active) && !document.getElementById("modeSelect")?.classList.contains("show")',
    { timeout: 15000, every: 150 }
  );
  assert(landed, 'Did not finish landing in Day 1 Prep');
  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'day1-prep'; return true; })()`);

  await verifyLive3DMovement(page, 'day1-spawn-3p', '03b-day1-spawn', 'KeyD', 500);

  // Scene & HQ model audit
  const spawnSceneAudit = await page.evaluate(`(() => {
    const TT = window.TT;
    let totalMeshes = 0, visibleMeshes = 0, nanTransforms = 0;
    TT.scene.traverse((o) => {
      if (!Number.isFinite(o.position.x) || !Number.isFinite(o.position.y) || !Number.isFinite(o.position.z)) nanTransforms++;
      if (o.isMesh) {
        totalMeshes++;
        if (o.visible) visibleMeshes++;
      }
    });
    return {
      totalMeshes,
      visibleMeshes,
      nanTransforms,
      playerPos: { x: Number(TT.player.position.x.toFixed(2)), y: Number(TT.player.position.y.toFixed(2)), z: Number(TT.player.position.z.toFixed(2)) },
      kioskPos: TT.KIOSK?.group ? { x: Number(TT.KIOSK.group.position.x.toFixed(2)), y: Number(TT.KIOSK.group.position.y.toFixed(2)), z: Number(TT.KIOSK.group.position.z.toFixed(2)), vis: Boolean(TT.KIOSK.group.visible) } : null,
      marineVis: Boolean(TT.marine?.visible),
      weapon: String(TT.getCurrentWeapon?.() || ''),
    };
  })()`);
  logStep('Day 1 scene & HQ station audit', spawnSceneAudit);
  if (spawnSceneAudit.nanTransforms > 0) {
    report.anomalies.push({ severity: 'P0', kind: 'nan-mesh-transforms', spawnSceneAudit });
  }

  // 5. Real First-Person toggle (Digit5!), fire + reload, Dodge Roll (KeyV), Wheels (KeyQ/KeyB), Map (KeyM), Pause (Escape)
  await tapKey(page, 'Digit5');
  await sleep(650);
  const fpCheck1 = await page.evaluate(`(() => ({
    fp: Boolean(window.TT?.fpDbg?.()?.first),
    vmActive: Boolean(window.TT?.viewmodelDbg?.()?.info?.active),
  }))()`);
  logStep('Entered 1st-person via Digit5', fpCheck1);
  if (!fpCheck1.fp) {
    report.anomalies.push({ severity: 'P1', kind: 'digit5-did-not-enter-1p', fpCheck1 });
  }
  await verifyLive3DMovement(page, 'day1-1p-view', '04-day1-1p', 'KeyW', 500);
  await clickXY(page, 960, 540, 55); // fire 1 shot in 1P
  await sleep(250);
  await tapKey(page, 'KeyR'); // tactical reload in 1P
  await sleep(1600);
  await tapKey(page, 'Digit5'); // exit 1P back to 3P (with viewSwapOut hand-over!)
  await sleep(650);

  // Test Dodge Roll (KeyV), Weapon Wheel (hold KeyQ), Build Wheel (hold KeyB), Full Map (KeyM), Pause (Escape)
  await keyDown(page, 'KeyD');
  await sleep(80);
  await tapKey(page, 'KeyV');
  await sleep(450);
  await keyUp(page, 'KeyD');

  await keyDown(page, 'KeyQ');
  await sleep(300);
  const qWheelOpen = await page.evaluate(`Boolean(document.getElementById('wheel')?.classList.contains('show'))`);
  await keyUp(page, 'KeyQ');
  await sleep(250);

  await keyDown(page, 'KeyB');
  await sleep(300);
  const bWheelOpen = await page.evaluate(`Boolean(document.getElementById('wheel')?.classList.contains('show'))`);
  await keyUp(page, 'KeyB');
  await sleep(200);
  // Releasing B enters placeMode if a build slot was hovered; Escape cancels placeMode first
  const inPlaceAfterB = await page.evaluate(`Boolean(window.TT?.lockdownState?.()?.buildMode || window.TT?.lockdownState?.()?.placeMode)`);
  if (inPlaceAfterB) {
    await tapKey(page, 'Escape');
    await sleep(220);
  }

  await tapKey(page, 'KeyM');
  await sleep(350);
  const mapShot = await shot(page, '04b-full-map');
  await tapKey(page, 'KeyM');
  await sleep(250);

  await tapKey(page, 'Escape');
  await sleep(300);
  const pauseOpen = await page.evaluate(`Boolean(document.getElementById('pause')?.classList.contains('show'))`);
  if (pauseOpen) {
    await realClickSelector(page, '#tipsBtn');
    await sleep(220);
    await tapKey(page, 'Escape');
    await sleep(200);
    await realClickSelector(page, '#skillsBtn');
    await sleep(220);
    await realClickSelector(page, '#skillsBackBtn');
    await sleep(200);
    await realClickSelector(page, '#resumeBtn');
    await sleep(250);
  }
  logStep('Tested Digit5 1P, shot, reload, KeyV roll, Q-wheel, B-wheel, Map, Pause', { fpCheck1, qWheelOpen, bWheelOpen, inPlaceAfterB, pauseOpen, mapShot: mapShot.rel });

  // 6. Visit ALL 6 HQ Stations cleanly around the HQ perimeter!
  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'hq-stations'; return true; })()`);
  const stationTargets = await page.evaluate(`(() => {
    const TT = window.TT;
    const k = TT.KIOSK?.group?.position;
    // KIOSK sits on -X side of HQ (-5.04, 2.2), so stand 1.3m west of it (-6.35, 2.2)!
    return {
      kiosk: k ? { x: k.x - 1.35, z: k.z } : { x: -6.4, z: 2.2 },
      skullWindow: TT.HQ_WINDOW_FRONT ? { x: TT.HQ_WINDOW_FRONT.x, z: TT.HQ_WINDOW_FRONT.z } : { x: -5.9, z: -2.2 },
      dutyBoard: TT.HQ_DUTY_BOARD_FRONT ? { x: TT.HQ_DUTY_BOARD_FRONT.x, z: TT.HQ_DUTY_BOARD_FRONT.z } : { x: -1.62, z: -5.9 },
      radio: TT.HQ_RADIO_FRONT ? { x: TT.HQ_RADIO_FRONT.x, z: TT.HQ_RADIO_FRONT.z } : { x: 1.62, z: -5.9 },
      panel: TT.HQ_PANEL_FRONT ? { x: TT.HQ_PANEL_FRONT.x, z: TT.HQ_PANEL_FRONT.z } : { x: 3.2, z: -5.9 },
      cif: TT.HQ_CIF_FRONT ? { x: TT.HQ_CIF_FRONT.x, z: TT.HQ_CIF_FRONT.z } : { x: 5.9, z: -3.3 },
      armory: TT.HQ_ARMORY_FRONT ? { x: TT.HQ_ARMORY_FRONT.x, z: TT.HQ_ARMORY_FRONT.z } : { x: 5.9, z: 3.3 },
    };
  })()`);

  // Walk first from Day 1 spawn (~42, -20) to HQ East yard (9, -3.3) so every HQ wall is right there!
  await walkToWorld(page, 9.0, -4.0, 'HQ East Yard Approach', 16000, 1.6);

  // 6a. CIF Window (East wall, south)
  const wCif = await walkToWorld(page, stationTargets.cif.x, stationTargets.cif.z, 'CIF Window', 10000, 0.9);
  await tapKey(page, 'KeyE');
  await sleep(650);
  const cifState = await page.evaluate(`(() => {
    const el = document.getElementById('cif');
    return {
      open: Boolean(el?.classList.contains('show') && !el?.classList.contains('armory-only')),
      tabs: [...document.querySelectorAll('#cifTabs button')].map(b => b.textContent.trim()),
      swatches: document.querySelectorAll('#cifList button').length,
    };
  })()`);
  const shotCif = await shot(page, '05a-station-cif');
  if (cifState.open) {
    await realClickSelector(page, '#cifList button:nth-child(2)');
    await sleep(220);
    await realClickSelector(page, '#cifClose');
    await sleep(300);
  } else {
    report.anomalies.push({ severity: 'P1', kind: 'cif-did-not-open-on-E', wCif, cifState });
  }
  const cifClosedAfter = await page.evaluate(`!document.getElementById('cif')?.classList.contains('show')`);
  report.stationChecks.push({ station: 'CIF', prompt: wCif.promptText, dist: wCif.dist, opened: cifState.open, closedCleanly: cifClosedAfter, shot: shotCif.rel });

  // 6b. Armory Window (East wall, north — nearArmory requires dist < 1.6m!)
  const wArm = await walkToWorld(page, stationTargets.armory.x, stationTargets.armory.z, 'Armory Window', 10000, 0.85);
  await tapKey(page, 'KeyE');
  await sleep(900);
  const armState = await page.evaluate(`(() => {
    const el = document.getElementById('cif');
    const ao = document.getElementById('armoryOpen');
    return {
      open: Boolean(el?.classList.contains('show') && el?.classList.contains('armory-only')),
      armoryRect: ao ? { w: Math.round(ao.getBoundingClientRect().width), h: Math.round(ao.getBoundingClientRect().height) } : null,
      buttons: ao ? ao.querySelectorAll('button').length : 0,
    };
  })()`);
  const shotArm = await shot(page, '05b-station-armory');
  if (armState.open) {
    // Select Pistol slot in CARRIED GUNS to test the 3D Workbench preview in the main game!
    const clickedPistolSlot = await page.evaluate(`(() => {
      const btns = [...document.querySelectorAll('#cif button')];
      const pBtn = btns.find(b => /Pistol/i.test(b.textContent || '') && b.getBoundingClientRect().width > 0);
      if (!pBtn) return null;
      const r = pBtn.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    })()`);
    if (clickedPistolSlot) {
      await clickXY(page, clickedPistolSlot.x, clickedPistolSlot.y, 45);
    }
    await sleep(1800);
    const shotArm2 = await shot(page, '05b2-station-armory-workbench');
    logStep('Armory opened & Workbench preview checked', { armState, clickedPistol: Boolean(clickedPistolSlot), shot2: shotArm2.rel });
    await tapKey(page, 'Escape');
    await sleep(300);
  } else {
    report.anomalies.push({ severity: 'P1', kind: 'armory-did-not-open-on-E', wArm, armState });
  }
  const armClosedAfter = await page.evaluate(`!document.getElementById('cif')?.classList.contains('show')`);
  report.stationChecks.push({ station: 'Armory', prompt: wArm.promptText, dist: wArm.dist, opened: armState.open, closedCleanly: armClosedAfter, shot: shotArm.rel });

  // 6c. Supply Kiosk (West wall, north)
  const wKiosk = await walkToWorld(page, stationTargets.kiosk.x, stationTargets.kiosk.z, 'Supply Kiosk', 14000, 0.95);
  await tapKey(page, 'KeyE');
  await sleep(450);
  const shopState = await page.evaluate(`(() => ({
    open: Boolean(document.getElementById('shop')?.classList.contains('show')),
    tabs: [...document.querySelectorAll('#shopTabs button')].map(b => b.textContent.trim()),
    items: document.querySelectorAll('#shopList button, #shopList .shop-item, #shopList > *').length,
  }))()`);
  const shotKiosk = await shot(page, '05c-station-kiosk');
  if (shopState.open) {
    for (let ti = 1; ti < Math.min(3, shopState.tabs.length); ti++) {
      await realClickSelector(page, `#shopTabs button:nth-child(${ti + 1})`);
      await sleep(180);
    }
    await realClickSelector(page, '#shopClose');
    await sleep(300);
  } else {
    report.anomalies.push({ severity: 'P1', kind: 'kiosk-did-not-open-on-E', wKiosk, shopState });
  }
  const shopClosedAfter = await page.evaluate(`!document.getElementById('shop')?.classList.contains('show')`);
  report.stationChecks.push({ station: 'Supply Kiosk', prompt: wKiosk.promptText, dist: wKiosk.dist, opened: shopState.open, closedCleanly: shopClosedAfter, shot: shotKiosk.rel });

  // 6d. Skull Window (West wall, south)
  const wWin = await walkToWorld(page, stationTargets.skullWindow.x, stationTargets.skullWindow.z, 'Skull Window', 8000, 0.9);
  const shotSkullWin = await shot(page, '05d-station-skull-window');
  report.stationChecks.push({ station: 'Skull Window (0 skulls)', prompt: wWin.promptText, dist: wWin.dist, opened: wWin.promptShown, closedCleanly: true, shot: shotSkullWin.rel });

  // 6e. Duty Board (South wall, west)
  const wDuty = await walkToWorld(page, stationTargets.dutyBoard.x, stationTargets.dutyBoard.z, 'Duty Board', 10000, 0.9);
  await tapKey(page, 'KeyE');
  await sleep(450);
  const dutyState = await page.evaluate(`(() => {
    const dlg = document.getElementById('hqBriefing');
    return {
      open: Boolean(dlg && (dlg.open || !dlg.hidden) && getComputedStyle(dlg).display !== 'none'),
      leads: document.querySelectorAll('#hqBriefing .story-lead').length,
    };
  })()`);
  const shotDuty = await shot(page, '05e-station-duty-board');
  if (dutyState.open) {
    await realClickSelector(page, '#hqBriefing .briefing-close');
    await sleep(300);
  }
  const dutyClosedAfter = await page.evaluate(`(() => {
    const dlg = document.getElementById('hqBriefing');
    return !dlg || (!dlg.open && (dlg.hidden || getComputedStyle(dlg).display === 'none'));
  })()`);
  report.stationChecks.push({ station: 'Duty Board', prompt: wDuty.promptText, dist: wDuty.dist, opened: dutyState.open, closedCleanly: dutyClosedAfter, shot: shotDuty.rel });

  // 6f. HQ Radio (South wall, east)
  const wRadio = await walkToWorld(page, stationTargets.radio.x, stationTargets.radio.z, 'HQ Radio', 8000, 0.9);
  await tapKey(page, 'KeyE');
  await sleep(450);
  const radioState = await page.evaluate(`(() => {
    const dlg = document.getElementById('hqBriefing');
    return {
      open: Boolean(dlg && (dlg.open || !dlg.hidden) && getComputedStyle(dlg).display !== 'none'),
      cards: document.querySelectorAll('#hqBriefing .radio-call-card').length,
    };
  })()`);
  const shotRadio = await shot(page, '05f-station-radio');
  if (radioState.open) {
    await realClickSelector(page, '#hqBriefing .radio-call-card:first-child');
    await sleep(200);
    await realClickSelector(page, '#hqBriefing .briefing-close');
    await sleep(300);
  }
  const radioClosedAfter = await page.evaluate(`(() => {
    const dlg = document.getElementById('hqBriefing');
    return !dlg || (!dlg.open && (dlg.hidden || getComputedStyle(dlg).display === 'none'));
  })()`);
  report.stationChecks.push({ station: 'HQ Radio', prompt: wRadio.promptText, dist: wRadio.dist, opened: radioState.open, closedCleanly: radioClosedAfter, shot: shotRadio.rel });

  // Post-stations 3D live movement check
  await verifyLive3DMovement(page, 'post-all-hq-stations', '05g-after-stations', 'KeyS', 450);

  // 7. Call Night 1 at HQ Alarm Panel!
  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'night1-alarm'; return true; })()`);
  const wPanel = await walkToWorld(page, stationTargets.panel.x, stationTargets.panel.z, 'HQ Alarm Panel', 8000, 0.9);
  await tapKey(page, 'KeyE');
  await sleep(500);
  const shotAlarmBrief = await shot(page, '06a-hq-alarm-briefing');
  const clickedAlarm = await realClickSelector(page, '#hqBriefing .briefing-alarm');
  assert(clickedAlarm, 'Could not click #hqBriefing .briefing-alarm to start Night 1');
  logStep('Sounded HQ Alarm for Night 1!', { prompt: wPanel.promptText, btn: clickedAlarm.text, briefingShot: shotAlarmBrief.rel });

  await sleep(2200);
  const shotAlarmCine = await shot(page, '06b-night1-alarm-cine');
  logStep('Captured Night 1 alarm cinematic', { meanLum: shotAlarmCine.meanLum, shot: shotAlarmCine.rel });

  const waveStarted = await page.waitFor(
    'window.__ah6Mon?.hudState?.phase === "wave" && !window.TT?.getLoopCine?.()',
    { timeout: 25000, every: 200 }
  );
  assert(waveStarted, 'Night 1 wave did not start after sounding HQ alarm');
  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'night1-wave'; return true; })()`);

  // Verify Night Lockdown at Supply Kiosk
  const wLockCheck = await walkToWorld(page, stationTargets.kiosk.x, stationTargets.kiosk.z, 'Kiosk Night Lockdown Check', 10000, 1.0);
  await tapKey(page, 'KeyE');
  await sleep(250);
  const shopOpenedDuringLockdown = await page.evaluate(`Boolean(document.getElementById('shop')?.classList.contains('show'))`);
  logStep('Verified Night Lockdown on Kiosk', { prompt: wLockCheck.promptText, shopOpenedDuringLockdown });
  if (shopOpenedDuringLockdown) {
    report.anomalies.push({ severity: 'P1', kind: 'shop-opened-during-night-lockdown', wLockCheck });
    await realClickSelector(page, '#shopClose');
  }

  // 8. Fight ALL 15 Night 1 Shamblers to Real Day 2 Dawn!
  // Use pistol at range + step in and slash with KeyF (knife) whenever out of pistol ammo or <= 4 zombies remain!
  let shotsFired = 0, reloadsTriggered = 0, knifeSwings = 0, checked1PCombat = false, took3PCombatShot = false;
  let zombieModelAudit = { maxLiveSeen: 0, invisibleLiveZombies: 0, nanZombies: 0 };
  const combatStart = Date.now();
  let kiteAngle = Math.PI;

  while (Date.now() - combatStart < 190000) {
    const state = await page.evaluate(`(() => {
      const TT = window.TT;
      const hud = window.__ah6Mon?.hudState;
      const p = TT.player.position;
      const cam = TT.camera;
      const f = new TT.THREE.Vector3();
      cam.getWorldDirection(f);
      let fx = f.x, fz = f.z;
      const fl = Math.hypot(fx, fz) || 1;
      fx /= fl; fz /= fl;
      const rx = -fz, rz = fx;

      let liveCount = 0, invCount = 0, nanCount = 0;
      let nearest = null, bestD = Infinity;
      const vProj = new TT.THREE.Vector3();
      for (const z of (TT.zombies || [])) {
        if (!z || !z.alive) continue;
        liveCount++;
        const m = z.mesh;
        if (!m || !m.visible) invCount++;
        if (!m || !Number.isFinite(m.position.x) || !Number.isFinite(m.position.z)) { nanCount++; continue; }
        const d = Math.hypot(m.position.x - p.x, m.position.z - p.z);
        if (d < bestD) {
          bestD = d;
          // Project lower torso/waist (y + 0.45) so 3P terrain raycast cuts right through the zombie!
          vProj.set(m.position.x, m.position.y + 0.45, m.position.z).project(cam);
          nearest = {
            dist: Number(d.toFixed(2)),
            x: Number(m.position.x.toFixed(2)),
            z: Number(m.position.z.toFixed(2)),
            sx: Math.round((vProj.x * 0.5 + 0.5) * innerWidth),
            sy: Math.round((-vProj.y * 0.5 + 0.5) * innerHeight),
            inFront: vProj.z < 1.0,
          };
        }
      }

      let skullDrop = null, bestS = Infinity;
      for (const c of (TT.cashDrops || [])) {
        if (!c || !c.skull || !c.mesh) continue;
        const sd = Math.hypot(c.mesh.position.x - p.x, c.mesh.position.z - p.z);
        if (sd < bestS) {
          bestS = sd;
          skullDrop = { x: c.mesh.position.x, z: c.mesh.position.z, dist: Number(sd.toFixed(2)) };
        }
      }

      const ammoText = String(document.getElementById('ammo')?.textContent?.replace(/\\s+/g, ' ').trim() || '');
      const noAmmo = ammoText.includes('NO AMMO') || (ammoText.includes('0 / 12') && ammoText.includes('0 Bullets'));
      const magEmpty = ammoText.startsWith('0 ') && !noAmmo;
      const waveHud = String(document.getElementById('waveLine')?.textContent?.replace(/\\s+/g, ' ').trim() || '');
      return {
        day: hud?.day || 1,
        phase: hud?.phase || '',
        hp: hud?.hp ?? 100,
        skulls: hud?.skulls ?? 0,
        cash: hud?.cash ?? 0,
        px: p.x,
        pz: p.z,
        fx, fz, rx, rz,
        liveCount,
        invCount,
        nanCount,
        nearest,
        skullDrop,
        reloading: Boolean(TT.isReloading?.()),
        finisher: Boolean(TT.getWaveFinisher?.()),
        loopCine: Boolean(TT.getLoopCine?.()),
        noAmmo,
        magEmpty,
        ammoText,
        waveHud,
      };
    })()`);

    if (state.liveCount > zombieModelAudit.maxLiveSeen) zombieModelAudit.maxLiveSeen = state.liveCount;
    zombieModelAudit.invisibleLiveZombies += state.invCount;
    zombieModelAudit.nanZombies += state.nanCount;

    if (state.day >= 2 && state.phase === 'prep' && !state.loopCine && !state.finisher) {
      await releaseAllMoveKeys(page);
      logStep('ALL 15 Night 1 shamblers cleared -> Day 2 Dawn reached!', { day: state.day, hp: state.hp, skulls: state.skulls, shotsFired, knifeSwings });
      break;
    }

    const diedEarly = await page.evaluate(`Boolean(document.getElementById('win')?.classList.contains('show') || window.TT?.getCine?.()?.active)`);
    if (diedEarly) {
      await releaseAllMoveKeys(page);
      report.anomalies.push({ severity: 'P2', kind: 'died-during-night1-before-dawn', state });
      break;
    }

    // 3P + genuine Digit5 1P combat checks mid-wave!
    if (!took3PCombatShot && state.liveCount >= 3 && state.nearest && state.nearest.dist < 18) {
      await releaseAllMoveKeys(page);
      const s3p = await shot(page, '07a-night1-combat-3p');
      logStep('Night 1 3P combat screenshot', { liveZombies: state.liveCount, nearestDist: state.nearest.dist, shot: s3p.rel, waveHud: state.waveHud });
      took3PCombatShot = true;
    } else if (took3PCombatShot && !checked1PCombat && state.liveCount >= 2 && state.nearest && state.nearest.dist > 5 && state.nearest.dist < 18) {
      await releaseAllMoveKeys(page);
      await tapKey(page, 'Digit5');
      await sleep(600);
      await clickXY(page, 960, 540, 50); // fire in real 1P during Night 1 wave!
      await sleep(220);
      const s1p = await shot(page, '07b-night1-combat-1p');
      await tapKey(page, 'Digit5');
      await sleep(600);
      logStep('Night 1 real 1P (Digit5) combat screenshot', { liveZombies: state.liveCount, shot: s1p.rel });
      checked1PCombat = true;
    }

    const useKnifeMode = state.noAmmo || (state.liveCount <= 4 && state.hp > 55);
    let goalX, goalZ;

    if (state.skullDrop && state.skullDrop.dist < 16 && (!state.nearest || state.nearest.dist > 4.5)) {
      goalX = state.skullDrop.x;
      goalZ = state.skullDrop.z;
    } else if (useKnifeMode && state.nearest) {
      // Aim cursor at zombie so marine faces it, step in to ~1.55m, slash with KeyF, and sidestep!
      if (state.nearest.dist > 1.75) {
        goalX = state.nearest.x;
        goalZ = state.nearest.z;
      } else {
        // Circle-strafe at 1.6m while knifing so shambler swing misses!
        const ax = state.px - state.nearest.x, az = state.pz - state.nearest.z;
        const al = Math.hypot(ax, az) || 1;
        goalX = state.nearest.x + (ax / al) * 1.65 + (-az / al) * 1.4;
        goalZ = state.nearest.z + (az / al) * 1.65 + (ax / al) * 1.4;
      }
    } else if (state.nearest && state.nearest.dist < 7.5) {
      const awayX = state.px - state.nearest.x;
      const awayZ = state.pz - state.nearest.z;
      const al = Math.hypot(awayX, awayZ) || 1;
      goalX = state.px + (awayX / al) * 7 + (-awayZ / al) * 4;
      goalZ = state.pz + (awayZ / al) * 7 + (awayX / al) * 4;
      if (Math.abs(goalX) < 7.5 && Math.abs(goalZ) < 7.5) {
        kiteAngle += 0.55;
        goalX = Math.cos(kiteAngle) * 14;
        goalZ = Math.sin(kiteAngle) * 14;
      }
    } else if (state.nearest) {
      // Walk toward zombie until within ~12m shooting range!
      goalX = state.nearest.x;
      goalZ = state.nearest.z;
    } else {
      kiteAngle += 0.3;
      goalX = Math.cos(kiteAngle) * 13;
      goalZ = Math.sin(kiteAngle) * 13;
    }

    const dx = goalX - state.px, dz = goalZ - state.pz;
    const dl = Math.hypot(dx, dz) || 1;
    const fwdDot = (dx * state.fx + dz * state.fz) / dl;
    const rightDot = (dx * state.rx + dz * state.rz) / dl;
    if (fwdDot > 0.24) await keyDown(page, 'KeyW'); else await keyUp(page, 'KeyW');
    if (fwdDot < -0.24) await keyDown(page, 'KeyS'); else await keyUp(page, 'KeyS');
    if (rightDot > 0.24) await keyDown(page, 'KeyD'); else await keyUp(page, 'KeyD');
    if (rightDot < -0.24) await keyDown(page, 'KeyA'); else await keyUp(page, 'KeyA');
    if (useKnifeMode || (state.nearest && state.nearest.dist < 4.5)) await keyDown(page, 'ShiftLeft'); else await keyUp(page, 'ShiftLeft');

    if (state.nearest && !state.finisher && !state.loopCine) {
      const sx = Math.max(20, Math.min(1900, state.nearest.sx));
      const sy = Math.max(20, Math.min(1060, state.nearest.sy));
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sx, y: sy, button: 'none' });

      if (state.nearest.dist < 2.45) {
        await tapKey(page, 'KeyF', 40);
        knifeSwings++;
      } else if (!useKnifeMode && state.nearest.inFront && state.nearest.dist < 19) {
        if (state.magEmpty && !state.reloading) {
          await tapKey(page, 'KeyR', 50);
          reloadsTriggered++;
        } else if (!state.reloading && !state.noAmmo) {
          await clickXY(page, sx, sy, 32);
          shotsFired++;
          if (state.nearest.dist < 13) {
            await sleep(85);
            await clickXY(page, sx, sy, 32);
            shotsFired++;
          }
        }
      }
    }
    await sleep(110);
  }
  await releaseAllMoveKeys(page);

  report.combatSummary = {
    shotsFired,
    reloadsTriggered,
    knifeSwings,
    ...zombieModelAudit,
  };

  // 9. Day 2 Dawn Verification + Pick up any nearby skulls + Bank Skulls at HQ Window + Kiosk Purchase!
  const reachedDay2 = await page.evaluate(`(window.__ah6Mon?.hudState?.day ?? 1) >= 2 && window.__ah6Mon?.hudState?.phase === 'prep'`);
  if (!reachedDay2) {
    report.anomalies.push({ severity: 'P2', kind: 'night1-did-not-reach-day2-within-timeout' });
  } else {
    await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'day2-dawn'; return true; })()`);
    await sleep(800);
    const dawnShot = await shot(page, '08a-day2-dawn');
    const dawnHud = await page.evaluate(`(() => {
      const dc = document.getElementById('dawnCard');
      const cs = dc ? getComputedStyle(dc) : null;
      return {
        hud: window.__ah6Mon?.hudState || null,
        dawnCardVisible: Boolean(dc && cs && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05),
        dawnTitle: String(document.getElementById('dawnTitle')?.textContent?.trim() || ''),
      };
    })()`);
    logStep('Day 2 Dawn verified!', { ...dawnHud, shot: dawnShot.rel });

    await verifyLive3DMovement(page, 'day2-dawn-move', '08b-day2-move', 'KeyA', 480);

    // Grab a dropped skull if skulls === 0 and one is nearby
    const curSkulls = await page.evaluate(`window.__ah6Mon?.hudState?.skulls ?? 0`);
    if (curSkulls === 0) {
      const drop = await page.evaluate(`(() => {
        const p = window.TT.player.position;
        for (const c of (window.TT.cashDrops || [])) {
          if (c && c.skull && c.mesh) return { x: c.mesh.position.x, z: c.mesh.position.z };
        }
        return null;
      })()`);
      if (drop) await walkToWorld(page, drop.x, drop.z, 'Collect Night 1 Skull', 8000, 0.8);
    }

    // Bank skulls at HQ Skull Window!
    const wBank = await walkToWorld(page, stationTargets.skullWindow.x, stationTargets.skullWindow.z, 'Day 2 Skull Window Turn-In', 14000, 0.9);
    const skullsBefore = await page.evaluate(`window.__ah6Mon?.hudState?.skulls ?? 0`);
    const cashBefore = await page.evaluate(`window.__ah6Mon?.hudState?.cash ?? 0`);
    if (skullsBefore > 0) {
      await tapKey(page, 'KeyE');
      await sleep(900);
      const shotBank = await shot(page, '08c-day2-skull-deposit');
      await page.waitFor(
        `(window.__ah6Mon?.hudState?.cash ?? 0) > ${cashBefore} && !window.__ah6Mon?.hudState?.pendingDeposit`,
        { timeout: 12000, every: 200 }
      );
      const cashAfter = await page.evaluate(`window.__ah6Mon?.hudState?.cash ?? 0`);
      logStep('Banked Night 1 skulls into Cash at HQ Window!', { skullsBefore, cashBefore, cashAfter, shot: shotBank.rel });
    } else {
      logStep('Day 2 Skull Window check (0 skulls held)', { prompt: wBank.promptText, cashBefore });
    }

    // Open Supply Kiosk on Day 2 (confirming Night Lockdown lifted!) & buy an item!
    // Step 1.5m west of the yard fence post between Skull Window and Kiosk first
    await walkToWorld(page, -7.4, 2.2, 'Day 2 Kiosk Approach', 5000, 1.1);
    await walkToWorld(page, stationTargets.kiosk.x, stationTargets.kiosk.z, 'Day 2 Supply Kiosk', 6000, 0.95);
    await tapKey(page, 'KeyE');
    await sleep(450);
    const day2ShopOpen = await page.evaluate(`Boolean(document.getElementById('shop')?.classList.contains('show'))`);
    const shotDay2Kiosk = await shot(page, '08d-day2-kiosk-post-lockdown');
    if (day2ShopOpen) {
      const bought = await realClickSelector(page, '#shopList button:not([disabled])');
      await sleep(250);
      await realClickSelector(page, '#shopClose');
      await sleep(300);
      logStep('Day 2 Supply Kiosk unlocked & tested purchase', { day2ShopOpen, bought: bought?.text || null, shot: shotDay2Kiosk.rel });
    } else {
      report.anomalies.push({ severity: 'P1', kind: 'kiosk-stuck-locked-after-dawn', day2ShopOpen });
    }

    // Sound Night 2 alarm so zombies come kill the player naturally!
    await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'dying-and-burial'; return true; })()`);
    await walkToWorld(page, stationTargets.panel.x, stationTargets.panel.z, 'HQ Alarm Panel (Night 2 for Death Test)', 12000, 0.9);
    await tapKey(page, 'KeyE');
    await sleep(450);
    await realClickSelector(page, '#hqBriefing .briefing-alarm');
    logStep('Sounded Night 2 alarm to test natural player death -> burial -> #again restart');

    await page.waitFor(
      'window.__ah6Mon?.hudState?.phase === "wave" && !window.TT?.getLoopCine?.()',
      { timeout: 25000, every: 200 }
    );
  }

  // 10. Die Naturally to Zombies -> Watch Burial Cinematic -> #win Game Over Card!
  let capturedDyingShot = false, capturedBurialShot = false;
  const deathWaitStart = Date.now();
  while (Date.now() - deathWaitStart < 120000) {
    const ds = await page.evaluate(`(() => {
      const TT = window.TT;
      const winShown = Boolean(document.getElementById('win')?.classList.contains('show'));
      const cine = TT?.getCine?.();
      const cineActive = Boolean(cine && cine.active);
      const hp = window.__ah6Mon?.hudState?.hp ?? 100;
      const p = TT.player.position;
      let nz = null, best = Infinity;
      for (const z of (TT.zombies || [])) {
        if (!z || !z.alive || !z.mesh) continue;
        const d = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z);
        if (d < best) { best = d; nz = { x: z.mesh.position.x, z: z.mesh.position.z, dist: Number(d.toFixed(2)) }; }
      }
      return { winShown, cineActive, hp, nz };
    })()`);

    if (ds.winShown) {
      await releaseAllMoveKeys(page);
      break;
    }
    if (ds.cineActive) {
      await releaseAllMoveKeys(page);
      if (!capturedBurialShot) {
        await sleep(1800);
        const sBurial = await shot(page, '09b-death-burial-cine');
        logStep('Captured Death Burial Cinematic', { shot: sBurial.rel, meanLum: sBurial.meanLum });
        capturedBurialShot = true;
        await sleep(2200);
        const stillCine = await page.evaluate(`Boolean(window.TT?.getCine?.()?.active && !document.getElementById('win')?.classList.contains('show'))`);
        if (stillCine) {
          await tapKey(page, 'Space', 80);
          logStep('Pressed Space during burial cine to test skip');
        }
      }
      await sleep(300);
      continue;
    }
    if (!capturedDyingShot && ds.hp < 75 && ds.hp > 0) {
      await releaseAllMoveKeys(page);
      const sHurt = await shot(page, '09a-taking-damage-bloodscreen');
      logStep('Captured player taking zombie damage (#bloodScreen)', { hp: ds.hp, shot: sHurt.rel });
      capturedDyingShot = true;
    }
    if (ds.nz && ds.nz.dist > 1.6) {
      await walkToWorld(page, ds.nz.x, ds.nz.z, 'Meet Zombie for Death Test', 1200, 1.3);
    } else {
      await sleep(250);
    }
  }
  await releaseAllMoveKeys(page);

  const winScreenReady = await page.waitFor(
    'Boolean(document.getElementById("win")?.classList.contains("show"))',
    { timeout: 25000, every: 200 }
  );
  assert(winScreenReady, 'Game Over (#win) screen did not appear after dying');
  await sleep(500);
  const gameOverShot = await shot(page, '09c-game-over-screen');
  const gameOverInfo = await page.evaluate(`(() => ({
    title: String(document.getElementById('winTitle')?.textContent?.trim() || ''),
    skillsCount: document.querySelectorAll('#deathSkillsList > *').length,
    againText: String(document.getElementById('again')?.textContent?.trim() || ''),
    deathCause: String(window.TT?.getDeathCause?.() || ''),
  }))()`);
  logStep('Game Over (#win) card verified', { ...gameOverInfo, shot: gameOverShot.rel });

  // 11. Click #again ("PLAY AGAIN") -> returns to #modeSelect.show -> Click #modeHunt -> Redeploy into Run #2 Day 1 Prep!
  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'restart-run2'; return true; })()`);
  const clickedAgain = await realClickSelector(page, '#again');
  assert(clickedAgain, 'Could not click #again on Game Over screen');

  const returnedToMenuOnAgain = await page.waitFor(
    '!document.getElementById("win")?.classList.contains("show") && Boolean(document.getElementById("modeSelect")?.classList.contains("show"))',
    { timeout: 15000, every: 200 }
  );
  assert(returnedToMenuOnAgain, '#again did not return cleanly to #modeSelect');
  await sleep(500);
  const afterAgainMenuShot = await shot(page, '10a-after-play-again-menu');
  logStep('#again ("PLAY AGAIN") returned to Title Menu; now clicking #modeHunt to deploy Run #2!', { shot: afterAgainMenuShot.rel });

  const clickedHuntRun2 = await realClickSelector(page, '#modeHunt');
  assert(clickedHuntRun2, 'Could not click #modeHunt for Run #2');
  await sleep(16000); // full ~15s Run #2 camera fly-in + 9s parachute insertion!

  const run2Ready = await page.waitFor(
    'Boolean(window.__ah6Mon?.hudState?.active) && window.__ah6Mon?.hudState?.day === 1 && window.__ah6Mon?.hudState?.phase === "prep" && !document.getElementById("modeSelect")?.classList.contains("show")',
    { timeout: 15000, every: 200 }
  );
  assert(run2Ready, 'Run #2 did not deploy cleanly into Day 1 Prep');

  const restartMoveCheck = await verifyLive3DMovement(page, 'restarted-run2-day1', '10b-restarted-day1', 'KeyD', 500);
  const postRestartAudit = await page.evaluate(`(() => {
    const TT = window.TT;
    const bloodOp = Number(getComputedStyle(document.getElementById('bloodScreen')).opacity || 0);
    const nonGuardWaveZombs = (TT.zombies || []).filter(z => z && z.alive && !z.poiGuard).length;
    const anyGrave = Boolean(TT.nearestGrave && TT.nearestGrave(120));
    return {
      day: window.__ah6Mon?.hudState?.day,
      phase: window.__ah6Mon?.hudState?.phase,
      hp: window.__ah6Mon?.hudState?.hp,
      cash: window.__ah6Mon?.hudState?.cash,
      skulls: window.__ah6Mon?.hudState?.skulls,
      bloodScreenOpacity: bloodOp,
      leftoverWaveZombies: nonGuardWaveZombs,
      previousRunGravePresent: anyGrave,
      cineStillActive: Boolean(TT.getCine?.()?.active),
    };
  })()`);
  logStep('Post-restart Run #2 state audit', postRestartAudit);
  report.deathAndRestart = {
    gameOverInfo,
    returnedToMenuOnAgain: true,
    postRestartAudit,
    restartMoveCheck,
  };

  if (postRestartAudit.leftoverWaveZombies > 0) {
    report.anomalies.push({ severity: 'P1', kind: 'leftover-wave-zombies-after-restart', postRestartAudit });
  }
  if (postRestartAudit.bloodScreenOpacity > 0.05) {
    report.anomalies.push({ severity: 'P2', kind: 'bloodscreen-not-cleared-on-restart', opacity: postRestartAudit.bloodScreenOpacity });
  }

  // 12. Pause -> Quit to Main Menu (#quitMenuBtn -> #quitConfirmBtn)
  await page.evaluate(`(() => { window.__ah6Mon.phaseLabel = 'quit-to-menu'; return true; })()`);
  await tapKey(page, 'Escape');
  await sleep(350);
  await realClickSelector(page, '#quitMenuBtn');
  await sleep(300);
  await realClickSelector(page, '#quitConfirmBtn');
  const backAtTitle = await page.waitFor(
    'Boolean(document.getElementById("modeSelect")?.classList.contains("show"))',
    { timeout: 15000, every: 200 }
  );
  assert(backAtTitle, 'Did not return to Title Screen after Quit to Menu');
  await sleep(500);
  const quitTitleShot = await shot(page, '11-quit-to-title');
  logStep('Returned cleanly to Title Screen via Pause -> Quit', { shot: quitTitleShot.rel, meanLum: quitTitleShot.meanLum });
} catch (err) {
  report.fatalError = String(err?.stack || err?.message || err);
  console.error(`[AH-6 · ${backend}] FATAL:`, report.fatalError);
  throw err;
} finally {
  if (page) {
    try {
      const mon = await page.evaluate(`window.__ah6Mon`);
      report.monitor = mon || null;
      report.pageErrors = [...page.errors];
      report.consoleErrors = mon?.consoleErrs || [];
      report.consoleWarnings = mon?.consoleWarns || [];
      if (report.pageErrors.length > 0 || (mon?.winErrors?.length || 0) > 0 || (mon?.rejections?.length || 0) > 0) {
        report.anomalies.push({
          severity: 'P0',
          kind: 'uncaught-page-or-promise-errors',
          pageErrors: report.pageErrors,
          winErrors: mon?.winErrors || [],
          rejections: mon?.rejections || [],
        });
      }
      if ((mon?.gpuUncaptured?.length || 0) > 0 || (mon?.webglContextLost || 0) > 0) {
        report.anomalies.push({
          severity: 'P0',
          kind: 'gpu-error-or-context-lost',
          gpuUncaptured: mon?.gpuUncaptured || [],
          webglContextLost: mon?.webglContextLost || 0,
        });
      }
      const bigStalls = (mon?.hitches || []).filter((h) => h.gapMs >= 500 && h.stage !== 'opening');
      if (bigStalls.length > 0) {
        report.anomalies.push({
          severity: 'P1',
          kind: 'gameplay-raf-stalls-over-500ms',
          stalls: bigStalls,
        });
      }
    } catch {}
    try { await page.close(); } catch {}
  }
  report.completedAt = new Date().toISOString();
  report.durationSec = elapsedSec();
  const outJson = path.join(OUT_DIR, `hunt-${backend}.json`);
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[AH-6 · ${backend}] Saved ${outJson} in ${report.durationSec}s. Anomalies: ${report.anomalies.length}, PageErrors: ${report.pageErrors.length}`);
  await browser.close();
  await server.close();
}

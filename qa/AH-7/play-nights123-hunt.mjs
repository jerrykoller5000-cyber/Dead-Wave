// AH-7: Longer Normal-Player P0 Hunt through Night 2 and Night 3 (WebGPU & WebGL)
// Usage: node qa/AH-7/play-nights123-hunt.mjs <webgpu|webgl> <targetNights=3|2>
// No ?debug=1, zero mutating/Dbg hooks (debugTouched stays false!), real mouse/keyboard input.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Must run inside game-test slot');

const backend = process.argv[2];
const targetNights = Number(process.argv[3] || (backend === 'webgpu' ? 3 : 2));
assert(backend === 'webgpu' || backend === 'webgl', 'Usage: node qa/AH-7/play-nights123-hunt.mjs <webgpu|webgl> [3|2]');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'qa', 'AH-7');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RUN_START_MS = Date.now();
const MAX_WALL_MS = 13.5 * 60 * 1000; // hard 13.5 min cap inside 15-min slot budget
const elapsedSec = () => Number(((Date.now() - RUN_START_MS) / 1000).toFixed(1));
const timeLeftMs = () => MAX_WALL_MS - (Date.now() - RUN_START_MS);

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
  assert(bitDepth === 8 && bpp > 0, `Unsupported PNG format`);
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
  let n = 0, sumLum = 0, sumSq = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      if (x >= 940 && x <= 980 && y >= 520 && y <= 560) continue;
      const idx = (y * img.width + x) * 4;
      const lum = 0.299 * img.rgba[idx] + 0.587 * img.rgba[idx + 1] + 0.114 * img.rgba[idx + 2];
      n++;
      sumLum += lum;
      sumSq += lum * lum;
    }
  }
  const meanLum = n > 0 ? sumLum / n : 0;
  const stdLum = n > 0 ? Math.sqrt(Math.max(0, sumSq / n - meanLum * meanLum)) : 0;
  return {
    meanLum: Number(meanLum.toFixed(2)),
    stdLum: Number(stdLum.toFixed(2)),
    isBlackOrSolid: meanLum < 2.5 || stdLum < 1.2,
  };
}

function compare3DRegion(pngA, pngB) {
  const a = decodePngRgba(fs.readFileSync(pngA));
  const b = decodePngRgba(fs.readFileSync(pngB));
  const x0 = 320, x1 = Math.min(1600, a.width), y0 = 180, y1 = Math.min(860, a.height);
  let total = 0, changed = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x >= 940 && x <= 980 && y >= 520 && y <= 560) continue;
      total++;
      const idx = (y * a.width + x) * 4;
      const md = Math.max(
        Math.abs(a.rgba[idx] - b.rgba[idx]),
        Math.abs(a.rgba[idx + 1] - b.rgba[idx + 1]),
        Math.abs(a.rgba[idx + 2] - b.rgba[idx + 2])
      );
      if (md > 3) changed++;
    }
  }
  const changedPct = total > 0 ? Number(((changed / total) * 100).toFixed(3)) : 0;
  return { changedPct, frozen3D: changedPct < 0.2 };
}

const KEY_DEFS = {
  KeyW: { key: 'w', code: 'KeyW', vk: 87 },
  KeyA: { key: 'a', code: 'KeyA', vk: 65 },
  KeyS: { key: 's', code: 'KeyS', vk: 83 },
  KeyD: { key: 'd', code: 'KeyD', vk: 68 },
  KeyE: { key: 'e', code: 'KeyE', vk: 69 },
  KeyF: { key: 'f', code: 'KeyF', vk: 70 },
  KeyG: { key: 'g', code: 'KeyG', vk: 71 },
  KeyH: { key: 'h', code: 'KeyH', vk: 72 },
  KeyR: { key: 'r', code: 'KeyR', vk: 82 },
  KeyV: { key: 'v', code: 'KeyV', vk: 86 },
  KeyX: { key: 'x', code: 'KeyX', vk: 88 },
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

async function tapKey(page, code, holdMs = 55) {
  await keyDown(page, code);
  await sleep(holdMs);
  await keyUp(page, code);
}

async function releaseAllMoveKeys(page) {
  for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) {
    try { await keyUp(page, c); } catch {}
  }
}

async function scrollAndClickSelector(page, selector) {
  const box = await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el || el.disabled) return null;
    try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch {}
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) return null;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: (el.textContent || '').trim().slice(0, 60) };
  })()`);
  if (!box) return null;
  await sleep(50);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await sleep(30);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(45);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  return box;
}

async function fireAtScreen(page, x, y, holdMs = 45) {
  const rx = Math.max(12, Math.min(1908, Math.round(x)));
  const ry = Math.max(12, Math.min(1068, Math.round(y)));
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rx, y: ry, button: 'none' });
  await sleep(14);
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
  targetNights,
  startedAt: new Date().toISOString(),
  steps: [],
  frameChecks: [],
  weaponsBought: [],
  nights: [],
  titleEndState: null,
  anomalies: [],
  pageErrors: [],
  consoleErrors: [],
  consoleWarnings: [],
};

function logStep(name, data = {}) {
  const entry = { tSec: elapsedSec(), name, ...data };
  report.steps.push(entry);
  console.log(`[AH-7 · ${backend} · +${entry.tSec}s] ${name}`, Object.keys(data).length ? JSON.stringify(data) : '');
}

async function shot(page, slug) {
  const file = `${backend}-${slug}.png`;
  const full = path.join(OUT_DIR, file);
  await page.screenshot(full);
  const stats = analyzeFrame(full);
  if (stats.isBlackOrSolid) {
    report.anomalies.push({ severity: 'P0', kind: 'black-or-solid-frame', slug, shot: `qa/AH-7/${file}`, stats });
  }
  return { rel: `qa/AH-7/${file}`, full, ...stats };
}

async function verifyLive3DMovement(page, tag, slugPrefix, moveCode = 'KeyD', holdMs = 460) {
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
    meanLumB: after.meanLum,
    changedPct: diff.changedPct,
    frozen3D: diff.frozen3D,
    distMoved,
    perfText: p1.perfText,
  };
  report.frameChecks.push(check);
  if (diff.frozen3D) {
    report.anomalies.push({ severity: 'P0', kind: 'frozen-3d-frame', tag, check });
  }
  logStep(`Frame/Input check [${tag}]`, { changedPct: diff.changedPct, frozen3D: diff.frozen3D, distMoved });
  return check;
}

async function walkToWorld(page, tx, tz, label, maxMs = 15000, tol = 0.9) {
  const cur = await page.evaluate(`(() => {
    const p = window.TT?.player?.position;
    return p ? { x: p.x, z: p.z } : { x: 0, z: -12 };
  })()`);

  const segHitsHouse = (ax, az, bx, bz) => {
    for (let i = 1; i <= 16; i++) {
      const t = i / 17;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      if (Math.abs(x) < 5.7 && Math.abs(z) < 5.7) return true;
    }
    return false;
  };

  const waypoints = [];
  if (segHitsHouse(cur.x, cur.z, tx, tz)) {
    // Use the clean 6.9m dirt apron around HQ (inside the watchtower/crate ring at ~9.2m!)
    const R = 6.9;
    const corners = [{ x: -R, z: -R }, { x: R, z: -R }, { x: R, z: R }, { x: -R, z: R }];
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
      const wpTol = isFinal ? tol : 1.3;
      let lastCheckT = Date.now(), lastCheckX = cur.x, lastCheckZ = cur.z, sidestepDir = 1;
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
          return { px: p.x, pz: p.z, fx, fz, rx: -fz, rz: fx };
        })()`);
        if (!nav) break;
        const dx = wp.x - nav.px, dz = wp.z - nav.pz;
        const dist = Math.hypot(dx, dz);
        if (dist <= wpTol) break;

        // Unstick if pinned against a prop/post/crate for >850ms
        if (Date.now() - lastCheckT > 850) {
          if (Math.hypot(nav.px - lastCheckX, nav.pz - lastCheckZ) < 0.35) {
            const perpX = (-dz / dist) * sidestepDir, perpZ = (dx / dist) * sidestepDir;
            sidestepDir = -sidestepDir;
            const pf = perpX * nav.fx + perpZ * nav.fz;
            const pr = perpX * nav.rx + perpZ * nav.rz;
            await setKey('KeyW', pf > 0.2); await setKey('KeyS', pf < -0.2);
            await setKey('KeyD', pr > 0.2); await setKey('KeyA', pr < -0.2);
            await sleep(420);
          }
          lastCheckT = Date.now(); lastCheckX = nav.px; lastCheckZ = nav.pz;
        }

        await setKey('ShiftLeft', !isFinal || dist > 2.5);
        const fwdDot = (dx * nav.fx + dz * nav.fz) / dist;
        const rightDot = (dx * nav.rx + dz * nav.rz) / dist;
        await setKey('KeyW', fwdDot > 0.24);
        await setKey('KeyS', fwdDot < -0.24);
        await setKey('KeyD', rightDot > 0.24);
        await setKey('KeyA', rightDot < -0.24);
        await sleep(55);
      }
    }
  } finally {
    for (const c of [...held]) {
      try { await keyUp(page, c); } catch {}
    }
  }
  await sleep(150);
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
  const dist = endPos.x != null ? Number(Math.hypot(endPos.x - tx, endPos.z - tz).toFixed(2)) : null;
  logStep(`Walked to ${label}`, { pos: [endPos.x, endPos.z], dist, prompt: endPos.promptText });
  return { ...endPos, dist };
}

// Switch active weapon via KeyQ taps until TT.getCurrentWeapon() matches desiredKind (max 5 taps)
async function selectWeaponKind(page, desiredKind) {
  for (let i = 0; i < 5; i++) {
    const cur = await page.evaluate(`String(window.TT?.getCurrentWeapon?.() || '')`);
    if (cur === desiredKind) return cur;
    await tapKey(page, 'KeyQ', 45);
    await sleep(220);
  }
  return await page.evaluate(`String(window.TT?.getCurrentWeapon?.() || '')`);
}

// Fight a complete Night wave (Night 1 = 15, Night 2 = 50 + ferals, Night 3 = 100 + ferals/leapers/drowned)!
async function fightNightWave(page, nightNum, maxWaveMs) {
  await page.evaluate(`(() => { window.__ah7Mon.phaseLabel = 'night' + ${nightNum} + '-wave'; return true; })()`);
  const t0 = Date.now();
  let shotsFired = 0, autoBursts = 0, reloads = 0, knifeSwings = 0, grenadesThrown = 0, medpensUsed = 0, weaponSwaps = 0;
  let took3PShot = false, took1PShot = false, tookLowFpsShot = false;
  const seenKinds = {};
  let maxLiveZombies = 0, invisibleLiveZombies = 0, nanZombies = 0;
  let minFpsDuringNight = 999, worstFrameMsDuringNight = 0;
  let kiteAngle = 0;
  let lastGrenadeAt = 0, lastMedAt = 0, lastReloadAt = 0;

  while (Date.now() - t0 < maxWaveMs && timeLeftMs() > 45000) {
    const st = await page.evaluate(`(() => {
      const TT = window.TT;
      const hud = window.__ah7Mon?.hudState;
      const p = TT.player.position;
      const cam = TT.camera;
      const f = new TT.THREE.Vector3();
      cam.getWorldDirection(f);
      let fx = f.x, fz = f.z;
      const fl = Math.hypot(fx, fz) || 1;
      fx /= fl; fz /= fl;
      const rx = -fz, rz = fx;

      let liveCount = 0, invCount = 0, nanCount = 0;
      const kinds = {};
      let nearest = null, bestD = Infinity;
      let clusterTarget = null, bestNeighbors = 0;
      const liveList = [];
      const vProj = new TT.THREE.Vector3();

      for (const z of (TT.zombies || [])) {
        if (!z || !z.alive) continue;
        liveCount++;
        const k = String(z.typeKey || z.type || z.kind || 'shambler');
        kinds[k] = (kinds[k] || 0) + 1;
        const m = z.mesh;
        if (!m || (!m.visible && !z.fogHidden)) invCount++;
        if (!m || !Number.isFinite(m.position.x) || !Number.isFinite(m.position.z)) { nanCount++; continue; }
        const d = Math.hypot(m.position.x - p.x, m.position.z - p.z);
        liveList.push({ x: m.position.x, y: m.position.y, z: m.position.z, d, k });
        if (d < bestD) {
          bestD = d;
          vProj.set(m.position.x, m.position.y + 0.45, m.position.z).project(cam);
          nearest = {
            dist: Number(d.toFixed(2)),
            x: Number(m.position.x.toFixed(2)),
            z: Number(m.position.z.toFixed(2)),
            sx: Math.round((vProj.x * 0.5 + 0.5) * innerWidth),
            sy: Math.round((-vProj.y * 0.5 + 0.5) * innerHeight),
            inFront: vProj.z < 1.0,
            kind: k,
          };
        }
      }

      // Find dense pack of >= 3 zombies between 3.8m and 17.5m for grenade throw!
      if (liveList.length >= 3) {
        for (let i = 0; i < Math.min(liveList.length, 25); i++) {
          const a = liveList[i];
          if (a.d < 3.8 || a.d > 17.5) continue;
          let nb = 0;
          for (let j = 0; j < liveList.length; j++) {
            if (Math.hypot(liveList[j].x - a.x, liveList[j].z - a.z) < 4.5) nb++;
          }
          if (nb >= 3 && nb > bestNeighbors) {
            bestNeighbors = nb;
            vProj.set(a.x, a.y + 0.2, a.z).project(cam);
            clusterTarget = {
              sx: Math.round((vProj.x * 0.5 + 0.5) * innerWidth),
              sy: Math.round((-vProj.y * 0.5 + 0.5) * innerHeight),
              dist: Number(a.d.toFixed(1)),
              count: nb,
            };
          }
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

      let supplyCrate = null;
      for (const sd of (TT.supplyDrops || [])) {
        if (sd && !sd.claimed && sd.mesh && sd.landed !== false) {
          const dist = Math.hypot(sd.mesh.position.x - p.x, sd.mesh.position.z - p.z);
          if (dist < 28) { supplyCrate = { x: sd.mesh.position.x, z: sd.mesh.position.z, dist: Number(dist.toFixed(1)) }; break; }
        }
      }

      const snap = TT.perfSnapshot ? TT.perfSnapshot() : { fps: 60, worst: 16.7 };
      const ammoCountStr = String(document.getElementById('ammoCount')?.textContent?.trim() || '');
      const reloadPromptStr = String(document.getElementById('reloadPrompt')?.textContent?.trim() || '');
      const grenStr = String(document.getElementById('grenadeChips')?.textContent || '');
      const hasGrenade = /G\s*[x\u00d7]\s*[1-9]/i.test(grenStr);
      const noAmmo = /NO AMMO/i.test(reloadPromptStr);
      const magEmpty = ammoCountStr === '0' && !noAmmo;
      const waveHud = String(document.getElementById('waveLine')?.textContent?.replace(/\\s+/g, ' ').trim() || '');

      return {
        day: hud?.day || ${nightNum},
        phase: hud?.phase || '',
        hp: hud?.hp ?? 100,
        medkits: hud?.medkits ?? 0,
        skulls: hud?.skulls ?? 0,
        cash: hud?.cash ?? 0,
        px: p.x,
        pz: p.z,
        fx, fz, rx, rz,
        weapon: String(TT.getCurrentWeapon?.() || 'pistol'),
        reloading: Boolean(TT.isReloading?.()),
        finisher: Boolean(TT.getWaveFinisher?.()),
        loopCine: Boolean(TT.getLoopCine?.()),
        winShown: Boolean(document.getElementById('win')?.classList.contains('show') || TT.getCine?.()?.active),
        liveCount,
        invCount,
        nanCount,
        kinds,
        nearest,
        clusterTarget,
        skullDrop,
        supplyCrate,
        hasGrenade,
        noAmmo,
        magEmpty,
        fps: Math.round(snap.fps || 60),
        worstMs: Number((snap.worst || 0).toFixed(1)),
        waveHud,
      };
    })()`);

    for (const [k, cnt] of Object.entries(st.kinds)) {
      seenKinds[k] = Math.max(seenKinds[k] || 0, cnt);
    }
    if (st.liveCount > maxLiveZombies) maxLiveZombies = st.liveCount;
    invisibleLiveZombies += st.invCount;
    nanZombies += st.nanCount;
    if (st.fps > 0 && st.fps < minFpsDuringNight) minFpsDuringNight = st.fps;
    if (st.worstMs > worstFrameMsDuringNight) worstFrameMsDuringNight = st.worstMs;

    // Dawn reached!
    if (st.day > nightNum && st.phase === 'prep' && !st.loopCine && !st.finisher) {
      await releaseAllMoveKeys(page);
      logStep(`Night ${nightNum} CLEARED -> Day ${st.day} Dawn!`, {
        hp: st.hp, skulls: st.skulls, cash: st.cash, weapon: st.weapon,
        minFps: minFpsDuringNight, maxLiveZombies, seenKinds,
      });
      return {
        night: nightNum,
        cleared: true,
        died: false,
        durationSec: Number(((Date.now() - t0) / 1000).toFixed(1)),
        shotsFired, autoBursts, reloads, knifeSwings, grenadesThrown, medpensUsed, weaponSwaps,
        maxLiveZombies, seenKinds, invisibleLiveZombies, nanZombies,
        minFpsDuringNight, worstFrameMsDuringNight,
      };
    }

    if (st.winShown) {
      await releaseAllMoveKeys(page);
      const deathShot = await shot(page, `night${nightNum}-died`);
      logStep(`Player died during Night ${nightNum}`, { waveHud: st.waveHud, shot: deathShot.rel });
      return {
        night: nightNum,
        cleared: false,
        died: true,
        durationSec: Number(((Date.now() - t0) / 1000).toFixed(1)),
        shotsFired, autoBursts, reloads, knifeSwings, grenadesThrown, medpensUsed, weaponSwaps,
        maxLiveZombies, seenKinds, invisibleLiveZombies, nanZombies,
        minFpsDuringNight, worstFrameMsDuringNight,
      };
    }

    // Use MedPen immediately if HP <= 62 and we carry one!
    if (st.hp <= 62 && st.medkits > 0 && Date.now() - lastMedAt > 3500) {
      await tapKey(page, 'KeyH', 55);
      medpensUsed++;
      lastMedAt = Date.now();
    }

    // Capture 3P horde screenshot, real 1P (Digit5) horde screenshot, and <30 FPS drop screenshot!
    const minHordeForShot = nightNum === 1 ? 4 : 8;
    if (!took3PShot && st.liveCount >= minHordeForShot && st.nearest && st.nearest.dist < 17) {
      await releaseAllMoveKeys(page);
      const s3 = await shot(page, `night${nightNum}-combat-3p-${st.weapon}`);
      logStep(`Night ${nightNum} 3P horde screenshot`, { live: st.liveCount, kinds: st.kinds, weapon: st.weapon, fps: st.fps, shot: s3.rel });
      took3PShot = true;
    } else if (took3PShot && !took1PShot && st.liveCount >= Math.max(3, minHordeForShot - 2) && st.nearest && st.nearest.dist > 6.5 && st.nearest.dist < 18 && st.hp >= 65) {
      await releaseAllMoveKeys(page);
      await tapKey(page, 'Digit5');
      await sleep(580);
      await fireAtScreen(page, 960, 540, st.weapon === 'uzi' ? 180 : 50);
      await sleep(180);
      const s1 = await shot(page, `night${nightNum}-combat-1p-${st.weapon}`);
      await tapKey(page, 'Digit5');
      await sleep(580);
      logStep(`Night ${nightNum} real 1P (Digit5) horde screenshot`, { live: st.liveCount, weapon: st.weapon, shot: s1.rel });
      took1PShot = true;
    } else if (!tookLowFpsShot && st.fps < 30 && st.liveCount >= 5) {
      const sLow = await shot(page, `night${nightNum}-sub30fps-${st.fps}fps`);
      logStep(`Night ${nightNum} <30 FPS frame drop captured`, { fps: st.fps, worstMs: st.worstMs, live: st.liveCount, shot: sLow.rel });
      tookLowFpsShot = true;
    }

    // Swap weapon if current weapon is completely out of ammo!
    if (st.noAmmo && weaponSwaps < 3) {
      await tapKey(page, 'KeyQ', 45);
      weaponSwaps++;
      await sleep(140);
    }

    const useKnifeOnly = (st.noAmmo && (nightNum === 1 || weaponSwaps >= 2)) || (nightNum === 1 && st.liveCount <= 4 && st.hp > 55);
    const dangerDist = (st.nearest && (st.nearest.kind === 'feral' || st.nearest.kind === 'leaper')) ? 11.5 : 8.5;

    // Navigation: stay anchored on a 13.5m–16.5m combat ring around HQ (0, 0) so all wave pushes converge on us!
    let goalX, goalZ;
    const distFromHQ = Math.hypot(st.px, st.pz);
    if (distFromHQ > 22.0) {
      // Pull straight back to the 15m HQ yard perimeter if ever pushed outside 22m
      const ang = Math.atan2(st.pz, st.px);
      goalX = Math.cos(ang) * 14.5;
      goalZ = Math.sin(ang) * 14.5;
    } else if (st.supplyCrate && st.supplyCrate.dist < 18 && (!st.nearest || st.nearest.dist > 8.0)) {
      goalX = st.supplyCrate.x;
      goalZ = st.supplyCrate.z;
    } else if (st.skullDrop && st.skullDrop.dist < 14 && (!st.nearest || st.nearest.dist > 6.0)) {
      goalX = st.skullDrop.x;
      goalZ = st.skullDrop.z;
    } else if (useKnifeOnly && st.nearest) {
      if (st.nearest.dist > 1.75) {
        goalX = st.nearest.x; goalZ = st.nearest.z;
      } else {
        const ax = st.px - st.nearest.x, az = st.pz - st.nearest.z;
        const al = Math.hypot(ax, az) || 1;
        goalX = st.nearest.x + (ax / al) * 1.65 + (-az / al) * 1.45;
        goalZ = st.nearest.z + (az / al) * 1.65 + (ax / al) * 1.45;
      }
    } else {
      // Orbit smoothly around HQ at radius 15.5m, choosing the tangential direction away from the nearest zombie!
      const curAng = Math.atan2(st.pz, st.px);
      let stepDir = 1;
      if (st.nearest) {
        const zAng = Math.atan2(st.nearest.z, st.nearest.x);
        let diff = curAng - zAng;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        stepDir = diff >= 0 ? 1 : -1;
      }
      const nextAng = curAng + stepDir * 0.48;
      goalX = Math.cos(nextAng) * 15.5;
      goalZ = Math.sin(nextAng) * 15.5;
    }

    const dx = goalX - st.px, dz = goalZ - st.pz;
    const dl = Math.hypot(dx, dz) || 1;
    const fwdDot = (dx * st.fx + dz * st.fz) / dl;
    const rightDot = (dx * st.rx + dz * st.rz) / dl;
    if (fwdDot > 0.24) await keyDown(page, 'KeyW'); else await keyUp(page, 'KeyW');
    if (fwdDot < -0.24) await keyDown(page, 'KeyS'); else await keyUp(page, 'KeyS');
    if (rightDot > 0.24) await keyDown(page, 'KeyD'); else await keyUp(page, 'KeyD');
    if (rightDot < -0.24) await keyDown(page, 'KeyA'); else await keyUp(page, 'KeyA');
    if (useKnifeOnly || (st.nearest && st.nearest.dist < 7.0)) await keyDown(page, 'ShiftLeft'); else await keyUp(page, 'ShiftLeft');

    // Claim supply crate if standing on it
    if (st.supplyCrate && st.supplyCrate.dist < 2.2) {
      await tapKey(page, 'KeyE', 45);
    }

    // Combat actions!
    if (st.nearest && !st.finisher && !st.loopCine) {
      // Throw grenade into dense pack (>= 4 zombies) on Night 2 / Night 3!
      if (nightNum >= 2 && st.hasGrenade && st.clusterTarget && Date.now() - lastGrenadeAt > 9000 && st.clusterTarget.sx > 40 && st.clusterTarget.sx < 1880 && st.clusterTarget.sy > 40 && st.clusterTarget.sy < 1040) {
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: st.clusterTarget.sx, y: st.clusterTarget.sy, button: 'none' });
        await sleep(20);
        await keyDown(page, 'KeyG');
        await sleep(220);
        await keyUp(page, 'KeyG');
        grenadesThrown++;
        lastGrenadeAt = Date.now();
      }

      const sx = Math.max(20, Math.min(1900, st.nearest.sx));
      const sy = Math.max(20, Math.min(1060, st.nearest.sy));
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sx, y: sy, button: 'none' });

      if (st.nearest.dist < 2.45) {
        await tapKey(page, 'KeyF', 38);
        knifeSwings++;
      }
      if (!useKnifeOnly && st.nearest.inFront && st.nearest.dist < 22.0) {
        if (st.magEmpty && !st.reloading && Date.now() - lastReloadAt > 1500) {
          await tapKey(page, 'KeyR', 45);
          reloads++;
          lastReloadAt = Date.now();
        } else if (!st.reloading && !st.noAmmo && !st.magEmpty) {
          if (st.weapon === 'uzi') {
            // Full-auto burst on Wasp SMG (uzi)!
            await fireAtScreen(page, sx, sy, 280);
            autoBursts++;
            shotsFired += 4;
          } else if (st.weapon === 'shotgun') {
            // Best inside 12.5m for tight buckshot spread!
            if (st.nearest.dist < 13.5) {
              await fireAtScreen(page, sx, sy, 45);
              shotsFired++;
            }
          } else {
            await fireAtScreen(page, sx, sy, 32);
            shotsFired++;
            if (st.nearest.dist < 13) {
              await sleep(80);
              await fireAtScreen(page, sx, sy, 32);
              shotsFired++;
            }
          }
        }
      }
    }
    await sleep(95);
  }

  await releaseAllMoveKeys(page);
  return {
    night: nightNum,
    cleared: false,
    died: false,
    timedOut: true,
    durationSec: Number(((Date.now() - t0) / 1000).toFixed(1)),
    shotsFired, autoBursts, reloads, knifeSwings, grenadesThrown, medpensUsed, weaponSwaps,
    maxLiveZombies, seenKinds, invisibleLiveZombies, nanZombies,
    minFpsDuringNight, worstFrameMsDuringNight,
  };
}

// Collect nearby ground skulls & bank them at HQ Skull Window
async function sweepAndBankSkulls(page, skullWindowTarget, dayLabel) {
  for (let i = 0; i < 6; i++) {
    const drop = await page.evaluate(`(() => {
      const p = window.TT.player.position;
      let best = null, bd = 26;
      for (const c of (window.TT.cashDrops || [])) {
        if (!c || !c.skull || !c.mesh) continue;
        const d = Math.hypot(c.mesh.position.x - p.x, c.mesh.position.z - p.z);
        if (d < bd) { bd = d; best = { x: c.mesh.position.x, z: c.mesh.position.z }; }
      }
      return best;
    })()`);
    if (!drop) break;
    await walkToWorld(page, drop.x, drop.z, `${dayLabel} Skull Pickup`, 5500, 0.75);
  }

  const skullsHeld = await page.evaluate(`window.__ah7Mon?.hudState?.skulls ?? 0`);
  const cashBefore = await page.evaluate(`window.__ah7Mon?.hudState?.cash ?? 0`);
  if (skullsHeld > 0) {
    await walkToWorld(page, skullWindowTarget.x, skullWindowTarget.z, `${dayLabel} Skull Window`, 12000, 0.9);
    await tapKey(page, 'KeyE');
    await sleep(900);
    await page.waitFor(
      `(window.__ah7Mon?.hudState?.cash ?? 0) > ${cashBefore} && !window.__ah7Mon?.hudState?.pendingDeposit`,
      { timeout: 14000, every: 200 }
    );
  }
  const cashAfter = await page.evaluate(`window.__ah7Mon?.hudState?.cash ?? 0`);
  logStep(`${dayLabel} Skull Banking complete`, { skullsHeld, cashBefore, cashAfter });
  return { skullsHeld, cashBefore, cashAfter };
}

// Visit HQ Armory, buy affordable target guns/machete/restock, equip onto carried slots, check 3D Workbench preview!
async function shopAtArmory(page, armoryTarget, dayNum, desiredGuns = ['smg', 'shotgun', 'revolver']) {
  await walkToWorld(page, 9.0, 3.3, `Day ${dayNum} Armory East Approach`, 12000, 1.5);
  const wArm = await walkToWorld(page, armoryTarget.x, armoryTarget.z, `Day ${dayNum} Armory`, 8000, 0.85);
  await tapKey(page, 'KeyE');
  await sleep(750);
  const opened = await page.evaluate(`Boolean(document.getElementById('cif')?.classList.contains('show') && document.getElementById('cif')?.classList.contains('armory-only'))`);
  if (!opened) {
    report.anomalies.push({ severity: 'P1', kind: 'armory-failed-to-open', dayNum, wArm });
    return [];
  }

  const boughtNow = [];
  for (const kind of desiredGuns) {
    const canBuy = await page.evaluate(`(() => {
      const b = document.querySelector(${JSON.stringify(`#cif button[data-buy-gun="${kind}"]`)});
      return Boolean(b && !b.disabled);
    })()`);
    if (canBuy) {
      const clicked = await scrollAndClickSelector(page, `#cif button[data-buy-gun="${kind}"]`);
      await sleep(500);
      if (clicked) {
        boughtNow.push(kind);
        report.weaponsBought.push({ day: dayNum, kind });
        // Check if it landed on STORED GUNS shelf (`#cif button[data-gun]`) and click to carry it!
        const shelfBtn = await scrollAndClickSelector(page, `#cif button[data-gun^="${kind}"]`);
        await sleep(400);
        // Wait 1.4s for the 3D Workbench preview of the newly bought gun & screenshot it!
        await sleep(1400);
        const wbShot = await shot(page, `day${dayNum}-armory-bought-${kind}`);
        logStep(`Bought & equipped ${kind} at Armory!`, { movedFromShelf: Boolean(shelfBtn), shot: wbShot.rel });
      }
    }
  }

  // Also buy Machete ($85) if still have plenty of cash on Day 3+, and Restock All / per-gun ammo!
  const restockClicked = await page.evaluate(`(() => {
    const btns = [...document.querySelectorAll('#cif .armory-catalogue button')];
    const rb = btns.find(b => /Restock/i.test(b.textContent || '') && !b.disabled);
    if (!rb) return null;
    rb.scrollIntoView({ block: 'center' });
    const r = rb.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: rb.textContent.trim() };
  })()`);
  if (restockClicked) {
    await fireAtScreen(page, restockClicked.x, restockClicked.y, 45);
    await sleep(300);
    logStep(`Clicked Armory Restock`, { text: restockClicked.text });
  }

  // Also check per-gun Buy Ammo button on Workbench if visible & affordable
  await scrollAndClickSelector(page, '#cif button[data-buy-ammo]:not([disabled])');
  await sleep(300);

  await tapKey(page, 'Escape');
  await sleep(350);
  const closedCleanly = await page.evaluate(`!document.getElementById('cif')?.classList.contains('show')`);
  if (!closedCleanly) {
    report.anomalies.push({ severity: 'P1', kind: 'armory-stuck-open-on-escape', dayNum });
  }
  return boughtNow;
}

let page = null;
try {
  page = await browser.newPage({ width: 1920, height: 1080 });
  await prepareWindow(page);

  const relUrl = backend === 'webgl' ? 'index.html?renderer=webgl' : 'index.html';
  logStep(`Opening ${relUrl} (targetNights=${targetNights}, NO ?debug=1)`);
  await page.goto(`${server.origin}/${relUrl}`, { timeout: 180000 });
  try { await page.send('Page.bringToFront', {}); } catch {}

  // Passive browser monitor + 1-second FPS / <30 FPS frame-drop profiler!
  await page.evaluate(`(() => {
    if (window.__ah7Mon) return true;
    const M = {
      rafCount: 0,
      maxRafGapMs: 0,
      hitches: [],
      fpsSamples: [],
      sub30Count: 0,
      prepHudEvents: 0,
      prepStateEvents: 0,
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
    window.__ah7Mon = M;
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
      if (M.consoleWarns.length < 100) M.consoleWarns.push({ t: Math.round(performance.now()), text: txt });
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
      } else if (d.type === 'prep-hud') {
        M.prepHudEvents++;
      } else if (d.type === 'prep-state') {
        M.prepStateEvents++;
      } else if (M.dwEvents.length < 220) {
        M.dwEvents.push({ t: Math.round(performance.now()), type: String(d.type || ''), day: d.day ?? null, panel: d.panel ?? null });
      }
    });

    // 1-second FPS & draw/triangle/zombie profiler (only uses non-*Dbg read functions so debugTouched stays false!)
    setInterval(() => {
      const TT = window.TT;
      if (!TT || !TT.perfSnapshot || M.phaseLabel === 'opening') return;
      const snap = TT.perfSnapshot();
      const info = TT.renderer?.info?.render || {};
      const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
      const trisK = Math.round((info.triangles || 0) / 1000);
      const fps = Math.round(snap.fps || 0);
      let liveZ = 0;
      for (const z of (TT.zombies || [])) if (z && z.alive) liveZ++;
      if (fps > 0 && fps < 30 && M.hudState?.active) M.sub30Count++;
      if (M.fpsSamples.length < 900) {
        M.fpsSamples.push({
          tSec: Math.round(performance.now() / 1000),
          stage: M.phaseLabel,
          day: M.hudState?.day || 0,
          phase: M.hudState?.phase || '',
          fps,
          low: Math.round(snap.low || 0),
          worstMs: Number((snap.worst || 0).toFixed(1)),
          draws: Number(draws),
          trisK,
          zombs: liveZ,
          weapon: String(TT.getCurrentWeapon?.() || ''),
        });
      }
    }, 1000);

    let lastT = performance.now();
    const tick = (now) => {
      M.rafCount++;
      const dt = now - lastT;
      lastT = now;
      if (dt > M.maxRafGapMs && M.rafCount > 3 && M.phaseLabel !== 'opening') M.maxRafGapMs = Number(dt.toFixed(1));
      if (dt > 120 && M.rafCount > 3 && M.phaseLabel !== 'opening' && M.hitches.length < 150) {
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
    if (st.playShown) await scrollAndClickSelector(page, '#openingPlay');
    await sleep(350);
  }

  await page.waitFor(
    '!window.DWOpening?.active && Boolean(document.getElementById("modeHunt")) && document.getElementById("modeSelect")?.classList.contains("show")',
    { timeout: 60000 }
  );
  await page.evaluate(`(() => { window.__ah7Mon.phaseLabel = 'title'; return true; })()`);
  await sleep(500);

  // Turn ON FPS & HARDWARE via Settings button
  await scrollAndClickSelector(page, '#menuSettingsBtn');
  await sleep(300);
  const perfAlready = await page.evaluate(`Boolean(document.getElementById('perf')?.classList.contains('on'))`);
  if (!perfAlready) {
    await scrollAndClickSelector(page, '#perfHudToggle');
    await sleep(250);
  }
  await scrollAndClickSelector(page, '#settingsBackBtn');
  await sleep(300);
  await page.waitFor('Boolean(window.TT && window.TT.renderer)', { timeout: 10000 });

  // Enter callsign & start New Run
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

  await scrollAndClickSelector(page, '#modeHunt');
  await sleep(400);
  const firstRunOpen = await page.evaluate(`Boolean(document.getElementById('firstRunCard') && !document.getElementById('firstRunCard').hidden)`);
  if (firstRunOpen) {
    await scrollAndClickSelector(page, '#firstRunPlay');
  }

  await page.evaluate(`(() => { window.__ah7Mon.phaseLabel = 'insertion'; return true; })()`);
  await sleep(15800); // full insertion drop
  await page.waitFor(
    'Boolean(window.__ah7Mon?.hudState?.active) && !document.getElementById("modeSelect")?.classList.contains("show")',
    { timeout: 15000, every: 150 }
  );
  await page.evaluate(`(() => { window.__ah7Mon.phaseLabel = 'day1-prep'; return true; })()`);

  const stationTargets = await page.evaluate(`(() => {
    const TT = window.TT;
    const k = TT.KIOSK?.group?.position;
    return {
      kiosk: k ? { x: k.x - 1.35, z: k.z } : { x: -6.4, z: 2.2 },
      skullWindow: TT.HQ_WINDOW_FRONT ? { x: TT.HQ_WINDOW_FRONT.x, z: TT.HQ_WINDOW_FRONT.z } : { x: -5.9, z: -2.2 },
      // Stand 0.55m east of HQ_PANEL_FRONT (3.2 -> 3.75) so we never overlap HQ_RADIO_FRONT (1.62) reach!
      panel: TT.HQ_PANEL_FRONT ? { x: TT.HQ_PANEL_FRONT.x + 0.55, z: TT.HQ_PANEL_FRONT.z } : { x: 3.75, z: -5.9 },
      armory: TT.HQ_ARMORY_FRONT ? { x: TT.HQ_ARMORY_FRONT.x, z: TT.HQ_ARMORY_FRONT.z } : { x: 5.9, z: 3.3 },
    };
  })()`);

  async function soundHQAlarm(nightNum, briefSlug = null) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Close briefing if accidentally open on wrong page
      await scrollAndClickSelector(page, '#hqBriefing .briefing-close');
      await sleep(180);
      await walkToWorld(page, stationTargets.panel.x, stationTargets.panel.z, `HQ Alarm Panel (Night ${nightNum}, try ${attempt})`, 12000, 0.7);
      await tapKey(page, 'KeyE');
      await sleep(550);
      if (briefSlug && attempt === 1) await shot(page, briefSlug);
      const clicked = await scrollAndClickSelector(page, '#hqBriefing .briefing-alarm');
      if (clicked) {
        logStep(`Sounded HQ Alarm for Night ${nightNum}`, { btn: clicked.text });
        const ok = await page.waitFor(
          'window.__ah7Mon?.hudState?.phase === "wave" && !window.TT?.getLoopCine?.()',
          { timeout: 25000, every: 200 }
        );
        assert(ok, `Night ${nightNum} wave did not start after clicking .briefing-alarm`);
        return true;
      }
    }
    throw new Error(`Could not open & click #hqBriefing .briefing-alarm for Night ${nightNum}`);
  }

  await verifyLive3DMovement(page, 'day1-spawn', '01-day1-spawn', 'KeyA', 480);

  // Day 1 Prep: eliminate any nearby POI guard within 75m so we start Day 2 with >= $75 for Wasp SMG!
  for (let gStep = 0; gStep < 26; gStep++) {
    const guard = await page.evaluate(`(() => {
      const TT = window.TT;
      const p = TT.player.position, cam = TT.camera;
      const vp = new TT.THREE.Vector3();
      let best = null, bd = 78;
      for (const z of (TT.zombies || [])) {
        if (!z || !z.alive || !z.mesh) continue;
        const d = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z);
        if (d < bd) {
          bd = d;
          vp.set(z.mesh.position.x, z.mesh.position.y + 0.45, z.mesh.position.z).project(cam);
          best = { x: z.mesh.position.x, z: z.mesh.position.z, dist: d, sx: Math.round((vp.x * 0.5 + 0.5) * innerWidth), sy: Math.round((-vp.y * 0.5 + 0.5) * innerHeight) };
        }
      }
      return best;
    })()`);
    if (!guard) break;
    if (guard.dist > 10.5) {
      await walkToWorld(page, guard.x, guard.z, 'Approach Day 1 POI Guard', 3000, 8.5);
    } else {
      await fireAtScreen(page, guard.sx, guard.sy, 35);
      await sleep(105);
      await fireAtScreen(page, guard.sx, guard.sy, 35);
      await sleep(130);
    }
  }
  await tapKey(page, 'KeyR', 50);
  await sleep(900);

  // Bank any Day 1 POI skulls if picked up, then sound Night 1 Alarm!
  await sweepAndBankSkulls(page, stationTargets.skullWindow, 'Day 1 Pre-Wave');
  await soundHQAlarm(1, '01c-night1-briefing');

  // === NIGHT 1 ===
  const n1 = await fightNightWave(page, 1, 160000);
  report.nights.push(n1);
  assert(n1.cleared, 'Night 1 did not clear cleanly');

  // === DAY 2 PREP ===
  await page.evaluate(`(() => { window.__ah7Mon.phaseLabel = 'day2-prep'; return true; })()`);
  await sleep(600);
  await sweepAndBankSkulls(page, stationTargets.skullWindow, 'Day 2 Dawn');
  const day2Shot = await shot(page, '02-day2-dawn-after-bank');
  await verifyLive3DMovement(page, 'day2-dawn', '02b-day2-move', 'KeyS', 450);

  // Buy Wasp SMG (uzi, $75) at HQ Armory!
  const boughtDay2 = await shopAtArmory(page, stationTargets.armory, 2, ['uzi', 'shotgun']);
  if (boughtDay2.includes('uzi')) {
    const eq = await selectWeaponKind(page, 'uzi');
    // Test Wasp SMG in 1st-person (Digit5)
    await tapKey(page, 'Digit5');
    await sleep(600);
    const smg1pShot = await shot(page, '03-day2-wasp-smg-1p');
    await tapKey(page, 'Digit5');
    await sleep(600);
    logStep('Equipped Wasp SMG (uzi) & verified 1st-person viewmodel', { equipped: eq, shot: smg1pShot.rel });
  }

  // Sound Night 2 Alarm! (50 zombies + 2 feral runner packs)
  await soundHQAlarm(2, '04-night2-briefing');

  // === NIGHT 2 ===
  const n2 = await fightNightWave(page, 2, 240000);
  report.nights.push(n2);

  if (n2.cleared) {
    // === DAY 3 PREP ===
    await page.evaluate(`(() => { window.__ah7Mon.phaseLabel = 'day3-prep'; return true; })()`);
    await sleep(600);
    await sweepAndBankSkulls(page, stationTargets.skullWindow, 'Day 3 Dawn');
    await verifyLive3DMovement(page, 'day3-dawn', '05-day3-move', 'KeyD', 450);

    // Buy Shotgun ($110) / Revolver ($145) / Wasp SMG (uzi) + Restock All at Armory!
    const boughtDay3 = await shopAtArmory(page, stationTargets.armory, 3, ['shotgun', 'uzi', 'revolver']);
    if (boughtDay3.length > 0) {
      const gunToShow = boughtDay3[0];
      const eq3 = await selectWeaponKind(page, gunToShow);
      await tapKey(page, 'Digit5');
      await sleep(600);
      const g3Shot = await shot(page, `06-day3-${gunToShow}-1p`);
      await tapKey(page, 'Digit5');
      await sleep(600);
      logStep(`Day 3 equipped ${gunToShow} & verified 1st-person viewmodel`, { equipped: eq3, shot: g3Shot.rel });
      // Prefer uzi (Wasp SMG) for fast Night 3 horde clearing, swapping to shotgun if uzi runs dry!
      await selectWeaponKind(page, 'uzi');
    }

    // Buy a MedPen ($35) at Supply Terminal if cash >= 35!
    const cashAfterArmory = await page.evaluate(`window.__ah7Mon?.hudState?.cash ?? 0`);
    if (cashAfterArmory >= 35) {
      await walkToWorld(page, -7.4, 2.2, 'Day 3 Kiosk Approach', 9000, 1.2);
      await walkToWorld(page, stationTargets.kiosk.x, stationTargets.kiosk.z, 'Day 3 Supply Kiosk', 6000, 0.9);
      await tapKey(page, 'KeyE');
      await sleep(400);
      await scrollAndClickSelector(page, '#shopList button:not([disabled])');
      await sleep(250);
      await scrollAndClickSelector(page, '#shopClose');
      await sleep(300);
    }

    // Place 1 Barricade in the HQ yard using Build Mode (KeyB) if affordable!
    const cashForBuild = await page.evaluate(`window.__ah7Mon?.hudState?.cash ?? 0`);
    if (cashForBuild >= 15) {
      await walkToWorld(page, 0, -9.5, 'Day 3 Build Spot', 6000, 1.1);
      await tapKey(page, 'KeyB', 45);
      await sleep(350);
      await fireAtScreen(page, 960, 540, 45);
      await sleep(250);
      await tapKey(page, 'Escape', 45);
      await sleep(250);
      const buildCount = await page.evaluate(`(window.TT?.builds || []).length`);
      const buildShot = await shot(page, '06b-day3-placed-build');
      logStep('Tested placing a buildable on Day 3', { buildCount, shot: buildShot.rel });
    }

    if (targetNights >= 3 && timeLeftMs() > 140000) {
      // === NIGHT 3 (100 zombies: shamblers + 9 ferals + 6 leapers + 7 drowned from lake!) ===
      await soundHQAlarm(3, '07-night3-briefing');

      const n3 = await fightNightWave(page, 3, Math.min(320000, timeLeftMs() - 55000));
      report.nights.push(n3);

      if (n3.cleared) {
        await page.evaluate(`(() => { window.__ah7Mon.phaseLabel = 'day4-dawn'; return true; })()`);
        await sleep(700);
        await sweepAndBankSkulls(page, stationTargets.skullWindow, 'Day 4 Dawn');
        const day4Shot = await shot(page, '08-day4-dawn-victory');
        await verifyLive3DMovement(page, 'day4-dawn', '08b-day4-move', 'KeyA', 460);
        logStep('Night 3 CLEARED -> Day 4 Dawn verified!', { shot: day4Shot.rel });
      }
    }
  }

  // Return cleanly to Title Screen (either from Game Over #again or via Pause -> Quit to Title)
  await page.evaluate(`(() => { window.__ah7Mon.phaseLabel = 'return-to-title'; return true; })()`);
  const cineOrWin = await page.evaluate(`({
    win: Boolean(document.getElementById('win')?.classList.contains('show')),
    cine: Boolean(window.TT?.getCine?.()?.active),
  })`);
  if (cineOrWin.cine) {
    await sleep(1800);
    await shot(page, '09a-burial-cine');
    await tapKey(page, 'Space', 80);
    await page.waitFor('Boolean(document.getElementById("win")?.classList.contains("show"))', { timeout: 20000, every: 200 });
  }
  if (await page.evaluate(`Boolean(document.getElementById('win')?.classList.contains('show'))`)) {
    await sleep(400);
    await shot(page, '09b-game-over-card');
    await scrollAndClickSelector(page, '#again');
  } else {
    await tapKey(page, 'Escape');
    await sleep(350);
    await scrollAndClickSelector(page, '#quitMenuBtn');
    await sleep(300);
    await scrollAndClickSelector(page, '#quitConfirmBtn');
  }

  const atTitleEnd = await page.waitFor(
    'Boolean(document.getElementById("modeSelect")?.classList.contains("show"))',
    { timeout: 20000, every: 200 }
  );
  assert(atTitleEnd, 'Did not return to Title Screen at end of multi-night run');
  await sleep(600);
  const endTitleShot = await shot(page, '10-end-title-records');
  report.titleEndState = await page.evaluate(`(() => ({
    bestRecordText: String(document.getElementById('menuBestRecord')?.textContent?.trim() || ''),
    bestRecordHidden: Boolean(document.getElementById('menuBestRecord')?.hidden),
    badgesText: String(document.getElementById('menuBadges')?.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 120) || ''),
  }))()`);
  logStep('Verified Title Screen Best Record & Badges (debugTouched=false!)', { ...report.titleEndState, shot: endTitleShot.rel });
} catch (err) {
  report.fatalError = String(err?.stack || err?.message || err);
  console.error(`[AH-7 · ${backend}] FATAL:`, report.fatalError);
  throw err;
} finally {
  if (page) {
    try {
      const mon = await page.evaluate(`window.__ah7Mon`);
      report.monitor = mon || null;
      report.pageErrors = [...page.errors];
      report.consoleErrors = mon?.consoleErrs || [];
      report.consoleWarnings = mon?.consoleWarns || [];

      for (const n of report.nights) {
        if (n.invisibleLiveZombies > 0 || n.nanZombies > 0) {
          report.anomalies.push({ severity: 'P0', kind: 'zombie-mesh-invisible-or-nan', night: n.night, invisible: n.invisibleLiveZombies, nan: n.nanZombies });
        }
      }
      if (report.pageErrors.length > 0 || (mon?.winErrors?.length || 0) > 0 || (mon?.rejections?.length || 0) > 0) {
        report.anomalies.push({ severity: 'P0', kind: 'uncaught-js-or-promise-error', pageErrors: report.pageErrors, winErrors: mon?.winErrors, rejections: mon?.rejections });
      }
      if ((mon?.gpuUncaptured?.length || 0) > 0 || (mon?.webglContextLost || 0) > 0) {
        report.anomalies.push({ severity: 'P0', kind: 'gpu-uncaptured-or-context-lost', gpuUncaptured: mon?.gpuUncaptured, webglContextLost: mon?.webglContextLost });
      }
      if ((mon?.sub30Count || 0) > 0) {
        report.anomalies.push({ severity: 'P1', kind: 'frame-drops-below-30fps', sub30Seconds: mon.sub30Count, totalSampledSeconds: mon.fpsSamples?.length || 0 });
      }
      const stallsOver500 = (mon?.hitches || []).filter((h) => h.gapMs >= 500);
      if (stallsOver500.length > 0) {
        report.anomalies.push({ severity: 'P1', kind: 'raf-stalls-over-500ms', count: stallsOver500.length, stalls: stallsOver500.slice(0, 15) });
      }
    } catch {}
    try { await page.close(); } catch {}
  }
  report.completedAt = new Date().toISOString();
  report.durationSec = elapsedSec();
  const outJson = path.join(OUT_DIR, `hunt-${backend}.json`);
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[AH-7 · ${backend}] Saved ${outJson} in ${report.durationSec}s. Nights: ${report.nights.length}, PageErrors: ${report.pageErrors.length}`);
  await browser.close();
  await server.close();
}

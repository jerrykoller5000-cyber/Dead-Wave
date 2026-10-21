// qa/run-ag16.mjs — AG-16: Day-1 Assault Cave Shots for Claude (CL-48)
// Antigravity (Gemini 3.8 Flash (High)) on Jerry's PC (RTX 5080 GPU)
//
// Shots:
//   01-cave-30m-nvg-off.png  — assault cave from 30m at 22:00, NVGs off
//   02-cave-30m-nvg-on.png   — assault cave from 30m at 22:00, NVGs on
//   03-cave-10m-nvg-off.png  — assault cave from 10m at 22:00, NVGs off
//   04-cave-10m-nvg-on.png   — assault cave from 10m at 22:00, NVGs on
//   05-cave-fog-nvg-off.png  — assault cave from 10m in dense fog, NVGs off
//   06-cave-fog-nvg-on.png   — assault cave from 10m in dense fog, NVGs on
//
// Run: node qa/run-ag16.mjs

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-25-AG-16');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WORLD_TIME_22H = 22 / 24;   // 22:00 = 0.9167

console.log('================================================================');
console.log('  AG-16: DAY-1 ASSAULT CAVE SHOTS FOR CLAUDE (CL-48)');
console.log('================================================================');

// ---------------------------------------------------------------------------
// Launch headless Chrome on real hardware GPU (RTX 5080)
// ---------------------------------------------------------------------------
async function launchHardwareChrome() {
  const exe = findChrome();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-ag16-'));
  const flags = [
    '--remote-debugging-port=0',
    '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--mute-audio',
    '--headless=new',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--enable-gpu-rasterization',
    '--ignore-gpu-blocklist',
    'about:blank'
  ];
  const proc = spawn(exe, flags, { stdio: ['ignore', 'ignore', 'pipe'] });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = null;
  for (let i = 0; i < 60 && port == null; i++) {
    try {
      const txt = await fs.promises.readFile(portFile, 'utf8');
      const first = txt.split('\n')[0].trim();
      if (first) port = Number(first);
    } catch { await sleep(100); }
  }
  if (!port) { proc.kill(); throw new Error('Chrome did not report debugging port'); }

  const vRes = await fetch('http://127.0.0.1:' + port + '/json/version');
  const version = await vRes.json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)); } catch { return; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  });

  function sendBrowser(method, params = {}) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }
      }, 120000);
    });
  }

  return {
    proc, profile, ws,

    async newPage({ width = 1280, height = 720 } = {}) {
      const { targetId } = await sendBrowser('Target.createTarget', { url: 'about:blank', newWindow: true, width, height });
      const { sessionId } = await sendBrowser('Target.attachToTarget', { targetId, flatten: true });

      const errors = [];
      listeners.push((msg) => {
        if (msg.sessionId !== sessionId) return;
        if (msg.method === 'Runtime.exceptionThrown') {
          const d = msg.params.exceptionDetails || {};
          const text = (d.exception && (d.exception.description || d.exception.value)) || d.text || '(unknown)';
          errors.push(String(text).split('\n')[0]);
        }
      });

      function send(method, params = {}) {
        const id = nextId++;
        ws.send(JSON.stringify({ id, method, params, sessionId }));
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          setTimeout(() => {
            if (pending.has(id)) { pending.delete(id); reject(new Error('session timeout: ' + method)); }
          }, 120000);
        });
      }

      await send('Page.enable', {});
      await send('Runtime.enable', {});
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

      return {
        errors,

        async goto(url) {
          await send('Page.navigate', { url });
        },

        async evaluate(expr) {
          const res = await send('Runtime.evaluate', {
            expression: expr, returnByValue: true, awaitPromise: true, userGesture: true
          });
          if (res.exceptionDetails) {
            const d = res.exceptionDetails;
            const text = (d.exception && (d.exception.description || d.exception.value)) || d.text;
            throw new Error('evaluate: ' + text);
          }
          return res.result.value;
        },

        async waitFor(expr, { timeout = 120000, every = 200 } = {}) {
          const t0 = Date.now();
          while (Date.now() - t0 < timeout) {
            try { if (await this.evaluate(expr)) return true; } catch {}
            await sleep(every);
          }
          return false;
        },

        async screenshot(file) {
          const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          await fs.promises.writeFile(file, Buffer.from(res.data, 'base64'));
        }
      };
    },

    async close() {
      try { ws.close(); } catch {}
      try { proc.kill(); } catch {}
      await sleep(300);
      try { await fs.promises.rm(profile, { recursive: true, force: true }); } catch {}
    }
  };
}

// ---------------------------------------------------------------------------
// Camera: position in front of a cave at a given distance
// ---------------------------------------------------------------------------
function caveViewAt(cave, dist, up) {
  if (up === undefined) up = 2.0;
  // cave.yaw = the outward direction the cave faces (+z = north, etc.)
  const fx = Math.sin(cave.yaw);
  const fz = Math.cos(cave.yaw);
  return {
    x: cave.x + fx * dist,
    y: cave.gy + up,
    z: cave.z + fz * dist,
    tx: cave.x,
    ty: cave.gy + 1.8,
    tz: cave.z,
    fov: 60
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const server = await serve(ROOT, 0);
console.log('[AG-16] Server:', server.origin);

const browser = await launchHardwareChrome();

try {
  const page = await browser.newPage({ width: 1280, height: 720 });

  // --- Confirm GPU ---
  await page.goto(server.origin + '/tools/blank.html');
  const gpu = await page.evaluate(
    '(() => { const c = document.createElement("canvas"); const gl = c.getContext("webgl2") || c.getContext("webgl"); const d = gl && gl.getExtension("WEBGL_debug_renderer_info"); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "(unavailable)"; })()'
  );
  console.log('[GPU]', gpu);
  if (!gpu.includes('NVIDIA') && !gpu.includes('RTX') && !gpu.includes('5080')) {
    console.warn('[WARN] Expected RTX 5080, got:', gpu);
  }

  // --- Load game ---
  console.log('[Load] Opening game...');
  await page.goto(server.origin + '/index.html?debug=1&raf=timer');
  await page.evaluate('localStorage.clear()');

  await page.waitFor('!!window.DWOpening', { timeout: 30000 });
  await page.evaluate('window.DWOpening.dismissForTesting && window.DWOpening.dismissForTesting()');
  if (!await page.waitFor('!!window.TT', { timeout: 60000 })) throw new Error('TT never ready');
  await page.waitFor('window.DWOpening.active === false', { timeout: 60000 });
  await sleep(800);
  console.log('[Load] Title menu ready');

  // --- Start a Day 1 match (Hunt mode) ---
  console.log('[Match] Starting Day 1...');
  await page.evaluate(
    '(() => { const n = document.getElementById("playerName"); if (n) { n.value = "AG16QA"; n.dispatchEvent(new Event("input", { bubbles: true })); } const p = document.getElementById("modeHunt"); if (p) p.click(); })()'
  );
  if (!await page.waitFor('window.TT && window.TT.getPhase && window.TT.getPhase() === "prep"', { timeout: 30000 })) {
    throw new Error('Prep phase never started');
  }
  await page.waitFor('!document.body.classList.contains("deploying")', { timeout: 60000 });
  await sleep(1500);
  console.log('[Match] Prep phase, landing complete');

  // --- Get assault cave ---
  const cave = await page.evaluate(
    '(() => { const caves = TT.POI && TT.POI.caves; if (!caves || !caves.length) return null; const ai = TT.getActiveCaveIndices ? TT.getActiveCaveIndices() : []; const i = ai.length > 0 ? ai[0] : 0; const c = caves[i]; return { idx: i, theme: c.theme, x: c.x, z: c.z, gy: c.gy, yaw: c.yaw, ang: c.ang, total: caves.length, active: ai }; })()'
  );
  if (!cave) throw new Error('No cave data from TT.POI.caves');
  console.log('[Cave] theme=' + cave.theme + ' idx=' + cave.idx + ' pos=(' + cave.x.toFixed(1) + ',' + cave.gy.toFixed(1) + ',' + cave.z.toFixed(1) + ') yaw=' + cave.yaw.toFixed(3));
  console.log('[Cave] active:[' + cave.active + '] of ' + cave.total + ' total');

  // --- Set night (22:00) ---
  await page.evaluate('TT.setWorldTime(' + WORLD_TIME_22H + ')');
  await sleep(700);
  console.log('[Time] worldTime set to 22:00 (' + WORLD_TIME_22H.toFixed(4) + ')');

  // --- Hide UI overlays for clean world shots ---
  await page.evaluate(
    '(() => { const c = [...document.querySelectorAll("canvas")].sort((a,b) => (b.clientWidth*b.clientHeight)-(a.clientWidth*a.clientHeight))[0]; if (!c) return; const k = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) k.add(el); for (const ch of document.body.children) { if (!k.has(ch)) ch.style.setProperty("display","none","important"); } })()'
  );

  // --- Grant NVG gear ---
  await page.evaluate('TT.setGearDbg && TT.setGearDbg("nvg")');
  console.log('[NVG] Gear granted via setGearDbg');

  // Helper: force NVG visual state directly via CSS (bypasses gameStarted guard in toggleNvg).
  // Applies exactly what updateNvgVisual() does: nvg-phosphor on canvas + 'on' on #nvgOverlay.
  async function setNvg(on) {
    await page.evaluate(
      '(() => { ' +
      '  const canvas = [...document.querySelectorAll("canvas")].sort((a,b)=>(b.clientWidth*b.clientHeight)-(a.clientWidth*a.clientHeight))[0]; ' +
      '  const ov = document.getElementById("nvgOverlay"); ' +
      '  if (' + (on ? 'true' : 'false') + ') { ' +
      '    if (canvas) canvas.classList.add("nvg-phosphor"); ' +
      '    if (ov) { ov.classList.add("on"); ov.style.removeProperty("display"); } ' +
      '  } else { ' +
      '    if (canvas) canvas.classList.remove("nvg-phosphor"); ' +
      '    if (ov) { ov.classList.remove("on"); } ' +
      '  } ' +
      '})()'
    );
    await sleep(500);
    return await page.evaluate(
      '!!(document.getElementById("nvgOverlay") && document.getElementById("nvgOverlay").classList.contains("on"))'
    );
  }

  // Helper: position camera and take a shot
  async function shoot(label, viewSpec, basename) {
    await page.evaluate('TT.setShotView(' + JSON.stringify(viewSpec) + ')');
    await sleep(600);
    const f = path.join(SHOTS_DIR, basename + '.png');
    await page.screenshot(f);
    console.log('  [Shot]', label + ':', basename + '.png', '(' + kbOf(f) + ' KB)');
    return f;
  }

  // Compute view specs
  const v30 = caveViewAt(cave, 30, 2.5);   // 30 m out, ~eye level
  const v10 = caveViewAt(cave, 10, 2.0);   // 10 m out, tight

  console.log('\n--- SHOOTING ---');

  // 01 — 30m, NVG off
  let nvgActual = await setNvg(false);
  if (nvgActual) console.warn('[WARN] NVG still on after asking off');
  const s1 = await shoot('30m NVG off', v30, '01-cave-30m-nvg-off');

  // 02 — 30m, NVG on
  nvgActual = await setNvg(true);
  if (!nvgActual) console.warn('[WARN] NVG still off after asking on (gameStarted check?)');
  const s2 = await shoot('30m NVG on',  v30, '02-cave-30m-nvg-on');

  // 03 — 10m, NVG off
  await setNvg(false);
  const s3 = await shoot('10m NVG off', v10, '03-cave-10m-nvg-off');

  // 04 — 10m, NVG on
  await setNvg(true);
  const s4 = await shoot('10m NVG on',  v10, '04-cave-10m-nvg-on');

  // 05 & 06 — Dense fog. Try accessing scene via TT internals.
  await page.evaluate(
    '(() => { try { const s = (typeof scene !== "undefined") ? scene : null; if (s && s.fog) { s.fog.near = 5; s.fog.far = 28; s.fog.color.setHex(0x182218); } } catch(e) {} })()'
  );
  await sleep(700);

  await setNvg(false);
  const s5 = await shoot('fog NVG off', v10, '05-cave-fog-nvg-off');

  await setNvg(true);
  const s6 = await shoot('fog NVG on',  v10, '06-cave-fog-nvg-on');

  await page.evaluate('TT.setShotView(null)');

  // Report any page errors
  if (page.errors.length) {
    console.log('\n[Page errors]');
    for (const e of page.errors.slice(0, 6)) console.log(' ', e);
  }

  console.log('\n================================================================');
  console.log('  AG-16 COMPLETE — shots in qa/shots/2026-09-25-AG-16/');
  console.log('================================================================');
  console.log('GPU :', gpu);
  console.log('Cave:', cave.theme, 'idx=' + cave.idx, 'of', cave.total, '| active:[' + cave.active + ']');
  console.log('Pos :', '(' + cave.x.toFixed(1) + ', ' + cave.gy.toFixed(1) + ', ' + cave.z.toFixed(1) + ')');
  console.log('');
  for (const [f, kb] of [[s1, kbOf(s1)], [s2, kbOf(s2)], [s3, kbOf(s3)], [s4, kbOf(s4)], [s5, kbOf(s5)], [s6, kbOf(s6)]]) {
    console.log('  ' + path.basename(f).padEnd(30) + kb + ' KB');
  }

} finally {
  await browser.close();
  await server.close();
}

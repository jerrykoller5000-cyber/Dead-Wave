// qa/probe-flamer-finisher.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-25-AG-15');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const origin = server.origin;

const exe = findChrome();
const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-probe-'));
const flags = [
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
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

const vRes = await fetch(`http://127.0.0.1:${port}/json/version`);
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
    if (msg.error) reject(new Error(msg.error.message + ' (' + JSON.stringify(msg.error.data ?? '') + ')'));
    else resolve(msg.result);
  } else if (msg.method) {
    for (const fn of listeners) fn(msg);
  }
});

function sendBrowser(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout: ' + method)); } }, 120000);
  });
}

const { targetId } = await sendBrowser('Target.createTarget', { url: 'about:blank', newWindow: true, width: 1280, height: 720 });
const { sessionId } = await sendBrowser('Target.attachToTarget', { targetId, flatten: true });

function sendSession(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params, sessionId }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP session timeout: ' + method)); } }, 120000);
  });
}

await sendSession('Page.enable', {});
await sendSession('Runtime.enable', {});
await sendSession('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

async function evaluate(expr) {
  const res = await sendSession('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
  return res.result.value;
}

async function waitFor(expr, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await evaluate(expr)) return true; } catch {}
    await sleep(200);
  }
  return false;
}

async function screenshot(file) {
  const res = await sendSession('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, Buffer.from(res.data, 'base64'));
  return file;
}

try {
  await sendSession('Page.navigate', { url: `${origin}/index.html?debug=1` });
  await evaluate(`localStorage.clear()`);
  await waitFor('!!window.DWOpening', 30000);
  await evaluate(`window.DWOpening.dismissForTesting && window.DWOpening.dismissForTesting()`);
  await waitFor('!!window.TT', 60000);
  await waitFor('window.DWOpening.active === false', 30000);
  await sleep(1000);

  // Start match
  await evaluate(`(() => {
    const n = document.getElementById('playerName');
    if (n) n.value = 'FlamerQA';
    const p = document.getElementById('modeHunt');
    if (p) p.click();
  })()`);
  await waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, 30000);
  await waitFor(`!document.body.classList.contains('deploying')`, 60000);
  await sleep(1500);

  // Start wave
  console.log('[Flamer Probe] Starting Wave 1...');
  await evaluate(`TT.skipPrep()`);
  await sleep(2000);

  // Turn player around to face South towards the yard/approaching horde
  await evaluate(`(() => {
    TT.grantAllWeapons();
    TT.setWeapon(10); // flamer
    TT.setAmmoDbg('flamer', 9999);
    // turn player around towards south
    if (TT.setAimYawDbg) TT.setAimYawDbg(Math.PI);
  })()`);

  const weaponState = await evaluate(`({ cur: TT.getCurrentWeapon(), ammo: TT.getAmmo ? TT.getAmmo().flamer : null })`);
  console.log('[Flamer Probe] Weapon state:', weaponState);

  // Benchmark Flamethrower for 10 seconds while firing
  console.log('[Flamer Probe] Firing flamethrower for 10s benchmark on RTX 5080...');
  await evaluate('TT.resetPerf()');
  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    await evaluate(`(() => {
      if (typeof fireWeapon === 'function') fireWeapon('flamer');
      if (typeof AudioSys !== 'undefined' && AudioSys.flameBurst) AudioSys.flameBurst('player', 1, 0, 0.11);
    })()`);
    await sleep(100);
  }
  const flamerPerf = await evaluate('TT.perfSnapshot()');
  console.log(`[Flamer Probe] Flamethrower FPS on RTX 5080: ${flamerPerf.fps.toFixed(1)} fps (1% low: ${flamerPerf.low.toFixed(1)} fps, worst: ${flamerPerf.worst.toFixed(1)}ms, hitches: ${flamerPerf.hitches})`);

  const shotFlamer = path.join(SHOTS_DIR, '08-flamethrower-active.png');
  await screenshot(shotFlamer);
  console.log(`[Shot 08 Real] Flamethrower active captured: ${shotFlamer} (${kbOf(shotFlamer)} KB)`);

  // Now test Finisher
  console.log('[Flamer Probe] Testing Finisher trigger...');
  await evaluate(`(() => {
    TT.drainWavePlanDbg();
    const list = TT.zombies || [];
    while (list.length > 1) {
      TT.killZombie(list[0]);
    }
  })()`);
  await sleep(500);

  const zombiesLeft = await evaluate(`(TT.zombies || []).length`);
  console.log(`[Flamer Probe] Zombies remaining before last kill: ${zombiesLeft}`);

  // Kill the last zombie
  await evaluate(`(() => {
    const list = TT.zombies || [];
    if (list.length > 0) {
      TT.killZombie(list[0]);
    }
  })()`);

  await sleep(400);
  const finisherState = await evaluate(`(() => {
    const f = TT.getWaveFinisher ? TT.getWaveFinisher() : null;
    const flash = document.getElementById('waveFinisherFlash');
    return {
      active: !!f,
      mesh: f && !!f.mesh,
      flashFound: !!flash,
      flashOpacity: flash ? getComputedStyle(flash).opacity : null,
      dur: f ? f.dur : null
    };
  })()`);
  console.log('[Flamer Probe] Finisher State:', finisherState);

  // Measure Finisher FPS
  await evaluate('TT.resetPerf()');
  await sleep(2000);
  const finisherPerf = await evaluate('TT.perfSnapshot()');
  console.log(`[Flamer Probe] Finisher Orbit FPS: ${finisherPerf.fps.toFixed(1)} fps (1% low: ${finisherPerf.low.toFixed(1)} fps, worst: ${finisherPerf.worst.toFixed(1)}ms, hitches: ${finisherPerf.hitches})`);

  const shotFinisher = path.join(SHOTS_DIR, '09-finisher-orbit-real.png');
  await screenshot(shotFinisher);
  console.log(`[Shot 09 Real] Finisher Orbit captured: ${shotFinisher} (${kbOf(shotFinisher)} KB)`);

  // Wait for dawn and night summary
  console.log('[Flamer Probe] Waiting for dawn transition and night summary...');
  await sleep(5000);

  const dawnState = await evaluate(`(() => {
    const win = document.getElementById('win') || document.getElementById('winMsg');
    return {
      day: TT.getDay(),
      phase: TT.getPhase(),
      winVisible: win ? getComputedStyle(win).display !== 'none' : false,
      winText: win ? win.innerText.trim().slice(0, 300) : null
    };
  })()`);
  console.log('[Flamer Probe] Dawn Summary State:', dawnState);

  const shotDawn = path.join(SHOTS_DIR, '10-dawn-summary-real.png');
  await screenshot(shotDawn);
  console.log(`[Shot 10 Real] Dawn Summary captured: ${shotDawn} (${kbOf(shotDawn)} KB)`);

} finally {
  try { ws.close(); } catch {}
  try { proc.kill(); } catch {}
  await sleep(200);
  try { await fs.promises.rm(profile, { recursive: true, force: true }); } catch {}
  await server.close();
  console.log('[Flamer Probe] Complete.');
}

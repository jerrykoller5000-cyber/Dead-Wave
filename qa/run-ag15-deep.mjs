// qa/run-ag15-deep.mjs — Deep Day 1 Audit Probing
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

console.log('[AG-15 Deep] Starting deep probe on Jerry\'s RTX 5080...');

const server = await serve(ROOT, 0);
const origin = server.origin;

const exe = findChrome();
const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-ag15-deep-'));
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
await sendSession('Log.enable', {});
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
  // Load page on fresh profile
  await sendSession('Page.navigate', { url: `${origin}/index.html?debug=1` });
  await evaluate(`localStorage.clear()`);
  await waitFor('!!window.DWOpening', 30000);
  await evaluate(`window.DWOpening.dismissForTesting && window.DWOpening.dismissForTesting()`);
  await waitFor('!!window.TT', 60000);
  await waitFor('window.DWOpening.active === false', 30000);
  await sleep(1000);

  // Start match
  console.log('[AG-15 Deep] Starting Day 1 match...');
  await evaluate(`(() => {
    const n = document.getElementById('playerName');
    if (n) n.value = 'JerryAudit';
    const p = document.getElementById('modeHunt');
    if (p) p.click();
  })()`);
  await waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, 30000);
  await waitFor(`!document.body.classList.contains('deploying')`, 60000);
  await sleep(1500);

  // 1. Audit Kiosk Modal
  console.log('[AG-15 Deep] Opening Kiosk via TT.openShop(true)...');
  await evaluate(`TT.openShop(true)`);
  await sleep(1000);

  const kioskData = await evaluate(`(() => {
    const modal = document.getElementById('shopModal') || document.getElementById('kioskModal') || document.querySelector('.kiosk-modal') || document.querySelector('#shop');
    const tabs = Array.from(document.querySelectorAll('#shopTabs button, .shop-tab, .tab-btn')).map(b => b.textContent.trim());
    const weaponHint = document.querySelector('#shopHint, .shop-hint, .kiosk-hint, #kioskHint')?.textContent.trim();
    const restockBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Restock')).map(b => b.textContent.trim());
    const rect = modal ? modal.getBoundingClientRect() : null;
    return {
      modalFound: !!modal,
      visible: modal ? getComputedStyle(modal).display !== 'none' : false,
      rect,
      tabs,
      weaponHint,
      restockBtns
    };
  })()`);
  console.log('[AG-15 Deep] Kiosk Data:', kioskData);

  const shotKioskReal = path.join(SHOTS_DIR, '04-kiosk-real-modal.png');
  await screenshot(shotKioskReal);
  console.log(`[Shot 04 Real] Kiosk Modal captured: ${shotKioskReal} (${kbOf(shotKioskReal)} KB)`);

  // Close Kiosk
  await evaluate(`TT.closeShop()`);
  await sleep(500);

  // 2. Start Wave 1 & Test Flamethrower
  console.log('[AG-15 Deep] Starting Wave 1...');
  await evaluate(`TT.skipPrep()`);
  await sleep(2000);

  // Switch to Flamethrower properly
  console.log('[AG-15 Deep] Equipping Flamethrower...');
  const weaponSwitch = await evaluate(`(() => {
    TT.setGearDbg && TT.setGearDbg('flamer');
    // flamer is index 10 in WEAPON_ORDER
    TT.setWeapon(10);
    TT.setAmmoDbg('flamer', 999);
    return {
      currentWeapon: TT.getCurrentWeapon(),
      ammo: TT.getAmmo ? TT.getAmmo().flamer : null
    };
  })()`);
  console.log('[AG-15 Deep] Weapon Switched:', weaponSwitch);

  // Measure Flamethrower FPS for 10s while firing
  console.log('[AG-15 Deep] Firing flamethrower for 10s benchmark on RTX 5080...');
  await evaluate('TT.resetPerf()');
  const tFlamer = Date.now();
  while (Date.now() - tFlamer < 10000) {
    await evaluate(`(() => {
      if (typeof fireWeapon === 'function') fireWeapon('flamer');
      if (typeof AudioSys !== 'undefined' && AudioSys.flameBurst) AudioSys.flameBurst('player', 1, 0, 0.11);
    })()`);
    await sleep(100);
  }
  const flamerPerf = await evaluate('TT.perfSnapshot()');
  console.log(`[AG-15 Deep] Flamethrower 10s FPS: ${flamerPerf.fps.toFixed(1)} fps (1% low: ${flamerPerf.low.toFixed(1)} fps, worst: ${flamerPerf.worst.toFixed(1)}ms, hitches: ${flamerPerf.hitches})`);

  const shotFlamerReal = path.join(SHOTS_DIR, '08-flamethrower-active.png');
  await screenshot(shotFlamerReal);
  console.log(`[Shot 08 Real] Flamethrower Active captured: ${shotFlamerReal} (${kbOf(shotFlamerReal)} KB)`);

  // 3. Complete the Wave to trigger Finisher
  console.log('[AG-15 Deep] Draining wave queue and eliminating all zombies for finisher...');
  await evaluate(`TT.drainWavePlanDbg()`);

  // Kill all but 1
  await evaluate(`(() => {
    const list = TT.zombies || [];
    for (let i = 1; i < list.length; i++) {
      if (list[i].alive) {
        list[i].hp = 0;
        TT.killZombie(list[i]);
      }
    }
  })()`);
  await sleep(1000);

  // Kill last zombie and observe finisher
  console.log('[AG-15 Deep] Killing final zombie to trigger CL-33 finisher...');
  await evaluate(`(() => {
    const list = TT.zombies || [];
    const last = list.find(z => z.alive);
    if (last) {
      last.hp = 0;
      TT.killZombie(last);
    }
  })()`);

  await sleep(400);
  const finisherCheck = await evaluate(`(() => {
    const f = TT.getWaveFinisher ? TT.getWaveFinisher() : null;
    const flash = document.getElementById('waveFinisherFlash');
    return {
      active: !!f,
      flashFound: !!flash,
      cam: TT.camera ? { x: TT.camera.position.x.toFixed(1), y: TT.camera.position.y.toFixed(1), z: TT.camera.position.z.toFixed(1) } : null
    };
  })()`);
  console.log('[AG-15 Deep] Finisher Check:', finisherCheck);

  const shotFinisherReal = path.join(SHOTS_DIR, '09-finisher-orbit-real.png');
  await screenshot(shotFinisherReal);
  console.log(`[Shot 09 Real] Finisher Orbit captured: ${shotFinisherReal} (${kbOf(shotFinisherReal)} KB)`);

  // 4. Wait for Dawn & Summary & Day 2 Briefing
  console.log('[AG-15 Deep] Waiting for dawn transition and night summary...');
  await sleep(6000);

  const dawnSummary = await evaluate(`(() => {
    const win = document.getElementById('win') || document.getElementById('winMsg');
    const day = TT.getDay();
    const phase = TT.getPhase();
    return {
      day, phase,
      winFound: !!win,
      winVisible: win ? getComputedStyle(win).display !== 'none' : false,
      winText: win ? win.innerText.trim().slice(0, 300) : null
    };
  })()`);
  console.log('[AG-15 Deep] Dawn Summary:', dawnSummary);

  const shotSummaryReal = path.join(SHOTS_DIR, '10-dawn-summary-real.png');
  await screenshot(shotSummaryReal);
  console.log(`[Shot 10 Real] Dawn Summary captured: ${shotSummaryReal} (${kbOf(shotSummaryReal)} KB)`);

  // 5. Test Day 1 Death & Play Again
  console.log('\n[AG-15 Deep] Testing Run 2: Lethal damage, tombstone, and Play Again...');
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
    if (n) n.value = 'DeathQA';
    const p = document.getElementById('modeHunt');
    if (p) p.click();
  })()`);
  await waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, 30000);
  await waitFor(`!document.body.classList.contains('deploying')`, 60000);
  await sleep(1000);

  // Inflict lethal damage via TT.damagePlayer(999, 'zombie')
  console.log('[AG-15 Deep] Inflicting lethal damage via TT.damagePlayer(999)...');
  await evaluate(`TT.damagePlayer(999, 'zombie')`);
  await sleep(3500);

  const deathCineState = await evaluate(`(() => {
    const win = document.getElementById('win');
    const winMsg = document.getElementById('winMsg');
    const deathLog = localStorage.getItem('tt_death_log');
    const dayStart = localStorage.getItem('tt_day_start');
    const btn = document.querySelector('#win button, #winMsg button, #playAgain');
    return {
      gameOver: typeof gameOver !== 'undefined' ? gameOver : null,
      winVisible: win ? getComputedStyle(win).display !== 'none' : false,
      winMsgText: winMsg ? winMsg.innerText.trim().slice(0, 300) : null,
      deathLog,
      dayStart,
      hasBtn: !!btn,
      btnText: btn ? btn.textContent.trim() : null
    };
  })()`);
  console.log('[AG-15 Deep] Death State:', deathCineState);

  const shotDeathReal = path.join(SHOTS_DIR, '11-death-cemetery-real.png');
  await screenshot(shotDeathReal);
  console.log(`[Shot 11 Real] Death Screen captured: ${shotDeathReal} (${kbOf(shotDeathReal)} KB)`);

  // Click Play Again
  console.log('[AG-15 Deep] Clicking Play Again button...');
  await evaluate(`(() => {
    const btn = document.querySelector('#win button, #winMsg button, #playAgain');
    if (btn) btn.click();
  })()`);
  await sleep(3000);

  const restartState = await evaluate(`(() => {
    return {
      day: TT.getDay(),
      phase: TT.getPhase(),
      dayStart: localStorage.getItem('tt_day_start'),
      deathLog: localStorage.getItem('tt_death_log')
    };
  })()`);
  console.log('[AG-15 Deep] Post-Restart State:', restartState);

  const shotRestartReal = path.join(SHOTS_DIR, '12-restart-state-real.png');
  await screenshot(shotRestartReal);
  console.log(`[Shot 12 Real] Restart State captured: ${shotRestartReal} (${kbOf(shotRestartReal)} KB)`);

} finally {
  try { ws.close(); } catch {}
  try { proc.kill(); } catch {}
  await sleep(200);
  try { await fs.promises.rm(profile, { recursive: true, force: true }); } catch {}
  await server.close();
  console.log('[AG-15 Deep] Probe finished cleanly.');
}

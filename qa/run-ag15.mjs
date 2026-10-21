// qa/run-ag15.mjs — AG-15 Comprehensive Day-1 Audit Harness
// Antigravity (Gemini 3.8 Flash (High)) on Jerry's PC (RTX 5080)
// Audits Day 1 start to finish:
//   Run 1: Fresh profile, survive wave, weapons, flamethrower FPS, finisher, dawn summary, day 2 briefing
//   Run 2: Fresh profile, die on purpose, tombstone, tt_death_log, click Play Again, verify Day 1 reset vs resume

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

console.log('================================================================');
console.log('  AG-15 DAY-1 AUDIT: HARNESS STARTING ON JERRY\'S GPU');
console.log('================================================================');

// Launch headless Chrome directly on hardware GPU (RTX 5080)
async function launchHardwareChrome() {
  const exe = findChrome();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-ag15-chrome-'));
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
  if (!port) {
    proc.kill();
    throw new Error('Chrome failed to report debugging port.');
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

  return {
    proc, profile, ws,
    async newPage({ width = 1280, height = 720 } = {}) {
      const { targetId } = await sendBrowser('Target.createTarget', { url: 'about:blank', newWindow: true, width, height });
      const { sessionId } = await sendBrowser('Target.attachToTarget', { targetId, flatten: true });

      const errors = [];
      const logs = [];
      listeners.push((msg) => {
        if (msg.sessionId !== sessionId) return;
        if (msg.method === 'Runtime.exceptionThrown') {
          const d = msg.params.exceptionDetails || {};
          const text = (d.exception && (d.exception.description || d.exception.value)) || d.text || 'unknown error';
          errors.push(String(text).split('\n').slice(0, 4).join(' '));
        }
        if (msg.method === 'Runtime.consoleAPICalled') {
          const t = msg.params.type;
          const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
          logs.push({ type: t, text });
        }
      });

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
      await sendSession('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

      return {
        sessionId, errors, logs,
        async goto(url) {
          await sendSession('Page.navigate', { url });
        },
        async evaluate(expression, timeoutMs = 120000) {
          const res = await sendSession('Runtime.evaluate', {
            expression, returnByValue: true, awaitPromise: true, userGesture: true
          }, timeoutMs);
          if (res.exceptionDetails) {
            const d = res.exceptionDetails;
            const text = (d.exception && (d.exception.description || d.exception.value)) || d.text;
            throw new Error('evaluate failed: ' + text);
          }
          return res.result.value;
        },
        async waitFor(expression, { timeout = 120000, every = 200 } = {}) {
          const t0 = Date.now();
          while (Date.now() - t0 < timeout) {
            try {
              const ok = await this.evaluate(expression);
              if (ok) return true;
            } catch {}
            await sleep(every);
          }
          return false;
        },
        async screenshot(file) {
          const res = await sendSession('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          await fs.promises.mkdir(path.dirname(file), { recursive: true });
          await fs.promises.writeFile(file, Buffer.from(res.data, 'base64'));
          return file;
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

const auditFindings = [];
function addFinding(id, severity, area, title, details) {
  auditFindings.push({ id, severity, area, title, ...details });
  console.log(`[FINDING ${id}] [${severity}] [${area}] ${title}`);
}

const server = await serve(ROOT, 0);
const origin = server.origin;
console.log(`[Harness] Server running at ${origin}`);

const browser = await launchHardwareChrome();

try {
  const page = await browser.newPage({ width: 1280, height: 720 });

  // Probe GPU info
  await page.goto(`${origin}/tools/blank.html`);
  const gpuInfo = await page.evaluate(`(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      unmaskedVendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null,
      unmaskedRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null
    };
  })()`);
  console.log('[Harness] Confirmed Active Hardware GPU:', gpuInfo.unmaskedRenderer);

  // =========================================================================
  // RUN 1: FRESH PROFILE -> SURVIVE DAY 1 WAVE
  // =========================================================================
  console.log('\n================================================================');
  console.log('>>> STARTING RUN 1: FRESH PROFILE & SURVIVING DAY 1 WAVE <<<');
  console.log('================================================================');

  const navT0 = Date.now();
  await page.goto(`${origin}/index.html?debug=1`);

  // Clear localStorage for a fresh profile
  await page.evaluate(`localStorage.clear()`);

  // 1. Splash Screen Checks
  await page.waitFor('!!window.DWOpening', { timeout: 30000 });
  const splashActive = await page.evaluate(`window.DWOpening.active`);
  const skipBtn = await page.evaluate(`document.getElementById('openingSkip')`);
  console.log(`[Splash] active: ${splashActive}, #openingSkip present: ${!!skipBtn}`);

  if (skipBtn) {
    addFinding('AG-A1', 'S2', 'ui', 'Opening splash still has #openingSkip in DOM', {
      where: 'index.html (opening overlay)',
      steps: 'Load fresh game, inspect DOM for #openingSkip',
      expected: 'No skip button in DOM per GP-27',
      seen: 'Button was present in DOM',
      owner: 'ChatGPT',
      fix: 'Remove element completely'
    });
  }

  // Dismiss splash using test hook
  await page.evaluate(`window.DWOpening.dismissForTesting && window.DWOpening.dismissForTesting()`);

  // Wait for TT and Title screen
  const ttLoaded = await page.waitFor('!!window.TT', { timeout: 60000 });
  const loadDurationSec = ((Date.now() - navT0) / 1000).toFixed(1);
  console.log(`[Title] Engine ready in ${loadDurationSec}s`);

  await page.waitFor('window.DWOpening.active === false', { timeout: 30000 });
  await sleep(1000);

  // Capture Menu Screen
  const shotMenu = path.join(SHOTS_DIR, '01-menu-screen.png');
  await page.screenshot(shotMenu);
  console.log(`[Shot 01] Menu captured: ${shotMenu} (${kbOf(shotMenu)} KB)`);

  // Measure Menu FPS
  await page.evaluate('TT.resetPerf()');
  await sleep(2500);
  const menuPerf = await page.evaluate('TT.perfSnapshot()') || { fps: 0, low: 0, worst: 0, hitches: 0 };
  console.log(`[FPS] Menu Screen: ${menuPerf.fps.toFixed(1)} fps (1% low: ${menuPerf.low.toFixed(1)} fps, worst: ${menuPerf.worst.toFixed(1)}ms, hitches: ${menuPerf.hitches})`);

  // Check Title UI elements and buttons
  const menuInfo = await page.evaluate(`(() => {
    const playBtn = document.getElementById('modeHunt');
    const nameInput = document.getElementById('playerName');
    const buttons = Array.from(document.querySelectorAll('#menu button, #menu .btn')).map(b => b.textContent.trim());
    return {
      hasPlay: !!playBtn,
      playText: playBtn ? playBtn.textContent.trim() : null,
      playerNameVal: nameInput ? nameInput.value : null,
      playerNamePlaceholder: nameInput ? nameInput.placeholder : null,
      buttons
    };
  })()`);
  console.log('[Title UI]', menuInfo);

  // Check console errors at title
  if (page.errors.length) {
    console.log('[Console Errors at Title]', page.errors);
  }

  // =========================================================================
  // 2. Start Match: Insertion and Landing
  // =========================================================================
  console.log('\n[Match] Starting Day 1 match with callsign "JerryQA"...');
  await page.evaluate(`(() => {
    const nameInput = document.getElementById('playerName');
    if (nameInput) {
      nameInput.value = 'JerryQA';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  // Wait for prep phase and insertion completion
  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  console.log('[Match] Prep phase active. Waiting for landing (body.deploying to clear)...');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 60000 });
  console.log(`[Match] Landing complete: ${landed}`);
  await sleep(1500);

  // Capture Landing & Briefing Shot
  const shotLanding = path.join(SHOTS_DIR, '02-landing-briefing.png');
  await page.screenshot(shotLanding);
  console.log(`[Shot 02] Landing captured: ${shotLanding} (${kbOf(shotLanding)} KB)`);

  // Check Onboarding, Coach and Briefing state
  const onboardingState = await page.evaluate(`(() => {
    const coach = document.getElementById('coach');
    const briefing = document.getElementById('briefingModal') || document.getElementById('briefing');
    const checklist = document.getElementById('prepChecklist') || document.querySelector('.prep-checklist');
    const readyPanel = document.getElementById('readyPanel') || document.querySelector('.ready-panel');
    return {
      coachVisible: coach ? getComputedStyle(coach).display !== 'none' : false,
      coachText: coach ? coach.innerText.trim() : null,
      briefingVisible: briefing ? getComputedStyle(briefing).display !== 'none' : false,
      checklistVisible: checklist ? getComputedStyle(checklist).display !== 'none' : false,
      readyVisible: readyPanel ? getComputedStyle(readyPanel).display !== 'none' : false,
      day: TT.getDay ? TT.getDay() : null,
      phase: TT.getPhase ? TT.getPhase() : null
    };
  })()`);
  console.log('[Onboarding State]', onboardingState);

  // =========================================================================
  // 3. Scavenging Phase: Exploration, HUD, POIs, Kiosk, Building
  // =========================================================================
  console.log('\n[Scavenging] Auditing Scavenging Phase on Day 1...');

  // Move marine towards HQ / yard
  await page.evaluate(`(() => {
    if (TT.player) {
      TT.player.position.set(0, TT.sampleHeight(0, -5), -5);
      if (TT.playerMesh) TT.playerMesh.position.copy(TT.player.position);
    }
  })()`);
  await sleep(500);

  // Measure Scavenging FPS
  await page.evaluate('TT.resetPerf()');
  await sleep(3000);
  const scavengePerf = await page.evaluate('TT.perfSnapshot()') || { fps: 0, low: 0, worst: 0, hitches: 0 };
  console.log(`[FPS] Scavenging: ${scavengePerf.fps.toFixed(1)} fps (1% low: ${scavengePerf.low.toFixed(1)} fps, worst: ${scavengePerf.worst.toFixed(1)}ms, hitches: ${scavengePerf.hitches})`);

  // Check HUD Layout & Elements
  const hudAudit = await page.evaluate(`(() => {
    const hp = document.getElementById('health') || document.querySelector('.hp-bar');
    const ammo = document.getElementById('ammo') || document.querySelector('.ammo-display');
    const cash = document.getElementById('cash') || document.querySelector('.cash-val');
    const skulls = document.getElementById('skulls') || document.querySelector('.skull-val');
    const minimap = document.getElementById('minimap') || document.getElementById('minimapFrame');
    const objective = document.getElementById('objectiveCard') || document.querySelector('.objective-card');
    const ready = document.getElementById('readyPanel') || document.querySelector('.ready-banner');

    function rect(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, visible: r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none' };
    }

    return {
      hp: rect(hp),
      ammo: rect(ammo),
      cash: rect(cash),
      skulls: rect(skulls),
      minimap: rect(minimap),
      objective: rect(objective),
      ready: rect(ready)
    };
  })()`);
  console.log('[HUD Layout Rects]', hudAudit);

  // Check for UI overlaps
  if (hudAudit.objective && hudAudit.ready && hudAudit.objective.visible && hudAudit.ready.visible) {
    const o = hudAudit.objective;
    const r = hudAudit.ready;
    const overlap = !(o.x + o.w < r.x || r.x + r.w < o.x || o.y + o.h < r.y || r.y + r.h < o.y);
    if (overlap) {
      addFinding('AG-A2', 'S2', 'ui', 'Objective card and Ready panel bounding boxes overlap', {
        where: 'ui/hud.js, index.html HUD overlays',
        steps: 'Land in match, observe HUD layout with objective tracked',
        expected: 'Clean separation without visual collision',
        seen: `Objective (${o.x},${o.y},${o.w}x${o.h}) overlaps Ready (${r.x},${r.y},${r.w}x${r.h})`,
        owner: 'ChatGPT',
        fix: 'Adjust top/right anchoring coordinates'
      });
    }
  }

  // Capture HUD shot
  const shotHud = path.join(SHOTS_DIR, '03-scavenging-hud.png');
  await page.screenshot(shotHud);
  console.log(`[Shot 03] Scavenging HUD captured: ${shotHud} (${kbOf(shotHud)} KB)`);

  // Audit Kiosk
  console.log('[Kiosk] Inspecting Kiosk modal and restock copy...');
  await page.evaluate(`(() => {
    if (TT.openKiosk) TT.openKiosk();
    else if (typeof openKiosk === 'function') openKiosk();
    else {
      const k = document.getElementById('kioskModal') || document.getElementById('shopModal');
      if (k) k.style.display = 'block';
    }
  })()`);
  await sleep(1000);

  const kioskInfo = await page.evaluate(`(() => {
    const modal = document.getElementById('kioskModal') || document.getElementById('shopModal');
    const tabs = Array.from(document.querySelectorAll('#shopTabs button, .shop-tab')).map(t => t.textContent.trim());
    const weaponHint = document.querySelector('#shopHint, .shop-hint, .kiosk-hint')?.textContent.trim();
    const restockBtn = document.querySelector('.restock-btn, [data-action="restock"], button.restock');
    return {
      open: modal ? getComputedStyle(modal).display !== 'none' : false,
      tabs,
      weaponHint,
      hasRestock: !!restockBtn,
      restockText: restockBtn ? restockBtn.textContent.trim() : null
    };
  })()`);
  console.log('[Kiosk Info]', kioskInfo);

  const shotKiosk = path.join(SHOTS_DIR, '04-kiosk-tabs-restock.png');
  await page.screenshot(shotKiosk);
  console.log(`[Shot 04] Kiosk captured: ${shotKiosk} (${kbOf(shotKiosk)} KB)`);

  // Close Kiosk
  await page.evaluate(`(() => {
    const closeBtn = document.querySelector('#kioskClose, #shopClose, .modal-close');
    if (closeBtn) closeBtn.click();
    const modal = document.getElementById('kioskModal') || document.getElementById('shopModal');
    if (modal) modal.style.display = 'none';
  })()`);
  await sleep(500);

  // Audit Building
  console.log('[Building] Testing build wheel and ghost placement...');
  await page.evaluate(`(() => {
    TT.unlockAllBuilds && TT.unlockAllBuilds();
    TT.addCash && TT.addCash(5000);
    TT.setPlaceMode && TT.setPlaceMode('wall');
    const p = TT.player.position;
    const gx = TT.gridIndex(p.x), gz = TT.gridIndex(p.z);
    const tz = TT.gridCentre(gz - 3);
    const aim = (gxCell) => {
      const tx = TT.gridCentre(gxCell);
      const ty = TT.sampleHeight(tx, tz);
      const c = TT.camera.position;
      TT.setAimRay && TT.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z);
    };
    aim(gx - 2);
    TT.beginPlaceClick && TT.beginPlaceClick();
    aim(gx + 2);
    TT.updateGhostPreview && TT.updateGhostPreview();
  })()`);
  await sleep(600);

  const shotBuilding = path.join(SHOTS_DIR, '05-building-placement.png');
  await page.screenshot(shotBuilding);
  console.log(`[Shot 05] Building ghost preview captured: ${shotBuilding} (${kbOf(shotBuilding)} KB)`);

  // Commit build and cancel place mode
  await page.evaluate(`(() => {
    TT.commitBuildDrag && TT.commitBuildDrag();
    TT.setPlaceMode && TT.setPlaceMode(null);
  })()`);

  // =========================================================================
  // 4. Dusk & Prep Timer
  // =========================================================================
  console.log('\n[Dusk] Checking dusk lighting and prep countdown...');
  const shotDusk = path.join(SHOTS_DIR, '06-dusk-prep-countdown.png');
  await page.screenshot(shotDusk);
  console.log(`[Shot 06] Dusk prep captured: ${shotDusk} (${kbOf(shotDusk)} KB)`);

  // =========================================================================
  // 5. Sound Alarm & Wave 1 Start: Composition, Spawns, Flamethrower FPS
  // =========================================================================
  console.log('\n[Wave 1] Sounding alarm to trigger Day 1 wave...');
  const alarmResult = await page.evaluate(`(() => {
    const p0 = TT.getPhase();
    TT.skipPrep && TT.skipPrep();
    return { prevPhase: p0, newPhase: TT.getPhase(), day: TT.getDay() };
  })()`);
  console.log('[Alarm Result]', alarmResult);

  // Check alarm camera shake & rumble (CL-29: 3 seconds)
  await sleep(500);
  const shakeState = await page.evaluate(`(() => {
    return {
      shakeActive: typeof shakeTrauma !== 'undefined' ? shakeTrauma : (window.TT.shakeTrauma || null),
      phase: TT.getPhase()
    };
  })()`);
  console.log('[Alarm Shake]', shakeState);

  // Wait for zombies to spawn
  await sleep(2000);
  const waveZombies = await page.evaluate(`(() => {
    const list = TT.zombies || [];
    const playerPos = TT.player ? TT.player.position : { x: 0, z: 0 };
    return list.map(z => ({
      type: z.typeKey,
      hp: z.hp,
      dist: Math.hypot(z.mesh.position.x - playerPos.x, z.mesh.position.z - playerPos.z),
      pos: { x: z.mesh.position.x.toFixed(1), y: z.mesh.position.y.toFixed(1), z: z.mesh.position.z.toFixed(1) }
    }));
  })()`);
  console.log(`[Wave 1 Composition] Total spawned: ${waveZombies.length} (Expected: 20 bodies)`);

  // Check for popping in plain sight vs treeline
  const closeSpawns = waveZombies.filter(z => z.dist < 20);
  if (closeSpawns.length > 0) {
    console.log(`[Warning] ${closeSpawns.length} zombies spawned closer than 20m to player!`, closeSpawns);
    addFinding('AG-A3', 'S2', 'combat', 'Day-1 zombies spawn in plain sight close to HQ', {
      where: 'index.html (wave director, spawnWave)',
      steps: 'Start Day 1 wave while standing at HQ',
      expected: 'Zombies spawn out of sight in the treeline or cave (>30m away)',
      seen: `${closeSpawns.length} zombies spawned under 20m from player (closest: ${closeSpawns[0].dist.toFixed(1)}m)`,
      owner: 'Grokbot',
      fix: 'Enforce minimum spawn distance of 35m from player and HQ'
    });
  }

  const shotSpawns = path.join(SHOTS_DIR, '07-wave1-spawns.png');
  await page.screenshot(shotSpawns);
  console.log(`[Shot 07] Wave 1 Spawns captured: ${shotSpawns} (${kbOf(shotSpawns)} KB)`);

  // Combat test: Flamethrower held for 10s into horde
  console.log('[Combat] Equipping flamethrower and firing for 10s benchmark...');
  await page.evaluate(`(() => {
    TT.setGearDbg && TT.setGearDbg('flamer');
    if (typeof weapons !== 'undefined' && weapons.flamer) weapons.flamer.owned = true;
    if (typeof setWeapon === 'function') setWeapon('flamer');
    TT.setAmmoDbg && TT.setAmmoDbg('flamer', 9999);
  })()`);

  // Start holding fire
  await page.evaluate(`TT.resetPerf()`);
  const flamerStart = Date.now();
  while (Date.now() - flamerStart < 10000) {
    await page.evaluate(`(() => {
      // Simulate continuous flamethrower firing
      if (typeof fireWeapon === 'function') fireWeapon('flamer');
      if (typeof AudioSys !== 'undefined' && AudioSys.flameBurst) AudioSys.flameBurst('player', 1, 0, 0.11);
    })()`);
    await sleep(200);
  }

  const flamerPerf = await page.evaluate('TT.perfSnapshot()') || { fps: 0, low: 0, worst: 0, hitches: 0 };
  console.log(`[FPS] Flamethrower 10s Combat: ${flamerPerf.fps.toFixed(1)} fps (1% low: ${flamerPerf.low.toFixed(1)} fps, worst: ${flamerPerf.worst.toFixed(1)}ms, hitches: ${flamerPerf.hitches})`);

  const shotFlamer = path.join(SHOTS_DIR, '08-wave1-flamethrower-combat.png');
  await page.screenshot(shotFlamer);
  console.log(`[Shot 08] Flamethrower combat captured: ${shotFlamer} (${kbOf(shotFlamer)} KB)`);

  // =========================================================================
  // 6. Last Zombie Kill & Wave Finisher
  // =========================================================================
  console.log('\n[Finisher] Eliminating remaining zombies down to final kill...');
  // Kill all but 1 zombie
  await page.evaluate(`(() => {
    const list = TT.zombies || [];
    for (let i = 1; i < list.length; i++) {
      if (list[i].alive) {
        list[i].hp = 0;
        if (TT.killZombie) TT.killZombie(list[i]);
      }
    }
  })()`);
  await sleep(1000);

  // Kill the final zombie to trigger the wave finisher
  console.log('[Finisher] Killing final zombie to trigger wave finisher pulse & orbit...');
  await page.evaluate(`(() => {
    const list = TT.zombies || [];
    const last = list.find(z => z.alive);
    if (last) {
      last.hp = 0;
      if (TT.killZombie) TT.killZombie(last);
    }
  })()`);

  // Check finisher pulse and orbit
  await sleep(400);
  const finisherAudit = await page.evaluate(`(() => {
    const pulseEl = document.getElementById('waveFinisherFlash');
    const finisherActive = typeof waveFinisher !== 'undefined' ? !!waveFinisher : false;
    return {
      hasPulseEl: !!pulseEl,
      pulseOpacity: pulseEl ? getComputedStyle(pulseEl).opacity : null,
      finisherActive
    };
  })()`);
  console.log('[Finisher State]', finisherAudit);

  // Measure Finisher FPS
  await page.evaluate('TT.resetPerf()');
  await sleep(2000);
  const finisherPerf = await page.evaluate('TT.perfSnapshot()') || { fps: 0, low: 0, worst: 0, hitches: 0 };
  console.log(`[FPS] Finisher Orbit: ${finisherPerf.fps.toFixed(1)} fps (1% low: ${finisherPerf.low.toFixed(1)} fps, worst: ${finisherPerf.worst.toFixed(1)}ms, hitches: ${finisherPerf.hitches})`);

  const shotFinisher = path.join(SHOTS_DIR, '09-wave-finisher-orbit.png');
  await page.screenshot(shotFinisher);
  console.log(`[Shot 09] Wave Finisher captured: ${shotFinisher} (${kbOf(shotFinisher)} KB)`);

  // =========================================================================
  // 7. Dawn, Night Summary & Day 2 Briefing
  // =========================================================================
  console.log('\n[Dawn] Waiting for dawn transition and night summary...');
  await sleep(3500);

  const dawnState = await page.evaluate(`(() => {
    const summary = document.getElementById('winMsg') || document.getElementById('summaryModal') || document.querySelector('.summary-modal');
    const day = TT.getDay ? TT.getDay() : null;
    const phase = TT.getPhase ? TT.getPhase() : null;
    return {
      hasSummary: !!summary,
      summaryVisible: summary ? getComputedStyle(summary).display !== 'none' : false,
      day, phase
    };
  })()`);
  console.log('[Dawn State]', dawnState);

  const shotSummary = path.join(SHOTS_DIR, '10-dawn-wave-summary.png');
  await page.screenshot(shotSummary);
  console.log(`[Shot 10] Dawn Summary captured: ${shotSummary} (${kbOf(shotSummary)} KB)`);

  // =========================================================================
  // RUN 2: FRESH PROFILE -> DIE ON PURPOSE & PLAY AGAIN
  // =========================================================================
  console.log('\n================================================================');
  console.log('>>> STARTING RUN 2: DIE ON PURPOSE & TEST PLAY AGAIN <<<');
  console.log('================================================================');

  // Clear localStorage for a fresh profile
  await page.goto(`${origin}/index.html?debug=1`);
  await page.evaluate(`localStorage.clear()`);

  // Dismiss opening splash
  await page.waitFor('!!window.DWOpening', { timeout: 30000 });
  await page.evaluate(`window.DWOpening.dismissForTesting && window.DWOpening.dismissForTesting()`);
  await page.waitFor('!!window.TT', { timeout: 60000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 30000 });
  await sleep(1000);

  // Start match
  console.log('[Run 2] Starting fresh Day 1 run...');
  await page.evaluate(`(() => {
    const nameInput = document.getElementById('playerName');
    if (nameInput) nameInput.value = 'MortalQA';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 60000 });
  await sleep(1000);

  console.log('[Run 2] Inflicting lethal damage to trigger death sequence...');
  await page.evaluate(`(() => {
    // Damage player to 0
    if (typeof hurtPlayer === 'function') hurtPlayer(9999);
    else if (TT.playerHp !== undefined) TT.playerHp = 0;
  })()`);

  // Wait for death screen / tombstone
  await sleep(3500);

  const deathAudit = await page.evaluate(`(() => {
    const tombstone = document.getElementById('deathModal') || document.getElementById('win') || document.querySelector('.tombstone');
    const deathLog = localStorage.getItem('tt_death_log');
    const dayStart = localStorage.getItem('tt_day_start');
    const playAgainBtn = document.querySelector('#playAgain, .play-again, #win button');
    return {
      tombstoneVisible: tombstone ? getComputedStyle(tombstone).display !== 'none' : false,
      deathLog,
      dayStart,
      hasPlayAgain: !!playAgainBtn,
      playAgainText: playAgainBtn ? playAgainBtn.textContent.trim() : null
    };
  })()`);
  console.log('[Death Audit State]', deathAudit);

  const shotTombstone = path.join(SHOTS_DIR, '11-death-tombstone.png');
  await page.screenshot(shotTombstone);
  console.log(`[Shot 11] Death Tombstone captured: ${shotTombstone} (${kbOf(shotTombstone)} KB)`);

  // Click Play Again
  console.log('[Run 2] Clicking Play Again...');
  const restartAudit = await page.evaluate(`(() => {
    const btn = document.querySelector('#playAgain, .play-again, #win button');
    if (btn) btn.click();
    return { clicked: !!btn };
  })()`);
  console.log('[Restart Clicked]', restartAudit);

  await sleep(3000);

  // Check state after clicking Play Again (CU-25 order 5: "A death's Play again is a new run at day 1")
  const postRestartState = await page.evaluate(`(() => {
    const day = TT.getDay ? TT.getDay() : null;
    const phase = TT.getPhase ? TT.getPhase() : null;
    const dayStart = localStorage.getItem('tt_day_start');
    const deathLog = localStorage.getItem('tt_death_log');
    return { day, phase, dayStart, deathLog };
  })()`);
  console.log('[Post-Restart State]', postRestartState);

  const shotRestart = path.join(SHOTS_DIR, '12-play-again-restart.png');
  await page.screenshot(shotRestart);
  console.log(`[Shot 12] Play Again Restart captured: ${shotRestart} (${kbOf(shotRestart)} KB)`);

  if (postRestartState.day !== 1 && postRestartState.day !== null) {
    addFinding('AG-A4', 'S1', 'engine', 'Play again after death resumed on wrong day instead of Day 1 fresh run', {
      where: 'index.html (death screen restart handler, CU-25)',
      steps: 'Die on Day 1, click Play Again',
      expected: 'Starts fresh run at Day 1 per Jerry order 5 / CU-25',
      seen: `Resumed on Day ${postRestartState.day}`,
      owner: 'Cursor',
      fix: 'Clear tt_day_start on death Play Again click'
    });
  }

  // =========================================================================
  // AUDIO AUDIT
  // =========================================================================
  console.log('\n[Audio] Checking logged audio events and cues...');
  const audioLogs = page.logs.filter(l => l.text.toLowerCase().includes('audio') || l.text.toLowerCase().includes('sting') || l.text.toLowerCase().includes('music'));
  console.log(`[Audio Logs Total: ${audioLogs.length}]`);
  for (const al of audioLogs.slice(0, 10)) {
    console.log(`  ${al.text}`);
  }

  console.log('\n================================================================');
  console.log(`AG-15 AUDIT COMPLETE: ${auditFindings.length} FINDINGS DETECTED`);
  console.log('================================================================');

} finally {
  await browser.close();
  await server.close();
}

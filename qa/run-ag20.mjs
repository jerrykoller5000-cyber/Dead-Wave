import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-27-AG-20');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchHardwareChrome() {
  const exe = findChrome();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-ag20-chrome-'));
  const flags = [
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--mute-audio',
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

const server = await serve(ROOT, 0);
const origin = server.origin;
console.log(`[Harness] Server running at ${origin}`);

const browser = await launchHardwareChrome();
const results = {
  nightLengths: [],
  skullsLeft: [],
  deaths: 0,
  accidentalPokes: false,
  waysToDie: {}
};

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${origin}/index.html?debug=1`);
  await page.evaluate(`localStorage.clear()`);

  console.log('[Harness] Starting Run...');
  
  // Start
  await page.waitFor('!!window.DWOpening', { timeout: 30000 });
  await page.evaluate(`window.DWOpening.dismissForTesting && window.DWOpening.dismissForTesting()`);
  await page.waitFor('!!window.TT', { timeout: 60000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 30000 });
  await sleep(1000);

  // Play
  await page.evaluate(`(() => {
    const nameInput = document.getElementById('playerName');
    if (nameInput) { nameInput.value = 'AG20'; nameInput.dispatchEvent(new Event('input', { bubbles: true })); }
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  // Wait for landing
  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 60000 });
  await sleep(1000);
  
  // Accidental Poke Test
  console.log('[Test] Firing into cave to test accidental poke...');
  await page.evaluate(`(() => {
    if (!TT.POI || !TT.POI.caves) return;
    const cave = TT.POI.caves[0];
    if (TT.player) TT.player.position.set(cave.x, TT.sampleHeight ? TT.sampleHeight(cave.x, cave.z) : 0, cave.z + 10);
    if (TT.triggerCavePoke) TT.triggerCavePoke(cave);
  })()`);
  await sleep(2000);
  const coachText = await page.evaluate(`document.getElementById('coach') ? document.getElementById('coach').innerText : ''`);
  results.accidentalPokes = coachText.includes("Something in that cave woke up");
  console.log(`[Test] Accidental poke coach text seen: ${results.accidentalPokes}`);
  
  // Ways to Die Padlocks Check
  console.log('[Test] Checking Ways to Die padlocks...');

  for (let n = 1; n <= 5; n++) {
    console.log(`\\n[Night ${n}] Starting...`);
    
    // Skip prep
    await page.evaluate(`TT.skipPrep && TT.skipPrep()`);
    
    // Wait until wave actually starts
    await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'wave'`, { timeout: 30000 });
    const nightStart = Date.now();
    let waveDone = false;
    
    // Play wave
    while (!waveDone) {
      waveDone = await page.evaluate(`((n) => {
        const list = TT.zombies || [];
        const count = list.filter(z => z.alive).length;
        
        // If night 5, let them accumulate to 48 before mass killing
        if (n === 5) {
            if (count < 48 && TT.getWaveDirectorState().waveSpawned < TT.getWaveDirectorState().waveTotal) {
                // keep the marine safe by killing zombies too close (under 5m)
                list.filter(z => z.alive).forEach(z => {
                    const dx = z.mesh.position.x - TT.player.position.x;
                    const dz = z.mesh.position.z - TT.player.position.z;
                    if (dx*dx + dz*dz < 25) { z.hp = 0; TT.killZombie && TT.killZombie(z); }
                });
                return false;
            }
        }
        
        if (count > 0) {
          // kill all but 1
          for (let i = 1; i < list.length; i++) {
            if (list[i].alive) {
              list[i].hp = 0;
              TT.killZombie && TT.killZombie(list[i]);
            }
          }
        }
        
        const remaining = list.filter(z => z.alive).length;
        if (TT.getPhase() !== 'wave') return true;
        // if wave spawns are done and only 1 left, kill it
        if (TT.getWaveDirectorState().waveSpawned >= TT.getWaveDirectorState().waveTotal && remaining > 0) {
           const last = list.find(z => z.alive);
           last.hp = 0; TT.killZombie && TT.killZombie(last);
           return false; // will transition next tick
        }
        return false;
      })(${n})`);
      
      if (n === 5 && !waveDone) {
        // FPS with 48 check
        const aliveCount = await page.evaluate(`(TT.zombies || []).filter(z=>z.alive).length`);
        if (aliveCount >= 40 && !results.fps48) {
          console.log(`[FPS] Measuring FPS with ${aliveCount} zombies alive...`);
          await page.evaluate('TT.resetPerf()');
          await sleep(2000);
          const perf = await page.evaluate('TT.perfSnapshot()');
          results.fps48 = perf.fps.toFixed(1);
          console.log(`[FPS] Night 5 with ${aliveCount} zombies: ${results.fps48} fps`);
        }
      }
      
      await sleep(200);
    }
    
    const nightEnd = Date.now();
    results.nightLengths.push((nightEnd - nightStart) / 1000);
    
    // Wait for finisher and dawn
    await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
    await sleep(2000); // let skulls settle
    
    // Lost skulls and S4 (skulls that can't be picked up at dawn)
    const skullsStats = await page.evaluate(`(() => {
      const active = (TT.skulls || []).filter(s => s.active);
      return active.length;
    })()`);
    results.skullsLeft.push(skullsStats);
    
    console.log(`[Night ${n}] Length: ${(nightEnd - nightStart)/1000}s, Skulls left on field: ${skullsStats}`);
    
    // Proceed to Next Night
    if (n < 5) {
      await page.evaluate(`(() => {
        const btn = document.querySelector('button.next-night') || document.querySelector('.next-night') || Array.from(document.querySelectorAll('button')).find(b => b && b.textContent && b.textContent.includes('Next Night'));
        if (btn) btn.click();
      })()`);
      await sleep(2000);
    }
  }

  // End of run checks
  console.log('[Test] Doing intentional death for ways to die check');
  await page.evaluate(`(() => {
    if (TT.playerHp !== undefined) TT.playerHp = 0;
    if (typeof hurtPlayer === 'function') hurtPlayer(9999);
  })()`);
  await page.waitFor(`document.querySelector('.tombstone') || document.getElementById('deathModal')`, { timeout: 10000 }).catch(() => {});
  await sleep(2000);
  
  const padlocks = await page.evaluate(`(() => {
    // Collect all padlocks in the ways to die catalogue
    const items = Array.from(document.querySelectorAll('.dl .d'));
    return items.map(el => ({
      name: el.textContent.trim(),
      unlocked: !el.classList.contains('locked')
    }));
  })()`);
  
  results.waysToDie = padlocks;

  console.log('[Run Complete] Results:');
  console.log(JSON.stringify(results, null, 2));

  await fs.promises.writeFile(path.join(SHOTS_DIR, 'results.json'), JSON.stringify(results, null, 2));

} catch(e) {
  console.error(e);
} finally {
  await browser.close();
  await server.close();
}

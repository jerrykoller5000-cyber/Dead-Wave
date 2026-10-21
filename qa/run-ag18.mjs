// qa/run-ag18.mjs — AG-18 Showcase Dry Run
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-25-AG-18');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchHardwareChrome() {
  const exe = findChrome();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-ag18-chrome-'));
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

try {
  const page = await browser.newPage({ width: 1280, height: 720 });

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

  console.log('\\n>>> NIGHTS 1 TO 3 SHOWCASE DRY RUN <<<');
  await page.goto(`${origin}/index.html?debug=1`);
  await page.evaluate(`localStorage.clear()`);

  // Start
  await page.waitFor('!!window.DWOpening', { timeout: 30000 });
  await page.evaluate(`window.DWOpening.dismissForTesting && window.DWOpening.dismissForTesting()`);
  await page.waitFor('!!window.TT', { timeout: 60000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 30000 });
  await sleep(1000);

  // Play
  await page.evaluate(`(() => {
    const nameInput = document.getElementById('playerName');
    if (nameInput) { nameInput.value = 'DryRun'; nameInput.dispatchEvent(new Event('input', { bubbles: true })); }
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 60000 });
  await sleep(2500);

  // 1. HQ Board and Scouting Report
  const shotHQ = path.join(SHOTS_DIR, '01-hq-board-scouting.png');
  await page.screenshot(shotHQ);
  console.log(`[Shot 01] HQ Board: ${shotHQ}`);

  // 2. Alarm N1
  await page.evaluate(`TT.skipPrep && TT.skipPrep()`);
  await sleep(1500);
  const shotAlarmN1 = path.join(SHOTS_DIR, '02-alarm-n1.png');
  await page.screenshot(shotAlarmN1);
  console.log(`[Shot 02] N1 Alarm: ${shotAlarmN1}`);

  // 3. Kill all but one, then kill last
  await sleep(3000);
  await page.evaluate(`(() => {
    const list = TT.zombies || [];
    for (let i = 1; i < list.length; i++) {
      if (list[i].alive) { list[i].hp = 0; TT.killZombie && TT.killZombie(list[i]); }
    }
  })()`);
  await sleep(1500);
  await page.evaluate(`(() => {
    const list = TT.zombies || [];
    const last = list.find(z => z.alive);
    if (last) { last.hp = 0; TT.killZombie && TT.killZombie(last); }
  })()`);
  await sleep(2000);

  const shotFinisherN1 = path.join(SHOTS_DIR, '03-finisher-n1.png');
  await page.screenshot(shotFinisherN1);
  console.log(`[Shot 03] N1 Finisher: ${shotFinisherN1}`);

  // Wait for Night Complete card
  await sleep(4000);
  const shotCardN1 = path.join(SHOTS_DIR, '04-night-complete-n1.png');
  await page.screenshot(shotCardN1);
  console.log(`[Shot 04] N1 Card: ${shotCardN1}`);

  // 4. Proceed to Morning
  await page.evaluate(`(() => {
    const btn = document.querySelector('button.proceed-morning') || Array.from(document.querySelectorAll('button')).find(b => b && b.textContent && b.textContent.includes('Proceed'));
    if (btn) btn.click();
  })()`);
  await sleep(4000);
  const shotMorning = path.join(SHOTS_DIR, '05-proceed-to-morning.png');
  await page.screenshot(shotMorning);
  console.log(`[Shot 05] Proceeded to Morning: ${shotMorning}`);

  // 5. Day 2 Bounty Cleared and Banked
  await page.evaluate(`(() => {
    TT.addCash && TT.addCash(500);
    TT.addSkulls && TT.addSkulls(50);
    TT.depositAll && TT.depositAll();
  })()`);
  await sleep(1500);
  const shotBounty = path.join(SHOTS_DIR, '06-day2-bounty-banked.png');
  await page.screenshot(shotBounty);
  console.log(`[Shot 06] Day 2 Bounty: ${shotBounty}`);

  // 6. Next Night into Night 3
  await page.evaluate(`TT.skipPrep && TT.skipPrep()`);
  await sleep(4000);
  await page.evaluate(`(() => {
    const list = TT.zombies || [];
    for (let i = 1; i < list.length; i++) {
      if (list[i].alive) { list[i].hp = 0; TT.killZombie && TT.killZombie(list[i]); }
    }
  })()`);
  await sleep(1500);
  await page.evaluate(`(() => {
    const list = TT.zombies || [];
    const last = list.find(z => z.alive);
    if (last) { last.hp = 0; TT.killZombie && TT.killZombie(last); }
  })()`);
  await sleep(4000);

  const shotCardN2 = path.join(SHOTS_DIR, '07-night-complete-n2.png');
  await page.screenshot(shotCardN2);
  console.log(`[Shot 07] N2 Card: ${shotCardN2}`);

  await page.evaluate(`(() => {
    const btn = document.querySelector('button.next-night') || Array.from(document.querySelectorAll('button')).find(b => b && b.textContent && b.textContent.includes('Next Night'));
    if (btn) btn.click();
  })()`);
  await sleep(4000);

  const shotN3 = path.join(SHOTS_DIR, '08-night3-start.png');
  await page.screenshot(shotN3);
  console.log(`[Shot 08] Night 3 Start: ${shotN3}`);

  console.log('\\n[Errors]');
  console.log(page.errors);

} catch(e) {
  console.error(e);
} finally {
  await browser.close();
  await server.close();
}

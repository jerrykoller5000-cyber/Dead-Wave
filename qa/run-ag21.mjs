import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchHardwareChrome() {
  const exe = findChrome();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-ag21-chrome-'));
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
      for (let i = 0; i < 10; i++) {
        try { await fs.promises.rm(profile, { recursive: true, force: true }); break; }
        catch { await sleep(200); }
      }
    }
  };
}

async function run() {
  const port = 5745;
  const server = serve(ROOT, port);
  console.log('[Harness] Server running at http://127.0.0.1:' + port);
  
  const chrome = await launchHardwareChrome();
  
  const results = {};
  
  async function testPage(urlPath, name) {
    console.log('[Test] Loading ' + name + '...');
    const page = await chrome.newPage();
    await page.goto('http://127.0.0.1:' + port + urlPath);
    await sleep(2000); // Give it a little time to load
    
    let fps = 'N/A';
    try {
      // Collect 100 frames worth of time to get average FPS
      fps = await page.evaluate(`(() => {
        return new Promise(resolve => {
          let frames = 0;
          let lastTime = performance.now();
          function loop() {
             frames++;
             if (performance.now() - lastTime >= 1000) {
                resolve(frames);
             } else {
                requestAnimationFrame(loop);
             }
          }
          requestAnimationFrame(loop);
        });
      })()`);
    } catch (err) {
      fps = 'Error: ' + err.message;
    }
    
    console.log('[' + name + '] FPS measured: ' + fps);
    if (page.errors && page.errors.length > 0) {
       console.log('[' + name + '] Errors: ' + page.errors.join(', '));
    }
    results[name] = fps;
    // await page.close();
  }

  await testPage('/studio/motion-lab.html', 'Motion Lab');
  await testPage('/review/motion-marine-marine/index.html', 'Marine Reactions');
  await testPage('/review/zombie-reactions/index.html', 'Zombie Reactions');
  
  await chrome.close();
  server.close();
  
  console.log('\\n[Results] \\n' + JSON.stringify(results, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

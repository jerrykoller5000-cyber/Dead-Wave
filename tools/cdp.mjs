// A very small Chrome driver, spoken straight down the DevTools Protocol.
//
// Why not Playwright: the repo has no build step and no runtime dependencies, and the two
// tools that need a browser (shoot.mjs and the test runner) between them use about eight
// calls — navigate, evaluate, screenshot, and listening for errors and console lines. Node
// 22+ ships a WebSocket client, and every Windows box the game is developed on already has
// Chrome, so driving it directly costs ~150 lines and nothing to install. `npm test` then
// works on a clean clone with no network.
//
// Set CHROME to use a particular binary.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

export function findChrome() {
  for (const c of CHROME_CANDIDATES) {
    try { if (fs.existsSync(c)) return c; } catch { /* keep looking */ }
  }
  throw new Error('No Chrome or Edge found. Set CHROME=<path to chrome.exe>.');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* not up yet */ }
    await sleep(120);
  }
  throw new Error('Chrome did not open its debugging port: ' + url);
}

// One WebSocket to the browser, with every page attached as a "flat" session on the same
// socket. Replies and events are routed by id and sessionId.
class Connection {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message + ' (' + JSON.stringify(msg.error.data ?? '') + ')'));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }
  send(method, params = {}, sessionId, timeoutMs = 120000) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('CDP timeout: ' + method));
        }
      }, timeoutMs);
    });
  }
  onEvent(fn) { this.listeners.push(fn); }
}

class Page {
  constructor(conn, sessionId) {
    this.conn = conn;
    this.sessionId = sessionId;
    this.errors = [];
    this.console = [];
    this._loaded = false;
    conn.onEvent((msg) => {
      if (msg.sessionId !== this.sessionId) return;
      if (msg.method === 'Page.loadEventFired') this._loaded = true;
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails || {};
        const text = (d.exception && (d.exception.description || d.exception.value)) || d.text || 'unknown error';
        this.errors.push(String(text).split('\n').slice(0, 6).join('\n'));
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const t = msg.params.type;
        const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
        this.console.push({ type: t, text });
      }
      if (msg.method === 'Log.entryAdded') {
        const e = msg.params.entry;
        this.console.push({ type: e.level, text: e.text });
      }
    });
  }
  send(method, params, timeoutMs) { return this.conn.send(method, params, this.sessionId, timeoutMs); }
  async setViewport(width, height, dsf = 1) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dsf, mobile: false });
  }
  async goto(url, { waitUntil = 'load', timeout = 120000 } = {}) {
    this._loaded = false;
    await this.send('Page.navigate', { url });
    if (waitUntil === 'none') return;
    const t0 = Date.now();
    while (!this._loaded && Date.now() - t0 < timeout) await sleep(50);
  }
  // Evaluates an expression and returns its value. Awaits promises.
  async evaluate(expression, timeoutMs = 120000) {
    const res = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true, userGesture: true
    }, timeoutMs);
    if (res.exceptionDetails) {
      const d = res.exceptionDetails;
      const text = (d.exception && (d.exception.description || d.exception.value)) || d.text;
      throw new Error('evaluate failed: ' + text);
    }
    return res.result.value;
  }
  // Polls an expression until it is truthy. Returns false on timeout rather than throwing,
  // so callers can report what the page was doing instead of just dying.
  async waitFor(expression, { timeout = 240000, every = 250 } = {}) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { if (await this.evaluate(expression)) return true; } catch { /* page mid-navigation */ }
      await sleep(every);
    }
    return false;
  }
  async screenshot(file) {
    const res = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, Buffer.from(res.data, 'base64'));
    return file;
  }
}

export async function launch({ headless = true, args = [] } = {}) {
  const exe = findChrome();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-chrome-'));
  const flags = [
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--mute-audio',
    // Headless Chrome has no real GPU: SwiftShader gives it WebGL2 so the game renders.
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
    ...(headless ? ['--headless=new'] : []),
    ...args,
    'about:blank'
  ];
  const proc = spawn(exe, flags, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += String(d); });
  // Chrome writes the port it actually took into the profile.
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = null;
  for (let i = 0; i < 200 && port == null; i++) {
    try {
      const txt = await fs.promises.readFile(portFile, 'utf8');
      const first = txt.split('\n')[0].trim();
      if (first) port = Number(first);
    } catch { await sleep(100); }
  }
  if (!port) {
    proc.kill();
    throw new Error('Chrome never reported a debugging port.\n' + stderr.slice(0, 500));
  }
  const version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('could not open the CDP socket')), { once: true });
  });
  const conn = new Connection(ws);

  return {
    exe,
    async newPage({ width = 1280, height = 720 } = {}) {
      // A background tab never gets animation frames, and the suite used to leave every
      // page but one in that state. Each check gets its own window, brought forward, so
      // document.visibilityState stays visible.
      const { targetId } = await conn.send('Target.createTarget', {
        url: 'about:blank', newWindow: true, background: false, width, height
      });
      const { sessionId } = await conn.send('Target.attachToTarget', { targetId, flatten: true });
      const page = new Page(conn, sessionId);
      await page.send('Page.enable', {});
      await page.send('Runtime.enable', {});
      await page.send('Log.enable', {});
      try { await page.send('Page.bringToFront', {}); } catch { /* headless has nothing to raise */ }
      try { await page.send('Page.setWebLifecycleState', { state: 'active' }); } catch { /* older Chrome */ }
      await page.setViewport(width, height);
      return page;
    },
    async close() {
      try { ws.close(); } catch { /* already gone */ }
      try { proc.kill(); } catch { /* already gone */ }
      await sleep(200);
      try { await fs.promises.rm(profile, { recursive: true, force: true }); } catch { /* leave it */ }
    }
  };
}

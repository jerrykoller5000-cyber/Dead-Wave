// GP-19919: launch the live inspector without taking over another process's port.
// The server is reusable only after its health response identifies this checkout.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, INSPECTOR_SERVER_FINGERPRINT } from './serve.mjs';
import {
  assertGameTestSlot,
  registerGameTestProcess,
  releaseGameTestReservation,
  reserveGameTestProcess,
  unregisterGameTestProcess,
} from './game-test-slot.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SAME_ROOT = (a, b) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function serverFiles(root = ROOT) {
  const normalized = process.platform === 'win32' ? path.resolve(root).toLowerCase() : path.resolve(root);
  const key = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  const base = path.join(os.tmpdir(), 'dead-wave-inspector-' + key);
  return { state: base + '.json', log: base + '.log', lock: base + '.lock' };
}
export function probeInspector(port, root = ROOT, timeout = 1000) {
  return new Promise((resolve) => {
    if (!Number.isInteger(port) || port < 1 || port > 65535) return resolve(null);
    let settled = false, deadline;
    const done = (result) => { if (!settled) { settled = true; clearTimeout(deadline); resolve(result); } };
    const req = http.get({ host: '127.0.0.1', port, path: '/__inspect/health', timeout }, (res) => {
      let body = '';
      res.on('data', (part) => { body += part; if (body.length > 8192) { req.destroy(); done(null); } });
      res.on('error', () => done(null));
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          done(res.statusCode === 200 && j.service === 'dead-wave-inspector' && j.version === 1 && j.fingerprint === INSPECTOR_SERVER_FINGERPRINT && typeof j.root === 'string' && SAME_ROOT(j.root, root) ? { ...j, port, origin: 'http://127.0.0.1:' + port } : null);
        } catch { done(null); }
      });
    });
    req.on('error', () => done(null));
    req.on('timeout', () => { req.destroy(); done(null); });
    // A foreign listener may continuously drip bytes; socket inactivity alone is not a readiness deadline.
    deadline = setTimeout(() => { req.destroy(); done(null); }, timeout);
  });
}
async function existing(root, preferredPort) {
  try {
    const state = JSON.parse(fs.readFileSync(serverFiles(root).state, 'utf8'));
    if (typeof state.root === 'string' && SAME_ROOT(state.root, root)) {
      const live = await probeInspector(state.port, root);
      if (live) return live;
    }
  } catch { /* stale or absent state */ }
  return probeInspector(preferredPort, root);
}
export async function startInspectorServer(root = ROOT, preferredPort = 8975) {
  let server;
  try { server = await serve(root, preferredPort); }
  catch (error) { if (error.code !== 'EADDRINUSE') throw error; server = await serve(root, 0); }
  const files = serverFiles(root);
  try { fs.writeFileSync(files.state, JSON.stringify({ root: path.resolve(root), port: server.port, pid: process.pid, started: new Date().toISOString() }) + '\n', 'utf8'); }
  catch (error) { await server.close(); throw error; }
  return server;
}
export async function ensureInspectorServer({ root = ROOT, port = 8975, timeout = 15000 } = {}) {
  const live = await existing(root, port);
  if (live) return { ...live, reused: true };
  const files = serverFiles(root), began = Date.now();
  let lock;
  for (;;) {
    try { lock = fs.openSync(files.lock, 'wx'); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const running = await existing(root, port);
      if (running) return { ...running, reused: true };
      // A crashed launcher leaves a lock, never an ownership right to a port or process.
      try { if (Date.now() - fs.statSync(files.lock).mtimeMs > 30000) fs.unlinkSync(files.lock); } catch { /* raced another launcher */ }
      if (Date.now() - began > timeout) throw new Error('Another inspector launch did not finish. Retry shortly; server log: ' + files.log);
      await sleep(150);
    }
  }
  try {
    const running = await existing(root, port);
    if (running) return { ...running, reused: true };
    const log = fs.openSync(files.log, 'w');
    let child;
    try { child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'server', '--root', path.resolve(root), '--port', String(port)], { cwd: ROOT, detached: true, windowsHide: true, stdio: ['ignore', log, log] }); }
    finally { fs.closeSync(log); }
    let startupError = null;
    child.on('error', (error) => { startupError = error; });
    child.unref();
    while (Date.now() - began <= timeout) {
      if (startupError) throw startupError;
      if (child.exitCode != null) throw new Error('Inspector server exited (' + child.exitCode + '). See ' + files.log);
      const started = await existing(root, port);
      if (started) return { ...started, reused: false };
      await sleep(150);
    }
    throw new Error('Inspector server was not ready after ' + Math.round(timeout / 1000) + ' seconds. See ' + files.log);
  } finally { fs.closeSync(lock); try { fs.unlinkSync(files.lock); } catch { /* already gone */ } }
}

async function openBrowser(url) {
  if (process.platform !== 'win32') throw new Error('This launcher opens Windows browsers. Open ' + url + ' in your browser.');
  await assertGameTestSlot();
  const candidates = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean).map((dir) => path.join(dir, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  const edge = candidates.find((file) => fs.existsSync(file));
  if (!edge) {
    throw new Error(
      'Edge was not found, so the queue cannot track a manual Inspector browser safely.',
    );
  }
  const profile = path.join(os.tmpdir(), 'dead-wave-inspector-' + process.env.DW_GAME_TEST_TOKEN.slice(0, 12));
  const args = ['--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--force_high_performance_gpu', '--start-maximized', '--autoplay-policy=no-user-gesture-required', '--app=' + url];
  const reservationId = await reserveGameTestProcess('Jerry Inspector Edge');
  let browser;
  try {
    browser = spawn(edge, args, { detached: false, windowsHide: false, stdio: 'ignore' });
    await new Promise((resolve, reject) => {
      browser.once('error', reject);
      browser.once('spawn', resolve);
    });
  } catch (error) {
    await releaseGameTestReservation();
    throw error;
  }
  try {
    await registerGameTestProcess(browser.pid, 'Jerry Inspector Edge', undefined, reservationId);
  } catch (error) {
    console.error('Inspector tracking failed; close the new Edge window to keep the slot safe.');
    if (browser.exitCode === null && browser.signalCode === null) {
      await new Promise(resolve => browser.once('exit', resolve));
    }
    await releaseGameTestReservation();
    throw error;
  }
  await new Promise(resolve => browser.once('exit', resolve));
  await unregisterGameTestProcess(browser.pid);
  await fs.promises.rm(profile, { recursive: true, force: true }).catch(() => {});
}
const main = !!process.argv[1] && SAME_ROOT(process.argv[1], fileURLToPath(import.meta.url));
if (main) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 or newer is required. This Node.js is ' + process.versions.node + '.');
    const args = process.argv.slice(2), opt = (key, fallback) => { const at = args.indexOf(key); return at >= 0 ? args[at + 1] : fallback; };
    if (args[0] === 'server') {
      const root = path.resolve(opt('--root', ROOT));
      const s = await startInspectorServer(root, Number(opt('--port', 8975)));
      console.log('Inspector server ready: ' + s.origin + ' (' + root + ')');
    } else {
      if (!args.includes('--no-open') && !process.env.DW_GAME_TEST_TOKEN) {
        const slotScript = fileURLToPath(new URL('./game-test-slot.mjs', import.meta.url));
        const child = spawn(process.execPath, [
          slotScript,
          'run',
          'jerry',
          'MANUAL-INSPECTOR',
          '--checks',
          'Jerry manual Marine Inspector',
          '--minutes',
          '0',
          '--',
          process.execPath,
          fileURLToPath(import.meta.url),
          '--slot-child',
        ], { cwd: ROOT, stdio: 'inherit', env: process.env });
        const outcome = await new Promise((resolve, reject) => {
          child.once('error', reject);
          child.once('exit', (code, signal) => resolve({ code, signal }));
        });
        process.exitCode = outcome.code ?? 1;
      } else {
      const s = await ensureInspectorServer();
      const url = s.origin + '/index.html?inspect' +
        (process.env.DW_GAME_TEST_TOKEN ? '&__gameTestToken=' + encodeURIComponent(process.env.DW_GAME_TEST_TOKEN) : '');
      console.log((s.reused ? 'Reusing' : 'Started') + ' this checkout\'s inspector server: ' + url);
      if (!args.includes('--no-open')) await openBrowser(url);
      }
    }
  } catch (error) { console.error('Inspector could not start: ' + (error.message || error)); process.exitCode = 1; }
}

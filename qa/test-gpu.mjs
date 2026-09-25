import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findChrome } from '../tools/cdp.mjs';

const exe = findChrome();
const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-gpu-test-'));
const flags = [
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=d3d11',
  '--enable-gpu-rasterization',
  '--ignore-gpu-blocklist',
  'about:blank'
];

console.log('Testing Chrome with GPU flags...');
const proc = spawn(exe, flags, { stdio: ['ignore', 'ignore', 'pipe'] });
const portFile = path.join(profile, 'DevToolsActivePort');
let port = null;
for (let i = 0; i < 50 && port == null; i++) {
  try {
    const txt = await fs.promises.readFile(portFile, 'utf8');
    const first = txt.split('\n')[0].trim();
    if (first) port = Number(first);
  } catch { await new Promise(r => setTimeout(r, 100)); }
}

if (!port) {
  proc.kill();
  console.log('Failed to get port');
  process.exit(1);
}

const vRes = await fetch(`http://127.0.0.1:${port}/json/version`);
const version = await vRes.json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));

let nextId = 1;
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => {
    const handler = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
  });
}

const target = await send('Target.createTarget', { url: 'about:blank' });
const session = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const sid = session.sessionId;

function sendSession(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params, sessionId: sid }));
  return new Promise((resolve) => {
    const handler = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
  });
}

await sendSession('Runtime.enable', {});
const evalRes = await sendSession('Runtime.evaluate', {
  expression: `(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return 'NO_GL';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      unmaskedVendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null,
      unmaskedRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null
    };
  })()`,
  returnByValue: true
});

console.log('GPU result:', evalRes.result.value);
proc.kill();
await fs.promises.rm(profile, { recursive: true, force: true });

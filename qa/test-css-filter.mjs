// qa/test-css-filter.mjs — probe: does CDP Page.captureScreenshot capture CSS filters on a 2D canvas?
// Tests with SwiftShader (no hardware GPU) to see if CSS grayscale filter shows in screenshot.
// A RED canvas with grayscale filter should appear GREY if filters are captured.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const exe = findChrome();
const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-csstest-'));
const flags = [
  '--remote-debugging-port=0',
  '--user-data-dir=' + profile,
  '--no-first-run', '--disable-extensions',
  '--disable-background-timer-throttling',
  '--mute-audio',
  '--headless=new',
  '--use-gl=swiftshader',
  'about:blank'
];
const proc = spawn(exe, flags, { stdio: ['ignore', 'ignore', 'pipe'] });
const portFile = path.join(profile, 'DevToolsActivePort');
let port = null;
for (let i = 0; i < 60 && !port; i++) {
  try {
    const t = await fs.promises.readFile(portFile, 'utf8');
    port = Number(t.split('\n')[0].trim());
  } catch { await sleep(100); }
}
console.log('port:', port);

const vRes = await fetch('http://127.0.0.1:' + port + '/json/version');
const v = await vRes.json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));

let nid = 1;
const pend = new Map();
ws.addEventListener('message', ev => {
  let msg; try { msg = JSON.parse(ev.data); } catch { return; }
  if (msg.id && pend.has(msg.id)) {
    const { resolve, reject } = pend.get(msg.id);
    pend.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
});
const send = (method, params = {}) => {
  const id = nid++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => {
    pend.set(id, { resolve: res, reject: rej });
    setTimeout(() => { if (pend.has(id)) { pend.delete(id); rej(new Error('timeout:' + method)); } }, 30000);
  });
};

const { targetId } = await send('Target.createTarget', { url: 'about:blank', newWindow: true, width: 400, height: 300 });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

const psend = (method, params = {}) => {
  const id = nid++;
  ws.send(JSON.stringify({ id, method, params, sessionId }));
  return new Promise((res, rej) => {
    pend.set(id, { resolve: res, reject: rej });
    setTimeout(() => { if (pend.has(id)) { pend.delete(id); rej(new Error('stimeout:' + method)); } }, 30000);
  });
};

await psend('Page.enable', {});
await psend('Runtime.enable', {});
await psend('Emulation.setDeviceMetricsOverride', { width: 400, height: 300, deviceScaleFactor: 1, mobile: false });

// Test 1: 2D canvas with CSS grayscale filter (should appear grey if filter captured)
const html1 = '<canvas id="c" style="filter:grayscale(1)"></canvas>';
await psend('Runtime.evaluate', {
  expression: `
    document.body.style.margin = '0';
    document.body.innerHTML = ${JSON.stringify(html1)};
    const c = document.getElementById('c');
    c.width = 400; c.height = 300;
    const x = c.getContext('2d');
    x.fillStyle = '#ff0000';
    x.fillRect(0, 0, 400, 300);
  `,
  returnByValue: true, awaitPromise: true, userGesture: true
});
await sleep(500);
const res1 = await psend('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
const outFile1 = path.join(ROOT, 'qa', 'shots', 'test-2d-canvas-css-filter.png');
await fs.promises.mkdir(path.dirname(outFile1), { recursive: true });
await fs.promises.writeFile(outFile1, Buffer.from(res1.data, 'base64'));
console.log('Wrote:', outFile1);

// Sample center pixel to check if greyscale was captured
const pixel1 = await psend('Runtime.evaluate', {
  expression: `(() => {
    const c = document.getElementById('c');
    const x = c.getContext('2d');
    const d = x.getImageData(200, 150, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };  // canvas pixel (no filter)
  })()`,
  returnByValue: true, awaitPromise: true, userGesture: true
});
console.log('Canvas pixel (pre-filter, should be pure red):', pixel1.result.value);
console.log('Check the screenshot visually — if grey, CSS filter captured; if red, not captured.');

ws.close();
proc.kill();
await sleep(300);
await fs.promises.rm(profile, { recursive: true, force: true });

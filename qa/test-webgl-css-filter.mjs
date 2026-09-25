// qa/test-webgl-css-filter.mjs — does CSS filter on a WebGL canvas show in CDP screenshot?
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runTest(label, extraFlags) {
  const exe = findChrome();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dw-wgltest-'));
  const flags = [
    '--remote-debugging-port=0',
    '--user-data-dir=' + profile,
    '--no-first-run', '--disable-extensions',
    '--disable-background-timer-throttling',
    '--mute-audio',
    '--headless=new',
    ...extraFlags,
    'about:blank'
  ];
  const proc = spawn(exe, flags, { stdio: ['ignore', 'ignore', 'pipe'] });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = null;
  for (let i = 0; i < 60 && !port; i++) {
    try { const t = await fs.promises.readFile(portFile, 'utf8'); port = Number(t.split('\n')[0].trim()); } catch { await sleep(100); }
  }

  const vRes = await fetch('http://127.0.0.1:' + port + '/json/version');
  const v = await vRes.json();
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let nid = 1; const pend = new Map();
  ws.addEventListener('message', ev => {
    let msg; try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.id && pend.has(msg.id)) { const {resolve,reject}=pend.get(msg.id); pend.delete(msg.id); msg.error?reject(new Error(msg.error.message)):resolve(msg.result); }
  });
  const send = (m, p={}) => { const id=nid++; ws.send(JSON.stringify({id,method:m,params:p})); return new Promise((res,rej)=>{ pend.set(id,{resolve:res,reject:rej}); setTimeout(()=>{if(pend.has(id)){pend.delete(id);rej(new Error('t:'+m));}},30000); }); };
  const {targetId} = await send('Target.createTarget',{url:'about:blank',newWindow:true,width:300,height:200});
  const {sessionId} = await send('Target.attachToTarget',{targetId,flatten:true});
  const ps = (m,p={}) => { const id=nid++; ws.send(JSON.stringify({id,method:m,params:p,sessionId})); return new Promise((res,rej)=>{ pend.set(id,{resolve:res,reject:rej}); setTimeout(()=>{if(pend.has(id)){pend.delete(id);rej(new Error('st:'+m));}},30000); }); };
  await ps('Page.enable',{}); await ps('Runtime.enable',{});
  await ps('Emulation.setDeviceMetricsOverride',{width:300,height:200,deviceScaleFactor:1,mobile:false});

  // Create a WebGL canvas filled with RED, with CSS grayscale filter
  // If CDP captures the filter, the screenshot will be GREY
  await ps('Runtime.evaluate', {
    expression: `
      document.body.style.margin = '0';
      const html = '<canvas id="wgl" width="300" height="200" style="filter:grayscale(1) brightness(1.5)"></canvas>';
      document.body.innerHTML = html;
      const c = document.getElementById('wgl');
      const gl = c.getContext('webgl');
      gl.clearColor(1.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    `,
    returnByValue: true, awaitPromise: true, userGesture: true
  });
  await sleep(600);

  const res = await ps('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const outFile = path.join(ROOT, 'qa', 'shots', 'test-webgl-css-filter-' + label + '.png');
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  await fs.promises.writeFile(outFile, Buffer.from(res.data, 'base64'));
  console.log(label + ': wrote', path.basename(outFile));

  ws.close(); proc.kill();
  await sleep(200);
  await fs.promises.rm(profile, { recursive: true, force: true });
}

// Test with SwiftShader (software rendering — no GPU compositing)
await runTest('swiftshader', ['--use-gl=swiftshader']);

// Test with hardware GPU (ANGLE/D3D11)
await runTest('hardware', ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist']);

console.log('Done. View the two PNGs: grey = filter captured, red = filter NOT captured.');

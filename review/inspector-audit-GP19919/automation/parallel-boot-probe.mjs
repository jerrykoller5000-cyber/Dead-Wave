import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../../tools/serve.mjs';
import { launch } from '../../../tools/cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url))), HERE = path.dirname(fileURLToPath(import.meta.url));
const server = await serve(ROOT, 0), out = { at: new Date().toISOString(), snapshots: [], blockMedia: process.argv.includes('--block-media') };
let browser;
try {
  browser = await launch({ headless: true });
  const pages = await Promise.all(Array.from({ length: 4 }, () => browser.newPage()));
  const requests = new Map();
  pages.forEach((page, i) => page.conn.onEvent((msg) => {
    if (msg.sessionId !== page.sessionId) return;
    if (msg.method === 'Network.requestWillBeSent') requests.set(i + ':' + msg.params.requestId, { page: i, url: msg.params.request.url, type: msg.params.type });
    if (msg.method === 'Network.responseReceived') { const r = requests.get(i + ':' + msg.params.requestId); if (r) { r.status = msg.params.response.status; r.length = msg.params.response.headers['Content-Length']; } }
    if (msg.method === 'Network.loadingFinished') { const r = requests.get(i + ':' + msg.params.requestId); if (r) r.finished = true; }
    if (msg.method === 'Network.loadingFailed') { const r = requests.get(i + ':' + msg.params.requestId); if (r) r.failed = msg.params.errorText; }
    if (msg.method === 'Fetch.requestPaused') page.send('Fetch.failRequest', { requestId: msg.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
  }));
  await Promise.all(pages.map((page) => page.send('Network.enable', {})));
  if (out.blockMedia) await Promise.all(pages.map((page) => page.send('Fetch.enable', { patterns: [{ urlPattern: '*.mp4*', requestStage: 'Request' }] })));
  await Promise.all(pages.map((page) => page.goto(server.origin + '/tools/tests/test-31404.html?debug=1&raf=timer', { waitUntil: 'none' })));
  for (let i = 0; i < 15; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const states = await Promise.all(pages.map(async (page) => ({ loaded: page._loaded, errors: page.errors, state: await page.evaluate("({tt:!!window.TT,load:window.DWLoad&&DWLoad.snapshot(),percent:document.getElementById('openingPercent')&&document.getElementById('openingPercent').textContent,status:document.getElementById('openingStatus')&&document.getElementById('openingStatus').textContent,phase:document.getElementById('opening')&&document.getElementById('opening').dataset.phase})", 12000).catch((e) => ({ failed: e.message })) })));
    out.snapshots.push(states); console.log(JSON.stringify({ tick: i, pages: states.map((s) => ({ loaded: s.loaded, tt: s.state.tt, percent: s.state.percent, error: s.state.failed || s.errors[0] })) }));
    if (states.every((s) => s.state.tt) || states.some((s) => s.state.failed)) break;
  }
  out.console = pages.map((page) => page.console);
  out.requests = [...requests.values()];
} catch (error) { out.failure = String(error.stack || error); console.error(out.failure); }
finally { fs.writeFileSync(path.join(HERE, out.blockMedia ? 'parallel-boot-no-media.json' : process.argv.includes('--after-range') ? 'parallel-boot-after-range.json' : 'parallel-boot-probe.json'), JSON.stringify(out, null, 2), 'utf8'); if (browser) await browser.close(); await server.close(); }
process.exit(out.failure ? 1 : 0);

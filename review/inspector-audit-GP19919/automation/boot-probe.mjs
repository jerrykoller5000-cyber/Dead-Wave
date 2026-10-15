import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../../tools/serve.mjs';
import { launch } from '../../../tools/cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const pagePath = process.argv[2] || '/tools/tests/test-31404.html';
const server = await serve(ROOT, 0);
let browser;
const out = { url: pagePath, at: new Date().toISOString(), snapshots: [], network: [] };
try {
  browser = await launch({ headless: true });
  const page = await browser.newPage();
  page.conn.onEvent((msg) => {
    if (msg.sessionId !== page.sessionId) return;
    if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) out.network.push({ status: msg.params.response.status, url: msg.params.response.url });
    if (msg.method === 'Network.loadingFailed') out.network.push({ failure: msg.params.errorText, type: msg.params.type });
  });
  await page.send('Network.enable', {});
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__auditErrors=[]; addEventListener('error',e=>__auditErrors.push(String(e.error&&e.error.stack||e.message||e.target&&e.target.src)),true); addEventListener('unhandledrejection',e=>__auditErrors.push(String(e.reason&&e.reason.stack||e.reason)));" });
  await page.goto(server.origin + pagePath + '?debug=1&raf=timer', { waitUntil: 'none' });
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const state = await page.evaluate("({tt:!!window.TT, inspect:!!window.DWInspect, title:document.title, load:window.DWLoad&&DWLoad.snapshot(), opening:window.DWOpening&&DWOpening.active, phase:document.getElementById('opening')&&document.getElementById('opening').dataset.phase, percent:document.getElementById('openingPercent')&&document.getElementById('openingPercent').textContent, status:document.getElementById('openingStatus')&&document.getElementById('openingStatus').textContent, err:window.__auditErrors, body:document.body.innerText.slice(-600)})", 20000);
    out.snapshots.push(state); console.log(JSON.stringify({ tick: i, tt: state.tt, phase: state.phase, percent: state.percent, status: state.status, load: state.load&&state.load.state, errors: state.err }));
    if (state.tt || state.err.length) break;
  }
  out.errors = page.errors; out.console = page.console;
  if (out.snapshots.at(-1)?.tt && process.argv.includes('--showmarine')) {
    await page.evaluate('window.DWOpening?.dismissForTesting()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 30000 });
    out.showMarine = await page.evaluate("(async()=>{try{const {boot}=await import('/studio/inspector/inspector.js');const I=await boot(TT.inspectHost(),{mute:true});await I.show('marine');return {ok:true,current:I.current()};}catch(e){return {ok:false,error:e.stack}}})()", 60000);
    console.log(JSON.stringify(out.showMarine));
  }
  if (out.snapshots.at(-1)?.tt && process.argv.includes('--tinspect')) {
    await page.evaluate('window.DWOpening?.dismissForTesting()');
    await page.waitFor('!window.DWOpening || DWOpening.active === false', { timeout: 30000 });
    await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));
    out.tinspect = await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/tinspect.js'), 'utf8'), 200000);
    console.log(out.tinspect);
  }
} catch (error) { out.failure = String(error.stack || error); console.error(out.failure); }
finally {
  fs.writeFileSync(path.join(HERE, process.argv.includes('--tinspect') ? 'tinspect-probe.json' : process.argv.includes('--showmarine') ? 'show-marine-probe.json' : 'boot-probe.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  if (browser) await browser.close(); await server.close();
}
process.exit(out.failure ? 1 : 0); // CDP's per-command timeout timers otherwise keep an already closed probe alive.

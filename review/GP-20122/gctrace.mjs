// GP-20122 (claude2): what the idle hitch at the CIF station is made of. Training, standing at the CIF front, no
// allocation sampling: a 60 s Chrome trace of V8's GC (main thread), and every frame gap over 80 ms. For each long
// frame: which GC events overlap it and their phases. Writes review/GP-20122/gctrace-<label>.json.
// Run through the slot: node crew/crew.mjs slot run claude2 GP-20122 --checks "gc trace 60 s" -- node review/GP-20122/gctrace.mjs <label> [ms]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20122');
const label = process.argv[2] || 'now';
const duration = Math.max(5000, Number(process.argv[3]) || 60000);
const headless = process.env.HEADLESS === '1';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const result = { at: new Date().toISOString(), label, duration, errors: [] };
const server = await serve(root, 0);
const browser = await launch({ headless, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(server.origin + '/index.html?debug=1', { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 400000 })) throw Error('Load not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('!window.DWOpening || window.DWOpening.active===false', { timeout: 500000 });
  await page.evaluate('(()=>{document.getElementById("playerName").value="GP-20122 gc";document.getElementById("modeTraining").click()})()');
  if (!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 400000 })) throw Error('Training entry not ready');
  await page.evaluate('(()=>{const t=TT.trainingDbg.tg(),f=t.stations.cif.front;TT.player.position.set(f.x,t.floorY,f.z)})()');
  await pause(5000);
  result.renderer = await page.evaluate('({backend: TT.renderer.backend?.constructor?.name, isWebGPU: !!TT.renderer.backend?.isWebGPUBackend})');
  const events = [];
  const done = new Promise((resolve) => {
    browser._done = resolve;
  });
  page.conn.onEvent((msg) => {
    if (msg.sessionId && msg.sessionId !== page.sessionId) return;
    if (msg.method === 'Tracing.dataCollected') for (const e of msg.params.value) events.push(e);
    if (msg.method === 'Tracing.tracingComplete') browser._done();
  });
  await page.evaluate('(()=>{const q=window.__gc={last:0,frames:0,gaps:[],running:true,t0:performance.now(),origin:performance.timeOrigin};function f(t){if(!q.running)return;if(q.last&&t-q.last>80)q.gaps.push({at:+q.last.toFixed(1),ms:+(t-q.last).toFixed(1),heapMB:+((performance.memory?.usedJSHeapSize||0)/1e6).toFixed(1)});q.frames++;q.last=t;requestAnimationFrame(f)}requestAnimationFrame(f)})()');
  const tcfg = { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['v8', 'disabled-by-default-v8.gc', 'devtools.timeline', 'blink.user_timing'], recordMode: 'recordContinuously' } };
  let onBrowser = false;
  try { await page.send('Tracing.start', tcfg); } catch (e) { onBrowser = true; await page.conn.send('Tracing.start', tcfg); }
  result.tracedOn = onBrowser ? 'browser' : 'page';
  const heap = [];
  for (let i = 0; i < Math.ceil(duration / 1000); i++) {
    await pause(1000);
    heap.push(await page.evaluate('({t:+performance.now().toFixed(0),heapMB:+((performance.memory?.usedJSHeapSize||0)/1e6).toFixed(1),totalMB:+((performance.memory?.totalJSHeapSize||0)/1e6).toFixed(1)})'));
  }
  const frames = await page.evaluate('(()=>{__gc.running=false;return {frames:__gc.frames,gaps:__gc.gaps,origin:__gc.origin}})()');
  if (onBrowser) await page.conn.send('Tracing.end', {}); else await page.send('Tracing.end', {});
  await Promise.race([done, pause(60000)]);
  result.heap = heap; result.frames = frames.frames; result.gaps = frames.gaps;
  // GC events on the renderer's main thread (the thread with the most V8.GC events).
  const gcEv = events.filter((e) => e.ph === 'X' && /GC|Scavenge|MarkCompact|MinorMS/i.test(e.name));
  const byTid = {}; for (const e of gcEv) byTid[e.pid + ':' + e.tid] = (byTid[e.pid + ':' + e.tid] || 0) + 1;
  const main = events.find((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
  const mainKey = main ? main.pid + ':' + main.tid : Object.entries(byTid).sort((a, b) => b[1] - a[1])[0]?.[0];
  const onMain = gcEv.filter((e) => e.pid + ':' + e.tid === mainKey);
  // Totals by name (main thread), ms.
  const tot = {}; for (const e of onMain) { const t = tot[e.name] || (tot[e.name] = { n: 0, ms: 0, max: 0 }); t.n++; t.ms += e.dur / 1000; t.max = Math.max(t.max, e.dur / 1000); }
  result.gcTotals = Object.fromEntries(Object.entries(tot).sort((a, b) => b[1].ms - a[1].ms).slice(0, 40).map(([k, v]) => [k, { n: v.n, ms: +v.ms.toFixed(1), maxMs: +v.max.toFixed(1) }]));
  // The long GC events (> 30 ms) on the main thread, each with the events nested inside it (> 2 ms).
  const longs = onMain.filter((e) => e.dur > 30000).sort((a, b) => a.ts - b.ts);
  result.longGC = longs.map((L) => ({ name: L.name, ms: +(L.dur / 1000).toFixed(1), args: L.args && JSON.stringify(L.args).slice(0, 300),
    inside: onMain.filter((e) => e !== L && e.ts >= L.ts && e.ts + e.dur <= L.ts + L.dur && e.dur > 2000).map((e) => `${e.name} ${(e.dur / 1000).toFixed(1)}`).slice(0, 40) }));
  result.mainKey = mainKey; result.eventCount = events.length;
  result.errors = page.errors.slice();
  console.log(JSON.stringify({ label, frames: result.frames, gaps: result.gaps, longGC: result.longGC, gcTotals: Object.fromEntries(Object.entries(result.gcTotals).slice(0, 15)), renderer: result.renderer, errors: result.errors.slice(0, 3) }, null, 1).slice(0, 15000));
} catch (error) {
  result.failure = String(error?.stack || error); console.error(result.failure); process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, `gctrace-${label}.json`), JSON.stringify(result, null, 1) + '\n', 'utf8');
  await browser.close(); await server.close();
}

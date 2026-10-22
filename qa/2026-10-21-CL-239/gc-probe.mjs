import { launch } from '../../tools/cdp.mjs';
// gcSummary is bench.mjs's (copied into gcsum.mjs for the probe)
import { gcSummary } from './gcsum.mjs';
const browser = await launch({ headless: true, args: ['--enable-precise-memory-info'] });
const page = await browser.newPage();
await page.send('Page.navigate', { url: 'data:text/html,<p>gc</p>' });
await new Promise((r) => setTimeout(r, 1000));
const tr = { events: [] };
tr.done = new Promise((resolve) => page.conn.onEvent((msg) => { if (msg.sessionId !== page.sessionId) return; if (msg.method === 'Tracing.dataCollected') for (const e of msg.params.value || []) tr.events.push(e); if (msg.method === 'Tracing.tracingComplete') resolve(); }));
await page.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { recordMode: 'recordAsMuchAsPossible', includedCategories: ['disabled-by-default-v8.gc', 'blink.user_timing', '__metadata'] } });
tr.sync = await page.evaluate(`(() => { performance.mark('dw-gc-sync'); const m = performance.getEntriesByName('dw-gc-sync').pop(); return m ? m.startTime : null; })()`);
// 40 "frames" of 50 ms each, allocating garbage, keeping some (old-gen growth)
const spikes = await page.evaluate(`new Promise((res) => { const keep = []; const out = []; let f = 0; const step = () => { const t0 = performance.now(); let a = []; while (performance.now() - t0 < 40) { a.push(new Array(64).fill(f)); if (a.length > 2000) { if (f % 3 === 0) keep.push(a); a = []; } } const t1 = performance.now(); out.push({ frame: f, ms: t1 - t0, t0, t1 }); f++; if (f < 40) setTimeout(step, 5); else res(out); }; step(); })`, 120000);
await page.send('Tracing.end', {});
await Promise.race([tr.done, new Promise((r) => setTimeout(r, 30000))]);
const g = gcSummary(tr, spikes, spikes.length);
console.log(JSON.stringify({ synced: g.synced, main: g.mainThread, events: g.events, totalMs: g.totalMs, perFrameMs: g.perFrameMs, spikesWithGc: g.spikesWithGc, byName: Object.fromEntries(Object.entries(g.byName).slice(0, 8)), first: g.spikes.slice(0, 4) }, null, 1));
await browser.close();
process.exit(0);

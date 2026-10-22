// GP-19951 measurement companion: capture full console lines and DWPerf marks.
// Run only through the crew game-test slot; no game code changes.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const runsAt = args.indexOf('--runs');
const runs = runsAt >= 0 ? Math.max(1, Number(args[runsAt + 1]) || 1) : 1;
const cold = args.includes('--cold');
const profile = args.includes('--loadprof');
const server = await serve(root, 0);
const browser = await launch({ headless: false });
try {
  for (let i = 0; i < runs; i++) {
    const page = await browser.newPage({ width: 1280, height: 720 });
    if (cold) {
      try { await page.send('Network.enable', {}); await page.send('Network.clearBrowserCache', {}); } catch {}
    }
    const t0 = Date.now();
    await page.goto(`${server.origin}/index.html?debug=1${profile ? '&loadprof=1' : ''}`, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await page.evaluate(`(() => {
      const el = document.getElementById('openingProgress');
      if (!el) return;
      const events = window.__gpBarEvents = [[performance.now(), el.style.transform || '']];
      let last = events[0][1];
      new MutationObserver(() => {
        const value = el.style.transform || '';
        if (value !== last) { events.push([performance.now(), value]); last = value; }
      }).observe(el, { attributes: true, attributeFilter: ['style'] });
    })()`);
    for (let k = 0; k < 2; k++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') {
          DWOpening.dismissForTesting(); return true;
        }
        const b = document.getElementById('openingSkip'); if (b) b.click(); return true;
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }
    let title = null;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const active = await page.evaluate('window.DWOpening ? DWOpening.active : null').catch(() => null);
      if (active === false) { title = Date.now() - t0; break; }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const data = await page.evaluate(`(() => ({
      marks: window.TT ? TT.loadMarks() : null,
      perf: window.DWPerf ? DWPerf.report().marks : null,
      segments: window.DWPerf ? DWPerf.report().segments : null,
      bar: (() => {
        const e = window.__gpBarEvents || [], gaps = [];
        for (let j = 1; j < e.length; j++) gaps.push({ ms: Math.round(e[j][0] - e[j - 1][0]), from: e[j - 1][1], to: e[j][1] });
        gaps.sort((a, b) => b.ms - a.ms);
        return { changes: e.length, maxGapMs: gaps[0]?.ms || 0, maxVisuallyStillMs: Math.max(0, (gaps[0]?.ms || 0) - 450), topGaps: gaps.slice(0, 5) };
      })()
    }))()`).catch(() => null);
    const logs = page.console.filter((c) => /^Grave Shift (warm-up|first minute|pre-roll|title):/.test(c.text)).map((c) => c.text);
    const steps = page.console.filter((c) => c.text.startsWith('Grave Shift warm step: ')).map((c) => JSON.parse(c.text.slice('Grave Shift warm step: '.length)));
    console.log(JSON.stringify({ run: i + 1, cold, profile, titleMs: title, ...data, logs, steps }));
    await page.send('Page.close', {}).catch(() => {});
    if (title == null) process.exitCode = 1;
  }
} finally {
  await browser.close();
  await server.close();
}

// tools/loadtime.mjs — how long the game takes to reach its title screen, stage by stage.
//
//   node tools/loadtime.mjs                  foreground, real GPU, warm
//   node tools/loadtime.mjs --bg             same, but with the tab pushed to the background
//   node tools/loadtime.mjs --cold           clear the HTTP cache first
//   node tools/loadtime.mjs --headless       headless with SwiftShader (what CI would see)
//   node tools/loadtime.mjs --runs 3         repeat and report each run
//
// Two of these matter. Foreground is what a player experiences. Background is the case where
// the loader stalls: a browser stops animation frames in a hidden tab, so anything the build
// does per frame stops dead, and the progress bar parks. This tool is here to put numbers on
// both and to show, later, that the fix worked.
//
// The stage numbers come from the game's own loadMark() calls, read back through
// TT.loadMarks(). "title" is the moment the opening overlay hands over, which is the number a
// player would call the load time.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const background = argv.includes('--bg');
const headless = argv.includes('--headless');
const cold = argv.includes('--cold');
const runsIdx = argv.indexOf('--runs');
const RUNS = runsIdx >= 0 ? Math.max(1, Number(argv[runsIdx + 1]) || 1) : 1;
const TIMEOUT = 420000;

const server = await serve(ROOT, 0);
const browser = await launch({ headless });
const url = `${server.origin}/index.html?debug=1${headless ? '&renderer=webgl' : ''}`;
console.log(`loadtime: ${headless ? 'headless (SwiftShader)' : 'headed (real GPU)'}`
  + `, tab ${background ? 'in the BACKGROUND' : 'in front'}`
  + `, cache ${cold ? 'cold' : 'warm'}`);
console.log(`loadtime: ${url}\n`);

const runs = [];
try {
  for (let r = 0; r < RUNS; r++) {
    const page = await browser.newPage({ width: 1280, height: 720 });
    if (cold) { try { await page.send('Network.enable', {}); await page.send('Network.clearBrowserCache', {}); } catch { /* not permitted, carry on */ } }

    // A second tab, activated, is what actually backgrounds the first: the page's
    // visibilityState goes hidden and the browser stops its frames.
    let other = null;
    if (background) {
      other = await browser.newPage({ width: 640, height: 480 });
      await other.goto('about:blank');
    }

    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'none' });
    if (background) await other.send('Page.bringToFront', {}).catch(() => {});

    // Skip the opening video so the measurement is the world build, not the title card.
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }

    // Watch the progress label move, so a stall is visible as a stage that never advances.
    const samples = [];
    let tt = null, title = null, stalled = false;
    const deadline = Date.now() + TIMEOUT;
    let lastLabel = '';
    while (Date.now() < deadline) {
      const s = await page.evaluate(`(() => ({
        vis: document.visibilityState,
        active: window.DWOpening ? window.DWOpening.active : null,
        tt: !!window.TT,
        pct: (document.body.innerText.match(/(\\d+)%/) || [,''])[1],
        label: (document.body.innerText.match(/Loading world|Preparing equipment|Preparing scene|Finishing up|Still loading/i) || [''])[0]
      }))()`).catch(() => null);
      if (!s) break;
      if (s.label && s.label !== lastLabel) {
        lastLabel = s.label;
        samples.push({ at: Date.now() - t0, label: s.label, pct: s.pct, vis: s.vis });
      }
      if (s.tt && tt == null) tt = Date.now() - t0;
      if (s.active === false) { title = Date.now() - t0; break; }
      await new Promise((rr) => setTimeout(rr, 250));
    }
    if (title == null) stalled = true;

    const marks = await page.evaluate('window.TT ? TT.loadMarks() : null').catch(() => null);
    const vis = await page.evaluate('document.visibilityState').catch(() => '?');
    runs.push({ tt, title, stalled, marks, samples, vis });

    console.log(`run ${r + 1}: visibility=${vis}  TT at ${tt == null ? '—' : (tt / 1000).toFixed(1) + 's'}`
      + `  title at ${title == null ? 'NEVER (stalled)' : (title / 1000).toFixed(1) + 's'}`);
    if (marks) {
      let prev = 0;
      for (const m of marks) {
        const ms = Number((m.match(/(\d+)ms$/) || [, 0])[1]);
        console.log(`   ${String(m.replace(/ \d+ms$/, '')).padEnd(34)} ${String(ms).padStart(7)} ms  (+${String(ms - prev).padStart(6)})`);
        prev = ms;
      }
    } else {
      console.log('   no stage timings: the game never got far enough to publish TT.');
    }
    if (samples.length) {
      console.log('   progress labels: ' + samples.map((s) => `${s.label}@${(s.at / 1000).toFixed(1)}s`).join(' → '));
    }
    // The game logs what the shader warm-up cost. That is the gap between "the world is
    // built" and "the title appears", so it is the line that explains the load time.
    for (const c of page.console) {
      if (/pre-roll|warm|compiled/i.test(c.text)) console.log('   log: ' + c.text.slice(0, 160));
    }
    try { await page.send('Page.close', {}); } catch { /* gone */ }
    if (other) { try { await other.send('Page.close', {}); } catch { /* gone */ } }
  }
} finally {
  await browser.close();
  await server.close();
}

const done = runs.filter((r) => r.title != null);
if (done.length) {
  const ms = done.map((r) => r.title);
  console.log(`\ntitle screen: best ${(Math.min(...ms) / 1000).toFixed(1)}s, worst ${(Math.max(...ms) / 1000).toFixed(1)}s`
    + `, mean ${(ms.reduce((a, b) => a + b, 0) / ms.length / 1000).toFixed(1)}s over ${ms.length} run(s)`);
  console.log(`budget (AGENTS.md rule 12): 15 s cold, 5 s warm — ${Math.min(...ms) > 15000 ? 'OVER' : 'within'} the cold budget.`);
}
if (runs.some((r) => r.stalled)) {
  console.log(`\n${runs.filter((r) => r.stalled).length} of ${runs.length} run(s) never reached the title screen inside ${TIMEOUT / 1000}s.`);
  process.exitCode = 1;
}

// GB-166: the map open in the Training Ground (giraffe) and in the real game (map).
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const out = path.join(ROOT, 'handoffs/2026-10-13-grokbot-GB-166'); fs.mkdirSync(out, { recursive: true });
const lib = fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8');
const openMap = `const key = (t) => window.dispatchEvent(new KeyboardEvent(t, { code: 'KeyM', key: 'm', bubbles: true })); const tab = (t) => document.body.dispatchEvent(new KeyboardEvent(t, { code: 'Tab', key: 'Tab', bubbles: true })); tab('keydown'); await wait(80); tab('keyup'); await wait(1200);
  const vis = (id) => { const i = document.querySelector('#' + id + ' img.training-map'); return !!i && getComputedStyle(i).display !== 'none'; };
  return JSON.stringify({ training: !!T.trainingDbg.state().active, fullMap: document.getElementById('fullMap').getAttribute('aria-hidden'), giraffeMini: vis('minimapFrame'), giraffeFull: vis('objectiveMapSurface'), caption: (() => { const c = document.querySelector('#fullMap .training-map-caption'); return c && getComputedStyle(c).display !== 'none' ? c.textContent : null; })(), legend: (document.getElementById('mapLegend') || {}).offsetParent ? 'shown' : 'hidden' });`;
const run = async (training) => {
  const srv = await serve(ROOT); const browser = await launch({ headless: true });
  try {
    const page = await browser.newPage({ width: 1024, height: 640 });
    await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    await page.waitFor('!!window.TT', { timeout: 300000 });
    await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
    await page.evaluate(lib);
    const step = (code) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, 240000);
    if (training) await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
      const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200); await wait(2500); return 1;`);
    else await step(`await startMatch(T, 'Trainee'); T.clearZombies && T.clearZombies(); await wait(2000); return 1;`);
    console.log(training ? 'training' : 'game', await step(openMap));
    await page.screenshot(path.join(out, training ? 'giraffe-map-training.png' : 'giraffe-map-game.png'));
    console.log('errors', JSON.stringify(page.errors || []).slice(0, 600));
  } finally { await browser.close(); await srv.close(); }
};
await run(true); await run(false);

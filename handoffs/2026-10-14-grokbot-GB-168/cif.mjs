// GB-168: the CIF camo list in training (all open) and in the real game (normal locks); the save untouched.
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const out = path.join(ROOT, 'handoffs/2026-10-14-grokbot-GB-168'); fs.mkdirSync(out, { recursive: true });
const lib = fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8');
const look = `const keys = ['tt_unlocks', 'tt_camo', 'tt_wardrobe']; const snap = () => keys.map((k) => localStorage.getItem(k)).join('|');
  const locked = () => document.querySelectorAll('#cifList .locked, #cifList [aria-disabled="true"], #cifList [disabled]').length;
  const open = () => T.CAMO_KEYS.filter((k) => T.camoUnlocksDbg ? T.camoUnlocksDbg().isUnlocked(k) : true).length;`;
const run = async (training) => {
  const srv = await serve(ROOT); const browser = await launch({ headless: true });
  try {
    const page = await browser.newPage({ width: 1024, height: 640 });
    await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
    await page.waitFor('!!window.TT', { timeout: 300000 });
    await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
    await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
    await page.evaluate(lib);
    const step = (code) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${look} ${code} })()`, 240000);
    if (training) await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
      const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200); await wait(2500); return 1;`);
    else await step(`await startMatch(T, 'Trainee'); T.clearZombies && T.clearZombies(); await wait(1500); return 1;`);
    const r = await step(`const s0 = snap(); T.openCIF(); await wait(1200); const L = locked(), items = document.querySelectorAll('#cifList > *').length;
      ${training ? `const pick = T.CAMO_KEYS.find((k) => k !== T.getCamo() && k === 'multicam') || 'multicam'; T.setCamo(pick); await wait(300);` : ''}
      return JSON.stringify({ training: !!(D.state() || {}).active, items, locked: L, camo: T.getCamo(), saveSame: snap() === s0 });`);
    console.log(training ? 'training' : 'game', r);
    await page.screenshot(path.join(out, training ? 'cif-training.png' : 'cif-game.png'));
    if (training) console.log('after leave', await step(`const s0 = snap(); D.leave(); await wait(1500); return JSON.stringify({ camo: T.getCamo(), saveSame: snap() === s0 });`));
    console.log('errors', JSON.stringify(page.errors || []).slice(0, 400));
  } finally { await browser.close(); await srv.close(); }
};
await run(true); await run(false);

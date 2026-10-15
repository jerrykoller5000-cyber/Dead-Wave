// GB-173 close-ups: node handoffs/2026-10-15-grokbot-GB-173/wshots.mjs <before|after>
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const tag = process.argv[2] || 'after', out = path.join(ROOT, 'handoffs/2026-10-15-grokbot-GB-173/shots'); fs.mkdirSync(out, { recursive: true });
// item -> weapon, camera (px,py,pz, tx,ty,tz, fov)
const SHOTS = {
  1: ['aa12', '0.75,-0.12,-0.05, 0,-0.14,-0.05, 30'],      // grip, trigger and drum from the left
  2: ['aa12', '0.55,0.08,-0.75, 0,-0.01,-0.42, 30'],       // the stock, 3/4 from behind
  3: ['aa12', '0.32,0.12,1.25, 0,0.015,0.7, 26'],          // the shroud from in front, into the vents
  4: ['aa12', '0.0,0.172,-0.9, 0,0.168,0.75, 9'],          // down the sight line
  5: ['revolver', '0.28,-0.04,0.03, 0,-0.035,0.02, 26'],   // trigger and guard from the left
  6: ['revolver', '0.22,0.12,-0.28, 0,0.05,-0.04, 30'],    // the rear, 3/4 from behind
  7: ['revolver', '0.34,-0.05,-0.06, 0,-0.07,-0.04, 30'],  // the grip from the left
  8: ['revolver', '0.3,0.06,0.12, 0,0.06,0.08, 28'],       // barrel, cylinder, frame from the left
  9: ['revolver', '0.0,0.125,-0.45, 0,0.12,0.36, 8'],      // down the sight line
  10: ['sniper', '0.5,0.0,-0.15, 0,-0.01,-0.15, 30']       // the wrist above the grip
};
const only = process.argv.slice(3).map(Number);
const srv = await serve(ROOT); const browser = await launch({ headless: true });
try {
  for (const [n, [w, c]] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(+n)) continue;
    const page = await browser.newPage({ width: 720, height: 540 });
    await page.goto(`${srv.origin}/handoffs/2026-10-15-grokbot-GB-173/wprev.html?w=${w}&c=${c.replace(/ /g, '')}`, { timeout: 60000 });
    await page.waitFor('window.DONE === true', { timeout: 90000 });
    const err = await page.evaluate('window.ERR || ""'); if (err) console.log(n, 'ERR', err.slice(0, 300));
    await page.screenshot(path.join(out, `w10-${n}-${tag}.png`)); console.log(n, w, 'ok');
  }
} finally { await browser.close(); srv.close && srv.close(); }

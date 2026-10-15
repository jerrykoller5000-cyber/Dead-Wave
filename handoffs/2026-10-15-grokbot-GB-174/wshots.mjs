// GB-174 close-ups: node handoffs/2026-10-15-grokbot-GB-174/wshots.mjs <before|after>
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const tag = process.argv[2] || 'after', out = path.join(ROOT, 'handoffs/2026-10-15-grokbot-GB-174/shots'); fs.mkdirSync(out, { recursive: true });
// item -> weapon, camera (px,py,pz, tx,ty,tz, fov)
const SHOTS = {
  1: ['revolver', '0.17,0.17,-0.21, 0,0.1,-0.075, 22'],    // hammer, 3/4 from behind and above
  2: ['revolver', '-0.3,0.03,-0.02, 0,0.03,-0.035, 30'],   // right side: latch and grip screws
  3: ['aa12', '0.6,0.12,0.35, 0,0.015,0.4, 30'],           // receiver face to the shroud
  4: ['aa12', '0.22,0.2,0.95, 0,0.11,0.75, 22'],           // front sight, 3/4 from in front
  5: ['sniper', '0.42,0.12,0.05, 0,0.11,0.045, 32'],       // scope rings on the rail
  6: ['sniper', '0.25,-0.06,-0.05, 0,-0.066,-0.05, 22']    // trigger from the left
};
const only = process.argv.slice(3).map(Number);
const srv = await serve(ROOT); const browser = await launch({ headless: true });
try {
  for (const [n, [w, c]] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(+n)) continue;
    const page = await browser.newPage({ width: 720, height: 540 });
    await page.goto(`${srv.origin}/handoffs/2026-10-15-grokbot-GB-174/wprev.html?w=${w}&c=${c.replace(/ /g, '')}`, { timeout: 60000 });
    await page.waitFor('window.DONE === true', { timeout: 90000 });
    const err = await page.evaluate('window.ERR || ""'); if (err) console.log(n, 'ERR', err.slice(0, 300));
    await page.screenshot(path.join(out, `w6-${n}-${tag}.png`)); console.log(n, w, 'ok');
  }
} finally { await browser.close(); srv.close && srv.close(); }

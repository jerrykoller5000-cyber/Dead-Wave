import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-01-AG-49');

async function run() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
    await page.goto(url);
    await page.waitFor('!!window.TT', { timeout: 30000 });
    await page.evaluate(`window.TT.skipPrep()`);
    await page.evaluate(`
      if (window.TT.survivorHelpDbg) {
        window.TT.survivorHelpDbg.grant('okafor');
        window.TT.survivorHelpDbg.grant('brandt');
        window.TT.survivorHelpDbg.grant('pike');
      }
      window.TT.endGame(true); // true = evacuated
    `);
    await page.evaluate('new Promise(r => setTimeout(r, 2000))');
    await page.screenshot(path.join(OUT_DIR, 'desk-09-evac-3-survivors.png'));
    console.log('Shot taken!');
  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

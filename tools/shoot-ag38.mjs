import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-38');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
    console.log("Navigating to", url);
    await page.goto(url);

    await page.waitFor('!!window.TT', { timeout: 60000 });
    
    // get past opening
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    
    // startMatch
    await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'Armory'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // Setup camera view to see the east wall
    await page.evaluate(`(() => {
      const a = TT.HQ_ARMORY_FRONT;
      const c = TT.HQ_CIF_FRONT;
      const midZ = (a.z + c.z) / 2;
      TT.setShotView({
        x: a.x + 12, y: 3, z: midZ,
        tx: a.x, ty: 1, tz: midZ,
        fov: 50
      });
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await page.screenshot(path.join(OUT_DIR, '01-east-wall.png'));
    console.log("Shot 1 taken: east wall");
    await page.evaluate('TT.setShotView(null)');

    // Move to Armory window and press E
    await page.evaluate(`(() => {
      const a = TT.HQ_ARMORY_FRONT;
      TT.player.position.set(a.x, TT.sampleHeight(a.x, a.z), a.z);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await page.evaluate(`TT.doAction()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await page.screenshot(path.join(OUT_DIR, '02-armory-panel.png'));
    console.log("Shot 2 taken: armory panel");

    // Close Armory window using Done
    await page.evaluate(`(() => {
      const done = [...document.querySelectorAll('#armoryPanel .armory-actions button')].pop();
      if (done) done.click();
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Move to CIF window and press E
    await page.evaluate(`(() => {
      const c = TT.HQ_CIF_FRONT;
      TT.player.position.set(c.x, TT.sampleHeight(c.x, c.z), c.z);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await page.evaluate(`TT.doAction()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await page.screenshot(path.join(OUT_DIR, '03-cif-panel.png'));
    console.log("Shot 3 taken: cif panel");

  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

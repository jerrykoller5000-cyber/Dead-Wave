import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-40');
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
    
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    
    await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'Vault'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Move marine to an open spot, place a sandbag, set up camera
    await page.evaluate(`(() => {
      const gx = TT.gridIndex(40), gz = TT.gridIndex(40);
      TT.unlockAllBuilds();
      const bag = TT.placeBuildAt('sandbag', gx, gz, 0);
      
      const box = TT.thinBoxFor(bag);
      const thinX = box.hx < box.hz;
      const half = thinX ? box.hx : box.hz;
      const x = thinX ? box.cx - (half + 0.85) : box.cx;
      const z = thinX ? box.cz : box.cz - (half + 0.85);
      
      TT.player.position.set(x, TT.sampleHeight(x, z), z);
      // turn marine to face it
      TT.marine.rotation.y = thinX ? Math.PI/2 : 0;
      TT.setVelDbg(0, 0);
      window.hopBox = box;
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Set camera to side view to watch the hop
    await page.evaluate(`(() => {
      const p = TT.player.position;
      TT.setShotView({ 
        x: p.x + 3.5, y: p.y + 1, z: p.z + 1.5, 
        tx: p.x, ty: p.y + 0.5, tz: window.hopBox.cz, 
        fov: 50 
      });
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await page.screenshot(path.join(OUT_DIR, '01-standing-at-sandbag.png'));
    console.log("Shot 1 taken");

    // Start vault
    await page.evaluate(`TT.tryVault()`);
    await page.evaluate('new Promise(r => setTimeout(r, 150))');
    await page.screenshot(path.join(OUT_DIR, '02-mid-vault.png'));
    console.log("Shot 2 taken");
    
    // Wait for vault to finish
    await page.evaluate(`(() => new Promise((resolve) => {
      let frames = 0;
      const check = setInterval(() => {
        if (!TT.isVaulting() || frames++ > 40) { clearInterval(check); resolve(); }
      }, 50);
    }))()`);
    await page.evaluate('new Promise(r => setTimeout(r, 100))');
    
    await page.screenshot(path.join(OUT_DIR, '03-after-hop.png'));
    console.log("Shot 3 taken");
    await page.evaluate('TT.setShotView(null)');

  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

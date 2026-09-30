import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-CL-94');
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
    
    await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'Fidelity'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Make sure marine is standing still in the open.
    await page.evaluate(`(() => {
      const p = TT.player.position;
      p.set(0, TT.sampleHeight(0, 0), 0);
      TT.marine.rotation.y = 0; // facing +Z
      TT.setVelDbg(0, 0);
    })()`);

    const takeShots = async (prefix) => {
      // Front (camera at +Z, looking at -Z)
      await page.evaluate(`(() => {
        const m = TT.marine;
        TT.setShotView({ x: m.position.x, y: m.position.y + 1.2, z: m.position.z + 2.5, tx: m.position.x, ty: m.position.y + 1, tz: m.position.z, fov: 40 });
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await page.screenshot(path.join(OUT_DIR, `${prefix}-front.png`));

      // Side (camera at +X)
      await page.evaluate(`(() => {
        const m = TT.marine;
        TT.setShotView({ x: m.position.x + 2.5, y: m.position.y + 1.2, z: m.position.z, tx: m.position.x, ty: m.position.y + 1, tz: m.position.z, fov: 40 });
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await page.screenshot(path.join(OUT_DIR, `${prefix}-side.png`));

      // Back (camera at -Z, looking +Z)
      await page.evaluate(`(() => {
        const m = TT.marine;
        TT.setShotView({ x: m.position.x, y: m.position.y + 1.2, z: m.position.z - 2.5, tx: m.position.x, ty: m.position.y + 1, tz: m.position.z, fov: 40 });
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');
      await page.screenshot(path.join(OUT_DIR, `${prefix}-back.png`));
    };

    // 1. Day - Start Kit
    await page.evaluate(`TT.setWorldTime(1.4)`); // day
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('01-day-start');

    // 2. Night - Start Kit
    await page.evaluate(`TT.setWorldTime(1.0)`); // night
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('02-night-start');

    // 3. Give Gear (Day)
    await page.evaluate(`TT.setWorldTime(1.4)`); // day
    await page.evaluate(`(() => {
      if (TT.awardCash) TT.awardCash(10000);
      TT.buyGear(TT.GEAR.find(g => g.key === 'helmet'));
      TT.buyGear(TT.GEAR.find(g => g.key === 'vest'));
      TT.buyGear(TT.GEAR.find(g => g.key === 'pads'));
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('03-day-geared');

    // 4. Night - Geared
    await page.evaluate(`TT.setWorldTime(1.0)`); // night
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('04-night-geared');

    // Reset camera
    await page.evaluate('TT.setShotView(null)');

    // 5. FPS check with 48 zombies
    await page.evaluate(`(() => {
      for(let i=0; i<48; i++) {
        if (TT.spawnZombie) TT.spawnZombie({x: Math.random()*20 - 10, z: Math.random()*20 - 10});
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 2000))'); // wait to settle
    
    const fps = await page.evaluate(`(() => {
      return window.TT.frameMsAvg ? (1000 / window.TT.frameMsAvg).toFixed(1) : 'N/A';
    })()`);
    console.log("FPS with ~48 zombies:", fps);

  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

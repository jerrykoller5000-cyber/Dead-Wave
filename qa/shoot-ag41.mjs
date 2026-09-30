import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-41');
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
    
    await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'Carry'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Move marine
    await page.evaluate(`(() => {
      const p = TT.player.position;
      p.set(0, TT.sampleHeight(0, 0), 0);
      TT.setVelDbg(0, 0);
      TT.awardCash(20000);
      TT.buyWeapon('m4');
      TT.buyWeapon('shotgun');
      TT.buyWeapon('uzi');
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    const takeShots = async (prefix) => {
      // Back
      await page.evaluate(`(() => {
        const m = TT.marine;
        TT.setShotView({ x: m.position.x, y: m.position.y + 1.2, z: m.position.z - 2.5, tx: m.position.x, ty: m.position.y + 1, tz: m.position.z, fov: 40 });
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await page.screenshot(path.join(OUT_DIR, `${prefix}-back.png`));

      // Side
      await page.evaluate(`(() => {
        const m = TT.marine;
        TT.setShotView({ x: m.position.x + 2.5, y: m.position.y + 1.2, z: m.position.z, tx: m.position.x, ty: m.position.y + 1, tz: m.position.z, fov: 40 });
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await page.screenshot(path.join(OUT_DIR, `${prefix}-side.png`));

      // Front
      await page.evaluate(`(() => {
        const m = TT.marine;
        TT.setShotView({ x: m.position.x, y: m.position.y + 1.2, z: m.position.z + 2.5, tx: m.position.x, ty: m.position.y + 1, tz: m.position.z, fov: 40 });
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 200))');
      await page.screenshot(path.join(OUT_DIR, `${prefix}-front.png`));
    };

    // Unarmed
    await page.evaluate(`TT.toggleHolster()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('01-unarmed');

    // M4
    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('m4'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('02-m4');

    // Shotgun
    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('03-shotgun');

    // Uzi
    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('uzi'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('04-uzi');

    // Fire off shells and magazines
    await page.evaluate(`(() => {
      // set reserve to low
      TT.setAmmoDbg('shotgun', 2);
      TT.setAmmoDbg('m4', 20);
      TT.setAmmoDbg('uzi', 20);
      TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'));
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('05-low-ammo-shotgun');

    await page.evaluate(`TT.toggleHolster()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShots('06-low-ammo-unarmed');

    // reset view
    await page.evaluate('TT.setShotView(null)');

    // fps check
    await page.evaluate(`(() => {
      for(let i=0; i<48; i++) {
        if (TT.spawnZombie) TT.spawnZombie({x: Math.random()*20 - 10, z: Math.random()*20 - 10});
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 2000))');
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

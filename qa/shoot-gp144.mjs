import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-52-GP144');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false }); // Try headful for stability on layout
  const page = await browser.newPage({ width: 1280, height: 720 });
  
  const takeShot = async (name) => {
    console.log('Taking shot:', name);
    await page.screenshot(path.join(OUT_DIR, name));
    console.log('Shot taken:', name);
  };

  try {
    const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
    console.log("Navigating to", url);
    await page.goto(url);

    await page.waitFor('!!window.TT', { timeout: 60000 });
    
    // Skip opening
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    
    // Start
    await page.evaluate(`(() => {
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    await page.waitFor(`(() => {
      const p = window.TT ? window.TT.getPhase() : 'no TT';
      return p === 'prep';
    })()`, { timeout: 60000 });
    
    await page.waitFor(`(() => !document.body.classList.contains('deploying'))()`, { timeout: 60000 });
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // 1. Give money and all weapons
    await page.evaluate(`(() => {
      TT.addCash(50000);
      if (TT.grantAllWeapons) TT.grantAllWeapons();
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // 2. M4 partial magazine
    await page.evaluate(`(() => {
      if (TT.setWeapon) TT.setWeapon(1); // M4
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    // Fire a few rounds
    await page.evaluate(`(() => { const ev = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await page.evaluate(`(() => { const ev = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // We should see a partial magazine on the HUD
    await takeShot('01-m4-partial-mag-hud.png');

    // 3. Reloading state
    await page.evaluate(`(() => { const ev = new KeyboardEvent('keydown', {code: 'KeyR'}); document.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await takeShot('02-m4-reloading-hud.png');
    await page.evaluate('new Promise(r => setTimeout(r, 3000))'); // Wait for reload to finish

    // 4. Revolver
    await page.evaluate(`(() => {
      if (TT.setWeapon) TT.setWeapon(7); // Revolver
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await page.evaluate(`(() => { const ev = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 100))');
    await page.evaluate(`(() => { const ev = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('03-revolver-hud.png');

    // 5. Shotgun (loose ammo, strip should hide)
    await page.evaluate(`(() => {
      if (TT.setWeapon) TT.setWeapon(5); // Shotgun
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('04-shotgun-loose-ammo-hud.png');

    // 6. Action notice placement
    // Look at something like a building ghost to trigger a hint
    await page.evaluate(`(() => {
      const ev = new KeyboardEvent('keydown', {code: 'KeyB'}); document.dispatchEvent(ev);
      if (TT.setBuildGhost) TT.setBuildGhost('door');
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('05-action-notice-placement.png');

    // Return to weapon
    await page.evaluate(`(() => {
      const ev = new KeyboardEvent('keydown', {code: 'KeyB'}); document.dispatchEvent(ev);
    })()`);

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

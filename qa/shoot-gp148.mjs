import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-52-GP148');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false });
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
    
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    
    // Start game
    await page.evaluate(`(() => { const play = document.getElementById('modeHunt'); if (play) play.click(); })()`);
    await page.waitFor(`(() => { const p = window.TT ? window.TT.getPhase() : 'no TT'; return p === 'prep'; })()`, { timeout: 60000 });
    await page.waitFor(`(() => !document.body.classList.contains('deploying'))()`, { timeout: 60000 });
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Give money and weapons
    await page.evaluate(`(() => { TT.addCash(50000); if (TT.grantAllWeapons) TT.grantAllWeapons(); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // --- GP-148: Reload Banners (AK) ---
    await page.evaluate(`(() => { if (TT.setWeapon) TT.setWeapon(1); })()`); 
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    await page.evaluate(`(() => {
       if (TT.setMagazinesDbg) {
           TT.setMagazinesDbg(1, [30, 15, 10]); // Gun has 30, spares have 15, 10
       }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // Fire one round so gun has 29
    await page.evaluate(`(() => { const ev = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 150))');
    await page.evaluate(`(() => { const ev = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Try reloading. Should show GP-148 banners.
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyR'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('01-ak-no-downgrade-reload-banner.png');

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-52-GB133');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false }); // Show browser to avoid some headless timeouts if possible
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

    // 1. Launcher Casing Test
    await page.evaluate(`(() => {
      if (TT.grantAllWeapons) TT.grantAllWeapons();
      if (TT.setWeapon) TT.setWeapon(9); // Launcher
      // Make sure we have ammo
      if (TT.addCash) TT.addCash(1000);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Shoot
    await page.evaluate(`if (TT.stepFireDbg) TT.stepFireDbg(0.1); else { const ev = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(ev); }`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await page.evaluate(`(() => { const ev = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Count casings before reload
    const casingsBefore = await page.evaluate(`(window.casings || []).length`);

    // Reload
    await page.evaluate(`(() => { const ev = new KeyboardEvent('keydown', {code: 'KeyR'}); document.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await takeShot('01-launcher-reload.png');

    // Count casings after reload
    const casingsAfter = await page.evaluate(`(window.casings || []).length`);
    console.log(`Casings before: ${casingsBefore}, after: ${casingsAfter}`);

    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // 2. Grenade Tip Test
    await page.evaluate(`localStorage.removeItem('dw.tips.v1');`); // Reset tips
    await page.evaluate(`(() => { const ev = new KeyboardEvent('keydown', {code: 'KeyG'}); document.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await takeShot('02-grenade-hold-tip.png');
    await page.evaluate(`(() => { const ev = new KeyboardEvent('keyup', {code: 'KeyG'}); document.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

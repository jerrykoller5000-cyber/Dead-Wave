import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-52-GB138');
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

    // 1. Give money and unlock m240
    await page.evaluate(`(() => {
      TT.addCash(50000);
      if (TT.buildUnlocked) TT.buildUnlocked.m240 = true;
      if (TT.grantAllWeapons) TT.grantAllWeapons();
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    await page.evaluate(`(() => {
      const ev = new KeyboardEvent('keydown', {code: 'KeyB'}); document.dispatchEvent(ev);
      // We can't use TT.setBuildGhost directly if it doesn't exist, let's assume it exists or use UI.
      if (TT.setBuildGhost) TT.setBuildGhost('m240');
      // Just click to place
      setTimeout(() => { const click = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(click); }, 200);
      setTimeout(() => { const click = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(click); }, 300);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Look at it and mount it (interact)
    await page.evaluate(`(() => {
      const evB = new KeyboardEvent('keydown', {code: 'KeyB'}); document.dispatchEvent(evB);
      const ev = new KeyboardEvent('keydown', {code: 'KeyE'}); document.dispatchEvent(ev);
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Take shot of HUD while mounted
    await takeShot('01-watchman-manned-hud.png');

    // Fire it to see the flash
    await page.evaluate(`(() => { const ev = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 50))'); // Short delay to catch flash
    await takeShot('02-watchman-flash.png');
    await page.evaluate(`(() => { const ev = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Reload it
    await page.evaluate(`(() => { const ev = new KeyboardEvent('keydown', {code: 'KeyR'}); document.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('03-watchman-reloading-hud.png');

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-52-GP-84');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false });
  
  const takeShot = async (page, name) => {
    console.log('Taking shot:', name);
    await page.screenshot(path.join(OUT_DIR, name));
    console.log('Shot taken:', name);
  };

  const doChecks = async (width, height, suffix) => {
    const page = await browser.newPage({ width, height });
    try {
      const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
      console.log("Navigating to", url, "with size", width, height);
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

      // Check HQ Fieldwork board
      // Go to HQ and interact or just dispatch event
      // We can just look at the screen for HQ or trigger it
      await page.evaluate(`(() => {
        window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'hqWindow' } }));
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 1000))');
      await takeShot(page, `01-hq-fieldwork-${suffix}.png`);

      // Close HQ
      await page.evaluate(`(() => {
        const ev = new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' });
        window.dispatchEvent(ev);
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 500))');

      // Enter Hollow (Iron cave, depth 1)
      await page.evaluate(`TT.enterHollow({ theme: 'iron', cave: 0 })`);
      await page.evaluate('new Promise(r => setTimeout(r, 1000))');
      
      await takeShot(page, `02-hollow-hud-iron-${suffix}.png`);

      // Wait 3 seconds to see battery count down
      await page.evaluate('new Promise(r => setTimeout(r, 3000))');
      await takeShot(page, `03-hollow-battery-countdown-${suffix}.png`);

      // Depth 2
      await page.evaluate(`TT.enterHollow({ theme: 'shale', cave: 1 })`);
      await page.evaluate('new Promise(r => setTimeout(r, 1000))');
      await takeShot(page, `04-hollow-hud-shale-${suffix}.png`);

      // Trigger Stir Warning
      await page.evaluate(`if (TT.stirDbg && TT.stirDbg.trigger) TT.stirDbg.trigger(); else if (TT.stirDbg && TT.stirDbg.wake) TT.stirDbg.wake();`);
      await page.evaluate('new Promise(r => setTimeout(r, 1000))');
      await takeShot(page, `05-hollow-stir-warning-${suffix}.png`);

      // Test tag message (synthetic event)
      await page.evaluate(`window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'pickup', id: 'tag', kind: 'tag' } }));`);
      await page.evaluate('new Promise(r => setTimeout(r, 1000))');
      await takeShot(page, `06-hollow-tag-pickup-${suffix}.png`);

      // Test crate message
      await page.evaluate(`window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'pickup', id: 'crate', kind: 'crate' } }));`);
      await page.evaluate('new Promise(r => setTimeout(r, 1000))');
      await takeShot(page, `07-hollow-crate-pickup-${suffix}.png`);
      
      // Leave Hollow
      await page.evaluate(`TT.leaveHollow()`);
      await page.evaluate('new Promise(r => setTimeout(r, 1000))');
      await takeShot(page, `08-surface-hud-${suffix}.png`);

    } catch (e) {
      console.error(e);
    }
  };

  // await doChecks(1280, 720, '1280x720');
  await doChecks(390, 844, '390px');

  await browser.close();
  await server.close();
}
run().catch(console.error);

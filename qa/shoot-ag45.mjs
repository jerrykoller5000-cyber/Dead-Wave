import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-45');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);

  try {
    for (const vp of [{name: 'desktop', w: 1280, h: 720}, {name: 'mobile', w: 390, h: 844}]) {
      const browser = await launch({ headless: true });
      try {
        const page = await browser.newPage({ width: vp.w, height: vp.h });
        const url = `${server.origin}/index.html?raf=timer&renderer=webgl`;
        console.log(`Navigating to ${server.origin} to set localStorage...`);
        await page.goto(server.origin);
        await page.evaluate(`localStorage.setItem('tt_perf_hud', '1')`);

        console.log(`Navigating to ${url} on ${vp.name}...`);
        await page.goto(url);
        
        console.log("Waiting for window.TT...");
        const ttReady = await page.waitFor('!!window.TT', { timeout: 120000 });
        if (!ttReady) throw new Error("window.TT never appeared");
        
        console.log("Dismissing opening...");
        await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
        await page.evaluate('new Promise(r => setTimeout(r, 300))');
        
        console.log("Calling startMatch...");
        await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'AG-45'))`);
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');

        // We are now in prep. Open the CIF.
        await page.evaluate(`TT.openCIF()`);
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');
        
        // Define helpers
        await page.evaluate(`
          window.clickTab = (text) => {
            const btns = Array.from(document.getElementById('cifTabs').querySelectorAll('button'));
            const b = btns.find(b => b.textContent.toLowerCase().includes(text.toLowerCase()));
            if (b) b.click(); else console.warn('Tab not found:', text);
          };
          window.clickItem = (text) => {
            const btns = Array.from(document.getElementById('cifItems').querySelectorAll('button'));
            const b = btns.find(b => b.textContent.toLowerCase().includes(text.toLowerCase()));
            if (b) b.click(); else console.warn('Item not found:', text);
          };
          window.clickChoice = (text) => {
            const btns = Array.from(document.getElementById('cifList').querySelectorAll('button'));
            const b = btns.find(b => b.textContent.toLowerCase().includes(text.toLowerCase()));
            if (b) { b.click(); } else console.warn('Choice not found:', text);
          };
        `);

        // Hats
        await page.evaluate(`window.clickTab('Head');`);
        await page.evaluate(`window.clickItem('Hat');`);
        const hats = ['cover', 'boonie', 'ballcap', 'cap, back'];
        for (let i = 0; i < hats.length; i++) {
          await page.evaluate(`window.clickChoice('${hats[i]}')`);
          await page.evaluate('new Promise(r => setTimeout(r, 500))');
          await page.screenshot(path.join(OUT_DIR, `cif-hat-${i}-${vp.name}.png`));
        }

        // Eyewear
        await page.evaluate(`window.clickItem('Eyewear');`);
        const glasses = ['aviators', 'viper', 'wayfarer', 'goggles'];
        for (let i = 0; i < glasses.length; i++) {
          await page.evaluate(`window.clickChoice('${glasses[i]}')`);
          await page.evaluate('new Promise(r => setTimeout(r, 500))');
          await page.screenshot(path.join(OUT_DIR, `cif-eye-${i}-${vp.name}.png`));
        }

        // Sleeves rolled with shorts, bare hands, dark skin, grey hair
        await page.evaluate(`window.clickTab('Body');`);
        await page.evaluate(`window.clickItem('Shirt'); window.clickChoice('Rolled');`);
        await page.evaluate(`window.clickItem('Trousers'); window.clickChoice('Shorts');`);
        await page.evaluate(`window.clickItem('Gloves'); window.clickChoice('Bare');`);
        await page.evaluate(`window.clickTab('Him');`);
        await page.evaluate(`window.clickChoice('Tone 6');`);
        await page.evaluate(`window.clickChoice('Grey');`);
        await page.evaluate('new Promise(r => setTimeout(r, 500))');
        await page.screenshot(path.join(OUT_DIR, `cif-him-${vp.name}.png`));

        // Guns tab with camo on M4
        await page.evaluate(`window.clickTab('Guns');`);
        await page.evaluate(`window.clickItem('M4');`);
        await page.evaluate(`window.clickChoice('Flecktarn');`);
        await page.evaluate('new Promise(r => setTimeout(r, 500))');
        await page.screenshot(path.join(OUT_DIR, `cif-guns-${vp.name}.png`));
        
        // Out in the world (Boonie + aviators, NVG down at night)
        // Set boonie and aviators
        await page.evaluate(`window.clickTab('Head');`);
        await page.evaluate(`window.clickItem('Hat'); window.clickChoice('boonie');`);
        await page.evaluate(`window.clickItem('Eyewear'); window.clickChoice('aviators');`);
        // Close CIF
        await page.evaluate(`TT.closeCIF()`);
        await page.evaluate('new Promise(r => setTimeout(r, 500))');
        
        // Set night time and NVG
        await page.evaluate(`
          TT.setWorldTime(0.5); // Midnight
          TT.player.userData.nvg = true;
        `);
        // Wait for night to transition visually if needed (setWorldTime is instant)
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');
        
        // Switch to third person view to see the marine!
        await page.evaluate(`TT.setShotView && TT.setShotView(true)`); // Use setShotView to see marine
        await page.evaluate(`(() => {
          if (TT.getShotView) {
            const P = TT.player.position;
            TT.setAimRay(P.x, P.y + 1.5, P.z, 0, -0.1, -1);
          }
        })()`);
        await page.evaluate('new Promise(r => setTimeout(r, 500))');
        await page.screenshot(path.join(OUT_DIR, `world-night-nvg-${vp.name}.png`));
        
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.close();
  }
}
run().catch(console.error);

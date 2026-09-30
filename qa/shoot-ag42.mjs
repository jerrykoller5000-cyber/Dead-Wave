import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-42');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  
  try {
    for (const vp of [{name: 'desktop', w: 1280, h: 720}, {name: 'mobile', w: 390, h: 844}]) {
      const browser = await launch({ headless: true });
      try {
        const page = await browser.newPage({ width: vp.w, height: vp.h });
        const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
        console.log(`Navigating to ${url} on ${vp.name}...`);
        await page.goto(url);
        
        await page.waitFor('!!window.TT', { timeout: 60000 });
        await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
        await page.evaluate('new Promise(r => setTimeout(r, 300))');
        await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'AG-42'))`);
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');

        const takeKiosk = async (day) => {
          await page.evaluate(`(() => {
            TT.setDay(${day});
            TT.setWorldTime(${day}.1);
            TT.renderShop && TT.renderShop();
            if (TT.openShop) TT.openShop();
            TT.setShopTabDbg('weapons');
          })()`);
          await page.evaluate('new Promise(r => setTimeout(r, 800))');
          await page.screenshot(path.join(OUT_DIR, `${vp.name}-day${day}-kiosk.png`));
          await page.evaluate(`TT.closeShop && TT.closeShop()`);
        };

        await takeKiosk(1);
        await takeKiosk(4);
        
        await page.evaluate(`(() => {
          TT.setDay(10);
          TT.setWorldTime(10.05); // Dawn
        })()`);
        await page.evaluate('new Promise(r => setTimeout(r, 800))');
        await page.screenshot(path.join(OUT_DIR, `${vp.name}-day10-dawn-banner.png`));
        
        await takeKiosk(10);
        await takeKiosk(20);

        await page.evaluate(`(() => {
          TT.awardCash(20000);
          TT.buyWeapon('m4');
          TT.buyWeapon('shotgun');
        })()`);
        await page.evaluate('new Promise(r => setTimeout(r, 500))');
        await page.evaluate(`TT.openWheelDbg && TT.openWheelDbg()`);
        await page.evaluate('new Promise(r => setTimeout(r, 500))');
        await page.screenshot(path.join(OUT_DIR, `${vp.name}-weapon-wheel.png`));
        await page.evaluate(`TT.closeWheelDbg && TT.closeWheelDbg()`);

      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.close();
  }
}
run().catch(console.error);

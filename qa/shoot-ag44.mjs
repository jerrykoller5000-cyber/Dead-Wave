import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-44');
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
        await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'AG-44'))`);
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');

        // Advance to Day 9 morning properly
        await page.evaluate(`(() => {
          TT.skipGrace();
          TT.runDevCommand('godmode');
          for (let d = 1; d < 9; d++) {
            TT.setDay(d); TT.setWorldTime(0.75);
            TT.hqStartWave && TT.hqStartWave();
            if (TT.drainWavePlanDbg) TT.drainWavePlanDbg();
          }
          TT.setDay(9);
          TT.setWorldTime(0.2);
          if (TT.startPrep) TT.startPrep();
        })()`);

        // Wait for wanderer to appear
        await page.waitFor(`(() => {
          return !!TT.zombies.find(z => z.alive && z.poiGuard && z.poiGuard.wanderer);
        })()`);
        
        await page.evaluate('new Promise(r => setTimeout(r, 500))');

        // Position player 30m away looking at colossus
        await page.evaluate(`(() => {
          const g = TT.zombies.find(z => z.alive && z.poiGuard && z.poiGuard.wanderer);
          const P = TT.player.position;
          P.set(g.mesh.position.x, P.y, g.mesh.position.z + 30);
          TT.setAimRay(P.x, P.y + 1.5, P.z, 0, -0.05, -1);
        })()`);
        
        await page.evaluate('new Promise(r => setTimeout(r, 800))');
        await page.screenshot(path.join(OUT_DIR, `after-night-9-colossus-${vp.name}.png`));
        
        // Open HQ Briefing
        await page.evaluate(`TT.openHQBriefingDbg && TT.openHQBriefingDbg()`);
        await page.evaluate('new Promise(r => setTimeout(r, 800))');
        await page.screenshot(path.join(OUT_DIR, `after-night-9-hq-${vp.name}.png`));
        
        await page.evaluate(`window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'briefing-closed' } }))`);
        await page.evaluate(`TT.closeHQBriefingDbg && TT.closeHQBriefingDbg()`);
        await page.evaluate('new Promise(r => setTimeout(r, 500))');

        // Kill it to trigger banner
        await page.evaluate(`(() => {
          const g = TT.zombies.find(z => z.alive && z.poiGuard && z.poiGuard.wanderer);
          TT.damageZombie(g, 9999, { kind: 'generic', dir: { x: 0, z: -1 } });
        })()`);
        
        // Wait just enough for banners to pop up
        await page.evaluate('new Promise(r => setTimeout(r, 400))');
        await page.screenshot(path.join(OUT_DIR, `after-night-9-kill-${vp.name}.png`));
        
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.close();
  }
}
run().catch(console.error);

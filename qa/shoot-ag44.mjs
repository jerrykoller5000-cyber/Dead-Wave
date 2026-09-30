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
        await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'AG-44'))`);
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');

        console.log("Advancing to Day 9...");
        // Advance to Day 9 morning properly
        await page.evaluate(`(async () => {
          TT.skipGrace();
          TT.runDevCommand('godmode');
          if (TT.clearZombies) TT.clearZombies();
          TT.setDay(8);
          TT.setWorldTime(0.2);
          if (TT.startPrep) TT.startPrep();
        })()`);

        console.log("Waiting for wanderer...");

        // Wait for wanderer to appear
        const wandererAppeared = await page.waitFor(`(() => {
          return !!TT.zombies.find(z => z.alive && z.poiGuard && z.poiGuard.wanderer);
        })()`, { timeout: 10000 });
        if (!wandererAppeared) {
          const info = await page.evaluate(`(() => {
            return {
              day: TT.day,
              wandererAllowed: TT.wandererAllowed ? TT.wandererAllowed(TT.day) : 'unknown',
              bountiesDue: TT.bountyDbg().due,
              pathsLength: TT.PATHS ? TT.PATHS.length : 'unknown PATHS',
              trailsLength: TT.wandererTrails ? TT.wandererTrails().length : 'unknown'
            };
          })()`);
          console.log("WANDERER FAILED TO SPAWN! INFO:", info);
          throw new Error("Wanderer did not spawn");
        }
        
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

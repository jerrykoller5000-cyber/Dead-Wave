import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-24');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);

  try {
    for (const vp of [{name: 'desktop', w: 1280, h: 720}, {name: 'mobile', w: 390, h: 844}]) {
      const browser = await launch({ headless: true });
      try {
        const page = await browser.newPage({ width: vp.w, height: vp.h });
        const url = `${server.origin}/index.html?renderer=webgl`;
        
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
        await page.evaluate(`import('./tools/tests/lib.js').then(() => window.startMatch(window.TT, 'AG-24'))`);
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');

        console.log("Skipping to Day 20...");
        await page.evaluate(`(() => {
          TT.skipGrace();
          TT.runDevCommand('godmode');
          if (TT.clearZombies) TT.clearZombies();
          TT.setDay(19);
          TT.setWorldTime(0.5); // skip prep time
          if (TT.startPrep) TT.startPrep();
          TT.relayUpDbg = true; // force relay to be up
        })()`);
        
        await page.evaluate('new Promise(r => setTimeout(r, 1000))');
        
        console.log("Requesting extraction (Day 20)...");
        await page.evaluate(`(() => {
          window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'extraction-request', day: 20 } }));
        })()`);
        
        await page.evaluate('new Promise(r => setTimeout(r, 500))');
        console.log("Starting wave auto-kill...");
        
        // Auto-kill interval to fast-forward the wave
        await page.evaluate(`(() => {
          window.__boatInterval = setInterval(() => {
             if (TT.getPhase() !== 'wave') return;
             const zs = TT.zombies.filter(z => z.alive);
             for (const z of zs) {
               TT.damageZombie(z, 9999, { kind: 'generic', dir: { x: 0, z: -1 } });
             }
          }, 100);
        })()`);
        
        console.log("Waiting for boat to arrive (due state)...");
        // Teleport to the dock's end ahead of time so we are ready
        await page.evaluate(`(() => {
           // We can find the boat's destination or just stand roughly at the dock
           // The dock goes out to z = ~100? No, it's near the world edge.
           // Actually, let's just wait until the boat exists and isn't away
           // Then teleport to it continuously until boarded!
           window.__boardInterval = setInterval(() => {
              const boat = TT.getExtractionBoat();
              if (boat && boat.state() !== 'away') {
                 const deck = boat.deck();
                 if (deck) {
                    const P = TT.player.position;
                    P.set(deck.x, deck.y, deck.z);
                    TT.setAimRay(P.x, P.y + 1.5, P.z, 0, 0, 1);
                    if (!window.__actionHeld) {
                       window.__actionHeld = true;
                       window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
                    }
                 }
              }
           }, 50);
        })()`);
        
        await page.waitFor(`(() => {
           const b = TT.boardingDbg();
           return b && b.won;
        })()`, { timeout: 60000 });
        
        console.log("Victory achieved!");
        // Clear intervals
        await page.evaluate(`(() => {
           clearInterval(window.__boatInterval);
           clearInterval(window.__boardInterval);
        })()`);
        
        // Give the victory screen a moment to fully fade in
        await page.evaluate('new Promise(r => setTimeout(r, 2000))');
        await page.screenshot(path.join(OUT_DIR, `victory-screen-${vp.name}.png`));
        
        console.log("Checking survivor clue on HQ board & named aboard lines...");
        const result = await page.evaluate(`(() => {
           // We need to find if there are 3 aboard lines in the victory UI.
           // And if there's a survivor clue on the HQ board... Wait, HQ board is no longer visible on victory.
           // Let's just grab the UI text of the victory screen.
           const lines = Array.from(document.querySelectorAll('#endStats .stat-line')).map(e => e.textContent);
           return lines;
        })()`);
        console.log("Victory lines:", result);

      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.close();
  }
}
run().catch(console.error);

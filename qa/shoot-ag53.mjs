import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-08-AG-53');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);

  const browser = await launch({ headless: true });
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
    console.log(`Navigating to ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.waitFor('!!window.TT', { timeout: 60000 });
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Tester';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    
    await page.waitFor(`(() => {
      const p = window.TT ? window.TT.getPhase() : 'no TT';
      return p === 'prep';
    })()`, { timeout: 60000 });

    await page.evaluate('new Promise(r => setTimeout(r, 2000))'); // wait for drop animation

    const types = ['shambler', 'feral', 'leaper', 'spider', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber', 'demon', 'colossus', 'guardian', 'caveguard'];

    for (const type of types) {
      console.log('Spawning', type);
      await page.evaluate(`(async (type) => {
        if (window.TT.clearZombies) window.TT.clearZombies();
        const p = window.TT.player;
        // spawn to the top right of screen, which is +x, -z or something in iso
        const z = window.TT.spawnZombie(p.x + 4, p.z - 4, type, true, true);
        if (z) {
          z.riseT = 0; // immediate rise
          z.speed = z.baseSpeed = 0; // don't move
        }
      })('${type}')`);
      
      await page.evaluate('new Promise(r => setTimeout(r, 500))'); // Wait for render
      await page.screenshot(path.join(OUT_DIR, `${type}.png`));
    }
    
    console.log('Group picture...');
    await page.evaluate(`(() => {
      if (window.TT.clearZombies) window.TT.clearZombies();
      const p = window.TT.player;
      const types = ['shambler', 'feral', 'leaper', 'spider', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber', 'demon', 'colossus', 'guardian', 'caveguard'];
      types.forEach((t, i) => {
         const dx = (i % 5) * 2 - 4;
         const dz = Math.floor(i / 5) * -2 - 4;
         const z = window.TT.spawnZombie(p.x + dx, p.z + dz, t, true, true);
         if (z) {
             z.riseT = 0;
             z.speed = z.baseSpeed = 0;
         }
      });
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await page.screenshot(path.join(OUT_DIR, 'group.png'));

  } finally {
    await browser.close();
    await server.close();
  }
}

run().catch(console.error);

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-47');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: true });
  const page = await browser.newPage({ width: 1280, height: 720 });
  try {
    const url = `${server.origin}/index.html?debug=1&raf=timer&renderer=webgl`;
    console.log("Navigating to", url);
    await page.goto(url);

    await page.waitFor('!!window.TT', { timeout: 60000 });
    
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'Carry';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    await page.waitFor(`(() => {
      const p = window.TT ? window.TT.getPhase() : 'no TT';
      console.log('wait prep phase:', p);
      return p === 'prep';
    })()`, { timeout: 60000 });
    
    await page.waitFor(`(() => !document.body.classList.contains('deploying'))()`, { timeout: 60000 });
    
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Teleport to watchtower, set time to night, set pit word
    await page.evaluate(`(() => {
      TT.setWorldTime(0); // Night
      
      const tower = TT.POI.tower;
      if (!tower) { console.error("No tower found!"); return; }
      
      const p = TT.player.position;
      // Deck is at +5.5 from ground, player eye level is ~+1.6. So +7.1 total.
      const gy = TT.sampleHeight(tower.x, tower.z);
      p.set(tower.x, gy + 7.1, tower.z);
      
      TT.setOnTowerDeckDbg(true);
      
      // Aim at the lake (origin 0,0,0)
      TT.setShotView({
        x: p.x, y: p.y, z: p.z,
        tx: 0, ty: TT.sampleHeight(0, 0), tz: 0,
        fov: 55
      });
      
      TT.setPitWord([3,0,6,1,5]);
    })()`);

    // Give it 1 second for the camera override to take effect before the first capture
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    const takeShot = async (name) => {
      console.log('Taking shot:', name);
      await page.screenshot(path.join(OUT_DIR, name));
      console.log('Shot taken:', name);
    };

    // The sequence takes ~5 seconds to light up all stones
    await takeShot('01-flare-1.png');
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('02-flare-2.png');
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('03-flare-3.png');
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('04-flare-4.png');
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('05-flare-5.png');

    // NVG on
    await page.evaluate(`TT.toggleNvgDbg()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('06-nvg-on.png');

    // NVG off
    await page.evaluate(`TT.toggleNvgDbg()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // Pit silenced
    await page.evaluate(`TT.setPitSilenced(true)`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('07-silenced.png');

  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

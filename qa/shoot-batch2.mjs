import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-52-Batch2');
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
    
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    
    // Start game
    await page.evaluate(`(() => { const play = document.getElementById('modeHunt'); if (play) play.click(); })()`);
    await page.waitFor(`(() => { const p = window.TT ? window.TT.getPhase() : 'no TT'; return p === 'prep'; })()`, { timeout: 60000 });
    await page.waitFor(`(() => !document.body.classList.contains('deploying'))()`, { timeout: 60000 });
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Give money and weapons
    await page.evaluate(`(() => { TT.addCash(50000); if (TT.grantAllWeapons) TT.grantAllWeapons(); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // --- GP-145: Minimap Enemy Bearings ---
    await page.evaluate(`(() => { if (TT.clearZombies) TT.clearZombies(); })()`);
    // Spawn enemy at 8m (near) and 25m (far, unseen)
    await page.evaluate(`(() => {
      if (TT.spawnZombieDbg) {
         TT.spawnZombieDbg('shambler', TT.player.position.x + 8, TT.player.position.z);
         TT.spawnZombieDbg('feral', TT.player.position.x - 25, TT.player.position.z);
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('01-minimap-day-bearings.png');

    // Turn camera
    await page.evaluate(`(() => { document.dispatchEvent(new MouseEvent('mousemove', { movementX: 100 })); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('02-minimap-camera-turned.png');

    // Make it night
    await page.evaluate(`(() => { if (TT.setTime) TT.setTime(24); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('03-minimap-night-bearings.png');

    // Return to day
    await page.evaluate(`(() => { if (TT.setTime) TT.setTime(12); })()`);

    // --- GP-146: Map Discovery & Camera ---
    // Open full map
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('04-fullmap-initial.png');
    // Close map
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM'})); })()`);
    
    // Teleport near a cave
    await page.evaluate(`(() => {
      const cave = TT.POI && TT.POI.caves && TT.POI.caves[0];
      if (cave) {
         TT.player.position.set(cave.x + 10, cave.gy || 0, cave.z + 10);
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    // Open map again
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('05-fullmap-discovered-cave.png');
    // Close map
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM'})); })()`);


    // --- GP-147: Mission Markers ---
    // Give a mission (e.g., Radio repair)
    await page.evaluate(`(() => {
      if (TT.objectives && TT.objectives.start) {
          TT.objectives.start('radio-repair');
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('06-minimap-mission-marker.png');
    // Open full map
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('07-fullmap-mission-marker.png');
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM'})); })()`);


    // --- GB-137: Reloads and Magazines ---
    // Try Revolver keep rounds (weapon 7)
    await page.evaluate(`(() => { if (TT.setWeapon) TT.setWeapon(7); })()`); // Revolver
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // Set magazines explicitly using debug or just fire
    await page.evaluate(`(() => { const ev = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 150))');
    await page.evaluate(`(() => { const ev = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // Now it has 5 rounds. Reload.
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyR'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))'); // Wait for reload HUD
    await takeShot('08-revolver-reload-keep.png');

    // Try AK (weapon 1 is M4, let's use M4, logic is the same)
    await page.evaluate(`(() => { if (TT.setWeapon) TT.setWeapon(1); })()`); 
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // Setup magazines such that all spares are emptier than the gun
    await page.evaluate(`(() => {
       if (TT.setMagazinesDbg) {
           TT.setMagazinesDbg(1, [30, 15, 10]); // Gun has 30, spares have 15, 10
       } else if (TT.getStore) {
           // Direct store hack if magDbg not exposed
           const s = TT.getStore();
           s.dispatch({type: 'AMMO_SET_MAGS', weapon: 1, mags: [30, 15, 10]});
       }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // Fire one round so gun has 29
    await page.evaluate(`(() => { const ev = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 150))');
    await page.evaluate(`(() => { const ev = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Try reloading. Should do nothing (or show "no fuller mag").
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyR'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('09-ak-no-downgrade-reload.png');

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

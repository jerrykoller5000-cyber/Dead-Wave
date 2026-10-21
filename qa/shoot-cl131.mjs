import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-52-CL131');
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

    // Give money and unlock everything
    await page.evaluate(`(() => { TT.addCash(50000); if (TT.grantAllWeapons) TT.grantAllWeapons(); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Move to a clear spot
    await page.evaluate(`(() => { TT.player.position.set(20, 0, 20); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // (1) Shouldered Watchman
    await page.evaluate(`(() => {
        // Find Watchman build id. It might be in TT.POI or we just build one directly.
        // Or we can just use the debug spawn if available.
        // "buy and place the Watchman, man it (E), shoulder it (T)"
        // Let's spawn it in front of player
        if (TT.buildsDbg && TT.buildsDbg.placeTurretDbg) {
            TT.buildsDbg.placeTurretDbg('m240', TT.player.position.x + 2, TT.player.position.z + 2, 0);
        } else if (TT.tryPlace) {
             const t = {x: TT.player.position.x + 2, y: 0, z: TT.player.position.z + 2};
             TT.tryPlace('m240', t, 0);
        }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // Mount the turret
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyE'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Shoulder it
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyT'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    await takeShot('01-watchman-shouldered.png');

    // Walk with it
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyW'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('02-watchman-shouldered-walk.png');
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keyup', {code: 'KeyW'})); })()`);

    // (2) Set it down, man it, aim high and low
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyE'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // Man it
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyE'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Aim high
    await page.evaluate(`(() => { document.dispatchEvent(new MouseEvent('mousemove', {movementY: -300})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await takeShot('03-watchman-manned-high.png');

    // Aim low
    await page.evaluate(`(() => { document.dispatchEvent(new MouseEvent('mousemove', {movementY: 600})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    await takeShot('04-watchman-manned-low.png');
    
    // Level it
    await page.evaluate(`(() => { document.dispatchEvent(new MouseEvent('mousemove', {movementY: -300})); })()`);

    // (3) A burst
    await page.evaluate(`(() => { const ev = new MouseEvent('mousedown', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('05-watchman-burst.png');
    await page.evaluate(`(() => { const ev = new MouseEvent('mouseup', {button: 0}); document.body.dispatchEvent(ev); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // Dismount
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyE'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // (4) Mortar shouldered
    await page.evaluate(`(() => {
        if (TT.buildsDbg && TT.buildsDbg.placeTurretDbg) {
            TT.buildsDbg.placeTurretDbg('mortar', TT.player.position.x - 2, TT.player.position.z + 2, 0);
        } else if (TT.tryPlace) {
             const t = {x: TT.player.position.x - 2, y: 0, z: TT.player.position.z + 2};
             TT.tryPlace('mortar', t, 0);
        }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // Face the mortar
    await page.evaluate(`(() => { document.dispatchEvent(new MouseEvent('mousemove', {movementX: -300})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Mount the mortar
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyE'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // Shoulder it
    await page.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyT'})); })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    await takeShot('06-mortar-shouldered.png');


  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

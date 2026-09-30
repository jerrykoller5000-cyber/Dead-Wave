import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-30-AG-46');
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
    
    await page.waitFor(`(() => {
      if (!window.TT || !window.TT.marine) return false;
      const m = window.TT.marine;
      return m.userData.deploying === false || m.position.y < window.TT.sampleHeight(m.position.x, m.position.z) + 1;
    })()`, { timeout: 60000 });
    
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // Move marine
    await page.evaluate(`(() => {
      const p = TT.player.position;
      p.set(30, TT.sampleHeight(30, 30), 30);
      TT.setVelDbg(0, 0);
      
      // Setup camera nicely
      const m = TT.marine;
      TT.setShotView({ x: m.position.x + 2, y: m.position.y + 1, z: m.position.z + 2, tx: m.position.x, ty: m.position.y + 0.8, tz: m.position.z, fov: 40 });
      
      TT.grantAllWeapons();
      // The request says: "grant all, then two primaries, two secondaries and the pistol"
      // If we just takeOutGun, they are put on the marine.
      if (typeof TT.takeOutGun === 'function') {
        TT.takeOutGun('m4');
        TT.takeOutGun('shotgun');
        TT.takeOutGun('uzi');
        TT.takeOutGun('revolver');
        TT.takeOutGun('pistol');
      } else {
        TT.buyWeapon('m4');
        TT.buyWeapon('shotgun');
        TT.buyWeapon('uzi');
        TT.buyWeapon('revolver');
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    const takeShot = async (name) => {
      await page.screenshot(path.join(OUT_DIR, name));
      console.log('Shot taken:', name);
    };

    // Sequence: pistol -> M4 -> Uzi -> revolver -> shotgun -> pistol, and U twice.
    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('pistol'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('01-pistol.png');

    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('m4'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('02-m4.png');

    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('uzi'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('03-uzi.png');

    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('revolver'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('04-revolver.png');

    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('05-shotgun.png');

    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('pistol'))`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('06-pistol.png');

    await page.evaluate(`TT.toggleHolster()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('07-holster.png');

    await page.evaluate(`TT.toggleHolster()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('08-unholster.png');

  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

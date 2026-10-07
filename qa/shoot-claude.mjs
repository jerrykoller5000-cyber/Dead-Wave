import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-10-06-AG-52-Claude');
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
    
    // Skip opening
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') { DWOpening.dismissForTesting(); return true; } const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`);
    
    // Start
    await page.evaluate(`(() => {
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    await page.waitFor(`(() => {
      const p = window.TT ? window.TT.getPhase() : 'no TT';
      return p === 'prep';
    })()`, { timeout: 60000 });
    
    await page.waitFor(`(() => !document.body.classList.contains('deploying'))()`, { timeout: 60000 });
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');

    // 1. Give money and items
    await page.evaluate(`(() => {
      TT.addCash(50000);
      if (TT.grantAllWeapons) TT.grantAllWeapons();
      const own = TT.getGearOwned ? TT.getGearOwned() : null;
      if (own) {
        own.helmet = true;
        own.nvg = true;
        own.insulated = true;
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');

    // --- CL-125: CIF ---
    // Open CIF
    await page.evaluate(`(() => {
      if (TT.openCIF) TT.openCIF();
      else { const ev = new KeyboardEvent('keydown', {code: 'KeyC'}); document.dispatchEvent(ev); }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('01-cif-full-body.png');

    // Select Head tab (Helmet + NVG zoom)
    await page.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('#cif .cif-tab')).find(e => e.textContent.includes('Head'));
      if (btn) btn.click();
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('02-cif-head-zoom-nvg.png');

    // Select Boots tab
    await page.evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('#cif .cif-tab')).find(e => e.textContent.includes('Feet') || e.textContent.includes('Boots'));
      if (btn) btn.click();
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await takeShot('03-cif-boots-zoom.png');

    // Close CIF
    await page.evaluate(`(() => {
      if (TT.closeCIF) TT.closeCIF();
      else { const ev = new KeyboardEvent('keydown', {code: 'Escape'}); document.dispatchEvent(ev); }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');


    // --- CL-127: Radio Mast ---
    // Teleport to Radio Mast
    await page.evaluate(`(() => {
      if (TT.player && TT.player.position) {
         // Assuming radio mast is near 0,0, but it might be generated.
         // Objective target has the location
         const obj = TT.objectives && TT.objectives.getCurrent && TT.objectives.getCurrent();
         if (obj && obj.prop && obj.prop.mesh) {
            TT.player.position.copy(obj.prop.mesh.position);
         }
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('04-radio-cabinet-marker.png');

    // Simulate repair
    await page.evaluate(`(() => {
      if (TT.radioCuesDbg) {
          TT.radioCuesDbg.forceRepair = true;
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('05-radio-repaired-locker.png');


    // --- CL-129: Zombies ---
    // Clear existing, spawn new ones near player
    await page.evaluate(`(() => {
      if (TT.clearZombies) TT.clearZombies();
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // Spawn normal zombies to see faces/clothes
    await page.evaluate(`(() => {
      if (TT.spawnZombieDbg) {
         TT.spawnZombieDbg('shambler', TT.player.position.x + 4, TT.player.position.z + 4);
         TT.spawnZombieDbg('feral', TT.player.position.x - 4, TT.player.position.z + 4);
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('06-zombie-faces-clothes.png');

    // Clear and spawn crawler/hopper
    await page.evaluate(`(() => {
      if (TT.clearZombies) TT.clearZombies();
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    await page.evaluate(`(() => {
      if (TT.spawnZombieDbg) {
         const z1 = TT.spawnZombieDbg('shambler', TT.player.position.x + 3, TT.player.position.z + 3);
         if (z1) z1.crawling = true; // force crawl
         
         const z2 = TT.spawnZombieDbg('shambler', TT.player.position.x - 3, TT.player.position.z + 3);
         if (z2) z2.hopping = true; // force hop
      }
    })()`);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    await takeShot('07-zombie-crawler-hopper.png');

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
    await server.close();
  }
}
run().catch(console.error);

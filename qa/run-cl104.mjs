import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-CL-104');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('[CL-104] Starting script...');
const server = await serve(ROOT, 0);

async function runTest() {
  const browser = await launch({ headless: true });
  const url = `${server.origin}/index.html?debug=1`;
  
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await page.evaluate(`(() => {
      if (window.DWOpening && window.DWOpening.dismissForTesting) {
        window.DWOpening.dismissForTesting();
      }
    })()`);
    await page.waitFor('!!window.TT', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    await wait(1500);

    console.log('[CL-104] Loaded. Spawning in-game...');
    
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'TestMarine';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    
    await page.waitFor(`window.TT && window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 120000 });
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
    await wait(1000);

    console.log('[CL-104] Testing (1) & (2) - Cave poke and aftermath');
    
    await page.evaluate(`(() => {
      const caves = TT.POI.caves;
      const cave = caves[0];
      
      // Look at the cave
      const dx = Math.sin(cave.yaw || 0);
      const dz = Math.cos(cave.yaw || 0);
      TT.player.position.set(cave.x + dx * 2, cave.gy, cave.z + dz * 2);
      TT.setAimYawDbg(Math.atan2(-dx, -dz));
      
      TT.beginScriptedKill('cave', cave);
    })()`);
    
    await page.waitFor(`window.TT.getScriptedKill() && window.TT.getScriptedKill().t >= 1.5`, { timeout: 10000 });
    await page.screenshot(path.join(SHOTS_DIR, '01-ankle-grab.png'));
    
    await page.waitFor(`window.TT.getScriptedKill() && window.TT.getScriptedKill().t >= 5.0`, { timeout: 10000 });
    await page.screenshot(path.join(SHOTS_DIR, '02-aftermath-carry.png'));
    
    await page.waitFor(`window.TT.getScriptedKill() && window.TT.getScriptedKill().t >= 5.8`, { timeout: 10000 });
    await page.screenshot(path.join(SHOTS_DIR, '03-aftermath-toss.png'));
    
  } catch (e) {
    console.error('[CL-104] Error:', e);
  } finally {
    await browser.close();
  }
}

async function runTest3() {
  const browser = await launch({ headless: true });
  const url = `${server.origin}/index.html?debug=1`;
  
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    await page.evaluate(`(() => {
      if (window.DWOpening && window.DWOpening.dismissForTesting) {
        window.DWOpening.dismissForTesting();
      }
    })()`);
    await page.waitFor('!!window.TT', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    await wait(1500);

    console.log('[CL-104] Loaded for Chase. Spawning in-game...');
    
    await page.evaluate(`(() => {
      const nameEl = document.getElementById('playerName');
      if (nameEl) nameEl.value = 'TestMarine';
      const play = document.getElementById('modeHunt');
      if (play) play.click();
    })()`);
    
    await page.waitFor(`window.TT && window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 120000 });
    await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
    await wait(1000);

    console.log('[CL-104] Triggering chase...');
    
    await page.evaluate(`(() => {
      const caves = TT.POI.caves;
      const cave = caves[0];
      const ci = 0;
      
      // Position player 15m away
      const dx = Math.sin(cave.yaw || 0);
      const dz = Math.cos(cave.yaw || 0);
      TT.player.position.set(cave.x + dx * 15, cave.gy, cave.z + dz * 15);
      
      TT.setAimYawDbg(Math.atan2(-dx, -dz));
      
      TT.triggerCavePoke(0);
    })()`);
    
    await page.waitFor(`window.TT.getCavePokeState().warning && window.TT.getCavePokeState().warning.age > window.TT.getCavePokeState().grace`, { timeout: 30000 });
    
    await page.evaluate(`(() => {
      TT.triggerCavePoke(0);
    })()`);
    
    console.log('[CL-104] Waiting for chase drag...');
    await page.waitFor(`window.TT.getScriptedKill && window.TT.getScriptedKill() && window.TT.getScriptedKill().drag === true`, { timeout: 20000 });
    
    await wait(100); 
    await page.screenshot(path.join(SHOTS_DIR, '04-chase-start.png'));
    
    console.log('[CL-104] Kicking...');
    for (let i = 0; i < 4; i++) {
      await page.evaluate(`(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE' }));
      })()`);
      await wait(150);
      await page.screenshot(path.join(SHOTS_DIR, '05-kick-' + i + '.png'));
      await page.evaluate(`(() => {
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', code: 'KeyE' }));
      })()`);
      await wait(350);
    }
    
  } catch (e) {
    console.error('[CL-104] Error in Test 3:', e);
  } finally {
    await browser.close();
  }
}

await runTest();
await runTest3();

server.close();
console.log('[CL-104] Done.');

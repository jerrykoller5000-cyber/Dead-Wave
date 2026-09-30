import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SHOTS_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-29-AG-38');
await fs.promises.mkdir(SHOTS_DIR, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const TASK = "AG-38";
console.log(`[${TASK}] Starting script...`);
const server = await serve(ROOT, 0);

async function shoot(page, name) {
  const p = path.join(SHOTS_DIR, name);
  await page.screenshot({ path: p });
  console.log(`[${TASK}] Saved ${name}`);
}

async function runTest() {
  const browser = await launch({ headless: true });
  const url = `${server.origin}/index.html?debug=1`;
  
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    
    await page.goto(url);
    await page.waitFor('window.TT && window.TT.gameStarted', { timeout: 15000 });

    console.log(`[${TASK}] Loaded. Spawning in-game...`);
    
    // Load lib.js into page
    const libSrc = await fs.promises.readFile(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
    await page.evaluate(libSrc);
    
    await page.evaluate(`(() => {
      return startMatch(window.TT, 'TestMarine');
    })()`);
    console.log(`[${TASK}] Match started and player landed.`);
    await wait(500);

    // Set the shot view to look at both windows on the east wall (CIF and Armory)
    await page.evaluate(`(() => {
      const ax = TT.HQ_ARMORY_FRONT.x;
      const az = TT.HQ_ARMORY_FRONT.z;
      const cx = TT.HQ_CIF_FRONT.x;
      const cz = TT.HQ_CIF_FRONT.z;
      
      const midZ = (az + cz) / 2;
      TT.setShotView({
        x: ax + 5, y: 1.5, z: midZ,
        tx: ax - 1, ty: 1.5, tz: midZ
      });
    })()`);
    await wait(1000);
    
    await shoot(page, '01-east-wall.png');

    console.log(`[${TASK}] Interacting with Armory...`);
    await page.evaluate(`(() => {
      TT.setShotView(null); // Return to player camera
      const player = TT.player;
      player.position.set(TT.HQ_ARMORY_FRONT.x + 1.2, 0, TT.HQ_ARMORY_FRONT.z);
    })()`);
    await wait(1000);

    await page.evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true }));
    })()`);
    await wait(1000);
    await shoot(page, '02-armory-open.png');

    console.log(`[${TASK}] Clicking Done in Armory...`);
    await page.evaluate(`(() => {
      const doneBtn = [...document.querySelectorAll('.armory-actions button')].find(b => b.textContent === 'Done');
      if (doneBtn) doneBtn.click();
      else TT.closeCIF();
    })()`);
    await wait(1000);
    await shoot(page, '03-armory-closed.png');

    console.log(`[${TASK}] Moving to CIF...`);
    await page.evaluate(`(() => {
      const player = TT.player;
      player.position.set(TT.HQ_CIF_FRONT.x + 1.2, 0, TT.HQ_CIF_FRONT.z);
    })()`);
    await wait(1000);
    
    await page.evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true }));
    })()`);
    await wait(1000);
    await shoot(page, '04-cif-open.png');
    
    await page.evaluate(`(() => {
      TT.closeCIF();
    })()`);
    await wait(1000);

    console.log(`[${TASK}] Spawning 48 zombies near HQ...`);
    await page.evaluate(`(() => {
      TT.spawnMegaswarm(48);
    })()`);
    await wait(1500); 
    
    const perf = await page.evaluate(`(() => {
      return TT.perfSnapshot();
    })()`);
    
    await shoot(page, '05-48-zombies.png');
    
    console.log(`[${TASK}] Perf: FPS ${perf.fps}, worst ${perf.worst}, hitch ${perf.hitch}`);
    
    await fs.promises.writeFile(path.join(SHOTS_DIR, 'perf.json'), JSON.stringify(perf, null, 2));
    console.log(`[${TASK}] Done.`);
  } finally {
    await browser.close();
    server.close();
  }
}

runTest().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});

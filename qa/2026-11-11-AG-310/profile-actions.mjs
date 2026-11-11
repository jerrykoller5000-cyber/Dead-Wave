// qa/2026-11-11-AG-310/profile-actions.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);

const server = await serve({ root: ROOT, port: 0 });
const origin = `http://127.0.0.1:${server.port}`;

const browser = await launch({
  headless: false,
  args: [
    '--window-position=-3800,-3800',
    '--window-size=1280,720',
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding'
  ]
});

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${origin}/index.html?debug=1`, { timeout: 60000 });
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 60000 }));

  await page.evaluate(`(() => {
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'AG310_PROF';
    document.getElementById('modeTraining').click();
  })()`);

  assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 60000 }));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 }));

  const breakdown = await page.evaluate(`(async () => {
    const T = TT;
    const tg = T.trainingDbg.tg(), f = tg.stations.armory.front;
    T.player.position.set(f.x, tg.floorY, f.z);
    T.setVelDbg(0, 0);
    T.addCash(1000000);

    // Warm-up armory open
    T.doAction();
    await new Promise(r => setTimeout(r, 200));

    const results = {};
    const timeIt = async (name, fn) => {
      const t0 = performance.now();
      await fn();
      const dt = performance.now() - t0;
      results[name] = +dt.toFixed(2);
    };

    const buyBtn = document.querySelector('#armoryPanel [data-buy-gun="uzi"]');
    if (buyBtn) {
      await timeIt('buy_uzi_click', () => buyBtn.click());
    }

    await timeIt('bench_pistol', () => T.armoryDbg.ui().bench('pistol'));
    
    const modBtn = [...document.querySelectorAll('#armoryPanel .armory-mods li button')].find(b => !b.disabled);
    if (modBtn) {
      await timeIt('modBtn_click', () => modBtn.click());
    }

    const sw = document.querySelector('#armoryPanel .armory-finish:not(.armory-laser) .armory-swatch[data-finish="m81"]:not(:disabled)');
    if (sw) {
      await timeIt('swatch_m81_click', () => sw.click());
    }

    const doneBtn = document.querySelector('#armoryPanel .armory-actions button:last-child');
    if (doneBtn) {
      await timeIt('close_armory_click', () => doneBtn.click());
    }

    return results;
  })()`);

  console.log('Breakdown:', JSON.stringify(breakdown, null, 2));
} finally {
  await browser.close().catch(() => {});
  server.close();
}

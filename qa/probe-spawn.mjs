import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const server = await serve('.', 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  await page.evaluate(`(() => { const b = document.getElementById('openingSkip'); if (b) b.click(); })()`);
  await page.waitFor('!!window.TT', { timeout: 180000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

  await page.evaluate(`(() => {
    document.getElementById('playerName').value = 'TestZ';
    document.getElementById('modeHunt').click();
  })()`);

  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  
  const res = await page.evaluate(`(() => {
    try {
      const z = TT.spawnZombie(0, 0, 'shambler', false, false);
      return { spawned: !!z, count: TT.zombies.length };
    } catch (e) {
      return { err: e.message, stack: e.stack };
    }
  })()`);
  console.log('spawnZombie test:', res);
} finally {
  await browser.close();
  await server.close();
}

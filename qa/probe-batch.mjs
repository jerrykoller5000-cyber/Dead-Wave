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
    document.getElementById('playerName').value = 'TestBatch';
    document.getElementById('modeHunt').click();
  })()`);

  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    const dep = await page.evaluate('document.body.classList.contains("deploying")');
    if (!dep) break;
  }

  await page.evaluate(`(() => {
    TT.setDay(5);
    TT.skipPrep();
  })()`);

  console.log('Wave started. Now calling spawnWaveBatch directly...');
  const res = await page.evaluate(`(() => {
    const log = [];
    for (let i = 0; i < 5; i++) {
      TT.spawnWaveBatch(1.0);
      const st = TT.getWaveDirectorState();
      log.push({
        i,
        zombies: TT.zombies.length,
        spawned: st.waveSpawned,
        total: st.waveTotal,
        queueLen: st.waveQueue.length,
        spawnCd: st.spawnCd,
        burstLeft: st.burstLeft
      });
    }
    return log;
  })()`);
  console.log('spawnWaveBatch results:', res);
} finally {
  await browser.close();
  await server.close();
}

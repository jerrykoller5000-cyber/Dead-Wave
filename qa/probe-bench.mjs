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
  console.log('Ready on menu. Snapshot:', await page.evaluate('TT.perfSnapshot()'));

  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Probe';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  console.log('In prep. Phase:', await page.evaluate('TT.getPhase()'), 'deploying:', await page.evaluate('document.body.classList.contains("deploying")'));

  // Test what happens in day 5
  await page.evaluate(`(() => {
    TT.setDay(5);
    TT.skipPrep();
  })()`);

  console.log('After setDay(5) + skipPrep(). Phase:', await page.evaluate('TT.getPhase()'));

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const s = await page.evaluate('TT.perfSnapshot()');
    const z = await page.evaluate('TT.zombies ? TT.zombies.length : "?"');
    const p = await page.evaluate('TT.getPhase()');
    const d = await page.evaluate('document.body.classList.contains("deploying")');
    const err = await page.evaluate('window.__lastError || null');
    console.log(`t+${i} phase=${p} deploying=${d} zombs=${z} fps=${s.fps.toFixed(1)} low=${s.low.toFixed(1)} worst=${s.worst.toFixed(1)}ms hitches=${s.hitches} frames=${s.frames}`);
  }
} finally {
  await browser.close();
  await server.close();
}

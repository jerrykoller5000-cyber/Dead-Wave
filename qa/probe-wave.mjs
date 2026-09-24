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
    document.getElementById('playerName').value = 'ProbeWave';
    document.getElementById('modeHunt').click();
  })()`);

  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  console.log('In prep.');

  // Wait for deploying cutscene to end
  console.log('Waiting for deploying to clear...');
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    const dep = await page.evaluate('document.body.classList.contains("deploying")');
    if (!dep) { console.log('Deploying cleared at', i*0.5, 's'); break; }
  }

  const beforeSkip = await page.evaluate(`(() => {
    TT.setDay(5);
    return {
      day: TT.getDay(),
      phase: TT.getPhase(),
      director: TT.getWaveDirectorState(),
    };
  })()`);
  console.log('Before skipPrep:', JSON.stringify(beforeSkip, null, 2));

  await page.evaluate('TT.skipPrep()');
  console.log('After skipPrep director:', await page.evaluate('TT.getWaveDirectorState()'));


  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const st = await page.evaluate(`(() => {
      return {
        phase: TT.getPhase(),
        zombies: TT.zombies.length,
        perf: TT.perfSnapshot(),
      };
    })()`);
    console.log('t+' + i + ' phase=' + st.phase + ' zombs=' + st.zombies + ' fps=' + st.perf.fps.toFixed(1) + ' low=' + st.perf.low.toFixed(1) + ' worst=' + st.perf.worst.toFixed(1) + 'ms hitches=' + st.perf.hitches + ' frames=' + st.perf.frames);
  }
} finally {
  await browser.close();
  await server.close();
}

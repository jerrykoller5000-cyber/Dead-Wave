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
    const name = document.getElementById('playerName');
    if (name) name.value = 'ProbeBuild';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);

  await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  console.log('In prep.');

  const check = await page.evaluate(`(() => {
    return {
      unlockAllBuilds: typeof TT.unlockAllBuilds,
      addCash: typeof TT.addCash,
      gridIndex: typeof TT.gridIndex,
      setPlaceMode: typeof TT.setPlaceMode,
      gridCentre: typeof TT.gridCentre,
      sampleHeight: typeof TT.sampleHeight,
      setAimRay: typeof TT.setAimRay,
      beginPlaceClick: typeof TT.beginPlaceClick,
      builds: Array.isArray(TT.builds) ? TT.builds.length : typeof TT.builds,
    };
  })()`);
  console.log('API check:', check);

  // Now run the loop with detailed logging
  const diag = await page.evaluate(`(() => {
    if (typeof TT.unlockAllBuilds === 'function') TT.unlockAllBuilds();
    if (typeof TT.addCash === 'function') TT.addCash(100000);
    const p = TT.player ? TT.player.position : { x: 0, y: 0, z: 0 };
    const gx = typeof TT.gridIndex === 'function' ? TT.gridIndex(p.x) : 0;
    const gz = typeof TT.gridIndex === 'function' ? TT.gridIndex(p.z) : 0;
    if (typeof TT.setPlaceMode === 'function') TT.setPlaceMode('wall');
    
    const logs = [];
    for (let i = 0; i < 10; i++) {
      const tx = typeof TT.gridCentre === 'function' ? TT.gridCentre(gx + 2 + i) : 0;
      const tz = typeof TT.gridCentre === 'function' ? TT.gridCentre(gz + 3) : 0;
      const c = TT.camera ? TT.camera.position : { x: 0, y: 0, z: 0 };
      const ty = typeof TT.sampleHeight === 'function' ? TT.sampleHeight(tx, tz) : 0;
      if (typeof TT.setAimRay === 'function') TT.setAimRay(c.x, c.y, c.z, tx - c.x, ty - c.y, tz - c.z);
      const before = TT.builds ? TT.builds.length : 0;
      let ret = null;
      if (typeof TT.beginPlaceClick === 'function') ret = TT.beginPlaceClick();
      const after = TT.builds ? TT.builds.length : 0;
      logs.push({ i, before, after, ret, tx, tz });
    }
    return logs;
  })()`);
  console.log('Build diag:', diag);

} finally {
  await browser.close();
  await server.close();
}

// qa/2026-10-31-AG-168/run-ag168-shots-fix.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(OUT, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
const W = 1280, H = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`]
});

async function openGamePage(query = '') {
  const page = await browser.newPage({ width: W, height: H });
  const url = `${server.origin}/index.html?debug=1&raf=timer${query}`;
  await page.goto(url, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG168');
    T.clearZombies && T.clearZombies();
    T.setHp(1e5);
    T.grantAllWeapons();
    if (T.setWorldTime) T.setWorldTime(0.42);
    const w = 'pistol';
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf(w));
      await new Promise((r) => setTimeout(r, 150));
    }
    T.setViewFirstDbg(true);
    await new Promise((r) => setTimeout(r, 3500));
    return 1;
  })()`, 300000);
  return page;
}

const takeShot = async (p, name, js = '', settle = 2000) => {
  if (js) await p.evaluate(`(async () => { const T = TT; ${js}; return 1; })()`, 300000);
  await wait(settle);
  const file = path.join(OUT, name + '.png');
  await p.screenshot(file);
  console.log('  shot:', name);
};

try {
  const page = await openGamePage('');
  // 1. Under HQ roof by day (hip and ADS, facing south wall at spawn z = -8.5)
  await takeShot(page, 'vm-hq-roof-hip', 'T.setZoomHeldDbg(false);', 1500);
  await takeShot(page, 'vm-hq-roof-ads', 'T.setZoomHeldDbg(true);', 2500);
  await page.evaluate('TT.setZoomHeldDbg(false)');
  await wait(2000);

  // 2. Walk marine south (+z) right up against the HQ south wall (keeping default south-facing yaw!)
  await takeShot(page, 'vm-wall-hip', `
    for (let i = 0; i < 60; i++) {
      T.player.position.z += 0.08;
      if (T.resolveHardBuildCollisions) T.resolveHardBuildCollisions(T.player.position, T.PLAYER_RADIUS_DBG || 0.38);
    }
  `, 1500);
  const wallPos = await page.evaluate('({ x: TT.player.position.x, y: TT.player.position.y, z: TT.player.position.z })');
  console.log('  wallPos:', JSON.stringify(wallPos));
  await takeShot(page, 'vm-wall-ads', 'T.setZoomHeldDbg(true);', 2500);
  await page.evaluate('TT.setZoomHeldDbg(false)');
  await wait(2000);

  // 3. Outdoor in direct sunlight by day (move outside HQ cabin to z = 10.0, keeping default south-facing yaw!)
  await takeShot(page, 'vm-outdoor-sun-hip', `
    T.player.position.set(0, T.sampleHeight(0, 10), 10);
  `, 2000);

  // 4. Night 20 (without NVG and with NVG, both hip and ADS, keeping default south-facing yaw!)
  await takeShot(page, 'vm-night20-hip', `
    T.runDevCommand('godmode');
    T.devJumpToNight(20, true);
    T.clearZombies && T.clearZombies();
    T.player.position.set(0, T.sampleHeight(0, 10), 10);
    T.setZoomHeldDbg(false);
  `, 4000);
  await takeShot(page, 'vm-night20-hip', 'T.clearZombies && T.clearZombies();', 500);
  await takeShot(page, 'vm-night20-ads', 'T.clearZombies && T.clearZombies(); T.setZoomHeldDbg(true);', 2500);

  await takeShot(page, 'vm-night20-nvg-ads', `
    T.clearZombies && T.clearZombies();
    T.setGearDbg('nvg');
    T.toggleNvgDbg();
  `, 1500);
  await takeShot(page, 'vm-night20-nvg-hip', 'T.clearZombies && T.clearZombies(); T.setZoomHeldDbg(false);', 2500);
  await page.send('Page.close', {});

  // 5. Old first person (&vm=0) against the exact same HQ south wall
  const oldPage = await openGamePage('&vm=0');
  await takeShot(oldPage, 'old-wall-hip', `
    T.player.position.set(${wallPos.x}, ${wallPos.y}, ${wallPos.z});
  `, 1500);
  await takeShot(oldPage, 'old-wall-ads', 'T.setZoomHeldDbg(true);', 2500);
  await oldPage.send('Page.close', {});
} finally {
  await browser.close?.();
  await server.close?.();
}
process.exit(0);

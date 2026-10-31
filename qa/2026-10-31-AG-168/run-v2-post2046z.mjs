// qa/2026-10-31-AG-168/run-v2-post2046z.mjs
// Re-runs vmsheet.mjs --out qa/2026-10-31-AG-168/v2 and the v2 wall/shade/night20 shots after Claude's 20:46Z fixes
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(HERE, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
const OUT_V2 = path.join(HERE, 'v2');
fs.mkdirSync(OUT_V2, { recursive: true });
const W = 1280, H = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('\n=== [vmsheet-v2-post2046z] node tools/vmsheet.mjs --out qa/2026-10-31-AG-168/v2 ===');
spawnSync(process.execPath, ['tools/vmsheet.mjs', '--out', 'qa/2026-10-31-AG-168/v2'], {
  stdio: 'inherit',
  cwd: ROOT,
  env: { ...process.env, DW_SLOT_HELD: '1' }
});

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`]
});

try {
  const page = await browser.newPage({ width: W, height: H });
  const url = `${server.origin}/index.html?debug=1&raf=timer`;
  await page.goto(url, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = TT;
    await startMatch(T, 'AG168v2Post');
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

  const v2Telemetry = await page.evaluate(`(() => {
    const T = TT;
    const d = T.viewmodelDbg();
    const sp = d.space || d.root;
    sp.updateMatrixWorld(true);
    const rootInv = d.root.matrixWorld.clone().invert();
    const inView = (o, p) => { o.updateWorldMatrix(true, false); return p.clone().applyMatrix4(o.matrixWorld).applyMatrix4(rootInv); };
    const A = d.arms;
    const er = d.ndc(inView(A.r.root, new T.THREE.Vector3(A.r.layout.wrist[0], 0, A.r.layout.wrist[2])));
    const el = d.ndc(inView(A.l.root, new T.THREE.Vector3(A.l.layout.wrist[0], 0, A.l.layout.wrist[2])));
    return {
      info: JSON.parse(JSON.stringify(d.info)),
      elbowNdc: { r: er, l: el },
      hiddenCount: d.hidden ? d.hidden.size : null
    };
  })()`);

  const sumFile = path.join(OUT_V2, 'ag168-v2-summary.json');
  const prev = fs.existsSync(sumFile) ? JSON.parse(fs.readFileSync(sumFile, 'utf8')) : {};
  prev.v2TelemetryPost2046Z = v2Telemetry;
  fs.writeFileSync(sumFile, JSON.stringify(prev, null, 2));

  const takeShot = async (name, js = '', settle = 1200) => {
    if (js) await page.evaluate(`(async () => { const T = TT; ${js}; return 1; })()`, 300000);
    await wait(settle);
    await page.screenshot(path.join(OUT_V2, name + '.png'));
    console.log('  shot:', name);
  };

  await takeShot('vm-hq-roof-hip', 'T.setZoomHeldDbg(false);', 1200);
  await takeShot('vm-hq-roof-ads', 'T.setZoomHeldDbg(true);', 2000);
  await page.evaluate('TT.setZoomHeldDbg(false)');
  await wait(1200);

  await takeShot('vm-wall-hip', `
    for (let i = 0; i < 60; i++) {
      T.player.position.z += 0.08;
      if (T.resolveHardBuildCollisions) T.resolveHardBuildCollisions(T.player.position, T.PLAYER_RADIUS_DBG || 0.38);
    }
  `, 1200);
  await takeShot('vm-wall-ads', 'T.setZoomHeldDbg(true);', 2000);
  await page.evaluate('TT.setZoomHeldDbg(false)');
  await wait(1200);

  await takeShot('vm-outdoor-sun-hip', 'T.player.position.set(0, T.sampleHeight(0, 10), 10);', 1200);

  await takeShot('vm-night20-hip', `
    T.runDevCommand('godmode');
    T.devJumpToNight(20, true);
    T.clearZombies && T.clearZombies();
    T.player.position.set(0, T.sampleHeight(0, 10), 10);
    T.setZoomHeldDbg(false);
  `, 3000);
  await takeShot('vm-night20-hip', 'T.clearZombies && T.clearZombies();', 400);
  await takeShot('vm-night20-ads', 'T.clearZombies && T.clearZombies(); T.setZoomHeldDbg(true);', 1800);
  await takeShot('vm-night20-nvg-ads', `
    T.clearZombies && T.clearZombies();
    T.setGearDbg('nvg');
    T.toggleNvgDbg();
  `, 1200);
  await takeShot('vm-night20-nvg-hip', 'T.clearZombies && T.clearZombies(); T.setZoomHeldDbg(false);', 1800);
  await page.send('Page.close', {});
} finally {
  await browser.close?.();
  await server.close?.();
}
process.exit(0);

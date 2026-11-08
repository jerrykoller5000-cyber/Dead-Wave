// GP-20042: paired HQ dusk FPS on the current chainsaw and the stored pre-pass
// constructor. No git operation, one browser, shared game-test slot only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20042/fps-ab.json');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate(`window.DWOpening?.dismissForTesting?.()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  const setup = await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'GP20042AB'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true);
    T.setWorldTime(0.78); T.setZoomHeldDbg(false);
    T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
    await new Promise(r => setTimeout(r, 3000));
    const current = T.weaponMeshes.chainsaw;
    const mod = await import('./qa/weapon-heavy.28137581.js');
    const ins = await import('./tools/marine-inspector.js');
    const before = mod.makeChainsawModel(ins.weaponModelContext());
    before.scale.copy(current.scale);
    window.GP42_AB = { current, before };
    return { backend: T.getRendererBackend(), beforeScale: before.scale.x, currentScale: current.scale.x };
  })()`);
  const runs = [];
  for (const label of ['after', 'before', 'before', 'after']) {
    const run = await page.evaluate(`(async () => {
      const T = window.TT, label = ${JSON.stringify(label)};
      T.weaponMeshes.chainsaw = window.GP42_AB[label === 'after' ? 'current' : 'before'];
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      await new Promise(r => setTimeout(r, 650));
      T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
      await new Promise(r => setTimeout(r, 2600));
      if (T.getCurrentWeapon() !== 'chainsaw' || !T.viewmodelDbg()?.info?.active) throw new Error('view did not rebuild: ' + label);
      T.resetPerf(); await new Promise(r => setTimeout(r, 3000));
      return { label, ...T.perfSnapshot(), weapon: T.getCurrentWeapon(), view: T.viewmodelDbg().info.key };
    })()`);
    runs.push(run);
    console.log(`${label}: ${run.fps.toFixed(2)} fps / ${run.low.toFixed(2)} low / ${run.worst.toFixed(2)} ms worst / ${run.hitches} hitches`);
  }
  const avg = (label, key) => runs.filter(r => r.label === label).reduce((s,r) => s + r[key],0) / 2;
  const result = { setup, runs, mean: { before: avg('before','fps'), after: avg('after','fps'), delta: avg('after','fps') - avg('before','fps') }, errors: page.errors };
  fs.writeFileSync(out, JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({ mean: result.mean, errors: page.errors.length }));
  if (page.errors.length) throw new Error(page.errors[0]);
} finally { await browser.close(); await server.close(); }

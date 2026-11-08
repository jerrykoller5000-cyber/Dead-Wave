// GP-20043: paired HQ dusk FPS on the current launcher and this task's exact
// pre-pass constructor. No git operation, one browser, shared game-test slot only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20043/fps-ab.json');
const prepassPath = path.join(root, 'review/GP-20043/prepass-heavy.js');
let prepass = fs.readFileSync(path.join(root, 'studio/weapon-heavy.js'), 'utf8');
function removeAdded(start, end) {
  const from = prepass.indexOf(start), to = prepass.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`pre-pass boundary missing: ${start}`);
  prepass = prepass.slice(0, from) + prepass.slice(to);
}
removeAdded('  // Side-mounted quadrant backs', '  K.slab([[0.265, -0.05]');
removeAdded('  for (const sx of [-1, 1]) for (const z of [-0.425', '  K.slab([[-0.33, 0.08]');
removeAdded('  for (let i = 0; i < 6; i++) {\n    const a = i * Math.PI / 3', '  const drumRounds = [];');
removeAdded('  K.box(0.045, 0.007, 0.22', '  K.slab([[0.395, -0.02]');
fs.writeFileSync(prepassPath, prepass, 'utf8');
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
    await startMatch(T, 'GP20043AB'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true);
    T.setWorldTime(0.78); T.setZoomHeldDbg(false);
    T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
    await new Promise(r => setTimeout(r, 3000));
    const current = T.weaponMeshes.launcher;
    const mod = await import('./review/GP-20043/prepass-heavy.js');
    const ins = await import('./tools/marine-inspector.js');
    const before = mod.makeLauncherModel(ins.weaponModelContext());
    before.scale.copy(current.scale);
    window.GP43_AB = { current, before };
    return { backend: T.getRendererBackend(), beforeScale: before.scale.x, currentScale: current.scale.x };
  })()`);
  const runs = [];
  for (const label of ['after', 'before', 'before', 'after']) {
    const run = await page.evaluate(`(async () => {
      const T = window.TT, label = ${JSON.stringify(label)};
      T.weaponMeshes.launcher = window.GP43_AB[label === 'after' ? 'current' : 'before'];
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      let until = Date.now() + 9000;
      while (Date.now() < until && T.getCurrentWeapon() !== 'pistol') await new Promise(r => setTimeout(r, 60));
      if (T.getCurrentWeapon() !== 'pistol') throw new Error('pistol switch did not settle: ' + label);
      await new Promise(r => setTimeout(r, 350));
      T.setWeapon(T.WEAPON_ORDER.indexOf('launcher'));
      until = Date.now() + 12000;
      while (Date.now() < until && (T.getCurrentWeapon() !== 'launcher' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg().info.key !== 'launcher' || T.viewmodelDbg().info.raise < .99))
        await new Promise(r => setTimeout(r, 60));
      if (T.getCurrentWeapon() !== 'launcher' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg().info.key !== 'launcher') throw new Error('view did not rebuild: ' + label);
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
} finally { await browser.close(); await server.close(); fs.unlinkSync(prepassPath); }

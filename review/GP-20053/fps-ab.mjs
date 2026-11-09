// GP-20053: paired HQ dusk frame rate on the current shotgun and exact pre-pass builder.
// This writes a temporary source module in this review directory; no git operation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20053/fps-ab.json');
const prepassPath = path.join(root, 'review/GP-20053/prepass-longarms.js');
let prepass = fs.readFileSync(path.join(root, 'studio/weapon-longarms.js'), 'utf8');
function replaceRange(start, end, replacement = '') {
  const from = prepass.indexOf(start), to = prepass.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`pre-pass boundary missing: ${start}`);
  prepass = prepass.slice(0, from) + replacement + prepass.slice(to);
}
function replaceOnce(oldText, newText = '') {
  if (!prepass.includes(oldText)) throw new Error(`pre-pass text missing: ${oldText}`);
  prepass = prepass.replace(oldText, newText);
}
replaceRange('  // Keep the breech separate', '  // The loading port underneath',
  `  K.box(0.004, 0.02, 0.05, gunMetal, HW + 0.0008, 0.018, 0.088, 0, 0, 0, null, 0.001);\n` +
  `  K.box(0.004, 0.02, 0.012, gunMid, HW + 0.0009, 0.018, 0.12, 0, 0, 0, null, 0.001);\n` +
  `  K.box(0.005, 0.006, 0.012, gunDark, HW + 0.0012, 0.027, 0.126, 0, 0, 0, null, 0.0008);\n`);
replaceRange('  for (const sx of [-1, 1]) {\n    K.tor(0.0055', '  K.box(0.018, 0.006, 0.02, gunDark', '');
replaceOnce('  gun.userData.shotgunBolt = shotgunBolt;\n');
replaceRange("  // The barrel's retaining lug loops", '  K.tor(0.01, 0.0035, gunDark',
  `  K.box(0.02, 0.062, 0.02, gunDark, 0, 0.012, 0.76, 0, 0, 0, receiver, 0.003);\n` +
  `  D.screw(receiver, 0.01, 0.012, 0.76, { axis: 'x', side: 1, r: 0.0025, kind: 'hex' });\n`);
replaceOnce("from './gun-detail.js'", "from '../../studio/gun-detail.js'");
fs.writeFileSync(prepassPath, prepass, 'utf8');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720', '--disable-features=CalculateNativeWinOcclusion'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot: ' + JSON.stringify(page.errors));
  await page.evaluate(`window.DWOpening?.dismissForTesting?.()`);
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  const setup = await page.evaluate(`(async () => {
    const T = window.TT;
    await startMatch(T, 'GP20053AB'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true);
    T.setWorldTime(0.78); T.setZoomHeldDbg(false);
    T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));
    await new Promise(r => setTimeout(r, 3000));
    const current = T.weaponMeshes.shotgun;
    const mod = await import('./review/GP-20053/prepass-longarms.js');
    const ins = await import('./tools/marine-inspector.js');
    const before = mod.makeShotgunModel(ins.weaponModelContext());
    before.scale.copy(current.scale);
    window.GP53_AB = { current, before };
    return { backend: T.getRendererBackend(), beforeScale: before.scale.x, currentScale: current.scale.x };
  })()`);
  const runs = [];
  for (const label of ['after', 'before', 'before', 'after']) {
    const run = await page.evaluate(`(async () => {
      const T = window.TT, label = ${JSON.stringify(label)};
      T.weaponMeshes.shotgun = window.GP53_AB[label === 'after' ? 'current' : 'before'];
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      let until = Date.now() + 9000;
      while (Date.now() < until && T.getCurrentWeapon() !== 'pistol') await new Promise(r => setTimeout(r, 60));
      if (T.getCurrentWeapon() !== 'pistol') throw new Error('pistol switch did not settle: ' + label);
      await new Promise(r => setTimeout(r, 350));
      T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));
      until = Date.now() + 12000;
      while (Date.now() < until && (T.getCurrentWeapon() !== 'shotgun' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg().info.key !== 'shotgun' || T.viewmodelDbg().info.raise < .99))
        await new Promise(r => setTimeout(r, 60));
      if (T.getCurrentWeapon() !== 'shotgun' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg().info.key !== 'shotgun') throw new Error('view did not rebuild: ' + label);
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

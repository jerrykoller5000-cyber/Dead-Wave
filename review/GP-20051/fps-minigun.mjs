// GP-20051: paired HQ dusk FPS on the current minigun and this task's exact
// pre-pass constructor. No git operation, one browser, shared game-test slot only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20051/fps-minigun.json');
const prepassPath = path.join(root, 'review/GP-20051/prepass-heavy.js');
let prepass = fs.readFileSync(path.join(root, 'studio/weapon-heavy.js'), 'utf8');
function replaceRange(start, end, replacement = '') {
  const from = prepass.indexOf(start), to = prepass.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`pre-pass boundary missing: ${start}`);
  prepass = prepass.slice(0, from) + replacement + prepass.slice(to);
}
function replaceOnce(oldText, newText = '') {
  if (!prepass.includes(oldText)) throw new Error(`pre-pass text missing: ${oldText}`);
  prepass = prepass.replace(oldText, newText);
}
replaceRange('  // GP-20051/J22: protective chamfered reflex hood', '  // Trigger and guard sit',
  `  // GB-259 (J18, GP-20017): original compact reflex sight.\n` +
  `  K.box(0.04, 0.012, 0.07, gunDark, 0, 0.2835, 0.01, 0, 0, 0, null, 0.003);\n` +
  `  for (const sx of [-1, 1]) K.box(0.005, 0.072, 0.06, gunDark, sx * 0.024, 0.325, 0.01, 0, 0, 0, null, 0.0015);\n` +
  `  K.box(0.053, 0.008, 0.06, gunDark, 0, 0.365, 0.01, 0, 0, 0, null, 0.002);\n` +
  `  const reflexGlass = Object.assign(glassMat.clone(), { transparent: true, opacity: 0.18, depthWrite: false });\n` +
  `  K.box(0.043, 0.064, 0.003, reflexGlass, 0, 0.325, 0.035);\n` +
  `  K.box(0.0035, 0.0035, 0.002, sightDotMat, 0, 0.330, 0.0355);\n` +
  `  K.tor(0.0075, 0.0006, sightDotMat, 0, 0.330, 0.0355, 0, 0, 0, null, Math.PI * 2, 24);\n`);
replaceRange('  // GP-20051/J21: the visible linked rounds', '  // The feed throat is enclosed',
  `  for (let i = 0; i < 9; i++) {\n` +
  `    const u = i / 8, x = 0.20 - u * 0.046, y = 0.022 + u * 0.074;\n` +
  `    K.box(0.055, 0.012, 0.064, gunDark, x, y, 0.027 - u * 0.035, 0, 0, -0.4, null, 0.002);\n` +
  `    K.cyl(0.005, 0.005, 0.052, brassMat, x + 0.004, y + 0.002, 0.027 - u * 0.035, null, 6);\n` +
  `  }\n`);
replaceOnce('  K.box(0.064, 0.055, 0.103, gunDark, 0.172, 0.111, 0.034, 0, 0, -0.12, null, 0.006);',
  '  K.box(0.064, 0.035, 0.103, gunDark, 0.172, 0.121, 0.034, 0, 0, -0.12, null, 0.006);');
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
    await startMatch(T, 'GP20051AB'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true);
    T.setWorldTime(0.78); T.setZoomHeldDbg(false);
    T.setWeapon(T.WEAPON_ORDER.indexOf('minigun'));
    await new Promise(r => setTimeout(r, 3000));
    const current = T.weaponMeshes.minigun;
    const mod = await import('./review/GP-20051/prepass-heavy.js');
    const ins = await import('./tools/marine-inspector.js');
    const before = mod.makeMinigunModel(ins.weaponModelContext());
    before.scale.copy(current.scale);
    window.GP51_AB = { current, before };
    return { backend: T.getRendererBackend(), beforeScale: before.scale.x, currentScale: current.scale.x };
  })()`);
  const runs = [];
  for (const label of ['after', 'before', 'before', 'after']) {
    const run = await page.evaluate(`(async () => {
      const T = window.TT, label = ${JSON.stringify(label)};
      T.weaponMeshes.minigun = window.GP51_AB[label === 'after' ? 'current' : 'before'];
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      let until = Date.now() + 9000;
      while (Date.now() < until && T.getCurrentWeapon() !== 'pistol') await new Promise(r => setTimeout(r, 60));
      if (T.getCurrentWeapon() !== 'pistol') throw new Error('pistol switch did not settle: ' + label);
      await new Promise(r => setTimeout(r, 350));
      T.setWeapon(T.WEAPON_ORDER.indexOf('minigun'));
      until = Date.now() + 12000;
      while (Date.now() < until && (T.getCurrentWeapon() !== 'minigun' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg().info.key !== 'minigun' || T.viewmodelDbg().info.raise < .99))
        await new Promise(r => setTimeout(r, 60));
      if (T.getCurrentWeapon() !== 'minigun' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg().info.key !== 'minigun') throw new Error('view did not rebuild: ' + label);
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

// GP-20044: paired HQ dusk FPS on the current flamer and this task's exact
// pre-pass constructor. No git operation, one browser, shared game-test slot only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20044/fps-ab.json');
const prepassPath = path.join(root, 'review/GP-20044/prepass-heavy.js');
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
replaceRange('  // GP-20044: the pilot sits', '  gun.userData.pilot = pilot.material;',
  '  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff6a10, emissiveIntensity: 1.6 }));\n' +
  '  pilot.position.set(0, 0.05, 0.72); gun.add(pilot);\n');
replaceOnce('      K.cyl(0.0032, 0.0032, 0.002, steelMat, x + r + 0.006, y, z, null, 8, \'x\');\n');
replaceRange('  K.cyl(0.008, 0.008, 0.014, gunDark, 0.11, -0.05, 0.232', '  K.cyl(0.012, 0.012, 0.016, brassMat, 0.098');
replaceRange('  // Tank-mounted gauge on the exposed left flank', '  // Rear hose loop',
  '  // Pressure gauge on left side with manifold stem seated into both the main tank and receiver underside.\n' +
  '  K.box(0.028, 0.032, 0.028, gunDark, -0.028, -0.034, 0.065, 0, 0, 0, null, 0.003);\n' +
  '  K.cyl(0.026, 0.026, 0.014, steelMat, -0.04, -0.03, 0.065, null, 12, \'x\');\n' +
  '  K.disc(0.021, gaugeFace, -0.048, -0.03, 0.065, -Math.PI / 2, null, 12);\n' +
  '  K.box(0.002, 0.016, 0.003, sightDotMat, -0.049, -0.024, 0.065, 0, 0, 0.6);\n');
replaceRange('  for (const [x, y, z] of [[0, 0.044, -0.188]', '  for (let i = 0; i < 18; i++)');
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
    await startMatch(T, 'GP20044AB'); T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    if (T.isUnarmed()) T.toggleHolster(); T.setViewFirstDbg(true);
    T.setWorldTime(0.78); T.setZoomHeldDbg(false);
    T.setWeapon(T.WEAPON_ORDER.indexOf('flamer'));
    await new Promise(r => setTimeout(r, 3000));
    const current = T.weaponMeshes.flamer;
    const mod = await import('./review/GP-20044/prepass-heavy.js');
    const ins = await import('./tools/marine-inspector.js');
    const before = mod.makeFlamerModel(ins.weaponModelContext());
    before.scale.copy(current.scale);
    window.GP44_AB = { current, before };
    return { backend: T.getRendererBackend(), beforeScale: before.scale.x, currentScale: current.scale.x };
  })()`);
  const runs = [];
  for (const label of ['after', 'before', 'before', 'after']) {
    const run = await page.evaluate(`(async () => {
      const T = window.TT, label = ${JSON.stringify(label)};
      T.weaponMeshes.flamer = window.GP44_AB[label === 'after' ? 'current' : 'before'];
      T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
      let until = Date.now() + 9000;
      while (Date.now() < until && T.getCurrentWeapon() !== 'pistol') await new Promise(r => setTimeout(r, 60));
      if (T.getCurrentWeapon() !== 'pistol') throw new Error('pistol switch did not settle: ' + label);
      await new Promise(r => setTimeout(r, 350));
      T.setWeapon(T.WEAPON_ORDER.indexOf('flamer'));
      until = Date.now() + 12000;
      while (Date.now() < until && (T.getCurrentWeapon() !== 'flamer' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg().info.key !== 'flamer' || T.viewmodelDbg().info.raise < .99))
        await new Promise(r => setTimeout(r, 60));
      if (T.getCurrentWeapon() !== 'flamer' || !T.viewmodelDbg()?.info?.active || T.viewmodelDbg().info.key !== 'flamer') throw new Error('view did not rebuild: ' + label);
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

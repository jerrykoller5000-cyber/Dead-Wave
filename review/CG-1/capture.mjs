// CG-1 (J151 note 4, Claude 7): the first-person camo in the Training Ground, through the crew game-test slot.
//   node crew/crew.mjs slot run claude7 CG-1 --checks "CG-1 capture" -- node review/CG-1/capture.mjs <before|after> [--quick]
// Writes review/CG-1/<phase>/: four lights x (arms + 3 guns) at the hip, one look at the support arm, and two bursts
// (a weapon change and a reload) of every frame, with what the view showed in each (frames.json).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const argv = process.argv.slice(2), phase = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--exposure') || 'before', quick = argv.includes('--quick');
const soft = argv.includes('--soft');
const expo = argv.includes('--exposure') ? +argv[argv.indexOf('--exposure') + 1] : null;   // the cloud's software renderer lights Training dimly: the same lift before and after
const fill = argv.includes('--fill');
const inMatch = argv.includes('--match');   // the four lights outdoors (Training holds noon under its own lamps)   // the cloud: a white key light from behind the eye (the same before and after), so the camo reads
const out = path.join(root, 'review', 'CG-1', phase + (inMatch ? '-match' : ''));
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: soft, args: soft ? [] : ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const shot = async (page, name) => { await page.evaluate("window.__cgLight && window.__cgLight(); { const p = document.getElementById('perf'); if (p) p.style.display = 'none'; }"); const s = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(s.data, 'base64')); };
const ev = (page, body, t = 240000) => page.evaluate(`(async () => { const T = window.TT, wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${body} })()`, t);
const GUNS = quick ? ['m4'] : ['m4', 'shotgun', 'pistol', 'ak'];
const LIGHTS = [{ name: 'noon', time: 0.40, rain: false }, { name: 'overcast', time: 0.40, rain: true }, { name: 'dusk', time: 0.68, rain: false }, { name: 'night', time: 0.0, rain: false }];
const report = { phase, at: new Date().toISOString(), frames: {}, errors: [] };
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer${soft ? '&renderer=webgl' : ''}`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw Error('Game not ready');
  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  if (inMatch) await page.evaluate(fs.readFileSync(path.join(root, 'tools', 'tests', 'lib.js'), 'utf8'));
  report.training = await ev(page, `const D = T.trainingDbg;
    if (${inMatch}) { await startMatch(T, 'CG1'); T.clearZombies && T.clearZombies(); }
    else { document.getElementById('playerName').value = 'CG1'; document.getElementById('modeTraining').click();
      const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 120000) await wait(200);
      { const t1 = Date.now(); while ((D.state().warming || D.state().bgWarming) && Date.now() - t1 < 240000) await wait(500); } }
    await wait(2500); T.setHp(1e5); T.grantAllWeapons(); T.setCamo('multicam', false);
    const W = T.getWardrobe(); W.guns = W.guns || {}; for (const k of Object.keys(T.weaponMeshes)) W.guns[k] = 'multicam'; T.dressGuns(W);
    if (T.setFirstPersonFov) T.setFirstPersonFov(60);
    ${expo ? `window.__cgExpo = ${expo};` : ''}
    ${fill ? `window.__cgFill = new T.THREE.DirectionalLight(0xffffff, 3.2); T.scene.add(window.__cgFill); T.scene.add(window.__cgFill.target); window.__cgLight = () => { const c = T.camera, d = new T.THREE.Vector3(); c.getWorldDirection(d); window.__cgFill.position.copy(c.position).addScaledVector(d, -2).add(new T.THREE.Vector3(0, 1.2, 0)); window.__cgFill.target.position.copy(c.position).addScaledVector(d, 2); window.__cgFill.target.updateMatrixWorld(); };` : 'window.__cgLight = () => {};'}
    T.setViewFirstDbg(true); T.setUnarmedDbg(false);
    window.__cgTo = async (w) => { for (let i = 0; i < 24 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(250); }
      T.setUnarmedDbg(false); const t0 = Date.now(); while (Date.now() - t0 < 30000) { const v = T.viewmodelDbg(); if (v && v.info.active && v.info.key === w && v.info.raise >= 1) break; await wait(100); } await wait(600); };
    if (${inMatch}) T.clearZombies && T.clearZombies();
    return { active: D.state().active, renderer: T.renderer.backend && T.renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl' };`, 600000);
  console.log('training', JSON.stringify(report.training));
  // Four lights x guns at the hip, a little down so the sleeves show.
  for (const L of quick ? LIGHTS.slice(0, 1) : LIGHTS) {
    await ev(page, `T.weather.raining = ${L.rain}; T.weather.rainTimeLeft = ${L.rain ? 100 : 0}; T.weather.intensity = ${L.rain ? 1 : 0}; T.setWorldTime(${L.time}); if (window.__cgExpo) T.renderer.toneMappingExposure = window.__cgExpo; await wait(500); return 1;`);
    for (const g of GUNS) {
      await ev(page, `await __cgTo('${g}'); T.setOtsAimDbg(0, -0.22); await wait(900); return 1;`);
      await shot(page, `${L.name}-${g}`);
    }
    report.lights = report.lights || {}; report.lights[L.name] = await ev(page, `return { lights: T.trainingDbg.state().active ? T.trainingDbg.lights() : null, exposure: T.renderer.toneMappingExposure, warming: !!T.trainingDbg.state().warming, bgWarming: !!T.trainingDbg.state().bgWarming, worldTime: T.getWorldTime ? T.getWorldTime() : null };`);
    console.log('light', L.name, JSON.stringify(report.lights[L.name]));
  }
  await ev(page, `T.weather.raining = false; T.weather.rainTimeLeft = 0; T.weather.intensity = 0; T.setWorldTime(0.40); if (window.__cgExpo) T.renderer.toneMappingExposure = window.__cgExpo; await __cgTo('ak'); T.setOtsAimDbg(-0.35, -0.35); await wait(900); return 1;`);
  await shot(page, 'noon-ak-support-arm');
  // Bursts: every frame we can grab, with the view's state at each.
  // Bursts, stepped at 60 frames a second (the same frames on any machine): a picture every `every` frames, with the view's
  // state at each.
  const burst = async (name, start, shots, every) => {
    const rows = [];
    await ev(page, `T.flightHold(true); ${start} return 1;`);
    for (let i = 0; i < shots; i++) {
      const st = await ev(page, `for (let k = 0; k < ${every}; k++) T.stepFrame(1 / 60); const v = T.viewmodelDbg(), s = T.vmStateDbg(); return { want: !!s.want, eye: !!s.eye, active: !!(v && v.info.active), raise: v ? +v.info.raise.toFixed(2) : 0, key: v ? v.info.key : null, eyeHide: !!(v && v.isEyeHidden && [...(v.hidden || [])].length), upperL: v && v.arms && v.arms.l.upper ? +v.arms.l.upper.scale.y.toFixed(3) : null };`);
      const f = `${name}-${String(i).padStart(3, '0')}`;
      await shot(page, f);
      rows.push({ f, frame: (i + 1) * every, ...st });
    }
    await ev(page, `T.flightHold(false); return 1;`);
    report.frames[name] = rows;
  };
  await ev(page, `await __cgTo('m4'); T.setOtsAimDbg(0, -0.22); await wait(600); return 1;`);
  await burst('switch-m4-to-shotgun', `T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));`, quick ? 6 : 14, 3);
  await ev(page, `await __cgTo('ak'); T.setOtsAimDbg(-0.2, -0.3); await wait(600); return 1;`);
  await burst('reload-ak', `T.setAmmoDbg('ak', 1); T.startReload();`, quick ? 6 : 12, 8);
  report.errors = page.errors.slice();
} catch (e) { report.failure = String(e?.stack || e); console.error(report.failure); process.exitCode = 1; }
finally {
  fs.writeFileSync(path.join(out, 'frames.json'), JSON.stringify(report, null, 1) + '\n', 'utf8');
  await browser.close?.(); await server.close?.();
}
console.log('done', out);
process.exit(process.exitCode || 0);

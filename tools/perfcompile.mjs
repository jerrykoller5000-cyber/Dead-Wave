// tools/perfcompile.mjs — CL-117: which moments compile new shaders or pipelines mid-play (each one a hitch on a real GPU).
//   node tools/perfcompile.mjs hunt|training
// Counts the renderer's pipeline cache and shader programs after each step of a scripted play, and times the step.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2] || 'hunt';
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${srv.origin}/index.html?debug=1`, { timeout: 240000 });
  await page.waitFor('!!window.TT', { timeout: 240000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));
  // Count programs as the backend makes them.
  await page.evaluate(`(() => { const r = window.TT.renderer, b = r.backend; window.__programs = 0; const orig = b.createProgram.bind(b); b.createProgram = (p) => { window.__programs++; return orig(p); }; })()`);
  const run = (code, ms = 1800000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const counts = () => run(`return { pipelines: T.renderer._pipelines ? T.renderer._pipelines.caches.size : -1, programs: window.__programs, nodes: T.renderer._nodes ? T.renderer._nodes.nodeBuilderCache.size : -1 };`);
  let last = await counts();
  const step = async (label, code, settle = 1500) => {
    const t0 = Date.now();
    try { await run(code + ' await wait(' + settle + '); return true;'); } catch (e) { console.log('  (step failed: ' + String(e.message).slice(0, 120) + ')'); }
    const c = await counts();
    const d = { pipelines: c.pipelines - last.pipelines, programs: c.programs - last.programs, nodes: c.nodes - last.nodes };
    console.log((d.pipelines || d.programs ? '!! ' : '   ') + label.padEnd(44) + ' +' + d.pipelines + ' pipelines, +' + d.programs + ' programs, +' + d.nodes + ' node builds  (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
    last = c;
  };
  console.log('at the title:', JSON.stringify(last));
  if (mode === 'training') {
    await step('enter the Training Ground', `document.getElementById('playerName').value = 'Probe'; document.getElementById('modeTraining').click(); const t0 = Date.now(); while (!T.trainingDbg.state().active && Date.now() - t0 < 60000) await wait(200);`, 6000);
    await step('stand still 5 s', ``, 5000);
    await step('shoot a target', `const tg = T.trainingDbg.tg(); const t = tg.targets[2]; T.trainingDbg.round({ prev: { x: t.box.minX + 0.3, y: (t.box.minY + t.box.maxY) / 2, z: t.box.minZ - 1 }, pos: { x: t.box.minX + 0.3, y: (t.box.minY + t.box.maxY) / 2, z: t.box.minZ + 1 }, hit: false });`);
    await step('open the Armory', `T.openCIF(); document.getElementById('armoryOpen').click();`, 4000);
    await step('close it', `document.querySelector('#armoryPanel .armory-actions button:last-child').click(); T.closeCIF();`);
    await step('call in 5 shamblers', `const tg = T.trainingDbg.tg(); T.player.position.set(tg.origin.x - 14, tg.floorY, tg.origin.z - 6); T.trainingDbg.spawn('shambler', 5);`, 3000);
    for (const k of ['feral', 'spider', 'brute', 'spitter', 'military', 'drowned', 'leaper', 'screamer', 'bomber', 'demon', 'colossus', 'guardian']) await step('call in a ' + k, `T.trainingDbg.spawn('${k}', 1);`, 2500);
    await step('fire the M4 at them', `T.setWeapon(1); await wait(300); T.setMouseFireDbg(true); await wait(1500); T.setMouseFireDbg(false);`);
    await step('die (blackout, the bed)', `T.trainingDbg.blackout();`, 4000);
  } else {
    await step('start a match (insertion)', `document.getElementById('playerName').value = 'Probe'; document.getElementById('modeHunt').click(); const t1 = Date.now(); while ((T.getPhase() !== 'prep' || document.body.classList.contains('deploying')) && Date.now() - t1 < 1500000) await wait(500); T.addCash(1e6); T.grantAllWeapons(); T.skipGrace && T.skipGrace();`, 3000);
    await step('stand still 5 s', ``, 5000);
    for (let i = 0; i < 12; i++) await step('draw weapon ' + i + ' and fire', `T.setWeapon(${i}); await wait(400); T.setMouseFireDbg(true); await wait(700); T.setMouseFireDbg(false);`, 800);
    await step('throw a grenade', `T.rabbitDbg.throwG();`, 3000);
    for (const k of Object.keys({ shambler: 1, feral: 1, leaper: 1, spider: 1, drowned: 1, military: 1, brute: 1, spitter: 1, screamer: 1, bomber: 1, demon: 1, colossus: 1, guardian: 1 })) await step('spawn a ' + k, `const p = T.player.position; T.spawnZombie(p.x + 8, p.z + 8, '${k}', true, true);`, 2500);
    await step('kill them all with the M4', `T.setWeapon(1); for (const z of T.zombies) if (z.alive) T.damageZombie(z, 9999, { kind: 'bullet', dir: { x: 0, z: 1 }, headshot: true });`, 4000);
    await step('kill with explosive and chainsaw', `const p = T.player.position; const a = T.spawnZombie(p.x + 5, p.z, 'shambler', true, true), b = T.spawnZombie(p.x - 5, p.z, 'shambler', true, true); await wait(300); if (a) T.damageZombie(a, 9999, { kind: 'explosive', dir: { x: 1, z: 0 } }); if (b) T.damageZombie(b, 9999, { kind: 'chainsaw', dir: { x: -1, z: 0 } });`, 4000);
    await step('open the kiosk', `T.openShop(true);`, 2000);
    await step('close it; open the CIF', `T.closeShop(); T.openCIF();`, 4000);
    await step('the Armory', `document.getElementById('armoryOpen').click();`, 4000);
    await step('close it', `document.querySelector('#armoryPanel .armory-actions button:last-child').click(); T.closeCIF();`);
    await step('night falls (sky to night)', `T.runDevCommand('night ops');`, 5000);
    await step('NVG on', `T.toggleNvgDbg && T.toggleNvgDbg();`, 3000);
    await step('NVG off, flashlight on', `T.toggleNvgDbg && T.toggleNvgDbg(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit2', bubbles: true }));`, 3000);
    await step('rain', `T.runDevCommand('shower');`, 5000);
  }
  console.log('at the end:', JSON.stringify(last));
} finally { await browser.close(); await srv.close(); }
process.exit(0);   // the server keeps the process alive otherwise

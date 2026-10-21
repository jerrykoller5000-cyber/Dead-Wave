// qa/run-cu42.mjs — CU-42: where the 48-zombie frame goes, on Jerry's GPU.
//
//   node qa/run-cu42.mjs [--night 7]
//
// Starts a match, jumps to the given night, sounds the alarm with the marine in godmode,
// waits for the field to reach 48, then samples fps and takes a CPU profile.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const NIGHT = Number(argv[argv.indexOf('--night') + 1]) || 7;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[cu42]', ...a);
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 1600, height: 900 });
  await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
  await page.waitFor('!!window.TT && window.DWOpening', { timeout: 240000 });
  await page.evaluate('DWOpening.dismissForTesting && DWOpening.dismissForTesting()');
  await page.waitFor('DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(`(() => { document.getElementById('playerName').value = 'Profile'; document.getElementById('modeHunt').click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 30000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 });
  await page.evaluate(`TT.runDevCommand('godmode')`);
  await page.evaluate(`(() => { TT.setDay(${NIGHT - 1}); TT.startPrep(); })()`);
  await sleep(1500);
  await page.evaluate('TT.hqStartWave()');
  const full = await page.waitFor('TT.zombies.filter(z => z.alive).length >= 48', { timeout: 120000, every: 500 });
  log(`night ${NIGHT}: field reached 48:`, full, 'alive', await page.evaluate('TT.zombies.filter(z => z.alive).length'));
  const rows = [];
  for (let i = 0; i < 6; i++) { await page.evaluate('TT.resetPerf()'); await sleep(1000); rows.push(await page.evaluate('TT.perfSnapshot()')); }
  log('fps per second', rows.map((r) => r.fps.toFixed(0)).join(' '), '| 1% lows', rows.map((r) => r.low.toFixed(0)).join(' '), '| worst', Math.max(...rows.map((r) => r.worst)).toFixed(1), 'ms');
  const info = await page.evaluate(`(() => { const r = TT.renderer.info.render; const p = TT.player.position; const d = TT.zombies.filter(z => z.alive).map(z => Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z)); return { draws: r.drawCalls ?? r.calls, tris: r.triangles, near20: d.filter(x => x < 20).length, near60: d.filter(x => x < 60).length, far: d.filter(x => x >= 60).length }; })()`);
  log('scene', JSON.stringify(info));

  await page.send('Profiler.enable');
  await page.send('Profiler.setSamplingInterval', { interval: 250 });
  await page.send('Profiler.start');
  const frames = await page.evaluate(`new Promise((res) => { const f = []; let last = performance.now(); const tick = (t) => { f.push(t - last); last = t; if (f.length < 480) requestAnimationFrame(tick); else res(f); }; requestAnimationFrame(tick); })`, 60000);
  const { profile } = await page.send('Profiler.stop', {}, 120000);
  const wall = frames.reduce((a, b) => a + b, 0);
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const name = (f) => (f.functionName || '(anon)') + ' ' + (f.url.split('/').pop().split('?')[0]) + ':' + f.lineNumber;
  const self = new Map(), incl = new Map();
  let total = 0, idle = 0;
  profile.samples.forEach((id, i) => {
    const dt = profile.timeDeltas[i] || 0; total += dt;
    const k = name(nodes.get(id).callFrame);
    if (/\(idle\)/.test(k)) idle += dt;
    self.set(k, (self.get(k) || 0) + dt);
    const seen = new Set();
    for (let n = id; n; n = parent.get(n)) { const kk = name(nodes.get(n).callFrame); if (seen.has(kk)) continue; seen.add(kk); incl.set(kk, (incl.get(kk) || 0) + dt); }
  });
  const sorted = [...frames].sort((a, b) => b - a);
  log(`480 frames in ${(wall / 1000).toFixed(1)} s: mean ${(1000 * frames.length / wall).toFixed(1)} fps, worst ${sorted[0].toFixed(1)} ms, 99th ${sorted[4].toFixed(1)} ms, over 25 ms ${frames.filter((x) => x > 25).length}`);
  log(`main thread busy ${(100 * (total - idle) / total).toFixed(0)}% of the profile (idle ${(100 * idle / total).toFixed(0)}%)`);
  const per = (us) => (us / 1000 / frames.length).toFixed(2) + ' ms/frame';
  console.log('  self time:');
  for (const [k, us] of [...self].filter(([k]) => !/idle|\(root\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log('   ', per(us).padStart(15), k);
  console.log('  inclusive, game code:');
  for (const [k, us] of [...incl].filter(([k]) => /index\.html|core\//.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log('   ', per(us).padStart(15), k);
  if (argv.includes('--fog-cull')) {
    // Experiment only: hide zombies past the night fog's far distance each frame, and
    // measure the same 480 frames again.
    const fog = await page.evaluate(`({ near: TT.scene.fog.near, far: TT.scene.fog.far })`);
    await page.evaluate(`(() => {
      const cull = () => {
        const p = TT.player.position, far = TT.scene.fog.far + 10;
        for (const z of TT.zombies) { if (!z.alive || !z.mesh) continue; const d = Math.hypot(z.mesh.position.x - p.x, z.mesh.position.z - p.z); z.mesh.visible = d < far; }
        window.__cullRaf = requestAnimationFrame(cull);
      };
      cull();
    })()`);
    await sleep(500);
    const f2 = await page.evaluate(`new Promise((res) => { const f = []; let last = performance.now(); const tick = (t) => { f.push(t - last); last = t; if (f.length < 480) requestAnimationFrame(tick); else res(f); }; requestAnimationFrame(tick); })`, 60000);
    const w2 = f2.reduce((a, b) => a + b, 0), s2 = [...f2].sort((a, b) => b - a);
    const d2 = await page.evaluate(`(() => { const r = TT.renderer.info.render; return { draws: r.drawCalls ?? r.calls, shown: TT.zombies.filter(z => z.alive && z.mesh.visible).length }; })()`);
    log(`fog ${fog.near.toFixed(0)}-${fog.far.toFixed(0)} m; with zombies past ${(fog.far + 10).toFixed(0)} m hidden: ${d2.shown} of 48 drawn, ${d2.draws} draws, mean ${(1000 * f2.length / w2).toFixed(1)} fps, worst ${s2[0].toFixed(1)} ms, 99th ${s2[4].toFixed(1)} ms, over 25 ms ${f2.filter((x) => x > 25).length}`);
    await page.evaluate('cancelAnimationFrame(window.__cullRaf)');
  }
  log('page errors', page.errors.length);
} catch (e) { log('FAILED', e.message); }
finally { await browser.close(); await server.close(); }

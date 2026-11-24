// tools/hitchhunt.mjs — CB-373 (Jerry D-237 #1-2, Claude 2): "hitches everywhere" and "lag fighting ten of each type".
// Plays a scripted Training session like Jerry's and records EVERY frame in the page (rAF), with what was going on:
// the step, zombies alive, deaths, new render pipelines / shader programs (a first-use compile), the JS heap (a drop =
// a collector pause). Then lists every frame over --hitch ms (default 33) with its likely cause, and each kind's
// steady frame cost with --n (default 10) of it alive.
//   node tools/game-test-slot.mjs run <agent> <task> --checks "hitchhunt" --exclusive -- node tools/hitchhunt.mjs --out review/CB-373/native
//   [--headless] (cloud: adds &raf=timer) [--page <index copy>] [--n 10] [--kinds shambler,brute,spider] [--guns 0] [--hitch 33]
//   [--alloc] (heap allocation sampling from the kinds loop: where the garbage comes from)
//   [--buy m4] (the real Armory single purchase first; skips the debug grant unless --grant 1)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2), arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const OUT = path.resolve(ROOT, arg('--out', 'review/CB-373/hitchhunt')), HEADLESS = argv.includes('--headless'), PAGE = arg('--page', '');
const PROF = arg('--prof', '1') !== '0', N = +arg('--n', '10'), HITCH = +arg('--hitch', '33'), GUNS = arg('--guns', '1') !== '0';
const BUY = arg('--buy', ''), GRANT = arg('--grant', BUY ? '0' : '1') !== '0';   // CB-373: --buy m4 = the real Armory single purchase first (fresh profile)
const ALLOC = argv.includes('--alloc');   // CB-373 (D): sample what allocates (garbage included) from the kinds loop to the end
const KINDS = arg('--kinds', 'shambler,feral,spider,brute,spitter,military,drowned,leaper,screamer,bomber,demon').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const inner = await serve(ROOT, 0);
const server = PAGE ? await (async () => { const http = await import('node:http'); const body = fs.readFileSync(path.resolve(ROOT, PAGE)), up = new URL(inner.origin);
  const px = http.createServer((req, res) => { if (new URL(req.url, 'http://x').pathname === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(body); return; }
    const r2 = http.request({ hostname: up.hostname, port: up.port, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); }); r2.on('error', (e) => res.writeHead(502).end(String(e))); req.pipe(r2); });
  await new Promise((r) => px.listen(0, '127.0.0.1', r)); return { origin: 'http://127.0.0.1:' + px.address().port, close: () => { px.close(); inner.close(); } }; })() : inner;
const log = (m) => console.log(new Date().toISOString().slice(11, 19), m);
const browser = await launch({ headless: HEADLESS });
const res = { page: PAGE || 'index.html', n: N, hitchMs: HITCH, kinds: KINDS, buy: BUY || null };
try {
  const page = await browser.newPage({ width: 1600, height: 900 });
  const ev = (e, ms = 900000) => page.evaluate(e, ms);
  await page.goto(`${server.origin}/index.html?debug=1${HEADLESS ? '&raf=timer' : ''}`, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 600000 });
  for (let i = 0; i < 2; i++) { await ev(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`); await ev('new Promise(r => setTimeout(r, 250))'); }
  if (!(await page.waitFor('!!window.TT && !!window.TT.trainingDbg', { timeout: 900000 }))) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await ev(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'CB-373'; document.getElementById('modeTraining').click(); })()`);
  if (!(await page.waitFor('TT.trainingDbg.state().active', { timeout: 300000 }))) throw new Error('Training never opened');
  await page.waitFor(`!document.getElementById('trainingBlackout')?.classList.contains('on')`, { timeout: 900000 });
  log('training open');
  await ev('new Promise(r => setTimeout(r, 5000))');
  // The recorder: one row a frame. Pipelines (WebGPU and WebGL caches) and programs (WebGL backend) count compiles.
  res.gpu = await ev(`(() => {
    const T = TT, r = T.renderer, b = r.backend;
    window.__hh = { rows: [], label: 'idle', deaths: 0, programs: 0, on: true, prof: {}, newPipes: [] }; if (${PROF} && T.profDbg) { T.profDbg.on = true; T.profDbg.reset(); }
    if (b && typeof b.createProgram === 'function') { const o = b.createProgram.bind(b); b.createProgram = (p) => { window.__hh.programs++; return o(p); }; }
    if (b && typeof b.createRenderPipeline === 'function') { const o = b.createRenderPipeline.bind(b); b.createRenderPipeline = (...a) => { const H = window.__hh; H.programs++; try { const ro = a[0], m = ro && ro.material, ob = ro && ro.object; if (H.newPipes.length < 400) H.newPipes.push({ step: H.label, mat: m ? (m.name || m.type) : '?', obj: ob ? (ob.name || ob.type) : '?', parent: ob && ob.parent ? (ob.parent.name || ob.parent.type) : '' }); } catch (_) {} return o(...a); }; }
    const pipes = () => (r._pipelines && r._pipelines.caches ? r._pipelines.caches.size : -1);
    const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : -1);
    const aliveN = () => { let n = 0; for (const z of (T.zombies || [])) if (z.alive) n++; return n; };
    let last = performance.now();
    const tick = (now) => {
      const H = window.__hh; if (!H.on) return;
      H.rows.push([+(now - last).toFixed(2), H.label, aliveN(), pipes(), H.programs, heap(), r.info && r.info.render ? r.info.render.drawCalls : -1]);
      last = now; requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return { backend: b && b.isWebGPUBackend ? 'webgpu' : 'webgl', hooks: { program: typeof b.createProgram, pipeline: typeof b.createRenderPipeline } };
  })()`);
  log('recorder on ' + JSON.stringify(res.gpu));
  const run = (code) => ev(`(async () => { const T = TT, H = window.__hh; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const mark = (l) => { const P = T.profDbg; if (P && P.on) { try { const r = P.report(); H.prof[H.label] = { frames: r.frames, phases: (r.phases || []).sort((a, b) => b.avg - a.avg).slice(0, 14), spikes: (P.spikes || []).slice(0, 25) }; } catch (_) {} P.reset(); } H.label = l; }; ${code} })()`);
  if (BUY) {
    // CB-373 (GP-20220 #2): the real Armory single purchase, as Jerry does it: walk to the terminal, E, the buy button, close,
    // Q to draw it, a short burst. Each part is its own step, so its frames, PROF spikes and new pipelines are its own.
    res.buy = await run(`const tg = T.trainingDbg.tg(), f = tg.stations.armory.front; T.player.position.set(f.x, tg.floorY, f.z); T.setVelDbg(0, 0); await wait(400);
      const key = (code, k) => { for (const type of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true, cancelable: true })); };
      mark('open armory'); key('KeyE', 'e'); await wait(1500);
      const panel = document.getElementById('armoryPanel'), btn = panel && panel.querySelector('[data-buy-gun="${BUY}"]');
      if (!btn || btn.disabled) return { error: 'no buy button for ${BUY}', hidden: panel ? panel.hidden : 'no panel', action: T.trainingDbg.action && T.trainingDbg.action() };
      mark('buy ${BUY}'); const t0 = performance.now(); btn.click(); const sync = performance.now() - t0; await wait(2500);
      mark('close armory'); const c = panel.querySelector('.armory-actions button:last-child'); if (c) c.click(); await wait(1500);
      mark('draw ${BUY}'); key('KeyQ', 'q'); await wait(1500);
      mark('fire ${BUY}'); T.setMouseFireDbg(true); await wait(600); T.setMouseFireDbg(false); await wait(800);
      mark('after buy'); return { syncClickMs: +sync.toFixed(2), owned: !!T.getWeaponOwned()['${BUY}'], inHand: T.getCurrentWeapon() };`);
    log('buy ' + JSON.stringify(res.buy));
  }
  if (GRANT) await run(`mark('grant'); T.grantAllWeapons(); await wait(3000);`);
  if (GUNS && GRANT) {
    // First draw and first shots of every gun (Jerry tried many): each first use is where a compile would show.
    await run(`for (let i = 0; i < T.WEAPON_ORDER.length; i++) { const k = T.WEAPON_ORDER[i]; if (k === 'chainsaw') continue;
      mark('draw ' + k); T.setWeapon(i); await wait(900); mark('fire ' + k); T.setMouseFireDbg(true); await wait(1200); T.setMouseFireDbg(false); mark('after ' + k); await wait(700); }`);
    log('guns done');
  }
  const tg = `const tg = T.trainingDbg.tg(); T.player.position.set(tg.origin.x - 14, tg.floorY, tg.origin.z - 6);`;
  if (ALLOC) { await page.send('HeapProfiler.enable', {}); await page.send('HeapProfiler.startSampling', { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); log('allocation sampling on'); }
  for (const k of KINDS) {
    // CB-373 s3: the player must be up for a call-in (Training refuses one during the knock-out wake: GP-20228 had 0 dedicated
    // Bombers after the Ferals put him down). Wait out a wake and give him back the health he started with; counted in res.hpBack.
    await run(`${tg} T.trainingDbg.clear && T.trainingDbg.clear(); await wait(800);
      { const t0 = Date.now(); while (Date.now() - t0 < 6000 && T.trainingDbg.alive() > 0) { T.trainingDbg.clear(); await wait(250); } }
      { const t0 = Date.now(); while (Date.now() - t0 < 20000 && T.trainingDbg.state().wake) await wait(250); }
      if (H.hp0 === undefined) H.hp0 = T.getHp ? T.getHp() : null;
      if (H.hp0 && T.setHp && T.getHp() < H.hp0) { H.hpBack = (H.hpBack || []).concat(['${k}', +T.getHp().toFixed(1)]); T.setHp(H.hp0); }
      mark('spawn ${k}'); if (!T.trainingDbg.spawn('${k}', ${N})) { H.fallback = (H.fallback || []).concat('${k}'); T.trainingDbg.deployNow('${k}', ${N}); } { const t0 = Date.now(); while (Date.now() - t0 < 20000 && (T.zombies || []).filter((z) => z.alive && z.mesh && z.mesh.visible).length < ${N}) await wait(250); } await wait(1500);
      mark('steady ${k}'); const n0 = (T.zombies || []).filter((z) => z.alive).length; await wait(5000);
      mark('kill ${k}'); for (let pass = 0; pass < 3; pass++) for (const z of (T.zombies || []).slice()) if (z.alive) { T.damageZombie(z, 99999, { kind: 'bullet', dir: { x: 0, z: 1 }, headshot: false }); await wait(60); }
      mark('dead ${k}'); await wait(3500); return n0;`).then((n0) => { (res.alive = res.alive || {})[k] = n0; return n0; });
    log(k + ' alive ' + res.alive[k]);
  }
  // Mixed, as Jerry fought: three kinds at once, shot with the M4.
  await run(`${tg} T.trainingDbg.clear && T.trainingDbg.clear(); await wait(800); mark('spawn mixed');
    for (const k of ${JSON.stringify(KINDS.slice(0, 3))}) T.trainingDbg.deployNow(k, ${N}); await wait(6000);
    mark('steady mixed'); await wait(5000);
    mark('fight mixed'); T.setWeapon(1); T.setMouseFireDbg(true); await wait(4000); T.setMouseFireDbg(false);
    mark('kill mixed'); for (const z of (T.zombies || [])) if (z.alive) { T.damageZombie(z, 99999, { kind: 'bullet', dir: { x: 0, z: 1 } }); await wait(40); }
    mark('dead mixed'); await wait(4000); H.on = false;`);
  log('mixed done');
  await run(`mark('end');`);
  if (ALLOC) {
    // Where the garbage comes from: bytes sampled per function (self), and per nearest game-code caller (the first frame up
    // the stack that is not three.js or the browser), so an allocation deep in three is charged to the game line that asked.
    const { profile } = await page.send('HeapProfiler.stopSampling', {}, 600000);
    const self = new Map(), game = new Map(), isGame = (u) => /\/(index\.html|game|studio|core|combat|world|ui)\b/.test(u || '') && !/vendor\//.test(u || '');
    const key = (cf) => (cf.functionName || '(anon)') + ' ' + String(cf.url || '').split('/').slice(-2).join('/') + ':' + (cf.lineNumber + 1);
    const walk = (n, caller) => {
      const cf = n.callFrame, k = key(cf), g = isGame(cf.url) ? k : caller;
      if (n.selfSize) { self.set(k, (self.get(k) || 0) + n.selfSize); if (g) game.set(g, (game.get(g) || 0) + n.selfSize); }
      for (const c of n.children || []) walk(c, g);
    };
    walk(profile.head, null);
    const top = (m) => [...m].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => ({ at: k, mb: +(v / 1048576).toFixed(2) }));
    res.alloc = { totalMB: +([...self.values()].reduce((a, b) => a + b, 0) / 1048576).toFixed(1), self: top(self), byGameCaller: top(game) };
  }
  res.prof = await ev('window.__hh.prof'); res.fallback = await ev('window.__hh.fallback || []'); res.hpBack = await ev('window.__hh.hpBack || []'); res.newPipes = await ev('window.__hh.newPipes');
  const rows = await ev('window.__hh.rows');
  res.frames = rows.length;
  // Hitches: a frame over HITCH ms, with what changed in it.
  const hitches = [];
  for (let i = 1; i < rows.length; i++) {
    const [dt, label, alive, pipes, progs, heap, draws] = rows[i], p = rows[i - 1];
    if (dt <= HITCH) continue;
    const dPipe = pipes >= 0 && p[3] >= 0 ? pipes - p[3] : 0, dProg = progs - p[4], dHeap = heap >= 0 && p[5] >= 0 ? (heap - p[5]) / 1048576 : 0;
    const cause = dPipe > 0 || dProg > 0 ? 'compile (+' + dPipe + ' pipelines, +' + dProg + ' programs)' : dHeap < -4 ? 'GC (heap ' + dHeap.toFixed(1) + ' MB)' : 'cpu/other';
    hitches.push({ frame: i, ms: dt, step: label, alive, cause, draws });
  }
  res.hitches = hitches;
  // Per step: frames, median, p95, worst, hitches.
  const by = new Map();
  for (const r of rows) { let a = by.get(r[1]); if (!a) by.set(r[1], (a = [])); a.push(r[0]); }
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
  res.steps = [...by].map(([step, a]) => ({ step, frames: a.length, median: q(a, 0.5), p95: q(a, 0.95), worst: Math.max(...a), over: a.filter((x) => x > HITCH).length }));
  res.errors = page.errors.slice(0, 8);
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(rows));
} catch (e) { res.error = String(e && e.stack || e); }
finally { await browser.close(); server.close && server.close(); }
fs.writeFileSync(path.join(OUT, 'hitchhunt.json'), JSON.stringify(res, null, 1));
const lines = ['CB-373 hitch hunt  ' + (res.gpu ? res.gpu.backend : '?') + '  frames ' + (res.frames || 0) + (res.error ? '  ERROR ' + res.error.split('\n')[0] : ''), '', 'step                     frames  median   p95  worst  >' + HITCH + 'ms'];
for (const s of res.steps || []) lines.push(s.step.padEnd(24) + String(s.frames).padStart(7) + s.median.toFixed(1).padStart(8) + s.p95.toFixed(1).padStart(6) + s.worst.toFixed(0).padStart(7) + String(s.over).padStart(7));
if (res.prof) { lines.push('', 'where the frame goes (PROF avg ms/frame, top 6; max) by step:');
  for (const [step, p] of Object.entries(res.prof)) if (/^(steady|spawn|kill|dead|fight|grant|open|buy|close|draw|fire)/.test(step)) lines.push(step.padEnd(22) + ' ' + (p.phases || []).slice(0, 6).map((x) => x.k + ' ' + x.avg.toFixed(2) + ' (' + x.max.toFixed(0) + ')').join(', '));
  lines.push('', 'PROF spike frames (> 24 ms) by step: top phases');
  for (const [step, p] of Object.entries(res.prof)) for (const s of (p.spikes || []).slice(0, 4)) lines.push(step.padEnd(22) + ' ' + JSON.stringify(s).slice(0, 220)); }
if (res.buy) lines.push('', 'Armory buy: ' + JSON.stringify(res.buy));
lines.push('', 'new render pipelines after the recorder started (WebGPU; what compiled mid-play): ' + (res.newPipes || []).length);
for (const p of (res.newPipes || []).slice(0, 60)) lines.push('  ' + p.step.padEnd(22) + ' ' + p.mat + '  on ' + p.obj + (p.parent ? ' < ' + p.parent : ''));
if (res.alloc) { lines.push('', 'allocations sampled from the kinds loop on (garbage included): ' + res.alloc.totalMB + ' MB; by nearest game caller:');
  for (const a of res.alloc.byGameCaller.slice(0, 30)) lines.push(String(a.mb).padStart(9) + ' MB  ' + a.at);
  lines.push('', 'by function (self):'); for (const a of res.alloc.self.slice(0, 20)) lines.push(String(a.mb).padStart(9) + ' MB  ' + a.at); }
lines.push('', 'hitches (frame > ' + HITCH + ' ms): ' + (res.hitches || []).length);
for (const h of (res.hitches || []).slice().sort((a, b) => b.ms - a.ms).slice(0, 60)) lines.push(h.ms.toFixed(0).padStart(6) + ' ms  ' + h.step.padEnd(22) + ' alive ' + String(h.alive).padStart(3) + '  ' + h.cause);
fs.writeFileSync(path.join(OUT, 'hitchhunt.txt'), lines.join('\n') + '\n');
console.log(lines.slice(0, 12).join('\n'));
process.exit(0);

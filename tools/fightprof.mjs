// tools/fightprof.mjs — CB-373 / D-240 #1 (Claude 2): where a live fight's frame goes.
// ChatGPT's D-240 mixed-wave rig (review/CF-FEEL/round2/waves.mjs: ten Shamblers + ten Ferals + ten Bombers called in at once,
// first person, the aim pinned on the nearest, M4 bursts) with the game's PROF phases on, a census of what each live zombie
// costs to draw (meshes, skins, shadow casters, materials), and a V8 CPU profile of the fight (self time by function).
// Steps: still3p (no fire, third person), still1p (no fire, first person), fire1p (bursts, first person).
//   node tools/game-test-slot.mjs run <agent> <task> --checks "fightprof" --exclusive -- node tools/fightprof.mjs --out review/CB-373/fight
//   [--headless] (cloud: SwiftShader WebGL + &raf=timer) [--page <index copy>] [--fire 8000] [--n 10] [--kinds shambler,feral,bomber] [--cpu 0]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2), arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const OUT = path.resolve(ROOT, arg('--out', 'review/CB-373/fight')), HEADLESS = argv.includes('--headless'), PAGE = arg('--page', '');
const N = +arg('--n', '10'), FIRE = +arg('--fire', '8000'), STILL = +arg('--still', '2500'), CPU = arg('--cpu', '1') !== '0';
const NORENDER = argv.includes('--norender');   // cloud: the sim's own cost per frame (three's render skipped; no GPU here)
const KINDS = arg('--kinds', 'shambler,feral,bomber').split(',').filter(Boolean), QUERY = arg('--query', '');
fs.mkdirSync(OUT, { recursive: true });
const inner = await serve(ROOT, 0);
// --vendor <copy of vendor/three/three.webgpu.js>: served in its place (a three.js fix measured against live, same page)
const VENDOR = arg('--vendor', '');
const server = (PAGE || VENDOR) ? await (async () => { const http = await import('node:http'); const body = PAGE ? fs.readFileSync(path.resolve(ROOT, PAGE)) : null, vbody = VENDOR ? fs.readFileSync(path.resolve(ROOT, VENDOR)) : null, up = new URL(inner.origin);
  const px = http.createServer((req, res) => { const pn = new URL(req.url, 'http://x').pathname;
    if (body && pn === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(body); return; }
    if (vbody && pn === '/vendor/three/three.webgpu.js') { res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }).end(vbody); return; }
    const r2 = http.request({ hostname: up.hostname, port: up.port, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); }); r2.on('error', (e) => res.writeHead(502).end(String(e))); req.pipe(r2); });
  await new Promise((r) => px.listen(0, '127.0.0.1', r)); return { origin: 'http://127.0.0.1:' + px.address().port, close: () => { px.close(); inner.close(); } }; })() : inner;
const log = (m) => console.log(new Date().toISOString().slice(11, 19), m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launch({ headless: HEADLESS });
const res = { page: PAGE || 'index.html', vendor: VENDOR || 'vendor/three/three.webgpu.js', n: N, kinds: KINDS, query: QUERY };
let page;
try {
  page = await browser.newPage({ width: 1600, height: 900 });
  const ev = (e, ms = 900000) => page.evaluate(e, ms);
  await page.goto(`${server.origin}/index.html?debug=1${HEADLESS ? '&raf=timer' : ''}${QUERY ? '&' + QUERY : ''}`, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 600000 });
  for (let i = 0; i < 2; i++) { await ev(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`); await ev('new Promise(r => setTimeout(r, 250))'); }
  if (!(await page.waitFor('!!window.TT && !!window.TT.trainingDbg', { timeout: 900000 }))) throw new Error('TT never appeared');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await ev(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'CB-373'; document.getElementById('modeTraining').click(); })()`);
  if (!(await page.waitFor('TT.trainingDbg.state().active', { timeout: 300000 }))) throw new Error('Training never opened');
  await page.waitFor(`!document.getElementById('trainingBlackout')?.classList.contains('on')`, { timeout: 900000 });
  log('training open');
  await ev('new Promise(r => setTimeout(r, 4000))');
  res.backend = await ev(`TT.renderer && TT.renderer.backend && TT.renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl'`);
  // The recorder and the rig (ChatGPT's install(), the same setup and aim).
  await ev(`(() => {
    const T = TT, D = T.trainingDbg, room = D.tg(), G = T.THREE, r = T.renderer, point = new G.Vector3();
    const H = window.__fp = { rows: [], label: 'setup', on: true, prof: {} };
    const alive = () => T.zombies.filter((z) => z.alive);
    H.layerBuilds = 0; H.lastL = null;
    const tick = (now) => { if (!H.on) return; const a = alive(); const L = room._exactLayer; if (L !== H.lastL) { H.lastL = L; H.layerBuilds++; }
      const zs = window.__zs || { n: 0, ms: 0, pick: 0 };
      H.rows.push([now, H.label, a.length, a.filter((z) => z.mesh && z.mesh.visible).length, r.info && r.info.render ? r.info.render.drawCalls : -1, r.info && r.info.render ? r.info.render.triangles : -1, H.layerBuilds, room.solids.length, L ? L.parts.length : 0, zs.n, +zs.ms.toFixed(3), zs.pick]); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    H.mark = (l) => { const P = T.profDbg; if (P.on) { const rep = P.report(); H.prof[H.label] = { frames: rep.frames, phases: rep.phases.slice(0, 24), spikes: rep.spikes.slice(0, 12) }; } P.on = true; P.reset(); H.label = l; };
    H.counts = () => { const by = {}; for (const z of alive()) { const e = by[z.typeKey] ??= [0, 0]; e[0]++; if (z.mesh && z.mesh.visible) e[1]++; } return { by, wake: !!D.state().wake, hp: T.getHp(), weapon: T.getCurrentWeapon() }; };
    H.prepare = async (kinds) => {
      const delay = (ms) => new Promise((res) => setTimeout(res, ms));
      D.clear(); T.clearZombies(); T.pinAimDbg(null); T.flightInput({ keys: [], fire: false, zoom: false });
      for (let i = 0; i < 125 && D.state().wake; i++) await delay(200);
      T.setHp(100); T.setVelDbg(0, 0);
      T.player.position.set(room.origin.x + 9, room.floorY, room.origin.z - 9);
      T.setViewFirstDbg(false);
      T.setShotView({ x: room.origin.x - 40, y: room.floorY + 3.8, z: room.origin.z - 9, tx: room.origin.x - 25, ty: room.floorY + 1.5, tz: room.origin.z + 22, fov: 64 });
      T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); T.setUnarmedDbg(false); T.setAmmoDbg('m4', 30);
      await delay(700);
      H.mark('arrive');
      const accepted = Object.fromEntries(kinds.map((k) => [k, D.deployNow(k, ${N})]));
      const t0 = performance.now();
      while (performance.now() - t0 < 90000 && !kinds.every((k) => H.counts().by[k]?.[1] === ${N})) await delay(100);
      const arrived = H.counts();
      T.player.position.set(room.origin.x - 25, room.floorY, room.origin.z + 1);
      T.setVelDbg(0, 0); T.setOtsAimDbg(0, 0); T.setAimYawDbg(0); T.setViewFirstDbg(true); T.setShotView(null);
      T.pinAimDbg(() => {
        let near = null, best = Infinity;
        for (const z of alive()) if (z.mesh && z.mesh.visible) { const d = z.mesh.position.distanceToSquared(T.player.position); if (d < best) { near = z; best = d; } }
        if (near) { const p = near.mesh.position; point.set(p.x, p.y + 0.92, p.z); T.aimTarget.copy(point); T.setAimYawDbg(Math.atan2(point.x - T.player.position.x, point.z - T.player.position.z)); }
      });
      return { accepted, arrived };
    };
    // What one live zombie costs to draw: its meshes (visible), skins, shadow casters, materials, triangles.
    H.census = () => {
      const per = {}, tot = { zombies: 0, meshes: 0, skinned: 0, casters: 0, mats: 0, tris: 0 };
      for (const z of alive()) { if (!z.mesh || !z.mesh.visible) continue; const c = { meshes: 0, skinned: 0, casters: 0, mats: 0, tris: 0, names: {} };
        z.mesh.traverseVisible((o) => { if (!o.isMesh) return; c.meshes++; if (o.isSkinnedMesh) c.skinned++; if (o.castShadow) c.casters++; const m = Array.isArray(o.material) ? o.material.length : 1; c.mats += m;
          const g = o.geometry, n = g ? (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3 : 0; c.tris += n * (o.isInstancedMesh ? o.count : 1);
          const nm = (o.name || o.type) + (o.castShadow ? '*' : ''); c.names[nm] = (c.names[nm] || 0) + 1; });
        const e = per[z.typeKey] ??= { n: 0, meshes: 0, skinned: 0, casters: 0, mats: 0, tris: 0, names: c.names }; e.n++; for (const k of ['meshes', 'skinned', 'casters', 'mats', 'tris']) { e[k] += c[k]; tot[k] += c[k]; } tot.zombies++; }
      for (const e of Object.values(per)) for (const k of ['meshes', 'skinned', 'casters', 'mats', 'tris']) e[k] = +(e[k] / e.n).toFixed(1);
      const sun = T.scene.children.filter((o) => o.isDirectionalLight && o.castShadow).map((l) => ({ name: l.name, map: l.shadow.mapSize.x, auto: l.shadow.autoUpdate, need: l.shadow.needsUpdate }));
      let sceneMeshes = 0, sceneCasters = 0; const byTop = {};
      const isZ = new Set(alive().map((z) => z.mesh));
      try { for (const top of T.scene.children) { if (!top.visible) continue; const k0 = (top.name || top.type).slice(0, 40); top.traverseVisible((o) => { if (o.isMesh) { sceneMeshes++; if (o.castShadow) { sceneCasters++;
        // an unnamed top-level group: say what it is (a live zombie, the marine, or its nearest named part)
        let k = k0; if (!top.name) { if (isZ.has(top)) k = 'zombie'; else if (top === T.getMarine?.()) k = 'marine'; else { let n = null; for (let x = o; x && x !== top; x = x.parent) if (x.name) { n = x.name; break; } k = k0 + '/' + (n || o.type).slice(0, 30); } }
        const e = byTop[k] ??= [0, 0]; e[0]++; if (o.material && !Array.isArray(o.material) && o.material.alphaTest > 0) e[1]++; } } }); } } catch (err) { byTop['census error ' + String(err).slice(0, 60)] = [0, 0]; }
      const castersByTop = Object.entries(byTop).sort((a, b) => b[1][0] - a[1][0]).slice(0, 30).map(([k, v]) => k + ' ' + v[0] + (v[1] ? ' (alphaTest ' + v[1] + ')' : ''));
      const info = r.info && r.info.render ? { calls: r.info.render.calls, drawCalls: r.info.render.drawCalls, triangles: r.info.render.triangles } : null;
      return { per, tot, sun, sceneMeshes, sceneCasters, castersByTop, info, shadowMap: { enabled: r.shadowMap.enabled, type: r.shadowMap.type } };
    };
    T.grantAllWeapons(); T.flightHold(false);
  })()`);
  res.setup = await ev(`__fp.prepare(${JSON.stringify(KINDS)})`, 300000);
  log('arrived ' + JSON.stringify(res.setup.arrived));
  if (NORENDER) { res.norender = true; await ev(`(() => { const r = TT.renderer; r._dwRender0 = r.render; r.render = function () {}; })()`); }
  const keepHp = `(() => { TT.setHp(100); })()`;
  const step = async (label, ms, fn) => { await ev(`__fp.mark(${JSON.stringify(label)})`); const until = Date.now() + ms; while (Date.now() < until) { await ev(keepHp); if (fn) await fn(); else await sleep(200); } };
  res.census = { first: await ev('__fp.census()') };
  // --still-order 1p,3p (default) or e.g. 1p,3p,1p,3p: the same crowd seen from both views in turn (is it the view or the time?)
  const order = arg('--still-order', '1p,3p').split(',').filter(Boolean), seen = {};
  for (const v of order) { seen[v] = (seen[v] || 0) + 1; await ev(`TT.setViewFirstDbg(${v === '1p'})`); await sleep(300); await step('still' + v + (seen[v] > 1 ? '#' + seen[v] : ''), STILL); }
  res.census.still = await ev('__fp.census()');
  await ev('TT.setViewFirstDbg(true)'); await sleep(300);
  // Fire as ChatGPT's rig does: 390 ms bursts, 215 ms apart, R when the magazine runs low.
  const key = async (code, k, vk, down) => page.send('Input.dispatchKeyEvent', { type: down ? 'rawKeyDown' : 'keyUp', code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  const mouse = (down) => page.send('Input.dispatchMouseEvent', { type: down ? 'mousePressed' : 'mouseReleased', button: 'left', buttons: down ? 1 : 0, x: 800, y: 440, clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 800, y: 440, buttons: 0 });
  if (CPU) { await page.send('Profiler.enable', {}); await page.send('Profiler.setSamplingInterval', { interval: 250 }); await page.send('Profiler.start', {}); }
  let n = 0, reloads = 0;
  await step('fire1p', FIRE, async () => {
    const s = await ev('({ ammo: TT.getAmmo()[TT.getCurrentWeapon()], reloading: TT.isReloading(), wake: TT.trainingDbg.state().wake })');
    if (!s.wake && !s.reloading) { if (s.ammo < 2) { await key('KeyR', 'r', 82, true); await key('KeyR', 'r', 82, false); reloads++; } else { await mouse(true); await sleep(390); await mouse(false); } }
    n++; if (n === 4) res.census.fight = await ev('__fp.census()'); await sleep(215);
  });
  if (CPU) {
    const { profile } = await page.send('Profiler.stop', {}, 600000);
    const byId = new Map(profile.nodes.map((x) => [x.id, x])), self = new Map(), total = new Map();
    const dts = profile.timeDeltas, samples = profile.samples, parent = new Map();
    for (const x of profile.nodes) for (const c of x.children || []) parent.set(c, x.id);
    const key2 = (cf) => (cf.functionName || '(anon)') + ' ' + String(cf.url || '').split('/').slice(-2).join('/') + ':' + (cf.lineNumber + 1);
    let all = 0;
    for (let i = 0; i < samples.length; i++) { const dt = (dts[i + 1] ?? dts[i]) / 1000; all += dt; let id = samples[i]; const k = key2(byId.get(id).callFrame); self.set(k, (self.get(k) || 0) + dt);
      const seen = new Set(); while (id != null) { const kk = key2(byId.get(id).callFrame); if (!seen.has(kk)) { seen.add(kk); total.set(kk, (total.get(kk) || 0) + dt); } id = parent.get(id); } }
    const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ at: k, ms: +v.toFixed(1), pct: +(100 * v / all).toFixed(1) }));
    res.cpu = { ms: +all.toFixed(0), self: top(self, 60), total: top(total, 90) };
    fs.writeFileSync(path.join(OUT, 'fight.cpuprofile'), JSON.stringify(profile));
  }
  await ev(`__fp.mark('end'); __fp.on = false; TT.pinAimDbg(null)`);
  res.layer = await ev(`(async () => { const m = await import('/world/training-exact.js'); const tg = TT.trainingDbg.tg(); const keep = tg._exactLayer; const out = { builds: __fp.layerBuilds, solids: tg.solids.length };
    for (let i = 0; i < 3; i++) { tg._exactLayer = null; const t0 = performance.now(); const L = m.exactLayer(tg); out['ms' + i] = +(performance.now() - t0).toFixed(2); out.parts = L.parts.length; }
    tg._exactLayer = keep;
    // What one line query costs in Training (the aim, the reticle's line, each round's step, a zombie's sight line use it):
    // traceTraining (every solid + the exact layer's parts) and zombieSurface (a round against one zombie's drawn body).
    try { const B = await import('/world/training-ballistics.js'), Z = await import('/game/zombie-headshots.js'), P = TT.player.position;
    const a = { x: P.x, y: P.y + 1.5, z: P.z }, ends = []; for (let i = 0; i < 64; i++) { const ang = i / 64 * Math.PI * 2; ends.push({ x: P.x + Math.sin(ang) * 30, y: P.y + 1.2, z: P.z + Math.cos(ang) * 30 }); }
    let t0 = performance.now(); for (let k = 0; k < 4; k++) for (const b of ends) B.traceTraining(tg, a, b); out.traceMs = +((performance.now() - t0) / 256).toFixed(4);
    const zs = TT.zombies.filter((z) => z.alive && z.mesh); let zn = 0; t0 = performance.now();
    for (const z of zs) { const q = z.mesh.position; const b = { x: q.x, y: q.y + 1.1, z: q.z }; const a2 = { x: q.x + 3, y: q.y + 1.2, z: q.z + 0.2 }; for (let k = 0; k < 4; k++) { Z.zombieSurface(TT.THREE, z, a2, b); zn++; } }
    out.zombieSurfaceMs = zn ? +((performance.now() - t0) / zn).toFixed(4) : null; out.zombiesTested = zs.length; } catch (e) { out.benchError = String(e); }
    return out; })()`).catch((e) => ({ error: String(e) }));
  res.reloads = reloads; res.ended = await ev('__fp.counts()');
  res.prof = await ev('__fp.prof');
  const rows = await ev('__fp.rows');
  const by = new Map();
  for (let i = 1; i < rows.length; i++) { const dt = rows[i][0] - rows[i - 1][0], l = rows[i][1]; let a = by.get(l); if (!a) by.set(l, (a = { dt: [], alive: [], draws: [] })); a.dt.push(dt); a.alive.push(rows[i][2]); a.draws.push(rows[i][4]); }
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
  for (let i = 1; i < rows.length; i++) { const a = by.get(rows[i][1]); if (a) { a.builds = (a.builds || 0) + (rows[i][6] - rows[i - 1][6]); if (rows[i][9] != null) { a.zsN = (a.zsN || 0) + (rows[i][9] - rows[i - 1][9]); a.zsMs = (a.zsMs || 0) + (rows[i][10] - rows[i - 1][10]); a.zsPick = (a.zsPick || 0) + (rows[i][11] - rows[i - 1][11]); } } }
  res.steps = [...by].map(([step, a]) => ({ step, builds: a.builds, zsPerFrame: a.zsN != null ? +(a.zsN / a.dt.length).toFixed(2) : null, zsMsPerFrame: a.zsMs != null ? +(a.zsMs / a.dt.length).toFixed(3) : null, zsPickPerFrame: a.zsPick != null ? +(a.zsPick / a.dt.length).toFixed(2) : null, frames: a.dt.length, median: +q(a.dt, 0.5).toFixed(1), p95: +q(a.dt, 0.95).toFixed(1), worst: +Math.max(...a.dt).toFixed(1), over33: a.dt.filter((x) => x > 33.4).length, alive: q(a.alive, 0.5), draws: q(a.draws, 0.5) }));
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(rows));
  res.errors = page.errors.slice(0, 8);
} catch (e) { res.error = String(e && e.stack || e); }
finally { await browser.close(); server.close && server.close(); }
fs.writeFileSync(path.join(OUT, 'fightprof.json'), JSON.stringify(res, null, 1));
const L = ['CB-373 fight profile  ' + (res.backend || '?') + (res.error ? '  ERROR ' + res.error.split('\n')[0] : ''), '', 'step        frames median  p95  worst >33  alive draws'];
if (res.layer) L.push('exact layer: ' + JSON.stringify(res.layer));
for (const s of res.steps || []) if (s.zsPerFrame != null) L.push('zombieSurface per frame ' + s.step.padEnd(10) + ' calls ' + s.zsPerFrame + ' (aim pick ' + s.zsPickPerFrame + ')  ms ' + s.zsMsPerFrame);
for (const s of res.steps || []) L.push('layer rebuilds ' + String(s.builds).padStart(4) + '  ' + s.step.padEnd(12) + String(s.frames).padStart(6) + String(s.median).padStart(7) + String(s.p95).padStart(5) + String(s.worst).padStart(7) + String(s.over33).padStart(4) + String(s.alive).padStart(7) + String(s.draws).padStart(6));
for (const [step, p] of Object.entries(res.prof || {})) L.push('', step + ' PROF avg ms/frame (max): ' + p.phases.slice(0, 14).map((x) => x.k + ' ' + x.avg.toFixed(2) + ' (' + x.max.toFixed(0) + ')').join(', '));
if (res.census) for (const [k, c] of Object.entries(res.census)) { L.push('', 'census ' + k + ': ' + JSON.stringify(c.tot) + ' scene meshes ' + c.sceneMeshes + ' casters ' + c.sceneCasters + ' info ' + JSON.stringify(c.info) + ' sun ' + JSON.stringify(c.sun));
  if (c.castersByTop) L.push('  shadow casters by top-level group: ' + c.castersByTop.join(', '));
  for (const [t, e] of Object.entries(c.per)) L.push('  ' + t.padEnd(10) + ' n ' + e.n + ' meshes ' + e.meshes + ' skinned ' + e.skinned + ' casters ' + e.casters + ' mats ' + e.mats + ' tris ' + e.tris + '  ' + JSON.stringify(e.names).slice(0, 400)); }
if (res.cpu) { L.push('', 'fight CPU profile ' + res.cpu.ms + ' ms sampled; SELF:'); for (const x of res.cpu.self.slice(0, 40)) L.push(String(x.ms).padStart(8) + ' ' + String(x.pct).padStart(5) + '%  ' + x.at);
  L.push('', 'TOTAL (inclusive):'); for (const x of res.cpu.total.slice(0, 70)) L.push(String(x.ms).padStart(8) + ' ' + String(x.pct).padStart(5) + '%  ' + x.at); }
fs.writeFileSync(path.join(OUT, 'fightprof.txt'), L.join('\n') + '\n');
console.log(L.slice(0, 10).join('\n'));
process.exit(0);

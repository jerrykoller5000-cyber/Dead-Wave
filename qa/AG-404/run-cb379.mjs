import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
import { IdleProofCamera } from '../../review/GP-20218/proof-camera.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the official crew game-test slot (--exclusive)');

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, 'qa', 'AG-404', 'cb379');
fs.mkdirSync(OUT_ROOT, { recursive: true });

const LIVE = 'index.html';
const COPY = 'review/CB-379/index.cb379.html';
const md5 = (p) => createHash('md5').update(fs.readFileSync(p)).digest('hex');
const sha256 = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const liveMd5 = md5(LIVE);
const copyMd5 = md5(COPY);
assert.equal(liveMd5.slice(0, 8), '22afb368', `Expected live 22afb368, got ${liveMd5}`);
assert.equal(copyMd5.slice(0, 8), 'f137269d', `Expected cb379 f137269d, got ${copyMd5}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SECS = 12;
const HITCH = 33;

async function runOpeningProbe(tag, pageFile) {
  const OUT = path.join(OUT_ROOT, tag);
  fs.mkdirSync(OUT, { recursive: true });
  const targetFile = pageFile || LIVE;
  const inner = await serve(ROOT, 0);
  const server = await (async () => {
    const body = fs.readFileSync(path.resolve(ROOT, targetFile));
    const up = new URL(inner.origin);
    const px = http.createServer((req, res) => {
      if (new URL(req.url, 'http://x').pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(body);
        return;
      }
      const r2 = http.request({ hostname: up.hostname, port: up.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      });
      r2.on('error', (e) => res.writeHead(502).end(String(e)));
      req.pipe(r2);
    });
    await new Promise((r) => px.listen(0, '127.0.0.1', r));
    return { origin: 'http://127.0.0.1:' + px.address().port, close: () => { px.close(); inner.close(); } };
  })();

  const expectedSha = sha256(targetFile);
  const browser = await launch({ headless: false });
  const res = { tag, page: targetFile, md5: md5(targetFile), sha256: expectedSha, secs: SECS, hitch: HITCH };
  let page;
  try {
    page = await browser.newPage({ width: 1600, height: 900 });
    const ev = (e, ms = 900000) => page.evaluate(e, ms);
    const served = await fetch(`${server.origin}/index.html`);
    assert(served.ok);
    const servedSha = createHash('sha256').update(Buffer.from(await served.arrayBuffer())).digest('hex');
    assert.equal(servedSha, expectedSha, `${tag}: served sha mismatch`);
    res.served = servedSha;

    await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 120000 });
    for (let i = 0; i < 2; i++) {
      await ev(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
      await sleep(250);
    }
    if (!(await page.waitFor('!!window.TT && !!window.TT.trainingDbg', { timeout: 180000 }))) throw new Error('TT never appeared');
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    assert.equal(await ev('TT.getRendererBackend()'), 'WebGPU');

    // Time exact click-to-blackout-off (Training entry blackout time)
    const enterT0 = Date.now();
    await ev(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'CB-379'; document.getElementById('modeTraining').click(); })()`);
    if (!(await page.waitFor('TT.trainingDbg.state().active && !TT.trainingDbg.state().warming', { timeout: 180000 }))) throw new Error('Training never opened');
    const warmDoneMs = Date.now() - enterT0;
    await page.waitFor(`!document.getElementById('trainingBlackout')?.classList.contains('on')`, { timeout: 180000 });
    const enterMs = Date.now() - enterT0;
    res.enterMs = enterMs;
    res.warmDoneMs = warmDoneMs;
    console.log(`[${tag}] training open: enterMs=${enterMs} ms (warmDone=${warmDoneMs} ms)`);
    await sleep(3000);

    // Identical recorder to review/CB-379/opening.mjs
    res.gpu = await ev(`(() => {
      const T = TT, D = T.trainingDbg, room = D.tg(), G = T.THREE, r = T.renderer, b = r.backend, point = new G.Vector3();
      const H = window.__op = { rows: [], on: false, compiles: 0, frameNew: [], newPipes: [], shots: 0, hits: 0, deaths: 0 };
      const nm = (o) => o ? (o.name || o.type) : '?';
      const chain = (o) => { const a = []; for (let x = o, i = 0; x && i < 5; x = x.parent, i++) a.push(nm(x)); return a.join('<'); };
      const hook = (fn) => { if (typeof b[fn] !== 'function') return false; const o = b[fn].bind(b); b[fn] = (...a) => { const t0 = performance.now(); const out = o(...a); const ms = performance.now() - t0;
        H.compiles++; try { const ro = a[0], m = ro && ro.material; const e = { fn, ms: +ms.toFixed(2), mat: m ? (m.name || m.type) : '?', obj: ro && ro.object ? chain(ro.object) : '?' }; H.frameNew.push(e); } catch (_) { H.frameNew.push({ fn, ms: +ms.toFixed(2) }); } return out; }; return true; };
      const hooks = { createRenderPipeline: hook('createRenderPipeline'), createProgram: hook('createProgram'), createComputePipeline: hook('createComputePipeline') };
      H.frameRebuild = []; const P0 = r._pipelines;
      if (P0 && typeof P0.getForRender === 'function') { const o = P0.getForRender.bind(P0); P0.getForRender = (ro, pr) => { const t0 = performance.now(); const out = o(ro, pr); const ms = performance.now() - t0;
        if (ms > 0.5 && !pr) { try { H.frameRebuild.push({ ms: +ms.toFixed(1), mat: ro.material ? (ro.material.name || ro.material.type) : '?', obj: chain(ro.object), pass: ro.camera && ro.camera.isOrthographicCamera ? 'shadow?' : '' }); } catch (_) { H.frameRebuild.push({ ms: +ms.toFixed(1) }); } } return out; }; hooks.getForRender = true; }
      const lightSig = () => { let s = ''; const n = {}; T.scene.traverseVisible((o) => { if (o.isLight) { const k = o.type + (o.castShadow ? '*' : ''); n[k] = (n[k] || 0) + 1; } }); for (const k of Object.keys(n).sort()) s += k + n[k] + ' '; return s.trim(); };
      H.lightSig = lightSig;
      const heap = () => (performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : -1);
      const alive = () => T.zombies.filter((z) => z.alive);
      let last = performance.now(), t0 = 0;
      const tick = (now) => { if (H.on) { const a = alive(); const P = T.profDbg; let top = null, tot = null;
          if (P && P.on && P.cur) { const e = Object.entries(P.cur).sort((x, y) => y[1] - x[1]); tot = +e.reduce((s, x) => s + x[1], 0).toFixed(1); top = e.slice(0, 5).map(([k, v]) => k + ' ' + v.toFixed(1)).join(', '); }
          H.rows.push({ t: +(now - t0).toFixed(1), dt: +(now - last).toFixed(1), alive: a.length, vis: a.filter((z) => z.mesh && z.mesh.visible).length, ammo: T.getAmmo()[T.getCurrentWeapon()], weapon: T.getCurrentWeapon(), hp: T.getHp(),
            compiles: H.frameNew.length, rebuilds: H.frameRebuild.length, rebuildMs: +H.frameRebuild.reduce((s, x) => s + (x.ms || 0), 0).toFixed(1), rebuildTop: H.frameRebuild.sort((a, b) => b.ms - a.ms).slice(0, 8), lights: lightSig(), compileMs: +H.frameNew.reduce((s, x) => s + (x.ms || 0), 0).toFixed(1), newPipes: H.frameNew.slice(0, 12), heap: heap(), profTot: tot, profTop: top });
          H.frameNew = []; H.frameRebuild = []; }
        last = now; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
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
        const accepted = Object.fromEntries(kinds.map((k) => [k, D.deployNow(k, 10)]));
        const w0 = performance.now();
        while (performance.now() - w0 < 120000 && !kinds.every((k) => H.counts().by[k]?.[1] === 10)) await delay(100);
        const arrived = H.counts();
        H.setupCompiles = H.compiles;
        return { accepted, arrived };
      };
      H.go = () => {
        T.player.position.set(room.origin.x - 25, room.floorY, room.origin.z + 1);
        T.setVelDbg(0, 0); T.setOtsAimDbg(0, 0); T.setAimYawDbg(0); T.setViewFirstDbg(true); T.setShotView(null);
        T.pinAimDbg(() => {
          let near = null, best = Infinity;
          for (const z of alive()) if (z.mesh && z.mesh.visible) { const d = z.mesh.position.distanceToSquared(T.player.position); if (d < best) { near = z; best = d; } }
          if (near) { const p = near.mesh.position; point.set(p.x, p.y + 0.92, p.z); T.aimTarget.copy(point); T.setAimYawDbg(Math.atan2(point.x - T.player.position.x, point.z - T.player.position.z)); }
        });
        if (T.profDbg) { T.profDbg.on = true; T.profDbg.reset(); }
        H.frameNew = []; H.frameRebuild = []; t0 = performance.now(); H.on = true; return H.counts();
      };
      T.grantAllWeapons(); T.flightHold(false);
      return { backend: b && b.isWebGPUBackend ? 'webgpu' : 'webgl', hooks };
    })()`);

    res.setup = await ev(`__op.prepare(['shambler','feral','bomber'])`, 300000);
    const key = async (code, k, vk, down) => page.send('Input.dispatchKeyEvent', { type: down ? 'rawKeyDown' : 'keyUp', code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    const tap = async (code, k, vk) => { await key(code, k, vk, true); await key(code, k, vk, false); };
    const mouse = (down) => page.send('Input.dispatchMouseEvent', { type: down ? 'mousePressed' : 'mouseReleased', button: 'left', buttons: down ? 1 : 0, x: 800, y: 440, clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 800, y: 440, buttons: 0 });
    res.heapAtGo = await ev('performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1');
    res.before = await ev('__op.go()');

    const until = Date.now() + SECS * 1000;
    let step = 0;
    while (Date.now() < until) {
      const s = await ev('({ wake: TT.trainingDbg.state().wake, ammo: TT.getAmmo()[TT.getCurrentWeapon()], reloading: TT.isReloading() })');
      if (!s.wake && !s.reloading) {
        if (s.ammo < 2 || step % 11 === 7) { await tap('KeyR', 'r', 82); }
        else {
          if (step % 13 === 9) { await tap('KeyQ', 'q', 81); }
          const strafe = step % 4 === 2 ? 'KeyA' : step % 4 === 3 ? 'KeyD' : null;
          if (strafe) await key(strafe, strafe === 'KeyA' ? 'a' : 'd', strafe === 'KeyA' ? 65 : 68, true);
          await mouse(true); await sleep(390); await mouse(false);
          if (strafe) await key(strafe, strafe === 'KeyA' ? 'a' : 'd', strafe === 'KeyA' ? 65 : 68, false);
        }
      }
      step++;
      await sleep(s.wake ? 500 : 215);
    }
    await ev('__op.on = false; TT.pinAimDbg(null); 0');
    res.rows = await ev('__op.rows');
    res.ended = await ev('__op.counts()');
    res.errors = page.errors.slice(0, 8);
  } catch (e) {
    res.error = String((e && e.stack) || e);
  } finally {
    await browser.close();
    server.close && server.close();
  }

  const rows = res.rows || [];
  const first2s = rows.filter((r) => r.t <= 2000);
  const first5s = rows.filter((r) => r.t <= 5000);
  const sorted = rows.map((r) => r.dt).sort((a, b) => a - b);
  const killFrames = [];
  let prevAlive = 30;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].alive < prevAlive) {
      killFrames.push({ idx: i, t: rows[i].t, dt: rows[i].dt, alive: rows[i].alive, compiles: rows[i].compiles, compileMs: rows[i].compileMs, rebuildMs: rows[i].rebuildMs });
      prevAlive = rows[i].alive;
    }
  }
  res.metrics = {
    tag,
    page: res.page,
    enterMs: res.enterMs,
    warmDoneMs: res.warmDoneMs,
    frames: rows.length,
    medianMs: sorted[sorted.length >> 1] || 0,
    p95Ms: sorted[Math.floor(sorted.length * 0.95)] || 0,
    worstAllMs: Math.max(0, ...rows.map((r) => r.dt)),
    worstFirst2sMs: Math.max(0, ...first2s.map((r) => r.dt)),
    over50msFirst5s: first5s.filter((r) => r.dt > 50).length,
    over33msFirst5s: first5s.filter((r) => r.dt > 33).length,
    over50msAll: rows.filter((r) => r.dt > 50).length,
    compilesInFight: rows.reduce((s, r) => s + r.compiles, 0),
    compileMsInFight: +rows.reduce((s, r) => s + r.compileMs, 0).toFixed(1),
    rebuildsInFight: rows.reduce((s, r) => s + r.rebuilds, 0),
    rebuildMsInFight: +rows.reduce((s, r) => s + r.rebuildMs, 0).toFixed(1),
    first3KillFrames: killFrames.slice(0, 3),
    totalKills: 30 - (rows.length ? rows[rows.length - 1].alive : 30),
    errors: res.errors?.length || 0,
  };
  fs.writeFileSync(path.join(OUT, 'opening.json'), JSON.stringify(res, null, 1));
  const L = [
    `CB-379 ${tag} (${res.page}) ${res.gpu?.backend || '?'} enterMs=${res.enterMs} warmDoneMs=${res.warmDoneMs}`,
    `frames=${rows.length} median=${res.metrics.medianMs} p95=${res.metrics.p95Ms} worst2s=${res.metrics.worstFirst2sMs} over50_5s=${res.metrics.over50msFirst5s} worstAll=${res.metrics.worstAllMs}`,
    `compiles in the fight: ${res.metrics.compilesInFight} (${res.metrics.compileMsInFight} ms), rebuilds: ${res.metrics.rebuildsInFight} (${res.metrics.rebuildMsInFight} ms)`,
    `first kills: ${JSON.stringify(res.metrics.first3KillFrames)}`,
    '',
  ];
  for (const r of rows) {
    if (!(r.dt > HITCH || r.compiles || r.rebuildMs > 2)) continue;
    L.push(`${String(r.t).padStart(7)} dt=${String(r.dt).padStart(5)} alive=${r.alive}/${r.vis} heap=${r.heap}${r.compiles ? ` NEW=${r.compiles}(${r.compileMs}ms)` : ''}${r.rebuilds ? ` REBUILD=${r.rebuilds}(${r.rebuildMs}ms)` : ''}${r.profTop ? ` PROF=${r.profTot}:${r.profTop}` : ''}`);
    for (const p of r.newPipes || []) L.push(`          ${p.fn} ${p.ms}ms ${p.mat} @ ${p.obj}`);
    for (const p of r.rebuildTop || []) L.push(`          rebuilt ${p.ms}ms ${p.mat} @ ${p.obj}`);
  }
  fs.writeFileSync(path.join(OUT, 'opening.txt'), L.join('\n') + '\n');
  console.log('CB379_RUN', JSON.stringify(res.metrics));
  return res.metrics;
}

// 1. Exclusive ABBA runs: A1 (live), B1 (copy), B2 (copy), A2 (live)
const abba = [];
abba.push(await runOpeningProbe('A1-live', ''));
abba.push(await runOpeningProbe('B1-copy', COPY));
abba.push(await runOpeningProbe('B2-copy', COPY));
abba.push(await runOpeningProbe('A2-live', ''));

// 2. Original gates on COPY f137269d: tcb332, tcb340, t215 (reuse if --skip-gates)
const skipGates = process.argv.includes('--skip-gates');
let gates = {};
if (skipGates && fs.existsSync(path.join(OUT_ROOT, 'summary.json'))) {
  gates = JSON.parse(fs.readFileSync(path.join(OUT_ROOT, 'summary.json'), 'utf8')).gates || {};
  console.log('CB379_GATES_REUSED', Object.keys(gates));
} else {
  const libSrc = fs.readFileSync('tools/tests/lib.js', 'utf8');
  for (const name of ['tcb332', 'tcb340', 't215']) {
    const camera = new IdleProofCamera({ onscreen: true, size: '1600x900', warm: 'none', files: { '/index.html': COPY } });
    const rec = { name, copy: COPY, md5: copyMd5 };
    try {
      await camera.open();
      const p = camera.page;
      assert.equal(await p.evaluate('TT.getRendererBackend()'), 'WebGPU');
      await p.evaluate(libSrc);
      const out = await p.evaluate(fs.readFileSync(`tools/tests/${name}.js`, 'utf8'), 450000);
      const lines = String(out).split('\n');
      rec.pass = lines.filter((l) => l.startsWith('PASS ')).length;
      rec.fail = lines.filter((l) => l.startsWith('FAIL '));
      rec.errors = p.errors;
      rec.output = out;
    } catch (e) {
      rec.error = String(e.message || e);
    } finally {
      await camera.close();
    }
    gates[name] = rec;
    console.log('CB379_GATE', name, JSON.stringify({ pass: rec.pass, fail: rec.fail, errors: rec.errors?.length }));
  }
}

fs.writeFileSync(path.join(OUT_ROOT, 'summary.json'), JSON.stringify({ liveMd5, copyMd5, abba, gates }, null, 2) + '\n');
console.log('CB379_DONE');

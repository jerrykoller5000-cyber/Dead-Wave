import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
fs.mkdirSync(__dirname, { recursive: true });

const SECONDS = 30;
const NIGHT = 20;
const GFX = 'high';

const SAMPLE = `(() => {
  const read = () => {
    const info = (TT.renderer && TT.renderer.info && TT.renderer.info.render) || {};
    const draws = info.drawCalls != null ? info.drawCalls : (info.calls || 0);
    return { draws, triangles: info.triangles || 0 };
  };
  let best = read();
  const again = read();
  if (again.draws > best.draws) best = again;
  const snap = TT.perfSnapshot() || { fps: 0, low: 0, worst: 0, hitches: 0, frames: 0 };
  return Object.assign({}, snap, best);
})()`;

const ADVANCE = `(() => {
  const st = () => TT.getWaveDirectorState();
  const up = () => (TT.zombies || []).filter((z) => z.alive && !z.dying).length;
  const cap = TT.MAX_ZOMBIES || 48;
  let steps = 0;
  while (steps++ < 250) {
    const pc = st().pace;
    const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
    if (onLast) {
      if (up() >= cap) break;
      if (pc.left <= 0 && up() > 0) break;
      TT.spawnWaveBatch(0.25);
      continue;
    }
    if (!pc || pc.inLull || up() > 6) TT.clearZombies();
    TT.spawnWaveBatch(0.5);
  }
  const pc = st().pace;
  const onLast = !!(pc && pc.pushes > 0 && pc.push === pc.pushes - 1 && !pc.inLull);
  const out = up() >= cap || (pc && pc.left <= 0 && up() > 0);
  return {
    done: onLast && out,
    day: st().day,
    phase: st().phase,
    push: pc ? pc.push : null,
    pushes: pc ? pc.pushes : null,
    left: pc ? pc.left : null,
    zombies: up(),
    spawned: st().waveSpawned,
    total: st().waveTotal
  };
})()`;

const PROF_START = `(() => {
  const P = TT.profDbg;
  if (!P) return { ok: false, why: 'TT.profDbg is missing' };
  P.reset(); P.spikeMs = 25; P.on = true;
  const R = TT.renderer;
  const JB = window.__benchBuilds = window.__benchBuilds || { made: [], n: 0, on: true };
  JB.on = true; JB.made.length = 0; JB.n = 0;
  const BE = R && R.backend;
  if (BE && typeof BE.createNodeBuilder === 'function' && !BE.__cl232) {
    const cnb = BE.createNodeBuilder;
    BE.createNodeBuilder = function (object, renderer) {
      const j = window.__benchBuilds;
      if (j && j.on) { j.n++; if (j.made.length < 400) { try {
        const path = []; for (let n = object; n && path.length < 4; n = n.parent) path.push(n.name || n.type);
        const m = object && object.material;
        j.made.push({ frame: P.frame, obj: path.join(' < '), kind: object ? object.type : '', count: (object && object.count) || 0, mat: m ? (m.type || '') + (m.name ? ':' + m.name : '') : '' });
      } catch (e) {} } }
      return cnb.call(this, object, renderer);
    };
    BE.__cl232 = true;
  }
  const counts = () => { const m = (R && R.info && R.info.memory) || {}; return [(R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0, m.textures || 0, m.geometries || 0, (window.__benchBuilds && window.__benchBuilds.n) || 0]; };
  if (!P.__cl223) {
    const begin = P.begin; let last = counts();
    P.begin = function () { const n0 = this.spikes.length; begin.call(this); const now = counts();
      if (this.spikes.length > n0) { const sp = this.spikes[this.spikes.length - 1]; sp.newPipelines = now[0] - last[0]; sp.newTextures = now[1] - last[1]; sp.newGeometries = now[2] - last[2]; sp.newBuilds = now[3] - last[3]; }
      last = now; };
    P.__cl223 = true;
  }
  const PL = R && R._pipelines;
  const J = window.__benchPipes = { made: [], released: 0, on: true };
  if (PL && typeof PL._getRenderPipeline === 'function' && !PL.__cl226) {
    const make = PL._getRenderPipeline, release = PL._releasePipeline;
    PL._getRenderPipeline = function (ro, sv, sf, key, promises) {
      const j = window.__benchPipes;
      if (j && j.on && j.made.length < 400) { try {
        const o = ro.object, m = ro.material, path = [];
        for (let n = o; n && path.length < 4; n = n.parent) path.push(n.name || n.type);
        j.made.push({ frame: P.frame, obj: path.join(' < '), kind: o ? o.type : '', mat: m ? m.type + (m.name ? ':' + m.name : '') : '',
          state: m ? [m.transparent ? 'transparent' : 'transparent' === 'x' ? '' : 'opaque', 'side' + m.side, m.depthWrite ? 'zw' : 'no-zw', m.blending !== 1 ? 'blend' + m.blending : '', m.alphaTest > 0 ? 'alphaTest' : ''].filter(Boolean).join(' ') : '',
          cam: ro.camera === TT.camera ? 'scene' : ((ro.camera && ro.camera.type) || '?'), newShaders: (sv.usedTimes === 0 ? 'v' : '') + (sf.usedTimes === 0 ? 'f' : '') });
      } catch (e) {} }
      return make.call(this, ro, sv, sf, key, promises);
    };
    PL._releasePipeline = function (pl) { const j = window.__benchPipes; if (j && j.on) j.released++; return release.call(this, pl); };
    PL.__cl226 = true;
  }
  const be = TT.renderer && TT.renderer.backend;
  let gpu = 'unavailable';
  try {
    if (be && be.isWebGPUBackend && be.device && be.device.features && be.device.features.has('timestamp-query')) {
      be.trackTimestamp = true;
      gpu = 'on';
    }
  } catch (e) { gpu = 'unavailable: ' + e.message; }
  const G = window.__benchGpu = { on: gpu === 'on', samples: [], busy: false };
  if (G.on) {
    const tickGpu = () => {
      if (!G.on) return;
      if (!G.busy) {
        G.busy = true;
        Promise.resolve(TT.renderer.resolveTimestampsAsync('render')).then((ms) => {
          if (typeof ms === 'number' && ms > 0 && ms < 1000) G.samples.push(ms);
        }).catch(() => {}).finally(() => { G.busy = false; });
      }
      requestAnimationFrame(tickGpu);
    };
    requestAnimationFrame(tickGpu);
  }
  return { ok: true, gpu };
})()`;

const PROF_END = `(() => {
  const P = TT.profDbg;
  const rep = P.report();
  P.on = false;
  const G = window.__benchGpu || { samples: [] };
  G.on = false;
  const be = TT.renderer && TT.renderer.backend;
  if (be && be.isWebGPUBackend) be.trackTimestamp = false;
  const J = window.__benchPipes || { made: [], released: 0 };
  J.on = false;
  const groups = new Map();
  for (const x of J.made) { const k = x.obj + ' | ' + x.mat + ' | ' + x.state + ' | ' + x.cam; const g = groups.get(k) || { k, n: 0, newShaders: 0, frames: [] }; g.n++; if (x.newShaders) g.newShaders++; if (g.frames.length < 6) g.frames.push(x.frame); groups.set(k, g); }
  const pipes = { made: J.made.length, released: J.released, withNewShaders: J.made.filter((x) => x.newShaders).length, top: [...groups.values()].sort((a, b) => b.n - a.n).slice(0, 15), first: J.made.slice(0, 12) };
  const JB = window.__benchBuilds || { made: [], n: 0 };
  JB.on = false;
  const bg = new Map();
  for (const x of JB.made) { const k = x.obj + ' | ' + x.kind + (x.count > 1 ? ' x' + x.count : '') + ' | ' + x.mat; const g = bg.get(k) || { k, n: 0, frames: [] }; g.n++; if (g.frames.length < 6) g.frames.push(x.frame); bg.set(k, g); }
  const builds = { made: JB.n, top: [...bg.values()].sort((a, b) => b.n - a.n).slice(0, 15) };
  return { rep, gpu: G.samples.slice(), pipes, builds };
})()`;

function median(nums) {
  if (!nums.length) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function startMatch(page) {
  await page.evaluate(`(() => {
    const name = document.getElementById('playerName');
    if (name) name.value = 'Bench';
    const play = document.getElementById('modeHunt');
    if (play) play.click();
  })()`);
  const prep = await page.waitFor(`window.TT.getPhase && window.TT.getPhase() === 'prep'`, { timeout: 30000 });
  if (!prep) throw new Error('match never reached prep');
  const landed = await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 180000 });
  if (!landed) throw new Error('insertion never finished');
}

async function runSingleBench(runId) {
  const outPath = path.join(__dirname, `${runId}.json`);
  if (fs.existsSync(outPath)) {
    console.log(`\n=== [AG-110] Reusing completed ${runId}.json ===`);
    return JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }
  console.log(`\n=== [AG-110] Starting ${runId}: Night 20 High --prof + TT.marineShadowDbg() ===`);
  const server = await serve(ROOT, 0);
  const browser = await launch({ headless: false, args: ['--enable-precise-memory-info'] });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }
    const ready = await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
    if (!ready) throw new Error('TT never appeared');
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });

    const applied = await page.evaluate(`(() => {
      TT.applyGraphicsPreset(${JSON.stringify(GFX)});
      return TT.getGfx();
    })()`);
    if (applied !== GFX) throw new Error('graphics preset ' + GFX + ' did not apply');

    await startMatch(page);
    const jumped = await page.evaluate(`(() => {
      TT.runDevCommand('godmode');
      const ok = !!TT.devJumpToNight(${NIGHT}, true);
      const st = TT.getWaveDirectorState();
      return { ok, phase: st.phase, day: st.day, pushes: st.pace ? st.pace.pushes : 0 };
    })()`);
    if (!jumped.ok || jumped.phase !== 'wave') {
      throw new Error('devJumpToNight refused night ' + NIGHT + ' (' + JSON.stringify(jumped) + ')');
    }
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await page.evaluate(ADVANCE, 180000);
      if (state.done) break;
    }
    if (!state || !state.done) {
      throw new Error('night ' + NIGHT + ' never reached its last push (' + JSON.stringify(state) + ')');
    }
    await page.evaluate('new Promise(r => setTimeout(r, 3000))');

    const shadowBefore = await page.evaluate(`(() => {
      const d = TT.marineShadowDbg();
      return { builds: d.builds, lastDiff: d.lastDiff, ms: d.ms, bones: d.bones, verts: d.verts };
    })()`);

    const profStart = await page.evaluate(PROF_START);
    if (!profStart || !profStart.ok) throw new Error('--prof: ' + (profStart && profStart.why));

    await page.evaluate('TT.resetPerf()');
    const t0 = Date.now();
    const windows = [];
    while (Date.now() - t0 < SECONDS * 1000) {
      const snap = await page.evaluate(SAMPLE);
      if (snap) windows.push(snap);
      await new Promise((r) => setTimeout(r, 1000));
    }

    const tail = windows.slice(-10);
    const paced = tail.filter((w) => w.fps > 0);
    const use = paced.length ? paced : tail;
    const avg = (key) => use.reduce((sum, w) => sum + (w[key] || 0), 0) / (use.length || 1);
    const final = windows.at(-1) || { worst: 0, hitches: 0 };
    const counted = (use.some((w) => w.draws > 0) ? use : windows).filter((w) => w.draws > 0);
    const drawRows = counted.length ? counted : use;
    const end = await page.evaluate(`(() => {
      const pc = TT.getWaveDirectorState ? TT.getWaveDirectorState() : null;
      const pace = pc && pc.pace;
      return {
        zombies: (TT.zombies || []).filter((z) => z.alive).length,
        phase: pc ? pc.phase : null,
        day: pc ? pc.day : null,
        push: pace ? pace.push : null,
        pushes: pace ? pace.pushes : null,
        gfx: TT.getGfx ? TT.getGfx() : null
      };
    })()`);

    const got = await page.evaluate(PROF_END);
    const shadowAfter = await page.evaluate(`(() => {
      const d = TT.marineShadowDbg();
      return { builds: d.builds, lastDiff: d.lastDiff, ms: d.ms, bones: d.bones, verts: d.verts };
    })()`);

    const round1 = (n) => Math.round(n * 10) / 10;
    const r2 = (n) => Math.round(n * 100) / 100;
    const phases = (got.rep && got.rep.phases) || [];
    const tickMs = phases.reduce((s, p) => s + p.avg, 0);
    const fps = round1(avg('fps'));
    const frameMs = fps > 0 ? 1000 / fps : 0;
    const gpu = got.gpu || [];

    const line = {
      id: runId,
      scenario: 'night',
      seconds: SECONDS,
      fps,
      low: round1(avg('low')),
      worst: round1(final.worst || 0),
      hitches: final.hitches || 0,
      draws: Math.round(median(drawRows.map((w) => w.draws || 0))),
      triangles: Math.round(median(drawRows.map((w) => w.triangles || 0))),
      zombies: end.zombies,
      gfx: end.gfx,
      windows: use.length,
      night: NIGHT,
      push: end.push,
      pushes: end.pushes,
      last: end.push != null && end.pushes != null && end.push === end.pushes - 1,
      marineShadowBefore: shadowBefore,
      marineShadowAfter: shadowAfter,
      prof: {
        frames: got.rep ? got.rep.frames : 0,
        frameMs: r2(frameMs),
        tickMs: r2(tickMs),
        outsideMs: r2(frameMs - tickMs),
        top: phases.slice(0, 12).map((p) => ({ k: p.k, avg: r2(p.avg), max: r2(p.max) })),
        spikes: ((got.rep && got.rep.spikes) || []).slice(0, 8),
        spikeCauses: (() => {
          const all = (got.rep && got.rep.spikes) || [];
          const c = { spikes: all.length, pipelines: 0, builds: 0, uploads: 0, gc: 0, code: 0 };
          for (const sp of all) {
            if (sp.newPipelines > 0) c.pipelines++;
            else if (sp.newBuilds > 0) c.builds++;
            else if (sp.newTextures > 0 || sp.newGeometries > 0) c.uploads++;
            else if (sp.freedMB >= 2) c.gc++;
            else c.code++;
          }
          return c;
        })(),
        gpuMs: gpu.length ? r2(median(gpu)) : (profStart.gpu === 'on' ? 'no samples' : profStart.gpu),
        gpuSamples: gpu.length,
        pipelines: got.pipes || null,
        builds: got.builds || null
      }
    };

    fs.writeFileSync(outPath, JSON.stringify(line, null, 2), 'utf8');
    console.log(`[AG-110] ${runId}: fps=${line.fps}, low=${line.low}, tick=${line.prof.tickMs}ms`);
    console.log(`[AG-110] ${runId} marineShadowDbg:`, JSON.stringify(line.marineShadowAfter));
    console.log(`[AG-110] ${runId} spikeCauses:`, JSON.stringify(line.prof.spikeCauses));
    console.log(`[AG-110] ${runId} builds:`, JSON.stringify(line.prof.builds, null, 2));
    return line;
  } finally {
    await browser.close();
    await server.close();
  }
}

async function runDuskShadowChecks() {
  console.log('\n=== [AG-110] Running dusk shadow checks (stowed gun on back + smoking idle) ===');
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
  });
  try {
    const page = await browser.newPage({ width: 1280, height: 720 });
    await page.goto(`${server.origin}/index.html?debug=1`, { waitUntil: 'none' });
    await page.waitFor('!!window.DWOpening', { timeout: 60000 });
    for (let i = 0; i < 2; i++) {
      await page.evaluate(`(() => {
        if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
        else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      })()`);
      await page.evaluate('new Promise(r => setTimeout(r, 250))');
    }
    await page.waitFor('!!window.TT && !!window.TT.spawnMegaswarm', { timeout: 180000 });
    await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
    await page.evaluate(`TT.applyGraphicsPreset('high')`);
    await startMatch(page);

    // Move to open ground south of HQ, set time to dusk (0.68..0.70), grant weapons so he has rifles stowed on his back, and frame the marine + his long dusk shadow
    const shot1Info = await page.evaluate(`(async () => {
      const T = window.TT;
      T.runDevCommand('godmode');
      T.clearZombies();
      T.player.position.set(5, T.sampleHeight(5, 18), 18);
      T.grantAllWeapons();
      const carry = T.carryDbg();
      T.setWorldTime(0.68);
      await new Promise((r) => setTimeout(r, 1200));
      const px = T.player.position.x, py = T.player.position.y, pz = T.player.position.z;
      // At worldTime=0.68, sunDir is (-0.83, 0.39, 0.28), so the dusk shadow falls toward (+X, -Z).
      // Place camera at (-X, -Z) looking toward (+X, 0) on the sunlit clearing at (5, 18).
      T.setShotView({ x: px - 1.4, y: py + 2.2, z: pz - 2.0, tx: px + 0.9, ty: py + 0.45, tz: pz - 0.3, fov: 45 });
      await new Promise((r) => setTimeout(r, 300));
      const shadowDbg = T.marineShadowDbg();
      const carryCopies = [];
      T.marine.traverse((o) => {
        if (o.userData && o.userData.carryKind) {
          let casters = 0;
          o.traverse((m) => { if (m.isMesh && m.visible && m.castShadow) casters++; });
          carryCopies.push({ kind: o.userData.carryKind, proxySkip: !!o.userData.proxySkip, casters });
        }
      });
      return {
        worldTime: T.getWorldTime(),
        currentWeapon: T.getCurrentWeapon(),
        slung: carry.slung,
        holstered: carry.holstered,
        hip: carry.hip,
        carryCopies,
        shadowDbg: { builds: shadowDbg.builds, lastDiff: shadowDbg.lastDiff, bones: shadowDbg.bones, verts: shadowDbg.verts }
      };
    })()`);
    const shot1Path = path.join(__dirname, '01-dusk-shadow-stowed-gun.png');
    await page.screenshot(shot1Path);
    console.log('[AG-110] Saved 01-dusk-shadow-stowed-gun.png:', JSON.stringify(shot1Info));

    // Advance marineIdle into 'pack' (taking out pack + lighter + cigarette) and wait 1.5s to verify shadow proxy does NOT rebuild
    const shot2Info = await page.evaluate(`(async () => {
      const T = window.TT;
      const idle = T.marineIdleDbg();
      idle.reset();
      idle.step(28.3, { eligible: true, active: false, paused: false }); // phase = 'pack', t = 3.3 (pack/lighter/cig visible)
      await new Promise((r) => setTimeout(r, 200));
      // Hold pack at t = 3.45 so lighter + spark + cig are visible
      idle.state.phase = 'pack';
      idle.state.quiet = 28.45;
      idle.state.time = 3.45;
      const px = T.player.position.x, py = T.player.position.y, pz = T.player.position.z;
      T.setShotView({ x: px - 1.3, y: py + 2.0, z: pz - 1.8, tx: px + 0.85, ty: py + 0.5, tz: pz - 0.25, fov: 44 });
      await new Promise((r) => setTimeout(r, 120));
      const shadowDbg = T.marineShadowDbg();
      const idleRoot = T.marine.getObjectByName('marine-idle-props');
      let idleCasters = 0;
      if (idleRoot) idleRoot.traverse((m) => { if (m.isMesh && m.visible && m.castShadow) idleCasters++; });
      return {
        idleState: { ...idle.state },
        idleProxySkip: !!(idleRoot && idleRoot.userData.proxySkip),
        idleCasters,
        shadowDbg: { builds: shadowDbg.builds, lastDiff: shadowDbg.lastDiff }
      };
    })()`);
    const shot2Path = path.join(__dirname, '02-dusk-shadow-smoking-pack.png');
    await page.screenshot(shot2Path);
    console.log('[AG-110] Saved 02-dusk-shadow-smoking-pack.png:', JSON.stringify(shot2Info));

    // Advance marineIdle into 'smoking' for >1.5s (past the 1.0s proxy settle threshold) and verify the cigarette & stowed gun cast shadows and shadowDbg.builds stays unchanged
    const shot3Info = await page.evaluate(`(async () => {
      const T = window.TT;
      const idle = T.marineIdleDbg();
      idle.state.phase = 'smoking';
      idle.state.quiet = 31.0;
      idle.state.time = 1.0;
      idle.state.lit = true;
      await new Promise((r) => setTimeout(r, 1500));
      const px = T.player.position.x, py = T.player.position.y, pz = T.player.position.z;
      T.setShotView({ x: px - 1.3, y: py + 2.0, z: pz - 1.8, tx: px + 0.85, ty: py + 0.5, tz: pz - 0.25, fov: 44 });
      await new Promise((r) => setTimeout(r, 150));
      const shadowDbg = T.marineShadowDbg();
      const idleRoot = T.marine.getObjectByName('marine-idle-props');
      let cigVisible = false, cigCastShadow = false;
      if (idleRoot && idleRoot.children[0]) {
        cigVisible = idleRoot.children[0].visible;
        idleRoot.children[0].traverse((m) => { if (m.isMesh && m.castShadow) cigCastShadow = true; });
      }
      return {
        idleState: { ...idle.state },
        cigVisible,
        cigCastShadow,
        shadowDbg: { builds: shadowDbg.builds, lastDiff: shadowDbg.lastDiff }
      };
    })()`);
    const shot3Path = path.join(__dirname, '03-dusk-shadow-smoking-cig.png');
    await page.screenshot(shot3Path);
    console.log('[AG-110] Saved 03-dusk-shadow-smoking-cig.png:', JSON.stringify(shot3Info));

    return { shot1Info, shot2Info, shot3Info };
  } finally {
    await browser.close();
    await server.close();
  }
}

async function main() {
  const r1 = await runSingleBench('run-1');
  const r2 = await runSingleBench('run-2');
  const r3 = await runSingleBench('run-3');
  const duskChecks = await runDuskShadowChecks();

  const summary = {
    benchRuns: [r1, r2, r3],
    duskChecks
  };
  const outPath = path.join(__dirname, 'ag110-summary.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n[AG-110] Wrote summary to ${outPath}`);
}

main().catch((err) => {
  console.error('[AG-110] ERROR:', err);
  process.exit(1);
});

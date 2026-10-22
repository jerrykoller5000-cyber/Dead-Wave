import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const SECONDS = 30;
const NIGHT = 20;
const GFX = 'high';

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
  const P = window.TT && TT.profDbg;
  if (!P) return { ok: false, why: 'no TT.profDbg' };
  P.reset();
  P.on = true;
  const R = TT.renderer;
  const BE = R && R.backend;
  const JB = window.__benchBuilds = { made: [], n: 0, on: true };
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
  const counts = () => { const m = (R && R.info && R.info.memory) || {}; return [(R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0, m.textures || 0, m.geometries || 0, (window.__benchBuilds && window.__benchBuilds.n) || 0, window.__dwSunShadowN || 0]; };
  if (!P.__cl223) {
    const begin = P.begin; let last = counts();
    P.begin = function () { const n0 = this.spikes.length; begin.call(this); const now = counts();
      if (this.spikes.length > n0) { const sp = this.spikes[this.spikes.length - 1]; sp.newPipelines = now[0] - last[0]; sp.newTextures = now[1] - last[1]; sp.newGeometries = now[2] - last[2]; sp.newBuilds = now[3] - last[3]; sp.sunShadow = now[4] - last[4]; }
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
          state: m ? [m.transparent ? 'transparent' : 'opaque', 'side' + m.side, m.depthWrite ? 'zw' : 'no-zw', m.blending !== 1 ? 'blend' + m.blending : '', m.alphaTest > 0 ? 'alphaTest' : ''].filter(Boolean).join(' ') : '',
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
    console.log(`\n=== [AG-112] Reusing completed ${runId}.json ===`);
    return JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }
  console.log(`\n=== [AG-112] Starting ${runId}: Night 20 High --prof + TT.sunShadowDbg() ===`);
  const server = await serve(ROOT, 0);
  const browser = await launch({
    headless: false,
    args: ['--enable-precise-memory-info', '--disable-features=CalculateNativeWinOcclusion']
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

    const beforeDbg = await page.evaluate(`(() => {
      const m = TT.marineShadowDbg();
      const s = TT.sunShadowDbg();
      return {
        sunShadow: s,
        marineShadow: { builds: m.builds, lastDiff: m.lastDiff, ms: m.ms, bones: m.bones, verts: m.verts }
      };
    })()`);

    const profStart = await page.evaluate(PROF_START);
    if (!profStart || !profStart.ok) throw new Error('--prof: ' + (profStart && profStart.why));

    await page.evaluate('TT.resetPerf()');
    const t0 = Date.now();
    const windows = [];
    while (Date.now() - t0 < SECONDS * 1000) {
      await page.evaluate('new Promise(r => setTimeout(r, 1500))');
      const snap = await page.evaluate(`(() => {
        const s = TT.perfSnapshot();
        const r = TT.renderer && TT.renderer.info && TT.renderer.info.render;
        return { fps: s.fps, low: s.low, worst: s.worst, hitches: s.hitches, draws: r ? r.calls : 0, triangles: r ? r.triangles : 0 };
      })()`);
      if (snap && snap.fps > 0) windows.push(snap);
    }

    const final = await page.evaluate('TT.perfSnapshot()');
    const end = await page.evaluate(`(() => {
      const r = TT.renderer && TT.renderer.info && TT.renderer.info.render;
      const pc = TT.getWaveDirectorState ? TT.getWaveDirectorState() : null;
      const pace = pc && pc.pace;
      const m = TT.marineShadowDbg();
      const s = TT.sunShadowDbg();
      return {
        draws: r ? r.calls : 0,
        triangles: r ? r.triangles : 0,
        zombies: TT.zombies ? TT.zombies.length : 0,
        phase: pc ? pc.phase : null,
        day: pc ? pc.day : null,
        push: pace ? pace.push : null,
        pushes: pace ? pace.pushes : null,
        gfx: TT.getGfx ? TT.getGfx() : null,
        sunShadow: s,
        marineShadow: { builds: m.builds, lastDiff: m.lastDiff, ms: m.ms, bones: m.bones, verts: m.verts }
      };
    })()`);

    const got = await page.evaluate(PROF_END);
    const use = windows.length > 2 ? windows.slice(1) : windows;
    const avg = (k) => use.reduce((s, w) => s + (w[k] || 0), 0) / Math.max(1, use.length);
    const drawRows = use.filter((w) => w.draws > 0);
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
      sunShadowBefore: beforeDbg.sunShadow,
      sunShadowAfter: end.sunShadow,
      marineShadowBefore: beforeDbg.marineShadow,
      marineShadowAfter: end.marineShadow,
      prof: {
        frames: got.rep ? got.rep.frames : 0,
        frameMs: r2(frameMs),
        tickMs: r2(tickMs),
        outsideMs: r2(frameMs - tickMs),
        top: phases.slice(0, 12).map((p) => ({ k: p.k, avg: r2(p.avg), max: r2(p.max) })),
        spikes: ((got.rep && got.rep.spikes) || []).slice(0, 8),
        spikeCauses: (() => {
          const all = (got.rep && got.rep.spikes) || [];
          const c = { spikes: all.length, pipelines: 0, builds: 0, uploads: 0, sunShadow: 0, gc: 0, code: 0 };
          for (const sp of all) {
            if (sp.newPipelines > 0) c.pipelines++;
            else if (sp.newBuilds > 0) c.builds++;
            else if (sp.newTextures > 0 || sp.newGeometries > 0) c.uploads++;
            else if (sp.sunShadow > 0) c.sunShadow++;
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
    console.log(`[AG-112] ${runId}: fps=${line.fps}, low=${line.low}, tick=${line.prof.tickMs}ms`);
    console.log(`[AG-112] ${runId} sunShadowDbg:`, JSON.stringify(line.sunShadowAfter));
    console.log(`[AG-112] ${runId} spikeCauses:`, JSON.stringify(line.prof.spikeCauses));
    console.log(`[AG-112] ${runId} builds:`, JSON.stringify(line.prof.builds, null, 2));
    return line;
  } finally {
    await browser.close();
    await server.close();
  }
}

async function runNight20WalkCheck() {
  console.log('\n=== [AG-112] Running Night 20 40m walk across the base and back (shadow jump & zombie ghost check) ===');
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

    // Jump to Night 20 WITH the Night 20 base built & active horde (devJumpToNight(20, true)), wait for deep night (sunShadowDbg().deep === true)
    await page.evaluate(`(async () => {
      const T = window.TT;
      T.runDevCommand('godmode');
      T.devJumpToNight(20, true);
    })()`);
    for (let i = 0; i < 40; i++) {
      const st = await page.evaluate(ADVANCE, 180000);
      if (st.done) break;
    }
    await page.evaluate(`(async () => {
      const T = window.TT;
      for (let i = 0; i < 60 && !T.sunShadowDbg().deep; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 2000));
    })()`);

    // Helper to walk smoothly from x0 to x1 along z=8 over a given duration in ms, using rAF so the marine walks & animates naturally
    const walkTo = async (targetX, targetZ, durationMs) => {
      return await page.evaluate(`(async () => {
        const T = window.TT;
        const x0 = T.player.position.x, z0 = T.player.position.z;
        const x1 = ${targetX}, z1 = ${targetZ}, dur = ${durationMs};
        const t0 = performance.now();
        T.setAimTargetDbg(x1 + (x1 >= x0 ? 8 : -8), z1);
        while (true) {
          const u = Math.min(1, (performance.now() - t0) / dur);
          const x = x0 + (x1 - x0) * u;
          const z = z0 + (z1 - z0) * u;
          T.player.position.set(x, T.sampleHeight(x, z), z);
          if (u >= 1) break;
          await new Promise((r) => requestAnimationFrame(r));
        }
        await new Promise((r) => setTimeout(r, 120));
        return {
          pos: { x: Math.round(T.player.position.x * 100) / 100, z: Math.round(T.player.position.z * 100) / 100 },
          sunIntensity: Math.round(T.sun.intensity * 10000) / 10000,
          worldTime: Math.round(T.getWorldTime() * 10000) / 10000,
          zombies: T.zombies.length,
          builds: T.builds.length,
          sunShadow: T.sunShadowDbg()
        };
      })()`);
    };

    // 1. Place at west end of the base (-20, 8) and trigger a fresh redraw baseline by stepping 20m from (0, 8) to (-20, 8)
    const startSnap = await page.evaluate(`(async () => {
      const T = window.TT;
      T.setShotView(null);
      T.player.position.set(0, T.sampleHeight(0, 8), 8);
      await new Promise((r) => setTimeout(r, 150));
      T.player.position.set(-20, T.sampleHeight(-20, 8), 8);
      T.setAimTargetDbg(0, 8);
      await new Promise((r) => setTimeout(r, 400));
      return {
        pos: { x: T.player.position.x, z: T.player.position.z },
        sunIntensity: Math.round(T.sun.intensity * 10000) / 10000,
        worldTime: Math.round(T.getWorldTime() * 10000) / 10000,
        zombies: T.zombies.length,
        builds: T.builds.length,
        sunShadow: T.sunShadowDbg()
      };
    })()`);
    await page.screenshot(path.join(__dirname, '01-night20-walk-start-west.png'));
    console.log('[AG-112] 01-night20-walk-start-west.png:', JSON.stringify(startSnap));

    // 2. Walk 14.5 m east to (-5.5, 8) over 2.5 seconds — right BEFORE the 16 m redraw threshold!
    const beforeRedrawSnap = await walkTo(-5.5, 8, 2500);
    await page.screenshot(path.join(__dirname, '02-night20-walk-14m5-before-redraw.png'));
    console.log('[AG-112] 02-night20-walk-14m5-before-redraw.png:', JSON.stringify(beforeRedrawSnap));

    // 3. Walk another 2.5 m east to (-3.0, 8) (total 17 m from -20) — crossing the 16 m threshold so the sun shadow map redraws once!
    const afterRedrawSnap = await walkTo(-3.0, 8, 450);
    await page.screenshot(path.join(__dirname, '03-night20-walk-17m-after-redraw.png'));
    console.log('[AG-112] 03-night20-walk-17m-after-redraw.png:', JSON.stringify(afterRedrawSnap));

    // 4. Finish the 40 m walk east to (+20, 8) (crossing a second 16 m threshold along the way)
    const eastEndSnap = await walkTo(20, 8, 3500);
    await page.screenshot(path.join(__dirname, '04-night20-walk-east-40m.png'));
    console.log('[AG-112] 04-night20-walk-east-40m.png:', JSON.stringify(eastEndSnap));

    // 5. Walk 40 m west back across the base from (+20, 8) to (-20, 8) over 6 seconds
    const returnWestSnap = await walkTo(-20, 8, 6000);
    await page.screenshot(path.join(__dirname, '05-night20-walk-return-west.png'));
    console.log('[AG-112] 05-night20-walk-return-west.png:', JSON.stringify(returnWestSnap));

    // 6. Locked-camera ground & base-wall inspection before & after a 16 m shadow-map redraw:
    // Spawn 6 zombies at (-2.5..3, 11) in front of the south base walls/turrets, force a shadow-map redraw with them standing there,
    // then clear those zombies so the ground at (-2.5..3, 11) is bare while their shadow is still in the stale shadow map,
    // move the marine 12 m to (-10, 11) (still < 16 m, so no redraw yet), photograph the ground and base wall shadows,
    // and then move the marine 20 m to (-18, 11) to trigger a shadow-map redraw and photograph the exact same view!
    const ghostAndStepCheck = await page.evaluate(`(async () => {
      const T = window.TT;
      T.clearZombies();
      const zs = [];
      for (let i = 0; i < 6; i++) {
        const z = T.spawnZombie(-2.5 + i * 1.1, 11, i % 2 === 0 ? 'brute' : 'shambler');
        if (z) { z.riseT = 0; z.hp = 9999; zs.push(z); }
      }
      // Move 22 m from (-20, 8) to (2, 11) to force a redraw with the 6 zombies standing at (-2.5..3, 11)
      const r0 = T.sunShadowDbg().redraws;
      T.player.position.set(2, T.sampleHeight(2, 11), 11);
      for (let i = 0; i < 30 && T.sunShadowDbg().redraws <= r0; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      const s0 = T.sunShadowDbg();
      // Now clear the zombies so the ground at (-2.5..3, 11) is bare while their shadow is still in the stale shadow map,
      // and move the marine 12 m to (-10, 11) (still < 16 m, so no redraw yet)
      T.clearZombies();
      T.player.position.set(-10, T.sampleHeight(-10, 11), 11);
      const gy = T.sampleHeight(0, 11);
      T.setShotView({ x: 0, y: gy + 6.5, z: 18, tx: 0, ty: gy + 0.4, tz: 8, fov: 50 });
      await new Promise((r) => setTimeout(r, 200));
      const sBefore = T.sunShadowDbg();
      return { s0, sBefore, sunIntensity: T.sun.intensity, builds: T.builds.length };
    })()`);
    await page.screenshot(path.join(__dirname, '06-night20-ground-before-16m-redraw.png'));

    const afterStepCheck = await page.evaluate(`(async () => {
      const T = window.TT;
      const rBefore = T.sunShadowDbg().redraws;
      // Now step the marine to (-18, 11) (20 m from +2, > 16 m) so the sun shadow map redraws!
      T.player.position.set(-18, T.sampleHeight(-18, 11), 11);
      for (let i = 0; i < 30 && T.sunShadowDbg().redraws <= rBefore; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, 150));
      const sAfter = T.sunShadowDbg();
      T.setShotView(null);
      return { sAfter, sunIntensity: T.sun.intensity };
    })()`);
    await page.screenshot(path.join(__dirname, '07-night20-ground-after-16m-redraw.png'));
    console.log('[AG-112] Locked-camera ghost/step check:', JSON.stringify({ ...ghostAndStepCheck, ...afterStepCheck }));

    return {
      startSnap,
      beforeRedrawSnap,
      afterRedrawSnap,
      eastEndSnap,
      returnWestSnap,
      ghostAndStepCheck: { ...ghostAndStepCheck, ...afterStepCheck }
    };
  } finally {
    await browser.close();
    await server.close();
  }
}

async function main() {
  const runs = [];
  for (const id of ['run-1', 'run-2', 'run-3']) {
    runs.push(await runSingleBench(id));
  }
  const walkCheck = await runNight20WalkCheck();
  const summaryPath = path.join(__dirname, 'ag112-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ benchRuns: runs, walkCheck }, null, 2), 'utf8');
  console.log('\n[AG-112] Wrote summary to', summaryPath);
}

main().catch((err) => {
  console.error('[AG-112] ERROR:', err);
  process.exit(1);
});

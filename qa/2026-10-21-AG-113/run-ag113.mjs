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
  const JR = window.__benchRO = window.__benchRO || { made: [], n: 0, on: true, lightChanges: [], lastLightSig: null, lastLights: [] };
  JR.on = true; JR.made.length = 0; JR.n = 0; JR.lightChanges = []; JR.lastLightSig = null; JR.lastLights = [];
  const RO = R && R._objects;
  if (RO && typeof RO.createRenderObject === 'function' && !RO.__cl238) {
    const cro = RO.createRenderObject;
    RO.createRenderObject = function (nodes, geometries, renderer, object, material, scene, camera, lightsNode) {
      const j = window.__benchRO;
      if (j && j.on) {
        j.n++;
        if (j.made.length < 4000) {
          try {
            const path = []; for (let n = object; n && path.length < 3; n = n.parent) path.push(n.name || n.type);
            const cam = !camera ? '' : camera === TT.camera ? 'scene' : camera.isOrthographicCamera ? 'ortho' : camera.type;
            j.made.push({ frame: P.frame, obj: path.join(' < '), mat: material ? material.type : '', cam });
          } catch (e) {}
        }
        try {
          if (camera === TT.camera && lightsNode && typeof lightsNode.getLights === 'function') {
            const ls = lightsNode.getLights() || [];
            const sig = ls.map((l) => l.id).join(',');
            if (sig !== j.lastLightSig) {
              const desc = ls.map((l) => {
                const p = [];
                for (let n = l; n && p.length < 4; n = n.parent) p.push(n.name || n.type);
                return p.join(' < ') + '#' + l.id;
              });
              const prevSet = new Set(j.lastLights);
              const curSet = new Set(desc);
              const added = desc.filter((d) => !prevSet.has(d));
              const removed = j.lastLights.filter((d) => !curSet.has(d));
              if (j.lightChanges.length < 100) {
                j.lightChanges.push({ frame: P.frame, count: ls.length, added, removed });
              }
              j.lastLightSig = sig;
              j.lastLights = desc;
            }
          }
        } catch (e) {}
      }
      return cro.apply(this, arguments);
    };
    RO.__cl238 = true;
  }
  const counts = () => { const m = (R && R.info && R.info.memory) || {}; return [(R && R._pipelines && R._pipelines.caches && R._pipelines.caches.size) || 0, m.textures || 0, m.geometries || 0, (window.__benchBuilds && window.__benchBuilds.n) || 0, window.__dwSunShadowN || 0, (window.__benchRO && window.__benchRO.n) || 0]; };
  if (!P.__cl223) {
    const begin = P.begin; let last = counts();
    P.begin = function () { const n0 = this.spikes.length; begin.call(this); const now = counts();
      if (this.spikes.length > n0) { const sp = this.spikes[this.spikes.length - 1]; sp.newPipelines = now[0] - last[0]; sp.newTextures = now[1] - last[1]; sp.newGeometries = now[2] - last[2]; sp.newBuilds = now[3] - last[3]; sp.sunShadow = now[4] - last[4]; sp.newRenderObjects = now[5] - last[5]; }
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
  const JR = window.__benchRO || { made: [], n: 0, lightChanges: [] };
  JR.on = false;
  const rg = new Map(), byFrame = new Map();
  for (const x of JR.made) {
    const k = x.obj + ' | ' + x.mat + ' | ' + x.cam;
    const g = rg.get(k) || { k, n: 0, frames: [] }; g.n++; if (g.frames.length < 6 && g.frames[g.frames.length - 1] !== x.frame) g.frames.push(x.frame); rg.set(k, g);
    const f = byFrame.get(x.frame) || new Map(); f.set(k, (f.get(k) || 0) + 1); byFrame.set(x.frame, f);
  }
  const spikeRO = (rep.spikes || []).slice(0, 8).map((sp) => { const f = byFrame.get(sp.frame); return { frame: sp.frame, n: f ? [...f.values()].reduce((a, b) => a + b, 0) : 0, top: f ? [...f.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => n + ' ' + k) : [] }; });
  const renderObjects = { made: JR.n, perFrame: +(JR.n / Math.max(1, rep.frames || 1)).toFixed(2), top: [...rg.values()].sort((a, b) => b.n - a.n).slice(0, 15), spikes: spikeRO };
  return { rep, gpu: G.samples.slice(), pipes, builds, renderObjects, lightChanges: JR.lightChanges || [] };
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
    console.log(`\n=== [AG-113] Reusing completed ${runId}.json ===`);
    return JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }
  console.log(`\n=== [AG-113] Starting ${runId}: Night 20 High --prof (CL-238 renderObjects journal) ===`);
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
      return {
        draws: r ? r.calls : 0,
        triangles: r ? r.triangles : 0,
        zombies: TT.zombies ? TT.zombies.length : 0,
        phase: pc ? pc.phase : null,
        day: pc ? pc.day : null,
        push: pace ? pace.push : null,
        pushes: pace ? pace.pushes : null,
        gfx: TT.getGfx ? TT.getGfx() : null,
        sunShadow: TT.sunShadowDbg ? TT.sunShadowDbg() : null,
        marineShadow: TT.marineShadowDbg ? (() => { const m = TT.marineShadowDbg(); return { builds: m.builds, lastDiff: m.lastDiff, ms: m.ms, bones: m.bones, verts: m.verts }; })() : null
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
      sunShadowAfter: end.sunShadow,
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
        builds: got.builds || null,
        renderObjects: got.renderObjects || null,
        lightChanges: got.lightChanges || []
      }
    };

    fs.writeFileSync(outPath, JSON.stringify(line, null, 2), 'utf8');
    console.log(`[AG-113] ${runId}: fps=${line.fps}, low=${line.low}, tick=${line.prof.tickMs}ms`);
    console.log(`[AG-113] ${runId} spikeCauses:`, JSON.stringify(line.prof.spikeCauses));
    console.log(`[AG-113] ${runId} renderObjects.made=${line.prof.renderObjects?.made}, perFrame=${line.prof.renderObjects?.perFrame}`);
    console.log(`[AG-113] ${runId} lightChanges:`, JSON.stringify(line.prof.lightChanges));
    return line;
  } finally {
    await browser.close();
    await server.close();
  }
}

async function main() {
  const runs = [];
  for (const id of ['run-1', 'run-2']) {
    runs.push(await runSingleBench(id));
  }
  const summaryPath = path.join(__dirname, 'ag113-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ benchRuns: runs }, null, 2), 'utf8');
  console.log('\n[AG-113] Wrote summary to', summaryPath);
}

main().catch((err) => {
  console.error('[AG-113] ERROR:', err);
  process.exit(1);
});
